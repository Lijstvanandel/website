import * as cheerio from "cheerio";
import { CouncilAgendaTopic, CouncilDocument } from "../types/council.js";
import { getDbFromSqlite, saveDbToSqlite, initDatabase } from "./sqliteDatabase.js";

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
 * Procedural keywords and remark patterns that should be filtered out from topics
 */
export const PROCEDURAL_KEYWORDS = [
  "opening",
  "sluiting",
  "agenda",
  "spreekrecht",
  "vragen",
  "besluitenlijst",
  "notulen",
  "mededelingen",
  "beediging",
  "beëdiging",
  "installatie",
  "afscheid",
  "toezegging",
  "advies van de commissie",
  "besluit",
  "pauze",
  "schorsing",
  "hervatting",
  "rondvraag",
  "insprekers",
  "onderwerp",
  "vragenhalfuur",
  "vragenhalfuurtje",
  "vragenkwartier",
];

export const SECTION_HEADER_PATTERNS = [
  "oordeelvorming - hamerstukken",
  "oordeelvorming - bespreekstukken",
  "beeldvorming - bespreekstukken",
  "beeldvorming - hamerstukken",
  "besluitvorming - hamerstukken",
  "besluitvorming - bespreekstukken",
  "hamerstukken",
  "bespreekstukken",
  "politieke markt",
  "raadsvergadering",
  "gemeenteraad",
  "raadsbijeenkomst",
  "presidium",
  "commissie",
  "informatief",
  "informatieve bijeenkomst",
  "algemeen",
];

export function isSectionHeader(rawTitle: string): boolean {
  if (!rawTitle) return true;
  const clean = rawTitle.toLowerCase().replace(/^\d+[.\s-]+/, "").replace(/\s+/g, " ").trim();
  return SECTION_HEADER_PATTERNS.some((h) => clean === h || clean.startsWith(h));
}

export function isProceduralTopic(rawTitle: string): boolean {
  if (!rawTitle) return true;
  const clean = rawTitle.toLowerCase().replace(/^\d+[.\s-]+/, "").replace(/\s+/g, " ").trim();
  return PROCEDURAL_KEYWORDS.some((k) => clean.includes(k));
}

export function isRawDocumentFileName(rawTitle: string): boolean {
  if (!rawTitle) return true;
  const clean = rawTitle.toLowerCase().trim();
  if (/\d+\s*(kb|mb|gb)$/i.test(clean)) return true;
  if (/\.(pdf|docx|xlsx)$/i.test(clean)) return true;
  if (clean.includes("- raadsvoorstel") || clean.includes("- besluitenlijst") || clean.includes("- adviesnota")) return true;
  if (/^zienswijze\s+\d+/i.test(clean) || /^nieuw\s*-\s*/i.test(clean) || /^bijlage\s+\d+/i.test(clean)) return true;
  return false;
}

export function isInvalidOrJunkTopic(rawTitle: string): boolean {
  if (!rawTitle) return true;
  const tLower = rawTitle.toLowerCase().trim();
  if (tLower.startsWith("http://") || tLower.startsWith("https://")) return true;
  if (tLower.includes("de voorzitter sluit") || tLower.includes("de voorzitter opent") || tLower.includes("de voorzitter vermeld") || tLower.includes("zegt toe") || tLower.includes("toezegging")) {
    return true;
  }
  const JUNK = [
    "welkom",
    "vergaderingen",
    "overzichten",
    "wie is wie",
    "uw invloed",
    "veel gestelde vragen",
    "de griffie",
    "ibabs vergadermanagement",
    "bijlagen",
    "inloggen",
    "cookie",
    "cookies",
    "zoek",
    "zoeken",
    "privacy",
    "contact",
  ];
  if (JUNK.includes(tLower)) return true;
  if (/^(dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|maandag)\s+\d{1,2}\s+[a-z]+\s+\d{4}$/i.test(rawTitle)) return true;
  if (isSectionHeader(rawTitle)) return true;
  if (isProceduralTopic(rawTitle)) return true;
  if (isRawDocumentFileName(rawTitle)) return true;
  return false;
}

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
  
  // Ensure DB is initialized
  await initDatabase();

  const scrapedMeetingLinks: { url: string; dateDisplay: string; year: number }[] = [];

  for (const year of yearsToScrape) {
    try {
      const url = `${AGENDAS_API_TEMPLATE}${year}`;
      console.log(`[RAADSPANEEL SCRAPER] Ophalen agenda index voor jaar ${year} van ${url}`);
      
      const res = await fetch(url, {
        signal: AbortSignal.timeout(15000),
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
    if (!isInvalidOrJunkTopic(t.title)) {
      existingTopicsMap.set(t.id, t);
    }
  }

  let totalNewOrUpdated = 0;
  let bespreekstukkenFound = 0;

  // Process meetings with concurrency batching for ultra-fast scraping (2-3s total)
  const batchSize = 4;
  for (let i = 0; i < scrapedMeetingLinks.length; i += batchSize) {
    const batch = scrapedMeetingLinks.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (meeting) => {
        try {
          const meetingIdMatch = meeting.url.match(/Index\/([a-zA-Z0-9-]+)/i);
          const meetingId = meetingIdMatch ? meetingIdMatch[1] : Buffer.from(meeting.url).toString("hex").slice(0, 16);

          const res = await fetch(meeting.url, {
            signal: AbortSignal.timeout(15000),
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LijstVanAndel/1.0",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          });

          if (!res.ok) {
            console.warn(`[RAADSPANEEL SCRAPER] Kon vergadering ${meeting.url} niet openen (${res.status})`);
            return;
          }

          const meetingHtml = await res.text();
          const $ = cheerio.load(meetingHtml);

          // Meeting title
          const pageTitle = $("h1, .page-title, .agenda-title").first().text().replace(/\s+/g, " ").trim() || "Raadsbijeenkomst Steenwijkerland";
          
          // Determine date
          const parsedDate = parseDutchDate(meeting.dateDisplay || pageTitle, meeting.year);

          // Junk / Navigation titles to ignore
          const JUNK_TITLES = new Set([
            "welkom",
            "vergaderingen",
            "overzichten",
            "wie is wie",
            "uw invloed",
            "veel gestelde vragen",
            "de griffie",
            "ibabs vergadermanagement",
            "bijlagen",
            "inloggen",
            "cookie",
            "cookies",
            "zoek",
            "zoeken",
            "privacy",
            "contact",
          ]);

          // Category tracking
          let currentSectionCategory = "Algemeen";

          // Scan actual .agenda-item panels
          $(".panel.agenda-item, .agenda-item").each((index, itemEl) => {
            const itemNumber = $(itemEl).find(".panel-id").first().text().trim() || `${index + 1}`;
            const rawTitle = $(itemEl).find(".panel-title-label, .panel-title, h3, h4").first().text().replace(/\s+/g, " ").trim();
            
            if (!rawTitle) return;

            // Check if this is a section category header (e.g. "4 Oordeelvorming - hamerstukken" or "Bespreekstukken")
            if (isSectionHeader(rawTitle)) {
              const lower = rawTitle.toLowerCase();
              if (lower.includes("hamerstuk")) {
                currentSectionCategory = "Oordeelvorming - hamerstukken";
              } else if (lower.includes("bespreekstuk")) {
                currentSectionCategory = "Oordeelvorming - bespreekstukken";
              } else if (lower.includes("informatief")) {
                currentSectionCategory = "Informatief";
              }
              return; // Category headers are NOT standalone agenda topics!
            }

            // Ignore pure navigation junk, remarks, procedural topics (e.g. Besluitenlijst, Vragen stellen, Sluiting, Opening, Toezeggingen)
            if (isInvalidOrJunkTopic(rawTitle)) {
              return;
            }

            // Extract attached documents within this agenda item only
            const docLinks: CouncilDocument[] = [];
            $(itemEl).find(".list-attachments a[href*='/Agenda/Document/'], a[href*='/Agenda/Document/'], a[href*='/Document/'], a[href*='.pdf']").each((_, docEl) => {
              const docHref = $(docEl).attr("href");
              if (!docHref) return;

              const fullDocUrl = docHref.startsWith("http") ? docHref : `${BASE_URL}${docHref.startsWith("/") ? "" : "/"}${docHref}`;
              
              // Clone and remove badge/icon text for clean title
              const clone = $(docEl).clone();
              const badgeSize = clone.find(".badge").text().trim();
              clone.find(".badge, .icon, .sr-only").remove();
              let docTitle = clone.text().replace(/\s+/g, " ").trim();

              if (!docTitle) {
                docTitle = $(docEl).attr("title") || `Bijlage document`;
              }
              if (badgeSize && !docTitle.includes(badgeSize)) {
                docTitle = `${docTitle} (${badgeSize})`;
              }

              const docIdMatch = fullDocUrl.match(/documentId=([a-zA-Z0-9-]+)/i) || fullDocUrl.match(/Document\/([a-zA-Z0-9-]+)/i);
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

            // If an item has 0 documents and title is less than 15 chars or purely generic, skip
            if (docLinks.length === 0 && (rawTitle.length < 15 || rawTitle.split(" ").length < 3)) {
              return;
            }

            // Determine category & relevance
            let topicCategory = currentSectionCategory;
            const lowerTitle = rawTitle.toLowerCase();
            if (lowerTitle.includes("bespreekstuk") || lowerTitle.includes("oordeelvorming")) {
              topicCategory = "Oordeelvorming - bespreekstukken";
            } else if (lowerTitle.includes("hamerstuk")) {
              topicCategory = "Oordeelvorming - hamerstukken";
            } else if (docLinks.length > 0 && topicCategory === "Algemeen") {
              topicCategory = "Oordeelvorming - bespreekstukken";
            }

            if (topicCategory === "Oordeelvorming - bespreekstukken") {
              bespreekstukkenFound++;
            }

            const bodyDescription = $(itemEl).find(".panel-body .text").first().text().replace(/\s+/g, " ").trim() || "";
            const topicId = `topic_${meetingId}_${itemNumber.replace(/[^a-zA-Z0-9]/g, "_")}`;
            const existing = existingTopicsMap.get(topicId);

            // Merge viewed status from existing topic
            const mergedDocs = docLinks.map((newDoc) => {
              const existingDoc = existing?.documents?.find((d) => d.id === newDoc.id);
              return {
                ...newDoc,
                viewedBy: existingDoc?.viewedBy || [],
              };
            });

            const updatedTopic: CouncilAgendaTopic = {
              id: topicId,
              meetingId,
              meetingDate: parsedDate.dateIso,
              meetingDateDisplay: parsedDate.display,
              meetingTitle: pageTitle,
              meetingType: pageTitle.includes("Oordeel") ? "Oordeelsvormend" : "Raadsvergadering",
              agendaItemNumber: itemNumber,
              category: topicCategory,
              title: rawTitle,
              description: bodyDescription.slice(0, 800),
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
          });
        } catch (meetingErr: unknown) {
          const error = meetingErr as Error;
          console.error(`[RAADSPANEEL SCRAPER] Fout bij verwerken vergadering ${meeting.url}:`, error?.message);
        }
      })
    );
  }

  // Purge any older junk entries, procedural remarks, section headers, or loose file records
  for (const [id, topic] of existingTopicsMap.entries()) {
    if (isInvalidOrJunkTopic(topic.title)) {
      existingTopicsMap.delete(id);
      continue;
    }
    // Also purge if topic has 0 documents and is not assigned and has no notes
    if (
      (!topic.documents || topic.documents.length === 0) &&
      !topic.assignedTo &&
      (!topic.notes || topic.notes.length === 0) &&
      (topic.title.length < 15 || topic.title.split(" ").length < 3)
    ) {
      existingTopicsMap.delete(id);
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

/**
 * Clear all unassigned topics, leaving topics that are assigned or have notes/activity intact.
 */
export function clearUnassignedCouncilTopics(): { removedCount: number; remainingCount: number } {
  const db = getDbFromSqlite();
  const existingTopics: CouncilAgendaTopic[] = Array.isArray(db.councilAgendaTopics) ? db.councilAgendaTopics : [];
  
  // Keep topics that are assigned to someone OR have notes OR have been marked viewed
  const keptTopics = existingTopics.filter((t) => {
    const isAssigned = !!t.assignedTo;
    const hasNotes = Array.isArray(t.notes) && t.notes.length > 0;
    const hasViewedDocs = Array.isArray(t.documents) && t.documents.some((d) => Array.isArray(d.viewedBy) && d.viewedBy.length > 0);
    return isAssigned || hasNotes || hasViewedDocs;
  });

  const removedCount = existingTopics.length - keptTopics.length;
  db.councilAgendaTopics = keptTopics;
  
  if (db.councilScrapeSummary) {
    db.councilScrapeSummary.totalTopics = keptTopics.length;
    db.councilScrapeSummary.bespreekstukkenCount = keptTopics.filter((t: any) => t.category === "Oordeelvorming - bespreekstukken" && !t.isArchived).length;
    db.councilScrapeSummary.archivedCount = keptTopics.filter((t: any) => t.isArchived).length;
  }
  
  saveDbToSqlite(db);
  console.log(`[RAADSPANEEL SCRAPER] ${removedCount} onverdeelde onderwerpen gewist. ${keptTopics.length} behouden.`);
  return { removedCount, remainingCount: keptTopics.length };
}

