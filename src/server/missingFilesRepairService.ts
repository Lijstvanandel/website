import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { getDbFromSqlite } from "./sqliteDatabase.js";
import { getMissingCouncilDocuments } from "./dossierManager.js";

const ROOT_DOCS_DIR = path.join(process.cwd(), "public", "uploads", "documents");
const WATERSCHAP_DOCS_DIR = path.join(ROOT_DOCS_DIR, "waterschap");
const OVERIJSSEL_DOCS_DIR = path.join(ROOT_DOCS_DIR, "overijssel");

const DIST_ROOT_DOCS_DIR = path.join(process.cwd(), "dist", "uploads", "documents");
const DIST_WATERSCHAP_DOCS_DIR = path.join(DIST_ROOT_DOCS_DIR, "waterschap");
const DIST_OVERIJSSEL_DOCS_DIR = path.join(DIST_ROOT_DOCS_DIR, "overijssel");

// Ensure all target directories exist
function ensureDirectories() {
  const dirs = [
    ROOT_DOCS_DIR,
    WATERSCHAP_DOCS_DIR,
    OVERIJSSEL_DOCS_DIR,
    DIST_ROOT_DOCS_DIR,
    DIST_WATERSCHAP_DOCS_DIR,
    DIST_OVERIJSSEL_DOCS_DIR,
  ];
  dirs.forEach((dir) => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      // Ignore if cannot create
    }
  });
}

export interface RepairLogEntry {
  timestamp: string;
  filename: string;
  type: "success" | "warning" | "error" | "info";
  message: string;
  sourceUrl?: string;
  sizeBytes?: number;
}

export interface MissingFilesRepairState {
  isRunning: boolean;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  alreadyExisted: number;
  currentFilename: string;
  startTime: number | null;
  endTime: number | null;
  logs: RepairLogEntry[];
}

let repairState: MissingFilesRepairState = {
  isRunning: false,
  total: 0,
  processed: 0,
  successful: 0,
  failed: 0,
  alreadyExisted: 0,
  currentFilename: "",
  startTime: null,
  endTime: null,
  logs: [],
};

let abortController: AbortController | null = null;

function addLog(entry: Omit<RepairLogEntry, "timestamp">) {
  const log: RepairLogEntry = {
    ...entry,
    timestamp: new Date().toLocaleTimeString("nl-NL"),
  };
  repairState.logs.unshift(log);
  if (repairState.logs.length > 250) {
    repairState.logs.pop();
  }
}

/**
 * Robust HTTP/HTTPS GET buffer downloader that handles redirects, custom headers and timeouts.
 */
async function fetchBinaryBuffer(urlStr: string, maxRedirects = 5, timeoutMs = 25000): Promise<Buffer | null> {
  return new Promise((resolve) => {
    if (maxRedirects < 0) return resolve(null);

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(urlStr);
    } catch {
      return resolve(null);
    }

    const client = parsedUrl.protocol === "https:" ? https : http;
    const req = client.get(
      urlStr,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/pdf,application/octet-stream,*/*",
        },
        timeout: timeoutMs,
      },
      (res) => {
        // Handle 3xx Redirects
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const redirectUrl = new URL(res.headers.location, urlStr).toString();
          req.destroy();
          fetchBinaryBuffer(redirectUrl, maxRedirects - 1, timeoutMs).then(resolve);
          return;
        }

        if (res.statusCode !== 200) {
          req.destroy();
          return resolve(null);
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          // Check if buffer is non-empty
          if (buffer.length < 100) return resolve(null);

          // Check if it's HTML error page instead of PDF
          const preview = buffer.subarray(0, 100).toString("utf-8").toLowerCase();
          if (preview.includes("<!doctype html") || preview.includes("<html")) {
            return resolve(null);
          }

          resolve(buffer);
        });
        res.on("error", () => resolve(null));
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.on("error", () => resolve(null));
  });
}

/**
 * Determine the local target path for a given missing filename.
 */
function resolveLocalTargetPaths(filename: string): {
  category: "overijssel" | "waterschap" | "steenwijkerland";
  cleanName: string;
  primaryPath: string;
  distPath: string;
} {
  ensureDirectories();
  const lower = filename.toLowerCase().trim();

  if (lower.startsWith("overijssel/") || lower.includes("overijssel_")) {
    const cleanName = filename.replace(/^overijssel\//i, "");
    return {
      category: "overijssel",
      cleanName,
      primaryPath: path.join(OVERIJSSEL_DOCS_DIR, cleanName),
      distPath: path.join(DIST_OVERIJSSEL_DOCS_DIR, cleanName),
    };
  }

  if (lower.startsWith("waterschap/") || lower.includes("wdodelta")) {
    const cleanName = filename.replace(/^waterschap\//i, "");
    return {
      category: "waterschap",
      cleanName,
      primaryPath: path.join(WATERSCHAP_DOCS_DIR, cleanName),
      distPath: path.join(DIST_WATERSCHAP_DOCS_DIR, cleanName),
    };
  }

  // Default: Steenwijkerland council documents
  const cleanName = filename.replace(/^documents\//i, "");
  return {
    category: "steenwijkerland",
    cleanName,
    primaryPath: path.join(ROOT_DOCS_DIR, cleanName),
    distPath: path.join(DIST_ROOT_DOCS_DIR, cleanName),
  };
}

/**
 * Extract document ID and candidate download URLs for a given filename.
 */
function getCandidateDownloadUrls(filename: string, category: "overijssel" | "waterschap" | "steenwijkerland"): {
  docId: string | null;
  urls: string[];
} {
  const urls: string[] = [];
  let docId: string | null = null;

  // 1. Overijssel patterns: overijssel_16379109.pdf or 16379109
  const ovMatch = filename.match(/overijssel_(\d+)/i);
  if (ovMatch) {
    docId = ovMatch[1];
  }

  // 2. Date-prefixed NotuBiz ID pattern: 2021-02-16_1824_05-A... or 2021-01-27_9601218_...
  if (!docId) {
    const dateIdMatch = filename.match(/\d{4}-\d{2}-\d{2}_(\d+)_/);
    if (dateIdMatch) {
      docId = dateIdMatch[1];
    }
  }

  // 3. Fallback: Any isolated 4-9 digit number in the filename
  if (!docId) {
    const genericIdMatch = filename.match(/(?:^|[^\d])(\d{4,9})(?:[^\d]|$)/);
    if (genericIdMatch) {
      docId = genericIdMatch[1];
    }
  }

  if (!docId) {
    return { docId: null, urls: [] };
  }

  if (category === "overijssel") {
    urls.push(`https://api.notubiz.nl/document/${docId}/1`);
    urls.push(`https://api.notubiz.nl/documents/${docId}/download`);
    urls.push(`https://statenvergaderingen.overijssel.nl/document/${docId}`);
    urls.push(`https://api.notubiz.nl/document/${docId}`);
  } else if (category === "waterschap") {
    urls.push(`https://bestuursinformatie.wdodelta.nl/api/v2/documents/${docId}/download`);
    urls.push(`https://api.notubiz.nl/document/${docId}/1`);
    urls.push(`https://api.notubiz.nl/documents/${docId}/download`);
    urls.push(`https://api.notubiz.nl/document/${docId}`);
  } else {
    // Steenwijkerland / Gemeente
    urls.push(`https://api.notubiz.nl/document/${docId}/1`);
    urls.push(`https://api.notubiz.nl/documents/${docId}/download?version=1`);
    urls.push(`https://api.notubiz.nl/documents/${docId}/download`);
    urls.push(`https://steenwijkerland.notubiz.nl/document/${docId}`);
    urls.push(`https://api.notubiz.nl/document/${docId}`);
  }

  return { docId, urls };
}

/**
 * Downloads a single missing file by trying open scraper API endpoints.
 */
export async function repairSingleMissingFile(filename: string): Promise<{
  success: boolean;
  filename: string;
  docId: string | null;
  savedPath?: string;
  sizeBytes?: number;
  urlUsed?: string;
  message?: string;
}> {
  const { category, cleanName, primaryPath, distPath } = resolveLocalTargetPaths(filename);

  // Check if file already exists physically
  if (fs.existsSync(primaryPath)) {
    const stat = fs.statSync(primaryPath);
    if (stat.size > 200) {
      // Ensure it is also synced to dist if dist exists
      try {
        if (!fs.existsSync(distPath) && fs.existsSync(path.dirname(distPath))) {
          fs.copyFileSync(primaryPath, distPath);
        }
      } catch {}

      return {
        success: true,
        filename,
        docId: null,
        savedPath: primaryPath,
        sizeBytes: stat.size,
        message: "Bestand was al fysiek aanwezig op server",
      };
    }
  }

  const { docId, urls } = getCandidateDownloadUrls(filename, category);
  if (!docId || urls.length === 0) {
    return {
      success: false,
      filename,
      docId: null,
      message: "Geen document ID kunnen herleiden uit de bestandsnaam",
    };
  }

  // Try candidate URLs in order
  for (const candidateUrl of urls) {
    try {
      const buffer = await fetchBinaryBuffer(candidateUrl, 5, 20000);
      if (buffer && buffer.length > 200) {
        // Save to public uploads
        fs.writeFileSync(primaryPath, buffer);

        // Mirror to dist uploads if available
        try {
          fs.writeFileSync(distPath, buffer);
        } catch {
          // Ignore dist write if dist folder isn't built yet
        }

        return {
          success: true,
          filename,
          docId,
          savedPath: primaryPath,
          sizeBytes: buffer.length,
          urlUsed: candidateUrl,
          message: `Succesvol gedownload via ${candidateUrl}`,
        };
      }
    } catch {
      // Try next candidate
    }
  }

  return {
    success: false,
    filename,
    docId,
    message: `Geen geldige PDF gevonden op de scraper endpoints (Doc ID: ${docId})`,
  };
}

/**
 * Start the batch missing files repair process in the background.
 */
export async function startMissingFilesRepair(targetFiles?: string[]): Promise<{
  started: boolean;
  message: string;
  totalToProcess: number;
}> {
  if (repairState.isRunning) {
    return {
      started: false,
      message: "Er is al een herstelproces bezig.",
      totalToProcess: repairState.total - repairState.processed,
    };
  }

  // Get current missing files list from the database / dossiers
  const db = getDbFromSqlite();
  const report = getMissingCouncilDocuments(db);

  let missingList: string[] = [];

  if (Array.isArray(targetFiles) && targetFiles.length > 0) {
    missingList = targetFiles;
  } else {
    // Unique missing filenames across all dossiers
    missingList = report.uniqueMissingFiles.map((f) => f.bestandsnaam);
  }

  if (missingList.length === 0) {
    return {
      started: false,
      message: "Er zijn momenteel geen ontbrekende bestanden geregistreerd!",
      totalToProcess: 0,
    };
  }

  abortController = new AbortController();

  repairState = {
    isRunning: true,
    total: missingList.length,
    processed: 0,
    successful: 0,
    failed: 0,
    alreadyExisted: 0,
    currentFilename: "",
    startTime: Date.now(),
    endTime: null,
    logs: [],
  };

  addLog({
    filename: "Systeem",
    type: "info",
    message: `Start automatische scraper-download voor ${missingList.length} ontbrekende bestanden...`,
  });

  // Run in background without blocking the HTTP request
  (async () => {
    try {
      for (let i = 0; i < missingList.length; i++) {
        if (abortController?.signal.aborted) {
          addLog({
            filename: "Systeem",
            type: "warning",
            message: "Het downloadproces is handmatig geannuleerd.",
          });
          break;
        }

        const filename = missingList[i];
        repairState.currentFilename = filename;

        try {
          const result = await repairSingleMissingFile(filename);
          repairState.processed++;

          if (result.success) {
            if (result.message?.includes("al fysiek aanwezig")) {
              repairState.alreadyExisted++;
              addLog({
                filename,
                type: "info",
                message: `[AL AANWEZIG] ${filename} (${Math.round((result.sizeBytes || 0) / 1024)} KB)`,
                sizeBytes: result.sizeBytes,
              });
            } else {
              repairState.successful++;
              addLog({
                filename,
                type: "success",
                message: `[GEDOWNLOAD] ${filename} (${Math.round((result.sizeBytes || 0) / 1024)} KB)`,
                sourceUrl: result.urlUsed,
                sizeBytes: result.sizeBytes,
              });
            }
          } else {
            repairState.failed++;
            addLog({
              filename,
              type: "warning",
              message: `[NIET GEVONDEN] ${filename}: ${result.message}`,
            });
          }
        } catch (err: any) {
          repairState.processed++;
          repairState.failed++;
          addLog({
            filename,
            type: "error",
            message: `[FOUT] ${err?.message || "Onbekende fout"}`,
          });
        }

        // Small delay to be polite to remote NotuBiz/iBabs servers (150ms)
        await new Promise((r) => setTimeout(r, 150));
      }
    } catch (globalErr: any) {
      addLog({
        filename: "Systeem",
        type: "error",
        message: `Kritieke fout in herstelproces: ${globalErr?.message}`,
      });
    } finally {
      repairState.isRunning = false;
      repairState.endTime = Date.now();
      repairState.currentFilename = "";
      addLog({
        filename: "Systeem",
        type: "info",
        message: `Herstelproces voltooid. ${repairState.successful} bestanden succesvol binnengehaald, ${repairState.failed} niet gevonden.`,
      });
    }
  })();

  return {
    started: true,
    message: `Herstelproces gestart voor ${missingList.length} bestanden.`,
    totalToProcess: missingList.length,
  };
}

/**
 * Cancel the running repair process.
 */
export function cancelMissingFilesRepair(): boolean {
  if (abortController && repairState.isRunning) {
    abortController.abort();
    repairState.isRunning = false;
    repairState.endTime = Date.now();
    addLog({
      filename: "Systeem",
      type: "warning",
      message: "Proces geannuleerd door beheerder.",
    });
    return true;
  }
  return false;
}

/**
 * Get current repair status.
 */
export function getMissingFilesRepairStatus(): MissingFilesRepairState {
  return { ...repairState };
}
