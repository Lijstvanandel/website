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
  CANONICAL_PRIMARY_SUBDOSSIERS,
  CanonicalHoofddossier,
} from "./taxonomyClassifier.js";
import type { RaadsstukMetadata, Dossier } from "../types/dossier.js";
import type { CouncilAgendaTopic, CouncilDocument } from "../types/council.js";

const STEENWIJKERLAND_KERNEN = [
  "steenwijk", "giethoorn", "blokzijl", "vollenhove", "oldemarkt", "kuinre",
  "willemsoord", "tuk", "ossenzijl", "sint jansklooster", "witte paarden",
  "steenwijkerwold", "scheerwolde", "belt-schutsloot", "onna", "kalenberg"
];

function detectSteenwijkerlandWijk(title: string, desc = ""): string | null {
  const combined = `${title} ${desc}`.toLowerCase();
  for (const kern of STEENWIJKERLAND_KERNEN) {
    const regex = new RegExp(`\\b${kern}\\b`, "i");
    if (regex.test(combined)) {
      return kern.charAt(0).toUpperCase() + kern.slice(1);
    }
  }
  return null;
}

const lastSyncStats = {
  lastSyncedAt: null as string | null,
  steenwijkerland: { topics: 0, newDocsAdded: 0, totalDocs: 0 },
  isRunning: false,
};

export function getAgendaDossierSyncStatus() {
  return lastSyncStats;
}

/**
 * Synchronizes all scraped Steenwijkerland agenda documents into the master metadata
 * and distributes them across the 7 canonical hoofddossiers and relevant subdossiers.
 */
export async function syncSteenwijkerlandAgendaToDossiers(): Promise<{
  success: boolean;
  topicsProcessed: number;
  newDocsAdded: number;
  totalMasterDocs: number;
}> {
  const db = getDbFromSqlite();
  const allTopics: CouncilAgendaTopic[] = Array.isArray(db.councilAgendaTopics) ? db.councilAgendaTopics : [];
  const swlTopics = allTopics.filter((t) => (t.municipality || "steenwijkerland").toLowerCase() === "steenwijkerland");

  if (!db.customSubdossiers) db.customSubdossiers = {};

  const masterList = getRawMetadata();
  const existingFilesSet = new Set(masterList.map((m) => (m.bestandsnaam || "").toLowerCase().trim()));
  const existingUrlsSet = new Set(masterList.map((m) => (m.bestand_url || "").toLowerCase().trim()).filter(Boolean));
  const existingTitlesSet = new Set(masterList.map((m) => (m.titel || "").toLowerCase().trim()));

  let newDocsAdded = 0;

  for (const topic of swlTopics) {
    const docs = Array.isArray(topic.documents) ? topic.documents : [];
    if (docs.length === 0) continue;

    const topicTitle = (topic.title || "").trim();
    const topicDesc = (topic.description || "").trim();
    const detectedWijk = detectSteenwijkerlandWijk(topicTitle, topicDesc);

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
      detectedWijk || "",
      undefined,
      customSubs
    );

    // If normalizeSubdossier defaulted to the primary generic subdossier and the topic title is specific,
    // use the specific topic title as a dedicated subdossier to keep agenda topics cleanly organized
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
        tags: [topic.category, ...(detectedWijk ? [detectedWijk] : [])],
        createdAt: topic.meetingDate || new Date().toISOString(),
      };
    }

    const isBespreek = (topic.category || "").toLowerCase().includes("bespreek") || topicTitle.toLowerCase().includes("bespreek");

    // Ingest each document into master metadata
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

      // Check if already indexed
      if (existingFilesSet.has(fileLower) || (urlLower && existingUrlsSet.has(urlLower)) || existingTitlesSet.has(titleLower)) {
        continue;
      }

      const metaItem: RaadsstukMetadata = {
        id: `swl_ibabs_${doc.id}`,
        bestandsnaam: safeFilename,
        titel: enrichedTitle,
        dossier: canonicalHoofd,
        subdossier: subTitle,
        wijk_of_kern: detectedWijk || "Gemeentebreed",
        datum: topic.meetingDate || new Date().toISOString().slice(0, 10),
        entiteiten: `Gemeenteraad Steenwijkerland, ${topic.category}, ${isBespreek ? "Bespreekstukken" : "Vergaderagenda"}${detectedWijk ? `, ${detectedWijk}` : ""}`,
        relaties: `Vergaderagenda: ${topic.meetingTitle} (${topic.meetingDateDisplay || topic.meetingDate}), Agendapunt: ${topicTitle}, Categorie: ${topic.category}`,
        bestand_url: doc.url,
      };

      masterList.push(metaItem);
      existingFilesSet.add(fileLower);
      existingTitlesSet.add(titleLower);
      if (urlLower) existingUrlsSet.add(urlLower);
      newDocsAdded++;
    }

    // If agenda item has no documents attached, register the topic itself as an entry
    if (docs.length === 0 && cleanTopicTitle.length >= 3) {
      const topicFilename = `${slugify(cleanTopicTitle) || topic.id}.pdf`;
      const fileLower = topicFilename.toLowerCase();
      const titleLower = `agendapunt: ${cleanTopicTitle.toLowerCase()}`;
      if (!existingFilesSet.has(fileLower) && !existingTitlesSet.has(titleLower)) {
        const topicUrl = topic.sourceUrl || (topic.meetingId ? `https://steenwijkerland.bestuurlijkeinformatie.nl/Agenda/Index/${topic.meetingId}` : undefined);
        const metaItem: RaadsstukMetadata = {
          id: `swl_topic_${topic.id}`,
          bestandsnaam: topicFilename,
          titel: `Agendapunt: ${cleanTopicTitle}`,
          dossier: canonicalHoofd,
          subdossier: subTitle,
          wijk_of_kern: detectedWijk || "Gemeentebreed",
          datum: topic.meetingDate || new Date().toISOString().slice(0, 10),
          entiteiten: `Gemeenteraad Steenwijkerland, ${topic.category}, ${isBespreek ? "Bespreekstukken" : "Vergaderagenda"}${detectedWijk ? `, ${detectedWijk}` : ""}`,
          relaties: `Vergaderagenda: ${topic.meetingTitle} (${topic.meetingDateDisplay || topic.meetingDate}), Agendapunt: ${topicTitle}, Categorie: ${topic.category}`,
          bestand_url: topicUrl,
        };
        masterList.push(metaItem);
        existingFilesSet.add(fileLower);
        existingTitlesSet.add(titleLower);
        newDocsAdded++;
      }
    }
  }

  if (newDocsAdded > 0) {
    saveMasterMetadata(masterList);
    saveDbToSqlite(db);
    invalidateDossierCache();
    console.log(`[AGENDA DOSSIER SYNC] Steenwijkerland: ${newDocsAdded} nieuwe agendastukken verdeeld over (sub)dossiers.`);
  }

  lastSyncStats.steenwijkerland = {
    topics: swlTopics.length,
    newDocsAdded,
    totalDocs: masterList.length,
  };

  return {
    success: true,
    topicsProcessed: swlTopics.length,
    newDocsAdded,
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
    // Steenwijkerland
    await syncSteenwijkerlandAgendaToDossiers();

    lastSyncStats.lastSyncedAt = new Date().toISOString();
    console.log(`[AGENDA DOSSIER SYNC] Voltooid! Steenwijkerland (+${lastSyncStats.steenwijkerland.newDocsAdded} docs).`);
  } catch (err: any) {
    console.error("[AGENDA DOSSIER SYNC FOUT]:", err?.message || err);
  } finally {
    lastSyncStats.isRunning = false;
  }

  return lastSyncStats;
}
