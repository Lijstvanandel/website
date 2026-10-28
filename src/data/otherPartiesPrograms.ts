import type { OtherPartyId, OtherPartyStanceType } from "../types/council.js";

export interface PartyManifestoPassage {
  id: string;
  domain: string;
  chapterOrSection: string;
  keywords: string[];
  defaultStance: Exclude<OtherPartyStanceType, "geen_standpunt">;
  stanceSummary: string;
  verbatimQuote: string;
  controlQuestionTemplate?: string;
}

export interface OtherPartyManifesto {
  partyId: OtherPartyId;
  partyName: string; // Display name in UI (e.g., "PRO (GroenLinks-PvdA)")
  partyFullName: string;
  programTitle: string;
  programPdfUrl: string;
  generalProfile: string;
  passages: PartyManifestoPassage[];
}

export const OTHER_PARTIES_MANIFESTOS: OtherPartyManifesto[] = [
  {
    partyId: "BGL",
    partyName: "BGL",
    partyFullName: "BuitenGewoon Leefbaar (BGL)",
    programTitle: "Verkiezingsprogramma 2026–2030: Het draait om de kern",
    programPdfUrl: "/assets/aistudio/BGL_Verkiezingsprogramma2026_digitaal__1__453c1ac1.pdf",
    generalProfile: "Grootste lokale partij, coalitiepartij; nadruk op kernenbeleid, bouwen naar behoefte in elke kern, MKB-samenwerking en leefbaarheid.",
    passages: [
      {
        id: "bgl_wonen",
        domain: "wonen",
        chapterOrSection: "Hoofdstuk Wonen & Leefbaarheid (p. 6–11)",
        keywords: [
          "wonen", "woningbouw", "volkshuisvesting", "woonvisie", "woondeal", "starters", "senioren",
          "splitsen", "woningsplitsing", "inbreiding", "cpo", "huurwoningen", "koopwoningen", "omgevingsplan", "bestemmingsplan", "vab"
        ],
        defaultStance: "positief",
        stanceSummary: "BGL wil bouwen in álle kernen (groot en klein), soepeler omgaan met woningsplitsing en VAB-locaties, en ruimte voor starters en senioren met lokale binding.",
        verbatimQuote: "BGL vindt dat er in elke kern gebouwd moet kunnen worden naar behoefte. We stimuleren bouwen voor starters en ouderen zodat de doorstroming op gang komt, en maken woningsplitsing en herbestemming van vrijkomende agrarische bebouwing eenvoudiger.",
        controlQuestionTemplate: "BGL stelt in haar verkiezingsprogramma ('Het draait om de kern') dat in élke kern naar behoefte gebouwd moet kunnen worden met minder regeldruk: hoe beoordeelt BGL in dit voorstel de concrete ruimte voor kleine kernen en lokale starters?"
      },
      {
        id: "bgl_economie_biz",
        domain: "economie",
        chapterOrSection: "Hoofdstuk Economie, Toerisme & Ondernemen (p. 18–23)",
        keywords: [
          "biz", "bedrijveninvesteringszone", "binnenstad", "centrum", "ondernemers", "detailhandel",
          "winkeliers", "steenwijk vestingstad", "horeca", "bedrijventerrein", "mkb", "toerisme", "recreatie", "economie"
        ],
        defaultStance: "positief",
        stanceSummary: "BGL steunt samenwerking tussen gemeente en ondernemers in de binnenstad en kernen (zoals via een BIZ en Stichting Steenwijk Vestingstad) voor een vitaal centrum.",
        verbatimQuote: "Ondernemers zijn de motor van onze lokale economie. We ondersteunen een bruisende binnenstad van Steenwijk en vitale dorpscentra door nauwe samenwerking met ondernemersverenigingen en het verlagen van onnodige regeldruk.",
        controlQuestionTemplate: "BGL benadrukt in haar verkiezingsprogramma dat onnodige regeldruk voor lokale ondernemers omlaag moet: welke harde garanties vraagt BGL bij dit voorstel dat de lasten en verantwoording voor kleinere ondernemers behapbaar blijven?"
      },
      {
        id: "bgl_mobiliteit_randweg",
        domain: "mobiliteit",
        chapterOrSection: "Hoofdstuk Verkeer, Vervoer & Openbare Ruimte (p. 24–28)",
        keywords: [
          "verkeer", "mobiliteit", "randweg", "blokzijl", "parkeren", "parkeerregulering", "parkeertarieven",
          "fietspad", "fietsenstalling", "station", "n333", "n334", "openbaar verkeer", "verkeersveiligheid", "bruggen", "giethoorn"
        ],
        defaultStance: "positief",
        stanceSummary: "BGL zet in op verkeersveiligheid in de kernen, verbetering van knelpunten zoals rond Blokzijl en Giethoorn, en toegankelijk parkeren.",
        verbatimQuote: "Goede bereikbaarheid en verkeersveiligheid in onze steden en dorpen staan voorop. We pakken verkeersknelpunten in de kernen aan en zorgen voor voldoende en goed bereikbare parkeervoorzieningen.",
        controlQuestionTemplate: "BGL belooft in haar programma goede bereikbaarheid en voldoende parkeervoorzieningen voor inwoners en bezoekers: hoe weegt BGL de gevolgen van dit besluit voor de directe bereikbaarheid van aanwonenden en ondernemers?"
      },
      {
        id: "bgl_energie_duurzaamheid",
        domain: "energie",
        chapterOrSection: "Hoofdstuk Duurzaamheid, Energie & Landschap (p. 29–33)",
        keywords: [
          "energie", "duurzaamheid", "zonnecarport", "zonnepanelen", "zonnepark", "windmolens", "windenergie",
          "windturbines", "warmtetransitie", "res", "natuur", "landschap", "weerribben", "wieden"
        ],
        defaultStance: "genuanceerd",
        stanceSummary: "BGL steunt pragmatische verduurzaming (zoals zon op daken en parkeerterreinen), maar stelt draagvlak van omwonenden en behoud van het landschap als harde voorwaarde.",
        verbatimQuote: "Verduurzaming doen we realistisch en samen met inwoners. Zonnepanelen horen primair op daken, carports en restgronden, met behoud van ons waardevolle landschap en draagvlak in de omgeving.",
        controlQuestionTemplate: "BGL stelt in haar programma dat bij energieprojecten lokaal draagvlak en landschapsbehoud voorop staan: vindt BGL dat in dit voorstel aantoonbaar aan die draagvlakvoorwaarde bij omwonenden is voldaan?"
      },
      {
        id: "bgl_zorg_sociaal",
        domain: "sociaal",
        chapterOrSection: "Hoofdstuk Zorg, Welzijn, Jeugd & Sport (p. 12–17)",
        keywords: [
          "zorg", "wmo", "jeugdzorg", "jeugdhulp", "sociaal domein", "participatiewet", "armoede",
          "mantelzorg", "ouderen", "sport", "sportvereniging", "veldverlichting", "dorpshuis", "leefbaarheid", "jongeren"
        ],
        defaultStance: "positief",
        stanceSummary: "BGL wil toegankelijke zorg dichtbij, sterke dorpshuizen en sportverenigingen als sociaal hart van de kernen, en grip op de kosten van de jeugdzorg.",
        verbatimQuote: "Verenigingen, sportclubs en dorpshuizen vormen het cement van onze samenleving. Zorg en ondersteuning via de Wmo en jeugdhulp moeten dichtbij, mensgericht en financieel beheersbaar worden georganiseerd.",
        controlQuestionTemplate: "BGL noemt in haar programma dat zorg zowel mensgericht als financieel beheersbaar moet zijn: hoe beoordeelt BGL de grip van onze eigen gemeenteraad op de kosten en uitvoering in dit voorstel?"
      },
      {
        id: "bgl_bestuur_financien",
        domain: "bestuur_financien",
        chapterOrSection: "Hoofdstuk Bestuur, Participatie & Financiën (p. 34–42)",
        keywords: [
          "begroting", "voorjaarsnota", "kadernota", "jaarverslag", "ozb", "belasting", "heffing", "leges",
          "gemeenschappelijke regeling", "rekenkamer", "participatie", "dorpsbelang", "handhaving", "veiligheid", "boa", "informatiebeveiliging", "subsidie"
        ],
        defaultStance: "genuanceerd",
        stanceSummary: "BGL staat voor een financieel gezonde gemeente met gematigde woonlasten, vroegtijdige participatie met Plaatselijke Belangen en kritische sturing op gemeenschappelijke regelingen.",
        verbatimQuote: "We koesteren de samenwerking met Plaatselijke Belangen, wijk- en dorpsraden. Onze gemeentefinanciën houden we op orde met verantwoorde woonlasten en scherpe controle op gemeenschappelijke regelingen.",
        controlQuestionTemplate: "BGL belooft in haar programma scherpe controle op gemeenschappelijke regelingen en verantwoorde woonlasten: welke concrete bijsturingsmogelijkheden eist BGL bij dit agendapunt?"
      },
      {
        id: "bgl_cultuur_erfgoed",
        domain: "cultuur",
        chapterOrSection: "Hoofdstuk Cultuur, Erfgoed & Evenementen (p. 20–23)",
        keywords: [
          "cultuur", "erfgoed", "monument", "monumenten", "evenement", "evenementen", "corso",
          "lokale omroep", "publieke omroep", "rtv", "media", "kunst", "historie"
        ],
        defaultStance: "positief",
        stanceSummary: "BGL hecht grote waarde aan lokale tradities, corso's, dorpsfeesten, cultureel erfgoed en een sterke lokale omroep.",
        verbatimQuote: "Onze monumenten, tradities, bloemencorso's en dorpsfeesten maken Steenwijkerland uniek. We faciliteren vrijwilligers en zorgen voor toegankelijke vergunningverlening.",
        controlQuestionTemplate: "BGL spreekt zich in haar programma uit voor het ontzorgen van lokale cultuur- en evenementeninitiatieven: draagt dit voorstel volgens BGL daadwerkelijk bij aan minder bureaucratie voor lokale organisaties?"
      }
    ]
  },
  {
    partyId: "CDA",
    partyName: "CDA",
    partyFullName: "CDA Steenwijkerland",
    programTitle: "Verkiezingsprogramma 2026–2030: Voor een fatsoenlijk Steenwijkerland",
    programPdfUrl: "/assets/aistudio/20251210-Verkiezingsprogramma-2026-DEF-gecorrigeerd_cd83762d.pdf",
    generalProfile: "Christendemocratische partij met focus op gemeenschapszin (omzien naar elkaar), familiebedrijven & landbouw, bouwen in alle kernen en solide financiën.",
    passages: [
      {
        id: "cda_wonen",
        domain: "wonen",
        chapterOrSection: "Prioriteit 1 & Hoofdstuk Wonen (p. 3–5)",
        keywords: [
          "wonen", "woningbouw", "volkshuisvesting", "woonvisie", "woondeal", "starters", "senioren",
          "inbreiding", "cpo", "huurwoningen", "koopwoningen", "omgevingsplan", "bestemmingsplan", "vab", "splitsen", "mantelzorgwoning"
        ],
        defaultStance: "positief",
        stanceSummary: "Het CDA wil bouwen in álle kernen voor jong en oud, ruimte voor erfdelen, generatiewonen en mantelzorgwoningen, en snellere vergunningprocedures.",
        verbatimQuote: "Voor een vitaal Steenwijkerland moet in elke kern gebouwd kunnen worden. Het CDA zet in op betaalbare woningen voor starters, levensloopbestendige woningen voor senioren en meer ruimte voor woningsplitsing, erfdelen en mantelzorgwoningen.",
        controlQuestionTemplate: "Het CDA pleit in 'Voor een fatsoenlijk Steenwijkerland' voor bouwen in alle kernen en ruimte voor generatie- en mantelzorgwonen: vindt het CDA dat dit voorstel voldoende ruimte biedt voor lokaal maatwerk per dorp?"
      },
      {
        id: "cda_economie_landbouw",
        domain: "economie",
        chapterOrSection: "Economie, Landbouw & Toerisme (p. 6–8)",
        keywords: [
          "biz", "bedrijveninvesteringszone", "binnenstad", "centrum", "ondernemers", "detailhandel",
          "winkeliers", "steenwijk vestingstad", "horeca", "bedrijventerrein", "mkb", "toerisme", "landbouw", "boeren", "agrarisch"
        ],
        defaultStance: "positief",
        stanceSummary: "Het CDA steunt het lokale MKB, familiebedrijven, vitale winkelcentra (waaronder BIZ-samenwerking) en toekomstperspectief voor agrarische ondernemers.",
        verbatimQuote: "Het CDA staat pal voor onze lokale ondernemers, winkeliers en agrarische familiebedrijven. Samenwerking in de binnenstad en op bedrijventerreinen stimuleren we actief met een betrouwbare overheid.",
        controlQuestionTemplate: "Het CDA noemt een betrouwbare overheid voor het lokale MKB en familiebedrijven als kernpunt: biedt dit voorstel volgens het CDA voldoende rechtszekerheid en investeringszekerheid voor onze ondernemers?"
      },
      {
        id: "cda_zorg_samenleving",
        domain: "sociaal",
        chapterOrSection: "Samenleving, Gezin, Zorg & Verenigingsleven (p. 8–10)",
        keywords: [
          "zorg", "wmo", "jeugdzorg", "jeugdhulp", "sociaal domein", "participatiewet", "armoede",
          "mantelzorg", "ouderen", "sport", "sportvereniging", "veldverlichting", "dorpshuis", "leefbaarheid", "vrijwilligers", "jongeren"
        ],
        defaultStance: "positief",
        stanceSummary: "Het CDA legt nadruk op 'noaberschap', ondersteuning van mantelzorgers en vrijwilligers, sterke sport- en dorpsverenigingen en preventie in de jeugdzorg.",
        verbatimQuote: "We versterken de kracht van gezinnen, mantelzorgers, kerken en verenigingen. Zorg voor kwetsbare inwoners en jeugd organiseren we dichtbij huis, met aandacht voor preventie en ondersteuning van vrijwilligers.",
        controlQuestionTemplate: "Het CDA stelt de kracht van mantelzorgers, gezinnen en lokale verenigingen centraal: worden vrijwilligers en mantelzorgers door dit raadsvoorstel daadwerkelijk ontlast of juist met extra regels geconfronteerd?"
      },
      {
        id: "cda_mobiliteit",
        domain: "mobiliteit",
        chapterOrSection: "Bereikbaarheid, Verkeer & Infrastructuur (p. 10–11)",
        keywords: [
          "verkeer", "mobiliteit", "randweg", "blokzijl", "parkeren", "parkeerregulering", "parkeertarieven",
          "fietspad", "fietsenstalling", "station", "n333", "n334", "openbaar verkeer", "verkeersveiligheid", "bruggen"
        ],
        defaultStance: "positief",
        stanceSummary: "Het CDA wil veilige school- en fietsroutes, goed onderhoud van wegen en bruggen in het buitengebied, en een structurele oplossing voor verkeersknelpunten zoals Blokzijl.",
        verbatimQuote: "Veilige wegen en fietspaden in zowel de kernen als het buitengebied zijn essentieel. Knelpunten voor landbouw- en doorgaand verkeer lossen we op en onze centra blijven goed bereikbaar.",
        controlQuestionTemplate: "Het CDA benadrukt in haar programma veilige wegen en goede bereikbaarheid van zowel de kernen als het buitengebied: hoe weegt het CDA de verkeers- en bereikbaarheidseffecten van dit voorstel?"
      },
      {
        id: "cda_energie_natuur",
        domain: "energie",
        chapterOrSection: "Duurzaamheid, Rentmeesterschap & Natuur (p. 11–12)",
        keywords: [
          "energie", "duurzaamheid", "zonnecarport", "zonnepanelen", "zonnepark", "windmolens", "windenergie",
          "windturbines", "warmtetransitie", "res", "natuur", "landschap", "weerribben", "wieden"
        ],
        defaultStance: "genuanceerd",
        stanceSummary: "Vanuit rentmeesterschap steunt het CDA zon op daken en reststroken, maar wil het zuinig omgaan met goede landbouwgrond en eist lokaal draagvlak bij energieprojecten.",
        verbatimQuote: "Rentmeesterschap betekent dat we de aarde goed doorgeven aan volgende generaties. We benutten eerst daken, bedrijventerreinen en parkeerplaatsen voor zonne-energie en gaan uiterst terughoudend om met vruchtbare landbouwgrond.",
        controlQuestionTemplate: "Vanuit het CDA-principe van rentmeesterschap en bescherming van landbouwgrond en landschap: hoe toetst het CDA dit voorstel aan het behoud van onze groene leefomgeving en draagvlak in de buurt?"
      },
      {
        id: "cda_bestuur_financien",
        domain: "bestuur_financien",
        chapterOrSection: "Betrouwbaar Bestuur, Veiligheid & Financiën (p. 12–14)",
        keywords: [
          "begroting", "voorjaarsnota", "kadernota", "jaarverslag", "ozb", "belasting", "heffing", "leges",
          "gemeenschappelijke regeling", "rekenkamer", "participatie", "dorpsbelang", "handhaving", "veiligheid", "boa", "informatiebeveiliging", "subsidie", "cultuur", "erfgoed", "lokale omroep", "evenementen"
        ],
        defaultStance: "genuanceerd",
        stanceSummary: "Het CDA staat voor een degelijk huishoudboekje zonder onnodige belastingverhogingen, zichtbare handhaving, en respect voor erfgoed en lokale tradities.",
        verbatimQuote: "Een fatsoenlijk bestuur geeft niet meer geld uit dan er binnenkomt, houdt de gemeentelijke lasten beheersbaar en zorgt voor een veilige leefomgeving in al onze dorpen en steden.",
        controlQuestionTemplate: "Het CDA pleit voor een solide huishoudboekje en beheersbare gemeentelijke lasten: hoe beoordeelt het CDA de structurele financiële dekking en doelmatigheid van dit voorstel?"
      }
    ]
  },
  {
    partyId: "D66",
    partyName: "D66",
    partyFullName: "D66 Steenwijkerland",
    programTitle: "Verkiezingsprogramma 2026–2030: Het kan wél",
    programPdfUrl: "/assets/aistudio/Steenwijkerland-VP2026-2030_546d23b1.pdf",
    generalProfile: "Sociaal-liberale partij met nadruk op versnelling woningbouw (ook binnenstedelijk/hoogbouw), ambitieuze klimaat- en energietransitie, onderwijs, cultuur en burgerparticipatie.",
    passages: [
      {
        id: "d66_wonen",
        domain: "wonen",
        chapterOrSection: "Speerpunt 1 & Hoofdstuk Wonen en Ruimte (p. 4–9)",
        keywords: [
          "wonen", "woningbouw", "volkshuisvesting", "woonvisie", "woondeal", "starters", "senioren",
          "inbreiding", "hoogbouw", "cpo", "huurwoningen", "koopwoningen", "omgevingsplan", "bestemmingsplan", "vab", "splitsen", "tiny houses"
        ],
        defaultStance: "positief",
        stanceSummary: "D66 wil fors versneld en betaalbaar bouwen (sociale huur, middenhuur en betaalbare koop), met nadruk op duurzaam bouwen, inbreiding, transformatie en nieuwe woonvormen.",
        verbatimQuote: "Het kan wél: we versnellen de bouw van betaalbare en duurzame woningen voor starters, gezinnen en ouderen. We benutten inbreidingslocaties, staan open voor vernieuwende woonvormen en bouwen natuurinclusief en klimaatadaptief.",
        controlQuestionTemplate: "D66 stelt in 'Het kan wél' dat woningbouw sneller, betaalbaarder en natuurinclusief moet: bevat dit voorstel volgens D66 voldoende harde garanties voor betaalbaarheid en duurzaamheid?"
      },
      {
        id: "d66_energie_klimaat",
        domain: "energie",
        chapterOrSection: "Hoofdstuk Klimaat, Energie en Natuur (p. 10–14)",
        keywords: [
          "energie", "duurzaamheid", "zonnecarport", "zonnepanelen", "zonnepark", "windmolens", "windenergie",
          "windturbines", "warmtetransitie", "res", "natuur", "landschap", "weerribben", "wieden", "biodiversiteit", "klimaat"
        ],
        defaultStance: "positief",
        stanceSummary: "D66 steunt een versnelde energietransitie (zowel grootschalige opwek met lokaal eigendom als zonnecarports en isolatie) en krachtig natuurherstel rond Weerribben-Wieden.",
        verbatimQuote: "D66 kiest voluit voor schone energie, energiebesparing en het versterken van de biodiversiteit en natuurverbindingen. We versnellen het opwekken van duurzame energie met minimaal 50% lokaal eigendom.",
        controlQuestionTemplate: "D66 pleit in haar verkiezingsprogramma voor versnelling van de energietransitie en natuurherstel met lokaal eigendom: gaat dit voorstel op het vlak van duurzaamheid en natuurwinst voor D66 ver genoeg?"
      },
      {
        id: "d66_mobiliteit",
        domain: "mobiliteit",
        chapterOrSection: "Hoofdstuk Duurzame Mobiliteit & Bereikbaarheid (p. 15–17)",
        keywords: [
          "verkeer", "mobiliteit", "randweg", "blokzijl", "parkeren", "parkeerregulering", "parkeertarieven",
          "fietspad", "fietsenstalling", "station", "n333", "n334", "openbaar verkeer", "verkeersveiligheid", "autoluw", "ov"
        ],
        defaultStance: "genuanceerd",
        stanceSummary: "D66 geeft prioriteit aan fietsers, voetgangers, goed OV (station Steenwijk als hub) en vergroening van centra, en is kritisch op nieuw asfalt ten koste van natuur.",
        verbatimQuote: "We zetten de fietser, voetganger en het openbaar vervoer op één. We investeren in veilige fietsroutes, goede stationsvoorzieningen en groene, autoluwe binnensteden en dorpskernen.",
        controlQuestionTemplate: "D66 zet in haar programma fietsers, voetgangers en vergroening op één boven extra autoverkeer: hoe beoordeelt D66 dit voorstel vanuit het STOMP-principe en duurzame mobiliteit?"
      },
      {
        id: "d66_economie_binnenstad",
        domain: "economie",
        chapterOrSection: "Hoofdstuk Duurzame Economie & Toerisme (p. 18–20)",
        keywords: [
          "biz", "bedrijveninvesteringszone", "binnenstad", "centrum", "ondernemers", "detailhandel",
          "winkeliers", "steenwijk vestingstad", "horeca", "bedrijventerrein", "mkb", "toerisme", "recreatie"
        ],
        defaultStance: "positief",
        stanceSummary: "D66 steunt een aantrekkelijke, groene en toekomstbestendige binnenstad, samenwerking met ondernemers (BIZ) en spreiding van duurzaam toerisme.",
        verbatimQuote: "Een vitale binnenstad en toekomstbestendige bedrijventerreinen vragen om samenwerking tussen ondernemers en gemeente, met oog voor vergroening, circulariteit en kwalitatief toerisme.",
        controlQuestionTemplate: "D66 koppelt economische vitaliteit in haar programma direct aan vergroening en verduurzaming: vindt D66 dat die duurzame kwaliteitsimpuls in dit voorstel voldoende is geborgd?"
      },
      {
        id: "d66_onderwijs_zorg_cultuur",
        domain: "sociaal",
        chapterOrSection: "Hoofdstukken Onderwijs, Zorg, Cultuur & Inclusie (p. 21–25)",
        keywords: [
          "zorg", "wmo", "jeugdzorg", "jeugdhulp", "sociaal domein", "participatiewet", "armoede",
          "onderwijs", "cultuur", "erfgoed", "monumenten", "lokale omroep", "publieke omroep", "rtv", "kunst", "sport", "jongeren", "asiel", "statushouders"
        ],
        defaultStance: "positief",
        stanceSummary: "D66 investeert in gelijke kansen in het onderwijs, preventieve jeugdhulp, kunst en cultuur, een onafhankelijke lokale omroep en humane opvang en integratie.",
        verbatimQuote: "Iedereen in Steenwijkerland verdient gelijke kansen om zich te ontwikkelen. We investeren in goede schoolgebouwen, preventie in de jeugdzorg, een bloeiend cultuur- en verenigingsleven en onafhankelijke lokale journalistiek.",
        controlQuestionTemplate: "D66 hecht in haar programma sterk aan gelijke kansen, preventie en professionele kwaliteit: hoe borgt dit voorstel volgens D66 de kwaliteit en toegankelijkheid voor alle inwoners?"
      },
      {
        id: "d66_bestuur_participatie",
        domain: "bestuur_financien",
        chapterOrSection: "Hoofdstuk Democratie, Bestuur & Financiën (p. 26–29)",
        keywords: [
          "begroting", "voorjaarsnota", "kadernota", "jaarverslag", "ozb", "belasting", "heffing", "leges",
          "gemeenschappelijke regeling", "rekenkamer", "participatie", "burgerberaad", "referendum", "informatiebeveiliging", "privacy", "handhaving", "veiligheid"
        ],
        defaultStance: "positief",
        stanceSummary: "D66 pleit voor vernieuwende burgerparticipatie (zoals burgerberaden en uitdaagrecht), transparant bestuur, digitale veiligheid & privacy en doelmatige financiën.",
        verbatimQuote: "We vernieuwen de lokale democratie door inwoners vanaf de voorkant échte invloed te geven via participatie en burgerberaden, met een open, transparant en digitaal veilig gemeentebestuur.",
        controlQuestionTemplate: "D66 pleit in haar verkiezingsprogramma voor transparantie en echte participatie aan de voorkant: vindt D66 het doorlopen participatie- en verantwoordingsproces bij dit stuk toereikend?"
      }
    ]
  },
  {
    partyId: "CPB",
    partyName: "CPB",
    partyFullName: "Christelijke Partij Burgerbelangen (CPB)",
    programTitle: "Verkiezingsprogramma 2026–2030: Steenwijkerland, een toekomst om naar uit te zien!",
    programPdfUrl: "/assets/aistudio/5f79e9_e12e5a3487744469972e8c339bbe9497_eafee751.pdf",
    generalProfile: "Lokale en onafhankelijke christelijk-sociale partij; focus op betaalbaar wonen voor starters en ouderen, omzien naar kwetsbaren, leefbare kernen en nuchter bestuur.",
    passages: [
      {
        id: "cpb_wonen",
        domain: "wonen",
        chapterOrSection: "Speerpunt Wonen & Leefbaarheid in de Kernen (p. 5–9)",
        keywords: [
          "wonen", "woningbouw", "volkshuisvesting", "woonvisie", "woondeal", "starters", "senioren",
          "inbreiding", "cpo", "huurwoningen", "koopwoningen", "omgevingsplan", "bestemmingsplan", "vab", "splitsen", "knarrenhof"
        ],
        defaultStance: "positief",
        stanceSummary: "CPB zet vol in op betaalbare starters- en seniorenwoningen (zoals hofjes/Knarrenhof), bouwen in de dorpen voor eigen inwoners en behoud van het dorpskarakter.",
        verbatimQuote: "CPB wil dat onze jongeren en ouderen in hun eigen dorp of stad kunnen blijven wonen. We bouwen gericht betaalbare starterswoningen en levensloopbestendige hofjeswoningen met oog voor de menselijke maat.",
        controlQuestionTemplate: "CPB stelt in haar verkiezingsprogramma dat jongeren en ouderen in hun eigen kern moeten kunnen blijven wonen: biedt dit voorstel volgens CPB voldoende concrete garanties voor onze eigen starters en senioren?"
      },
      {
        id: "cpb_sociaal_zorg",
        domain: "sociaal",
        chapterOrSection: "Hoofdstuk Zorg, Welzijn, Armoedebestrijding & Gezin (p. 10–15)",
        keywords: [
          "zorg", "wmo", "jeugdzorg", "jeugdhulp", "sociaal domein", "participatiewet", "armoede",
          "mantelzorg", "ouderen", "sport", "sportvereniging", "veldverlichting", "dorpshuis", "leefbaarheid", "jongeren"
        ],
        defaultStance: "positief",
        stanceSummary: "CPB komt op voor kwetsbare inwoners, goede en toegankelijke Wmo- en jeugdzorg zonder bureaucratische drempels, waardering voor mantelzorgers en sterke dorpsverenigingen.",
        verbatimQuote: "Niemand mag in Steenwijkerland tussen wal en schip vallen. Zorg en maatschappelijke ondersteuning moeten laagdrempelig zijn, met de mens centraal in plaats van het systeem.",
        controlQuestionTemplate: "CPB benadrukt in haar programma dat de mens centraal moet staan en niemand tussen wal en schip mag vallen: hoe waarborgt dit voorstel volgens CPB de menselijke maat in de uitvoering?"
      },
      {
        id: "cpb_economie_ondernemers",
        domain: "economie",
        chapterOrSection: "Hoofdstuk Economie, Werkgelegenheid & Toerisme (p. 16–19)",
        keywords: [
          "biz", "bedrijveninvesteringszone", "binnenstad", "centrum", "ondernemers", "detailhandel",
          "winkeliers", "steenwijk vestingstad", "horeca", "bedrijventerrein", "mkb", "toerisme", "recreatie", "landbouw"
        ],
        defaultStance: "positief",
        stanceSummary: "CPB steunt lokale winkeliers, het MKB en agrariërs, een levendige binnenstad en balans tussen toerisme en leefbaarheid voor inwoners (zondagsrust en rust in de kernen).",
        verbatimQuote: "Lokale ondernemers en winkeliers verdienen onze steun voor een vitaal centrum en werkgelegenheid, waarbij we bij toerisme en bedrijvigheid altijd waken over de leefbaarheid en rust voor onze inwoners.",
        controlQuestionTemplate: "CPB zoekt in haar programma steeds de balans tussen ondersteuning van ondernemers en de leefbaarheid voor inwoners: is die balans in dit voorstel volgens CPB goed geborgd?"
      },
      {
        id: "cpb_mobiliteit_veiligheid",
        domain: "mobiliteit",
        chapterOrSection: "Hoofdstuk Verkeer, Bereikbaarheid & Veiligheid (p. 20–23)",
        keywords: [
          "verkeer", "mobiliteit", "randweg", "blokzijl", "parkeren", "parkeerregulering", "parkeertarieven",
          "fietspad", "fietsenstalling", "station", "n333", "n334", "openbaar verkeer", "verkeersveiligheid", "bruggen", "handhaving", "veiligheid", "boa"
        ],
        defaultStance: "positief",
        stanceSummary: "CPB wil verkeersveilige dorpskernen, behoud van gratis/betaalbaar parkeren, goed onderhoud van wegen en bruggen en zichtbare handhaving tegen overlast.",
        verbatimQuote: "Veiligheid op straat en in het verkeer is een basisvoorwaarde. We zorgen voor veilige fiets- en looproutes, goed bereikbare voorzieningen en zichtbare toezichthouders in de wijken en kernen.",
        controlQuestionTemplate: "CPB stelt verkeersveiligheid en bereikbaarheid voorop in haar programma: welke concrete verbetering levert dit besluit volgens CPB op voor de veiligheid en bereikbaarheid van onze inwoners?"
      },
      {
        id: "cpb_energie_financien_bestuur",
        domain: "bestuur_financien",
        chapterOrSection: "Hoofdstuk Duurzaamheid, Bestuur & Financiën (p. 24–30)",
        keywords: [
          "energie", "duurzaamheid", "zonnecarport", "zonnepanelen", "zonnepark", "windmolens", "windenergie",
          "begroting", "voorjaarsnota", "kadernota", "jaarverslag", "ozb", "belasting", "heffing", "leges",
          "gemeenschappelijke regeling", "rekenkamer", "participatie", "informatiebeveiliging", "subsidie", "cultuur", "erfgoed", "lokale omroep"
        ],
        defaultStance: "genuanceerd",
        stanceSummary: "CPB wil betaalbare verduurzaming (eerst zon op dak/carport, geen aantasting landschap door windturbines), behoedzaam financieel beleid met lage lasten en echte burgerparticipatie.",
        verbatimQuote: "Duurzaamheid moet haalbaar en betaalbaar blijven voor elke portemonnee, met zonnepanelen op daken en parkeerterreinen in plaats van in het open landschap. De gemeente past op de winkel en houdt de lasten voor inwoners laag.",
        controlQuestionTemplate: "CPB stelt in haar programma dat beleid haalbaar en betaalbaar moet blijven en de gemeente goed op de winkel moet passen: hoe beoordeelt CPB de kosten-batenverhouding van dit voorstel?"
      }
    ]
  },
  {
    partyId: "VVD",
    partyName: "VVD",
    partyFullName: "VVD Steenwijkerland",
    programTitle: "Verkiezingsprogramma 2026–2030: Wat telt is wat er hier gebeurt",
    programPdfUrl: "/assets/aistudio/Verkiezingsprogramma-VVD-Steenwijkerland-GR26_e2fe1b99.pdf",
    generalProfile: "Liberale partij; focus op lage lokale lasten (OZB), ruim baan voor ondernemers en woningbouw, vlot verkeer (randweg Blokzijl, parkeren), en stevige handhaving & veiligheid.",
    passages: [
      {
        id: "vvd_economie_biz",
        domain: "economie",
        chapterOrSection: "Hoofdstuk Ondernemen, Economie & Toerisme (p. 8–12)",
        keywords: [
          "biz", "bedrijveninvesteringszone", "binnenstad", "centrum", "ondernemers", "detailhandel",
          "winkeliers", "steenwijk vestingstad", "horeca", "bedrijventerrein", "mkb", "toerisme", "recreatie", "economie", "regeldruk", "deregulering"
        ],
        defaultStance: "positief",
        stanceSummary: "De VVD steunt ondernemersinitiatieven zoals de BIZ in de binnenstad, wil minder regeldruk, snellere vergunningen en ruimte voor bedrijventerreinen en toerisme.",
        verbatimQuote: "Ondernemers zorgen voor banen, levendigheid en welvaart in Steenwijkerland. De VVD geeft ondernemers de ruimte, steunt collectieve investeringen in een aantrekkelijke binnenstad en schrapt overbodige regels.",
        controlQuestionTemplate: "De VVD pleit in 'Wat telt is wat er hier gebeurt' voor minder regels en lagere lasten voor ondernemers: heeft de VVD geverifieerd dat dit voorstel echt gedragen wordt door de betrokken ondernemers en niet leidt tot extra bureaucratie?"
      },
      {
        id: "vvd_wonen",
        domain: "wonen",
        chapterOrSection: "Hoofdstuk Wonen & Bouwen (p. 4–7)",
        keywords: [
          "wonen", "woningbouw", "volkshuisvesting", "woonvisie", "woondeal", "starters", "senioren",
          "inbreiding", "cpo", "huurwoningen", "koopwoningen", "omgevingsplan", "bestemmingsplan", "vab", "splitsen", "middeninkomens"
        ],
        defaultStance: "positief",
        stanceSummary: "De VVD wil bouwen, bouwen, bouwen: vooral koopwoningen en middenhuur voor starters, gezinnen en werkenden, snellere procedures en ruimte voor marktinitiatieven in alle kernen.",
        verbatimQuote: "Er moet veel sneller gebouwd worden in Steenwijkerland, met volop aandacht voor betaalbare koopwoningen, middeninkomens en vrijesectorwoningen. We schrappen belemmerende gemeentelijke bovenwettelijke eisen.",
        controlQuestionTemplate: "De VVD wil in haar verkiezingsprogramma belemmerende gemeentelijke eisen schrappen en meer koopwoningen voor starters en middeninkomens realiseren: bevat dit voorstel volgens de VVD niet alsnog te veel ambtelijke beperkingen?"
      },
      {
        id: "vvd_mobiliteit_parkeren",
        domain: "mobiliteit",
        chapterOrSection: "Hoofdstuk Bereikbaarheid, Verkeer & Parkeren (p. 13–16)",
        keywords: [
          "verkeer", "mobiliteit", "randweg", "blokzijl", "parkeren", "parkeerregulering", "parkeertarieven",
          "fietspad", "fietsenstalling", "station", "n333", "n334", "openbaar verkeer", "verkeersveiligheid", "bruggen", "auto"
        ],
        defaultStance: "positief",
        stanceSummary: "De VVD staat voor goede bereikbaarheid met de auto én fiets, aanleg van de randweg Blokzijl, behoud van openbare wegen en lage parkeertarieven zonder autootje-pesten.",
        verbatimQuote: "De auto blijft in een plattelandsgemeente als Steenwijkerland onmisbaar. Wij zijn tegen het wegpesten van de auto, willen voldoende en betaalbare parkeerplaatsen in het centrum en zetten door met de randweg bij Blokzijl.",
        controlQuestionTemplate: "De VVD verzet zich in haar programma tegen hogere parkeerlasten en het beperken van de autobereikbaarheid: hoe rijmt de VVD dit voorstel met haar belofte om automobilisten en bezoekers niet op kosten te jagen?"
      },
      {
        id: "vvd_veiligheid_asiel",
        domain: "veiligheid",
        chapterOrSection: "Hoofdstuk Veiligheid, Handhaving & Asiel (p. 17–20)",
        keywords: [
          "handhaving", "veiligheid", "boa", "politie", "overlast", "cameratoezicht", "apv", "brandweer",
          "veiligheidsregio", "gevaarlijke stoffen", "azc", "asiel", "opvang", "broekslagen", "statushouders", "spreidingswet"
        ],
        defaultStance: "positief",
        stanceSummary: "De VVD wil stevige handhaving op overlast, inzet van cameratoezicht waar nodig, en is kritisch op onevenredige asielopvang en voorrang voor statushouders op de woningmarkt.",
        verbatimQuote: "Veiligheid is een kerntaak van de overheid. We treden hard op tegen overlast en ondermijning, zetten waar nodig cameratoezicht en BOA's in, en stellen grenzen aan de omvang en duur van asielopvang.",
        controlQuestionTemplate: "De VVD noemt veiligheid en stevige handhaving een absolute kerntaak in haar programma: zijn de handhavingscapaciteit en veiligheidsborging in dit voorstel volgens de VVD hard genoeg vastgelegd?"
      },
      {
        id: "vvd_energie",
        domain: "energie",
        chapterOrSection: "Hoofdstuk Energie & Klimaat (p. 21–24)",
        keywords: [
          "energie", "duurzaamheid", "zonnecarport", "zonnepanelen", "zonnepark", "windmolens", "windenergie",
          "windturbines", "warmtetransitie", "res", "natuur", "landschap", "weerribben", "wieden"
        ],
        defaultStance: "genuanceerd",
        stanceSummary: "De VVD kiest voor een nuchtere, haalbare energietransitie: wél zon op grote daken en parkeerterreinen (zoals zonnecarports), géén dwang voor huiseigenaren en terughoudendheid met windturbines en zonneweides.",
        verbatimQuote: "Verduurzaming moet realistisch, betaalbaar en zonder dwang zijn. Zonnepanelen leggen we op bedrijfsdaken en parkeerterreinen, niet op kostbare landbouwgrond, en we waken voor aantasting van het landschap.",
        controlQuestionTemplate: "De VVD pleit voor een realistische en betaalbare energietransitie zonder dwang of onrendabele subsidies: hoe beoordeelt de VVD de zakelijke businesscase en maatschappelijke kosten van dit voorstel?"
      },
      {
        id: "vvd_financien_bestuur_zorg",
        domain: "bestuur_financien",
        chapterOrSection: "Hoofdstuk Financiën, Bestuur & Sociaal Domein (p. 25–32)",
        keywords: [
          "begroting", "voorjaarsnota", "kadernota", "jaarverslag", "ozb", "belasting", "heffing", "leges",
          "gemeenschappelijke regeling", "rekenkamer", "participatie", "informatiebeveiliging", "subsidie",
          "zorg", "wmo", "jeugdzorg", "jeugdhulp", "participatiewet", "sport", "veldverlichting", "cultuur", "erfgoed", "lokale omroep"
        ],
        defaultStance: "genuanceerd",
        stanceSummary: "De VVD eist financiële discipline, een zo laag mogelijke OZB, kritische doorlichting van subsidies en gemeenschappelijke regelingen, en in het sociaal domein focus op werk boven uitkering.",
        verbatimQuote: "De gemeente moet zich richten op haar kerntaken en zuinig omgaan met het belastinggeld van onze inwoners en bedrijven. De OZB houden we zo laag mogelijk en elke subsidie en gemeenschappelijke regeling toetsen we streng op resultaat.",
        controlQuestionTemplate: "De VVD belooft in haar programma strenge toetsing van subsidies, gemeenschappelijke regelingen en gemeentelijke uitgaven: welke concrete prestatie-afspraken en kostenbeheersing eist de VVD bij dit besluit?"
      }
    ]
  },
  {
    partyId: "CU",
    partyName: "CU",
    partyFullName: "ChristenUnie Steenwijkerland",
    programTitle: "Verkiezingsprogramma 2026–2030: Opstaan voor het goede",
    programPdfUrl: "/assets/aistudio/Christen-Unie-Stland-2026_5d2792a8.pdf",
    generalProfile: "Christelijk-sociale partij; focus op omzien naar kwetsbaren, rentmeesterschap over schepping en klimaat, betaalbaar wonen, gezinnen & jeugd, en dienstbaar bestuur.",
    passages: [
      {
        id: "cu_wonen",
        domain: "wonen",
        chapterOrSection: "Thema Wonen & Leefbare Kernen (p. 4–6)",
        keywords: [
          "wonen", "woningbouw", "volkshuisvesting", "woonvisie", "woondeal", "starters", "senioren",
          "inbreiding", "cpo", "huurwoningen", "koopwoningen", "omgevingsplan", "bestemmingsplan", "vab", "splitsen", "statushouders"
        ],
        defaultStance: "positief",
        stanceSummary: "De ChristenUnie zet in op betaalbare huur- en koopwoningen voor starters, ouderen en aandachtsgroepen, met ruimte voor meergeneratiewonen, hofjes en woningbouw in de kernen.",
        verbatimQuote: "Een goed en betaalbaar thuis is een basisrecht. De ChristenUnie wil meer sociale huur, betaalbare koop en woonvormen waar jong en oud naar elkaar omzien, zoals hofjes en kangoeroewoningen.",
        controlQuestionTemplate: "De ChristenUnie noemt in 'Opstaan voor het goede' betaalbaar wonen en omzien naar elkaar als leidraad: hoe borgt dit voorstel volgens de ChristenUnie dat woningen echt betaalbaar blijven voor mensen met een smalle beurs?"
      },
      {
        id: "cu_zorg_sociaal",
        domain: "sociaal",
        chapterOrSection: "Thema Samenleving, Zorg, Jeugd & Armoede (p. 6–9)",
        keywords: [
          "zorg", "wmo", "jeugdzorg", "jeugdhulp", "sociaal domein", "participatiewet", "armoede",
          "schuldhulpverlening", "mantelzorg", "ouderen", "sport", "sportvereniging", "veldverlichting", "dorpshuis", "jongeren", "asiel", "opvang"
        ],
        defaultStance: "positief",
        stanceSummary: "De ChristenUnie staat voor ruimhartige ondersteuning van kwetsbare inwoners, sterke gezinnen en jeugdhulp, armoedebestrijding, mantelzorgondersteuning en barmhartige opvang van vluchtelingen.",
        verbatimQuote: "We staan op voor wie kwetsbaar is. In de Wmo, jeugdzorg en schuldhulpverlening bieden we tijdige, nabije hulp zonder bureaucratische muren, en we ondersteunen gezinnen, mantelzorgers en vrijwilligers.",
        controlQuestionTemplate: "De ChristenUnie pleit in haar programma voor nabije zorg en ondersteuning voor de meest kwetsbaren: zijn de toegankelijkheid en ondersteuning voor kwetsbare inwoners in dit voorstel volgens de ChristenUnie voldoende gegarandeerd?"
      },
      {
        id: "cu_energie_schepping",
        domain: "energie",
        chapterOrSection: "Thema Schepping, Duurzaamheid & Landbouw (p. 10–12)",
        keywords: [
          "energie", "duurzaamheid", "zonnecarport", "zonnepanelen", "zonnepark", "windmolens", "windenergie",
          "windturbines", "warmtetransitie", "res", "natuur", "landschap", "weerribben", "wieden", "klimaat"
        ],
        defaultStance: "positief",
        stanceSummary: "Vanuit zorg voor de schepping steunt de ChristenUnie energiebesparing, bestrijding van energiearmoede, zon op daken en parkeerterreinen (zonnecarports) en natuurherstel samen met boeren.",
        verbatimQuote: "Zorg voor de schepping vraagt om concrete stappen in energiebesparing, duurzame opwekking op daken en parkeerterreinen, het bestrijden van energiearmoede en het beschermen van onze natuur in Weerribben-Wieden.",
        controlQuestionTemplate: "De ChristenUnie verbindt verduurzaming in haar programma met het tegengaan van energiearmoede en zorg voor de schepping: hoe komen de baten van dit voorstel volgens de ChristenUnie ten goede aan de lokale gemeenschap?"
      },
      {
        id: "cu_economie_mobiliteit_bestuur",
        domain: "bestuur_financien",
        chapterOrSection: "Thema's Economie, Verkeer, Cultuur & Dienstbaar Bestuur (p. 13–16)",
        keywords: [
          "biz", "bedrijveninvesteringszone", "binnenstad", "centrum", "ondernemers", "detailhandel", "toerisme",
          "verkeer", "mobiliteit", "randweg", "blokzijl", "parkeren", "fietspad", "verkeersveiligheid",
          "begroting", "voorjaarsnota", "kadernota", "ozb", "belasting", "gemeenschappelijke regeling", "rekenkamer",
          "participatie", "handhaving", "veiligheid", "informatiebeveiliging", "subsidie", "cultuur", "erfgoed", "lokale omroep"
        ],
        defaultStance: "genuanceerd",
        stanceSummary: "De ChristenUnie steunt dienstbaar en integer bestuur, vitale lokale ondernemers met respect voor de zondagsrust, veilige fietsroutes en verantwoorde gemeentefinanciën.",
        verbatimQuote: "Een dienstbare en betrouwbare overheid luistert echt naar inwoners, gaat zorgvuldig om met gemeenschapsgeld en werkt samen met ondernemers en maatschappelijke organisaties aan een veilig en bloeiend Steenwijkerland.",
        controlQuestionTemplate: "De ChristenUnie benadrukt in haar programma een dienstbare overheid en zorgvuldig rentmeesterschap over gemeenschapsgeld: hoe weegt de ChristenUnie de maatschappelijke meerwaarde en burgerparticipatie bij dit voorstel?"
      }
    ]
  },
  {
    partyId: "STEM",
    partyName: "STEM",
    partyFullName: "STEM Steenwijkerland",
    programTitle: "Verkiezingsprogramma 2026–2030: Kennis en lokaal verstand 50/50 - Gewoon doen!",
    programPdfUrl: "/assets/aistudio/Verkiezingsprogramma_STEMSteenwijkerland2026-2030_f508203c.pdf",
    generalProfile: "Pragmatische lokale partij ('Kennis en lokaal verstand 50/50'); kritisch op externe inhuur en ambtelijke bureaucratie, focus op betaalbaar wonen voor eigen inwoners, lagere lasten en praktische uitvoering.",
    passages: [
      {
        id: "stem_wonen_ruimte",
        domain: "wonen",
        chapterOrSection: "Wonen & Ruimtelijke Ordening (p. 2–3)",
        keywords: [
          "wonen", "woningbouw", "volkshuisvesting", "woonvisie", "woondeal", "starters", "senioren",
          "inbreiding", "cpo", "huurwoningen", "koopwoningen", "omgevingsplan", "bestemmingsplan", "vab", "splitsen"
        ],
        defaultStance: "positief",
        stanceSummary: "STEM wil praktisch en snel bouwen voor eigen starters en ouderen in alle kernen, soepel toestaan van woningsplitsing en VAB-herbestemming, en minder dikke beleidsnota's.",
        verbatimQuote: "Gewoon doen: minder papier en sneller bouwen voor onze eigen jongeren, starters en ouderen in de kernen. Woningsplitsing, pré-mantelzorgwoningen en hergebruik van bestaande panden maken we praktisch mogelijk zonder eindeloze procedures.",
        controlQuestionTemplate: "STEM pleit onder het motto 'Kennis en lokaal verstand 50/50 - Gewoon doen!' voor minder papier en snellere praktische uitvoering: zorgt dit voorstel volgens STEM voor echte uitvoering of vooral voor extra ambtelijke regeldruk?"
      },
      {
        id: "stem_bestuur_financien",
        domain: "bestuur_financien",
        chapterOrSection: "Bestuur, Dienstverlening & Financiën (p. 1–2 & 6–7)",
        keywords: [
          "begroting", "voorjaarsnota", "kadernota", "jaarverslag", "ozb", "belasting", "heffing", "leges",
          "gemeenschappelijke regeling", "rekenkamer", "participatie", "informatiebeveiliging", "subsidie",
          "handhaving", "veiligheid", "boa"
        ],
        defaultStance: "negatief",
        stanceSummary: "STEM is scherp kritisch op dure externe adviesbureaus, oplopende kosten van gemeenschappelijke regelingen, lastenverhogingen en schijnparticipatie achteraf.",
        verbatimQuote: "Kennis van buiten combineren we 50/50 met gezond lokaal verstand van binnen. We stoppen met het verspillen van belastinggeld aan dure externe bureaus en ondoorzichtige gemeenschappelijke regelingen, en luisteren vooraf écht naar inwoners.",
        controlQuestionTemplate: "STEM verzet zich in haar programma tegen dure externe inhuur, schijnparticipatie en het wegleken van democratische controle: hoe beoordeelt STEM de ambtelijke kosten en de daadwerkelijke invloed van inwoners bij dit stuk?"
      },
      {
        id: "stem_economie_mobiliteit",
        domain: "economie",
        chapterOrSection: "Economie, Ondernemers, Verkeer & Bereikbaarheid (p. 4–5)",
        keywords: [
          "biz", "bedrijveninvesteringszone", "binnenstad", "centrum", "ondernemers", "detailhandel",
          "winkeliers", "steenwijk vestingstad", "horeca", "bedrijventerrein", "mkb", "toerisme",
          "verkeer", "mobiliteit", "randweg", "blokzijl", "parkeren", "parkeerregulering", "fietspad", "bruggen", "openbaar verkeer"
        ],
        defaultStance: "genuanceerd",
        stanceSummary: "STEM steunt lokale ondernemers en praktische oplossingen voor verkeer en parkeren, mits plannen gedragen worden door de praktijk en niet van bovenaf worden opgelegd.",
        verbatimQuote: "Ondernemers en inwoners weten vaak zelf het beste wat werkt in hun straat, kern of winkelgebied. De gemeente moet faciliteren, zorgen voor goed onderhoud van wegen en bruggen en geen onnodige lasten of barrières opwerpen.",
        controlQuestionTemplate: "STEM stelt in haar programma dat de praktijk van inwoners en ondernemers leidend moet zijn boven de tekentafel: is dit voorstel volgens STEM voldoende getoetst aan het lokale gezonde verstand?"
      },
      {
        id: "stem_energie_zorg",
        domain: "energie",
        chapterOrSection: "Energie, Landschap & Sociaal Domein (p. 5–6)",
        keywords: [
          "energie", "duurzaamheid", "zonnecarport", "zonnepanelen", "zonnepark", "windmolens", "windenergie",
          "zorg", "wmo", "jeugdzorg", "jeugdhulp", "sociaal domein", "participatiewet", "sport", "veldverlichting", "cultuur", "lokale omroep"
        ],
        defaultStance: "genuanceerd",
        stanceSummary: "STEM steunt logische oplossingen zoals zon op daken en parkeerterreinen (zonnecarports) en praktische zorg en sportvoorzieningen, maar wijst megawindturbines en bureaucratie in de zorg af.",
        verbatimQuote: "Gezond verstand bij duurzaamheid en zorg: zonnepanelen op daken en parkeerplaatsen in plaats van windmolens of zonneweides in ons landschap, en zorggeld direct naar de werkvloer in plaats van naar bureaucratie.",
        controlQuestionTemplate: "STEM hanteert als graadmeter dat zorggeld en duurzaamheidsmiddelen direct praktisch resultaat moeten opleveren zonder bureaucratie: voldoet dit voorstel volgens STEM aan die norm?"
      }
    ]
  },
  {
    partyId: "PRO",
    partyName: "PRO (GroenLinks-PvdA)",
    partyFullName: "GroenLinks-PvdA Steenwijkerland (PRO)",
    programTitle: "Gezamenlijk Verkiezingsprogramma Gemeenteraadsverkiezingen 2026",
    programPdfUrl: "/assets/aistudio/Verkiezingsprogramma_Gemeenteraadsverkiezingen2026__1__cb839acf.pdf",
    generalProfile: "Progressief-linkse samenwerking (GroenLinks-PvdA / PRO); focus op betaalbare sociale volkshuisvesting, eerlijke zorg & bestaanszekerheid, ambitieus klimaat- en natuurbeleid en solidariteit.",
    passages: [
      {
        id: "pro_wonen",
        domain: "wonen",
        chapterOrSection: "Hoofdstuk 1: Wonen (p. 2–6)",
        keywords: [
          "wonen", "woningbouw", "volkshuisvesting", "woonvisie", "woondeal", "starters", "senioren",
          "sociale huur", "middenhuur", "inbreiding", "cpo", "huurwoningen", "koopwoningen", "omgevingsplan", "bestemmingsplan", "vab", "splitsen", "statushouders"
        ],
        defaultStance: "positief",
        stanceSummary: "PRO (GroenLinks-PvdA) eist actieve grondpolitiek, minimaal 30% sociale huur en 40% betaalbare middenhuur/koop bij nieuwbouw, woonplicht tegen speculatie en huisvesting voor zowel starters, ouderen als statushouders.",
        verbatimQuote: "Wonen is een grondrecht en geen verdienmodel. Bij elk nieuwbouwproject eisen we een stevig aandeel sociale huur en écht betaalbare woningen, met een zelfbewoningsplicht en actieve regie van de gemeente.",
        controlQuestionTemplate: "PRO (GroenLinks-PvdA) stelt in haar verkiezingsprogramma dat wonen een grondrecht is en eist harde percentages sociale huur en betaalbaarheid: bevat dit voorstel volgens PRO voldoende afdwingbare eisen voor sociale en betaalbare woningbouw?"
      },
      {
        id: "pro_samenleving_zorg",
        domain: "sociaal",
        chapterOrSection: "Hoofdstuk 2: Samenleving, Zorg, Jeugd, Cultuur & Onderwijs (p. 7–13)",
        keywords: [
          "zorg", "wmo", "jeugdzorg", "jeugdhulp", "sociaal domein", "participatiewet", "armoede",
          "schuldhulpverlening", "mantelzorg", "ouderen", "sport", "sportvereniging", "veldverlichting", "dorpshuis",
          "cultuur", "erfgoed", "monumenten", "lokale omroep", "publieke omroep", "rtv", "kunst", "jongeren", "asiel", "opvang"
        ],
        defaultStance: "positief",
        stanceSummary: "PRO (GroenLinks-PvdA) zet in op bestaanszekerheid, ruimhartige armoedebestrijding, menselijke maat in de Participatiewet en Wmo, sterke publieke voorzieningen, cultuur en humane vluchtelingenopvang.",
        verbatimQuote: "Wij kiezen voor een solidair Steenwijkerland waarin bestaanszekerheid voorop staat. We investeren in toegankelijke zorg, jeugdhulp, armoedebestrijding, sport en cultuur voor iedereen, ongeacht inkomen.",
        controlQuestionTemplate: "PRO (GroenLinks-PvdA) stelt bestaanszekerheid en gelijke toegang tot voorzieningen centraal in haar programma: hoe borgt dit voorstel volgens PRO dat inwoners met een laag inkomen of kwetsbare positie hier niet de dupe van worden?"
      },
      {
        id: "pro_economie_klimaat_energie",
        domain: "energie",
        chapterOrSection: "Hoofdstuk 3: Duurzame Economie, Klimaat, Natuur & Mobiliteit (p. 14–19)",
        keywords: [
          "energie", "duurzaamheid", "zonnecarport", "zonnepanelen", "zonnepark", "windmolens", "windenergie",
          "windturbines", "warmtetransitie", "res", "natuur", "landschap", "weerribben", "wieden", "biodiversiteit", "klimaat",
          "biz", "bedrijveninvesteringszone", "binnenstad", "centrum", "ondernemers", "detailhandel", "toerisme",
          "verkeer", "mobiliteit", "randweg", "blokzijl", "parkeren", "parkeerregulering", "fietspad", "fietsenstalling", "station", "ov"
        ],
        defaultStance: "positief",
        stanceSummary: "PRO (GroenLinks-PvdA) wil versnelling van duurzame energie (zon op dak/carport én lokaal eigendom), bescherming van natuur en biodiversiteit, voorrang voor fiets en OV, en een groene, circulaire economie.",
        verbatimQuote: "We versnellen de energietransitie eerlijk en duurzaam, beschermen en versterken onze natuur in en rond Weerribben-Wieden en geven in ons mobiliteits- en economisch beleid prioriteit aan vergroening, fiets en openbaar vervoer.",
        controlQuestionTemplate: "PRO (GroenLinks-PvdA) koppelt in haar programma economische en ruimtelijke keuzes direct aan klimaatdoelen, biodiversiteit en duurzame mobiliteit: voldoet dit voorstel volgens PRO aan die groene en sociale randvoorwaarden?"
      },
      {
        id: "pro_bestuur_financien",
        domain: "bestuur_financien",
        chapterOrSection: "Hoofdstuk 4: Bestuur en Financiën (p. 20–23)",
        keywords: [
          "begroting", "voorjaarsnota", "kadernota", "jaarverslag", "ozb", "belasting", "heffing", "leges",
          "gemeenschappelijke regeling", "rekenkamer", "participatie", "informatiebeveiliging", "subsidie", "handhaving", "veiligheid"
        ],
        defaultStance: "genuanceerd",
        stanceSummary: "PRO (GroenLinks-PvdA) pleit voor een inclusieve lokale democratie waarbij niet alleen de luidste stemmen worden gehoord, en is bereid gemeentelijke belastingen eerlijk te verdelen om sociale voorzieningen op peil te houden.",
        verbatimQuote: "Een rechtvaardig gemeentebestuur betrekt alle inwoners actief bij besluiten en zorgt voor eerlijke lastenverdeling volgens het principe 'de sterkste schouders dragen de zwaarste lasten' om publieke voorzieningen te beschermen.",
        controlQuestionTemplate: "PRO (GroenLinks-PvdA) pleit in Hoofdstuk 4 van haar programma voor inclusieve participatie en bescherming van publieke voorzieningen: zijn volgens PRO bij dit voorstel alle belanghebbenden evenwichtig betrokken?"
      }
    ]
  }
];

/**
 * Compact context string of all 8 other parties' manifestos for Gemini AI prompts
 */
export function getOtherPartiesManifestoPromptContext(): string {
  const lines: string[] = [];
  for (const party of OTHER_PARTIES_MANIFESTOS) {
    lines.push(`\n=== PARTIJ: ${party.partyName} (${party.partyFullName}) — "${party.programTitle}" ===`);
    for (const p of party.passages) {
      lines.push(
        `- [${p.id}] (${p.chapterOrSection}) Standpunt (${p.defaultStance}): ${p.stanceSummary}\n  Letterlijk citaat: "${p.verbatimQuote}"`
      );
    }
  }
  return lines.join("\n");
}
