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

// Lazy Gemini client
let geminiClient: GoogleGenAI | null = null;
let isGeminiQuotaExhausted = false;
let geminiQuotaExhaustedMessage = "";

export const RATE_LIMIT_DELAY_MS = 1100; // ~55 requests per minute

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

// Dead Letter Queue (DLQ) voor documenten die falen in AI-classificatie
const deadLetterQueue: DeadLetterItem[] = [];

export function getDeadLetterQueue(): DeadLetterItem[] {
  return [...deadLetterQueue];
}

export function clearDeadLetterQueue(): void {
  deadLetterQueue.length = 0;
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

  // Registreer in DLQ
  deadLetterQueue.push({
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
 * Classify a document using Gemini with strict negative constraints and 7 canonical dossiers.
 */
async function classifyWithGemini(
  text: string,
  filename: string,
  relativePath: string
): Promise<Partial<RaadsstukMetadata>> {
  const ai = getGemini();
  if (!ai) {
    throw new Error("Gemini client is not initialized.");
  }

  // Kop-staart RAG extractie (8.000 inleiding + 4.000 besluit/dictum)
  const textSample = extractHeadTailText(text, 8000, 4000);

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
     - Asielopvang (COA/Spreidingswet), Jeugdzorg (RSJ), Wmo, publieke gezondheid (GGD) en armoedebeleid gaan ALTIJD naar "Sociaal Domein, Asiel & Leefbaarheid".
     - Gaswinning (Vermilion, Eesveen) en seismische monitoring gaan ALTIJD naar "Mijnbouw & Ondergrondse Opgaven".
     - Financiën (Programmabegroting, Jaarrekening, OZB), APV, politie/brandweer (VRIJ) en raadsvoorstellen gaan ALTIJD naar "Bestuur, Financiën & Juridische Zaken".

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

  let response: any = null;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
      throw new GeminiQuotaExceededError(errMsg, 60, isPrepayment);
    }
    throw err;
  }

  const parsed = JSON.parse(response?.text || "{}");
  return parsed;
}

export interface ClassificationProgress {
  isRunning: boolean;
  isPaused: boolean;
  pauseReason?: string;
  pauseRemainingSeconds?: number;
  pauseResumesAt?: string;
  ratePerMinute: number;
  total: number;
  processed: number;
  newlyClassified: number;
  alreadyProcessed: number;
  deadLetterCount: number;
  activeFile: string;
  logs: string[];
}

let activeProgress: ClassificationProgress = {
  isRunning: false,
  isPaused: false,
  pauseReason: undefined,
  pauseRemainingSeconds: 0,
  pauseResumesAt: undefined,
  ratePerMinute: 55,
  total: 0,
  processed: 0,
  newlyClassified: 0,
  alreadyProcessed: 0,
  deadLetterCount: 0,
  activeFile: "",
  logs: []
};

export function getBulkClassificationStatus(): ClassificationProgress {
  activeProgress.deadLetterCount = deadLetterQueue.length;
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

export function startBulkClassificationInBackground(options: { force?: boolean } = {}): void {
  if (activeProgress.isRunning) {
    return;
  }

  activeProgress = {
    isRunning: true,
    isPaused: false,
    pauseReason: undefined,
    pauseRemainingSeconds: 0,
    pauseResumesAt: undefined,
    ratePerMinute: 55,
    total: 0,
    processed: 0,
    newlyClassified: 0,
    alreadyProcessed: 0,
    deadLetterCount: deadLetterQueue.length,
    activeFile: "",
    logs: ["Inladen van bestanden en metadata gestart via non-blocking scan..."]
  };

  // Run asynchronously in the background
  Promise.resolve().then(async () => {
    try {
      const currentMetadata = getRawMetadata();
      const allFiles = await scanPdfFilesAsync();
      const totalToProcess = currentMetadata.length + allFiles.length;
      activeProgress.total = totalToProcess;
      activeProgress.logs.push(`Sanering & Classificatie gestart: ${currentMetadata.length} geregistreerde raadsstukken en ${allFiles.length} fysieke documenten.`);

      // 1. Saneren & normaliseren van alle bestaande documenten naar de 7 canonieke dossiers
      const processedFilenames = new Set<string>();
      const reclassifiedMetadata: RaadsstukMetadata[] = [];

      for (let i = 0; i < currentMetadata.length; i++) {
        if (!activeProgress.isRunning) {
          activeProgress.logs.push("Classificatie handmatig gestopt.");
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
      for (const file of allFiles) {
        if (!activeProgress.isRunning) {
          activeProgress.logs.push("Classificatie handmatig gestopt.");
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
        let success = false;
        let attempts = 0;
        const maxNonQuotaRetries = 3;

        // If no API key configured, use DLQ fallback
        if (!process.env.GEMINI_API_KEY) {
          meta = runFallbackClassification(text, file.filename, file.relativePath, "Geen GEMINI_API_KEY geconfigureerd");
          success = true;
        }

        while (!success && activeProgress.isRunning) {
          attempts++;
          try {
            await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
            if (!activeProgress.isRunning) break;

            meta = await classifyWithGemini(text, file.filename, file.relativePath);
            success = true;
          } catch (err: any) {
            if (err instanceof GeminiQuotaExceededError || err?.name === "GeminiQuotaExceededError") {
              const waitSeconds = err.retryAfterSeconds || 60;
              const resumeDate = new Date(Date.now() + waitSeconds * 1000);
              const resumeAt = resumeDate.toLocaleTimeString("nl-NL", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
              });

              activeProgress.isPaused = true;
              activeProgress.pauseRemainingSeconds = waitSeconds;
              activeProgress.pauseResumesAt = resumeAt;
              activeProgress.pauseReason = `Gemini API quota (429 RESOURCE_EXHAUSTED). Pauzeert ${waitSeconds}s tot ${resumeAt}...`;

              activeProgress.logs.push(`[RATE LIMIT PAUZE] ⏸️ 429 RESOURCE_EXHAUSTED. Wachten tot ${resumeAt}...`);
              if (activeProgress.logs.length > 300) activeProgress.logs.shift();

              saveMasterMetadata(reclassifiedMetadata);

              for (let sec = waitSeconds; sec > 0; sec--) {
                if (!activeProgress.isRunning) break;
                activeProgress.pauseRemainingSeconds = sec;
                await new Promise((r) => setTimeout(r, 1000));
              }

              if (!activeProgress.isRunning) break;

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
        activeProgress.logs.push(`  ↳ Succes! Indeling: "${record.dossier}" ➔ Subdossier: "${record.subdossier}"`);
        
        if (activeProgress.logs.length > 300) {
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
