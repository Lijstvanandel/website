import fs from "fs";
import path from "path";
import https from "node:https";
import http from "node:http";
import dns from "node:dns";
import { spawn } from "node:child_process";
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

// Cache AI quota exhaustion status to avoid repetitive 429 API errors
let aiQuotaExhausted = false;

/**
 * 3-Tier document classifier:
 * 1. Blacklist check on titles (Zwolle, Enschede, etc.) -> Skip immediately (0ms)
 * 2. Whitelist check on titles/content (Steenwijkerland, etc.) -> Keep immediately (0ms)
 * 3. Text & AI analysis with automatic fallback if AI quota is exhausted or offline
 */
export async function classificeerProvinciaalDocument(
  notubizItem: {
    title: string;
    meetingTitle?: string;
    documentId?: string | number;
  },
  pdfBuffer: Buffer
): Promise<DocumentClassificationResult> {
  const contextTitel = `${notubizItem.meetingTitle || ""} ${notubizItem.title || ""}`.toLowerCase();

  // TRAP 1a: Zwarte lijst check (Gratis & snel)
  const matchedBlacklist = matchExternalKeywordsInText(contextTitel);
  if (matchedBlacklist && !matchLocalKeywordsInText(contextTitel)) {
    const msg = `Zwarte lijst: Externe gemeente '${matchedBlacklist}' in context`;
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
    return {
      scope: "Lokaal - Steenwijkerland",
      opslaan: true,
      filter_methode: "Witte lijst (Titel)",
      reden: msg,
    };
  }

  // TRAP 2: Tekstextractie van de eerste 2 pagina's
  const introTekst = await extractIntroTextFromPdfBuffer(pdfBuffer, 2);

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

    if (hasExternalInBody && !hasSteenwijkInBody) {
      // Externe gemeente prominent aanwezig in document
      return {
        scope: "Lokaal - Externe Gemeente",
        opslaan: false,
        filter_methode: "Zwarte lijst (Documenttekst)",
        reden: `Tekstuele match: Externe gemeente '${hasExternalInBody}' in documenttekst`,
      };
    }
  }

  // TRAP 3: AI Analyse (als API beschikbaar is en quota niet op is)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || aiQuotaExhausted || !introTekst || introTekst.length < 20) {
    // Directe snelle en veilige fallback zonder API vertraging
    return {
      scope: "Provinciebreed",
      opslaan: true,
      filter_methode: aiQuotaExhausted ? "Regelgebaseerde Fallback (AI Quota Vol)" : "Heuristische Provinciebrede Default",
      reden: "Generiek provinciaal document behouden voor provinciaal beleidsoverzicht",
    };
  }

  const prompt = `Je bent een data-classificeerder voor de lokale politieke partij 'Lijst van Andel' in Steenwijkerland.
Analyseer deze inleiding/samenvatting van een provinciaal document uit Overijssel:
Titel: "${notubizItem.title}"

Kies EXACT één van deze drie categorieën:
1. "Provinciebreed" (Verordeningen, algemeen provinciaal beleid, woondeals, provinciale begroting, natuurvisie voor de hele provincie)
2. "Steenwijkerland" (Gaat specifiek over Steenwijkerland, Weerribben, Kop van Overijssel of kernen/dorpen in die gemeente)
3. "Extern" (Gaat specifiek over andere gemeenten in Overijssel zoals Twente, Enschede, Zwolle, Kampen, Deventer, Almelo, etc.)

Retourneer uitsluitend JSON in dit exacte format: {"scope": "Provinciebreed" | "Steenwijkerland" | "Extern", "reden": "Korte toelichting"}

Documenttekst:
${introTekst.slice(0, 2500)}`;

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
    } catch (modelErr: any) {
      if (modelErr?.status === 429 || modelErr?.message?.includes("429") || modelErr?.message?.includes("credits are depleted")) {
        aiQuotaExhausted = true;
        throw modelErr;
      }
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

    if (aiOordeel.scope === "Extern") {
      return {
        scope: "Lokaal - Externe Gemeente",
        opslaan: false,
        filter_methode: "Gemini Flash AI",
        reden: aiOordeel.reden || "AI classificatie: extern",
      };
    }

    const finalScope = aiOordeel.scope === "Steenwijkerland" ? "Lokaal - Steenwijkerland" : "Provinciebreed";
    return {
      scope: finalScope,
      opslaan: true,
      filter_methode: "Gemini Flash AI",
      reden: aiOordeel.reden || "AI classificatie: relevant voor provincie/Steenwijkerland",
    };
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("credits are depleted")) {
      if (!aiQuotaExhausted) {
        console.warn("[AI NOTITIE] Gemini API quota bereikt/op. Overschakelen naar snelle autonome regelgebaseerde classificatie.");
        aiQuotaExhausted = true;
      }
    } else {
      console.warn(`[AI WAARSCHUWING] Fallback bij classificatie van '${notubizItem.title}':`, error?.message || error);
    }
    return {
      scope: "Provinciebreed",
      opslaan: true,
      filter_methode: "Regelgebaseerde Fallback",
      reden: "Provinciaal document veiligheidshalve behouden voor provinciaal overzicht",
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
        timeout: options.timeout || 30000,
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
 * Fallback via system curl -4 (bypasses any Node networking quirks on Linux VPS)
 */
function curlIPv4(urlStr: string, options: any = {}, timeoutMs = 30000): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    try {
      const timeoutSec = Math.max(5, Math.round(timeoutMs / 1000));
      const DELIM = "\n__NOTUBIZ_STATUS__:";
      const args = ["-4", "-s", "-L", "--max-time", String(timeoutSec), "-w", `${DELIM}%{http_code}`, urlStr];
      const proc = spawn("curl", args);
      const chunks: Buffer[] = [];

      if (options.signal) {
        options.signal.addEventListener(
          "abort",
          () => {
            try {
              proc.kill("SIGKILL");
            } catch {
              // ignore
            }
          },
          { once: true }
        );
      }

      proc.stdout.on("data", (c: Buffer) => chunks.push(c));
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (options.signal?.aborted) {
          return reject(new Error("This operation was aborted"));
        }
        const fullBuf = Buffer.concat(chunks);
        const delimBuf = Buffer.from(DELIM);
        const delimIdx = fullBuf.lastIndexOf(delimBuf);
        let status = 200;
        let bodyBuf = fullBuf;
        if (delimIdx !== -1) {
          const codeStr = fullBuf.slice(delimIdx + delimBuf.length).toString("utf-8").trim();
          const parsedCode = parseInt(codeStr, 10);
          if (!isNaN(parsedCode) && parsedCode > 0) {
            status = parsedCode;
          }
          bodyBuf = fullBuf.slice(0, delimIdx);
        }
        resolve({
          ok: status >= 200 && status < 300,
          status,
          statusText: `HTTP ${status}`,
          headers: {},
          buffer: () => Promise.resolve(bodyBuf),
          arrayBuffer: () => Promise.resolve(bodyBuf.buffer.slice(bodyBuf.byteOffset, bodyBuf.byteOffset + bodyBuf.byteLength)),
          text: () => Promise.resolve(bodyBuf.toString("utf-8")),
          json: () => {
            try {
              return Promise.resolve(JSON.parse(bodyBuf.toString("utf-8")));
            } catch (err) {
              return Promise.reject(err);
            }
          },
        });
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Robust JSON fetch with automatic retry, exponential backoff, IPv4 routing and curl fallback
 */
async function fetchJsonWithRetry<T = any>(url: string, options: any = {}, maxRetries = 4, timeoutMs = 35000): Promise<T> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // 1. Try native Node https with IPv4
    try {
      const res = await requestIPv4(url, { ...options, timeout: timeoutMs });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 0) {
          try {
            return JSON.parse(text) as T;
          } catch (parseErr: any) {
            console.warn(`[OVERIJSSEL JSON] Parse error on attempt ${attempt}: ${parseErr.message}`);
          }
        }
      }
    } catch (err: any) {
      lastError = err;
      if (options.signal?.aborted) throw err;
    }

    // 2. Try curl -4 fallback
    try {
      const curlRes = await curlIPv4(url, options, timeoutMs);
      if (curlRes.ok) {
        const text = await curlRes.text();
        if (text && text.trim().length > 0) {
          try {
            return JSON.parse(text) as T;
          } catch (parseErr: any) {
            console.warn(`[OVERIJSSEL CURL JSON] Parse error on attempt ${attempt}: ${parseErr.message}`);
          }
        }
      }
    } catch (curlErr: any) {
      lastError = curlErr;
      if (options.signal?.aborted) throw curlErr;
    }

    if (attempt < maxRetries) {
      await sleep(1200 * attempt);
    }
  }
  throw lastError || new Error(`Failed to fetch valid JSON from ${url} after ${maxRetries} attempts`);
}

/**
 * Robust binary/document fetch with automatic retry, exponential backoff, IPv4 routing and curl fallback
 */
async function fetchWithRetry(url: string, options: any = {}, maxRetries = 4, timeoutMs = 30000): Promise<HttpResponse> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 1. Try native Node https with IPv4 lookup
      const res = await requestIPv4(url, {
        ...options,
        timeout: timeoutMs,
      });

      if (res.ok || res.status === 404) {
        const buf = await res.buffer();
        if (buf.length > 0 || res.status === 404) {
          return res;
        }
      }

      if (res.status >= 500 && attempt < maxRetries) {
        await sleep(1500 * attempt);
        continue;
      }
    } catch (err: any) {
      lastError = err;
      if (options.signal?.aborted) {
        throw err;
      }
    }

    // 2. Try curl -4 fallback
    try {
      const curlRes = await curlIPv4(url, options, timeoutMs);
      if (curlRes.ok || curlRes.status === 404) {
        const buf = await curlRes.buffer();
        if (buf.length > 0 || curlRes.status === 404) {
          return curlRes;
        }
      }
    } catch (curlErr: any) {
      lastError = curlErr;
      if (options.signal?.aborted) {
        throw curlErr;
      }
    }

    if (attempt < maxRetries) {
      await sleep(1500 * attempt);
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

  const data = await fetchJsonWithRetry<any>(url.toString(), { signal }, 4, 45000);
  return data?.events || [];
}

/**
 * Fetch meeting details with agenda items and documents
 */
async function fetchMeetingDetails(meetingId: number | string, signal?: AbortSignal): Promise<any> {
  const url = `https://api.notubiz.nl/events/meetings/${meetingId}?format=json&version=1.17.0`;
  try {
    const data = await fetchJsonWithRetry<any>(url, { signal }, 3, 35000);
    return data?.meeting || null;
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
    const data = await fetchJsonWithRetry<any>(url, { signal }, 3, 45000);
    return data?.items || [];
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
 * Run full Overijssel NotuBiz sync from 2021 to current date
 */
export async function startOverijsselNotubizSync(options?: {
  years?: number[];
  forceRescan?: boolean;
}): Promise<OverijsselSyncProgress> {
  if (syncState.isRunning) {
    return syncState;
  }

  const targetYears = options?.years && options.years.length > 0 ? options.years : [2021, 2022, 2023, 2024, 2025, 2026];
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
    currentAction: "Initialiseren...",
    logs: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    error: null,
  };

  addLog(`Start synchronisatie Provincie Overijssel NotuBiz bestanden (${targetYears.join(", ")})...`, "info");

  (async () => {
    try {
      for (const year of targetYears) {
        if (signal.aborted) break;
        syncState.currentYear = year;
        syncState.currentAction = `Vergaderingen ophalen voor jaar ${year}...`;
        addLog(`Ophalen vergaderingen Provincie Overijssel voor jaar ${year}...`, "info");

        let events: any[] = [];
        try {
          events = await fetchOverijsselEventsForYear(year, signal);
        } catch (err: any) {
          addLog(`Fout bij ophalen jaar ${year}: ${err.message}`, "warn");
          continue;
        }

        const meetings = events.filter((e) => e.type === "meeting");
        syncState.totalMeetingsFound += meetings.length;
        addLog(`Jaar ${year}: ${meetings.length} vergaderingen gevonden (van ${events.length} events).`, "info");

        for (const ev of meetings) {
          if (signal.aborted) break;
          const meetingId = ev.id;
          const meetingDate = ev.plannings?.[0]?.start_date?.split(" ")[0] || `${year}-01-01`;
          const meetingTitle = ev.attributes?.find((a: any) => a.id === 1)?.value || ev.title || `Vergadering ${meetingId}`;
          const gremiumName = ev.gremium?.title || ev.category?.title || "Provinciale Staten";

          syncState.currentAction = `Analyseren vergadering ${meetingDate}: ${meetingTitle.slice(0, 40)}...`;

          let meetingDetail: any = null;
          try {
            meetingDetail = await fetchMeetingDetails(meetingId, signal);
          } catch (err: any) {
            console.warn(`[OVERIJSSEL] Could not fetch meeting ${meetingId}:`, err?.message);
          }

          if (!meetingDetail) {
            syncState.processedMeetings++;
            continue;
          }

          // Collect all documents from meeting level, agenda items, and module items
          const candidateDocs: Array<{
            documentId: string;
            version: string | number;
            title: string;
            type: string;
            url: string;
            filetype: string;
          }> = [];

          // 1. Direct meeting documents
          if (Array.isArray(meetingDetail.documents)) {
            for (const doc of meetingDetail.documents) {
              if (doc.url && (doc.filetype === "pdf" || doc.url.includes("document"))) {
                candidateDocs.push({
                  documentId: String(doc.id || doc["@attributes"]?.id || ""),
                  version: doc.version || doc["@attributes"]?.version || 1,
                  title: doc.title || "Document",
                  type: doc.type || "Document",
                  url: doc.url,
                  filetype: doc.filetype || "pdf",
                });
              }
            }
          }

          // 2. Agenda items documents (with recursive sub-items support)
          function extractAgendaDocs(items: any[]) {
            for (const item of items || []) {
              const itemTitle = item.attributes?.find((a: any) => a.id === 1)?.value || item.title || "";
              if (Array.isArray(item.documents)) {
                for (const doc of item.documents) {
                  candidateDocs.push({
                    documentId: String(doc.id || doc["@attributes"]?.id || ""),
                    version: doc.version || doc["@attributes"]?.version || 1,
                    title: doc.title || itemTitle || "Agendastuk",
                    type: doc.type || "Agendastuk",
                    url: doc.url,
                    filetype: doc.filetype || "pdf",
                  });
                }
              }
              // Sub items in module_items
              if (Array.isArray(item.module_items)) {
                for (const mod of item.module_items) {
                  if (Array.isArray(mod.documents)) {
                    for (const doc of mod.documents) {
                      candidateDocs.push({
                        documentId: String(doc.id || doc["@attributes"]?.id || ""),
                        version: doc.version || doc["@attributes"]?.version || 1,
                        title: doc.title || mod.title || itemTitle || "Statenvoorstel Bijlage",
                        type: doc.type || "Statenvoorstel",
                        url: doc.url,
                        filetype: doc.filetype || "pdf",
                      });
                    }
                  }
                }
              }
              if (Array.isArray(item.agenda_items) && item.agenda_items.length > 0) {
                extractAgendaDocs(item.agenda_items);
              }
            }
          }

          if (Array.isArray(meetingDetail.agenda_items)) {
            extractAgendaDocs(meetingDetail.agenda_items);
          }

          syncState.totalDocumentsFound += candidateDocs.length;

          // Process each candidate document
          for (const cand of candidateDocs) {
            if (signal.aborted) break;
            if (!cand.documentId) continue;

            const docKey = `${cand.documentId}_${cand.version}`;
            if (!options?.forceRescan && existingDocMap.has(docKey)) {
              syncState.scannedDocuments++;
              continue;
            }

            // Download PDF for analysis
            let pdfBuffer: Buffer | null = null;
            const canonicalUrl = getCanonicalNotubizDownloadUrl(cand.documentId, cand.version, cand.url);
            try {
              const docRes = await fetchWithRetry(canonicalUrl, { signal }, 3, 25000);
              if (docRes.ok) {
                const arr = await docRes.arrayBuffer();
                pdfBuffer = Buffer.from(arr);
              }
            } catch (err: any) {
              console.warn(`[OVERIJSSEL] Download failed for doc ${cand.documentId}:`, err?.message);
            }

            if (!pdfBuffer || pdfBuffer.length === 0) {
              continue;
            }

            // Run 3-tier classification
            const classification = await classificeerProvinciaalDocument(
              {
                title: cand.title,
                meetingTitle,
                documentId: cand.documentId,
              },
              pdfBuffer
            );

            const safeTitle = sanitizeFilename(cand.title || "document");
            const filename = `${meetingDate}_${cand.documentId}_${safeTitle}.pdf`;
            const localRelPath = `/uploads/documents/overijssel/${filename}`;
            const localAbsPath = path.join(UPLOADS_DIR, filename);

            if (classification.opslaan) {
              // Save locally on server
              fs.writeFileSync(localAbsPath, pdfBuffer);
              try {
                const distPath = path.join(DIST_UPLOADS_DIR, filename);
                fs.writeFileSync(distPath, pdfBuffer);
              } catch {
                // ignore
              }
            }

            const record: OverijsselDocumentMetadata = {
              id: `ov-${cand.documentId}`,
              document_id: cand.documentId,
              version: cand.version,
              meeting_id: String(meetingId),
              datum: meetingDate,
              titel: cand.title,
              meeting_titel: meetingTitle,
              gremium_naam: gremiumName,
              document_type: cand.type,
              filetype: cand.filetype,
              scope: classification.scope,
              filter_methode: classification.filter_methode,
              reden: classification.reden,
              opslaan: classification.opslaan,
              bestandsnaam: classification.opslaan ? filename : "",
              lokaal_pad: classification.opslaan ? localRelPath : "",
              notubiz_url: canonicalUrl,
              grootte_bytes: pdfBuffer.length,
              gesynchroniseerd_op: new Date().toISOString(),
            };

            existingDocMap.set(docKey, record);
            syncState.scannedDocuments++;

            if (classification.opslaan) {
              syncState.savedDocuments++;
              if (classification.scope === "Lokaal - Steenwijkerland") {
                syncState.steenwijkerlandCount++;
                addLog(`[BINGO STEENWIJKERLAND] ${cand.title} -> ${classification.reden}`, "success");
              } else {
                syncState.provinciebreedCount++;
                addLog(`[PROVINCIEBREED BEHOUDEN] ${cand.title}`, "info");
              }
            } else {
              syncState.excludedDocuments++;
              syncState.externCount++;
              addLog(`[EXTERN GENEGEERD] ${cand.title} -> ${classification.reden}`, "warn");
            }

            // Periodic flush to CSV and JSON every 5 scanned documents
            if (syncState.scannedDocuments % 5 === 0) {
              saveOverijsselMetadata(Array.from(existingDocMap.values()));
            }
          }

          syncState.processedMeetings++;
        }
      }

      // FASE 2: Synchroniseer NotuBiz Modules (Statenvoorstellen, Moties & Amendementen, Schriftelijke Vragen, etc.)
      const MODULE_DEFINITIONS = [
        { id: 19, name: "Statenvoorstellen" },
        { id: 6, name: "Moties en Amendementen" },
        { id: 4, name: "Schriftelijke vragen" },
        { id: 3, name: "Toezeggingen" },
      ];

      const minTargetYear = Math.min(...targetYears);

      for (const mod of MODULE_DEFINITIONS) {
        if (signal.aborted) break;
        syncState.currentAction = `NotuBiz Module ophalen: ${mod.name}...`;
        addLog(`Ophalen NotuBiz module '${mod.name}' (ID ${mod.id})...`, "info");

        let modItems: any[] = [];
        try {
          modItems = await fetchModuleItems(mod.id, signal);
        } catch (err: any) {
          addLog(`Fout bij ophalen module ${mod.name}: ${err?.message}`, "warn");
          continue;
        }

        addLog(`Module '${mod.name}': ${modItems.length} items gevonden. Filteren op periode >= ${minTargetYear}...`, "info");

        for (const item of modItems) {
          if (signal.aborted) break;
          const itemDateRaw = item.date || item.attributes?.find((a: any) => a.datatype === "datetime" || a.datatype === "date")?.value || "";
          const itemYear = parseInt((itemDateRaw || "").slice(0, 4), 10);

          if (itemYear && itemYear < minTargetYear) {
            continue; // Buiten het gewenste tijdsvenster
          }

          const itemTitle = item.title || item.attributes?.find((a: any) => a.id === 1)?.value || `${mod.name} ${item.id}`;
          const itemDate = itemDateRaw.split(" ")[0] || `${minTargetYear}-01-01`;

          const rawDocs = item.attachments?.document || item.documents || [];
          const docList: any[] = Array.isArray(rawDocs) ? [...rawDocs] : rawDocs ? [rawDocs] : [];

          // Extract documents from all attributes (e.g. Hoofddocument, Bijlagen)
          for (const attr of item.attributes || []) {
            if (attr.datatype === "document" || attr.datatype === "document_list" || attr.datatype === "attachment") {
              for (const val of attr.values || []) {
                if (val?.document) {
                  docList.push(val.document);
                }
              }
            }
          }

          for (const d of docList) {
            if (signal.aborted) break;
            const docId = String(d.id || d["@attributes"]?.id || "");
            const docVersion = d.version || d["@attributes"]?.version || 1;
            if (!docId) continue;

            const docKey = `${docId}_${docVersion}`;
            if (!options?.forceRescan && existingDocMap.has(docKey)) {
              syncState.scannedDocuments++;
              continue;
            }

            const docTitle = d.title || itemTitle;
            const canonicalUrl = getCanonicalNotubizDownloadUrl(docId, docVersion, d.url || d.self);

            syncState.currentAction = `Analyseren ${mod.name}: ${docTitle.slice(0, 35)}...`;

            let pdfBuffer: Buffer | null = null;
            try {
              const docRes = await fetchWithRetry(canonicalUrl, { signal }, 3, 25000);
              if (docRes.ok) {
                const arr = await docRes.arrayBuffer();
                pdfBuffer = Buffer.from(arr);
              }
            } catch (err: any) {
              console.warn(`[OVERIJSSEL] Download failed for module doc ${docId}:`, err?.message);
            }

            if (!pdfBuffer || pdfBuffer.length === 0) continue;

            const classification = await classificeerProvinciaalDocument(
              {
                title: docTitle,
                meetingTitle: `${mod.name} - ${itemTitle}`,
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
              version: docVersion,
              meeting_id: String(item.id || ""),
              datum: itemDate,
              titel: docTitle,
              meeting_titel: `${mod.name}: ${itemTitle}`,
              gremium_naam: "Provinciale Staten",
              document_type: mod.name,
              filetype: "pdf",
              scope: classification.scope,
              filter_methode: classification.filter_methode,
              reden: classification.reden,
              opslaan: classification.opslaan,
              bestandsnaam: classification.opslaan ? filename : "",
              lokaal_pad: classification.opslaan ? localRelPath : "",
              notubiz_url: canonicalUrl,
              grootte_bytes: pdfBuffer.length,
              gesynchroniseerd_op: new Date().toISOString(),
            };

            existingDocMap.set(docKey, record);
            syncState.scannedDocuments++;

            if (classification.opslaan) {
              syncState.savedDocuments++;
              if (classification.scope === "Lokaal - Steenwijkerland") {
                syncState.steenwijkerlandCount++;
                addLog(`[BINGO STEENWIJKERLAND] [${mod.name}] ${docTitle} -> ${classification.reden}`, "success");
              } else {
                syncState.provinciebreedCount++;
                addLog(`[PROVINCIEBREED BEHOUDEN] [${mod.name}] ${docTitle}`, "info");
              }
            } else {
              syncState.excludedDocuments++;
              syncState.externCount++;
              addLog(`[EXTERN GENEGEERD] [${mod.name}] ${docTitle} -> ${classification.reden}`, "warn");
            }

            if (syncState.scannedDocuments % 5 === 0) {
              saveOverijsselMetadata(Array.from(existingDocMap.values()));
            }
          }
        }
      }

      // Final save
      saveOverijsselMetadata(Array.from(existingDocMap.values()));
      syncState.currentAction = "Voltooid!";
      syncState.completedAt = new Date().toISOString();
      addLog(`Synchronisatie Provincie Overijssel succesvol voltooid! Totaal ${syncState.savedDocuments} documenten opgeslagen. CSV bijgewerkt.`, "success");
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
