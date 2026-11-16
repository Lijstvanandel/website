import { getDbFromSqlite, saveDbToSqlite } from "./sqliteDatabase.js";
import {
  getRawMetadata,
  saveMasterMetadata,
  invalidateDossierCache,
  slugify,
  getSubdossierThumbnail,
} from "./dossierManager.js";
import {
  normalizeHoofddossier,
  normalizeSubdossier,
  detectWijkenKernen,
  CANONICAL_PRIMARY_SUBDOSSIERS,
  CanonicalHoofddossier,
} from "./taxonomyClassifier.js";
import { getCouncilDocumentContent } from "./documentTextExtractor.js";
import type { RaadsstukMetadata } from "../types/dossier.js";
import type { CouncilAgendaTopic } from "../types/council.js";

const lastSyncStats = {
  lastSyncedAt: null as string | null,
  steenwijkerland: { topics: 0, newDocsAdded: 0, upgradedWijkenCount: 0, totalDocs: 0 },
  isRunning: false,
};

export function getAgendaDossierSyncStatus() {
  return lastSyncStats;
}

/**
 * Synchronizes all scraped Steenwijkerland agenda documents into the master metadata
 * and distributes them across the 7 canonical hoofddossiers and relevant subdossiers,
 * including full 42-wijk/kern detection (title, description, street aliases & PDF content).
 */
export async function syncSteenwijkerlandAgendaToDossiers(): Promise<{
  success: boolean;
  topicsProcessed: number;
  newDocsAdded: number;
  upgradedWijkenCount: number;
  totalMasterDocs: number;
}> {
  const db = getDbFromSqlite();
  const allTopics: CouncilAgendaTopic[] = Array.isArray(db.councilAgendaTopics) ? db.councilAgendaTopics : [];
  const swlTopics = allTopics.filter((t) => (t.municipality || "steenwijkerland").toLowerCase() === "steenwijkerland");

  if (!db.customSubdossiers) db.customSubdossiers = {};

  const masterList = getRawMetadata();
  const byFileMap = new Map<string, RaadsstukMetadata>();
  const byUrlMap = new Map<string, RaadsstukMetadata>();
  const byTitleMap = new Map<string, RaadsstukMetadata>();

  for (const item of masterList) {
    if (!item) continue;
    const fn = (item.bestandsnaam || "").toLowerCase().trim();
    const url = (item.bestand_url || "").toLowerCase().trim();
    const ttl = (item.titel || "").toLowerCase().trim();
    if (fn) byFileMap.set(fn, item);
    if (url) byUrlMap.set(url, item);
    if (ttl) byTitleMap.set(ttl, item);
  }

  let newDocsAdded = 0;
  let upgradedWijkenCount = 0;
  // Cap remote PDF downloads per sync cycle so startup & auto-sync remain fast
  let pdfExtractBudget = 15;

  const resolveWijkListForDoc = async (
    docTitle: string,
    topicTitle: string,
    topicDesc: string,
    docObj?: { id?: string; url?: string }
  ): Promise<string[]> => {
    // 1. Check document title + topic title + description across all 42 wijken/kernen & street aliases
    let wijken = detectWijkenKernen(`${docTitle} ${topicTitle}`, "", topicDesc);
    if (wijken.length > 0) return wijken;

    // 2. Fall back to PDF content (cached disk shards & local PDFs first, bounded remote fetches)
    if (docObj && (docObj.id || docObj.url) && pdfExtractBudget > 0) {
      try {
        pdfExtractBudget--;
        const pdfText = await getCouncilDocumentContent({
          id: docObj.id,
          title: docTitle,
          url: docObj.url,
        });
        if (pdfText && pdfText.trim().length > 0) {
          wijken = detectWijkenKernen("", "", pdfText);
          if (wijken.length > 0) return wijken;
        }
      } catch (_pdfErr) {
        // Ignore transient PDF extraction failures during sync
      }
    }

    return [];
  };

  for (const topic of swlTopics) {
    const docs = Array.isArray(topic.documents) ? topic.documents : [];
    const topicTitle = (topic.title || "").trim();
    const topicDesc = (topic.description || "").trim();
    const topicWijken = detectWijkenKernen(topicTitle, "", topicDesc);

    // Determine canonical hoofddossier
    const canonicalHoofd = normalizeHoofddossier(topicTitle, topicDesc, topic.category) as CanonicalHoofddossier;
    const hoofdSlug = slugify(canonicalHoofd);

    // Determine clean subdossier title
    const cleanTopicTitle = topicTitle
      .replace(/^\d+[.\s-]+/, "")
      .replace(/^raadsvoorstel\s*[:-]?\s*/i, "")
      .replace(/^nota\s*[:-]?\s*/i, "")
      .replace(/^bespreekstuk\s*[:-]?\s*/i, "")
      .trim();

    // Check if there is an exact matching canonical subdossier
    const customSubs = db.customSubdossiers[canonicalHoofd] || [];
    let subTitle = normalizeSubdossier(
      canonicalHoofd,
      topicTitle,
      topicDesc,
      topicWijken.join(", "),
      undefined,
      customSubs
    );

    const primaryGeneric = CANONICAL_PRIMARY_SUBDOSSIERS[canonicalHoofd];
    if ((subTitle === primaryGeneric || subTitle === "Algemeen") && cleanTopicTitle.length >= 6 && cleanTopicTitle.length <= 60) {
      subTitle = cleanTopicTitle;
    }

    const subSlug = slugify(subTitle);
    const subKey = `${hoofdSlug}:${subSlug}`;

    // Register subdossier in customSubdossiers so it's guaranteed to be visible
    if (!db.customSubdossiers[subKey] && subTitle !== primaryGeneric) {
      db.customSubdossiers[subKey] = {
        id: subSlug,
        title: subTitle,
        slug: subSlug,
        hoofddossier: canonicalHoofd,
        description: `Officiële raadsvoorstellen en vergaderstukken rondom ${subTitle}.`,
        thumbnail: getSubdossierThumbnail(subTitle, canonicalHoofd),
        tags: [topic.category, ...topicWijken],
        createdAt: topic.meetingDate || new Date().toISOString(),
      };
    }

    const isBespreek = (topic.category || "").toLowerCase().includes("bespreek") || topicTitle.toLowerCase().includes("bespreek");

    // Ingest or upgrade each document in master metadata
    for (const doc of docs) {
      const rawDocTitle = (doc.title || "Vergaderstuk").trim();
      const isGeneric = !rawDocTitle || /^(raadsvoorstel|bijlage|nota|voorstel|besluit|brief|document|overig|stuk)(\s*[-_.:\d]*)?$/i.test(rawDocTitle);
      const enrichedTitle = isGeneric
        ? `${rawDocTitle ? `${rawDocTitle} - ` : ""}${cleanTopicTitle}`
        : (rawDocTitle.toLowerCase().includes(cleanTopicTitle.toLowerCase().slice(0, 15)) ? rawDocTitle : `${rawDocTitle} (${cleanTopicTitle})`);

      const safeFilename = `${slugify(enrichedTitle) || doc.id}.pdf`;
      const fileLower = safeFilename.toLowerCase();
      const titleLower = enrichedTitle.toLowerCase();
      const urlLower = (doc.url || "").toLowerCase().trim();

      const existingItem =
        byFileMap.get(fileLower) ||
        (urlLower ? byUrlMap.get(urlLower) : undefined) ||
        byTitleMap.get(titleLower);

      if (existingItem) {
        // Upgrade existing items previously tagged as "Gemeentebreed" / empty when we now detect specific wijken/kernen
        const currentWijk = (existingItem.wijk_of_kern || "").trim();
        if (!currentWijk || currentWijk.toLowerCase() === "gemeentebreed") {
          const detectedWijken = topicWijken.length > 0
            ? topicWijken
            : await resolveWijkListForDoc(enrichedTitle, topicTitle, topicDesc, { id: doc.id, url: doc.url });
          if (detectedWijken.length > 0) {
            const wijkStr = detectedWijken.join(", ");
            existingItem.wijk_of_kern = wijkStr;
            const currentEntities = (existingItem.entiteiten || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            for (const w of detectedWijken) {
              if (!currentEntities.some((e) => e.toLowerCase() === w.toLowerCase())) {
                currentEntities.push(w);
              }
            }
            existingItem.entiteiten = currentEntities.join(", ");
            upgradedWijkenCount++;
          }
        }
        continue;
      }

      const detectedWijken = topicWijken.length > 0
        ? topicWijken
        : await resolveWijkListForDoc(enrichedTitle, topicTitle, topicDesc, { id: doc.id, url: doc.url });
      const wijkValue = detectedWijken.length > 0 ? detectedWijken.join(", ") : "Gemeentebreed";

      const metaItem: RaadsstukMetadata = {
        id: `swl_ibabs_${doc.id}`,
        bestandsnaam: safeFilename,
        titel: enrichedTitle,
        dossier: canonicalHoofd,
        subdossier: subTitle,
        wijk_of_kern: wijkValue,
        datum: topic.meetingDate || new Date().toISOString().slice(0, 10),
        entiteiten: `Gemeenteraad Steenwijkerland, ${topic.category}, ${isBespreek ? "Bespreekstukken" : "Vergaderagenda"}${detectedWijken.length > 0 ? `, ${detectedWijken.join(", ")}` : ""}`,
        relaties: `Vergaderagenda: ${topic.meetingTitle} (${topic.meetingDateDisplay || topic.meetingDate}), Agendapunt: ${topicTitle}, Categorie: ${topic.category}`,
        bestand_url: doc.url,
      };

      masterList.push(metaItem);
      byFileMap.set(fileLower, metaItem);
      byTitleMap.set(titleLower, metaItem);
      if (urlLower) byUrlMap.set(urlLower, metaItem);
      newDocsAdded++;
    }

    // If agenda item has no documents attached, register the topic itself as an entry
    if (docs.length === 0 && cleanTopicTitle.length >= 3) {
      const topicFilename = `${slugify(cleanTopicTitle) || topic.id}.pdf`;
      const fileLower = topicFilename.toLowerCase();
      const titleLower = `agendapunt: ${cleanTopicTitle.toLowerCase()}`;
      const existingTopicItem = byFileMap.get(fileLower) || byTitleMap.get(titleLower);

      if (existingTopicItem) {
        const currentWijk = (existingTopicItem.wijk_of_kern || "").trim();
        if ((!currentWijk || currentWijk.toLowerCase() === "gemeentebreed") && topicWijken.length > 0) {
          existingTopicItem.wijk_of_kern = topicWijken.join(", ");
          upgradedWijkenCount++;
        }
      } else {
        const topicUrl = topic.sourceUrl || (topic.meetingId ? `https://steenwijkerland.bestuurlijkeinformatie.nl/Agenda/Index/${topic.meetingId}` : undefined);
        const wijkValue = topicWijken.length > 0 ? topicWijken.join(", ") : "Gemeentebreed";
        const metaItem: RaadsstukMetadata = {
          id: `swl_topic_${topic.id}`,
          bestandsnaam: topicFilename,
          titel: `Agendapunt: ${cleanTopicTitle}`,
          dossier: canonicalHoofd,
          subdossier: subTitle,
          wijk_of_kern: wijkValue,
          datum: topic.meetingDate || new Date().toISOString().slice(0, 10),
          entiteiten: `Gemeenteraad Steenwijkerland, ${topic.category}, ${isBespreek ? "Bespreekstukken" : "Vergaderagenda"}${topicWijken.length > 0 ? `, ${topicWijken.join(", ")}` : ""}`,
          relaties: `Vergaderagenda: ${topic.meetingTitle} (${topic.meetingDateDisplay || topic.meetingDate}), Agendapunt: ${topicTitle}, Categorie: ${topic.category}`,
          bestand_url: topicUrl,
        };
        masterList.push(metaItem);
        byFileMap.set(fileLower, metaItem);
        byTitleMap.set(titleLower, metaItem);
        newDocsAdded++;
      }
    }
  }

  if (newDocsAdded > 0 || upgradedWijkenCount > 0) {
    saveMasterMetadata(masterList);
    saveDbToSqlite(db);
    invalidateDossierCache();
    console.log(
      `[AGENDA DOSSIER SYNC] Steenwijkerland: ${newDocsAdded} nieuwe agendastukken verdeeld, ${upgradedWijkenCount} bestaande stukken verrijkt met wijk/kern.`
    );
  }

  lastSyncStats.steenwijkerland = {
    topics: swlTopics.length,
    newDocsAdded,
    upgradedWijkenCount,
    totalDocs: masterList.length,
  };

  return {
    success: true,
    topicsProcessed: swlTopics.length,
    newDocsAdded,
    upgradedWijkenCount,
    totalMasterDocs: masterList.length,
  };
}

/**
 * Complete synchronization for Steenwijkerland:
 * - Scraped Steenwijkerland agenda documents -> Master metadata & subdossiers
 */
export async function syncAllAgendaTopicsToDossiers(): Promise<typeof lastSyncStats> {
  if (lastSyncStats.isRunning) {
    return lastSyncStats;
  }

  lastSyncStats.isRunning = true;
  console.log("[AGENDA DOSSIER SYNC] Automatische synchronisatie van agendastukken naar dossiers gestart...");

  try {
    await syncSteenwijkerlandAgendaToDossiers();

    lastSyncStats.lastSyncedAt = new Date().toISOString();
    console.log(
      `[AGENDA DOSSIER SYNC] Voltooid! Steenwijkerland (+${lastSyncStats.steenwijkerland.newDocsAdded} nieuw, ${lastSyncStats.steenwijkerland.upgradedWijkenCount} wijk-verrijkingen).`
    );
  } catch (err: any) {
    console.error("[AGENDA DOSSIER SYNC FOUT]:", err?.message || err);
  } finally {
    lastSyncStats.isRunning = false;
  }

  return lastSyncStats;
}
