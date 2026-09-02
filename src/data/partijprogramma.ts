// Volledig partijprogramma — overgenomen uit Partijprogramma.txt
// 'Forum voor Democratie' is overal vervangen door 'Lijst van Andel'.

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
  `Dit standpunt — "${titel}" — vraagt om context. Hier komt achtergrondinformatie, voorbeelden uit Steenwijkerland en de onderbouwing waarom Lijst van Andel deze keuze maakt. Tekst wordt nog aangevuld.`;

const placeholderBronnen = (titel: string): string[] => [
  `Lijst van Andel. (2025). Partijprogramma 2026–2030: ${titel}. Steenwijk: Lijst van Andel.`,
  `Gemeente Steenwijkerland. (2024). Beleidsstukken en raadsbesluiten. Geraadpleegd via https://www.steenwijkerland.nl`,
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

export const hoofdstukken: Hoofdstuk[] = [
  {
    nr: 1,
    titel: "Democratie, Bestuur & Lokale Autonomie",
    iconKey: "vote",
    intro:
      'De gemeente is de bestuurslaag die het dichtst bij de inwoners staat. Juist daarom is het onacceptabel dat besluiten steeds vaker buiten het zicht van de gemeenteraad en zonder echte inspraak van inwoners tot stand komen. We zien dat de afstand tussen lokaal bestuur en burgers de afgelopen jaren fors is toegenomen. Lokale democratie is uitgehold door dichtgetimmerde coalitieakkoorden, schijnparticipatie en een bestuurlijke cultuur waarin verantwoordelijkheid wordt afgeschoven op "Den Haag", "Europa" of "consensus" binnen samenwerkingsverbanden waar niemand direct zeggenschap over heeft.\n\nLijst van Andel wil de gemeente weer teruggeven aan haar inwoners. Dat betekent transparant bestuur en directe inspraak van inwoners. De gemeenteraad moet weer het hart van de besluitvorming zijn, en niet een doorgeefluik voor reeds vastgestelde plannen. Bestuurders en politici moeten zich verantwoorden tegenover de kiezer, niet tegenover bovenlokale overlegtafels of ambtelijke en bestuurlijke netwerken. <b> Hier vallen ook bovenlokale partijbesturen onder.</b>\n\nLokale autonomie is daarbij essentieel. Gemeenten zijn geen doorgeefluik van landelijk beleid, maar zelfstandige gemeenschappen met een eigen identiteit, politieke prioriteiten en verantwoordelijkheden. Lijst van Andel staat voor een dienstbare gemeente die keuzes durft te maken en de lokale democratie herstelt.',
    standpunten: [
      mk(
        1,
        "Een bindend lokaal referendum",
        "Wij voeren bindende referenda in, zodat inwoners zich rechtstreeks kunnen uitspreken over belangrijke politieke besluiten. Onze huidige raadgevende verordening is volgens ons onvoldoende en moet worden omgezet naar een bindend referendum.",
      ),
      mk(
        2,
        "Een direct gekozen burgemeester",
        "Wij laten de burgemeester rechtstreeks verkiezen, zodat deze zich echt moet verantwoorden richting de inwoners.",
      ),
      mk(
        3,
        "Echte burgerparticipatie",
        "Wij maken een einde aan schijnparticipatie: inwoners worden betrokken vóórdat plannen vaststaan, niet achteraf als formaliteit. Wij organiseren ook wijk- of dorpsraden waar dat gewenst is.",
      ),
      mk(
        4,
        "Een focus op kerntaken",
        "De gemeente doet waarvoor ze bedoeld is: eerst de basis op orde, dan pas nieuw beleid.",
      ),
      mk(
        5,
        "Akkoorden op hoofdlijnen",
        "Wij stoppen met dichtgetimmerde coalitieakkoorden en werken met wisselende meerderheden, akkoorden op hoofdlijnen en vakwethouders, zodat de gemeenteraad weer kan doen waarvoor zij is gekozen: open debat en inhoudelijke afwegingen.",
      ),
      mk(
        6,
        "Lokale autonomie herstellen",
        "De gemeente is geen doorgeefluik van landelijk of Europees beleid. Wij verzetten ons tegen landelijk opgelegde dwang, zoals de spreidingswet, asielquota, klimaatbeleid en verplichte gemeentelijke herindelingen.",
      ),
      mk(
        7,
        "Lokaal zeggenschap in regionale samenwerking",
        "Wij nemen alleen deel aan (regionale) samenwerkingsverbanden waarin onze gemeente volwaardige invloed heeft. We stappen uit constructies die worden gedomineerd door andere gemeenten of waarin ongewenst beleid zonder lokaal draagvlak wordt doorgedrukt. In onze gemeente geldt dit voor de Regionale Energiestrategie West-Overijssel.",
      ),
      mk(
        8,
        "Afstand van globalistisch beleid",
        "Wij hanteren geen globalistische agenda's, zoals de Sustainable Development Goals, als sturend kader voor gemeentelijk beleid.",
      ),
      mk(
        9,
        "Geen SDG's in beleid",
        "Wij willen dat Steenwijkerland stopt met het voeren van de programmabegrotingen naar de maatstaven van de Sustainable Development Goals van de Verenigde Naties.",
      ),
      mk(
        10,
        "Geen diversiteitsbeleid bij de lokale overheid",
        "We hanteren nooit quota, (semi-)verplichte trainingen of diversiteitsbeleid in de gemeente en de ambtelijke organisatie. Kwaliteit en geschiktheid worden weer leidend.",
      ),
      mk(
        11,
        "Geen subsidie voor activistische organisaties",
        "We zetten geldstromen naar ideologisch of activistisch gekleurde organisaties stop.",
      ),
      mk(
        12,
        "Verantwoordelijke financiën",
        "Wij stoppen met miljoenenverslindende prestigeprojecten zonder publiek nut en zonder economisch rendement. Grote projecten krijgen heldere budgetten en harde termijnen.",
      ),
      mk(
        13,
        "Een slanke, betaalbare gemeentelijke organisatie",
        "Wij verkleinen de gemeentelijke organisatie, verminderen externe inhuur, en stoppen met nutteloze onderzoeken van adviesbureaus. Financiële meevallers worden direct vertaald in lastenverlichting voor de burger.",
      ),
      mk(
        14,
        "Gemeentelijke communicatie in het Nederlands",
        "Alle gemeentelijke communicatie is altijd primair in het Nederlands.",
      ),
      mk(
        15,
        "Een toegankelijke, dienstbare gemeente",
        "Gemeentelijke diensten blijven altijd bereikbaar in begrijpelijke taal, en via fysieke loketten en papieren correspondentie. Betalen met contant geld blijft altijd mogelijk bij alle gemeentelijke diensten.",
      ),
      mk(
        16,
        "Een radicaal transparante gemeente",
        "Inwoners moeten eenvoudig kunnen zien wat er wordt besloten en waarom. Er komt een helder en begrijpelijk subsidieregister, en inzicht in politieke besluiten en gemeentelijke financiën.",
      ),
    ],
  },
  {
    nr: 2,
    titel: "Veiligheid & Handhaving",
    iconKey: "shield",
    intro:
      "Zonder veiligheid is er geen vrijheid. Inwoners zien dat de openbare ruimte onveiliger is geworden: meer overlast, meer intimidatie, meer criminaliteit en minder zichtbare handhaving. Tegelijk wordt de politie overbelast met administratie, terwijl gemeentelijke handhaving steeds vaker wordt ingezet als pseudo-politie.\n\nLijst van Andel kiest voor zichtbare, daadkrachtige veiligheid. De straat moet weer van de normale inwoner zijn, niet van overlastgevers, criminelen of intimiderende groepen. Dat vraagt om voldoende politiecapaciteit, politiebureau's terug de wijken in, gerichte inzet van middelen en een duidelijke norm: wie zich misdraagt, wordt aangepakt.\n\nVeiligheid is meer dan repressie alleen. Ook verlichting, inrichting van de openbare ruimte en het voorkomen van problematische opvanglocaties spelen een rol. Preventie waar het werkt, handhaving waar het moet. Geen wegkijken, geen relativeren, maar nuchter, consequent en hard optreden om onze gemeente leefbaar te houden.",
    standpunten: [
      mk(
        1,
        "Meer veiligheid zichtbaar op straat",
        "Wij pleiten voor meer agenten zichtbaar op straat, het heropenen van politiebureaus en het oprichten van nieuwe politieposten in risicogebieden.",
      ),
      mk(
        2,
        "Overlast hard aanpakken",
        "Wij treden keihard op tegen overlastgevende statushouders, intimiderend bedelen, nachtelijke overlast en de bendevorming en straatterreur van groepen hangjongeren. Wij pakken veelplegers en overlastgevers stevig aan, met een two-strikes-aanpak en gebiedsverboden bij herhaling.",
      ),
      mk(
        3,
        "Gericht cameratoezicht",
        "Wij zetten camera's incidenteel en tijdelijk in op probleemlocaties, zodat dit niet uitmondt in grootschalige surveillance.",
      ),
      mk(
        4,
        "Preventief fouilleren waar nodig",
        "Wij maken preventief fouilleren mogelijk in risicogebieden, zodat wapens effectief van de straat worden geweerd. We geven de politie de vrijheid om te profileren op basis van eigen ervaring en inzicht.",
      ),
      mk(
        5,
        "Een heldere scheiding tussen politie en handhaving",
        "Wij houden BOA's bij hun kerntaken. We maken van gemeentelijke handhaving geen 'alternatieve politie', en voorkomen dat BOA's taken of bevoegdheden krijgen die uitsluitend bij volwaardige politie horen.",
      ),
      mk(
        6,
        "Proportionele handhaving",
        "Wij zetten handhaving in voor toezicht en dienstverlening, niet om inkomsten te genereren via boetebeleid.",
        [{ url: "/videos/proportionele-handhaving.mp4", titel: "Bijdrage Lijst van Andel — Proportionele handhaving" }],
      ),
      mk(
        7,
        "Investeren in preventie",
        "We moedigen buurtpreventie aan en versterken de samenwerking tussen politie, scholen en zorginstellingen. We ondersteunen wijkcentra, en stimuleren sport, bijbaantjes, stages en andere constructieve activiteiten om jongeren perspectief te bieden.",
      ),
      mk(
        8,
        "Snelle meldingsopvolging",
        "Wij zorgen dat meldingen van inwoners vlot worden opgepakt, zodat veiligheid voelbaar en zichtbaar wordt.",
      ),
      mk(
        9,
        "Geen risicovolle opvanglocaties in woonwijken",
        "Wij staan geen daklozen- en GGZ-opvanglocaties met verhoogd risico toe in woonwijken of dorpen. Deze leiden structureel tot overlast, onveilige situaties en aantasting van de leefomgeving.",
      ),
      mk(
        10,
        "Meer verlichting op straat",
        "Wij zorgen voor betere verlichting op slecht verlichte straten, tunnels, (sport)parken en fietsroutes, zodat inwoners zich overal veilig kunnen bewegen.",
      ),
      mk(
        11,
        "Strijd tegen drugscriminaliteit",
        "Wij richten ons op het bestrijden van ondermijning, straathandel en drugsoverlast, in samenwerking met politie en wijkteams.",
      ),
    ],
  },
  {
    nr: 3,
    titel: "Asiel, Migratie & Integratie",
    iconKey: "globe",
    intro:
      "De gevolgen van de massale immigratie worden gevoeld in onze gemeente. Op de woningmarkt, in de zorg, op scholen en in de openbare ruimte. Gemeenten worden geconfronteerd met opvangverplichtingen, druk op voorzieningen, onveiligheid en sociale spanningen, terwijl inwoners hier nooit om hebben gevraagd.\n\nLijst van Andel vindt dat de gemeente grenzen moet stellen. Lokale voorzieningen zijn er in de eerste plaats voor de eigen gemeenschap. Wij verzetten ons tegen gedwongen opvang, spreiding, voorrang voor statushouders, en sluiten alle AZC's en opvanglocaties.\n\nIntegratie is geen vrijblijvend proces. Wie hier woont, past zich aan aan de Nederlandse taal, normen en gebruiken. Alleen zo blijft de gemeente leefbaar voor iedereen.",
    standpunten: [
      mk(
        1,
        "Geen nieuwe AZC's of (nood)opvangcentra",
        "Wij staan geen opvanglocaties toe, om de gemeente te beschermen tegen stelselmatige onveiligheid, overlast en druk op voorzieningen.",
      ),
      mk(
        2,
        "Sluiting van alle bestaande opvanglocaties",
        "Wij sluiten de opvanglocatie aan de Broekslagen aan het Groot-verlaat die af en toe gebruikt wordt om asielzoekers op te vangen tijdens Truckstar en/of TT-festival in Assen.",
      ),
      mk(
        3,
        "Geen verplichte opvang vanuit Den Haag",
        "Wij verzetten ons tegen de uitvoering van de spreidingswet, en alle andere landelijke dwang om extra asielzoekers of statushouders te plaatsen in onze gemeente.",
      ),
      mk(
        4,
        "Aanpak van overlast door asielzoekers",
        "Wij treden streng op tegen overlastgevende asielzoekers en veiligelanders, met gebiedsverboden en directe handhaving bij herhaling.",
      ),
      mk(
        5,
        "Zelfstandige regie",
        "Wij verbreken alle banden die de gemeente heeft met migratiebevorderende organisaties zoals het COA, Vluchtelingenwerk of GZA.",
      ),
      mk(
        6,
        "Lokale binding bij huisvesting",
        "Wij geven inwoners uit de eigen gemeente voorrang op sociale huur en betaalbare koop. Voorrang voor statushouders wordt afgeschaft.",
      ),
      mk(
        7,
        "Grip op bevolkingsontwikkeling",
        "We hebben oog voor de mogelijke negatieve effecten van grootschalige huisvesting van tijdelijke arbeidsmigranten. We zetten ons in om verdringing op de woningmarkt te voorkomen, de druk op voorzieningen te beperken en de sociale samenhang in onze gemeente te behouden.",
      ),
      mk(
        8,
        "Tijdelijke opvang met eigen verantwoordelijkheid",
        "Oekraïense vluchtelingen betalen mee aan hun eigen opvang. Deze opvang wordt afgebouwd, met oog op het aflopen van het conflict.",
      ),
      mk(
        9,
        "Geen activistische integratieprojecten",
        "Wij schrappen ideologische projecten en subsidies die zich richten op 'wederzijdse' integratie. Nieuwkomers assimileren in de lokale en nationale cultuur.",
      ),
    ],
  },
  {
    nr: 4,
    titel: "Identiteit, Cultuur & Erfgoed",
    iconKey: "landmark",
    intro:
      "Een gemeente is meer dan een bestuurlijke laag. Het is een gemeenschap met een eigen geschiedenis, karakter en identiteit. Juist in een tijd van voortdurende schaalvergroting, standaardisering en generiek beleid is het van belang om vast te houden aan wat een plek eigen maakt.\n\nDe stadsrechten van Vollenhove in 1354, het eerste beleg van Steenwijk in 1580, de stichting van Willemsoord als kolonie van weldadigheid in 1820 en de film Fanfare van Bert Haanstra. Het is een greep uit het cultuurhistorisch verleden van Steenwijkerland. Wij moeten dit koesteren.\n\nLijst van Andel staat voor cultuur die gedragen en gewaardeerd wordt door inwoners zelf. Door ruimte te geven aan lokale culturele initiatieven en evenementen, helpen we de lokale gemeenschapszin te groeien. Erfgoed, lokale geschiedenis en tijdloze architectuur dragen allemaal bij aan trots en verbondenheid.",
    standpunten: [
      mk(
        1,
        "Weerbare Nederlandse en lokale tradities",
        "Wij beschermen en bevorderen belangrijke feestdagen, zoals Sinterklaas met Zwarte Piet of Oud en Nieuw met vuurwerk, en lokale vieringen en tradities, zoals de gondelvaart in Belt-schutsloot, Dicky Woodstock in Steenwijkerwold of Tik Van De Meule in Vollenhove, zonder ideologische aanpassingen.",
      ),
      mk(
        2,
        "Nieuwe tradities",
        "Wij versterken de eigen identiteit van onze gemeente door lokale evenementen, symbolen en tradities te ontwikkelen die inwoners verbinden en trots geven op hun woonplaats.",
      ),
      mk(
        3,
        "Behoud van streektaal en dialect",
        "Wij beschermen het Stellingwerfs en andere lokale taalvarianten, en bevorderen hun gebruik.",
      ),
      mk(
        4,
        "Bescherming van straatnamen en monumenten",
        "Wij behouden historische straatnamen, standbeelden en gedenktekens die eer doen aan de vaderlandse geschiedenis tegen ideologische herinterpretatie.",
      ),
      mk(
        5,
        "Ruimte voor lokale evenementen en verenigingen",
        "Wij versoepelen vergunningseisen voor evenementen, markten en buurtactiviteiten. Zo geven we ruimte aan het gemeenschapsleven en de lokale cultuur.",
      ),
      mk(
        6,
        "Cultuurroutes langs iconen van onze gemeente",
        "Wij ontwikkelen (digitale) wandel- en fietsroutes langs historische plekken en monumenten in onze gemeente.",
      ),
      mk(
        7,
        "Ondersteuning van lokale verenigingen",
        "Wij versterken muziek-, sport-, buurt- en cultuurverenigingen die bijdragen aan gemeenschapsvorming.",
      ),
      mk(
        8,
        "Investeren in historisch erfgoed",
        "Wij zetten in op het behoud, herstel en openstelling van historische gebouwen en ander cultureel erfgoed. We zijn zeer terughoudend in de sloop of ingrijpende aanpassingen van gebouwen van voor de Tweede Wereldoorlog. Zelfs bij bouwvallen altijd eerst kijken naar renovatie.",
      ),
      mk(
        9,
        "Culturele ruimte voor vakmanschap en ambacht",
        "Wij ondersteunen initiatieven die lokale tradities, historische ambachten en cultuurhistorisch erfgoed levend houden. De historische vereniging van Ijsselham, stadsmuseum Vollenhove en de Historische Vereniging Steenwijk zijn voorbeelden van organisaties die zich actief bezighouden met het documenteren van cultuurhistorisch erfgoed van de gemeenschappen, en geven ook lezingen over ingrijpende gebeurtenissen in de gemeente. Wij ondersteunen deze initiatieven.",
      ),
      mk(
        10,
        "Kerkklokken beschermen",
        "Wij willen het monumentale geluid van kerkklokken, klokkenspelen en carillons beschermen.",
      ),
      mk(
        11,
        "Behoud van dorps- en stads karakters",
        "Wij beschermen het karakter van dorpen en historische wijken tegen massale nieuwbouw, hoogbouw en modernistische bouwexperimenten. Wij vinden het belangrijk dat de cultuurhistorische waarden en karakteristieke punten zoals Park Rams Woerthe in Steenwijk of de bierkade in Blokzijl niet verdwijnen tussen nieuwbouw of hoogbouw.",
      ),
      mk(
        12,
        "Traditionele architectuur stimuleren",
        "Wij stimuleren bouwstijlen die passen bij de lokale identiteit, historische structuur en de traditionele principes van de architectuur, in plaats van monotone, modernistische hoogbouw.",
      ),
      mk(
        13,
        "NS station Steenwijk herstellen",
        "Wij willen het oude NS station van Steenwijk in ere herstellen. Het huidige station dat in 1973 is opgeleverd is wat ons betreft geen representatief beeld voor onze prachtige gemeente.",
      ),
      mk(
        14,
        "Een aangename openbare ruimte",
        "Wij plaatsen kunst in de openbare ruimte die past bij de lokale cultuur, de smaakbeleving van inwoners en bijdraagt aan een prettige, aantrekkelijke leefomgeving: geen vervreemdende moderne kunst. De selectie voor kunst in de publieke ruimte moet worden herzien. Bijvoorbeeld de moderne kunst rondom het station van Steenwijk. Voor woke-kunst is er geen plek in Steenwijkerland.",
      ),
      mk(
        15,
        "Openbare kunst geworteld in onze geschiedenis",
        "Wij versterken de openbare ruimte met kunst en monumenten die lokale helden, tradities en historische momenten zichtbaar maken.",
      ),
      mk(
        16,
        "Lokale identiteit zichtbaar maken",
        "Wij plaatsen de gemeentelijke vlag en lokale symbolen op prominente plekken, zodat inwoners zich herkennen in hun eigen stad of dorp.",
      ),
      mk(
        17,
        "Geen activistische symbolen in de openbare ruimte",
        "Wij plaatsen geen regenboogzebrapaden of politieke vlaggen in de openbare ruimte; de gemeente voert uitsluitend neutrale en algemeen gedragen symbolen zoals de Nederlandse, provinciale en gemeentelijke vlag. Wij willen daarom ook stoppen met het ophangen van de regenboogvlag aan de iconische Steenwijker Toren.",
      ),
      mk(
        18,
        "Geen regenbooggemeente en diversiteitsbeleid",
        "Wij zeggen onze status als regenbooggemeente op en saneren gemeentelijke afdelingen voor diversiteit en inclusie.",
      ),
      mk(
        19,
        "Subsidies met aantoonbare waarde",
        "Wij verstrekken alleen subsidies aan projecten met een duidelijke sociale of economische meerwaarde voor onze gemeente. Er gaat geen gemeentelijk geld naar organisaties, projecten en campagnes die gericht zijn op 'diversiteit', 'inclusie' of andere links-activistische doelstellingen.",
      ),
      mk(
        20,
        "Steun voor de bibliotheek",
        "Wij zien de bibliotheek als basisvoorziening voor ontmoeting, kennis en cultuur. Wij pleiten daarom voor een breder aanbod in de bibliotheken in Steenwijkerland, dat iedere inwoner aanspreekt. Wij stimuleren ook buurtinitiatieven zoals straatbibliotheken en minibiebs.",
      ),
    ],
  },
  {
    nr: 5,
    titel: "Wonen, Bouwen & Ruimtelijke Ontwikkeling",
    iconKey: "home",
    intro:
      "De woningnood raakt ook onze gemeente. Starters kunnen geen woning vinden, gezinnen zitten klem en ouderen blijven noodgedwongen in te grote woningen wonen. Tegelijk wordt bouwen vertraagd door regels, procedures en verduurzamingseisen die weinig met wonen zelf te maken hebben.\n\nEen voorbeeld is daarvan de dorpsvisie van Oldemarkt 2020-2025. Hoewel er geen woord wordt gedeeld over de bouw van windturbines in de dorpsvisie, is het dorp wel geconfronteerd met de mogelijke bouw daarvan in 2025. Dat terwijl aan andere punten uit de dorpsvisie zoals woningbouw geen aandacht wordt besteed.\n\nEen andere bureaucratische casus heeft zich afgespeeld in Giethoorn, waar Gieters Belang pleit voor woningbouw in Noord. De woningnood wordt niet opgepakt met de inwoners, maar wordt in plaats daarvan geconfronteerd met een web van bureaucratie.\n\nLijst van Andel kiest voor bouwen met gezond verstand. Minder drempels, meer woningen, passend bij de schaal en het karakter van de omgeving. Geen koude massabouw, maar herkenbare wijken. Zo bouwen we een thuis voor elke inwoner.",
    standpunten: [
      mk(
        1,
        "Voorrang voor inwoners met lokale binding",
        "Wij zorgen dat inwoners uit onze gemeente als eerste in aanmerking komen voor sociale huur én betaalbare koop. Wij willen dat iedereen uit Steenwijkerland, ook de kans krijgt om in Steenwijkerland te blijven wonen. Inwoners krijgen voorrang op woningen in hun eigen kern. Daarmee neemt Steenwijkerland afscheid van de Verstedelijkingsstrategie 'Warme harten in een klimaatadaptieve Delta' (2023).",
      ),
      mk(
        2,
        "Geen voorrang voor statushouders",
        "Wij schaffen de urgentiestatus en voorrangsregelingen voor statushouders bij de toewijzing van sociale huurwoningen volledig af.",
      ),
      mk(
        3,
        "Meer betaalbare koopwoningen",
        "Wij bouwen vooral woningen voor starters, gezinnen en middeninkomens, zodat huiseigenaarschap weer bereikbaar wordt.",
      ),
      mk(
        4,
        "Een gezonde huurmarkt",
        "Wij streven naar een huurmarkt waarin vraag en aanbod beter op elkaar aansluiten, met voldoende ruimte voor middenhuur en particuliere verhuur. Sociale huur moet een vangnet blijven voor wie dat nodig heeft, geen permanente afhankelijkheid.",
      ),
      mk(
        5,
        "Transformatie van leegstand naar woonruimte",
        "Wij faciliteren de ontwikkelaars die leegstaande bedrijfs- en kantoorpanden willen transformeren naar woningen. Dit voorkomt verloedering, benut bestaande structuren en levert naast nieuwbouw snel woonruimte op.",
      ),
      mk(
        6,
        "Doorstroming van ouderen faciliteren",
        "Wij faciliteren de bouw van seniorenwoningen, levensloopbestendige woningen, generatiewoningen en 'knarrenhofjes', zodat gezinswoningen vrijkomen in bestaande wijken.",
      ),
      mk(
        7,
        "Renovatie zonder onbetaalbare dwang",
        "Wij behouden bestaande woningen en wijken, zonder gedwongen verduurzamingsmaatregelen zoals verplichte warmtepompen of zonnepanelen.",
      ),
      mk(
        8,
        "Bescherming van iconische dorps- en stadsgezichten",
        "Wij koesteren waardevolle historische aanzichten en groenstructuren en herstellen ze waar deze zijn aangetast, zodat het karakter van onze gemeente behouden blijft.",
      ),
      mk(
        9,
        "Traditionele, menselijke architectuur",
        "Bij nieuwbouw passen wij traditionele architectuur en planologie toe, met vakwerk, organische materialen en kleinschalige wijken, in plaats van koude massabouw. Wij willen leefbare wijken op kleine schaal en in klassieke stijl.",
      ),
      mk(
        10,
        "Geen hoogbouw waar het niet past",
        "Wij bouwen geen massale flatgebouwen en woontorens die de leefbaarheid of het karakter van de omgeving aantasten, en bovendien een minder dichte vorm van bebouwing zijn dan traditionele woonblokken. Steenwijkerland is bij uitstek een gemeente die zich onderscheidt in relatieve laagbouw, en dat houden wij. Het karakter van Steenwijkerland moet behouden blijven.",
      ),
      mk(
        11,
        "Warm straatlicht als standaard",
        "Straatlicht met warme, geel-oranje tinten wordt gehandhaafd en waar nodig hersteld. Toepassing van koud, blauw LED-licht wordt vermeden vanwege negatieve effecten op leefkwaliteit, gezondheid (slaapritme) en de natuurlijke omgeving.",
      ),
      mk(
        12,
        "Behoud van groen voor leefkwaliteit",
        "Wij beschermen parken, plantsoenen en waterstructuren en integreren groen in elke nieuwe wijk. We behouden zoveel mogelijk groen en natuur bij woningbouwprojecten. We behouden volkstuincomplexen en breiden deze uit waar de vraag groeit. Wij willen dan ook dat onze parken zoals Ramswoerthe of Old Ruitenborgh goed beschermd en onderhouden worden. Parken spelen een grote rol in onze gemeente op het gebied van recreatie voor de inwoners.",
      ),
      mk(
        13,
        "Actief vergroenen",
        "De gemeente versterkt de groene structuur in wijken en buitengebieden. In de bebouwde kom wordt groen verzorgd en toegankelijk gehouden. Aan de randen krijgt natuur meer ruimte voor spontane groei. We planten meer bomen voor schaduw, verkoeling en luchtkwaliteit, en herstellen hagen en heggen langs wegen in buitengebieden.",
      ),
      mk(
        14,
        "Minder verharding",
        "We dringen verharding en asfaltering in woonwijken terug, om wateroverlast, hitte en verstening te voorkomen.",
      ),
      mk(
        15,
        "Regels schrappen om bouwen makkelijker te maken",
        "Wij versoepelen bouw- en verhuurregels zodat generatiewonen, aanbouwen, dakkapellen en bijbouwen op eigen perceel makkelijker mogelijk wordt.",
      ),
      mk(
        16,
        "Nieuwe wijken mét voorzieningen",
        "Wij bouwen alleen complete leefomgevingen met scholen, winkels en infrastructuur die vooraf goed geregeld zijn.",
      ),
      mk(
        17,
        "Lokale zeggenschap over ruimtelijke ontwikkeling",
        "De gemeente gaat over de ontwikkelingen binnen haar grenzen. Wij laten ons niet dwingen en sturen door de Rijksoverheid.",
      ),
    ],
  },
  {
    nr: 6,
    titel: "Infrastructuur & Mobiliteit",
    iconKey: "map",
    intro:
      "Mobiliteit en een goede infrastructuur zijn een randvoorwaarde voor vrijheid, leefbaarheid en economische ontwikkeling. Lijst van Andel kiest voor realistisch mobiliteitsbeleid. Wij kijken naar hoe mensen daadwerkelijk leven en zich verplaatsen. De auto is voor veel huishoudens geen luxe, maar een noodzaak. Autogebruik moet daarom nooit worden ontmoedigd of bestraft, maar juist gefaciliteerd waar dat nodig is. Tegelijk erkennen wij het belang van goed onderhouden fiets- en voetpaden en een betrouwbaar openbaar vervoer, vooral voor jongeren en ouderen.\n\nExperimentele verkeersmaatregelen en symbolisch beleid dat de bereikbaarheid aantast zonder aantoonbaar voordeel, wijzen wij af. Wij verzetten ons tegen mobiliteitsbeleid waarin inwoners in hun bewegingsvrijheid worden beperkt via afsluitingen van wegen, snelheidsverlagingen zonder noodzaak of het ontmoedigen van autobezit. Mobiliteit is een middel om vrijheid te vergroten, niet een instrument om deze in te perken.",
    standpunten: [
      mk(
        1,
        "Betere bereikbaarheid en doorstroming",
        "Wij investeren in goede ontsluiting met de auto. Wegen worden actief onderhouden en uitgebreid, zodat verkeer soepel en veilig door kan rijden. Wij willen de rondweg Ossenzijl realiseren. De hoofdstraat is een knelpunt voor zowel reiziger als bewoner. Er moet een ontsluiting komen. Dit moet in zorgvuldige participatie met de inwoners van Ossenzijl.",
      ),
      mk(
        2,
        "Geen verkeersdrempels zonder nut",
        "Wij plaatsen geen extra drempels of snelheidsbeperkingen als er geen bewezen en significant veiligheidseffect is.",
      ),
      mk(
        3,
        "Voldoende parkeergelegenheid",
        "Wij behouden en creëren parkeerruimte in (dorps)centra en wijken, zodat winkels en voorzieningen bereikbaar blijven. De bereikbaarheid van de binnenstad van Steenwijk springt hier momenteel nog in uit. En wat ons betreft blijft dat zo. De stadsvisie voorziet momenteel in het elimineren van parkeergelegenheid in de nabijheid van de binnenstad, wat de aantrekkelijkheid van de binnenstad bedreigt. Men komt juist naar Steenwijk omdat het mogelijk is om in de nabijheid van het centrum te parkeren.",
      ),
      mk(
        4,
        "Geen betaald parkeren Weerribben-Wieden",
        "Wij zijn van mening dat Natuurmonumenten geen betaald parkeren moet invoeren in de Weerribben-Wieden. Parkeren en daarmee recreëren in eigen natuurgebied moet behouden worden voor de eigen inwoners.",
      ),
      mk(
        5,
        "Mobiliteitsvrijheid: geen autobeleid via dwang",
        "Wij voeren geen milieuzones, zero-emissiezones of andere beleidsprikkels in die automobiliteit beperken. Vervoerskeuze is een groot goed.",
      ),
      mk(
        6,
        "Geen gedwongen elektrificatie",
        "Wij accepteren benzine- en dieselauto's zonder boetes of restricties en verplichten geen laadinfrastructuur tegen de wil van inwoners.",
      ),
      mk(
        7,
        "Een kwalitatief, fijnmazig OV-netwerk",
        "Wij zorgen voor betere en betaalbare OV-verbindingen binnen de gemeente en met omliggende dorpen en steden. Voorheen reed buslijn 70 tussen Steenwijk en Marknesse, waarbij Kuinre en Ossenzijl gegarandeerd ontsloten waren in onze gemeente. Tegenwoordig is deze lijn opgeknipt, en moet er op voorhand een belbus worden gereserveerd in Oldemarkt om Kuinre of Ossenzijl te bereiken. Dit is geen positieve ontwikkeling.",
      ),
      mk(
        8,
        "Betere sociale veiligheid in het OV",
        "Wij versterken toezicht en handhaving in bussen, treinen en op haltes en treinstations, zodat reizigers zich veilig voelen en overlastgevers direct worden aangepakt.",
      ),
      mk(
        9,
        "Toegankelijk betalen in het OV",
        "Wij borgen toegankelijkheid van het OV door contant opladen van OV-kaarten mogelijk te houden.",
      ),
      mk(
        10,
        "Bewoners beslissen mee over herinrichting",
        "Wij betrekken inwoners en ondernemers actief en vroegtijdig bij herinrichting van straten en wijken, om te voorkomen dat plannen doorgang vinden zonder draagvlak.",
      ),
      mk(
        11,
        "Infrastructuur vóór woningbouw",
        "Wij bouwen geen nieuwe wijken zonder eerst te zorgen voor goede verkeersontsluiting. Wij verstaan onder een goede verkeersontsluiting óók een goede verkeersdoorstroming. Wij willen infrastructuur waarin wegversmallingen en 30 km-zones waar mogelijk worden vermeden.",
      ),
      mk(
        12,
        "Bescherming van leefkwaliteit",
        "Bij te realiseren woningbouw plaatsen wij geluidschermen waar verkeer te veel geluid veroorzaakt. Ook zorgen wij voor veilige fietsroutes en goed verlichte paden.",
      ),
      mk(
        13,
        "Lokale knelpunten oplossen",
        "Wij pakken de bestaande verkeerscongestie en gevaarlijke kruispunten snel aan op basis van de zorgen die we ophalen uit wijken en dorpen.",
      ),
      mk(
        14,
        "Meer voetpaden in het buitengebied",
        "Wij leggen veilige wandelpaden aan in buitengebieden zodat inwoners omliggende dorpen, natuur en meer afgelegen voorzieningen ook goed te voet kunnen bereiken.",
      ),
      mk(
        15,
        "Meer verlichting op onveilige plekken",
        "Wij verbeteren de verlichting op slecht zichtbare en afgelegen routes, zodat inwoners zich ook 's avonds veilig kunnen bewegen. Zo willen wij onderzoeken of de fietspaden verlicht kunnen worden op de Veneweg tussen Sint-Jansklooster en Blauwe Hand. En op het fietspad op de Beulakerweg/Blauwehandseweg tussen Giethoorn en Belt-Schutsloot. Zo wordt 's avonds bewegen tussen Giethoorn, Belt-Schutsloot en Sint-Jansklooster ook toegankelijker.",
      ),
    ],
  },
  {
    nr: 7,
    titel: "Economie, Ondernemerschap & Lokale Bedrijvigheid",
    iconKey: "briefcase",
    intro:
      "Een gemeente staat of valt met een gezonde lokale economie. Ondernemers, zelfstandigen, winkeliers, boeren en mkb'ers zorgen voor werkgelegenheid en groei. Toch ervaren juist zij steeds vaker dat gemeentelijk beleid hen belemmert in plaats van ondersteunt. Hoge lasten en complexe regels maken de gemeente tot een hindermacht, en zetten een rem op onze welvaart.\n\nLijst van Andel kiest voor de lokale economie. Ondernemerschap moet worden beloond, niet ontmoedigd. Dat begint bij minder regels, lagere lasten en een overheid die uitgaat van vertrouwen in plaats van wantrouwen. Wij vinden het ook vanzelfsprekend dat de gemeente lokale ondernemers actief promoot en waar mogelijk zelf lokaal inkoopt. Een bruisende economie draagt ook bij aan leefbaarheid. Winkels, horeca en markten maken dorps- en stadscentra aantrekkelijk en herkenbaar. Zo maken we onze gemeente levendig en welvarend.",
    standpunten: [
      mk(
        1,
        "Lagere lokale lasten voor inwoners en ondernemers",
        "Wij verlagen de onroerendezaakbelasting (OZB), parkeertarieven en gemeentelijke heffingen zodat wonen en ondernemen betaalbaar blijven. De ondernemer wordt in Steenwijkerland als sluiter van de begroting gebruikt door de stijgende OZB, dit is een actieve bedreiging voor de economische kansen van onze ondernemers.",
      ),
      mk(
        2,
        "Geen nieuwe heffingen of belastingen",
        "Wij voeren geen extra gemeentelijke belastingen in, zoals milieutoeslagen, zero-emissie-heffingen of afvalboetes per kilo, zodat wonen en ondernemen betaalbaar blijven.",
      ),
      mk(
        3,
        "Minder regeldruk en sneller vergunning",
        "Wij schrappen onnodige regels en maken vergunningen eenvoudiger en sneller te verkrijgen, zodat bedrijvigheid niet vastloopt in bureaucratie.",
      ),
      mk(
        4,
        "Geen boetemachines",
        "Wij stoppen met boetebeleid dat vooral dient om gemeentelijke inkomsten te genereren; handhaving moet zich richten op veiligheid en leefbaarheid.",
      ),
      mk(
        5,
        "Geen klimaateisen of ideologische voorwaarden bij aanbestedingen",
        "Bij aanbestedingen kiezen we voor praktische en betaalbare oplossingen, stellen we geen duurzaamheidsnormen die projecten duurder maken of bedrijven uitsluiten, en hanteren we geen diversiteitsquota of inclusievoorwaarden.",
      ),
      mk(
        6,
        "Ruimte voor lokale bedrijven en MKB",
        "Wij creëren groeiruimte en voorrang voor lokale (familie)bedrijven en ondernemers boven internationale ketens.",
      ),
      mk(
        7,
        "Lokale bedrijven op één",
        "Wij stimuleren inwoners om lokaal te kopen, ondersteunen de thuisverkoop van lokale producten, en promoten bedrijven en boeren uit onze eigen gemeente. De gemeente neemt het goede voorbeeld, en doet aanbestedingen en inkopen zoveel mogelijk bij lokale of regionale ondernemers.",
      ),
      mk(
        8,
        "Bruisend aanbod",
        "We zetten in op een gezond winkelaanbod om de middenstand te stimuleren in de kernen. Wij investeren in aantrekkelijke centra, goede toegankelijkheid en parkeermogelijkheden zodat winkels en horeca kunnen floreren. Wij zijn van mening dat leegstand waar mogelijk teruggedrongen moet worden. De kernen en hun centra moeten leefbaar en bereikbaar blijven.",
      ),
      mk(
        9,
        "Meer ruimte voor winkels en horeca",
        "Wij versoepelen openingstijden en maken terrasuitbreiding eenvoudiger, zodat ondernemers beter kunnen inspelen op lokale vraag en de stads- en dorpskernen levendig blijven. Horeca-ondernemers moeten zelf kunnen bepalen of zij open willen zijn tijdens live-tv-evenementen. Voorbeelden kunnen het WK 2026 voetbal zijn in de Verenigde Staten of de Grand Prix F1 in Australië.",
      ),
      mk(
        10,
        "Levendige markten en ambachtelijke bedrijvigheid",
        "Wij ondersteunen lokale markten als een brenger van bedrijvigheid en sociale binding. Initiatieven zoals de Lambertusmarkt in Oldemarkt, De Zendemarkt in Steenwijk en/of de Toeristische Jaarmarkt in Blokzijl moeten ondersteund worden.",
      ),
      mk(
        11,
        "Vitale bedrijventerreinen",
        "Wij moderniseren verouderde bedrijventerreinen, zoals het Groot verlaat, en verbeteren hun bereikbaarheid, zodat bedrijven hier kunnen blijven en groeien.",
      ),
    ],
  },
  {
    nr: 8,
    titel: "Onderwijs, Zorg, Welzijn & Sport",
    iconKey: "heart",
    intro:
      "Lijst van Andel ziet welzijn niet als iets wat van bovenaf kan worden opgelegd, maar als iets wat groeit in sterke gezinnen, verenigingen en gemeenschappen. De rol van de gemeente is om dit mogelijk te maken.\n\nIn de zorg is menselijk contact te vaak ondergeschikt aan regels en managementlagen. Wachttijden lopen op terwijl professionals tijd verliezen aan overmatige administratie. Lijst van Andel kiest voor zorg die dichtbij is, toegankelijk en gericht op directe hulp. Publiek geld moet naar zorgverlening gaan, niet naar bureaucratie.\n\nDe gemeente heeft een belangrijke taak in het bieden van toegang tot goed onderwijs. Lijst van Andel wil ruimte bieden aan nieuwe onderwijsinitiatieven die aansluiten bij de behoeften van ouders en kinderen. Dit kan ook gaan om initiatieven die buiten de gebaande paden treden.\n\nSport en verenigingsleven zijn geen bijzaak, maar een essentieel onderdeel van gezondheid en sociale samenhang. Verenigingen brengen generaties samen en zijn een natuurlijke geneesmiddel tegen vereenzaming. Zij verdienen steun en ruimte.",
    standpunten: [
      mk(
        1,
        "Efficiënte en doelmatige zorg",
        "Wij zorgen dat zorggeld rechtstreeks terechtkomt bij inwoners die zorg nodig hebben, met volledige transparantie over de besteding van zorgbudgetten en drastische vermindering van administratieve lasten voor zorgverleners.",
      ),
      mk(
        2,
        "Zorg zonder drempels",
        "Wij waarborgen fysieke, persoonlijke toegankelijkheid van de zorg, naast digitale zorgopties, ook wat betreft het maken van afspraken en inzien van dossiers. Zorg moet toegankelijk zijn via fysieke loketten en balies in de buurt.",
      ),
      mk(
        3,
        "Lokaal toegankelijke zorg",
        "Wij spannen ons in voor het behoud van lokale en regionale zorginstellingen, huisartsenposten, consultatiebureaus en ziekenhuizen. Het is van groot belang dat inwoners kunnen beschikken over de nodige faciliteiten in hun eigen omgeving.",
      ),
      mk(
        4,
        "Ruimte voor lokale initiatieven",
        "We bevorderen en creëren ruimte voor kleinschalige en lokale zorginitiatieven.",
      ),
      mk(
        5,
        "Regie terug in de jeugdzorg",
        "Wij nemen als gemeente de regie terug op jeugdzorginstellingen, beperken ingrijpende maatregelen zoals uithuisplaatsingen tot het strikt noodzakelijke en zorgen dat gezinnen tijdig en passend worden geholpen. Wij verkorten wachttijden en doorbreken de bureaucratie door één regisseur per gezin.",
      ),
      mk(
        6,
        "Waardige zorg voor ouderen",
        "Wij versterken ouderenzorg met meer verpleeghuisplekken en kleinschalige woonvormen in de buurt, versterking van wijkverpleging en huisartsenposten, en gerichte ondersteuning van mantelzorgers; geen gedwongen 'zelfredzaamheid' zonder alternatief.",
      ),
      mk(
        7,
        "Snelle en toegankelijke psychische zorg",
        "Wij verkorten lange wachttijden en verbeteren de toegang tot geestelijke gezondheidszorg en jeugdzorg, zodat inwoners niet maanden hoeven te wachten op noodzakelijke hulp. We pakken ook de epidemie van eenzaamheid aan, met een bijzondere nadruk op kwetsbare groepen zoals ouderen en jongeren.",
      ),
      mk(
        8,
        "Geen digitaliseringsdwang in de zorg",
        "Wij behouden contant betalen, papieren dienstverlening en fysieke aanspreekpunten.",
      ),
      mk(
        9,
        "Geen activisme in het onderwijs en jeugdactiviteiten",
        "Gemeentelijke middelen worden uitsluitend ingezet voor neutrale, leeftijdsadequate en breed gedragen onderwijs- en jeugdactiviteiten. De gemeente organiseert, subsidieert of faciliteert geen programma's voor kinderen met een ideologische of activistische insteek.",
      ),
      mk(
        10,
        "Vrijwilligerswerk en buurtinitiatieven stimuleren",
        "Wij dragen bij aan de stimulering, werving en waardering van vrijwilligers op alle terreinen van de samenleving en moedigen buurtinitiatieven aan. Waar nodig verstrekken wij kleine subsidies en ruimen wij regels die maatschappelijk initiatief belemmeren uit de weg.",
      ),
      mk(
        11,
        "Sterke lokale sportverenigingen",
        "Wij ondersteunen sportverenigingen en zoeken waar nodig altijd actief de samenwerking op. Wij stimuleren kinderen en jongeren om actief te sporten en gezond te blijven.",
      ),
      mk(
        12,
        "Sportvoorzieningen beschermen",
        "Wij houden sport bereikbaar voor iedereen met goed onderhoud van sportplekken, zoals het zwembad in Vollenhove en van belangrijke locaties zoals de Waterwyck in Steenwijk. Het is voor de inwoners van Vollenhove nog steeds onduidelijk hoe lang het zwembad zal blijven. De verplaatsing van zwemlessen en banenzwemmen naar zwembaden van omliggende gemeenten, en daarmee het saneren van een lokale voorziening, staat voor ons niet ter discussie.",
      ),
      mk(
        13,
        "Ruimte voor avontuurlijk spelen",
        "Wij realiseren voldoende uitdagende speelplekken waar kinderen vrij kunnen ontdekken en bouwen, in contact kunnen komen met de natuur, en voorkomen dat alle speelplaatsen worden omgevormd tot steriele rubbertegelparadijzen.",
      ),
    ],
  },
  {
    nr: 9,
    titel: "Milieu & Energie",
    iconKey: "leaf",
    intro:
      "Zorg voor het milieu begint dichtbij. Niet met onzinnige mondiale ambities waar gemeenten geen invloed op hebben, maar juist met aandacht voor de eigen leefomgeving: schone straten, groen, goed onderhouden openbare ruimte en een prettige woonomgeving.\n\nLijst van Andel verzet zich tegen ideologisch gedreven klimaatmaatregelen, zoals verplichtingen rondom de energietransitie, het plaatsen van zonnevelden of windmolens, of CO₂-reductiedoelstellingen. Dit beleid leidt tot hogere lasten voor inwoners en ondernemers, zonder enige meetbare winst. Energiebeleid moet op de eerste plaats betrouwbaar en betaalbaar zijn.\n\nMilieubeleid betekent aandacht voor groenonderhoud, waterbeheer, het bestrijden van zwerfafval en een schone openbare ruimte. Zo dragen we bij aan de leefbaarheid van de gemeente.",
    standpunten: [
      mk(
        1,
        "Stoppen met onbetaalbare klimaatmaatregelen",
        "We stoppen met al het kostbare beleid rondom klimaatverandering, CO₂-beperking, en verduurzaming. We behouden fossiele brandstof als stabiele en betrouwbare energiebron.",
      ),
      mk(
        2,
        "Geen windmolens, zonnevelden of biomassacentrales",
        "Wij plaatsen geen [nieuwe] grootschalige, onrendabele zonnevelden, windmolens of biomassacentrales die het landschap domineren, landbouwgrond en natuur kosten, overlast geven en waarde vernietigen. Wij zijn blij met de sluiting van IceBear. En als het aan ons ligt, blijft dat ook zo, en zal op deze locatie voor een biomassa-installatie, geen doorstart plaatsvinden. Deze biomassacentrale heeft voor omwonenden voor veel overlast gezorgd.",
      ),
      mk(
        3,
        "Geen milieuactivisme op kosten van de burger",
        "We voorkomen subsidiestromen naar activistische klimaatclubs, NGO's of klimaat-gerelateerde projecten. We hanteren ook geen duurzaamheidseisen bij het verstrekken van subsidies.",
      ),
      mk(
        4,
        "Vrijheid in energiekeuze",
        "Wij behouden aardgas, houtkachels en andere verwarming zonder druk of verbod. Wij verzetten ons tegen gedwongen aansluitingen en afsluiting van bestaande systemen.",
      ),
      mk(
        5,
        "Geen stookverbod",
        "Wij gaan nooit akkoord met een stookverbod of verboden op houtkachels en andere traditionele verwarmingsmethoden.",
      ),
      mk(
        6,
        "Isolatie waar het helpt",
        "Wij bevorderen isolatie van huizen en gemeentelijk vastgoed waar het financieel en technisch zinvol is, en op vrijwillige basis.",
      ),
      mk(
        7,
        "Sterke boeren en agrarische sector",
        "Wij beschermen agrarische grond en boerenbedrijven tegen stikstofdwang en onteigening. We bevorderen agrarische innovatie en lokale voedselproductie.",
      ),
      mk(
        8,
        "Zwerfafval hard aanpakken",
        "Wij versterken handhaving op zwerfvuil en zorgen voor voldoende afvalbakken met tijdige leging.",
      ),
      mk(
        9,
        "Betaalbaar afvalbeleid",
        "Wij houden milieustraten betaalbaar toegankelijk en voeren geen boetes of datamonitors in voor afvalscheiding.",
      ),
      mk(
        10,
        "Buurtparticipatie bij schoonmaak en groen",
        "Wij moedigen inwoners aan om mee te helpen bij onderhoud en opruimacties van bijvoorbeeld zwerfvuil. Zo draagt iedereen bij aan het verbeteren van de buurt.",
      ),
      mk(
        11,
        "Bescherming tegen hitte-eilanden",
        "Wij zorgen voor bomen, vergroening en schaduw op pleinen, schoolpleinen en parkeergebieden.",
      ),
      mk(
        12,
        "Eerlijk en nuchter dierenwelzijnsbeleid",
        "Wij handhaven strikte regels tegen mishandeling en verwaarlozing, zonder ideologische activistische maatregelen.",
      ),
      mk(
        13,
        "Dieren als onderdeel van de gemeenschap",
        "Wij beschermen lokale kinderboerderijen, steunen het dierenasiel en de dierenambulance, zorgen voor nette hondenuitlaatvoorzieningen. We ondersteunen initiatieven die kinderen en buurtbewoners in contact brengen met dieren. Wij ondersteunen ook initiatieven waarbij kinderen boerderijen bezoeken zoals de Maargies Hoeve in Kallenkote of bijvoorbeeld de Waterbuffelfarm in Oldemarkt.",
      ),
    ],
  },
  {
    nr: 10,
    titel: "Nieuwe Technologie, Privacy & Vrijheid",
    iconKey: "cpu",
    intro:
      "Technologische ontwikkelingen gaan snel en raken steeds meer aspecten van ons dagelijks leven. Digitalisering, kunstmatige intelligentie, en nieuwe vormen van infrastructuur bieden gemeenten grote kansen om efficiënter te werken, dienstverlening te verbeteren en kosten te besparen. Het is daarom noodzakelijk dat de gemeente niet achter de feiten aanloopt, maar actief een doordachte positie inneemt en inspeelt op al deze ontwikkelingen.\n\nTegelijkertijd zijn we niet naïef. Technologie brengt ook risico's met zich mee en kan leiden tot ongewenste neveneffecten. Grootschalige dataverzameling en gedragssturende systemen worden te vaak gepresenteerd als onvermijdelijke vooruitgang, terwijl de effecten voor vrijheid en privacy onvoldoende worden doordacht.\n\nLijst van Andel wil dat de gemeente zowel innovatief en ambitieus als waakzaam is: we denken actief na over nieuwe technologieën, maar zijn scherp op hun maatschappelijke gevolgen. Door kansen en risico's goed te wegen, bouwen wij aan een moderne gemeente die meedoet in het technologische speelveld, zonder haar inwoners uit het oog te verliezen.",
    standpunten: [
      mk(
        1,
        "Moderne digitale dienstverlening met keuzevrijheid",
        "Wij maken de digitale dienstverlening van de gemeente snel en gebruiksvriendelijk, en zorgen dat inwoners ook zonder smartphone of computer zaken met de gemeente kunnen regelen.",
      ),
      mk(
        2,
        "Supersnelle digitale infrastructuur",
        "Wij investeren in snel en betrouwbaar internet als basisvoorziening voor inwoners, ondernemers en thuiswerkers.",
      ),
      mk(
        3,
        "Digitale flexwerkplekken",
        "Wij faciliteren moderne flexwerkplekken met hoogwaardige digitale voorzieningen voor forensen en hybride werkers.",
      ),
      mk(
        4,
        "Kunstmatige intelligentie als hulpmiddel",
        "Wij benaderen AI optimistisch en zetten het waar mogelijk in om processen te versnellen, kosten te verlagen en bureaucratie te verminderen. We garanderen dat politieke en ambtelijke beslissingen altijd door mensen worden genomen, en nooit door een computer.",
      ),
      mk(
        5,
        "Ruimte voor technologische innovatie",
        "Wij maken ruimte voor pilots en experimenten met innovatieve nieuwe technologieën die de gemeente efficiënter, veiliger en betaalbaarder maken.",
      ),
      mk(
        6,
        "Vooruitdenken over nieuwe mobiliteit",
        "Wij volgen en verkennen nieuwe vervoersvormen, zoals autonoom vervoer, shuttles, drones en luchttaxi's. Zo is de gemeente voorbereid op toekomstige infrastructuur.",
      ),
      mk(
        7,
        "Transparant en veilig datagebruik",
        "Inwoners hebben inzicht in welke gegevens de gemeente gebruikt, waarom en hoe lang. Dataminimalisatie is uitgangspunt. Persoonsgegevens van inwoners worden niet verkocht of ingezet voor commerciële profiling of marketing.",
      ),
      mk(
        8,
        "Privacy by design",
        "Nieuwe digitale systemen worden ontworpen met privacy en veiligheid als uitgangspunt, niet als bijzaak.",
      ),
      mk(
        9,
        "Slimme technologie onder democratische controle",
        "Wij staan open voor slimme toepassingen in de openbare ruimte, maar wel met expliciete politieke besluitvorming en transparantie richting inwoners. We zijn zeer terughoudend met surveillance en tracking.",
      ),
      mk(
        10,
        "Cameratoezicht als instrument, niet als systeem",
        "Camera's worden doelgericht ingezet voor veiligheid en handhaving, niet voor gedragsmonitoring of permanente observatie.",
      ),
      mk(
        11,
        "Menselijk contact waarborgen",
        "Wij behouden balies, telefonische hulp en begeleiding voor inwoners die ondersteuning nodig hebben bij digitale processen. We zorgen ook dat gemeentelijke diensten ook met contant geld toegankelijk blijven voor wie dat nodig heeft.",
      ),
    ],
  },
];
