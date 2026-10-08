/**
 * Website configuration for Steenwijkerland (Lijst van Andel).
 * Portal mode / external municipality multi-tenancy has been completely removed.
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

export function getPortalConfig(_currentPathname?: string, _currentUser?: any): PortalConfig {
  return {
    isPortalMode: false,
    tenantId: "steenwijkerland",
    municipalityName: "Steenwijkerland",
    portalTitle: "Lijst van Andel",
    portalSubtitle: "Steenwijkerland",
    shortCode: "swl",
    risSystemName: "iBabs",
  };
}

export function isCurrentPortalMode(): boolean {
  return false;
}

export function setPortalTenant(_tenant: string) {
  // No-op: Only Steenwijkerland is supported
}
