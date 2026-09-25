// ============================================================================
// SCRAPER CONTRACT VALIDATION & CIRCUIT BREAKER
// Protects database from corruption when external portals (Notubiz, iBabs,
// Waterschap / OpenRaadsinformatie) alter their DOM layouts or API schemas.
// ============================================================================

export type ScraperProvider = "ibabs_steenwijkerland" | "notubiz_overijssel" | "waterschap_wdodelta";

export interface ScraperContractAlert {
  id: string;
  provider: ScraperProvider;
  timestamp: string;
  reason: "LAYOUT_CHANGED" | "EMPTY_PAYLOAD" | "BLOCKED_OR_CHALLENGE" | "SCHEMA_MISMATCH";
  message: string;
  url?: string;
  snippet?: string;
  consecutiveFailures: number;
}

export interface ScraperHealthStatus {
  provider: ScraperProvider;
  name: string;
  status: "HEALTHY" | "CIRCUIT_OPEN" | "DEGRADED";
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveFailures: number;
  circuitOpenReason?: string;
  alerts: ScraperContractAlert[];
}

// In-memory circuit breaker and health tracker
const providerHealth: Record<ScraperProvider, ScraperHealthStatus> = {
  ibabs_steenwijkerland: {
    provider: "ibabs_steenwijkerland",
    name: "Steenwijkerland Bestuurlijke Informatie (iBabs)",
    status: "HEALTHY",
    lastSuccessAt: new Date().toISOString(),
    lastFailureAt: null,
    consecutiveFailures: 0,
    alerts: [],
  },
  notubiz_overijssel: {
    provider: "notubiz_overijssel",
    name: "Provincie Overijssel (Notubiz / OpenRaadsinformatie)",
    status: "HEALTHY",
    lastSuccessAt: new Date().toISOString(),
    lastFailureAt: null,
    consecutiveFailures: 0,
    alerts: [],
  },
  waterschap_wdodelta: {
    provider: "waterschap_wdodelta",
    name: "Waterschap Drents Overijsselse Delta (WDODelta)",
    status: "HEALTHY",
    lastSuccessAt: new Date().toISOString(),
    lastFailureAt: null,
    consecutiveFailures: 0,
    alerts: [],
  },
};

const FAILURE_THRESHOLD_TO_OPEN_CIRCUIT = 2;

/**
 * Clean & sanitize text strings extracted from HTML to ensure NO raw markup enters the database.
 */
export function sanitizeCleanText(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "";

  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ") // Strip HTML tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if a text appears to be raw HTML, error page, or navigation junk rather than valid content.
 */
export function isCorruptOrHtmlGarbage(text: string): boolean {
  if (!text) return true;
  const lower = text.toLowerCase();
  if (
    lower.includes("<!doctype html") ||
    lower.includes("<html") ||
    lower.includes("<head>") ||
    lower.includes("cloudflare") ||
    lower.includes("access denied") ||
    lower.includes("inloggen vereist") ||
    lower.includes("403 forbidden") ||
    lower.includes("502 bad gateway") ||
    lower.includes("captcha") ||
    lower.includes("session expired")
  ) {
    return true;
  }
  return false;
}

/**
 * Validate HTML returned by iBabs / Bestuurlijke Informatie portal.
 */
export function validateIbabsHtmlContract(
  html: string,
  url: string
): { isValid: boolean; reason?: string; alert?: ScraperContractAlert } {
  if (!html || typeof html !== "string") {
    return recordFailure("ibabs_steenwijkerland", "EMPTY_PAYLOAD", "Lege HTML respons ontvangen van iBabs", url);
  }

  // Check 1: Anti-bot / Cloudflare / 403 blocks
  if (isCorruptOrHtmlGarbage(html) && !html.includes("agenda-item") && !html.includes("panel-title")) {
    return recordFailure(
      "ibabs_steenwijkerland",
      "BLOCKED_OR_CHALLENGE",
      "iBabs server blokkeerde toegang (Cloudflare/403/Login-muur)",
      url,
      html.slice(0, 300)
    );
  }

  // Check 2: Minimum size
  if (html.length < 250) {
    return recordFailure(
      "ibabs_steenwijkerland",
      "EMPTY_PAYLOAD",
      `Verdacht korte HTML respons (${html.length} bytes)`,
      url,
      html
    );
  }

  // Check 3: Essential structural anchors
  const hasAgendaStructures =
    html.includes("agenda-item") ||
    html.includes("meeting-link") ||
    html.includes("/Agenda/Index/") ||
    html.includes("/Vergadering/") ||
    html.includes("panel-title") ||
    html.includes("panel-id");

  if (!hasAgendaStructures && !html.includes("Geen agendapunten gevonden")) {
    return recordFailure(
      "ibabs_steenwijkerland",
      "LAYOUT_CHANGED",
      "Verwachte CSS/DOM-structuren (.agenda-item / panel-title) ontbreken. Portal lay-out is waarschijnlijk gewijzigd!",
      url,
      html.slice(0, 300)
    );
  }

  recordSuccess("ibabs_steenwijkerland");
  return { isValid: true };
}

/**
 * Validate JSON payload returned by Notubiz API or OpenRaadsinformatie.
 */
export function validateNotubizApiContract(
  data: any,
  url: string,
  provider: ScraperProvider = "notubiz_overijssel"
): { isValid: boolean; reason?: string; alert?: ScraperContractAlert } {
  if (!data || typeof data !== "object") {
    return recordFailure(provider, "SCHEMA_MISMATCH", "Notubiz gaf geen geldig JSON-object terug", url);
  }

  // If API returned an error object or HTML string parsed as string
  if (typeof data === "string" && isCorruptOrHtmlGarbage(data)) {
    return recordFailure(
      provider,
      "BLOCKED_OR_CHALLENGE",
      "Notubiz endpoint retourneerde HTML in plaats van JSON (blokkade of lay-out wijziging)",
      url,
      String(data).slice(0, 250)
    );
  }

  // Check for common Notubiz root fields
  const hasResults = Array.isArray(data.results) || Array.isArray(data.items) || Array.isArray(data.events) || data.id;
  if (!hasResults && !Array.isArray(data) && !data.modules && !data.meetings) {
    return recordFailure(
      provider,
      "SCHEMA_MISMATCH",
      "Notubiz schema afwijking: ontbrekende 'results', 'items', 'events' of 'modules' array",
      url,
      JSON.stringify(data).slice(0, 250)
    );
  }

  recordSuccess(provider);
  return { isValid: true };
}

/**
 * Record a contract failure. If consecutive failures reach threshold, opens circuit breaker.
 */
function recordFailure(
  provider: ScraperProvider,
  reason: ScraperContractAlert["reason"],
  message: string,
  url?: string,
  snippet?: string
): { isValid: boolean; reason: string; alert: ScraperContractAlert } {
  const hp = providerHealth[provider];
  hp.consecutiveFailures++;
  hp.lastFailureAt = new Date().toISOString();

  const alert: ScraperContractAlert = {
    id: `alert-${provider}-${Date.now()}`,
    provider,
    timestamp: new Date().toISOString(),
    reason,
    message,
    url,
    snippet: snippet ? snippet.slice(0, 400) : undefined,
    consecutiveFailures: hp.consecutiveFailures,
  };

  hp.alerts.unshift(alert);
  if (hp.alerts.length > 20) {
    hp.alerts.pop();
  }

  if (hp.consecutiveFailures >= FAILURE_THRESHOLD_TO_OPEN_CIRCUIT) {
    hp.status = "CIRCUIT_OPEN";
    hp.circuitOpenReason = `${reason}: ${message}`;

    console.error(
      `[CIRCUIT BREAKER OPEN: ${provider.toUpperCase()}] Scraper pipeline gestopt ter bescherming van database. Reden: ${message}`
    );

    // Circuit Breaker tripped alert log
    console.warn(
      `[SCRAPER CIRCUIT BREAKER ALERTS] Provider: ${provider}, Reden: ${reason}, Bericht: ${message}`
    );
  } else {
    hp.status = "DEGRADED";
  }

  return { isValid: false, reason: message, alert };
}

/**
 * Record a contract success. Resets failure counter and marks provider as healthy.
 */
function recordSuccess(provider: ScraperProvider): void {
  const hp = providerHealth[provider];
  hp.consecutiveFailures = 0;
  hp.lastSuccessAt = new Date().toISOString();
  if (hp.status !== "CIRCUIT_OPEN") {
    hp.status = "HEALTHY";
    hp.circuitOpenReason = undefined;
  }
}

/**
 * Check if the circuit is open for a given provider (meaning writes must be rejected).
 */
export function isScraperCircuitOpen(provider: ScraperProvider): boolean {
  return providerHealth[provider]?.status === "CIRCUIT_OPEN";
}

/**
 * Reset the circuit breaker manually (e.g. from Admin UI).
 */
export function resetScraperCircuitBreaker(provider?: ScraperProvider): { success: boolean; message: string } {
  if (provider && providerHealth[provider]) {
    const hp = providerHealth[provider];
    hp.status = "HEALTHY";
    hp.consecutiveFailures = 0;
    hp.circuitOpenReason = undefined;
    return { success: true, message: `Circuit breaker voor ${hp.name} is succesvol gereset.` };
  }

  // Reset all
  for (const p of Object.keys(providerHealth) as ScraperProvider[]) {
    providerHealth[p].status = "HEALTHY";
    providerHealth[p].consecutiveFailures = 0;
    providerHealth[p].circuitOpenReason = undefined;
  }

  return { success: true, message: "Alle scraper circuit breakers zijn succesvol gereset." };
}

/**
 * Get current health and circuit breaker status for all scrapers.
 */
export function getAllScraperHealth(): ScraperHealthStatus[] {
  return Object.values(providerHealth);
}
