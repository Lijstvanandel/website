export interface DefaultFractielidData {
  id: string;
  name: string;
  role: string;
  type: string;
  bio?: string;
  speerpunten?: string[];
  beloftes?: Array<{ title: string; detail?: string }>;
  monthlyResultsMonth?: string;
  monthlyResults?: Array<{
    id: string;
    title: string;
    result?: string;
    videoId?: string;
    videoUrl?: string;
    durationLabel?: string;
  }>;
  email?: string;
  imgUrl: string;
  cutoutImageUrl?: string;
  socials?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export const DEFAULT_FRACTIELEDEN: DefaultFractielidData[] = [
  {
    id: "1",
    name: "Sammy van Andel",
    role: "Fractievoorzitter",
    type: "Raadslid",
    bio: "Fractievoorzitter van Onafhankelijk Steenwijkerland (OSL) in de gemeenteraad van Steenwijkerland. Zet zich met nuchter verstand in voor betaalbare starterswoningen, behoud van de dorpsvoorzieningen en lage lokale lasten.",
    imgUrl: "/assets/sammy.webp",
    cutoutImageUrl: "/assets/sammy.png",
    email: "fractie@onafhankelijksteenwijkerland.nl",
    speerpunten: [
      "Voorrang voor eigen inwoners bij woningtoewijzing",
      "Behoud van leefbaarheid en scholen in de dorpen",
      "Kritisch financieel toezicht en lage gemeentelijke lasten",
    ],
    beloftes: [
      {
        title: "Voorrang voor eigen inwoners bij woningtoewijzing",
        detail: "Inzet op betaalbare starters- en seniorenwoningen in onze eigen kernen.",
      },
      {
        title: "Behoud van leefbaarheid en scholen in de dorpen",
        detail: "Dorpshuizen, scholen en basisvoorzieningen blijven overeind.",
      },
      {
        title: "Geen onnodige lastenverhoging voor inwoners",
        detail: "Scherpe controle op gemeentelijke uitgaven en OZB-tarieven.",
      },
    ],
    socials: {
      instagram: "https://instagram.com/sammyvanandel",
    },
  },
  {
    id: "2",
    name: "Lisa Mars",
    role: "Raadslid",
    type: "Raadslid",
    bio: "Raadslid voor Onafhankelijk Steenwijkerland (OSL) in Steenwijkerland. Toegewijd aan zorg dichtbij, sterke jeugdhulp, kwalitatief onderwijs en een menselijke maat in het sociaal domein.",
    imgUrl: "/assets/lisa.webp",
    cutoutImageUrl: "/assets/lisa.png",
    email: "lisa@onafhankelijksteenwijkerland.nl",
    speerpunten: [
      "Zorg en ondersteuning dichtbij de inwoner",
      "Behoud van buurthuizen en ontmoetingsplekken",
      "Veilige schoolroutes en fietspaden",
    ],
    beloftes: [
      {
        title: "Zorg en ondersteuning dichtbij de inwoner",
        detail: "Minder papierwerk en sneller passende hulp voor gezinnen en ouderen.",
      },
      {
        title: "Behoud van buurthuizen en ontmoetingsplekken",
        detail: "Sterke verenigingen en laagdrempelige plekken in wijken en dorpen.",
      },
      {
        title: "Veilige schoolroutes en fietspaden",
        detail: "Concrete aandacht voor verkeersveiligheid rondom scholen en kernen.",
      },
    ],
  },
  {
    id: "3",
    name: "Nathan ten Wolde",
    role: "Burgerraadslid",
    type: "Burgerraadslid",
    bio: "Burgerraadslid voor Onafhankelijk Steenwijkerland (OSL) in Steenwijkerland met focus op financiën, economie, ondernemersruimte en lokale werkgelegenheid.",
    imgUrl: "/assets/nathan.webp",
    cutoutImageUrl: "/assets/nathan.png",
    speerpunten: [
      "Ruimte voor lokale mkb-bedrijven en familiebedrijven",
      "Eerlijke en transparante gemeentelijke begrotingen",
    ],
    beloftes: [
      {
        title: "Ruimte voor lokale mkb-bedrijven en familiebedrijven",
        detail: "Minder regeldruk en betere bereikbaarheid voor ondernemers.",
      },
      {
        title: "Eerlijke en transparante gemeentelijke begrotingen",
        detail: "Elke euro belastinggeld toetsen op aantoonbaar nut voor inwoners.",
      },
      {
        title: "Sterke lokale werkgelegenheid in Steenwijkerland",
        detail: "Kansen creëren voor jongeren om hier te wonen en te werken.",
      },
    ],
  },
  {
    id: "4",
    name: "Chris van Andel",
    role: "Burgerraadslid",
    type: "Burgerraadslid",
    bio: "Burgerraadslid voor Onafhankelijk Steenwijkerland (OSL) in Steenwijkerland met focus op leefomgeving, agrarische sector, waterbeheer en buitengebied.",
    imgUrl: "/assets/chris.webp",
    cutoutImageUrl: "/assets/silhouette.png",
    speerpunten: [
      "Bescherming van het karakter van ons buitengebied",
      "Snelle en nuchtere vergunningverlening",
    ],
    beloftes: [
      {
        title: "Bescherming van het karakter van ons buitengebied",
        detail: "Realistisch beleid met oog voor boeren, natuur en omwonenden.",
      },
      {
        title: "Snelle en nuchtere vergunningverlening",
        detail: "Duidelijke spelregels zonder onnodige vertraging bij de gemeente.",
      },
      {
        title: "Goed waterbeheer en onderhoud van het landelijk gebied",
        detail: "Praktische oplossingen voor wegen, bermen en waterafvoer.",
      },
    ],
  },
];
