/**
 * HOOGEVEEN TAXONOMIE & GEOGRAFISCHE AGGREGATIEMATRIX
 * 
 * Bevat de officiële CBS buurten samengevoegd naar logische geografische wijken/kernen.
 * Verdelingsregel: Deelwijken (zoals Schutlanden-Oost/West) en verspreide huizen/kernen
 * (zoals Verspreide huizen Nieuweroord + Nieuweroord kern) worden geografisch samengevoegd.
 */

export interface HoogeveenBuurtRaw {
  code: string;
  naam: string;
  inwoners: number;
  oppervlakteHa: number;
  landHa: number;
  locatieType: string;
}

export interface HoogeveenWijkOrKern {
  id: string;
  slug: string;
  naam: string;
  type: "stadswijk" | "dorpskern" | "industrie" | "buitengebied";
  totaalInwoners: number;
  totaalOppervlakteHa: number;
  buurten: HoogeveenBuurtRaw[];
  aliases: string[];
  description?: string;
  coordinaten?: { lat: number; lng: number };
}

// Ruwe CBS data conform opgave
export const RAW_HOOGEVEEN_BUURTEN: HoogeveenBuurtRaw[] = [
  { code: "BU01180500", naam: "Centrum", inwoners: 1120, oppervlakteHa: 39, landHa: 39, locatieType: "Locatie in de gemeente" },
  { code: "BU01180501", naam: "Noord", inwoners: 1260, oppervlakteHa: 46, landHa: 46, locatieType: "Locatie in de gemeente" },
  { code: "BU01180502", naam: "Bentinckspark", inwoners: 520, oppervlakteHa: 73, landHa: 71, locatieType: "Locatie in de gemeente" },
  { code: "BU01180503", naam: "Krakeel", inwoners: 4950, oppervlakteHa: 93, landHa: 87, locatieType: "Locatie in de gemeente" },
  { code: "BU01180504", naam: "Wolfsbos", inwoners: 4280, oppervlakteHa: 99, landHa: 95, locatieType: "Locatie in de gemeente" },
  { code: "BU01180505", naam: "Zuid", inwoners: 6230, oppervlakteHa: 134, landHa: 128, locatieType: "Locatie in de gemeente" },
  { code: "BU01180506", naam: "Venesluis", inwoners: 1910, oppervlakteHa: 88, landHa: 84, locatieType: "Locatie in de gemeente" },
  { code: "BU01180507", naam: "West", inwoners: 1770, oppervlakteHa: 79, landHa: 79, locatieType: "Locatie in de gemeente" },
  { code: "BU01180508", naam: "Oost", inwoners: 2540, oppervlakteHa: 51, landHa: 51, locatieType: "Locatie in de gemeente" },
  { code: "BU01180510", naam: "Steenbergerweiden", inwoners: 1080, oppervlakteHa: 30, landHa: 30, locatieType: "Locatie in de gemeente" },
  { code: "BU01180511", naam: "Kinholt", inwoners: 980, oppervlakteHa: 54, landHa: 53, locatieType: "Locatie in de gemeente" },
  { code: "BU01180512", naam: "Grittenhof", inwoners: 130, oppervlakteHa: 30, landHa: 30, locatieType: "Locatie in de gemeente" },
  { code: "BU01180513", naam: "Schoonvelde-West", inwoners: 1960, oppervlakteHa: 30, landHa: 30, locatieType: "Locatie in de gemeente" },
  { code: "BU01180514", naam: "Schoonvelde-Oost", inwoners: 1410, oppervlakteHa: 31, landHa: 31, locatieType: "Locatie in de gemeente" },
  { code: "BU01180515", naam: "Schutlanden-Oost", inwoners: 870, oppervlakteHa: 48, landHa: 46, locatieType: "Locatie in de gemeente" },
  { code: "BU01180516", naam: "Schutlanden-West", inwoners: 1520, oppervlakteHa: 27, landHa: 25, locatieType: "Locatie in de gemeente" },
  { code: "BU01180517", naam: "Kattouw", inwoners: 1210, oppervlakteHa: 31, landHa: 27, locatieType: "Locatie in de gemeente" },
  { code: "BU01180518", naam: "Trasselt", inwoners: 1940, oppervlakteHa: 44, landHa: 44, locatieType: "Locatie in de gemeente" },
  { code: "BU01180519", naam: "Erflanden", inwoners: 2720, oppervlakteHa: 84, landHa: 84, locatieType: "Locatie in de gemeente" },
  { code: "BU01180520", naam: "Fluitenberg kern", inwoners: 400, oppervlakteHa: 77, landHa: 77, locatieType: "Locatie in de gemeente" },
  { code: "BU01180521", naam: "Verspreide huizen Fluitenberg", inwoners: 100, oppervlakteHa: 818, landHa: 815, locatieType: "Locatie in de gemeente" },
  { code: "BU01180530", naam: "Elim Kern", inwoners: 1570, oppervlakteHa: 67, landHa: 67, locatieType: "Locatie in de gemeente" },
  { code: "BU01180531", naam: "Verspreide huizen Elim-Noord", inwoners: 150, oppervlakteHa: 546, landHa: 546, locatieType: "Locatie in de gemeente" },
  { code: "BU01180532", naam: "Verspreide huizen Elim-Zuid", inwoners: 640, oppervlakteHa: 696, landHa: 696, locatieType: "Locatie in de gemeente" },
  { code: "BU01180540", naam: "Hollandscheveld kern", inwoners: 3460, oppervlakteHa: 168, landHa: 168, locatieType: "Locatie in de gemeente" },
  { code: "BU01180541", naam: "Verspreide huizen Hollanscheveld-West", inwoners: 270, oppervlakteHa: 1058, landHa: 1055, locatieType: "Locatie in de gemeente" },
  { code: "BU01180542", naam: "Verspreide huizen Hollanscheveld-Oost", inwoners: 660, oppervlakteHa: 1001, landHa: 988, locatieType: "Locatie in de gemeente" },
  { code: "BU01180550", naam: "Noordscheschut kern", inwoners: 1660, oppervlakteHa: 78, landHa: 76, locatieType: "Locatie in de gemeente" },
  { code: "BU01180551", naam: "Verspreide huizen Noordsche Schut", inwoners: 480, oppervlakteHa: 396, landHa: 391, locatieType: "Locatie in de gemeente" },
  { code: "BU01180560", naam: "Nieuwlande kern", inwoners: 1190, oppervlakteHa: 202, landHa: 202, locatieType: "Locatie in de gemeente" },
  { code: "BU01180561", naam: "Verspreide huizen Nieuwlande", inwoners: 180, oppervlakteHa: 561, landHa: 557, locatieType: "Locatie in de gemeente" },
  { code: "BU01180570", naam: "Nieuweroord kern", inwoners: 560, oppervlakteHa: 64, landHa: 60, locatieType: "Locatie in de gemeente" },
  { code: "BU01180571", naam: "Verspreide huizen Nieuweroord", inwoners: 340, oppervlakteHa: 677, landHa: 666, locatieType: "Locatie in de gemeente" },
  { code: "BU01180580", naam: "Tiendeveen kern", inwoners: 390, oppervlakteHa: 39, landHa: 38, locatieType: "Locatie in de gemeente" },
  { code: "BU01180581", naam: "Verspreide huizen Tiendeveen", inwoners: 290, oppervlakteHa: 785, landHa: 777, locatieType: "Locatie in de gemeente" },
  { code: "BU01180590", naam: "Stuifzand kern", inwoners: 320, oppervlakteHa: 37, landHa: 37, locatieType: "Locatie in de gemeente" },
  { code: "BU01180591", naam: "Verspreide huizen Stuifzand", inwoners: 310, oppervlakteHa: 727, landHa: 722, locatieType: "Locatie in de gemeente" },
  { code: "BU01180600", naam: "Pesse kern", inwoners: 1080, oppervlakteHa: 75, landHa: 75, locatieType: "Locatie in de gemeente" },
  { code: "BU01180601", naam: "Verspreide huizen Pesse-Oost", inwoners: 410, oppervlakteHa: 1194, landHa: 1188, locatieType: "Locatie in de gemeente" },
  { code: "BU01180602", naam: "Verspreide huizen Pesse-West", inwoners: 90, oppervlakteHa: 545, landHa: 545, locatieType: "Locatie in de gemeente" },
  { code: "BU01180603", naam: "Verspreide huizen Pesse-Zuid", inwoners: 210, oppervlakteHa: 320, landHa: 317, locatieType: "Locatie in de gemeente" },
  { code: "BU01180610", naam: "Zuideropgaande Nieuw Moscou", inwoners: 570, oppervlakteHa: 198, landHa: 198, locatieType: "Locatie in de gemeente" },
  { code: "BU01180621", naam: "Industriegebied Toldijk", inwoners: 20, oppervlakteHa: 67, landHa: 67, locatieType: "Locatie in de gemeente" },
  { code: "BU01180622", naam: "Industriegebied Noord A", inwoners: 110, oppervlakteHa: 173, landHa: 172, locatieType: "Locatie in de gemeente" },
  { code: "BU01180623", naam: "Industriegebied Noord B", inwoners: 130, oppervlakteHa: 208, landHa: 206, locatieType: "Locatie in de gemeente" },
  { code: "BU01180624", naam: "Industriegebied Buitenvaart", inwoners: 240, oppervlakteHa: 158, landHa: 150, locatieType: "Locatie in de gemeente" },
  { code: "BU01180625", naam: "Verspreide huizen Alteveer", inwoners: 190, oppervlakteHa: 546, landHa: 545, locatieType: "Locatie in de gemeente" },
  { code: "BU01180626", naam: "Verspreide huizen Nijstad", inwoners: 100, oppervlakteHa: 120, landHa: 115, locatieType: "Locatie in de gemeente" },
];

/**
 * Samengevoegde Hoogeveen Wijken & Kernen Matrix (Geaggregeerd volgens instructie)
 */
export const HOOGEVEEN_WIJKEN_MATRIX: HoogeveenWijkOrKern[] = [
  // 1. Centrum
  {
    id: "hg-centrum",
    slug: "centrum",
    naam: "Centrum",
    type: "stadswijk",
    totaalInwoners: 1120,
    totaalOppervlakteHa: 39,
    buurten: [RAW_HOOGEVEEN_BUURTEN[0]],
    aliases: ["hoogeveen centrum", "binnenstad hoogeveen", "centrum hoogeveen", "hoofdstraat hoogeveen", "raadhuisplein hoogeveen", "stadshart hoogeveen"],
    description: "Het levendige stadshart van Hoogeveen met winkelstraten, horeca, cultuur en het gemeentehuis."
  },
  // 2. Noord
  {
    id: "hg-noord",
    slug: "noord",
    naam: "Noord",
    type: "stadswijk",
    totaalInwoners: 1260,
    totaalOppervlakteHa: 46,
    buurten: [RAW_HOOGEVEEN_BUURTEN[1]],
    aliases: ["hoogeveen noord", "wijk noord hoogeveen"],
    description: "Woonwijk in het noordelijke deel van de kern Hoogeveen."
  },
  // 3. Bentinckspark
  {
    id: "hg-bentinckspark",
    slug: "bentinckspark",
    naam: "Bentinckspark",
    type: "stadswijk",
    totaalInwoners: 520,
    totaalOppervlakteHa: 73,
    buurten: [RAW_HOOGEVEEN_BUURTEN[2]],
    aliases: ["bentinckspark", "sportpark bentinckspark", "bentincks park"],
    description: "Centraal sport-, recreatie- en woonpark in Hoogeveen met uitgebreide faciliteiten."
  },
  // 4. Krakeel
  {
    id: "hg-krakeel",
    slug: "krakeel",
    naam: "Krakeel",
    type: "stadswijk",
    totaalInwoners: 4950,
    totaalOppervlakteHa: 93,
    buurten: [RAW_HOOGEVEEN_BUURTEN[3]],
    aliases: ["krakeel", "grote beer krakeel", "wijk krakeel"],
    description: "Grote, veelzijdige woonwijk in Hoogeveen met wijkvoorzieningen en actieve buurtgemeenschap."
  },
  // 5. Wolfsbos
  {
    id: "hg-wolfsbos",
    slug: "wolfsbos",
    naam: "Wolfsbos",
    type: "stadswijk",
    totaalInwoners: 4280,
    totaalOppervlakteHa: 99,
    buurten: [RAW_HOOGEVEEN_BUURTEN[4]],
    aliases: ["wolfsbos", "rsg wolfsbos", "wijk wolfsbos"],
    description: "Grote groene woonwijk met onderwijslocaties, sportvoorzieningen en winkelcentrum."
  },
  // 6. Zuid
  {
    id: "hg-zuid",
    slug: "zuid",
    naam: "Zuid",
    type: "stadswijk",
    totaalInwoners: 6230,
    totaalOppervlakteHa: 134,
    buurten: [RAW_HOOGEVEEN_BUURTEN[5]],
    aliases: ["hoogeveen zuid", "wijk zuid hoogeveen", "de weide zuid"],
    description: "De meest dichtbevolkte wijk van Hoogeveen met gevarieerde woningbouw en wijkvoorzieningen."
  },
  // 7. Venesluis
  {
    id: "hg-venesluis",
    slug: "venesluis",
    naam: "Venesluis",
    type: "stadswijk",
    totaalInwoners: 1910,
    totaalOppervlakteHa: 88,
    buurten: [RAW_HOOGEVEEN_BUURTEN[6]],
    aliases: ["venesluis", "kanaalstraat hoogeveen", "oude veentijd venesluis"],
    description: "Historische wijk rondom de oude waterwegen en sluisverbindingen van Hoogeveen."
  },
  // 8. West
  {
    id: "hg-west",
    slug: "west",
    naam: "West",
    type: "stadswijk",
    totaalInwoners: 1770,
    totaalOppervlakteHa: 79,
    buurten: [RAW_HOOGEVEEN_BUURTEN[7]],
    aliases: ["hoogeveen west", "wijk west hoogeveen"],
    description: "Woonwijk aan de westelijke zijde van de stad met goede verbindingen."
  },
  // 9. Oost
  {
    id: "hg-oost",
    slug: "oost",
    naam: "Oost",
    type: "stadswijk",
    totaalInwoners: 2540,
    totaalOppervlakteHa: 51,
    buurten: [RAW_HOOGEVEEN_BUURTEN[8]],
    aliases: ["hoogeveen oost", "wijk oost hoogeveen"],
    description: "Gevestigde woonwijk aan de oostzijde van het stadscentrum."
  },
  // 10. Steenbergerweiden
  {
    id: "hg-steenbergerweiden",
    slug: "steenbergerweiden",
    naam: "Steenbergerweiden",
    type: "stadswijk",
    totaalInwoners: 1080,
    totaalOppervlakteHa: 30,
    buurten: [RAW_HOOGEVEEN_BUURTEN[9]],
    aliases: ["steenbergerweiden", "steenberger weiden", "steenbergerpark"],
    description: "Rustige en groene woonwijk grenzend aan het Steenbergerpark."
  },
  // 11. Kinholt
  {
    id: "hg-kinholt",
    slug: "kinholt",
    naam: "Kinholt",
    type: "stadswijk",
    totaalInwoners: 980,
    totaalOppervlakteHa: 54,
    buurten: [RAW_HOOGEVEEN_BUURTEN[10]],
    aliases: ["kinholt", "kinholtbos"],
    description: "Bosrijke en ruim opgezette woonwijk in Hoogeveen."
  },
  // 12. Grittenhof
  {
    id: "hg-grittenhof",
    slug: "grittenhof",
    naam: "Grittenhof",
    type: "stadswijk",
    totaalInwoners: 130,
    totaalOppervlakteHa: 30,
    buurten: [RAW_HOOGEVEEN_BUURTEN[11]],
    aliases: ["grittenhof", "landgoed grittenhof"],
    description: "Karakteristieke en kleinschalige woonlocatie."
  },
  // 13. Schoonvelde (Schoonvelde-West + Schoonvelde-Oost)
  {
    id: "hg-schoonvelde",
    slug: "schoonvelde",
    naam: "Schoonvelde",
    type: "stadswijk",
    totaalInwoners: 3370,
    totaalOppervlakteHa: 61,
    buurten: [RAW_HOOGEVEEN_BUURTEN[12], RAW_HOOGEVEEN_BUURTEN[13]],
    aliases: ["schoonvelde", "schoonvelde-west", "schoonvelde-oost", "schoonvelde west", "schoonvelde oost"],
    description: "Grote woonwijk De Weide bestaande uit Schoonvelde Oost en West met winkelcentrum De Weide."
  },
  // 14. Schutlanden (Schutlanden-Oost + Schutlanden-West)
  {
    id: "hg-schutlanden",
    slug: "schutlanden",
    naam: "Schutlanden",
    type: "stadswijk",
    totaalInwoners: 2390,
    totaalOppervlakteHa: 75,
    buurten: [RAW_HOOGEVEEN_BUURTEN[14], RAW_HOOGEVEEN_BUURTEN[15]],
    aliases: ["schutlanden", "schutlanden-oost", "schutlanden-west", "schutlanden oost", "schutlanden west", "schutlanden ii", "schutlanden iii"],
    description: "Ruim opgezette woonwijk in De Weide met veel waterpartijen en groen."
  },
  // 15. Kattouw
  {
    id: "hg-kattouw",
    slug: "kattouw",
    naam: "Kattouw",
    type: "stadswijk",
    totaalInwoners: 1210,
    totaalOppervlakteHa: 31,
    buurten: [RAW_HOOGEVEEN_BUURTEN[16]],
    aliases: ["kattouw", "de kattouw"],
    description: "Kindvriendelijke woonwijk grenzend aan het buitengebied en De Weide."
  },
  // 16. Trasselt
  {
    id: "hg-trasselt",
    slug: "trasselt",
    naam: "Trasselt",
    type: "stadswijk",
    totaalInwoners: 1940,
    totaalOppervlakteHa: 44,
    buurten: [RAW_HOOGEVEEN_BUURTEN[17]],
    aliases: ["trasselt", "de trasselt"],
    description: "Moderne wijk in De Weide met diverse woningtypen en scholen."
  },
  // 17. Erflanden
  {
    id: "hg-erflanden",
    slug: "erflanden",
    naam: "Erflanden",
    type: "stadswijk",
    totaalInwoners: 2720,
    totaalOppervlakteHa: 84,
    buurten: [RAW_HOOGEVEEN_BUURTEN[18]],
    aliases: ["erflanden", "nieuwbouw erflanden", "erflanden-zuid"],
    description: "Populaire en moderne nieuwbouwwijk ten zuidwesten van Hoogeveen aan de Hoogeveense Vaart."
  },
  // 18. Fluitenberg (Kern + Verspreide Huizen)
  {
    id: "hg-fluitenberg",
    slug: "fluitenberg",
    naam: "Fluitenberg",
    type: "dorpskern",
    totaalInwoners: 500,
    totaalOppervlakteHa: 895,
    buurten: [RAW_HOOGEVEEN_BUURTEN[19], RAW_HOOGEVEEN_BUURTEN[20]],
    aliases: ["fluitenberg", "fluitenberg kern", "verspreide huizen fluitenberg", "fluitenbergerweg", "esdorp fluitenberg"],
    description: "Karakteristiek esdorp ten noorden van Hoogeveen met een hechte gemeenschap en prachtig buitengebied."
  },
  // 19. Elim (Kern + Verspreide Huizen Noord/Zuid)
  {
    id: "hg-elim",
    slug: "elim",
    naam: "Elim",
    type: "dorpskern",
    totaalInwoners: 2360,
    totaalOppervlakteHa: 1909,
    buurten: [RAW_HOOGEVEEN_BUURTEN[21], RAW_HOOGEVEEN_BUURTEN[22], RAW_HOOGEVEEN_BUURTEN[23]],
    aliases: ["elim", "elim kern", "verspreide huizen elim", "elim-noord", "elim-zuid", "dorpshuis elim", "perebomenweg"],
    description: "Levendig veendorp ten zuidoosten van Hoogeveen met eigen verenigingsleven, sport en scholen."
  },
  // 20. Hollandscheveld (Kern + Verspreide Huizen West/Oost)
  {
    id: "hg-hollandscheveld",
    slug: "hollandscheveld",
    naam: "Hollandscheveld",
    type: "dorpskern",
    totaalInwoners: 4390,
    totaalOppervlakteHa: 2227,
    buurten: [RAW_HOOGEVEEN_BUURTEN[24], RAW_HOOGEVEEN_BUURTEN[25], RAW_HOOGEVEEN_BUURTEN[26]],
    aliases: ["hollandscheveld", "hollandscheveld kern", "hollanscheveld", "verspreide huizen hollandscheveld", "schoonhoven hollandscheveld", "hoekje hollandscheveld"],
    description: "Grootste buitendorp van Hoogeveen met rijk verenigingsleven, recreatiegebied Schoonhoven en bloeiende middenstand."
  },
  // 21. Noordscheschut (Kern + Verspreide Huizen)
  {
    id: "hg-noordscheschut",
    slug: "noordscheschut",
    naam: "Noordscheschut",
    type: "dorpskern",
    totaalInwoners: 2140,
    totaalOppervlakteHa: 474,
    buurten: [RAW_HOOGEVEEN_BUURTEN[27], RAW_HOOGEVEEN_BUURTEN[28]],
    aliases: ["noordscheschut", "noordsche schut", "noordscheschut kern", "verspreide huizen noordscheschut", "sluis noordscheschut", "drostenraai"],
    description: "Sfeervol kanaaldorp langs de Verlengde Hoogeveense Vaart met historische schutsluis."
  },
  // 22. Nieuwlande (Kern + Verspreide Huizen)
  {
    id: "hg-nieuwlande",
    slug: "nieuwlande",
    naam: "Nieuwlande",
    type: "dorpskern",
    totaalInwoners: 1370,
    totaalOppervlakteHa: 763,
    buurten: [RAW_HOOGEVEEN_BUURTEN[29], RAW_HOOGEVEEN_BUURTEN[30]],
    aliases: ["nieuwlande", "nieuwlande kern", "verspreide huizen nieuwlande", "yad vashem nieuwlande", "onderduikersmuseum nieuwlande", "johannes post"],
    description: "Historisch dorp bekend om het gezamenlijke onderduikersverzet in WOII, onderscheiden met Yad Vashem."
  },
  // 23. Nieuweroord (Kern + Verspreide Huizen)
  {
    id: "hg-nieuweroord",
    slug: "nieuweroord",
    naam: "Nieuweroord",
    type: "dorpskern",
    totaalInwoners: 900,
    totaalOppervlakteHa: 741,
    buurten: [RAW_HOOGEVEEN_BUURTEN[31], RAW_HOOGEVEEN_BUURTEN[32]],
    aliases: ["nieuweroord", "nieuweroord kern", "verspreide huizen nieuweroord", "middenraai nieuweroord"],
    description: "Lintdorp ten oosten van Hoogeveen aan de Middenraai met actieve dorpsvereniging."
  },
  // 24. Tiendeveen (Kern + Verspreide Huizen)
  {
    id: "hg-tiendeveen",
    slug: "tiendeveen",
    naam: "Tiendeveen",
    type: "dorpskern",
    totaalInwoners: 680,
    totaalOppervlakteHa: 824,
    buurten: [RAW_HOOGEVEEN_BUURTEN[33], RAW_HOOGEVEEN_BUURTEN[34]],
    aliases: ["tiendeveen", "tiendeveen kern", "verspreide huizen tiendeveen", "dorpshuis tiendeveen"],
    description: "Vriendelijk veendorp aan de rand van het Drents heide- en hoogveengebied."
  },
  // 25. Stuifzand (Kern + Verspreide Huizen)
  {
    id: "hg-stuifzand",
    slug: "stuifzand",
    naam: "Stuifzand",
    type: "dorpskern",
    totaalInwoners: 630,
    totaalOppervlakteHa: 764,
    buurten: [RAW_HOOGEVEEN_BUURTEN[35], RAW_HOOGEVEEN_BUURTEN[36]],
    aliases: ["stuifzand", "stuifzand kern", "verspreide huizen stuifzand", "boswachterij stuifzand"],
    description: "Landelijk dorp noordelijk van Hoogeveen omgeven door bos- en natuurgebieden."
  },
  // 26. Pesse (Kern + Verspreide Huizen Oost/West/Zuid)
  {
    id: "hg-pesse",
    slug: "pesse",
    naam: "Pesse",
    type: "dorpskern",
    totaalInwoners: 1790,
    totaalOppervlakteHa: 2129,
    buurten: [RAW_HOOGEVEEN_BUURTEN[37], RAW_HOOGEVEEN_BUURTEN[38], RAW_HOOGEVEEN_BUURTEN[39], RAW_HOOGEVEEN_BUURTEN[40]],
    aliases: ["pesse", "pesse kern", "kano van pesse", "verspreide huizen pesse", "pesse-oost", "pesse-west", "pesse-zuid", "oostering pesse"],
    description: "Oudste esdorp van Drenthe, wereldberoemd om de Kano van Pesse (oudste boot ter wereld) en knooppunt aan de A28."
  },
  // 27. Nieuw-Moscou & Zuideropgaande
  {
    id: "hg-nieuw-moscou",
    slug: "nieuw-moscou",
    naam: "Nieuw-Moscou / Zuideropgaande",
    type: "dorpskern",
    totaalInwoners: 570,
    totaalOppervlakteHa: 198,
    buurten: [RAW_HOOGEVEEN_BUURTEN[41]],
    aliases: ["nieuw moscou", "nieuw-moscou", "zuideropgaande nieuw moscou", "zuideropgaande"],
    description: "Karakteristieke buurtschap ten zuiden van Elim langs het Zuideropgaande."
  },
  // 28. Industrieterreinen Hoogeveen (Buitenvaart, Toldijk, Noord A/B)
  {
    id: "hg-industrie",
    slug: "industriegebieden",
    naam: "Industriegebieden (Buitenvaart, Toldijk, De Wieken / Noord)",
    type: "industrie",
    totaalInwoners: 500,
    totaalOppervlakteHa: 606,
    buurten: [RAW_HOOGEVEEN_BUURTEN[42], RAW_HOOGEVEEN_BUURTEN[43], RAW_HOOGEVEEN_BUURTEN[44], RAW_HOOGEVEEN_BUURTEN[45]],
    aliases: ["buitenvaart", "industriegebied buitenvaart", "bedrijventerrein buitenvaart", "toldijk", "industriegebied toldijk", "industriegebied noord", "de wieken hoogeveen", "vliegveld hoogeveen", "bedrijvenpark hoogeveen"],
    description: "De economische motor van Hoogeveen met toonaangevende bedrijventerreinen, maakindustrie, logistiek en vliegveld Hoogeveen."
  },
  // 29. Alteveer
  {
    id: "hg-alteveer",
    slug: "alteveer",
    naam: "Alteveer",
    type: "buitengebied",
    totaalInwoners: 190,
    totaalOppervlakteHa: 546,
    buurten: [RAW_HOOGEVEEN_BUURTEN[46]],
    aliases: ["alteveer", "verspreide huizen alteveer", "buurtschap alteveer"],
    description: "Landelijk buitengebied ten zuiden van Hoogeveen."
  },
  // 30. Nijstad
  {
    id: "hg-nijstad",
    slug: "nijstad",
    naam: "Nijstad",
    type: "buitengebied",
    totaalInwoners: 100,
    totaalOppervlakteHa: 120,
    buurten: [RAW_HOOGEVEEN_BUURTEN[47]],
    aliases: ["nijstad", "verspreide huizen nijstad", "strand nijstad", "paviljoen nijstad", "plas nijstad"],
    description: "Bekend recreatie- en natuurgebied ten zuidwesten van Hoogeveen met strand, duiklocatie en buitengebied."
  }
];

// Generieke termen die NOOIT als wijk mogen worden aangemerkt (voorkomt false positives)
export const BANNED_HOOGEVEEN_TERMS = new Set([
  "hoogeveen",
  "gemeente hoogeveen",
  "stad hoogeveen",
  "algemeen",
  "geen",
  "onbekend",
  "gemeentebreed",
  "drenthe",
  "provincie drenthe"
]);

/**
 * Detecteert de juiste geaggregeerde Hoogeveen wijken/kernen op basis van titel, entiteiten en tekst.
 */
export function detectHoogeveenWijken(
  title?: string,
  entities?: string,
  existingWijk?: string,
  text?: string
): string[] {
  const detected = new Set<string>();
  const titleLower = (title || "").toLowerCase();

  // 1. Directe controle tegen titels
  for (const wijk of HOOGEVEEN_WIJKEN_MATRIX) {
    for (const alias of wijk.aliases) {
      const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (pattern.test(titleLower)) {
        detected.add(wijk.naam);
        break;
      }
    }
  }

  if (detected.size > 0) {
    return Array.from(detected);
  }

  // 2. Controle entiteiten
  const entitiesLower = (entities || "").toLowerCase();
  for (const wijk of HOOGEVEEN_WIJKEN_MATRIX) {
    for (const alias of wijk.aliases) {
      const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (pattern.test(entitiesLower)) {
        detected.add(wijk.naam);
        break;
      }
    }
  }

  if (detected.size > 0) {
    return Array.from(detected);
  }

  // 3. Bestaande tag matchen naar de geaggregeerde structuur
  if (existingWijk && existingWijk.trim() && existingWijk !== "Geen" && existingWijk !== "Gemeentebreed") {
    const parts = existingWijk.split(",").map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
      const pLower = p.toLowerCase();
      if (BANNED_HOOGEVEEN_TERMS.has(pLower)) continue;

      let match = HOOGEVEEN_WIJKEN_MATRIX.find((w) => w.naam.toLowerCase() === pLower || w.slug === pLower);
      if (!match) {
        match = HOOGEVEEN_WIJKEN_MATRIX.find((w) =>
          pLower.includes(w.naam.toLowerCase()) ||
          w.aliases.some((a) => pLower.includes(a.toLowerCase()))
        );
      }
      if (match) detected.add(match.naam);
    }
  }

  // 4. Tekstuele fallback in eerste 1500 karakters
  if (detected.size === 0 && text && text.trim().length > 0) {
    const sample = text.substring(0, 1500).toLowerCase();
    for (const wijk of HOOGEVEEN_WIJKEN_MATRIX) {
      for (const alias of wijk.aliases) {
        if (alias.length <= 4) continue;
        const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (pattern.test(sample)) {
          detected.add(wijk.naam);
          break;
        }
      }
      if (detected.size >= 2) break;
    }
  }

  return Array.from(detected);
}
