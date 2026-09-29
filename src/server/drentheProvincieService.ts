import fs from "fs";
import path from "path";
import dns from "node:dns";
import { GoogleGenAI } from "@google/genai";
import {
  sanitizeCleanText,
  isCorruptOrHtmlGarbage,
} from "./scraperContractValidator.js";
import { getKv, setKv } from "./sqliteDatabase.js";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

// Directories for Drenthe documents and metadata
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "documents", "drenthe");
const DIST_UPLOADS_DIR = path.join(process.cwd(), "dist", "uploads", "documents", "drenthe");
const CSV_FILE_PUBLIC = path.join(process.cwd(), "public", "uploads", "documents", "raadsstukken_metadata_drenthe.csv");
const CSV_FILE_ROOT = path.join(process.cwd(), "raadsstukken_metadata_drenthe.csv");
const JSON_FILE_PUBLIC = path.join(process.cwd(), "public", "uploads", "documents", "raadsstukken_metadata_drenthe.json");
const SYNC_STATE_FILE = path.join(process.cwd(), "public", "uploads", "documents", "drenthe_sync_state.json");

// Circuit breaker for Gemini quota exhaustion
let geminiQuotaExhausted = false;

// Utility: sleep throttle (rate-limit protection)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// TRAP 1: De Zwarte Lijst voor Drenthe (Niet-relevante externe steden buiten Drenthe zonder provinciaal belang)
export const EXTERN_KEYWORDS: string[] = [
  "enschede", "almelo", "hengelo", "deventer", "zwolle", "leeuwarden",
  "heerenveen", "drachten", "sneek", "delfzijl", "winschoten", "veendam",
  "stadskanaal", "harderwijk", "apeldoorn"
];

// TRAP 1: De Witte Lijst voor Hoogeveen & Provincie Drenthe
export const LOKAAL_KEYWORDS: string[] = [
  // Hoofdkern & Gemeente
  "hoogeveen", "gemeente hoogeveen", "zuidwest-drenthe", "zuid-drenthe",
  // Wijken Hoogeveen
  "de weide", "krakeel", "wolfsbos", "erflanden", "bentinckspark", "buitenvaart",
  "nijstad", "schutsloten", "trasselt", "vennebroek", "steenbergerpark", "de korfbal",
  // Dorpen en kernen gemeente Hoogeveen
  "hollandscheveld", "elim", "noordscheschut", "pesse", "tiendeveen", "stuifzand",
  "nieuweroord", "fluitenberg", "nieuwlande", "nieuw-ballinge",
  // Gemeenschappelijke Regelingen & Partners
  "area", "rhc drents archief", "drents archief", "vechtdallijn", "vechtdallijnen",
  "regio drenthe", "smi", "sociale woningbouw hoogeveen"
];

export interface DrentheDocumentMetadata {
  id: string;
  document_id: string;
  version: number | string;
  meeting_id: string;
  datum: string;
  titel: string;
  meeting_titel: string;
  gremium_naam: string;
  document_type: string;
  filetype: string;
  scope: "Lokaal - Hoogeveen" | "Provinciebreed" | "Lokaal - Externe Gemeente" | "Ongeclassificeerd";
  filter_methode: string;
  reden: string;
  opslaan: boolean;
  bestandsnaam: string;
  lokaal_pad: string;
  source_url: string;
  grootte_bytes: number;
  gesynchroniseerd_op: string;
}

export interface DrentheSyncProgress {
  isRunning: boolean;
  isPaused: boolean;
  currentYear: number | null;
  totalYears: number[];
  totalMeetingsFound: number;
  processedMeetings: number;
  totalDocumentsFound: number;
  scannedDocuments: number;
  savedDocuments: number;
  excludedDocuments: number;
  hoogeveenCount: number;
  provinciebreedCount: number;
  externCount: number;
  currentAction: string;
  logs: Array<{ timestamp: string; message: string; level: "info" | "success" | "warn" | "error" }>;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

// In-memory sync state
let syncState: DrentheSyncProgress = {
  isRunning: false,
  isPaused: false,
  currentYear: null,
  totalYears: [2021, 2022, 2023, 2024, 2025, 2026],
  totalMeetingsFound: 0,
  processedMeetings: 0,
  totalDocumentsFound: 0,
  scannedDocuments: 0,
  savedDocuments: 0,
  excludedDocuments: 0,
  hoogeveenCount: 0,
  provinciebreedCount: 0,
  externCount: 0,
  currentAction: "Inactief",
  logs: [],
  startedAt: null,
  completedAt: null,
  error: null,
};

let abortController: AbortController | null = null;

function saveSyncStateToDisk() {
  try {
    ensureDirectories();
    fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify(syncState, null, 2), "utf-8");
    try {
      setKv("drenthe_sync_state", syncState);
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

function loadSyncStateFromDisk() {
  try {
    // Check SQLite KV store first (most persistent)
    try {
      const sqliteState = getKv("drenthe_sync_state");
      if (sqliteState && typeof sqliteState === "object") {
        syncState = {
          ...syncState,
          ...sqliteState,
          isRunning: false,
          logs: Array.isArray(sqliteState.logs) ? sqliteState.logs : [],
        };
        return;
      }
    } catch {
      // ignore
    }

    if (fs.existsSync(SYNC_STATE_FILE)) {
      const raw = fs.readFileSync(SYNC_STATE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        syncState = {
          ...syncState,
          ...parsed,
          isRunning: false,
          logs: Array.isArray(parsed.logs) ? parsed.logs : [],
        };
      }
    }
  } catch {
    // ignore
  }
}

// Load persisted state on startup
loadSyncStateFromDisk();

function addLog(message: string, level: "info" | "success" | "warn" | "error" = "info") {
  const timestamp = new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  syncState.logs.unshift({ timestamp, message, level });
  if (syncState.logs.length > 250) syncState.logs.pop();
  console.log(`[DRENTHE SYNC] [${level.toUpperCase()}] ${message}`);
  saveSyncStateToDisk();
}

function ensureDirectories() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  const publicDir = path.dirname(JSON_FILE_PUBLIC);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  if (!fs.existsSync(DIST_UPLOADS_DIR)) {
    try {
      fs.mkdirSync(DIST_UPLOADS_DIR, { recursive: true });
    } catch {
      // ignore
    }
  }
}

/**
 * Load existing metadata items from SQLite KV store or JSON file
 */
export function getSavedDrentheDocuments(): DrentheDocumentMetadata[] {
  try {
    // 1. Primary: SQLite KV store (100% persistent)
    try {
      const sqliteDocs = getKv("raadsstukken_metadata_drenthe");
      if (Array.isArray(sqliteDocs) && sqliteDocs.length > 0) {
        return sqliteDocs;
      }
    } catch {
      // ignore
    }

    // 2. Secondary: JSON file
    if (fs.existsSync(JSON_FILE_PUBLIC)) {
      const raw = fs.readFileSync(JSON_FILE_PUBLIC, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        try {
          setKv("raadsstukken_metadata_drenthe", parsed);
        } catch {
          // ignore
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn("[DRENTHE] Failed to load metadata:", e);
  }
  return [];
}

/**
 * Save metadata list to SQLite KV store, JSON and CSV
 */
export function saveDrentheMetadata(items: DrentheDocumentMetadata[]): void {
  ensureDirectories();
  try {
    // 1. Persist to SQLite KV store (permanent, survival across any rebuilds)
    try {
      setKv("raadsstukken_metadata_drenthe", items);
    } catch {
      // ignore
    }

    // 2. Save JSON to public and dist uploads
    fs.writeFileSync(JSON_FILE_PUBLIC, JSON.stringify(items, null, 2), "utf-8");
    try {
      const distJson = path.join(DIST_UPLOADS_DIR, "raadsstukken_metadata_drenthe.json");
      fs.writeFileSync(distJson, JSON.stringify(items, null, 2), "utf-8");
    } catch {
      // ignore
    }

    // 3. Save CSV
    const csvHeaders = [
      "ID",
      "DocumentID",
      "Versie",
      "MeetingID",
      "Datum",
      "Titel",
      "MeetingTitel",
      "Gremium",
      "DocumentType",
      "Bestandstype",
      "Scope",
      "FilterMethode",
      "Reden",
      "Status",
      "Bestandsnaam",
      "LokaalPad",
      "SourceURL",
      "GrootteBytes",
      "GesynchroniseerdOp",
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [
      csvHeaders.join(";"),
      ...items.map((item) =>
        [
          escapeCsv(item.id),
          escapeCsv(item.document_id),
          escapeCsv(item.version),
          escapeCsv(item.meeting_id),
          escapeCsv(item.datum),
          escapeCsv(item.titel),
          escapeCsv(item.meeting_titel),
          escapeCsv(item.gremium_naam),
          escapeCsv(item.document_type),
          escapeCsv(item.filetype),
          escapeCsv(item.scope),
          escapeCsv(item.filter_methode),
          escapeCsv(item.reden),
          escapeCsv(item.opslaan ? "Opgeslagen" : "Genegeerd"),
          escapeCsv(item.bestandsnaam),
          escapeCsv(item.lokaal_pad),
          escapeCsv(item.source_url),
          escapeCsv(item.grootte_bytes),
          escapeCsv(item.gesynchroniseerd_op),
        ].join(";")
      ),
    ];

    const csvContent = "\uFEFF" + csvRows.join("\r\n"); // UTF-8 BOM for Excel
    fs.writeFileSync(CSV_FILE_PUBLIC, csvContent, "utf-8");
    try {
      const distCsv = path.join(DIST_UPLOADS_DIR, "raadsstukken_metadata_drenthe.csv");
      fs.writeFileSync(distCsv, csvContent, "utf-8");
    } catch {
      // ignore
    }
  } catch (err) {
    console.error("[DRENTHE] Error saving metadata files:", err);
  }
}

/**
 * Extract text from the first 2 pages of a PDF buffer
 */
async function extractIntroTextFromPdfBuffer(pdfBuffer: Buffer, maxPages = 2): Promise<string> {
  try {
    const pdfParseModule = await import("pdf-parse");
    const PDFParseClass = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default?.PDFParse || (pdfParseModule as any).default;

    if (typeof PDFParseClass === "function") {
      try {
        const parser = new PDFParseClass({ data: pdfBuffer, max: maxPages });
        const res = await parser.getText();
        if (res && res.text) return String(res.text).trim();
      } catch {
        const res = await (PDFParseClass as any)(pdfBuffer, { max: maxPages });
        if (res && res.text) return String(res.text).trim();
      }
    } else if (typeof (pdfParseModule as any) === "function") {
      const res = await (pdfParseModule as any)(pdfBuffer, { max: maxPages });
      if (res && res.text) return String(res.text).trim();
    }
  } catch (err: any) {
    console.warn("[DRENTHE] PDF parsing text extraction warning:", err?.message || err);
  }
  return "";
}

function matchLocalKeywordsInText(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  for (const kw of LOKAAL_KEYWORDS) {
    const escaped = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(lower)) {
      return kw;
    }
  }
  return null;
}

function matchExternalKeywordsInText(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const kw of EXTERN_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    if (regex.test(lower)) {
      return kw;
    }
  }
  return null;
}

/**
 * 3-Tier document classifier matching the user's exact specification for Provincie Drenthe
 */
export async function classifyDrentheDocument(
  titel: string,
  pdfBuffer?: Buffer | null,
  meetingTitel?: string
): Promise<{
  scope: "Lokaal - Hoogeveen" | "Provinciebreed" | "Lokaal - Externe Gemeente" | "Ongeclassificeerd";
  methode: string;
  reden: string;
  opslaan: boolean;
}> {
  const cleanTitle = sanitizeCleanText(titel || "");
  const titleLower = cleanTitle.toLowerCase();

  // TRAP 1A: Witte lijst in de titel
  const localMatchInTitle = matchLocalKeywordsInText(titleLower);
  if (localMatchInTitle) {
    return {
      scope: "Lokaal - Hoogeveen",
      methode: "Zwarte/Witte Lijst (Titel)",
      reden: `Witte lijst trefwoord '${localMatchInTitle}' aangetroffen in documenttitel`,
      opslaan: true,
    };
  }

  // TRAP 1B: Zwarte lijst in de titel
  const extMatchInTitle = matchExternalKeywordsInText(titleLower);
  if (extMatchInTitle) {
    // Check if title also mentions regional infrastructure (like Lelylijn or N33) which makes it provinciebreed
    if (
      titleLower.includes("lelylijn") ||
      titleLower.includes("nedersaksenlijn") ||
      titleLower.includes("vechtdallijn") ||
      titleLower.includes("n33") ||
      titleLower.includes("a28") ||
      titleLower.includes("omgevingsvisie") ||
      titleLower.includes("omgevingsverordening")
    ) {
      return {
        scope: "Provinciebreed",
        methode: "Zwarte/Witte Lijst + Infrastructuur-bypass",
        reden: `Bevat provinciebrede corridor/infrastructuur ondanks '${extMatchInTitle}'`,
        opslaan: true,
      };
    }

    return {
      scope: "Lokaal - Externe Gemeente",
      methode: "Zwarte Lijst (Titel)",
      reden: `Zwarte lijst trefwoord '${extMatchInTitle}' aangetroffen in titel`,
      opslaan: false,
    };
  }

  // Inhoudelijke controle via PDF-tekst
  let introText = "";
  if (pdfBuffer && pdfBuffer.length > 0) {
    introText = await extractIntroTextFromPdfBuffer(pdfBuffer, 2);
  }

  if (introText) {
    const localMatchInBody = matchLocalKeywordsInText(introText);
    if (localMatchInBody) {
      return {
        scope: "Lokaal - Hoogeveen",
        methode: "Witte Lijst (PDF Inhoud)",
        reden: `Witte lijst trefwoord '${localMatchInBody}' aangetroffen in eerste 2 pagina's van het document`,
        opslaan: true,
      };
    }
  }

  // TRAP 2: Regelgebaseerde Provinciale Classificatie (Direct, 0ms latency, geen quota-verbruik)
  const isProvinciebreedRule =
    titleLower.includes("agenda") ||
    titleLower.includes("besluitenlijst") ||
    titleLower.includes("toezeggingen") ||
    titleLower.includes("ingekomen stukken") ||
    titleLower.includes("statenstuk") ||
    titleLower.includes("verordening") ||
    titleLower.includes("omgevingsvisie") ||
    titleLower.includes("omgevingsverordening") ||
    titleLower.includes("pov") ||
    titleLower.includes("begroting") ||
    titleLower.includes("jaarverslag") ||
    titleLower.includes("jaarrekening") ||
    titleLower.includes("kadernota") ||
    titleLower.includes("najaarsnota") ||
    titleLower.includes("voorjaarsnota") ||
    titleLower.includes("motie") ||
    titleLower.includes("amendement") ||
    titleLower.includes("interpellatie") ||
    titleLower.includes("beleid") ||
    titleLower.includes("lelylijn") ||
    titleLower.includes("nedersaksenlijn") ||
    titleLower.includes("vechtdal") ||
    titleLower.includes("wolf") ||
    titleLower.includes("wolven") ||
    titleLower.includes("fauna") ||
    titleLower.includes("stikstof") ||
    titleLower.includes("drinkwater") ||
    titleLower.includes("monumentenzorg") ||
    titleLower.includes("erfgoed") ||
    titleLower.includes("landbouw") ||
    titleLower.includes("platteland") ||
    titleLower.includes("natuur") ||
    titleLower.includes("woondeal") ||
    titleLower.includes("woningbouw") ||
    titleLower.includes("energietransitie") ||
    titleLower.includes("res") ||
    titleLower.includes("provincie") ||
    titleLower.includes("drenthe") ||
    titleLower.includes("drents") ||
    titleLower.includes("statencommissie") ||
    titleLower.includes("provinciale staten");

  if (isProvinciebreedRule) {
    return {
      scope: "Provinciebreed",
      methode: "Regelgebaseerde Provinciale Taxonomy",
      reden: "Thematisch provinciaal beleid, statenstuk of parlementair document",
      opslaan: true,
    };
  }

  // TRAP 3: Gemini Flash Analyse (voor resterende niet-direct geclassificeerde documenten, quota-veilig)
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey && !geminiQuotaExhausted) {
    try {
      const aiClient = new GoogleGenAI({ apiKey: geminiApiKey });
      const promptText = `Je bent een bestuurskundige analist voor de Provincie Drenthe en de Gemeente Hoogeveen.
Beoordeel het volgende document van het Drents Parlement (Provinciale Staten of Statencommissie).

Documenttitel: "${cleanTitle}"
Vergadering: "${meetingTitel || "Statencommissie / Provinciale Staten Drenthe"}"
${introText ? `Eerste tekstfragment uit het document:\n"${introText.slice(0, 1500)}"` : ""}

Classificeer het document in exact één van de volgende drie categorieën:
1. "Lokaal - Hoogeveen" (Directe impact of specifiek betrekking op Hoogeveen, Hollandscheveld, Elim, Pesse, Noordscheschut, Bentinckspark, Buitenvaart, Drents Archief of Zuid-Drenthe)
2. "Provinciebreed" (Verordeningen, POV / Omgevingsvisie Drenthe, Woondeals Drenthe, Provinciale begroting, Natuurbeheerplan, Wolvenaanpak, Drinkwaterbescherming, Monumentenzorg Drenthe, Landbouw- en plattelandsinitiatieven, Lelylijn, Nedersaksenlijn, N33/A28, Vechtdallijnen, mobiliteit Drenthe)
3. "Lokaal - Externe Gemeente" (Uitsluitend lokaal belang voor een andere individuele gemeente buiten Hoogeveen zonder provinciaal of Hoogeveens effect)

Geef antwoord in strikt JSON-formaat:
{
  "categorie": "Lokaal - Hoogeveen" | "Provinciebreed" | "Lokaal - Externe Gemeente",
  "reden": "Korte toelichting van 1 zin waarom dit relevant of niet relevant is"
}`;

      const res = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const responseText = res.text?.trim() || "{}";
      const cleanJson = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      const aiOordeel = JSON.parse(cleanJson);

      let assignedScope: "Lokaal - Hoogeveen" | "Provinciebreed" | "Lokaal - Externe Gemeente" = "Provinciebreed";
      if (aiOordeel.categorie === "Lokaal - Hoogeveen") {
        assignedScope = "Lokaal - Hoogeveen";
      } else if (aiOordeel.categorie === "Lokaal - Externe Gemeente") {
        assignedScope = "Lokaal - Externe Gemeente";
      }

      const shouldSave = assignedScope === "Lokaal - Hoogeveen" || assignedScope === "Provinciebreed";

      return {
        scope: assignedScope,
        methode: "Gemini 2.5 Flash AI",
        reden: aiOordeel.reden || "AI classificatie: relevant voor provincie Drenthe / Hoogeveen",
        opslaan: shouldSave,
      };
    } catch (aiErr: any) {
      const errMsg = String(aiErr?.message || aiErr);
      if (errMsg.includes("resource_exhausted") || errMsg.includes("quota") || errMsg.includes("429")) {
        geminiQuotaExhausted = true;
        console.warn("[DRENTHE AI]: Gemini quota bereikt. Automatisch overgeschakeld op regelgebaseerde classificatie.");
      } else {
        console.warn("[DRENTHE AI CLASSIFIER WARN]:", errMsg);
      }
    }
  }

  // TRAP 4: Fallback vuistregel
  return {
    scope: "Provinciebreed",
    methode: "Regelgebaseerde Fallback",
    reden: "Statencommissie / Provinciale Staten document van algemeen provinciaal belang",
    opslaan: true,
  };
}

/**
 * Fetch HTML with timeout and user agent
 */
async function fetchHtml(url: string, timeoutMs = 12000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LijstVanAndel/Drenthe-Parlement-Sync/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (err: any) {
    console.warn(`[DRENTHE FETCH WARN] ${url}:`, err?.message || err);
    return null;
  }
}

/**
 * Download a PDF binary file and write to disk (safe and memory-bounded)
 */
async function downloadPdfFile(url: string, targetPath: string): Promise<Buffer | null> {
  try {
    if (fs.existsSync(targetPath)) {
      try {
        const stats = fs.statSync(targetPath);
        if (stats.size > 0) return null;
      } catch {
        // ignore
      }
    }

    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LijstVanAndel/Drenthe-Parlement-Sync/1.0",
        Accept: "application/pdf,*/*",
      },
    });
    if (!res.ok) return null;

    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 20 * 1024 * 1024) {
      // Skip files over 20MB to protect memory
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(targetPath, buffer);
    return buffer;
  } catch (err: any) {
    console.warn(`[DRENTHE DOWNLOAD WARN] ${url}:`, err?.message || err);
    return null;
  }
}

/**
 * Main synchronization engine for Provincie Drenthe (Drents Parlement)
 */
export async function startDrentheSync(years: number[] = [2021, 2022, 2023, 2024, 2025, 2026]): Promise<DrentheSyncProgress> {
  if (syncState.isRunning) {
    return syncState;
  }

  ensureDirectories();
  abortController = new AbortController();

  const existingDocs = getSavedDrentheDocuments();
  const existingMap = new Map<string, DrentheDocumentMetadata>();
  existingDocs.forEach((d) => existingMap.set(d.id || d.document_id, d));

  // Preserve existing logs across restarts so user never loses log history
  const previousLogs = Array.isArray(syncState.logs) ? syncState.logs.slice(0, 150) : [];
  const startTimestamp = new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  syncState = {
    isRunning: true,
    isPaused: false,
    currentYear: null,
    totalYears: years,
    totalMeetingsFound: 0,
    processedMeetings: 0,
    totalDocumentsFound: existingDocs.length,
    scannedDocuments: existingDocs.length,
    savedDocuments: existingDocs.filter((d) => d.opslaan).length,
    excludedDocuments: existingDocs.filter((d) => !d.opslaan).length,
    hoogeveenCount: existingDocs.filter((d) => d.scope === "Lokaal - Hoogeveen").length,
    provinciebreedCount: existingDocs.filter((d) => d.scope === "Provinciebreed").length,
    externCount: existingDocs.filter((d) => d.scope === "Lokaal - Externe Gemeente").length,
    currentAction: "Initialiseren synchronisatie Provincie Drenthe (Drents Parlement)...",
    logs: [
      { timestamp: startTimestamp, message: `▶ Synchronisatie gestart voor jaargangen: ${years.join(", ")}`, level: "info" },
      ...previousLogs,
    ],
    startedAt: new Date().toISOString(),
    completedAt: null,
    error: null,
  };

  saveSyncStateToDisk();

  addLog(`Start synchronisatie Provincie Drenthe voor jaargangen: ${years.join(", ")}...`, "info");

  // Run in background without blocking response
  (async () => {
    try {
      for (const year of years) {
        if (abortController?.signal.aborted) break;
        syncState.currentYear = year;
        addLog(`Jaargang ${year} scannen op drentsparlement.nl...`, "info");

        // Check all parliamentary organs for Drenthe across all years
        const organs = [
          "Statencommissie",
          "Provinciale-Staten-PS",
          "Statencommissie-Omgevingsbeleid-OGB",
          "Statencommissie-Financien-Cultuur-Bestuur-en-Economie-FCBE",
          "Algemene-commissievergadering",
        ];

        for (const organ of organs) {
          if (abortController?.signal.aborted) break;
          const organUrl = `https://www.drentsparlement.nl/Vergaderingen/${organ}/${year}`;
          const html = await fetchHtml(organUrl);
          if (!html || html.includes("foutpagina")) {
            continue;
          }

          // Parse meeting links: support both relative (/Vergaderingen/...) and absolute (https://...)
          const meetingLinkRegex = /href=["'](\/?Vergaderingen\/[^"']+\/\d{4}\/[^"']+\/[^"']+)["']/gi;
          const meetingUrls = new Set<string>();
          let match;
          while ((match = meetingLinkRegex.exec(html)) !== null) {
            let rawUrl = match[1].replace(/#.*$/, "").replace(/\/alle-documenten\/?$/, "");
            if (rawUrl.includes(`/${year}/`)) {
              if (!rawUrl.startsWith("http")) {
                rawUrl = `https://www.drentsparlement.nl${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
              }
              meetingUrls.add(rawUrl);
            }
          }

          if (meetingUrls.size > 0) {
            addLog(`${meetingUrls.size} vergaderingen gevonden voor ${organ} (${year})`, "info");
            syncState.totalMeetingsFound += meetingUrls.size;
          }

          for (const meetingUrl of meetingUrls) {
            if (abortController?.signal.aborted) break;

            // Throttle between meetings
            await sleep(1200);

            const allDocsUrl = `${meetingUrl}/alle-documenten`;
            syncState.currentAction = `Vergadering ${path.basename(meetingUrl)} analyseren...`;
            let meetingHtml = await fetchHtml(allDocsUrl);
            if (!meetingHtml || meetingHtml.includes("foutpagina")) {
              meetingHtml = await fetchHtml(meetingUrl);
            }
            if (!meetingHtml) continue;

            syncState.processedMeetings++;

            // Extract meeting title
            const titleMatch = meetingHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            const meetingTitle = titleMatch ? sanitizeCleanText(titleMatch[1].replace(/<[^>]+>/g, "").trim()) : `${organ} ${year}`;

            // Extract date from URL or title: e.g. 2026-10-21
            let meetingDate = `${year}-01-01`;
            const dateUrlMatch = meetingUrl.match(/\/(\d{4})\/(\d{1,2})-([a-z]+)/i);
            if (dateUrlMatch) {
              const mYear = dateUrlMatch[1];
              const mDay = dateUrlMatch[2].padStart(2, "0");
              const mMonthName = dateUrlMatch[3].toLowerCase();
              const months: Record<string, string> = {
                januari: "01", feb: "02", februari: "02", maart: "03", apr: "04", april: "04",
                mei: "05", jun: "06", juni: "06", jul: "07", juli: "07", aug: "08", augustus: "08",
                sept: "09", september: "09", okt: "10", oktober: "10", nov: "11", november: "11",
                dec: "12", december: "12"
              };
              const mMonth = months[mMonthName] || "01";
              meetingDate = `${mYear}-${mMonth}-${mDay}`;
            }

            // Extract document entries
            // Pattern: <li> ... <label for="30098"> ... (pdf) </label> ... href="...pdf"
            const docItemRegex = /<li[^>]*>[\s\S]*?<input[^>]*value=["'](\d+)["'][\s\S]*?<label[^>]*>([\s\S]*?)<\/label>[\s\S]*?href=["']([^"']+\.pdf)["'][\s\S]*?<\/li>/gi;
            let docMatch;
            const foundInMeeting: Array<{ docId: string; title: string; pdfUrl: string }> = [];

            while ((docMatch = docItemRegex.exec(meetingHtml)) !== null) {
              const docId = docMatch[1].trim();
              const rawTitle = docMatch[2]
                .replace(/<span[^>]*class=["']file-type["'][\s\S]*?<\/span>/gi, "")
                .replace(/\(pdf\)/gi, "")
                .replace(/<[^>]+>/g, "")
                .replace(/[\r\n\t]+/g, " ")
                .trim();
              const cleanDocTitle = sanitizeCleanText(rawTitle);
              let pdfUrl = docMatch[3].trim();
              if (pdfUrl.startsWith("/")) {
                pdfUrl = `https://www.drentsparlement.nl${pdfUrl}`;
              }
              foundInMeeting.push({ docId, title: cleanDocTitle, pdfUrl });
            }

            // Fallback general link extractor if list structure is alternative
            if (foundInMeeting.length === 0) {
              const genericPdfRegex = /href=["']([^"']+\.pdf)["'][^>]*>([\s\S]*?)<\/a>/gi;
              let gMatch;
              let gIdx = 1;
              while ((gMatch = genericPdfRegex.exec(meetingHtml)) !== null) {
                let pdfUrl = gMatch[1].trim();
                if (pdfUrl.startsWith("/")) {
                  pdfUrl = `https://www.drentsparlement.nl${pdfUrl}`;
                }
                const rawTitle = gMatch[2]
                  .replace(/<[^>]+>/g, "")
                  .replace(/\(pdf\)/gi, "")
                  .replace(/[\r\n\t]+/g, " ")
                  .trim();
                const cleanDocTitle = sanitizeCleanText(rawTitle) || path.basename(pdfUrl, ".pdf");
                const docId = `${year}_${path.basename(meetingUrl)}_${gIdx++}`;
                foundInMeeting.push({ docId, title: cleanDocTitle, pdfUrl });
              }
            }

            syncState.totalDocumentsFound += foundInMeeting.length;

            for (const item of foundInMeeting) {
              if (abortController?.signal.aborted) break;

              try {
                const docUniqueKey = `drenthe_${item.docId}_${encodeURIComponent(path.basename(item.pdfUrl))}`;
                syncState.scannedDocuments++;

                const safeFilename = `${meetingDate}_${item.docId}_${path.basename(item.pdfUrl).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
                const localPdfPath = path.join(UPLOADS_DIR, safeFilename);

                let pdfBuffer: Buffer | null = null;
                if (fs.existsSync(localPdfPath)) {
                  try {
                    pdfBuffer = fs.readFileSync(localPdfPath);
                  } catch {
                    // ignore
                  }
                }

                // Run 3-tier classification
                const classification = await classifyDrentheDocument(item.title, pdfBuffer, meetingTitle);

                // Auto-download local Hoogeveen documents to local disk for offline preservation; other documents stream on-demand
                let fileSize = pdfBuffer ? pdfBuffer.length : 0;
                if (classification.opslaan && classification.scope === "Lokaal - Hoogeveen" && (!pdfBuffer || pdfBuffer.length === 0)) {
                  syncState.currentAction = `Hoogeveen-stuk downloaden: "${item.title.slice(0, 40)}..."`;
                  pdfBuffer = await downloadPdfFile(item.pdfUrl, localPdfPath);
                  if (pdfBuffer) {
                    fileSize = pdfBuffer.length;
                  }
                }

                const docMeta: DrentheDocumentMetadata = {
                  id: docUniqueKey,
                  document_id: item.docId,
                  version: 1,
                  meeting_id: path.basename(meetingUrl),
                  datum: meetingDate,
                  titel: item.title,
                  meeting_titel: meetingTitle,
                  gremium_naam: organ.replace("-", " "),
                  document_type: item.title.toLowerCase().includes("motie")
                    ? "Motie"
                    : item.title.toLowerCase().includes("statenstuk")
                    ? "Statenstuk"
                    : item.title.toLowerCase().includes("brief")
                    ? "Brief"
                    : "Bijlage",
                  filetype: "pdf",
                  scope: classification.scope,
                  filter_methode: classification.methode,
                  reden: classification.reden,
                  opslaan: classification.opslaan,
                  bestandsnaam: safeFilename,
                  lokaal_pad: `/uploads/documents/drenthe/${safeFilename}`,
                  source_url: item.pdfUrl,
                  grootte_bytes: fileSize,
                  gesynchroniseerd_op: new Date().toISOString(),
                };

                existingMap.set(docUniqueKey, docMeta);

                // Update live counters
                const allDocsNow = Array.from(existingMap.values());
                syncState.savedDocuments = allDocsNow.filter((d) => d.opslaan).length;
                syncState.excludedDocuments = allDocsNow.filter((d) => !d.opslaan).length;
                syncState.hoogeveenCount = allDocsNow.filter((d) => d.scope === "Lokaal - Hoogeveen").length;
                syncState.provinciebreedCount = allDocsNow.filter((d) => d.scope === "Provinciebreed").length;
                syncState.externCount = allDocsNow.filter((d) => d.scope === "Lokaal - Externe Gemeente").length;

                if (classification.opslaan) {
                  addLog(`[${classification.scope}] ${item.title.slice(0, 60)}... (${classification.methode})`, "success");
                } else {
                  addLog(`[Genegeerd - ${classification.scope}] ${item.title.slice(0, 50)}...`, "info");
                }

                // Immediate incremental save so documents and counters appear live in UI
                saveDrentheMetadata(allDocsNow);
                saveSyncStateToDisk();
              } catch (docErr: any) {
                console.warn(`[DRENTHE DOC WARN] Fout bij document ${item.title}:`, docErr?.message || docErr);
              }
            }

            // Save state periodically to disk and persist metadata
            saveDrentheMetadata(Array.from(existingMap.values()));
            saveSyncStateToDisk();
          }
        }
      }

      const finalList = Array.from(existingMap.values());
      saveDrentheMetadata(finalList);

      syncState.isRunning = false;
      syncState.completedAt = new Date().toISOString();
      syncState.currentAction = `Synchronisatie voltooid! ${syncState.savedDocuments} provinciale stukken geregistreerd.`;
      addLog(`Voltooid! ${syncState.savedDocuments} relevante stukken bewaard (${syncState.hoogeveenCount} Hoogeveen, ${syncState.provinciebreedCount} Provinciebreed).`, "success");
      saveSyncStateToDisk();
    } catch (err: any) {
      console.error("[DRENTHE SYNC ERROR]", err);
      syncState.isRunning = false;
      syncState.error = err.message || String(err);
      syncState.currentAction = `Fout opgetreden: ${err.message}`;
      addLog(`Synchronisatiefout: ${err.message}`, "error");
      saveSyncStateToDisk();
    }
  })();

  saveSyncStateToDisk();
  return syncState;
}

export function stopDrentheSync(): DrentheSyncProgress {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  syncState.isRunning = false;
  syncState.isPaused = false;
  syncState.currentAction = "Gestopt door gebruiker";
  addLog("Synchronisatie handmatig afgebroken", "warn");
  saveSyncStateToDisk();
  return syncState;
}

export function getDrentheSyncStatus(): DrentheSyncProgress {
  const docs = getSavedDrentheDocuments();
  syncState.savedDocuments = docs.filter((d) => d.opslaan).length;
  syncState.excludedDocuments = docs.filter((d) => !d.opslaan).length;
  syncState.hoogeveenCount = docs.filter((d) => d.scope === "Lokaal - Hoogeveen").length;
  syncState.provinciebreedCount = docs.filter((d) => d.scope === "Provinciebreed").length;
  syncState.externCount = docs.filter((d) => d.scope === "Lokaal - Externe Gemeente").length;
  return syncState;
}

export function clearDrentheCache(): { success: boolean; message: string } {
  try {
    if (fs.existsSync(JSON_FILE_PUBLIC)) fs.unlinkSync(JSON_FILE_PUBLIC);
    if (fs.existsSync(CSV_FILE_PUBLIC)) fs.unlinkSync(CSV_FILE_PUBLIC);
    if (fs.existsSync(CSV_FILE_ROOT)) fs.unlinkSync(CSV_FILE_ROOT);
    if (fs.existsSync(SYNC_STATE_FILE)) fs.unlinkSync(SYNC_STATE_FILE);
    syncState.logs = [];
    syncState.savedDocuments = 0;
    syncState.excludedDocuments = 0;
    syncState.hoogeveenCount = 0;
    syncState.provinciebreedCount = 0;
    syncState.externCount = 0;
    addLog("Lokale cache en metadata van Provincie Drenthe gewist", "warn");
    saveSyncStateToDisk();
    return { success: true, message: "Drenthe provinciale cache en metadata succesvol gewist." };
  } catch (err: any) {
    return { success: false, message: "Fout bij wissen van cache: " + err.message };
  }
}
