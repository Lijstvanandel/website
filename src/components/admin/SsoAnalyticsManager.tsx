import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Database,
  RefreshCw,
  Trash2,
  UserX,
  UserCheck,
  ShieldCheck,
  Download,
  ExternalLink,
  Copy,
  Check,
  Code2,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeJson } from "@/lib/api";
import { toast } from "sonner";

type SsoActorStatus = "anonymous" | "non_member" | "member";
type SsoExportFormat = "csv" | "json" | "other";
type SsoTelemetryEventType =
  | "export_attempt"
  | "sso_prompt_opened"
  | "sso_login_completed"
  | "token_verified";

interface SsoClientAnalytics {
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

interface SsoDailyAnalytics {
  date: string;
  totalExports: number;
  anonymousExports: number;
  nonMemberExports: number;
  memberExports: number;
  ssoOpens: number;
  ssoLogins: number;
}

interface SsoTelemetryEvent {
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

interface SsoAnalyticsSummary {
  updatedAt: string;
  totals: {
    totalExportClicks: number;
    anonymousExportAttempts: number;
    nonMemberExportAttempts: number;
    memberExportAttempts: number;
    nonMemberOrAnonExportAttempts: number;
    csvAttempts: number;
    jsonAttempts: number;
    otherFormatAttempts: number;
    ssoScreenOpens: number;
    ssoScreenAnonOpens: number;
    ssoLoginsCompleted: number;
    ssoLoginsNonMember: number;
    ssoLoginsMember: number;
    verifyChecks: number;
  };
  clients: SsoClientAnalytics[];
  daily: SsoDailyAnalytics[];
  recentEvents: SsoTelemetryEvent[];
}

interface SsoAnalyticsManagerProps {
  token: string | null;
}

const SNIPPET_CODE = `// Voorbeeld in een gekoppeld dataproduct (bij klik op "Exporteer CSV" of "Exporteer JSON")
export function trackOslExportClick(format: "csv" | "json", accessToken?: string | null) {
  const payload = JSON.stringify({
    client_id: "vliegverkeer-radar", // bijv. bekendmakingen, fietsveiligheid, mobiliteit
    event_type: "export_attempt",
    format,
    access_token: accessToken || undefined,
    exported: Boolean(accessToken),
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("https://onafhankelijksteenwijkerland.nl/api/sso/telemetry", payload);
  } else {
    fetch("https://onafhankelijksteenwijkerland.nl/api/sso/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}`;

export const SsoAnalyticsManager: React.FC<SsoAnalyticsManagerProps> = ({ token }) => {
  const [data, setData] = useState<SsoAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetConfirming, setResetConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showIntegrationGuide, setShowIntegrationGuide] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchAnalytics = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await fetch("/api/admin/sso/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await safeJson<SsoAnalyticsSummary | null>(res, null);
        if (!res.ok || !json) {
          throw new Error("Kon SSO-exportstatistieken niet laden.");
        }
        setData(json);
      } catch (err: any) {
        toast.error(err?.message || "Laden van SSO-statistieken mislukt.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchAnalytics(false);
  }, [fetchAnalytics]);

  const handleReset = async () => {
    if (!token) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/sso/analytics/reset", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await safeJson<SsoAnalyticsSummary | null>(res, null);
      if (!res.ok || !json) {
        throw new Error("Resetten mislukt.");
      }
      setData(json);
      setResetConfirming(false);
      toast.success("SSO-exportstatistieken zijn gereset.");
    } catch (err: any) {
      toast.error(err?.message || "Kon statistieken niet resetten.");
    } finally {
      setResetting(false);
    }
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(SNIPPET_CODE);
      setCopiedSnippet(true);
      toast.success("Codefragment gekopieerd naar klembord.");
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      toast.error("Kopiëren mislukt.");
    }
  };

  const filteredEvents = useMemo(() => {
    if (!data?.recentEvents) return [];
    return data.recentEvents.filter((ev) => {
      if (clientFilter !== "all" && ev.clientId !== clientFilter) return false;
      if (statusFilter !== "all" && ev.actorStatus !== statusFilter) return false;
      return true;
    });
  }, [data, clientFilter, statusFilter]);

  const maxDailyTotal = useMemo(() => {
    if (!data?.daily) return 1;
    const peak = Math.max(1, ...data.daily.map((d) => Math.max(d.totalExports, d.ssoOpens)));
    return peak;
  }, [data]);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "Nog geen activiteit";
    try {
      return new Date(iso).toLocaleString("nl-NL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const renderStatusBadge = (status: SsoActorStatus) => {
    if (status === "anonymous") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
          <UserX className="w-3 h-3" />
          Anoniem
        </span>
      );
    }
    if (status === "non_member") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3" />
          Geen lid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
        <UserCheck className="w-3 h-3" />
        Actief lid
      </span>
    );
  };

  const renderEventTypeLabel = (type: SsoTelemetryEventType) => {
    switch (type) {
      case "export_attempt":
        return "Export-klik";
      case "sso_prompt_opened":
        return "SSO-scherm geopend";
      case "sso_login_completed":
        return "SSO-login afgerond";
      case "token_verified":
        return "Token gecontroleerd";
      default:
        return type;
    }
  };

  const totals = data?.totals;
  const totalExports = totals?.totalExportClicks || 0;
  const anonPct = totalExports > 0 ? Math.round(((totals?.anonymousExportAttempts || 0) / totalExports) * 100) : 0;
  const nonMemberPct =
    totalExports > 0 ? Math.round(((totals?.nonMemberExportAttempts || 0) / totalExports) * 100) : 0;
  const memberPct = totalExports > 0 ? Math.round(((totals?.memberExportAttempts || 0) / totalExports) * 100) : 0;

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <Database className="w-6 h-6 text-accent" />
            <h2 className="text-2xl font-display text-foreground">SSO &amp; Dataproduct Exports</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Inzicht in hoe vaak bezoekers per OSL-dataproduct op een exportknop drukken of het centrale SSO-inlogscherm openen — uitgesplitst naar anonieme bezoekers, ingelogde niet-leden en actieve partijleden.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowIntegrationGuide((prev) => !prev)}
            className="h-9 px-3 text-xs font-semibold gap-1.5"
          >
            <Code2 className="w-3.5 h-3.5 text-accent" />
            Dataproduct-koppeling
            {showIntegrationGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing || loading}
            className="h-9 px-3 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Vernieuwen
          </Button>

          {!resetConfirming ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResetConfirming(true)}
              className="h-9 px-3 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Resetten
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/30 rounded-lg px-2 py-1">
              <span className="text-[11px] font-semibold text-destructive px-1">Alles wissen?</span>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleReset}
                disabled={resetting}
                className="h-7 px-2.5 text-[11px]"
              >
                {resetting ? "Bezig..." : "Bevestigen"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setResetConfirming(false)}
                disabled={resetting}
                className="h-7 px-2 text-[11px]"
              >
                Annuleren
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Integration guide collapsible */}
      {showIntegrationGuide && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Hoe worden export-pogingen geregistreerd?
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                <strong>Automatisch:</strong> Zodra een bezoeker via SSO op <code className="px-1 py-0.5 rounded bg-muted">/authorize</code> uitkomt, een code omwisselt of <code className="px-1 py-0.5 rounded bg-muted">/api/auth/verify?action=export</code> aanroept, telt dat direct mee. Voeg optioneel onderstaande aanroep toe aan elk dataproduct om óók clicks te meten van bezoekers die nog vóór de SSO-redirect afhaken:
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopySnippet}
              className="shrink-0 h-8 px-3 text-xs gap-1.5"
            >
              {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSnippet ? "Gekopieerd" : "Kopieer snippet"}
            </Button>
          </div>
          <pre className="text-[11px] leading-relaxed bg-background/90 border border-border rounded-lg p-3 overflow-x-auto text-foreground font-mono">
            {SNIPPET_CODE}
          </pre>
          <p className="text-[11px] text-muted-foreground">
            Tip: geeft uw dataproduct <code className="px-1 py-0.5 rounded bg-muted">&amp;action=export&amp;format=csv</code> mee aan de <code className="px-1 py-0.5 rounded bg-muted">/authorize</code> URL? Dan telt ook elke directe export-redirect zonder extra JavaScript meteen als export-poging.
          </p>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          SSO-exportstatistieken laden...
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Geen gegevens beschikbaar.
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Totaal Export-pogingen</span>
                <Download className="w-4 h-4 text-accent" />
              </div>
              <div className="text-3xl font-display text-foreground">
                {totals?.totalExportClicks || 0}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                <span>CSV: <strong>{totals?.csvAttempts || 0}</strong></span>
                <span>•</span>
                <span>JSON: <strong>{totals?.jsonAttempts || 0}</strong></span>
                {(totals?.otherFormatAttempts || 0) > 0 && (
                  <>
                    <span>•</span>
                    <span>Overig: <strong>{totals?.otherFormatAttempts}</strong></span>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-rose-700 dark:text-rose-300">
                <span>Anoniem (niet ingelogd)</span>
                <UserX className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-3xl font-display text-foreground">
                {totals?.anonymousExportAttempts || 0}
              </div>
              <div className="text-[11px] text-muted-foreground">
                <strong>{anonPct}%</strong> van export-klikken •{" "}
                <strong>{totals?.ssoScreenAnonOpens || 0}x</strong> anoniem SSO-scherm geopend
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-300">
                <span>Ingelogd, geen lid</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-3xl font-display text-foreground">
                {totals?.nonMemberExportAttempts || 0}
              </div>
              <div className="text-[11px] text-muted-foreground">
                <strong>{nonMemberPct}%</strong> van export-klikken •{" "}
                <strong>{totals?.ssoLoginsNonMember || 0}</strong> SSO-logins zonder actief lidmaatschap
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span>Actieve partijleden</span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-display text-foreground">
                {totals?.memberExportAttempts || 0}
              </div>
              <div className="text-[11px] text-muted-foreground">
                <strong>{memberPct}%</strong> van export-klikken •{" "}
                <strong>{totals?.ssoLoginsMember || 0}</strong> SSO-logins door leden
              </div>
            </div>
          </div>

          {/* 30-day trend */}
          <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold text-foreground">Export-pogingen laatste 30 dagen</h3>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Anoniem
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Geen lid
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Actief lid
                </span>
              </div>
            </div>

            <div className="h-28 flex items-end gap-1 pt-2">
              {data.daily.map((day) => {
                const anonH = Math.round((day.anonymousExports / maxDailyTotal) * 100);
                const nonMemH = Math.round((day.nonMemberExports / maxDailyTotal) * 100);
                const memH = Math.round((day.memberExports / maxDailyTotal) * 100);
                const hasAny = day.totalExports > 0;
                return (
                  <div
                    key={day.date}
                    className="flex-1 h-full flex flex-col justify-end group relative"
                    title={`${day.date}: ${day.totalExports} exports (Anoniem: ${day.anonymousExports}, Geen lid: ${day.nonMemberExports}, Lid: ${day.memberExports}, SSO-scherm: ${day.ssoOpens})`}
                  >
                    <div className="w-full flex flex-col justify-end rounded-t overflow-hidden bg-muted/40 min-h-[3px]">
                      {hasAny ? (
                        <>
                          {day.memberExports > 0 && (
                            <div
                              style={{ height: `${Math.max(4, memH)}px` }}
                              className="w-full bg-emerald-500"
                            />
                          )}
                          {day.nonMemberExports > 0 && (
                            <div
                              style={{ height: `${Math.max(4, nonMemH)}px` }}
                              className="w-full bg-amber-500"
                            />
                          )}
                          {day.anonymousExports > 0 && (
                            <div
                              style={{ height: `${Math.max(4, anonH)}px` }}
                              className="w-full bg-rose-500"
                            />
                          )}
                        </>
                      ) : (
                        <div className="w-full h-[3px] bg-border/60" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{data.daily[0]?.date}</span>
              <span>Vandaag ({data.daily[data.daily.length - 1]?.date})</span>
            </div>
          </div>

          {/* Per-dataproduct breakdown table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Overzicht per Dataproduct</h3>
              <span className="text-[11px] text-muted-foreground">
                Laatst bijgewerkt: {formatDateTime(data.updatedAt)}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-semibold">Dataproduct</th>
                    <th className="py-3 px-3 font-semibold text-right">Exports Totaal</th>
                    <th className="py-3 px-3 font-semibold text-right text-rose-600 dark:text-rose-400">Anoniem</th>
                    <th className="py-3 px-3 font-semibold text-right text-amber-600 dark:text-amber-400">Geen lid</th>
                    <th className="py-3 px-3 font-semibold text-right text-emerald-600 dark:text-emerald-400">Actief lid</th>
                    <th className="py-3 px-3 font-semibold text-center">CSV / JSON</th>
                    <th className="py-3 px-3 font-semibold text-right">SSO-scherm (anoniem)</th>
                    <th className="py-3 px-3 font-semibold text-right">SSO-logins</th>
                    <th className="py-3 px-4 font-semibold text-right">Laatste activiteit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {data.clients.map((client) => (
                    <tr key={client.clientId} className="hover:bg-muted/25 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{client.name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <code className="px-1 py-0.2 rounded bg-muted text-[10px]">{client.clientId}</code>
                          {client.lastOrigin && (
                            <span className="inline-flex items-center gap-0.5">
                              <ExternalLink className="w-2.5 h-2.5" />
                              {client.lastOrigin}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-foreground text-sm">
                        {client.totalExportClicks}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                        {client.anonymousExportAttempts}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                        {client.nonMemberExportAttempts}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {client.memberExportAttempts}
                      </td>
                      <td className="py-3 px-3 text-center text-muted-foreground">
                        {client.csvAttempts} / {client.jsonAttempts}
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        <span className="font-semibold text-foreground">{client.ssoScreenOpens}</span>{" "}
                        <span className="text-[11px]">({client.ssoScreenAnonOpens} anon)</span>
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        <span className="font-semibold text-foreground">{client.ssoLoginsCompleted}</span>
                        {client.ssoLoginsCompleted > 0 && (
                          <span className="text-[10px] ml-1">
                            ({client.ssoLoginsMember} lid / {client.ssoLoginsNonMember} geen)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatDateTime(client.lastActivityAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Events Feed */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                <h3 className="text-base font-bold text-foreground">
                  Recente Export- &amp; SSO-pogingen ({filteredEvents.length})
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Filter className="w-3.5 h-3.5" />
                </div>
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground"
                >
                  <option value="all">Alle dataproducten</option>
                  {data.clients.map((c) => (
                    <option key={c.clientId} value={c.clientId}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground"
                >
                  <option value="all">Alle statussen</option>
                  <option value="anonymous">Alleen anoniem</option>
                  <option value="non_member">Alleen geen lid</option>
                  <option value="member">Alleen actieve leden</option>
                </select>
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                Nog geen export- of SSO-pogingen geregistreerd voor deze filterselectie.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Tijdstip</th>
                      <th className="py-2.5 px-3 font-semibold">Dataproduct</th>
                      <th className="py-2.5 px-3 font-semibold">Actie</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Formaat</th>
                      <th className="py-2.5 px-4 font-semibold">Gebruiker / Toelichting</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredEvents.slice(0, 60).map((ev) => (
                      <tr key={ev.id} className="hover:bg-muted/20">
                        <td className="py-2 px-4 whitespace-nowrap text-[11px] text-muted-foreground">
                          {formatDateTime(ev.timestamp)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-medium text-foreground">{ev.clientName}</div>
                          {ev.originHost && (
                            <div className="text-[10px] text-muted-foreground">{ev.originHost}</div>
                          )}
                        </td>
                        <td className="py-2 px-3 font-medium text-foreground">
                          {renderEventTypeLabel(ev.eventType)}
                        </td>
                        <td className="py-2 px-3">{renderStatusBadge(ev.actorStatus)}</td>
                        <td className="py-2 px-3 uppercase font-mono text-[11px] text-muted-foreground">
                          {ev.format === "other" ? "-" : ev.format}
                        </td>
                        <td className="py-2 px-4 text-[11px] text-muted-foreground">
                          <span className="text-foreground font-medium">{ev.userLabel}</span>
                          {ev.note && <span className="block text-[10px]">{ev.note}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
