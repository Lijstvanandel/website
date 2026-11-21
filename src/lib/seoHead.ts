const PRIMARY_PUBLIC_ORIGIN = "https://onafhankelijksteenwijkerland.nl";
const DEFAULT_OG_IMAGE = `${PRIMARY_PUBLIC_ORIGIN}/assets/hero-banner.jpg`;
const DEFAULT_TITLE = "Onafhankelijk Steenwijkerland (OSL) | Voor alle inwoners";
const DEFAULT_DESCRIPTION =
  "Onafhankelijk Steenwijkerland (OSL) zet zich in voor nuchtere politiek, betaalbare woningbouw voor inwoners en behoud van dorpen en wijken in Steenwijkerland.";

export interface ClientSeoMeta {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: "website" | "article" | "video.other";
  canonicalUrl?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  robots?: string;
}

export function getPublicCanonicalBaseUrl(): string {
  if (typeof window === "undefined") return PRIMARY_PUBLIC_ORIGIN;
  const host = window.location.hostname.toLowerCase();
  const isAliasOrPreview =
    host === "onafhankelijksteenwijkerland.nl" ||
    host === "www.onafhankelijksteenwijkerland.nl" ||
    host.includes("scientiarum.nl") ||
    host.includes("lijstvanandel.nl") ||
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("run.app") ||
    host.includes("ai-studio.app");
  return isAliasOrPreview ? PRIMARY_PUBLIC_ORIGIN : window.location.origin;
}

export function buildCanonicalUrl(pathname?: string): string {
  const base = getPublicCanonicalBaseUrl();
  const raw = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const clean = raw.length > 1 ? raw.replace(/\/+$/, "") : raw;
  return `${base}${clean === "/" || clean === "" ? "/" : clean}`;
}

export function resolvePublicOgImage(rawImg?: string): string {
  if (!rawImg || typeof rawImg !== "string" || !rawImg.trim()) return DEFAULT_OG_IMAGE;
  const trimmed = rawImg.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${PRIMARY_PUBLIC_ORIGIN}${cleanPath}`;
}

export function stripHtmlForMeta(raw?: string, maxLen = 160): string {
  if (!raw || typeof raw !== "string") return "";
  const plain = raw
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLen) return plain;
  const cut = plain.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + "...";
}

function upsertMeta(attrName: "name" | "property", attrValue: string, content?: string) {
  if (typeof document === "undefined" || !content) return;
  let el = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string, extraAttr?: { key: string; value: string }) {
  if (typeof document === "undefined" || !href) return;
  const selector = extraAttr
    ? `link[rel="${rel}"][${extraAttr.key}="${extraAttr.value}"]`
    : `link[rel="${rel}"]`;
  let el = document.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    if (extraAttr) el.setAttribute(extraAttr.key, extraAttr.value);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function updateClientSeoHead(meta: ClientSeoMeta): void {
  if (typeof document === "undefined") return;

  const title = meta.title || DEFAULT_TITLE;
  const description = meta.description || DEFAULT_DESCRIPTION;
  const ogTitle = meta.ogTitle || title;
  const ogDescription = meta.ogDescription || description;
  const canonicalUrl = meta.canonicalUrl || buildCanonicalUrl();
  const ogImage = meta.ogImage ? resolvePublicOgImage(meta.ogImage) : DEFAULT_OG_IMAGE;
  const ogType = meta.ogType || "website";

  document.title = title;

  upsertLink("canonical", canonicalUrl);
  upsertLink("alternate", canonicalUrl, { key: "hreflang", value: "nl-NL" });
  upsertLink("alternate", canonicalUrl, { key: "hreflang", value: "x-default" });

  upsertMeta("name", "description", description);
  upsertMeta("property", "og:type", ogType);
  upsertMeta("property", "og:title", ogTitle);
  upsertMeta("property", "og:description", ogDescription);
  upsertMeta("property", "og:url", canonicalUrl);
  upsertMeta("property", "og:image", ogImage);
  upsertMeta("property", "og:image:secure_url", ogImage);
  if (meta.ogImageAlt) {
    upsertMeta("property", "og:image:alt", meta.ogImageAlt);
  }
  upsertMeta("name", "twitter:title", ogTitle);
  upsertMeta("name", "twitter:description", ogDescription);
  upsertMeta("name", "twitter:image", ogImage);

  if (meta.author) upsertMeta("name", "author", meta.author);
  if (meta.publishedTime) upsertMeta("property", "article:published_time", meta.publishedTime);
  if (meta.modifiedTime) upsertMeta("property", "article:modified_time", meta.modifiedTime);
  if (meta.robots) {
    upsertMeta("name", "robots", meta.robots);
  } else {
    upsertMeta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
  }
}

export function getRouteFallbackSeo(pathname: string): ClientSeoMeta {
  const cleanPath = (pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname).toLowerCase();
  const canonicalUrl = buildCanonicalUrl(cleanPath || "/");

  if (cleanPath === "/" || cleanPath === "") {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      ogTitle: "Onafhankelijk Steenwijkerland (OSL) - Onafhankelijke Lokale Politiek",
      ogDescription:
        "Voorrang voor lokale woningzoekenden, behoud van voorzieningen in onze dorpen en een direct aanspreekbare fractie.",
      ogType: "website",
      canonicalUrl,
    };
  }
  if (cleanPath === "/nieuws") {
    return {
      title: "Laatste Nieuws & Persberichten | Onafhankelijk Steenwijkerland",
      description:
        "Blijf op de hoogte van moties, raadsvergaderingen, opinie en actueel politiek nieuws uit Steenwijk en alle omliggende kernen.",
      ogTitle: "Nieuws & Actualiteiten | Onafhankelijk Steenwijkerland (OSL)",
      ogDescription: "Actueel nieuws over lokale politiek, woningbouw, zorg en voorzieningen in de gemeente Steenwijkerland.",
      ogType: "website",
      canonicalUrl,
    };
  }
  if (cleanPath === "/agenda") {
    return {
      title: "Agenda & Inloopavonden | Onafhankelijk Steenwijkerland",
      description:
        "Bekijk aankomende bijeenkomsten, openbare fractievergaderingen, ideeëncafés en inloopavonden van Onafhankelijk Steenwijkerland (OSL).",
      ogTitle: "Agenda van Onafhankelijk Steenwijkerland | Kom in gesprek",
      ogDescription: "Data en locaties van openbare fractievergaderingen, inloopavonden en thema-bijeenkomsten.",
      ogType: "website",
      canonicalUrl,
    };
  }
  if (cleanPath === "/standpunten") {
    return {
      title: "Standpunten & Verkiezingsprogramma | Onafhankelijk Steenwijkerland (OSL)",
      description:
        "Bekijk de standpunten van Onafhankelijk Steenwijkerland (OSL): voorrang voor eigen inwoners bij woningtoewijzing, behoud van voorzieningen en lage lokale lasten.",
      ogTitle: "Onze Standpunten | Onafhankelijk Steenwijkerland (OSL)",
      ogDescription: "Duidelijke taal en gezond verstand: ontdek de visie van Onafhankelijk Steenwijkerland op Steenwijkerland.",
      ogType: "website",
      canonicalUrl,
    };
  }
  if (cleanPath === "/fractie" || cleanPath === "/raadsleden") {
    return {
      title: "Onze Fractie & Raadsleden | Onafhankelijk Steenwijkerland",
      description:
        "Maak kennis met onze fractieleden in de gemeenteraad van Steenwijkerland. Bekijk hun achtergrond, speerpunten en plan direct een belafspraak.",
      ogTitle: "Fractie & Raadsleden | Onafhankelijk Steenwijkerland (OSL)",
      ogDescription: "Direct aanspreekbare volksvertegenwoordigers met een nuchtere blik en hart voor de inwoners.",
      ogType: "website",
      canonicalUrl,
    };
  }
  if (cleanPath === "/wijken-en-kernen" || cleanPath === "/wijken-en/kernen" || cleanPath === "/wijken") {
    return {
      title: "Wijken en Kernen in Steenwijkerland | Onafhankelijk Steenwijkerland",
      description:
        "Ontdek wat Onafhankelijk Steenwijkerland (OSL) doet in jouw dorp, wijk of kern in de gemeente Steenwijkerland.",
      ogTitle: "Wijken & Kernen van Steenwijkerland | Onafhankelijk Steenwijkerland",
      ogDescription: "Lokale speerpunten en dossiers voor alle 42 kernen en wijken in onze gemeente.",
      ogType: "website",
      canonicalUrl,
    };
  }
  if (cleanPath === "/contact") {
    return {
      title: "Contact & Belafspraak | Onafhankelijk Steenwijkerland",
      description:
        "Heeft u een vraag of signaal voor de gemeenteraad? Neem contact met ons op of plan een 1-op-1 telefonische afspraak in.",
      ogTitle: "Neem Contact op met Onafhankelijk Steenwijkerland (OSL)",
      ogDescription: "Direct bereikbaar voor inwoners via contactformulier, telefoon of een persoonlijke belafspraak.",
      ogType: "website",
      canonicalUrl,
    };
  }
  if (cleanPath === "/doneren" || cleanPath === "/doneer") {
    return {
      title: "Doneren aan Onafhankelijk Steenwijkerland | Steun de Lokale Politiek",
      description:
        "Steun Onafhankelijk Steenwijkerland (OSL) met een vrijwillige gift. Transparantie conform ons Giftenreglement.",
      ogTitle: "Doneren aan Onafhankelijk Steenwijkerland (OSL)",
      ogDescription: "Help ons op te komen voor de belangen van alle inwoners in Steenwijkerland.",
      ogType: "website",
      canonicalUrl,
    };
  }
  if (cleanPath === "/peilingen" || cleanPath === "/polls") {
    return {
      title: "Peilingen & Stellingen | Onafhankelijk Steenwijkerland",
      description: "Geef uw mening over actuele onderwerpen en stellingen in de gemeente Steenwijkerland.",
      ogTitle: "Peilingen & Stellingen | Onafhankelijk Steenwijkerland",
      ogDescription: "Laat uw stem horen over lokale thema's in Steenwijkerland.",
      ogType: "website",
      canonicalUrl,
    };
  }
  if (cleanPath === "/dossiers" || cleanPath === "/raadspaneel" || cleanPath.startsWith("/dossiers/")) {
    return {
      title: "Raadsdossiers & Beleidsonderzoek | Onafhankelijk Steenwijkerland",
      description: "Openbare dossiers, raadsstukken en onderbouwing voor de gemeente Steenwijkerland.",
      ogTitle: "Raadsdossiers & Beleidsonderzoek | Onafhankelijk Steenwijkerland",
      ogDescription: "Openbare dossiers en raadsdocumenten voor Steenwijkerland.",
      ogType: "website",
      canonicalUrl,
    };
  }
  if (
    cleanPath === "/login" ||
    cleanPath === "/registreren" ||
    cleanPath === "/word-lid" ||
    cleanPath === "/wordlid" ||
    cleanPath === "/reset-wachtwoord" ||
    cleanPath === "/dashboard" ||
    cleanPath === "/admin" ||
    cleanPath === "/secretaris" ||
    cleanPath === "/penningmeester" ||
    cleanPath === "/voorzitter" ||
    cleanPath === "/nieuwsbrief/afmelden" ||
    cleanPath === "/authorize" ||
    cleanPath === "/sso/login" ||
    cleanPath === "/sso/logout"
  ) {
    return {
      title:
        cleanPath === "/authorize" || cleanPath === "/sso/login"
          ? "Centrale Login (SSO) | Onafhankelijk Steenwijkerland"
          : "Ledenportaal & Beheer | Onafhankelijk Steenwijkerland",
      description: "Inloggen en accountbeheer voor leden en gekoppelde dataproducten van Onafhankelijk Steenwijkerland (OSL).",
      ogType: "website",
      canonicalUrl,
      robots: "noindex, nofollow",
    };
  }

  return {
    canonicalUrl,
  };
}
