export interface LoginBenefitItem {
  id: string;
  text: string;
  icon: string;
  imageUrl: string;
  imageAlt?: string;
  order: number;
}

export interface LoginImageOption {
  id: string;
  url: string;
  label: string;
  isPreset?: boolean;
  uploadedAt?: string;
}

export interface LoginPageSettings {
  sectionTitle: string;
  sectionSubtitle: string;
  footerText: string;
  ctaButtonText: string;
  autoPlay: boolean;
  autoPlayIntervalMs: number;
}

export const DEFAULT_LOGIN_SETTINGS: LoginPageSettings = {
  sectionTitle: "Voordelen als lid",
  sectionSubtitle:
    "Als lid van Lijst van Andel staat u dicht bij de lokale politiek van Steenwijkerland en bouwt u actief mee aan een betrokken en sterke gemeenschap.",
  footerText: "Samen bereiken we meer voor Steenwijk en alle kernen.",
  ctaButtonText: "Sluit u vandaag nog aan",
  autoPlay: true,
  autoPlayIntervalMs: 5000,
};

export const DEFAULT_LOGIN_BENEFITS: LoginBenefitItem[] = [
  {
    id: "benefit-1",
    icon: "Users",
    text: "Ontmoet u andere LVA'ers die de gemeente een warm hart toedragen",
    imageUrl: "/assets/markt-steenwijk.jpg",
    imageAlt: "Ontmoet andere LVA'ers in Steenwijkerland",
    order: 1,
  },
  {
    id: "benefit-2",
    icon: "Bell",
    text: "Wordt u regelmatig op de hoogte gehouden met wat speelt in de gemeente",
    imageUrl: "/assets/news-kopwijzer.jpg",
    imageAlt: "Op de hoogte van wat speelt in de gemeente",
    order: 2,
  },
  {
    id: "benefit-3",
    icon: "Vote",
    text: "Kunt u actief participeren in het democratisch proces via het ledenportaal",
    imageUrl: "/assets/speerpunt-voorrang.jpg",
    imageAlt: "Actief participeren via het ledenportaal",
    order: 3,
  },
  {
    id: "benefit-4",
    icon: "Calendar",
    text: "Krijgt u toegang tot tal van evenementen in Steenwijkerland",
    imageUrl: "/assets/steenwijk-aerial.jpg",
    imageAlt: "Toegang tot evenementen in Steenwijkerland",
    order: 4,
  },
];

export const PRESET_LOGIN_IMAGES: LoginImageOption[] = [
  {
    id: "preset-markt",
    url: "/assets/markt-steenwijk.jpg",
    label: "Markt Steenwijk & Ontmoeting",
    isPreset: true,
  },
  {
    id: "preset-kopwijzer",
    url: "/assets/news-kopwijzer.jpg",
    label: "Media & Kopwijzer Uitzending",
    isPreset: true,
  },
  {
    id: "preset-voorrang",
    url: "/assets/speerpunt-voorrang.jpg",
    label: "Woningbouw & Participatie",
    isPreset: true,
  },
  {
    id: "preset-aerial",
    url: "/assets/steenwijk-aerial.jpg",
    label: "Steenwijk Luchtfoto",
    isPreset: true,
  },
  {
    id: "preset-kernen",
    url: "/assets/speerpunt-kernen.jpg",
    label: "Dorpen & Kernen Steenwijkerland",
    isPreset: true,
  },
  {
    id: "preset-natuur",
    url: "/assets/speerpunt-natuur.jpg",
    label: "Natuur & Weerribben-Wieden",
    isPreset: true,
  },
  {
    id: "preset-boeren",
    url: "/assets/speerpunt-boeren.jpg",
    label: "Buitengebied & Agrariërs",
    isPreset: true,
  },
  {
    id: "preset-lasten",
    url: "/assets/speerpunt-lasten.jpg",
    label: "Gemeentebestuur & Lokale Lasten",
    isPreset: true,
  },
  {
    id: "preset-oostermeenthe",
    url: "/assets/oostermeenthe-banner.jpg",
    label: "Wijken & Samenleving",
    isPreset: true,
  },
  {
    id: "preset-hero",
    url: "/assets/hero-banner.jpg",
    label: "Lijst van Andel Sfeerbeeld",
    isPreset: true,
  },
];

export const LOGIN_BENEFIT_ICONS = [
  { name: "Users", label: "Mensen / Leden" },
  { name: "Bell", label: "Melding / Bel" },
  { name: "Vote", label: "Stemmen / Democratie" },
  { name: "Calendar", label: "Kalender / Evenementen" },
  { name: "CheckCircle2", label: "Vinkje / Voordeel" },
  { name: "Heart", label: "Hart / Betrokkenheid" },
  { name: "Handshake", label: "Handdruk / Verbinding" },
  { name: "ShieldCheck", label: "Schild / Vertrouwen" },
  { name: "Sparkles", label: "Sterren / Exclusief" },
  { name: "Megaphone", label: "Megafoon / Inspraak" },
  { name: "MapPin", label: "Locatie / Gemeente" },
  { name: "Building2", label: "Gemeentehuis / Bestuur" },
  { name: "Award", label: "Lintje / Waardering" },
  { name: "BookOpen", label: "Boek / Kennis & Stukken" },
  { name: "MessageSquare", label: "Gesprek / Dialoog" },
  { name: "ThumbsUp", label: "Duim omhoog / Steun" },
  { name: "FileText", label: "Document / Dossier" },
  { name: "Globe", label: "Regio / Netwerk" },
  { name: "Star", label: "Ster / Speerpunt" },
  { name: "Lightbulb", label: "Idee / Denktank" },
  { name: "Flag", label: "Vlag / Koers" },
  { name: "Landmark", label: "Raadzaal / Politiek" },
] as const;
