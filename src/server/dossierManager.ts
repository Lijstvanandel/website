import fs from "fs";
import path from "path";
import type { Dossier, DossierDocument, GraphNode, GraphEdge, NetworkGraphData, RaadsstukMetadata } from "../types/dossier.js";
import { getKv, setKv } from "./sqliteDatabase.js";

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
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-en-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
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
  "Wonen, Bouwen & Ontwikkeling": {
    category: "Ruimte & Wonen",
    thumbnail: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
    description: "Woningbouw, gebiedsontwikkeling, bestemmingsplannen, leefbaarheid en vergunningen in Steenwijk en alle kernen."
  },
  "Natuur, Milieu & Klimaat": {
    category: "Natuur & Milieu",
    thumbnail: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&auto=format&fit=crop&q=80",
    description: "Nationale Parken De Weerribben-Wieden, stikstof, biodiversiteit, energietransitie, zonne- en windparken."
  },
  "Verkeer, Wegen & Bereikbaarheid": {
    category: "Mobiliteit & Infrastructuur",
    thumbnail: "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=800&auto=format&fit=crop&q=80",
    description: "Wegonderhoud, verkeersveiligheid, fietspaden, openbaar vervoer, laadpalen en bereikbaarheid van de kernen."
  },
  "Openbare Ruimte & Onderhoud": {
    category: "Leefomgeving & Beheer",
    thumbnail: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=800&auto=format&fit=crop&q=80",
    description: "Onderhoud van straten, dorpspleinen, watergangen, beschoeiing, parkeerbeleid en openbaar groen."
  },
  "Economie, Ondernemen & Toerisme": {
    category: "Economie & Toerisme",
    thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80",
    description: "Bedrijventerreinen, lokale middenstand, recreatie & watertoerisme in Giethoorn en de regio, innovatie."
  },
  "Werk, Inkomen & Armoede": {
    category: "Werk & Sociale Zekerheid",
    thumbnail: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop&q=80",
    description: "Participatiewet, sociale werkgelegenheid, armoederegelingen, schuldhulpverlening en inkomensondersteuning."
  },
  "Zorg, Gezondheid & Welzijn": {
    category: "Zorg & Welzijn",
    thumbnail: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80",
    description: "Wmo, publieke gezondheidszorg (GGD), ouderenzorg, mantelzorg, welzijnswerk en preventie."
  },
  "Jeugd, Gezin & Onderwijs": {
    category: "Jeugd & Gezin",
    thumbnail: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80",
    description: "Jeugdhulp, Regionaal Serviceteam Jeugd (RSJ), kinderopvang, onderwijshuisvesting en jeugdvoorzieningen."
  },
  "Veiligheid, Toezicht & Handhaving": {
    category: "Veiligheid & Handhaving",
    thumbnail: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=80",
    description: "Openbare orde, APV, toezicht & handhaving (o.a. IceBear), Veiligheidsregio IJsselland en brandweerzorg."
  },
  "Kunst, Cultuur & Sport": {
    category: "Cultuur & Sport",
    thumbnail: "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&auto=format&fit=crop&q=80",
    description: "Museum Steenwijkerland, Rabo Theater De Meenthe, monumenten, bibliotheken en sportaccommodaties."
  },
  "Samenleving, Inclusie & Wijken": {
    category: "Samenleving & Participatie",
    thumbnail: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&auto=format&fit=crop&q=80",
    description: "Wijkgericht werken, dorpsbelangen, burgerparticipatie, inclusie, asiel- en vluchtelingenopvang."
  },
  "Bestuur, Financiën & Organisatie": {
    category: "Bestuur & Financiën",
    thumbnail: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80",
    description: "Gemeentebegroting, jaarrekening, belastingen, Gemeenschappelijke Regelingen (GR), integriteit en raadszaken."
  },
  "Wijziging gemeenschappelijke regelingen": {
    category: "Bestuur & Regelingen",
    thumbnail: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80",
    description: "Evaluaties, zienswijzen en wijzigingsvoorstellen voor regionale samenwerkingsverbanden (GGD, Omgevingsdienst, Veiligheidsregio en RSJ)."
  },
  "Ingekomen stukken": {
    category: "Raad & Bestuur",
    thumbnail: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80",
    description: "Ingekomen brieven, circulaires, bewonersverzoeken en officiële mededelingen voor de gemeenteraad."
  },
  "Zienswijze GR": {
    category: "Bestuur & Regelingen",
    thumbnail: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80",
    description: "Officiële moties en zienswijzen op de ontwerpen van gemeenschappelijke regelingen in de regio IJsselland."
  },
  "Woningbouw": {
    category: "Ruimte & Wonen",
    thumbnail: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
    description: "Bestemmingsplannen, gebiedsvisies, geur- en milieuhinderonderzoeken voor nieuwe woonlocaties in Steenwijk en kernen."
  },
  "Nieuw museum": {
    category: "Cultuur & Erfgoed",
    thumbnail: "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&auto=format&fit=crop&q=80",
    description: "Masterplan en stichtingskosten voor het nieuwe museum Steenwijkerland en de Spijkervetstallen.",
    wijkSlug: "centrum-steenwijk",
    wijkNaam: "Centrum Steenwijk"
  },
  "Handhaving en Vergunningplicht IceBear": {
    category: "Milieu & Handhaving",
    thumbnail: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=80",
    description: "Handhavingsverzoeken, geur- en emissiemetingen, GGD-gezondheidsadviezen en collegebesluiten aangaande IceBear Steenwijk.",
    wijkSlug: "groot-verlaat",
    wijkNaam: "Groot Verlaat"
  },
  "Jeugdzorg (RSJ IJsselland)": {
    category: "Sociaal Domein & Jeugd",
    thumbnail: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80",
    description: "Regionale visie, kadernota's, inkoopmodellen en begrotingen van het Regionaal Serviceteam Jeugd IJsselland."
  },
  "Jeugdhulp": {
    category: "Sociaal Domein & Jeugd",
    thumbnail: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80",
    description: "Beleidsplannen, jaarstukken en verordeningen rond jeugdhulp en kind- en gezinsbescherming."
  },
  "Stikstof": {
    category: "Natuur & Milieu",
    thumbnail: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&auto=format&fit=crop&q=80",
    description: "AERIUS-berekeningen, stikstofdepositie-onderzoeken en effecten op Natura 2000-gebieden zoals De Weerribben en De Wieden."
  },
  "Asiel- en Oekraïneopvang": {
    category: "Samenleving & Opvang",
    thumbnail: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&auto=format&fit=crop&q=80",
    description: "Opvanglocaties, Spreidingswet-uitvoering en tijdelijke opvang in het Fletcher Hotel en Steenwijkerland."
  },
  "Windenergie": {
    category: "Energie & Duurzaamheid",
    thumbnail: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&auto=format&fit=crop&q=80",
    description: "Programmeringsafspraken met de provincie Overijssel en locatieonderzoeken voor windturbines (o.a. Groot Verlaat).",
    wijkSlug: "groot-verlaat",
    wijkNaam: "Groot Verlaat"
  },
  "Zonne-energie": {
    category: "Energie & Duurzaamheid",
    thumbnail: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
    description: "Aanvragen en inpassing van zonneparken (o.a. De Hoop Blokzijl en Eeserwold) inclusief participatie en landschapsplannen.",
    wijkSlug: "blokzijl",
    wijkNaam: "Blokzijl"
  },
  "Gebiedsontwikkeling": {
    category: "Ruimte & Wonen",
    thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80",
    description: "Ambitiedocument Spoorzone Steenwijk 2040, Gebiedsvisie Steenwijk Oost ('Het Vrije Veld') en centrumontwikkeling.",
    wijkSlug: "oostermeenthe",
    wijkNaam: "Oostermeenthe"
  },
  "Huiselijk Geweld en Kindermishandeling": {
    category: "Sociaal Domein & Zorg",
    thumbnail: "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=800&auto=format&fit=crop&q=80",
    description: "Regiovisie IJsselland 'Samen tegen huiselijk geweld - Lokaal Sterk' 2026-2030 en ketenaanpak."
  },
  "Schuldhulpverlening": {
    category: "Sociaal Domein & Zorg",
    thumbnail: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80",
    description: "Vaststelling beleidsplan Schuldhulpverlening 2026-2029 en basisdienstverlening samen met Kredietbank en Sociaal Werk De Kop."
  },
  "Pachtbeleid": {
    category: "Grondzaken & Landbouw",
    thumbnail: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80",
    description: "Collegebesluit en criteria pachtbeleid gemeente Steenwijkerland (Didam-arrest richtlijnen)."
  },
  "Bestemmingsplan": {
    category: "Ruimtelijke Ordening",
    thumbnail: "https://images.unsplash.com/photo-1524813686514-a57563d77d61?w=800&auto=format&fit=crop&q=80",
    description: "Bestemmingsplannen voor kernen en buitengebied (o.a. Willemsoord, Giethoorn, Sint Jansklooster en Zuidveen).",
    wijkSlug: "giethoorn",
    wijkNaam: "Giethoorn"
  },
  "Openbare ruimte": {
    category: "Beheer & Infrastructuur",
    thumbnail: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=800&auto=format&fit=crop&q=80",
    description: "Beschoeiing Belt-Schutsloot, parkeerbeleid bezoekerscentrum Natuurmonumenten en onderhoud van de fysieke leefomgeving.",
    wijkSlug: "belt-schutsloot",
    wijkNaam: "Belt-Schutsloot"
  },
  "Wegen en Infrastructuur": {
    category: "Verkeer & Vervoer",
    thumbnail: "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=800&auto=format&fit=crop&q=80",
    description: "Beleidsplan Beheer en Onderhoud Wegen & Paden Steenwijkerland, veilige bermen en fietscorridors."
  },
  "Participatiewet": {
    category: "Werk & Inkomen",
    thumbnail: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80",
    description: "Participatiewet in Balans, giftenregeling en leidraad algemene bijstand 2026."
  },
  "Cao Aan de slag": {
    category: "Werk & Inkomen",
    thumbnail: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop&q=80",
    description: "Ledenraadpleging VNG over het onderhandelaarsresultaat Cao Aan de slag 2026-2027 en sociale werkvoorziening."
  },
  "Beeldende Kunst": {
    category: "Cultuur & Erfgoed",
    thumbnail: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80",
    description: "Verordening Commissie Beeldende Kunst Steenwijkerland en advisering over kunst in de openbare ruimte."
  },
  "Woonwagenbeleid": {
    category: "Ruimte & Wonen",
    thumbnail: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80",
    description: "Woonwagenbeleid Steenwijkerland richting 2035 en standplaatsen in Steenwijk, Giethoorn en Vollenhove."
  },
  "Archiefbeheer": {
    category: "Bestuur & Informatie",
    thumbnail: "https://images.unsplash.com/photo-1507842229452-957cdb27b38d?w=800&auto=format&fit=crop&q=80",
    description: "Toezichtverslagen op het beheer van de niet-overgebrachte archieven volgens de Archiefwet 1995."
  }
};

const DEFAULT_THUMBNAIL = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80";

// Read raw metadata from persistent master, sqlite, or file
export function getRawMetadata(): RaadsstukMetadata[] {
  // 1. Check persistent master file in data/ (gitignored, survives git pull)
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

  // 2. Check SQLite kv_store (gitignored, persistent in database.sqlite)
  try {
    const kvMaster = getKv("raadsstukken_metadata_master");
    if (Array.isArray(kvMaster) && kvMaster.length > 0) {
      return kvMaster;
    }
  } catch (_e) {}

  // 3. Check documents backup path
  try {
    if (fs.existsSync(MASTER_METADATA_BACKUP_PATH)) {
      const data = fs.readFileSync(MASTER_METADATA_BACKUP_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_e) {}

  // 4. Fallback to standard METADATA_PATH
  try {
    if (fs.existsSync(METADATA_PATH)) {
      const data = fs.readFileSync(METADATA_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading metadata file:", err);
  }

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

// Detect dossier and subdossier from keywords and subdirectory
export function detectDossierAndSubdossier(text: string, subFolder?: string): { dossier: string; subdossier: string } {
  if (subFolder === "waterschap") {
    return { dossier: "Waterschap & Waterbeheer", subdossier: "Waterschap Drents Overijsselse Delta" };
  }
  if (subFolder === "overijssel") {
    return { dossier: "Provincie Overijssel", subdossier: "Provinciale Staten & Besluiten" };
  }

  const l = text.toLowerCase();

  if (l.includes("icebear") || l.includes("ice bear") || (l.includes("groot verlaat") && (l.includes("geur") || l.includes("emissie")))) {
    return { dossier: "Handhaving en Vergunningplicht IceBear", subdossier: "Handhaving en Geurmetingen" };
  }
  if (l.includes("woningbouw") || l.includes("woonvisie") || l.includes("nieuwbouw") || l.includes("kavels") || l.includes("starterslening") || l.includes("huurwoning")) {
    return { dossier: "Woningbouw & Volkshuisvesting", subdossier: "Woonvisie en Bouwprojecten" };
  }
  if (l.includes("stikstof") || l.includes("aerius") || l.includes("natura 2000") || l.includes("weerribben") || l.includes("pfas")) {
    return { dossier: "Stikstof", subdossier: "Natura 2000 en Aerius-metingen" };
  }
  if (l.includes("zonne") || l.includes("zonnepark") || l.includes("zonneweide") || l.includes("eeserwold") || l.includes("de hoop blokzijl")) {
    return { dossier: "Zonne-energie", subdossier: "Zonneparken & Landschappelijke Inpassing" };
  }
  if (l.includes("windenergie") || l.includes("windturbine") || l.includes("windmolen") || l.includes("windpark")) {
    return { dossier: "Windenergie", subdossier: "Windlocaties en Programmering" };
  }
  if (l.includes("jeugdzorg") || l.includes("jeugdhulp") || l.includes("rsj") || l.includes("ijsselland") || l.includes("kindermishandeling")) {
    return { dossier: "Jeugdzorg (RSJ IJsselland)", subdossier: "Regionale Samenwerking & Inkoop" };
  }
  if (l.includes("museum") || l.includes("spijkervetstallen") || l.includes("cultuur") || l.includes("theater") || l.includes("meenthe")) {
    return { dossier: "Nieuw museum", subdossier: "Masterplan en Realisatie" };
  }
  if (l.includes("asiel") || l.includes("oekraïne") || l.includes("oekraine") || l.includes("vluchteling") || l.includes("spreidingswet") || l.includes("fletcher")) {
    return { dossier: "Asiel- en Oekraïneopvang", subdossier: "Opvanglocaties & Participatie" };
  }
  if (l.includes("verkeer") || l.includes("wegen") || l.includes("n333") || l.includes("n334") || l.includes("rondweg") || l.includes("fietspad") || l.includes("parkeer")) {
    return { dossier: "Wegen en Infrastructuur", subdossier: "Wegenbeheer & Bereikbaarheid" };
  }
  if (l.includes("begroting") || l.includes("kadernota") || l.includes("jaarrekening") || l.includes("belasting") || l.includes("ozb") || l.includes("financi")) {
    return { dossier: "Financiën & Bedrijfsvoering", subdossier: "Begroting en Jaarstukken" };
  }
  if (l.includes("bestemmingsplan") || l.includes("omgevingsplan") || l.includes("omgevingsvisie") || l.includes("omgevingsvergunning") || l.includes("ruimtelij")) {
    return { dossier: "Bestemmingsplan", subdossier: "Ruimtelijke Plannen en Wijzigingen" };
  }
  if (l.includes("openbare ruimte") || l.includes("groen") || l.includes("bomen") || l.includes("speelplek") || l.includes("beschoeiing")) {
    return { dossier: "Openbare ruimte", subdossier: "Onderhoud en Inrichting" };
  }
  if (l.includes("spoorzone") || l.includes("gebiedsontwikkeling") || l.includes("vrije veld") || l.includes("steenwijk oost")) {
    return { dossier: "Gebiedsontwikkeling", subdossier: "Visies en Gebiedsplannen" };
  }
  if (l.includes("pacht") || l.includes("landbouw") || l.includes("agrarisch") || l.includes("didam")) {
    return { dossier: "Pachtbeleid", subdossier: "Pachtcriteria en Grondzaken" };
  }
  if (l.includes("schuldhulp") || l.includes("armoede") || l.includes("kredietbank") || l.includes("sociaal werk")) {
    return { dossier: "Schuldhulpverlening", subdossier: "Beleid en Uitvoering" };
  }
  if (l.includes("participatiewet") || l.includes("aan de slag") || l.includes("werkvoorziening") || l.includes("bijstand")) {
    return { dossier: "Participatiewet", subdossier: "Arbeidsmarkt en Re-integratie" };
  }
  if (l.includes("toerisme") || l.includes("recreatie") || l.includes("haven") || l.includes("woonschepen") || l.includes("rondvaart")) {
    return { dossier: "Economie, Recreatie & Toerisme", subdossier: "Recreatie en Waterbeheer" };
  }
  if (l.includes("veiligheid") || l.includes("brandweer") || l.includes("apv") || l.includes("politie") || l.includes("handhaving")) {
    return { dossier: "Veiligheid & Openbare Orde", subdossier: "Handhaving en Naleving" };
  }

  return { dossier: "Gemeenteraad & Beleid", subdossier: "Algemeen" };
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

    // Sort subdossiers by document count descending
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

// Get subnetwork graph for a specific dossier - ONLY documents connected to each other, with optional subdossier filtering
export function getDossierGraph(dossierTitleOrSlug: string, db?: any, subdossierSlugOrTitle?: string): NetworkGraphData {
  const allDossiers = getAllDossiers(
    db?.customDossiers || [],
    db?.deletedDossierSlugs || [],
    db?.customSubdossiers || {}
  );
  const matchedDossier = allDossiers.find(
    (d) => d.id === dossierTitleOrSlug || d.slug === dossierTitleOrSlug || d.title.toLowerCase() === dossierTitleOrSlug.toLowerCase()
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

  const docFileNames = new Set(docs.map((d) => d.bestandsnaam));
  const docEdgesMap = new Map<string, { source: string; target: string; reasons: string[] }>();

  // Map intermediary targets (legislation, references, relations) to documents in this dossier
  const targetToDocs = new Map<string, Set<string>>();
  fullGraph.edges.forEach((e) => {
    if (docFileNames.has(e.source)) {
      if (!targetToDocs.has(e.target)) targetToDocs.set(e.target, new Set());
      targetToDocs.get(e.target)!.add(e.source);
    }
  });

  // 1. Connect documents that share references, legislation, or joint schemes
  for (const [target, docSet] of targetToDocs.entries()) {
    const matchingDocs = Array.from(docSet);
    if (matchingDocs.length > 1) {
      for (let i = 0; i < matchingDocs.length; i++) {
        for (let j = i + 1; j < matchingDocs.length; j++) {
          const key = [matchingDocs[i], matchingDocs[j]].sort().join("|||");
          if (!docEdgesMap.has(key)) {
            docEdgesMap.set(key, { source: matchingDocs[i], target: matchingDocs[j], reasons: [] });
          }
          docEdgesMap.get(key)!.reasons.push(target);
        }
      }
    }
  }

  // 2. Connect documents via direct mentions in relaties
  docs.forEach((docA) => {
    const relStr = Array.isArray(docA.relaties)
      ? docA.relaties.join(" ")
      : typeof docA.relaties === "string"
      ? docA.relaties
      : "";
    docs.forEach((docB) => {
      if (docA.bestandsnaam !== docB.bestandsnaam) {
        if (relStr && (relStr.includes(docB.bestandsnaam) || (docB.titel && relStr.includes(docB.titel)))) {
          const key = [docA.bestandsnaam, docB.bestandsnaam].sort().join("|||");
          if (!docEdgesMap.has(key)) {
            docEdgesMap.set(key, { source: docA.bestandsnaam, target: docB.bestandsnaam, reasons: [] });
          }
          docEdgesMap.get(key)!.reasons.push("Directe verwijzing");
        }
      }
    });
  });

  // 3. Connect documents that share significant entities/topics
  docs.forEach((docA, idxA) => {
    const entA = (Array.isArray(docA.entiteiten) ? docA.entiteiten : [])
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 3);
    for (let idxB = idxA + 1; idxB < docs.length; idxB++) {
      const docB = docs[idxB];
      const entB = (Array.isArray(docB.entiteiten) ? docB.entiteiten : [])
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 3);
      const common = entA.filter((e) => entB.includes(e));
      if (common.length > 0) {
        const key = [docA.bestandsnaam, docB.bestandsnaam].sort().join("|||");
        if (!docEdgesMap.has(key)) {
          docEdgesMap.set(key, { source: docA.bestandsnaam, target: docB.bestandsnaam, reasons: [] });
        }
        docEdgesMap.get(key)!.reasons.push(`Gedeeld onderwerp: ${common.slice(0, 2).join(", ")}`);
      }
    }
  });

  // 4. If multiple documents exist in this dossier and some have no connections, link sequentially in procedural order
  if (docs.length > 1) {
    for (let i = 0; i < docs.length - 1; i++) {
      const key = [docs[i].bestandsnaam, docs[i + 1].bestandsnaam].sort().join("|||");
      if (!docEdgesMap.has(key)) {
        docEdgesMap.set(key, {
          source: docs[i].bestandsnaam,
          target: docs[i + 1].bestandsnaam,
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

  // Return ONLY documents that are connected to each other (or single document if dossier only has 1 document)
  const finalDocNodes: GraphNode[] = docs
    .filter((d) => connectedDocIds.has(d.bestandsnaam) || docs.length === 1)
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

// Add a document manually to a dossier
export function addDocumentToDossier(
  idOrSlug: string,
  docData: Partial<DossierDocument> & { titel: string; bestandsnaam: string },
  db: any,
  saveDbFn: (db: any) => void
): { dossier: Dossier; document: DossierDocument } | null {
  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || []);
  const dossier = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!dossier) return null;

  const cleanFilename = path.basename(docData.bestandsnaam.trim());
  const fileCheck = checkFileExists(cleanFilename);

  const newDoc: DossierDocument = {
    id: `doc-manual-${Date.now()}-${slugify(cleanFilename)}`,
    bestandsnaam: cleanFilename,
    titel: docData.titel.trim(),
    dossier: dossier.title,
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
  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || []);
  const dossier = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!dossier) return null;

  const docIdx = dossier.documents.findIndex(
    (d) => d.id === docIdOrFilename || d.bestandsnaam === docIdOrFilename
  );
  if (docIdx < 0) return null;

  const existingDoc = dossier.documents[docIdx];
  const targetFilename = updates.bestandsnaam ? path.basename(updates.bestandsnaam.trim()) : existingDoc.bestandsnaam;
  const fileCheck = checkFileExists(targetFilename);

  const updatedDoc: DossierDocument = {
    ...existingDoc,
    ...updates,
    bestandsnaam: targetFilename,
    titel: updates.titel !== undefined ? updates.titel.trim() : existingDoc.titel,
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

  if (!updatedDossier) return null;
  return { dossier: updatedDossier, document: updatedDoc };
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

// Process bulk uploaded council documents
export function processUploadedCouncilDocuments(
  uploadedFiles: any[],
  syncFileFn: (filePath: string) => void
): {
  totalUploaded: number;
  matchedCount: number;
  unmatchedCount: number;
  matchedDocuments: Array<{ filename: string; dossier: string; title: string }>;
  unmatchedDocuments: string[];
} {
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

  const matchedDocuments: Array<{ filename: string; dossier: string; title: string }> = [];
  const unmatchedDocuments: string[] = [];

  uploadedFiles.forEach((file) => {
    const rawName = file.originalname || file.filename || "onbekend.pdf";
    const lowerName = rawName.toLowerCase().trim();

    // Mirror to dist directory as well
    const pubPath = path.join(DOCUMENTS_DIR, rawName);
    try {
      syncFileFn(pubPath);
    } catch (syncErr) {
      console.warn("Could not sync file to dist:", syncErr);
    }

    let match = metadataByFilename.get(lowerName);
    if (!match) {
      try {
        match = metadataByFilename.get(decodeURIComponent(lowerName));
      } catch (_e) {
        // Fallback to direct name
      }
    }

    if (match) {
      matchedDocuments.push({
        filename: rawName,
        dossier: match.dossier,
        title: match.titel || rawName,
      });
    } else {
      unmatchedDocuments.push(rawName);
    }
  });

  return {
    totalUploaded: uploadedFiles.length,
    matchedCount: matchedDocuments.length,
    unmatchedCount: unmatchedDocuments.length,
    matchedDocuments,
    unmatchedDocuments,
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



