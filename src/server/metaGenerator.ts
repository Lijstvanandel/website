import fs from "fs";
import path from "path";
import { BUURTKAART_43_WIJKEN, LEGACY_SLUG_MAP } from "../data/defaultWijken.js";

export interface PageMetadata {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  canonicalUrl: string;
  keywords?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  structuredData?: object;
  robots?: string;
}

const DEFAULT_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6a28d811-8508-49fb-886c-cae636602e89/id-preview-d4978b6e--d986607a-92f9-418f-a640-08923c14bf91.lovable.app-1774473106949.png";
const DEFAULT_TITLE = "Lijst van Andel | Lokale Politiek Steenwijkerland";
const DEFAULT_DESC = "Officiële website en ledenportaal van politieke partij Lijst van Andel in Steenwijkerland met nieuws, fractieleden, agenda, standpunten en wijkpagina's.";

function stripHtml(html?: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, maxLen = 160): string {
  if (text.length <= maxLen) return text;
  const cut = text.substring(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.substring(0, lastSpace) : cut) + "...";
}

function resolveImageUrl(baseUrl: string, imgPath?: string): string {
  if (!imgPath) return DEFAULT_IMAGE;
  if (imgPath.startsWith("http://") || imgPath.startsWith("https://")) {
    return imgPath;
  }
  const cleanPath = imgPath.startsWith("/") ? imgPath : `/${imgPath}`;
  return `${baseUrl}${cleanPath}`;
}

export function getPageMetadata(urlPath: string, host: string, db: Record<string, any>): PageMetadata {
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  const cleanPath = urlPath.split("?")[0].split("#")[0];
  const canonicalUrl = `${baseUrl}${cleanPath === "/" ? "" : cleanPath}`;

  // 1. Home
  if (cleanPath === "/" || cleanPath === "") {
    return {
      title: "Lijst van Andel | Voor de inwoners van Steenwijkerland",
      description: "Lijst van Andel zet zich in voor nuchtere, transparante politiek, betaalbare woningbouw voor eigen inwoners en behoud van de dorpen en wijken in Steenwijkerland.",
      ogTitle: "Lijst van Andel - Onafhankelijke Lokale Politiek in Steenwijkerland",
      ogDescription: "Voorrang voor lokale woningzoekenden, behoud van voorzieningen in onze dorpen en een direct aanspreekbare fractie.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl,
      structuredData: {
        "@context": "https://schema.org",
        "@type": "PoliticalParty",
        "name": "Lijst van Andel",
        "url": baseUrl,
        "logo": DEFAULT_IMAGE,
        "description": DEFAULT_DESC,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Steenwijk",
          "addressRegion": "Overijssel",
          "postalCode": "8331",
          "addressCountry": "NL"
        },
        "sameAs": [
          "https://www.facebook.com/lijstvanandel",
          "https://www.instagram.com/lijstvanandel"
        ]
      }
    };
  }

  // 2. Nieuws detail: /nieuws/:id
  const nieuwsMatch = cleanPath.match(/^\/nieuws\/([a-zA-Z0-9_-]+)$/);
  if (nieuwsMatch) {
    const articleId = nieuwsMatch[1];
    const article = (db?.news || []).find((n: any) => n.id === articleId || n.slug === articleId);

    if (article) {
      const cleanDesc = truncate(stripHtml(article.excerpt || article.description || article.content || ""), 160);
      const articleImage = resolveImageUrl(baseUrl, article.headerUrl || article.thumbnailUrl || article.image);
      const title = `${article.title} | Lijst van Andel`;

      return {
        title,
        description: cleanDesc,
        ogTitle: article.title,
        ogDescription: cleanDesc,
        ogImage: articleImage,
        ogType: "article",
        canonicalUrl,
        author: article.author || "Lijst van Andel",
        publishedTime: article.createdAt || article.date,
        modifiedTime: article.updatedAt || article.createdAt || article.date,
        structuredData: {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          "headline": article.title,
          "description": cleanDesc,
          "image": [articleImage],
          "datePublished": article.createdAt || article.date,
          "dateModified": article.updatedAt || article.createdAt || article.date,
          "author": {
            "@type": "Organization",
            "name": article.author || "Lijst van Andel",
            "url": baseUrl
          },
          "publisher": {
            "@type": "PoliticalParty",
            "name": "Lijst van Andel",
            "logo": {
              "@type": "ImageObject",
              "url": DEFAULT_IMAGE
            }
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalUrl
          }
        }
      };
    }
  }

  // 3. Nieuwsoverzicht: /nieuws
  if (cleanPath === "/nieuws") {
    return {
      title: "Laatste Nieuws & Persberichten | Lijst van Andel",
      description: "Blijf op de hoogte van moties, raadsvergaderingen, opinie en actueel politiek nieuws uit Steenwijk en alle omliggende kernen.",
      ogTitle: "Nieuws & Actualiteiten | Lijst van Andel Steenwijkerland",
      ogDescription: "Actueel nieuws over lokale politiek, woningbouw, zorg en voorzieningen in de gemeente Steenwijkerland.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl
    };
  }

  // 4. Wijken detail: /wijken-en-kernen/:slug of /wijken-en/kernen/:slug
  const wijkMatch = cleanPath.match(/^\/wijken-en[-/]kernen\/([a-zA-Z0-9_-]+)$/);
  if (wijkMatch) {
    let slug = wijkMatch[1];
    if (LEGACY_SLUG_MAP && LEGACY_SLUG_MAP[slug]) {
      slug = LEGACY_SLUG_MAP[slug];
    }
    const allWijken = db?.wijken?.length ? db.wijken : BUURTKAART_43_WIJKEN;
    const wijk = allWijken.find((w: any) => w.slug === slug);

    if (wijk) {
      const cleanDesc = truncate(stripHtml(wijk.beschrijving || `Informatie, speerpunten en nieuws voor ${wijk.naam} in de gemeente Steenwijkerland.`), 160);
      const wijkImage = resolveImageUrl(baseUrl, wijk.bannerUrl || wijk.fotoUrl);
      const title = `${wijk.naam} (${wijk.type || 'Wijk/Kern'}) | Lijst van Andel`;

      return {
        title,
        description: cleanDesc,
        ogTitle: `${wijk.naam} - Lokale plannen & speerpunten`,
        ogDescription: cleanDesc,
        ogImage: wijkImage,
        ogType: "website",
        canonicalUrl,
        structuredData: {
          "@context": "https://schema.org",
          "@type": "Place",
          "name": wijk.naam,
          "description": cleanDesc,
          "image": wijkImage,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": wijk.gemeente || "Steenwijkerland",
            "addressRegion": "Overijssel",
            "addressCountry": "NL"
          }
        }
      };
    }
  }

  // 5. Wijken overzicht: /wijken-en-kernen of /wijken-en/kernen
  if (cleanPath === "/wijken-en-kernen" || cleanPath === "/wijken-en/kernen") {
    return {
      title: "Wijken en Kernen in Steenwijkerland | Lijst van Andel",
      description: "Ontdek wat Lijst van Andel doet in jouw dorp, wijk of kern. Van Steenwijk en Tuk tot Oldemarkt, Blokzijl, Giethoorn en Vollenhove.",
      ogTitle: "Wijken & Kernen van Steenwijkerland | Lijst van Andel",
      ogDescription: "Lokale speerpunten en dossiers voor alle 42 kernen en wijken in onze gemeente.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl
    };
  }

  // 6. Agenda detail: /agenda/:id
  const agendaMatch = cleanPath.match(/^\/agenda\/([a-zA-Z0-9_-]+)$/);
  if (agendaMatch) {
    const eventId = agendaMatch[1];
    const event = (db?.events || []).find((e: any) => e.id === eventId);

    if (event) {
      const cleanDesc = truncate(stripHtml(event.shortDescription || event.description || ""), 160);
      const eventImage = resolveImageUrl(baseUrl, event.thumbnailUrl || event.headerUrl);
      const title = `${event.title} | Agenda Lijst van Andel`;

      return {
        title,
        description: cleanDesc,
        ogTitle: event.title,
        ogDescription: cleanDesc,
        ogImage: eventImage,
        ogType: "event",
        canonicalUrl,
        structuredData: {
          "@context": "https://schema.org",
          "@type": "Event",
          "name": event.title,
          "description": cleanDesc,
          "startDate": event.date ? `${event.date}T${event.startTime || "19:30"}:00` : undefined,
          "endDate": event.date && event.endTime ? `${event.date}T${event.endTime}:00` : undefined,
          "eventStatus": event.isCancelled ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
          "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
          "location": {
            "@type": "Place",
            "name": event.address || "Steenwijk",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": event.address || "",
              "addressLocality": "Steenwijkerland",
              "addressCountry": "NL"
            }
          },
          "image": [eventImage],
          "organizer": {
            "@type": "Organization",
            "name": "Lijst van Andel",
            "url": baseUrl
          }
        }
      };
    }
  }

  // 7. Agenda overzicht: /agenda
  if (cleanPath === "/agenda") {
    return {
      title: "Agenda & Inloopavonden | Lijst van Andel",
      description: "Bekijk aankomende bijeenkomsten, openbare fractievergaderingen, ideeëncafés en inloopavonden van Lijst van Andel in Steenwijkerland.",
      ogTitle: "Agenda van Lijst van Andel | Kom in gesprek",
      ogDescription: "Data en locaties van openbare fractievergaderingen, inloopavonden en thema-bijeenkomsten.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl
    };
  }

  // 8. Fractie / Raadsleden / Bestuur / Steunfractie
  if (cleanPath === "/fractie" || cleanPath === "/raadsleden") {
    return {
      title: "Onze Fractie & Raadsleden | Lijst van Andel",
      description: "Maak kennis met onze fractieleden in de gemeenteraad van Steenwijkerland. Bekijk hun achtergrond, speerpunten en plan direct een belafspraak.",
      ogTitle: "Fractie & Raadsleden | Lijst van Andel Steenwijkerland",
      ogDescription: "Direct aanspreekbare volksvertegenwoordigers met een nuchtere blik en hart voor de inwoners.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl
    };
  }

  if (cleanPath === "/bestuur") {
    return {
      title: "Het Partijbestuur | Lijst van Andel",
      description: "Het bestuur van Lijst van Andel bewaakt de koers van de vereniging en ondersteunt de fractie in Steenwijkerland.",
      ogTitle: "Partijbestuur | Lijst van Andel",
      ogDescription: "Informatie over de bestuursleden en de organisatie achter Lijst van Andel.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl
    };
  }

  if (cleanPath === "/steunfractie") {
    return {
      title: "Steunfractie & Vrijwilligers | Lijst van Andel",
      description: "Onze steunfractieleden verdiepen zich in dossiers, bereiden raadsvoorstellen voor en zijn de oren en ogen in de wijken.",
      ogTitle: "Steunfractie | Lijst van Andel",
      ogDescription: "Meedenken en meedoen met onze lokale beweging in Steenwijkerland.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl
    };
  }

  // 9. Standpunten & Programma
  if (cleanPath === "/standpunten") {
    return {
      title: "Standpunten & Verkiezingsprogramma | Lijst van Andel",
      description: "Lees onze standpunten over betaalbare woningbouw voor eigen inwoners, leefbare dorpen, lokale lasten en behoud van natuur in Steenwijkerland.",
      ogTitle: "Onze Standpunten | Lijst van Andel Steenwijkerland",
      ogDescription: "Duidelijke taal en gezond verstand: ontdek de visie van Lijst van Andel op Steenwijkerland.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl
    };
  }

  // 10. Contact
  if (cleanPath === "/contact") {
    return {
      title: "Contact & Belafspraak | Lijst van Andel",
      description: "Heeft u een vraag of signaal voor de gemeenteraad? Neem contact met ons op of plan een 1-op-1 telefonische afspraak in met een fractielid.",
      ogTitle: "Neem Contact op met Lijst van Andel",
      ogDescription: "Direct bereikbaar voor inwoners via contactformulier, telefoon of een persoonlijke belafspraak.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl
    };
  }

  // 11. Fractielid video's detail: /fractie/:id/videos of /raadsleden/:id/videos
  const videoMemberMatch = cleanPath.match(/^\/(?:fractie|raadsleden)\/([a-zA-Z0-9_-]+)\/videos$/);
  if (videoMemberMatch) {
    const memberId = videoMemberMatch[1];
    const member = (db?.fractieleden || []).find((m: any) => m.id === memberId || m.name?.toLowerCase().includes(memberId.toLowerCase()));
    if (member) {
      const memberImage = resolveImageUrl(baseUrl, member.imgUrl);
      const title = `Video's & Raadsbijdragen van ${member.name} | Lijst van Andel`;
      const desc = `Bekijk alle videobijdragen, raadsdebatten en toelichtingen van ${member.name} (${member.role || 'Raadslid'}) in de gemeenteraad van Steenwijkerland.`;
      return {
        title,
        description: desc,
        ogTitle: title,
        ogDescription: desc,
        ogImage: memberImage,
        ogType: "video.other",
        canonicalUrl
      };
    }
  }

  // 12. Login / Register / Dashboard / Admin (Noindex for private / auth pages)
  if (cleanPath === "/login" || cleanPath === "/registreren" || cleanPath === "/dashboard" || cleanPath === "/admin") {
    return {
      title: "Ledenportaal & Beheer | Lijst van Andel",
      description: "Inloggen voor leden en fractieleden van politieke partij Lijst van Andel.",
      ogTitle: "Ledenportaal | Lijst van Andel",
      ogDescription: "Toegang tot het interne ledenportaal en fractiedossiers.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl,
      robots: "noindex, nofollow"
    };
  }

  // Default fallback
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    ogTitle: DEFAULT_TITLE,
    ogDescription: DEFAULT_DESC,
    ogImage: DEFAULT_IMAGE,
    ogType: "website",
    canonicalUrl
  };
}

export function injectMetadataIntoHtml(html: string, meta: PageMetadata): string {
  let modified = html;

  // Title replacement
  if (/<title>.*?<\/title>/i.test(modified)) {
    modified = modified.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);
  } else {
    modified = modified.replace("</head>", `  <title>${escapeHtml(meta.title)}</title>\n</head>`);
  }

  // Helper to replace or inject meta tag
  function setMetaName(name: string, content: string) {
    const escaped = escapeHtml(content);
    const regex = new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, "i");
    if (regex.test(modified)) {
      modified = modified.replace(regex, `<meta name="${name}" content="${escaped}">`);
    } else {
      modified = modified.replace("</head>", `  <meta name="${name}" content="${escaped}">\n</head>`);
    }
  }

  function setMetaProperty(prop: string, content: string) {
    const escaped = escapeHtml(content);
    const regex = new RegExp(`<meta\\s+property=["']${prop}["'][^>]*>`, "i");
    if (regex.test(modified)) {
      modified = modified.replace(regex, `<meta property="${prop}" content="${escaped}">`);
    } else {
      modified = modified.replace("</head>", `  <meta property="${prop}" content="${escaped}">\n</head>`);
    }
  }

  // Descriptions
  setMetaName("description", meta.description);
  setMetaProperty("og:description", meta.ogDescription);
  setMetaName("twitter:description", meta.ogDescription);

  // Titles
  setMetaProperty("og:title", meta.ogTitle);
  setMetaName("twitter:title", meta.ogTitle);

  // Images
  setMetaProperty("og:image", meta.ogImage);
  setMetaName("twitter:image", meta.ogImage);
  setMetaProperty("og:image:secure_url", meta.ogImage);

  // Type and URL
  setMetaProperty("og:type", meta.ogType);
  setMetaProperty("og:url", meta.canonicalUrl);
  setMetaProperty("og:site_name", "Lijst van Andel");

  // Twitter Card
  setMetaName("twitter:card", "summary_large_image");

  // Canonical link tag
  if (/<link\s+rel=["']canonical["'][^>]*>/i.test(modified)) {
    modified = modified.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${meta.canonicalUrl}">`);
  } else {
    modified = modified.replace("</head>", `  <link rel="canonical" href="${meta.canonicalUrl}">\n</head>`);
  }

  // Optional Robots (e.g. noindex for /admin and /login)
  if (meta.robots) {
    setMetaName("robots", meta.robots);
  }

  // Optional Published / Modified Time for Articles
  if (meta.publishedTime) {
    setMetaProperty("article:published_time", meta.publishedTime);
  }
  if (meta.modifiedTime) {
    setMetaProperty("article:modified_time", meta.modifiedTime);
  }
  if (meta.author) {
    setMetaName("author", meta.author);
  }

  // Inject Structured JSON-LD Data if available
  if (meta.structuredData) {
    const jsonLd = JSON.stringify(meta.structuredData);
    const jsonLdScript = `\n  <script type="application/ld+json">\n${jsonLd}\n  </script>\n`;
    modified = modified.replace("</head>", `${jsonLdScript}</head>`);
  }

  return modified;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
