const kopwijzerImg = "/assets/news-kopwijzer.jpg";
const marktImg = "/assets/markt-steenwijk.jpg";

export interface MediaRetentionStats {
  starts: number;
  p25: number;
  p50: number;
  p75: number;
  p100: number; // ThruPlays / Volledig afgekeken of afgeluisterd
}

export interface NewsMediaStats {
  video?: MediaRetentionStats;
  podcast?: MediaRetentionStats;
}

export interface NewsItem {
  id: string;
  title: string;
  excerpt?: string;
  description?: string;
  content: string;
  date?: string;
  createdAt?: string;
  author?: string;
  authorId?: string;
  authorName?: string;
  authorRole?: string;
  authorAvatar?: string;
  image?: string;
  thumbnailUrl?: string;
  headerUrl?: string;
  category: string;
  wijkSlug?: string;
  wijkNaam?: string;
  isHidden?: boolean;
  // Video fields
  videoUrl?: string;
  videoTitle?: string;
  // Podcast fields
  isPodcast?: boolean;
  podcastAudioUrl?: string;
  podcastTitle?: string;
  podcastDuration?: string;
  podcastViews?: number;
  podcastSpotifyUrl?: string;
  podcastAppleUrl?: string;
  // Media retention & ThruPlay stats (25%, 50%, 75%, 100%)
  mediaStats?: NewsMediaStats;
  // Gekoppelde standpunten (/standpunten)
  linkedStandpunten?: LinkedStandpuntItem[];
}

export interface LinkedStandpuntItem {
  hoofdstukNr: number;
  standpuntNr: number;
  standpuntTitel?: string;
  type?: "verdieping" | "bron";
}

export const news: NewsItem[] = [
  {
    id: "kopwijzer-rtv-slos",
    title: "Sammy van Andel te gast bij Kopwijzer (RTV SLOS)",
    excerpt:
      "In de uitzending van Kopwijzer sprak Sammy met de presentator over de speerpunten van Lijst van Andel en de lokale agenda.",
    description:
      "In de uitzending van Kopwijzer sprak Sammy met de presentator over de speerpunten van Lijst van Andel en de lokale agenda.",
    content:
      "<p>Tijdens de uitzending van Kopwijzer op RTV SLOS ging Sammy van Andel uitgebreid in op de lokale prioriteiten van Lijst van Andel.</p><p>Onderwerpen die voorbijkwamen waren onder meer voorrang voor eigen inwoners op de woningmarkt, het behoud van de Weerribben-Wieden en een bestuurscultuur die dichter bij de inwoner staat. Sammy benadrukte het belang van een lokale, onafhankelijke stem in de raad — vrij van Haagse invloeden.</p>",
    date: "2026-04-18",
    createdAt: "2026-04-18T10:00:00.000Z",
    author: "Sammy van Andel",
    authorId: "1",
    authorName: "Sammy van Andel",
    authorRole: "Fractievoorzitter",
    authorAvatar: "/assets/sammy.png",
    image: kopwijzerImg,
    thumbnailUrl: kopwijzerImg,
    category: "Media",
  },
  {
    id: "betaalbare-startersleningen-steenwijkerland",
    title: "Sammy van Andel: Meer startersleningen en voorrang voor lokale jongeren",
    excerpt:
      "Fractievoorzitter Sammy van Andel presenteert een actieplan om jonge inwoners een eerlijke kans op de woningmarkt te bieden.",
    description:
      "Fractievoorzitter Sammy van Andel presenteert een actieplan om jonge inwoners een eerlijke kans op de woningmarkt te bieden.",
    content:
      "<p>In Steenwijkerland moeten jongeren vaak jarenlang wachten op een betaalbare woning of wijken ze noodgedwongen uit naar omliggende gemeenten. Sammy van Andel wil dit tij keren met een gerichte verruiming van de starterslening en striktere toewijzingsregels ten gunste van lokale inwoners.</p><p>\"Onze eigen jongeren zijn de toekomst van Steenwijkerland. Als zij niet kunnen blijven, veroudert de gemeente en verdwijnen voorzieningen in de dorpen en kernen,\" aldus Sammy.</p>",
    date: "2026-05-10",
    createdAt: "2026-05-10T09:00:00.000Z",
    author: "Sammy van Andel",
    authorId: "1",
    authorName: "Sammy van Andel",
    authorRole: "Fractievoorzitter",
    authorAvatar: "/assets/sammy.png",
    category: "Wonen & Bouwen",
    image: kopwijzerImg,
    thumbnailUrl: kopwijzerImg,
    wijkSlug: "steenwijk-centrum",
    wijkNaam: "Steenwijk Centrum",
  },
  {
    id: "nieuwe-impulsen-binnenstad",
    title: "Lijst van Andel pleit voor nieuwe impulsen in de binnenstad",
    excerpt:
      "De fractie dient een motie in om leegstand op de Markt actief aan te pakken en lokale ondernemers ruimte te geven.",
    description:
      "De fractie dient een motie in om leegstand op de Markt actief aan te pakken en lokale ondernemers ruimte te geven.",
    content:
      "<p>In de komende raadsvergadering dient Lijst van Andel een motie in die het college oproept met een concreet plan te komen om leegstand in het centrum van Steenwijk te bestrijden.</p><p>Volgens de fractie verdient de binnenstad een impuls die past bij de identiteit van de gemeente: ruimte voor lokale ondernemers, sfeer op de Markt en een aantrekkelijk verblijfsklimaat voor inwoners én bezoekers.</p>",
    date: "2026-05-02",
    createdAt: "2026-05-02T14:30:00.000Z",
    author: "Lisa Mars",
    authorId: "2",
    authorName: "Lisa Mars",
    authorRole: "Raadslid",
    authorAvatar: "/assets/lisa.png",
    image: marktImg,
    thumbnailUrl: marktImg,
    category: "Politiek",
    wijkSlug: "steenwijk-centrum",
    wijkNaam: "Steenwijk Centrum / Binnenstad",
  },
  {
    id: "behoud-buurthuizen-en-ontmoetingsplekken",
    title: "Lisa Mars: Behoud van buurthuizen en sociale ontmoetingsplekken cruciaal",
    excerpt:
      "Raadslid Lisa Mars pleit voor structurele ondersteuning van dorpshuizen en buurthuizen in de kernen van Steenwijkerland.",
    description:
      "Raadslid Lisa Mars pleit voor structurele ondersteuning van dorpshuizen en buurthuizen in de kernen van Steenwijkerland.",
    content:
      "<p>Dorpshuizen en wijkgebouwen vormen het kloppend hart van onze gemeenschap. Raadslid Lisa Mars roept het college op om niet te bezuinigen op subsidies voor beheer en verduurzaming van deze onmisbare ontmoetingsplekken.</p><p>\"Ontmoeting voorkomt eenzaamheid en versterkt de sociale samenhang. Dat moeten we koesteren in plaats van uithollen,\" benadrukt Lisa.</p>",
    date: "2026-05-14",
    createdAt: "2026-05-14T11:00:00.000Z",
    author: "Lisa Mars",
    authorId: "2",
    authorName: "Lisa Mars",
    authorRole: "Raadslid",
    authorAvatar: "/assets/lisa.png",
    category: "Sociaal & Zorg",
    image: marktImg,
    thumbnailUrl: marktImg,
  },
  {
    id: "ruimte-voor-lokale-ondernemers",
    title: "Nathan ten Wolde: Minder regeldruk voor lokale familiebedrijven en zzp’ers",
    excerpt:
      "Burgerraadslid Nathan ten Wolde wil dat de gemeente Steenwijkerland actief meedenkt met lokale ondernemers.",
    description:
      "Burgerraadslid Nathan ten Wolde wil dat de gemeente Steenwijkerland actief meedenkt met lokale ondernemers.",
    content:
      "<p>Als burgerraadslid met een hart voor het midden- en kleinbedrijf pleit Nathan ten Wolde voor een ondernemersvriendelijker vergunningenbeleid en een loket waar ondernemers in één keer geholpen worden.</p>",
    date: "2026-05-20",
    createdAt: "2026-05-20T10:00:00.000Z",
    author: "Nathan ten Wolde",
    authorId: "3",
    authorName: "Nathan ten Wolde",
    authorRole: "Burgerraadslid",
    authorAvatar: "/assets/nathan.png",
    category: "Economie & MKB",
    image: marktImg,
    thumbnailUrl: marktImg,
  },
];
