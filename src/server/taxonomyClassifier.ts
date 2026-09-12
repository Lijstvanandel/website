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

export const CANONICAL_PRIMARY_SUBDOSSIERS: Record<string, string> = {
  "Bestuur, Financiën & Organisatie": "Bestuur & Raadszaken",
  "Wonen, Bouwen & Ontwikkeling": "Woningbouw & Ruimtelijke Ordening",
  "Natuur, Milieu & Klimaat": "Milieu, Duurzaamheid & Klimaat",
  "Zorg, Gezondheid & Welzijn": "Zorg, Welzijn & Preventie",
  "Jeugd, Gezin & Onderwijs": "Jeugd- & Gezinsbeleid",
  "Verkeer, Wegen & Openbare Ruimte": "Verkeersveiligheid & Mobiliteit",
  "Kunst, Cultuur & Sport": "Kunst, Cultuur & Evenementen",
  "Veiligheid, Toezicht & Handhaving": "Openbare Orde & Handhaving",
  "Samenleving, Werk & Inclusie": "Participatie & Inclusie",
  "Economie, Ondernemen & Toerisme": "Economie & Ondernemerschap",
};

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
  { slug: "belt-schutsloot", naam: "Belt-schutsloot", aliases: ["belt-schutsloot", "beltschutsloot", "dorpsgracht belt-schutsloot", "belterweg"] },
  { slug: "blankenham", naam: "Blankenham", aliases: ["blankenham", "hammerdijk"] },
  { slug: "blokzijl", naam: "Blokzijl", aliases: ["blokzijl", "de hoop blokzijl", "noordermaten", "mauritsstraat"] },
  { slug: "de-pol-baars-en-de-bult", naam: "De Pol, Baars en de Bult", aliases: ["de pol", "baars", "de bult", "huis ten wolde"] },
  { slug: "doosje", naam: "Doosje", aliases: ["doosje"] },
  { slug: "eeserwold", naam: "Eeserwold", aliases: ["eeserwold"] },
  { slug: "eesveen", naam: "Eesveen", aliases: ["eesveen", "gaswinning eesveen", "vermilion"] },
  { slug: "giethoorn", naam: "Giethoorn", aliases: ["giethoorn", "binnenpad", "dorpsgracht giethoorn", "middenbuurt", "loswal kerkweg"] },
  { slug: "ijsselham-paasloo-en-de-basse", naam: "Ijsselham, Paasloo en de Basse", aliases: ["ijsselham", "paasloo", "de basse", "basse"] },
  { slug: "jonen-en-dwarsgracht", naam: "Jonen en Dwarsgracht", aliases: ["jonen", "dwarsgracht", "pontje jonen", "walengracht"] },
  { slug: "kalenberg", naam: "Kalenberg", aliases: ["kalenberg"] },
  { slug: "kallenkote", naam: "Kallenkote", aliases: ["kallenkote"] },
  { slug: "klosse-roekebos-en-dinxterveen", naam: "Klosse, Roekebos en Dinxterveen", aliases: ["klosse", "roekebos", "dinxterveen"] },
  { slug: "kuinre", naam: "Kuinre", aliases: ["kuinre", "overhavendijk", "worstdijk"] },
  { slug: "marijenkampen-en-willemsoord", naam: "Marijenkampen en Willemsoord", aliases: ["marijenkampen", "willemsoord", "reunedal", "koloniën van weldadigheid", "kolonien van weldadigheid"] },
  { slug: "moespot-en-leeuwte", naam: "Moespot en Leeuwte", aliases: ["moespot", "leeuwte"] },
  { slug: "nederland-en-baarlo", naam: "Nederland en Baarlo", aliases: ["nederland", "baarlo"] },
  { slug: "oldemarkt", naam: "Oldemarkt", aliases: ["oldemarkt", "oosterbroek"] },
  { slug: "onna", naam: "Onna", aliases: ["onna", "onnase doodweg", "transformatorstation steenwijk-onna"] },
  { slug: "ossenzijl", naam: "Ossenzijl", aliases: ["ossenzijl", "kooibomenpad"] },
  { slug: "scheerwolde", naam: "Scheerwolde", aliases: ["scheerwolde", "scheerwolderweg"] },
  { slug: "sint-jansklooster", naam: "Sint Jansklooster", aliases: ["sint jansklooster", "st. jansklooster", "molenstraat sint jansklooster", "eben haezer"] },
  { slug: "steenwijkerwold-en-witte-paarden", naam: "Steenwijkerwold en Witte paarden", aliases: ["steenwijkerwold", "witte paarden", "gelderingen", "dierenasiel de kluif"] },
  { slug: "tuk", naam: "Tuk", aliases: ["tuk", "tukseweg"] },
  { slug: "vollenhove", naam: "Vollenhove", aliases: ["vollenhove", "bloemwijk", "royal huisman"] },
  { slug: "wanneperveen", naam: "Wanneperveen", aliases: ["wanneperveen", "lozedijk"] },
  { slug: "wetering", naam: "Wetering", aliases: ["wetering", "wetering-west"] },
  { slug: "zuidveen", naam: "Zuidveen", aliases: ["zuidveen", "stroïnkweg", "stroinkweg"] }
];

/**
 * Normalizes any dossier string (including legacy ones, external ones like Waterschap or Overijssel)
 * to strictly one of the 10 canonical Steenwijkerland Hoofddossiers.
 *
 * Implements substantive topic matching based on the SKOS ontology from research on Steenwijkerland (2016-2026).
 */
export function normalizeHoofddossier(
  rawDossier?: string,
  title?: string,
  entities?: string,
  text?: string
): CanonicalHoofddossier {
  const d = (rawDossier || "").trim().toLowerCase();
  const searchCorpus = `${rawDossier || ""} ${title || ""} ${entities || ""} ${text || ""}`.toLowerCase();

  // If rawDossier is an explicit non-generic canonical dossier name, honor it unless corpus indicates high-confidence mismatch
  if (d === "wonen, bouwen & ontwikkeling") return "Wonen, Bouwen & Ontwikkeling";
  if (d === "natuur, milieu & klimaat" || d === "klimaat, water & natuur") return "Natuur, Milieu & Klimaat";
  if (d === "zorg, gezondheid & welzijn") return "Zorg, Gezondheid & Welzijn";
  if (d === "jeugd, gezin & onderwijs") return "Jeugd, Gezin & Onderwijs";
  if (d === "verkeer, wegen & openbare ruimte") return "Verkeer, Wegen & Openbare Ruimte";
  if (d === "kunst, cultuur & sport") return "Kunst, Cultuur & Sport";
  if (d === "veiligheid, toezicht & handhaving") return "Veiligheid, Toezicht & Handhaving";
  if (d === "samenleving, werk & inclusie") return "Samenleving, Werk & Inclusie";
  if (d === "economie, ondernemen & toerisme") return "Economie, Ondernemen & Toerisme";

  // Check substantive domain triggers before falling back to Bestuur/Financiën:

  // 1. Wonen, Bouwen & Ontwikkeling (TAM-omgevingsplannen, bestemmingsplannen, woningbouw, inbreiding, welstand, planschade)
  if (
    searchCorpus.includes("woningbouw") ||
    searchCorpus.includes("bestemmingsplan") ||
    searchCorpus.includes("omgevingsplan") ||
    searchCorpus.includes("omgevingsvisie") ||
    searchCorpus.includes("omgevingswet") ||
    searchCorpus.includes("bopa") ||
    searchCorpus.includes("tam-omgevingsplan") ||
    searchCorpus.includes("tam-omgevingsplannen") ||
    searchCorpus.includes("inbreiding") ||
    searchCorpus.includes("woonvisie") ||
    searchCorpus.includes("woondeal") ||
    searchCorpus.includes("starterslening") ||
    searchCorpus.includes("sociale huur") ||
    searchCorpus.includes("wetland wonen") ||
    searchCorpus.includes("woonconcept") ||
    searchCorpus.includes("beeldkwaliteit") ||
    searchCorpus.includes("beeldkwaliteitsplan") ||
    searchCorpus.includes("welstand") ||
    searchCorpus.includes("planschade") ||
    searchCorpus.includes("saoz") ||
    searchCorpus.includes("bouwvergunning") ||
    searchCorpus.includes("omgevingsvergunning") ||
    searchCorpus.includes("spoorzone") ||
    searchCorpus.includes("bloemwijk") ||
    searchCorpus.includes("noordermaten") ||
    searchCorpus.includes("oosterbroek") ||
    searchCorpus.includes("kaveluitgifte") ||
    searchCorpus.includes("kavel") ||
    searchCorpus.includes("woningsplitsing") ||
    searchCorpus.includes("woonwagen") ||
    searchCorpus.includes("standplaats") ||
    searchCorpus.includes("flexwoningen") ||
    searchCorpus.includes("huisvestingsverordening") ||
    searchCorpus.includes("leegstandsverordening") ||
    searchCorpus.includes("ruimtelijke ordening") ||
    searchCorpus.includes("bouwhoogte") ||
    searchCorpus.includes("perceel")
  ) {
    return "Wonen, Bouwen & Ontwikkeling";
  }

  // 2. Natuur, Milieu & Klimaat (Waterpeil, WDODelta, Peilbesluiten, Natura 2000, Stikstof, Exoten, Mijnbouw, Energietransitie)
  if (
    searchCorpus.includes("peilbesluit") ||
    searchCorpus.includes("wdodelta") ||
    searchCorpus.includes("waterschap") ||
    searchCorpus.includes("waterpeil") ||
    searchCorpus.includes("boezempeil") ||
    searchCorpus.includes("polderpeil") ||
    searchCorpus.includes("groeipeil") ||
    searchCorpus.includes("veenoxidatie") ||
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
    searchCorpus.includes("bodemdaling") ||
    searchCorpus.includes("gaswinning") ||
    searchCorpus.includes("vermilion") ||
    searchCorpus.includes("eesveen") ||
    searchCorpus.includes("netcongestie") ||
    searchCorpus.includes("smart energy hub") ||
    searchCorpus.includes("zonnepark") ||
    searchCorpus.includes("windenergie") ||
    searchCorpus.includes("windmolen") ||
    searchCorpus.includes("steenergie") ||
    searchCorpus.includes("pfas") ||
    searchCorpus.includes("milieu") ||
    searchCorpus.includes("klimaat") ||
    searchCorpus.includes("duurzaamheid") ||
    searchCorpus.includes("energietransitie")
  ) {
    return "Natuur, Milieu & Klimaat";
  }

  // 3. Verkeer, Wegen & Openbare Ruimte (Wegenonderhoud, Dijken, Bruggen, Vaarwegen, Pontje Jonen, Openbare Ruimte)
  if (
    searchCorpus.includes("wegenbeheer") ||
    searchCorpus.includes("asfaltonderhoud") ||
    searchCorpus.includes("n761") ||
    searchCorpus.includes("n334") ||
    searchCorpus.includes("n762") ||
    searchCorpus.includes("n333") ||
    searchCorpus.includes("ronduitebrug") ||
    searchCorpus.includes("meenthebrug") ||
    searchCorpus.includes("scheerbrug") ||
    searchCorpus.includes("pontje jonen") ||
    searchCorpus.includes("fietspad") ||
    searchCorpus.includes("fietsers") ||
    searchCorpus.includes("fiets") ||
    searchCorpus.includes("snelfietsroute") ||
    searchCorpus.includes("verkeersveiligheid") ||
    searchCorpus.includes("openbaar vervoer") ||
    searchCorpus.includes("buslijn") ||
    searchCorpus.includes("buurtbus") ||
    searchCorpus.includes("rrreis") ||
    searchCorpus.includes("dijkversterking") ||
    searchCorpus.includes("hwbp") ||
    searchCorpus.includes("dijk") ||
    searchCorpus.includes("riolering") ||
    searchCorpus.includes("riool") ||
    searchCorpus.includes("hemelwater") ||
    searchCorpus.includes("groenvoorziening") ||
    searchCorpus.includes("openbare verlichting") ||
    searchCorpus.includes("verlichting") ||
    searchCorpus.includes("verkeer") ||
    searchCorpus.includes("wegen") ||
    searchCorpus.includes("mobiliteit") ||
    searchCorpus.includes("parkeernorm") ||
    searchCorpus.includes("parkeerbeleid") ||
    searchCorpus.includes("30 km")
  ) {
    return "Verkeer, Wegen & Openbare Ruimte";
  }

  // 4. Economie, Ondernemen & Toerisme (Giethoorn vaarbeleid/parkeren, UNESCO erfgoed, Royal Huisman, Landbouw & Pacht)
  if (
    searchCorpus.includes("vaarverordening") ||
    searchCorpus.includes("totaalaanpak parkeren") ||
    searchCorpus.includes("toerisme") ||
    searchCorpus.includes("toeristen") ||
    searchCorpus.includes("recreatie") ||
    searchCorpus.includes("jachthaven") ||
    searchCorpus.includes("rondvaart") ||
    searchCorpus.includes("royal huisman") ||
    searchCorpus.includes("unesco") ||
    searchCorpus.includes("weldadigheid") ||
    searchCorpus.includes("bufferzone") ||
    searchCorpus.includes("bedrijventerrein") ||
    searchCorpus.includes("groot verlaat") ||
    searchCorpus.includes("pacht") ||
    searchCorpus.includes("agrarisch") ||
    searchCorpus.includes("landbouw") ||
    searchCorpus.includes("boer") ||
    searchCorpus.includes("kgo") ||
    searchCorpus.includes("vab") ||
    searchCorpus.includes("ondernemen") ||
    searchCorpus.includes("ondernemer") ||
    searchCorpus.includes("horeca") ||
    searchCorpus.includes("detailhandel") ||
    searchCorpus.includes("winkel") ||
    searchCorpus.includes("biz")
  ) {
    return "Economie, Ondernemen & Toerisme";
  }

  // 5. Jeugd, Gezin & Onderwijs (Kindcentra, Scholen, RSJ Jeugdzorg, IHP)
  if (
    searchCorpus.includes("kindcentrum") ||
    searchCorpus.includes("basisschool") ||
    searchCorpus.includes("scholen") ||
    searchCorpus.includes("school") ||
    searchCorpus.includes("onderwijs") ||
    searchCorpus.includes("ihp") ||
    searchCorpus.includes("jeugdhulp") ||
    searchCorpus.includes("jeugdzorg") ||
    searchCorpus.includes("rsj") ||
    searchCorpus.includes("kinderopvang") ||
    searchCorpus.includes("leerling") ||
    searchCorpus.includes("jongerenwerk") ||
    searchCorpus.includes("tromp meesters")
  ) {
    return "Jeugd, Gezin & Onderwijs";
  }

  // 6. Zorg, Gezondheid & Welzijn (Wmo, GGD, Mantelzorg, Beschermd Wonen)
  if (
    searchCorpus.includes("wmo") ||
    searchCorpus.includes("thuiszorg") ||
    searchCorpus.includes("ggd") ||
    searchCorpus.includes("publieke gezondheid") ||
    searchCorpus.includes("gala") ||
    searchCorpus.includes("mantelzorg") ||
    searchCorpus.includes("welzijn") ||
    searchCorpus.includes("beschermd wonen") ||
    searchCorpus.includes("gezondheid") ||
    searchCorpus.includes("sociaal werk de kop") ||
    searchCorpus.includes("ouderenzorg") ||
    searchCorpus.includes("eenzaamheid")
  ) {
    return "Zorg, Gezondheid & Welzijn";
  }

  // 7. Samenleving, Werk & Inclusie (Asielopvang, Oekraïne, Spreidingswet, Participatiewet, Schuldhulp, Dorpshuizen)
  if (
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
    searchCorpus.includes("dorpshuis") ||
    searchCorpus.includes("dorpsbelang") ||
    searchCorpus.includes("plaatselijk belang") ||
    searchCorpus.includes("burgerparticipatie") ||
    searchCorpus.includes("meedoenregeling") ||
    searchCorpus.includes("voedselbank")
  ) {
    return "Samenleving, Werk & Inclusie";
  }

  // 8. Veiligheid, Toezicht & Handhaving (Politie, Brandweer, APV, Handhaving, Dwangsom)
  if (
    searchCorpus.includes("veiligheidsregio") ||
    searchCorpus.includes("brandweer") ||
    searchCorpus.includes("apv") ||
    searchCorpus.includes("politie") ||
    searchCorpus.includes("handhaving") ||
    searchCorpus.includes("toezicht") ||
    searchCorpus.includes("last onder dwangsom") ||
    searchCorpus.includes("bestuursdwang") ||
    searchCorpus.includes("crisisbeheersing") ||
    searchCorpus.includes("openbare orde") ||
    searchCorpus.includes("cameratoezicht") ||
    searchCorpus.includes("vuurwerk") ||
    searchCorpus.includes("ondermijning")
  ) {
    return "Veiligheid, Toezicht & Handhaving";
  }

  // 9. Kunst, Cultuur & Sport (Meenthe, Scala, Musea, Monumenten, Sport)
  if (
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
    searchCorpus.includes("spijkervet") ||
    searchCorpus.includes("synagoge")
  ) {
    return "Kunst, Cultuur & Sport";
  }

  // 10. Default: Bestuur, Financiën & Organisatie
  return "Bestuur, Financiën & Organisatie";
}

/**
 * Normalizes or determines a specific, human-readable subdossier name
 * for a document within its canonical Hoofddossier according to the SKOS Matrix.
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

  // If user defined a custom subdossier, keep it
  if (Array.isArray(knownCustomSubdossiers) && knownCustomSubdossiers.length > 0) {
    const matched = knownCustomSubdossiers.find((k) => k.toLowerCase().trim() === sLower);
    if (matched) return matched;
  }

  switch (hoofddossier) {
    case "Wonen, Bouwen & Ontwikkeling": {
      if (combined.includes("tam-omgevingsplan") || combined.includes("inbreiding") || combined.includes("hoofdstuk 22") || combined.includes("de pol") || combined.includes("stroïnkweg") || combined.includes("marijenkampen 16")) {
        return "TAM-Omgevingsplannen & Inbreiding";
      }
      if (combined.includes("sociale huur") || combined.includes("volkshuisvesting") || combined.includes("wetland wonen") || combined.includes("woonconcept") || combined.includes("kloosterhuisstraat") || combined.includes("gelderingen")) {
        return "Sociale Volkshuisvesting & Woningcorporaties";
      }
      if (combined.includes("beeldkwaliteit") || combined.includes("welstand") || combined.includes("overhavendijk") || combined.includes("kuinre")) {
        return "Beeldkwaliteit & Welstandstoezicht";
      }
      if (combined.includes("planschade") || combined.includes("saoz") || combined.includes("de bult") || combined.includes("tukseweg") || combined.includes("rvs")) {
        return "Planschade & Ruimtelijke Jurisprudentie";
      }
      if (combined.includes("bloemwijk") || combined.includes("spoorzone") || combined.includes("eeserwold") || combined.includes("woldmeenthe") || combined.includes("noordermaten") || combined.includes("oosterbroek") || combined.includes("molenkampen")) {
        return "Woningbouw & Gebiedsontwikkeling";
      }
      return "Bestemmingsplannen & Omgevingsvisie";
    }

    case "Natuur, Milieu & Klimaat": {
      if (combined.includes("peilbesluit") || combined.includes("wdodelta") || combined.includes("boezempeil") || combined.includes("groeipeil") || combined.includes("veenoxidatie") || combined.includes("natschade") || combined.includes("waterpeil")) {
        return "Waterpeilbesluiten & WDODelta";
      }
      if (combined.includes("pip") || combined.includes("natura 2000") || combined.includes("weerribben") || combined.includes("wieden") || combined.includes("petgaten") || combined.includes("kooibomenpad") || combined.includes("vuurvlinder")) {
        return "Natura 2000 & Inpassingsplannen";
      }
      if (combined.includes("stikstof") || combined.includes("loswal kerkweg") || combined.includes("intern salderen") || combined.includes("aerius")) {
        return "Stikstofkaders & Saldering";
      }
      if (combined.includes("harkboot") || combined.includes("vederkruid") || combined.includes("exoot") || combined.includes("waterkwaliteit")) {
        return "Exotenbestrijding & Waterkwaliteit";
      }
      if (combined.includes("gaswinning") || combined.includes("eesveen") || combined.includes("vermilion") || combined.includes("mijnbouw") || combined.includes("bodemdaling")) {
        return "Mijnbouw & Gaswinning (Eesveen)";
      }
      if (combined.includes("netcongestie") || combined.includes("smart energy hub") || combined.includes("zonnepark") || combined.includes("windenergie") || combined.includes("steenergie") || combined.includes("energie")) {
        return "Energietransitie & Netcongestie";
      }
      return "Natuur- & Waterbeheer";
    }

    case "Verkeer, Wegen & Openbare Ruimte": {
      if (combined.includes("n761") || combined.includes("n334") || combined.includes("n762") || combined.includes("hammerdijk") || combined.includes("worstdijk") || combined.includes("lozedijk") || combined.includes("barsbeek") || combined.includes("asfalt")) {
        return "Groot Wegenonderhoud & Dijkverzakkingen";
      }
      if (combined.includes("ronduitebrug") || combined.includes("brug") || combined.includes("sluis") || combined.includes("pontje jonen") || combined.includes("walengracht") || combined.includes("vaarweg")) {
        return "Nautische Infrastructuur & Kunstwerken";
      }
      if (combined.includes("fietspad") || combined.includes("fiets") || combined.includes("verkeersveiligheid") || combined.includes("buslijn") || combined.includes("openbaar vervoer")) {
        return "Verkeersveiligheid, Fietspaden & OV";
      }
      return "Groenbeheer, Riolering & Openbare Ruimte";
    }

    case "Economie, Ondernemen & Toerisme": {
      if (combined.includes("vaarverordening") || combined.includes("dorpsgracht") || combined.includes("breedtebeperking") || combined.includes("vaarvergunning") || combined.includes("elektrisch varen")) {
        return "Toeristische Regulering Giethoorn";
      }
      if (combined.includes("parkeren") || combined.includes("totaalaanpak parkeren") || combined.includes("de landije") || combined.includes("dynamisch parkeerverwijzing")) {
        return "Totaalaanpak Parkeren Giethoorn";
      }
      if (combined.includes("royal huisman") || combined.includes("scheepsbouw") || combined.includes("groot verlaat") || combined.includes("bedrijventerrein")) {
        return "Maritieme Maakindustrie & Bedrijvigheid";
      }
      if (combined.includes("unesco") || combined.includes("weldadigheid") || combined.includes("willemsoord") || combined.includes("bufferzone")) {
        return "UNESCO Werelderfgoed & Landschap";
      }
      if (combined.includes("pacht") || combined.includes("agrarisch") || combined.includes("kgo") || combined.includes("vab") || combined.includes("zorgboerderij kallenkote")) {
        return "Agrarische Transitie & Pachtbeleid";
      }
      return "Middenstand, Horeca & Detailhandel";
    }

    case "Jeugd, Gezin & Onderwijs": {
      if (combined.includes("kindcentrum") || combined.includes("school") || combined.includes("scholen") || combined.includes("onderwijshuisvesting") || combined.includes("ihp") || combined.includes("eben haezer")) {
        return "Integrale Kindcentra & Scholen";
      }
      if (combined.includes("jeugdhulp") || combined.includes("jeugdzorg") || combined.includes("rsj") || combined.includes("pleegzorg")) {
        return "Jeugdzorg & Jeugdhulp";
      }
      if (combined.includes("huiselijk geweld") || combined.includes("kindermishandeling") || combined.includes("veilig thuis")) {
        return "Veilig Thuis & Gezinsbeleid";
      }
      return "Dorpshuizen & Krimp in Kleine Kernen";
    }

    case "Zorg, Gezondheid & Welzijn": {
      if (combined.includes("ggd") || combined.includes("publieke gezondheid") || combined.includes("gala") || combined.includes("preventie")) {
        return "Publieke Gezondheid & GGD";
      }
      if (combined.includes("wmo") || combined.includes("thuiszorg") || combined.includes("huishoudelijke hulp") || combined.includes("hulpmiddelen")) {
        return "Wmo, Thuiszorg & Huishoudelijke Hulp";
      }
      if (combined.includes("beschermd wonen") || combined.includes("maatschappelijke opvang") || combined.includes("dakloos")) {
        return "Beschermd Wonen & Opvang";
      }
      return "Mantelzorg & Welzijnswerk";
    }

    case "Samenleving, Werk & Inclusie": {
      if (combined.includes("asiel") || combined.includes("broekslagen") || combined.includes("woldmeentherand") || combined.includes("fletcher") || combined.includes("spreidingswet") || combined.includes("coa")) {
        return "Asielopvang & Spreidingswet";
      }
      if (combined.includes("oekra") || combined.includes("huis ten wolde") || combined.includes("emmaschool")) {
        return "Opvang Vluchtelingen Oekraïne";
      }
      if (combined.includes("participatiewet") || combined.includes("bijstand") || combined.includes("inkomen") || combined.includes("werk")) {
        return "Participatiewet & Werk/Inkomen";
      }
      if (combined.includes("schuldhulp") || combined.includes("kredietbank") || combined.includes("armoede")) {
        return "Schuldhulpverlening & Armoedebeleid";
      }
      return "Burgerparticipatie & Dorpsbelangen";
    }

    case "Veiligheid, Toezicht & Handhaving": {
      if (combined.includes("middenbuurt") || combined.includes("botenhuis") || combined.includes("dwangsom") || combined.includes("bouwtoezicht") || combined.includes("handhaving")) {
        return "Bestuursrechtelijke Handhaving & Bouwtoezicht";
      }
      if (combined.includes("veiligheidsregio") || combined.includes("brandweer") || combined.includes("kazerne") || combined.includes("crisis")) {
        return "Brandweer & Veiligheidsregio IJsselland";
      }
      return "Openbare Orde, Politie & APV";
    }

    case "Kunst, Cultuur & Sport": {
      if (combined.includes("meenthe") || combined.includes("scala") || combined.includes("theater") || combined.includes("bibliotheek")) {
        return "Podiumkunsten & Bibliotheken";
      }
      if (combined.includes("museum") || combined.includes("spijkervet") || combined.includes("monument") || combined.includes("erfgoed")) {
        return "Cultureel Erfgoed & Musea";
      }
      return "Sportaccommodaties & Verenigingen";
    }

    case "Bestuur, Financiën & Organisatie":
    default: {
      if (combined.includes("begroting") || combined.includes("jaarrekening") || combined.includes("perspectiefnota") || combined.includes("kadernota")) {
        return "Planning & Control (Begroting & Jaarstukken)";
      }
      if (combined.includes("belasting") || combined.includes("ozb") || combined.includes("tarief") || combined.includes("leges")) {
        return "Gemeentelijke Belastingen & Tarieven";
      }
      if (combined.includes("gemeenschappelijke regeling") || combined.includes("gr ") || combined.includes("odij") || combined.includes("gblt")) {
        return "Gemeenschappelijke Regelingen (GR)";
      }
      if (combined.includes("rekenkamer") || combined.includes("integriteit") || combined.includes("dienstverlening") || combined.includes("privacy")) {
        return "Integriteit, Dienstverlening & Rekenkamer";
      }
      return "Raadszaken & Politieke Markt";
    }
  }
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

export function detectWijkOrKern(
  text?: string
): string | undefined {
  if (!text) return undefined;
  const list = detectWijkenKernen("", "", text);
  return list.length > 0 ? list[0] : undefined;
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
