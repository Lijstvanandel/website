// Volledig partijprogramma Hoogeveen
// Zorgvuldig vastgesteld met dezelfde syntax en interface als Steenwijkerland.

export interface Standpunt {
  nr: number;
  titel: string;
  standpunt: string;
  verdieping: string;
  bijdragen: number;
  videos?: { url: string; titel?: string }[];
  bronnen: string[];
}

export interface Hoofdstuk {
  nr: number;
  titel: string;
  iconKey: string;
  intro: string;
  standpunten: Standpunt[];
}

const placeholderVerdieping = (titel: string) =>
  `Dit standpunt — "${titel}" — vraagt om context. Hier komt achtergrondinformatie, voorbeelden uit Hoogeveen en de onderbouwing van de fractie. Tekst wordt nog aangevuld.`;

const placeholderBronnen = (titel: string): string[] => [
  `Fractie Hoogeveen. (2025). Verkiezingsprogramma 2026–2030: ${titel}. Hoogeveen: Fractie Hoogeveen.`,
  `Gemeente Hoogeveen. (2024). Beleidsstukken en raadsbesluiten. Geraadpleegd via https://www.hoogeveen.nl`,
];

const mk = (nr: number, titel: string, standpunt: string, videos?: { url: string; titel?: string }[]): Standpunt => ({
  nr,
  titel,
  standpunt,
  verdieping: placeholderVerdieping(titel),
  bijdragen: videos?.length ?? 0,
  videos,
  bronnen: placeholderBronnen(titel),
});

export const hoofdstukkenHoogeveen: Hoofdstuk[] = [
  {
    nr: 1,
    titel: "Democratie, Bestuur & Financiën",
    iconKey: "vote",
    intro:
      "Het lokaal bestuur moet betrouwbaar, transparant en financieel gezond zijn. We pleiten voor strikte financiële discipline, minder regeldruk en echte burgerparticipatie vooraf in plaats van achteraf.",
    standpunten: [
      mk(
        1,
        "Transparant en sober financieel beleid",
        "Wij pleiten voor strikte begrotingsdiscipline, lagere OZB en het terugdringen van de inzet van dure externe consultants."
      ),
      mk(
        2,
        "Echte burgerparticipatie",
        "Inwoners en dorps/wijkraden moeten vroegtijdig en wezenlijk betrokken worden bij grote ruimtelijke en maatschappelijke plannen."
      ),
      mk(
        3,
        "Focus op basistaken en onderhoud",
        "Eerst moeten de basisvoorzieningen, wegen en het groenonderhoud vlekkeloos op orde zijn voordat we investeren in prestigeprojecten."
      )
    ]
  },
  {
    nr: 2,
    titel: "Veiligheid & Handhaving",
    iconKey: "shield",
    intro:
      "Iedereen in Hoogeveen moet zich veilig voelen op straat, thuis en in de eigen wijk. Dit vereist zichtbare handhaving en een effectieve aanpak van overlast.",
    standpunten: [
      mk(
        1,
        "Meer blauw en handhaving op straat",
        "Zichtbaar toezicht in de dorpskernen, parken, stationsgebied en buurten om vandalisme en diefstal effectief tegen te gaan."
      ),
      mk(
        2,
        "Aanpak overlast en asociaal gedrag",
        "Lik-op-stuk beleid tegen jeugdoverlast, overlast door specifieke groepen of raddraaiers in de openbare ruimte."
      ),
      mk(
        3,
        "Verbeteren openbare verlichting",
        "Actief investeren in goede straatverlichting langs fietspaden, donkere tunnels en in woonwijken ter bevordering van de sociale veiligheid."
      )
    ]
  },
  {
    nr: 3,
    titel: "Wonen, Bouwen & Leefbaarheid",
    iconKey: "home",
    intro:
      "Versnellen van de woningbouw met prioriteit voor starters, jonge gezinnen en senioren. Bouwen moet mogelijk zijn in alle kernen van de gemeente Hoogeveen.",
    standpunten: [
      mk(
        1,
        "Betaalbare koop- en starterswoningen",
        "Gerichte woningbouw voor onze eigen jeugd en starters om hen voor de gemeente te behouden."
      ),
      mk(
        2,
        "Levensloopbestendig bouwen voor senioren",
        "Investeren in nultredenwoningen en geclusterd wonen (zoals Knarrenhoven) om doorstroming op de woningmarkt te stimuleren."
      ),
      mk(
        3,
        "Bouwen en splitsen versoepelen",
        "Soepelere procedures voor woningsplitsing, premantelzorgwoningen en kleinschalige inbreiding in de buitendorpen."
      )
    ]
  },
  {
    nr: 4,
    titel: "Zorg, Welzijn & Sport",
    iconKey: "heart",
    intro:
      "Een zorgzame samenleving met laagdrempelige ondersteuning. Geen overbodige bureaucratie in de WMO of jeugdzorg, en krachtige steun voor dorpshuizen en sportclubs.",
    standpunten: [
      mk(
        1,
        "Laagdrempelige en bureaucratievrije WMO",
        "Inwoners met een hulpvraag moeten snel en menselijk worden geholpen zonder ingewikkelde formulieren of lange wachtlijsten."
      ),
      mk(
        2,
        "Behoud en ondersteuning van Dorps- en Buurthuizen",
        "Dorpshuizen en ontmoetingsplekken zijn het cement van de sociale cohesie en moeten financieel en operationeel ondersteund worden."
      ),
      mk(
        3,
        "Investeren in sportaccommodaties",
        "Goede en betaalbare sport- en zwemvoorzieningen in de gemeente om sporten voor iedereen toegankelijk te houden."
      )
    ]
  },
  {
    nr: 5,
    titel: "Milieu, Landschap & Energie",
    iconKey: "leaf",
    intro:
      "Klimaat- en energiebeleid met gezond verstand. Geen megawindturbines in de buurt van woonwijken en geen vruchtbare landbouwgrond opofferen aan zonnevelden.",
    standpunten: [
      mk(
        1,
        "Nee tegen megawindturbines",
        "Wij verzetten ons tegen megawindturbines in onze directe leefomgeving wegens horizonvervuiling en gezondheidsrisico's."
      ),
      mk(
        2,
        "Zon op daken en carports eerst",
        "Eerst daken en parkeerplaatsen volleggen met zonnepanelen voordat waardevolle landbouwgrond of natuurgebieden worden opgeofferd."
      ),
      mk(
        3,
        "Behoud en versterken van het Drentse landschap",
        "Bescherming van de unieke openheid, biodiversiteit en natuurwaarden van de Drentse dorpen en buitengebieden."
      )
    ]
  }
];
