import { CouncilAgendaTopic, CouncilDocument, CouncilTopicDiffAlert } from "../types/council.js";
import { getDbFromSqlite, saveDbToSqlite, initDatabase } from "./sqliteDatabase.js";
import { notifyDocumentDiffDetected } from "./pushService.js";
import { detectHoogeveenWijken } from "./hoogeveenTaxonomy.js";
import { sanitizeCleanText, isCorruptOrHtmlGarbage } from "./scraperContractValidator.js";

const HOOGEVEEN_ORG_ID = "572";
const NOTUBIZ_API_BASE = "https://api.notubiz.nl";

export const PROCEDURAL_KEYWORDS_HOOGEVEEN = [
  "opening",
  "sluiting",
  "agenda",
  "spreekrecht",
  "vragenhalfuur",
  "vragenkwartier",
  "mondelinge vragen",
  "besluitenlijst",
  "notulen",
  "mededelingen",
  "beediging",
  "beëdiging",
  "installatie",
  "afscheid",
  "toezegging",
  "schorsing",
  "hervatting",
  "rondvraag",
  "insprekers",
  "ingekomen stukken",
];

export function isHoogeveenProceduralTopic(rawTitle: string): boolean {
  if (!rawTitle) return true;
  const clean = rawTitle.toLowerCase().replace(/^\d+[.\s-]+/, "").replace(/\s+/g, " ").trim();
  return PROCEDURAL_KEYWORDS_HOOGEVEEN.some((k) => clean === k || clean.startsWith(k));
}

let watchdogTimerHoogeveen: NodeJS.Timeout | null = null;

function scheduleNextHoogeveenWatchdogScrape(delayMs: number) {
  if (watchdogTimerHoogeveen) {
    clearTimeout(watchdogTimerHoogeveen);
    watchdogTimerHoogeveen = null;
  }
  watchdogTimerHoogeveen = setTimeout(async () => {
    console.log("[HOOGEVEEN WATCHDOG] Starten van geplande automatische scrape en diff-check cyclus...");
    try {
      await scrapeCouncilAgendasHoogeveen();
    } catch (err: any) {
      console.error("[HOOGEVEEN WATCHDOG FOUT]:", err?.message);
      scheduleNextHoogeveenWatchdogScrape(30 * 60 * 1000);
    }
  }, delayMs);
}

/**
 * Scrapes meetings and agenda topics autonomously for Gemeente Hoogeveen via NotuBiz API (Org 572)
 */
export async function scrapeCouncilAgendasHoogeveen(yearsToScrape: number[] = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1]) {
  console.log(`[HOOGEVEEN SCRAPER] Start scraping voor Gemeente Hoogeveen (jaren: ${yearsToScrape.join(", ")})...`);
  await initDatabase();

  const minYear = Math.min(...yearsToScrape);
  const maxYear = Math.max(...yearsToScrape);

  // Fetch events list for Hoogeveen
  const eventsUrl = new URL(`${NOTUBIZ_API_BASE}/events`);
  eventsUrl.searchParams.set("organisation_id", HOOGEVEEN_ORG_ID);
  eventsUrl.searchParams.set("date_from", `${minYear}-01-01 00:00:00`);
  eventsUrl.searchParams.set("date_to", `${maxYear}-12-31 23:59:59`);
  eventsUrl.searchParams.set("format", "json");
  eventsUrl.searchParams.set("version", "1.17.0");

  const eventsRes = await fetch(eventsUrl.toString(), {
    signal: AbortSignal.timeout(20000),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LijstVanAndel/1.0",
      "Accept": "application/json",
    },
  });

  if (!eventsRes.ok) {
    throw new Error(`Kon NotuBiz events voor Hoogeveen niet ophalen (status: ${eventsRes.status})`);
  }

  const eventsData = await eventsRes.json();
  const allEvents: any[] = Array.isArray(eventsData.events) ? eventsData.events : [];
  const meetingEvents = allEvents.filter((e) => e.type === "meeting" || e.event_type_data);

  console.log(`[HOOGEVEEN SCRAPER] ${meetingEvents.length} vergaderingen gevonden op NotuBiz. Detailgegevens ophalen...`);

  const db = getDbFromSqlite();
  const existingTopicsAll: CouncilAgendaTopic[] = Array.isArray(db.councilAgendaTopics) ? db.councilAgendaTopics : [];
  const existingHoogeveenTopics = existingTopicsAll.filter((t: any) => t.municipality === "hoogeveen");
  const existingTopicsMap = new Map<string, CouncilAgendaTopic>();
  for (const t of existingHoogeveenTopics) {
    existingTopicsMap.set(t.id, t);
  }

  let totalNewOrUpdated = 0;
  let bespreekstukkenFound = 0;
  let totalDiffsDetected = 0;
  let totalLateDumpsDetected = 0;

  // Process meetings in parallel batches
  const batchSize = 4;
  for (let i = 0; i < meetingEvents.length; i += batchSize) {
    const batch = meetingEvents.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (event) => {
        try {
          const meetingId = String(event.id);
          const detailUrl = `${NOTUBIZ_API_BASE}/events/meetings/${meetingId}?format=json&version=1.17.0`;
          const mRes = await fetch(detailUrl, {
            signal: AbortSignal.timeout(15000),
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LijstVanAndel/1.0",
              "Accept": "application/json",
            },
          });

          if (!mRes.ok) return;
          const mData = await mRes.json();
          const meeting = mData.meeting;
          if (!meeting) return;

          // Determine title
          const titleAttr = meeting.attributes?.find((a: any) => a.id === 1)?.value || meeting.description || "Raadsvergadering Hoogeveen";
          const pageTitle = sanitizeCleanText(titleAttr) || "Raadsvergadering Hoogeveen";

          // Determine date
          let meetingDateIso = "";
          let meetingDateDisplay = "";
          if (meeting.plannings && meeting.plannings.length > 0 && meeting.plannings[0].start_date) {
            meetingDateIso = meeting.plannings[0].start_date.slice(0, 10);
            try {
              const d = new Date(meeting.plannings[0].start_date);
              meetingDateDisplay = d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
            } catch {
              meetingDateDisplay = meetingDateIso;
            }
          } else if (meeting.creation_date) {
            meetingDateIso = meeting.creation_date.slice(0, 10);
            meetingDateDisplay = meetingDateIso;
          }

          const agendaItems: any[] = Array.isArray(meeting.agenda_items) ? meeting.agenda_items : [];

          // Helper to process an agenda item (and its children)
          const processItem = (item: any, prefix = "") => {
            const td = item.type_data || {};
            const itemNumber = td.title_prefix || prefix || String(item.order || item.id);
            const rawTitle = td.attributes?.find((a: any) => a.id === 1)?.value || td.title || item.title || "";
            const cleanTitle = sanitizeCleanText(rawTitle);

            if (!cleanTitle || isCorruptOrHtmlGarbage(cleanTitle)) return;

            // Check if procedural
            if (isHoogeveenProceduralTopic(cleanTitle) && (!item.documents || item.documents.length === 0)) {
              return;
            }

            // Extract attached documents
            const rawDocs: any[] = Array.isArray(item.documents) ? item.documents : (Array.isArray(td.documents) ? td.documents : []);
            const docLinks: CouncilDocument[] = [];

            for (const doc of rawDocs) {
              const docId = String(doc.id || doc.document_id);
              const docTitle = sanitizeCleanText(doc.title || doc.description || `Bijlage document`) || "Bijlage document";
              const version = doc.version || 1;
              const docUrl = doc.url || `${NOTUBIZ_API_BASE}/document/${docId}/${version}`;

              if (!docLinks.some((d) => d.id === docId)) {
                docLinks.push({
                  id: docId,
                  title: docTitle,
                  url: docUrl,
                  fileType: docTitle.toLowerCase().endsWith(".xlsx") || docTitle.toLowerCase().includes("excel") ? "XLS" : (docTitle.toLowerCase().endsWith(".docx") || docTitle.toLowerCase().endsWith(".doc")) ? "DOC" : "PDF",
                  viewedBy: [],
                });
              }
            }

            // Skip if purely procedural or no documents & very short title
            if (docLinks.length === 0 && (cleanTitle.length < 15 || cleanTitle.split(" ").length < 3)) {
              return;
            }

            // Category determination
            let topicCategory = "Algemeen";
            const lowerTitle = cleanTitle.toLowerCase();
            if (lowerTitle.includes("bespreek") || lowerTitle.includes("oordeel") || docLinks.length > 0) {
              topicCategory = "Oordeelvorming - bespreekstukken";
              bespreekstukkenFound++;
            } else if (lowerTitle.includes("hamer")) {
              topicCategory = "Oordeelvorming - hamerstukken";
            } else if (lowerTitle.includes("informatief") || lowerTitle.includes("beeld")) {
              topicCategory = "Informatief";
            }

            const topicId = `hg_topic_${meetingId}_${itemNumber.replace(/[^a-zA-Z0-9]/g, "_")}`;
            const existing = existingTopicsMap.get(topicId);

            // Diff and late dump detection
            const meetingDateObj = new Date(meetingDateIso);
            const nowTime = Date.now();
            const hoursUntilMeeting = (meetingDateObj.getTime() - nowTime) / (1000 * 60 * 60);
            const dayOfWeek = new Date().getDay();
            const isWithin48h = hoursUntilMeeting <= 48 && hoursUntilMeeting >= -12;
            const isThursdayOrFriday = dayOfWeek === 4 || dayOfWeek === 5;
            const isLateDumpWindow = isWithin48h || (isThursdayOrFriday && hoursUntilMeeting <= 96 && hoursUntilMeeting > 0);

            const existingDocs = existing?.documents || [];
            const detectedNewDocs: CouncilDocument[] = [];
            let topicHasLateDump = existing?.hasRecentDump || false;

            const mergedDocs: CouncilDocument[] = docLinks.map((newDoc) => {
              const existingDoc = existingDocs.find(
                (d) => d.id === newDoc.id ||
                       (d.url && newDoc.url && d.url.toLowerCase().trim() === newDoc.url.toLowerCase().trim()) ||
                       d.title.toLowerCase().trim() === newDoc.title.toLowerCase().trim()
              );

              if (existingDoc) {
                return {
                  ...newDoc,
                  addedAt: existingDoc.addedAt || existing?.scrapedAt || new Date().toISOString(),
                  isLateDump: existingDoc.isLateDump || false,
                  isNewAfterCompile: existingDoc.isNewAfterCompile || false,
                  viewedBy: existingDoc.viewedBy || [],
                };
              } else {
                const isDump = (existing && existingDocs.length > 0) ? isLateDumpWindow : false;
                if (isDump) topicHasLateDump = true;
                const isAfterCompile = !!(
                  existing?.compiledDossier &&
                  new Date().getTime() > new Date(existing.compiledDossier.compiledAt).getTime()
                );

                const docWithMeta: CouncilDocument = {
                  ...newDoc,
                  addedAt: new Date().toISOString(),
                  isLateDump: isDump,
                  isNewAfterCompile: isAfterCompile,
                  viewedBy: [],
                };
                if (existing && existingDocs.length > 0) {
                  detectedNewDocs.push(docWithMeta);
                }
                return docWithMeta;
              }
            });

            // Geographic wijk detection specifically for Hoogeveen
            const detectedWijken = detectHoogeveenWijken(cleanTitle, "", "", "");

            const newDiffAlerts: CouncilTopicDiffAlert[] = [];
            if (detectedNewDocs.length > 0 && existing && existingDocs.length > 0) {
              totalDiffsDetected += detectedNewDocs.length;
              if (topicHasLateDump) totalLateDumpsDetected += detectedNewDocs.length;

              for (const nd of detectedNewDocs) {
                const isBespreek = topicCategory === "Oordeelvorming - bespreekstukken";
                const summaryMsg = nd.isLateDump
                  ? `[VRIJDAGMIDDAG-DUMP: Nieuw document toegevoegd aan Hoogeveen ${isBespreek ? "Bespreekstuk" : "Agendapunt"} "${cleanTitle}"]: "${nd.title}"`
                  : `[UPDATE DETECTEERD: Nieuw document toegevoegd aan Hoogeveen ${isBespreek ? "Bespreekstuk" : "Agendapunt"} "${cleanTitle}"]: "${nd.title}"`;

                const alertItem: CouncilTopicDiffAlert = {
                  id: `diff_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                  topicId,
                  detectedAt: new Date().toISOString(),
                  type: "new_document",
                  documentTitle: nd.title,
                  documentUrl: nd.url,
                  documentId: nd.id,
                  summary: summaryMsg,
                  isDumpAlert: !!nd.isLateDump,
                  hoursBeforeMeeting: Math.round(hoursUntilMeeting),
                  dismissed: false,
                };
                newDiffAlerts.push(alertItem);
              }
            }

            const updatedTopic: CouncilAgendaTopic = {
              id: topicId,
              meetingId,
              meetingDate: meetingDateIso,
              meetingDateDisplay: meetingDateDisplay || meetingDateIso,
              meetingTitle: pageTitle,
              meetingType: pageTitle.includes("Besluit") ? "Raadsvergadering" : "Oordeelsvormend",
              agendaItemNumber: itemNumber,
              title: cleanTitle,
              description: existing?.description || `Agendapunt ${itemNumber} van de ${pageTitle} (Gemeente Hoogeveen).`,
              assignedTo: existing?.assignedTo || null,
              assignedName: existing?.assignedName || null,
              assignedAt: existing?.assignedAt || null,
              documents: mergedDocs,
              notes: existing?.notes || [],
              isArchived: existing?.isArchived || false,
              archivedAt: existing?.archivedAt || null,
              sourceUrl: `https://hoogeveen.raadsinformatie.nl/vergadering/${meetingId}`,
              scrapedAt: new Date().toISOString(),
              // Scoped strictly to Hoogeveen
              municipality: "hoogeveen",
              wijken: detectedWijken,
              // Status & Geparkeerd state
              isParked: existing?.isParked || false,
              parkedReason: existing?.parkedReason,
              parkedAt: existing?.parkedAt || null,
              parkedBy: existing?.parkedBy || null,
              previousCategory: existing?.previousCategory || null,
              category: existing?.isParked ? (existing.category || topicCategory) : topicCategory,

              compiledDossier: existing?.compiledDossier || null,
              linkedDossierSlug: existing?.linkedDossierSlug || null,
              linkedDossierId: existing?.linkedDossierId || null,
              bijdragePolitiekeMarkt: existing?.bijdragePolitiekeMarkt || "",
              bijdrageRaadsvergadering: existing?.bijdrageRaadsvergadering || "",
              markAsHamerstuk: existing?.markAsHamerstuk || false,

              hasRecentDump: topicHasLateDump,
              hasDocumentDiff: (existing?.hasDocumentDiff && (existing.diffAlerts || []).some((a) => !a.dismissed)) || detectedNewDocs.length > 0,
              lastDiffDetectedAt: detectedNewDocs.length > 0 ? new Date().toISOString() : (existing?.lastDiffDetectedAt || null),
              diffAlerts: [...newDiffAlerts, ...(existing?.diffAlerts || [])],
              hasNewDocumentsSinceCompile: existing?.compiledDossier ? (existing.hasNewDocumentsSinceCompile || detectedNewDocs.length > 0) : false,
              newDocumentsCountSinceCompile: (existing?.newDocumentsCountSinceCompile || 0) + (existing?.compiledDossier ? detectedNewDocs.length : 0),
            };

            existingTopicsMap.set(topicId, updatedTopic);
            totalNewOrUpdated++;

            // Recursively process child agenda items
            if (Array.isArray(item.agenda_items)) {
              item.agenda_items.forEach((sub: any, sIdx: number) => {
                processItem(sub, `${itemNumber}.${sIdx + 1}`);
              });
            }
          };

          agendaItems.forEach((item, idx) => processItem(item, `${idx + 1}`));
        } catch (mErr: any) {
          console.error(`[HOOGEVEEN SCRAPER] Fout bij verwerken vergadering ${event.id}:`, mErr?.message);
        }
      })
    );
  }

  // Auto archive topics older than 7 days
  const now = new Date();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  let archivedCount = 0;

  const hoogeveenTopicsList: CouncilAgendaTopic[] = [];
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
    } catch {
      // ignore
    }
    hoogeveenTopicsList.push(topic);
  }

  // Sort upcoming first
  hoogeveenTopicsList.sort((a, b) => {
    if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1;
    return a.meetingDate.localeCompare(b.meetingDate);
  });

  // Safely merge with topics of other municipalities (Steenwijkerland)
  const nonHoogeveenTopics = existingTopicsAll.filter((t: any) => t.municipality !== "hoogeveen");
  db.councilAgendaTopics = [...nonHoogeveenTopics, ...hoogeveenTopicsList];

  const summary = {
    lastScrapedAt: new Date().toISOString(),
    totalMeetingsScraped: meetingEvents.length,
    totalTopics: hoogeveenTopicsList.length,
    bespreekstukkenCount: hoogeveenTopicsList.filter((t) => t.category === "Oordeelvorming - bespreekstukken" && !t.isArchived).length,
    archivedCount,
    status: "success",
    municipality: "hoogeveen",
    lastDiffCheckAt: new Date().toISOString(),
    diffsDetectedCount: totalDiffsDetected,
    lateDumpsDetectedCount: totalLateDumpsDetected,
  };

  db.councilScrapeSummaryHoogeveen = summary;
  saveDbToSqlite(db);

  console.log(`[HOOGEVEEN SCRAPER] Voltooid! ${hoogeveenTopicsList.length} Hoogeveen agendapunten opgeslagen (${bespreekstukkenFound} bespreekstukken).`);

  // Schedule next watchdog run
  scheduleNextHoogeveenWatchdogScrape(120 * 60 * 1000); // 2 hours
  return summary;
}

export function startHoogeveenCouncilWatchdogScheduler() {
  setTimeout(() => {
    scrapeCouncilAgendasHoogeveen().catch((err) => console.error("[HOOGEVEEN SCRAPER INIT FOUT]:", err));
  }, 10000);
}
