import fs from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { extractTextFromFile } from "./documentTextExtractor.js";
import { getRawMetadata, rebuildNetworkGraph, saveMasterMetadata } from "./dossierManager.js";
import { RaadsstukMetadata } from "../types/dossier.js";
import {
  CANONICAL_HOOFDDOSSIERS,
  normalizeHoofddossier,
  normalizeSubdossier,
  detectWijkenKernen,
  cleanPublicTitle,
  normalizeRecord,
  validateRecordConformity
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

const QUOTA_TRACKER_PATH = path.join(process.cwd(), "public", "data", "gemini_quota_tracker.json");
const DLQ_LOG_PATH = path.join(process.cwd(), "public", "data", "gemini_dead_letter_queue.jsonl");

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
            dailyLimit: FREE_TIER_RPD_LIMIT,
            rpmLimit: FREE_TIER_RPM_LIMIT,
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
    dailyLimit: FREE_TIER_RPD_LIMIT,
    rpmLimit: FREE_TIER_RPM_LIMIT,
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

  // 1. Minimaal interval sinds vorig verzoek (7500ms + random jitter)
  const jitter = Math.floor(Math.random() * 350);
  const targetDelay = RATE_LIMIT_DELAY_MS + jitter;
  const elapsedSinceLast = now - lastRequestTime;
  if (elapsedSinceLast < targetDelay) {
    const sleepNeeded = targetDelay - elapsedSinceLast;
    await new Promise((r) => setTimeout(r, sleepNeeded));
  }

  // 2. Sliding window voor maximaal EFFECTIVE_RPM_LIMIT (8) requests per 60 seconden
  const windowSpan = 60000;
  const currentNow = Date.now();
  const windowStart = currentNow - windowSpan;
  
  // Verwijder verzoeken ouder dan 60 seconden
  while (requestTimestamps.length > 0 && requestTimestamps[0] < windowStart) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= EFFECTIVE_RPM_LIMIT) {
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
  if (!geminiClient && process.env.GEMINI_API_KEY) {
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

  // 1. Check daily quota (max 250 RPD)
  const quota = loadQuotaTracker();
  if (quota.requestsToday >= FREE_TIER_RPD_LIMIT) {
    throw new GeminiDailyQuotaExceededError(quota.requestsToday, FREE_TIER_RPD_LIMIT);
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

  === DE 7 CANONIEKE HOOFDDOSSIERS (Kies EXACT ÉÉN) ===
  1. "Ruimtelijke Ordening, Wonen & Omgevingswet"
     - Bestemmingsplannen, Omgevingsvisie, TAM-omgevingsplannen, BOPA, woningbouw, inbreiding, sociale volkshuisvesting (Wetland Wonen), beeldkwaliteit, planschade/SAOZ.
  2. "Landbouw, Natuur & Waterbeheer"
     - Waterpeilbeheer, peilbesluiten (WDODelta), OGOR, bodemdaling/veenoxidatie, stikstof (AERIUS/KDW), Natura 2000 (Weerribben-Wieden), agrarische transitie/pacht, waterkwaliteit (KRW), dijkversterking.
  3. "Lokale Economie, Toerisme & Energie-infrastructuur"
     - Netcongestie, Smart Energy Hub, windenergie, zonneparken, bedrijventerreinen (Eeserwold, Groot Verlaat), toerisme/vaarverordening Giethoorn, cultuur/UNESCO (Koloniën van Weldadigheid), De Meenthe, sport.
  4. "Verkeer, Wegen & Fysieke Bereikbaarheid"
     - N-wegen (N761/N334/N762/N333), bruggen (Ronduitebrug, Meenthebrug, Scheerbrug), snelfietsroutes, openbaar vervoer (RRReis), GVVP, verkeersveiligheid.
  5. "Sociaal Domein, Asiel & Leefbaarheid"
     - Jeugdzorg (RSJ), Wmo, publieke gezondheid (GGD), asielopvang (COA, Spreidingswet), Participatiewet/schuldhulp, onderwijshuisvesting (IHP) & kindcentra, leefbaarheid kleine kernen.
  6. "Mijnbouw & Ondergrondse Opgaven"
     - Gaswinning (Vermilion, Eesveen), winningsplannen, bodembeweging/seismische monitoring, mijnbouwschade, geothermie.
  7. "Bestuur, Financiën & Juridische Zaken"
     - Programmabegroting, jaarrekening, gemeentefonds, belastingen (OZB, leges), APV, politie, brandweer, Veiligheidsregio IJsselland (VRIJ), rekenkamer, riolering & openbare ruimte.

  === WIJKEN & KERNEN ===
  Steenwijk (Centrum, West, Spoorzone, Groot Verlaat, Oostermeenthe, Woldmeenthe, Kornputkwartier), Barsbeek, Belt-Schutsloot, Blankenham, Blokzijl, De Pol, Baars, De Bult, Doosje, Eeserwold, Eesveen, Giethoorn, Ijsselham, Paasloo, Basse, Jonen, Dwarsgracht, Kalenberg, Kallenkote, Kuinre, Marijenkampen, Willemsoord, Nederland, Baarlo, Oldemarkt, Onna, Ossenzijl, Scheerwolde, Sint Jansklooster, Steenwijkerwold, Witte Paarden, Tuk, Vollenhove, Wanneperveen, Wetering, Zuidveen.

  Geef het resultaat terug in dit JSON formaat:
  {
    "titel": "Heldere, representatieve publiekstitel (vrij van ambtelijk jargon)",
    "dossier": "Exact één van de 7 canonieke hoofddossiers",
    "subdossier": "Inhoudelijk SKOS-concept (bijv. 'Waterpeilbeheer & Peilbesluiten', 'Woningbouw & Inbreiding', 'Netcongestie & Energie-infrastructuur')",
    "datum": "YYYY-MM-DD",
    "wijk_of_kern": "Gevonden Steenwijkerlandse kernen (komma-gescheiden, of leeg indien algemeen/interbestuurlijk)",
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
  ratePerMinute: EFFECTIVE_RPM_LIMIT,
  rpdLimit: FREE_TIER_RPD_LIMIT,
  dailyRequestsUsed: 0,
  dailyRequestsRemaining: FREE_TIER_RPD_LIMIT,
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
  activeProgress.ratePerMinute = EFFECTIVE_RPM_LIMIT;
  activeProgress.rpdLimit = FREE_TIER_RPD_LIMIT;
  activeProgress.dailyRequestsUsed = daily.requestsToday;
  activeProgress.dailyRequestsRemaining = daily.remainingToday;
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
    activeProgress.logs.push("Proces geannuleerd door de gebruiker.");
  }
}

export function startBulkClassificationInBackground(options: { force?: boolean; limit?: number } = {}): void {
  if (activeProgress.isRunning) {
    return;
  }

  const daily = getDailyQuotaUsage();
  const maxLimit = typeof options.limit === "number" && options.limit > 0 ? options.limit : undefined;

  activeProgress = {
    isRunning: true,
    isPaused: false,
    pauseReason: undefined,
    pauseRemainingSeconds: 0,
    pauseResumesAt: undefined,
    ratePerMinute: EFFECTIVE_RPM_LIMIT,
    rpdLimit: FREE_TIER_RPD_LIMIT,
    dailyRequestsUsed: daily.requestsToday,
    dailyRequestsRemaining: daily.remainingToday,
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
    logs: [
      `Initialisatie gestart met model ${CLASSIFIER_MODEL} (Veiligheidslimiet: ~${EFFECTIVE_RPM_LIMIT} RPM, ${FREE_TIER_RPD_LIMIT} RPD).${maxLimit ? ` [BATCH LIMIET: MAX ${maxLimit} BESTANDEN]` : ""} Privacy-sanitizing geactiveerd.`
    ]
  };

  // Run asynchronously in the background
  Promise.resolve().then(async () => {
    try {
      const currentMetadata = getRawMetadata();
      const allFiles = await scanPdfFilesAsync();
      const totalToProcess = maxLimit ? Math.min(maxLimit, currentMetadata.length + allFiles.length) : (currentMetadata.length + allFiles.length);
      activeProgress.total = totalToProcess;
      activeProgress.logs.push(`Sanering & Classificatie gestart: ${currentMetadata.length} geregistreerde raadsstukken en ${allFiles.length} fysieke documenten.${maxLimit ? ` (Batchlimiet ingesteld op: ${maxLimit})` : ""}`);

      // 1. Saneren & normaliseren van alle bestaande documenten naar de 7 canonieke dossiers
      const processedFilenames = new Set<string>();
      const reclassifiedMetadata: RaadsstukMetadata[] = [];

      for (let i = 0; i < currentMetadata.length; i++) {
        if (!activeProgress.isRunning) {
          activeProgress.logs.push("Classificatie handmatig gestopt.");
          break;
        }

        if (maxLimit && activeProgress.processed >= maxLimit) {
          activeProgress.logs.push(`[BATCH LIMIET BEREIKT] 🛑 Gestopt na verwerken van ${activeProgress.processed} items (ingestelde limiet: ${maxLimit}).`);
          break;
        }

        const rawItem = currentMetadata[i];
        activeProgress.activeFile = rawItem.bestandsnaam || `Document ${i + 1}`;
        activeProgress.processed++;

        const norm = normalizeRecord(rawItem);
        const validation = validateRecordConformity(norm);

        if (!validation.valid) {
          activeProgress.logs.push(`[VALIDATIE HERSTEL] Document ${norm.bestandsnaam}: ${validation.errors.join(", ")}`);
        }

        reclassifiedMetadata.push(norm);
        if (norm.bestandsnaam) {
          processedFilenames.add(norm.bestandsnaam.toLowerCase().trim());
        }

        activeProgress.newlyClassified++;
        if (i % 25 === 0 || i === currentMetadata.length - 1) {
          activeProgress.logs.push(`[${activeProgress.processed}/${activeProgress.total}] Gesaneerd: "${norm.titel.substring(0, 40)}" ➔ [${norm.dossier}] / [${norm.subdossier}]`);
        }

        if (activeProgress.logs.length > 300) {
          activeProgress.logs.shift();
        }

        // Asynchroon pauzeren voor event loop
        await new Promise((resolve) => setTimeout(resolve, 5));

        // Periodieke opslag
        if (i > 0 && i % 50 === 0) {
          saveMasterMetadata(reclassifiedMetadata);
        }
      }

      // 2. Scan and classify new physical files with Gemini and Kop-Staart extraction
      let consecutiveQuotaErrors = 0;

      for (const file of allFiles) {
        if (!activeProgress.isRunning) {
          activeProgress.logs.push("Classificatie handmatig gestopt.");
          break;
        }

        if (maxLimit && activeProgress.processed >= maxLimit) {
          activeProgress.logs.push(`[BATCH LIMIET BEREIKT] 🛑 Gestopt na verwerken van ${activeProgress.processed} items (ingestelde limiet: ${maxLimit}). Kosten beheerst!`);
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 15));

        const fnLower = file.filename.toLowerCase().trim();
        activeProgress.activeFile = file.filename;
        activeProgress.processed++;

        if (!options.force && processedFilenames.has(fnLower)) {
          activeProgress.alreadyProcessed++;
          if (activeProgress.processed % 50 === 0 || activeProgress.processed === allFiles.length) {
            activeProgress.logs.push(`[${activeProgress.processed}/${activeProgress.total}] Reeds verwerkt: ${file.filename}`);
          }
          continue;
        }

        // Determine origin folder
        let origin = "Gemeente Steenwijkerland";
        if (file.relativePath.startsWith("overijssel")) {
          origin = "Provincie Overijssel";
        } else if (file.relativePath.startsWith("waterschap")) {
          origin = "WDODelta";
        }

        const timestamp = new Date().toLocaleTimeString();
        activeProgress.logs.push(`[${timestamp}] [${activeProgress.processed}/${activeProgress.total}] Analyseren: ${file.filename} (${origin})`);
        
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

        // If no API key configured, use DLQ fallback
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
            meta = geminiResult.meta;
            rawAiOutput = geminiResult.rawResponseText;
            usedSource = "gemini";
            success = true;
            consecutiveQuotaErrors = 0; // Reset consecutive quota error counter on success
          } catch (err: any) {
            // Daily Quota (250 RPD) Exceeded Handling
            if (err instanceof GeminiDailyQuotaExceededError || err?.name === "GeminiDailyQuotaExceededError") {
              activeProgress.logs.push(`[DAGQUOTUM BEREIKT] ⚠️ 250 verzoeken/dag limiet voor ${CLASSIFIER_MODEL} bereikt. Overschakelen op lokale heuristieken om proces te voltooien.`);
              meta = runFallbackClassification(text, file.filename, file.relativePath, "Dagquotum (250 RPD) bereikt");
              usedSource = "fallback";
              rawAiOutput = JSON.stringify(meta, null, 2);
              success = true;
              break;
            }

            // Rate Limit (429 RESOURCE_EXHAUSTED / 8-10 RPM) Handling met Exponential Backoff & Jitter (Fix 3)
            if (err instanceof GeminiQuotaExceededError || err?.name === "GeminiQuotaExceededError") {
              consecutiveQuotaErrors++;
              const baseWait = err.retryAfterSeconds || 60;
              // Exponential backoff multiplier (1x, 1.5x, 2x, max 3x) + willekeurige jitter (1-5 sec)
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

              activeProgress.logs.push(`[RATE LIMIT PAUZE] ⏸️ 429 RESOURCE_EXHAUSTED (poging ${consecutiveQuotaErrors}). Backoff-pauze van ${waitSeconds}s (incl. ${jitterSec}s jitter) tot ${resumeAt}...`);
              if (activeProgress.logs.length > 300) activeProgress.logs.shift();

              saveMasterMetadata(reclassifiedMetadata);

              for (let sec = waitSeconds; sec > 0; sec--) {
                if (!activeProgress.isRunning) break;
                activeProgress.pauseRemainingSeconds = sec;
                await new Promise((r) => setTimeout(r, 1000));
              }

              if (!activeProgress.isRunning) break;

              // Reset sliding window na pauze zodat we niet direct weer blokkeren (Fix 3)
              resetRateLimitWindow();

              activeProgress.isPaused = false;
              activeProgress.pauseReason = undefined;
              activeProgress.pauseRemainingSeconds = 0;
              continue;
            }

            // Transient network error (503, 500)
            if (attempts < maxNonQuotaRetries && (err?.message?.includes("503") || err?.message?.includes("500") || err?.message?.includes("ECONNRESET"))) {
              activeProgress.logs.push(`  ↳ Tijdelijke netwerkfout (${err?.message || 500}). Herkansen over 5s...`);
              await new Promise((r) => setTimeout(r, 5000));
              continue;
            }

            // Other unrecoverable error: route to DLQ
            activeProgress.logs.push(`  ↳ [DLQ] AI-analyse mislukt voor "${file.filename}" (${err?.message || "fout"}). Geplaatst in Dead Letter Queue.`);
            meta = runFallbackClassification(text, file.filename, file.relativePath, err?.message || "Classificatiefout");
            usedSource = "fallback";
            rawAiOutput = JSON.stringify(meta, null, 2);
            success = true;
          }
        }

        if (!activeProgress.isRunning) break;

        // Prepare complete metadata record with strict taxonomy normalization
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

        processedFilenames.add(fnLower);
        activeProgress.newlyClassified++;

        // Detailed output logging so user can verify Gemini API response directly
        const formattedGeminiJson = rawAiOutput ? rawAiOutput.trim() : JSON.stringify({
          titel: record.titel,
          dossier: record.dossier,
          subdossier: record.subdossier,
          wijk_of_kern: record.wijk_of_kern,
          entiteiten: record.entiteiten,
          relaties: record.relaties,
          skos_tags: record.skos_tags
        }, null, 2);

        activeProgress.logs.push(`  ↳ [${usedSource.toUpperCase()}] Indeling: "${record.dossier}" ➔ Subdossier: "${record.subdossier}"`);
        activeProgress.logs.push(`  ↳ [GEMINI OUTPUT ${file.filename}]:\n${formattedGeminiJson}`);

        // Store structured result for UI inspection
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
          skos_tags: record.skos_tags
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

      activeProgress.logs.push(`[VOLTOOID] Herstructurering en classificatie succesvol afgerond! Totaal: ${activeProgress.processed}/${activeProgress.total}. 7 canonieke hoofddossiers gesynchroniseerd.`);
      activeProgress.isRunning = false;
      activeProgress.activeFile = "";

    } catch (err: any) {
      console.error("[BACKGROUND BULK CLASSIFICATION ERROR]:", err);
      activeProgress.logs.push(`[FOUT] Proces afgebroken wegens kritieke fout: ${err.message || err}`);
      activeProgress.isRunning = false;
    }
  });
}
