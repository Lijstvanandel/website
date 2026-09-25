import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  parsePdfBufferInWorker,
  extractPdfFileInWorker,
  getEventLoopLagMetrics,
  globalPdfWorkerPool,
} from "./workers/pdfWorkerPool.js";

export { getEventLoopLagMetrics, globalPdfWorkerPool };

const DOCUMENTS_DIR = path.join(process.cwd(), "public", "uploads", "documents");
const DIST_DOCUMENTS_DIR = path.join(process.cwd(), "dist", "uploads", "documents");
const CACHE_FILE = path.join(process.cwd(), "public", "uploads", "documents", ".text-index.json");
const TEXT_SHARDS_DIR = path.join(process.cwd(), "public", "uploads", "documents", ".text-cache");

// ============================================================================
// FIX 1: BOUNDED LRU CACHE (Eliminates the In-Memory RAM-Bomb)
// ============================================================================
// Bounded LRU cache that limits both max item count and total string character size.
// Evicts least-recently-used items when capacity is reached, preventing V8 heap exhaustion.
class BoundedLruTextCache {
  private maxItems: number;
  private maxCharSize: number;
  private currentChars: number = 0;
  private map: Map<string, string> = new Map();

  constructor(maxItems = 100, maxCharSize = 12 * 1024 * 1024) { // Max 100 items or ~12MB in RAM
    this.maxItems = maxItems;
    this.maxCharSize = maxCharSize;
  }

  get(key: string): string | undefined {
    if (!this.map.has(key)) return undefined;
    const val = this.map.get(key)!;
    // Refresh position for LRU (re-insert at the end)
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  set(key: string, value: string): void {
    if (this.map.has(key)) {
      const old = this.map.get(key);
      if (typeof old === "string") this.currentChars -= old.length;
      this.map.delete(key);
    }

    if (typeof value === "string") {
      this.currentChars += value.length;
    }
    this.map.set(key, value);

    // Evict oldest entries if exceeded
    while (
      this.map.size > this.maxItems ||
      (this.currentChars > this.maxCharSize && this.map.size > 5)
    ) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey === undefined) break;
      const oldestVal = this.map.get(oldestKey);
      if (typeof oldestVal === "string") {
        this.currentChars -= oldestVal.length;
      }
      this.map.delete(oldestKey);
    }
  }

  delete(key: string): boolean {
    if (!this.map.has(key)) return false;
    const val = this.map.get(key);
    if (typeof val === "string") this.currentChars -= val.length;
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
    this.currentChars = 0;
  }

  get size(): number {
    return this.map.size;
  }

  get memoryChars(): number {
    return this.currentChars;
  }
}

const textCache = new BoundedLruTextCache(100, 12 * 1024 * 1024);

// ============================================================================
// FIX 2: PER-DOCUMENT ATOMIC DISK SHARDS (Eliminates CPU & I/O Blocking)
// ============================================================================
// Instead of storing all 10,000 document texts in a single massive JSON file
// with synchronous JSON.stringify() and writeFileSync(), each document text
// is stored as an independent atomic shard on disk (.text-cache/<sha256>.txt).

function getShardPath(key: string): string {
  const normKey = (key || "").toLowerCase().trim();
  const hash = crypto.createHash("sha256").update(normKey).digest("hex");
  return path.join(TEXT_SHARDS_DIR, `${hash}.txt`);
}

async function readShardFromDisk(key: string): Promise<string | null> {
  const shardPath = getShardPath(key);
  try {
    if (fs.existsSync(shardPath)) {
      return await fs.promises.readFile(shardPath, "utf-8");
    }
  } catch (err) {
    // Shard file read failed or missing
  }
  return null;
}

async function writeShardToDisk(key: string, text: string): Promise<void> {
  if (!text || !text.trim()) return;
  try {
    if (!fs.existsSync(TEXT_SHARDS_DIR)) {
      await fs.promises.mkdir(TEXT_SHARDS_DIR, { recursive: true });
    }
    const targetPath = getShardPath(key);
    const tempPath = `${targetPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
    await fs.promises.writeFile(tempPath, text, "utf-8");
    await fs.promises.rename(tempPath, targetPath);
  } catch (err) {
    console.warn(`[TEXT EXTRACTOR] Kon shard niet atomair wegschrijven voor '${key}':`, err);
  }
}

// Migrate legacy .text-index.json once on startup without freezing the event loop
let isMigratingLegacyCache = false;
async function migrateLegacyCacheIfNeeded(): Promise<void> {
  if (isMigratingLegacyCache || !fs.existsSync(CACHE_FILE)) return;
  isMigratingLegacyCache = true;

  try {
    const raw = await fs.promises.readFile(CACHE_FILE, "utf-8");
    if (!raw.trim()) return;

    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      const entries = Object.entries(data);
      for (const [key, val] of entries) {
        if (typeof val === "string" && val.trim().length > 0) {
          await writeShardToDisk(key, val);
        }
      }
      // Rename legacy file to avoid re-migration and prevent future monolithic disk bloating
      const migratedBackup = `${CACHE_FILE}.migrated`;
      await fs.promises.rename(CACHE_FILE, migratedBackup);
      console.log(`[TEXT EXTRACTOR] Succesvol ${entries.length} documenten gemigreerd naar individuele text-shards.`);
    }
  } catch (err) {
    console.warn("[TEXT EXTRACTOR] Fout bij migreren van legacy cache bestand:", err);
  } finally {
    isMigratingLegacyCache = false;
  }
}

// Trigger asynchronous background migration if legacy cache file is found
setTimeout(() => {
  migrateLegacyCacheIfNeeded().catch(() => {});
}, 100);

/**
 * Save text cache hook (maintained for backwards compatibility).
 * Shards are now persisted per-document asynchronously and atomically.
 */
export function saveCache(_immediate = false): void {
  // Shards are persisted atomically upon extraction; no monolithic JSON.stringify is needed.
}

/**
 * Find absolute file path for a given filename
 */
export function resolveDocumentPath(filename: string): string | null {
  if (!filename) return null;
  const p1 = path.join(DOCUMENTS_DIR, filename);
  if (fs.existsSync(p1)) return p1;

  const p2 = path.join(DIST_DOCUMENTS_DIR, filename);
  if (fs.existsSync(p2)) return p2;

  // Case-insensitive check
  try {
    if (fs.existsSync(DOCUMENTS_DIR)) {
      const list = fs.readdirSync(DOCUMENTS_DIR);
      const targetLower = filename.toLowerCase();
      const found = list.find((f) => f.toLowerCase() === targetLower);
      if (found) return path.join(DOCUMENTS_DIR, found);
    }
  } catch {
    // Ignore error
  }
  return null;
}

/**
 * Safely parse a PDF buffer using isolated worker threads (offloads from main event loop)
 */
export async function parsePdfBuffer(buf: Buffer): Promise<string> {
  if (!buf || buf.length === 0) return "";

  // 1. Primary path: parse in dedicated worker thread (0ms main event loop blocking)
  try {
    const workerText = await parsePdfBufferInWorker(buf);
    if (workerText && workerText.trim().length > 0) {
      return workerText.trim();
    }
  } catch (workerErr: any) {
    console.warn("[TEXT EXTRACTOR] Worker thread parse failed, falling back to local:", workerErr?.message);
  }

  // 2. In-process fallback if worker pool is unavailable
  try {
    const pdfParseModule = await import("pdf-parse");
    const pdfDefault = (pdfParseModule as any).default || pdfParseModule;
    const PDFParseClass = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default?.PDFParse;

    let extractedText = "";

    // 1. Try PDFParse class constructor if explicitly exported
    if (PDFParseClass && typeof PDFParseClass === "function") {
      try {
        const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        const parser = new PDFParseClass(u8);
        if (typeof parser.getText === "function") {
          const res = await parser.getText();
          if (res?.text) extractedText = String(res.text);
          else if (typeof res === "string") extractedText = res;
        } else if (typeof parser.parse === "function") {
          const res = await parser.parse();
          if (res?.text) extractedText = String(res.text);
        }
        if (typeof parser.destroy === "function") {
          try { await parser.destroy(); } catch (_) {}
        }
      } catch (_e1) {
        // ignore
      }
    }

    // 2. Try pdfDefault as function or class constructor
    if (!extractedText && typeof pdfDefault === "function") {
      try {
        const res = await (pdfDefault as (...args: any[]) => any)(buf);
        if (res?.text) extractedText = String(res.text);
        else if (typeof res === "string") extractedText = res;
      } catch (fnErr: any) {
        // ignore
      }
    }

    if (extractedText && extractedText.trim().length > 0) {
      return extractedText.trim();
    }
  } catch (err) {
    console.warn("[TEXT EXTRACTOR] PDF parsing failed:", err);
  }

  return "";
}

/**
 * Extract text from a document buffer or file (Offloaded to worker thread)
 */
export async function extractTextFromFile(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) return "";

  const ext = path.extname(filePath).toLowerCase();

  // Plain text / markdown / CSV / JSON
  if (ext === ".txt" || ext === ".md" || ext === ".csv" || ext === ".json") {
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch {
      return "";
    }
  }

  // PDF extraction: isolated worker thread with fallback
  if (ext === ".pdf") {
    try {
      const workerText = await extractPdfFileInWorker(filePath);
      if (workerText && workerText.trim().length > 0) {
        return workerText.trim();
      }
    } catch (workerErr: any) {
      console.warn(`[TEXT EXTRACTOR] Worker thread failed for ${path.basename(filePath)}, retrying buffer:`, workerErr?.message);
    }

    try {
      const buf = fs.readFileSync(filePath);
      return await parsePdfBuffer(buf);
    } catch (err) {
      console.warn(`[TEXT EXTRACTOR] PDF extraction failed for ${path.basename(filePath)}:`, err);
    }
  }

  return "";
}

/**
 * Get or extract text content for a document
 */
export async function getDocumentContent(filename: string): Promise<string> {
  if (!filename) return "";

  const key = filename.toLowerCase();

  // 1. Check in-memory bounded LRU cache
  if (textCache.has(key)) {
    return textCache.get(key) || "";
  }

  // 2. Check on-disk per-document shard (.text-cache/<sha256>.txt)
  const cachedShard = await readShardFromDisk(key);
  if (cachedShard) {
    textCache.set(key, cachedShard);
    return cachedShard;
  }

  // 3. Resolve local document file and extract
  const filePath = resolveDocumentPath(filename);
  if (!filePath) return "";

  try {
    const text = await extractTextFromFile(filePath);
    if (text && text.trim().length > 0) {
      textCache.set(key, text);
      await writeShardToDisk(key, text);
    }
    return text;
  } catch (err) {
    console.warn(`[TEXT EXTRACTOR] Error indexing ${filename}:`, err);
    return "";
  }
}

/**
 * Clean & normalize text for exact phrase matching
 */
export function normalizeForSearch(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract context snippet with the exact matching phrase
 */
export function extractExactHitSnippet(
  fullText: string,
  rawQuery: string,
  snippetLength = 160
): { snippet: string; matched: boolean } {
  if (!fullText || !rawQuery) return { snippet: "", matched: false };

  const normQuery = normalizeForSearch(rawQuery);
  if (!normQuery) return { snippet: "", matched: false };

  // To preserve original casing in snippet, find position in normalized text
  const cleanFull = fullText.replace(/\r?\n+/g, " ");
  const normFull = cleanFull.toLowerCase();

  const index = normFull.indexOf(normQuery);
  if (index === -1) {
    return { snippet: "", matched: false };
  }

  // Calculate snippet window
  const half = Math.floor((snippetLength - normQuery.length) / 2);
  const start = Math.max(0, index - half);
  const end = Math.min(cleanFull.length, index + normQuery.length + half);

  const prefix = start > 0 ? "..." : "";
  const suffix = end < cleanFull.length ? "..." : "";

  const matchedPart = cleanFull.substring(index, index + normQuery.length);
  const beforePart = cleanFull.substring(start, index);
  const afterPart = cleanFull.substring(index + normQuery.length, end);

  // Return HTML snippet with styled highlight mark
  const snippet = `${prefix}${escapeHtml(beforePart)}<mark class="bg-amber-200 text-amber-950 dark:bg-amber-500/30 dark:text-amber-200 px-1 py-0.5 rounded font-bold">${escapeHtml(
    matchedPart
  )}</mark>${escapeHtml(afterPart)}${suffix}`;

  return { snippet, matched: true };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface FetchRetryOptions {
  maxRetries?: number;
  timeoutMs?: number;
  initialBackoffMs?: number;
}

/**
 * FIX 3: Resilient HTTP download client with exponential backoff, jitter, and error discrimination.
 * Prevents silent document holes caused by transient network glitches or slow responses from iBabs.
 */
async function fetchPdfWithRetry(
  url: string,
  docTitle = "",
  options: FetchRetryOptions = {}
): Promise<Buffer | null> {
  const maxRetries = options.maxRetries ?? 3;
  const timeoutMs = options.timeoutMs ?? 15000; // 15 seconds per attempt
  const initialBackoffMs = options.initialBackoffMs ?? 1200;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LijstVanAndel/1.0",
          "Accept": "application/pdf,*/*",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutHandle);

      if (res.ok) {
        const ab = await res.arrayBuffer();
        const buf = Buffer.from(ab);
        if (buf.length > 0) {
          return buf;
        }
      }

      // If HTTP 404 or 410, file doesn't exist on server; stop immediately
      if (res.status === 404 || res.status === 410) {
        console.warn(`[TEXT EXTRACTOR] Document niet gevonden (HTTP ${res.status}) voor '${docTitle}': ${url}`);
        return null;
      }

      console.warn(`[TEXT EXTRACTOR] Download poging ${attempt}/${maxRetries} mislukt (HTTP ${res.status}) voor '${docTitle}'`);
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      const isAbort = err?.name === "AbortError" || String(err).includes("abort");
      const errReason = isAbort ? `timeout na ${timeoutMs / 1000}s` : (err?.message || String(err));
      console.warn(`[TEXT EXTRACTOR] Download poging ${attempt}/${maxRetries} fout (${errReason}) voor '${docTitle}'`);
    }

    // Wait with exponential backoff and randomized jitter before next attempt
    if (attempt < maxRetries) {
      const jitter = Math.floor(Math.random() * 400);
      const delay = Math.round(initialBackoffMs * Math.pow(1.8, attempt - 1)) + jitter;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.warn(`[TEXT EXTRACTOR] Alle ${maxRetries} downloadpogingen mislukt voor '${docTitle}' (${url}).`);
  return null;
}

/**
 * Get or extract text content from a CouncilDocument (local or remote iBabs PDF)
 */
export async function getCouncilDocumentContent(doc: {
  id?: string;
  title?: string;
  url?: string;
}): Promise<string> {
  if (!doc) return "";

  const cacheKey = (doc.id || doc.url || doc.title || "").toLowerCase();

  // 1. Check in-memory bounded LRU cache
  if (cacheKey && textCache.has(cacheKey)) {
    return textCache.get(cacheKey) || "";
  }
  if (doc.title && textCache.has(doc.title.toLowerCase())) {
    return textCache.get(doc.title.toLowerCase()) || "";
  }

  // 2. Check disk shards
  if (cacheKey) {
    const shard = await readShardFromDisk(cacheKey);
    if (shard) {
      textCache.set(cacheKey, shard);
      return shard;
    }
  }
  if (doc.title) {
    const shard = await readShardFromDisk(doc.title.toLowerCase());
    if (shard) {
      textCache.set(doc.title.toLowerCase(), shard);
      if (cacheKey) textCache.set(cacheKey, shard);
      return shard;
    }
  }

  // 3. Try resolving locally if filename can be deduced
  if (doc.title) {
    const localContent = await getDocumentContent(doc.title);
    if (localContent) {
      if (cacheKey) {
        textCache.set(cacheKey, localContent);
        await writeShardToDisk(cacheKey, localContent);
      }
      return localContent;
    }
  }

  // 4. If URL points to local uploads, parse directly from filesystem without network call
  if (doc.url && (doc.url.startsWith("/uploads/") || doc.url.startsWith("/public/uploads/"))) {
    const cleanRel = doc.url.replace(/^\/(public\/)?/, "");
    const localFile = path.join(process.cwd(), "public", cleanRel);
    if (fs.existsSync(localFile)) {
      const text = await extractTextFromFile(localFile);
      if (text) {
        if (cacheKey) {
          textCache.set(cacheKey, text);
          await writeShardToDisk(cacheKey, text);
        }
        if (doc.title) {
          textCache.set(doc.title.toLowerCase(), text);
          await writeShardToDisk(doc.title.toLowerCase(), text);
        }
        return text;
      }
    }
  }

  // 5. If remote URL, fetch document with resilience (retry + exponential backoff)
  if (doc.url && (doc.url.startsWith("http") || doc.url.startsWith("/"))) {
    const BASE_STEENWIJK = "https://steenwijkerland.bestuurlijkeinformatie.nl";
    let targetUrl = doc.url.startsWith("/") ? `${BASE_STEENWIJK}${doc.url}` : doc.url;

    try {
      const parsed = new URL(targetUrl);
      const docId = parsed.searchParams.get("documentId");
      const agendaItemId = parsed.searchParams.get("agendaItemId");
      if (docId && agendaItemId && (parsed.pathname.includes("/Agenda/Document") || parsed.pathname.includes("/Document"))) {
        targetUrl = `${BASE_STEENWIJK}/Document/LoadAgendaItemDocument/${docId}?agendaItemId=${agendaItemId}`;
      }
    } catch {
      // use targetUrl as-is
    }

    const pdfBuf = await fetchPdfWithRetry(targetUrl, doc.title || targetUrl, {
      maxRetries: 3,
      timeoutMs: 15000,
      initialBackoffMs: 1200,
    });

    if (pdfBuf && pdfBuf.length > 0) {
      try {
        const extractedText = await parsePdfBuffer(pdfBuf);
        if (extractedText && extractedText.trim().length > 0) {
          const cleanText = extractedText.replace(/\r\n/g, "\n").trim();
          if (cacheKey) {
            textCache.set(cacheKey, cleanText);
            await writeShardToDisk(cacheKey, cleanText);
          }
          if (doc.title) {
            textCache.set(doc.title.toLowerCase(), cleanText);
            await writeShardToDisk(doc.title.toLowerCase(), cleanText);
          }
          return cleanText;
        }
      } catch (parseErr) {
        console.warn(`[TEXT EXTRACTOR] Fout bij parsen van PDF voor '${doc.title}':`, parseErr);
      }
    }
  }

  // If extraction failed or file was unreadable, do NOT poison cache with empty string!
  return "";
}

// Background indexing queue to avoid memory and CPU saturation on bulk uploads
interface IndexQueueItem {
  filename: string;
  filePath?: string;
}

const indexQueue: IndexQueueItem[] = [];
let isProcessingIndexQueue = false;

async function processNextInQueue(): Promise<void> {
  if (isProcessingIndexQueue || indexQueue.length === 0) return;
  isProcessingIndexQueue = true;

  try {
    while (indexQueue.length > 0) {
      const item = indexQueue.shift();
      if (!item) continue;

      try {
        const key = item.filename.toLowerCase();
        if (textCache.has(key)) {
          // Already in memory
          continue;
        }
        const shard = await readShardFromDisk(key);
        if (shard) {
          textCache.set(key, shard);
          continue;
        }

        const targetPath = item.filePath || resolveDocumentPath(item.filename);
        if (targetPath && fs.existsSync(targetPath)) {
          const text = await extractTextFromFile(targetPath);
          if (text) {
            textCache.set(key, text);
            await writeShardToDisk(key, text);
          }
        }
      } catch (itemErr) {
        console.warn(`[TEXT EXTRACTOR] Fout bij indexeren ${item.filename}:`, itemErr);
      }

      // Small 15ms pause between documents to yield event loop and garbage collect
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  } finally {
    isProcessingIndexQueue = false;
  }
}

/**
 * Asynchronously index a single newly uploaded document (enqueued safely)
 */
export async function indexUploadedFile(filename: string, filePath?: string): Promise<void> {
  if (!filename) return;
  const key = filename.toLowerCase();
  if (textCache.has(key)) return;

  indexQueue.push({ filename, filePath });
  // Start queue runner in background
  setTimeout(() => {
    processNextInQueue().catch((err) => {
      console.warn("[TEXT EXTRACTOR QUEUE ERROR]:", err);
    });
  }, 10);
}
