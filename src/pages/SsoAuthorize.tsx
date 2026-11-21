import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Database,
  UserCheck,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { safeJson } from "@/lib/api";

interface ClientInfo {
  clientId: string;
  name: string;
  description: string;
  firstParty: boolean;
  allowed: boolean;
  error?: string;
}

export default function SsoAuthorize() {
  const [searchParams] = useSearchParams();
  const { user, token, isAuthenticated, loading: authLoading, login, logout } = useAuth();

  const clientId = searchParams.get("client_id") || "osl-dataproduct";
  const redirectUri = searchParams.get("redirect_uri") || "";
  const state = searchParams.get("state") || "";
  const codeChallenge = searchParams.get("code_challenge") || "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") || (codeChallenge ? "S256" : "");
  const scope = searchParams.get("scope") || "openid profile email export:csv export:json";
  const responseMode = (searchParams.get("response_mode") || "query").toLowerCase();
  const prompt = (searchParams.get("prompt") || "").toLowerCase();
  const nonce = searchParams.get("nonce") || "";
  const actionParam = (searchParams.get("action") || "").toLowerCase();
  const formatParam = (searchParams.get("format") || "").toLowerCase();

  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [clientCheckLoading, setClientCheckLoading] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);

  const [username, setUsername] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("saved_username") || "" : ""
  );
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingApprovalMsg, setPendingApprovalMsg] = useState<string | null>(null);
  const [authorizingSession, setAuthorizingSession] = useState(false);
  const [completedPopup, setCompletedPopup] = useState(false);
  const [forceLoginPrompt, setForceLoginPrompt] = useState(prompt === "login");

  const autoAttemptedRef = useRef(false);
  const promptLoggedRef = useRef(false);

  const currentAuthorizeUrl = useMemo(() => {
    const qs = searchParams.toString();
    return `/authorize${qs ? `?${qs}` : ""}`;
  }, [searchParams]);

  // 1. Validate client_id and redirect_uri against server allowlist
  useEffect(() => {
    let mounted = true;
    setClientCheckLoading(true);
    setClientError(null);

    if (!redirectUri) {
      setClientError("Ontbrekende parameter 'redirect_uri'. Het gekoppelde dashboard moet een geldige terugkeer-URL meegeven.");
      setClientCheckLoading(false);
      return;
    }

    const qs = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
    });

    fetch(`/api/sso/client-info?${qs.toString()}`)
      .then(async (res) => {
        const data = await safeJson(res, {});
        if (!mounted) return;
        if (!res.ok || !data?.allowed) {
          setClientError(data?.error || "Deze toepassing of redirect_uri staat niet op de vertrouwde domeinlijst.");
        } else {
          setClientInfo(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setClientError("Kon de aanvraaggegevens niet verifiëren bij de centrale server.");
        }
      })
      .finally(() => {
        if (mounted) setClientCheckLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [clientId, redirectUri]);

  // Complete the authorization code return (popup postMessage or full redirect)
  const completeCallback = useCallback(
    (code: string, redirectTo: string) => {
      if (responseMode === "web_message" && typeof window !== "undefined" && window.opener) {
        try {
          const targetOrigin = new URL(redirectUri).origin;
          window.opener.postMessage(
            {
              type: "osl-sso-callback",
              code,
              state,
              iss: window.location.origin,
            },
            targetOrigin
          );
          setCompletedPopup(true);
          setTimeout(() => {
            try {
              window.close();
            } catch {
              // ignore if browser blocks window.close
            }
          }, 250);
          return;
        } catch {
          // fallback to redirect below
        }
      }
      window.location.replace(redirectTo);
    },
    [redirectUri, responseMode, state]
  );

  // Issue authorization code for currently authenticated user
  const issueAuthorizationCode = useCallback(
    async (activeToken: string) => {
      setAuthorizingSession(true);
      setFormError(null);
      try {
        const res = await fetch("/api/sso/authorize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify({
            client_id: clientId,
            redirect_uri: redirectUri,
            state,
            code_challenge: codeChallenge || undefined,
            code_challenge_method: codeChallengeMethod || undefined,
            scope,
            nonce: nonce || undefined,
          }),
        });

        const data = await safeJson(res, {});

        if (res.status === 401) {
          // Existing stored session expired -> ask user to sign in cleanly
          logout();
          setForceLoginPrompt(true);
          setAuthorizingSession(false);
          return;
        }

        if (!res.ok || !data?.code || !data?.redirectTo) {
          throw new Error(data?.error || "Autorisatiecode aanmaken mislukt.");
        }

        completeCallback(data.code, data.redirectTo);
      } catch (err: any) {
        setFormError(err?.message || "Kon geen verbinding maken met het dashboard.");
        setAuthorizingSession(false);
      }
    },
    [clientId, redirectUri, state, codeChallenge, codeChallengeMethod, scope, nonce, completeCallback, logout]
  );

  // Log SSO prompt open (tracks anonymous/non-member visits even if user closes popup)
  useEffect(() => {
    if (
      authLoading ||
      clientCheckLoading ||
      clientError ||
      !clientInfo?.allowed ||
      promptLoggedRef.current
    ) {
      return;
    }

    promptLoggedRef.current = true;
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (isAuthenticated && token) {
      reqHeaders.Authorization = `Bearer ${token}`;
    }

    fetch("/api/sso/prompt-opened", {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope,
        action: actionParam || undefined,
        format: formatParam || undefined,
      }),
    }).catch(() => {
      // telemetrie mag nooit het inlogscherm verstoren
    });
  }, [
    authLoading,
    clientCheckLoading,
    clientError,
    clientInfo,
    isAuthenticated,
    token,
    clientId,
    redirectUri,
    scope,
    actionParam,
    formatParam,
  ]);

  // Auto-authorize existing logged-in OSL sessions seamlessly
  useEffect(() => {
    if (
      authLoading ||
      clientCheckLoading ||
      clientError ||
      !clientInfo?.allowed ||
      forceLoginPrompt ||
      autoAttemptedRef.current
    ) {
      return;
    }

    if (isAuthenticated && token) {
      autoAttemptedRef.current = true;
      issueAuthorizationCode(token);
    }
  }, [
    authLoading,
    clientCheckLoading,
    clientError,
    clientInfo,
    forceLoginPrompt,
    isAuthenticated,
    token,
    issueAuthorizationCode,
  ]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setFormError("Vul uw gebruikersnaam/e-mailadres en wachtwoord in.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setPendingApprovalMsg(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          rememberMe,
        }),
      });

      const result = await safeJson(response, {});

      if (!response.ok) {
        if (response.status === 403 && result.pendingApproval) {
          setPendingApprovalMsg(result.error || "Uw account wacht nog op goedkeuring van een beheerder.");
          return;
        }
        throw new Error(result.error || "Ongeldige inloggegevens.");
      }

      if (rememberMe) {
        localStorage.setItem("saved_username", username.trim());
      } else {
        localStorage.removeItem("saved_username");
      }

      login(result.user, result.token, rememberMe);
      await issueAuthorizationCode(result.token);
    } catch (err: any) {
      setFormError(err?.message || "Inloggen mislukt.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (responseMode === "web_message" && typeof window !== "undefined" && window.opener) {
      try {
        const targetOrigin = new URL(redirectUri).origin;
        window.opener.postMessage(
          {
            type: "osl-sso-callback",
            error: "access_denied",
            state,
          },
          targetOrigin
        );
        window.close();
        return;
      } catch {
        // ignore
      }
    }

    if (redirectUri && clientInfo?.allowed) {
      try {
        const url = new URL(redirectUri);
        url.searchParams.set("error", "access_denied");
        if (state) url.searchParams.set("state", state);
        window.location.replace(url.toString());
        return;
      } catch {
        // ignore
      }
    }
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen stadium-bg flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-card border border-accent/25 rounded-xl shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-5 border-b border-border/80 bg-twente-black/80 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/assets/osl-logo-light.webp?v=osl4"
              alt="OSL logo"
              className="block dark:hidden h-8 w-auto object-contain"
            />
            <img
              src="/assets/osl-logo-dark.webp?v=osl4"
              alt="OSL logo"
              className="hidden dark:block h-8 w-auto object-contain"
            />
            <div className="leading-tight">
              <div className="font-display text-base tracking-wide text-foreground">
                Centrale OSL Login
              </div>
              <div className="text-[10px] uppercase tracking-widest text-accent font-semibold">
                onafhankelijksteenwijkerland.nl
              </div>
            </div>
          </Link>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/20 border border-primary/40 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 dark:text-emerald-300 text-primary">
            <ShieldCheck className="w-3 h-3" />
            SSO
          </span>
        </div>

        <div className="p-6 sm:p-7">
          {clientCheckLoading || authLoading ? (
            <div className="py-10 flex flex-col items-center justify-center text-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <p className="text-sm text-muted-foreground">Aanvraag en sessie controleren...</p>
            </div>
          ) : clientError ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/40 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-sm text-foreground">Ongeldige aanvraag</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{clientError}</p>
                </div>
              </div>
              <Link to="/" className="block">
                <Button variant="outline" className="w-full">
                  Terug naar onafhankelijksteenwijkerland.nl
                </Button>
              </Link>
            </div>
          ) : completedPopup ? (
            <div className="py-8 flex flex-col items-center text-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <h2 className="font-display text-2xl text-foreground">Ingelogd!</h2>
              <p className="text-sm text-muted-foreground">
                De autorisatie is verstuurd naar <strong>{clientInfo?.name}</strong>. Dit venster kan nu gesloten worden.
              </p>
              <Button onClick={() => window.close()} className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                Venster sluiten
              </Button>
            </div>
          ) : authorizingSession ? (
            <div className="py-10 flex flex-col items-center justify-center text-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <div className="font-semibold text-sm text-foreground">
                Ingelogd als {user?.fullName || user?.username}
              </div>
              <p className="text-xs text-muted-foreground">
                U wordt automatisch teruggestuurd naar <strong>{clientInfo?.name}</strong>...
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Target Dashboard Card */}
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border/90 space-y-2">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-accent">
                  Toegang gevraagd door
                </div>
                <div className="font-semibold text-sm text-foreground">{clientInfo?.name}</div>
                {clientInfo?.description && (
                  <p className="text-xs text-muted-foreground leading-snug">{clientInfo.description}</p>
                )}
                <div className="pt-1.5 border-t border-border/60 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-accent" />
                    Naam &amp; e-mailadres
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Database className="w-3.5 h-3.5 text-accent" />
                    Dataset-export (.CSV / .JSON)
                  </span>
                </div>
              </div>

              {/* If prompt=login was explicitly passed while already authenticated, allow quick switch */}
              {isAuthenticated && user && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between gap-2 text-xs">
                  <div className="truncate">
                    Huidige sessie: <strong>{user.fullName || user.username}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => token && issueAuthorizationCode(token)}
                      className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Doorgaan
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={logout}
                      className="h-7 px-2 text-xs text-muted-foreground"
                      title="Uitloggen"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {pendingApprovalMsg && (
                <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/40 text-xs text-foreground">
                  {pendingApprovalMsg}
                </div>
              )}

              {formError && (
                <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/40 text-xs text-destructive flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="sso-username" className="text-xs font-medium text-foreground">
                    Gebruikersnaam of e-mailadres
                  </label>
                  <Input
                    id="sso-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="naam@voorbeeld.nl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="sso-password" className="text-xs font-medium text-foreground">
                      Wachtwoord
                    </label>
                    <Link to="/login" className="text-[11px] text-accent hover:underline">
                      Wachtwoord vergeten?
                    </Link>
                  </div>
                  <Input
                    id="sso-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sso-remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                  />
                  <label htmlFor="sso-remember" className="text-xs text-muted-foreground cursor-pointer select-none">
                    Ingelogd blijven voor alle OSL-dataproducten
                  </label>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={submitting}
                    className="flex-1"
                  >
                    Annuleren
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-[1.5] bg-primary hover:bg-primary/90 text-primary-foreground border border-accent/40 font-semibold"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Bezig...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Inloggen &amp; Doorgaan
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>

              <div className="pt-3 border-t border-border/70 text-center text-xs text-muted-foreground">
                Nog geen centraal OSL-account?{" "}
                <Link
                  to={`/registreren?redirect=${encodeURIComponent(currentAuthorizeUrl)}`}
                  className="text-accent font-semibold hover:underline"
                >
                  Eenmalig registreren
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
