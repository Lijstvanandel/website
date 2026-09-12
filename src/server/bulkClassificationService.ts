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
  normalizeRecord
} from "./taxonomyClassifier.js";

const METADATA_PATH = path.join(process.cwd(), "public", "data", "raadsstukken_metadata_tussentijds.json");
const DIST_METADATA_PATH = path.join(process.cwd(), "dist", "data", "raadsstukken_metadata_tussentijds.json");
const METADATA_CSV_PATH = path.join(process.cwd(), "public", "data", "raadsstukken_metadata_tussentijds.csv");
const DIST_METADATA_CSV_PATH = path.join(process.cwd(), "dist", "data", "raadsstukken_metadata_tussentijds.csv");

const ROOT_DOCS_DIR = path.join(process.cwd(), "public", "uploads", "documents");

// The 5 official recipient-oriented dossier categories
export const OFFICIAL_DOSSIERS = [...CANONICAL_HOOFDDOSSIERS];

// Lazy Gemini client
let geminiClient: GoogleGenAI | null = null;
let isGeminiQuotaExhausted = false;
let geminiQuotaExhaustedMessage = "";

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
  if (isGeminiQuotaExhausted) return null;
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
 * Scan for all PDF files recursively under public/uploads/documents
 */
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
          relativePath: relative, // e.g. "overijssel/file.pdf"
          filename: item
        });
      }
    }
  }

  traverse(ROOT_DOCS_DIR);
  return filesList;
}

/**
 * Run fallback keyword-based classifier in case Gemini fails or API key is missing
 */
export function runFallbackClassification(text: string, filename: string): Partial<RaadsstukMetadata> {
  const cleanTitle = cleanPublicTitle(filename);
  const dossier = normalizeHoofddossier("", cleanTitle, "", text);
  const subdossier = normalizeSubdossier(dossier, "", cleanTitle, "", text);
  const detectedWijken = detectWijkenKernen(cleanTitle, "", text);

  // Attempt to parse a date
  const content = (filename + " " + text).toLowerCase();
  let datum = "";
  const dateMatch = content.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (dateMatch) {
    datum = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  } else {
    const monthNames: Record<string, string> = {
      januari: "01", februari: "02", maart: "03", april: "04", mei: "05", juni: "06",
      juli: "07", augustus: "08", september: "09", oktober: "10", november: "11", december: "12"
    };
    for (const [monthName, monthNum] of Object.entries(monthNames)) {
      const regex = new RegExp(`(\\d{1,2})\\s+${monthName}\\s+(\\d{4})`, "i");
      const m = content.match(regex);
      if (m) {
        const day = m[1].padStart(2, "0");
        datum = `${m[2]}-${monthNum}-${day}`;
        break;
      }
    }
  }

  return {
    titel: cleanTitle,
    dossier,
    subdossier,
    datum: datum || new Date().toISOString().split("T")[0],
    wijk_of_kern: detectedWijken.join(", "),
    entiteiten: "",
    relaties: ""
  };
}

/**
 * Classify a document using Gemini with the exact PDF taxonomy guidelines
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

  // First 5 pages of text
  const textSample = text.substring(0, 12000);

  const prompt = `
  Analyseer het gemeenteraadsdocument/provinciaal/waterschapsdocument om de metadata te extraheren volgens de strikte taxonomie en de ontologische routeringsregels van de gemeente Steenwijkerland.

  Bestandsnaam: ${filename}
  Relatief pad: ${relativePath}

  === STRICTE CATEGORIEËN (Kies EXACT ÉÉN van de 5 hoofddossiers/leefdomeinen) ===
  1. "Ruimte, Wonen & Bereikbaarheid"
     - Bestemmingsplannen, omgevingsplannen, BOPA's, gebiedsontwikkeling, VAB, woonvisies, woningbouw, welstandsnota's, zienswijzen over bestemmingsplannen.
     - Verkeersplannen (GVVP), mobiliteitsvisie, wegenonderhoud, laadinfrastructuur, fietspaden, openbaar vervoer, bruggen, parkeervergunningen.
  2. "Klimaat, Water & Natuur"
     - Stikstofproblematiek, AERIUS, flora/faunawet, Natura 2000 (De Weerribben/Wieden), milieueffectrapportages (MER), PFAS/asbest, geurhinder/emissies (IceBear), energietransitie, zonneparken, windenergie, peilbesluiten, waterpeil, duurzaamheidsleningen.
  3. "Sociaal Domein, Zorg & Jeugd"
     - Participatiewet, schuldhulpverlening, minimabeleid, bijzondere bijstand, re-integratie, sociale werkvoorzieningen.
     - Wet maatschappelijke ondersteuning (Wmo), GGD IJsselland, gezondheidsbeleid (GALA), mantelzorgondersteuning.
     - Regionaal Serviceteam Jeugd IJsselland (RSJ), jeugdzorg, onderwijshuisvesting (IHP), asielopvang, vluchtelingen, inburgering, Spreidingswet.
  4. "Lokale Economie, Toerisme & Cultuur"
     - Bedrijventerreinen (Eeserwold, Groot Verlaat), detailhandel, toerisme/recreatie, toeristenbelasting, pachtbeleid.
     - Sportverenigingen/subsidies, musea (Stadsmuseum, Spijkervetstallen), bibliotheken, monumenten, theaters (Scala, Rabo Theater De Meenthe).
  5. "Bestuur, Financiën & Openbare Orde"
     - Algemene Plaatselijke Verordening (APV), Veiligheidsregio IJsselland (VRIJ), brandweer, politie, crisisbeheersing, ondermijning.
     - Fysiek onderhoud, riolering, openbare verlichting, begraafplaatsen, gladheidbestrijding, speelplaatsen, bomenkap.
     - Planning & Control (Programmabegroting, Jaarstukken), Belastingverordeningen, Rekenkamerverordeningen, Gemeenschappelijke Regelingen (GR).

  === SUBDOSSIER EXTRACTIE (Gebaseerd op de SKOS Matrix) ===
  Analyseer de kern/gebeurtenis uit de tekst en koppel dit aan specifieke concepten/SKOS-labels uit de volgende lijst. Combineer of kies de meest relevante als subdossier:
  - Woningbouw (Inbreiding, Streekcentrum, Architectuur, Participatie)
  - Waterkwaliteit / Peilbeheer / Natuurwetgeving / Ecologisch Herstel
  - Stikstof (Jurisprudentie, Landbouw)
  - Bestuursrechtelijke Handhaving / Procedures / Planschade
  - Infrastructuur (Onderwijs, Verkeer, Energie, Wegenonderhoud)
  - Ruimtelijke Ordening (Transformatie, Bedrijven, Buitengebied)
  - Netcongestie (Transitie, Netuitbreiding)
  - Erfgoed (Bufferzone)
  - Economie (Agrarisch, Industriële Uitbreiding)
  - Sociale Volkshuisvesting / Asielopvang / Leefbaarheid Krimp
  - Toerisme Overlast / Lokale Belastingen / Mijnbouw / Bodemdaling

  === ONTOLOGISCHE ROUTERINGSREGELS (Bypass ambtelijk jargon!) ===
  1. Gemeenschappelijke Regeling (GR) Paradox: Documenten over "GGD IJsselland" moeten naar "Sociaal Domein, Zorg & Jeugd". Documenten over "RSJ IJsselland" moeten naar "Sociaal Domein, Zorg & Jeugd". Documenten over "Omgevingsdienst IJsselland (ODIJ)" moeten naar "Klimaat, Water & Natuur" of "Bestuur, Financiën & Openbare Orde". ALLEEN statutaire of pure procesmatige financiële stukken van een GR gaan naar "Bestuur, Financiën & Openbare Orde".
  2. Zienswijzen en Inspraak: Nooit in een aparte categorie plaatsen. Routeer altijd naar het onderliggende hoofdonderwerp.
  3. Subsidies: Altijd routeren naar het beleidsdoel (bijv. subsidie voor theater De Meenthe naar "Lokale Economie, Toerisme & Cultuur").
  4. Macro-regel voor Brondata (Overijssel / Waterschap): Indien het document provinciaal of waterschapsbreed is en geen expliciete lokale kernen vermeldt, is de scope "Provinciebreed" of "Waterschapbreed", en is de wijk_of_kern leeg. Indien een specifieke kern zoals Giethoorn of Blokzijl expliciet wordt genoemd, tag deze dan.

  === WIJKEN & KERNEN ===
  Zoek naar Steenwijk (Centrum/Binnenstad, Clingenborgh, De Gagels, Nieuwe gagels, Dolderkanaal, Groot Verlaat, Oostermeenthe, Oostwijken, Paddenpoel, Kornputkwartier, Steenwijk West, Steenwijkerdiep, Torenlanden, Woldmeenthe), Barsbeek, Heetveld, Belt-Schutsloot, Blankenham, Blokzijl, De Pol, Baars, de Bult, Doosje, Eeserwold, Eesveen, Giethoorn, Ijsselham, Paasloo, Basse, Jonen, Dwarsgracht, Kalenberg, Kallenkote, Klosse, Roekebos, Dinxterveen, Kuinre, Willemsoord, Moespot, Leeuwte, Nederland, Baarlo, Oldemarkt, Onna, Ossenzijl, Scheerwolde, Sint Jansklooster, Steenwijkerwold, Witte paarden, Tuk, Vollenhove, Wanneperveen, Wetering.

  Geef de resultaten terug in EXACT dit JSON formaat:
  {
    "titel": "Korte, heldere en representatieve publiekstitel (vrij van ambtelijk jargon)",
    "dossier": "Kies exact één van de 5 hoofddossiers",
    "subdossier": "Specifiek project, wet of programma (bijv. 'IceBear', 'Omgevingsvisie', 'Spreidingswet')",
    "datum": "YYYY-MM-DD (indien geen datum vindbaar, gebruik de datum uit de bestandsnaam of de huidige datum)",
    "wijk_of_kern": "Komma-gescheiden lijst van gevonden Steenwijkerlandse wijken of kernen (bijv. 'Giethoorn' of 'Vollenhove, Blokzijl'). Laat leeg of geef 'Provinciebreed' / 'Waterschapbreed' als het om een overkoepelend provinciaal of waterschapsdocument gaat.",
    "entiteiten": "Komma-gescheiden lijst van andere betrokken overheden, partijen of organen (bijv. 'Provincie Overijssel, WDODelta, GGD IJsselland')",
    "relaties": "Komma-gescheiden lijst van expliciet genoemde eerdere documenttitels of dossierkoppelingen"
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
            dossier: { type: Type.STRING },
            subdossier: { type: Type.STRING },
            datum: { type: Type.STRING },
            wijk_of_kern: { type: Type.STRING },
            entiteiten: { type: Type.STRING },
            relaties: { type: Type.STRING }
          },
          required: ["titel", "dossier", "subdossier", "datum", "wijk_of_kern", "entiteiten", "relaties"]
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
      errMsg.includes("quota");

    if (isQuota) {
      if (!isGeminiQuotaExhausted) {
        isGeminiQuotaExhausted = true;
        geminiQuotaExhaustedMessage = "Gemini API credits opgebruikt of quota bereikt (429 RESOURCE_EXHAUSTED). Heuristische taxonomie-classificatie geactiveerd.";
        console.warn(`[BULK CLASS] ${geminiQuotaExhaustedMessage}`);
      }
    } else {
      console.warn(`[BULK CLASS] Gemini failed for ${filename}:`, errMsg);
    }
    return runFallbackClassification(text, filename);
  }

  const parsed = JSON.parse(response?.text || "{}");
  return parsed;
}

export interface ClassificationProgress {
  isRunning: boolean;
  total: number;
  processed: number;
  newlyClassified: number;
  alreadyProcessed: number;
  activeFile: string;
  logs: string[];
}

let activeProgress: ClassificationProgress = {
  isRunning: false,
  total: 0,
  processed: 0,
  newlyClassified: 0,
  alreadyProcessed: 0,
  activeFile: "",
  logs: []
};

export function getBulkClassificationStatus(): ClassificationProgress {
  return activeProgress;
}

export function cancelBulkClassification(): void {
  if (activeProgress.isRunning) {
    activeProgress.isRunning = false;
    activeProgress.logs.push("Proces geannuleerd door de gebruiker.");
  }
}

export function startBulkClassificationInBackground(options: { force?: boolean } = {}): void {
  if (activeProgress.isRunning) {
    return;
  }

  activeProgress = {
    isRunning: true,
    total: 0,
    processed: 0,
    newlyClassified: 0,
    alreadyProcessed: 0,
    activeFile: "",
    logs: ["Inladen van bestanden en metadata gestart..."]
  };

  // Run asynchronously in the background
  Promise.resolve().then(async () => {
    try {
      const currentMetadata = getRawMetadata();
      const allFiles = scanPdfFiles();
      const totalToProcess = currentMetadata.length + allFiles.length;
      activeProgress.total = totalToProcess;
      activeProgress.logs.push(`Start data-herstructurering: ${currentMetadata.length} geregistreerde raadsstukken en ${allFiles.length} serverbestanden.`);

      // 1. Reorganize & Canonicalize all existing metadata documents according to the official taxonomy
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
        reclassifiedMetadata.push(norm);
        if (norm.bestandsnaam) {
          processedFilenames.add(norm.bestandsnaam.toLowerCase().trim());
        }

        activeProgress.newlyClassified++;
        if (i % 20 === 0 || i === currentMetadata.length - 1) {
          activeProgress.logs.push(`[${activeProgress.processed}/${activeProgress.total}] Herstructureerd: "${norm.titel.substring(0, 45)}" ➔ [${norm.dossier}] / [${norm.subdossier}]`);
        }

        if (activeProgress.logs.length > 300) {
          activeProgress.logs.shift();
        }

        // Short pause to allow event loop and real-time status polling
        await new Promise((resolve) => setTimeout(resolve, 8));

        // Periodic checkpoint save every 50 items
        if (i > 0 && i % 50 === 0) {
          saveMasterMetadata(reclassifiedMetadata);
        }
      }

      // 2. Scan and classify any uploaded physical files that aren't already in metadata
      for (const file of allFiles) {
        if (!activeProgress.isRunning) {
          activeProgress.logs.push("Classificatie handmatig gestopt.");
          break;
        }

        // Yield control to the Node.js event loop to keep Express server responsive
        await new Promise((resolve) => setTimeout(resolve, 15));

        const fnLower = file.filename.toLowerCase().trim();
        activeProgress.activeFile = file.filename;
        activeProgress.processed++;

        if (!options.force && processedFilenames.has(fnLower)) {
          activeProgress.alreadyProcessed++;
          // Skip logging every single file to prevent log overflow
          if (activeProgress.processed % 50 === 0 || activeProgress.processed === allFiles.length) {
            activeProgress.logs.push(`[${activeProgress.processed}/${activeProgress.total}] Reeds verwerkt bestand overgeslagen: ${file.filename}`);
          }
          continue;
        }

        // Determine origin folder
        let origin = "Algemeen";
        if (file.relativePath.startsWith("overijssel")) {
          origin = "Provincie Overijssel";
        } else if (file.relativePath.startsWith("waterschap")) {
          origin = "Waterschap WDODelta";
        }

        const timestamp = new Date().toLocaleTimeString();
        activeProgress.logs.push(`[${timestamp}] [${activeProgress.processed}/${activeProgress.total}] Analyseren: ${file.filename} (${origin})`);
        
        // Limit log array size to prevent memory bloat
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
        if (isGeminiQuotaExhausted) {
          meta = runFallbackClassification(text, file.filename);
        } else {
          try {
            meta = await classifyWithGemini(text, file.filename, file.relativePath);
          } catch (_err) {
            meta = runFallbackClassification(text, file.filename);
          }
        }

        // Prepare complete metadata record with strict taxonomy normalization
        const record: RaadsstukMetadata = normalizeRecord({
          bestandsnaam: file.filename,
          titel: meta.titel || file.filename.replace(/\.pdf$/i, "").replace(/[_-]/g, " "),
          dossier: meta.dossier || "Bestuur, Financiën & Openbare Orde",
          subdossier: meta.subdossier || "",
          datum: meta.datum || new Date().toISOString().split("T")[0],
          wijk_of_kern: meta.wijk_of_kern || "",
          entiteiten: meta.entiteiten || (origin !== "Algemeen" ? origin : ""),
          relaties: meta.relaties || ""
        }, text);

        // Add to our current metadata list (avoid duplicates)
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
      }

      // Final complete normalization pass across all items and save everywhere (data/, sqlite, public/, dist/, csv, graph)
      const finalizedMetadata = reclassifiedMetadata.map(item => normalizeRecord(item));
      saveMasterMetadata(finalizedMetadata);

      activeProgress.logs.push(`[VOLTOOID] Herstructurering en classificatie succesvol afgerond! Totaal: ${activeProgress.processed}/${activeProgress.total}. 5 canonieke hoofddossiers en 57 subdossiers gesynchroniseerd.`);
      activeProgress.isRunning = false;
      activeProgress.activeFile = "";

    } catch (err: any) {
      console.error("[BACKGROUND BULK CLASSIFICATION ERROR]:", err);
      activeProgress.logs.push(`[FOUT] Proces afgebroken wegens kritieke fout: ${err.message || err}`);
      activeProgress.isRunning = false;
    }
  });
}

/**
 * Perform bulk classification on all pdf files in public/uploads/documents/ (recursively)
 * and update the master metadata file.
 */
export async function runBulkClassification(options: { force?: boolean } = {}): Promise<{
  totalScanned: number;
  newlyClassified: number;
  alreadyProcessed: number;
  results: Array<{ filename: string; dossier: string; title: string; origin: string }>;
}> {
  const currentMetadata = getRawMetadata().map(item => normalizeRecord(item));
  const processedSet = new Set<string>();
  currentMetadata.forEach((item) => {
    if (item.bestandsnaam) {
      processedSet.add(item.bestandsnaam.toLowerCase().trim());
    }
  });

  const allFiles = scanPdfFiles();
  const results: Array<{ filename: string; dossier: string; title: string; origin: string }> = [];

  let newlyClassified = 0;
  let alreadyProcessed = 0;

  for (const file of allFiles) {
    const fnLower = file.filename.toLowerCase().trim();
    if (!options.force && processedSet.has(fnLower)) {
      alreadyProcessed++;
      continue;
    }

    // Determine origin folder
    let origin = "Algemeen";
    if (file.relativePath.startsWith("overijssel")) {
      origin = "Provincie Overijssel";
    } else if (file.relativePath.startsWith("waterschap")) {
      origin = "Waterschap WDODelta";
    }

    console.log(`[BULK CLASS] Processing: ${file.relativePath} (${origin})`);

    let text = "";
    try {
      text = await extractTextFromFile(file.absolutePath);
    } catch (err) {
      console.warn(`[BULK CLASS] Failed text extraction for ${file.filename}:`, err);
    }

    let meta: Partial<RaadsstukMetadata> = {};
    if (isGeminiQuotaExhausted) {
      meta = runFallbackClassification(text, file.filename);
    } else {
      try {
        meta = await classifyWithGemini(text, file.filename, file.relativePath);
      } catch (_err) {
        meta = runFallbackClassification(text, file.filename);
      }
    }

    // Prepare complete metadata record
    const record: RaadsstukMetadata = normalizeRecord({
      bestandsnaam: file.filename,
      titel: meta.titel || file.filename.replace(/\.pdf$/i, ""),
      dossier: meta.dossier || "Bestuur, Financiën & Openbare Orde",
      subdossier: meta.subdossier || "",
      datum: meta.datum || new Date().toISOString().split("T")[0],
      wijk_of_kern: meta.wijk_of_kern || "",
      entiteiten: meta.entiteiten || (origin !== "Algemeen" ? origin : ""),
      relaties: meta.relaties || ""
    }, text);

    // Add to our current metadata list (avoid duplicates)
    const existingIndex = currentMetadata.findIndex(
      (item) => (item.bestandsnaam || "").toLowerCase().trim() === fnLower
    );

    if (existingIndex !== -1) {
      currentMetadata[existingIndex] = record;
    } else {
      currentMetadata.push(record);
    }

    newlyClassified++;
    results.push({
      filename: file.filename,
      dossier: record.dossier,
      title: record.titel,
      origin
    });
  }

  if (newlyClassified > 0) {
    const finalizedMetadata = currentMetadata.map(item => normalizeRecord(item));
    saveMasterMetadata(finalizedMetadata);
  }

  return {
    totalScanned: allFiles.length,
    newlyClassified,
    alreadyProcessed,
    results
  };
}
