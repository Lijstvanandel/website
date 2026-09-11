import fs from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { extractTextFromFile } from "./documentTextExtractor.js";
import { getRawMetadata, rebuildNetworkGraph } from "./dossierManager.js";
import { RaadsstukMetadata } from "../types/dossier.js";

const METADATA_PATH = path.join(process.cwd(), "public", "data", "raadsstukken_metadata_tussentijds.json");
const DIST_METADATA_PATH = path.join(process.cwd(), "dist", "data", "raadsstukken_metadata_tussentijds.json");
const METADATA_CSV_PATH = path.join(process.cwd(), "public", "data", "raadsstukken_metadata_tussentijds.csv");
const DIST_METADATA_CSV_PATH = path.join(process.cwd(), "dist", "data", "raadsstukken_metadata_tussentijds.csv");

const ROOT_DOCS_DIR = path.join(process.cwd(), "public", "uploads", "documents");

// The 12 official recipient-oriented dossier categories
export const OFFICIAL_DOSSIERS = [
  "Wonen, Bouwen & Ontwikkeling",
  "Natuur, Milieu & Klimaat",
  "Verkeer, Wegen & Bereikbaarheid",
  "Openbare Ruimte & Onderhoud",
  "Economie, Ondernemen & Toerisme",
  "Werk, Inkomen & Armoede",
  "Zorg, Gezondheid & Welzijn",
  "Jeugd, Gezin & Onderwijs",
  "Veiligheid, Toezicht & Handhaving",
  "Kunst, Cultuur & Sport",
  "Samenleving, Inclusie & Wijken",
  "Bestuur, Financiën & Organisatie"
];

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
  const content = (filename + " " + text).toLowerCase();
  let dossier = "Bestuur, Financiën & Organisatie"; // Default rest category

  // 1. Wonen, Bouwen & Ontwikkeling
  if (
    content.includes("bestemmingsplan") ||
    content.includes("omgevingsplan") ||
    content.includes("omgevingsvergunning") ||
    content.includes("bopa") ||
    content.includes("grondexploitatie") ||
    content.includes("woonvisie") ||
    content.includes("bouwproject") ||
    content.includes("woningbouw") ||
    content.includes("sociale woningbouw") ||
    content.includes("woning") ||
    content.includes("vab") ||
    content.includes("vrijkomende agrarische") ||
    content.includes("welstand") ||
    content.includes("ruimtelijke ordening") ||
    content.includes("ruimtelijke inrichting") ||
    content.includes("ruimtelijke ontwikkeling") ||
    content.includes("nieuwbouw") ||
    content.includes("woonwagen") ||
    content.includes("woonschepen") ||
    content.includes("kavel") ||
    content.includes("bouwlocatie") ||
    content.includes("sloop") ||
    content.includes("stadsvisie")
  ) {
    dossier = "Wonen, Bouwen & Ontwikkeling";
  }
  // 2. Natuur, Milieu & Klimaat
  else if (
    content.includes("stikstof") ||
    content.includes("aerius") ||
    content.includes("flora") ||
    content.includes("fauna") ||
    content.includes("weerribben") ||
    content.includes("wieden") ||
    content.includes("natura 2000") ||
    content.includes("duurzaam") ||
    content.includes("klimaat") ||
    content.includes("energietransitie") ||
    content.includes("zonnepark") ||
    content.includes("zonneweide") ||
    content.includes("zonnepanelen") ||
    content.includes("zonne-energie") ||
    content.includes("windenergie") ||
    content.includes("windturbine") ||
    content.includes("icebear") ||
    content.includes("emissie") ||
    content.includes("geurhinder") ||
    content.includes("luchtkwaliteit") ||
    content.includes("peilbesluit") ||
    content.includes("waterpeil") ||
    content.includes("watertoets") ||
    content.includes("waterbeheer") ||
    content.includes("wdodelta") ||
    content.includes("waterschap") ||
    content.includes("bodemverontreiniging") ||
    content.includes("bodemsanering") ||
    content.includes("pfas") ||
    content.includes("regionale energie strategie") ||
    content.includes("res") ||
    content.includes("energie-infrastructuur") ||
    content.includes("transformatorstation") ||
    content.includes("compactstation") ||
    content.includes("wet natuurbescherming") ||
    content.includes("inpassingsplan") ||
    content.includes("pip noordmanen")
  ) {
    dossier = "Natuur, Milieu & Klimaat";
  }
  // 3. Verkeer, Wegen & Bereikbaarheid
  else if (
    content.includes("gvvp") ||
    content.includes("verkeer") ||
    content.includes("wegen") ||
    content.includes("mobiliteit") ||
    content.includes("parkeer") ||
    content.includes("laadpaal") ||
    content.includes("fietspad") ||
    content.includes("fietsplan") ||
    content.includes("fietsinfrastructuur") ||
    content.includes("openbaar vervoer") ||
    content.includes("busproblemen") ||
    content.includes("buslijn") ||
    content.includes("busvervoer") ||
    content.includes("bus") ||
    content.includes("spoor") ||
    content.includes("station") ||
    content.includes("oeververbinding") ||
    content.includes("brug") ||
    content.includes("infrastructuur en verkeer") ||
    content.includes("verkeersregulering") ||
    content.includes("wegdek")
  ) {
    dossier = "Verkeer, Wegen & Bereikbaarheid";
  }
  // 4. Openbare Ruimte & Onderhoud
  else if (
    content.includes("openbare ruimte") ||
    content.includes("onderhoud maatschappelijk") ||
    content.includes("riolering") ||
    content.includes("watertaken") ||
    content.includes("verlichting") ||
    content.includes("openbare verlichting") ||
    content.includes("begraafplaats") ||
    content.includes("exoten") ||
    content.includes("gladheid") ||
    content.includes("speelplaats") ||
    content.includes("havenbeheer") ||
    content.includes("ligplaatsverbod") ||
    content.includes("bomenkap") ||
    content.includes("vastgoedonderhoud") ||
    content.includes("hemelwater")
  ) {
    dossier = "Openbare Ruimte & Onderhoud";
  }
  // 5. Economie, Ondernemen & Toerisme
  else if (
    content.includes("bedrijventerrein") ||
    content.includes("eeserwold") ||
    content.includes("groot verlaat") ||
    content.includes("ondernemen") ||
    content.includes("ondernemer") ||
    content.includes("detailhandel") ||
    content.includes("leegstand") ||
    content.includes("toerisme") ||
    content.includes("toeristenbelasting") ||
    content.includes("recreatie") ||
    content.includes("vaarverordening") ||
    content.includes("vaar- en verhuur") ||
    content.includes("horeca") ||
    content.includes("terrassen") ||
    content.includes("pachtbeleid") ||
    content.includes("agrarisch beleid") ||
    content.includes("aan huis gebonden") ||
    content.includes("bedrijfsontwikkeling")
  ) {
    dossier = "Economie, Ondernemen & Toerisme";
  }
  // 6. Werk, Inkomen & Armoede
  else if (
    content.includes("participatiewet") ||
    content.includes("schuldhulp") ||
    content.includes("armoede") ||
    content.includes("inkomen") ||
    content.includes("bijstand") ||
    content.includes("werklozen") ||
    content.includes("noordwestgroep") ||
    content.includes("studietoeslag") ||
    content.includes("cao aan de slag") ||
    content.includes("minimabeleid") ||
    content.includes("starterslening")
  ) {
    dossier = "Werk, Inkomen & Armoede";
  }
  // 7. Zorg, Gezondheid & Welzijn
  else if (
    content.includes("wmo") ||
    content.includes("zorg") ||
    content.includes("welzijn") ||
    content.includes("ggd") ||
    content.includes("ggd ijsselland") ||
    content.includes("gezondheid") ||
    content.includes("volksgezondheid") ||
    content.includes("publieke gezondheid") ||
    content.includes("gala") ||
    content.includes("infectieziekte") ||
    content.includes("mantelzorg") ||
    content.includes("beschermd wonen") ||
    content.includes("maatschappelijke opvang") ||
    content.includes("spuk")
  ) {
    dossier = "Zorg, Gezondheid & Welzijn";
  }
  // 8. Jeugd, Gezin & Onderwijs
  else if (
    content.includes("jeugd") ||
    content.includes("jeugdzorg") ||
    content.includes("jeugdhulp") ||
    content.includes("gezin") ||
    content.includes("onderwijs") ||
    content.includes("school") ||
    content.includes("scholen") ||
    content.includes("leerling") ||
    content.includes("kinderopvang") ||
    content.includes("leerplicht") ||
    content.includes("rsj") ||
    content.includes("rsj ijsselland") ||
    content.includes("onderwijshuisvesting") ||
    content.includes("leerlingenvervoer") ||
    content.includes("huiselijk geweld") ||
    content.includes("kindermishandeling")
  ) {
    dossier = "Jeugd, Gezin & Onderwijs";
  }
  // 9. Veiligheid, Toezicht & Handhaving
  else if (
    content.includes("veiligheid") ||
    content.includes("apv") ||
    content.includes("handhaving") ||
    content.includes("toezicht") ||
    content.includes("brandweer") ||
    content.includes("brandweerzorg") ||
    content.includes("politie") ||
    content.includes("cameratoezicht") ||
    content.includes("camerahandhaving") ||
    content.includes("ondermijning") ||
    content.includes("noodverordening") ||
    content.includes("veiligheidsregio") ||
    content.includes("vrij") ||
    content.includes("crisisbeheersing")
  ) {
    dossier = "Veiligheid, Toezicht & Handhaving";
  }
  // 10. Kunst, Cultuur & Sport
  else if (
    content.includes("sport") ||
    content.includes("cultuur") ||
    content.includes("kunst") ||
    content.includes("beeldende kunst") ||
    content.includes("museum") ||
    content.includes("spijkervetstallen") ||
    content.includes("stadsmuseum") ||
    content.includes("bibliotheek") ||
    content.includes("evenement") ||
    content.includes("theater") ||
    content.includes("theatersubsidie") ||
    content.includes("meenthe") ||
    content.includes("scala") ||
    content.includes("monument") ||
    content.includes("erfgoed") ||
    content.includes("kunstgras")
  ) {
    dossier = "Kunst, Cultuur & Sport";
  }
  // 11. Samenleving, Inclusie & Wijken
  else if (
    content.includes("samenleving") ||
    content.includes("inclusie") ||
    content.includes("wijken") ||
    content.includes("kernen") ||
    content.includes("dorpsplan") ||
    content.includes("asiel") ||
    content.includes("oekraïne") ||
    content.includes("opvang") ||
    content.includes("vluchtelingen") ||
    content.includes("inburgering") ||
    content.includes("spreidingswet") ||
    content.includes("burgeramendement") ||
    content.includes("burgerinitiatief") ||
    content.includes("inwonersparticipatie") ||
    content.includes("participatie") ||
    content.includes("dorpsbelang") ||
    content.includes("plaatselijk belang") ||
    content.includes("sociaal domein")
  ) {
    dossier = "Samenleving, Inclusie & Wijken";
  }
  // 12. Bestuur, Financiën & Organisatie (All else: Begrotingen, Regelingen, Rekenkamer, etc.)
  else {
    dossier = "Bestuur, Financiën & Organisatie";
  }

  // Attempt to parse a date
  let datum = "";
  const dateMatch = content.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (dateMatch) {
    datum = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  } else {
    // Try to extract year and Dutch month names
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

  // Try to find a wijk/kern
  const wijkenKernen = [
    "Steenwijk", "Blokzijl", "Giethoorn", "Vollenhove", "Oldemarkt", "Kuinre", "Willemsoord", "Tuk", "Eesveen",
    "Sint Jansklooster", "Wanneperveen", "Eeserwold", "Kalenberg", "Ossenzijl", "Scheerwolde", "Belt-Schutsloot"
  ];
  const matchedWijken: string[] = [];
  for (const wk of wijkenKernen) {
    if (content.includes(wk.toLowerCase())) {
      matchedWijken.push(wk);
    }
  }

  // Clean title
  let cleanTitle = filename.replace(/\.pdf$/i, "").replace(/[_-]/g, " ");
  // Remove leading dates or numeric IDs if present
  cleanTitle = cleanTitle.replace(/^\d{4}[-\s]\d{2}[-\s]\d{2}[\s_]*/, "").replace(/^\d{5,10}[\s_]*/, "").trim();
  if (!cleanTitle) {
    cleanTitle = filename.replace(/\.pdf$/i, "");
  }

  return {
    titel: cleanTitle,
    dossier,
    subdossier: "",
    datum: datum || new Date().toISOString().split("T")[0],
    wijk_of_kern: matchedWijken.join(", "),
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

  === STRICTE CATEGORIEËN (Kies EXACT ÉÉN van de 12 hoofddossiers) ===
  1. "Wonen, Bouwen & Ontwikkeling"
     - Bestemmingsplannen, omgevingsplannen, BOPA's, gebiedsontwikkeling, VAB (Vrijkomende Agrarische Bebouwing), woonvisies, woningbouw, welstandsnota's, zienswijzen over bestemmingsplannen.
  2. "Natuur, Milieu & Klimaat"
     - Stikstofproblematiek, AERIUS, flora/faunawet, Natura 2000 (De Weerribben/Wieden), milieueffectrapportages (MER), PFAS/asbest, geurhinder/emissies (IceBear), energietransitie, zonneparken, windenergie, peilbesluiten, waterpeil, duurzaamheidsleningen.
  3. "Verkeer, Wegen & Bereikbaarheid"
     - Verkeersplannen (GVVP), mobiliteitsvisie, wegenonderhoud, laadinfrastructuur, fietspaden, openbaar vervoer, bruggen, parkeervergunningen.
  4. "Openbare Ruimte & Onderhoud"
     - Fysiek onderhoud, riolering, Watertakenplan, openbare verlichting, begraafplaatsen, exotenbestrijding (processierups, duizendknoop), gladheidbestrijding, speelplaatsen, havenbeheer.
  5. "Economie, Ondernemen & Toerisme"
     - Bedrijventerreinen (Eeserwold, Groot Verlaat), detailhandel, binnenstad leegstand, supermarkten, toerisme/recreatie, toeristenbelasting, citymarketing, vaarverordening, vaar- en verhuurbeleid, terrassenbeleid, BIZ Steenwijk.
  6. "Werk, Inkomen & Armoede"
     - Participatiewet, IGSD, NoordWestGroep, schuldhulpverlening, problematische schulden, minimabeleid, bijzondere bijstand, re-integratie, Toeslagenaffaire, sociale werkvoorzieningen.
  7. "Zorg, Gezondheid & Welzijn"
     - Wet maatschappelijke ondersteuning (Wmo), huishoudelijke hulp, beschermd wonen, GGD IJsselland, gezondheidsbeleid (GALA), preventieakkoorden, infectieziekten (COVID-19), mantelzorgondersteuning, zorgallianties.
  8. "Jeugd, Gezin & Onderwijs"
     - Regionaal Serviceteam Jeugd IJsselland (RSJ), Jeugdwet, jeugdzorg, jeugdhulp, Integraal Huisvestingsplan Onderwijs (IHP), nieuwbouw/sluiting scholen, leerlingenvervoer, kinderopvang, Leerplichtwet, laaggeletterdheid.
  9. "Veiligheid, Toezicht & Handhaving"
     - Algemene Plaatselijke Verordening (APV), Veiligheidsregio IJsselland (VRIJ), brandweer, politiecapaciteit, veiligheidsplannen, crisisbeheersing/noodverordeningen, ondermijning, cameratoezicht, wegsleepverordening, handhaving omgevingsrecht (VTH-taken).
  10. "Kunst, Cultuur & Sport"
      - Sportverenigingen/subsidies, zwembaden, musea (Stadsmuseum, Spijkervetstallen), bibliotheken, monumenten, Commissie Beeldende Kunst, evenementenvergunningen (Dicky Woodstock), theaters (Scala, Rabo Theater De Meenthe), cultuursubsidies.
  11. "Samenleving, Inclusie & Wijken"
      - Kernenbeleid, dorpsplannen, Matrix dorpsplannen, Plaatselijk Belangen, wijkverenigingen, bewonersinitiatieven, asielopvang, vluchtelingen, inburgering, Lokale Inclusie Agenda, VN-verdrag Handicap, Spreidingswet.
  12. "Bestuur, Financiën & Organisatie"
      - Planning & Control (Programmabegroting, Perspectiefnota (PPN), Najaarsnota, Voorjaarsnota, Jaarstukken), Belastingverordeningen (OZB, Rioolheffing, Hondenbelasting), ambtelijk apparaat, Rekenkamerverordeningen, Wob/Woo verzoeken, verkiezingen, archiefbeheer, wijziging van statuten of financiële structuur van een Gemeenschappelijke Regeling, Algemene Subsidieverordening (ASV).

  === ONTOLOGISCHE ROUTERINGSREGELS (Bypass ambtelijk jargon!) ===
  1. Gemeenschappelijke Regeling (GR) Paradox: Documenten over "GGD IJsselland" moeten naar "Zorg, Gezondheid & Welzijn". Documenten over "RSJ IJsselland" moeten naar "Jeugd, Gezin & Onderwijs". Documenten over "Omgevingsdienst IJsselland (ODIJ)" moeten naar "Natuur, Milieu & Klimaat" of "Veiligheid, Toezicht & Handhaving". ALLEEN statutaire of pure procesmatige financiële stukken van een GR gaan naar "Bestuur, Financiën & Organisatie".
  2. Zienswijzen en Inspraak: Nooit in een aparte categorie plaatsen. Routeer altijd naar het onderliggende hoofdonderwerp (bijv. zienswijze op bestemmingsplan gaat naar "Wonen, Bouwen & Ontwikkeling"; zienswijze over bomen kappen gaat naar "Natuur, Milieu & Klimaat").
  3. Subsidies: Altijd routeren naar het beleidsdoel (bijv. subsidie voor theater De Meenthe naar "Kunst, Cultuur & Sport"; subsidie voor woningisolatie naar "Natuur, Milieu & Klimaat"). Alleen de overkoepelende "Algemene Subsidieverordening" (ASV) gaat naar "Bestuur, Financiën & Organisatie".
  4. Macro-regel voor Brondata (Overijssel / Waterschap): Indien het document provinciaal of waterschapsbreed is en geen expliciete lokale kernen vermeldt, is de scope "Provinciebreed" of "Waterschapbreed", en is de wijk_of_kern leeg. Indien een specifieke kern zoals Giethoorn of Blokzijl expliciet wordt genoemd, tag deze dan.

  === WIJKEN & KERNEN ===
  Zoek naar Steenwijk (Centrum/Binnenstad, Clingenborgh, De Gagels, Nieuwe gagels, Dolderkanaal, Groot Verlaat, Oostermeenthe, Oostwijken, Paddenpoel, Kornputkwartier, Steenwijk West, Steenwijkerdiep, Torenlanden, Woldmeenthe), Barsbeek, Heetveld, Belt-Schutsloot, Blankenham, Blokzijl, De Pol, Baars, de Bult, Doosje, Eeserwold, Eesveen, Giethoorn, Ijsselham, Paasloo, Basse, Jonen, Dwarsgracht, Kalenberg, Kallenkote, Klosse, Roekebos, Dinxterveen, Kuinre, Willemsoord, Moespot, Leeuwte, Nederland, Baarlo, Oldemarkt, Onna, Ossenzijl, Scheerwolde, Sint Jansklooster, Steenwijkerwold, Witte paarden, Tuk, Vollenhove, Wanneperveen, Wetering.

  Geef de resultaten terug in EXACT dit JSON formaat:
  {
    "titel": "Korte, heldere en representatieve publiekstitel (vrij van ambtelijk jargon)",
    "dossier": "Kies exact één van de 12 hoofddossiers",
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
      model: "gemini-3.8-flash",
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
      const processedSet = new Set<string>();
      currentMetadata.forEach((item) => {
        if (item.bestandsnaam) {
          processedSet.add(item.bestandsnaam.toLowerCase().trim());
        }
      });

      const allFiles = scanPdfFiles();
      activeProgress.total = allFiles.length;
      activeProgress.logs.push(`Totaal aantal PDF-bestanden gevonden in uploads: ${allFiles.length}`);

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

        if (!options.force && processedSet.has(fnLower)) {
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

        // Prepare complete metadata record
        const record: RaadsstukMetadata = {
          bestandsnaam: file.filename,
          titel: meta.titel || file.filename.replace(/\.pdf$/i, "").replace(/[_-]/g, " "),
          dossier: meta.dossier || "Bestuur, Financiën & Organisatie",
          subdossier: meta.subdossier || "",
          datum: meta.datum || new Date().toISOString().split("T")[0],
          wijk_of_kern: meta.wijk_of_kern || "",
          entiteiten: meta.entiteiten || (origin !== "Algemeen" ? origin : ""),
          relaties: meta.relaties || ""
        };

        // Add to our current metadata list (avoid duplicates)
        const existingIndex = currentMetadata.findIndex(
          (item) => (item.bestandsnaam || "").toLowerCase().trim() === fnLower
        );

        if (existingIndex !== -1) {
          currentMetadata[existingIndex] = record;
        } else {
          currentMetadata.push(record);
        }

        activeProgress.newlyClassified++;
        activeProgress.logs.push(`  ↳ Succes! Indeling: "${record.dossier}" ➔ Titel: "${record.titel}"`);
        
        if (activeProgress.logs.length > 300) {
          activeProgress.logs.shift();
        }

        // Periodic safe saving to persist progress in case of crash/restart
        if (activeProgress.newlyClassified % 5 === 0 || activeProgress.processed === allFiles.length) {
          fs.writeFileSync(METADATA_PATH, JSON.stringify(currentMetadata, null, 2), "utf-8");
          try {
            if (!fs.existsSync(path.dirname(DIST_METADATA_PATH))) {
              fs.mkdirSync(path.dirname(DIST_METADATA_PATH), { recursive: true });
            }
            fs.writeFileSync(DIST_METADATA_PATH, JSON.stringify(currentMetadata, null, 2), "utf-8");
          } catch (e) {
            // ignore
          }
        }
      }

      // Final save and CSV construction if anything changed
      if (activeProgress.newlyClassified > 0) {
        fs.writeFileSync(METADATA_PATH, JSON.stringify(currentMetadata, null, 2), "utf-8");
        try {
          if (!fs.existsSync(path.dirname(DIST_METADATA_PATH))) {
            fs.mkdirSync(path.dirname(DIST_METADATA_PATH), { recursive: true });
          }
          fs.writeFileSync(DIST_METADATA_PATH, JSON.stringify(currentMetadata, null, 2), "utf-8");
        } catch (e) {
          // ignore
        }

        // Build and save CSV as well
        const csvRows = [
          "bestandsnaam;titel;dossier;subdossier;datum;wijk_of_kern;entiteiten;relaties"
        ];
        currentMetadata.forEach((item) => {
          const row = [
            item.bestandsnaam || "",
            (item.titel || "").replace(/;/g, ","),
            item.dossier || "",
            (item.subdossier || "").replace(/;/g, ","),
            item.datum || "",
            (item.wijk_of_kern || "").replace(/;/g, ","),
            (item.entiteiten || "").replace(/;/g, ","),
            (item.relaties || "").replace(/;/g, ",")
          ].join(";");
          csvRows.push(row);
        });

        const csvContent = csvRows.join("\n");
        fs.writeFileSync(METADATA_CSV_PATH, csvContent, "utf-8");
        try {
          fs.writeFileSync(DIST_METADATA_CSV_PATH, csvContent, "utf-8");
        } catch (e) {
          // ignore
        }

        // Rebuild network graph
        rebuildNetworkGraph(currentMetadata);
      }

      activeProgress.logs.push(`[VOLTOOID] Bulk-classificatie succesvol afgerond! Totaal: ${activeProgress.processed}/${activeProgress.total}. Nieuw ingedeeld: ${activeProgress.newlyClassified}.`);
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
  const currentMetadata = getRawMetadata();
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
    const record: RaadsstukMetadata = {
      bestandsnaam: file.filename,
      titel: meta.titel || file.filename.replace(/\.pdf$/i, ""),
      dossier: meta.dossier || "Bestuur, Financiën & Organisatie",
      subdossier: meta.subdossier || "",
      datum: meta.datum || new Date().toISOString().split("T")[0],
      wijk_of_kern: meta.wijk_of_kern || "",
      entiteiten: meta.entiteiten || (origin !== "Algemeen" ? origin : ""),
      relaties: meta.relaties || ""
    };

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
    // Save updated metadata to json and csv
    fs.writeFileSync(METADATA_PATH, JSON.stringify(currentMetadata, null, 2), "utf-8");
    try {
      if (!fs.existsSync(path.dirname(DIST_METADATA_PATH))) {
        fs.mkdirSync(path.dirname(DIST_METADATA_PATH), { recursive: true });
      }
      fs.writeFileSync(DIST_METADATA_PATH, JSON.stringify(currentMetadata, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not sync bulk metadata json to dist:", e);
    }

    // Build and save CSV as well
    const csvRows = [
      "bestandsnaam;titel;dossier;subdossier;datum;wijk_of_kern;entiteiten;relaties"
    ];
    currentMetadata.forEach((item) => {
      const row = [
        item.bestandsnaam || "",
        (item.titel || "").replace(/;/g, ","),
        item.dossier || "",
        (item.subdossier || "").replace(/;/g, ","),
        item.datum || "",
        (item.wijk_of_kern || "").replace(/;/g, ","),
        (item.entiteiten || "").replace(/;/g, ","),
        (item.relaties || "").replace(/;/g, ",")
      ].join(";");
      csvRows.push(row);
    });

    const csvContent = csvRows.join("\n");
    fs.writeFileSync(METADATA_CSV_PATH, csvContent, "utf-8");
    try {
      fs.writeFileSync(DIST_METADATA_CSV_PATH, csvContent, "utf-8");
    } catch (e) {
      console.warn("Could not sync bulk metadata csv to dist:", e);
    }

    // Rebuild network graph
    rebuildNetworkGraph(currentMetadata);
  }

  return {
    totalScanned: allFiles.length,
    newlyClassified,
    alreadyProcessed,
    results
  };
}
