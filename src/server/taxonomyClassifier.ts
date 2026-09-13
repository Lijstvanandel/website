import type { RaadsstukMetadata } from "../types/dossier.js";

/**
 * De 7 Inhoudelijke Canonieke Hoofddossiers volgens de gereviseerde SKOS-taxonomie
 * van de gemeente Steenwijkerland (weerspiegelt de bestuurlijke realiteit).
 */
export const CANONICAL_HOOFDDOSSIERS = [
  "Ruimtelijke Ordening, Wonen & Omgevingswet",
  "Landbouw, Natuur & Waterbeheer",
  "Lokale Economie, Toerisme & Energie-infrastructuur",
  "Verkeer, Wegen & Fysieke Bereikbaarheid",
  "Sociaal Domein, Asiel & Leefbaarheid",
  "Mijnbouw & Ondergrondse Opgaven",
  "Bestuur, Financiën & Juridische Zaken",
] as const;

export type CanonicalHoofddossier = (typeof CANONICAL_HOOFDDOSSIERS)[number];

export const CANONICAL_PRIMARY_SUBDOSSIERS: Record<CanonicalHoofddossier, string> = {
  "Ruimtelijke Ordening, Wonen & Omgevingswet": "Bestemmingsplannen & Omgevingsvisie",
  "Landbouw, Natuur & Waterbeheer": "Waterpeilbeheer & Peilbesluiten",
  "Lokale Economie, Toerisme & Energie-infrastructuur": "Toerisme Overlast & Regulering",
  "Verkeer, Wegen & Fysieke Bereikbaarheid": "Verkeer, N-Wegen & Bruggen",
  "Sociaal Domein, Asiel & Leefbaarheid": "Jeugdzorg & RSJ",
  "Mijnbouw & Ondergrondse Opgaven": "Gaswinning & Seismische Monitoring",
  "Bestuur, Financiën & Juridische Zaken": "Begroting, Jaarstukken & Financiën",
};

/**
 * Banned actor categories: Instanties mogen NOOIT als hoofddossier of subdossier voorkomen.
 */
export const BANNED_ACTOR_KEYWORDS = [
  "wdodelta",
  "waterschap",
  "waterschap drents overijsselse delta",
  "provincie overijssel",
  "provinciale staten",
  "coa",
  "enexis",
  "ggd ijsselland",
  "rsj ijsselland",
  "veiligheidsregio ijsselland",
  "politieke markt",
  "raadszaken & politieke markt",
  "algemeen",
  "overig",
  "diversen"
];

// 42 wijken en kernen in Steenwijkerland met verfijnde alias-matching (voorkomt false positives)
export const WIJKEN_KERNEN_LIST = [
  { slug: "centrum-steenwijk", naam: "Centrum Steenwijk", aliases: ["steenwijk centrum", "binnenstad steenwijk", "markt steenwijk", "stadshart steenwijk", "centrum steenwijk", "binnenstad", "gasthuisstraat steenwijk"] },
  { slug: "clingenborgh", naam: "Clingenborgh", aliases: ["clingenborgh"] },
  { slug: "de-gagels", naam: "De gagels", aliases: ["de gagels", "gagels"] },
  { slug: "nieuwe-gagels", naam: "Nieuwe gagels", aliases: ["nieuwe gagels"] },
  { slug: "dolderkanaal", naam: "Dolderkanaal", aliases: ["dolderkanaal", "dolder"] },
  { slug: "groot-verlaat", naam: "Groot Verlaat", aliases: ["groot verlaat", "icebear", "bedrijventerrein groot verlaat"] },
  { slug: "oostermeenthe", naam: "Oostermeenthe", aliases: ["oostermeenthe", "het vrije veld"] },
  { slug: "oostwijken-de-beitel", naam: "Oostwijken, De Beitel", aliases: ["oostwijken", "de beitel"] },
  { slug: "paddenpoel-en-kornputkwartier", naam: "Paddenpoel en Kornputkwartier", aliases: ["paddenpoel", "kornputkwartier", "kornput"] },
  { slug: "steenwijk-west", naam: "Steenwijk West", aliases: ["steenwijk west", "spoorzone steenwijk", "spoorzone", "steenwijk 2040", "station steenwijk"] },
  { slug: "steenwijkerdiep", naam: "Steenwijkerdiep", aliases: ["steenwijkerdiep"] },
  { slug: "torenlanden", naam: "Torenlanden", aliases: ["torenlanden"] },
  { slug: "woldmeenthe", naam: "Woldmeenthe", aliases: ["woldmeenthe", "woldmeentherand"] },
  { slug: "barsbeek-heetveld-en-kadoelen", naam: "Barsbeek, Heetveld en Kadoelen", aliases: ["barsbeek", "heetveld", "kadoelen"] },
  { slug: "belt-schutsloot", naam: "Belt-schutsloot", aliases: ["belt-schutsloot", "beltschutsloot", "dorpsgracht belt-schutsloot", "belterweg", "belterwiede"] },
  { slug: "blankenham", naam: "Blankenham", aliases: ["blankenham", "hammerdijk"] },
  { slug: "blokzijl", naam: "Blokzijl", aliases: ["blokzijl", "de hoop blokzijl", "noordermaten", "mauritsstraat", "haven blokzijl"] },
  { slug: "de-pol-baars-en-de-bult", naam: "De Pol, Baars en de Bult", aliases: ["de pol", "baars", "de bult", "huis ten wolde"] },
  { slug: "doosje", naam: "Doosje", aliases: ["doosje"] },
  { slug: "eeserwold", naam: "Eeserwold", aliases: ["eeserwold"] },
  { slug: "eesveen", naam: "Eesveen", aliases: ["eesveen", "gaswinning eesveen", "vermilion eesveen"] },
  { slug: "giethoorn", naam: "Giethoorn", aliases: ["giethoorn", "binnenpad", "dorpsgracht giethoorn", "middenbuurt", "loswal kerkweg", "de landije"] },
  { slug: "ijsselham-paasloo-en-de-basse", naam: "Ijsselham, Paasloo en de Basse", aliases: ["ijsselham", "paasloo", "de basse", "basse"] },
  { slug: "jonen-en-dwarsgracht", naam: "Jonen en Dwarsgracht", aliases: ["jonen", "dwarsgracht", "pontje jonen", "walengracht"] },
  { slug: "kalenberg", naam: "Kalenberg", aliases: ["kalenberg"] },
  { slug: "kallenkote", naam: "Kallenkote", aliases: ["kallenkote", "zorgboerderij kallenkote"] },
  { slug: "klosse-roekebos-en-dinxterveen", naam: "Klosse, Roekebos en Dinxterveen", aliases: ["klosse", "roekebos", "dinxterveen"] },
  { slug: "kuinre", naam: "Kuinre", aliases: ["kuinre", "overhavendijk", "worstdijk", "kuinderbos"] },
  { slug: "marijenkampen-en-willemsoord", naam: "Marijenkampen en Willemsoord", aliases: ["marijenkampen", "willemsoord", "reunedal", "koloniën van weldadigheid", "kolonien van weldadigheid", "kolonie willemsoord"] },
  { slug: "moespot-en-leeuwte", naam: "Moespot en Leeuwte", aliases: ["moespot", "leeuwte"] },
  { slug: "nederland-en-baarlo", naam: "Nederland en Baarlo", aliases: ["nederland", "baarlo"] },
  { slug: "oldemarkt", naam: "Oldemarkt", aliases: ["oldemarkt", "oosterbroek"] },
  { slug: "onna", naam: "Onna", aliases: ["onna", "onnase doodweg", "transformatorstation steenwijk-onna"] },
  { slug: "ossenzijl", naam: "Ossenzijl", aliases: ["ossenzijl", "kooibomenpad"] },
  { slug: "scheerwolde", naam: "Scheerwolde", aliases: ["scheerwolde", "scheerwolderweg", "scheerbrug"] },
  { slug: "sint-jansklooster", naam: "Sint Jansklooster", aliases: ["sint jansklooster", "st. jansklooster", "molenstraat sint jansklooster", "eben haezer"] },
  { slug: "steenwijkerwold-en-witte-paarden", naam: "Steenwijkerwold en Witte paarden", aliases: ["steenwijkerwold", "witte paarden", "gelderingen", "dierenasiel de kluif"] },
  { slug: "tuk", naam: "Tuk", aliases: ["tuk", "tukseweg"] },
  { slug: "vollenhove", naam: "Vollenhove", aliases: ["vollenhove", "bloemwijk", "royal huisman", "haven vollenhove"] },
  { slug: "wanneperveen", naam: "Wanneperveen", aliases: ["wanneperveen", "lozedijk", "beulakerwiede"] },
  { slug: "wetering", naam: "Wetering", aliases: ["wetering", "wetering-west", "wetering-oost"] },
  { slug: "zuidveen", naam: "Zuidveen", aliases: ["zuidveen", "stroïnkweg", "stroinkweg"] }
];

/**
 * Normaliseert elk willekeurig dossier naar EXACT ÉÉN van de 7 canonieke Hoofddossiers.
 * Dwingt inhoudelijke classificatie af in plaats van instanties of restbakken.
 */
export function normalizeHoofddossier(
  rawDossier?: string,
  title?: string,
  entities?: string,
  text?: string
): CanonicalHoofddossier {
  const d = (rawDossier || "").trim().toLowerCase();

  // Ontsnappingsclausule voor Dead Letter Queue (DLQ)
  if (d === "ongeclassificeerd_falen") {
    return "ONGECLASSIFICEERD_FALEN" as any;
  }

  const searchCorpus = `${rawDossier || ""} ${title || ""} ${entities || ""} ${text || ""}`.toLowerCase();

  // 1. Direct canonical string match if clean
  for (const canon of CANONICAL_HOOFDDOSSIERS) {
    if (d === canon.toLowerCase()) {
      return canon;
    }
  }

  // 2. Ontologische routeringsregels op basis van inhoud (Substantive routing):

  // === 6. MIJNBOUW & ONDERGRONDSE OPGAVEN (Hoge prioriteit voor specifieke mijnbouw/gaswinning dossiers) ===
  if (
    searchCorpus.includes("gaswinning") ||
    searchCorpus.includes("vermilion") ||
    searchCorpus.includes("mijnbouw") ||
    searchCorpus.includes("seismisch") ||
    searchCorpus.includes("winningsplan") ||
    searchCorpus.includes("bodembeweging") ||
    searchCorpus.includes("geothermie") ||
    searchCorpus.includes("ondergrondse opslag") ||
    searchCorpus.includes("aardbeving")
  ) {
    return "Mijnbouw & Ondergrondse Opgaven";
  }

  // === 4. VERKEER, WEGEN & FYSIEKE BEREIKBAARHEID ===
  if (
    searchCorpus.includes("n761") ||
    searchCorpus.includes("n334") ||
    searchCorpus.includes("n762") ||
    searchCorpus.includes("n333") ||
    searchCorpus.includes("ronduitebrug") ||
    searchCorpus.includes("meenthebrug") ||
    searchCorpus.includes("scheerbrug") ||
    searchCorpus.includes("pontje jonen") ||
    searchCorpus.includes("snelfietsroute") ||
    searchCorpus.includes("fietspad") ||
    searchCorpus.includes("fietsers") ||
    searchCorpus.includes("wegenonderhoud") ||
    searchCorpus.includes("asfaltonderhoud") ||
    searchCorpus.includes("wegenbeheer") ||
    searchCorpus.includes("verkeersveiligheid") ||
    searchCorpus.includes("30 km") ||
    searchCorpus.includes("openbaar vervoer") ||
    searchCorpus.includes("buslijn") ||
    searchCorpus.includes("rrreis") ||
    searchCorpus.includes("mobiliteit") ||
    searchCorpus.includes("gvvp") ||
    searchCorpus.includes("parkeerbeleid") ||
    searchCorpus.includes("parkeernorm")
  ) {
    return "Verkeer, Wegen & Fysieke Bereikbaarheid";
  }

  // === 1. RUIMTELIJKE ORDENING, WONEN & OMGEVINGSWET ===
  // Bestemmingsplannen, Omgevingsvisie, Spoorzone, Woningbouw, Inbreiding, Sociale Huur, Welstand, Planschade, TAM-plannen
  if (
    searchCorpus.includes("spoorzone") ||
    searchCorpus.includes("woningbouw") ||
    searchCorpus.includes("bestemmingsplan") ||
    searchCorpus.includes("omgevingsplan") ||
    searchCorpus.includes("omgevingsvisie") ||
    searchCorpus.includes("omgevingswet") ||
    searchCorpus.includes("bopa") ||
    searchCorpus.includes("tam-omgevingsplan") ||
    searchCorpus.includes("inbreiding") ||
    searchCorpus.includes("woonvisie") ||
    searchCorpus.includes("woondeal") ||
    searchCorpus.includes("starterslening") ||
    searchCorpus.includes("sociale huur") ||
    searchCorpus.includes("wetland wonen") ||
    searchCorpus.includes("woonconcept") ||
    searchCorpus.includes("beeldkwaliteit") ||
    searchCorpus.includes("welstand") ||
    searchCorpus.includes("planschade") ||
    searchCorpus.includes("saoz") ||
    searchCorpus.includes("bouwvergunning") ||
    searchCorpus.includes("omgevingsvergunning") ||
    searchCorpus.includes("bloemwijk") ||
    searchCorpus.includes("noordermaten") ||
    searchCorpus.includes("oosterbroek") ||
    searchCorpus.includes("kaveluitgifte") ||
    searchCorpus.includes("woningsplitsing") ||
    searchCorpus.includes("woonwagen") ||
    searchCorpus.includes("standplaats") ||
    searchCorpus.includes("flexwoningen") ||
    searchCorpus.includes("ruimtelijke ordening")
  ) {
    return "Ruimtelijke Ordening, Wonen & Omgevingswet";
  }

  // === 2. LANDBOUW, NATUUR & WATERBEHEER ===
  // Peilbesluiten, WDODelta, Waterpeil, Veenoxidatie, Bodemdaling, Stikstof, AERIUS, Natura 2000, Exoten, Weerribben/Wieden, Dijkversterking
  if (
    searchCorpus.includes("peilbesluit") ||
    searchCorpus.includes("wdodelta") ||
    searchCorpus.includes("waterschap") ||
    searchCorpus.includes("waterpeil") ||
    searchCorpus.includes("boezempeil") ||
    searchCorpus.includes("polderpeil") ||
    searchCorpus.includes("groeipeil") ||
    searchCorpus.includes("ogor") ||
    searchCorpus.includes("grondwater") ||
    searchCorpus.includes("veenoxidatie") ||
    searchCorpus.includes("bodemdaling") ||
    searchCorpus.includes("weerribben") ||
    searchCorpus.includes("wieden") ||
    searchCorpus.includes("natura 2000") ||
    searchCorpus.includes("stikstof") ||
    searchCorpus.includes("saldering") ||
    searchCorpus.includes("aerius") ||
    searchCorpus.includes("kdw") ||
    searchCorpus.includes("exoot") ||
    searchCorpus.includes("harkboot") ||
    searchCorpus.includes("vederkruid") ||
    searchCorpus.includes("waterkwaliteit") ||
    searchCorpus.includes("kaderrichtlijn water") ||
    searchCorpus.includes("krw") ||
    searchCorpus.includes("dijkversterking") ||
    searchCorpus.includes("waterkering") ||
    searchCorpus.includes("biodiversiteit") ||
    searchCorpus.includes("klimaatadaptatie") ||
    searchCorpus.includes("agrarische transitie") ||
    searchCorpus.includes("kringlooplandbouw") ||
    searchCorpus.includes("natschade")
  ) {
    return "Landbouw, Natuur & Waterbeheer";
  }

  // === 3. LOKALE ECONOMIE, TOERISME & ENERGIE-INFRASTRUCTUUR ===
  // Smart Energy Hub, Netcongestie, Zonnepark, Windenergie, Bedrijventerreinen, Toerisme Giethoorn, UNESCO, De Meenthe, Sport
  if (
    searchCorpus.includes("netcongestie") ||
    searchCorpus.includes("smart energy hub") ||
    searchCorpus.includes("zonnepark") ||
    searchCorpus.includes("windenergie") ||
    searchCorpus.includes("windmolen") ||
    searchCorpus.includes("steenergie") ||
    searchCorpus.includes("enexis") ||
    searchCorpus.includes("res ") ||
    searchCorpus.includes("energietransitie") ||
    searchCorpus.includes("compactstation") ||
    searchCorpus.includes("vaarverordening") ||
    searchCorpus.includes("totaalaanpak parkeren") ||
    searchCorpus.includes("toerisme") ||
    searchCorpus.includes("toeristen") ||
    searchCorpus.includes("recreatie") ||
    searchCorpus.includes("jachthaven") ||
    searchCorpus.includes("rondvaart") ||
    searchCorpus.includes("royal huisman") ||
    searchCorpus.includes("unesco") ||
    searchCorpus.includes("koloniën van weldadigheid") ||
    searchCorpus.includes("kolonien van weldadigheid") ||
    searchCorpus.includes("weldadigheid") ||
    searchCorpus.includes("willemsoord") ||
    searchCorpus.includes("bufferzone") ||
    searchCorpus.includes("bedrijventerrein") ||
    searchCorpus.includes("eeserwold") ||
    searchCorpus.includes("groot verlaat") ||
    searchCorpus.includes("pacht") ||
    searchCorpus.includes("kgo") ||
    searchCorpus.includes("vab") ||
    searchCorpus.includes("ondernemen") ||
    searchCorpus.includes("horeca") ||
    searchCorpus.includes("detailhandel") ||
    searchCorpus.includes("museum") ||
    searchCorpus.includes("podium") ||
    searchCorpus.includes("meenthe") ||
    searchCorpus.includes("scala") ||
    searchCorpus.includes("theater") ||
    searchCorpus.includes("cultuur") ||
    searchCorpus.includes("monument") ||
    searchCorpus.includes("sport") ||
    searchCorpus.includes("sportpark") ||
    searchCorpus.includes("zwembad") ||
    searchCorpus.includes("waterwyck") ||
    searchCorpus.includes("bibliotheek") ||
    searchCorpus.includes("spijkervet")
  ) {
    return "Lokale Economie, Toerisme & Energie-infrastructuur";
  }

  // === 5. SOCIAAL DOMEIN, ASIEL & LEEFBAARHEID ===
  // Jeugdzorg, RSJ, Wmo, GGD IJsselland, GALA, Participatiewet, Asiel, COA, Spreidingswet, IHP Scholen
  if (
    searchCorpus.includes("kindcentrum") ||
    searchCorpus.includes("basisschool") ||
    searchCorpus.includes("scholen") ||
    searchCorpus.includes("school") ||
    searchCorpus.includes("onderwijshuisvesting") ||
    searchCorpus.includes("ihp") ||
    searchCorpus.includes("jeugdhulp") ||
    searchCorpus.includes("jeugdzorg") ||
    searchCorpus.includes("rsj") ||
    searchCorpus.includes("regionaal serviceteam jeugd") ||
    searchCorpus.includes("kinderopvang") ||
    searchCorpus.includes("leerling") ||
    searchCorpus.includes("wmo") ||
    searchCorpus.includes("thuiszorg") ||
    searchCorpus.includes("ggd") ||
    searchCorpus.includes("publieke gezondheid") ||
    searchCorpus.includes("gala") ||
    searchCorpus.includes("mantelzorg") ||
    searchCorpus.includes("welzijn") ||
    searchCorpus.includes("beschermd wonen") ||
    searchCorpus.includes("sociaal werk de kop") ||
    searchCorpus.includes("ouderenzorg") ||
    searchCorpus.includes("eenzaamheid") ||
    searchCorpus.includes("asiel") ||
    searchCorpus.includes("spreidingswet") ||
    searchCorpus.includes("coa") ||
    searchCorpus.includes("oekra") ||
    searchCorpus.includes("vluchteling") ||
    searchCorpus.includes("statushouder") ||
    searchCorpus.includes("participatiewet") ||
    searchCorpus.includes("schuldhulp") ||
    searchCorpus.includes("armoede") ||
    searchCorpus.includes("bijstand") ||
    searchCorpus.includes("werkcaf") ||
    searchCorpus.includes("veilig thuis") ||
    searchCorpus.includes("huiselijk geweld") ||
    searchCorpus.includes("kindermishandeling") ||
    searchCorpus.includes("inburgering") ||
    searchCorpus.includes("dorpshuis") ||
    searchCorpus.includes("leefbaarheid")
  ) {
    return "Sociaal Domein, Asiel & Leefbaarheid";
  }

  // === 7. BESTUUR, FINANCIËN & JURIDISCHE ZAKEN ===
  // Planning & Control (Begroting, Jaarstukken), Gemeentelijke Belastingen, APV, Politie, Brandweer, Veiligheidsregio, Rekenkamer
  if (
    searchCorpus.includes("begroting") ||
    searchCorpus.includes("jaarrekening") ||
    searchCorpus.includes("jaardocument") ||
    searchCorpus.includes("perspectiefnota") ||
    searchCorpus.includes("kadernota") ||
    searchCorpus.includes("belasting") ||
    searchCorpus.includes("ozb") ||
    searchCorpus.includes("tarief") ||
    searchCorpus.includes("leges") ||
    searchCorpus.includes("gemeentefonds") ||
    searchCorpus.includes("circulaire") ||
    searchCorpus.includes("gemeenschappelijke regeling") ||
    searchCorpus.includes("gr ") ||
    searchCorpus.includes("gblt") ||
    searchCorpus.includes("rekenkamer") ||
    searchCorpus.includes("integriteit") ||
    searchCorpus.includes("dienstverlening") ||
    searchCorpus.includes("privacy") ||
    searchCorpus.includes("apv") ||
    searchCorpus.includes("politie") ||
    searchCorpus.includes("brandweer") ||
    searchCorpus.includes("veiligheidsregio") ||
    searchCorpus.includes("vrijsselland") ||
    searchCorpus.includes("crisisbeheersing") ||
    searchCorpus.includes("openbare orde") ||
    searchCorpus.includes("cameratoezicht") ||
    searchCorpus.includes("ondermijning") ||
    searchCorpus.includes("handhaving") ||
    searchCorpus.includes("toezicht") ||
    searchCorpus.includes("last onder dwangsom") ||
    searchCorpus.includes("riolering") ||
    searchCorpus.includes("riool") ||
    searchCorpus.includes("openbare verlichting") ||
    searchCorpus.includes("gladheidbestrijding") ||
    searchCorpus.includes("begraafplaats") ||
    searchCorpus.includes("motie") ||
    searchCorpus.includes("amendement") ||
    searchCorpus.includes("interpellatie") ||
    searchCorpus.includes("raadsvoorstel") ||
    searchCorpus.includes("ingekomen stukken")
  ) {
    return "Bestuur, Financiën & Juridische Zaken";
  }

  // Oude fallback mappings
  if (d.includes("wonen") || d.includes("ruimte")) return "Ruimtelijke Ordening, Wonen & Omgevingswet";
  if (d.includes("water") || d.includes("natuur") || d.includes("milieu")) return "Landbouw, Natuur & Waterbeheer";
  if (d.includes("economie") || d.includes("toerisme") || d.includes("cultuur")) return "Lokale Economie, Toerisme & Energie-infrastructuur";
  if (d.includes("verkeer") || d.includes("wegen")) return "Verkeer, Wegen & Fysieke Bereikbaarheid";
  if (d.includes("zorg") || d.includes("jeugd") || d.includes("sociaal") || d.includes("samenleving")) return "Sociaal Domein, Asiel & Leefbaarheid";
  if (d.includes("veiligheid") || d.includes("bestuur") || d.includes("financi")) return "Bestuur, Financiën & Juridische Zaken";

  // Standaard default
  return "Bestuur, Financiën & Juridische Zaken";
}

/**
 * Normaliseert het subdossier naar een specifiek, betekenisvol SKOS-conceptlabel.
 * Voorkomt categorisering op basis van afzenders en generieke restcontainers.
 */
export function normalizeSubdossier(
  hoofddossier: CanonicalHoofddossier,
  rawSub?: string,
  title?: string,
  entities?: string,
  text?: string,
  knownCustomSubdossiers?: string[]
): string {
  const combined = `${rawSub || ""} ${title || ""} ${entities || ""} ${text || ""}`.toLowerCase();
  const s = rawSub ? rawSub.trim() : "";
  const sLower = s.toLowerCase();

  // Ontsnappingsclausule voor Dead Letter Queue (DLQ)
  if (
    (hoofddossier as string) === "ONGECLASSIFICEERD_FALEN" ||
    sLower.includes("dlq") ||
    sLower.includes("audit & retry")
  ) {
    return rawSub || "Audit & Retry Vereist (DLQ)";
  }

  // Filter out any banned actor or generic label from being used as subdossier
  for (const banned of BANNED_ACTOR_KEYWORDS) {
    if (sLower.includes(banned)) {
      rawSub = "";
      break;
    }
  }

  // If user defined a custom subdossier, keep it if valid
  if (
    rawSub &&
    Array.isArray(knownCustomSubdossiers) &&
    knownCustomSubdossiers.length > 0
  ) {
    const matched = knownCustomSubdossiers.find((k) => k.toLowerCase().trim() === sLower);
    if (matched) return matched;
  }

  switch (hoofddossier) {
    case "Ruimtelijke Ordening, Wonen & Omgevingswet": {
      if (
        combined.includes("tam-omgevingsplan") ||
        combined.includes("inbreiding") ||
        combined.includes("bopa") ||
        combined.includes("kaveluitgifte") ||
        combined.includes("bloemwijk") ||
        combined.includes("spoorzone") ||
        combined.includes("woldmeenthe") ||
        combined.includes("nieuwbouw") ||
        combined.includes("woningbouw") ||
        combined.includes("woondeal") ||
        combined.includes("flexwoningen")
      ) {
        return "Woningbouw & Inbreiding";
      }
      if (
        combined.includes("sociale huur") ||
        combined.includes("volkshuisvesting") ||
        combined.includes("wetland wonen") ||
        combined.includes("woonconcept") ||
        combined.includes("woonwagen") ||
        combined.includes("standplaats") ||
        combined.includes("huisvestingsverordening")
      ) {
        return "Sociale Volkshuisvesting & Woningcorporaties";
      }
      if (
        combined.includes("beeldkwaliteit") ||
        combined.includes("welstand") ||
        combined.includes("overhavendijk") ||
        combined.includes("architectuur")
      ) {
        return "Beeldkwaliteit & Welstandstoezicht";
      }
      if (
        combined.includes("planschade") ||
        combined.includes("saoz") ||
        combined.includes("nadeelcompensatie") ||
        combined.includes("rvs")
      ) {
        return "Planschade & Ruimtelijke Jurisprudentie";
      }
      return "Bestemmingsplannen & Omgevingsvisie";
    }

    case "Landbouw, Natuur & Waterbeheer": {
      if (
        combined.includes("bodemdaling") ||
        combined.includes("veenoxidatie") ||
        combined.includes("klink")
      ) {
        return "Veenoxidatie & Bodemdaling";
      }
      if (
        combined.includes("peilbesluit") ||
        combined.includes("wdodelta") ||
        combined.includes("boezempeil") ||
        combined.includes("polderpeil") ||
        combined.includes("groeipeil") ||
        combined.includes("waterpeil") ||
        combined.includes("ogor") ||
        combined.includes("natschade") ||
        combined.includes("waterberging")
      ) {
        return "Waterpeilbeheer & Peilbesluiten";
      }
      if (
        combined.includes("stikstof") ||
        combined.includes("aerius") ||
        combined.includes("kdw") ||
        combined.includes("saldering") ||
        combined.includes("emissies") ||
        combined.includes("loswal kerkweg")
      ) {
        return "Stikstof, KDW & AERIUS";
      }
      if (
        combined.includes("natura 2000") ||
        combined.includes("weerribben") ||
        combined.includes("wieden") ||
        combined.includes("petgaten") ||
        combined.includes("pip") ||
        combined.includes("vuurvlinder") ||
        combined.includes("ecologisch herstel")
      ) {
        return "Natura 2000 & Inpassingsplannen";
      }
      if (
        combined.includes("pacht") ||
        combined.includes("kgo") ||
        combined.includes("vab") ||
        combined.includes("agrarisch") ||
        combined.includes("kringlooplandbouw") ||
        combined.includes("landbouw")
      ) {
        return "Agrarische Transitie & Pacht";
      }
      if (
        combined.includes("harkboot") ||
        combined.includes("vederkruid") ||
        combined.includes("exoot") ||
        combined.includes("krw") ||
        combined.includes("kaderrichtlijn water") ||
        combined.includes("waterkwaliteit")
      ) {
        return "Exotenbestrijding & Waterkwaliteit";
      }
      if (
        combined.includes("pfas") ||
        combined.includes("asbest") ||
        combined.includes("icebear") ||
        combined.includes("geurhinder") ||
        combined.includes("geluidshinder") ||
        combined.includes("bodemverontreiniging") ||
        combined.includes("odij")
      ) {
        return "Milieu, Bodem & Emissies";
      }
      return "Waterpeilbeheer & Peilbesluiten";
    }

    case "Lokale Economie, Toerisme & Energie-infrastructuur": {
      if (
        combined.includes("netcongestie") ||
        combined.includes("smart energy hub") ||
        combined.includes("zonnepark") ||
        combined.includes("windenergie") ||
        combined.includes("windmolen") ||
        combined.includes("steenergie") ||
        combined.includes("enexis") ||
        combined.includes("res ") ||
        combined.includes("compactstation") ||
        combined.includes("energietransitie")
      ) {
        return "Netcongestie & Energie-infrastructuur";
      }
      if (
        combined.includes("bedrijventerrein") ||
        combined.includes("eeserwold") ||
        combined.includes("groot verlaat") ||
        combined.includes("royal huisman") ||
        combined.includes("dolderkanaal")
      ) {
        return "Bedrijventerreinen & Werkgelegenheid";
      }
      if (
        combined.includes("vaarverordening") ||
        combined.includes("dorpsgracht") ||
        combined.includes("breedtebeperking") ||
        combined.includes("rondvaart") ||
        combined.includes("totaalaanpak parkeren") ||
        combined.includes("de landije") ||
        combined.includes("toerisme") ||
        combined.includes("toeristenbelasting") ||
        combined.includes("overtoerisme")
      ) {
        return "Toerisme Overlast & Regulering";
      }
      if (
        combined.includes("unesco") ||
        combined.includes("koloniën van weldadigheid") ||
        combined.includes("kolonien van weldadigheid") ||
        combined.includes("weldadigheid") ||
        combined.includes("willemsoord") ||
        combined.includes("bufferzone") ||
        combined.includes("monument") ||
        combined.includes("erfgoed") ||
        combined.includes("spijkervet") ||
        combined.includes("museum")
      ) {
        return "Cultuur, Erfgoed & UNESCO Bufferzone";
      }
      if (
        combined.includes("meenthe") ||
        combined.includes("scala") ||
        combined.includes("theater") ||
        combined.includes("podium") ||
        combined.includes("bibliotheek")
      ) {
        return "Podiumkunsten & Bibliotheken";
      }
      if (
        combined.includes("sport") ||
        combined.includes("waterwyck") ||
        combined.includes("zwembad") ||
        combined.includes("sportpark") ||
        combined.includes("kunstgras")
      ) {
        return "Sportaccommodaties & Zwembaden";
      }
      return "Middenstand, Horeca & Detailhandel";
    }

    case "Verkeer, Wegen & Fysieke Bereikbaarheid": {
      if (
        combined.includes("n761") ||
        combined.includes("n334") ||
        combined.includes("n762") ||
        combined.includes("n333") ||
        combined.includes("ronduitebrug") ||
        combined.includes("meenthebrug") ||
        combined.includes("scheerbrug") ||
        combined.includes("pontje jonen") ||
        combined.includes("asfalt") ||
        combined.includes("wegenonderhoud") ||
        combined.includes("wegenbeheer") ||
        combined.includes("brug") ||
        combined.includes("sluis")
      ) {
        return "Verkeer, N-Wegen & Bruggen";
      }
      if (
        combined.includes("fietspad") ||
        combined.includes("snelfiets") ||
        combined.includes("buslijn") ||
        combined.includes("rrreis") ||
        combined.includes("openbaar vervoer") ||
        combined.includes("gvvp") ||
        combined.includes("verkeersveiligheid") ||
        combined.includes("30 km") ||
        combined.includes("parkeerbeleid") ||
        combined.includes("parkeernorm")
      ) {
        return "Fietspaden, Openbaar Vervoer & Mobiliteit";
      }
      return "Verkeer, N-Wegen & Bruggen";
    }

    case "Sociaal Domein, Asiel & Leefbaarheid": {
      if (
        combined.includes("asiel") ||
        combined.includes("spreidingswet") ||
        combined.includes("coa") ||
        combined.includes("fletcher") ||
        combined.includes("broekslagen") ||
        combined.includes("woldmeentherand") ||
        combined.includes("oekra") ||
        combined.includes("vluchteling") ||
        combined.includes("statushouder") ||
        combined.includes("noodopvang")
      ) {
        return "Asielopvang, COA & Spreidingswet";
      }
      if (
        combined.includes("jeugdhulp") ||
        combined.includes("jeugdzorg") ||
        combined.includes("rsj") ||
        combined.includes("regionaal serviceteam jeugd") ||
        combined.includes("pleegzorg") ||
        combined.includes("jeugdbescherming") ||
        combined.includes("veilig thuis") ||
        combined.includes("huiselijk geweld")
      ) {
        return "Jeugdzorg & RSJ";
      }
      if (
        combined.includes("ggd") ||
        combined.includes("publieke gezondheid") ||
        combined.includes("gala") ||
        combined.includes("wmo") ||
        combined.includes("thuiszorg") ||
        combined.includes("huishoudelijke hulp") ||
        combined.includes("preventie")
      ) {
        return "Wmo & Publieke Gezondheid (GGD)";
      }
      if (
        combined.includes("kindcentrum") ||
        combined.includes("basisschool") ||
        combined.includes("school") ||
        combined.includes("scholen") ||
        combined.includes("ihp") ||
        combined.includes("onderwijshuisvesting") ||
        combined.includes("kinderopvang") ||
        combined.includes("eben haezer")
      ) {
        return "Onderwijshuisvesting & Kindcentra";
      }
      if (
        combined.includes("participatiewet") ||
        combined.includes("bijstand") ||
        combined.includes("schuldhulp") ||
        combined.includes("armoede") ||
        combined.includes("kredietbank") ||
        combined.includes("meedoenregeling") ||
        combined.includes("vroegsignalering") ||
        combined.includes("werkcaf")
      ) {
        return "Participatiewet & Schuldhulpverlening";
      }
      if (
        combined.includes("beschermd wonen") ||
        combined.includes("mantelzorg") ||
        combined.includes("maatschappelijke opvang") ||
        combined.includes("eenzaamheid")
      ) {
        return "Beschermd Wonen & Mantelzorg";
      }
      return "Jeugdzorg & RSJ";
    }

    case "Mijnbouw & Ondergrondse Opgaven": {
      if (
        combined.includes("gaswinning") ||
        combined.includes("vermilion") ||
        combined.includes("eesveen") ||
        combined.includes("gaslocatie") ||
        combined.includes("seismisch") ||
        combined.includes("aardbeving")
      ) {
        return "Gaswinning & Seismische Monitoring";
      }
      if (
        combined.includes("schade") ||
        combined.includes("zorgplicht") ||
        combined.includes("mijnbouwwet") ||
        combined.includes("compensatie")
      ) {
        return "Mijnbouwschade & Zorgplicht";
      }
      return "Ondergrondse Infrastructuur & Geothermie";
    }

    case "Bestuur, Financiën & Juridische Zaken":
    default: {
      if (
        combined.includes("begroting") ||
        combined.includes("jaarrekening") ||
        combined.includes("perspectiefnota") ||
        combined.includes("kadernota") ||
        combined.includes("gemeentefonds") ||
        combined.includes("circulaire") ||
        combined.includes("belasting") ||
        combined.includes("ozb") ||
        combined.includes("leges") ||
        combined.includes("tarief") ||
        combined.includes("financi")
      ) {
        return "Begroting, Jaarstukken & Financiën";
      }
      if (
        combined.includes("gemeenschappelijke regeling") ||
        combined.includes("gr ") ||
        combined.includes("wgr")
      ) {
        return "Gemeenschappelijke Regelingen (GR)";
      }
      if (
        combined.includes("apv") ||
        combined.includes("veiligheidsregio") ||
        combined.includes("brandweer") ||
        combined.includes("politie") ||
        combined.includes("openbare orde") ||
        combined.includes("cameratoezicht") ||
        combined.includes("ondermijning") ||
        combined.includes("handhaving") ||
        combined.includes("toezicht") ||
        combined.includes("dwangsom")
      ) {
        return "Openbare Orde, Veiligheid & APV";
      }
      if (
        combined.includes("riolering") ||
        combined.includes("riool") ||
        combined.includes("hemelwater") ||
        combined.includes("openbare verlichting") ||
        combined.includes("groenbeheer") ||
        combined.includes("bomenkap") ||
        combined.includes("begraafplaats") ||
        combined.includes("gladheidbestrijding")
      ) {
        return "Beheer Openbare Ruimte & Riolering";
      }
      if (
        combined.includes("rekenkamer") ||
        combined.includes("integriteit") ||
        combined.includes("dienstverlening") ||
        combined.includes("privacy") ||
        combined.includes("avg")
      ) {
        return "Integriteit, Dienstverlening & Rekenkamer";
      }
      return "Bestuurlijke Organisatie & Raadszaken";
    }
  }
}

/**
 * Genereert multidimensionale SKOS-concepttags voor verfijnde filterbaarheid.
 */
export function extractSkosTags(
  hoofddossier: CanonicalHoofddossier,
  subdossier: string,
  title?: string,
  text?: string
): string[] {
  const corpus = `${subdossier} ${title || ""} ${text || ""}`.toLowerCase();
  const tags = new Set<string>();

  if (corpus.includes("netcongestie")) tags.add("Netcongestie");
  if (corpus.includes("smart energy hub")) tags.add("Smart_Energy_Hub");
  if (corpus.includes("waterpeil") || corpus.includes("peilbesluit")) tags.add("Waterpeilbeheer");
  if (corpus.includes("ogor")) tags.add("OGOR_Regime");
  if (corpus.includes("bodemdaling") || corpus.includes("veenoxidatie")) tags.add("Bodemdaling");
  if (corpus.includes("stikstof") || corpus.includes("aerius")) tags.add("Stikstof_AERIUS");
  if (corpus.includes("woningbouw") || corpus.includes("inbreiding")) tags.add("Woningbouw");
  if (corpus.includes("tam-omgevingsplan") || corpus.includes("omgevingswet")) tags.add("Omgevingswet_TAM");
  if (corpus.includes("planschade") || corpus.includes("saoz")) tags.add("Planschade");
  if (corpus.includes("asiel") || corpus.includes("spreidingswet")) tags.add("Asiel_Spreidingswet");
  if (corpus.includes("gaswinning") || corpus.includes("seismisch")) tags.add("Mijnbouw_Gaswinning");
  if (corpus.includes("n761") || corpus.includes("n334") || corpus.includes("n762") || corpus.includes("n333")) tags.add("Provinciale_Wegen");
  if (corpus.includes("brug") || corpus.includes("sluis")) tags.add("Bruggen_Infrastructuur");
  if (corpus.includes("jeugdzorg") || corpus.includes("rsj")) tags.add("Jeugdzorg_RSJ");
  if (corpus.includes("wmo") || corpus.includes("ggd")) tags.add("Zorg_Wmo_GGD");
  if (corpus.includes("begroting") || corpus.includes("jaarstukken")) tags.add("Financien_Begroting");
  if (corpus.includes("unesco") || corpus.includes("weldadigheid")) tags.add("UNESCO_Werelderfgoed");
  if (corpus.includes("giethoorn") || corpus.includes("vaarverordening")) tags.add("Toerisme_Regulering");

  return Array.from(tags);
}

/**
 * Detecteert wijk of kern met strikte prioriteit voor TITEL boven tekstbody.
 * Voorkomt hallucinaties en foute toewijzingen.
 */
export function detectWijkenKernen(
  title?: string,
  entities?: string,
  text?: string,
  existingWijk?: string
): string[] {
  const detected = new Set<string>();

  // 1. Eerst controleren op expliciete match in TITEL (hoogste betrouwbaarheid)
  const titleLower = (title || "").toLowerCase();

  // Speciale regels voor specifieke gebiedsnamen in titels
  if (titleLower.includes("spoorzone") || titleLower.includes("steenwijk 2040")) {
    detected.add("Steenwijk West");
    return Array.from(detected);
  }
  if (titleLower.includes("bloemwijk")) {
    detected.add("Vollenhove");
    return Array.from(detected);
  }
  if (titleLower.includes("eeserwold")) {
    detected.add("Eeserwold");
    return Array.from(detected);
  }
  if (titleLower.includes("eesveen") || titleLower.includes("gaswinning eesveen")) {
    detected.add("Eesveen");
    return Array.from(detected);
  }
  if (titleLower.includes("groot verlaat")) {
    detected.add("Groot Verlaat");
    return Array.from(detected);
  }
  if (titleLower.includes("willemsoord") || titleLower.includes("koloniën van weldadigheid") || titleLower.includes("kolonien van weldadigheid")) {
    detected.add("Marijenkampen en Willemsoord");
    return Array.from(detected);
  }

  // Controleer alle overige kernen tegen de titel
  for (const w of WIJKEN_KERNEN_LIST) {
    for (const alias of w.aliases) {
      const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (pattern.test(titleLower)) {
        detected.add(w.naam);
        break;
      }
    }
  }

  // Als er via de titel al een match is gevonden, gebruik deze direct om vervuiling door de bodytekst te voorkomen!
  if (detected.size > 0) {
    return Array.from(detected);
  }

  // 2. Indien geen titelmatch: controleer entiteiten
  const entitiesLower = (entities || "").toLowerCase();
  for (const w of WIJKEN_KERNEN_LIST) {
    for (const alias of w.aliases) {
      const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (pattern.test(entitiesLower)) {
        detected.add(w.naam);
        break;
      }
    }
  }

  if (detected.size > 0) {
    return Array.from(detected);
  }

  // 3. Alleen als er nog geen match is, bekijk bestaande tag als die betrouwbaar is
  if (existingWijk && existingWijk.trim() && existingWijk !== "Geen" && existingWijk !== "Provinciebreed" && existingWijk !== "Waterschapbreed") {
    const parts = existingWijk.split(",").map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
      const match = WIJKEN_KERNEN_LIST.find((w) => w.naam.toLowerCase() === p.toLowerCase() || w.slug === p.toLowerCase());
      if (match) detected.add(match.naam);
    }
  }

  // 4. Als laatste redmiddel: zoek in eerste 1500 tekens van de tekst met strenge regex
  if (detected.size === 0 && text && text.trim().length > 0) {
    const sample = text.substring(0, 1500).toLowerCase();
    for (const w of WIJKEN_KERNEN_LIST) {
      if (["clingenborgh", "de-gagels", "nieuwe-gagels", "doosje"].includes(w.slug)) continue;

      for (const alias of w.aliases) {
        if (alias.length <= 4) continue;
        const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (pattern.test(sample)) {
          detected.add(w.naam);
          break;
        }
      }
      if (detected.size >= 2) break;
    }
  }

  return Array.from(detected);
}

export function detectWijkOrKern(text?: string): string | undefined {
  if (!text) return undefined;
  const list = detectWijkenKernen("", "", text);
  return list.length > 0 ? list[0] : undefined;
}

/**
 * Schoon de documenttitel op
 */
export function cleanPublicTitle(filename: string, rawTitle?: string): string {
  if (rawTitle && rawTitle.trim() && !rawTitle.toLowerCase().endsWith(".pdf")) {
    let clean = rawTitle.replace(/[_-]/g, " ").trim();
    clean = clean.replace(/^\d{4}[-\s]\d{2}[-\s]\d{2}[\s_]*/, "").replace(/^\d{5,10}[\s_]*/, "").trim();
    if (clean.length > 3) return clean;
  }

  let cleanTitle = filename.replace(/\.pdf$/i, "").replace(/[_-]/g, " ");
  cleanTitle = cleanTitle.replace(/^\d{4}[-\s]\d{2}[-\s]\d{2}[\s_]*/, "").replace(/^\d{5,10}[\s_]*/, "").trim();
  if (!cleanTitle) {
    cleanTitle = filename.replace(/\.pdf$/i, "");
  }
  return cleanTitle;
}

/**
 * Normaliseert entiteiten en zorgt dat verbannen actoren vanuit categorieën naar entiteiten worden gemigreerd.
 */
export function sanitizeEntities(
  rawEntities?: string,
  rawDossier?: string,
  rawSub?: string,
  text?: string
): string {
  const entitySet = new Set<string>();

  if (rawEntities) {
    rawEntities.split(",").forEach((e) => {
      const clean = e.trim();
      if (clean) entitySet.add(clean);
    });
  }

  const checkText = `${rawDossier || ""} ${rawSub || ""} ${text || ""}`.toLowerCase();
  if (checkText.includes("wdodelta") || checkText.includes("waterschap")) {
    entitySet.add("WDODelta");
  }
  if (checkText.includes("provincie overijssel") || checkText.includes("provinciale staten")) {
    entitySet.add("Provincie Overijssel");
  }
  if (checkText.includes("coa") || checkText.includes("centraal orgaan opvang asielzoekers")) {
    entitySet.add("COA");
  }
  if (checkText.includes("enexis")) {
    entitySet.add("Enexis");
  }
  if (checkText.includes("ggd") || checkText.includes("ggd ijsselland")) {
    entitySet.add("GGD IJsselland");
  }
  if (checkText.includes("rsj") || checkText.includes("regionaal serviceteam jeugd")) {
    entitySet.add("RSJ IJsselland");
  }
  if (checkText.includes("veiligheidsregio") || checkText.includes("vrijsselland")) {
    entitySet.add("Veiligheidsregio IJsselland");
  }
  if (checkText.includes("odij") || checkText.includes("omgevingsdienst")) {
    entitySet.add("Omgevingsdienst IJsselland (ODIJ)");
  }
  if (checkText.includes("wetland wonen")) {
    entitySet.add("Wetland Wonen");
  }

  return Array.from(entitySet).join(", ");
}

/**
 * Normaliseert een compleet documentrecord naar 100% strikte conformiteit met de 7 Canonieke Hoofddossiers.
 */
export function normalizeRecord(item: RaadsstukMetadata, text?: string): RaadsstukMetadata {
  const isDlq = (item.dossier || "").trim().toLowerCase() === "ongeclassificeerd_falen";
  const canonicalHoofd = isDlq
    ? ("ONGECLASSIFICEERD_FALEN" as any)
    : normalizeHoofddossier(item.dossier, item.titel, item.entiteiten, text);
  const canonicalSub = isDlq
    ? (item.subdossier || "Audit & Retry Vereist (DLQ)")
    : normalizeSubdossier(canonicalHoofd, item.subdossier, item.titel, item.entiteiten, text);
  const detectedWijken = detectWijkenKernen(item.titel, item.entiteiten, text, item.wijk_of_kern);
  const cleanEntiteiten = sanitizeEntities(item.entiteiten, item.dossier, item.subdossier, text);

  // Combineer AI-gegenereerde SKOS-concepten met de regex/rule extractie voor maximale semantische dekking
  const aiTags = Array.isArray(item.skos_tags) ? item.skos_tags : [];
  const ruleTags = isDlq ? [] : extractSkosTags(canonicalHoofd, canonicalSub, item.titel, text);
  const combinedTags = Array.from(
    new Set(
      [...aiTags, ...ruleTags]
        .map((t) => (typeof t === "string" ? t.trim().replace(/\s+/g, "_") : ""))
        .filter((t) => t.length > 1)
    )
  );

  return {
    bestandsnaam: item.bestandsnaam,
    titel: cleanPublicTitle(item.bestandsnaam, item.titel),
    dossier: canonicalHoofd,
    subdossier: canonicalSub,
    datum: item.datum || new Date().toISOString().split("T")[0],
    wijk_of_kern: detectedWijken.length > 0 ? detectedWijken.join(", ") : "",
    entiteiten: cleanEntiteiten,
    relaties: item.relaties || "",
    skos_tags: combinedTags
  };
}

/**
 * Validatiefunctie die controleert of een record 100% voldoet aan de 7 canonieke domeinen
 * en geen verboden actoren bevat.
 */
export function validateRecordConformity(item: RaadsstukMetadata): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (item.dossier === "ONGECLASSIFICEERD_FALEN") {
    return {
      valid: false,
      errors: ["Document geregistreerd in Dead Letter Queue (DLQ). Vereist audit of herclassificatie zodra AI beschikbaar is."]
    };
  }

  if (!CANONICAL_HOOFDDOSSIERS.includes(item.dossier as CanonicalHoofddossier)) {
    errors.push(`Ongeldig hoofddossier: '${item.dossier}'. Moet één van de 7 canonieke domeinen zijn.`);
  }

  const subLower = (item.subdossier || "").toLowerCase();
  for (const banned of BANNED_ACTOR_KEYWORDS) {
    if (subLower.includes(banned)) {
      errors.push(`Verboden actor/restbak gevonden in subdossier: '${item.subdossier}'.`);
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
