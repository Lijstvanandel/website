// Volledig partijprogramma Lijst van Andel (Steenwijkerland)
// Zorgvuldig vastgesteld met behoud van de exacte politieke strekking, nuance, prioriteiten en lokale context.

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
      "Het lokaal bestuur vormt de overheid die het dichtst bij de burger staat. Het is dan ook onaanvaardbaar dat essentiële beslissingen steeds vaker buiten het zicht van de gemeenteraad en zonder wezenlijke inspraak van inwoners worden doorgedrukt. De kloof tussen het gemeentebestuur en de inwoners van Steenwijkerland is de afgelopen jaren zienderogen gegroeid. Onze lokale democratie staat onder druk door dichtgetimmerde coalitieakkoorden, symbolische participatietrajecten en een bestuurscultuur waarin men verantwoordelijkheid afschuift naar landelijke instanties, Europese richtlijnen of ondoorzichtige regionale overlegorganen waar de kiezer geen vat op heeft.\n\nLijst van Andel wil de zeggenschap weer onvoorwaardelijk terugleggen bij de inwoners. Dat vraagt om een transparante overheid en tastbare directe inspraak. De gemeenteraad moet opnieuw het kloppend hart van de besluitvorming vormen in plaats van te fungeren als stempelkantoor voor vooraf bedachte plannen. Politici en bestuurders dienen verantwoording af te leggen aan de inwoners van Steenwijkerland, en niet aan bovenlokale overlegorganen, ambtelijke netwerken of partijbesturen buiten onze gemeente.\n\nHet herstel van lokale zelfbeschikking staat hierin centraal. Een gemeente is geen uitvoeringsorgaan van Den Haag of Brussel, maar een zelfstandige gemeenschap met een eigen karakter, duidelijke prioriteiten en eigen verantwoordelijkheden. Lijst van Andel kiest voor een dienstbaar bestuur dat durft te kiezen voor het herstel van de lokale democratie.",
    standpunten: [
      mk(
        1,
        "Een bindend lokaal referendum",
        "Wij stellen bindende referenda in, zodat inwoners via de stembus een doorslaggevende stem hebben over ingrijpende politieke vraagstukken. De bestaande raadgevende verordening schiet tekort en dient te worden omgezet in een bindend instrument voor de burger.",
      ),
      mk(
        2,
        "Een direct gekozen burgemeester",
        "Wij pleiten voor een rechtstreeks door de bevolking gekozen burgemeester, zodat deze bestuurder een direct mandaat heeft en rechtstreeks verantwoording verschuldigd is aan de inwoners.",
      ),
      mk(
        3,
        "Echte burgerparticipatie",
        "Wij stoppen met schijninspraak: inwoners dienen wezenlijk mee te praten vóórdat plannen definitief zijn vastgelegd, en niet achteraf voor de vorm. Waar de behoefte bestaat, faciliteren wij krachtige wijk- en dorpsraden.",
      ),
      mk(
        4,
        "Een focus op kerntaken",
        "De gemeente richt zich primair op haar wezenlijke basistaken: eerst dient het fundament vlekkeloos op orde te zijn voordat men overgaat tot nieuw beleid.",
      ),
      mk(
        5,
        "Akkoorden op hoofdlijnen",
        "Wij nemen afscheid van dichtgetimmerde coalitieafspraken en kiezen voor akkoorden op hoofdlijnen, wisselende meerderheden en vakbekwame wethouders. Zo krijgt het openbare raadsdebat en inhoudelijke belangenafweging weer de ruimte.",
      ),
      mk(
        6,
        "Lokale autonomie herstellen",
        "Onze gemeente fungeert niet als doorgeefluik voor landelijke of Europese richtlijnen. Wij wijzen extern opgelegde dwangmaatregelen — zoals de spreidingswet, asielquota, geforceerd klimaatbeleid en onvrijwillige gemeentelijke herindelingen — resoluut af.",
      ),
      mk(
        7,
        "Lokaal zeggenschap in regionale samenwerking",
        "Steenwijkerland neemt uitsluitend deel aan regionale samenwerkingsverbanden waarin onze gemeente volledige zeggenschap behoudt. Wij stappen uit structuren waarin andere gemeenten overheersen of waar beleid zonder lokaal draagvlak wordt opgelegd, zoals bij de Regionale Energiestrategie (RES) West-Overijssel.",
      ),
      mk(
        8,
        "Afstand van globalistisch beleid",
        "Wij weigeren internationale agenda's, zoals de Sustainable Development Goals (SDG's), te hanteren als leidend richtsnoer voor het gemeentelijk beleid.",
      ),
      mk(
        9,
        "Geen SDG's in beleid",
        "Steenwijkerland dient te stoppen met het inrichten en verantwoorden van gemeentelijke programmabegrotingen aan de hand van de VN-duurzaamheidsdoelen.",
      ),
      mk(
        10,
        "Geen diversiteitsbeleid bij de lokale overheid",
        "Wij hanteren binnen de gemeentelijke organisatie geen quota, verplichte ideologische trainingen of diversiteitsdoelstellingen. Uitsluitend vakkennis, capaciteiten en geschiktheid zijn bepalend.",
      ),
      mk(
        11,
        "Geen subsidie voor activistische organisaties",
        "Gemeentelijke subsidies aan ideologisch of activistisch gedreven stichtingen en belangenorganisaties worden per direct beëindigd.",
      ),
      mk(
        12,
        "Verantwoordelijke financiën",
        "Wij beëindigen kostbare prestigeprojecten die geen publiek nut of economisch rendement opleveren. Grote projecten worden onderworpen aan strikte budgetplafonds en strakke oplevertermijnen.",
      ),
      mk(
        13,
        "Een slanke, betaalbare gemeentelijke organisatie",
        "Wij verkleinen het ambtelijk apparaat, dringen de inzet van dure externe consultants fors terug en stoppen met overbodige adviesrapporten. Financiële meevallers vloeien direct terug naar de burger in de vorm van lagere lokale lasten.",
      ),
      mk(
        14,
        "Gemeentelijke communicatie in het Nederlands",
        "Alle officiële berichtgeving, publicaties en loketcommunicatie van de gemeente vinden te allen tijde primair plaats in de Nederlandse taal.",
      ),
      mk(
        15,
        "Een toegankelijke, dienstbare gemeente",
        "Gemeentelijke dienstverlening blijft altijd laagdrempelig in begrijpelijk Nederlands, inclusief fysieke balies en correspondentie per post. Contante betalingen blijven onvoorwaardelijk mogelijk bij alle gemeenteloketten.",
      ),
      mk(
        16,
        "Een radicaal transparante gemeente",
        "Inwoners hebben het recht exact te weten hoe besluiten tot stand komen. Er komt een openbaar, helder subsidieregister en volledige openheid over gemeentelijke financiën en politieke besluitvorming.",
      ),
    ],
  },
  {
    nr: 2,
    titel: "Veiligheid & Handhaving",
    iconKey: "shield",
    intro:
      "Veiligheid vormt het fundament onder onze individuele vrijheid. Steeds meer inwoners ervaren dat de openbare ruimte onder druk staat: toegenomen overlast, intimidatie, criminaliteit en te weinig zichtbare handhaving op straat. De politie raakt overbelast door administratieve rompslomp, terwijl gemeentelijke boa's steeds vaker oneigenlijk worden ingezet ter vervanging van de politie.\n\nLijst van Andel staat voor een zichtbare, daadkrachtige aanpak van de veiligheid. De straat en de buurt moeten weer een veilige plek zijn voor de eerlijke inwoner, vrij van overlastgevers, criminelen of intimiderende groepen. Dit vereist adequate politiecapaciteit, het heropenen van politieposten in de kernen, gerichte inzet van handhavers en een duidelijke normering: wangedrag wordt onmiddellijk aangepakt.\n\nVeiligheid behelst echter meer dan alleen straffen. Een doordachte inrichting van de openbare ruimte, goede straatverlichting en het weren van risicovolle opvanglocaties in woonkernen zijn net zo cruciaal. Preventie waar dat effectief is, stevig handhaven waar het nodig is: zonder wegkijken of pappen en nathouden om Steenwijkerland leefbaar te houden.",
    standpunten: [
      mk(
        1,
        "Meer veiligheid zichtbaar op straat",
        "Wij zetten in op meer zichtbare politieagenten in de wijken en dorpen, het heropenen van volwaardige politiebureaus en het vestigen van wijkposten in kwetsbare gebieden.",
      ),
      mk(
        2,
        "Overlast hard aanpakken",
        "Wij treden streng op tegen overlast door statushouders, intimiderend bedelgedrag, nachtelijke vernielingen en intimiderende jeugdgroepen. Voor veelplegers hanteren we een strikt 'two-strikes'-beleid en directe gebiedsverboden bij herhaling.",
      ),
      mk(
        3,
        "Gericht cameratoezicht",
        "Camerabewaking wordt uitsluitend tijdelijk en doelgericht ingezet op bewezen probleempunten, om ongerichte massasurveillance over de bevolking te voorkomen.",
      ),
      mk(
        4,
        "Preventief fouilleren waar nodig",
        "In risicogebieden maken wij preventief fouilleren mogelijk om wapens doeltreffend van straat te weren. Politiemensen krijgen de professionele ruimte om te handelen op basis van hun vakkennis en praktijkervaring.",
      ),
      mk(
        5,
        "Een heldere scheiding tussen politie en handhaving",
        "Boa's richten zich zuiver op hun eigen toezichtstaken. Gemeentelijke handhaving mag niet verworden tot een goedkope vervanging van de politie en krijgt geen bevoegdheden die uitsluitend aan beëdigde politieagenten toebehoren.",
      ),
      mk(
        6,
        "Proportionele handhaving",
        "Handhaving dient ter waarborging van veiligheid en leefbaarheid, niet om de gemeentekas te spekken via agressieve boetejacht.",
        [{ url: "/videos/proportionele-handhaving.mp4", titel: "Bijdrage Lijst van Andel — Proportionele handhaving" }],
      ),
      mk(
        7,
        "Investeren in preventie",
        "Wij versterken buurtpreventie en stimuleren de samenwerking tussen politie, onderwijs en jeugdzorg. Door buurthuizen, sportclubs, leerwerkplekken en bijbanen te faciliteren, bieden we jongeren een positief toekomstperspectief.",
      ),
      mk(
        8,
        "Snelle meldingsopvolging",
        "Meldingen van inwoners over onveiligheid en overlast worden direct en adequaat opgevolgd, zodat handhaving merkbaar en daadkrachtig functioneert.",
      ),
      mk(
        9,
        "Geen risicovolle opvanglocaties in woonwijken",
        "Wij weren opvanglocaties met een verhoogd veiligheidsrisico (zoals voor verslaafden- of specialistische GGZ-zorg) uit woonwijken en dorpskernen, om overlast en aantasting van het leefklimaat te voorkomen.",
      ),
      mk(
        10,
        "Meer verlichting op straat",
        "Wij verbeteren de verlichting in donkere straten, fietstunnels, sportparken en doorgangsroutes, zodat inwoners zich te allen tijde veilig over straat kunnen bewegen.",
      ),
      mk(
        11,
        "Strijd tegen drugscriminaliteit",
        "In nauwe samenwerking met de politie en lokale wijkteams pakken wij ondermijning, drugshandel op straat en daarmee gepaard gaande overlast onverbiddelijk aan.",
      ),
    ],
  },
  {
    nr: 3,
    titel: "Asiel, Migratie & Integratie",
    iconKey: "globe",
    intro:
      "De gevolgen van aanhoudende grootschalige immigratie zijn direct merkbaar in Steenwijkerland: op de woningmarkt, in de zorg, in de klaslokalen en op straat. Gemeenten worden opgezadeld met zware opvangplichten, overbelasting van maatschappelijke voorzieningen en maatschappelijke frictie, terwijl de inwoners hier nooit om hebben gevraagd.\n\nLijst van Andel is van mening dat de gemeente duidelijke grenzen moet trekken. Onze lokale voorzieningen zijn primair bedoeld voor onze eigen inwoners. Wij verzetten ons tegen dwangopvang, gedwongen spreiding en voorrangsposities voor statushouders, en zetten in op de sluiting van asielopvanglocaties in onze gemeente.\n\nIntegratie is geen vrijblijvende aangelegenheid. Wie zich hier vestigt, dient zich aan te passen aan onze taal, Nederlandse normen en lokale gewoonten. Slechts op die manier blijft onze gemeenschap leefbaar en harmonieus.",
    standpunten: [
      mk(
        1,
        "Geen nieuwe AZC's of (nood)opvangcentra",
        "Wij weigeren de vestiging van nieuwe opvangcentra om de rust, veiligheid en capaciteit van onze lokale voorzieningen te waarborgen.",
      ),
      mk(
        2,
        "Sluiting van alle bestaande opvanglocaties",
        "Wij sluiten de opvanglocatie aan de Broekslagen bij het Groot Verlaat, die periodiek wordt ingezet voor asielopvang rondom evenementen zoals het TT-festival of Truckstar.",
      ),
      mk(
        3,
        "Geen verplichte opvang vanuit Den Haag",
        "Wij weigeren mee te werken aan de uitvoering van de spreidingswet en wijzen elke vorm van Haagse dwang om extra asielzoekers of statushouders te huisvesten af.",
      ),
      mk(
        4,
        "Aanpak van overlast door asielzoekers",
        "Tegen overlastgevende asielzoekers en vreemdelingen uit veilige landen treden wij onverbiddelijk op via gebiedsverboden en directe juridische handhaving.",
      ),
      mk(
        5,
        "Zelfstandige regie",
        "De gemeente beëindigt de samenwerkingsverbanden met organisaties die migratie faciliteren, zoals het COA, VluchtelingenWerk of GZA.",
      ),
      mk(
        6,
        "Lokale binding bij huisvesting",
        "Inwoners uit Steenwijkerland krijgen voorrang bij de toewijzing van sociale huurwoningen en betaalbare koopwoningen. De voorrangsregeling voor statushouders schaffen wij direct af.",
      ),
      mk(
        7,
        "Grip op bevolkingsontwikkeling",
        "Wij waken voor de maatschappelijke impact van grootschalige huisvesting van tijdelijke arbeidsmigranten, voorkomen verdringing op de woningmarkt en beschermen de sociale samenhang in onze dorpen en wijken.",
      ),
      mk(
        8,
        "Tijdelijke opvang met eigen verantwoordelijkheid",
        "Oekraïense ontheemden dienen naar draagkracht bij te dragen aan de kosten van hun eigen opvang. Deze opvang wordt afgebouwd met het oog op terugkeer.",
      ),
      mk(
        9,
        "Geen activistische integratieprojecten",
        "Wij schrappen subsidies voor ideologische integratieprojecten die uitgaan van 'wederzijdse aanpassing'. Van nieuwkomers verwachten wij assimilatie in de Nederlandse samenleving en lokale cultuur.",
      ),
    ],
  },
  {
    nr: 4,
    titel: "Identiteit, Cultuur & Erfgoed",
    iconKey: "landmark",
    intro:
      "Een gemeente is veel meer dan een bestuurlijke eenheid op de kaart; het is een hechte gemeenschap met een rijke historie, eigen gebruiken en een herkenbare identiteit. Juist in een tijdvak van voortschrijdende schaalvergroting, eenheidsworst en generiek overheidsbeleid is het cruciaal om te koesteren wat onze streek zo uniek maakt.\n\nVan de historische stadsrechten van Vollenhove in 1354 en het beleg van Steenwijk in 1580, tot de stichting van de Kolonie van Weldadigheid in Willemsoord (1820) en de legendarische filmklassieker Fanfare van Bert Haanstra in Giethoorn: onze gemeente beschikt over een rijk cultuurhistorisch fundament dat we met trots moeten beschermen.\n\nLijst van Andel omarmt cultuur die van onderop gedragen wordt door onze eigen inwoners. Door ruim baan te geven aan lokale tradities en dorpsinitiatieven, versterken we de onderlinge saamhorigheid. Ons monumentale erfgoed, streekhistorie en klassieke bouwkunst dragen rechtstreeks bij aan trots en verbondenheid met Steenwijkerland.",
    standpunten: [
      mk(
        1,
        "Weerbare Nederlandse en lokale tradities",
        "Wij koesteren onze vertrouwde feestdagen — zoals Sinterklaas met Zwarte Piet en Oud & Nieuw met vuurwerk — evenals unieke lokale tradities zoals de gondelvaart in Belt-Schutsloot, Dicky Woodstock in Steenwijkerwold en het Tik Van De Meule-feest in Vollenhove, gevrijwaard van ideologische bemoeienis.",
      ),
      mk(
        2,
        "Nieuwe tradities",
        "Wij stimuleren evenementen en symboliek die de lokale identiteit van Steenwijkerland versterken en de onderlinge verbondenheid en trots tussen onze kernen vergroten.",
      ),
      mk(
        3,
        "Behoud van streektaal en dialect",
        "Het Stellingwerfs en onze lokale dialectvarianten zijn waardevol erfgoed dat we actief beschermen en levend houden in het maatschappelijk verkeer.",
      ),
      mk(
        4,
        "Bescherming van straatnamen en monumenten",
        "Historische straatnamen, gedenktekens en standbeelden die herinneren aan onze vaderlandse en regionale geschiedenis worden integraal behouden tegen politieke herinterpretatie.",
      ),
      mk(
        5,
        "Ruimte voor lokale evenementen en verenigingen",
        "Wij versoepelen de vergunningsregels voor dorpsfeesten, markten en wijkactiviteiten, zodat verenigingen en vrijwilligers ongehinderd het sociale leven kunnen organiseren.",
      ),
      mk(
        6,
        "Cultuurroutes langs iconen van onze gemeente",
        "Wij realiseren aantrekkelijke (digitale) wandel- en fietsroutes langs de vele monumenten en cultuurhistorische parels van Steenwijkerland.",
      ),
      mk(
        7,
        "Ondersteuning van lokale verenigingen",
        "Muziekcorpsen, sportclubs, dorpsverenigingen en culturele kringen die de sociale ruggengraat van onze gemeenschap vormen, kunnen rekenen op onze actieve steun.",
      ),
      mk(
        8,
        "Investeren in historisch erfgoed",
        "Wij zetten volop in op restauratie, behoud en toegankelijkheid van historische panden. Wij zijn uitermate terughoudend met het slopen van beeldbepalende vooroorlogse gebouwen; bij verval dient altijd eerst renovatie onderzocht te worden.",
      ),
      mk(
        9,
        "Culturele ruimte voor vakmanschap en ambacht",
        "Wij steunen verenigingen en musea die historische ambachten en ons lokale verleden documenteren en uitdragen, zoals de Historische Vereniging IJsselham, Stadsmuseum Vollenhove en de Historische Vereniging Steenwijk.",
      ),
      mk(
        10,
        "Kerkklokken beschermen",
        "Het monumentale luiden van kerkklokken, carillons en beiaarden behoort tot ons akoestisch erfgoed en wordt beschermd tegen klachten en inperkingen.",
      ),
      mk(
        11,
        "Behoud van dorps- en stads karakters",
        "De historische dorpsgezichten en unieke stadsstructuren van onze kernen — zoals Park Rams Woerthe in Steenwijk of de karakteristieke Bierkade in Blokzijl — beschermen we tegen massale nieuwbouw, hoogbouw en modernistische bouwsels.",
      ),
      mk(
        12,
        "Traditionele architectuur stimuleren",
        "Nieuwe gebouwen dienen harmonieus aan te sluiten bij de klassieke architectuur, traditionele schaal en historische uitstraling van onze streek, in plaats van anonieme betonbouw.",
      ),
      mk(
        13,
        "NS station Steenwijk herstellen",
        "Wij zetten ons in om het historische aanzien van het NS-station in Steenwijk in ere te herstellen. Het huidige functionalistische stationsgebouw uit 1973 doet geen recht aan de entree van onze gemeente.",
      ),
      mk(
        14,
        "Een aangename openbare ruimte",
        "Kunst in de openbare ruimte moet aansluiten bij de belevingswereld van onze inwoners en de lokale geschiedenis eer aandoen. Wij herzien de selectie van abstracte en activistische kunstobjecten rondom openbare locaties zoals het stationsgebied in Steenwijk.",
      ),
      mk(
        15,
        "Openbare kunst geworteld in onze geschiedenis",
        "Kunstwerken en standbeelden in de openbare ruimte dienen onze lokale helden, ambachten en historische mijlpalen tastbaar te eren.",
      ),
      mk(
        16,
        "Lokale identiteit zichtbaar maken",
        "De gemeentelijke vlag en historische symbolen krijgen een prominente plek op openbare gebouwen en pleinen in al onze kernen.",
      ),
      mk(
        17,
        "Geen activistische symbolen in de openbare ruimte",
        "Openbare voorzieningen en gemeentelijke monumenten — zoals de Steenwijker Toren — blijven neutraal. Wij plaatsen geen politieke vlaggen of gekleurde zebrapaden en voeren uitsluitend de Nederlandse, provinciale en gemeentevlag.",
      ),
      mk(
        18,
        "Geen regenbooggemeente en diversiteitsbeleid",
        "Steenwijkerland beëindigt de formele status als regenbooggemeente en stoot gemeentelijke bureaucratie rondom diversiteitsbeleid af.",
      ),
      mk(
        19,
        "Subsidies met aantoonbare waarde",
        "Gemeentelijke subsidies worden enkel toegekend aan maatschappelijke en culturele projecten met een directe meerwaarde voor de lokale gemeenschap. Er gaat geen geld naar ideologische of activistische campagnes.",
      ),
      mk(
        20,
        "Steun voor de bibliotheek",
        "De bibliotheek blijft een essentiële basisvoorziening voor leesbevordering, kennis en ontmoeting met een breed en toegankelijk aanbod. Daarnaast stimuleren wij lokale initiatieven zoals minibiebs in de buurten.",
      ),
    ],
  },
  {
    nr: 5,
    titel: "Wonen, Bouwen & Ruimtelijke Ontwikkeling",
    iconKey: "home",
    intro:
      "De woningnood treft ook Steenwijkerland hard. Starters vinden nauwelijks een betaalbare woning, gezinnen kunnen niet doorgroeien en senioren blijven noodgedwongen in grote woningen omdat passende alternatieven ontbreken. Ondertussen stagneert de woningbouw door een overdaad aan ambtelijke regels, procedures en doorgeschoten duurzaamheidseisen.\n\nEen sprekend voorbeeld is de dorpsvisie van Oldemarkt (2020-2025): terwijl er in het document met geen woord werd gerept over windmolens, werd het dorp plots geconfronteerd met mogelijke turbineplannen in 2025, terwijl er nauwelijks werk werd gemaakt van de gewenste woningbouw. Ook in Giethoorn ervaart Gieters Belang hoe concrete plannen voor woningbouw in Giethoorn-Noord vastlopen in bureaucratische stroperigheid.\n\nLijst van Andel staat voor een nuchter bouwbeleid: minder bureaucratische belemmeringen, meer tempo in de woningbouw en woningen die passen bij de maat en schaal van onze dorpen en wijken. Geen kille massabouw, maar karakteristieke woningen waar inwoners zich thuis voelen.",
    standpunten: [
      mk(
        1,
        "Voorrang voor inwoners met lokale binding",
        "Inwoners met een aantoonbare binding aan Steenwijkerland krijgen als eerste toegang tot sociale huur- en betaalbare koopwoningen in hun eigen kern. Steenwijkerland neemt hiermee afstand van de Verstedelijkingsstrategie 'Warme harten in een klimaatadaptieve Delta' (2023).",
      ),
      mk(
        2,
        "Geen voorrang voor statushouders",
        "De automatische urgentie en voorrangspositie van statushouders bij de toewijzing van sociale huurwoningen wordt integraal geschrapt.",
      ),
      mk(
        3,
        "Meer betaalbare koopwoningen",
        "Wij leggen de bouwfocus op betaalbare koopwoningen voor starters, jonge gezinnen en middeninkomens, zodat het bezitten van een eigen huis weer binnen bereik komt.",
      ),
      mk(
        4,
        "Een gezonde huurmarkt",
        "Wij stimuleren een evenwichtige huursector met volop ruimte voor middenhuur en particuliere verhuurders. Sociale huur moet functioneren als tijdelijk vangnet voor wie het écht nodig heeft.",
      ),
      mk(
        5,
        "Transformatie van leegstand naar woonruimte",
        "Wij vergemakkelijken de omvorming van leegstaande kantoren en bedrijfspanden naar kwalitatieve woningen. Dit bestrijdt verloedering en levert op korte termijn extra woonruimte op.",
      ),
      mk(
        6,
        "Doorstroming van ouderen faciliteren",
        "Door gericht te bouwen voor senioren (levensloopbestendige woningen, meergeneratiewoningen en knarrenhofjes) stimuleren we een natuurlijke doorstroming waardoor gezinswoningen vrijkomen.",
      ),
      mk(
        7,
        "Renovatie zonder onbetaalbare dwang",
        "Wij zetten in op het behoud en onderhoud van bestaande woningen, zonder huiseigenaren te dwingen tot onbetaalbare maatregelen zoals verplichte warmtepompen of zonnepanelen.",
      ),
      mk(
        8,
        "Bescherming van iconische dorps- en stadsgezichten",
        "Karakteristieke historische gevels, oude dorpslinten en waardevolle groenstructuren worden strikt beschermd en waar nodig hersteld.",
      ),
      mk(
        9,
        "Traditionele, menselijke architectuur",
        "Bij nieuwbouwprojecten kiezen wij voor tijdloze, klassieke bouwstijlen met hoogwaardige natuurlijke materialen en kleinschalige woonblokken die passen in de streek.",
      ),
      mk(
        10,
        "Geen hoogbouw waar het niet past",
        "Wij weren grootschalige flatgebouwen en woontorens die de horizon en het dorpse karakter van onze kernen aantasten. Steenwijkerland kenmerkt zich door een landelijk profiel met laagbouw en dat houden we zo.",
      ),
      mk(
        11,
        "Warm straatlicht als standaard",
        "Straatverlichting behoudt een warme, geel-oranje lichttemperatuur. Wij vermijden hard, blauw LED-licht vanwege de negatieve effecten op het bioritme, de leefbaarheid en de nachtelijke natuur.",
      ),
      mk(
        12,
        "Behoud van groen voor leefkwaliteit",
        "Parken, waterpartijen en plantsoenen worden gekoesterd en goed onderhouden. Iconische parken zoals Rams Woerthe en Old Ruitenborgh krijgen de zorg die zij verdienen als vitale ontspanningsplek voor onze inwoners.",
      ),
      mk(
        13,
        "Actief vergroenen",
        "Wij versterken het groen in onze dorpen en wijken met meer schaduwrijke bomen, plantsoenen en het herstellen van traditionele heggen en houtwallen in het buitengebied.",
      ),
      mk(
        14,
        "Minder verharding",
        "Overbodige verstening en asfaltering in woonwijken worden teruggedrongen om hittestress en wateroverlast op een natuurlijke wijze te voorkomen.",
      ),
      mk(
        15,
        "Regels schrappen om bouwen makkelijker te maken",
        "Wij vereenvoudigen de bouwregels aanzienlijk, zodat het plaatsen van een aanbouw, dakkapel, mantelzorgwoning of het realiseren van meergeneratiewonen op eigen perceel zonder bureaucratie kan plaatsvinden.",
      ),
      mk(
        16,
        "Nieuwe wijken mét voorzieningen",
        "Bij de ontwikkeling van nieuwe woonwijken worden bereikbaarheid, winkels, scholen en openbare speelruimte vanaf het eerste moment integraal meegenomen.",
      ),
      mk(
        17,
        "Lokale zeggenschap over ruimtelijke ontwikkeling",
        "De gemeenteraad en onze inwoners bepalen zélf wat er binnen onze gemeentegrenzen wordt gebouwd; wij laten onze ruimtelijke ordening niet dicteren door het Rijk.",
      ),
    ],
  },
  {
    nr: 6,
    titel: "Infrastructuur & Mobiliteit",
    iconKey: "map",
    intro:
      "Een uitstekende bereikbaarheid en betrouwbare infrastructuur zijn de levensader voor onze bewegingsvrijheid, economische bloei en dagelijkse leefbaarheid. Lijst van Andel hanteert een realistische benadering van mobiliteit, afgestemd op de dagelijkse praktijk van onze inwoners. In een uitgestrekte plattelandsgemeente als Steenwijkerland is de auto voor velen geen luxe, maar een onmisbare noodzaak. Autobezit en autogebruik mogen daarom niet worden tegengewerkt of ontmoedigd, maar moeten optimaal worden gefaciliteerd. Tegelijkertijd hechten wij groot belang aan veilige fietspaden, goede voetpaden en fijnmazig openbaar vervoer voor jong en oud.\n\nIdeologische verkeersingrepen en experimentele maatregelen die de doorstroming belemmeren zonder dat de veiligheid ermee gediend is, wijzen wij resoluut af. Wij verzetten ons tegen het afsluiten van doorgaande wegen, kunstmatige snelheidsverlagingen en pestbeleid richting autobezitters. Mobiliteit moet de vrijheid van inwoners vergroten, niet inperken.",
    standpunten: [
      mk(
        1,
        "Betere bereikbaarheid en doorstroming",
        "Wij investeren gericht in vlotte en veilige autoverbindingen door wegen goed te onderhouden en knelpunten aan te pakken. De aanleg van de rondweg Ossenzijl moet nu daadwerkelijk worden gerealiseerd om de overbelaste Hoofdstraat te ontlasten, in nauw overleg met de dorpsbewoners.",
      ),
      mk(
        2,
        "Geen verkeersdrempels zonder nut",
        "Wij plaatsen geen overbodige verkeersdrempels of snelheidsbeperkingen tenzij er sprake is van een overtuigende, aantoonbare veiligheidsverbetering.",
      ),
      mk(
        3,
        "Voldoende parkeergelegenheid",
        "Wij waarborgen ruime en gratis of betaalbare parkeergelegenheid in onze dorps- en stadscentra. De uitstekende bereikbaarheid en nabije parkeermogelijkheden in de binnenstad van Steenwijk moeten behouden blijven; het schrappen van parkeerplaatsen zoals in de stadsvisie dreigt de aantrekkingskracht van het centrum te schaden.",
      ),
      mk(
        4,
        "Geen betaald parkeren Weerribben-Wieden",
        "Natuurmonumenten mag geen betaald parkeren introduceren in Nationaal Park Weerribben-Wieden. Recreëren in de eigen achtertuin moet voor inwoners van Steenwijkerland vrij en kosteloos toegankelijk blijven.",
      ),
      mk(
        5,
        "Mobiliteitsvrijheid: geen autobeleid via dwang",
        "Wij voeren geen milieuzones, zero-emissiezones of belemmerende regelgeving in die de keuzevrijheid van automobilisten inperken.",
      ),
      mk(
        6,
        "Geen gedwongen elektrificatie",
        "Rijders van benzine- en dieselauto's worden gerespecteerd zonder heffingen of restricties. We dwingen geen laadpalen af op plekken waar bewoners daar niet op zitten te wachten.",
      ),
      mk(
        7,
        "Een kwalitatief, fijnmazig OV-netwerk",
        "Wij strijden voor betrouwbare en betaalbare bus- en treinverbindingen tussen alle kernen en naar omliggende regio's. Het opknippen van voormalige vaste lijnen zoals lijn 70 (Steenwijk-Marknesse), waardoor kernen als Kuinre en Ossenzijl nu afhankelijk zijn van een belbus vanuit Oldemarkt, draaien we liever terug.",
      ),
      mk(
        8,
        "Betere sociale veiligheid in het OV",
        "Wij verhogen het toezicht en de handhaving op stations, bushaltes en in het streekvervoer, zodat reizigers zich veilig voelen en overlastgevers direct worden aangepakt.",
      ),
      mk(
        9,
        "Toegankelijk betalen in het OV",
        "Het moet voor iedereen mogelijk blijven om met contant geld een kaartje te kopen of het saldo op te laden voor het openbaar vervoer.",
      ),
      mk(
        10,
        "Bewoners beslissen mee over herinrichting",
        "Bij infrastructurele ingrepen en herinrichting van straten worden omwonenden en lokale ondernemers vanaf het allereerste begin écht betrokken om plannen zonder draagvlak te voorkomen.",
      ),
      mk(
        11,
        "Infrastructuur vóór woningbouw",
        "Geen nieuwe woonwijken zonder dat de verkeersafwikkeling vooraf perfect geregeld is. Goede ontsluiting betekent een vlotte doorstroming, waarbij onnodige wegversmallingen en kunstmatige 30 km-zones worden vermeden.",
      ),
      mk(
        12,
        "Bescherming van leefkwaliteit",
        "Waar verkeersdrukte leidt tot geluidsoverlast bij woningen, plaatsen wij effectieve geluidsschermen en zorgen we voor veilige, overzichtelijke en goed verlichte fietsroutes.",
      ),
      mk(
        13,
        "Lokale knelpunten oplossen",
        "Gevaarlijke oversteekplaatsen, onveilige kruisingen en lokale verkeersopstoppingen worden met prioriteit opgelost op basis van signalen van inwoners.",
      ),
      mk(
        14,
        "Meer voetpaden in het buitengebied",
        "Wij leggen veilige wandel- en voetpaden aan langs verbindingswegen in het buitengebied, zodat voetgangers dorpen, sportlocaties en natuur veilig kunnen bereiken.",
      ),
      mk(
        15,
        "Meer verlichting op onveilige plekken",
        "Wij verbeteren de verlichting langs slecht verlichte verbindingsroutes. Wij willen onderzoeken of verlichting gerealiseerd kan worden op de fietspaden langs de Veneweg (tussen Sint-Jansklooster en Blauwe Hand) en de Beulakerweg/Blauwehandseweg (tussen Giethoorn en Belt-Schutsloot) om 's avonds veilig te kunnen fietsen.",
      ),
    ],
  },
  {
    nr: 7,
    titel: "Economie, Ondernemerschap & Lokale Bedrijvigheid",
    iconKey: "briefcase",
    intro:
      "Onze gemeente drijft op de inzet van lokale ondernemers, winkeliers, agrariërs, zzp'ers en familiebedrijven. Zij scheppen werkgelegenheid, brengen dynamiek en houden onze dorpen en steden vitaal. Desondanks ervaren ondernemers de lokale overheid steeds vaker als een bureaucratische hindermacht door stijgende lasten en verstikkende regelgeving.\n\nLijst van Andel kiest vierkant voor het lokale bedrijfsleven. Ondernemerszin verdient waardering en ruimte in plaats van tegenwerking. Dat vraagt om lastenverlichting, deregulering en een gemeentebestuur dat handelt vanuit vertrouwen. Wij vinden het vanzelfsprekend dat de gemeente het goede voorbeeld geeft door lokaal in te kopen en onze ondernemers actief te ondersteunen. Levendige winkelstraten, gastvrije horeca en bloeiende weekmarkten vormen het economische en sociale hart van onze gemeente.",
    standpunten: [
      mk(
        1,
        "Lagere lokale lasten voor inwoners en ondernemers",
        "Wij verlagen de onroerendezaakbelasting (OZB), marktgelden en leges. Ondernemers mogen door de gemeente niet langer worden gebruikt als sluitpost van de begroting via voortdurende OZB-verhogingen.",
      ),
      mk(
        2,
        "Geen nieuwe heffingen of belastingen",
        "Wij blokkeren de introductie van nieuwe gemeentelijke lasten zoals milieutoeslagen, zero-emissieheffingen of afvalboetes per kilo om wonen en werken betaalbaar te houden.",
      ),
      mk(
        3,
        "Minder regeldruk en sneller vergunning",
        "Wij schrappen overbodige verordeningen en verkorten vergunningsprocedures drastisch, zodat ondernemersinitiatieven niet verzanden in ambtelijke vertraging.",
      ),
      mk(
        4,
        "Geen boetemachines",
        "Handhaving dient uitsluitend om de veiligheid en openbare orde te bewaken en mag nooit worden ingezet als verdienmodel om de gemeentekas te spekken.",
      ),
      mk(
        5,
        "Geen klimaateisen of ideologische voorwaarden bij aanbestedingen",
        "Bij gemeentelijke aanbestedingen kiezen we voor nuchtere, betaalbare kwaliteit zonder belemmerende duurzaamheidseisen, diversiteitsquota of ideologische uitsluitingscriteria die het MKB benadelen.",
      ),
      mk(
        6,
        "Ruimte voor lokale bedrijven en MKB",
        "Wij bieden volop uitbreidingsruimte en geven voorrang aan lokale ondernemers en familiebedrijven boven anonieme multinationals.",
      ),
      mk(
        7,
        "Lokale bedrijven op één",
        "Wij stimuleren inwoners om lokaal te kopen en steunen de rechtstreekse verkoop van streekproducten door lokale boeren. De gemeente geeft zelf het voorbeeld door haar opdrachten en inkopen primair bij lokale bedrijven te plaatsen.",
      ),
      mk(
        8,
        "Bruisend aanbod",
        "Wij bestrijden winkelleegstand en investeren in aantrekkelijke, goed bereikbare dorps- en stadscentra met voldoende gratis of goedkoop parkeren, zodat de middenstand floreert.",
      ),
      mk(
        9,
        "Meer ruimte voor winkels en horeca",
        "Horeca-ondernemers krijgen maximale vrijheid voor terrasuitbreiding en ruimere openingstijden. Ondernemers bepalen zelfstandig of zij geopend willen zijn tijdens grote live-sportevenementen zoals het WK voetbal of Formule 1-races.",
      ),
      mk(
        10,
        "Levendige markten en ambachtelijke bedrijvigheid",
        "Wij koesteren en ondersteunen onze historische weekmarkten en jaarmarkten — zoals de Lambertusmarkt in Oldemarkt, de Zendemarkt in Steenwijk en de Toeristische Jaarmarkt in Blokzijl — als vitale dragers van gezelligheid en handel.",
      ),
      mk(
        11,
        "Vitale bedrijventerreinen",
        "Wij moderniseren en verduurzamen de infrastructuur op bestaande bedrijventerreinen zoals Groot Verlaat, zodat onze lokale maakindustrie en handelsbedrijven kunnen doorgroeien.",
      ),
    ],
  },
  {
    nr: 8,
    titel: "Onderwijs, Zorg, Welzijn & Sport",
    iconKey: "heart",
    intro:
      "Welzijn laat zich niet dwingend opleggen vanuit een ambtelijke beleidsnota; het ontstaat van onderop in sterke gezinnen, actieve verenigingen en hechte dorpsgemeenschappen. De gemeente heeft hierin een ondersteunende en faciliterende taak.\n\nIn de zorgsector is de menselijke maat te vaak verdrongen door protocollen en overmatige bureaucratie. Terwijl de wachtlijsten groeien, zijn zorgverleners een groot deel van hun tijd kwijt aan administratieve verantwoording. Lijst van Andel kiest voor zorg die dichtbij en laagdrempelig is. Gemeenschapsgeld hoort rechtstreeks aan het bed en in de spreekkamer terecht te komen, niet in overhead.\n\nOnderwijs moet draaien om degelijke basiskennis en talentontwikkeling. Wij staan open voor vernieuwende en kleinschalige onderwijsinitiatieven die aansluiten bij de keuzes van ouders. Daarnaast zijn sportverenigingen en het verenigingsleven onmisbaar voor de volksgezondheid en sociale binding tussen jong en oud; zij verdienen onze onvoorwaardelijke steun.",
    standpunten: [
      mk(
        1,
        "Efficiënte en doelmatige zorg",
        "Wij zorgen dat het zorggeld direct ten goede komt aan de inwoner die hulp behoeft, met volledige transparantie in de geldstromen en een drastische sanering van administratieve lasten voor zorgprofessionals.",
      ),
      mk(
        2,
        "Zorg zonder drempels",
        "Persoonlijke en fysieke toegankelijkheid tot zorg en hulpverlening blijft altijd gewaarborgd naast digitale kanalen, inclusief fysieke balies en spreekuren in de wijk.",
      ),
      mk(
        3,
        "Lokaal toegankelijke zorg",
        "Wij strijden voor het behoud van huisartsenposten, consultatiebureaus, apotheken en ziekenhuisvoorzieningen binnen onze eigen gemeente en regio.",
      ),
      mk(
        4,
        "Ruimte voor lokale initiatieven",
        "Wij stimuleren kleinschalige, particuliere en coöperatieve zorginitiatieven die maatwerk leveren dicht bij de mensen.",
      ),
      mk(
        5,
        "Regie terug in de jeugdzorg",
        "De gemeente pakt de regie op de jeugdzorg terug, dringt wachtlijsten terug via het principe van 'één gezin, één regisseur' en beperkt ingrijpende maatregelen zoals uithuisplaatsingen tot het uiterste minimum.",
      ),
      mk(
        6,
        "Waardige zorg voor ouderen",
        "Wij investeren in voldoende verpleeghuisplekken, kleinschalige woon-zorgcomplexen in de dorpen, een sterke wijkverpleging en concrete ontlasting van mantelzorgers zonder gedwongen 'zelfredzaamheid'.",
      ),
      mk(
        7,
        "Snelle en toegankelijke psychische zorg",
        "Lange wachttijden in de geestelijke gezondheidszorg worden actief aangepakt. Daarnaast voeren we een gerichte strijd tegen eenzaamheid onder zowel kwetsbare ouderen als jongeren.",
      ),
      mk(
        8,
        "Geen digitaliseringsdwang in de zorg",
        "Contante betalingen, papieren aanvragen en fysiek menselijk contact blijven binnen alle maatschappelijke en zorgdiensten volledig mogelijk.",
      ),
      mk(
        9,
        "Geen activisme in het onderwijs en jeugdactiviteiten",
        "Gemeentelijke subsidies worden uitsluitend ingezet voor neutraal, inhoudelijk en leeftijdsadequaat onderwijs en jeugdwerk; er is geen plek voor ideologische of activistische programma's gericht op kinderen.",
      ),
      mk(
        10,
        "Vrijwilligerswerk en buurtinitiatieven stimuleren",
        "Wij waarderen en ondersteunen onze vele vrijwilligers, stimuleren burgerinitiatieven met kleine subsidies en ruimen belemmerende ambtelijke regels uit de weg.",
      ),
      mk(
        11,
        "Sterke lokale sportverenigingen",
        "Sportclubs vormen het fundament voor een gezonde levensstijl en sociale verbinding; wij ondersteunen verenigingen actief bij hun exploitatie en jeugdactiviteiten.",
      ),
      mk(
        12,
        "Sportvoorzieningen beschermen",
        "Belangrijke sport- en zwemvoorzieningen — zoals het zwembad in Vollenhove en zwembad De Waterwyck in Steenwijk — worden behouden en uitstekend onderhouden. Het sluiten van lokale zwembaden of het verplaatsen van zwemlessen naar buurgemeenten is voor ons onbespreekbaar.",
      ),
      mk(
        13,
        "Ruimte voor avontuurlijk spelen",
        "Wij richten uitdagende, groene en natuurlijke speelplekken in waar kinderen vrij buiten kunnen spelen en ontdekken, in plaats van steriele rubbertegelpleinen.",
      ),
    ],
  },
  {
    nr: 9,
    titel: "Milieu & Energie",
    iconKey: "leaf",
    intro:
      "Ware zorg voor onze leefomgeving begint op lokaal niveau: schone straten, verzorgde parken, gezond waterbeheer en een ongerept landschap. Dit bereiken we niet met onrealistische mondiale klimaatdoelen waar de gemeente geen invloed op heeft, maar door nuchter rentmeesterschap over onze eigen streek.\n\nLijst van Andel wijst ideologisch gedreven klimaatdwang — zoals torenhoge CO₂-reductiedoelen, verplichte van-het-gas-af-transities en de aanleg van landschapsontsierende wind- en zonneparken — categorisch af. Dergelijk beleid jaagt inwoners en bedrijven op torenhoge kosten zonder enig merkbaar milieurendement. Energievoorziening moet op de allereerste plaats betrouwbaar, betaalbaar en leveringszeker zijn.\n\nEcht milieubeleid richt zich op het bestrijden van zwerfafval, behoud van groen en bomen, praktisch waterbeheer en respect voor onze agrarische tradities.",
    standpunten: [
      mk(
        1,
        "Stoppen met onbetaalbare klimaatmaatregelen",
        "Wij stoppen met kostbare lokale CO₂-reductieprojecten en geforceerde energietransitieplannen. We behouden beproefde en betrouwbare energiebronnen zoals aardgas.",
      ),
      mk(
        2,
        "Geen windmolens, zonnevelden of biomassacentrales",
        "Wij weigeren vergunningen voor megawindturbines, grootschalige zonneparken op landbouwgrond en biomassacentrales die ons landschap aantasten en overlast veroorzaken. De definitieve sluiting van de overlastgevende biomassa-installatie IceBear in Steenwijk houden wij onvoorwaardelijk in stand; er komt geen doorstart.",
      ),
      mk(
        3,
        "Geen milieuactivisme op kosten van de burger",
        "Gemeentelijke subsidies aan activistische klimaatorganisaties of NGO's worden beëindigd, en we hanteren geen dwingende duurzaamheidseisen bij subsidies voor verenigingen.",
      ),
      mk(
        4,
        "Vrijheid in energiekeuze",
        "Inwoners behouden volledige vrijheid over hoe zij hun huis verwarmen — met aardgas, houtkachels of hybride oplossingen — zonder gemeentelijke dwang of gedwongen afsluitingen.",
      ),
      mk(
        5,
        "Geen stookverbod",
        "Wij stemmen principieel tegen elk stookverbod of restricties op het gebruik van traditionele houtkachels en open haarden.",
      ),
      mk(
        6,
        "Isolatie waar het helpt",
        "Wij moedigen praktische en betaalbare woningisolatie aan op basis van vrijwilligheid en gezond verstand, daar waar het inwoners direct een lagere energierekening oplevert.",
      ),
      mk(
        7,
        "Sterke boeren en agrarische sector",
        "Wij beschermen onze agrariërs en hun gronden tegen stikstofdwang, opkoopregelingen en gedwongen onteigening. Lokale voedselproductie en agrarische innovatie koesteren we.",
      ),
      mk(
        8,
        "Zwerfafval hard aanpakken",
        "Wij intensiveren de aanpak van zwerfvuil met voldoende afvalbakken die tijdig worden geleegd en gerichte handhaving tegen illegale dumpingen.",
      ),
      mk(
        9,
        "Betaalbaar afvalbeleid",
        "De milieustraten blijven laagdrempelig en betaalbaar toegankelijk. Wij voeren geen diftar-boetes, weegsystemen per kilo of privacygevoelige afvalmonitoring in.",
      ),
      mk(
        10,
        "Buurtparticipatie bij schoonmaak en groen",
        "Wij ondersteunen buurtbewoners en vrijwilligers die gezamenlijk zwerfvuilacties organiseren en plantsoenen in hun eigen straat adopteren.",
      ),
      mk(
        11,
        "Bescherming tegen hitte-eilanden",
        "Wij zorgen voor natuurlijke verkoeling en schaduw door extra bomen en groen aan te planten rondom pleinen, scholen en openbare parkeerterreinen.",
      ),
      mk(
        12,
        "Eerlijk en nuchter dierenwelzijnsbeleid",
        "Wij hanteren een nuchter dierenwelzijnsbeleid met strikte handhaving tegen dierenmishandeling en verwaarlozing, zonder ideologische bemoeienis.",
      ),
      mk(
        13,
        "Dieren als onderdeel van de gemeenschap",
        "Wij ondersteunen kinderboerderijen, het dierenasiel, de dierenambulance en zorgen voor schone hondenuitrenvelden. Educatieve initiatieven waarbij schoolkinderen kennismaken met het boerenleven — zoals bij Maargies Hoeve in Kallenkote of de Waterbuffelfarm in Oldemarkt — blijven we van harte steunen.",
      ),
    ],
  },
  {
    nr: 10,
    titel: "Nieuwe Technologie, Privacy & Vrijheid",
    iconKey: "cpu",
    intro:
      "Technologische innovaties voltrekken zich in hoog tempo en beïnvloeden vrijwel elk facet van onze maatschappij. Digitalisering, kunstmatige intelligentie en moderne communicatienetwerken bieden de gemeente aanzienlijke mogelijkheden om diensten te versnellen, de publieke dienstverlening te verbeteren en kosten te reduceren. Het is dan ook essentieel dat Steenwijkerland alert inspeelt op technologische vooruitgang.\n\nTegelijkertijd waken wij voor de schaduwzijden. Ongebreidelde datahonger, algoritmes en surveillance-technologieën worden te vaak klakkeloos ingevoerd onder het mom van vooruitgang, terwijl fundamentele burgerrechten en privacy in het geding komen.\n\nLijst van Andel kiest voor een innovatieve maar principiële koers: we omarmen technologische kansen om de gemeente slagvaardiger te maken, maar bewaken onvoorwaardelijk de privacy, keuzevrijheid en de menselijke maat voor al onze inwoners.",
    standpunten: [
      mk(
        1,
        "Moderne digitale dienstverlening met keuzevrijheid",
        "Wij zorgen voor snelle, gebruiksvriendelijke digitale gemeenteloketten, maar garanderen tegelijk dat inwoners die geen computer of smartphone bezitten hun zaken fysiek en mondeling kunnen blijven regelen.",
      ),
      mk(
        2,
        "Supersnelle digitale infrastructuur",
        "Wij bevorderen de uitrol van betrouwbaar en snel glasvezelinternet in zowel de kernen als het gehele buitengebied voor gezinnen, ondernemers en thuiswerkers.",
      ),
      mk(
        3,
        "Digitale flexwerkplekken",
        "Wij faciliteren moderne werkplekken met uitstekende digitale faciliteiten in onze kernen ter ondersteuning van thuiswerkers, zzp'ers en forensen.",
      ),
      mk(
        4,
        "Kunstmatige intelligentie als hulpmiddel",
        "Wij benutten AI op een praktische manier om interne processen te versnellen en bureaucratie te verminderen, maar borgen dat politieke besluiten en ambtelijke beoordelingen te allen tijde door mensen worden genomen.",
      ),
      mk(
        5,
        "Ruimte voor technologische innovatie",
        "Wij bieden ruimte aan pilots met veelbelovende technologieën die de gemeentelijke dienstverlening efficiënter, veiliger en betaalbaarder maken.",
      ),
      mk(
        6,
        "Vooruitdenken over nieuwe mobiliteit",
        "Wij anticiperen op toekomstige vervoersinnovaties, zoals zelfrijdend openbaar vervoer, drones en slimme deelshuttles, zodat onze infrastructuur klaar is voor de toekomst.",
      ),
      mk(
        7,
        "Transparant en veilig datagebruik",
        "Inwoners hebben te allen tijde recht op volledige inzage in hun gemeentelijke gegevens. Dataminimalisatie is de norm; burgerdata wordt onder geen beding verkocht of gebruikt voor commerciële profilering.",
      ),
      mk(
        8,
        "Privacy by design",
        "Alle nieuwe gemeentelijke software en digitale systemen worden vanaf de ontwerpfase verplicht ingericht met maximale privacy- en gegevensbescherming.",
      ),
      mk(
        9,
        "Slimme technologie onder democratische controle",
        "Toepassingen van 'smart city'-technologie in de openbare ruimte worden vooraf onderworpen aan expliciete raadsbesluiten en openheid naar de burger; we zijn uiterst terughoudend met sensoren en volgsystemen.",
      ),
      mk(
        10,
        "Cameratoezicht als instrument, niet als systeem",
        "Cameratoezicht dient uitsluitend als gericht hulpmiddel voor handhaving op specifieke risicolocaties en mag nooit uitmonden in permanente observatie van burgers.",
      ),
      mk(
        11,
        "Menselijk contact waarborgen",
        "Fysieke loketten, telefonische bereikbaarheid en contante betalingsmogelijkheden blijven onvoorwaardelijk behouden voor iedereen die persoonlijke service wenst.",
      ),
    ],
  },
];
