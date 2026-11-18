import fs from "fs";
import path from "path";
import { BUURTKAART_43_WIJKEN, LEGACY_SLUG_MAP } from "../data/defaultWijken.js";
import { DEFAULT_FRACTIELEDEN } from "../data/fractieleden.js";
import { hoofdstukken } from "../data/partijprogramma.js";
import { DEFAULT_VIDEO_STANDPUNTEN } from "./siteSnapshotCache.js";

export interface PageMetadata {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageType?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogImageAlt?: string;
  ogType: string;
  canonicalUrl: string;
  preloadImage?: string;
  keywords?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  structuredData?: object;
  semanticHtml?: string;
  robots?: string;
}

const DEFAULT_IMAGE_PATH = "/assets/hero-banner.jpg";
const DEFAULT_IMAGE = "https://onafhankelijksteenwijkerland.nl/assets/hero-banner.jpg";
const DEFAULT_TITLE = "Onafhankelijk Steenwijkerland (OSL) | Lokale Politiek Steenwijkerland";
const DEFAULT_DESC = "Officiële website en ledenportaal van politieke partij Onafhankelijk Steenwijkerland (OSL) in Steenwijkerland met nieuws, fractieleden, agenda, standpunten en wijkpagina's.";

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

function truncate(text: string, maxLen = 150): string {
  if (text.length <= maxLen) return text;
  const cut = text.substring(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.substring(0, lastSpace) : cut) + "...";
}

function resolveImageUrl(baseUrl: string, imgPath?: string): string {
  const isLocalOnly =
    baseUrl.includes("localhost") ||
    baseUrl.includes("127.0.0.1") ||
    baseUrl.includes("0.0.0.0");
  const effectiveBase = isLocalOnly ? "https://onafhankelijksteenwijkerland.nl" : baseUrl;

  if (!imgPath) {
    return `${effectiveBase}${DEFAULT_IMAGE_PATH}`;
  }

  if (imgPath.startsWith("http://") || imgPath.startsWith("https://")) {
    if (imgPath.endsWith(".webp") && (imgPath.includes("onafhankelijksteenwijkerland.nl") || imgPath.includes("lijstvanandel.nl"))) {
      return imgPath.replace(/\.webp$/i, ".jpg");
    }
    return imgPath;
  }

  let cleanPath = imgPath.startsWith("/") ? imgPath : `/${imgPath}`;
  // WhatsApp & certain crawlers do not unfurl .webp images. Convert to corresponding .jpg or .png if present
  if (cleanPath.endsWith(".webp")) {
    const jpgCandidate = cleanPath.replace(/\.webp$/i, ".jpg");
    const pngCandidate = cleanPath.replace(/\.webp$/i, ".png");
    if (
      fs.existsSync(path.join(process.cwd(), "public", jpgCandidate)) ||
      fs.existsSync(path.join(process.cwd(), "dist", jpgCandidate))
    ) {
      cleanPath = jpgCandidate;
    } else if (
      fs.existsSync(path.join(process.cwd(), "public", pngCandidate)) ||
      fs.existsSync(path.join(process.cwd(), "dist", pngCandidate))
    ) {
      cleanPath = pngCandidate;
    } else {
      // Fallback: If no local jpg or png candidate exists, use guaranteed public hero banner jpg
      return `${effectiveBase}${DEFAULT_IMAGE_PATH}`;
    }
  }

  return `${effectiveBase}${cleanPath}`;
}

function extractYouTubeThumb(videoUrl?: string): string | null {
  if (!videoUrl || typeof videoUrl !== "string") return null;
  const ytRegex = /(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = videoUrl.trim().match(ytRegex);
  return match && match[1] ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

function extractVideoEmbedUrl(videoUrl?: string): string | null {
  if (!videoUrl || typeof videoUrl !== "string") return null;
  const trimmed = videoUrl.trim();
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  return null;
}

function toIsoDateString(rawDate?: string): string {
  if (!rawDate) return new Date().toISOString();
  const parsed = new Date(rawDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return new Date().toISOString();
}

export function getPageMetadata(urlPath: string, host: string, db: Record<string, any>): PageMetadata {
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0");
  const isPreview = host.includes("preview.ai-studio.app") || host.includes("web.app") || host.includes("lovable.app");
  // Social media crawlers (WhatsApp, Facebook, Twitter, LinkedIn) require canonical public URLs
  const effectiveHost = (isLocal || isPreview) ? "onafhankelijksteenwijkerland.nl" : (host || "onafhankelijksteenwijkerland.nl");
  const baseUrl = `https://${effectiveHost}`;
  const pathParts = urlPath.split("?");
  const rawPath = pathParts[0].split("#")[0];
  const cleanPath = (rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath).toLowerCase();
  const queryString = pathParts[1] ? pathParts[1].split("#")[0] : "";
  const queryParams = new URLSearchParams(queryString);
  const canonicalUrl = `${baseUrl}${cleanPath === "/" ? "" : cleanPath}`;

  // 1. Home
  if (cleanPath === "/" || cleanPath === "") {
    return {
      title: "Onafhankelijk Steenwijkerland (OSL) | Voor de inwoners van Steenwijkerland",
      description: "Onafhankelijk Steenwijkerland (OSL) zet zich in voor nuchtere politiek, betaalbare woningbouw voor inwoners en behoud van dorpen en wijken in Steenwijkerland.",
      ogTitle: "Onafhankelijk Steenwijkerland (OSL) - Onafhankelijke Lokale Politiek",
      ogDescription: "Voorrang voor lokale woningzoekenden, behoud van voorzieningen in onze dorpen en een direct aanspreekbare fractie.",
      ogImage: DEFAULT_IMAGE,
      preloadImage: "/assets/steenwijk-aerial.webp",
      ogType: "website",
      canonicalUrl,
      structuredData: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "PoliticalParty",
            "@id": `${baseUrl}/#party`,
            "name": "Onafhankelijk Steenwijkerland",
            "alternateName": ["OSL", "Onafhankelijk Steenwijkerland (OSL)", "voorheen Lijst van Andel", "LvA"],
            "url": baseUrl,
            "logo": DEFAULT_IMAGE,
            "image": DEFAULT_IMAGE,
            "description": "Onafhankelijke lokale politieke partij in de gemeenteraad van Steenwijkerland, opkomend voor lokale inwoners, betaalbare starterswoningen en leefbare kernen.",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Vendelweg 1",
              "addressLocality": "Steenwijk",
              "addressRegion": "Overijssel",
              "postalCode": "8331 XE",
              "addressCountry": "NL"
            },
            "areaServed": {
              "@type": "AdministrativeArea",
              "name": "Steenwijkerland",
              "sameAs": "https://nl.wikipedia.org/wiki/Steenwijkerland"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "fractiesecretariaat",
              "email": "fractie@onafhankelijksteenwijkerland.nl",
              "availableLanguage": ["Dutch", "Nederlands"]
            },
            "member": [
              {
                "@type": "Person",
                "name": "Sammy van Andel",
                "jobTitle": "Fractievoorzitter en Gemeenteraadslid"
              },
              {
                "@type": "Person",
                "name": "Lisa Mars",
                "jobTitle": "Gemeenteraadslid"
              }
            ],
            "sameAs": [
              "https://www.facebook.com/onafhankelijksteenwijkerland",
              "https://www.instagram.com/onafhankelijksteenwijkerland"
            ]
          },
          {
            "@type": "WebSite",
            "@id": `${baseUrl}/#website`,
            "url": baseUrl,
            "name": "Onafhankelijk Steenwijkerland (OSL)",
            "description": DEFAULT_DESC,
            "publisher": {
              "@id": `${baseUrl}/#party`
            },
            "inLanguage": "nl-NL"
          }
        ]
      }
    };
  }

  // 2. Nieuws detail: /nieuws/:id
  const nieuwsMatch = cleanPath.match(/^\/nieuws\/([a-zA-Z0-9_-]+)$/);
  if (nieuwsMatch) {
    const articleId = nieuwsMatch[1].toLowerCase();
    const article = (db?.news || []).find((n: any) =>
      String(n.id).toLowerCase() === articleId ||
      (n.slug && n.slug.toLowerCase() === articleId)
    );

    if (article) {
      const cleanDesc = truncate(stripHtml(article.excerpt || article.description || article.content || ""), 160);
      const rawImage = article.thumbnailUrl || article.headerUrl || article.image || article.imageUrl;
      const articleImage = resolveImageUrl(baseUrl, rawImage);
      const title = `${article.title} | Onafhankelijk Steenwijkerland`;

      return {
        title,
        description: cleanDesc,
        ogTitle: article.title,
        ogDescription: cleanDesc,
        ogImage: articleImage,
        ogImageType: "image/jpeg",
        ogImageWidth: 1200,
        ogImageHeight: 630,
        ogImageAlt: article.title,
        ogType: "article",
        canonicalUrl,
        author: article.author || "Onafhankelijk Steenwijkerland",
        publishedTime: article.createdAt || article.date,
        modifiedTime: article.updatedAt || article.createdAt || article.date,
        structuredData: {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "NewsArticle",
              "headline": article.title,
              "description": cleanDesc,
              "image": [articleImage],
              "datePublished": article.createdAt || article.date,
              "dateModified": article.updatedAt || article.createdAt || article.date,
              "inLanguage": "nl-NL",
              "author": {
                "@type": "Organization",
                "name": article.author || "Onafhankelijk Steenwijkerland",
                "url": baseUrl
              },
              "publisher": {
                "@type": "PoliticalParty",
                "name": "Onafhankelijk Steenwijkerland",
                "logo": {
                  "@type": "ImageObject",
                  "url": DEFAULT_IMAGE
                }
              },
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": canonicalUrl
              }
            },
            {
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": baseUrl
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Nieuws",
                  "item": `${baseUrl}/nieuws`
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": article.title,
                  "item": canonicalUrl
                }
              ]
            }
          ]
        }
      };
    }
  }

  // 3. Nieuwsoverzicht: /nieuws
  if (cleanPath === "/nieuws") {
    return {
      title: "Laatste Nieuws & Persberichten | Onafhankelijk Steenwijkerland",
      description: "Blijf op de hoogte van moties, raadsvergaderingen, opinie en actueel politiek nieuws uit Steenwijk en alle omliggende kernen.",
      ogTitle: "Nieuws & Actualiteiten | Onafhankelijk Steenwijkerland (OSL)",
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
      const rawWijkImg = (
        (wijk.bannerUrl && wijk.bannerUrl.trim() && wijk.bannerUrl !== "/assets/hero-banner.webp" ? wijk.bannerUrl.trim() : null) ||
        (wijk.heroBannerUrl && wijk.heroBannerUrl.trim() && wijk.heroBannerUrl !== "/assets/steenwijk-aerial.webp" ? wijk.heroBannerUrl.trim() : null) ||
        wijk.bannerUrl?.trim() ||
        wijk.heroBannerUrl?.trim() ||
        "/assets/steenwijk-aerial.webp"
      );
      const wijkImage = resolveImageUrl(baseUrl, rawWijkImg);
      const preloadWijkBanner = (rawWijkImg.startsWith("/assets/") && !rawWijkImg.includes("/uploads/"))
        ? rawWijkImg.replace(/\.(jpg|jpeg|png)$/i, ".webp")
        : rawWijkImg;
      const title = `${wijk.naam} (${wijk.type || 'Wijk/Kern'}) | Onafhankelijk Steenwijkerland`;

      return {
        title,
        description: cleanDesc,
        ogTitle: `${wijk.naam} - Lokale plannen & speerpunten`,
        ogDescription: cleanDesc,
        ogImage: wijkImage,
        preloadImage: preloadWijkBanner,
        ogType: "website",
        canonicalUrl,
        structuredData: {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Place",
              "name": wijk.naam,
              "description": cleanDesc,
              "image": wijkImage,
              "address": {
                "@type": "PostalAddress",
                "addressLocality": wijk.gemeente || "Steenwijkerland",
                "addressRegion": "Overijssel",
                "addressCountry": "NL"
              },
              "containedInPlace": {
                "@type": "AdministrativeArea",
                "name": "Gemeente Steenwijkerland",
                "sameAs": "https://nl.wikipedia.org/wiki/Steenwijkerland"
              }
            },
            {
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": baseUrl
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Wijken en Kernen",
                  "item": `${baseUrl}/wijken-en-kernen`
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": wijk.naam,
                  "item": canonicalUrl
                }
              ]
            }
          ]
        }
      };
    }
  }

  // 5. Wijken overzicht: /wijken-en-kernen of /wijken-en/kernen
  if (cleanPath === "/wijken-en-kernen" || cleanPath === "/wijken-en/kernen") {
    return {
      title: "Wijken en Kernen in Steenwijkerland | Onafhankelijk Steenwijkerland",
      description: "Ontdek wat Onafhankelijk Steenwijkerland (OSL) doet in jouw dorp, wijk of kern. Van Steenwijk en Tuk tot Oldemarkt, Blokzijl, Giethoorn en Vollenhove.",
      ogTitle: "Wijken & Kernen van Steenwijkerland | Onafhankelijk Steenwijkerland",
      ogDescription: "Lokale speerpunten en dossiers voor alle 42 kernen en wijken in onze gemeente.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl,
      structuredData: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": baseUrl
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Wijken en Kernen",
            "item": canonicalUrl
          }
        ]
      }
    };
  }

  // 6. Agenda detail: /agenda/:id
  const agendaMatch = cleanPath.match(/^\/agenda\/([a-zA-Z0-9_.-]+)$/);
  if (agendaMatch) {
    const eventId = agendaMatch[1].toLowerCase();
    const event = (db?.events || []).find((e: any) =>
      String(e.id).toLowerCase() === eventId ||
      (e.slug && e.slug.toLowerCase() === eventId)
    );

    if (event) {
      const cleanDesc = truncate(stripHtml(event.shortDescription || event.description || ""), 160);
      const rawImage =
        event.thumbnailUrl ||
        event.backgroundUrl ||
        event.headerUrl ||
        event.image ||
        event.imageUrl ||
        event.bannerUrl ||
        event.fotoUrl ||
        "/assets/markt-steenwijk.jpg";
      const eventImage = `${baseUrl}/api/events/${encodeURIComponent(String(event.id))}/og-image.jpg`;
      const resolvedFallbackImage = resolveImageUrl(baseUrl, rawImage);
      const title = `${event.title} | Agenda Onafhankelijk Steenwijkerland`;

      return {
        title,
        description: cleanDesc,
        ogTitle: event.title,
        ogDescription: cleanDesc,
        ogImage: eventImage,
        ogImageType: "image/jpeg",
        ogImageWidth: 1200,
        ogImageHeight: 630,
        ogImageAlt: event.title,
        ogType: "website",
        canonicalUrl,
        structuredData: {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Event",
              "name": event.title,
              "description": cleanDesc,
              "startDate": event.date ? `${event.date}T${event.startTime || "19:30"}:00` : undefined,
              "endDate": event.date && event.endTime ? `${event.date}T${event.endTime}:00` : undefined,
              "eventStatus": event.isCancelled ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
              "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
              "isAccessibleForFree": true,
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "EUR",
                "availability": "https://schema.org/InStock",
                "url": canonicalUrl
              },
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
              "image": [eventImage, resolvedFallbackImage],
              "organizer": {
                "@type": "PoliticalParty",
                "name": "Onafhankelijk Steenwijkerland",
                "url": baseUrl
              }
            },
            {
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": baseUrl
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Agenda",
                  "item": `${baseUrl}/agenda`
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": event.title,
                  "item": canonicalUrl
                }
              ]
            }
          ]
        }
      };
    }
  }

  // 7. Agenda overzicht: /agenda
  if (cleanPath === "/agenda") {
    return {
      title: "Agenda & Inloopavonden | Onafhankelijk Steenwijkerland",
      description: "Bekijk aankomende bijeenkomsten, openbare fractievergaderingen, ideeëncafés en inloopavonden van Onafhankelijk Steenwijkerland (OSL) in Steenwijkerland.",
      ogTitle: "Agenda van Onafhankelijk Steenwijkerland | Kom in gesprek",
      ogDescription: "Data en locaties van openbare fractievergaderingen, inloopavonden en thema-bijeenkomsten.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl,
      structuredData: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": baseUrl
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Agenda",
            "item": canonicalUrl
          }
        ]
      }
    };
  }

  // 8. Fractie / Raadsleden / Bestuur / Steunfractie
  if (cleanPath === "/fractie" || cleanPath === "/raadsleden") {
    return {
      title: "Onze Fractie & Raadsleden | Onafhankelijk Steenwijkerland",
      description: "Maak kennis met onze fractieleden in de gemeenteraad van Steenwijkerland. Bekijk hun achtergrond, speerpunten en plan direct een belafspraak.",
      ogTitle: "Fractie & Raadsleden | Onafhankelijk Steenwijkerland (OSL)",
      ogDescription: "Direct aanspreekbare volksvertegenwoordigers met een nuchtere blik en hart voor de inwoners.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl,
      structuredData: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "ItemList",
            "name": "Fractie Onafhankelijk Steenwijkerland - Gemeenteraad Steenwijkerland",
            "itemListElement": [
              {
                "@type": "Person",
                "name": "Sammy van Andel",
                "jobTitle": "Fractievoorzitter en Gemeenteraadslid",
                "worksFor": {
                  "@type": "GovernmentOrganization",
                  "name": "Gemeenteraad Steenwijkerland"
                },
                "memberOf": {
                  "@type": "PoliticalParty",
                  "name": "Onafhankelijk Steenwijkerland"
                },
                "description": "Fractievoorzitter van Onafhankelijk Steenwijkerland (OSL) in Steenwijkerland. Strijdt voor lokale woningzoekenden, behoud van de dorpen en een nuchter, transparant gemeentebestuur."
              },
              {
                "@type": "Person",
                "name": "Lisa Mars",
                "jobTitle": "Gemeenteraadslid",
                "worksFor": {
                  "@type": "GovernmentOrganization",
                  "name": "Gemeenteraad Steenwijkerland"
                },
                "memberOf": {
                  "@type": "PoliticalParty",
                  "name": "Onafhankelijk Steenwijkerland"
                },
                "description": "Gemeenteraadslid voor Onafhankelijk Steenwijkerland (OSL) in Steenwijkerland, met focus op sociaal beleid, leefbaarheid en jeugd."
              }
            ]
          },
          {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": baseUrl
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Fractie",
                "item": canonicalUrl
              }
            ]
          }
        ]
      }
    };
  }

  if (cleanPath === "/bestuur") {
    return {
      title: "Het Partijbestuur | Onafhankelijk Steenwijkerland",
      description: "Het bestuur van Onafhankelijk Steenwijkerland (OSL) bewaakt de koers van de vereniging en ondersteunt de fractie in Steenwijkerland.",
      ogTitle: "Partijbestuur | Onafhankelijk Steenwijkerland",
      ogDescription: "Informatie over de bestuursleden en de organisatie achter Onafhankelijk Steenwijkerland.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl
    };
  }

  if (cleanPath === "/steunfractie") {
    return {
      title: "Steunfractie & Vrijwilligers | Onafhankelijk Steenwijkerland",
      description: "Onze steunfractieleden verdiepen zich in dossiers, bereiden raadsvoorstellen voor en zijn de oren en ogen in de wijken.",
      ogTitle: "Steunfractie | Onafhankelijk Steenwijkerland",
      ogDescription: "Meedenken en meedoen met onze lokale beweging in Steenwijkerland.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl
    };
  }

  // 9. Standpunten & Programma met FAQPage Schema voor Google Rich Snippets
  if (cleanPath === "/standpunten") {
    return {
      title: "Standpunten & Verkiezingsprogramma | Onafhankelijk Steenwijkerland (OSL)",
      description: "Bekijk de standpunten van Onafhankelijk Steenwijkerland (OSL): voorrang voor eigen inwoners bij woningtoewijzing, behoud van voorzieningen in de dorpen, lage lokale lasten en bescherming van de Weerribben-Wieden.",
      ogTitle: "Onze Standpunten | Onafhankelijk Steenwijkerland (OSL)",
      ogDescription: "Duidelijke taal en gezond verstand: ontdek de visie van Onafhankelijk Steenwijkerland op Steenwijkerland.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl,
      structuredData: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Wat is het standpunt van Onafhankelijk Steenwijkerland (OSL) over woningbouw in Steenwijkerland?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Onafhankelijk Steenwijkerland (OSL) pleit voor maximale voorrang voor eigen lokale inwoners en starters op de woningmarkt in Steenwijkerland. Nieuwbouw moet aansluiten op de lokale behoefte met betaalbare koop- en huurwoningen, zonder dat jongeren worden weggepest naar andere gemeenten."
                }
              },
              {
                "@type": "Question",
                "name": "Wat wil Onafhankelijk Steenwijkerland voor de dorpen en kernen in Steenwijkerland?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Onafhankelijk Steenwijkerland staat voor behoud van leefbaarheid en voorzieningen in alle 42 kernen en wijken: dorpshuizen, basisscholen, sportclubs en bereikbaarheid met openbaar vervoer en veilige fietspaden moeten gegarandeerd blijven."
                }
              },
              {
                "@type": "Question",
                "name": "Hoe denkt Onafhankelijk Steenwijkerland over de bescherming van de Weerribben-Wieden?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Nationaal Park Weerribben-Wieden is het unieke visitekaartje van onze gemeente. Wij zetten in op krachtige natuurbescherming in harmonieuze balans met leefbaarheid, agrarische familiebedrijven en respectvolle recreatie."
                }
              },
              {
                "@type": "Question",
                "name": "Wat is de koers rond lokale lasten, OZB en gemeentelijke belastingen?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Onafhankelijk Steenwijkerland streeft naar lage lokale lasten voor inwoners en lokale ondernemers. De gemeente moet eerst kritisch naar haar eigen uitgaven en overhead kijken voordat belastingen zoals de OZB worden verhoogd."
                }
              },
              {
                "@type": "Question",
                "name": "Hoe kunnen inwoners van Steenwijkerland direct contact opnemen met raadsleden?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Via de website van Onafhankelijk Steenwijkerland (OSL) kunnen inwoners direct een persoonlijke belafspraak van 30 minuten inplannen met fractievoorzitter Sammy van Andel of raadslid Lisa Mars op woensdag, donderdag of vrijdag tussen 19:00 en 21:00 uur."
                }
              }
            ]
          },
          {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": baseUrl
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Standpunten",
                "item": canonicalUrl
              }
            ]
          }
        ]
      }
    };
  }

  // 10. Contact
  if (cleanPath === "/contact") {
    return {
      title: "Contact & Belafspraak | Onafhankelijk Steenwijkerland",
      description: "Heeft u een vraag of signaal voor de gemeenteraad? Neem contact met ons op of plan een 1-op-1 telefonische afspraak in met een fractielid.",
      ogTitle: "Neem Contact op met Onafhankelijk Steenwijkerland (OSL)",
      ogDescription: "Direct bereikbaar voor inwoners via contactformulier, telefoon of een persoonlijke belafspraak.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl,
      structuredData: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "ContactPage",
            "name": "Contact met Onafhankelijk Steenwijkerland",
            "description": "Neem contact op met de raadsfractie van Onafhankelijk Steenwijkerland (OSL) in Steenwijkerland.",
            "url": canonicalUrl,
            "mainEntity": {
              "@type": "PoliticalParty",
              "name": "Onafhankelijk Steenwijkerland",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "Vendelweg 1",
                "addressLocality": "Steenwijk",
                "addressRegion": "Overijssel",
                "postalCode": "8331 XE",
                "addressCountry": "NL"
              },
              "email": "fractie@onafhankelijksteenwijkerland.nl"
            }
          },
          {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": baseUrl
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Contact",
                "item": canonicalUrl
              }
            ]
          }
        ]
      }
    };
  }

  // 11. Fractielid profiel & bijdragen: /fractie/:id, /raadsleden/:id (en /videos)
  const videoMemberMatch = cleanPath.match(/^\/(?:fractie|raadsleden)\/([a-zA-Z0-9_-]+)(?:\/videos)?$/);
  if (videoMemberMatch && videoMemberMatch[1] !== "videos") {
    const memberId = videoMemberMatch[1].toLowerCase();
    const defaultMembers = [
      { id: "1", name: "Sammy van Andel", role: "Fractievoorzitter", type: "Raadslid", imgUrl: "/assets/sammy.png" },
      { id: "2", name: "Lisa Mars", role: "Raadslid", type: "Raadslid", imgUrl: "/assets/lisa.png" },
      { id: "3", name: "Nathan ten Wolde", role: "Burgerraadslid", type: "Burgerraadslid", imgUrl: "/assets/nathan.png" },
      { id: "4", name: "Chris van Andel", role: "Burgerraadslid", type: "Burgerraadslid", imgUrl: "/assets/chris.jpg" },
    ];
    const member = (db?.fractieleden || []).find((m: any) =>
      String(m.id).toLowerCase() === memberId ||
      m.name?.toLowerCase().includes(memberId) ||
      (m.slug && m.slug.toLowerCase() === memberId)
    ) || defaultMembers.find((m: any) =>
      String(m.id).toLowerCase() === memberId ||
      m.name.toLowerCase().includes(memberId)
    );
    if (member) {
      // Zoek gekoppelde video's
      const memberVideos = (db?.videos || [])
        .filter((v: any) => v.fractieledenIds?.map((fid: any) => String(fid).toLowerCase()).includes(String(member.id).toLowerCase()))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Check of er specifiek een video is opgevraagd via ?v= of ?video=
      const requestedVideoId = (queryParams.get("v") || queryParams.get("video") || "").toLowerCase();
      const targetVideo = requestedVideoId
        ? memberVideos.find((v: any) => String(v.id).toLowerCase() === requestedVideoId) ||
          (db?.videos || []).find((v: any) => String(v.id).toLowerCase() === requestedVideoId)
        : null;

      if (targetVideo) {
        // Specifieke video opgevraagd: '%naam%' over '%titel van de video%'
        let rawVTitle = (targetVideo.burgerraadslidTitle || targetVideo.title || "").trim();
        if (rawVTitle) {
          const nameOverRegex = new RegExp(`^${member.name}\\s+over\\s+`, "i");
          rawVTitle = rawVTitle.replace(nameOverRegex, "");
          const tussenkomstRegex = new RegExp(`^tussenkomst(?:\\s+van)?(?:\\s+${member.name})?\\s+over\\s+`, "i");
          rawVTitle = rawVTitle.replace(tussenkomstRegex, "");
          rawVTitle = rawVTitle.replace(/^(?:videobijdrage|video bijdrage|videobijdragen|video-bijdrage|bijdrage|inbreng|toelichting)\s*(?:over\s*)?/i, "");
          rawVTitle = rawVTitle.replace(/^['"‘“](.*)['"’”]$/, "$1").trim();
        }
        let cleanVTitle = rawVTitle;
        if (!cleanVTitle || cleanVTitle.toLowerCase() === "videobijdrage" || cleanVTitle.toLowerCase() === "video bijdrage" || cleanVTitle.toLowerCase() === "bijdrage") {
          cleanVTitle = "het raadsvoorstel";
        }
        const formattedHeadline = `${member.name} over ‘${cleanVTitle}’`;
        const cleanDesc = targetVideo.description
          ? truncate(stripHtml(targetVideo.description), 160)
          : `Bekijk de toelichting van ${member.name} over ‘${cleanVTitle}’ in de gemeenteraad van Steenwijkerland.`;
        
        let videoImage = "";
        if (targetVideo.thumbnailUrl && !targetVideo.thumbnailUrl.includes("ytimg") && !targetVideo.thumbnailUrl.includes("hqdefault")) {
          videoImage = resolveImageUrl(baseUrl, targetVideo.thumbnailUrl);
        } else {
          videoImage = `${baseUrl}/api/videos/${targetVideo.id}/thumbnail.jpg`;
        }

        const title = `${formattedHeadline} | Onafhankelijk Steenwijkerland`;
        const specificCanonical = `${baseUrl}${cleanPath}?v=${targetVideo.id}`;

        return {
          title,
          description: cleanDesc,
          ogTitle: formattedHeadline,
          ogDescription: cleanDesc,
          ogImage: videoImage,
          ogImageType: videoImage.endsWith(".png") ? "image/png" : "image/jpeg",
          ogImageWidth: 1200,
          ogImageHeight: 630,
          ogImageAlt: formattedHeadline,
          ogType: "video.other",
          canonicalUrl: specificCanonical
        };
      }

      // Geen specifieke video parameter opgegeven: neem overzicht of de meest recente video
      let selectedImage = "";
      let videoCustomDesc = "";
      if (memberVideos.length > 0) {
        const topVideo = memberVideos[0];
        if (topVideo.thumbnailUrl && !topVideo.thumbnailUrl.includes("ytimg") && !topVideo.thumbnailUrl.includes("hqdefault")) {
          selectedImage = resolveImageUrl(baseUrl, topVideo.thumbnailUrl);
        } else {
          selectedImage = `${baseUrl}/api/videos/${topVideo.id}/thumbnail.jpg`;
        }

        if (topVideo.description) {
          videoCustomDesc = truncate(stripHtml(topVideo.description), 160);
        }
      }

      if (!selectedImage) {
        selectedImage = resolveImageUrl(baseUrl, member.imgUrl);
      }

      const isBurger = member.type?.toLowerCase() === "burgerraadslid" || member.role?.toLowerCase().includes("burgerraadslid");
      const title = `Video's & Bijdragen van ${member.name} (${isBurger ? "Burgerraadslid" : (member.role || "Raadslid")}) | Onafhankelijk Steenwijkerland`;
      const desc = videoCustomDesc || `Bekijk alle videobijdragen, raadsdebatten en toelichtingen van ${member.name} in de gemeenteraad van Steenwijkerland.`;

      return {
        title,
        description: desc,
        ogTitle: title,
        ogDescription: desc,
        ogImage: selectedImage,
        ogImageType: selectedImage.endsWith(".png") ? "image/png" : "image/jpeg",
        ogImageWidth: 1200,
        ogImageHeight: 630,
        ogImageAlt: title,
        ogType: "video.other",
        canonicalUrl
      };
    }
  }

  // 11b. Directe videoroute: /video/:id of /videos/:id
  const directVideoMatch = cleanPath.match(/^\/videos?\/([a-zA-Z0-9_-]+)$/);
  if (directVideoMatch) {
    const videoId = directVideoMatch[1].toLowerCase();
    const video = (db?.videos || []).find((v: any) => String(v.id).toLowerCase() === videoId);
    if (video) {
      const membersList =
        Array.isArray(db?.fractieleden) && db.fractieleden.length > 0
          ? db.fractieleden
          : DEFAULT_FRACTIELEDEN;

      // Zoek gekoppeld fractielid voor extra context
      let speaker: any = null;
      if (video.fractieledenIds && video.fractieledenIds.length > 0) {
        const firstFid = String(video.fractieledenIds[0]).toLowerCase();
        speaker =
          membersList.find(
            (m: any) =>
              String(m.id).toLowerCase() === firstFid ||
              (m.name && m.name.toLowerCase().includes(firstFid))
          ) || null;
      }
      if (!speaker && video.title) {
        speaker =
          membersList.find(
            (m: any) => m.name && video.title.toLowerCase().includes(m.name.toLowerCase())
          ) || null;
      }
      const speakerName = speaker?.name || "Onafhankelijk Steenwijkerland";
      const isBurger =
        speaker?.type?.toLowerCase() === "burgerraadslid" ||
        speaker?.role?.toLowerCase().includes("burgerraadslid");
      const speakerRole = isBurger ? "Burgerraadslid" : (speaker?.role || "Gemeenteraadslid");

      // Format: '%naam%' over '%titel van de video%'
      let rawVTitle = (video.burgerraadslidTitle || video.title || "").trim();
      if (rawVTitle) {
        const nameOverRegex = new RegExp(`^${speakerName}\\s+over\\s+`, "i");
        rawVTitle = rawVTitle.replace(nameOverRegex, "");
        const tussenkomstRegex = new RegExp(`^tussenkomst(?:\\s+van)?(?:\\s+${speakerName})?\\s+over\\s+`, "i");
        rawVTitle = rawVTitle.replace(tussenkomstRegex, "");
        rawVTitle = rawVTitle.replace(/^(?:videobijdrage|video bijdrage|videobijdragen|video-bijdrage|bijdrage|inbreng|toelichting)\s*(?:over\s*)?/i, "");
        rawVTitle = rawVTitle.replace(/^['"‘“](.*)['"’”]$/, "$1").trim();
      }
      let cleanVTitle = rawVTitle;
      if (!cleanVTitle || cleanVTitle.toLowerCase() === "videobijdrage" || cleanVTitle.toLowerCase() === "video bijdrage" || cleanVTitle.toLowerCase() === "bijdrage") {
        cleanVTitle = "het raadsvoorstel";
      }
      const formattedHeadline = `${speakerName} over ‘${cleanVTitle}’`;

      const fullContextDesc = stripHtml(video.description || "");
      const cleanDesc = fullContextDesc
        ? truncate(fullContextDesc, 160)
        : `Bekijk hoe ${speakerName} spreekt over ‘${cleanVTitle}’ in de gemeenteraad van Steenwijkerland.`;

      let videoImage = "";
      if (video.thumbnailUrl && !video.thumbnailUrl.includes("ytimg") && !video.thumbnailUrl.includes("hqdefault")) {
        videoImage = resolveImageUrl(baseUrl, video.thumbnailUrl);
      } else {
        videoImage = `${baseUrl}/api/videos/${video.id}/thumbnail.jpg`;
      }

      // Gekoppelde wijk/kern
      const allWijken = db?.wijken?.length ? db.wijken : BUURTKAART_43_WIJKEN;
      const linkedWijk = video.wijkSlug
        ? allWijken.find((w: any) => String(w.slug).toLowerCase() === String(video.wijkSlug).toLowerCase())
        : null;

      // Gekoppeld standpunt uit het partijprogramma
      const defSp = DEFAULT_VIDEO_STANDPUNTEN[String(video.id)];
      const hNr = Number(video.hoofdstukNr ?? defSp?.hoofdstukNr);
      const sNr = Number(video.standpuntNr ?? defSp?.standpuntNr);
      const linkedHoofdstuk = hNr ? hoofdstukken.find((h) => h.nr === hNr) : undefined;
      const linkedStandpunt = linkedHoofdstuk && sNr ? linkedHoofdstuk.standpunten.find((s) => s.nr === sNr) : undefined;

      const videoCanonicalUrl = `${baseUrl}/video/${video.id}`;
      const uploadDateIso = toIsoDateString(video.date || video.createdAt);
      const embedUrl = extractVideoEmbedUrl(video.videoUrl);
      const isDirectVideoFile =
        video.videoUrl &&
        typeof video.videoUrl === "string" &&
        !embedUrl &&
        /\.(mp4|webm|mov|m4v)(\?|$)/i.test(video.videoUrl);
      const contentUrl = isDirectVideoFile ? resolveImageUrl(baseUrl, video.videoUrl) : undefined;

      const aboutTopics: any[] = [
        { "@type": "Thing", "name": cleanVTitle },
        { "@type": "AdministrativeArea", "name": "Gemeente Steenwijkerland", "sameAs": "https://nl.wikipedia.org/wiki/Steenwijkerland" },
      ];
      if (video.category) {
        aboutTopics.push({ "@type": "Thing", "name": video.category });
      }
      if (linkedWijk) {
        aboutTopics.push({
          "@type": "Place",
          "name": `${linkedWijk.naam}, Steenwijkerland`,
          "url": `${baseUrl}/wijken-en-kernen/${linkedWijk.slug}`,
        });
      }
      if (linkedHoofdstuk && linkedStandpunt) {
        aboutTopics.push({
          "@type": "Thing",
          "name": `Standpunt H${linkedHoofdstuk.nr}.${linkedStandpunt.nr}: ${linkedStandpunt.titel}`,
          "description": linkedStandpunt.standpunt,
          "url": `${baseUrl}/standpunten?hoofdstuk=${linkedHoofdstuk.nr}&standpunt=${linkedStandpunt.nr}`,
        });
      }

      const keywordsList = [
        cleanVTitle,
        speakerName,
        "Onafhankelijk Steenwijkerland",
        "OSL",
        "voorheen Lijst van Andel",
        "Steenwijkerland",
        "gemeenteraad Steenwijkerland",
        video.category,
        linkedWijk?.naam,
        linkedStandpunt?.titel,
      ].filter(Boolean);

      const breadcrumbItems: any[] = [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
        { "@type": "ListItem", "position": 2, "name": "Fractie", "item": `${baseUrl}/fractie` },
      ];
      if (speaker) {
        breadcrumbItems.push({
          "@type": "ListItem",
          "position": 3,
          "name": speaker.name,
          "item": `${baseUrl}/raadsleden/${speaker.id}`,
        });
      }
      breadcrumbItems.push({
        "@type": "ListItem",
        "position": breadcrumbItems.length + 1,
        "name": formattedHeadline,
        "item": videoCanonicalUrl,
      });

      const structuredData = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "VideoObject",
            "@id": `${videoCanonicalUrl}#video`,
            "name": formattedHeadline,
            "headline": formattedHeadline,
            "description": fullContextDesc || cleanDesc,
            "abstract": cleanDesc,
            "thumbnailUrl": [videoImage],
            "uploadDate": uploadDateIso,
            "datePublished": uploadDateIso,
            "dateModified": toIsoDateString(video.updatedAt || video.date || video.createdAt),
            "inLanguage": "nl-NL",
            "url": videoCanonicalUrl,
            ...(embedUrl ? { "embedUrl": embedUrl } : {}),
            ...(contentUrl ? { "contentUrl": contentUrl } : {}),
            "author": {
              "@type": "Person",
              "name": speakerName,
              "jobTitle": speakerRole,
              "url": speaker ? `${baseUrl}/raadsleden/${speaker.id}` : `${baseUrl}/fractie`,
              "affiliation": {
                "@type": "PoliticalParty",
                "@id": `${baseUrl}/#party`,
                "name": "Onafhankelijk Steenwijkerland",
              },
            },
            "creator": {
              "@type": "Person",
              "name": speakerName,
              "jobTitle": speakerRole,
            },
            "publisher": {
              "@type": "PoliticalParty",
              "@id": `${baseUrl}/#party`,
              "name": "Onafhankelijk Steenwijkerland",
              "url": baseUrl,
              "logo": {
                "@type": "ImageObject",
                "url": DEFAULT_IMAGE,
              },
            },
            "contentLocation": {
              "@type": "AdministrativeArea",
              "name": linkedWijk ? `${linkedWijk.naam}, Steenwijkerland` : "Steenwijkerland",
              "sameAs": "https://nl.wikipedia.org/wiki/Steenwijkerland",
            },
            "about": aboutTopics,
            "keywords": keywordsList.join(", "),
            "isPartOf": {
              "@type": "WebSite",
              "@id": `${baseUrl}/#website`,
              "name": "Onafhankelijk Steenwijkerland (OSL)",
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": videoCanonicalUrl,
            },
          },
          {
            "@type": "BreadcrumbList",
            "itemListElement": breadcrumbItems,
          },
        ],
      };

      const semanticHtml = `
    <header class="sr-only" style="opacity:0.01;height:1px;overflow:hidden;position:absolute;pointer-events:none;">
      <h1>${escapeHtml(formattedHeadline)}</h1>
      <p>${escapeHtml(cleanDesc)}</p>
    </header>
    <main class="sr-only" style="opacity:0.01;height:1px;overflow:hidden;position:absolute;pointer-events:none;">
      <article>
        <h2>${escapeHtml(formattedHeadline)}</h2>
        <p><strong>Spreker:</strong> ${escapeHtml(speakerName)} (${escapeHtml(speakerRole)}, Onafhankelijk Steenwijkerland — OSL)</p>
        <p><strong>Onderwerp:</strong> ${escapeHtml(cleanVTitle)}${video.category ? ` • Categorie: ${escapeHtml(video.category)}` : ""}${linkedWijk ? ` • Wijk/Kern: ${escapeHtml(linkedWijk.naam)}` : ""}</p>
        <section>
          <h3>Toelichting &amp; Context</h3>
          <p>${escapeHtml(fullContextDesc || cleanDesc)}</p>
        </section>
        ${linkedHoofdstuk && linkedStandpunt ? `<section>
          <h3>Gekoppeld Standpunt Onafhankelijk Steenwijkerland (H${linkedHoofdstuk.nr}.${linkedStandpunt.nr})</h3>
          <p><strong>${escapeHtml(linkedStandpunt.titel)}:</strong> ${escapeHtml(linkedStandpunt.standpunt)}</p>
        </section>` : ""}
        <nav aria-label="Hoofdmenu">
          <a href="/standpunten">Standpunten</a> |
          <a href="/raadsleden">Raadsleden</a> |
          <a href="/nieuws">Nieuws</a> |
          <a href="/agenda">Agenda</a> |
          <a href="/wijken-en-kernen">Wijken &amp; Kernen</a> |
          <a href="/contact">Contact</a>
        </nav>
      </article>
    </main>`;

      const title = `${formattedHeadline} | Onafhankelijk Steenwijkerland`;

      return {
        title,
        description: cleanDesc,
        ogTitle: formattedHeadline,
        ogDescription: cleanDesc,
        ogImage: videoImage,
        ogImageType: videoImage.endsWith(".png") ? "image/png" : "image/jpeg",
        ogImageWidth: 1200,
        ogImageHeight: 630,
        ogImageAlt: formattedHeadline,
        ogType: "video.other",
        canonicalUrl: videoCanonicalUrl,
        author: speakerName,
        publishedTime: uploadDateIso,
        keywords: keywordsList.join(", "),
        structuredData,
        semanticHtml,
      };
    }
  }

  // 11c. Video's overzichtspagina: /videos
  if (cleanPath === "/videos") {
    const allVideos = (db?.videos || []).slice().sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let ogImage = DEFAULT_IMAGE;
    if (allVideos.length > 0) {
      const topVideo = allVideos[0];
      if (topVideo.thumbnailUrl && !topVideo.thumbnailUrl.includes("ytimg") && !topVideo.thumbnailUrl.includes("hqdefault")) {
        ogImage = resolveImageUrl(baseUrl, topVideo.thumbnailUrl);
      } else {
        ogImage = `${baseUrl}/api/videos/${topVideo.id}/thumbnail.jpg`;
      }
    }
    return {
      title: "Video's & Debatten | Onafhankelijk Steenwijkerland (OSL)",
      description: "Bekijk alle videobijdragen, raadstoespraken en debatten van de fractie Onafhankelijk Steenwijkerland (OSL) in de gemeenteraad van Steenwijkerland.",
      ogTitle: "Video's & Debatten - Onafhankelijk Steenwijkerland (OSL)",
      ogDescription: "Bekijk alle videobijdragen, debatten en toespraken van Onafhankelijk Steenwijkerland in de gemeenteraad van Steenwijkerland.",
      ogImage,
      ogImageType: ogImage.endsWith(".png") ? "image/png" : "image/jpeg",
      ogImageWidth: 1200,
      ogImageHeight: 630,
      ogImageAlt: "Video's & Debatten Onafhankelijk Steenwijkerland",
      ogType: "video.other",
      canonicalUrl: `${baseUrl}/videos`
    };
  }

  // 12. Doneren & Giftenreglement
  if (cleanPath === "/doneren" || cleanPath === "/doneer" || cleanPath.startsWith("/doneren/")) {
    return {
      title: "Doneren aan Onafhankelijk Steenwijkerland | Steun de Lokale Politiek",
      description: "Steun Onafhankelijk Steenwijkerland (OSL) met een vrijwillige gift. Wij zijn een onafhankelijke lokale partij in Steenwijkerland. Transparantie conform ons Giftenreglement.",
      ogTitle: "Doneren aan Onafhankelijk Steenwijkerland (OSL)",
      ogDescription: "Help ons op te komen voor de belangen van alle inwoners in Steenwijkerland met een online donatie.",
      ogImage: DEFAULT_IMAGE,
      ogType: "website",
      canonicalUrl: `${baseUrl}/doneren`
    };
  }

  // 13. Login / Register / Reset Password / Dashboard / Admin (Noindex for private / auth pages)
  if (cleanPath === "/login" || cleanPath === "/registreren" || cleanPath === "/reset-wachtwoord" || cleanPath === "/dashboard" || cleanPath === "/admin") {
    return {
      title: cleanPath === "/reset-wachtwoord" ? "Wachtwoord herstellen | Onafhankelijk Steenwijkerland" : "Ledenportaal & Beheer | Onafhankelijk Steenwijkerland",
      description: "Inloggen en accountbeheer voor leden en fractieleden van politieke partij Onafhankelijk Steenwijkerland (OSL).",
      ogTitle: "Ledenportaal | Onafhankelijk Steenwijkerland",
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

  // Images (Open Graph, WhatsApp, Facebook, iMessage & Twitter)
  setMetaProperty("og:image", meta.ogImage);
  setMetaProperty("og:image:secure_url", meta.ogImage);
  setMetaProperty("og:image:type", meta.ogImageType || "image/jpeg");
  setMetaProperty("og:image:width", String(meta.ogImageWidth || 1200));
  setMetaProperty("og:image:height", String(meta.ogImageHeight || 630));
  if (meta.ogImageAlt) {
    setMetaProperty("og:image:alt", meta.ogImageAlt);
  }
  setMetaName("twitter:image", meta.ogImage);
  if (meta.ogImageAlt) {
    setMetaName("twitter:image:alt", meta.ogImageAlt);
  }

  // Type and URL
  setMetaProperty("og:type", meta.ogType);
  setMetaProperty("og:url", meta.canonicalUrl);
  setMetaProperty("og:site_name", "Onafhankelijk Steenwijkerland");

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

  // Preload LCP hero image for instant rendering & Core Web Vitals
  if (meta.preloadImage) {
    const isWebp = meta.preloadImage.endsWith(".webp");
    const typeAttr = isWebp ? ' type="image/webp"' : "";
    const preloadImageTag = `  <link rel="preload" as="image" href="${escapeHtml(meta.preloadImage)}"${typeAttr} fetchpriority="high" />\n`;
    modified = modified.replace("</head>", `${preloadImageTag}</head>`);
  }

  // Optional keywords
  if (meta.keywords) {
    setMetaName("keywords", meta.keywords);
  }

  // Pre-render semantic content for LLM crawlers and SEO bots inside <div id="root">
  if (modified.includes('<div id="root"></div>')) {
    const semanticContent = meta.semanticHtml || `
    <header class="sr-only" style="opacity:0.01;height:1px;overflow:hidden;position:absolute;pointer-events:none;">
      <h1>${escapeHtml(meta.title)}</h1>
      <p>${escapeHtml(meta.description)}</p>
    </header>
    <main class="sr-only" style="opacity:0.01;height:1px;overflow:hidden;position:absolute;pointer-events:none;">
      <article>
        <h2>${escapeHtml(meta.ogTitle || meta.title)}</h2>
        <p>${escapeHtml(meta.ogDescription || meta.description)}</p>
        <p>Officiële website van politieke partij Onafhankelijk Steenwijkerland (OSL) in Steenwijkerland. Actief voor betaalbare starterswoningen, sterke dorpen en nuchtere lokale politiek.</p>
        <nav aria-label="Hoofdmenu">
          <a href="/standpunten">Standpunten</a> | 
          <a href="/raadsleden">Raadsleden</a> | 
          <a href="/nieuws">Nieuws</a> | 
          <a href="/agenda">Agenda</a> | 
          <a href="/wijken-en-kernen">Wijken & Kernen</a> | 
          <a href="/contact">Contact</a>
        </nav>
      </article>
    </main>`;
    modified = modified.replace('<div id="root"></div>', `<div id="root">${semanticContent}</div>`);
  }

  return modified;
}

function escapeHtml(str?: string | null): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
