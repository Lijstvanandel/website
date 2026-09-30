import fs from "fs";
import path from "path";
import { Dossier, DossierDocument, NetworkGraphData, GraphNode, GraphEdge } from "../types/dossier.js";
import { getDbFromSqlite, saveDbToSqlite, initDatabase, setKv, getKv } from "./sqliteDatabase.js";
import { HOOGEVEEN_WIJKEN_MATRIX, detectHoogeveenWijken, HoogeveenWijkOrKern } from "./hoogeveenTaxonomy.js";
import { slugify, getSubdossierThumbnail } from "./dossierManager.js";

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

  const HOOGEVEEN_DOCUMENTS_DIR = path.join(process.cwd(), "public", "uploads", "documents", "hoogeveen");
  const ALT_HOOGEVEEN_DOCUMENTS_DIR = path.join(process.cwd(), "uploads", "documents", "hoogeveen");

  // Ensure directories exist
  try {
    if (!fs.existsSync(HOOGEVEEN_DOCUMENTS_DIR)) fs.mkdirSync(HOOGEVEEN_DOCUMENTS_DIR, { recursive: true });
    if (!fs.existsSync(ALT_HOOGEVEEN_DOCUMENTS_DIR)) fs.mkdirSync(ALT_HOOGEVEEN_DOCUMENTS_DIR, { recursive: true });
  } catch (_e) {
    // ignore
  }

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
    const subSlug = slugify(subTitle);

    let subDossier = parentDossier.subdossiers?.find((sd) => sd.slug === subSlug || sd.title.toLowerCase() === subTitle.toLowerCase());
    if (!subDossier && subTitle.length >= 3) {
      subDossier = {
        id: subSlug,
        slug: subSlug,
        title: subTitle,
        hoofddossier,
        description: topic.description || `Dossierstukken en besluitvorming rondom ${subTitle}.`,
        category: hoofddossier,
        municipality: "hoogeveen",
        status: "actief",
        documentCount: 0,
        documentsCount: 0,
        uploadedCount: 0,
        dateRange: { start: topic.meetingDate || null, end: topic.meetingDate || null },
        documents: [],
        wijken: detectedWijken,
        updatedAt: topic.meetingDate || new Date().toISOString(),
        tags: ["Hoogeveen", hoofddossier, ...detectedWijken],
        thumbnail: getSubdossierThumbnail(subTitle, hoofddossier),
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
        path.join(ALT_HOOGEVEEN_DOCUMENTS_DIR, expectedFilename),
        path.join(process.cwd(), "public", "uploads", "documents", "hoogeveen", expectedFilename),
        path.join(process.cwd(), "uploads", "documents", "hoogeveen", expectedFilename),
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
      const hasRemoteUrl = Boolean(doc.url && typeof doc.url === "string" && doc.url.startsWith("http"));
      const proxyUrl = hasRemoteUrl
        ? `/api/council/document-proxy?url=${encodeURIComponent(doc.url)}&title=${encodeURIComponent(doc.title || expectedFilename)}&filename=${encodeURIComponent(expectedFilename)}`
        : doc.url;
      const finalDocUrl = isLocalCached ? localPublicUrl : proxyUrl;

      const dDoc: any = {
        id: `hg_doc_${doc.id}`,
        bestandsnaam: expectedFilename,
        titel: doc.title || "Raadsdocument Hoogeveen",
        title: doc.title || "Raadsdocument Hoogeveen",
        url: finalDocUrl,
        fileUrl: finalDocUrl,
        fileType: doc.fileType || "PDF",
        fileSize: doc.fileSize || "1.2 MB",
        datum: topic.meetingDate || new Date().toISOString().slice(0, 10),
        date: topic.meetingDate || new Date().toISOString().slice(0, 10),
        dossier: hoofddossier,
        dossierId: parentDossier.id,
        dossierSlug: parentDossier.slug,
        hoofddossier,
        subdossier: subTitle,
        wijkOfKern: detectedWijken[0] || "Gemeentebreed",
        wijk_of_kern: detectedWijken[0] || "Gemeentebreed",
        wijken: detectedWijken,
        municipality: "hoogeveen",
        source: "NotuBiz Hoogeveen",
        vergadering: topic.meetingTitle,
        fileExists: isLocalCached || hasRemoteUrl,
        entiteiten: detectedWijken,
        relaties: [],
      };

      parentDossier.documents.push(dDoc);
      parentDossier.documentsCount++;

      if (subDossier) {
        subDossier.documents = subDossier.documents || [];
        subDossier.documents.push(dDoc);
        subDossier.documentCount = subDossier.documents.length;
        subDossier.documentsCount = subDossier.documents.length;
        subDossier.uploadedCount = subDossier.documents.filter((d: any) => d.fileExists).length;
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
    const uploadedCount = (d.documents || []).filter((doc: any) => doc.fileExists).length;

    return {
      ...d,
      dateRange: d.dateRange || { start: startDate, end: endDate },
      documentCount: d.documents?.length || 0,
      documentsCount: d.documents?.length || 0,
      uploadedCount,
      subdossiersCount: d.subdossiers?.length || 0,
      subdossiers: (d.subdossiers || []).map((sub: any) => {
        const subDates = (sub.documents || []).map((doc: any) => doc.datum).filter(Boolean).sort();
        const subUploaded = (sub.documents || []).filter((doc: any) => doc.fileExists).length;
        return {
          ...sub,
          dateRange: sub.dateRange || {
            start: subDates.length > 0 ? subDates[0] : null,
            end: subDates.length > 0 ? subDates[subDates.length - 1] : null,
          },
          documentCount: sub.documents?.length || 0,
          documentsCount: sub.documents?.length || 0,
          uploadedCount: subUploaded,
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

let cachedHoogeveenScan: {
  existingFilesSet: Set<string>;
  idToFilenameMap: Map<string, string>;
  totalPhysicalFiles: number;
  timestamp: number;
} | null = null;

/**
 * Scans physical Hoogeveen document storage on disk to dynamically identify present files
 */
export function scanHoogeveenPhysicalFiles(forceRefresh = false): {
  existingFilesSet: Set<string>;
  idToFilenameMap: Map<string, string>;
  totalPhysicalFiles: number;
} {
  const now = Date.now();
  if (!forceRefresh && cachedHoogeveenScan && now - cachedHoogeveenScan.timestamp < 15000) {
    return cachedHoogeveenScan;
  }

  const existingFilesSet = new Set<string>();
  const idToFilenameMap = new Map<string, string>();

  const searchDirs = [
    path.join(process.cwd(), "public", "uploads", "documents", "hoogeveen"),
    path.join(process.cwd(), "uploads", "documents", "hoogeveen"),
    path.join(process.cwd(), "dist", "uploads", "documents", "hoogeveen"),
  ];

  for (const dir of searchDirs) {
    try {
      if (fs.existsSync(dir)) {
        const entries = fs.readdirSync(dir);
        for (const filename of entries) {
          const lower = filename.toLowerCase();
          if (lower.endsWith(".json") || lower.endsWith(".log") || lower.endsWith(".csv") || lower.startsWith(".")) continue;
          existingFilesSet.add(lower);

          // Extract docId from e.g. "hoogeveen_doc_12345_v1.pdf", "hoogeveen_doc_12345.pdf", or "12345.pdf"
          const m = lower.match(/(?:hoogeveen_doc_)?([a-z0-9_-]+?)(?:_v\d+)?\.pdf$/);
          if (m && m[1]) {
            idToFilenameMap.set(m[1], filename);
            idToFilenameMap.set(`hg_doc_${m[1]}`, filename);
          }
          // Also extract purely numeric IDs from any filename (e.g. 10044204)
          const numMatch = lower.match(/\b(\d{6,10})\b/);
          if (numMatch && numMatch[1]) {
            idToFilenameMap.set(numMatch[1], filename);
            idToFilenameMap.set(`hg_doc_${numMatch[1]}`, filename);
          }
        }
      }
    } catch (_e) {
      // ignore
    }
  }

  cachedHoogeveenScan = {
    existingFilesSet,
    idToFilenameMap,
    totalPhysicalFiles: existingFilesSet.size,
    timestamp: now,
  };

  return cachedHoogeveenScan;
}

/**
 * Safely loads Hoogeveen dossiers from JSON file, KV store, or database
 * and dynamically reconciles fileExists and uploadedCount against physical disk presence.
 */
export function getHoogeveenDossiers(): Dossier[] {
  let dossiers: Dossier[] = [];
  try {
    if (fs.existsSync(HOOGEVEEN_METADATA_JSON)) {
      const data = JSON.parse(fs.readFileSync(HOOGEVEEN_METADATA_JSON, "utf-8"));
      if (Array.isArray(data) && data.length > 0) dossiers = data;
    }
  } catch (err) {
    console.warn("[HOOGEVEEN DOSSIERS READ WARN]:", err);
  }
  if (!dossiers || dossiers.length === 0) {
    const kv = getKv("hoogeveenDossiers");
    if (Array.isArray(kv) && kv.length > 0) {
      dossiers = kv;
    } else {
      const db = getDbFromSqlite();
      dossiers = Array.isArray(db.hoogeveenDossiers) ? db.hoogeveenDossiers : [];
    }
  }

  // Scan physical files on disk for live reconciliation
  const { existingFilesSet, idToFilenameMap } = scanHoogeveenPhysicalFiles();

  const mappedDossiers = dossiers.map((dossier) => {
    let dossierUploaded = 0;
    const syncedDocs = (dossier.documents || []).map((doc: any) => {
      const rawId = String(doc.id || "").replace(/^hg_doc_/, "").trim();
      let numericId = rawId;
      if (doc.url && typeof doc.url === "string") {
        const urlMatch = doc.url.match(/\/document\/(\d+)/);
        if (urlMatch && urlMatch[1]) numericId = urlMatch[1];
      }

      const expectedV1 = `hoogeveen_doc_${rawId}_v1.pdf`.toLowerCase();
      const expectedV1Num = `hoogeveen_doc_${numericId}_v1.pdf`.toLowerCase();
      const expectedNoV = `hoogeveen_doc_${rawId}.pdf`.toLowerCase();
      const expectedNoVNum = `hoogeveen_doc_${numericId}.pdf`.toLowerCase();
      const expectedRawPdf = `${rawId}.pdf`.toLowerCase();
      const expectedRawNumPdf = `${numericId}.pdf`.toLowerCase();
      const expectedBestand = doc.bestandsnaam ? String(doc.bestandsnaam).toLowerCase() : "";
      const expectedTitle = doc.title ? String(doc.title).toLowerCase() : "";
      const expectedTitlePdf = expectedTitle.endsWith(".pdf") ? expectedTitle : `${expectedTitle}.pdf`;

      const actualFromMap =
        idToFilenameMap.get(rawId) ||
        idToFilenameMap.get(numericId) ||
        idToFilenameMap.get(`hg_doc_${rawId}`) ||
        idToFilenameMap.get(`hg_doc_${numericId}`) ||
        idToFilenameMap.get(String(doc.id));

      const fileExists = Boolean(
        actualFromMap ||
        existingFilesSet.has(expectedV1) ||
        existingFilesSet.has(expectedV1Num) ||
        existingFilesSet.has(expectedNoV) ||
        existingFilesSet.has(expectedNoVNum) ||
        existingFilesSet.has(expectedRawPdf) ||
        existingFilesSet.has(expectedRawNumPdf) ||
        (expectedBestand && existingFilesSet.has(expectedBestand)) ||
        (expectedTitle && existingFilesSet.has(expectedTitle)) ||
        (expectedTitlePdf && existingFilesSet.has(expectedTitlePdf))
      );

      const actualFilename = actualFromMap || doc.bestandsnaam || `hoogeveen_doc_${rawId || numericId}_v1.pdf`;
      const localUrl = `/uploads/documents/hoogeveen/${actualFilename}`;

      if (fileExists) {
        dossierUploaded++;
      }

      return {
        ...doc,
        id: doc.id || `hg_doc_${rawId}`,
        bestandsnaam: actualFilename,
        titel: doc.titel || doc.title || "Raadsdocument Hoogeveen",
        title: doc.title || doc.titel || "Raadsdocument Hoogeveen",
        datum: doc.datum || doc.date || null,
        date: doc.date || doc.datum || null,
        dossier: doc.dossier || doc.hoofddossier || dossier.title,
        hoofddossier: doc.hoofddossier || doc.dossier || dossier.title,
        subdossier: doc.subdossier || "",
        wijkOfKern: doc.wijkOfKern || (doc.wijken && doc.wijken[0]) || "Gemeentebreed",
        wijk_of_kern: doc.wijk_of_kern || doc.wijkOfKern || (doc.wijken && doc.wijken[0]) || "Gemeentebreed",
        url: fileExists ? localUrl : (doc.url || localUrl),
        fileUrl: fileExists ? localUrl : (doc.fileUrl || doc.url || localUrl),
        fileExists,
      };
    });

    const syncedSubdossiers = (dossier.subdossiers || []).map((sub: any) => {
      let subUploaded = 0;
      const subDocs = (sub.documents || []).map((sdoc: any) => {
        const rawId = String(sdoc.id || "").replace(/^hg_doc_/, "");
        const parentMatch = syncedDocs.find((d: any) => String(d.id).replace(/^hg_doc_/, "") === rawId);
        if (parentMatch) {
          if (parentMatch.fileExists) subUploaded++;
          return { ...parentMatch };
        }
        const actualFromMap = idToFilenameMap.get(rawId);
        const fileExists = Boolean(actualFromMap || existingFilesSet.has(`hoogeveen_doc_${rawId}_v1.pdf`.toLowerCase()));
        if (fileExists) subUploaded++;
        return {
          ...sdoc,
          fileExists,
        };
      });

      return {
        ...sub,
        documents: subDocs,
        documentCount: subDocs.length,
        documentsCount: subDocs.length,
        uploadedCount: subUploaded,
      };
    });

    return {
      ...dossier,
      documents: syncedDocs,
      documentCount: syncedDocs.length,
      documentsCount: syncedDocs.length,
      uploadedCount: dossierUploaded,
      subdossiers: syncedSubdossiers,
      subdossierCount: syncedSubdossiers.length,
    };
  });

  // Enrich with regional documents from Provincie Drenthe and Waterschap WDODelta tailored to wijken and kernen
  return enrichHoogeveenDossiersWithRegionalDocuments(mappedDossiers);
}

/**
 * Enriches Hoogeveen dossiers with relevant documents from Provincie Drenthe and Waterschap WDODelta,
 * precisely mapped to Hoogeveen's wijken, dorpskernen and thematic policy categories.
 */
function enrichHoogeveenDossiersWithRegionalDocuments(dossiers: Dossier[]): Dossier[] {
  try {
    const drentheJsonPath = path.join(process.cwd(), "public", "uploads", "documents", "raadsstukken_metadata_drenthe.json");
    const waterschapJsonPath = path.join(process.cwd(), "public", "uploads", "documents", "raadsstukken_metadata_waterschap.json");

    const regionalDocs: Array<{
      id: string;
      title: string;
      date: string;
      bestandsnaam: string;
      fileUrl: string;
      source: "drenthe" | "waterschap";
      scope?: string;
      targetCategory: string;
      subdossierName: string;
      detectedWijken: string[];
      wijkOfKern: string;
    }> = [];

    // 1. Ingest Provincie Drenthe documents
    if (fs.existsSync(drentheJsonPath)) {
      try {
        const rawDrenthe = fs.readFileSync(drentheJsonPath, "utf-8");
        const parsedDrenthe = JSON.parse(rawDrenthe);
        if (Array.isArray(parsedDrenthe)) {
          for (const item of parsedDrenthe) {
            // Must be saved and relevant for Hoogeveen or provincial policy
            if (!item.opslaan && item.scope !== "Lokaal - Hoogeveen") continue;

            const title = item.titel || "";
            const titleLower = title.toLowerCase();
            const detectedWijken = detectHoogeveenWijken(title, "", "", "");
            const wijkOfKern = detectedWijken.length > 0 ? detectedWijken[0] : "Gemeentebreed";

            let targetCategory = "Bestuur, Veiligheid, Financiën & Dienstverlening";
            if (
              titleLower.includes("water") ||
              titleLower.includes("dijk") ||
              titleLower.includes("klimaat") ||
              titleLower.includes("duurzaam") ||
              titleLower.includes("energie") ||
              titleLower.includes("res") ||
              titleLower.includes("wolf") ||
              titleLower.includes("fauna")
            ) {
              targetCategory = "Duurzaamheid, Natuur & Energietransitie";
            } else if (
              titleLower.includes("woon") ||
              titleLower.includes("woning") ||
              titleLower.includes("omgevingsvisie") ||
              titleLower.includes("omgevingsverordening") ||
              titleLower.includes("ruimte") ||
              titleLower.includes("bouw")
            ) {
              targetCategory = "Ruimtelijke Ordening, Wonen & Omgevingswet";
            } else if (
              titleLower.includes("verkeer") ||
              titleLower.includes("weg") ||
              titleLower.includes("a28") ||
              titleLower.includes("n33") ||
              titleLower.includes("spoor") ||
              titleLower.includes("lelylijn") ||
              titleLower.includes("nedersaksenlijn") ||
              titleLower.includes("mobiliteit")
            ) {
              targetCategory = "Verkeer, Mobiliteit & Bereikbaarheid";
            } else if (
              titleLower.includes("economie") ||
              titleLower.includes("bedrijf") ||
              titleLower.includes("landbouw") ||
              titleLower.includes("mkb") ||
              titleLower.includes("ondernem") ||
              titleLower.includes("bollenteelt")
            ) {
              targetCategory = "Economie, Bedrijvigheid & Buitenvaart";
            } else if (
              titleLower.includes("cultuur") ||
              titleLower.includes("sport") ||
              titleLower.includes("erfgoed") ||
              titleLower.includes("monument") ||
              titleLower.includes("toerisme") ||
              titleLower.includes("recreatie")
            ) {
              targetCategory = "Cultuur, Recreatie, Toerisme & Nijstad";
            } else if (
              titleLower.includes("sociaal") ||
              titleLower.includes("zorg") ||
              titleLower.includes("jeugd") ||
              titleLower.includes("wmo") ||
              titleLower.includes("onderwijs") ||
              titleLower.includes("school")
            ) {
              targetCategory = "Sociaal Domein, Zorg, Jeugd & Onderwijs";
            }

            const cleanId = String(item.id || item.document_id || Math.random()).replace(/[^a-zA-Z0-9_-]/g, "_");
            const fileUrl = item.lokaal_pad || `/api/council/drenthe/pdf-proxy?url=${encodeURIComponent(item.source_url || "")}`;

            regionalDocs.push({
              id: `drenthe_${cleanId}`,
              title: item.titel,
              date: item.datum || new Date().toISOString().slice(0, 10),
              bestandsnaam: item.bestandsnaam || `drenthe_${cleanId}.pdf`,
              fileUrl,
              source: "drenthe",
              scope: item.scope,
              targetCategory,
              subdossierName: item.gremium_naam || "Drents Parlement",
              detectedWijken: detectedWijken.length > 0 ? detectedWijken : ["Gemeentebreed"],
              wijkOfKern,
            });
          }
        }
      } catch (err) {
        console.warn("[HOOGEVEEN DRENTHE MERGE WARN]:", err);
      }
    }

    // 2. Ingest Waterschap Drents Overijsselse Delta documents (relevant for Hoogeveen)
    if (fs.existsSync(waterschapJsonPath)) {
      try {
        const rawWs = fs.readFileSync(waterschapJsonPath, "utf-8");
        const parsedWs = JSON.parse(rawWs);
        if (Array.isArray(parsedWs)) {
          for (const item of parsedWs) {
            const title = item.titel || "";
            const detectedWijken = detectHoogeveenWijken(title, "", "", "");
            const wijkOfKern = detectedWijken.length > 0 ? detectedWijken[0] : "Gemeentebreed";

            const cleanId = String(item.id || item.document_id || Math.random()).replace(/[^a-zA-Z0-9_-]/g, "_");
            const fileUrl = item.lokaal_pad || (item.url ? item.url : `/uploads/documents/waterschap/${item.bestandsnaam || ""}`);

            regionalDocs.push({
              id: `ws_${cleanId}`,
              title: item.titel,
              date: item.datum || new Date().toISOString().slice(0, 10),
              bestandsnaam: item.bestandsnaam || `waterschap_${cleanId}.pdf`,
              fileUrl,
              source: "waterschap",
              targetCategory: "Duurzaamheid, Milieu & Openbare Ruimte",
              subdossierName: "Waterschap Drents Overijsselse Delta",
              detectedWijken: detectedWijken.length > 0 ? detectedWijken : ["Gemeentebreed"],
              wijkOfKern,
            });
          }
        }
      } catch (err) {
        console.warn("[HOOGEVEEN WATERSCHAP MERGE WARN]:", err);
      }
    }

    if (regionalDocs.length === 0) return dossiers;

    const resultDossiers = [...dossiers];

    // Find or create "Provincie Drenthe & Regionaal Bestuur" dossier if needed
    let regionalDossier = resultDossiers.find(
      (d) => d.slug === "provincie-drenthe-regionaal-bestuur" || d.title.toLowerCase().includes("provincie")
    );
    if (!regionalDossier) {
      regionalDossier = {
        id: "hg-provincie-drenthe-regionaal",
        slug: "provincie-drenthe-regionaal-bestuur",
        title: "Provincie Drenthe & Regionaal Bestuur",
        description: "Relevante provinciale statenstukken, beleidskaders en besluiten van het Drents Parlement voor de gemeente Hoogeveen en haar dorpen.",
        category: "Bestuur & Regio",
        municipality: "hoogeveen",
        tags: ["Provincie Drenthe", "Drents Parlement", "Regionaal Beleid", "Hoogeveen", "Dorpen"],
        documents: [],
        subdossiers: [],
        documentCount: 0,
        documentsCount: 0,
        uploadedCount: 0,
        subdossierCount: 0,
      } as any;
      resultDossiers.push(regionalDossier);
    }

    // Merge each regional document into matching dossier or fallback to regionalDossier
    for (const reg of regionalDocs) {
      let targetDossier = resultDossiers.find(
        (d) =>
          d.category?.toLowerCase() === reg.targetCategory.toLowerCase() ||
          d.title.toLowerCase().includes(reg.targetCategory.toLowerCase())
      );
      if (!targetDossier) {
        targetDossier = regionalDossier;
      }

      const formattedDoc: any = {
        id: reg.id,
        titel: `[${reg.source === "drenthe" ? "Provincie Drenthe" : "Waterschap WDODelta"}] ${reg.title}`,
        title: `[${reg.source === "drenthe" ? "Provincie Drenthe" : "Waterschap WDODelta"}] ${reg.title}`,
        bestandsnaam: reg.bestandsnaam,
        datum: reg.date,
        date: reg.date,
        dossier: targetDossier.title,
        hoofddossier: targetDossier.title,
        subdossier: reg.subdossierName,
        wijken: reg.detectedWijken,
        wijkOfKern: reg.wijkOfKern,
        wijk_of_kern: reg.wijkOfKern,
        url: reg.fileUrl,
        fileUrl: reg.fileUrl,
        fileExists: true,
        source: reg.source,
      };

      if (!targetDossier.documents.some((d: any) => d.id === reg.id || d.bestandsnaam === reg.bestandsnaam)) {
        targetDossier.documents.push(formattedDoc);
        targetDossier.documentCount = targetDossier.documents.length;
        targetDossier.documentsCount = targetDossier.documents.length;
        targetDossier.uploadedCount = (targetDossier.uploadedCount || 0) + 1;
      }

      if (!targetDossier.subdossiers) targetDossier.subdossiers = [];
      let sub = targetDossier.subdossiers.find((s: any) => s.title === reg.subdossierName || s.name === reg.subdossierName);
      if (!sub) {
        sub = {
          id: `sub_${slugify(reg.subdossierName)}`,
          title: reg.subdossierName,
          name: reg.subdossierName,
          slug: slugify(reg.subdossierName),
          documents: [],
          documentCount: 0,
          documentsCount: 0,
          uploadedCount: 0,
        };
        targetDossier.subdossiers.push(sub);
      }
      if (!sub.documents.some((d: any) => d.id === reg.id || d.bestandsnaam === reg.bestandsnaam)) {
        sub.documents.push(formattedDoc);
        sub.documentCount = sub.documents.length;
        sub.documentsCount = sub.documents.length;
        sub.uploadedCount = (sub.uploadedCount || 0) + 1;
      }
      targetDossier.subdossierCount = targetDossier.subdossiers.length;
    }

    return resultDossiers;
  } catch (err) {
    console.error("[ENRICH HOOGEVEEN REGIONAL DOCS ERROR]:", err);
    return dossiers;
  }
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
