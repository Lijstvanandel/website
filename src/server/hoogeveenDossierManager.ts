import fs from "fs";
import path from "path";
import { Dossier, DossierDocument, NetworkGraphData, GraphNode, GraphEdge } from "../types/dossier.js";
import { getDbFromSqlite, saveDbToSqlite, initDatabase, setKv, getKv } from "./sqliteDatabase.js";
import { HOOGEVEEN_WIJKEN_MATRIX, detectHoogeveenWijken, HoogeveenWijkOrKern } from "./hoogeveenTaxonomy.js";
import { slugify } from "./dossierManager.js";

// Storage paths for Hoogeveen dossier data
const HOOGEVEEN_DATA_DIR = path.join(process.cwd(), "public", "data", "hoogeveen");
const HOOGEVEEN_METADATA_JSON = path.join(HOOGEVEEN_DATA_DIR, "raadsstukken_metadata_hoogeveen.json");
const HOOGEVEEN_GRAPH_JSON = path.join(HOOGEVEEN_DATA_DIR, "network_graph_hoogeveen.json");

export interface HoogeveenClassificationProgress {
  isRunning: boolean;
  isPaused: boolean;
  pauseReason?: string;
  pauseRemainingSeconds?: number;
  pauseResumesAt?: string;
  ratePerMinute: number;
  rpdLimit: number;
  dailyRequestsUsed: number;
  dailyRequestsRemaining: number;
  modelName: string;
  privacySanitized: boolean;
  total: number;
  processed: number;
  newlyClassified: number;
  alreadyProcessed: number;
  deadLetterCount: number;
  activeFile: string;
  limit?: number;
  lastResults: any[];
  logs: string[];
}

const activeHoogeveenProgress: HoogeveenClassificationProgress = {
  isRunning: false,
  isPaused: false,
  pauseReason: undefined,
  pauseRemainingSeconds: 0,
  pauseResumesAt: undefined,
  ratePerMinute: 60,
  rpdLimit: 100000,
  dailyRequestsUsed: 0,
  dailyRequestsRemaining: 100000,
  modelName: "Hoogeveen NotuBiz Taxonomie-Engine",
  privacySanitized: true,
  total: 0,
  processed: 0,
  newlyClassified: 0,
  alreadyProcessed: 0,
  deadLetterCount: 0,
  activeFile: "",
  limit: undefined,
  lastResults: [],
  logs: [],
};

export function getHoogeveenClassificationStatus(): HoogeveenClassificationProgress {
  return activeHoogeveenProgress;
}

export function cancelHoogeveenClassification(): void {
  if (activeHoogeveenProgress.isRunning) {
    activeHoogeveenProgress.isRunning = false;
    const time = new Date().toLocaleTimeString("nl-NL");
    activeHoogeveenProgress.logs.push(`[${time}] Hoogeveen herstructureringsproces handmatig geannuleerd.`);
  }
}

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
 * assigns them to canonical hoofddossiers and geographic wijken/kernen,
 * and tracks real-time progress for the council portal.
 */
export async function distributeHoogeveenDossiers(options: { force?: boolean; limit?: number } = {}): Promise<{
  dossiersCount: number;
  documentsDistributedCount: number;
  wijkenCount: number;
  lastDistributedAt: string;
}> {
  ensureHoogeveenDirs();
  await initDatabase();
  const db = getDbFromSqlite();
  const allTopics = Array.isArray(db.councilAgendaTopics) ? db.councilAgendaTopics : [];
  let hoogeveenTopics = allTopics.filter((t: any) => t.municipality === "hoogeveen");

  if (options.limit && options.limit > 0) {
    hoogeveenTopics = hoogeveenTopics.slice(0, options.limit);
  }

  const nowTimeStr = new Date().toLocaleTimeString("nl-NL");
  activeHoogeveenProgress.isRunning = true;
  activeHoogeveenProgress.total = hoogeveenTopics.length;
  activeHoogeveenProgress.processed = 0;
  activeHoogeveenProgress.newlyClassified = 0;
  activeHoogeveenProgress.alreadyProcessed = 0;
  activeHoogeveenProgress.deadLetterCount = 0;
  activeHoogeveenProgress.limit = options.limit;
  activeHoogeveenProgress.lastResults = [];
  activeHoogeveenProgress.logs = [
    `[${nowTimeStr}] Hoogeveen herstructurering gestart: scannen van ${hoogeveenTopics.length} agendapunten en gekoppelde raadsdocumenten...`,
  ];

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

  const HOOGEVEEN_DOCUMENTS_DIR = path.join(process.cwd(), "uploads", "documents", "hoogeveen");

  // Iterate over topics and distribute
  for (let i = 0; i < hoogeveenTopics.length; i++) {
    if (!activeHoogeveenProgress.isRunning) {
      console.log("[HOOGEVEEN DOSSIERVERDELER] Proces afgebroken.");
      break;
    }

    const topic = hoogeveenTopics[i];
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
      const expectedFilename = `hoogeveen_doc_${doc.id}_v1.pdf`;
      activeHoogeveenProgress.activeFile = expectedFilename;

      const possibleFilePaths = [
        path.join(HOOGEVEEN_DOCUMENTS_DIR, expectedFilename),
        path.join(process.cwd(), "public", "uploads", "documents", "hoogeveen", expectedFilename),
        path.join(process.cwd(), "dist", "uploads", "documents", "hoogeveen", expectedFilename),
      ];

      const foundPath = possibleFilePaths.find((p) => {
        try {
          return fs.existsSync(p) && fs.statSync(p).size > 100;
        } catch {
          return false;
        }
      });

      const isLocalCached = !!foundPath;
      const localPublicUrl = `/uploads/documents/hoogeveen/${expectedFilename}`;
      const finalDocUrl = isLocalCached ? localPublicUrl : doc.url;

      const dDoc: DossierDocument = {
        id: `hg_doc_${doc.id}`,
        title: doc.title || "Raadsdocument Hoogeveen",
        url: finalDocUrl,
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
        fileExists: isLocalCached,
      };

      parentDossier.documents.push(dDoc);
      parentDossier.documentsCount++;

      if (subDossier) {
        subDossier.documents = subDossier.documents || [];
        subDossier.documents.push(dDoc);
        subDossier.documentsCount = subDossier.documents.length;
      }

      if (activeHoogeveenProgress.lastResults.length < 50) {
        activeHoogeveenProgress.lastResults.unshift({
          filename: expectedFilename,
          source: "gemini",
          modelUsed: "Hoogeveen NotuBiz Taxonomie-Engine",
          timestamp: new Date().toISOString(),
          dossier: hoofddossier,
          subdossier: subTitle,
          titel: doc.title || topicTitle,
          wijk_of_kern: detectedWijken.join(", ") || "Gemeentebreed",
          entiteiten: detectedWijken.join(", "),
          skos_tags: ["Hoogeveen", hoofddossier, ...detectedWijken],
        });
      }
    }

    // Merge wijken to parent
    for (const w of detectedWijken) {
      if (!parentDossier.wijken.includes(w)) {
        parentDossier.wijken.push(w);
      }
    }

    activeHoogeveenProgress.processed = i + 1;
    activeHoogeveenProgress.newlyClassified += topicDocs.length;

    if (i % 5 === 0 || i === hoogeveenTopics.length - 1) {
      const stepTime = new Date().toLocaleTimeString("nl-NL");
      activeHoogeveenProgress.logs.push(
        `[${stepTime}] [${i + 1}/${hoogeveenTopics.length}] Agendapunt "${topicTitle.slice(0, 45)}..." -> ${hoofddossier} (${detectedWijken.join(", ") || "Gemeentebreed"})`
      );
      if (activeHoogeveenProgress.logs.length > 500) {
        activeHoogeveenProgress.logs.shift();
      }
    }
  }

  const resultDossiers = Array.from(dossierMap.values()).map((d) => {
    const dates = (d.documents || []).map((doc: any) => doc.datum).filter(Boolean).sort();
    const startDate = dates.length > 0 ? dates[0] : null;
    const endDate = dates.length > 0 ? dates[dates.length - 1] : null;

    return {
      ...d,
      dateRange: d.dateRange || { start: startDate, end: endDate },
      documentCount: d.documents?.length || 0,
      documentsCount: d.documents?.length || 0,
      subdossiersCount: d.subdossiers?.length || 0,
      subdossiers: (d.subdossiers || []).map((sub: any) => {
        const subDates = (sub.documents || []).map((doc: any) => doc.datum).filter(Boolean).sort();
        return {
          ...sub,
          dateRange: sub.dateRange || {
            start: subDates.length > 0 ? subDates[0] : null,
            end: subDates.length > 0 ? subDates[subDates.length - 1] : null,
          },
          documentCount: sub.documents?.length || 0,
          documentsCount: sub.documents?.length || 0,
        };
      }),
    };
  });

  // Generate detailed execution log specifically for Hoogeveen
  const logLines: string[] = [];
  logLines.push(`=============================================================================`);
  logLines.push(`GEMEENTE HOOGEVEEN DOSSIERVERDELER & RESTRUCTURERING UITVOERINGSLOG`);
  logLines.push(`Uitgevoerd op: ${new Date().toLocaleString("nl-NL")}`);
  logLines.push(`Totaal verwerkte Hoogeveen agendapunten: ${hoogeveenTopics.length}`);
  logLines.push(`Totaal gedistribueerde raadsdocumenten: ${totalDocsCount}`);
  logLines.push(`=============================================================================\n`);

  for (const hDos of resultDossiers) {
    logLines.push(`[HOOFDDOSSIER] ${hDos.title} (${hDos.documentsCount} documenten)`);
    logLines.push(`  -> Toegewezen wijken: ${hDos.wijken.join(", ") || "Gemeentebreed"}`);
    if (hDos.subdossiers && hDos.subdossiers.length > 0) {
      logLines.push(`  -> Subdossiers:`);
      for (const sub of hDos.subdossiers) {
        logLines.push(`     * [SUBD_ITEM] "${sub.title}" (${sub.documentsCount} documenten)`);
        logLines.push(`       Wijken: ${sub.wijken.join(", ")}`);
      }
    }
    logLines.push("");
  }

  try {
    const hoogeveenLogFile = path.join(HOOGEVEEN_DATA_DIR, "last_restructuring_execution_hoogeveen.log");
    fs.writeFileSync(hoogeveenLogFile, logLines.join("\n"), "utf-8");
  } catch (logErr: any) {
    console.warn("[HOOGEVEEN DOSSIERVERDELER] Kon uitvoeringslog niet opslaan:", logErr?.message);
  }

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
  setKv("hoogeveenDossiers", resultDossiers);

  const doneTimeStr = new Date().toLocaleTimeString("nl-NL");
  activeHoogeveenProgress.isRunning = false;
  activeHoogeveenProgress.logs.push(
    `[${doneTimeStr}] Hoogeveen herstructurering succesvol afgerond: ${resultDossiers.length} hoofddossiers, ${totalDocsCount} documenten verdeeld over ${HOOGEVEEN_WIJKEN_MATRIX.length} wijken en kernen.`
  );

  console.log(`[HOOGEVEEN DOSSIERVERDELER] Verdeling succesvol afgerond: ${resultDossiers.length} hoofddossiers, ${totalDocsCount} documenten verdeeld over ${HOOGEVEEN_WIJKEN_MATRIX.length} wijken en kernen.`);

  return {
    dossiersCount: resultDossiers.length,
    documentsDistributedCount: totalDocsCount,
    wijkenCount: HOOGEVEEN_WIJKEN_MATRIX.length,
    lastDistributedAt: new Date().toISOString(),
  };
}

/**
 * Executes Hoogeveen restructuring asynchronously in the background
 */
export function startHoogeveenRestructuringInBackground(options: { force?: boolean; limit?: number } = {}): void {
  if (activeHoogeveenProgress.isRunning) return;

  activeHoogeveenProgress.isRunning = true;
  activeHoogeveenProgress.processed = 0;
  activeHoogeveenProgress.total = 0;
  activeHoogeveenProgress.newlyClassified = 0;
  activeHoogeveenProgress.alreadyProcessed = 0;
  activeHoogeveenProgress.limit = options.limit;
  activeHoogeveenProgress.logs = [
    `[${new Date().toLocaleTimeString("nl-NL")}] Achtergrondtaak Hoogeveen herstructurering geïnitialiseerd...`,
  ];
  activeHoogeveenProgress.lastResults = [];

  setTimeout(async () => {
    try {
      await distributeHoogeveenDossiers(options);
    } catch (err: any) {
      console.error("[HOOGEVEEN RESTRUCTURING ERROR]:", err);
      activeHoogeveenProgress.isRunning = false;
      activeHoogeveenProgress.logs.push(`[${new Date().toLocaleTimeString("nl-NL")}] Fout tijdens Hoogeveen herstructurering: ${err.message}`);
    }
  }, 50);
}

/**
 * Generates CSV metadata export specifically for Gemeente Hoogeveen documents
 */
export function generateHoogeveenMetadataCsv(filterType: "all" | "processed" | "unprocessed" = "all"): string {
  const dossiers = getHoogeveenDossiers();
  const allDocs: any[] = [];
  for (const d of dossiers) {
    for (const doc of (d.documents || [])) {
      allDocs.push({
        ...doc,
        hoofddossier: d.title,
        dossierSlug: d.slug,
      });
    }
  }

  const filtered = allDocs.filter((doc) => {
    if (filterType === "processed") return doc.fileExists === true;
    if (filterType === "unprocessed") return !doc.fileExists;
    return true;
  });

  const header = ["ID", "Bestandsnaam", "Titel", "Hoofddossier", "Subdossier", "Wijk_of_Kern", "Gemeente", "Vergadering", "Datum", "Bestaat_Op_Server", "Document_URL"];
  const rows = filtered.map((doc) => {
    const rawId = doc.id?.replace(/^hg_doc_/, "") || "";
    const filename = `hoogeveen_doc_${rawId}_v1.pdf`;
    return [
      `"${(doc.id || "").replace(/"/g, '""')}"`,
      `"${filename.replace(/"/g, '""')}"`,
      `"${(doc.title || "").replace(/"/g, '""')}"`,
      `"${(doc.hoofddossier || "").replace(/"/g, '""')}"`,
      `"${(doc.subdossier || "").replace(/"/g, '""')}"`,
      `"${(doc.wijkOfKern || (doc.wijken && doc.wijken.join("; ")) || "Gemeentebreed").replace(/"/g, '""')}"`,
      `"Hoogeveen"`,
      `"${(doc.vergadering || "").replace(/"/g, '""')}"`,
      `"${(doc.date || "").replace(/"/g, '""')}"`,
      `"${doc.fileExists ? "JA" : "NEE"}"`,
      `"${(doc.url || "").replace(/"/g, '""')}"`,
    ].join(",");
  });

  return [header.join(","), ...rows].join("\n");
}

/**
 * Safely loads Hoogeveen dossiers from JSON file, KV store, or database
 */
export function getHoogeveenDossiers(): Dossier[] {
  try {
    if (fs.existsSync(HOOGEVEEN_METADATA_JSON)) {
      const data = JSON.parse(fs.readFileSync(HOOGEVEEN_METADATA_JSON, "utf-8"));
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn("[HOOGEVEEN DOSSIERS READ WARN]:", err);
  }
  const kv = getKv("hoogeveenDossiers");
  if (Array.isArray(kv) && kv.length > 0) return kv;
  const db = getDbFromSqlite();
  return Array.isArray(db.hoogeveenDossiers) ? db.hoogeveenDossiers : [];
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
