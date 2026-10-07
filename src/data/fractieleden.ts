export interface DefaultFractielidData {
  id: string;
  name: string;
  role: string;
  type: string;
  bio?: string;
  speerpunten?: string[];
  email?: string;
  imgUrl: string;
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
    bio: "Fractievoorzitter van Lijst van Andel in de gemeenteraad van Steenwijkerland. Zet zich met nuchter verstand in voor betaalbare starterswoningen, behoud van de dorpsvoorzieningen en lage lokale lasten.",
    imgUrl: "/assets/sammy.webp",
    email: "fractie@lijstvanandel.nl",
    speerpunten: [
      "Voorrang voor eigen inwoners bij woningtoewijzing",
      "Behoud van leefbaarheid en scholen in de dorpen",
      "Kritisch financieel toezicht en lage gemeentelijke lasten",
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
    bio: "Raadslid voor Lijst van Andel in Steenwijkerland. Toegewijd aan zorg dichtbij, sterke jeugdhulp, kwalitatief onderwijs en een menselijke maat in het sociaal domein.",
    imgUrl: "/assets/lisa.webp",
    email: "lisa@lijstvanandel.nl",
    speerpunten: [
      "Zorg en ondersteuning dichtbij de inwoner",
      "Behoud van buurthuizen en ontmoetingsplekken",
      "Veilige schoolroutes en fietspaden",
    ],
  },
  {
    id: "3",
    name: "Nathan ten Wolde",
    role: "Burgerraadslid",
    type: "Burgerraadslid",
    bio: "Burgerraadslid voor Lijst van Andel in Steenwijkerland met focus op financiën, economie, ondernemersruimte en lokale werkgelegenheid.",
    imgUrl: "/assets/nathan.webp",
    speerpunten: [
      "Ruimte voor lokale mkb-bedrijven en familiebedrijven",
      "Eerlijke en transparante gemeentelijke begrotingen",
    ],
  },
  {
    id: "4",
    name: "Chris van Andel",
    role: "Burgerraadslid",
    type: "Burgerraadslid",
    bio: "Burgerraadslid voor Lijst van Andel in Steenwijkerland met focus op leefomgeving, agrarische sector, waterbeheer en buitengebied.",
    imgUrl: "/assets/chris.webp",
    speerpunten: [
      "Bescherming van het karakter van ons buitengebied",
      "Snelle en nuchtere vergunningverlening",
    ],
  },
];
