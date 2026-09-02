import kopwijzerImg from "@/assets/news-kopwijzer.jpg";
import marktImg from "@/assets/markt-steenwijk.jpg";

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  image: string;
  category: string;
}

export const news: NewsItem[] = [
  {
    id: "kopwijzer-rtv-slos",
    title: "Sammy van Andel te gast bij Kopwijzer (RTV SLOS)",
    excerpt:
      "In de uitzending van Kopwijzer sprak Sammy met de presentator over de speerpunten van Lijst van Andel en de lokale agenda.",
    content:
      "Tijdens de uitzending van Kopwijzer op RTV SLOS ging Sammy van Andel uitgebreid in op de lokale prioriteiten van Lijst van Andel. Onderwerpen die voorbijkwamen waren onder meer voorrang voor eigen inwoners op de woningmarkt, het behoud van de Weerribben-Wieden en een bestuurscultuur die dichter bij de inwoner staat. Sammy benadrukte het belang van een lokale, onafhankelijke stem in de raad — vrij van Haagse invloeden.",
    date: "2026-04-18",
    author: "Redactie",
    image: kopwijzerImg,
    category: "Media",
  },
  {
    id: "nieuwe-impulsen-binnenstad",
    title: "Lijst van Andel pleit voor nieuwe impulsen in de binnenstad",
    excerpt:
      "De fractie dient een motie in om leegstand op de Markt actief aan te pakken en lokale ondernemers ruimte te geven.",
    content:
      "In de komende raadsvergadering dient Lijst van Andel een motie in die het college oproept met een concreet plan te komen om leegstand in het centrum van Steenwijk te bestrijden. Volgens de fractie verdient de binnenstad een impuls die past bij de identiteit van de gemeente: ruimte voor lokale ondernemers, sfeer op de Markt en een aantrekkelijk verblijfsklimaat voor inwoners én bezoekers.",
    date: "2026-05-02",
    author: "Lijst van Andel",
    image: marktImg,
    category: "Politiek",
  },
];
