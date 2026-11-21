import crypto from "crypto";
import jwt from "jsonwebtoken";
import { loadVaultKv, saveVaultKv } from "./vaultDatabase.js";

const KV_RSA_KEY = "sso_rsa_keypair_v1";
const KV_REVOKED_REFRESH_KEY = "sso_revoked_refresh_v1";
const KV_SSO_ANALYTICS_KEY = "sso_analytics_v1";

export type SsoActorStatus = "anonymous" | "non_member" | "member";
export type SsoExportFormat = "csv" | "json" | "other";
export type SsoTelemetryEventType =
  | "export_attempt"
  | "sso_prompt_opened"
  | "sso_login_completed"
  | "token_verified";

export interface SsoClientAnalytics {
  clientId: string;
  name: string;
  firstParty: boolean;
  totalExportClicks: number;
  anonymousExportAttempts: number;
  nonMemberExportAttempts: number;
  memberExportAttempts: number;
  csvAttempts: number;
  jsonAttempts: number;
  otherFormatAttempts: number;
  ssoScreenOpens: number;
  ssoScreenAnonOpens: number;
  ssoScreenNonMemberOpens: number;
  ssoScreenMemberOpens: number;
  ssoLoginsCompleted: number;
  ssoLoginsNonMember: number;
  ssoLoginsMember: number;
  verifyChecks: number;
  lastActivityAt: string | null;
  lastOrigin: string | null;
}

export interface SsoDailyAnalytics {
  date: string;
  totalExports: number;
  anonymousExports: number;
  nonMemberExports: number;
  memberExports: number;
  ssoOpens: number;
  ssoLogins: number;
}

export interface SsoTelemetryEvent {
  id: string;
  timestamp: string;
  clientId: string;
  clientName: string;
  eventType: SsoTelemetryEventType;
  actorStatus: SsoActorStatus;
  format: SsoExportFormat;
  originHost: string | null;
  userLabel: string;
  note?: string;
}

interface StoredSsoAnalytics {
  version: number;
  updatedAt: string;
  clients: Record<string, SsoClientAnalytics>;
  daily: Record<string, SsoDailyAnalytics>;
  recentEvents: SsoTelemetryEvent[];
}

export interface SsoPublicJwk {
  kty: string;
  n: string;
  e: string;
  alg: string;
  use: string;
  kid: string;
}

interface StoredRsaKeypair {
  kid: string;
  publicKeyPem: string;
  privateKeyPem: string;
  publicJwk: SsoPublicJwk;
  createdAt: string;
}

export interface SsoClientInfo {
  clientId: string;
  name: string;
  description: string;
  firstParty: boolean;
}

interface AuthorizationCodeEntry {
  code: string;
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: "S256" | "plain";
  scope: string;
  nonce?: string;
  expiresAt: number;
}

const KNOWN_CLIENTS: Record<string, Omit<SsoClientInfo, "clientId">> = {
  "vliegverkeer-radar": {
    name: "Luchtverkeer Radar Steenwijkerland",
    description: "Dataproduct voor vliegbewegingen, statistieken en dataset-export in Steenwijkerland.",
    firstParty: true,
  },
  "luchtverkeer-radar": {
    name: "Luchtverkeer Radar Steenwijkerland",
    description: "Dataproduct voor vliegbewegingen, statistieken en dataset-export in Steenwijkerland.",
    firstParty: true,
  },
  bekendmakingen: {
    name: "Bekendmakingen Steenwijkerland",
    description: "Overzicht en export van officiële bekendmakingen en vergunningen.",
    firstParty: true,
  },
  fietsveiligheid: {
    name: "Fietsveiligheid Steenwijkerland",
    description: "Dataproduct voor meldingen, analyses en export rond fietsveiligheid.",
    firstParty: true,
  },
  mobiliteit: {
    name: "Mobiliteit Steenwijkerland",
    description: "Dataproduct voor verkeers- en mobiliteitsanalyses in Steenwijkerland.",
    firstParty: true,
  },
  landbouw: {
    name: "Landbouw & Natuur Steenwijkerland",
    description: "Dataproduct voor agrarische cijfers, natuur en ruimtelijke data.",
    firstParty: true,
  },
  verkeersveiligheid: {
    name: "Verkeersveiligheid Steenwijkerland",
    description: "Dataproduct voor verkeersknelpunten en incidentanalyses.",
    firstParty: true,
  },
};

const PRIMARY_KNOWN_CLIENT_IDS = [
  "vliegverkeer-radar",
  "bekendmakingen",
  "fietsveiligheid",
  "mobiliteit",
  "landbouw",
  "verkeersveiligheid",
];

let cachedKeypair: StoredRsaKeypair | null = null;
const authCodeStore = new Map<string, AuthorizationCodeEntry>();
const revokedRefreshJtis = new Set<string>();
let analyticsStore: StoredSsoAnalytics | null = null;

function createEmptyAnalyticsStore(): StoredSsoAnalytics {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    clients: {},
    daily: {},
    recentEvents: [],
  };
}

function ensureAnalyticsStore(): StoredSsoAnalytics {
  if (analyticsStore) return analyticsStore;
  const existing = loadVaultKv<StoredSsoAnalytics>(KV_SSO_ANALYTICS_KEY);
  if (existing && typeof existing === "object" && existing.clients && existing.daily) {
    analyticsStore = {
      version: existing.version || 1,
      updatedAt: existing.updatedAt || new Date().toISOString(),
      clients: existing.clients || {},
      daily: existing.daily || {},
      recentEvents: Array.isArray(existing.recentEvents) ? existing.recentEvents : [],
    };
  } else {
    analyticsStore = createEmptyAnalyticsStore();
  }
  return analyticsStore;
}

function persistAnalyticsStore(): void {
  if (!analyticsStore) return;
  try {
    analyticsStore.updatedAt = new Date().toISOString();
    saveVaultKv(KV_SSO_ANALYTICS_KEY, analyticsStore);
  } catch (err) {
    console.error("[SSO] Opslaan van SSO-exportstatistieken mislukt:", err);
  }
}

export function isKnownSsoClient(clientId?: string | null): boolean {
  if (!clientId || typeof clientId !== "string") return false;
  return Boolean(KNOWN_CLIENTS[clientId.trim().toLowerCase()]);
}

function cleanupExpiredCodes() {
  const now = Date.now();
  for (const [code, entry] of authCodeStore.entries()) {
    if (entry.expiresAt <= now) {
      authCodeStore.delete(code);
    }
  }
}

export function getIssuerBaseUrl(): string {
  const primaryDomain = (process.env.PRIMARY_DOMAIN || "onafhankelijksteenwijkerland.nl")
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
  return `https://${primaryDomain}`;
}

export function initSsoService(): void {
  ensureAnalyticsStore();

  if (cachedKeypair) return;

  const existing = loadVaultKv<StoredRsaKeypair>(KV_RSA_KEY);
  if (existing && existing.privateKeyPem && existing.publicKeyPem && existing.publicJwk && existing.kid) {
    cachedKeypair = existing;
  } else {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const jwkRaw = crypto.createPublicKey(publicKey).export({ format: "jwk" }) as {
      kty?: string;
      n?: string;
      e?: string;
    };
    const thumbprint = crypto
      .createHash("sha256")
      .update(`${jwkRaw.kty || "RSA"}:${jwkRaw.n || ""}:${jwkRaw.e || ""}`)
      .digest("base64url")
      .slice(0, 16);

    const kid = `osl-rsa-${thumbprint}`;
    const pair: StoredRsaKeypair = {
      kid,
      publicKeyPem: publicKey,
      privateKeyPem: privateKey,
      publicJwk: {
        kty: jwkRaw.kty || "RSA",
        n: jwkRaw.n || "",
        e: jwkRaw.e || "AQAB",
        alg: "RS256",
        use: "sig",
        kid,
      },
      createdAt: new Date().toISOString(),
    };

    saveVaultKv(KV_RSA_KEY, pair);
    cachedKeypair = pair;
    console.log(`[SSO] Nieuw RS256 sleutelpaar aangemaakt en veilig opgeslagen (kid=${kid}).`);
  }

  const revokedList = loadVaultKv<string[]>(KV_REVOKED_REFRESH_KEY);
  if (Array.isArray(revokedList)) {
    for (const jti of revokedList) {
      if (typeof jti === "string" && jti) revokedRefreshJtis.add(jti);
    }
  }
}

function ensureKeypair(): StoredRsaKeypair {
  if (!cachedKeypair) {
    initSsoService();
  }
  return cachedKeypair!;
}

export function getJwksResponse(): { keys: SsoPublicJwk[] } {
  const pair = ensureKeypair();
  return {
    keys: [pair.publicJwk],
  };
}

export function isAllowedSsoOrigin(originOrUrl?: string | null): boolean {
  if (!originOrUrl || typeof originOrUrl !== "string") return false;
  try {
    const parsed = new URL(originOrUrl);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return protocol === "http:" || protocol === "https:";
    }

    if (protocol !== "https:") {
      return false;
    }

    if (
      hostname === "onafhankelijksteenwijkerland.nl" ||
      hostname.endsWith(".onafhankelijksteenwijkerland.nl") ||
      hostname === "scientiarum.nl" ||
      hostname.endsWith(".scientiarum.nl") ||
      hostname.endsWith(".run.app") ||
      hostname.endsWith(".ai-studio.app") ||
      hostname.endsWith(".web.app")
    ) {
      return true;
    }

    const extraAllowed = (process.env.SSO_ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    return extraAllowed.some((entry) => {
      if (entry.startsWith("*.")) {
        const suffix = entry.slice(1); // e.g. ".example.nl"
        return hostname.endsWith(suffix) || hostname === entry.slice(2);
      }
      return hostname === entry || originOrUrl.toLowerCase().startsWith(entry);
    });
  } catch {
    return false;
  }
}

export function isAllowedRedirectUri(redirectUri?: string | null): boolean {
  return isAllowedSsoOrigin(redirectUri);
}

export function resolveSsoClientInfo(clientId?: string | null, redirectUri?: string | null): SsoClientInfo {
  const normalizedId = String(clientId || "osl-dataproduct").trim().toLowerCase() || "osl-dataproduct";
  if (KNOWN_CLIENTS[normalizedId]) {
    return {
      clientId: normalizedId,
      ...KNOWN_CLIENTS[normalizedId],
    };
  }

  let hostnameLabel = "OSL Dataproduct";
  if (redirectUri) {
    try {
      const host = new URL(redirectUri).hostname;
      const firstSub = host.split(".")[0];
      if (firstSub && firstSub !== "www") {
        hostnameLabel = `${firstSub.charAt(0).toUpperCase()}${firstSub.slice(1)} (${host})`;
      } else {
        hostnameLabel = host;
      }
    } catch {
      // ignore
    }
  }

  return {
    clientId: normalizedId,
    name: hostnameLabel,
    description: "Gekoppeld dashboard / dataproduct van Onafhankelijk Steenwijkerland.",
    firstParty: isAllowedRedirectUri(redirectUri),
  };
}

function normalizeFormat(format?: string | null, scope?: string | null): SsoExportFormat {
  const f = String(format || "").trim().toLowerCase();
  if (f === "csv" || f === "text/csv") return "csv";
  if (f === "json" || f === "application/json") return "json";
  if (f) return "other";

  const s = String(scope || "").toLowerCase();
  const hasCsv = s.includes("export:csv");
  const hasJson = s.includes("export:json");
  if (hasCsv && !hasJson) return "csv";
  if (hasJson && !hasCsv) return "json";
  return "other";
}

function extractOriginHost(originOrUrl?: string | null): string | null {
  if (!originOrUrl || typeof originOrUrl !== "string") return null;
  try {
    return new URL(originOrUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function createEmptyClientStats(clientId: string, info: SsoClientInfo): SsoClientAnalytics {
  return {
    clientId,
    name: info.name,
    firstParty: info.firstParty,
    totalExportClicks: 0,
    anonymousExportAttempts: 0,
    nonMemberExportAttempts: 0,
    memberExportAttempts: 0,
    csvAttempts: 0,
    jsonAttempts: 0,
    otherFormatAttempts: 0,
    ssoScreenOpens: 0,
    ssoScreenAnonOpens: 0,
    ssoScreenNonMemberOpens: 0,
    ssoScreenMemberOpens: 0,
    ssoLoginsCompleted: 0,
    ssoLoginsNonMember: 0,
    ssoLoginsMember: 0,
    verifyChecks: 0,
    lastActivityAt: null,
    lastOrigin: null,
  };
}

export function recordSsoTelemetryEvent(params: {
  clientId?: string | null;
  redirectUri?: string | null;
  origin?: string | null;
  eventType: SsoTelemetryEventType;
  actorStatus: SsoActorStatus;
  format?: string | null;
  scope?: string | null;
  userLabel?: string | null;
  note?: string | null;
}): void {
  const store = ensureAnalyticsStore();
  const rawClientId = String(params.clientId || "osl-dataproduct")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]/g, "")
    .slice(0, 64) || "osl-dataproduct";

  const originCandidate = params.redirectUri || params.origin || null;
  const originHost = extractOriginHost(originCandidate);
  const clientInfo = resolveSsoClientInfo(rawClientId, originCandidate);
  const effectiveFormat = normalizeFormat(params.format, params.scope);
  const nowIso = new Date().toISOString();
  const dateKey = nowIso.slice(0, 10);

  if (!store.clients[rawClientId]) {
    store.clients[rawClientId] = createEmptyClientStats(rawClientId, clientInfo);
  }
  const clientStats = store.clients[rawClientId];
  // Refresh friendly name if redirectUri provides a better label for previously unknown client
  if (clientInfo.name && clientStats.name === "OSL Dataproduct" && clientInfo.name !== "OSL Dataproduct") {
    clientStats.name = clientInfo.name;
  }
  clientStats.firstParty = clientStats.firstParty || clientInfo.firstParty;
  clientStats.lastActivityAt = nowIso;
  if (originHost) clientStats.lastOrigin = originHost;

  if (!store.daily[dateKey]) {
    store.daily[dateKey] = {
      date: dateKey,
      totalExports: 0,
      anonymousExports: 0,
      nonMemberExports: 0,
      memberExports: 0,
      ssoOpens: 0,
      ssoLogins: 0,
    };
  }
  const dayStats = store.daily[dateKey];

  if (params.eventType === "export_attempt") {
    clientStats.totalExportClicks += 1;
    dayStats.totalExports += 1;

    if (params.actorStatus === "anonymous") {
      clientStats.anonymousExportAttempts += 1;
      dayStats.anonymousExports += 1;
    } else if (params.actorStatus === "non_member") {
      clientStats.nonMemberExportAttempts += 1;
      dayStats.nonMemberExports += 1;
    } else {
      clientStats.memberExportAttempts += 1;
      dayStats.memberExports += 1;
    }

    if (effectiveFormat === "csv") clientStats.csvAttempts += 1;
    else if (effectiveFormat === "json") clientStats.jsonAttempts += 1;
    else clientStats.otherFormatAttempts += 1;
  } else if (params.eventType === "sso_prompt_opened") {
    clientStats.ssoScreenOpens += 1;
    dayStats.ssoOpens += 1;
    if (params.actorStatus === "anonymous") clientStats.ssoScreenAnonOpens += 1;
    else if (params.actorStatus === "non_member") clientStats.ssoScreenNonMemberOpens += 1;
    else clientStats.ssoScreenMemberOpens += 1;
  } else if (params.eventType === "sso_login_completed") {
    clientStats.ssoLoginsCompleted += 1;
    dayStats.ssoLogins += 1;
    if (params.actorStatus === "non_member") clientStats.ssoLoginsNonMember += 1;
    else if (params.actorStatus === "member") clientStats.ssoLoginsMember += 1;
  } else if (params.eventType === "token_verified") {
    clientStats.verifyChecks += 1;
  }

  // Prune daily entries older than 90 days
  const dailyKeys = Object.keys(store.daily).sort();
  if (dailyKeys.length > 90) {
    for (const oldKey of dailyKeys.slice(0, dailyKeys.length - 90)) {
      delete store.daily[oldKey];
    }
  }

  const defaultUserLabel =
    params.actorStatus === "anonymous"
      ? "Anonieme bezoeker"
      : params.actorStatus === "non_member"
      ? "Ingelogd (geen partijlid)"
      : "Actief partijlid";

  const event: SsoTelemetryEvent = {
    id: crypto.randomUUID(),
    timestamp: nowIso,
    clientId: rawClientId,
    clientName: clientStats.name,
    eventType: params.eventType,
    actorStatus: params.actorStatus,
    format: effectiveFormat,
    originHost,
    userLabel: String(params.userLabel || defaultUserLabel).slice(0, 100),
    note: params.note ? String(params.note).slice(0, 140) : undefined,
  };

  store.recentEvents.unshift(event);
  if (store.recentEvents.length > 250) {
    store.recentEvents.length = 250;
  }

  persistAnalyticsStore();
}

export function getSsoAnalyticsSummary() {
  const store = ensureAnalyticsStore();
  const mergedClientsMap = new Map<string, SsoClientAnalytics>();

  for (const id of PRIMARY_KNOWN_CLIENT_IDS) {
    const info = resolveSsoClientInfo(id, null);
    mergedClientsMap.set(id, createEmptyClientStats(id, info));
  }

  for (const [id, stats] of Object.entries(store.clients)) {
    mergedClientsMap.set(id, { ...stats });
  }

  const clients = Array.from(mergedClientsMap.values()).sort((a, b) => {
    if (b.totalExportClicks !== a.totalExportClicks) return b.totalExportClicks - a.totalExportClicks;
    if (b.ssoScreenOpens !== a.ssoScreenOpens) return b.ssoScreenOpens - a.ssoScreenOpens;
    if (b.ssoLoginsCompleted !== a.ssoLoginsCompleted) return b.ssoLoginsCompleted - a.ssoLoginsCompleted;
    return a.name.localeCompare(b.name, "nl");
  });

  const totals = clients.reduce(
    (acc, c) => {
      acc.totalExportClicks += c.totalExportClicks;
      acc.anonymousExportAttempts += c.anonymousExportAttempts;
      acc.nonMemberExportAttempts += c.nonMemberExportAttempts;
      acc.memberExportAttempts += c.memberExportAttempts;
      acc.csvAttempts += c.csvAttempts;
      acc.jsonAttempts += c.jsonAttempts;
      acc.otherFormatAttempts += c.otherFormatAttempts;
      acc.ssoScreenOpens += c.ssoScreenOpens;
      acc.ssoScreenAnonOpens += c.ssoScreenAnonOpens;
      acc.ssoLoginsCompleted += c.ssoLoginsCompleted;
      acc.ssoLoginsNonMember += c.ssoLoginsNonMember;
      acc.ssoLoginsMember += c.ssoLoginsMember;
      acc.verifyChecks += c.verifyChecks;
      return acc;
    },
    {
      totalExportClicks: 0,
      anonymousExportAttempts: 0,
      nonMemberExportAttempts: 0,
      memberExportAttempts: 0,
      nonMemberOrAnonExportAttempts: 0,
      csvAttempts: 0,
      jsonAttempts: 0,
      otherFormatAttempts: 0,
      ssoScreenOpens: 0,
      ssoScreenAnonOpens: 0,
      ssoLoginsCompleted: 0,
      ssoLoginsNonMember: 0,
      ssoLoginsMember: 0,
      verifyChecks: 0,
    }
  );
  totals.nonMemberOrAnonExportAttempts = totals.anonymousExportAttempts + totals.nonMemberExportAttempts;

  // Build chronological last 30 days array
  const daily: SsoDailyAnalytics[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    daily.push(
      store.daily[key] || {
        date: key,
        totalExports: 0,
        anonymousExports: 0,
        nonMemberExports: 0,
        memberExports: 0,
        ssoOpens: 0,
        ssoLogins: 0,
      }
    );
  }

  return {
    updatedAt: store.updatedAt,
    totals,
    clients,
    daily,
    recentEvents: store.recentEvents.slice(0, 150),
    knownClients: PRIMARY_KNOWN_CLIENT_IDS.map((id) => resolveSsoClientInfo(id, null)),
  };
}

export function resetSsoAnalytics() {
  analyticsStore = createEmptyAnalyticsStore();
  persistAnalyticsStore();
  return getSsoAnalyticsSummary();
}

export function createAuthorizationCode(params: {
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  scope?: string;
  nonce?: string;
}): string {
  cleanupExpiredCodes();
  const code = crypto.randomBytes(32).toString("base64url");
  const method =
    params.codeChallengeMethod && params.codeChallengeMethod.toLowerCase() === "plain"
      ? "plain"
      : params.codeChallenge
      ? "S256"
      : undefined;

  authCodeStore.set(code, {
    code,
    userId: String(params.userId),
    clientId: String(params.clientId || "osl-dataproduct"),
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge || undefined,
    codeChallengeMethod: method,
    scope: params.scope || "openid profile email export:csv export:json",
    nonce: params.nonce || undefined,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });

  return code;
}

function verifyPkce(codeVerifier: string | undefined, entry: AuthorizationCodeEntry): boolean {
  if (!entry.codeChallenge) {
    return true;
  }
  if (!codeVerifier || typeof codeVerifier !== "string" || codeVerifier.length < 16) {
    return false;
  }
  if (entry.codeChallengeMethod === "plain") {
    return crypto.timingSafeEqual(Buffer.from(codeVerifier), Buffer.from(entry.codeChallenge));
  }
  const expected = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(entry.codeChallenge);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function buildUserSsoClaims(user: any, safeUser?: any) {
  const email = user.email || (String(user.username || "").includes("@") ? user.username : `${user.username}@leden.onafhankelijksteenwijkerland.nl`);
  const name = user.fullName || user.username || email;
  const role = String(user.role || "member");
  const isMember = Boolean(safeUser?.isLid ?? (user.billingStatus === "paid" || user.billingStatus === "exempt" || role === "admin" || role === "raadslid" || role === "bestuur"));
  const membershipState = safeUser?.membershipState || (isMember ? "active" : "unpaid");
  const scopes = ["openid", "profile", "email", "export:csv", "export:json"];

  return {
    sub: String(user.id),
    id: String(user.id),
    username: String(user.username || email),
    email: String(email),
    name: String(name),
    role,
    is_member: isMember,
    membership_state: membershipState,
    scopes,
    scope: scopes.join(" "),
  };
}

export function issueTokensForUser(params: {
  user: any;
  safeUser?: any;
  clientId: string;
  scope?: string;
  nonce?: string;
}) {
  const pair = ensureKeypair();
  const issuer = getIssuerBaseUrl();
  const baseClaims = buildUserSsoClaims(params.user, params.safeUser);
  const effectiveScope = params.scope || baseClaims.scope;
  const accessJti = crypto.randomUUID();
  const refreshJti = crypto.randomUUID();

  const accessTokenPayload = {
    ...baseClaims,
    scope: effectiveScope,
    client_id: params.clientId,
    token_use: "access",
    jti: accessJti,
  };

  const access_token = jwt.sign(accessTokenPayload, pair.privateKeyPem, {
    algorithm: "RS256",
    keyid: pair.kid,
    issuer,
    audience: params.clientId,
    expiresIn: "1h",
  });

  const idTokenPayload: Record<string, any> = {
    ...baseClaims,
    token_use: "id",
  };
  if (params.nonce) {
    idTokenPayload.nonce = params.nonce;
  }

  const id_token = jwt.sign(idTokenPayload, pair.privateKeyPem, {
    algorithm: "RS256",
    keyid: pair.kid,
    issuer,
    audience: params.clientId,
    expiresIn: "1h",
  });

  const refresh_token = jwt.sign(
    {
      sub: String(params.user.id),
      client_id: params.clientId,
      scope: effectiveScope,
      token_use: "refresh",
      jti: refreshJti,
    },
    pair.privateKeyPem,
    {
      algorithm: "RS256",
      keyid: pair.kid,
      issuer,
      audience: params.clientId,
      expiresIn: "30d",
    }
  );

  return {
    token_type: "Bearer",
    expires_in: 3600,
    access_token,
    id_token,
    refresh_token,
    scope: effectiveScope,
    user: {
      sub: baseClaims.sub,
      id: baseClaims.id,
      username: baseClaims.username,
      email: baseClaims.email,
      name: baseClaims.name,
      role: baseClaims.role,
      is_member: baseClaims.is_member,
      membership_state: baseClaims.membership_state,
      scopes: baseClaims.scopes,
    },
  };
}

export function consumeAuthorizationCode(params: {
  code: string;
  redirectUri?: string;
  clientId?: string;
  codeVerifier?: string;
}): { ok: true; entry: AuthorizationCodeEntry } | { ok: false; error: string; status: number } {
  cleanupExpiredCodes();
  const entry = authCodeStore.get(params.code);
  if (!entry) {
    return { ok: false, error: "invalid_grant: autorisatiecode is verlopen, ongeldig of al gebruikt.", status: 400 };
  }

  // Single-use enforcement
  authCodeStore.delete(params.code);

  if (entry.expiresAt <= Date.now()) {
    return { ok: false, error: "invalid_grant: autorisatiecode is verlopen.", status: 400 };
  }

  if (params.clientId && params.clientId !== entry.clientId) {
    return { ok: false, error: "invalid_client: client_id komt niet overeen.", status: 400 };
  }

  if (params.redirectUri && params.redirectUri !== entry.redirectUri) {
    return { ok: false, error: "invalid_grant: redirect_uri komt niet overeen.", status: 400 };
  }

  if (!verifyPkce(params.codeVerifier, entry)) {
    return { ok: false, error: "invalid_grant: PKCE code_verifier verificatie mislukt.", status: 400 };
  }

  return { ok: true, entry };
}

export function verifyRefreshToken(refreshToken: string): { ok: true; payload: any } | { ok: false; error: string } {
  const pair = ensureKeypair();
  try {
    const decoded = jwt.verify(refreshToken, pair.publicKeyPem, {
      algorithms: ["RS256"],
    }) as any;
    if (!decoded || decoded.token_use !== "refresh" || !decoded.sub) {
      return { ok: false, error: "Ongeldig refresh token type." };
    }
    if (decoded.jti && revokedRefreshJtis.has(decoded.jti)) {
      return { ok: false, error: "Refresh token is ingetrokken." };
    }
    return { ok: true, payload: decoded };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Refresh token verificatie mislukt." };
  }
}

export function revokeRefreshToken(refreshToken?: string | null): boolean {
  if (!refreshToken || typeof refreshToken !== "string") return false;
  const pair = ensureKeypair();
  try {
    const decoded = jwt.verify(refreshToken, pair.publicKeyPem, {
      algorithms: ["RS256"],
      ignoreExpiration: true,
    }) as any;
    if (decoded?.jti) {
      revokedRefreshJtis.add(decoded.jti);
      const list = Array.from(revokedRefreshJtis).slice(-500);
      saveVaultKv(KV_REVOKED_REFRESH_KEY, list);
      return true;
    }
  } catch {
    // ignore malformed token on logout
  }
  return false;
}

export function verifySsoOrPortalAccessToken(
  token: string,
  portalJwtSecret: string,
  users: any[],
  getSafeUserFn: (u: any) => any
): { valid: true; claims: any; user: any } | { valid: false; error: string } {
  const pair = ensureKeypair();
  let decoded: any = null;

  // 1. Try RS256 SSO token first
  try {
    decoded = jwt.verify(token, pair.publicKeyPem, { algorithms: ["RS256"] });
    if (decoded?.token_use === "refresh") {
      return { valid: false, error: "Refresh tokens kunnen niet als access_token worden gebruikt." };
    }
  } catch (_rsErr) {
    // 2. Fallback to HS256 Portal session token
    try {
      decoded = jwt.verify(token, portalJwtSecret);
    } catch (hsErr: any) {
      return { valid: false, error: hsErr?.message || "Token ongeldig of verlopen." };
    }
  }

  const lookupId = String(decoded?.sub || decoded?.id || "");
  const user = users.find(
    (u: any) => String(u.id) === lookupId || (decoded?.username && u.username === decoded.username)
  );
  if (!user) {
    return { valid: false, error: "Gebruiker niet gevonden." };
  }

  const isPrivileged = user.role === "admin" || user.role === "key-user" || user.role === "voorzitter";
  if (user.portalApproved === false && !isPrivileged) {
    return { valid: false, error: "Account wacht nog op goedkeuring." };
  }

  const safeUser = getSafeUserFn(user);
  const claims = buildUserSsoClaims(user, safeUser);
  return {
    valid: true,
    user: safeUser,
    claims: {
      ...claims,
      iss: decoded?.iss || getIssuerBaseUrl(),
      aud: decoded?.aud || "osl-dataproduct",
      exp: decoded?.exp,
      iat: decoded?.iat,
    },
  };
}
