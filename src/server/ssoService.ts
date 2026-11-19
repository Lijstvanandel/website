import crypto from "crypto";
import jwt from "jsonwebtoken";
import { loadVaultKv, saveVaultKv } from "./vaultDatabase.js";

const KV_RSA_KEY = "sso_rsa_keypair_v1";
const KV_REVOKED_REFRESH_KEY = "sso_revoked_refresh_v1";

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

let cachedKeypair: StoredRsaKeypair | null = null;
const authCodeStore = new Map<string, AuthorizationCodeEntry>();
const revokedRefreshJtis = new Set<string>();

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
