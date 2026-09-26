import fs from "fs";
import path from "path";
import { Dossier, DossierDocument, NetworkGraphData, GraphNode, GraphEdge } from "../types/dossier.js";
import { getDbFromSqlite, saveDbToSqlite } from "./sqliteDatabase.js";
import { HOOGEVEEN_WIJKEN_MATRIX, detectHoogeveenWijken, HoogeveenWijkOrKern } from "./hoogeveenTaxonomy.js";
import { slugify } from "./dossierManager.js";

// Storage paths for Hoogeveen dossier data
const HOOGEVEEN_DATA_DIR = path.join(process.cwd(), "public", "data", "hoogeveen");
const HOOGEVEEN_METADATA_JSON = path.join(HOOGEVEEN_DATA_DIR, "raadsstukken_metadata_hoogeveen.json");
const HOOGEVEEN_GRAPH_JSON = path.join(HOOGEVEEN_DATA_DIR, "network_graph_hoogeveen.json");

function ensureHoogeveenDirs() {
  try {
    if (!fs.existsSync(HOOGEVEEN_DATA_DIR)) {
      fs.mkdirSync(HOOGEVEEN_DATA_DIR, { recursive: true });
    }
  } catch {
    // ignore
  }
}

export const HOOGEVEEN_CANONICAL_HOOFDDOSSIERS = [
  "Ruimtelijke Ordening, Wonen & Omgevingswet",
  "Economie, Bedrijvigheid & Buitenvaart",
  "Sociaal Domein, Zorg, Jeugd & Onderwijs",
  "Duurzaamheid, Natuur & Energietransitie",
  "Verkeer, Mobiliteit & Bereikbaarheid",
  "Bestuur, Veiligheid, Financiën & Dienstverlening",
  "Cultuur, Recreatie, Toerisme & Nijstad",
] as const;

export type HoogeveenHoofddossier = typeof HOOGEVEEN_CANONICAL_HOOFDDOSSIERS[number];

/**
 * Classify a document or topic into one of the Hoogeveen Hoofddossiers
 */
export function classifyHoogeveenHoofddossier(title: string, content = ""): HoogeveenHoofddossier {
  const t = `${title} ${content}`.toLowerCase();

  // Wonen & Ruimte
  if (
    t.includes("bestemmingsplan") ||
    t.includes("omgevingswet") ||
    t.includes("omgevingsplan") ||
    t.includes("woningbouw") ||
    t.includes("wonen") ||
    t.includes("bouwplan") ||
    t.includes("erflanden") ||
    t.includes("ruimtelijke ordening") ||
    t.includes("woonvisie")
  ) {
    return "Ruimtelijke Ordening, Wonen & Omgevingswet";
  }

  // Economie & Bedrijventerreinen
  if (
    t.includes("buitenvaart") ||
    t.includes("toldijk") ||
    t.includes("de wieken") ||
    t.includes("bedrijventerrein") ||
    t.includes("vliegveld") ||
    t.includes("luchthaven") ||
    t.includes("economie") ||
    t.includes("ondernemers") ||
    t.includes("arbeidsmarkt") ||
    t.includes("bedrijf")
  ) {
    return "Economie, Bedrijvigheid & Buitenvaart";
  }

  // Sociaal domein
  if (
    t.includes("wmo") ||
    t.includes("jeugdzorg") ||
    t.includes("jeugdhulp") ||
    t.includes("participatiewet") ||
    t.includes("armoede") ||
    t.includes("schuldhulp") ||
    t.includes("onderwijs") ||
    t.includes("school") ||
    t.includes("ggd") ||
    t.includes("welzijn") ||
    t.includes("ouderenzorg") ||
    t.includes("inclusie")
  ) {
    return "Sociaal Domein, Zorg, Jeugd & Onderwijs";
  }

  // Duurzaamheid & Natuur
  if (
    t.includes("zonne") ||
    t.includes("wind") ||
    t.includes("energie") ||
    t.includes("res") ||
    t.includes("klimaat") ||
    t.includes("duurzaam") ||
    t.includes("natuur") ||
    t.includes("stikstof") ||
    t.includes("waterbeheer") ||
    t.includes("afval") ||
    t.includes("circulair")
  ) {
    return "Duurzaamheid, Natuur & Energietransitie";
  }

  // Verkeer & Mobiliteit
  if (
    t.includes("verkeer") ||
    t.includes("a28") ||
    t.includes("n374") ||
    t.includes("n381") ||
    t.includes("fiets") ||
    t.includes("station") ||
    t.includes("spoor") ||
    t.includes("bus") ||
    t.includes("parkeren") ||
    t.includes("weg") ||
    t.includes("kruispunt") ||
    t.includes("vervoer")
  ) {
    return "Verkeer, Mobiliteit & Bereikbaarheid";
  }

  // Cultuur & Recreatie
  if (
    t.includes("nijstad") ||
    t.includes("schoonhoven") ||
    t.includes("recreatie") ||
    t.includes("toerisme") ||
    t.includes("museum") ||
    t.includes("theater") ||
    t.includes("de tamboer") ||
    t.includes("sport") ||
    t.includes("zwembad") ||
    t.includes("cultuur") ||
    t.includes("erfgoed")
  ) {
    return "Cultuur, Recreatie, Toerisme & Nijstad";
  }

  // Default: Bestuur & Financiën
  return "Bestuur, Veiligheid, Financiën & Dienstverlening";
}

/**
 * Main Dossierverdeler Engine for Gemeente Hoogeveen
 * Scans all scraped council topics and documents for Hoogeveen,
 * assigns them to canonical hoofddossiers and geographic wijken/kernen.
 */
export async function distributeHoogeveenDossiers(): Promise<{
  dossiersCount: number;
  documentsDistributedCount: number;
  wijkenCount: number;
  lastDistributedAt: string;
}> {
  ensureHoogeveenDirs();
  const db = getDbFromSqlite();
  const allTopics = Array.isArray(db.councilAgendaTopics) ? db.councilAgendaTopics : [];
  const hoogeveenTopics = allTopics.filter((t: any) => t.municipality === "hoogeveen");

  console.log(`[HOOGEVEEN DOSSIERVERDELER] Start verdeling over ${hoogeveenTopics.length} Hoogeveen agendapunten...`);

  const dossierMap = new Map<string, Dossier>();
  let totalDocsCount = 0;

  // Initialize canonical hoofddossiers
  for (const hTitle of HOOGEVEEN_CANONICAL_HOOFDDOSSIERS) {
    const slug = slugify(`hoogeveen-${hTitle}`);
    dossierMap.set(slug, {
      id: `hg_dos_${slug}`,
      slug,
      title: hTitle,
      description: `Officiële raadsdossiers en besluitvorming van de Gemeente Hoogeveen binnen het domein ${hTitle}.`,
      category: hTitle,
      municipality: "hoogeveen",
      status: "actief",
      documentsCount: 0,
      documents: [],
      subdossiers: [],
      wijken: [],
      updatedAt: new Date().toISOString(),
      tags: ["Hoogeveen", hTitle],
    });
  }

  // Iterate over topics and distribute
  for (const topic of hoogeveenTopics) {
    const topicTitle = topic.title || "";
    const topicDocs: any[] = Array.isArray(topic.documents) ? topic.documents : [];
    const detectedWijken = (topic.wijken && topic.wijken.length > 0) ? topic.wijken : detectHoogeveenWijken(topicTitle, "", "", topic.description);
    const hoofddossier = classifyHoogeveenHoofddossier(topicTitle, topic.description);
    const parentSlug = slugify(`hoogeveen-${hoofddossier}`);
    const parentDossier = dossierMap.get(parentSlug);

    if (!parentDossier) continue;

    // Create or find Subdossier for specific issue if it has multiple documents
    const subTitle = topicTitle.replace(/^\d+[.\s-]+/, "").trim();
    const subSlug = slugify(`hg-${subTitle}`).slice(0, 60);

    let subDossier = parentDossier.subdossiers?.find((sd) => sd.slug === subSlug);
    if (!subDossier && subTitle.length >= 5) {
      subDossier = {
        id: `hg_sub_${subSlug}`,
        slug: subSlug,
        title: subTitle,
        description: topic.description || `Dossierstukken en besluitvorming rondom ${subTitle}.`,
        category: hoofddossier,
        municipality: "hoogeveen",
        status: "actief",
        documentsCount: 0,
        documents: [],
        wijken: detectedWijken,
        updatedAt: topic.meetingDate || new Date().toISOString(),
        tags: ["Hoogeveen", ...detectedWijken],
      };
      parentDossier.subdossiers = parentDossier.subdossiers || [];
      parentDossier.subdossiers.push(subDossier);
    }

    // Convert council documents to DossierDocument format
    for (const doc of topicDocs) {
      totalDocsCount++;
      const dDoc: DossierDocument = {
        id: `hg_doc_${doc.id}`,
        title: doc.title || "Raadsdocument Hoogeveen",
        url: doc.url,
        fileType: doc.fileType || "PDF",
        fileSize: doc.fileSize || "1.2 MB",
        date: topic.meetingDate || new Date().toISOString().slice(0, 10),
        dossierId: parentDossier.id,
        dossierSlug: parentDossier.slug,
        hoofddossier,
        subdossier: subTitle,
        wijkOfKern: detectedWijken[0] || "Gemeentebreed",
        wijken: detectedWijken,
        municipality: "hoogeveen",
        source: "NotuBiz Hoogeveen",
        vergadering: topic.meetingTitle,
      };

      parentDossier.documents.push(dDoc);
      parentDossier.documentsCount++;

      if (subDossier) {
        subDossier.documents = subDossier.documents || [];
        subDossier.documents.push(dDoc);
        subDossier.documentsCount = subDossier.documents.length;
      }
    }

    // Merge wijken to parent
    for (const w of detectedWijken) {
      if (!parentDossier.wijken.includes(w)) {
        parentDossier.wijken.push(w);
      }
    }
  }

  const resultDossiers = Array.from(dossierMap.values());

  // Store metadata JSON
  try {
    fs.writeFileSync(HOOGEVEEN_METADATA_JSON, JSON.stringify(resultDossiers, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("[HOOGEVEEN DOSSIERVERDELER] Kon JSON niet wegschrijven:", err?.message);
  }

  // Update in SQLite db
  db.hoogeveenDossiers = resultDossiers;
  db.hoogeveenDossierSummary = {
    dossiersCount: resultDossiers.length,
    documentsDistributedCount: totalDocsCount,
    wijkenCount: HOOGEVEEN_WIJKEN_MATRIX.length,
    lastDistributedAt: new Date().toISOString(),
  };

  saveDbToSqlite(db);

  console.log(`[HOOGEVEEN DOSSIERVERDELER] Verdeling succesvol afgerond: ${resultDossiers.length} hoofddossiers, ${totalDocsCount} documenten verdeeld over ${HOOGEVEEN_WIJKEN_MATRIX.length} wijken en kernen.`);

  return {
    dossiersCount: resultDossiers.length,
    documentsDistributedCount: totalDocsCount,
    wijkenCount: HOOGEVEEN_WIJKEN_MATRIX.length,
    lastDistributedAt: new Date().toISOString(),
  };
}

/**
 * Returns complete overview of all 30 Hoogeveen wijken/kernen with their aggregated CBS data and linked dossiers.
 */
export function getHoogeveenWijkenOverview(): Array<HoogeveenWijkOrKern & { documentCount: number; topicCount: number }> {
  const db = getDbFromSqlite();
  const allTopics: any[] = Array.isArray(db.councilAgendaTopics) ? db.councilAgendaTopics : [];
  const hoogeveenTopics = allTopics.filter((t) => t.municipality === "hoogeveen");

  return HOOGEVEEN_WIJKEN_MATRIX.map((wijk) => {
    // Count topics matching this wijk
    const matchingTopics = hoogeveenTopics.filter((t) => {
      const topicWijken = t.wijken || [];
      if (topicWijken.includes(wijk.naam)) return true;
      const titleLower = (t.title || "").toLowerCase();
      return wijk.aliases.some((a) => titleLower.includes(a));
    });

    const docCount = matchingTopics.reduce((acc, t) => acc + (t.documents?.length || 0), 0);

    return {
      ...wijk,
      topicCount: matchingTopics.length,
      documentCount: docCount,
    };
  });
}
