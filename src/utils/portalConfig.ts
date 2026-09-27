/**
 * Portal configuration helper to support multi-tenant / portal-only hostnames.
 *
 * Supported hostnames:
 * - hoogeveen.scientiarum.nl / hgv.scientiarum.nl -> Portal Mode (Gemeente Hoogeveen)
 * - steenwijkerland.scientiarum.nl / swl.scientiarum.nl -> Full Party Website (Lijst van Andel)
 */

export interface PortalConfig {
  isPortalMode: boolean;
  tenantId: string;
  municipalityName: string;
  portalTitle: string;
  portalSubtitle: string;
  shortCode: string;
  risSystemName: string;
}

export function getPortalConfig(currentPathname?: string): PortalConfig {
  if (typeof window === "undefined") {
    return {
      isPortalMode: false,
      tenantId: "steenwijkerland",
      municipalityName: "Steenwijkerland",
      portalTitle: "Lijst van Andel",
      portalSubtitle: "Steenwijkerland",
      shortCode: "swl",
      risSystemName: "Notubiz",
    };
  }

  const hostname = window.location.hostname.toLowerCase();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const queryParam = searchParams.get("portal")?.toLowerCase() || searchParams.get("tenant")?.toLowerCase() || searchParams.get("muni")?.toLowerCase();
  const pathname = (currentPathname || window.location.pathname || "").toLowerCase().split("?")[0].split("#")[0];

  // Explicit Steenwijkerland party & neighborhood routes where portal mode is NEVER active
  const isSteenwijkerlandRoute =
    pathname.startsWith("/wijk-en-kernen") ||
    pathname.startsWith("/wijken-en/kernen") ||
    pathname.startsWith("/wijken") ||
    pathname.startsWith("/standpunten") ||
    pathname.startsWith("/raadsleden") ||
    pathname.startsWith("/bestuur") ||
    pathname.startsWith("/steunfractie") ||
    pathname.startsWith("/mensen") ||
    pathname.startsWith("/nieuws") ||
    pathname.startsWith("/agenda") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/doneren") ||
    pathname.startsWith("/doneer") ||
    pathname.startsWith("/partijprogramma") ||
    pathname.startsWith("/peilingen") ||
    pathname.startsWith("/polls") ||
    pathname === "/";

  if (queryParam) {
    try {
      localStorage.setItem("portal_tenant", queryParam);
    } catch {
      // ignore
    }
  }

  const storedTenant = typeof localStorage !== "undefined" ? localStorage.getItem("portal_tenant") : null;

  // Check if Hoogeveen domain or test param
  const isHoogeveenDomain =
    hostname.includes("hoogeveen.") ||
    hostname.includes("hgv.") ||
    hostname.startsWith("hoogeveen-");

  // Hoogeveen portal mode is active if:
  // 1) Hostname is Hoogeveen domain
  // 2) OR query param explicitly sets portal=hoogeveen
  // 3) OR storedTenant is hoogeveen AND we are on a council workspace route (/raadspaneel or /dossiers) AND NOT on a Steenwijkerland party/wijk route
  const isHoogeveen =
    isHoogeveenDomain ||
    queryParam === "hoogeveen" ||
    queryParam === "hgv" ||
    (storedTenant === "hoogeveen" && !isSteenwijkerlandRoute && (pathname.startsWith("/raadspaneel") || pathname.startsWith("/dossiers")));

  if (isHoogeveen) {
    return {
      isPortalMode: true,
      tenantId: "hoogeveen",
      municipalityName: "Hoogeveen",
      portalTitle: "Raadsportaal Hoogeveen",
      portalSubtitle: "Digitaal Fractie- & Dossierbeheer",
      shortCode: "hgv",
      risSystemName: "Gemeenteraad Hoogeveen",
    };
  }

  // Auto-reset storedTenant if on a Steenwijkerland party/wijk route
  if (isSteenwijkerlandRoute && storedTenant === "hoogeveen" && !queryParam) {
    try {
      localStorage.setItem("portal_tenant", "steenwijkerland");
    } catch {
      // ignore
    }
  }

  // Default to standard Steenwijkerland party site
  return {
    isPortalMode: false,
    tenantId: "steenwijkerland",
    municipalityName: "Steenwijkerland",
    portalTitle: "Lijst van Andel",
    portalSubtitle: "Steenwijkerland",
    shortCode: "swl",
    risSystemName: "Notubiz",
  };
}

export function isCurrentPortalMode(): boolean {
  return getPortalConfig().isPortalMode;
}

export function setPortalTenant(tenant: "hoogeveen" | "steenwijkerland") {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("portal_tenant", tenant);
    window.location.reload();
  }
}
