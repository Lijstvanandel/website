export interface WijkSocials {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  telegram?: string;
  tiktok?: string;
}

export interface WijkVertegenwoordiger {
  voornaam: string;
  achternaam: string;
  fotoUrl?: string;
  beschrijving: string;
  email: string;
  rol?: string; // "Wijkvertegenwoordiger" | "Kernvertegenwoordiger"
  socials: WijkSocials;
}

export interface WijkItem {
  slug: string;
  naam: string;
  type: "Wijk" | "Kern";
  gemeente: string;
  bannerUrl?: string;
  beschrijving?: string;
  vertegenwoordiger?: WijkVertegenwoordiger | null;
  updatedAt?: string;
}
