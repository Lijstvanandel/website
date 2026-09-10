import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

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

// Disambiguated body-text keywords (to avoid false positives on words like "in Nederland")
function matchLocalKeywordsInText(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  // High-confidence Steenwijkerland keywords that are distinct
  for (const kw of LOKAAL_KEYWORDS) {
    if (kw === "nederland") {
      // Avoid matching generic country "Nederland"
      if (/\b(buurtschap|dorp|kernen)\s+nederland\b/i.test(lower) || /\bnederland\s+\(steenwijkerland\)/i.test(lower)) {
        return "buurtschap nederland";
      }
      continue;
    }
    if (kw === "baars" || kw === "doosje" || kw === "thij" || kw === "de pol") {
      const regex = new RegExp(`\\b${kw}\\b`, "i");
      if (regex.test(lower)) return kw;
      continue;
    }

    if (lower.includes(kw)) {
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

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "LijstVanAndel-CouncilSync/1.0" },
    signal,
  });

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
  const res = await fetch(url, {
    headers: { "User-Agent": "LijstVanAndel-CouncilSync/1.0" },
    signal,
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data.meeting || null;
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

          // 2. Agenda items documents
          if (Array.isArray(meetingDetail.agenda_items)) {
            for (const item of meetingDetail.agenda_items) {
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
            }
          }

          syncState.totalDocumentsFound += candidateDocs.length;

          // Process each candidate document
          for (const cand of candidateDocs) {
            if (signal.aborted) break;
            if (!cand.documentId || !cand.url) continue;

            const docKey = `${cand.documentId}_${cand.version}`;
            if (!options?.forceRescan && existingDocMap.has(docKey)) {
              syncState.scannedDocuments++;
              continue;
            }

            // Download PDF for analysis
            let pdfBuffer: Buffer | null = null;
            try {
              const downloadUrl = cand.url.startsWith("http") ? cand.url : `https://api.notubiz.nl/document/${cand.documentId}/${cand.version}`;
              const docRes = await fetch(downloadUrl, {
                headers: { "User-Agent": "LijstVanAndel-CouncilSync/1.0" },
                signal,
              });
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
              notubiz_url: cand.url,
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
