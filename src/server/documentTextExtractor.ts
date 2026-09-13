import fs from "fs";
import path from "path";

const DOCUMENTS_DIR = path.join(process.cwd(), "public", "uploads", "documents");
const DIST_DOCUMENTS_DIR = path.join(process.cwd(), "dist", "uploads", "documents");
const CACHE_FILE = path.join(process.cwd(), "public", "uploads", "documents", ".text-index.json");

// In-memory text cache: lowercase filename -> extracted text
const textCache = new Map<string, string>();
let cacheLoaded = false;

/**
 * Load persistent text index from disk if available
 */
function loadCache(): void {
  if (cacheLoaded) return;
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (typeof data === "object" && data !== null) {
        for (const [key, val] of Object.entries(data)) {
          if (typeof val === "string") {
            textCache.set(key.toLowerCase(), val);
          }
        }
      }
    }
  } catch (err) {
    console.warn("[TEXT EXTRACTOR] Could not read cache file:", err);
  }
  cacheLoaded = true;
}

/**
 * Save text cache to disk
 */
function saveCache(): void {
  try {
    if (!fs.existsSync(DOCUMENTS_DIR)) {
      fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
    }
    const obj: Record<string, string> = {};
    for (const [k, v] of textCache.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj), "utf-8");
  } catch (err) {
    console.warn("[TEXT EXTRACTOR] Could not write cache file:", err);
  }
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
 * Safely parse a PDF buffer using pdf-parse or fallback methods
 */
export async function parsePdfBuffer(buf: Buffer): Promise<string> {
  if (!buf || buf.length === 0) return "";

  try {
    const pdfParseModule = await import("pdf-parse");
    const pdfDefault = (pdfParseModule as any).default || pdfParseModule;
    const PDFParseClass = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default?.PDFParse;

    let extractedText = "";

    // 1. Try PDFParse class constructor if explicitly exported
    if (PDFParseClass && typeof PDFParseClass === "function") {
      try {
        const parser = new PDFParseClass(buf);
        if (typeof parser.getText === "function") {
          const res = await parser.getText();
          if (res?.text) extractedText = String(res.text);
          else if (typeof res === "string") extractedText = res;
        } else if (typeof parser.parse === "function") {
          const res = await parser.parse();
          if (res?.text) extractedText = String(res.text);
        }
      } catch (_e1) {
        try {
          const parser = new PDFParseClass({ data: buf });
          if (typeof parser.getText === "function") {
            const res = await parser.getText();
            if (res?.text) extractedText = String(res.text);
          }
        } catch (_e2) {
          // Avoid calling class constructor without new
        }
      }
    }

    // 2. Try pdfDefault as function or class constructor
    if (!extractedText && typeof pdfDefault === "function") {
      try {
        // Try standard function invocation: pdfParse(buf)
        const res = await (pdfDefault as (...args: any[]) => any)(buf);
        if (res?.text) extractedText = String(res.text);
        else if (typeof res === "string") extractedText = res;
      } catch (fnErr: any) {
        const errStr = String(fnErr);
        if (errStr.includes("cannot be invoked without 'new'") || errStr.includes("Class constructor")) {
          try {
            const parser = new (pdfDefault as any)(buf);
            if (typeof parser.getText === "function") {
              const res = await parser.getText();
              if (res?.text) extractedText = String(res.text);
            } else if (typeof parser.parse === "function") {
              const res = await parser.parse();
              if (res?.text) extractedText = String(res.text);
            }
          } catch (_e3) {
            try {
              const parser = new (pdfDefault as any)({ data: buf });
              if (typeof parser.getText === "function") {
                const res = await parser.getText();
                if (res?.text) extractedText = String(res.text);
              }
            } catch (_e4) {
              // ignore parser instantiate fallback error
            }
          }
        }
      }
    }

    // 3. Fallback: try pdfParseModule(buf) directly if it's a function
    if (!extractedText && typeof (pdfParseModule as any) === "function") {
      try {
        const res = await (pdfParseModule as any)(buf);
        if (res?.text) extractedText = String(res.text);
      } catch (_e5) {
        // ignore pdfParseModule error
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
 * Extract text from a document buffer or file
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

  // PDF extraction via pdf-parse
  if (ext === ".pdf") {
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
  loadCache();

  const key = filename.toLowerCase();
  if (textCache.has(key)) {
    return textCache.get(key) || "";
  }

  const filePath = resolveDocumentPath(filename);
  if (!filePath) return "";

  try {
    const text = await extractTextFromFile(filePath);
    if (text) {
      textCache.set(key, text);
      saveCache();
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

/**
 * Get or extract text content from a CouncilDocument (local or remote iBabs PDF)
 */
export async function getCouncilDocumentContent(doc: {
  id?: string;
  title?: string;
  url?: string;
}): Promise<string> {
  if (!doc) return "";
  loadCache();

  const cacheKey = (doc.id || doc.url || doc.title || "").toLowerCase();
  if (cacheKey && textCache.has(cacheKey)) {
    return textCache.get(cacheKey) || "";
  }
  if (doc.title && textCache.has(doc.title.toLowerCase())) {
    return textCache.get(doc.title.toLowerCase()) || "";
  }

  // 1. Try resolving locally if filename can be deduced
  if (doc.title) {
    const localContent = await getDocumentContent(doc.title);
    if (localContent) {
      if (cacheKey) textCache.set(cacheKey, localContent);
      return localContent;
    }
  }

  // 2. If it has a remote URL, fetch the document and parse its text
  if (doc.url && (doc.url.startsWith("http") || doc.url.startsWith("/"))) {
    try {
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

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);

      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LijstVanAndel/1.0",
          "Accept": "application/pdf,*/*",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 0) {
          const extractedText = await parsePdfBuffer(buf);

          if (extractedText && extractedText.trim().length > 0) {
            const cleanText = extractedText.replace(/\r\n/g, "\n").trim();
            if (cacheKey) textCache.set(cacheKey, cleanText);
            if (doc.title) textCache.set(doc.title.toLowerCase(), cleanText);
            saveCache();
            return cleanText;
          }
        }
      }
    } catch (fetchErr: any) {
      console.warn(`[TEXT EXTRACTOR] Kon remote raadsstuk niet ophalen voor '${doc.title}':`, fetchErr?.message || fetchErr);
    }
  }

  return "";
}

/**
 * Asynchronously index a single newly uploaded document
 */
export async function indexUploadedFile(filename: string, filePath?: string): Promise<void> {
  try {
    loadCache();
    const targetPath = filePath || resolveDocumentPath(filename);
    if (!targetPath || !fs.existsSync(targetPath)) return;

    const text = await extractTextFromFile(targetPath);
    if (text) {
      textCache.set(filename.toLowerCase(), text);
      saveCache();
      console.log(`[TEXT EXTRACTOR] Geïndexeerd voor full-text search: ${filename} (${text.length} tekens)`);
    }
  } catch (err) {
    console.warn(`[TEXT EXTRACTOR] Fout bij indexeren ${filename}:`, err);
  }
}
