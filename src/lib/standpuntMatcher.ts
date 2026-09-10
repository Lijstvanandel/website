import { hoofdstukken, type Hoofdstuk, type Standpunt } from "../data/partijprogramma.js";
import type {
  CouncilAgendaTopic,
  CouncilDocument,
  MatchedStandpunt,
  DocumentMatchedStandpunt,
  TopicStandpuntSummary,
  StandpuntStance,
} from "../types/council.js";

// Pre-indexed rules and themes connecting council topics & documents to Lijst van Andel standpoints
interface PolicyRule {
  id: string;
  hoofdstukNr: number;
  standpuntNr: number;
  stance: StandpuntStance;
  keywords: string[];
  docKeywords?: string[];
  explanation: string;
  weight?: number;
}

const POLICY_RULES: PolicyRule[] = [
  // HOOFDSTUK 1: Democratie, Bestuur & Lokale Autonomie
  {
    id: "h1_referendum",
    hoofdstukNr: 1,
    standpuntNr: 1,
    stance: "positief",
    keywords: ["referendum", "volksraadpleging", "stembusuitspraak", "burgerraadpleging", "referenda"],
    explanation: "Lijst van Andel is voorstander van bindende lokale referenda zodat inwoners zelf direct beslissen over ingrijpende kwesties.",
    weight: 10,
  },
  {
    id: "h1_participatie",
    hoofdstukNr: 1,
    standpuntNr: 3,
    stance: "positief",
    keywords: [
      "burgerparticipatie", "inwonersparticipatie", "inspraak", "dorpsraad", "wijkraad",
      "dorpsraden", "inloopavond", "omwonendenberaad", "samenspraak", "zienswijzen"
    ],
    explanation: "Lijst van Andel eist echte burgerparticipatie vooraf en versterking van wijk- en dorpsraden in plaats van schijninspraak achteraf.",
    weight: 8,
  },
  {
    id: "h1_kerntaken",
    hoofdstukNr: 1,
    standpuntNr: 4,
    stance: "positief",
    keywords: ["kerntaken", "rekenkamer", "rekenkameronderzoek", "doelmatigheid", "rechtmatigheid", "ombudsfunctie", "controle"],
    explanation: "De gemeente moet zich primair richten op haar kerntaken en openbare verantwoording afleggen via onafhankelijke controle.",
    weight: 8,
  },
  {
    id: "h1_autonomie",
    hoofdstukNr: 1,
    standpuntNr: 6,
    stance: "negatief",
    keywords: [
      "herindeling", "dwangmaatregel", "spreidingswet", "asielquotum", "dwang van rijkswege",
      "opgelegd door rijk", "provinciale dwang", "bovenlokaal dictaat"
    ],
    explanation: "Lijst van Andel wijst externe dwangmaatregelen en inbreuk op de lokale autonomie van Steenwijkerland resoluut af.",
    weight: 10,
  },
  {
    id: "h1_regiosamenwerking",
    hoofdstukNr: 1,
    standpuntNr: 7,
    stance: "negatief",
    keywords: [
      "gemeenschappelijke regeling", "regio ijsselland", "res west-overijssel", "regionale energiestrategie",
      "bovenlokaal overleg", "ggd ijsselland", "omgevingsdienst ijsselland", "veiligheidsregio ijsselland"
    ],
    docKeywords: ["regiovisie", "regionaal beleid", "begroting regio", "ontwerpbegroting 2027"],
    explanation: "Lijst van Andel waakt voor uitholling van de gemeenteraad door ondoorzichtige regionale samenwerkingsverbanden waar de kiezer geen grip op heeft.",
    weight: 7,
  },
  {
    id: "h1_subsidie_activisme",
    hoofdstukNr: 1,
    standpuntNr: 11,
    stance: "negatief",
    keywords: ["activistische", "diversiteitsbeleid", "ideologisch", "sdg", "duurzaamheidsdoelen", "ngo subsidie"],
    explanation: "Geen gemeentelijke subsidies aan activistische clubs of ideologisch sturende programma's.",
    weight: 7,
  },

  // HOOFDSTUK 2: Veiligheid & Handhaving
  {
    id: "h2_zichtbare_handhaving",
    hoofdstukNr: 2,
    standpuntNr: 1,
    stance: "positief",
    keywords: [
      "handhaving", "boa", "politie", "stationsgebied", "fietsenstalling", "toezicht en handhaving",
      "veiligheid op straat", "veiligheidsregio", "brandweer", "blauwe lampen", "wijkagent"
    ],
    explanation: "Lijst van Andel steunt meer zichtbare handhaving en toezicht op straat, zoals rondom het station en in de dorpscentra.",
    weight: 9,
  },
  {
    id: "h2_overlast",
    hoofdstukNr: 2,
    standpuntNr: 2,
    stance: "positief",
    keywords: [
      "overlast", "jeugdoverlast", "vuurwerkoverlast", "hangjongeren", "bedelgedrag",
      "participatiewet handhaving", "fraude", "veiligheidsplan"
    ],
    explanation: "Lijst van Andel staat voor een daadkrachtige aanpak van overlast en lik-op-stuk beleid tegen intimidatie en verloedering.",
    weight: 8,
  },
  {
    id: "h2_gevaarlijke_stoffen",
    hoofdstukNr: 2,
    standpuntNr: 1,
    stance: "positief",
    keywords: ["gevaarlijke stoffen", "stoffenroutes", "transport gevaarlijke stoffen", "externe veiligheid", "veiligheidsroute"],
    explanation: "Aanpassen van transportroutes voor gevaarlijke stoffen om woonwijken en kwetsbare dorpskernen maximaal te ontzien.",
    weight: 9,
  },

  // HOOFDSTUK 3: Asiel, Migratie & Integratie
  {
    id: "h3_geen_azc",
    hoofdstukNr: 3,
    standpuntNr: 1,
    stance: "negatief",
    keywords: ["azc", "asielopvang", "asielzoekerscentrum", "noodopvang", "crisisnoodopvang", "opvanglocatie", "vluchtelingenopvang"],
    explanation: "Lijst van Andel verzet zich tegen nieuwe AZC's of noodopvanglocaties in Steenwijkerland om rust en draagkracht te behouden.",
    weight: 12,
  },
  {
    id: "h3_sluiting_broekslagen",
    hoofdstukNr: 3,
    standpuntNr: 2,
    stance: "negatief",
    keywords: ["broekslagen", "groot verlaat", "tijdelijke opvang broekslagen", "verlenging opvang"],
    explanation: "Lijst van Andel wil definitieve sluiting van de opvang aan de Broekslagen en geen stilzwijgende verlengingen.",
    weight: 12,
  },
  {
    id: "h3_geen_dwang_spreidingswet",
    hoofdstukNr: 3,
    standpuntNr: 3,
    stance: "negatief",
    keywords: ["spreidingswet", "dwangwet", "asielquotum", "verplichte opvang", "taakstelling asiel"],
    explanation: "Lijst van Andel weigert medewerking aan de Haagse dwang van de Spreidingswet.",
    weight: 12,
  },

  // HOOFDSTUK 4: Identiteit, Cultuur & Erfgoed
  {
    id: "h4_evenementen_tradities",
    hoofdstukNr: 4,
    standpuntNr: 1,
    stance: "positief",
    keywords: ["evenementenbeleid", "evenement", "dorpsfeest", "corso", "bloemencorso", "tradities", "vrijwilligers"],
    explanation: "Ruim baan voor traditionele evenementen en dorpsfeesten; bureaucratische vergunningseisen moeten omlaag.",
    weight: 8,
  },
  {
    id: "h4_lokale_omroep",
    hoofdstukNr: 4,
    standpuntNr: 2,
    stance: "positief",
    keywords: ["lokale omroep", "publieke omroep", "rtv sl", "media aanwijzing", "lokale media", "zendgemachtigde"],
    explanation: "Lijst van Andel stimuleert een lokale omroep met een sterke binding met Steenwijkerland en transparante verslaggeving van raadsbesluiten.",
    weight: 8,
  },
  {
    id: "h4_erfgoed_monumenten",
    hoofdstukNr: 4,
    standpuntNr: 4,
    stance: "positief",
    keywords: [
      "erfgoed", "monument", "monumenten", "historisch", "historische kern", "molen", "kerk",
      "giethoornse brug", "beweegbare brug", "dwarsgracht bruggen", "cultuurhistorie"
    ],
    explanation: "Behoud en herstel van beeldbepalend lokaal erfgoed, zoals historische vaarwegen en karakteristieke bruggen in Dwarsgracht en Giethoorn.",
    weight: 9,
  },
  {
    id: "h4_openbare_kunst",
    hoofdstukNr: 4,
    standpuntNr: 15,
    stance: "negatief",
    keywords: ["commissie beeldende kunst", "beeldende kunst", "kunstcommissie", "openbare kunst"],
    explanation: "Kritisch op elitaire kunstcommissies en subsidies; openbare kunst moet geworteld zijn in de lokale geschiedenis van Steenwijkerland.",
    weight: 9,
  },
  {
    id: "h4_subsidies_waarde",
    hoofdstukNr: 4,
    standpuntNr: 19,
    stance: "genuanceerd",
    keywords: ["subsidieverordening", "subsidiebeleid", "subsidieaanvraag"],
    explanation: "Elke gemeentelijke subsidie moet een aantoonbare en directe meerwaarde hebben voor onze eigen inwoners en dorpen.",
    weight: 7,
  },

  // HOOFDSTUK 5: Wonen, Bouwen & Ruimtelijke Ontwikkeling
  {
    id: "h5_voorrang_inwoners",
    hoofdstukNr: 5,
    standpuntNr: 1,
    stance: "positief",
    keywords: [
      "volkshuisvesting", "volkshuisvestingprogramma", "toewijzing", "sociale huur", "lokale binding",
      "woningtoewijzing", "urgentie", "woonvisie", "woondeal"
    ],
    explanation: "Inwoners met binding aan Steenwijkerland moeten voorrang krijgen bij toewijzing van woningen. Onze eigen jeugd eerst.",
    weight: 10,
  },
  {
    id: "h5_geen_voorrang_statushouders",
    hoofdstukNr: 5,
    standpuntNr: 2,
    stance: "negatief",
    keywords: ["urgentie statushouders", "statushouders huisvesting", "voorrangspositie statushouders"],
    explanation: "Lijst van Andel verwerpt automatische voorrang voor statushouders zolang eigen inwoners jarenlang op een wachtlijst staan.",
    weight: 10,
  },
  {
    id: "h5_betaalbare_koopwoningen",
    hoofdstukNr: 5,
    standpuntNr: 3,
    stance: "positief",
    keywords: [
      "starterswoningen", "betaalbare koopwoningen", "starters", "jongerenhuisvesting", "seniorenwoningen",
      "bouwen voor starters", "koopwoningen", "woningbouwproject", "omgevingsplan kindcentrum"
    ],
    explanation: "Lijst van Andel stimuleert actieve bouw van betaalbare koopwoningen voor starters en gezinnen in Steenwijkerland.",
    weight: 9,
  },
  {
    id: "h5_bouwen_in_dorpen",
    hoofdstukNr: 5,
    standpuntNr: 15,
    stance: "positief",
    keywords: [
      "tam-omgevingsplan", "omgevingsplan", "bestemmingsplan", "woonschepen", "cornelisgracht", "bouwverordening",
      "sint jansklooster", "blokzijl", "vollenhove", "wanneperveen", "paasloo", "zuidveen", "giethoorn", "ossenzijl"
    ],
    docKeywords: ["omgevingsplan", "ontwerpbesluit", "toelichting bestemmingsplan", "regels", "verbeelding"],
    explanation: "Bouwen en ontwikkelen naar behoefte in álle kernen en dorpen met soepele ruimtelijke procedures en deregulering.",
    weight: 7,
  },
  {
    id: "h5_lokale_zeggenschap_ruimtelijk",
    hoofdstukNr: 5,
    standpuntNr: 17,
    stance: "genuanceerd",
    keywords: ["omgevingsvisie", "actualisatie omgevingsvisie", "ruimtelijke visie"],
    explanation: "Omgevingsvisie moet dorpskarakter beschermen en woningbouw mogelijk maken, maar stikstof- en klimaatdwang mag bouwplannen niet verstikken.",
    weight: 8,
  },

  // HOOFDSTUK 6: Infrastructuur & Mobiliteit
  {
    id: "h6_bereikbaarheid_randweg",
    hoofdstukNr: 6,
    standpuntNr: 1,
    stance: "positief",
    keywords: ["randweg", "randweg blokzijl", "tracekeuze", "ontlastingsweg", "doorstroming", "verkeersveiligheid"],
    explanation: "Lijst van Andel steunt een randweg bij Blokzijl om het historische stadje te ontlasten van zwaar doorgaand verkeer.",
    weight: 10,
  },
  {
    id: "h6_behoud_openbare_wegen",
    hoofdstukNr: 6,
    standpuntNr: 10,
    stance: "negatief",
    keywords: [
      "onttrekken aan het openbaar verkeer", "onttrekken aan openbaar verkeer",
      "onttrekken openbaar verkeer", "tussenbroekweg", "steenwijkerdiep", "afsluiten weg", "wegonttrekking"
    ],
    explanation: "Lijst van Andel is kritisch op het zomaar onttrekken of afsluiten van openbare wegen of vaarwegen ten nadele van bereikbaarheid van aanwonenden.",
    weight: 9,
  },
  {
    id: "h6_parkeerbeleid",
    hoofdstukNr: 6,
    standpuntNr: 3,
    stance: "negatief",
    keywords: ["parkeerregulering", "parkeertarieven", "betaald parkeren", "parkeerheffing", "verordening parkeerregulering"],
    explanation: "Lijst van Andel verzet zich tegen het uitbreiden van betaald parkeren en tariefsverhogingen; parkeren moet toegankelijk en betaalbaar blijven.",
    weight: 9,
  },
  {
    id: "h6_fietspaden_en_stations",
    hoofdstukNr: 6,
    standpuntNr: 1,
    stance: "positief",
    keywords: ["fietsenstalling", "station steenwijk", "fietspad", "fietspaden", "snelfietsroute"],
    explanation: "Verbetering van veilige fietsverbindingen en moderne voorzieningen bij stations zonder bureaucratische ballast.",
    weight: 8,
  },
  {
    id: "h6_autoluw_giethoorn",
    hoofdstukNr: 6,
    standpuntNr: 12,
    stance: "genuanceerd",
    keywords: ["autoluw", "binnenpad", "kerkweg", "giethoorn autoluw"],
    explanation: "Genuanceerd standpunt: bescherming van de leefbaarheid in Giethoorn is nodig, mits bewoners, ondernemers en leveranciers ongehinderd toegang houden.",
    weight: 8,
  },

  // HOOFDSTUK 7: Economie, Ondernemerschap & Bedrijvigheid
  {
    id: "h7_lagere_lasten",
    hoofdstukNr: 7,
    standpuntNr: 1,
    stance: "positief",
    keywords: ["ozb", "onroerendezaakbelasting", "lastenverlichting", "belastingverlaging", "geen nieuwe lasten"],
    explanation: "Lijst van Andel pleit voor lagere gemeentelijke belastingen (OZB) en blokkeert lastenverzwaringen voor inwoners en MKB.",
    weight: 9,
  },
  {
    id: "h7_geen_lastenverhoging",
    hoofdstukNr: 7,
    standpuntNr: 2,
    stance: "negatief",
    keywords: ["heffingen", "tariefsverhoging", "milieutoeslag", "legesverhoging", "bouwleges"],
    explanation: "Lijst van Andel stemt tegen nieuwe heffingen en tegen verhoging van gemeentelijke leges en lasten.",
    weight: 8,
  },
  {
    id: "h7_winkels_en_ondernemers",
    hoofdstukNr: 7,
    standpuntNr: 3,
    stance: "positief",
    keywords: ["ondernemers", "bedrijvigheid", "minder regeldruk", "deregulering", "vergunningverlening versnellen"],
    explanation: "Schrappen van overbodige regels en kortere vergunningstrajecten voor lokale Steenwijkerlandse ondernemers.",
    weight: 8,
  },

  // HOOFDSTUK 8: Onderwijs, Zorg, Welzijn & Sport
  {
    id: "h8_zorg_zonder_bureaucratie",
    hoofdstukNr: 8,
    standpuntNr: 1,
    stance: "positief",
    keywords: [
      "wmo", "maatschappelijke ondersteuning", "verordening maatschappelijke ondersteuning",
      "zorg", "schuldhulpverlening", "mantelzorg", "gecertificeerde instellingen", "sociaal domein"
    ],
    explanation: "Zorggeld moet direct naar de inwoner en hulpbehoevende gaan. Eenvoudige regels en geen ambtelijke drempels in de WMO.",
    weight: 8,
  },
  {
    id: "h8_jeugdzorg_regionaal",
    hoofdstukNr: 8,
    standpuntNr: 5,
    stance: "genuanceerd",
    keywords: ["jeugdhulp", "jeugdzorg", "huiselijk geweld", "regiovisie jeugdhulp", "unilocatie"],
    explanation: "Jeugdzorg moet kleinschalig en dicht bij het gezin blijven; kritisch op logge regionale structuren waarin Steenwijkerland te weinig te zeggen heeft.",
    weight: 8,
  },
  {
    id: "h8_jongeren_voorzieningen",
    hoofdstukNr: 8,
    standpuntNr: 4,
    stance: "positief",
    keywords: ["rekenkamerrapport leefbaarheid", "voorzieningenniveau onder jongeren", "jongeren", "jeugdvoorzieningen"],
    explanation: "Behoud en verbetering van voorzieningen, ontmoetingsplekken en toekomstperspectief voor onze eigen jongeren in alle dorpen.",
    weight: 9,
  },
  {
    id: "h8_dorpssportverenigingen",
    hoofdstukNr: 8,
    standpuntNr: 11,
    stance: "positief",
    keywords: ["fc oldemarkt", "veldverlichting", "sport", "sportvereniging", "subsidie veldverlichting", "kindcentrum"],
    explanation: "Lijst van Andel steunt investeringen in dorpssportverenigingen en voorzieningen zoals veldverlichting voor FC Oldemarkt.",
    weight: 10,
  },

  // HOOFDSTUK 9: Milieu & Energie
  {
    id: "h9_geen_windmolens",
    hoofdstukNr: 9,
    standpuntNr: 2,
    stance: "negatief",
    keywords: [
      "windenergie", "windmolen", "windmolens", "windturbines", "windpark", "locaties voor windenergie",
      "megawindturbines", "zoekgebied wind", "res zoekgebied"
    ],
    explanation: "Lijst van Andel is faliekant TEGEN megawindturbines in Steenwijkerland. Geen horizonvervuiling, slagschaduw of aantasting van onze leefomgeving.",
    weight: 15,
  },
  {
    id: "h9_geen_zonnevelden_landbouw",
    hoofdstukNr: 9,
    standpuntNr: 2,
    stance: "negatief",
    keywords: ["zonnepark op landbouwgrond", "zonneweide weiland", "zonneveld agrarisch", "grootschalig zonnepark"],
    explanation: "Geen vruchtbare landbouwgrond of natuur opofferen voor zonneparken.",
    weight: 12,
  },
  {
    id: "h9_zon_op_dak_carport",
    hoofdstukNr: 9,
    standpuntNr: 4,
    stance: "positief",
    keywords: ["zonnecarport", "zonnecarport vendelweg", "zon op dak", "zonnepanelen op dak", "industrieterrein zon"],
    explanation: "Lijst van Andel steunt zonne-energie op carports, daken en industrieterreinen; zo blijft ons landschap en agrarische grond beschermd!",
    weight: 12,
  },
  {
    id: "h9_natuur_en_landschap",
    hoofdstukNr: 9,
    standpuntNr: 7,
    stance: "positief",
    keywords: ["natuurverbinding", "natuurverbinding ossenzijl", "weerribben", "wieden", "natuurbeheer"],
    explanation: "Bescherming van de unieke natuur in Weerribben-Wieden, in harmonie met omwonenden, agrariërs en lokale gebruikers.",
    weight: 8,
  },

  // HOOFDSTUK 10: Nieuwe Technologie, Privacy & Vrijheid
  {
    id: "h10_keuzevrijheid_dienstverlening",
    hoofdstukNr: 10,
    standpuntNr: 1,
    stance: "positief",
    keywords: ["digitaal loket", "dienstverlening", "fysiek loket", "contant betalen", "toegankelijkheid"],
    explanation: "Moderne digitale dienstverlening is prima, maar het fysieke gemeenteloket en contant betalen moeten te allen tijde gegarandeerd blijven.",
    weight: 8,
  },
  {
    id: "h10_privacy_informatiebeveiliging",
    hoofdstukNr: 10,
    standpuntNr: 8,
    stance: "positief",
    keywords: ["informatiebeveiliging", "rekenkameronderzoek informatiebeveiliging", "privacy", "cybersecurity", "datalek", "persoonsgegevens"],
    explanation: "Lijst van Andel eist strikte bescherming van burgerdata, privacy by design en scherpe informatiebeveiliging door de gemeente.",
    weight: 10,
  },
];

/**
 * Match standpoints for a given topic based on its title, description, category, and document titles.
 */
export function matchStandpuntenForTopic(topic: CouncilAgendaTopic): {
  matched: MatchedStandpunt[];
  summary: TopicStandpuntSummary;
} {
  const titleText = (topic.title || "").toLowerCase();
  const descText = (topic.description || "").toLowerCase();
  const catText = (topic.category || "").toLowerCase();
  const docTitles = (topic.documents || []).map((d) => d.title.toLowerCase());
  const combinedText = `${titleText} ${descText} ${catText} ${docTitles.join(" ")}`;

  const scoredMatches: {
    rule: PolicyRule;
    score: number;
    matchedKeywords: string[];
    sourceDocs: string[];
  }[] = [];

  for (const rule of POLICY_RULES) {
    let score = 0;
    const matchedKeywords: string[] = [];
    const sourceDocs: string[] = [];

    // Check primary keywords in title (highest weight)
    for (const kw of rule.keywords) {
      const kwLower = kw.toLowerCase();
      if (titleText.includes(kwLower)) {
        score += (rule.weight || 10) * 3;
        matchedKeywords.push(kw);
      } else if (descText.includes(kwLower)) {
        score += (rule.weight || 10) * 1.5;
        matchedKeywords.push(kw);
      }
    }

    // Check document titles
    for (const doc of topic.documents || []) {
      const dTitle = doc.title.toLowerCase();
      let docMatched = false;

      for (const kw of rule.keywords) {
        const kwLower = kw.toLowerCase();
        if (dTitle.includes(kwLower)) {
          score += 6;
          docMatched = true;
          if (!matchedKeywords.includes(kw)) matchedKeywords.push(kw);
        }
      }

      if (rule.docKeywords) {
        for (const dkw of rule.docKeywords) {
          if (dTitle.includes(dkw.toLowerCase())) {
            score += 8;
            docMatched = true;
            if (!matchedKeywords.includes(dkw)) matchedKeywords.push(dkw);
          }
        }
      }

      if (docMatched) {
        sourceDocs.push(doc.title);
      }
    }

    if (score >= 12 && matchedKeywords.length > 0) {
      scoredMatches.push({
        rule,
        score: Math.min(100, Math.round(score)),
        matchedKeywords: Array.from(new Set(matchedKeywords)),
        sourceDocs: Array.from(new Set(sourceDocs)),
      });
    }
  }

  // Deduplicate by chapter & standpoint nr, keeping highest score
  const uniqueMatchesMap = new Map<string, typeof scoredMatches[0]>();
  for (const m of scoredMatches) {
    const key = `${m.rule.hoofdstukNr}-${m.rule.standpuntNr}`;
    const existing = uniqueMatchesMap.get(key);
    if (!existing || m.score > existing.score) {
      uniqueMatchesMap.set(key, m);
    }
  }

  // Sort descending by score
  const sorted = Array.from(uniqueMatchesMap.values()).sort((a, b) => b.score - a.score);

  // Map to MatchedStandpunt
  const matched: MatchedStandpunt[] = sorted.map((item) => {
    const chapter = hoofdstukken.find((h: Hoofdstuk) => h.nr === item.rule.hoofdstukNr);
    const standpoint = chapter?.standpunten.find((s: Standpunt) => s.nr === item.rule.standpuntNr);

    return {
      id: `${topic.id}_h${item.rule.hoofdstukNr}_s${item.rule.standpuntNr}`,
      hoofdstukNr: item.rule.hoofdstukNr,
      hoofdstukTitel: chapter ? chapter.titel : `Hoofdstuk ${item.rule.hoofdstukNr}`,
      standpuntNr: item.rule.standpuntNr,
      standpuntTitel: standpoint ? standpoint.titel : `Standpunt ${item.rule.standpuntNr}`,
      standpuntText: standpoint ? standpoint.standpunt : "",
      stance: item.rule.stance,
      explanation: item.rule.explanation,
      relevanceScore: item.score,
      matchedKeywords: item.matchedKeywords,
      sourceDocumentTitles: item.sourceDocs.length > 0 ? item.sourceDocs : undefined,
    };
  });

  // Calculate summary counts
  const positiefCount = matched.filter((m) => m.stance === "positief").length;
  const negatiefCount = matched.filter((m) => m.stance === "negatief").length;
  const genuanceerdCount = matched.filter((m) => m.stance === "genuanceerd").length;
  const total = matched.length;

  let primaryStance: "positief" | "negatief" | "gemengd" | "neutraal" = "neutraal";
  let summaryText = "Geen direct partijstandpunt gekoppeld aan dit agendapunt.";

  if (total > 0) {
    if (negatiefCount > 0 && positiefCount === 0) {
      primaryStance = "negatief";
      summaryText = `Lijst van Andel staat KRITISCH / NEGATIEF t.a.v. dit onderwerp (${negatiefCount} ${negatiefCount === 1 ? "standpunt" : "standpunten"}).`;
    } else if (positiefCount > 0 && negatiefCount === 0) {
      primaryStance = "positief";
      summaryText = `Lijst van Andel staat POSITIEF / VOOR t.a.v. dit onderwerp (${positiefCount} ${positiefCount === 1 ? "standpunt" : "standpunten"}).`;
    } else if (positiefCount > 0 && negatiefCount > 0) {
      primaryStance = "gemengd";
      summaryText = `Gemengde stellingname: ${positiefCount} positief, ${negatiefCount} kritisch/negatief.`;
    } else {
      primaryStance = "positief"; // fallback if only nuanced
      summaryText = `Genuanceerd fractiestandpunt met specifieke lokale randvoorwaarden.`;
    }
  }

  const summary: TopicStandpuntSummary = {
    total,
    positiefCount,
    negatiefCount,
    genuanceerdCount,
    primaryStance,
    summaryText,
    keyArguments: matched.map((m) => m.explanation),
  };

  return { matched, summary };
}

/**
 * Match standpoints specifically relevant for a single document within a topic.
 */
export function matchStandpuntenForDocument(
  doc: CouncilDocument,
  topicMatchedStandpunten: MatchedStandpunt[] = []
): DocumentMatchedStandpunt[] {
  const dTitle = (doc.title || "").toLowerCase();
  const results: DocumentMatchedStandpunt[] = [];

  for (const ms of topicMatchedStandpunten) {
    // If this document is listed as a source doc, or its keywords appear in the document title
    const isDocSource = ms.sourceDocumentTitles && ms.sourceDocumentTitles.includes(doc.title);
    const hasKeyword = ms.matchedKeywords.some((kw) => dTitle.includes(kw.toLowerCase()));

    if (isDocSource || hasKeyword) {
      results.push({
        hoofdstukNr: ms.hoofdstukNr,
        standpuntNr: ms.standpuntNr,
        standpuntTitel: ms.standpuntTitel,
        stance: ms.stance,
        matchedReason: ms.explanation,
      });
    }
  }

  return results;
}

/**
 * Enrich a list of topics with standpoints matching on both topic and document level.
 */
export function enrichTopicWithStandpunten(topic: CouncilAgendaTopic): CouncilAgendaTopic {
  // If user already manually adjusted or set standpoints and we want to preserve manual edits:
  const manualEdits = (topic.matchedStandpunten || []).filter((m) => m.manuallyAdjusted);
  
  const { matched: autoMatched, summary } = matchStandpuntenForTopic(topic);

  // Combine auto-matched with manual adjustments
  const combinedMatched: MatchedStandpunt[] = [...manualEdits];
  for (const am of autoMatched) {
    if (!combinedMatched.some((m) => m.hoofdstukNr === am.hoofdstukNr && m.standpuntNr === am.standpuntNr)) {
      combinedMatched.push(am);
    }
  }

  // Recalculate summary if manual items exist
  const positiefCount = combinedMatched.filter((m) => m.stance === "positief").length;
  const negatiefCount = combinedMatched.filter((m) => m.stance === "negatief").length;
  const genuanceerdCount = combinedMatched.filter((m) => m.stance === "genuanceerd").length;

  let primaryStance: "positief" | "negatief" | "gemengd" | "neutraal" = summary.primaryStance;
  let summaryText = summary.summaryText;

  if (combinedMatched.length > 0) {
    if (negatiefCount > 0 && positiefCount === 0) {
      primaryStance = "negatief";
      summaryText = `Lijst van Andel staat KRITISCH / NEGATIEF t.a.v. dit onderwerp (${negatiefCount} ${negatiefCount === 1 ? "standpunt" : "standpunten"}).`;
    } else if (positiefCount > 0 && negatiefCount === 0) {
      primaryStance = "positief";
      summaryText = `Lijst van Andel staat POSITIEF / VOOR t.a.v. dit onderwerp (${positiefCount} ${positiefCount === 1 ? "standpunt" : "standpunten"}).`;
    } else if (positiefCount > 0 && negatiefCount > 0) {
      primaryStance = "gemengd";
      summaryText = `Gemengde stellingname: ${positiefCount} positief, ${negatiefCount} kritisch/negatief.`;
    }
  }

  // Enrich documents
  const enrichedDocs = (topic.documents || []).map((doc) => {
    const docStandpunten = matchStandpuntenForDocument(doc, combinedMatched);
    return {
      ...doc,
      matchedStandpunten: docStandpunten.length > 0 ? docStandpunten : undefined,
    };
  });

  return {
    ...topic,
    matchedStandpunten: combinedMatched,
    standpuntSummary: {
      total: combinedMatched.length,
      positiefCount,
      negatiefCount,
      genuanceerdCount,
      primaryStance,
      summaryText,
      keyArguments: combinedMatched.map((m) => m.explanation),
    },
    documents: enrichedDocs,
  };
}
