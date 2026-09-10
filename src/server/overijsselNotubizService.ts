import fs from "fs";
import path from "path";
import https from "node:https";
import http from "node:http";
import dns from "node:dns";
import { GoogleGenAI } from "@google/genai";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

const appDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();

// Directories for Overijssel documents and metadata
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "documents", "overijssel");
const DIST_UPLOADS_DIR = path.join(process.cwd(), "dist", "uploads", "documents", "overijssel");
const CSV_FILE_PUBLIC = path.join(process.cwd(), "public", "uploads", "documents", "raadsstukken_metadata_overijssel.csv");
const CSV_FILE_ROOT = path.join(process.cwd(), "raadsstukken_metadata_overijssel.csv");
const JSON_FILE_PUBLIC = path.join(process.cwd(), "public", "uploads", "documents", "raadsstukken_metadata_overijssel.json");

// Utility: sleep throttle (4 seconds as requested for rate-limit protection)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// TRAP 1: De Zwarte Lijst (Irrelevante steden en gemeenten)
export const EXTERN_KEYWORDS: string[] = [
  "enschede", "almelo", "hengelo", "deventer", "raalte", "dalfsen",
  "kampen", "zwolle", "haaksbergen", "rijssen", "losser", "tubbergen",
  "hardenberg", "ommen", "staphorst", "olst-wijhe", "wierden", "hellendoorn",
  "borne", "hof van twente", "twenterand", "dinkelland", "oldenzaal"
];

// TRAP 1: De Witte Lijst (Geografische Matrix Steenwijkerland)
export const LOKAAL_KEYWORDS: string[] = [
  // Overkoepelend
  "steenwijkerland", "weerribben", "kop van overijssel",
  // Steden & Hoofdkernen
  "steenwijk", "vollenhove", "blokzijl",
  // Dorpen
  "belt-schutsloot", "blankenham", "eesveen", "giethoorn", "kallenkote",
  "kuinre", "oldemarkt", "ossenzijl", "scheerwolde", "sint jansklooster",
  "steenwijkerwold", "wanneperveen", "willemsoord",
  // Buurtschappen & Kleine Kernen
  "baarlo", "baars", "barsbeek", "basse", "basserveld", "blauwe hand",
  "de bult", "dinxterveen", "doosje", "dwarsgracht", "eese", "heetveld",
  "ijsselham", "jonen", "kadoelen", "kalenberg", "de klosse", "de kolk",
  "de krieger", "leeuwte", "marijenkampen", "moespot", "molenhoek",
  "muggenbeet", "nederland", "onna", "paasloo", "poepershoek", "de pol",
  "roekebosch", "ronde blesse", "ronduite", "thij", "tuk", "wetering",
  "witte paarden", "zuidveen"
];

export interface OverijsselDocumentMetadata {
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
  scope: "Lokaal - Steenwijkerland" | "Provinciebreed" | "Lokaal - Externe Gemeente" | "Ongeclassificeerd";
  filter_methode: string;
  reden: string;
  opslaan: boolean;
  bestandsnaam: string;
  lokaal_pad: string;
  notubiz_url: string;
  grootte_bytes: number;
  gesynchroniseerd_op: string;
}

export interface OverijsselSyncProgress {
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
  steenwijkerlandCount: number;
  provinciebreedCount: number;
  externCount: number;
  currentAction: string;
  logs: Array<{ timestamp: string; message: string; level: "info" | "success" | "warn" | "error" }>;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

// In-memory sync state
let syncState: OverijsselSyncProgress = {
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
  steenwijkerlandCount: 0,
  provinciebreedCount: 0,
  externCount: 0,
  currentAction: "Inactief",
  logs: [],
  startedAt: null,
  completedAt: null,
  error: null,
};

let abortController: AbortController | null = null;

function addLog(message: string, level: "info" | "success" | "warn" | "error" = "info") {
  const timestamp = new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  syncState.logs.unshift({ timestamp, message, level });
  if (syncState.logs.length > 300) syncState.logs.pop();
  console.log(`[OVERIJSSEL SYNC] [${level.toUpperCase()}] ${message}`);
}

function ensureDirectories() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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
 * Load existing metadata items from JSON file
 */
export function getSavedOverijsselDocuments(): OverijsselDocumentMetadata[] {
  try {
    if (fs.existsSync(JSON_FILE_PUBLIC)) {
      const raw = fs.readFileSync(JSON_FILE_PUBLIC, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("[OVERIJSSEL] Failed to load JSON metadata:", e);
  }
  return [];
}

/**
 * Save metadata list to JSON and CSV
 */
export function saveOverijsselMetadata(items: OverijsselDocumentMetadata[]): void {
  ensureDirectories();
  try {
    // Save JSON
    fs.writeFileSync(JSON_FILE_PUBLIC, JSON.stringify(items, null, 2), "utf-8");

    // Save CSV
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
      "NotuBizURL",
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
          escapeCsv(item.notubiz_url),
          escapeCsv(item.grootte_bytes),
          escapeCsv(item.gesynchroniseerd_op),
        ].join(";")
      ),
    ];

    const csvContent = "\uFEFF" + csvRows.join("\r\n"); // UTF-8 BOM for Excel
    fs.writeFileSync(CSV_FILE_PUBLIC, csvContent, "utf-8");
    fs.writeFileSync(CSV_FILE_ROOT, csvContent, "utf-8");
  } catch (err) {
    console.error("[OVERIJSSEL] Error saving metadata files:", err);
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
    console.warn("[OVERIJSSEL] PDF parsing text extraction warning:", err?.message || err);
  }
  return "";
}

// Disambiguated body-text keywords (to avoid false positives on words like "in Nederland" or "stuk" matching "tuk")
function matchLocalKeywordsInText(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  for (const kw of LOKAAL_KEYWORDS) {
    if (kw === "nederland") {
      // Avoid matching generic country "Nederland"
      if (/\b(buurtschap|dorp|kernen)\s+nederland\b/i.test(lower) || /\bnederland\s+\(steenwijkerland\)/i.test(lower)) {
        return "buurtschap nederland";
      }
      continue;
    }

    // Always use word boundary so words like "agendastuk" do not match the village "tuk"
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
 * 3-Tier document classifier matching the user's exact specification
 */
export async function classificeerProvinciaalDocument(
  notubizItem: { title: string; meetingTitle?: string; documentId: string | number },
  pdfBuffer: Buffer
): Promise<{
  scope: "Lokaal - Steenwijkerland" | "Provinciebreed" | "Lokaal - Externe Gemeente" | "Ongeclassificeerd";
  opslaan: boolean;
  filter_methode: string;
  reden: string;
}> {
  const titel = (notubizItem.title || "").toLowerCase();
  const contextTitel = `${notubizItem.title || ""} ${notubizItem.meetingTitle || ""}`.toLowerCase();

  // TRAP 1a: Zwarte lijst check (Gratis & snel)
  const matchedBlacklist = matchExternalKeywordsInText(titel);
  if (matchedBlacklist) {
    const msg = `Zwarte lijst: Bevat externe gemeente '${matchedBlacklist}' in titel`;
    console.log(`[VERNIETIGD] Gaat over externe gemeente: ${notubizItem.title} (${matchedBlacklist})`);
    return {
      scope: "Lokaal - Externe Gemeente",
      opslaan: false,
      filter_methode: "Zwarte lijst (Titel)",
      reden: msg,
    };
  }

  // TRAP 1b: Witte lijst check (Gratis & snel)
  const matchedWhitelist = matchLocalKeywordsInText(contextTitel);
  if (matchedWhitelist) {
    const msg = `Witte lijst: Lokaal Steenwijkerland trefwoord '${matchedWhitelist}' gedetecteerd`;
    console.log(`[BINGO] Lokaal Steenwijkerland gedetecteerd: ${notubizItem.title} (${matchedWhitelist})`);
    return {
      scope: "Lokaal - Steenwijkerland",
      opslaan: true,
      filter_methode: "Witte lijst (Titel)",
      reden: msg,
    };
  }

  // TRAP 2: Gemini Flash Analyse (Voor de generieke/provinciebrede titels)
  console.log(`[AI CHECK] Generieke titel gedetecteerd, tekst extractie voor: ${notubizItem.title}`);
  
  // Alleen de eerste 2 pagina's extraheren (Token-besparing & snelheid)
  const introTekst = await extractIntroTextFromPdfBuffer(pdfBuffer, 2);

  // Als de bodytekst expliciet een zwarte lijst gemeente bevat en GEEN Steenwijkerland
  if (introTekst) {
    const hasExternalInBody = matchExternalKeywordsInText(introTekst);
    const hasSteenwijkInBody = matchLocalKeywordsInText(introTekst);

    if (hasSteenwijkInBody) {
      return {
        scope: "Lokaal - Steenwijkerland",
        opslaan: true,
        filter_methode: "Witte lijst (Documenttekst)",
        reden: `Tekstuele match: Steenwijkerland term '${hasSteenwijkInBody}' gevonden in documentintro`,
      };
    }
  }

  // AI prompt opstellen
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !introTekst || introTekst.length < 20) {
    // Geen AI beschikbaar of geen tekst -> veiligheidshalve markeren als Provinciebreed/Ongeclassificeerd
    return {
      scope: "Provinciebreed",
      opslaan: true,
      filter_methode: "Heuristische Provinciebrede Default",
      reden: "Generiek provinciaal document zonder externe uitsluiting",
    };
  }

  const prompt = `Je bent een strenge data-classificeerder voor de lokale politieke partij 'Lijst van Andel' in Steenwijkerland.
Analyseer deze inleiding/samenvatting van een provinciaal document uit Overijssel:
Titel: "${notubizItem.title}"

Kies EXACT één van deze drie categorieën:
1. "Provinciebreed" (Verordeningen, algemeen provinciaal beleid, woondeals, provinciale begroting, natuurvisie voor de hele provincie)
2. "Steenwijkerland" (Gaat specifiek over Steenwijkerland, Weerribben, Kop van Overijssel of kernen/dorpen in die gemeente)
3. "Extern" (Gaat specifiek over andere gemeenten in Overijssel zoals Twente, Enschede, Zwolle, Kampen, Deventer, Almelo, etc.)

Retourneer uitsluitend JSON in dit exacte format: {"scope": "Provinciebreed" | "Steenwijkerland" | "Extern", "reden": "Korte toelichting"}

Documenttekst (eerste 2 pagina's):
${introTekst.slice(0, 3000)}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    let response: any = null;

    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.0,
          responseMimeType: "application/json",
        },
      });
    } catch {
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          temperature: 0.0,
          responseMimeType: "application/json",
        },
      });
    }

    const raw = response.text?.trim() || "";
    const cleanJson = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const aiOordeel = JSON.parse(cleanJson);

    // Anti-Rate Limit Throttle: 4 seconden wachten voor de volgende call
    await sleep(4000);

    if (aiOordeel.scope === "Extern") {
      console.log(`[AI VERNIETIGD] Flash beoordeelt als extern: ${aiOordeel.reden}`);
      return {
        scope: "Lokaal - Externe Gemeente",
        opslaan: false,
        filter_methode: "Gemini Flash AI",
        reden: aiOordeel.reden || "AI classificatie: extern",
      };
    }

    const finalScope = aiOordeel.scope === "Steenwijkerland" ? "Lokaal - Steenwijkerland" : "Provinciebreed";
    console.log(`[AI GOEDGEKEURD] Scope: ${finalScope} | Reden: ${aiOordeel.reden}`);
    return {
      scope: finalScope,
      opslaan: true,
      filter_methode: "Gemini Flash AI",
      reden: aiOordeel.reden || "AI classificatie: relevant voor provincie/Steenwijkerland",
    };
  } catch (error: any) {
    console.error(`[API FOUT] Falen bij classificatie van ${notubizItem.title}:`, error?.message || error);
    // Bij twijfel of API-storing: bewaar veiligheidshalve als Provinciebreed
    return {
      scope: "Provinciebreed",
      opslaan: true,
      filter_methode: "AI Fallback (Veiligheidsbehoud)",
      reden: "API rate-limit of storing; veiligheidshalve behouden voor provinciaal overzicht",
    };
  }
}

interface HttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, any>;
  arrayBuffer: () => Promise<ArrayBuffer>;
  buffer: () => Promise<Buffer>;
  text: () => Promise<string>;
  json: () => Promise<any>;
}

/**
 * Robust IPv4 HTTP/HTTPS request handler
 */
function requestIPv4(urlStr: string, options: any = {}): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const isHttps = url.protocol === "https:";
      const lib = isHttps ? https : http;

      const reqOptions: any = {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method || "GET",
        family: 4, // Explicitly force IPv4 to avoid broken VPS IPv6 routes
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          ...(options.headers || {}),
        },
        timeout: options.timeout || 25000,
      };

      const req = lib.request(reqOptions, (res: any) => {
        // Handle standard 3xx HTTP redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirectUrl = res.headers.location;
          if (redirectUrl.startsWith("/")) {
            redirectUrl = `${url.protocol}//${url.host}${redirectUrl}`;
          }
          return resolve(requestIPv4(redirectUrl, options));
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const resObj: HttpResponse = {
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode || 0,
            statusText: res.statusMessage || "",
            headers: res.headers || {},
            arrayBuffer: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
            buffer: () => Promise.resolve(buffer),
            text: () => Promise.resolve(buffer.toString("utf-8")),
            json: () => {
              try {
                return Promise.resolve(JSON.parse(buffer.toString("utf-8")));
              } catch (parseErr) {
                return Promise.reject(parseErr);
              }
            },
          };
          resolve(resObj);
        });
      });

      if (options.signal) {
        options.signal.addEventListener(
          "abort",
          () => {
            req.destroy(new Error("This operation was aborted"));
          },
          { once: true }
        );
      }

      req.on("error", (err: any) => {
        reject(err);
      });

      req.on("timeout", () => {
        req.destroy(new Error(`Request timed out after ${reqOptions.timeout}ms`));
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Robust fetch with automatic retry, exponential backoff, IPv4 routing and timeout
 */
async function fetchWithRetry(url: string, options: any = {}, maxRetries = 4, timeoutMs = 25000): Promise<HttpResponse> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await requestIPv4(url, {
        ...options,
        timeout: timeoutMs,
      });

      if (res.ok || res.status === 404) {
        return res;
      }

      if (res.status >= 500 && attempt < maxRetries) {
        await sleep(1500 * attempt);
        continue;
      }

      return res;
    } catch (err: any) {
      lastError = err;
      if (options.signal?.aborted) {
        throw err;
      }
      if (attempt < maxRetries) {
        await sleep(1500 * attempt);
      }
    }
  }
  throw lastError || new Error(`Request failed after ${maxRetries} attempts: ${url}`);
}

/**
 * Normalize NotuBiz document download URL to use official open API endpoint
 */
function getCanonicalNotubizDownloadUrl(documentId: string | number, version: string | number = 1, rawUrl?: string): string {
  // Always use the direct API endpoint for clean PDF bytes without Cloudflare HTML challenges
  if (documentId) {
    return `https://api.notubiz.nl/document/${documentId}/${version || 1}`;
  }
  if (rawUrl) {
    if (rawUrl.startsWith("http")) return rawUrl;
    if (rawUrl.startsWith("//")) return `https:${rawUrl}`;
    if (rawUrl.startsWith("api.notubiz.nl")) return `https://${rawUrl}`;
    return `https://api.notubiz.nl/${rawUrl.replace(/^\/+/, "")}`;
  }
  return `https://api.notubiz.nl/document/${documentId}/${version || 1}`;
}

/**
 * Fetch all events/meetings for a given year from NotuBiz API (Org 1750: Provincie Overijssel)
 */
async function fetchOverijsselEventsForYear(year: number, signal?: AbortSignal): Promise<any[]> {
  const url = new URL("https://api.notubiz.nl/events");
  url.searchParams.set("organisation_id", "1750");
  url.searchParams.set("date_from", `${year}-01-01 00:00:00`);
  url.searchParams.set("date_to", `${year}-12-31 23:59:59`);
  url.searchParams.set("format", "json");
  url.searchParams.set("version", "1.17.0");

  const res = await fetchWithRetry(url.toString(), { signal });

  if (!res.ok) {
    throw new Error(`NotuBiz API returned ${res.status} for year ${year}`);
  }

  const data = await res.json();
  return data.events || [];
}

/**
 * Fetch meeting details with agenda items and documents
 */
async function fetchMeetingDetails(meetingId: number | string, signal?: AbortSignal): Promise<any> {
  const url = `https://api.notubiz.nl/events/meetings/${meetingId}?format=json&version=1.17.0`;
  try {
    const res = await fetchWithRetry(url, { signal }, 3, 20000);
    if (!res.ok) return null;
    const data = await res.json();
    return data.meeting || null;
  } catch (err: any) {
    console.warn(`[OVERIJSSEL] Error fetching meeting ${meetingId}:`, err?.message || err);
    return null;
  }
}

/**
 * Fetch module items (Statenvoorstellen, Moties, etc.)
 */
async function fetchModuleItems(moduleId: number, signal?: AbortSignal): Promise<any[]> {
  const url = `https://api.notubiz.nl/organisations/1750/modules/${moduleId}/items?format=json&version=1.17.0`;
  try {
    const res = await fetchWithRetry(url, { signal }, 3, 30000);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (err: any) {
    console.warn(`[OVERIJSSEL] Error fetching module ${moduleId} items:`, err?.message || err);
    return [];
  }
}

/**
 * Sanitize filename for local storage
 */
function sanitizeFilename(str: string): string {
  return str
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 120);
}

/**
 * Run full Overijssel sync from 2021 to current date using OpenRaadsinformatie
 * Source URL: https://zoek.openraadsinformatie.nl/?organization=overijssel&sort=date_desc
 * API Endpoint: https://zoek.openraadsinformatie.nl/api/search?organization=overijssel&sort=date_desc&page=${page}
 */
export async function startOverijsselNotubizSync(options?: {
  years?: number[];
  forceRescan?: boolean;
}): Promise<OverijsselSyncProgress> {
  if (syncState.isRunning) {
    return syncState;
  }

  const targetYears = options?.years && options.years.length > 0 ? options.years : [2021, 2022, 2023, 2024, 2025, 2026];
  const minTargetYear = Math.min(...targetYears);
  abortController = new AbortController();
  const signal = abortController.signal;

  ensureDirectories();
  const existingDocs = getSavedOverijsselDocuments();
  const existingDocMap = new Map<string, OverijsselDocumentMetadata>();
  for (const doc of existingDocs) {
    existingDocMap.set(`${doc.document_id}_${doc.version}`, doc);
  }

  syncState = {
    isRunning: true,
    isPaused: false,
    currentYear: null,
    totalYears: targetYears,
    totalMeetingsFound: 0,
    processedMeetings: 0,
    totalDocumentsFound: 0,
    scannedDocuments: 0,
    savedDocuments: existingDocs.filter((d) => d.opslaan).length,
    excludedDocuments: existingDocs.filter((d) => !d.opslaan).length,
    steenwijkerlandCount: existingDocs.filter((d) => d.scope === "Lokaal - Steenwijkerland").length,
    provinciebreedCount: existingDocs.filter((d) => d.scope === "Provinciebreed").length,
    externCount: existingDocs.filter((d) => d.scope === "Lokaal - Externe Gemeente").length,
    currentAction: "Initialiseren OpenRaadsinformatie Scraper...",
    logs: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    error: null,
  };

  addLog(`Start OpenRaadsinformatie synchronisatie Provincie Overijssel (https://zoek.openraadsinformatie.nl/?organization=overijssel&sort=date_desc)...`, "info");

  (async () => {
    try {
      let offset = 0;
      let stopPaging = false;
      let consecutiveOldItems = 0;

      while (!stopPaging && !signal.aborted) {
        const pageNum = Math.floor(offset / 25) + 1;
        syncState.currentAction = `OpenRaadsinformatie ophalen resultaten (offset ${offset})...`;
        addLog(`Ophalen offset ${offset} (ca. pagina ${pageNum}) van OpenRaadsinformatie (organization=overijssel, sort=date_desc)...`, "info");

        let searchRes: { results: any[]; totalCount: number; hasMore: boolean } | null = null;
        try {
          const url = `https://zoek.openraadsinformatie.nl/api/search?organization=overijssel&sort=date_desc&offset=${offset}&limit=50`;
          const res = await fetchWithRetry(url, { signal, headers: { Accept: "application/json" } }, 3, 25000);
          if (res.ok) {
            const data = await res.json();
            searchRes = {
              results: Array.isArray(data.results) ? data.results : [],
              totalCount: typeof data.totalCount === "number" ? data.totalCount : 0,
              hasMore: Boolean(data.hasMore),
            };
          }
        } catch (err: any) {
          addLog(`Fout bij ophalen offset ${offset} van OpenRaadsinformatie: ${err.message}`, "warn");
          break;
        }

        if (!searchRes || !searchRes.results || searchRes.results.length === 0) {
          addLog(`Geen verdere resultaten gevonden op OpenRaadsinformatie bij offset ${offset}.`, "info");
          break;
        }

        if (offset === 0 && searchRes.totalCount > 0) {
          syncState.totalMeetingsFound = searchRes.totalCount;
          addLog(`OpenRaadsinformatie: ca. ${searchRes.totalCount} resultaten beschikbaar voor Overijssel.`, "info");
        }

        for (const item of searchRes.results) {
          if (signal.aborted) break;

          const rawDate = item.sortDate || item.date || "";
          const itemYear = parseInt((rawDate || "").slice(0, 4), 10) || (rawDate ? new Date(rawDate).getFullYear() : 0);

          if (itemYear && itemYear < minTargetYear) {
            consecutiveOldItems++;
            if (consecutiveOldItems >= 20) {
              addLog(`Grensdatum bereikt op OpenRaadsinformatie (${rawDate.slice(0, 10)} < ${minTargetYear}). Scraper stopt verdere paginering.`, "info");
              stopPaging = true;
              break;
            }
            syncState.processedMeetings++;
            continue;
          } else {
            consecutiveOldItems = 0;
          }

          if (itemYear && !targetYears.includes(itemYear)) {
            syncState.processedMeetings++;
            continue;
          }

          syncState.currentYear = itemYear || minTargetYear;
          const isDoc = item.entityType === "Document" || item.entityTypeLabel === "Document";
          const isMeeting = item.entityType === "Meeting" || item.entityTypeLabel === "Vergadering";

          if (isDoc) {
            let docId = "";
            const match = String(item.entityId || "").match(/document:notubiz:provincie:overijssel:(\d+)/i) || String(item.entityId || "").match(/(\d+)/);
            if (match) docId = match[1];
            else docId = String(item.entityId || "").replace(/[^a-zA-Z0-9]/g, "_");

            const docKey = `${docId}_1`;
            syncState.totalDocumentsFound++;

            if (!options?.forceRescan && existingDocMap.has(docKey)) {
              syncState.scannedDocuments++;
              syncState.processedMeetings++;
              continue;
            }

            const docTitle = item.title || item.summary || `Document ${docId}`;
            const meetingTitle = item.summary || item.title || "OpenRaadsinformatie Overijssel";
            const itemDate = (item.sortDate || "").slice(0, 10) || `${itemYear || 2026}-01-01`;

            syncState.currentAction = `Analyseren [ORI Document]: ${docTitle.slice(0, 35)}...`;

            let pdfBuffer: Buffer | null = null;
            let downloadUrl = item.downloadUrl || getCanonicalNotubizDownloadUrl(docId, 1);

            try {
              const res = await fetchWithRetry(downloadUrl, { signal }, 3, 25000);
              if (res.ok) {
                const arr = await res.arrayBuffer();
                pdfBuffer = Buffer.from(arr);
              }
            } catch (err: any) {
              console.warn(`[OVERIJSSEL ORI] Download probeersel mislukt voor ${docId}:`, err?.message);
            }

            if (!pdfBuffer || pdfBuffer.length === 0) {
              const fallbackUrl = getCanonicalNotubizDownloadUrl(docId, 1);
              if (fallbackUrl !== downloadUrl) {
                try {
                  const res2 = await fetchWithRetry(fallbackUrl, { signal }, 2, 20000);
                  if (res2.ok) {
                    const arr = await res2.arrayBuffer();
                    pdfBuffer = Buffer.from(arr);
                    downloadUrl = fallbackUrl;
                  }
                } catch {
                  // ignore
                }
              }
            }

            if (!pdfBuffer || pdfBuffer.length === 0) {
              syncState.processedMeetings++;
              continue;
            }

            const classification = await classificeerProvinciaalDocument(
              {
                title: docTitle,
                meetingTitle,
                documentId: docId,
              },
              pdfBuffer
            );

            const safeTitle = sanitizeFilename(docTitle);
            const filename = `${itemDate}_${docId}_${safeTitle}.pdf`;
            const localRelPath = `/uploads/documents/overijssel/${filename}`;
            const localAbsPath = path.join(UPLOADS_DIR, filename);

            if (classification.opslaan) {
              fs.writeFileSync(localAbsPath, pdfBuffer);
              try {
                const distPath = path.join(DIST_UPLOADS_DIR, filename);
                fs.writeFileSync(distPath, pdfBuffer);
              } catch {
                // ignore
              }
            }

            const record: OverijsselDocumentMetadata = {
              id: `ov-${docId}`,
              document_id: docId,
              version: 1,
              meeting_id: String(item.entityId || ""),
              datum: itemDate,
              titel: docTitle,
              meeting_titel: meetingTitle,
              gremium_naam: "OpenRaadsinformatie Overijssel",
              document_type: item.entityTypeLabel || "Document",
              filetype: "pdf",
              scope: classification.scope,
              filter_methode: classification.filter_methode,
              reden: classification.reden,
              opslaan: classification.opslaan,
              bestandsnaam: classification.opslaan ? filename : "",
              lokaal_pad: classification.opslaan ? localRelPath : "",
              notubiz_url: downloadUrl,
              grootte_bytes: pdfBuffer.length,
              gesynchroniseerd_op: new Date().toISOString(),
            };

            existingDocMap.set(docKey, record);
            syncState.scannedDocuments++;

            if (classification.opslaan) {
              syncState.savedDocuments++;
              if (classification.scope === "Lokaal - Steenwijkerland") {
                syncState.steenwijkerlandCount++;
                addLog(`[BINGO STEENWIJKERLAND] ${docTitle} -> ${classification.reden}`, "success");
              } else {
                syncState.provinciebreedCount++;
                addLog(`[PROVINCIEBREED BEHOUDEN] ${docTitle}`, "info");
              }
            } else {
              syncState.excludedDocuments++;
              syncState.externCount++;
              addLog(`[EXTERN GENEGEERD] ${docTitle} -> ${classification.reden}`, "warn");
            }

            if (syncState.scannedDocuments % 5 === 0) {
              saveOverijsselMetadata(Array.from(existingDocMap.values()));
            }

          } else if (isMeeting) {
            try {
              const detailsUrl = `https://zoek.openraadsinformatie.nl/api/entities/${encodeURIComponent(item.entityId)}`;
              const detailsRes = await fetchWithRetry(detailsUrl, { signal, headers: { Accept: "application/json" } }, 2, 20000);
              if (detailsRes.ok) {
                const details = await detailsRes.json();
                if (details && Array.isArray(details.agenda)) {
                  for (const ag of details.agenda) {
                    if (signal.aborted) break;
                    if (Array.isArray(ag.documents)) {
                      for (const d of ag.documents) {
                        if (signal.aborted) break;
                        let docId = "";
                        const match = String(d.id || "").match(/document:notubiz:provincie:overijssel:(\d+)/i) || String(d.id || "").match(/(\d+)/);
                        if (match) docId = match[1];
                        else docId = String(d.id || "").replace(/[^a-zA-Z0-9]/g, "_");

                        if (!docId) continue;
                        const docKey = `${docId}_1`;
                        syncState.totalDocumentsFound++;

                        if (!options?.forceRescan && existingDocMap.has(docKey)) {
                          syncState.scannedDocuments++;
                          continue;
                        }

                        const docTitle = d.name || d.title || ag.title || item.title || `Document ${docId}`;
                        const meetingTitle = item.title || details.title || "Vergadering Overijssel";
                        const itemDate = (item.sortDate || details.sortDate || "").slice(0, 10) || `${itemYear || 2026}-01-01`;

                        let pdfBuffer: Buffer | null = null;
                        const downloadUrl = d.original_url || getCanonicalNotubizDownloadUrl(docId, 1);

                        try {
                          const res = await fetchWithRetry(downloadUrl, { signal }, 3, 20000);
                          if (res.ok) {
                            const arr = await res.arrayBuffer();
                            pdfBuffer = Buffer.from(arr);
                          }
                        } catch {
                          // ignore
                        }

                        if (!pdfBuffer || pdfBuffer.length === 0) continue;

                        const classification = await classificeerProvinciaalDocument(
                          { title: docTitle, meetingTitle, documentId: docId },
                          pdfBuffer
                        );

                        const safeTitle = sanitizeFilename(docTitle);
                        const filename = `${itemDate}_${docId}_${safeTitle}.pdf`;
                        const localRelPath = `/uploads/documents/overijssel/${filename}`;
                        const localAbsPath = path.join(UPLOADS_DIR, filename);

                        if (classification.opslaan) {
                          fs.writeFileSync(localAbsPath, pdfBuffer);
                          try {
                            const distPath = path.join(DIST_UPLOADS_DIR, filename);
                            fs.writeFileSync(distPath, pdfBuffer);
                          } catch {
                            // ignore
                          }
                        }

                        const record: OverijsselDocumentMetadata = {
                          id: `ov-${docId}`,
                          document_id: docId,
                          version: 1,
                          meeting_id: String(item.entityId || ""),
                          datum: itemDate,
                          titel: docTitle,
                          meeting_titel: meetingTitle,
                          gremium_naam: "OpenRaadsinformatie Overijssel",
                          document_type: "Vergaderstuk",
                          filetype: "pdf",
                          scope: classification.scope,
                          filter_methode: classification.filter_methode,
                          reden: classification.reden,
                          opslaan: classification.opslaan,
                          bestandsnaam: classification.opslaan ? filename : "",
                          lokaal_pad: classification.opslaan ? localRelPath : "",
                          notubiz_url: downloadUrl,
                          grootte_bytes: pdfBuffer.length,
                          gesynchroniseerd_op: new Date().toISOString(),
                        };

                        existingDocMap.set(docKey, record);
                        syncState.scannedDocuments++;

                        if (classification.opslaan) {
                          syncState.savedDocuments++;
                          if (classification.scope === "Lokaal - Steenwijkerland") {
                            syncState.steenwijkerlandCount++;
                            addLog(`[BINGO STEENWIJKERLAND] ${docTitle} -> ${classification.reden}`, "success");
                          } else {
                            syncState.provinciebreedCount++;
                            addLog(`[PROVINCIEBREED BEHOUDEN] ${docTitle}`, "info");
                          }
                        } else {
                          syncState.excludedDocuments++;
                          syncState.externCount++;
                          addLog(`[EXTERN GENEGEERD] ${docTitle} -> ${classification.reden}`, "warn");
                        }

                        if (syncState.scannedDocuments % 5 === 0) {
                          saveOverijsselMetadata(Array.from(existingDocMap.values()));
                        }
                      }
                    }
                  }
                }
              }
            } catch {
              // ignore
            }
          }

          syncState.processedMeetings++;
        }

        if (!searchRes.hasMore) {
          addLog("OpenRaadsinformatie stelt geen verdere pagina's meer beschikbaar.", "info");
          break;
        }

        offset += searchRes.results.length;
      }

      // Final save
      saveOverijsselMetadata(Array.from(existingDocMap.values()));
      syncState.currentAction = "Voltooid!";
      syncState.completedAt = new Date().toISOString();
      addLog(`Synchronisatie via OpenRaadsinformatie (organization=overijssel, sort=date_desc) succesvol voltooid! Totaal ${syncState.savedDocuments} documenten opgeslagen. CSV bijgewerkt.`, "success");
    } catch (err: any) {
      if (signal.aborted) {
        syncState.currentAction = "Geannuleerd door gebruiker";
        addLog("Synchronisatie handmatig geannuleerd.", "warn");
      } else {
        syncState.error = err?.message || String(err);
        syncState.currentAction = "Fout opgetreden";
        addLog(`Fout tijdens synchronisatie: ${syncState.error}`, "error");
      }
    } finally {
      syncState.isRunning = false;
      abortController = null;
    }
  })();

  return syncState;
}

/**
 * Cancel running sync
 */
export function cancelOverijsselSync(): boolean {
  if (abortController && syncState.isRunning) {
    abortController.abort();
    syncState.isRunning = false;
    syncState.currentAction = "Annuleren...";
    addLog("Annulering aangevraagd...", "warn");
    return true;
  }
  return false;
}

/**
 * Get current sync progress
 */
export function getOverijsselSyncStatus(): OverijsselSyncProgress {
  return syncState;
}
