import path from "path";
import type { RaadsstukMetadata } from "../types/dossier.js";

export const CANONICAL_HOOFDDOSSIERS = [
  "Bestuur, Financiën & Organisatie",
  "Wonen, Bouwen & Ontwikkeling",
  "Natuur, Milieu & Klimaat",
  "Zorg, Gezondheid & Welzijn",
  "Jeugd, Gezin & Onderwijs",
  "Verkeer, Wegen & Openbare Ruimte",
  "Kunst, Cultuur & Sport",
  "Veiligheid, Toezicht & Handhaving",
  "Samenleving, Werk & Inclusie",
  "Economie, Ondernemen & Toerisme",
] as const;

export type CanonicalHoofddossier = (typeof CANONICAL_HOOFDDOSSIERS)[number];

// 42 wijken en kernen in Steenwijkerland
export const WIJKEN_KERNEN_LIST = [
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

/**
 * Normalizes any dossier string (including legacy ones, external ones like Waterschap or Overijssel)
 * to strictly one of the 10 canonical Steenwijkerland Hoofddossiers.
 */
export function normalizeHoofddossier(
  rawDossier?: string,
  title?: string,
  entities?: string,
  text?: string
): CanonicalHoofddossier {
  const d = (rawDossier || "").trim().toLowerCase();
  const searchCorpus = `${rawDossier || ""} ${title || ""} ${entities || ""} ${text || ""}`.toLowerCase();

  // 1. Direct canonical matches
  if (d === "bestuur, financiën & organisatie" || d === "bestuur, financien & organisatie" || d === "bestuur, financiën & openbare orde") {
    // If it mentions police, safety, fire brigade, route to safety
    if (searchCorpus.includes("veiligheidsregio") || searchCorpus.includes("brandweer") || searchCorpus.includes("apv") || searchCorpus.includes("politie") || searchCorpus.includes("handhaving")) {
      return "Veiligheid, Toezicht & Handhaving";
    }
    return "Bestuur, Financiën & Organisatie";
  }
  if (d === "wonen, bouwen & ontwikkeling") return "Wonen, Bouwen & Ontwikkeling";
  if (d === "natuur, milieu & klimaat" || d === "klimaat, water & natuur") return "Natuur, Milieu & Klimaat";
  if (d === "zorg, gezondheid & welzijn") return "Zorg, Gezondheid & Welzijn";
  if (d === "jeugd, gezin & onderwijs") return "Jeugd, Gezin & Onderwijs";
  if (d === "verkeer, wegen & openbare ruimte") return "Verkeer, Wegen & Openbare Ruimte";
  if (d === "kunst, cultuur & sport") return "Kunst, Cultuur & Sport";
  if (d === "veiligheid, toezicht & handhaving") return "Veiligheid, Toezicht & Handhaving";
  if (d === "samenleving, werk & inclusie") return "Samenleving, Werk & Inclusie";
  if (d === "economie, ondernemen & toerisme") return "Economie, Ondernemen & Toerisme";

  // 2. Veiligheid, Toezicht & Handhaving
  if (
    searchCorpus.includes("veiligheidsregio") ||
    searchCorpus.includes("brandweer") ||
    searchCorpus.includes("crisis") ||
    searchCorpus.includes("apv") ||
    searchCorpus.includes("handhaving, toezicht & milieuhinder") ||
    searchCorpus.includes("politie") ||
    searchCorpus.includes("cameratoezicht") ||
    searchCorpus.includes("openbare orde, veiligheid") ||
    searchCorpus.includes("noodverordening")
  ) {
    return "Veiligheid, Toezicht & Handhaving";
  }

  // 3. Kunst, Cultuur & Sport
  if (
    searchCorpus.includes("museum") ||
    searchCorpus.includes("spijkervet") ||
    searchCorpus.includes("podiumkunsten") ||
    searchCorpus.includes("meenthe") ||
    searchCorpus.includes("scala") ||
    searchCorpus.includes("sport") ||
    searchCorpus.includes("erfgoed") ||
    searchCorpus.includes("bibliotheek") ||
    searchCorpus.includes("beeldende kunst") ||
    searchCorpus.includes("theater")
  ) {
    return "Kunst, Cultuur & Sport";
  }

  // 4. Economie, Ondernemen & Toerisme
  if (
    searchCorpus.includes("bedrijventerrein") ||
    searchCorpus.includes("toerisme") ||
    searchCorpus.includes("ondernemen") ||
    searchCorpus.includes("middenstand") ||
    searchCorpus.includes("horeca") ||
    searchCorpus.includes("detailhandel") ||
    searchCorpus.includes("pachtbeleid") ||
    searchCorpus.includes("vestigingsklimaat") ||
    searchCorpus.includes("recreatie") ||
    searchCorpus.includes("agrarische zaken")
  ) {
    return "Economie, Ondernemen & Toerisme";
  }

  // 5. Jeugd, Gezin & Onderwijs
  if (
    searchCorpus.includes("jeugdhulp") ||
    searchCorpus.includes("jeugdzorg") ||
    searchCorpus.includes("onderwijshuisvesting") ||
    searchCorpus.includes("scholen") ||
    searchCorpus.includes("huiselijk geweld") ||
    searchCorpus.includes("kindermishandeling") ||
    searchCorpus.includes("jeugd- & gezinsbeleid") ||
    searchCorpus.includes("regionale jeugdzorg") ||
    searchCorpus.includes("leerling") ||
    searchCorpus.includes("kinderopvang")
  ) {
    return "Jeugd, Gezin & Onderwijs";
  }

  // 6. Zorg, Gezondheid & Welzijn
  if (
    searchCorpus.includes("publieke gezondheid") ||
    searchCorpus.includes("ggd") ||
    searchCorpus.includes("zorg, welzijn") ||
    searchCorpus.includes("wmo") ||
    searchCorpus.includes("thuiszorg") ||
    searchCorpus.includes("mantelzorg") ||
    searchCorpus.includes("beschermd wonen") ||
    searchCorpus.includes("gezondheid")
  ) {
    return "Zorg, Gezondheid & Welzijn";
  }

  // 7. Samenleving, Werk & Inclusie
  if (
    searchCorpus.includes("asiel") ||
    searchCorpus.includes("vluchteling") ||
    searchCorpus.includes("participatiewet") ||
    searchCorpus.includes("inclusie & toegankelijkheid") ||
    searchCorpus.includes("schuldhulpverlening") ||
    searchCorpus.includes("burgerparticipatie") ||
    searchCorpus.includes("armoede") ||
    searchCorpus.includes("bijstand") ||
    searchCorpus.includes("werk, inkomen")
  ) {
    return "Samenleving, Werk & Inclusie";
  }

  // 8. Verkeer, Wegen & Openbare Ruimte
  if (
    searchCorpus.includes("wegenbeheer") ||
    searchCorpus.includes("verkeersveiligheid") ||
    searchCorpus.includes("fietsinfrastructuur") ||
    searchCorpus.includes("parkeerbeleid") ||
    searchCorpus.includes("openbaar vervoer") ||
    searchCorpus.includes("openbare verlichting") ||
    searchCorpus.includes("beschoeiing, grachten") ||
    searchCorpus.includes("groenvoorziening") ||
    searchCorpus.includes("hemelwater, grondwater") ||
    searchCorpus.includes("gemeentelijk vastgoed") ||
    searchCorpus.includes("fietspad") ||
    searchCorpus.includes("mobiliteit") ||
    searchCorpus.includes("asfalt") ||
    searchCorpus.includes("riolering")
  ) {
    return "Verkeer, Wegen & Openbare Ruimte";
  }

  // 9. Natuur, Milieu & Klimaat
  if (
    searchCorpus.includes("waterbeheer") ||
    searchCorpus.includes("stikstof") ||
    searchCorpus.includes("zonne-energie") ||
    searchCorpus.includes("windenergie") ||
    searchCorpus.includes("energietransitie") ||
    searchCorpus.includes("pfas") ||
    searchCorpus.includes("natuurbeheer") ||
    searchCorpus.includes("milieu, duurzaamheid") ||
    searchCorpus.includes("weerribben") ||
    searchCorpus.includes("klimaat") ||
    searchCorpus.includes("peilbesluit") ||
    searchCorpus.includes("waterschap") ||
    searchCorpus.includes("dijk") ||
    searchCorpus.includes("netcongestie")
  ) {
    return "Natuur, Milieu & Klimaat";
  }

  // 10. Wonen, Bouwen & Ontwikkeling
  if (
    searchCorpus.includes("woningbouw") ||
    searchCorpus.includes("bestemmingsplan") ||
    searchCorpus.includes("omgevingsplan") ||
    searchCorpus.includes("woonwagenbeleid") ||
    searchCorpus.includes("ruimtelijke") ||
    searchCorpus.includes("vergunningen & welstand") ||
    searchCorpus.includes("gebiedsontwikkeling") ||
    searchCorpus.includes("bouwen") ||
    searchCorpus.includes("kavel") ||
    searchCorpus.includes("woonvisie")
  ) {
    return "Wonen, Bouwen & Ontwikkeling";
  }

  // Default canonical topic:
  return "Bestuur, Financiën & Organisatie";
}

/**
 * Normalizes or determines a specific, human-readable subdossier name
 * for a document within its canonical Hoofddossier.
 * NEVER returns empty string or "Algemeen".
 */
export const CANONICAL_PRIMARY_SUBDOSSIERS: Record<CanonicalHoofddossier, string> = {
  "Bestuur, Financiën & Organisatie": "Bestuur, Financiën & Organisatie",
  "Wonen, Bouwen & Ontwikkeling": "Wonen, Bouwen & Ontwikkeling",
  "Natuur, Milieu & Klimaat": "Natuur, Milieu & Klimaat",
  "Zorg, Gezondheid & Welzijn": "Zorg, Gezondheid & Welzijn",
  "Jeugd, Gezin & Onderwijs": "Jeugd, Gezin & Onderwijs",
  "Verkeer, Wegen & Openbare Ruimte": "Verkeer, Wegen & Openbare Ruimte",
  "Kunst, Cultuur & Sport": "Kunst, Cultuur & Sport",
  "Veiligheid, Toezicht & Handhaving": "Veiligheid, Toezicht & Handhaving",
  "Samenleving, Werk & Inclusie": "Samenleving, Werk & Inclusie",
  "Economie, Ondernemen & Toerisme": "Economie, Ondernemen & Toerisme",
};

/**
 * Normalizes or determines a specific, human-readable subdossier name
 * for a document within its canonical Hoofddossier.
 * In the canonical model, each of the 10 Hoofddossiers has EXACTLY ONE subdossier.
 * Custom user-created subdossiers are preserved and respected.
 */
export function normalizeSubdossier(
  hoofddossier: CanonicalHoofddossier,
  rawSub?: string,
  _title?: string,
  _entities?: string,
  _text?: string,
  knownCustomSubdossiers?: string[]
): string {
  const primarySub = CANONICAL_PRIMARY_SUBDOSSIERS[hoofddossier] || hoofddossier;

  // Use heuristic matching based on SKOS matrix if no explicit subdossier is provided
  if (!rawSub || rawSub.trim() === "" || rawSub.toLowerCase() === "algemeen") {
    const combined = ((_title || "") + " " + (_text || "")).toLowerCase();
    
    // Heuristics mapping to SKOS concepts
    if (combined.includes("woningbouw") || combined.includes("inbreiding") || combined.includes("streekcentrum")) {
      return "Woningbouw & Inbreiding";
    }
    if (combined.includes("waterkwaliteit") || combined.includes("peilbesluit") || combined.includes("waterpeil")) {
      return "Waterkwaliteit & Peilbeheer";
    }
    if (combined.includes("stikstof") || combined.includes("salderen") || combined.includes("aerius")) {
      return "Stikstof & Jurisprudentie";
    }
    if (combined.includes("handhaving") || combined.includes("planschade") || combined.includes("bezwaar")) {
      return "Bestuursrecht & Handhaving";
    }
    if (combined.includes("netcongestie") || combined.includes("energiehub") || combined.includes("zonnepark")) {
      return "Netcongestie & Energietransitie";
    }
    if (combined.includes("erfgoed") || combined.includes("unesco") || combined.includes("weldadigheid")) {
      return "Erfgoed & Bufferzones";
    }
    if (combined.includes("asiel") || combined.includes("vluchtelingen") || combined.includes("spreidingswet")) {
      return "Asielopvang & Spreidingswet";
    }
    if (combined.includes("toerisme") || combined.includes("parkeren") || combined.includes("vaarverordening")) {
      return "Toerisme Overlast & Infrastructuur";
    }
    if (combined.includes("mijnbouw") || combined.includes("gaswinning") || combined.includes("bodemdaling")) {
      return "Mijnbouw & Bodemdaling";
    }

    return primarySub;
  }

  const s = rawSub.trim();
  const sLower = s.toLowerCase();

  // If it's empty, placeholder or matches the primary subdossier, return primary
  if (
    !s ||
    sLower === "algemeen" ||
    sLower === "overig" ||
    sLower === "geen" ||
    sLower === "default" ||
    sLower === "provinciale staten & besluiten" ||
    sLower === "waterschap drents overijsselse delta" ||
    sLower === primarySub.toLowerCase()
  ) {
    return primarySub;
  }

  // If matched against registered custom subdossiers
  if (Array.isArray(knownCustomSubdossiers) && knownCustomSubdossiers.length > 0) {
    const matched = knownCustomSubdossiers.find(
      (k) => k.toLowerCase().trim() === sLower
    );
    if (matched) return matched;
  }

  // Allow multiple subdossiers (removed the exact 1 primary subdossier restriction)
  // Any provided subdossier name that is not a generic placeholder is preserved.
  return s;
}

function _unusedLegacyTaxonomy(hoofddossier: any, combined: string): string {

  switch (hoofddossier) {
    case "Wonen, Bouwen & Ontwikkeling": {
      if (combined.includes("woonwagen") || combined.includes("standplaats")) {
        return "Woonwagenbeleid & Standplaatsen";
      }
      if (combined.includes("vergunning") || combined.includes("welstand") || combined.includes("omgevingsvergunning")) {
        return "Vergunningen & Welstand";
      }
      if (combined.includes("stadsvisie") || combined.includes("gebiedsontwikkeling") || combined.includes("spoorzone") || combined.includes("omgevingsvisie") || combined.includes("vrije veld") || combined.includes("binnenstadsvisie")) {
        return "Gebiedsontwikkeling & Stadsvisies";
      }
      if (combined.includes("bestemming") || combined.includes("bestemmingsplan") || combined.includes("omgevingsplan") || combined.includes("buitengebied") || combined.includes("vab") || combined.includes("bopa") || combined.includes("beheersverordening")) {
        return "Bestemmingsplannen & Ruimtelijke Ordening";
      }
      if (combined.includes("nieuwbouw") || combined.includes("kavels") || combined.includes("woningbouw") || combined.includes("woonvisie") || combined.includes("starters") || combined.includes("sociale huur") || combined.includes("woondeal")) {
        return "Woningbouw & Nieuwbouwprojecten";
      }
      return "Ruimtelijke Ontwikkeling & Woningbouw";
    }

    case "Natuur, Milieu & Klimaat": {
      if (combined.includes("water") || combined.includes("peilbesluit") || combined.includes("dijk") || combined.includes("wdodelta") || combined.includes("waterschap") || combined.includes("gemaal") || combined.includes("sluis") || combined.includes("waterpeil") || combined.includes("watertoets") || combined.includes("waterkwaliteit")) {
        return "Waterbeheer, Peilbesluiten & Dijken";
      }
      if (combined.includes("stikstof") || combined.includes("aerius") || combined.includes("natura 2000") || combined.includes("kdw") || combined.includes("natuurdoelanalyse")) {
        return "Stikstof & Natura 2000";
      }
      if (combined.includes("wind") || combined.includes("windturbine") || combined.includes("windenergie") || combined.includes("windmolen")) {
        return "Windenergie & Turbines";
      }
      if (combined.includes("zon") || combined.includes("zonnepark") || combined.includes("zonnepanelen") || combined.includes("zonneweide")) {
        return "Zonne-energie & Zonneparken";
      }
      if (combined.includes("netcongestie") || combined.includes("compactstation") || combined.includes("energie") || combined.includes("warmte") || combined.includes("res ") || combined.includes("isolatie")) {
        return "Energietransitie & Netcongestie";
      }
      if (combined.includes("pfas") || combined.includes("asbest") || combined.includes("bodem") || combined.includes("verontreiniging")) {
        return "PFAS, Bodemkwaliteit & Asbest";
      }
      if (combined.includes("weerribben") || combined.includes("wieden") || combined.includes("biodiversiteit") || combined.includes("natuurbeheer") || combined.includes("flora") || combined.includes("fauna") || combined.includes("weidevogel") || combined.includes("bos")) {
        return "Natuurbeheer & Biodiversiteit";
      }
      return "Milieu, Duurzaamheid & Klimaat";
    }

    case "Zorg, Gezondheid & Welzijn": {
      if (combined.includes("ggd") || combined.includes("gezondheid") || combined.includes("publieke gezondheid") || combined.includes("gala") || combined.includes("vaccinatie")) {
        return "Publieke Gezondheid & GGD";
      }
      if (combined.includes("wmo") || combined.includes("thuiszorg") || combined.includes("ouderen") || combined.includes("mantelzorg") || combined.includes("dagbesteding") || combined.includes("hulpmiddelen")) {
        return "Wmo, Thuiszorg & Mantelzorg";
      }
      if (combined.includes("beschermd wonen") || combined.includes("dakloos") || combined.includes("maatschappelijke opvang")) {
        return "Beschermd Wonen & Maatschappelijke Opvang";
      }
      return "Zorg, Welzijn & Preventie";
    }

    case "Jeugd, Gezin & Onderwijs": {
      if (combined.includes("onderwijs") || combined.includes("school") || combined.includes("scholen") || combined.includes("ihp") || combined.includes("leerling") || combined.includes("kinderopvang")) {
        return "Onderwijshuisvesting & Scholen";
      }
      if (combined.includes("rsj") || combined.includes("regionaal serviceteam")) {
        return "Regionale Jeugdzorg & RSJ";
      }
      if (combined.includes("huiselijk geweld") || combined.includes("kindermishandeling") || combined.includes("veilig thuis")) {
        return "Huiselijk Geweld & Kindermishandeling";
      }
      if (combined.includes("jeugdhulp") || combined.includes("jeugdzorg") || combined.includes("jeugdbescherming") || combined.includes("pleegzorg")) {
        return "Jeugdhulp & Jeugdbescherming";
      }
      return "Jeugd- & Gezinsbeleid";
    }

    case "Verkeer, Wegen & Openbare Ruimte": {
      if (combined.includes("fiets") || combined.includes("fietspad") || combined.includes("snelfiets")) {
        return "Fietsinfrastructuur & Fietspaden";
      }
      if (combined.includes("parkeer") || combined.includes("blauwe zone") || combined.includes("laadpaal") || combined.includes("laadinfrastructuur")) {
        return "Parkeerbeleid & Parkeervoorzieningen";
      }
      if (combined.includes("openbaar vervoer") || combined.includes("bus") || combined.includes("trein") || combined.includes("station") || combined.includes("halte")) {
        return "Openbaar Vervoer & Spoorzone";
      }
      if (combined.includes("weg") || combined.includes("asfalt") || combined.includes("onderhoud wegen") || combined.includes("rotonde") || combined.includes("kruispunt") || combined.includes("rondweg") || combined.includes("n333") || combined.includes("n334")) {
        return "Wegenbeheer & Wegonderhoud";
      }
      if (combined.includes("verkeer") || combined.includes("gvvp") || combined.includes("mobiliteit") || combined.includes("30 km") || combined.includes("snelheid")) {
        return "Verkeersveiligheid & Mobiliteit";
      }
      if (combined.includes("verlichting") || combined.includes("lantaarnpaal") || combined.includes("lichtmast") || combined.includes("led")) {
        return "Openbare Verlichting & Lichtmasten";
      }
      if (combined.includes("hemelwater") || combined.includes("grondwater") || combined.includes("riool") || combined.includes("riolering") || combined.includes("afkoppelen")) {
        return "Hemelwater, Grondwater & Riolering";
      }
      if (combined.includes("beschoeiing") || combined.includes("dorpsgracht") || combined.includes("kade") || combined.includes("ligplaats") || combined.includes("vaarweg")) {
        return "Beschoeiing, Grachten & Vaarwegen";
      }
      if (combined.includes("groen") || combined.includes("bomen") || combined.includes("parkbeheer") || combined.includes("bomenkap") || combined.includes("begraafplaats")) {
        return "Groenvoorziening & Bomenbeheer";
      }
      if (combined.includes("vastgoed") || combined.includes("gemeentehuis") || combined.includes("gebouwen")) {
        return "Beheer Gemeentelijk Vastgoed";
      }
      return "Verkeersveiligheid & Mobiliteit";
    }

    case "Kunst, Cultuur & Sport": {
      if (combined.includes("meenthe") || combined.includes("theater") || combined.includes("scala") || combined.includes("podium") || combined.includes("muziek")) {
        return "Podiumkunsten, Scala & De Meenthe";
      }
      if (combined.includes("museum") || combined.includes("spijkervet") || combined.includes("stadsmuseum")) {
        return "Nieuw Museum & Spijkervetstallen";
      }
      if (combined.includes("monument") || combined.includes("erfgoed") || combined.includes("archeologie") || combined.includes("beeldende kunst")) {
        return "Beeldende Kunst & Erfgoed";
      }
      if (combined.includes("bibliotheek") || combined.includes("bieb") || combined.includes("taalpunt")) {
        return "Bibliotheekvoorzieningen";
      }
      if (combined.includes("sport") || combined.includes("kunstgras") || combined.includes("sportpark") || combined.includes("sporthal") || combined.includes("zwembad") || combined.includes("accommodatie")) {
        return "Sportaccommodaties & Velden";
      }
      return "Kunst, Cultuur & Evenementen";
    }

    case "Veiligheid, Toezicht & Handhaving": {
      if (combined.includes("veiligheidsregio") || combined.includes("brandweer") || combined.includes("vrijsselland") || combined.includes("kazerne")) {
        return "Veiligheidsregio IJsselland & Brandweer";
      }
      if (combined.includes("icebear") || combined.includes("geluidsoverlast") || combined.includes("geuroverlast") || combined.includes("dwangsom") || combined.includes("milieuhinder")) {
        return "Handhaving, Toezicht & Milieuhinder";
      }
      if (combined.includes("crisis") || combined.includes("rampen") || combined.includes("noodverordening")) {
        return "Crisisbeheersing & Rampenbestrijding";
      }
      if (combined.includes("apv") || combined.includes("openbare orde") || combined.includes("politie") || combined.includes("cameratoezicht") || combined.includes("ondermijning")) {
        return "Openbare Orde, Veiligheid & APV";
      }
      return "Openbare Orde, Veiligheid & APV";
    }

    case "Samenleving, Werk & Inclusie": {
      if (combined.includes("asiel") || combined.includes("vluchteling") || combined.includes("oekra") || combined.includes("spreidingswet") || combined.includes("fletcher") || combined.includes("statushouder") || combined.includes("noodopvang")) {
        return "Asiel- & Vluchtelingenopvang";
      }
      if (combined.includes("schuldhulp") || combined.includes("kredietbank") || combined.includes("armoede") || combined.includes("vroegsignalering")) {
        return "Schuldhulpverlening & Armoedebestrijding";
      }
      if (combined.includes("participatiewet") || combined.includes("bijstand") || combined.includes("inkomen") || combined.includes("re-integratie") || combined.includes("uitkering")) {
        return "Participatiewet & Inkomensondersteuning";
      }
      if (combined.includes("inclusie") || combined.includes("toegankelijk") || combined.includes("mindervalide") || combined.includes("onbeperkt")) {
        return "Inclusie & Toegankelijkheid";
      }
      if (combined.includes("participatie") || combined.includes("wijkgericht") || combined.includes("dorpsbelang") || combined.includes("buurt") || combined.includes("inwoner")) {
        return "Burgerparticipatie & Wijkgericht Werken";
      }
      return "Samenleving, Werk & Inclusie";
    }

    case "Economie, Ondernemen & Toerisme": {
      if (combined.includes("bedrijventerrein") || combined.includes("eeserwold") || combined.includes("groot verlaat") || combined.includes("vestigingsklimaat") || combined.includes("bedrijvenpark")) {
        return "Bedrijventerreinen & Vestigingsklimaat";
      }
      if (combined.includes("toerisme") || combined.includes("recreatie") || combined.includes("toeristenbelasting") || combined.includes("varen") || combined.includes("rondvaart") || combined.includes("jachthaven") || combined.includes("sloep")) {
        return "Toerisme & Waterecreatie";
      }
      if (combined.includes("pacht") || combined.includes("landbouw") || combined.includes("agrarisch") || combined.includes("boer") || combined.includes("didam")) {
        return "Agrarische Zaken & Pachtbeleid";
      }
      if (combined.includes("detailhandel") || combined.includes("horeca") || combined.includes("winkel") || combined.includes("binnenstad") || combined.includes("middenstand")) {
        return "Middenstand, Horeca & Detailhandel";
      }
      return "Economie & Ondernemerschap";
    }

    case "Bestuur, Financiën & Organisatie": {
      if (combined.includes("begroting") || combined.includes("jaarrekening") || combined.includes("gemeentefonds") || combined.includes("circulaire") || combined.includes("belasting") || combined.includes("kadernota") || combined.includes("ozb") || combined.includes("tarieven") || combined.includes("financi")) {
        return "Begroting, Financiën & Belastingen";
      }
      if (combined.includes("gemeenschappelijke regeling") || combined.includes("gr ") || combined.includes("odij") || combined.includes("gblt")) {
        return "Gemeenschappelijke Regelingen (GR)";
      }
      if (combined.includes("motie") || combined.includes("interpellatie") || combined.includes("initiatiefvoorstel") || combined.includes("amendement")) {
        return "Moties, Interpellaties & Initiatieven";
      }
      if (combined.includes("ingekomen") || combined.includes("raadscorrespondentie") || combined.includes("raadsbrief")) {
        return "Ingekomen Stukken & Raadscorrespondentie";
      }
      if (combined.includes("archief") || combined.includes("integriteit") || combined.includes("organisatie") || combined.includes("dienstverlening") || combined.includes("rekenkamer")) {
        return "Bestuurlijke Organisatie & Integriteit";
      }
      return "Bestuur & Raadszaken";
    }

    default:
      return "Bestuur & Raadszaken";
  }
}

/**
 * Detects matching Steenwijkerland wijken and kernen.
 */
export function detectWijkenKernen(
  title?: string,
  entities?: string,
  text?: string,
  existingWijk?: string
): string[] {
  const detected = new Set<string>();

  if (existingWijk && existingWijk.trim()) {
    existingWijk.split(",").forEach((w) => {
      const clean = w.trim();
      if (clean) detected.add(clean);
    });
  }

  const searchable = `${title || ""} ${entities || ""} ${text || ""}`.toLowerCase();

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

/**
 * Clean up title from filename or ugly strings
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
 * Normalizes an entire document record to ensure 100% strict compliance
 * with the 5 canonical Hoofddossiers and valid Subdossiers.
 */
export function normalizeRecord(item: RaadsstukMetadata, text?: string): RaadsstukMetadata {
  const canonicalHoofd = normalizeHoofddossier(item.dossier, item.titel, item.entiteiten, text);
  const canonicalSub = normalizeSubdossier(canonicalHoofd, item.subdossier, item.titel, item.entiteiten, text);
  const detectedWijken = detectWijkenKernen(item.titel, item.entiteiten, text, item.wijk_of_kern);

  return {
    bestandsnaam: item.bestandsnaam,
    titel: cleanPublicTitle(item.bestandsnaam, item.titel),
    dossier: canonicalHoofd,
    subdossier: canonicalSub,
    datum: item.datum || new Date().toISOString().split("T")[0],
    wijk_of_kern: detectedWijken.length > 0 ? detectedWijken.join(", ") : (item.wijk_of_kern || ""),
    entiteiten: item.entiteiten || "",
    relaties: item.relaties || ""
  };
}
