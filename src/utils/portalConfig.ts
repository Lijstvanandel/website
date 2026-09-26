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

export function getPortalConfig(): PortalConfig {
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

  if (queryParam) {
    try {
      localStorage.setItem("portal_tenant", queryParam);
    } catch {
      // ignore
    }
  }

  const storedTenant = typeof localStorage !== "undefined" ? localStorage.getItem("portal_tenant") : null;
  const portalParam = queryParam || storedTenant;

  // Check if Hoogeveen domain or test param
  const isHoogeveen =
    hostname.includes("hoogeveen.") ||
    hostname.includes("hgv.") ||
    hostname.startsWith("hoogeveen-") ||
    portalParam === "hoogeveen" ||
    portalParam === "hgv";

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
