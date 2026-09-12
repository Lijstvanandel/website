import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";
import AdmZip from "adm-zip";
import type { Dossier, DossierDocument, GraphNode, GraphEdge, NetworkGraphData, RaadsstukMetadata } from "../types/dossier.js";
import { getKv, setKv } from "./sqliteDatabase.js";
import { CANONICAL_HOOFDDOSSIERS, CANONICAL_PRIMARY_SUBDOSSIERS, normalizeHoofddossier, normalizeSubdossier } from "./taxonomyClassifier.js";

const METADATA_PATH = path.join(process.cwd(), "public", "data", "raadsstukken_metadata_tussentijds.json");
const METADATA_CSV_PATH = path.join(process.cwd(), "public", "data", "raadsstukken_metadata_tussentijds.csv");
const GRAPH_PATH = path.join(process.cwd(), "public", "data", "network_graph.json");
const DOCUMENTS_DIR = path.join(process.cwd(), "public", "uploads", "documents");
const DIST_DOCUMENTS_DIR = path.join(process.cwd(), "dist", "uploads", "documents");
const DIST_DATA_DIR = path.join(process.cwd(), "dist", "data");
const DIST_METADATA_PATH = path.join(DIST_DATA_DIR, "raadsstukken_metadata_tussentijds.json");
const DIST_GRAPH_PATH = path.join(DIST_DATA_DIR, "network_graph.json");

// Persistent metadata paths outside git-tracked directory (survives git pull & container updates)
const MASTER_METADATA_DIR = path.join(process.cwd(), "data");
const MASTER_METADATA_PATH = path.join(MASTER_METADATA_DIR, "raadsstukken_metadata_master.json");
const MASTER_METADATA_BACKUP_PATH = path.join(DOCUMENTS_DIR, "raadsstukken_metadata_master.json");

function ensureMasterDirs() {
  try {
    if (!fs.existsSync(MASTER_METADATA_DIR)) {
      fs.mkdirSync(MASTER_METADATA_DIR, { recursive: true });
    }
  } catch (_e) {}
}

// Helper to sanitize slug
export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-en-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Curated high-resolution thumbnails for Subdossiers
export function getSubdossierThumbnail(subTitle: string, hoofddossier?: string): string {
  const clean = (subTitle || "").toLowerCase().trim();

  // Woningbouw & Bouwen
  if (clean.includes("woningbouw") || clean.includes("nieuwbouw") || clean.includes("woon") || clean.includes("starterslening") || clean.includes("bouw")) {
    return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80";
  }
  // Stikstof & Natuur
  if (clean.includes("stikstof") || clean.includes("natura") || clean.includes("weerribben") || clean.includes("natuur") || clean.includes("pfas") || clean.includes("landschap")) {
    return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&auto=format&fit=crop&q=80";
  }
  // Zonne-energie & Zonneparken
  if (clean.includes("zonne") || clean.includes("zonnepark") || clean.includes("zonneweide")) {
    return "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80";
  }
  // Windenergie & Windturbines
  if (clean.includes("wind") || clean.includes("windturbine") || clean.includes("windenergie")) {
    return "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&auto=format&fit=crop&q=80";
  }
  // IceBear, Milieu & Luchtkwaliteit
  if (clean.includes("icebear") || clean.includes("lucht") || clean.includes("geur") || clean.includes("emissie") || clean.includes("milieu")) {
    return "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80";
  }
  // Waterbeheer, Watertoets & Hemelwater
  if (clean.includes("water") || clean.includes("watertoets") || clean.includes("geohydrologie") || clean.includes("hemelwater")) {
    return "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=800&auto=format&fit=crop&q=80";
  }
  // Verkeer, Infrastructuur & Wegen
  if (clean.includes("verkeer") || clean.includes("weg") || clean.includes("infrastructuur") || clean.includes("rondweg") || clean.includes("mobiliteit") || clean.includes("vervoer")) {
    return "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=800&auto=format&fit=crop&q=80";
  }
  // Jeugdhulp, RSJ & Jeugdzorg
  if (clean.includes("jeugd") || clean.includes("kind") || clean.includes("rsj") || clean.includes("gezin") || clean.includes("onderwijs") || clean.includes("leerling")) {
    return "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80";
  }
  // Cultuur, Museum, De Meenthe & Theater
  if (clean.includes("museum") || clean.includes("meenthe") || clean.includes("theater") || clean.includes("cultuur") || clean.includes("kunst") || clean.includes("monument") || clean.includes("bibliotheek")) {
    return "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&auto=format&fit=crop&q=80";
  }
  // Archief & Historie
  if (clean.includes("archief") || clean.includes("historisch") || clean.includes("collectie overijssel") || clean.includes("hco")) {
    return "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80";
  }
  // Gezondheid, GGD, SPUK & Zorg
  if (clean.includes("gezondheid") || clean.includes("ggd") || clean.includes("zorg") || clean.includes("wmo") || clean.includes("preventie") || clean.includes("huiselijk geweld")) {
    return "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80";
  }
  // Armoede, Schuldhulp, Participatiewet & Werk
  if (clean.includes("armoede") || clean.includes("schuld") || clean.includes("inkomen") || clean.includes("participatiewet") || clean.includes("werk")) {
    return "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop&q=80";
  }
  // Brandweer, Veiligheid, APV & Handhaving
  if (clean.includes("brandweer") || clean.includes("veiligheid") || clean.includes("handhaving") || clean.includes("crisis") || clean.includes("politie")) {
    return "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=80";
  }
  // Gemeenschappelijke Regelingen (GR), Omgevingsdienst & Zienswijze
  if (clean.includes("gemeenschappelijke regeling") || clean.includes("gr") || clean.includes("omgevingsdienst") || clean.includes("zienswijze") || clean.includes("veiligheidsregio")) {
    return "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80";
  }
  // Stadsvisie, Gebiedsontwikkeling & Ruimtelijke Ordening
  if (clean.includes("stadsvisie") || clean.includes("gebiedsontwikkeling") || clean.includes("ruimtelijk") || clean.includes("bestemming") || clean.includes("omgevingsplan") || clean.includes("omgevingswet")) {
    return "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80";
  }
  // Openbare Ruimte, Groen, Parkeren & Verlichting
  if (clean.includes("openbare ruimte") || clean.includes("verlichting") || clean.includes("groen") || clean.includes("parkeren") || clean.includes("pacht") || clean.includes("onderhoud")) {
    return "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=800&auto=format&fit=crop&q=80";
  }
  // Toerisme, Recreatie, Woonschepen & Waterwegen
  if (clean.includes("recreatie") || clean.includes("toerisme") || clean.includes("schip") || clean.includes("woonschip") || clean.includes("ligplaats")) {
    return "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&auto=format&fit=crop&q=80";
  }
  // Begroting, Belasting, Jaarstukken & Financiën
  if (clean.includes("begroting") || clean.includes("financi") || clean.includes("subsidie") || clean.includes("tarief") || clean.includes("kostenverhaal") || clean.includes("belasting")) {
    return "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80";
  }
  // Samenleving, Inclusie, Asiel & Participatie
  if (clean.includes("samenleving") || clean.includes("inclusie") || clean.includes("asiel") || clean.includes("participatie") || clean.includes("wijk")) {
    return "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&auto=format&fit=crop&q=80";
  }

  // Fallback to parent hoofddossier preset or default
  if (hoofddossier && DOSSIER_PRESETS[hoofddossier]?.thumbnail) {
    return DOSSIER_PRESETS[hoofddossier].thumbnail;
  }
  return "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80";
}

// Category and image presets for dossiers
const DOSSIER_PRESETS: Record<
  string,
  {
    category: string;
    thumbnail: string;
    description: string;
    wijkSlug?: string;
    wijkNaam?: string;
  }
> = {
  "Bestuur, Financiën & Organisatie": {
    category: "Bestuur, Financiën & Organisatie",
    thumbnail: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80",
    description: "Begrotingen, jaarrekeningen, gemeentelijke belastingen, moties, rekenkamer en gemeenschappelijke regelingen."
  },
  "Wonen, Bouwen & Ontwikkeling": {
    category: "Wonen, Bouwen & Ontwikkeling",
    thumbnail: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
    description: "Woningbouw, nieuwbouwprojecten, bestemmingsplannen, omgevingsvisie, kaveluitgifte en ruimtelijke ordening."
  },
  "Natuur, Milieu & Klimaat": {
    category: "Natuur, Milieu & Klimaat",
    thumbnail: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&auto=format&fit=crop&q=80",
    description: "Waterbeheer, Weerribben-Wieden, stikstofbeleid, energietransitie, zonneparken en klimaatadaptatie."
  },
  "Zorg, Gezondheid & Welzijn": {
    category: "Zorg, Gezondheid & Welzijn",
    thumbnail: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80",
    description: "Wmo, publieke gezondheid (GGD), mantelzorgondersteuning, thuiszorg en beschermd wonen."
  },
  "Jeugd, Gezin & Onderwijs": {
    category: "Jeugd, Gezin & Onderwijs",
    thumbnail: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80",
    description: "Jeugdhulp, Regionaal Serviceteam Jeugd (RSJ), onderwijshuisvesting, scholen en kindermishandeling."
  },
  "Verkeer, Wegen & Openbare Ruimte": {
    category: "Verkeer, Wegen & Openbare Ruimte",
    thumbnail: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80",
    description: "Wegenonderhoud, verkeersveiligheid, fietsinfrastructuur, parkeerbeleid, openbaar vervoer, grachten en verlichting."
  },
  "Kunst, Cultuur & Sport": {
    category: "Kunst, Cultuur & Sport",
    thumbnail: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
    description: "Podiumkunsten (De Meenthe, Scala), musea, erfgoed, beeldende kunst, bibliotheken en sportaccommodaties."
  },
  "Veiligheid, Toezicht & Handhaving": {
    category: "Veiligheid, Toezicht & Handhaving",
    thumbnail: "https://images.unsplash.com/photo-1575881875475-3102470d5a86?w=800&auto=format&fit=crop&q=80",
    description: "Veiligheidsregio IJsselland, brandweer, toezicht & handhaving, APV, openbare orde en crisisbeheersing."
  },
  "Samenleving, Werk & Inclusie": {
    category: "Samenleving, Werk & Inclusie",
    thumbnail: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80",
    description: "Asiel- en vluchtelingenopvang, Participatiewet, schuldhulpverlening, armoedebestrijding en burgerparticipatie."
  },
  "Economie, Ondernemen & Toerisme": {
    category: "Economie, Ondernemen & Toerisme",
    thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80",
    description: "Bedrijventerreinen, waterrecreatie, toerisme, agrarische zaken & pachtbeleid, horeca en detailhandel."
  },
  // Backwards compatibility aliases
  "Ruimte, Wonen & Bereikbaarheid": {
    category: "Wonen, Bouwen & Ontwikkeling",
    thumbnail: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
    description: "Woningbouw, bestemmingsplannen, gebiedsontwikkeling, verkeer en ruimtelijke ordening in de kernen."
  },
  "Klimaat, Water & Natuur": {
    category: "Natuur, Milieu & Klimaat",
    thumbnail: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&auto=format&fit=crop&q=80",
    description: "Waterbeheer, stikstof, energietransitie, en natuurbeheer waaronder Nationaal Park Weerribben-Wieden."
  },
  "Sociaal Domein, Zorg & Jeugd": {
    category: "Zorg, Gezondheid & Welzijn",
    thumbnail: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80",
    description: "Jeugdzorg, WMO, armoedebeleid, participatiewet, volksgezondheid en asielopvang."
  },
  "Lokale Economie, Toerisme & Cultuur": {
    category: "Economie, Ondernemen & Toerisme",
    thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80",
    description: "Recreatie, toerisme, lokale economie, landbouw/pacht, kunst, cultuur en erfgoed."
  },
  "Bestuur, Financiën & Openbare Orde": {
    category: "Bestuur, Financiën & Organisatie",
    thumbnail: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80",
    description: "Gemeentefinanciën, veiligheid, handhaving, onderhoud openbare ruimte en regionale samenwerkingen (GR)."
  }
};

const DEFAULT_THUMBNAIL = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80";

// Read raw metadata from persistent master, sqlite, or file
export function getRawMetadata(): RaadsstukMetadata[] {
  // 1. Check standard METADATA_PATH (updated by bulk classification and reorganize scripts)
  try {
    if (fs.existsSync(METADATA_PATH)) {
      const data = fs.readFileSync(METADATA_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not read METADATA_PATH:", err);
  }

  // 2. Check persistent master file in data/ (gitignored, survives git pull)
  try {
    if (fs.existsSync(MASTER_METADATA_PATH)) {
      const data = fs.readFileSync(MASTER_METADATA_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not read MASTER_METADATA_PATH:", err);
  }

  // 3. Check SQLite kv_store (gitignored, persistent in database.sqlite)
  try {
    const kvMaster = getKv("raadsstukken_metadata_master");
    if (Array.isArray(kvMaster) && kvMaster.length > 0) {
      return kvMaster;
    }
  } catch (_e) {}

  // 4. Check documents backup path
  try {
    if (fs.existsSync(MASTER_METADATA_BACKUP_PATH)) {
      const data = fs.readFileSync(MASTER_METADATA_BACKUP_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_e) {}

  return [];
}

// Read raw network graph from file
export function getRawNetworkGraph(): NetworkGraphData {
  try {
    if (fs.existsSync(GRAPH_PATH)) {
      const data = fs.readFileSync(GRAPH_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading graph file:", err);
  }
  return { nodes: [], edges: [] };
}

// Check if a physical document exists in the uploads directory or subdirectories (waterschap, overijssel, etc.)
export function checkFileExists(filename: string): { exists: boolean; fileUrl?: string; fileSize?: number } {
  if (!filename) return { exists: false };
  const cleanFilename = path.basename(filename);

  // Locations to check in order of priority
  const candidates: Array<{ path: string; url: string }> = [
    // 1. Exact path relative to DOCUMENTS_DIR (handles e.g. "waterschap/doc.pdf" or "overijssel/doc.pdf")
    {
      path: path.join(DOCUMENTS_DIR, filename),
      url: `/uploads/documents/${filename.split("/").map(encodeURIComponent).join("/")}`,
    },
    // 2. Direct root in public/uploads/documents/
    {
      path: path.join(DOCUMENTS_DIR, cleanFilename),
      url: `/uploads/documents/${encodeURIComponent(cleanFilename)}`,
    },
    // 3. Waterschap subfolder
    {
      path: path.join(DOCUMENTS_DIR, "waterschap", cleanFilename),
      url: `/uploads/documents/waterschap/${encodeURIComponent(cleanFilename)}`,
    },
    // 4. Overijssel subfolder
    {
      path: path.join(DOCUMENTS_DIR, "overijssel", cleanFilename),
      url: `/uploads/documents/overijssel/${encodeURIComponent(cleanFilename)}`,
    },
    // 5. Dist mirrors
    {
      path: path.join(DIST_DOCUMENTS_DIR, filename),
      url: `/uploads/documents/${filename.split("/").map(encodeURIComponent).join("/")}`,
    },
    {
      path: path.join(DIST_DOCUMENTS_DIR, cleanFilename),
      url: `/uploads/documents/${encodeURIComponent(cleanFilename)}`,
    },
    {
      path: path.join(DIST_DOCUMENTS_DIR, "waterschap", cleanFilename),
      url: `/uploads/documents/waterschap/${encodeURIComponent(cleanFilename)}`,
    },
    {
      path: path.join(DIST_DOCUMENTS_DIR, "overijssel", cleanFilename),
      url: `/uploads/documents/overijssel/${encodeURIComponent(cleanFilename)}`,
    },
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand.path)) {
      try {
        const stat = fs.statSync(cand.path);
        if (stat.isFile()) {
          return {
            exists: true,
            fileUrl: cand.url,
            fileSize: stat.size,
          };
        }
      } catch (_e) {
        return { exists: true, fileUrl: cand.url };
      }
    }
  }

  return { exists: false };
}

// Count physical document files residing on the server's disk
export function countPhysicalFilesOnDisk(): {
  rootCount: number;
  waterschapCount: number;
  overijsselCount: number;
  otherSubdirsCount: number;
  totalFiles: number;
} {
  let rootCount = 0;
  let waterschapCount = 0;
  let overijsselCount = 0;
  let otherSubdirsCount = 0;

  const isDocFile = (fn: string) => {
    const l = fn.toLowerCase();
    return (
      !l.endsWith(".json") &&
      !l.endsWith(".csv") &&
      !l.endsWith(".log") &&
      !l.endsWith(".sqlite") &&
      !l.startsWith(".") &&
      !l.endsWith(".tmp")
    );
  };

  try {
    if (fs.existsSync(DOCUMENTS_DIR)) {
      const entries = fs.readdirSync(DOCUMENTS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && isDocFile(entry.name)) {
          rootCount++;
        } else if (entry.isDirectory()) {
          const subDirName = entry.name.toLowerCase();
          const subDirPath = path.join(DOCUMENTS_DIR, entry.name);
          try {
            const subEntries = fs.readdirSync(subDirPath, { withFileTypes: true });
            const subCount = subEntries.filter((s) => s.isFile() && isDocFile(s.name)).length;
            if (subDirName === "waterschap") {
              waterschapCount += subCount;
            } else if (subDirName === "overijssel") {
              overijsselCount += subCount;
            } else {
              otherSubdirsCount += subCount;
            }
          } catch (_e) {}
        }
      }
    }
  } catch (err) {
    console.error("Error counting physical files on disk:", err);
  }

  const totalFiles = rootCount + waterschapCount + overijsselCount + otherSubdirsCount;
  return { rootCount, waterschapCount, overijsselCount, otherSubdirsCount, totalFiles };
}

// Save master metadata safely across persistent storage, SQLite, dist and public directories
export function saveMasterMetadata(items: RaadsstukMetadata[], csvContent?: string): void {
  ensureMasterDirs();

  // 1. Save to master JSON in data/ (gitignored)
  try {
    fs.writeFileSync(MASTER_METADATA_PATH, JSON.stringify(items, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving MASTER_METADATA_PATH:", err);
  }

  // 2. Save to master backup in uploads/documents (gitignored)
  try {
    fs.writeFileSync(MASTER_METADATA_BACKUP_PATH, JSON.stringify(items, null, 2), "utf-8");
  } catch (_e) {}

  // 3. Save to SQLite kv_store (gitignored & persistent in database.sqlite)
  try {
    setKv("raadsstukken_metadata_master", items);
  } catch (err) {
    console.error("Error saving to sqlite kv_store:", err);
  }

  // 4. Save to public/data/ and dist/data/
  try {
    fs.writeFileSync(METADATA_PATH, JSON.stringify(items, null, 2), "utf-8");
    if (!fs.existsSync(DIST_DATA_DIR)) {
      fs.mkdirSync(DIST_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DIST_METADATA_PATH, JSON.stringify(items, null, 2), "utf-8");
  } catch (err) {
    console.warn("Error saving to public/data metadata path:", err);
  }

  // 5. Save CSV with all master records
  try {
    const csv = csvContent || generateMasterMetadataCsv(items);
    fs.writeFileSync(METADATA_CSV_PATH, csv, "utf-8");
    fs.writeFileSync(path.join(DIST_DATA_DIR, path.basename(METADATA_CSV_PATH)), csv, "utf-8");
  } catch (err) {
    console.warn("Error saving metadata CSV:", err);
  }

  // 6. Rebuild network graph with all nodes & relationships
  try {
    rebuildNetworkGraph(items);
  } catch (err) {
    console.warn("Error rebuilding network graph:", err);
  }
}

// Clean document titles for auto-indexed files
export function cleanDocumentTitle(fileName: string): string {
  let title = fileName.replace(/\.[a-zA-Z0-9]+$/i, "");
  title = title.replace(/[-_]+/g, " ");
  // Remove leading YYYY MM DD or YYYYMMDD
  title = title.replace(/^\b\d{4}\s*\d{2}\s*\d{2}\b\s*/, "");
  title = title.replace(/^\b\d{4}\b\s*/, "");
  // Replace document codes
  title = title.replace(/^(doc|rv|rb|ib|notitie|bijlage|raadsvoorstel|besluit)\s*\d*\s*/i, (m) => m.toUpperCase() + ": ");
  title = title.replace(/\s+/g, " ").trim();
  if (title.length < 3) {
    return fileName.replace(/\.[a-zA-Z0-9]+$/i, "");
  }
  return title.charAt(0).toUpperCase() + title.slice(1);
}

// Extract date from filename or modification time
export function extractDateFromFilename(fileName: string, mtime?: Date): string {
  const m1 = fileName.match(/\b(19\d\d|20\d\d)[-_](0[1-9]|1[0-2])[-_](0[1-9]|[12]\d|3[01])\b/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;

  const m2 = fileName.match(/\b(0[1-9]|[12]\d|3[01])[-_](0[1-9]|1[0-2])[-_](19\d\d|20\d\d)\b/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;

  const m3 = fileName.match(/\b(19\d\d|20\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/);
  if (m3) return `${m3[1]}-${m3[2]}-${m3[3]}`;

  const m4 = fileName.match(/\b(20[12]\d)\b/);
  if (m4) return `${m4[1]}-01-01`;

  if (mtime && !isNaN(mtime.getTime())) {
    return mtime.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

// Steenwijkerland kernen & wijken list
const STEENWIJKERLAND_KERNEN = [
  "Centrum Steenwijk", "Steenwijk", "Tuk", "Giethoorn", "Vollenhove", "Blokzijl",
  "Oldemarkt", "Kuinre", "Steenwijkerwold", "Sint Jansklooster", "Wanneperveen",
  "Belt-Schutsloot", "Scheerwolde", "Willemsoord", "Eesveen", "Kalenberg",
  "Ossenzijl", "Blankenham", "Onna", "Kallenkote", "Basse", "Baarlo",
  "Muggenbeet", "Nederland", "Groot Verlaat", "Oostermeenthe", "De Meenthe",
  "Clingenborgh", "Westerclinge", "Dolderkanaal", "Wetering", "Zuidveen",
  "Marijenkampen", "Heetveld", "Barsbeek", "Doosje", "Dwarsgracht", "Ronduite", "IJsselham"
];

// Detect wijk or kern from text
export function detectWijkOrKern(text: string): string | undefined {
  const l = text.toLowerCase();
  for (const kern of STEENWIJKERLAND_KERNEN) {
    const kLower = kern.toLowerCase();
    const regex = new RegExp(`\\b${kLower.replace("-", "[- ]")}\\b`, "i");
    if (regex.test(l)) {
      return kern;
    }
  }
  return undefined;
}

// Detect dossier and subdossier from keywords and subdirectory using canonical 10-hoofddossier taxonomy
export function detectDossierAndSubdossier(text: string, subFolder?: string): { dossier: string; subdossier: string } {
  const hoofddossier = normalizeHoofddossier(subFolder, text, "", text);
  const subdossier = normalizeSubdossier(hoofddossier, undefined, text, "", text);
  return { dossier: hoofddossier, subdossier };
}

// Generate Excel-compatible master metadata CSV with Dutch formatting
export function generateMasterMetadataCsv(items: RaadsstukMetadata[]): string {
  const headers = [
    "bestandsnaam",
    "titel",
    "dossier",
    "subdossier",
    "wijk_of_kern",
    "datum",
    "entiteiten",
    "relaties"
  ];
  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = items.map((item) => [
    escapeCsv(item.bestandsnaam),
    escapeCsv(item.titel || item.bestandsnaam),
    escapeCsv(item.dossier || "Algemeen"),
    escapeCsv(item.subdossier || "Algemeen"),
    escapeCsv(item.wijk_of_kern || ""),
    escapeCsv(item.datum || ""),
    escapeCsv(item.entiteiten || ""),
    escapeCsv(item.relaties || "")
  ].join(";"));

  return "\uFEFF" + headers.join(";") + "\r\n" + rows.join("\r\n");
}

// Scan the physical filesystem and synchronize all 5000+ files into master metadata catalog
export function syncPhysicalFilesystemDocuments(): {
  success: boolean;
  totalFilesOnDisk: number;
  rootFilesCount: number;
  waterschapFilesCount: number;
  overijsselFilesCount: number;
  previousMetadataCount: number;
  newlyIndexedCount: number;
  totalMasterDocuments: number;
  message: string;
} {
  ensureMasterDirs();
  const counts = countPhysicalFilesOnDisk();

  interface DiskFile {
    fileName: string;
    subFolder: string;
    relPath: string;
    fullPath: string;
    fileSize: number;
    mtime: Date;
  }
  const diskFiles: DiskFile[] = [];

  const isDocFile = (fn: string) => {
    const l = fn.toLowerCase();
    return (
      !l.endsWith(".json") &&
      !l.endsWith(".csv") &&
      !l.endsWith(".log") &&
      !l.endsWith(".sqlite") &&
      !l.startsWith(".") &&
      !l.endsWith(".tmp")
    );
  };

  if (fs.existsSync(DOCUMENTS_DIR)) {
    try {
      const rootEntries = fs.readdirSync(DOCUMENTS_DIR, { withFileTypes: true });
      for (const entry of rootEntries) {
        if (entry.isFile() && isDocFile(entry.name)) {
          const fullPath = path.join(DOCUMENTS_DIR, entry.name);
          try {
            const st = fs.statSync(fullPath);
            diskFiles.push({
              fileName: entry.name,
              subFolder: "",
              relPath: entry.name,
              fullPath,
              fileSize: st.size,
              mtime: st.mtime,
            });
          } catch (_e) {}
        } else if (entry.isDirectory()) {
          const subDirName = entry.name;
          const subDirPath = path.join(DOCUMENTS_DIR, subDirName);
          try {
            const subEntries = fs.readdirSync(subDirPath, { withFileTypes: true });
            for (const sub of subEntries) {
              if (sub.isFile() && isDocFile(sub.name)) {
                const subFullPath = path.join(subDirPath, sub.name);
                try {
                  const subSt = fs.statSync(subFullPath);
                  diskFiles.push({
                    fileName: sub.name,
                    subFolder: subDirName,
                    relPath: `${subDirName}/${sub.name}`,
                    fullPath: subFullPath,
                    fileSize: subSt.size,
                    mtime: subSt.mtime,
                  });
                } catch (_e) {}
              }
            }
          } catch (_e) {}
        }
      }
    } catch (err) {
      console.error("Error reading DOCUMENTS_DIR:", err);
    }
  }

  // Load existing metadata
  const existingMetadata = getRawMetadata();
  const previousMetadataCount = existingMetadata.length;

  const itemMap = new Map<string, RaadsstukMetadata>();
  const baseNameMap = new Map<string, RaadsstukMetadata>();

  for (const item of existingMetadata) {
    if (!item || !item.bestandsnaam) continue;
    const cleanKey = item.bestandsnaam.toLowerCase().trim();
    const baseKey = path.basename(item.bestandsnaam).toLowerCase().trim();
    itemMap.set(cleanKey, { ...item });
    baseNameMap.set(baseKey, itemMap.get(cleanKey)!);
  }

  // Check specialized Waterschap metadata JSON
  const waterschapJsonPath = path.join(DOCUMENTS_DIR, "raadsstukken_metadata_waterschap.json");
  if (fs.existsSync(waterschapJsonPath)) {
    try {
      const raw = fs.readFileSync(waterschapJsonPath, "utf-8");
      const wsDocs = JSON.parse(raw);
      if (Array.isArray(wsDocs)) {
        for (const ws of wsDocs) {
          const fn = ws.bestandsnaam || ws.filename || (ws.document_id ? `waterschap_${ws.document_id}.pdf` : "");
          if (!fn) continue;
          const wsKey = fn.toLowerCase().trim();
          const wsBase = path.basename(fn).toLowerCase().trim();
          if (!itemMap.has(wsKey) && !baseNameMap.has(wsBase)) {
            const wsItem: RaadsstukMetadata = {
              bestandsnaam: fn.includes("/") ? fn : `waterschap/${fn}`,
              titel: ws.titel || cleanDocumentTitle(fn),
              dossier: "Waterschap & Waterbeheer",
              subdossier: "Waterschap Drents Overijsselse Delta",
              wijk_of_kern: ws.wijk_of_kern || detectWijkOrKern(ws.titel || fn) || "",
              datum: ws.datum || extractDateFromFilename(fn),
              entiteiten: ws.entiteiten || "Waterschap Drents Overijsselse Delta, Waterbeheer, Dijken",
              relaties: ws.relaties || "",
            };
            itemMap.set(wsKey, wsItem);
            baseNameMap.set(wsBase, wsItem);
          }
        }
      }
    } catch (_e) {}
  }

  // Check specialized Overijssel metadata JSON
  const overijsselJsonPath = path.join(DOCUMENTS_DIR, "raadsstukken_metadata_overijssel.json");
  if (fs.existsSync(overijsselJsonPath)) {
    try {
      const raw = fs.readFileSync(overijsselJsonPath, "utf-8");
      const ovDocs = JSON.parse(raw);
      if (Array.isArray(ovDocs)) {
        for (const ov of ovDocs) {
          const fn = ov.bestandsnaam || ov.filename || (ov.document_id ? `overijssel_${ov.document_id}.pdf` : "");
          if (!fn) continue;
          const ovKey = fn.toLowerCase().trim();
          const ovBase = path.basename(fn).toLowerCase().trim();
          if (!itemMap.has(ovKey) && !baseNameMap.has(ovBase)) {
            const ovItem: RaadsstukMetadata = {
              bestandsnaam: fn.includes("/") ? fn : `overijssel/${fn}`,
              titel: ov.titel || cleanDocumentTitle(fn),
              dossier: "Provincie Overijssel",
              subdossier: "Provinciale Staten & Besluiten",
              wijk_of_kern: ov.wijk_of_kern || detectWijkOrKern(ov.titel || fn) || "",
              datum: ov.datum || extractDateFromFilename(fn),
              entiteiten: ov.entiteiten || "Provincie Overijssel, Provinciale Staten, Regionaal Beleid",
              relaties: ov.relaties || "",
            };
            itemMap.set(ovKey, ovItem);
            baseNameMap.set(ovBase, ovItem);
          }
        }
      }
    } catch (_e) {}
  }

  // Check all physical disk files and reconcile or add
  let newlyIndexedCount = 0;

  for (const df of diskFiles) {
    const fullKey = df.relPath.toLowerCase().trim();
    const baseKey = df.fileName.toLowerCase().trim();

    const matchedItem = itemMap.get(fullKey) || baseNameMap.get(baseKey);

    if (matchedItem) {
      // Existing item: ensure correct relative path
      matchedItem.bestandsnaam = df.relPath;
    } else {
      // New file on disk that was not indexed in metadata!
      const cleanTitle = cleanDocumentTitle(df.fileName);
      const date = extractDateFromFilename(df.fileName, df.mtime);
      const detectedTopic = detectDossierAndSubdossier(cleanTitle + " " + df.fileName, df.subFolder);
      const detectedWijk = detectWijkOrKern(cleanTitle + " " + df.fileName);

      const newItem: RaadsstukMetadata = {
        bestandsnaam: df.relPath,
        titel: cleanTitle,
        datum: date,
        dossier: detectedTopic.dossier,
        subdossier: detectedTopic.subdossier,
        wijk_of_kern: detectedWijk || "",
        entiteiten: [detectedTopic.dossier, detectedTopic.subdossier, detectedWijk, "Raadsstuk"].filter(Boolean).join(", "),
        relaties: "",
      };

      itemMap.set(fullKey, newItem);
      baseNameMap.set(baseKey, newItem);
      newlyIndexedCount++;
    }
  }

  const masterItems = Array.from(itemMap.values());

  // Save master metadata permanently across data/, sqlite, and public/data/
  saveMasterMetadata(masterItems);

  const msg = `Succesvol gesynchroniseerd: ${counts.totalFiles} bestanden op server schijf gescand (${counts.rootCount} root, ${counts.waterschapCount} waterschap, ${counts.overijsselCount} overijssel). ${newlyIndexedCount} nieuwe documenten geïndexeerd. Totaal catalogus bevat nu ${masterItems.length} documenten.`;
  console.log("[FILESYSTEM SYNC]:", msg);

  return {
    success: true,
    totalFilesOnDisk: counts.totalFiles,
    rootFilesCount: counts.rootCount,
    waterschapFilesCount: counts.waterschapCount,
    overijsselFilesCount: counts.overijsselCount,
    previousMetadataCount,
    newlyIndexedCount,
    totalMasterDocuments: masterItems.length,
    message: msg,
  };
}

// Build complete list of Dossiers from metadata + SQLite custom dossiers
export function getAllDossiers(
  customDossiers: Dossier[] = [],
  deletedSlugs: string[] = [],
  customSubdossiers?: Record<string, any>
): Dossier[] {
  const metadataList = getRawMetadata();
  const dossierMap = new Map<string, { title: string; docs: DossierDocument[] }>();

  // Group metadata by canonical slug so case differences don't create duplicate dossiers
  metadataList.forEach((item, index) => {
    const rawDossier = (item.dossier || "Overig").trim();
    const slug = slugify(rawDossier) || "overig";
    if (!dossierMap.has(slug)) {
      dossierMap.set(slug, { title: rawDossier, docs: [] });
    } else {
      // Keep nicer title (prefer capital letters / Title Case)
      const existing = dossierMap.get(slug)!;
      if (rawDossier !== existing.title && /[A-Z]/.test(rawDossier) && !/[A-Z]/.test(existing.title)) {
        existing.title = rawDossier;
      }
    }

    const fileCheck = checkFileExists(item.bestandsnaam);
    const entiteiten = item.entiteiten
      ? item.entiteiten.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const relaties = item.relaties
      ? item.relaties.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const rawSubdossier = (item.subdossier || "Algemeen").trim();
    const rawWijk = (item.wijk_of_kern || "").trim();
    const docWijken = rawWijk
      ? rawWijk.split(",").map((w) => w.trim()).filter(Boolean)
      : [];

    const doc: DossierDocument = {
      id: `doc-${index}-${slugify(item.bestandsnaam)}`,
      bestandsnaam: item.bestandsnaam,
      titel: item.titel || item.bestandsnaam.replace(/\.pdf$/i, ""),
      dossier: rawDossier,
      subdossier: rawSubdossier,
      wijk_of_kern: rawWijk,
      wijken: docWijken,
      datum: item.datum || null,
      entiteiten,
      relaties,
      fileExists: fileCheck.exists,
      fileUrl: fileCheck.fileUrl,
      fileSize: fileCheck.fileSize,
    };

    dossierMap.get(slug)!.docs.push(doc);
  });

  let dossiers: Dossier[] = [];

  // Transform grouped items into Dossier entities
  for (const [slug, group] of dossierMap.entries()) {
    const title = group.title;
    const docs = group.docs;

    // Sort documents chronologically (newest first, null dates at end)
    docs.sort((a, b) => {
      if (!a.datum && !b.datum) return 0;
      if (!a.datum) return 1;
      if (!b.datum) return -1;
      return new Date(b.datum).getTime() - new Date(a.datum).getTime();
    });

    const dates = docs.map((d) => d.datum).filter(Boolean) as string[];
    dates.sort();
    const startDate = dates.length > 0 ? dates[0] : null;
    const endDate = dates.length > 0 ? dates[dates.length - 1] : null;

    const presetKey = Object.keys(DOSSIER_PRESETS).find(
      (k) => k.toLowerCase() === title.toLowerCase() || slugify(k) === slug
    );
    const preset = (presetKey ? DOSSIER_PRESETS[presetKey] : undefined) || {
      category: "Gemeenteraad & Beleid",
      thumbnail: DEFAULT_THUMBNAIL,
      description: `Officieel raadsdossier '${title}' met ${docs.length} gerelateerde raadsstukken en besluiten.`,
    };

    // Extract top tags/entities
    const tagSet = new Set<string>();
    docs.forEach((d) => {
      d.entiteiten.slice(0, 3).forEach((e) => tagSet.add(e));
    });

    const uploadedCount = docs.filter((d) => d.fileExists).length;

    // Group documents into Subdossiers
    const subMap = new Map<string, DossierDocument[]>();
    const allWijkenSet = new Set<string>();

    docs.forEach((d) => {
      const subTitle = d.subdossier || "Algemeen";
      if (!subMap.has(subTitle)) {
        subMap.set(subTitle, []);
      }
      subMap.get(subTitle)!.push(d);

      if (d.wijken && d.wijken.length > 0) {
        d.wijken.forEach((w) => allWijkenSet.add(w));
      }
    });

    const subdossiers = Array.from(subMap.entries()).map(([subTitle, subDocs]) => {
      const subDates = subDocs.map((sd) => sd.datum).filter(Boolean) as string[];
      subDates.sort();
      const subWijken = new Set<string>();
      const subTags = new Set<string>();
      let subUploaded = 0;

      subDocs.forEach((sd) => {
        if (sd.fileExists) subUploaded++;
        if (sd.wijken) sd.wijken.forEach((w) => subWijken.add(w));
        sd.entiteiten.slice(0, 3).forEach((e) => subTags.add(e));
      });

      const subKey = `${slug}:${slugify(subTitle)}`;
      const customSub = customSubdossiers?.[subKey] || customSubdossiers?.[slugify(subTitle)];

      return {
        id: slugify(subTitle),
        title: customSub?.title || subTitle,
        slug: slugify(subTitle),
        hoofddossier: title,
        documentCount: subDocs.length,
        uploadedCount: subUploaded,
        dateRange: {
          start: subDates.length > 0 ? subDates[0] : null,
          end: subDates.length > 0 ? subDates[subDates.length - 1] : null,
        },
        wijken: Array.from(subWijken),
        tags: customSub?.tags || Array.from(subTags).slice(0, 5),
        description: customSub?.description || `${subDocs.length} raadsstukken en besluiten binnen ${subTitle}.`,
        thumbnail: customSub?.thumbnail || getSubdossierThumbnail(subTitle, title),
      };
    });

    // Add any custom subdossiers registered in customSubdossiers that might have 0 docs currently
    if (customSubdossiers) {
      Object.entries(customSubdossiers).forEach(([key, customSub]: [string, any]) => {
        if (key.startsWith(`${slug}:`)) {
          const subSlug = key.slice(slug.length + 1);
          if (!subdossiers.some((s) => s.slug === subSlug || s.id === subSlug)) {
            subdossiers.push({
              id: subSlug,
              title: customSub?.title || subSlug,
              slug: subSlug,
              hoofddossier: title,
              documentCount: 0,
              uploadedCount: 0,
              dateRange: { start: null, end: null },
              wijken: [],
              tags: customSub?.tags || [],
              description: customSub?.description || `Nieuw aangemaakt subdossier binnen ${title}.`,
              thumbnail: customSub?.thumbnail || getSubdossierThumbnail(customSub?.title || subSlug, title),
            });
          }
        }
      });
    }

    // Ensure at least the exact 1 primary canonical subdossier exists even if no documents
    if (subdossiers.length === 0) {
      const primaryTitle = (CANONICAL_PRIMARY_SUBDOSSIERS as any)[title] || title;
      const primarySlug = slugify(primaryTitle);
      subdossiers.push({
        id: primarySlug,
        title: primaryTitle,
        slug: primarySlug,
        hoofddossier: title,
        documentCount: 0,
        uploadedCount: 0,
        dateRange: { start: null, end: null },
        wijken: [],
        tags: [],
        description: `Standaard subdossier voor ${title}.`,
        thumbnail: getSubdossierThumbnail(primaryTitle, title),
      });
    }

    // Sort subdossiers: primary first or by document count descending
    subdossiers.sort((a, b) => b.documentCount - a.documentCount);

    dossiers.push({
      id: slug,
      title: title,
      slug: slug,
      description: preset.description,
      category: preset.category,
      thumbnail: preset.thumbnail,
      tags: Array.from(tagSet).slice(0, 5),
      documentCount: docs.length,
      uploadedCount,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      documents: docs,
      subdossiers,
      subdossierCount: subdossiers.length,
      wijken: Array.from(allWijkenSet),
      isCustom: false,
      wijkSlug: preset.wijkSlug,
      wijkNaam: preset.wijkNaam,
      createdAt: docs[docs.length - 1]?.datum || new Date().toISOString(),
      updatedAt: docs[0]?.datum || new Date().toISOString(),
    });
  }

  // Filter out deleted dossiers
  if (Array.isArray(deletedSlugs) && deletedSlugs.length > 0) {
    const deletedSet = new Set(deletedSlugs.map((s) => s.toLowerCase()));
    dossiers = dossiers.filter((d) => !deletedSet.has(d.slug.toLowerCase()) && !deletedSet.has(d.id.toLowerCase()));
  }

  // Merge custom dossiers and overrides
  if (Array.isArray(customDossiers)) {
    customDossiers.forEach((custom) => {
      if (!custom || !custom.title) return;
      const customSlug = custom.slug || slugify(custom.title);
      if (Array.isArray(deletedSlugs) && deletedSlugs.some((s) => s.toLowerCase() === customSlug.toLowerCase())) {
        return;
      }

      const existingIdx = dossiers.findIndex(
        (d) => d.id === custom.id || d.slug === customSlug || d.title.toLowerCase() === custom.title.toLowerCase()
      );

      // Re-verify file existence for custom documents
      const customDocs = Array.isArray(custom.documents)
        ? custom.documents.map((d: DossierDocument) => {
            const check = checkFileExists(d.bestandsnaam);
            return {
              ...d,
              fileExists: check.exists,
              fileUrl: check.fileUrl || d.fileUrl,
              fileSize: check.fileSize || d.fileSize,
            };
          })
        : undefined;

      if (existingIdx >= 0) {
        // Replace or override with custom properties
        const finalDocs = customDocs !== undefined ? customDocs : dossiers[existingIdx].documents;
        const uploadedCount = finalDocs.filter((d) => d.fileExists).length;

        const dates = finalDocs.map((d) => d.datum).filter(Boolean) as string[];
        dates.sort();
        const startDate = dates.length > 0 ? dates[0] : dossiers[existingIdx].dateRange.start;
        const endDate = dates.length > 0 ? dates[dates.length - 1] : dossiers[existingIdx].dateRange.end;

        dossiers[existingIdx] = {
          ...dossiers[existingIdx],
          ...custom,
          slug: customSlug,
          documents: finalDocs,
          documentCount: finalDocs.length,
          uploadedCount,
          dateRange: { start: startDate, end: endDate },
          isCustom: true,
          updatedAt: custom.updatedAt || new Date().toISOString(),
        };
      } else {
        const finalDocs = customDocs || [];
        const uploadedCount = finalDocs.filter((d) => d.fileExists).length;
        const dates = finalDocs.map((d) => d.datum).filter(Boolean) as string[];
        dates.sort();

        dossiers.push({
          id: custom.id || `custom-${Date.now()}-${customSlug}`,
          title: custom.title.trim(),
          slug: customSlug,
          description: custom.description || `Dossier ${custom.title.trim()}`,
          category: custom.category || "Gemeenteraad & Beleid",
          thumbnail: custom.thumbnail || DEFAULT_THUMBNAIL,
          tags: Array.isArray(custom.tags) ? custom.tags : [],
          documentCount: finalDocs.length,
          uploadedCount,
          dateRange: {
            start: dates[0] || null,
            end: dates[dates.length - 1] || null,
          },
          documents: finalDocs,
          isCustom: true,
          createdAt: custom.createdAt || new Date().toISOString(),
          updatedAt: custom.updatedAt || new Date().toISOString(),
        });
      }
    });
  }

  // Sort dossiers by document count descending
  dossiers.sort((a, b) => b.documentCount - a.documentCount);

  return dossiers;
}

// Get subnetwork graph for a specific dossier - fast inverted index, optimized for large document collections
export function getDossierGraph(dossierTitleOrSlug: string, db?: any, subdossierSlugOrTitle?: string): NetworkGraphData {
  const allDossiers = getAllDossiers(
    db?.customDossiers || [],
    db?.deletedDossierSlugs || [],
    db?.customSubdossiers || {}
  );
  const cleanSearch = (dossierTitleOrSlug || "").toLowerCase().trim();
  const searchSlug = slugify(cleanSearch);
  const matchedDossier = allDossiers.find(
    (d) =>
      d.id?.toLowerCase() === cleanSearch ||
      d.slug?.toLowerCase() === cleanSearch ||
      d.title.toLowerCase() === cleanSearch ||
      slugify(d.slug || "") === searchSlug ||
      slugify(d.title || "") === searchSlug ||
      (d.id && slugify(d.id) === searchSlug)
  );

  const fullGraph = getRawNetworkGraph();
  if (!matchedDossier || !matchedDossier.documents || matchedDossier.documents.length === 0) {
    return { nodes: [], edges: [] };
  }

  let docs = matchedDossier.documents;
  if (subdossierSlugOrTitle) {
    const sClean = subdossierSlugOrTitle.toLowerCase().trim();
    const subFiltered = docs.filter(
      (d) =>
        (d.subdossier && d.subdossier.toLowerCase() === sClean) ||
        slugify(d.subdossier || "") === slugify(sClean)
    );
    if (subFiltered.length > 0) {
      docs = subFiltered;
    }
  }

  // To guarantee sub-50ms performance and fluid rendering when a dossier contains thousands of documents,
  // we sample the active graph nodes up to 150 items and build connections via an inverted index.
  const MAX_GRAPH_DOCS = 150;
  const sampleDocs = docs.length > MAX_GRAPH_DOCS ? docs.slice(0, MAX_GRAPH_DOCS) : docs;
  const docFileNames = new Set(sampleDocs.map((d) => d.bestandsnaam));
  const docEdgesMap = new Map<string, { source: string; target: string; reasons: string[] }>();

  // 1. Intermediary targets from full graph
  const targetToDocs = new Map<string, string[]>();
  fullGraph.edges.forEach((e) => {
    if (docFileNames.has(e.source)) {
      if (!targetToDocs.has(e.target)) targetToDocs.set(e.target, []);
      targetToDocs.get(e.target)!.push(e.source);
    }
  });

  for (const [target, matchingDocs] of targetToDocs.entries()) {
    if (matchingDocs.length > 1) {
      const limit = Math.min(matchingDocs.length, 8);
      for (let i = 0; i < limit; i++) {
        for (let j = i + 1; j < limit; j++) {
          const key = [matchingDocs[i], matchingDocs[j]].sort().join("|||");
          if (!docEdgesMap.has(key)) {
            docEdgesMap.set(key, { source: matchingDocs[i], target: matchingDocs[j], reasons: [] });
          }
          docEdgesMap.get(key)!.reasons.push(target);
        }
      }
    }
  }

  // 2. Inverted index for entity matching (O(N) instead of O(N^2))
  const entityToDocs = new Map<string, string[]>();
  sampleDocs.forEach((doc) => {
    const ents = (Array.isArray(doc.entiteiten) ? doc.entiteiten : [])
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 3 && s !== "gemeente" && s !== "steenwijkerland");
    ents.forEach((ent) => {
      if (!entityToDocs.has(ent)) entityToDocs.set(ent, []);
      entityToDocs.get(ent)!.push(doc.bestandsnaam);
    });
  });

  for (const [ent, matchingDocs] of entityToDocs.entries()) {
    if (matchingDocs.length > 1 && matchingDocs.length <= 40) {
      const limit = Math.min(matchingDocs.length, 6);
      for (let i = 0; i < limit; i++) {
        for (let j = i + 1; j < limit; j++) {
          const key = [matchingDocs[i], matchingDocs[j]].sort().join("|||");
          if (!docEdgesMap.has(key)) {
            docEdgesMap.set(key, { source: matchingDocs[i], target: matchingDocs[j], reasons: [] });
          }
          docEdgesMap.get(key)!.reasons.push(`Gedeeld onderwerp: ${ent}`);
        }
      }
    }
  }

  // 3. Direct references / relations
  const filenameSet = new Set(sampleDocs.map((d) => d.bestandsnaam.toLowerCase()));
  sampleDocs.forEach((docA) => {
    const relStr = (Array.isArray(docA.relaties) ? docA.relaties.join(" ") : (docA.relaties || "")).toLowerCase();
    if (relStr) {
      for (const fn of filenameSet) {
        if (fn !== docA.bestandsnaam.toLowerCase() && relStr.includes(fn)) {
          const key = [docA.bestandsnaam, fn].sort().join("|||");
          if (!docEdgesMap.has(key)) {
            docEdgesMap.set(key, { source: docA.bestandsnaam, target: fn, reasons: [] });
          }
          docEdgesMap.get(key)!.reasons.push("Directe verwijzing");
        }
      }
    }
  });

  // 4. Sequential connection for first items if edges are sparse
  if (sampleDocs.length > 1 && docEdgesMap.size < 5) {
    const seqLimit = Math.min(sampleDocs.length - 1, 20);
    for (let i = 0; i < seqLimit; i++) {
      const key = [sampleDocs[i].bestandsnaam, sampleDocs[i + 1].bestandsnaam].sort().join("|||");
      if (!docEdgesMap.has(key)) {
        docEdgesMap.set(key, {
          source: sampleDocs[i].bestandsnaam,
          target: sampleDocs[i + 1].bestandsnaam,
          reasons: ["Procedurele opvolging"],
        });
      }
    }
  }

  // Format edges with clean descriptive labels
  const formattedEdges: GraphEdge[] = Array.from(docEdgesMap.values()).map((e) => {
    const uniqueReasons = Array.from(new Set(e.reasons));
    const primary = uniqueReasons[0] || "Verbonden document";
    return {
      source: e.source,
      target: e.target,
      label: uniqueReasons.length > 1 ? `${primary} (+${uniqueReasons.length - 1})` : primary,
      reasons: uniqueReasons,
    };
  });

  // Determine connected document IDs
  const connectedDocIds = new Set<string>();
  formattedEdges.forEach((e) => {
    connectedDocIds.add(e.source);
    connectedDocIds.add(e.target);
  });

  // Return connected document nodes (or all sampled docs if <= 10)
  const finalDocNodes: GraphNode[] = sampleDocs
    .filter((d) => connectedDocIds.has(d.bestandsnaam) || sampleDocs.length <= 10)
    .map((d) => ({
      id: d.bestandsnaam,
      label: d.titel || d.bestandsnaam,
      group: matchedDossier.title,
      type: "Raadsstuk",
      date: d.datum || null,
      dossier: matchedDossier.title,
      bestandsnaam: d.bestandsnaam,
    }));

  return {
    nodes: finalDocNodes,
    edges: formattedEdges,
  };
}

// Save a new custom dossier to SQLite db
export function createCustomDossier(
  payload: Partial<Dossier> & { title: string },
  db: any,
  saveDbFn: (db: any) => void
): Dossier {
  if (!db.customDossiers) db.customDossiers = [];
  const slug = payload.slug || slugify(payload.title);
  const now = new Date().toISOString();

  // If was previously marked as deleted, unmark it
  if (Array.isArray(db.deletedDossierSlugs)) {
    db.deletedDossierSlugs = db.deletedDossierSlugs.filter((s: string) => s !== slug && s !== payload.id);
  }

  const newDossier: Dossier = {
    id: `custom-${Date.now()}-${slug}`,
    title: payload.title.trim(),
    slug,
    description: payload.description || `Dossier ${payload.title.trim()}`,
    category: payload.category || "Gemeenteraad & Beleid",
    thumbnail: payload.thumbnail || DEFAULT_THUMBNAIL,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    documentCount: payload.documents?.length || 0,
    uploadedCount: payload.documents?.filter((d: any) => d.fileExists)?.length || 0,
    dateRange: payload.dateRange || { start: null, end: null },
    documents: payload.documents || [],
    isCustom: true,
    wijkSlug: payload.wijkSlug,
    wijkNaam: payload.wijkNaam,
    createdAt: now,
    updatedAt: now,
  };

  db.customDossiers.unshift(newDossier);
  saveDbFn(db);
  return newDossier;
}

// Update an existing dossier in SQLite db (title, description, category, thumbnail, tags, etc.)
export function updateDossier(
  idOrSlug: string,
  updates: Partial<Dossier>,
  db: any,
  saveDbFn: (db: any) => void
): Dossier | null {
  if (!db.customDossiers) db.customDossiers = [];
  const allDossiers = getAllDossiers(db.customDossiers, db.deletedDossierSlugs || []);
  const existing = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!existing) return null;

  const customIndex = db.customDossiers.findIndex(
    (d: Dossier) => d.id === idOrSlug || d.slug === idOrSlug || d.title.toLowerCase() === existing.title.toLowerCase()
  );

  const updatedDocs = Array.isArray(updates.documents) ? updates.documents : existing.documents;
  const dates = updatedDocs.map((d) => d.datum).filter(Boolean) as string[];
  dates.sort();

  const updated: Dossier = {
    ...existing,
    ...updates,
    slug: updates.title && updates.title !== existing.title ? slugify(updates.title) : existing.slug,
    documents: updatedDocs,
    documentCount: updatedDocs.length,
    uploadedCount: updatedDocs.filter((d) => d.fileExists).length,
    dateRange: {
      start: dates[0] || null,
      end: dates[dates.length - 1] || null,
    },
    isCustom: true,
    updatedAt: new Date().toISOString(),
  };

  if (customIndex >= 0) {
    db.customDossiers[customIndex] = updated;
  } else {
    db.customDossiers.push(updated);
  }

  saveDbFn(db);
  return updated;
}

// Delete a dossier (soft delete via deletedDossierSlugs + remove from customDossiers)
export function deleteDossier(
  idOrSlug: string,
  db: any,
  saveDbFn: (db: any) => void
): boolean {
  if (!db.deletedDossierSlugs) db.deletedDossierSlugs = [];
  if (!db.customDossiers) db.customDossiers = [];

  const allDossiers = getAllDossiers(db.customDossiers, db.deletedDossierSlugs);
  const matched = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!matched) return false;

  if (!db.deletedDossierSlugs.includes(matched.slug)) {
    db.deletedDossierSlugs.push(matched.slug);
  }
  if (!db.deletedDossierSlugs.includes(matched.id)) {
    db.deletedDossierSlugs.push(matched.id);
  }

  db.customDossiers = db.customDossiers.filter((d: Dossier) => d.id !== matched.id && d.slug !== matched.slug);
  saveDbFn(db);
  return true;
}

// Helper to update master metadata when document attributes change
function syncDocToMasterMetadata(
  filename: string,
  docProps: {
    titel?: string;
    dossier?: string;
    subdossier?: string;
    datum?: string | null;
    wijk_of_kern?: string;
    entiteiten?: string[] | string;
    relaties?: string[] | string;
  }
) {
  try {
    const masterList = getRawMetadata();
    const cleanFilename = path.basename(filename.trim()).toLowerCase();
    const idx = masterList.findIndex((m) => m.bestandsnaam.toLowerCase() === cleanFilename);

    const entStr = Array.isArray(docProps.entiteiten)
      ? docProps.entiteiten.join(", ")
      : docProps.entiteiten || "";
    const relStr = Array.isArray(docProps.relaties)
      ? docProps.relaties.join(", ")
      : docProps.relaties || "";

    if (idx >= 0) {
      masterList[idx] = {
        ...masterList[idx],
        titel: docProps.titel !== undefined ? docProps.titel : masterList[idx].titel,
        dossier: docProps.dossier !== undefined ? docProps.dossier : masterList[idx].dossier,
        subdossier: docProps.subdossier !== undefined ? docProps.subdossier : masterList[idx].subdossier,
        datum: docProps.datum !== undefined ? (docProps.datum || "") : masterList[idx].datum,
        wijk_of_kern: docProps.wijk_of_kern !== undefined ? docProps.wijk_of_kern : (masterList[idx].wijk_of_kern || ""),
        entiteiten: entStr || masterList[idx].entiteiten || "",
        relaties: relStr || masterList[idx].relaties || "",
      };
    } else {
      masterList.unshift({
        bestandsnaam: path.basename(filename.trim()),
        titel: docProps.titel || path.basename(filename.trim()).replace(/\.pdf$/i, ""),
        dossier: docProps.dossier || "Bestuur, Financiën & Organisatie",
        subdossier: docProps.subdossier || docProps.dossier || "Bestuur, Financiën & Organisatie",
        datum: docProps.datum || new Date().toISOString().split("T")[0],
        wijk_of_kern: docProps.wijk_of_kern || "",
        entiteiten: entStr,
        relaties: relStr,
      });
    }

    saveMasterMetadata(masterList);
  } catch (err) {
    console.error("Error syncing document to master metadata:", err);
  }
}

// Add a document manually to a dossier
export function addDocumentToDossier(
  idOrSlug: string,
  docData: Partial<DossierDocument> & { titel: string; bestandsnaam: string },
  db: any,
  saveDbFn: (db: any) => void
): { dossier: Dossier; document: DossierDocument } | null {
  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || [], db.customSubdossiers);
  const dossier = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!dossier) return null;

  const cleanFilename = path.basename(docData.bestandsnaam.trim());
  const fileCheck = checkFileExists(cleanFilename);

  const primaryTitle = (CANONICAL_PRIMARY_SUBDOSSIERS as any)[dossier.title] || dossier.title;
  const targetSubdossier = (docData.subdossier && docData.subdossier.trim()) ? docData.subdossier.trim() : primaryTitle;
  const rawWijk = (docData.wijk_of_kern || "").trim();
  const docWijken = rawWijk ? rawWijk.split(",").map((w) => w.trim()).filter(Boolean) : [];

  const newDoc: DossierDocument = {
    id: `doc-manual-${Date.now()}-${slugify(cleanFilename)}`,
    bestandsnaam: cleanFilename,
    titel: docData.titel.trim(),
    dossier: dossier.title,
    subdossier: targetSubdossier,
    wijk_of_kern: rawWijk,
    wijken: docWijken,
    datum: docData.datum || new Date().toISOString().split("T")[0],
    entiteiten: Array.isArray(docData.entiteiten)
      ? docData.entiteiten
      : typeof docData.entiteiten === "string"
      ? (docData.entiteiten as string).split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    relaties: Array.isArray(docData.relaties)
      ? docData.relaties
      : typeof docData.relaties === "string"
      ? (docData.relaties as string).split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    fileExists: fileCheck.exists,
    fileUrl: fileCheck.fileUrl,
    fileSize: fileCheck.fileSize,
    uploadedAt: fileCheck.exists ? new Date().toISOString() : undefined,
  };

  // Avoid duplicates with same bestandsnaam; if exists, update it
  const existingDocIdx = dossier.documents.findIndex((d) => d.bestandsnaam === cleanFilename);
  const updatedDocuments = [...dossier.documents];

  if (existingDocIdx >= 0) {
    updatedDocuments[existingDocIdx] = {
      ...updatedDocuments[existingDocIdx],
      ...newDoc,
    };
  } else {
    updatedDocuments.unshift(newDoc);
  }

  const updatedDossier = updateDossier(
    idOrSlug,
    {
      documents: updatedDocuments,
      updatedAt: new Date().toISOString(),
    },
    db,
    saveDbFn
  );

  // Sync to persistent master metadata
  syncDocToMasterMetadata(cleanFilename, {
    titel: newDoc.titel,
    dossier: dossier.title,
    subdossier: targetSubdossier,
    datum: newDoc.datum,
    wijk_of_kern: rawWijk,
    entiteiten: newDoc.entiteiten,
    relaties: newDoc.relaties,
  });

  if (!updatedDossier) return null;
  return { dossier: updatedDossier, document: newDoc };
}

// Update a specific document inside a dossier
export function updateDocumentInDossier(
  idOrSlug: string,
  docIdOrFilename: string,
  updates: Partial<DossierDocument>,
  db: any,
  saveDbFn: (db: any) => void
): { dossier: Dossier; document: DossierDocument } | null {
  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || [], db.customSubdossiers);
  const dossier = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!dossier) return null;

  const docIdx = dossier.documents.findIndex(
    (d) => d.id === docIdOrFilename || d.bestandsnaam === docIdOrFilename
  );
  if (docIdx < 0) return null;

  const existingDoc = dossier.documents[docIdx];
  const targetFilename = updates.bestandsnaam ? path.basename(updates.bestandsnaam.trim()) : existingDoc.bestandsnaam;
  const fileCheck = checkFileExists(targetFilename);

  const rawWijk = updates.wijk_of_kern !== undefined ? updates.wijk_of_kern.trim() : (existingDoc.wijk_of_kern || "");
  const docWijken = rawWijk ? rawWijk.split(",").map((w) => w.trim()).filter(Boolean) : (existingDoc.wijken || []);
  const targetSubdossier = updates.subdossier !== undefined ? updates.subdossier.trim() : (existingDoc.subdossier || dossier.title);

  const updatedDoc: DossierDocument = {
    ...existingDoc,
    ...updates,
    bestandsnaam: targetFilename,
    titel: updates.titel !== undefined ? updates.titel.trim() : existingDoc.titel,
    subdossier: targetSubdossier,
    wijk_of_kern: rawWijk,
    wijken: docWijken,
    datum: updates.datum !== undefined ? updates.datum : existingDoc.datum,
    entiteiten: Array.isArray(updates.entiteiten)
      ? updates.entiteiten
      : typeof updates.entiteiten === "string"
      ? (updates.entiteiten as string).split(",").map((s) => s.trim()).filter(Boolean)
      : existingDoc.entiteiten,
    relaties: Array.isArray(updates.relaties)
      ? updates.relaties
      : typeof updates.relaties === "string"
      ? (updates.relaties as string).split(",").map((s) => s.trim()).filter(Boolean)
      : existingDoc.relaties,
    fileExists: fileCheck.exists,
    fileUrl: fileCheck.fileUrl || existingDoc.fileUrl,
    fileSize: fileCheck.fileSize || existingDoc.fileSize,
  };

  const updatedDocuments = [...dossier.documents];
  updatedDocuments[docIdx] = updatedDoc;

  const updatedDossier = updateDossier(
    idOrSlug,
    {
      documents: updatedDocuments,
      updatedAt: new Date().toISOString(),
    },
    db,
    saveDbFn
  );

  // Sync to master metadata
  syncDocToMasterMetadata(targetFilename, {
    titel: updatedDoc.titel,
    dossier: updatedDoc.dossier || dossier.title,
    subdossier: targetSubdossier,
    datum: updatedDoc.datum,
    wijk_of_kern: rawWijk,
    entiteiten: updatedDoc.entiteiten,
    relaties: updatedDoc.relaties,
  });

  if (!updatedDossier) return null;
  return { dossier: updatedDossier, document: updatedDoc };
}

// Create a new subdossier under a hoofddossier, optionally pre-assigning documents
export function createSubdossier(
  idOrSlug: string,
  subData: {
    title: string;
    description?: string;
    thumbnail?: string;
    tags?: string[];
    documentIds?: string[];
  },
  db: any,
  saveDbFn: (db: any) => void
): { success: boolean; subdossier: any; dossier: Dossier } | null {
  if (!db.customSubdossiers) db.customSubdossiers = {};

  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || [], db.customSubdossiers);
  const dossier = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!dossier) return null;

  const rawTitle = subData.title.trim();
  if (!rawTitle) return null;

  const subSlug = slugify(rawTitle);
  const key = `${dossier.slug}:${subSlug}`;

  const createdSub = {
    id: subSlug,
    title: rawTitle,
    slug: subSlug,
    hoofddossier: dossier.title,
    description: subData.description?.trim() || `${rawTitle} binnen ${dossier.title}.`,
    thumbnail: subData.thumbnail?.trim() || getSubdossierThumbnail(rawTitle, dossier.title),
    tags: subData.tags || [],
    createdAt: new Date().toISOString(),
  };

  db.customSubdossiers[key] = createdSub;

  // If initial documentIds or filenames provided, distribute them into this new subdossier
  if (Array.isArray(subData.documentIds) && subData.documentIds.length > 0) {
    distributeDocumentsToSubdossier(
      dossier.slug,
      rawTitle,
      subData.documentIds,
      db,
      () => {}
    );
  }

  saveDbFn(db);

  // Return fresh dossier
  const refreshedDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || [], db.customSubdossiers);
  const refreshed = refreshedDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug) || dossier;

  return { success: true, subdossier: createdSub, dossier: refreshed };
}

// Distribute / move a batch of documents to a target subdossier within a hoofddossier
export function distributeDocumentsToSubdossier(
  idOrSlug: string,
  targetSubdossierTitle: string,
  documentIdsOrFilenames: string[],
  db: any,
  saveDbFn: (db: any) => void
): { success: boolean; distributedCount: number; targetSubdossier: string; dossier: Dossier } | null {
  if (!db.customSubdossiers) db.customSubdossiers = {};

  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || [], db.customSubdossiers);
  const dossier = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!dossier) return null;

  const targetTitle = targetSubdossierTitle.trim();
  if (!targetTitle) return null;

  const targetSubSlug = slugify(targetTitle);
  const subKey = `${dossier.slug}:${targetSubSlug}`;

  // If not canonical primary, make sure customSubdossiers registers this title so it stays recognized
  const primaryTitle = (CANONICAL_PRIMARY_SUBDOSSIERS as any)[dossier.title] || dossier.title;
  if (targetTitle.toLowerCase() !== primaryTitle.toLowerCase() && !db.customSubdossiers[subKey]) {
    db.customSubdossiers[subKey] = {
      id: targetSubSlug,
      title: targetTitle,
      slug: targetSubSlug,
      hoofddossier: dossier.title,
      description: `${targetTitle} binnen ${dossier.title}.`,
      thumbnail: getSubdossierThumbnail(targetTitle, dossier.title),
      tags: [],
      createdAt: new Date().toISOString(),
    };
  }

  // Update in master metadata
  const masterList = getRawMetadata();
  let distributedCount = 0;
  const targetIds = new Set(documentIdsOrFilenames.map((id) => id.toLowerCase().trim()));

  masterList.forEach((m) => {
    const matchesFilename = targetIds.has(m.bestandsnaam.toLowerCase().trim());
    const matchesId = Array.from(targetIds).some((tid) => tid.includes(slugify(m.bestandsnaam)));
    if (matchesFilename || matchesId) {
      m.subdossier = targetTitle;
      distributedCount++;
    }
  });

  saveMasterMetadata(masterList);
  saveDbFn(db);

  // Return fresh dossier
  const refreshedDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || [], db.customSubdossiers);
  const refreshed = refreshedDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug) || dossier;

  return { success: true, distributedCount, targetSubdossier: targetTitle, dossier: refreshed };
}

// Delete a custom subdossier and reassign all its documents to the primary canonical subdossier
export function deleteSubdossier(
  idOrSlug: string,
  subSlug: string,
  db: any,
  saveDbFn: (db: any) => void
): { success: boolean; reassignedCount: number; dossier: Dossier } | null {
  if (!db.customSubdossiers) db.customSubdossiers = {};

  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || [], db.customSubdossiers);
  const dossier = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!dossier) return null;

  const key = `${dossier.slug}:${subSlug}`;
  const customSub = db.customSubdossiers[key];
  const subTitle = customSub?.title || subSlug;

  const primaryTitle = (CANONICAL_PRIMARY_SUBDOSSIERS as any)[dossier.title] || dossier.title;

  // Reassign any documents with this subdossier to the primary subdossier
  const masterList = getRawMetadata();
  let reassignedCount = 0;

  masterList.forEach((m) => {
    if (
      m.dossier === dossier.title &&
      (slugify(m.subdossier || "") === subSlug || (m.subdossier || "").toLowerCase() === subTitle.toLowerCase())
    ) {
      m.subdossier = primaryTitle;
      reassignedCount++;
    }
  });

  saveMasterMetadata(masterList);

  delete db.customSubdossiers[key];
  saveDbFn(db);

  const refreshedDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || [], db.customSubdossiers);
  const refreshed = refreshedDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug) || dossier;

  return { success: true, reassignedCount, dossier: refreshed };
}

// Remove / unlink a document from a dossier
export function removeDocumentFromDossier(
  idOrSlug: string,
  docIdOrFilename: string,
  db: any,
  saveDbFn: (db: any) => void
): Dossier | null {
  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || []);
  const dossier = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!dossier) return null;

  const filteredDocuments = dossier.documents.filter(
    (d) => d.id !== docIdOrFilename && d.bestandsnaam !== docIdOrFilename
  );

  return updateDossier(
    idOrSlug,
    {
      documents: filteredDocuments,
      updatedAt: new Date().toISOString(),
    },
    db,
    saveDbFn
  );
}

// Link multiple existing documents to a dossier (relaties versterken)
export function linkDocumentsToDossier(
  idOrSlug: string,
  docsToLink: DossierDocument[],
  db: any,
  saveDbFn: (db: any) => void
): Dossier | null {
  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || []);
  const dossier = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!dossier) return null;

  const currentMap = new Map<string, DossierDocument>();
  dossier.documents.forEach((d) => currentMap.set(d.bestandsnaam, d));

  docsToLink.forEach((d) => {
    const check = checkFileExists(d.bestandsnaam);
    currentMap.set(d.bestandsnaam, {
      ...d,
      dossier: dossier.title,
      fileExists: check.exists,
      fileUrl: check.fileUrl || d.fileUrl,
      fileSize: check.fileSize || d.fileSize,
    });
  });

  const updatedDocuments = Array.from(currentMap.values());
  return updateDossier(
    idOrSlug,
    {
      documents: updatedDocuments,
      updatedAt: new Date().toISOString(),
    },
    db,
    saveDbFn
  );
}

// Catalog of all unique documents across all dossiers
export function getAllCatalogDocuments(db: any): DossierDocument[] {
  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || []);
  const map = new Map<string, DossierDocument>();

  allDossiers.forEach((dossier) => {
    dossier.documents.forEach((doc) => {
      if (!map.has(doc.bestandsnaam)) {
        map.set(doc.bestandsnaam, doc);
      }
    });
  });

  return Array.from(map.values()).sort((a, b) => {
    if (!a.datum && !b.datum) return a.titel.localeCompare(b.titel);
    if (!a.datum) return 1;
    if (!b.datum) return -1;
    return new Date(b.datum).getTime() - new Date(a.datum).getTime();
  });
}

// Process bulk uploaded council documents (supports direct PDFs/documents and .ZIP archives)
export async function processUploadedCouncilDocuments(
  uploadedFiles: any[],
  syncFileFn: (filePath: string) => void
): Promise<{
  totalUploaded: number;
  zipCount: number;
  extractedFromZipCount: number;
  matchedCount: number;
  unmatchedCount: number;
  matchedDocuments: Array<{ filename: string; dossier: string; title: string; category?: string }>;
  unmatchedDocuments: string[];
  allSavedFiles: Array<{ filename: string; path: string }>;
  serverLogs: Array<{ timestamp: string; level: "info" | "success" | "warn" | "error"; tag?: string; message: string }>;
}> {
  const metadataList = getRawMetadata();
  const metadataByFilename = new Map<string, RaadsstukMetadata>();
  metadataList.forEach((item) => {
    const fn = (item.bestandsnaam || "").toLowerCase().trim();
    if (fn) {
      metadataByFilename.set(fn, item);
      try {
        metadataByFilename.set(decodeURIComponent(fn), item);
      } catch (_e) {
        // Fallback to non-decoded filename
      }
    }
  });

  const matchedDocuments: Array<{ filename: string; dossier: string; title: string; category?: string }> = [];
  const unmatchedDocuments: string[] = [];
  const allSavedFiles: Array<{ filename: string; path: string }> = [];
  const serverLogs: Array<{ timestamp: string; level: "info" | "success" | "warn" | "error"; tag?: string; message: string }> = [];
  let zipCount = 0;
  let extractedFromZipCount = 0;

  const addLog = (level: "info" | "success" | "warn" | "error", message: string, tag = "MATCH") => {
    const timeStr = new Date().toLocaleTimeString("nl-NL");
    serverLogs.push({ timestamp: timeStr, level, tag, message });
  };

  addLog("info", `Start verwerking van ${uploadedFiles.length} bestand(en) op de server...`, "START");

  // Helper to process a single saved buffer or file
  const processSingleFileRecord = (rawName: string, bufferOrSourcePath: Buffer | string, isFromZip = false) => {
    const lowerName = rawName.toLowerCase().trim();
    const cleanBasename = path.basename(rawName);

    // Determine subfolder & category
    let targetDir = DOCUMENTS_DIR;
    let category = "Steenwijkerland";

    if (lowerName.startsWith("overijssel/") || lowerName.includes("overijssel_") || rawName.includes("Provinciale Staten")) {
      targetDir = path.join(DOCUMENTS_DIR, "overijssel");
      category = "Provincie Overijssel";
    } else if (lowerName.startsWith("waterschap/") || lowerName.includes("wdodelta") || rawName.includes("Waterschap")) {
      targetDir = path.join(DOCUMENTS_DIR, "waterschap");
      category = "Waterschap WDODelta";
    } else if (lowerName.includes("zoetermeer")) {
      targetDir = path.join(DOCUMENTS_DIR, "zoetermeer");
      category = "Gemeente Zoetermeer";
    }

    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    } catch (_e) {}

    const targetFilePath = path.join(targetDir, cleanBasename);

    try {
      if (Buffer.isBuffer(bufferOrSourcePath)) {
        fs.writeFileSync(targetFilePath, bufferOrSourcePath);
      } else if (typeof bufferOrSourcePath === "string" && bufferOrSourcePath !== targetFilePath) {
        if (fs.existsSync(bufferOrSourcePath)) {
          fs.copyFileSync(bufferOrSourcePath, targetFilePath);
        }
      }

      // Sync to dist
      syncFileFn(targetFilePath);
    } catch (writeErr: any) {
      console.warn(`Could not write/sync uploaded file ${rawName}:`, writeErr);
      addLog("warn", `Bestand wegschrijven waarschuwing (${cleanBasename}): ${writeErr?.message || writeErr}`, "FILES");
    }

    allSavedFiles.push({
      filename: cleanBasename,
      path: targetFilePath,
    });

    if (isFromZip) {
      extractedFromZipCount++;
    }

    // Match against metadata
    let match = metadataByFilename.get(lowerName) || metadataByFilename.get(cleanBasename.toLowerCase().trim());
    if (!match) {
      try {
        match = metadataByFilename.get(decodeURIComponent(cleanBasename.toLowerCase().trim()));
      } catch (_e) {}
    }

    if (match) {
      matchedDocuments.push({
        filename: cleanBasename,
        dossier: match.dossier,
        title: match.titel || cleanBasename,
        category: match.entiteiten || category,
      });
      addLog("success", `Gekoppeld: "${cleanBasename}" ➔ Dossier: "${match.dossier}" (${match.titel || cleanBasename})`, "MATCH");
    } else {
      unmatchedDocuments.push(cleanBasename);
      addLog("info", `Opgeslagen in archief: "${cleanBasename}" (${category})`, "INDEX");
    }
  };

  for (const file of uploadedFiles) {
    const rawName = file.originalname || file.filename || "onbekend.pdf";
    const lower = rawName.toLowerCase();
    const isZip = lower.endsWith(".zip") || file.mimetype === "application/zip" || file.mimetype === "application/x-zip-compressed";

    if (isZip) {
      zipCount++;
      addLog("info", `📦 ZIP-archief gedetecteerd: "${rawName}". Start uitpakken...`, "UNZIP");
      let zipExtractedSuccessfully = false;

      // 1. First try native Linux /usr/bin/unzip (most robust for large 100MB-1GB+ ZIP archives)
      const tempExtractDir = path.join(process.cwd(), "data/temp_extract", `zip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      let sourceZipPath = file.path;

      if (!sourceZipPath || !fs.existsSync(sourceZipPath)) {
        if (file.buffer && file.buffer.length > 0) {
          const tempZipDir = path.join(process.cwd(), "data/temp_extract");
          if (!fs.existsSync(tempZipDir)) fs.mkdirSync(tempZipDir, { recursive: true });
          sourceZipPath = path.join(tempZipDir, `upload_${Date.now()}.zip`);
          fs.writeFileSync(sourceZipPath, file.buffer);
        }
      }

      if (sourceZipPath && fs.existsSync(sourceZipPath)) {
        try {
          fs.mkdirSync(tempExtractDir, { recursive: true });
          addLog("info", `Uitpakken met streaming Linux /usr/bin/unzip...`, "UNZIP");

          await new Promise<void>((resolve, reject) => {
            const proc = spawn("unzip", ["-o", "-q", sourceZipPath!, "-d", tempExtractDir]);
            let stderr = "";
            proc.stderr.on("data", (d) => {
              stderr += d.toString();
            });
            proc.on("error", (err) => reject(err));
            proc.on("close", (code) => {
              if (code === 0 || code === 1) {
                resolve();
              } else {
                reject(new Error(`unzip proces code ${code}: ${stderr}`));
              }
            });
          });

          // Recursively read all files in tempExtractDir
          const readAllFiles = (dir: string, base: string): Array<{ full: string; rel: string }> => {
            const list: Array<{ full: string; rel: string }> = [];
            if (!fs.existsSync(dir)) return list;
            const entries = fs.readdirSync(dir);
            for (const entry of entries) {
              if (entry === "__MACOSX" || entry.startsWith("._")) continue;
              const fullPath = path.join(dir, entry);
              const stat = fs.statSync(fullPath);
              if (stat.isDirectory()) {
                list.push(...readAllFiles(fullPath, base));
              } else {
                const rel = path.relative(base, fullPath).replace(/\\/g, "/");
                list.push({ full: fullPath, rel });
              }
            }
            return list;
          };

          const extractedFiles = readAllFiles(tempExtractDir, tempExtractDir);
          addLog("info", `Totaal ${extractedFiles.length} bestand(en) gevonden in het ZIP-archief.`, "UNZIP");

          if (extractedFiles.length > 0) {
            for (const item of extractedFiles) {
              const ext = path.extname(item.rel).toLowerCase();
              if ([".pdf", ".docx", ".doc", ".xlsx", ".csv", ".txt", ".json"].includes(ext) || !ext) {
                processSingleFileRecord(item.rel, item.full, true);
              }
            }
            zipExtractedSuccessfully = true;
            addLog("success", `ZIP-archief "${rawName}" succesvol verwerkt (${extractedFiles.length} documenten).`, "UNZIP");
          }
        } catch (unzipCliErr: any) {
          console.warn(`[NATIVE UNZIP FAILED, FALLING BACK TO ADMZIP for ${rawName}]:`, unzipCliErr);
          addLog("warn", `Native unzip melding: ${unzipCliErr?.message || unzipCliErr}. Poging met fallback parser...`, "UNZIP");
        } finally {
          // Clean up temp extraction folder
          try {
            if (fs.existsSync(tempExtractDir)) {
              fs.rmSync(tempExtractDir, { recursive: true, force: true });
            }
          } catch (_e) {}
        }
      }

      // 2. Fallback to AdmZip if native unzip did not extract files
      if (!zipExtractedSuccessfully) {
        try {
          addLog("info", `AdmZip fallback extractor starten voor "${rawName}"...`, "UNZIP");
          const zip = sourceZipPath && fs.existsSync(sourceZipPath) ? new AdmZip(sourceZipPath) : (file.buffer ? new AdmZip(file.buffer) : null);
          if (zip) {
            const zipEntries = zip.getEntries();
            addLog("info", `AdmZip vond ${zipEntries.length} items in het archief.`, "UNZIP");
            for (const entry of zipEntries) {
              if (entry.isDirectory || entry.entryName.includes("__MACOSX") || path.basename(entry.entryName).startsWith(".")) {
                continue;
              }
              const ext = path.extname(entry.entryName).toLowerCase();
              if ([".pdf", ".docx", ".doc", ".xlsx", ".csv", ".txt", ".json"].includes(ext) || !ext) {
                const entryBuffer = entry.getData();
                processSingleFileRecord(entry.entryName, entryBuffer, true);
              }
            }
            zipExtractedSuccessfully = true;
            addLog("success", `AdmZip uitpakken voltooid.`, "UNZIP");
          }
        } catch (zipErr: any) {
          console.error(`[ADMZIP UNPACK ERROR for ${rawName}]:`, zipErr);
          unmatchedDocuments.push(`${rawName} (ZIP uitpakfout)`);
          addLog("error", `Fout bij uitpakken ZIP "${rawName}": ${zipErr?.message || zipErr}`, "ERROR");
        }
      }

      // Clean up the uploaded zip file
      if (sourceZipPath && fs.existsSync(sourceZipPath)) {
        try {
          fs.unlinkSync(sourceZipPath);
        } catch (_e) {}
      }
    } else {
      // Regular single file
      processSingleFileRecord(rawName, file.path || file.buffer, false);
    }
  }

  const effectiveTotal = (uploadedFiles.length - zipCount) + extractedFromZipCount;
  addLog("success", `Afronding: ${matchedDocuments.length} documenten gekoppeld aan raadsdossiers, ${unmatchedDocuments.length} in algemeen archief.`, "DONE");

  return {
    totalUploaded: effectiveTotal > 0 ? effectiveTotal : uploadedFiles.length,
    zipCount,
    extractedFromZipCount,
    matchedCount: matchedDocuments.length,
    unmatchedCount: unmatchedDocuments.length,
    matchedDocuments,
    unmatchedDocuments,
    allSavedFiles,
    serverLogs,
  };
}

// Helper to parse CSV lines with quote support
export function parseMetadataCsv(csvContent: string): RaadsstukMetadata[] {
  const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detect delimiter: semicolon or comma
  const firstLine = lines[0];
  const delimiter = firstLine.includes(";") ? ";" : ",";

  function parseLine(line: string): string[] {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const header = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/["']/g, "").trim());
  const bestandsnaamIdx = header.findIndex((h) => h === "bestandsnaam" || h === "bestand" || h === "filename");
  const titelIdx = header.findIndex((h) => h === "titel" || h === "title");
  const dossierIdx = header.findIndex((h) => h === "dossier" || h === "onderwerp" || h === "thema");
  const datumIdx = header.findIndex((h) => h === "datum" || h === "date");
  const entiteitenIdx = header.findIndex((h) => h === "entiteiten" || h === "entities" || h === "tags");
  const relatiesIdx = header.findIndex((h) => h === "relaties" || h === "relations" || h === "referenties");
  const wijkIdx = header.findIndex((h) => h === "wijk_of_kern" || h === "wijk" || h === "kern");

  const itemMap = new Map<string, RaadsstukMetadata>();
  let duplicateCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const bestandsnaam = (cols[bestandsnaamIdx >= 0 ? bestandsnaamIdx : 0] || "").trim();
    if (!bestandsnaam) continue;

    const key = bestandsnaam.toLowerCase();
    if (itemMap.has(key)) {
      duplicateCount++;
    }

    const item: RaadsstukMetadata = {
      bestandsnaam,
      titel: cols[titelIdx >= 0 ? titelIdx : 1] || bestandsnaam.replace(/\.pdf$/i, ""),
      dossier: cols[dossierIdx >= 0 ? dossierIdx : 2] || "Algemeen",
      datum: cols[datumIdx >= 0 ? datumIdx : 3] || null,
      entiteiten: cols[entiteitenIdx >= 0 ? entiteitenIdx : 4] || "",
      relaties: cols[relatiesIdx >= 0 ? relatiesIdx : 5] || "",
    };

    if (wijkIdx >= 0 && cols[wijkIdx]) {
      item.wijk_of_kern = cols[wijkIdx];
    }
    itemMap.set(key, item);
  }

  const items = Array.from(itemMap.values());
  return items;
}

// Rebuild network graph from metadata items
export function rebuildNetworkGraph(items: RaadsstukMetadata[]): NetworkGraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();

  items.forEach((item) => {
    const fn = (item.bestandsnaam || "").trim();
    if (!fn) return;

    if (!nodeIds.has(fn)) {
      nodes.push({
        id: fn,
        label: (item.titel || fn).trim(),
        group: (item.dossier || "Algemeen").trim(),
        type: "Raadsstuk",
        date: item.datum || null,
      });
      nodeIds.add(fn);
    }

    const rels = item.relaties || "";
    if (rels) {
      const parts = rels.split(",").map((r) => r.trim()).filter(Boolean);
      parts.forEach((r) => {
        if (!nodeIds.has(r)) {
          nodes.push({
            id: r,
            label: r,
            group: "Referentie",
            type: "Relatie",
            date: null,
          });
          nodeIds.add(r);
        }
        edges.push({
          source: fn,
          target: r,
        });
      });
    }
  });

  const graph: NetworkGraphData = { nodes, edges };

  // Write to public/data/network_graph.json
  try {
    fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2), "utf-8");
    if (!fs.existsSync(DIST_DATA_DIR)) {
      fs.mkdirSync(DIST_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DIST_GRAPH_PATH, JSON.stringify(graph, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving updated network graph:", err);
  }

  return graph;
}

// Process updated metadata or graph file upload
export function processMetadataOrGraphUpload(
  fileContent: string,
  filename: string
): { success: boolean; type: "csv" | "metadata-json" | "network-graph"; itemsCount?: number; nodesCount?: number; edgesCount?: number; message: string } {
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith(".csv")) {
    const items = parseMetadataCsv(fileContent);
    if (items.length === 0) {
      throw new Error("Geen geldige raadsstukken rijen gevonden in de geüploade CSV.");
    }

    // Save to master persistent storage, SQLite, public and dist
    saveMasterMetadata(items, fileContent);
    const graph = getRawNetworkGraph();

    return {
      success: true,
      type: "csv",
      itemsCount: items.length,
      nodesCount: graph.nodes.length,
      edgesCount: graph.edges.length,
      message: `${items.length} documenten ingelezen en permanent opgeslagen in master catalogus. Netwerkgraaf automatisch bijgewerkt met ${graph.nodes.length} knooppunten en ${graph.edges.length} relaties.`,
    };
  } else if (lowerName.includes("network_graph") || lowerName.includes("graph")) {
    // Network graph JSON
    const parsed = JSON.parse(fileContent);
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      throw new Error("Ongeldig network_graph.json formaat: 'nodes' en 'edges' arrays ontbreken.");
    }

    fs.writeFileSync(GRAPH_PATH, JSON.stringify(parsed, null, 2), "utf-8");
    if (!fs.existsSync(DIST_DATA_DIR)) {
      fs.mkdirSync(DIST_DATA_DIR, { recursive: true });
    }
    try {
      fs.writeFileSync(DIST_GRAPH_PATH, JSON.stringify(parsed, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not write graph to dist:", e);
    }

    return {
      success: true,
      type: "network-graph",
      nodesCount: parsed.nodes.length,
      edgesCount: parsed.edges.length,
      message: `Netwerkgraaf succesvol bijgewerkt met ${parsed.nodes.length} knooppunten en ${parsed.edges.length} relaties.`,
    };
  } else {
    // Metadata JSON
    const parsed = JSON.parse(fileContent);
    const items: RaadsstukMetadata[] = Array.isArray(parsed) ? parsed : parsed.items || [];
    if (items.length === 0) {
      throw new Error("Ongeldig metadata JSON formaat: geen document array gevonden.");
    }

    saveMasterMetadata(items);
    const graph = getRawNetworkGraph();

    return {
      success: true,
      type: "metadata-json",
      itemsCount: items.length,
      nodesCount: graph.nodes.length,
      edgesCount: graph.edges.length,
      message: `${items.length} documenten permanent opgeslagen via master metadata JSON. Netwerkgraaf gesynchroniseerd.`,
    };
  }
}

export interface MissingDocumentDetail {
  id: string;
  bestandsnaam: string;
  titel: string;
  dossier: string;
  dossierSlug: string;
  dossierCategory: string;
  datum: string | null;
  entiteiten: string[];
  relaties: string[];
  linkCount: number;
}

export interface UniqueMissingFile {
  bestandsnaam: string;
  titel: string;
  dossiers: Array<{ title: string; slug: string; category: string }>;
  datum: string | null;
  linkCount: number;
}

export interface MissingDocumentsReport {
  totalDossiers: number;
  totalDocuments: number;
  totalUploadedFiles: number;
  totalMissingLinks: number;
  uniqueMissingFilesCount: number;
  missingDocuments: MissingDocumentDetail[];
  uniqueMissingFiles: UniqueMissingFile[];
}

/**
 * Audit and list all documents linked across dossiers that do not physically exist on the server.
 */
export function getMissingCouncilDocuments(db: any): MissingDocumentsReport {
  const allDossiers = getAllDossiers(db?.customDossiers || [], db?.deletedDossierSlugs || []);

  let totalDocuments = 0;
  let totalUploadedFiles = 0;

  const missingDocs: MissingDocumentDetail[] = [];
  const uniqueMap = new Map<string, UniqueMissingFile>();

  allDossiers.forEach((dossier) => {
    totalDocuments += dossier.documentCount;
    totalUploadedFiles += dossier.uploadedCount;

    dossier.documents.forEach((doc) => {
      if (!doc.fileExists) {
        const cleanName = (doc.bestandsnaam || "").trim();
        const key = cleanName.toLowerCase();

        missingDocs.push({
          id: doc.id,
          bestandsnaam: doc.bestandsnaam,
          titel: doc.titel || doc.bestandsnaam,
          dossier: dossier.title,
          dossierSlug: dossier.slug,
          dossierCategory: dossier.category || "Algemeen",
          datum: doc.datum || null,
          entiteiten: doc.entiteiten || [],
          relaties: doc.relaties || [],
          linkCount: 1,
        });

        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            bestandsnaam: doc.bestandsnaam,
            titel: doc.titel || doc.bestandsnaam,
            dossiers: [
              {
                title: dossier.title,
                slug: dossier.slug,
                category: dossier.category || "Algemeen",
              },
            ],
            datum: doc.datum || null,
            linkCount: 1,
          });
        } else {
          const entry = uniqueMap.get(key)!;
          entry.linkCount++;
          if (!entry.dossiers.some((d) => d.slug === dossier.slug)) {
            entry.dossiers.push({
              title: dossier.title,
              slug: dossier.slug,
              category: dossier.category || "Algemeen",
            });
          }
          if (!entry.datum && doc.datum) {
            entry.datum = doc.datum;
          }
        }
      }
    });
  });

  // Sync linkCount on detailed entries
  missingDocs.forEach((doc) => {
    const key = (doc.bestandsnaam || "").trim().toLowerCase();
    const entry = uniqueMap.get(key);
    if (entry) {
      doc.linkCount = entry.linkCount;
    }
  });

  // Sort detailed by dossier, then filename
  missingDocs.sort((a, b) => {
    const compDossier = a.dossier.localeCompare(b.dossier, "nl");
    if (compDossier !== 0) return compDossier;
    return a.bestandsnaam.localeCompare(b.bestandsnaam, "nl");
  });

  const uniqueMissingFiles = Array.from(uniqueMap.values()).sort((a, b) => {
    return a.bestandsnaam.localeCompare(b.bestandsnaam, "nl");
  });

  return {
    totalDossiers: allDossiers.length,
    totalDocuments,
    totalUploadedFiles,
    totalMissingLinks: totalDocuments - totalUploadedFiles,
    uniqueMissingFilesCount: uniqueMissingFiles.length,
    missingDocuments: missingDocs,
    uniqueMissingFiles,
  };
}

/**
 * Generate Excel-compatible CSV export of missing files.
 */
export function generateMissingDocumentsCsv(
  report: MissingDocumentsReport,
  mode: "detailed" | "unique" = "detailed"
): string {
  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const separator = ";"; // Dutch/European Excel semicolon
  let csv = "\uFEFF"; // UTF-8 BOM for Microsoft Excel

  if (mode === "unique") {
    csv +=
      [
        "Bestandsnaam",
        "Titel",
        "Aantal Keer Gekoppeld",
        "Gekoppelde Dossiers",
        "Datum",
        "Status",
      ]
        .map(escapeCsv)
        .join(separator) + "\r\n";

    for (const item of report.uniqueMissingFiles) {
      const dossiersStr = item.dossiers.map((d) => d.title).join(", ");
      csv +=
        [
          item.bestandsnaam,
          item.titel,
          item.linkCount,
          dossiersStr,
          item.datum || "",
          "Fysiek PDF-bestand ontbreekt op server",
        ]
          .map(escapeCsv)
          .join(separator) + "\r\n";
    }
  } else {
    // Detailed list
    csv +=
      [
        "Bestandsnaam",
        "Titel",
        "Dossier",
        "Dossier Categorie",
        "Datum",
        "Aantal Keer Gekoppeld In Totaal",
        "Status",
      ]
        .map(escapeCsv)
        .join(separator) + "\r\n";

    for (const doc of report.missingDocuments) {
      csv +=
        [
          doc.bestandsnaam,
          doc.titel,
          doc.dossier,
          doc.dossierCategory,
          doc.datum || "",
          doc.linkCount,
          "Fysiek PDF-bestand ontbreekt op server",
        ]
          .map(escapeCsv)
          .join(separator) + "\r\n";
    }
  }

  return csv;
}



