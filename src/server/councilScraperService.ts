import * as cheerio from "cheerio";
import { CouncilAgendaTopic, CouncilDocument } from "../types/council.js";
import { getDbFromSqlite, saveDbToSqlite } from "./sqliteDatabase.js";

const BASE_URL = "https://steenwijkerland.bestuurlijkeinformatie.nl";
const AGENDAS_API_TEMPLATE = `${BASE_URL}/Agenda/RetrieveAgendasForYear?agendatypeId=100000059&year=`;

const MONTH_MAP: Record<string, string> = {
  januari: "01",
  februari: "02",
  maart: "03",
  april: "04",
  mei: "05",
  juni: "06",
  juli: "07",
  augustus: "08",
  september: "09",
  oktober: "10",
  november: "11",
  december: "12",
};

/**
 * Helper to parse Dutch date text like "dinsdag 8 december 2026" or "8 december 2026" into "2026-12-08"
 */
export function parseDutchDate(text: string, defaultYear?: number): { dateIso: string; display: string } {
  const clean = text.replace(/\s+/g, " ").trim();
  const yearMatch = clean.match(/\b(202[0-9]|203[0-9])\b/);
  const year = yearMatch ? yearMatch[1] : (defaultYear ? String(defaultYear) : String(new Date().getFullYear()));
  
  let day = "01";
  let month = "01";

  const dayMatch = clean.match(/\b([1-9]|[12][0-9]|3[01])\b/);
  if (dayMatch) {
    day = dayMatch[1].padStart(2, "0");
  }

  const lower = clean.toLowerCase();
  for (const [mName, mNum] of Object.entries(MONTH_MAP)) {
    if (lower.includes(mName)) {
      month = mNum;
      break;
    }
  }

  const dateIso = `${year}-${month}-${day}`;
  return { dateIso, display: clean };
}

/**
 * Scrape upcoming agenda meetings from steenwijkerland.bestuurlijkeinformatie.nl
 */
export async function scrapeCouncilAgendas(yearsToScrape: number[] = [new Date().getFullYear(), new Date().getFullYear() + 1]) {
  console.log(`[RAADSPANEEL SCRAPER] Start scraping voor gemeenteraad Steenwijkerland (jaren: ${yearsToScrape.join(", ")})...`);
  
  const scrapedMeetingLinks: { url: string; dateDisplay: string; year: number }[] = [];

  for (const year of yearsToScrape) {
    try {
      const url = `${AGENDAS_API_TEMPLATE}${year}`;
      console.log(`[RAADSPANEEL SCRAPER] Ophalen agenda index voor jaar ${year} van ${url}`);
      
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LijstVanAndel/1.0",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!res.ok) {
        console.warn(`[RAADSPANEEL SCRAPER] Kon index voor ${year} niet ophalen (status: ${res.status})`);
        continue;
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      // Search for links inside .agenda-link or <a href*="/Agenda/Index/">
      $("li.agenda-link a, a[href*='/Agenda/Index/']").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        
        const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
        // Extract meeting date text
        const titleText = $(el).find(".agenda-link-title").text() || $(el).text() || "";
        const cleanTitle = titleText.replace(/\s+/g, " ").trim();
        
        if (!scrapedMeetingLinks.some((m) => m.url === fullUrl)) {
          scrapedMeetingLinks.push({
            url: fullUrl,
            dateDisplay: cleanTitle,
            year,
          });
        }
      });
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`[RAADSPANEEL SCRAPER] Fout bij ophalen index ${year}:`, error?.message);
    }
  }

  console.log(`[RAADSPANEEL SCRAPER] ${scrapedMeetingLinks.length} vergaderingen gevonden. Nu details & bespreekstukken ophalen...`);

  const db = getDbFromSqlite();
  const existingTopics: CouncilAgendaTopic[] = Array.isArray(db.councilAgendaTopics) ? db.councilAgendaTopics : [];
  const existingTopicsMap = new Map<string, CouncilAgendaTopic>();
  for (const t of existingTopics) {
    existingTopicsMap.set(t.id, t);
  }

  let totalNewOrUpdated = 0;
  let bespreekstukkenFound = 0;

  for (const meeting of scrapedMeetingLinks) {
    try {
      const meetingIdMatch = meeting.url.match(/Index\/([a-zA-Z0-9-]+)/i);
      const meetingId = meetingIdMatch ? meetingIdMatch[1] : Buffer.from(meeting.url).toString("hex").slice(0, 16);

      const res = await fetch(meeting.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LijstVanAndel/1.0",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!res.ok) {
        console.warn(`[RAADSPANEEL SCRAPER] Kon vergadering ${meeting.url} niet openen (${res.status})`);
        continue;
      }

      const meetingHtml = await res.text();
      const $ = cheerio.load(meetingHtml);

      // Meeting title
      const pageTitle = $("h1, .page-title, .agenda-title").first().text().replace(/\s+/g, " ").trim() || "Raadsbijeenkomst Steenwijkerland";
      
      // Determine date
      const parsedDate = parseDutchDate(meeting.dateDisplay || pageTitle, meeting.year);

      // Parse agenda sections (look for "Oordeelvorming - bespreekstukken" or agenda items)
      // Usually Bestuurlijke Informatie groups items in <li>, .list-group-item, or .agenda-item
      const sectionElements = $("li.list-group-item, .agenda-item, .treeview-item, .agenda-point, tr");

      // We track current category header if structured hierarchically
      let currentSectionCategory = "Oordeelvorming - bespreekstukken";

      // Scan headings and items
      $("h2, h3, h4, .agenda-category-header, .list-group-item-heading").each((_, headingEl) => {
        const hText = $(headingEl).text().trim();
        if (hText.toLowerCase().includes("bespreekstuk") || hText.toLowerCase().includes("oordeelvorming")) {
          currentSectionCategory = "Oordeelvorming - bespreekstukken";
        } else if (hText.toLowerCase().includes("hamerstuk")) {
          currentSectionCategory = "Hamerstukken";
        } else if (hText.toLowerCase().includes("informatief")) {
          currentSectionCategory = "Informatief";
        }
      });

      // Parse all agenda items / documents
      $("li, div.agenda-row, tr").each((index, itemEl) => {
        const itemText = $(itemEl).text().replace(/\s+/g, " ").trim();
        const htmlContent = $(itemEl).html() || "";
        
        // Check if this item has document links or is an agenda point
        const docLinks: CouncilDocument[] = [];
        $(itemEl).find("a[href*='/Agenda/Document/'], a[href*='/Document/'], a[href*='.pdf']").each((_, docEl) => {
          const docHref = $(docEl).attr("href");
          if (!docHref) return;
          
          const fullDocUrl = docHref.startsWith("http") ? docHref : `${BASE_URL}${docHref.startsWith("/") ? "" : "/"}${docHref}`;
          const docTitle = $(docEl).text().replace(/\s+/g, " ").trim() || $(docEl).attr("title") || `Bijlage document`;
          
          const docIdMatch = fullDocUrl.match(/Document\/([a-zA-Z0-9-]+)/i);
          const docId = docIdMatch ? docIdMatch[1] : Buffer.from(fullDocUrl).toString("hex").slice(0, 16);

          if (!docLinks.some((d) => d.id === docId)) {
            docLinks.push({
              id: docId,
              title: docTitle,
              url: fullDocUrl,
              fileType: fullDocUrl.toLowerCase().endsWith(".pdf") || docTitle.toLowerCase().includes("pdf") ? "PDF" : "DOC",
              viewedBy: [],
            });
          }
        });

        // If it's a substantive item with a title and either document links or marked as bespreekstuk
        const isBespreek = itemText.toLowerCase().includes("bespreekstuk") || 
                           itemText.toLowerCase().includes("oordeelvorming") || 
                           currentSectionCategory === "Oordeelvorming - bespreekstukken";

        if (docLinks.length > 0 || (isBespreek && itemText.length > 5 && itemText.length < 300)) {
          // Clean title
          let topicTitle = $(itemEl).find(".agenda-item-title, h4, h5, strong, a").first().text().trim();
          if (!topicTitle || topicTitle.length < 3) {
            topicTitle = itemText.split("\n")[0].slice(0, 120);
          }

          if (topicTitle && topicTitle.length >= 3 && !topicTitle.toLowerCase().includes("cookie") && !topicTitle.toLowerCase().includes("inloggen")) {
            const topicId = `topic_${meetingId}_${index}`;
            const existing = existingTopicsMap.get(topicId);

            // Merge viewedBy and notes from existing topic to never lose member progress
            const mergedDocs = docLinks.map((newDoc) => {
              const existingDoc = existing?.documents?.find((d) => d.id === newDoc.id);
              return {
                ...newDoc,
                viewedBy: existingDoc?.viewedBy || [],
              };
            });

            const category = isBespreek ? "Oordeelvorming - bespreekstukken" : "Overig";
            if (category === "Oordeelvorming - bespreekstukken") {
              bespreekstukkenFound++;
            }

            const updatedTopic: CouncilAgendaTopic = {
              id: topicId,
              meetingId,
              meetingDate: parsedDate.dateIso,
              meetingDateDisplay: parsedDate.display,
              meetingTitle: pageTitle,
              meetingType: pageTitle.includes("Oordeel") ? "Oordeelsvormend" : "Raadsvergadering",
              agendaItemNumber: `${index + 1}`,
              category,
              title: topicTitle,
              description: itemText.slice(0, 500),
              assignedTo: existing?.assignedTo || null,
              assignedName: existing?.assignedName || null,
              assignedAt: existing?.assignedAt || null,
              documents: mergedDocs,
              notes: existing?.notes || [],
              isArchived: existing?.isArchived || false,
              archivedAt: existing?.archivedAt || null,
              sourceUrl: meeting.url,
              scrapedAt: new Date().toISOString(),
            };

            existingTopicsMap.set(topicId, updatedTopic);
            totalNewOrUpdated++;
          }
        }
      });
    } catch (meetingErr: any) {
      console.error(`[RAADSPANEEL SCRAPER] Fout bij verwerken vergadering ${meeting.url}:`, meetingErr.message);
    }
  }

  // Auto-archive topics older than 7 days after the meeting date
  const now = new Date();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  let archivedCount = 0;

  const finalList: CouncilAgendaTopic[] = [];
  for (const topic of existingTopicsMap.values()) {
    try {
      const mDate = new Date(topic.meetingDate);
      if (!isNaN(mDate.getTime())) {
        const diff = now.getTime() - mDate.getTime();
        if (diff > SEVEN_DAYS_MS && !topic.isArchived) {
          topic.isArchived = true;
          topic.archivedAt = new Date().toISOString();
          archivedCount++;
        }
      }
    } catch (_e) {
      // ignore invalid date
    }
    finalList.push(topic);
  }

  // Sort: upcoming first (by meetingDate ascending), then archived
  finalList.sort((a, b) => {
    if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1;
    return a.meetingDate.localeCompare(b.meetingDate);
  });

  // Save in SQLite
  db.councilAgendaTopics = finalList;
  db.councilScrapeSummary = {
    lastScrapedAt: new Date().toISOString(),
    totalMeetingsScraped: scrapedMeetingLinks.length,
    totalTopics: finalList.length,
    bespreekstukkenCount: finalList.filter((t) => t.category === "Oordeelvorming - bespreekstukken" && !t.isArchived).length,
    archivedCount,
    status: "success",
  };

  saveDbToSqlite(db);
  console.log(`[RAADSPANEEL SCRAPER] Klaar! ${finalList.length} agendapunten opgeslagen (${bespreekstukkenFound} bespreekstukken, ${archivedCount} gearchiveerd).`);

  return db.councilScrapeSummary;
}

/**
 * Schedule daily scraping every 24 hours
 */
let scrapeInterval: NodeJS.Timeout | null = null;
export function startDailyCouncilScraper() {
  if (scrapeInterval) return;

  // Run on startup after 5 seconds
  setTimeout(() => {
    scrapeCouncilAgendas().catch((err) => console.error("[RAADSPANEEL SCRAPER INIT FOUT]:", err));
  }, 5000);

  // Repeat every 24 hours
  scrapeInterval = setInterval(() => {
    console.log("[RAADSPANEEL SCRAPER] 24-uurs automatische scrape cyclus wordt gestart...");
    scrapeCouncilAgendas().catch((err) => console.error("[RAADSPANEEL SCRAPER CRON FOUT]:", err));
  }, 24 * 60 * 60 * 1000);
}
