const fs = require("fs");
const path = require("path");

const JSON_PATH = path.join(__dirname, "../public/data/raadsstukken_metadata_tussentijds.json");
const CSV_PATH = path.join(__dirname, "../public/data/raadsstukken_metadata_tussentijds.csv");
const GRAPH_PATH = path.join(__dirname, "../public/data/network_graph.json");

// 42 wijken en kernen in Steenwijkerland
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

function normalizeSubdossier(hoofddossier, rawSub, title = "", entities = "") {
  const s = (rawSub || "").toLowerCase().trim();
  const t = (title || "").toLowerCase();
  const e = (entities || "").toLowerCase();
  const text = `${s} ${t} ${e}`;

  switch (hoofddossier) {
    case "Wonen, Bouwen & Ontwikkeling":
      if (s.includes("bestemming") || text.includes("bestemmingsplan") || text.includes("buitengebied")) return "Bestemmingsplannen & Ruimtelijke Ordening";
      if (s.includes("stadsvisie") || s.includes("gebiedsontwikkeling") || text.includes("spoorzone") || text.includes("omgevingsvisie") || text.includes("vrije veld")) return "Gebiedsontwikkeling & Stadsvisies";
      if (s.includes("woonwagen") || text.includes("standplaats") || text.includes("woonwagen")) return "Woonwagenbeleid & Standplaatsen";
      if (s.includes("vergunning") || text.includes("welstand") || text.includes("omgevingsvergunning")) return "Vergunningen & Welstand";
      if (text.includes("stikstof") || text.includes("aerius")) return "Stikstof & Bouwontwikkeling";
      if (text.includes("nieuwbouw") || text.includes("kavels") || text.includes("woningbouw") || text.includes("starters")) return "Woningbouw & Nieuwbouwprojecten";
      return "Woningbouw & Woonbeleid";

    case "Natuur, Milieu & Klimaat":
      if (s.includes("stikstof") || text.includes("aerius") || text.includes("natura 2000")) return "Stikstof & Natura 2000";
      if (s.includes("wind") || text.includes("windturbine") || text.includes("windenergie")) return "Windenergie & Turbines";
      if (s.includes("zon") || text.includes("zonnepark") || text.includes("zonnepanelen")) return "Zonne-energie & Zonneparken";
      if (s.includes("water") || text.includes("peilbesluit") || text.includes("dijk") || text.includes("wdodelta") || text.includes("waterschap")) return "Waterbeheer, Peilbesluiten & Dijken";
      if (text.includes("netcongestie") || text.includes("compactstation") || text.includes("energie") || text.includes("warmte") || text.includes("res ")) return "Energietransitie & Netcongestie";
      if (text.includes("weerribben") || text.includes("wieden") || text.includes("biodiversiteit") || text.includes("natuurbeheer")) return "Natuurbeheer & Biodiversiteit";
      return "Milieu, Duurzaamheid & Klimaat";

    case "Bestuur, Financiën & Organisatie":
      if (s.includes("zienswijze") || text.includes("gemeenschappelijke regeling") || text.includes("gr ") || text.includes("odij")) return "Gemeenschappelijke Regelingen (GR)";
      if (text.includes("begroting") || text.includes("jaarrekening") || text.includes("gemeentefonds") || text.includes("circulaire") || text.includes("belasting") || text.includes("kadernota")) return "Begroting, Financiën & Belastingen";
      if (s.includes("ingekomen") || text.includes("ingekomen stukken") || text.includes("raadsbrief") || text.includes("circulaires")) return "Ingekomen Stukken & Raadscorrespondentie";
      if (text.includes("interpellatie") || text.includes("motie") || text.includes("burgeramendement") || text.includes("initiatiefvoorstel")) return "Moties, Interpellaties & Initiatieven";
      if (text.includes("archief") || text.includes("integriteit") || text.includes("organisatie") || text.includes("dienstverlening")) return "Bestuurlijke Organisatie & Integriteit";
      return "Bestuur & Raad Algemeen";

    case "Zorg, Gezondheid & Welzijn":
      if (text.includes("zienswijze") || text.includes("ggd") || text.includes("gezondheid") || text.includes("publieke gezondheid")) return "Publieke Gezondheid & GGD";
      if (text.includes("wmo") || text.includes("thuiszorg") || text.includes("ouderen") || text.includes("mantelzorg") || text.includes("dagbesteding")) return "Wmo, Thuiszorg & Mantelzorg";
      if (text.includes("beschermd wonen") || text.includes("opvang") || text.includes("dakloos")) return "Beschermd Wonen & Maatschappelijke Opvang";
      if (text.includes("jeugdzorg") || text.includes("rsj")) return "Regionale Jeugdzorg & RSJ";
      return "Zorg, Welzijn & Preventie";

    case "Jeugd, Gezin & Onderwijs":
      if (text.includes("jeugdhulp") || text.includes("rsj") || text.includes("jeugdbescherming")) return "Jeugdhulp & Jeugdbescherming";
      if (text.includes("huiselijk geweld") || text.includes("kindermishandeling") || text.includes("veilig thuis")) return "Huiselijk Geweld & Kindermishandeling";
      if (text.includes("onderwijs") || text.includes("school") || text.includes("scholen") || text.includes("leerling") || text.includes("huisvesting")) return "Onderwijshuisvesting & Scholen";
      if (text.includes("kinderopvang") || text.includes("peuter") || text.includes("voorschool")) return "Kinderopvang & Jonge Kind";
      return "Jeugd- & Gezinsbeleid";

    case "Veiligheid, Toezicht & Handhaving":
      if (text.includes("veiligheidsregio") || text.includes("brandweer") || text.includes("crisis") || text.includes("vrijsselland")) return "Veiligheidsregio IJsselland & Brandweer";
      if (text.includes("icebear") || text.includes("handhaving") || text.includes("geluidsoverlast") || text.includes("geur") || text.includes("toezicht")) return "Handhaving, Toezicht & Milieuhinder";
      if (text.includes("apv") || text.includes("openbare orde") || text.includes("politie") || text.includes("cameratoezicht")) return "Openbare Orde & Veiligheid";
      if (text.includes("archief")) return "Archieftoezicht & Informatiebeheer";
      return "Veiligheid, Toezicht & APV";

    case "Kunst, Cultuur & Sport":
      if (text.includes("museum") || text.includes("spijkervetstallen") || text.includes("spijkervet")) return "Nieuw Museum & Spijkervetstallen";
      if (text.includes("scala") || text.includes("theater") || text.includes("meenthe") || text.includes("muziek")) return "Podiumkunsten, Scala & De Meenthe";
      if (text.includes("beeldende kunst") || text.includes("monument") || text.includes("erfgoed")) return "Beeldende Kunst & Erfgoed";
      if (text.includes("bibliotheek") || text.includes("markt")) return "Bibliotheekvoorzieningen";
      if (text.includes("sport") || text.includes("kunstgras") || text.includes("accommodatie") || text.includes("sportvelden")) return "Sportaccommodaties & Velden";
      return "Cultuur- & Sportbeleid";

    case "Verkeer, Wegen & Bereikbaarheid":
      if (text.includes("fiets") || text.includes("fietspad") || text.includes("snelfietsroute")) return "Fietsinfrastructuur & Fietspaden";
      if (text.includes("weg") || text.includes("asfalt") || text.includes("onderhoud wegen") || text.includes("infrastructuur")) return "Wegenbeheer & Wegonderhoud";
      if (text.includes("parkeer") || text.includes("blauwe zone") || text.includes("parkeertarieven")) return "Parkeerbeleid & Parkeervoorzieningen";
      if (text.includes("bus") || text.includes("trein") || text.includes("openbaar vervoer") || text.includes("station") || text.includes("keolis")) return "Openbaar Vervoer & Bereikbaarheid";
      return "Verkeersveiligheid & Mobiliteit";

    case "Economie, Ondernemen & Toerisme":
      if (text.includes("bedrijventerrein") || text.includes("bedrijvenpark") || text.includes("vestiging")) return "Bedrijventerreinen & Vestigingsklimaat";
      if (text.includes("toerisme") || text.includes("recreatie") || text.includes("toeristenbelasting") || text.includes("varen") || text.includes("rondvaart")) return "Toerisme & Waterecreatie";
      if (text.includes("pacht") || text.includes("landbouw") || text.includes("agrarisch") || text.includes("didam")) return "Agrarische Zaken & Pachtbeleid";
      if (text.includes("middenstand") || text.includes("detailhandel") || text.includes("horeca") || text.includes("aan huis")) return "Middenstand, Horeca & Detailhandel";
      return "Economie & Ondernemerschap";

    case "Openbare Ruimte & Onderhoud":
      if (text.includes("verlichting") || text.includes("lantaarnpaal") || text.includes("led")) return "Openbare Verlichting & Lichtmasten";
      if (text.includes("hemelwater") || text.includes("grondwater") || text.includes("riool") || text.includes("afkoppelen")) return "Hemelwater, Grondwater & Riolering";
      if (text.includes("beschoeiing") || text.includes("dorpsgracht") || text.includes("kade") || text.includes("ligplaats") || text.includes("vaarweg")) return "Beschoeiing, Grachten & Vaarwegen";
      if (text.includes("vastgoed") || text.includes("gebouwen") || text.includes("accommodatie")) return "Beheer Gemeentelijk Vastgoed";
      if (text.includes("groen") || text.includes("bomen") || text.includes("park") || text.includes("begraafplaats")) return "Groenvoorziening & Bomenbeheer";
      return "Inrichting Openbare Ruimte";

    case "Samenleving, Inclusie & Wijken":
      if (text.includes("asiel") || text.includes("oekra") || text.includes("vluchteling") || text.includes("fletcher") || text.includes("opvang") || text.includes("spreidingswet")) return "Asiel- & Vluchtelingenopvang";
      if (text.includes("inclusie") || text.includes("toegankelijk") || text.includes("onbeperkt samenleven")) return "Inclusie & Toegankelijkheid";
      if (text.includes("participatie") || text.includes("wijkgericht") || text.includes("dorpsbelang") || text.includes("buurt") || text.includes("burger")) return "Burgerparticipatie & Wijkgericht Werken";
      return "Samenleving & Leefbaarheid";

    case "Werk, Inkomen & Armoede":
      if (text.includes("schuldhulp") || text.includes("kredietbank") || text.includes("armoede")) return "Schuldhulpverlening & Armoedebestrijding";
      if (text.includes("participatiewet") || text.includes("bijstand") || text.includes("giftengrens")) return "Participatiewet & Inkomensondersteuning";
      if (text.includes("cao") || text.includes("sociale werk") || text.includes("aan de slag")) return "Sociale Werkgelegenheid (Aan de Slag)";
      if (text.includes("starter") || text.includes("lening")) return "Financiële Regelingen & Starters";
      return "Werk & Sociale Zekerheid";

    default:
      return rawSub || "Algemeen";
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

  const searchable = `${item.titel || ""} ${item.entiteiten || ""} ${item.relaties || ""} ${item.bestandsnaam || ""}`.toLowerCase();

  for (const w of WIJKEN_KERNEN_LIST) {
    for (const alias of w.aliases) {
      // Regex word boundary matching to avoid partial false positives
      const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (pattern.test(searchable)) {
        detected.add(w.naam);
        break;
      }
    }
  }

  return Array.from(detected);
}

// 1. Process metadata JSON
console.log("Reading:", JSON_PATH);
const rawDocs = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));

let updatedDocs = rawDocs.map(item => {
  const cleanSub = normalizeSubdossier(item.dossier, item.subdossier, item.titel, item.entiteiten);
  const detectedWijken = detectWijken(item);
  const wijkString = detectedWijken.length > 0 ? detectedWijken.join(", ") : (item.wijk_of_kern || "");

  return {
    bestandsnaam: item.bestandsnaam,
    titel: item.titel,
    dossier: item.dossier,
    subdossier: cleanSub,
    datum: item.datum || null,
    wijk_of_kern: wijkString,
    entiteiten: item.entiteiten || "",
    relaties: item.relaties || ""
  };
});

fs.writeFileSync(JSON_PATH, JSON.stringify(updatedDocs, null, 2), "utf-8");
console.log("Successfully wrote updated JSON:", JSON_PATH);

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

fs.writeFileSync(CSV_PATH, [csvHeader, ...csvRows].join("\n"), "utf-8");
console.log("Successfully wrote updated CSV:", CSV_PATH);

// 3. Process network_graph.json
if (fs.existsSync(GRAPH_PATH)) {
  try {
    const graphData = JSON.parse(fs.readFileSync(GRAPH_PATH, "utf-8"));
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

    fs.writeFileSync(GRAPH_PATH, JSON.stringify(graphData, null, 2), "utf-8");
    console.log(`Updated network_graph.json: enriched ${updatedNodeCount} nodes.`);
  } catch (err) {
    console.error("Error updating graph:", err);
  }
}

// 4. Print summary report
const summary = {};
updatedDocs.forEach(d => {
  if (!summary[d.dossier]) summary[d.dossier] = new Map();
  summary[d.dossier].set(d.subdossier, (summary[d.dossier].get(d.subdossier) || 0) + 1);
});

console.log("\n=========================================================================");
console.log("   GESTRUKTUREERD OVERZICHT: 12 HOOFDDOSSIERS EN HUN SUBDOSSIER-TEGELS  ");
console.log("=========================================================================");
for (const [hd, subs] of Object.entries(summary)) {
  const totalInHd = Array.from(subs.values()).reduce((a, b) => a + b, 0);
  console.log(`\n📁 [HOOFDDOSSIER] ${hd} (${totalInHd} raadsstukken, ${subs.size} subdossiers)`);
  for (const [sub, count] of subs.entries()) {
    console.log(`   └─ 🏷️  [Tegel] ${sub.padEnd(46)} : ${count} stukken`);
  }
}
