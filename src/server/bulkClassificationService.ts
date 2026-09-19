import fs from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { extractTextFromFile } from "./documentTextExtractor.js";
import { getRawMetadata, rebuildNetworkGraph, saveMasterMetadata, invalidateDossierCache } from "./dossierManager.js";
import { RaadsstukMetadata } from "../types/dossier.js";
import {
  CANONICAL_HOOFDDOSSIERS,
  normalizeHoofddossier,
  normalizeSubdossier,
  detectWijkenKernen,
  cleanPublicTitle,
  normalizeRecord,
  validateRecordConformity,
  isDocumentFullyClassified,
  BANNED_GENERIC_WIJKEN
} from "./taxonomyClassifier.js";

const ROOT_DOCS_DIR = path.join(process.cwd(), "public", "uploads", "documents");

// The 7 official recipient-oriented dossier categories
export const OFFICIAL_DOSSIERS = [...CANONICAL_HOOFDDOSSIERS];

// Gemini model configuration & strict Free Tier rate limit constants
export const CLASSIFIER_MODEL = "gemini-2.5-flash";
export const FREE_TIER_RPM_LIMIT = 10; // Hard max 10 Requests Per Minute (Google Free Tier)
export const EFFECTIVE_RPM_LIMIT = 8;  // Safe 8 RPM target (~25% safety margin against sliding-window/burst edge cases)
export const FREE_TIER_RPD_LIMIT = 250; // Max 250 Requests Per Day
export const RATE_LIMIT_DELAY_MS = 7500; // 7.5s nominal interval + jitter = ~7.5-8 requests per minute

export function isPayAsYouGoMode(): boolean {
  const val = (process.env.GEMINI_PAY_AS_YOU_GO || process.env.PAY_AS_YOU_GO || "true").trim().toLowerCase();
  return val !== "false" && val !== "0" && val !== "no";
}

export function getEffectiveRpdLimit(): number {
  return isPayAsYouGoMode() ? 100000 : FREE_TIER_RPD_LIMIT;
}

export function getEffectiveRpmLimit(): number {
  return isPayAsYouGoMode() ? 60 : EFFECTIVE_RPM_LIMIT;
}

export function getRateLimitDelayMs(): number {
  return isPayAsYouGoMode() ? 1000 : RATE_LIMIT_DELAY_MS;
}

const QUOTA_TRACKER_PATH = path.join(process.cwd(), "public", "data", "gemini_quota_tracker.json");
const DLQ_LOG_PATH = path.join(process.cwd(), "public", "data", "gemini_dead_letter_queue.jsonl");
const EXECUTION_LOG_PATH = path.join(process.cwd(), "public", "data", "last_restructuring_execution.log");

export function addLogLine(msg: string): void {
  activeProgress.logs.push(msg);
  if (activeProgress.logs.length > 1000) {
    activeProgress.logs.shift();
  }
  try {
    const timestamp = new Date().toISOString().slice(11, 19);
    fs.mkdirSync(path.dirname(EXECUTION_LOG_PATH), { recursive: true });
    fs.appendFileSync(EXECUTION_LOG_PATH, `[${timestamp}] ${msg}\n`, "utf-8");
  } catch (_e) {
    // ignore log write errors
  }
}

// Lazy Gemini client
let geminiClient: GoogleGenAI | null = null;
let isGeminiQuotaExhausted = false;
let geminiQuotaExhaustedMessage = "";

// Sliding window timestamps for rate limiter (last 60s)
const requestTimestamps: number[] = [];
let lastRequestTime = 0;

export interface QuotaTrackerState {
  date: string; // YYYY-MM-DD
  requestsToday: number;
  dailyLimit: number;
  rpmLimit: number;
  model: string;
  lastRequestTime?: string;
}

// In-Memory Quota State Cache (Fix 1: Eliminates race conditions & file read contention)
let inMemoryQuotaTracker: QuotaTrackerState | null = null;

/**
 * Laadt en initialiseert de dagelijkse quotumtracker met in-memory caching.
 * Voorkomt gelijktijdige fs.readFileSync operaties en race conditions (Fix 1).
 */
function loadQuotaTracker(): QuotaTrackerState {
  const today = new Date().toISOString().split("T")[0];

  if (inMemoryQuotaTracker && inMemoryQuotaTracker.date === today) {
    return inMemoryQuotaTracker;
  }

  try {
    if (fs.existsSync(QUOTA_TRACKER_PATH)) {
      const raw = fs.readFileSync(QUOTA_TRACKER_PATH, "utf-8").trim();
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.date === today) {
          inMemoryQuotaTracker = {
            date: today,
            requestsToday: Number(data.requestsToday) || 0,
            dailyLimit: getEffectiveRpdLimit(),
            rpmLimit: getEffectiveRpmLimit(),
            model: CLASSIFIER_MODEL,
            lastRequestTime: data.lastRequestTime
          };
          return inMemoryQuotaTracker;
        }
      }
    }
  } catch (err) {
    console.warn("[QUOTA TRACKER] Kon quotumbestand niet lezen, initialiseert nieuw:", err);
  }

  inMemoryQuotaTracker = {
    date: today,
    requestsToday: 0,
    dailyLimit: getEffectiveRpdLimit(),
    rpmLimit: getEffectiveRpmLimit(),
    model: CLASSIFIER_MODEL,
  };
  saveQuotaTracker(inMemoryQuotaTracker);
  return inMemoryQuotaTracker;
}

/**
 * Atomaire bestandsoverschrijving (Fix 1):
 * Schrijft eerst naar een uniek .tmp bestand en gebruikt daarna fs.renameSync.
 * Hierdoor kan een parallel proces of crash nóóit een half-geschreven JSON-bestand achterlaten.
 */
function saveQuotaTracker(state: QuotaTrackerState): void {
  inMemoryQuotaTracker = state;
  try {
    const dir = path.dirname(QUOTA_TRACKER_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${QUOTA_TRACKER_PATH}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), "utf-8");
    fs.renameSync(tempPath, QUOTA_TRACKER_PATH);
  } catch (err) {
    console.warn("[QUOTA TRACKER] Kon quotumbestand niet atomair opslaan:", err);
  }
}

/**
 * Registreert veilig en atomair één API-aanvraag in-memory en op schijf.
 */
function incrementDailyQuotaUsage(): QuotaTrackerState {
  const tracker = loadQuotaTracker();
  tracker.requestsToday += 1;
  tracker.lastRequestTime = new Date().toISOString();
  saveQuotaTracker(tracker);
  return tracker;
}

export function getDailyQuotaUsage(): {
  requestsToday: number;
  dailyLimit: number;
  remainingToday: number;
  rpmLimit: number;
  model: string;
} {
  const tracker = loadQuotaTracker();
  return {
    requestsToday: tracker.requestsToday,
    dailyLimit: tracker.dailyLimit,
    remainingToday: Math.max(0, tracker.dailyLimit - tracker.requestsToday),
    rpmLimit: tracker.rpmLimit,
    model: tracker.model
  };
}

export class GeminiQuotaExceededError extends Error {
  retryAfterSeconds: number;
  isPrepaymentDepleted: boolean;
  constructor(message: string, retryAfterSeconds = 60, isPrepaymentDepleted = false) {
    super(message);
    this.name = "GeminiQuotaExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
    this.isPrepaymentDepleted = isPrepaymentDepleted;
  }
}

export class GeminiDailyQuotaExceededError extends Error {
  requestsToday: number;
  dailyLimit: number;
  constructor(requestsToday: number, dailyLimit: number) {
    super(`Dagelijkse limiet van ${dailyLimit} verzoeken voor ${CLASSIFIER_MODEL} bereikt (${requestsToday}/${dailyLimit}). Het quotum reset om 00:00 UTC.`);
    this.name = "GeminiDailyQuotaExceededError";
    this.requestsToday = requestsToday;
    this.dailyLimit = dailyLimit;
  }
}

/**
 * Sliding-window rate limiter met jitter en sliding window check (Fix 3).
 * Houdt een veilige marge aan van ~8 RPM (ipv 10 RPM) met willekeurige 0-350ms jitter om
 * window grenzen en burst quotas van Gemini 2.5 Flash te ontzien.
 */
async function waitForRateLimitSlot(): Promise<void> {
  const now = Date.now();
  const baseDelay = getRateLimitDelayMs();
  const rpmLimit = getEffectiveRpmLimit();

  // 1. Minimaal interval sinds vorig verzoek
  const jitter = isPayAsYouGoMode() ? Math.floor(Math.random() * 100) : Math.floor(Math.random() * 350);
  const targetDelay = baseDelay + jitter;
  const elapsedSinceLast = now - lastRequestTime;
  if (elapsedSinceLast < targetDelay) {
    const sleepNeeded = targetDelay - elapsedSinceLast;
    await new Promise((r) => setTimeout(r, sleepNeeded));
  }

  // 2. Sliding window voor maximaal rpmLimit requests per 60 seconden
  const windowSpan = 60000;
  const currentNow = Date.now();
  const windowStart = currentNow - windowSpan;
  
  // Verwijder verzoeken ouder dan 60 seconden
  while (requestTimestamps.length > 0 && requestTimestamps[0] < windowStart) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= rpmLimit) {
    const oldest = requestTimestamps[0];
    const waitTime = Math.max(200, oldest + windowSpan + 500 + Math.floor(Math.random() * 400) - currentNow);
    await new Promise((r) => setTimeout(r, waitTime));
    
    // Na wachten venster opnieuw opschonen
    const afterWaitNow = Date.now();
    while (requestTimestamps.length > 0 && requestTimestamps[0] < (afterWaitNow - windowSpan)) {
      requestTimestamps.shift();
    }
  }

  const execTime = Date.now();
  requestTimestamps.push(execTime);
  lastRequestTime = execTime;
}

/**
 * Reset de rate limit window na een lange 429 pauze om schone hervatting te waarborgen.
 */
export function resetRateLimitWindow(): void {
  requestTimestamps.length = 0;
  lastRequestTime = Date.now();
}

/**
 * Privacy & AVG Sanitizer:
 * Aangezien in het gratis abonnement van Gemini de prompts gebruikt mogen worden voor modeltraining,
 * worden alle privacygevoelige data (zoals BSN, IBAN, persoonsadressen, e-mails en telefoonnummers)
 * strikt gemaskeerd vóór verzending naar de Google Gemini API.
 */
export function sanitizeTextForGemini(text: string): { sanitizedText: string; anonymizedCount: number } {
  if (!text) return { sanitizedText: "", anonymizedCount: 0 };
  let sanitized = text;
  let anonymizedCount = 0;

  // 1. Burgerservicenummers (BSN)
  const bsnRegex = /\b(?:BSN|burgerservicenummer|bsn-nr|sofinummer)[\s:]*([0-9]{8,9})\b/gi;
  sanitized = sanitized.replace(bsnRegex, () => {
    anonymizedCount++;
    return "BSN: [BSN_GEANONIMISEERD]";
  });

  // Losse 9-cijferige nummers in persoonscontext
  const generalBsnRegex = /\b(?!20\d{2})([0-9]{9})\b/g;
  sanitized = sanitized.replace(generalBsnRegex, (match) => {
    anonymizedCount++;
    return "[PERSOONSNUMMER_GEANONIMISEERD]";
  });

  // 2. IBAN Bankrekeningen (NL / EU)
  const ibanRegex = /\b[A-Z]{2}[0-9]{2}[A-Z]{4}[0-9]{10}\b|\b[A-Z]{2}[0-9]{2}\s?[0-9]{4}\s?[0-9]{4}\s?[0-9]{2,4}\b/gi;
  sanitized = sanitized.replace(ibanRegex, () => {
    anonymizedCount++;
    return "[IBAN_GEANONIMISEERD]";
  });

  // 3. E-mailadressen
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  sanitized = sanitized.replace(emailRegex, () => {
    anonymizedCount++;
    return "[EMAIL_GEANONIMISEERD]";
  });

  // 4. Telefoonnummers (NL mobiel 06 en vaste netnummers, met of zonder landcode; sluit data zoals 03-02-2015 uit)
  const phoneRegex = /(?:\+31\s?\(0\)\s?|\+31\s?|0031\s?)[1-9](?:[0-9\s-]{7,10})\b|\b06[-\s]?[0-9]{8}\b|\b0[1-9][0-9]{1,2}[-\s]?[0-9]{6,7}\b/g;
  sanitized = sanitized.replace(phoneRegex, () => {
    anonymizedCount++;
    return "[TELEFOON_GEANONIMISEERD]";
  });

  // 5. Burger- en persoonsnamen met aanspreektitel (bijv. "Dhr. J. Jansen", "Mevr. De Vries-Bakker")
  const salutationRegex = /\b(?:Dhr\.|Mevr\.|De heer|Mevrouw)\s+([A-Z][a-zA-Zà-ÿ.-]+(?:\s+(?:van|der|de|den|ten|ter|te|van\s+de|van\s+der))?\s+[A-Z][a-zA-Zà-ÿ-]+)/g;
  sanitized = sanitized.replace(salutationRegex, () => {
    anonymizedCount++;
    return "[PERSOONSNAAM_GEANONIMISEERD]";
  });

  // 6. Straatnamen met Huisnummer (bijv. "Vendelweg 1", "Kerkstraat 14a", "Markt 5 B")
  const streetCompoundRegex = /\b([A-Z][a-zà-ÿ]*(?:straat|weg|laan|kade|gracht|steeg|plein|dijk|singel|pad|hof|park|ring|dreef|plantsoen|zoom|akker|veld|hoek|haven|wal|drift|brink|kamp|weide|passage|steegje|dijkje))\s+([0-9]+[a-zA-Z0-9\-_/]*)\b/gi;
  sanitized = sanitized.replace(streetCompoundRegex, () => {
    anonymizedCount++;
    return "[ADRES_GEANONIMISEERD]";
  });

  const streetMultiWordRegex = /\b([A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ]+)*\s+(?:straat|weg|laan|kade|gracht|steeg|plein|dijk|singel|pad|hof|park|ring|dreef|plantsoen|zoom|akker|veld|hoek|haven|wal|drift|brink|kamp|weide))\s+([0-9]+[a-zA-Z0-9\-_/]*)\b/gi;
  sanitized = sanitized.replace(streetMultiWordRegex, () => {
    anonymizedCount++;
    return "[ADRES_GEANONIMISEERD]";
  });

  // 7. Postcode + Huisnummer van particulieren (bijv. 8331 AA 12 of 8332 BC 45a)
  const addressRegex = /\b([1-9][0-9]{3}\s?[A-Za-z]{2})\s+([0-9]+[a-zA-Z0-9\-_/]*)\b/g;
  sanitized = sanitized.replace(addressRegex, () => {
    anonymizedCount++;
    return "[POSTCODE_GEANONIMISEERD] [HUISNUMMER_GEANONIMISEERD]";
  });

  // 8. Postcode + Woonplaats (bijv. 8331 XE Steenwijk, 8332 AB Steenwijkerwold)
  const pcTownRegex = /\b([1-9][0-9]{3}\s?[A-Za-z]{2})\s+([A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ]+)?)\b/g;
  sanitized = sanitized.replace(pcTownRegex, (_m, _pc, town) => {
    anonymizedCount++;
    return `[POSTCODE_GEANONIMISEERD] ${town}`;
  });

  // 9. Alle overige losse Nederlandse postcodes (bijv. "8331 XE", "1234AB")
  const pcStandaloneRegex = /\b[1-9][0-9]{3}\s?[A-Za-z]{2}\b/g;
  sanitized = sanitized.replace(pcStandaloneRegex, () => {
    anonymizedCount++;
    return "[POSTCODE_GEANONIMISEERD]";
  });

  // 10. Geboortedata
  const dobRegex = /\b(?:geboren(?:\s+op)?|geboortedatum)[\s:]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4})\b/gi;
  sanitized = sanitized.replace(dobRegex, () => {
    anonymizedCount++;
    return "geboortedatum: [GEBOORTEDATUM_GEANONIMISEERD]";
  });

  // 11. Vertrouwelijkheids- en geheimhoudingsmarkeringen
  sanitized = sanitized.replace(/\b(?:STRIKT\s+)?(?:VERTROUWELIJK|GEHEIM|CONFIDENTIEEL|NIET\s+OPENBAAR|PERSOONLIJKE\s+GEGEVENS)\b/gi, () => {
    anonymizedCount++;
    return "[VERTROUWELIJK_GEMASKEERD]";
  });

  return { sanitizedText: sanitized, anonymizedCount };
}

export function getGeminiQuotaStatus(): { exhausted: boolean; message: string } {
  return {
    exhausted: isGeminiQuotaExhausted,
    message: geminiQuotaExhaustedMessage
  };
}

export function resetGeminiQuotaStatus(): void {
  isGeminiQuotaExhausted = false;
  geminiQuotaExhaustedMessage = "";
}

function getGemini(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    try {
      dotenv.config({ override: true });
    } catch (_e) {
      // ignore
    }
  }
  if (process.env.GEMINI_API_KEY) {
    if (!geminiClient) {
      geminiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return geminiClient;
  }
  return null;
}

/**
 * Asynchrone, non-blocking scan van PDF-bestanden met chunking om de Event Loop niet te blokkeren.
 */
export async function scanPdfFilesAsync(): Promise<Array<{ absolutePath: string; relativePath: string; filename: string }>> {
  const filesList: Array<{ absolutePath: string; relativePath: string; filename: string }> = [];

  async function traverse(dir: string) {
    try {
      const exists = await fs.promises.access(dir).then(() => true).catch(() => false);
      if (!exists) return;

      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
          const relative = path.relative(ROOT_DOCS_DIR, fullPath);
          filesList.push({
            absolutePath: fullPath,
            relativePath: relative,
            filename: entry.name
          });
        }
      }
    } catch (err) {
      console.warn(`[SCAN ASYNC] Could not scan directory ${dir}:`, err);
    }
  }

  await traverse(ROOT_DOCS_DIR);
  return filesList;
}

export function scanPdfFiles(): Array<{ absolutePath: string; relativePath: string; filename: string }> {
  const filesList: Array<{ absolutePath: string; relativePath: string; filename: string }> = [];
  function traverse(dir: string) {
    if (!fs.existsSync(dir)) return;
    const list = fs.readdirSync(dir);
    for (const item of list) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile() && item.toLowerCase().endsWith(".pdf")) {
        const relative = path.relative(ROOT_DOCS_DIR, fullPath);
        filesList.push({
          absolutePath: fullPath,
          relativePath: relative,
          filename: item
        });
      }
    }
  }
  traverse(ROOT_DOCS_DIR);
  return filesList;
}

/**
 * Kop-Staart extractie: Behoudt inleiding & context (eerste 8.000 karakters)
 * en juridische dictums/besluitvorming/datums aan het einde (laatste 4.000 karakters).
 */
export function extractHeadTailText(text: string, headChars = 8000, tailChars = 4000): string {
  if (!text) return "";
  if (text.length <= headChars + tailChars) {
    return text;
  }
  const head = text.substring(0, headChars);
  const tail = text.substring(text.length - tailChars);
  return `${head}\n\n[... JURIDISCHE KERN, DICTUM & BESLUITVORMING IN STAART ...]\n\n${tail}`;
}

export interface DeadLetterItem {
  filename: string;
  relativePath: string;
  error: string;
  timestamp: string;
}

// Fix 2: Bounded in-memory queue + append-only JSONL persistence to eliminate memory leaks.
// Maximale in-memory buffer van 250 items voorkomt heap bloat bij 10.000+ historische bestanden.
const MAX_IN_MEMORY_DLQ = 250;
const deadLetterQueue: DeadLetterItem[] = [];
let totalDeadLetterCount = 0;

function initDlqState(): void {
  try {
    if (fs.existsSync(DLQ_LOG_PATH)) {
      const content = fs.readFileSync(DLQ_LOG_PATH, "utf-8").trim();
      if (content) {
        const lines = content.split("\n").filter(Boolean);
        totalDeadLetterCount = lines.length;
        const tail = lines.slice(-MAX_IN_MEMORY_DLQ);
        deadLetterQueue.length = 0;
        for (const line of tail) {
          try {
            deadLetterQueue.push(JSON.parse(line));
          } catch {
            // negeer ongeldige regel
          }
        }
      }
    }
  } catch (err) {
    console.warn("[DLQ INIT] Kon DLQ bestand niet initialiseren:", err);
  }
}
initDlqState();

export function getDeadLetterQueue(): DeadLetterItem[] {
  return [...deadLetterQueue];
}

export function getTotalDeadLetterCount(): number {
  return totalDeadLetterCount;
}

export function clearDeadLetterQueue(): void {
  deadLetterQueue.length = 0;
  totalDeadLetterCount = 0;
  try {
    const dir = path.dirname(DLQ_LOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DLQ_LOG_PATH, "", "utf-8");
  } catch (err) {
    console.warn("[DLQ CLEAR] Kon DLQ bestand niet leegmaken:", err);
  }
}

/**
 * Registreert een mislukt bestand in de Dead Letter Queue:
 * 1. Bounded FIFO in-memory array (max 250 items, voorkomt heap bloat)
 * 2. Append-only persistente streaming naar schijf (geen dataverlies bij tienduizenden fouten)
 */
export function recordDeadLetter(item: DeadLetterItem): void {
  totalDeadLetterCount++;

  deadLetterQueue.push(item);
  if (deadLetterQueue.length > MAX_IN_MEMORY_DLQ) {
    deadLetterQueue.shift(); // Verwijder oudste item uit RAM
  }

  try {
    const dir = path.dirname(DLQ_LOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(DLQ_LOG_PATH, JSON.stringify(item) + "\n", "utf-8");
  } catch (err) {
    console.warn("[DLQ APPEND] Kon DLQ fout niet wegschrijven:", err);
  }
}

/**
 * Strikte fallback voor als Gemini offline is:
 * Plaatst het item transparant in de Dead Letter Queue en geeft GEEN verzonnen categorisering.
 */
export function runFallbackClassification(
  text: string,
  filename: string,
  relativePath = "",
  failureReason = "API niet beschikbaar"
): Partial<RaadsstukMetadata> {
  const cleanTitle = cleanPublicTitle(filename);
  const detectedWijken = detectWijkenKernen(cleanTitle, "", text);

  // Registreer via gecontroleerde bounded/persistent DLQ (Fix 2)
  recordDeadLetter({
    filename,
    relativePath,
    error: failureReason,
    timestamp: new Date().toISOString()
  });

  return {
    titel: cleanTitle,
    dossier: "ONGECLASSIFICEERD_FALEN",
    subdossier: "Audit & Retry Vereist (DLQ)",
    datum: new Date().toISOString().split("T")[0],
    wijk_of_kern: detectedWijken.join(", "),
    entiteiten: "",
    relaties: "",
    skos_tags: ["DLQ_Audit_Vereist"]
  };
}

/**
 * Classify a document using Gemini (model: gemini-2.5-flash) with:
 * 1. Privacy Sanitizing (stripping BSN, IBAN, contact data to prevent sending sensitive data to Google)
 * 2. Sliding window rate limiting (<= 10 RPM, min 6.2s interval)
 * 3. Daily quota tracking (<= 250 RPD in Free Tier)
 * 4. Automatic 429 RESOURCE_EXHAUSTED backoff and retry handling
 */
async function classifyWithGemini(
  text: string,
  filename: string,
  relativePath: string
): Promise<{ meta: Partial<RaadsstukMetadata>; rawResponseText: string }> {
  const ai = getGemini();
  if (!ai) {
    throw new Error("Gemini client is not initialized.");
  }

  // 1. Check daily quota
  const quota = loadQuotaTracker();
  const rpdLimit = getEffectiveRpdLimit();
  if (quota.requestsToday >= rpdLimit) {
    throw new GeminiDailyQuotaExceededError(quota.requestsToday, rpdLimit);
  }

  // 2. Privacy & AVG sanitization: geanonimiseerde tekst vóór prompt-samenstelling
  const { sanitizedText, anonymizedCount } = sanitizeTextForGemini(text);
  if (anonymizedCount > 0) {
    console.log(`[PRIVACY SANITIZER] ${anonymizedCount} persoons/privacy-elementen gemaskeerd in "${filename}" vóór verzending naar Gemini.`);
  }

  // Kop-staart RAG extractie (8.000 inleiding + 4.000 besluit/dictum) van de gesaneerde tekst
  const textSample = extractHeadTailText(sanitizedText, 8000, 4000);

  const prompt = `
  Analyseer het bestuursrechtelijke document (gemeenteraad, provincie of waterschap) van de gemeente Steenwijkerland.
  Classificeer de inhoudelijke beleidsopgave strikt volgens de 7 canonieke hoofddossiers en de harde verbodsbepalingen.

  Bestandsnaam: ${filename}
  Relatief pad: ${relativePath}

  === HARDE REGELS & NEGATIEVE VERBODSBEPALINGEN (ZEER BELANGRIJK) ===
  1. VERBOD OP AFZENDER/ACTOR ALS CATEGORIE:
     Het is TEN STRENGSTE VERBODEN om de afzender of instantie (zoals "WDODelta", "Waterschap Drents Overijsselse Delta", "Provincie Overijssel", "Provinciale Staten", "COA", "Enexis", "GGD IJsselland", "Veiligheidsregio IJsselland", "Raadszaken") te gebruiken als hoofddossier of subdossier!
     - Deze instanties horen UITSLUITEND in de komma-gescheiden string "entiteiten".
     - Classificeer de BESTUURSRECHTELIJKE IMPACT en de INHOUDELIJKE OPGAVE van het document.

  2. FRICTIELIJNEN & LOKALE CONTEXT (STEENWIJKERLAND):
     - TAM-omgevingsplannen en bestemmingsplannen in dorpskernen (bijv. Zuidveen, De Pol, Willemsoord, Blokzijl, Spoorzone Steenwijk) gaan ALTIJD naar "Ruimtelijke Ordening, Wonen & Omgevingswet".
     - Peilbesluiten, waterpeil, OGOR, veenoxidatie en bodemdaling (ook van WDODelta) gaan ALTIJD naar "Landbouw, Natuur & Waterbeheer".
     - Smart Energy Hub Groot Verlaat, netcongestie, zonneparken, bedrijventerreinen, toerismeregulering Giethoorn en UNESCO Weldaad gaan ALTIJD naar "Lokale Economie, Toerisme & Energie-infrastructuur".
     - Provinciale N-wegen (N761, N334, N762, N333), bruggen (Ronduitebrug, Meenthebrug, Scheerbrug), pontje Jonen en fietspaden gaan ALTIJD naar "Verkeer, Wegen & Fysieke Bereikbaarheid".
     - Hulp bij het Huishouden (Van Rijngelden), Mantelzorgers, Wmo, Jeugdzorg (RSJ), publieke gezondheid (GGD), asielopvang (COA/Spreidingswet) en armoedebeleid gaan ALTIJD naar "Sociaal Domein, Asiel & Leefbaarheid".
     - Gaswinning (Vermilion, Eesveen) en seismische monitoring gaan ALTIJD naar "Mijnbouw & Ondergrondse Opgaven".
     - Algemene Planning & Control (Programmabegroting, Jaarrekening, OZB, Kadernota), APV, politie/brandweer (VRIJ), algemene raadsreglementen en zuivere procedurele voorstellen gaan naar "Bestuur, Financiën & Juridische Zaken". LET OP: een raadsvoorstel over een specifiek beleidsonderwerp (zoals huishoudelijke hulp/Wmo, bestemmingsplan, provinciale weg, brug of waterpeil) hoort ALTIJD bij het inhoudelijke beleidsdomein, NOOIT bij Bestuur/Financiën!

  === DE 7 CANONIEKE HOOFDDOSSIERS EN HUN VASTE CANONIEKE SUBDOSSIERS ===
  (Kies voor 'dossier' exact één van de 7 hoofddossiers, en kies voor 'subdossier' UITSLUITEND één van de bijbehorende canonieke subdossiers! Bedenk NOOIT eigen subdossiers!)

  1. "Ruimtelijke Ordening, Wonen & Omgevingswet"
     Toegestane subdossiers:
     - "Bestemmingsplannen & Omgevingsvisie"
     - "Woningbouw & Inbreiding"
     - "Sociale Volkshuisvesting & Woningcorporaties"
     - "Beeldkwaliteit & Welstandstoezicht"
     - "Planschade & Ruimtelijke Jurisprudentie"

  2. "Landbouw, Natuur & Waterbeheer"
     Toegestane subdossiers:
     - "Waterpeilbeheer & Peilbesluiten"
     - "Veenoxidatie & Bodemdaling"
     - "Stikstof, KDW & AERIUS"
     - "Natura 2000 & Inpassingsplannen"
     - "Agrarische Transitie & Pacht"
     - "Exotenbestrijding & Waterkwaliteit"
     - "Milieu, Bodem & Emissies"

  3. "Lokale Economie, Toerisme & Energie-infrastructuur"
     Toegestane subdossiers:
     - "Toerisme Overlast & Regulering" (ALLE stukken over toerisme, vaarverordening, dorpsgracht Giethoorn, rondvaart, punters, recreatie, havenbeheer, bezoekersoverlast gaan HIERNAAR TOE)
     - "Netcongestie & Energie-infrastructuur" (zonneparken, windenergie, Smart Energy Hub, transformatorstations)
     - "Bedrijventerreinen & Werkgelegenheid" (Eeserwold, Groot Verlaat, Dolderkanaal)
     - "Cultuur, Erfgoed & UNESCO Bufferzone" (musea, Museum Olde Maat Uus, Koloniën van Weldadigheid, beeldende kunst, monumenten)
     - "Sportaccommodaties & Zwembaden" (sportverenigingen, De Waterwyck, veldverlichting, sportevenementen en subsidies)
     - "Podiumkunsten & Bibliotheken" (De Meenthe, Scala, bibliotheekwerk)
     - "Middenstand, Horeca & Detailhandel" (winkeltijden, koopzondagen, horecavergunningen)

  4. "Verkeer, Wegen & Fysieke Bereikbaarheid"
     Toegestane subdossiers:
     - "Verkeer, N-Wegen & Bruggen" (N761, N334, N762, N333, Ronduitebrug, Meenthebrug, Scheerbrug, pontje Jonen)
     - "Fietspaden, Openbaar Vervoer & Mobiliteit" (snelfietsroutes, RRReis, bussen, GVVP)
     - "Verkeersveiligheid & Parkeerbeleid" (30 km zones, parkeernormen)

  5. "Sociaal Domein, Asiel & Leefbaarheid"
     Toegestane subdossiers:
     - "Jeugdzorg & RSJ" (regionaal serviceteam jeugd, jeugdhulp, pleegzorg)
     - "Wmo & Publieke Gezondheid (GGD)" (hulp bij het huishouden, Van Rijngelden, publieke gezondheid)
     - "Asielopvang, COA & Spreidingswet" (statushouders, noodopvang, Oekraïne, Fletcher)
     - "Onderwijshuisvesting & Kindcentra" (IHP, scholenbouw)
     - "Participatiewet & Schuldhulpverlening" (armoede, bijstand, kredietbank)
     - "Beschermd Wonen & Mantelzorg" (ouderenzorg, maatschappelijke opvang)

  6. "Mijnbouw & Ondergrondse Opgaven"
     Toegestane subdossiers:
     - "Gaswinning & Seismische Monitoring" (Vermilion, gaslocatie Eesveen)
     - "Mijnbouwschade & Zorgplicht"
     - "Ondergrondse Infrastructuur & Geothermie"

  7. "Bestuur, Financiën & Juridische Zaken"
     Toegestane subdossiers:
     - "Begroting, Jaarstukken & Financiën" (programmabegroting, jaarrekening, OZB, kadernota)
     - "Gemeenschappelijke Regelingen (GR)"
     - "Openbare Orde, Veiligheid & APV" (algemene plaatselijke verordening, politie, brandweer VRIJ)
     - "Beheer Openbare Ruimte & Riolering"
     - "Integriteit, Dienstverlening & Rekenkamer"
     - "Bestuurlijke Organisatie & Raadszaken"

  HARDE REGEL VOOR 'subdossier':
  - Kies UITSLUITEND één van de hierboven expliciet genoemde canonieke subdossiers behorend bij het gekozen hoofddossier!
  - Bedenk NOOIT eigen subdossiers! Maak NOOIT ad-hoc varianten zoals 'Toerismeregulering vaarverkeer Giethoorn' of 'Sportevenementen & Subsidiebeleid'!

  === WIJKEN & KERNEN (STRIKT VERBOD OP GENERIEK "STEENWIJK") ===
  Steenwijk op zichzelf is GEEN afzonderlijke wijk of kern, maar de centrale stad bestaande uit 14 specifieke stadswijken:
  - Stadswijken Steenwijk: Steenwijk Centrum / Binnenstad, Steenwijk West (Spoorzone), De Gagels, Nieuwe Gagels, Clingenborgh, Dolderkanaal, Groot Verlaat, Oostermeenthe, Oostwijken, De Beitel, Paddenpoel en Kornputkwartier, Steenwijkerdiep, Torenlanden, Woldmeenthe, Eeserwold.
  - Dorpskernen Steenwijkerland: Barsbeek, Belt-Schutsloot, Blankenham, Blokzijl, De Pol, Baars, De Bult, Doosje, Eesveen, Giethoorn, Ijsselham, Paasloo, Basse, Jonen, Dwarsgracht, Kalenberg, Kallenkote, Kuinre, Marijenkampen, Willemsoord, Nederland, Baarlo, Oldemarkt, Onna, Ossenzijl, Scheerwolde, Sint Jansklooster, Steenwijkerwold, Witte Paarden, Tuk, Vollenhove, Wanneperveen, Wetering, Zuidveen.

  HARDE REGELS VOOR HET VELD 'wijk_of_kern':
  - Vul NOOIT 'Steenwijk', 'Steenwijk (algemeen)' of 'Steenwijkerland' in als wijk_of_kern!
  - Als een document betrekking heeft op algemeen gemeentelijk beleid (zoals sportevenementensubsidies, subsidieverordeningen, programmabegroting, APV, leges) of op de gehele gemeente Steenwijkerland als geheel, laat 'wijk_of_kern' dan ALTIJD LEEG: ""!
  - Wijs UITSLUITEND een specifieke wijk of dorpskern toe als het document daadwerkelijk en specifiek over die wijk of dorpskern gaat (bijvoorbeeld: bestemmingsplan Woldmeenthe, herinrichting Markt in Steenwijk Centrum, herstructurering De Gagels, zonnepark Eeserwold, etc.).

  Geef het resultaat terug in dit JSON formaat:
  {
    "titel": "Heldere, representatieve publiekstitel (vrij van ambtelijk jargon)",
    "dossier": "Exact één van de 7 canonieke hoofddossiers",
    "subdossier": "Inhoudelijk SKOS-concept (bijv. 'Waterpeilbeheer & Peilbesluiten', 'Woningbouw & Inbreiding', 'Netcongestie & Energie-infrastructuur')",
    "datum": "YYYY-MM-DD",
    "wijk_of_kern": "Specifiek benoemde wijk of dorpskern (of LEEG: '' indien algemeen/gemeentebreed beleid)",
    "entiteiten": "Komma-gescheiden betrokken actoren (bijv. 'WDODelta, Provincie Overijssel, Enexis, COA')",
    "relaties": "Eventuele gerelateerde documenttitels of dossiernummers",
    "skos_tags": ["Array van strings met specifieke ontologische SKOS-labels (bijv. ['Netcongestie', 'Bodemdaling', 'Woningbouw', 'Asiel_Spreidingswet', 'Waterpeilbeheer', 'Smart_Energy_Hub', 'Planschade', 'Stikstof_AERIUS', 'Jeugdzorg_RSJ', 'Provinciale_Wegen']). Zoek naar het achterliggende concept, ook als het woord niet letterlijk in de tekst staat."]
  }

  Document text:
  ${textSample}
  `;

  // 3. Wacht op beschikbaarheid in de 10 RPM rate limiter
  await waitForRateLimitSlot();

  let response: any = null;
  try {
    response = await ai.models.generateContent({
      model: CLASSIFIER_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titel: { type: Type.STRING },
            dossier: {
              type: Type.STRING,
              enum: [
                "Ruimtelijke Ordening, Wonen & Omgevingswet",
                "Landbouw, Natuur & Waterbeheer",
                "Lokale Economie, Toerisme & Energie-infrastructuur",
                "Verkeer, Wegen & Fysieke Bereikbaarheid",
                "Sociaal Domein, Asiel & Leefbaarheid",
                "Mijnbouw & Ondergrondse Opgaven",
                "Bestuur, Financiën & Juridische Zaken"
              ]
            },
            subdossier: { type: Type.STRING },
            datum: { type: Type.STRING },
            wijk_of_kern: { type: Type.STRING },
            entiteiten: { type: Type.STRING },
            relaties: { type: Type.STRING },
            skos_tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["titel", "dossier", "subdossier", "datum", "wijk_of_kern", "entiteiten", "relaties", "skos_tags"]
        }
      }
    });

    // Registreer succesvol verzoek in dagtracker (in-memory + atomic save, Fix 1)
    incrementDailyQuotaUsage();

  } catch (err: any) {
    const errMsg = err?.message || String(err);
    const isQuota =
      err?.status === 429 ||
      errMsg.includes("429") ||
      errMsg.includes("RESOURCE_EXHAUSTED") ||
      errMsg.includes("prepayment") ||
      errMsg.includes("depleted") ||
      errMsg.includes("quota") ||
      errMsg.includes("rate limit") ||
      errMsg.includes("Too Many Requests");

    if (isQuota) {
      const isPrepayment = errMsg.includes("prepayment") || errMsg.includes("depleted");
      let retryWaitSeconds = 60;
      // Parseer eventuele 'retry after XXs' suggestie uit foutmelding
      const retryMatch = errMsg.match(/retry(?:ing)?\s+after\s+(\d+)/i) || errMsg.match(/(\d+)\s*s(?:ec(?:onds)?)?\b/i);
      if (retryMatch && Number(retryMatch[1]) >= 10 && Number(retryMatch[1]) <= 300) {
        retryWaitSeconds = Number(retryMatch[1]);
      }
      throw new GeminiQuotaExceededError(errMsg, retryWaitSeconds, isPrepayment);
    }
    throw err;
  }

  const rawResponseText = response?.text || "{}";
  const parsed = JSON.parse(rawResponseText);

  // Harde controle & opschoning van wijk_of_kern: ban generiek "Steenwijk" of "Steenwijkerland"
  if (parsed.wijk_of_kern && typeof parsed.wijk_of_kern === "string") {
    const rawW = parsed.wijk_of_kern.toLowerCase().trim();
    if (
      rawW === "steenwijk" ||
      rawW === "steenwijkerland" ||
      rawW === "steenwijk (algemeen)" ||
      rawW === "steenwijkerland (algemeen)" ||
      rawW === "gemeente steenwijkerland" ||
      rawW === "gemeente steenwijk" ||
      rawW === "stad steenwijk"
    ) {
      // Zoek of een van de 14 specifieke wijken van Steenwijk genoemd is in titel of tekst
      const specificMatches = detectWijkenKernen(parsed.titel || filename, parsed.entiteiten || "", textSample);
      parsed.wijk_of_kern = specificMatches.length > 0 ? specificMatches.join(", ") : "";
    } else {
      // Filter afzonderlijke onderdelen tegen verboden termen
      const parts = parsed.wijk_of_kern.split(",").map((p: string) => p.trim()).filter(Boolean);
      const cleanedParts = parts.filter((p: string) => !BANNED_GENERIC_WIJKEN.has(p.toLowerCase()));
      parsed.wijk_of_kern = cleanedParts.join(", ");
    }
  }

  return { meta: parsed, rawResponseText };
}

export interface ClassificationResult {
  filename: string;
  source: "gemini" | "fallback";
  modelUsed?: string;
  timestamp: string;
  originalRawResponse?: string;
  dossier: string;
  subdossier: string;
  titel: string;
  wijk_of_kern?: string;
  entiteiten?: string;
  relaties?: string;
  skos_tags?: string[];
}

export interface ClassificationProgress {
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
  lastResults: ClassificationResult[];
  logs: string[];
}

let activeProgress: ClassificationProgress = {
  isRunning: false,
  isPaused: false,
  pauseReason: undefined,
  pauseRemainingSeconds: 0,
  pauseResumesAt: undefined,
  ratePerMinute: getEffectiveRpmLimit(),
  rpdLimit: getEffectiveRpdLimit(),
  dailyRequestsUsed: 0,
  dailyRequestsRemaining: getEffectiveRpdLimit(),
  modelName: CLASSIFIER_MODEL,
  privacySanitized: true,
  total: 0,
  processed: 0,
  newlyClassified: 0,
  alreadyProcessed: 0,
  deadLetterCount: 0,
  activeFile: "",
  limit: undefined,
  lastResults: [],
  logs: []
};

export function getBulkClassificationStatus(): ClassificationProgress {
  const daily = getDailyQuotaUsage();
  const rpmLimit = getEffectiveRpmLimit();
  const rpdLimit = getEffectiveRpdLimit();
  activeProgress.ratePerMinute = rpmLimit;
  activeProgress.rpdLimit = rpdLimit;
  activeProgress.dailyRequestsUsed = daily.requestsToday;
  activeProgress.dailyRequestsRemaining = isPayAsYouGoMode() ? 100000 : Math.max(0, rpdLimit - daily.requestsToday);
  activeProgress.modelName = CLASSIFIER_MODEL;
  activeProgress.privacySanitized = true;
  activeProgress.deadLetterCount = getTotalDeadLetterCount();
  return activeProgress;
}

export function cancelBulkClassification(): void {
  if (activeProgress.isRunning) {
    activeProgress.isRunning = false;
    activeProgress.isPaused = false;
    activeProgress.pauseRemainingSeconds = 0;
    activeProgress.pauseReason = undefined;
    activeProgress.pauseResumesAt = undefined;
    addLogLine("Proces geannuleerd door de gebruiker.");
  }
}

export function startBulkClassificationInBackground(options: { force?: boolean; limit?: number } = {}): void {
  if (activeProgress.isRunning) {
    return;
  }

  const daily = getDailyQuotaUsage();
  const maxLimit = typeof options.limit === "number" && options.limit > 0 ? options.limit : undefined;
  const rpmLimit = getEffectiveRpmLimit();
  const rpdLimit = getEffectiveRpdLimit();
  const payAsYouGo = isPayAsYouGoMode();

  const initLog = `Initialisatie gestart met model ${CLASSIFIER_MODEL} (${payAsYouGo ? "Pay-As-You-Go geactiveerd: ~60 RPM, Onbeperkte RPD" : `Veiligheidslimiet: ~${rpmLimit} RPM, ${rpdLimit} RPD`}).${maxLimit ? ` [BATCH LIMIET: MAX ${maxLimit} BESTANDEN]` : ""} Privacy-sanitizing geactiveerd.`;

  try {
    fs.mkdirSync(path.dirname(EXECUTION_LOG_PATH), { recursive: true });
    fs.writeFileSync(
      EXECUTION_LOG_PATH,
      `=== HERSTRUCTURERING UITVOERINGSLOG - ${new Date().toISOString()} ===\nModel: ${CLASSIFIER_MODEL}\nModus: ${payAsYouGo ? "Pay-As-You-Go (~60 RPM)" : "Free Tier (~8 RPM, 250 RPD)"}\n=======================================================\n\n[${new Date().toISOString().slice(11, 19)}] ${initLog}\n`,
      "utf-8"
    );
  } catch (_e) {
    // Negeer initialisatiefout indien map al bestaat of schrijfrechten beperkt zijn
  }

  activeProgress = {
    isRunning: true,
    isPaused: false,
    pauseReason: undefined,
    pauseRemainingSeconds: 0,
    pauseResumesAt: undefined,
    ratePerMinute: rpmLimit,
    rpdLimit: rpdLimit,
    dailyRequestsUsed: daily.requestsToday,
    dailyRequestsRemaining: payAsYouGo ? 100000 : Math.max(0, rpdLimit - daily.requestsToday),
    modelName: CLASSIFIER_MODEL,
    privacySanitized: true,
    total: 0,
    processed: 0,
    newlyClassified: 0,
    alreadyProcessed: 0,
    deadLetterCount: getTotalDeadLetterCount(),
    activeFile: "",
    limit: maxLimit,
    lastResults: [],
    logs: [initLog]
  };

  // Run asynchronously in the background
  Promise.resolve().then(async () => {
    try {
      // Reload .env dynamically in case user added or updated GEMINI_API_KEY
      if (!process.env.GEMINI_API_KEY) {
        try {
          dotenv.config({ override: true });
        } catch (_e) {
          // ignore
        }
      }

      const currentMetadata = getRawMetadata();
      const allFiles = await scanPdfFilesAsync();

      const fileMap = new Map<string, { absolutePath: string; relativePath: string; filename: string }>();
      for (const f of allFiles) {
        fileMap.set(f.filename.toLowerCase().trim(), f);
      }

      // Count items needing AI classification vs already clean valid metadata
      const dlqItemsCount = currentMetadata.filter(
        (item) => item.dossier === "ONGECLASSIFICEERD_FALEN" || item.subdossier === "Audit & Retry Vereist (DLQ)"
      ).length;

      const steenwijkItemsCount = currentMetadata.filter((item) => {
        const w = (item.wijk_of_kern || "").toLowerCase().trim();
        return (
          w === "steenwijk" ||
          w === "steenwijkerland" ||
          w === "steenwijk (algemeen)" ||
          w === "steenwijkerland (algemeen)" ||
          w.startsWith("steenwijk,") ||
          w.endsWith(", steenwijk")
        );
      }).length;

      const processedFilenames = new Set<string>();
      for (const item of currentMetadata) {
        if (item.bestandsnaam && isDocumentFullyClassified(item)) {
          processedFilenames.add(path.basename(item.bestandsnaam).toLowerCase().trim());
        }
      }

      const newFilesCount = allFiles.filter((f) => !processedFilenames.has(path.basename(f.filename).toLowerCase().trim())).length;
      const totalToProcess = dlqItemsCount + steenwijkItemsCount + newFilesCount;

      activeProgress.total = maxLimit ? Math.min(maxLimit, totalToProcess) : (totalToProcess || currentMetadata.length);
      addLogLine(
        `Sanering & Classificatie gestart: ${steenwijkItemsCount} te herclassificeren 'Steenwijk' items, ${dlqItemsCount} DLQ-herstelpunten, ${currentMetadata.length - dlqItemsCount - steenwijkItemsCount} reeds conforme raadsstukken en ${newFilesCount} nieuwe bestanden.${maxLimit ? ` (Batchlimiet ingesteld op: ${maxLimit} AI-classificaties)` : ""}`
      );

      let aiCallsPerformed = 0;
      let consecutiveQuotaErrors = 0;
      let reclassChanges = false;
      const reclassifiedMetadata: RaadsstukMetadata[] = [];
      const processedFilenamesFinal = new Set<string>();

      // 1. Saneren & herclassificeren van bestaande metadata (inclusief DLQ-herstel en Steenwijk herclassificatie)
      for (let i = 0; i < currentMetadata.length; i++) {
        if (!activeProgress.isRunning) {
          addLogLine("Classificatie handmatig gestopt.");
          break;
        }

        const rawItem = currentMetadata[i];
        let norm = normalizeRecord(rawItem);
        const isDlq = norm.dossier === "ONGECLASSIFICEERD_FALEN" || norm.subdossier === "Audit & Retry Vereist (DLQ)";
        const rawWijkLower = (rawItem.wijk_of_kern || "").toLowerCase().trim();
        const normWijkLower = (norm.wijk_of_kern || "").toLowerCase().trim();
        const isSteenwijkGeneric =
          rawWijkLower === "steenwijk" ||
          rawWijkLower === "steenwijkerland" ||
          rawWijkLower === "steenwijk (algemeen)" ||
          rawWijkLower === "steenwijkerland (algemeen)" ||
          rawWijkLower.startsWith("steenwijk,") ||
          rawWijkLower.endsWith(", steenwijk") ||
          normWijkLower === "steenwijk" ||
          normWijkLower === "steenwijkerland";

        const needsReclassification = isDlq || isSteenwijkGeneric;

        if (needsReclassification) {
          reclassChanges = true;
          if (maxLimit && aiCallsPerformed >= maxLimit) {
            addLogLine(`[BATCH LIMIET BEREIKT] 🛑 Gestopt na verwerken van ${aiCallsPerformed} AI-items (ingestelde limiet: ${maxLimit}).`);
            reclassifiedMetadata.push(norm);
            if (norm.bestandsnaam) processedFilenamesFinal.add(path.basename(norm.bestandsnaam).toLowerCase().trim());
            continue;
          }

          if (process.env.GEMINI_API_KEY) {
            const reclassReason = isDlq ? "DLQ Herstel" : "Herclassificatie generieke wijk 'Steenwijk'";
            activeProgress.activeFile = norm.bestandsnaam || `Herclassificatie Document ${i + 1}`;
            activeProgress.processed++;

            const fnLower = path.basename(norm.bestandsnaam || "").toLowerCase().trim();
            const physicalFile = fileMap.get(fnLower);
            let text = "";
            if (physicalFile) {
              try {
                text = await extractTextFromFile(physicalFile.absolutePath);
              } catch (_e) {
                // ignore
              }
            }
            if (!text) {
              text = norm.titel || norm.bestandsnaam;
            }

            let success = false;
            let attempts = 0;
            while (!success && activeProgress.isRunning) {
              attempts++;
              try {
                const geminiResult = await classifyWithGemini(text, norm.bestandsnaam || norm.titel, physicalFile?.relativePath || "");
                norm = normalizeRecord({ 
                  ...rawItem, 
                  ...geminiResult.meta,
                  ai_geclassificeerd: true,
                  ai_model: CLASSIFIER_MODEL
                }, text);
                aiCallsPerformed++;
                activeProgress.newlyClassified++;
                success = true;
                consecutiveQuotaErrors = 0;

                const formattedGeminiJson = geminiResult.rawResponseText ? geminiResult.rawResponseText.trim() : JSON.stringify(geminiResult.meta, null, 2);
                addLogLine(`[HERKLASSIFICATIE GEMINI SUCCESS (${reclassReason})] "${norm.bestandsnaam}" ➔ [${norm.dossier}] / [${norm.subdossier}] (Wijk/Kern: ${norm.wijk_of_kern || "Gemeentebreed"})`);
                addLogLine(`  ↳ [GEMINI OUTPUT ${norm.bestandsnaam}]:\n${formattedGeminiJson}`);
              } catch (err: any) {
                if (err instanceof GeminiDailyQuotaExceededError || err?.name === "GeminiDailyQuotaExceededError") {
                  addLogLine(`[DAGQUOTUM BEREIKT] ⚠️ 250 verzoeken/dag limiet bereikt voor ${CLASSIFIER_MODEL}.`);
                  success = true;
                  break;
                }

                if (err instanceof GeminiQuotaExceededError || err?.name === "GeminiQuotaExceededError") {
                  consecutiveQuotaErrors++;
                  const baseWait = err.retryAfterSeconds || 60;
                  const multiplier = Math.min(3, 1 + (consecutiveQuotaErrors - 1) * 0.5);
                  const jitterSec = Math.floor(Math.random() * 5) + 1;
                  const waitSeconds = Math.round(baseWait * multiplier) + jitterSec;
                  const resumeDate = new Date(Date.now() + waitSeconds * 1000);
                  const resumeAt = resumeDate.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

                  activeProgress.isPaused = true;
                  activeProgress.pauseRemainingSeconds = waitSeconds;
                  activeProgress.pauseResumesAt = resumeAt;
                  activeProgress.pauseReason = `Gemini API (429 RESOURCE_EXHAUSTED). Rate limit bereikt. Pauzeert ${waitSeconds}s tot ${resumeAt}...`;
                  addLogLine(`[RATE LIMIT PAUZE] ⏸️ 429 RESOURCE_EXHAUSTED. Pauze van ${waitSeconds}s tot ${resumeAt}...`);

                  saveMasterMetadata(reclassifiedMetadata);

                  for (let sec = waitSeconds; sec > 0; sec--) {
                    if (!activeProgress.isRunning) break;
                    activeProgress.pauseRemainingSeconds = sec;
                    await new Promise((r) => setTimeout(r, 1000));
                  }

                  if (!activeProgress.isRunning) break;

                  resetRateLimitWindow();
                  activeProgress.isPaused = false;
                  activeProgress.pauseReason = undefined;
                  activeProgress.pauseRemainingSeconds = 0;
                  continue;
                }

                addLogLine(`[HERKLASSIFICATIE MISLUKT] Document "${norm.bestandsnaam}": ${err?.message || "fout"}`);
                success = true;
              }
            }
          } else {
            addLogLine(`[GEEN API KEY] Geen GEMINI_API_KEY geconfigureerd voor "${norm.bestandsnaam}". Wijk gesaneerd via regex.`);
          }
        } else {
          // Document was reeds volledig geclassificeerd en heeft geen generieke wijk
          activeProgress.alreadyProcessed++;
        }

        reclassifiedMetadata.push(norm);
        if (norm.bestandsnaam) {
          processedFilenamesFinal.add(path.basename(norm.bestandsnaam).toLowerCase().trim());
        }
      }

      if (reclassChanges) {
        saveMasterMetadata(reclassifiedMetadata);
      }

      addLogLine(`Validatie bestaande documenten voltooid. Starten met analyseren van ${newFilesCount} nieuwe documenten...`);

      // 2. Scan and classify new physical files with Gemini and Kop-Staart extraction
      for (const file of allFiles) {
        if (!activeProgress.isRunning) {
          addLogLine("Classificatie handmatig gestopt.");
          break;
        }

        if (maxLimit && aiCallsPerformed >= maxLimit) {
          addLogLine(`[BATCH LIMIET BEREIKT] 🛑 Gestopt na verwerken van ${aiCallsPerformed} AI-items (ingestelde limiet: ${maxLimit}). Kosten beheerst!`);
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 15));

        const fnLower = path.basename(file.filename).toLowerCase().trim();
        if (!options.force && processedFilenamesFinal.has(fnLower)) {
          activeProgress.alreadyProcessed++;
          continue;
        }

        activeProgress.activeFile = file.filename;
        activeProgress.processed++;

        // Determine origin folder
        let origin = "Gemeente Steenwijkerland";
        if (file.relativePath.startsWith("overijssel")) {
          origin = "Provincie Overijssel";
        } else if (file.relativePath.startsWith("waterschap")) {
          origin = "WDODelta";
        }

        const timestamp = new Date().toLocaleTimeString();
        addLogLine(`[${timestamp}] [${activeProgress.processed}/${activeProgress.total}] Analyseren: ${file.filename} (${origin})`);

        if (activeProgress.logs.length > 300) {
          activeProgress.logs.shift();
        }

        let text = "";
        try {
          text = await extractTextFromFile(file.absolutePath);
        } catch (err) {
          console.warn(`[BULK CLASS] Failed text extraction for ${file.filename}:`, err);
        }

        let meta: Partial<RaadsstukMetadata> = {};
        let rawAiOutput = "";
        let usedSource: "gemini" | "fallback" = "gemini";
        let success = false;
        let attempts = 0;
        const maxNonQuotaRetries = 3;

        if (!process.env.GEMINI_API_KEY) {
          meta = runFallbackClassification(text, file.filename, file.relativePath, "Geen GEMINI_API_KEY geconfigureerd");
          usedSource = "fallback";
          rawAiOutput = JSON.stringify(meta, null, 2);
          success = true;
        }

        while (!success && activeProgress.isRunning) {
          attempts++;
          try {
            const geminiResult = await classifyWithGemini(text, file.filename, file.relativePath);
            meta = {
              ...geminiResult.meta,
              ai_geclassificeerd: true,
              ai_model: CLASSIFIER_MODEL
            };
            rawAiOutput = geminiResult.rawResponseText;
            usedSource = "gemini";
            aiCallsPerformed++;
            success = true;
            consecutiveQuotaErrors = 0;
          } catch (err: any) {
            // Daily Quota (250 RPD) Exceeded Handling
            if (err instanceof GeminiDailyQuotaExceededError || err?.name === "GeminiDailyQuotaExceededError") {
              addLogLine(`[DAGQUOTUM BEREIKT] ⚠️ 250 verzoeken/dag limiet voor ${CLASSIFIER_MODEL} bereikt. Overschakelen op lokale heuristieken om proces te voltooien.`);
              meta = runFallbackClassification(text, file.filename, file.relativePath, "Dagquotum (250 RPD) bereikt");
              usedSource = "fallback";
              rawAiOutput = JSON.stringify(meta, null, 2);
              success = true;
              break;
            }

            // Rate Limit (429 RESOURCE_EXHAUSTED / 8-10 RPM) Handling
            if (err instanceof GeminiQuotaExceededError || err?.name === "GeminiQuotaExceededError") {
              consecutiveQuotaErrors++;
              const baseWait = err.retryAfterSeconds || 60;
              const multiplier = Math.min(3, 1 + (consecutiveQuotaErrors - 1) * 0.5);
              const jitterSec = Math.floor(Math.random() * 5) + 1;
              const waitSeconds = Math.round(baseWait * multiplier) + jitterSec;

              const resumeDate = new Date(Date.now() + waitSeconds * 1000);
              const resumeAt = resumeDate.toLocaleTimeString("nl-NL", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
              });

              activeProgress.isPaused = true;
              activeProgress.pauseRemainingSeconds = waitSeconds;
              activeProgress.pauseResumesAt = resumeAt;
              activeProgress.pauseReason = `Gemini API (429 RESOURCE_EXHAUSTED). Rate limit sliding window bereikt (poging ${consecutiveQuotaErrors}). Pauzeert ${waitSeconds}s met backoff & jitter tot ${resumeAt}...`;

              addLogLine(`[RATE LIMIT PAUZE] ⏸️ 429 RESOURCE_EXHAUSTED (poging ${consecutiveQuotaErrors}). Backoff-pauze van ${waitSeconds}s tot ${resumeAt}...`);
              if (activeProgress.logs.length > 300) activeProgress.logs.shift();

              saveMasterMetadata(reclassifiedMetadata);

              for (let sec = waitSeconds; sec > 0; sec--) {
                if (!activeProgress.isRunning) break;
                activeProgress.pauseRemainingSeconds = sec;
                await new Promise((r) => setTimeout(r, 1000));
              }

              if (!activeProgress.isRunning) break;

              resetRateLimitWindow();

              activeProgress.isPaused = false;
              activeProgress.pauseReason = undefined;
              activeProgress.pauseRemainingSeconds = 0;
              continue;
            }

            // Transient network error (503, 500)
            if (attempts < maxNonQuotaRetries && (err?.message?.includes("503") || err?.message?.includes("500") || err?.message?.includes("ECONNRESET"))) {
              addLogLine(`  ↳ Tijdelijke netwerkfout (${err?.message || 500}). Herkansen over 5s...`);
              await new Promise((r) => setTimeout(r, 5000));
              continue;
            }

            // Other unrecoverable error: route to DLQ
            addLogLine(`  ↳ [DLQ] AI-analyse mislukt voor "${file.filename}" (${err?.message || "fout"}). Geplaatst in Dead Letter Queue.`);
            meta = runFallbackClassification(text, file.filename, file.relativePath, err?.message || "Classificatiefout");
            usedSource = "fallback";
            rawAiOutput = JSON.stringify(meta, null, 2);
            success = true;
          }
        }

        if (!activeProgress.isRunning) break;

        const initialRecord: RaadsstukMetadata = {
          bestandsnaam: file.filename,
          titel: meta.titel || file.filename.replace(/\.pdf$/i, "").replace(/[_-]/g, " "),
          dossier: meta.dossier || "Bestuur, Financiën & Juridische Zaken",
          subdossier: meta.subdossier || "",
          datum: meta.datum || new Date().toISOString().split("T")[0],
          wijk_of_kern: meta.wijk_of_kern || "",
          entiteiten: meta.entiteiten || (origin !== "Gemeente Steenwijkerland" ? origin : ""),
          relaties: meta.relaties || "",
          skos_tags: meta.skos_tags || []
        };

        const record = normalizeRecord(initialRecord, text);

        const existingIndex = reclassifiedMetadata.findIndex(
          (item) => (item.bestandsnaam || "").toLowerCase().trim() === fnLower
        );

        if (existingIndex !== -1) {
          reclassifiedMetadata[existingIndex] = record;
        } else {
          reclassifiedMetadata.push(record);
        }

        processedFilenamesFinal.add(fnLower);
        activeProgress.newlyClassified++;

        const formattedGeminiJson = rawAiOutput ? rawAiOutput.trim() : JSON.stringify({
          titel: record.titel,
          dossier: record.dossier,
          subdossier: record.subdossier,
          wijk_of_kern: record.wijk_of_kern,
          entiteiten: record.entiteiten,
          relaties: record.relaties,
          skos_tags: record.skos_tags
        }, null, 2);

        addLogLine(`  ↳ [${usedSource.toUpperCase()}] Indeling: "${record.dossier}" ➔ Subdossier: "${record.subdossier}"`);
        addLogLine(`  ↳ [GEMINI OUTPUT ${file.filename}]:\n${formattedGeminiJson}`);

        const classificationResult: ClassificationResult = {
          filename: file.filename,
          source: usedSource,
          modelUsed: usedSource === "gemini" ? CLASSIFIER_MODEL : "heuristische fallback",
          timestamp: new Date().toLocaleTimeString(),
          originalRawResponse: formattedGeminiJson,
          dossier: record.dossier,
          subdossier: record.subdossier,
          titel: record.titel,
          wijk_of_kern: record.wijk_of_kern,
          entiteiten: record.entiteiten,
          relaties: record.relaties,
          skos_tags: record.skos_tags,
          ai_geclassificeerd: true,
          ai_model: usedSource === "gemini" ? CLASSIFIER_MODEL : undefined
        };

        activeProgress.lastResults.unshift(classificationResult);
        if (activeProgress.lastResults.length > 50) {
          activeProgress.lastResults.pop();
        }

        if (activeProgress.logs.length > 500) {
          activeProgress.logs.shift();
        }

        if (activeProgress.newlyClassified > 0 && activeProgress.newlyClassified % 20 === 0) {
          saveMasterMetadata(reclassifiedMetadata);
        }
      }

      // Sla de reeds genormaliseerde metadata direct op
      saveMasterMetadata(reclassifiedMetadata);
      try {
        rebuildNetworkGraph();
      } catch (_e) {
        // ignore graph rebuild error if any
      }

      addLogLine(`[VOLTOOID] Herstructurering en classificatie succesvol afgerond! Totaal: ${activeProgress.processed}/${activeProgress.total}. 7 canonieke hoofddossiers gesynchroniseerd.`);
      activeProgress.isRunning = false;
      activeProgress.activeFile = "";

    } catch (err: any) {
      console.error("[BACKGROUND BULK CLASSIFICATION ERROR]:", err);
      addLogLine(`[FOUT] Proces afgebroken wegens kritieke fout: ${err.message || err}`);
      activeProgress.isRunning = false;
    }
  });
}

/**
 * Importeert en synchroniseert een eerdere Gemini uitvoeringslog (bijv. herstructurering_uitvoeringslog_*.txt).
 * Haalt alle [GEMINI OUTPUT ...]: { ... } blokken eruit, saneert wijk_of_kern (geen generiek 'Steenwijk'),
 * en voegt ze direct samen met de master metadata zonder opnieuw tokens of API calls te verbruiken.
 */
export function importExecutionLogText(logText: string): { imported: number; updated: number; totalInLog: number } {
  const extracted: Array<{ filename: string; json: any }> = [];
  const foundFilenames = new Set<string>();

  // 1. Primaire parser: gebalanceerde accolades voor robuuste extractie van geneste JSON
  const marker = "[GEMINI OUTPUT";
  let idx = 0;
  while ((idx = logText.indexOf(marker, idx)) !== -1) {
    const closeBracket = logText.indexOf("]:", idx);
    if (closeBracket === -1) {
      idx += marker.length;
      continue;
    }
    const rawFilename = logText.slice(idx + marker.length, closeBracket).trim();
    const openBrace = logText.indexOf("{", closeBracket);
    if (openBrace === -1) {
      idx = closeBracket + 2;
      continue;
    }
    let depth = 0;
    let endBrace = -1;
    let inString = false;
    let escape = false;
    for (let i = openBrace; i < logText.length; i++) {
      const char = logText[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === "{") depth++;
        else if (char === "}") {
          depth--;
          if (depth === 0) {
            endBrace = i;
            break;
          }
        }
      }
    }
    if (endBrace !== -1) {
      const jsonStr = logText.slice(openBrace, endBrace + 1);
      try {
        const parsed = JSON.parse(jsonStr);
        const normFn = path.basename(rawFilename).toLowerCase().trim();
        extracted.push({ filename: rawFilename, json: parsed });
        foundFilenames.add(normFn);
      } catch (_e) {
        // Negeer mislukte JSON parse
      }
      idx = endBrace + 1;
    } else {
      idx = openBrace + 1;
    }
  }

  // 2. Fallback parser: regex voor eventuele gemiste regels
  const regex = /\[GEMINI OUTPUT\s+([^\]]+)\]:\s*(\{[\s\S]*?\n\})/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(logText)) !== null) {
    const rawFilename = match[1].trim();
    const normFn = path.basename(rawFilename).toLowerCase().trim();
    if (!foundFilenames.has(normFn)) {
      try {
        const parsed = JSON.parse(match[2]);
        extracted.push({ filename: rawFilename, json: parsed });
        foundFilenames.add(normFn);
      } catch (_e) {
        // ignore
      }
    }
  }

  // 3. Fallback parser: single-line [HERKLASSIFICATIE GEMINI SUCCESS] regels
  const lineRegex = /\[HERKLASSIFICATIE GEMINI SUCCESS\]\s*"([^"]+)"\s*➔\s*\[([^\]]+)\]\s*\/\s*\[([^\]]+)\]/g;
  let lineMatch: RegExpExecArray | null;
  while ((lineMatch = lineRegex.exec(logText)) !== null) {
    const fn = lineMatch[1].trim();
    const normFn = path.basename(fn).toLowerCase().trim();
    if (!foundFilenames.has(normFn)) {
      extracted.push({
        filename: fn,
        json: {
          titel: fn.replace(/\.pdf$/i, ""),
          dossier: lineMatch[2].trim(),
          subdossier: lineMatch[3].trim(),
          ai_geclassificeerd: true,
          ai_model: CLASSIFIER_MODEL
        }
      });
      foundFilenames.add(normFn);
    }
  }

  if (extracted.length === 0) {
    return { imported: 0, updated: 0, totalInLog: 0 };
  }

  const currentMetadata = getRawMetadata();
  const metaMap = new Map<string, RaadsstukMetadata>();
  for (const item of currentMetadata) {
    if (item.bestandsnaam) {
      metaMap.set(path.basename(item.bestandsnaam).toLowerCase().trim(), item);
    }
  }

  let importedCount = 0;
  let updatedCount = 0;

  for (const item of extracted) {
    const fnLower = path.basename(item.filename).toLowerCase().trim();
    const existing = metaMap.get(fnLower);

    // Sanitize wijk_of_kern: ban generiek "Steenwijk" of "Steenwijkerland"
    if (item.json.wijk_of_kern && typeof item.json.wijk_of_kern === "string") {
      const rawW = item.json.wijk_of_kern.toLowerCase().trim();
      if (
        rawW === "steenwijk" ||
        rawW === "steenwijkerland" ||
        rawW === "steenwijk (algemeen)" ||
        rawW === "steenwijkerland (algemeen)" ||
        rawW === "gemeente steenwijkerland" ||
        rawW === "gemeente steenwijk" ||
        rawW === "stad steenwijk"
      ) {
        const specificMatches = detectWijkenKernen(item.json.titel || item.filename, item.json.entiteiten || "");
        item.json.wijk_of_kern = specificMatches.length > 0 ? specificMatches.join(", ") : "";
      } else {
        const parts = item.json.wijk_of_kern.split(",").map((p: string) => p.trim()).filter(Boolean);
        const cleanedParts = parts.filter((p: string) => !BANNED_GENERIC_WIJKEN.has(p.toLowerCase()));
        item.json.wijk_of_kern = cleanedParts.join(", ");
      }
    }

    const mergedRaw: RaadsstukMetadata = {
      ...(existing || {}),
      bestandsnaam: existing?.bestandsnaam || item.filename,
      titel: item.json.titel || existing?.titel || item.filename,
      dossier: item.json.dossier || existing?.dossier,
      subdossier: item.json.subdossier || existing?.subdossier,
      datum: item.json.datum || existing?.datum || new Date().toISOString().slice(0, 10),
      wijk_of_kern: item.json.wijk_of_kern !== undefined ? item.json.wijk_of_kern : (existing?.wijk_of_kern || ""),
      entiteiten: item.json.entiteiten || existing?.entiteiten || "",
      relaties: item.json.relaties || existing?.relaties || "",
      skos_tags: Array.isArray(item.json.skos_tags)
        ? item.json.skos_tags
        : (existing?.skos_tags || []),
      ai_geclassificeerd: true,
      ai_model: CLASSIFIER_MODEL
    };

    const normalized = normalizeRecord(mergedRaw);
    if (existing) {
      updatedCount++;
    } else {
      importedCount++;
    }
    metaMap.set(fnLower, normalized);
  }

  const updatedMetadataList = Array.from(metaMap.values());
  saveMasterMetadata(updatedMetadataList);
  invalidateDossierCache();
  try {
    rebuildNetworkGraph();
  } catch (_e) {
    // ignore
  }

  return { imported: importedCount, updated: updatedCount, totalInLog: extracted.length };
}

