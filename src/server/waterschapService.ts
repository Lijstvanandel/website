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

// Directories for Waterschap documents and metadata
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "documents", "waterschap");
const DIST_UPLOADS_DIR = path.join(process.cwd(), "dist", "uploads", "documents", "waterschap");
const CSV_FILE_PUBLIC = path.join(process.cwd(), "public", "uploads", "documents", "raadsstukken_metadata_waterschap.csv");
const CSV_FILE_ROOT = path.join(process.cwd(), "raadsstukken_metadata_waterschap.csv");
const JSON_FILE_PUBLIC = path.join(process.cwd(), "public", "uploads", "documents", "raadsstukken_metadata_waterschap.json");

// Utility: sleep throttle (rate-limit protection)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// TRAP 1: De Zwarte Lijst (Externe gemeenten / gebieden buiten Steenwijkerland)
export const EXTERN_KEYWORDS: string[] = [
  "zwolle", "deventer", "kampen", "meppel", "hoogeveen", "coevorden", "westerveld",
  "noordenveld", "de wolden", "hardenberg", "ommelanderwijk", "dalfsen", "ommen",
  "raalte", "olst-wijhe", "staphorst", "twenterand", "midden-drenthe", "reest", "vecht",
  "enschede", "almelo", "hengelo"
];

// TRAP 1: De Witte Lijst (Geografische Matrix Steenwijkerland & Wateren in Steenwijkerland)
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
  "zuidveen",
  // Wateren & Polders Steenwijkerland
  "beulakerwijde", "belterwijde", "zwarte meer", "vollenhovermeer", "linde", "lindevallei", "giethoornse meer"
];

export interface WaterschapDocumentMetadata {
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
  scope: "Lokaal - Steenwijkerland" | "Waterschapbreed" | "Lokaal - Externe Gemeente" | "Ongeclassificeerd";
  filter_methode: string;
  reden: string;
  opslaan: boolean;
  bestandsnaam: string;
  lokaal_pad: string;
  notubiz_url: string;
  grootte_bytes: number;
  gesynchroniseerd_op: string;
}

export interface WaterschapSyncProgress {
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
  waterschapbreedCount: number;
  externCount: number;
  currentAction: string;
  logs: Array<{ timestamp: string; message: string; level: "info" | "success" | "warn" | "error" }>;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

// In-memory sync state
let syncState: WaterschapSyncProgress = {
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
  waterschapbreedCount: 0,
  externCount: 0,
  currentAction: "Inactief",
  logs: [],
  startedAt: null,
  completedAt: null,
  error: null,
};

let abortController: AbortController | null = null;

// Ensure directories exist
function ensureDirectories() {
  const dirs = [
    path.join(process.cwd(), "public", "uploads", "documents"),
    UPLOADS_DIR,
    path.join(process.cwd(), "dist", "uploads", "documents"),
    DIST_UPLOADS_DIR,
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Append log helper
function addLog(message: string, level: "info" | "success" | "warn" | "error" = "info") {
  const timestamp = new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  syncState.logs.unshift({ timestamp, message, level });
  if (syncState.logs.length > 300) {
    syncState.logs = syncState.logs.slice(0, 300);
  }
}

// Gemini AI client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({ apiKey });
  } catch {
    return null;
  }
}

// AI Classifier for Waterschap documents
async function classifyWaterschapDocumentAI(title: string, meetingTitle: string, documentType: string): Promise<{
  scope: "Lokaal - Steenwijkerland" | "Waterschapbreed" | "Lokaal - Externe Gemeente";
  filter_methode: string;
  reden: string;
  opslaan: boolean; }> {
  const textToAnalyze = `${title} ${meetingTitle} ${documentType}`.toLowerCase();

  // Check 1: Explicit Blacklist check (External municipalities/areas)
  const foundExtern = EXTERN_KEYWORDS.find((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    return regex.test(textToAnalyze);
  });

  const foundLokaal = LOKAAL_KEYWORDS.find((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    return regex.test(textToAnalyze);
  });

  if (foundLokaal && !foundExtern) {
    return {
      scope: "Lokaal - Steenwijkerland",
      filter_methode: "TRAP 1: Witte Lijst (Matrix Match)",
      reden: `Document trefwoord '${foundLokaal}' gevonden in titel/agenda`,
      opslaan: true,
    };
  }

  if (foundExtern && !foundLokaal) {
    return {
      scope: "Lokaal - Externe Gemeente",
      filter_methode: "TRAP 1: Zwarte Lijst (Exclusie Match)",
      reden: `Document trefwoord '${foundExtern}' heeft uitsluitend betrekking op extern gebied/gemeente`,
      opslaan: false,
    };
  }

  // Check 2: Gemini Flash AI Classification
  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `Je bent een beleidsanalist voor de gemeente Steenwijkerland en Waterschap Drents Overijsselse Delta (WDODelta).
Analyseer onderstaand waterschapsdocument en bepaal de geografische relevantie.

DOCUMENT DETAILS:
Titel: "${title}"
Vergadering: "${meetingTitle}"
Type: "${documentType}"

OPTIES VOOR SCOPE:
1. "Lokaal - Steenwijkerland":
   - Gaat direct over Steenwijkerland, de stad Steenwijk, Giethoorn, Vollenhove, Blokzijl, Kuinre, Oldemarkt, Weerribben-Wieden, Kops van Overijssel, of specifieke polders/dijken/wateren daarbinnen (zoals Beulakerwijde, Belterwijde, Zwarte Meer, Linde).
2. "Waterschapbreed":
   - Waterschapsbreed beleid, begroting, belastingheffingen, klimaatadaptatie, waterbeheerplan, algemeen bestuurlijk besluit of reglement dat voor het gehele beheersgebied van Waterschap Drents Overijsselse Delta geldt.
3. "Lokaal - Externe Gemeente":
   - Gaat uitsluitend over een specifieke externe gemeente of locatie buiten Steenwijkerland (bijv. Meppel, Zwolle, Kampen, Deventer, Hoogeveen, Coevorden, Westerveld).

ANTWOORD FORMAAT (JSON):
{
  "scope": "Lokaal - Steenwijkerland" | "Waterschapbreed" | "Lokaal - Externe Gemeente",
  "reden": "Korte toelichting in 1 zinsdeel"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText);

      if (parsed.scope === "Lokaal - Steenwijkerland") {
        return {
          scope: "Lokaal - Steenwijkerland",
          filter_methode: "TRAP 2: Gemini 2.5 Flash AI",
          reden: parsed.reden || "Relevant voor Steenwijkerland volgens AI analyse",
          opslaan: true,
        };
      } else if (parsed.scope === "Waterschapbreed") {
        return {
          scope: "Waterschapbreed",
          filter_methode: "TRAP 2: Gemini 2.5 Flash AI",
          reden: parsed.reden || "Algemeen waterschapsbreed beleid geldend voor het gehele werkgebied",
          opslaan: true,
        };
      } else if (parsed.scope === "Lokaal - Externe Gemeente") {
        return {
          scope: "Lokaal - Externe Gemeente",
          filter_methode: "TRAP 2: Gemini 2.5 Flash AI",
          reden: parsed.reden || "Betreft uitsluitend extern project/gemeente buiten Steenwijkerland",
          opslaan: false,
        };
      }
    } catch (err: any) {
      console.warn("Gemini AI classification fallback triggered:", err?.message);
    }
  }

  // Fallback if AI unavailable or default
  return {
    scope: "Waterschapbreed",
    filter_methode: "Heuristiek (Algemeen)",
    reden: "Algemeen waterschapsdocument (geen externe uitsluiting)",
    opslaan: true,
  };
}

// Download file helper with retry
async function downloadPdfFile(url: string, outputPath: string): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 15000 }, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            const redirectUrl = res.headers.location;
            if (redirectUrl) {
              downloadPdfFile(redirectUrl, outputPath).then(() => resolve()).catch(reject);
              return;
            }
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          const fileStream = fs.createWriteStream(outputPath);
          res.pipe(fileStream);
          fileStream.on("finish", () => {
            fileStream.close();
            resolve();
          });
          fileStream.on("error", (e) => {
            fs.unlink(outputPath, () => {});
            reject(e);
          });
        });
        req.on("error", reject);
        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Timeout"));
        });
      });

      // Verify file exists and has >0 bytes
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        return true;
      }
    } catch (e) {
      if (attempt === 3) return false;
      await sleep(1000 * attempt);
    }
  }
  return false;
}

export const getSavedWaterschapDocuments = loadWaterschapMetadata;

// Read existing metadata CSV
export function loadWaterschapMetadata(): WaterschapDocumentMetadata[] {
  ensureDirectories();
  const csvPath = fs.existsSync(CSV_FILE_PUBLIC)
    ? CSV_FILE_PUBLIC
    : fs.existsSync(CSV_FILE_ROOT)
    ? CSV_FILE_ROOT
    : null;

  if (!csvPath) return [];

  try {
    const content = fs.readFileSync(csvPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const results: WaterschapDocumentMetadata[] = [];
    const headers = lines[0].split(";").map((h) => h.replace(/^"|"$/g, "").trim());

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(";").map((c) => c.replace(/^"|"$/g, "").trim());
      if (cols.length < 5) continue;

      const record: any = {};
      headers.forEach((h, idx) => {
        record[h] = cols[idx] || "";
      });

      results.push({
        id: record.id || `doc-${i}`,
        document_id: record.document_id || "",
        version: record.version || "1",
        meeting_id: record.meeting_id || "",
        datum: record.datum || "",
        titel: record.titel || "",
        meeting_titel: record.meeting_titel || "",
        gremium_naam: record.gremium_naam || "",
        document_type: record.document_type || "",
        filetype: record.filetype || "pdf",
        scope: (record.scope as any) || "Waterschapbreed",
        filter_methode: record.filter_methode || "",
        reden: record.reden || "",
        opslaan: record.opslaan === "true" || record.opslaan === true,
        bestandsnaam: record.bestandsnaam || "",
        lokaal_pad: record.lokaal_pad || "",
        notubiz_url: record.notubiz_url || "",
        grootte_bytes: parseInt(record.grootte_bytes || "0", 10) || 0,
        gesynchroniseerd_op: record.gesynchroniseerd_op || "",
      });
    }

    return results;
  } catch (err) {
    console.error("Fout bij laden waterschap metadata CSV:", err);
    return [];
  }
}

// Write/Save metadata to CSV and JSON files
export function saveWaterschapMetadata(records: WaterschapDocumentMetadata[]) {
  ensureDirectories();

  const headers = [
    "id",
    "document_id",
    "version",
    "meeting_id",
    "datum",
    "titel",
    "meeting_titel",
    "gremium_naam",
    "document_type",
    "filetype",
    "scope",
    "filter_methode",
    "reden",
    "opslaan",
    "bestandsnaam",
    "lokaal_pad",
    "notubiz_url",
    "grootte_bytes",
    "gesynchroniseerd_op",
  ];

  const csvRows = [headers.join(";")];

  for (const r of records) {
    const row = [
      `"${r.id}"`,
      `"${r.document_id}"`,
      `"${r.version}"`,
      `"${r.meeting_id}"`,
      `"${r.datum}"`,
      `"${r.titel.replace(/"/g, '""')}"`,
      `"${r.meeting_titel.replace(/"/g, '""')}"`,
      `"${r.gremium_naam.replace(/"/g, '""')}"`,
      `"${r.document_type.replace(/"/g, '""')}"`,
      `"${r.filetype}"`,
      `"${r.scope}"`,
      `"${r.filter_methode}"`,
      `"${r.reden.replace(/"/g, '""')}"`,
      `"${r.opslaan}"`,
      `"${r.bestandsnaam.replace(/"/g, '""')}"`,
      `"${r.lokaal_pad}"`,
      `"${r.notubiz_url}"`,
      `"${r.grootte_bytes}"`,
      `"${r.gesynchroniseerd_op}"`,
    ];
    csvRows.push(row.join(";"));
  }

  const csvContent = csvRows.join("\n");

  try {
    fs.writeFileSync(CSV_FILE_PUBLIC, csvContent, "utf-8");
    fs.writeFileSync(CSV_FILE_ROOT, csvContent, "utf-8");
    fs.writeFileSync(JSON_FILE_PUBLIC, JSON.stringify(records, null, 2), "utf-8");
  } catch (e) {
    console.error("Fout bij opslaan Waterschap metadata:", e);
  }
}

// Fetch helper with JSON response
async function fetchJson(url: string): Promise<any> {
  return new Promise((resolve) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 15000 }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(d));
        } catch {
          resolve(null);
        }
      });
    }).on("error", () => resolve(null));
  });
}

/**
  * MAIN SCRAPER WORKFLOW
  * Fetches meetings & documents directly from Waterschap Drents Overijsselse Delta API:
  * Base URL: https://bestuursinformatie.wdodelta.nl/api/v2/
  */
export async function startWaterschapSync(): Promise<void> {
  if (syncState.isRunning) {
    addLog("Synchronisatie is al actief.", "warn");
    return;
  }

  ensureDirectories();
  abortController = new AbortController();
  const signal = abortController.signal;

  syncState = {
    ...syncState,
    isRunning: true,
    isPaused: false,
    startedAt: new Date().toISOString(),
    completedAt: null,
    error: null,
    processedMeetings: 0,
    scannedDocuments: 0,
    savedDocuments: 0,
    excludedDocuments: 0,
    steenwijkerlandCount: 0,
    waterschapbreedCount: 0,
    externCount: 0,
    currentAction: "Starten...",
    logs: [],
  };

  addLog("Start synchronisatie Waterschap Drents Overijsselse Delta (2021 – heden)...", "info");

  // Load existing metadata records to prevent duplicate downloads
  const existingRecords = loadWaterschapMetadata();
  const processedDocIds = new Set<string>(existingRecords.map((r) => String(r.document_id)));
  const recordsMap = new Map<string, WaterschapDocumentMetadata>(existingRecords.map((r) => [String(r.document_id), r]));

  // Count existing scopes
  existingRecords.forEach((r) => {
    if (r.scope === "Lokaal - Steenwijkerland") syncState.steenwijkerlandCount++;
    else if (r.scope === "Waterschapbreed") syncState.waterschapbreedCount++;
    else if (r.scope === "Lokaal - Externe Gemeente") syncState.externCount++;

    if (r.opslaan) syncState.savedDocuments++;
    else syncState.excludedDocuments++;
  });
  syncState.scannedDocuments = existingRecords.length;

  try {
    const targetYears = [2026, 2025, 2024, 2023, 2022, 2021];
    
    for (const year of targetYears) {
      if (signal.aborted) break;

      syncState.currentYear = year;
      syncState.currentAction = `Ophalen vergaderingen ${year}...`;
      addLog(`Ophalen vergaderingen Waterschap Drents Overijsselse Delta voor jaar ${year}...`, "info");

      const dateFrom = `${year}-01-01`;
      const dateTo = year === 2026 ? "2026-12-31" : `${year}-12-31`;

      let offset = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore && !signal.aborted) {
        const meetingsUrl = `https://bestuursinformatie.wdodelta.nl/api/v2/meetings?date_from=${dateFrom}&date_to=${dateTo}&offset=${offset}&limit=${limit}&sort=date_desc`;
        const res = await fetchJson(meetingsUrl);

        const meetings = res?.result?.meetings || [];
        if (!meetings || meetings.length === 0) {
          hasMore = false;
          break;
        }

        addLog(`Jaar ${year}: ${meetings.length} vergaderingen opgehaald (offset ${offset})...`, "info");
        syncState.totalMeetingsFound += meetings.length;

        for (const meeting of meetings) {
          if (signal.aborted) break;

          syncState.processedMeetings++;
          const meetingId = String(meeting.id || "");
          const rawDate = meeting.date || "";
          const datumStr = rawDate ? rawDate.slice(0, 10) : "";
          const meetingTitel = meeting.description
            ? meeting.description.replace(/<[^>]+>/g, "").trim().slice(0, 120)
            : meeting.meetingLabel || "Waterschapsvergadering";
          const gremiumNaam = meeting.dmu?.name || "Algemeen bestuur";

          syncState.currentAction = `Verwerken vergadering ${meetingId} (${datumStr})...`;

          // Collect all documents for this meeting (both direct & meetingitems)
          const docList: Array<{ docId: string; fileName: string; typeLabel: string; desc: string; fileSize: number; sourceUrl: string }> = [];

          // 1. Direct meeting documents
          const directDocsRes = await fetchJson(`https://bestuursinformatie.wdodelta.nl/api/v2/meetings/${meetingId}/documents`);
          const directDocs = directDocsRes?.result?.documents || [];
          for (const d of directDocs) {
            const docId = String(d.id || "");
            if (docId) {
              docList.push({
                docId,
                fileName: d.fileName || `document_${docId}.pdf`,
                typeLabel: d.documentTypeLabel || "Vergaderstuk",
                desc: d.description || d.fileName || "",
                fileSize: d.fileSize || 0,
                sourceUrl: `https://bestuursinformatie.wdodelta.nl/api/v2/documents/${docId}/download`,
              });
            }
          }

          // 2. Agenda items documents
          const itemsRes = await fetchJson(`https://bestuursinformatie.wdodelta.nl/api/v2/meetings/${meetingId}/meetingitems`);
          const items = itemsRes?.result?.meetingitems || itemsRes?.result?.meetingItems || [];
          for (const item of items) {
            if (signal.aborted) break;
            const itemId = item.id;
            if (itemId) {
              const itemDocsRes = await fetchJson(`https://bestuursinformatie.wdodelta.nl/api/v2/meetingitems/${itemId}/documents`);
              const itemDocs = itemDocsRes?.result?.documents || [];
              for (const d of itemDocs) {
                const docId = String(d.id || "");
                if (docId) {
                  docList.push({
                    docId,
                    fileName: d.fileName || `document_${docId}.pdf`,
                    typeLabel: d.documentTypeLabel || "Agendastuk",
                    desc: d.description || `${item.title || ""} - ${d.fileName || ""}`,
                    fileSize: d.fileSize || 0,
                    sourceUrl: `https://bestuursinformatie.wdodelta.nl/api/v2/documents/${docId}/download`,
                  });
                }
              }
            }
          }

          // Deduplicate document list
          const uniqueDocs = Array.from(new Map(docList.map((d) => [d.docId, d])).values());

          for (const doc of uniqueDocs) {
            if (signal.aborted) break;

            if (processedDocIds.has(doc.docId)) {
              // Already processed
              continue;
            }

            syncState.scannedDocuments++;
            const cleanTitle = (doc.desc || doc.fileName || "Waterschapsdocument").replace(/\.pdf$/i, "").trim();

            // AI/Matrix Classification
            const classification = await classifyWaterschapDocumentAI(cleanTitle, meetingTitel, doc.typeLabel);

            let localRelPath = "";
            let saved = false;

            // Generate clean filename
            const sanitizeStr = (str: string) =>
              str
                .replace(/[^a-zA-Z0-9_-]/g, "_")
                .replace(/_+/g, "_")
                .slice(0, 50);

            const safeTitle = sanitizeStr(cleanTitle);
            const safeDate = datumStr || year.toString();
            const filename = `${safeDate}_${doc.docId}_${safeTitle}.pdf`;

            if (classification.opslaan) {
              syncState.currentAction = `Downloaden PDF: ${doc.fileName}...`;
              const publicFilePath = path.join(UPLOADS_DIR, filename);
              const distFilePath = path.join(DIST_UPLOADS_DIR, filename);

              const downloadSuccess = await downloadPdfFile(doc.sourceUrl, publicFilePath);

              if (downloadSuccess) {
                saved = true;
                // Copy to dist folder as well for instant serving
                try {
                  fs.copyFileSync(publicFilePath, distFilePath);
                } catch {
                  // ignore
                }
                localRelPath = `/uploads/documents/waterschap/${filename}`;
                syncState.savedDocuments++;
                addLog(`[GEACCEPTEERD] (${classification.scope}) ${cleanTitle}`, "success");
              } else {
                addLog(`[DOWNLOAD MISLUKT] Kon PDF niet downloaden voor document ${doc.docId}`, "warn");
              }
            } else {
              syncState.excludedDocuments++;
              addLog(`[GENEGEERD] (${classification.scope}) ${cleanTitle} - ${classification.reden}`, "info");
            }

            if (classification.scope === "Lokaal - Steenwijkerland") syncState.steenwijkerlandCount++;
            else if (classification.scope === "Waterschapbreed") syncState.waterschapbreedCount++;
            else if (classification.scope === "Lokaal - Externe Gemeente") syncState.externCount++;

            const newRecord: WaterschapDocumentMetadata = {
              id: `wdodelta-${doc.docId}`,
              document_id: doc.docId,
              version: "1",
              meeting_id: meetingId,
              datum: datumStr,
              titel: cleanTitle,
              meeting_titel: meetingTitel,
              gremium_naam: gremiumNaam,
              document_type: doc.typeLabel,
              filetype: "pdf",
              scope: classification.scope,
              filter_methode: classification.filter_methode,
              reden: classification.reden,
              opslaan: saved,
              bestandsnaam: filename,
              lokaal_pad: localRelPath,
              notubiz_url: `https://bestuursinformatie.wdodelta.nl/api/v2/documents/${doc.docId}/download`,
              grootte_bytes: doc.fileSize,
              gesynchroniseerd_op: new Date().toISOString(),
            };

            processedDocIds.add(doc.docId);
            recordsMap.set(doc.docId, newRecord);

            // Periodically save metadata
            if (recordsMap.size % 5 === 0) {
              saveWaterschapMetadata(Array.from(recordsMap.values()));
            }

            // Throttle to respect Waterschap API
            await sleep(200);
          }
        }

        offset += meetings.length;
        if (meetings.length < limit) {
          hasMore = false;
        }
      }
    }

    saveWaterschapMetadata(Array.from(recordsMap.values()));

    syncState.isRunning = false;
    syncState.currentAction = "Voltooid";
    syncState.completedAt = new Date().toISOString();
    addLog(`Synchronisatie Waterschap Drents Overijsselse Delta succesvol voltooid! ${syncState.savedDocuments} relevante bestanden opgeslagen. CSV bijgewerkt.`, "success");
  } catch (err: any) {
    syncState.isRunning = false;
    syncState.currentAction = "Fout opgetreden";
    syncState.error = err?.message || String(err);
    addLog(`Fout tijdens Waterschap synchronisatie: ${syncState.error}`, "error");
  }
}

// Cancel active sync
export function cancelWaterschapSync() {
  if (abortController) {
    abortController.abort();
    syncState.isRunning = false;
    syncState.currentAction = "Geannuleerd";
    addLog("Synchronisatie door gebruiker geannuleerd.", "warn");
  }
}

// Get current sync status
export function getWaterschapSyncStatus() {
  return syncState;
}
