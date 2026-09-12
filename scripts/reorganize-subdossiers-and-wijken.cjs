const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const JSON_PATH = path.join(ROOT, "public", "data", "raadsstukken_metadata_tussentijds.json");
const DIST_JSON_PATH = path.join(ROOT, "dist", "data", "raadsstukken_metadata_tussentijds.json");
const MASTER_JSON_PATH = path.join(ROOT, "data", "raadsstukken_metadata_master.json");
const CSV_PATH = path.join(ROOT, "public", "data", "raadsstukken_metadata_tussentijds.csv");
const DIST_CSV_PATH = path.join(ROOT, "dist", "data", "raadsstukken_metadata_tussentijds.csv");
const GRAPH_PATH = path.join(ROOT, "public", "data", "network_graph.json");
const DIST_GRAPH_PATH = path.join(ROOT, "dist", "data", "network_graph.json");

const CANONICAL_HOOFDDOSSIERS = [
  "Ruimte, Wonen & Bereikbaarheid",
  "Klimaat, Water & Natuur",
  "Sociaal Domein, Zorg & Jeugd",
  "Lokale Economie, Toerisme & Cultuur",
  "Bestuur, Financiën & Openbare Orde"
];

const WIJKEN_KERNEN_LIST = [
  { slug: "centrum-steenwijk", naam: "Centrum Steenwijk", aliases: ["steenwijk centrum", "binnenstad steenwijk", "markt steenwijk", "stadshart steenwijk", "centrum steenwijk"] },
  { slug: "clingenborgh", naam: "Clingenborgh", aliases: ["clingenborgh"] },
  { slug: "de-gagels", naam: "De gagels", aliases: ["de gagels", "gagels"] },
  { slug: "nieuwe-gagels", naam: "Nieuwe gagels", aliases: ["nieuwe gagels"] },
  { slug: "dolderkanaal", naam: "Dolderkanaal", aliases: ["dolderkanaal", "dolder"] },
  { slug: "groot-verlaat", naam: "Groot Verlaat", aliases: ["groot verlaat", "icebear", "bedrijventerrein groot verlaat"] },
  { slug: "oostermeenthe", naam: "Oostermeenthe", aliases: ["oostermeenthe", "het vrije veld"] },
  { slug: "oostwijken-de-beitel", naam: "Oostwijken, De Beitel", aliases: ["oostwijken", "de beitel"] },
  { slug: "paddenpoel-en-kornputkwartier", naam: "Paddenpoel en Kornputkwartier", aliases: ["paddenpoel", "kornputkwartier", "kornput"] },
  { slug: "steenwijk-west", naam: "Steenwijk West", aliases: ["steenwijk west", "spoorzone steenwijk"] },
  { slug: "steenwijkerdiep", naam: "Steenwijkerdiep", aliases: ["steenwijkerdiep"] },
  { slug: "torenlanden", naam: "Torenlanden", aliases: ["torenlanden"] },
  { slug: "woldmeenthe", naam: "Woldmeenthe", aliases: ["woldmeenthe"] },
  { slug: "barsbeek-heetveld-en-kadoelen", naam: "Barsbeek, Heetveld en Kadoelen", aliases: ["barsbeek", "heetveld", "kadoelen"] },
  { slug: "belt-schutsloot", naam: "Belt-schutsloot", aliases: ["belt-schutsloot", "beltschutsloot", "dorpsgracht belt-schutsloot"] },
  { slug: "blankenham", naam: "Blankenham", aliases: ["blankenham"] },
  { slug: "blokzijl", naam: "Blokzijl", aliases: ["blokzijl", "de hoop blokzijl"] },
  { slug: "de-pol-baars-en-de-bult", naam: "De Pol, Baars en de Bult", aliases: ["de pol", "baars", "de bult"] },
  { slug: "doosje", naam: "Doosje", aliases: ["doosje"] },
  { slug: "eeserwold", naam: "Eeserwold", aliases: ["eeserwold"] },
  { slug: "eesveen", naam: "Eesveen", aliases: ["eesveen"] },
  { slug: "giethoorn", naam: "Giethoorn", aliases: ["giethoorn", "binnenpad", "dorpsgracht giethoorn"] },
  { slug: "ijsselham-paasloo-en-de-basse", naam: "Ijsselham, Paasloo en de Basse", aliases: ["ijsselham", "paasloo", "de basse", "basse"] },
  { slug: "jonen-en-dwarsgracht", naam: "Jonen en Dwarsgracht", aliases: ["jonen", "dwarsgracht"] },
  { slug: "kalenberg", naam: "Kalenberg", aliases: ["kalenberg"] },
  { slug: "kallenkote", naam: "Kallenkote", aliases: ["kallenkote"] },
  { slug: "klosse-roekebos-en-dinxterveen", naam: "Klosse, Roekebos en Dinxterveen", aliases: ["klosse", "roekebos", "dinxterveen"] },
  { slug: "kuinre", naam: "Kuinre", aliases: ["kuinre"] },
  { slug: "marijenkampen-en-willemsoord", naam: "Marijenkampen en Willemsoord", aliases: ["marijenkampen", "willemsoord"] },
  { slug: "moespot-en-leeuwte", naam: "Moespot en Leeuwte", aliases: ["moespot", "leeuwte"] },
  { slug: "nederland-en-baarlo", naam: "Nederland en Baarlo", aliases: ["nederland", "baarlo"] },
  { slug: "oldemarkt", naam: "Oldemarkt", aliases: ["oldemarkt"] },
  { slug: "onna", naam: "Onna", aliases: ["onna"] },
  { slug: "ossenzijl", naam: "Ossenzijl", aliases: ["ossenzijl"] },
  { slug: "scheerwolde", naam: "Scheerwolde", aliases: ["scheerwolde"] },
  { slug: "sint-jansklooster", naam: "Sint Jansklooster", aliases: ["sint jansklooster", "st. jansklooster"] },
  { slug: "steenwijkerwold-en-witte-paarden", naam: "Steenwijkerwold en Witte paarden", aliases: ["steenwijkerwold", "witte paarden"] },
  { slug: "tuk", naam: "Tuk", aliases: ["tuk"] },
  { slug: "vollenhove", naam: "Vollenhove", aliases: ["vollenhove"] },
  { slug: "wanneperveen", naam: "Wanneperveen", aliases: ["wanneperveen"] },
  { slug: "wetering", naam: "Wetering", aliases: ["wetering"] },
  { slug: "zuidveen", naam: "Zuidveen", aliases: ["zuidveen"] }
];

function normalizeHoofddossier(rawDossier, title = "", entities = "", text = "") {
  const d = (rawDossier || "").trim().toLowerCase();
  const searchCorpus = `${rawDossier || ""} ${title || ""} ${entities || ""} ${text || ""}`.toLowerCase();

  // 1. Direct canonical matches
  if (d === "ruimte, wonen & bereikbaarheid") return "Ruimte, Wonen & Bereikbaarheid";
  if (d === "klimaat, water & natuur") return "Klimaat, Water & Natuur";
  if (d === "sociaal domein, zorg & jeugd") return "Sociaal Domein, Zorg & Jeugd";
  if (d === "lokale economie, toerisme & cultuur") return "Lokale Economie, Toerisme & Cultuur";
  if (d === "bestuur, financiën & openbare orde" || d === "bestuur, financien & openbare orde") {
    return "Bestuur, Financiën & Openbare Orde";
  }

  // 2. Legacy Hoofddossiers mapping
  if (d.includes("wonen, bouwen") || d.includes("ruimtelijke") || d.includes("verkeer, wegen") || d.includes("mobiliteit")) {
    return "Ruimte, Wonen & Bereikbaarheid";
  }
  if (d.includes("natuur, milieu") || d.includes("klimaat") || d.includes("waterbeheer")) {
    return "Klimaat, Water & Natuur";
  }
  if (
    d.includes("zorg, gezondheid") ||
    d.includes("jeugd, gezin") ||
    d.includes("samenleving, zorg") ||
    d.includes("samenleving, inclusie") ||
    d.includes("werk, inkomen")
  ) {
    return "Sociaal Domein, Zorg & Jeugd";
  }
  if (d.includes("kunst, cultuur") || d.includes("economie, ondernemen") || d.includes("toerisme")) {
    return "Lokale Economie, Toerisme & Cultuur";
  }
  if (
    d.includes("bestuur, financiën & organisatie") ||
    d.includes("bestuur, financien & organisatie") ||
    d.includes("gemeenteraad & beleid") ||
    d.includes("veiligheid, toezicht") ||
    d.includes("openbare ruimte & onderhoud")
  ) {
    return "Bestuur, Financiën & Openbare Orde";
  }

  // 3. Waterschap
  if (d.includes("waterschap")) {
    if (searchCorpus.includes("begroting") || searchCorpus.includes("belasting") || searchCorpus.includes("gblt") || searchCorpus.includes("tarieven")) {
      return "Bestuur, Financiën & Openbare Orde";
    }
    if (searchCorpus.includes("brug") || searchCorpus.includes("weg") || searchCorpus.includes("fietspad")) {
      return "Ruimte, Wonen & Bereikbaarheid";
    }
    return "Klimaat, Water & Natuur";
  }

  // 4. Overijssel
  if (d.includes("overijssel")) {
    if (searchCorpus.includes("natuur") || searchCorpus.includes("stikstof") || searchCorpus.includes("weerribben") || searchCorpus.includes("water") || searchCorpus.includes("klimaat") || searchCorpus.includes("energie")) {
      return "Klimaat, Water & Natuur";
    }
    if (searchCorpus.includes("weg") || searchCorpus.includes("verkeer") || searchCorpus.includes("spoor") || searchCorpus.includes("woningbouw") || searchCorpus.includes("omgevingsplan") || searchCorpus.includes("ruimte")) {
      return "Ruimte, Wonen & Bereikbaarheid";
    }
    if (searchCorpus.includes("jeugd") || searchCorpus.includes("ggd") || searchCorpus.includes("zorg") || searchCorpus.includes("onderwijs")) {
      return "Sociaal Domein, Zorg & Jeugd";
    }
    if (searchCorpus.includes("cultuur") || searchCorpus.includes("erfgoed") || searchCorpus.includes("toerisme") || searchCorpus.includes("economie")) {
      return "Lokale Economie, Toerisme & Cultuur";
    }
    return "Bestuur, Financiën & Openbare Orde";
  }

  // 5. Keyword analysis
  if (
    searchCorpus.includes("bestemmingsplan") ||
    searchCorpus.includes("omgevingsplan") ||
    searchCorpus.includes("omgevingsvergunning") ||
    searchCorpus.includes("woonvisie") ||
    searchCorpus.includes("woningbouw") ||
    searchCorpus.includes("nieuwbouw") ||
    searchCorpus.includes("ruimtelijke ordening") ||
    searchCorpus.includes("kavel") ||
    searchCorpus.includes("gvvp") ||
    searchCorpus.includes("verkeer") ||
    searchCorpus.includes("wegen") ||
    searchCorpus.includes("fietspad")
  ) {
    return "Ruimte, Wonen & Bereikbaarheid";
  }

  if (
    searchCorpus.includes("stikstof") ||
    searchCorpus.includes("natura 2000") ||
    searchCorpus.includes("weerribben") ||
    searchCorpus.includes("water") ||
    searchCorpus.includes("peilbesluit") ||
    searchCorpus.includes("waterschap") ||
    searchCorpus.includes("klimaat") ||
    searchCorpus.includes("zonnepark") ||
    searchCorpus.includes("windturbine") ||
    searchCorpus.includes("duurzaam")
  ) {
    return "Klimaat, Water & Natuur";
  }

  if (
    searchCorpus.includes("wmo") ||
    searchCorpus.includes("zorg") ||
    searchCorpus.includes("welzijn") ||
    searchCorpus.includes("ggd") ||
    searchCorpus.includes("gezondheid") ||
    searchCorpus.includes("jeugd") ||
    searchCorpus.includes("onderwijs") ||
    searchCorpus.includes("armoede") ||
    searchCorpus.includes("asiel")
  ) {
    return "Sociaal Domein, Zorg & Jeugd";
  }

  if (
    searchCorpus.includes("bedrijventerrein") ||
    searchCorpus.includes("ondernemen") ||
    searchCorpus.includes("detailhandel") ||
    searchCorpus.includes("toerisme") ||
    searchCorpus.includes("horeca") ||
    searchCorpus.includes("sport") ||
    searchCorpus.includes("cultuur") ||
    searchCorpus.includes("museum") ||
    searchCorpus.includes("meenthe") ||
    searchCorpus.includes("erfgoed")
  ) {
    return "Lokale Economie, Toerisme & Cultuur";
  }

  return "Bestuur, Financiën & Openbare Orde";
}

function normalizeSubdossier(hoofddossier, rawSub, title = "", entities = "", text = "") {
  const s = (rawSub || "").toLowerCase().trim();
  const t = (title || "").toLowerCase();
  const e = (entities || "").toLowerCase();
  const tx = (text || "").toLowerCase();
  const combined = `${s} ${t} ${e} ${tx}`;

  if (
    s &&
    s !== "algemeen" &&
    s !== "overig" &&
    s !== "geen" &&
    s !== "provinciale staten & besluiten" &&
    s !== "waterschap drents overijsselse delta" &&
    s.length > 3
  ) {
    if (
      s.includes("&") ||
      s.includes("woningbouw") ||
      s.includes("bestemming") ||
      s.includes("stikstof") ||
      s.includes("begroting") ||
      s.includes("waterbeheer") ||
      s.includes("jeugd") ||
      s.includes("toerisme") ||
      s.includes("verkeer")
    ) {
      return rawSub.trim();
    }
  }

  switch (hoofddossier) {
    case "Ruimte, Wonen & Bereikbaarheid": {
      if (combined.includes("fiets") || combined.includes("fietspad") || combined.includes("snelfiets")) return "Fietsinfrastructuur & Fietspaden";
      if (combined.includes("parkeer") || combined.includes("blauwe zone") || combined.includes("laadpaal")) return "Parkeerbeleid & Parkeervoorzieningen";
      if (combined.includes("openbaar vervoer") || combined.includes("bus") || combined.includes("trein") || combined.includes("station")) return "Openbaar Vervoer & Spoorzone";
      if (combined.includes("weg") || combined.includes("asfalt") || combined.includes("onderhoud wegen") || combined.includes("rotonde") || combined.includes("n333") || combined.includes("n334")) return "Wegenbeheer & Wegonderhoud";
      if (combined.includes("verkeer") || combined.includes("gvvp") || combined.includes("mobiliteit") || combined.includes("30 km")) return "Verkeersveiligheid & Mobiliteit";
      if (combined.includes("woonwagen") || combined.includes("standplaats")) return "Woonwagenbeleid & Standplaatsen";
      if (combined.includes("vergunning") || combined.includes("welstand") || combined.includes("omgevingsvergunning")) return "Vergunningen & Welstand";
      if (combined.includes("stadsvisie") || combined.includes("gebiedsontwikkeling") || combined.includes("spoorzone") || combined.includes("omgevingsvisie") || combined.includes("vrije veld")) return "Gebiedsontwikkeling & Stadsvisies";
      if (combined.includes("bestemming") || combined.includes("bestemmingsplan") || combined.includes("omgevingsplan") || combined.includes("buitengebied") || combined.includes("vab") || combined.includes("bopa")) return "Bestemmingsplannen & Ruimtelijke Ordening";
      if (combined.includes("nieuwbouw") || combined.includes("kavels") || combined.includes("woningbouw") || combined.includes("woonvisie") || combined.includes("starters") || combined.includes("woondeal")) return "Woningbouw & Nieuwbouwprojecten";
      return "Ruimtelijke Ontwikkeling & Woningbouw";
    }

    case "Klimaat, Water & Natuur": {
      if (combined.includes("water") || combined.includes("peilbesluit") || combined.includes("dijk") || combined.includes("wdodelta") || combined.includes("waterschap") || combined.includes("gemaal") || combined.includes("sluis") || combined.includes("waterpeil")) return "Waterbeheer, Peilbesluiten & Dijken";
      if (combined.includes("stikstof") || combined.includes("aerius") || combined.includes("natura 2000") || combined.includes("kdw")) return "Stikstof & Natura 2000";
      if (combined.includes("wind") || combined.includes("windturbine") || combined.includes("windenergie") || combined.includes("windmolen")) return "Windenergie & Turbines";
      if (combined.includes("zon") || combined.includes("zonnepark") || combined.includes("zonnepanelen") || combined.includes("zonneweide")) return "Zonne-energie & Zonneparken";
      if (combined.includes("netcongestie") || combined.includes("compactstation") || combined.includes("energie") || combined.includes("warmte") || combined.includes("res ") || combined.includes("isolatie")) return "Energietransitie & Netcongestie";
      if (combined.includes("pfas") || combined.includes("asbest") || combined.includes("bodem") || combined.includes("verontreiniging")) return "PFAS, Bodemkwaliteit & Asbest";
      if (combined.includes("icebear") || combined.includes("geur") || combined.includes("emissie") || combined.includes("luchtkwaliteit") || combined.includes("geluidsoverlast")) return "Handhaving, Emissies & Geurhinder (IceBear)";
      if (combined.includes("weerribben") || combined.includes("wieden") || combined.includes("biodiversiteit") || combined.includes("natuurbeheer") || combined.includes("flora") || combined.includes("fauna") || combined.includes("weidevogel")) return "Natuurbeheer & Biodiversiteit";
      return "Milieu, Duurzaamheid & Klimaat";
    }

    case "Sociaal Domein, Zorg & Jeugd": {
      if (combined.includes("ggd") || combined.includes("gezondheid") || combined.includes("publieke gezondheid") || combined.includes("gala")) return "Publieke Gezondheid & GGD";
      if (combined.includes("asiel") || combined.includes("vluchteling") || combined.includes("oekra") || combined.includes("spreidingswet") || combined.includes("fletcher") || combined.includes("statushouder")) return "Asiel- & Vluchtelingenopvang";
      if (combined.includes("rsj") || combined.includes("regionaal serviceteam")) return "Regionale Jeugdzorg & RSJ";
      if (combined.includes("huiselijk geweld") || combined.includes("kindermishandeling") || combined.includes("veilig thuis")) return "Huiselijk Geweld & Kindermishandeling";
      if (combined.includes("jeugdhulp") || combined.includes("jeugdzorg") || combined.includes("jeugdbescherming") || combined.includes("pleegzorg")) return "Jeugdhulp & Jeugdbescherming";
      if (combined.includes("onderwijs") || combined.includes("school") || combined.includes("scholen") || combined.includes("ihp") || combined.includes("leerling")) return "Onderwijshuisvesting & Scholen";
      if (combined.includes("wmo") || combined.includes("thuiszorg") || combined.includes("ouderen") || combined.includes("mantelzorg") || combined.includes("dagbesteding")) return "Wmo, Thuiszorg & Mantelzorg";
      if (combined.includes("beschermd wonen") || combined.includes("dakloos") || combined.includes("opvang")) return "Beschermd Wonen & Maatschappelijke Opvang";
      if (combined.includes("schuldhulp") || combined.includes("kredietbank") || combined.includes("armoede") || combined.includes("vroegsignalering")) return "Schuldhulpverlening & Armoedebestrijding";
      if (combined.includes("participatiewet") || combined.includes("bijstand") || combined.includes("inkomen") || combined.includes("re-integratie")) return "Participatiewet & Inkomensondersteuning";
      if (combined.includes("inclusie") || combined.includes("toegankelijk") || combined.includes("onbeperkt")) return "Inclusie & Toegankelijkheid";
      if (combined.includes("participatie") || combined.includes("wijkgericht") || combined.includes("dorpsbelang") || combined.includes("buurt")) return "Burgerparticipatie & Wijkgericht Werken";
      return "Zorg, Welzijn & Preventie";
    }

    case "Lokale Economie, Toerisme & Cultuur": {
      if (combined.includes("bedrijventerrein") || combined.includes("eeserwold") || combined.includes("groot verlaat") || combined.includes("vestigingsklimaat")) return "Bedrijventerreinen & Vestigingsklimaat";
      if (combined.includes("toerisme") || combined.includes("recreatie") || combined.includes("toeristenbelasting") || combined.includes("varen") || combined.includes("rondvaart") || combined.includes("jachthaven")) return "Toerisme & Waterecreatie";
      if (combined.includes("meenthe") || combined.includes("theater") || combined.includes("scala") || combined.includes("podium") || combined.includes("muziek")) return "Podiumkunsten, Scala & De Meenthe";
      if (combined.includes("museum") || combined.includes("spijkervet") || combined.includes("stadsmuseum")) return "Nieuw Museum & Spijkervetstallen";
      if (combined.includes("monument") || combined.includes("erfgoed") || combined.includes("archeologie") || combined.includes("beeldende kunst")) return "Beeldende Kunst & Erfgoed";
      if (combined.includes("bibliotheek") || combined.includes("bieb") || combined.includes("taalpunt")) return "Bibliotheekvoorzieningen";
      if (combined.includes("sport") || combined.includes("kunstgras") || combined.includes("sportpark") || combined.includes("sporthal") || combined.includes("zwembad")) return "Sportaccommodaties & Velden";
      if (combined.includes("pacht") || combined.includes("landbouw") || combined.includes("agrarisch") || combined.includes("didam")) return "Agrarische Zaken & Pachtbeleid";
      if (combined.includes("detailhandel") || combined.includes("horeca") || combined.includes("winkel") || combined.includes("binnenstad") || combined.includes("middenstand")) return "Middenstand, Horeca & Detailhandel";
      return "Economie & Ondernemerschap";
    }

    case "Bestuur, Financiën & Openbare Orde": {
      if (combined.includes("begroting") || combined.includes("jaarrekening") || combined.includes("gemeentefonds") || combined.includes("circulaire") || combined.includes("belasting") || combined.includes("kadernota") || combined.includes("ozb") || combined.includes("tarieven") || combined.includes("financi")) return "Begroting, Financiën & Belastingen";
      if (combined.includes("veiligheidsregio") || combined.includes("brandweer") || combined.includes("crisis") || combined.includes("vrijsselland") || combined.includes("kazerne")) return "Veiligheidsregio IJsselland & Brandweer";
      if (combined.includes("icebear") || combined.includes("geluidsoverlast") || combined.includes("geuroverlast") || combined.includes("dwangsom")) return "Handhaving, Toezicht & Milieuhinder";
      if (combined.includes("gemeenschappelijke regeling") || combined.includes("gr ") || combined.includes("odij") || combined.includes("gblt")) return "Gemeenschappelijke Regelingen (GR)";
      if (combined.includes("apv") || combined.includes("openbare orde") || combined.includes("politie") || combined.includes("cameratoezicht") || combined.includes("handhaving") || combined.includes("noodverordening")) return "Openbare Orde, Veiligheid & APV";
      if (combined.includes("motie") || combined.includes("interpellatie") || combined.includes("initiatiefvoorstel") || combined.includes("amendement")) return "Moties, Interpellaties & Initiatieven";
      if (combined.includes("ingekomen") || combined.includes("raadscorrespondentie") || combined.includes("raadsbrief")) return "Ingekomen Stukken & Raadscorrespondentie";
      if (combined.includes("archief") || combined.includes("integriteit") || combined.includes("organisatie") || combined.includes("dienstverlening") || combined.includes("rekenkamer")) return "Bestuurlijke Organisatie & Integriteit";
      if (combined.includes("verlichting") || combined.includes("lantaarnpaal") || combined.includes("lichtmast") || combined.includes("led")) return "Openbare Verlichting & Lichtmasten";
      if (combined.includes("hemelwater") || combined.includes("grondwater") || combined.includes("riool") || combined.includes("riolering") || combined.includes("afkoppelen")) return "Hemelwater, Grondwater & Riolering";
      if (combined.includes("beschoeiing") || combined.includes("dorpsgracht") || combined.includes("kade") || combined.includes("ligplaats") || combined.includes("vaarweg")) return "Beschoeiing, Grachten & Vaarwegen";
      if (combined.includes("groen") || combined.includes("bomen") || combined.includes("parkbeheer") || combined.includes("bomenkap") || combined.includes("begraafplaats")) return "Groenvoorziening & Bomenbeheer";
      if (combined.includes("vastgoed") || combined.includes("gemeentehuis") || combined.includes("gebouwen")) return "Beheer Gemeentelijk Vastgoed";
      return "Bestuur & Raadszaken";
    }

    default:
      return "Bestuur & Raadszaken";
  }
}

function detectWijken(item) {
  const detected = new Set();
  const existing = (item.wijk_of_kern || "").trim();
  if (existing) {
    existing.split(",").forEach(w => {
      const clean = w.trim();
      if (clean) detected.add(clean);
    });
  }

  const searchable = `${item.titel || ""} ${item.bestandsnaam || ""} ${item.entiteiten || ""}`.toLowerCase();
  for (const w of WIJKEN_KERNEN_LIST) {
    for (const alias of w.aliases) {
      const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (pattern.test(searchable)) {
        detected.add(w.naam);
        break;
      }
    }
  }

  return Array.from(detected);
}

function cleanPublicTitle(filename, rawTitle) {
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

// 1. Process metadata JSON
console.log("Reading source metadata:", JSON_PATH);
const rawDocs = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));

let updatedDocs = rawDocs.map(item => {
  const canonicalHoofd = normalizeHoofddossier(item.dossier, item.titel, item.entiteiten);
  const cleanSub = normalizeSubdossier(canonicalHoofd, item.subdossier, item.titel, item.entiteiten);
  const detectedWijken = detectWijken(item);
  const wijkString = detectedWijken.length > 0 ? detectedWijken.join(", ") : (item.wijk_of_kern || "");

  return {
    bestandsnaam: item.bestandsnaam,
    titel: cleanPublicTitle(item.bestandsnaam, item.titel),
    dossier: canonicalHoofd,
    subdossier: cleanSub,
    datum: item.datum || null,
    wijk_of_kern: wijkString,
    entiteiten: item.entiteiten || "",
    relaties: item.relaties || ""
  };
});

// Save to public/data and dist/data
fs.writeFileSync(JSON_PATH, JSON.stringify(updatedDocs, null, 2), "utf-8");
console.log("Successfully wrote updated JSON:", JSON_PATH);

if (!fs.existsSync(path.dirname(DIST_JSON_PATH))) {
  fs.mkdirSync(path.dirname(DIST_JSON_PATH), { recursive: true });
}
fs.writeFileSync(DIST_JSON_PATH, JSON.stringify(updatedDocs, null, 2), "utf-8");
console.log("Successfully wrote dist JSON:", DIST_JSON_PATH);

if (!fs.existsSync(path.dirname(MASTER_JSON_PATH))) {
  fs.mkdirSync(path.dirname(MASTER_JSON_PATH), { recursive: true });
}
fs.writeFileSync(MASTER_JSON_PATH, JSON.stringify(updatedDocs, null, 2), "utf-8");
console.log("Successfully wrote master JSON:", MASTER_JSON_PATH);

// Also sync with SQLite database if sqliteDatabase is available
try {
  const Database = require("better-sqlite3");
  const DB_PATH = path.join(ROOT, "database.sqlite");
  if (fs.existsSync(DB_PATH)) {
    const db = new Database(DB_PATH);
    const stmt = db.prepare(`INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`);
    stmt.run("raadsstukken_metadata_master", JSON.stringify(updatedDocs));
    console.log("Successfully synced SQLite kv_store key 'raadsstukken_metadata_master'");
    db.close();
  }
} catch (err) {
  console.warn("Could not sync directly with SQLite (ignoring):", err.message);
}

// 2. Process CSV
function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  const s = String(val).replace(/"/g, '""');
  if (s.includes(";") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s}"`;
  }
  return s;
}

const csvHeader = "bestandsnaam;titel;dossier;subdossier;datum;wijk_of_kern;entiteiten;relaties";
const csvRows = updatedDocs.map(d => [
  escapeCsv(d.bestandsnaam),
  escapeCsv(d.titel),
  escapeCsv(d.dossier),
  escapeCsv(d.subdossier),
  escapeCsv(d.datum || ""),
  escapeCsv(d.wijk_of_kern || ""),
  escapeCsv(d.entiteiten || ""),
  escapeCsv(d.relaties || "")
].join(";"));

const csvOutput = [csvHeader, ...csvRows].join("\n");
fs.writeFileSync(CSV_PATH, csvOutput, "utf-8");
fs.writeFileSync(DIST_CSV_PATH, csvOutput, "utf-8");
console.log("Successfully wrote updated CSVs:", CSV_PATH, DIST_CSV_PATH);

// 3. Process network_graph.json
for (const gPath of [GRAPH_PATH, DIST_GRAPH_PATH]) {
  if (fs.existsSync(gPath)) {
    try {
      const graphData = JSON.parse(fs.readFileSync(gPath, "utf-8"));
      const docMap = new Map();
      updatedDocs.forEach(d => docMap.set(d.bestandsnaam.toLowerCase().trim(), d));

      let updatedNodeCount = 0;
      graphData.nodes = graphData.nodes.map(node => {
        const doc = docMap.get((node.id || "").toLowerCase().trim()) || docMap.get((node.label || "").toLowerCase().trim());
        if (doc) {
          updatedNodeCount++;
          return {
            ...node,
            group: doc.dossier,
            dossier: doc.dossier,
            subdossier: doc.subdossier,
            wijk: doc.wijk_of_kern || undefined
          };
        }
        return node;
      });

      fs.writeFileSync(gPath, JSON.stringify(graphData, null, 2), "utf-8");
      console.log(`Updated network graph ${gPath}: enriched ${updatedNodeCount} nodes.`);
    } catch (err) {
      console.error("Error updating graph:", err);
    }
  }
}

// 4. Print summary report
const summary = {};
updatedDocs.forEach(d => {
  if (!summary[d.dossier]) summary[d.dossier] = new Map();
  summary[d.dossier].set(d.subdossier, (summary[d.dossier].get(d.subdossier) || 0) + 1);
});

console.log("\n=========================================================================");
console.log("   GESTRUKTUREERD OVERZICHT: 5 CANONIEKE HOOFDDOSSIERS EN SUBDOSSIER-TEGELS  ");
console.log("=========================================================================");
for (const [hd, subs] of Object.entries(summary)) {
  const totalInHd = Array.from(subs.values()).reduce((a, b) => a + b, 0);
  console.log(`\n📁 [HOOFDDOSSIER] ${hd} (${totalInHd} raadsstukken, ${subs.size} subdossiers)`);
  for (const [sub, count] of subs.entries()) {
    console.log(`   └─ 🏷️  [Tegel] ${sub.padEnd(46)} : ${count} stukken`);
  }
}
