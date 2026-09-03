import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Server,
  RefreshCw,
  GitBranch,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Cpu,
  Clock,
  Sparkles,
  ArrowDownCircle,
  Copy,
  Check,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SystemStatus {
  isGitRepo: boolean;
  branch: string;
  hasRemote: boolean;
  currentCommit: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
  environment: string;
  nodeVersion: string;
  platform: string;
  uptimeSeconds: number;
  memoryUsage: {
    rss: string;
    heapUsed: string;
    heapTotal: string;
  };
  lastCacheCleared: string | null;
  lastSystemSync: string | null;
}

interface PendingCommit {
  hash: string;
  message: string;
  author: string;
  time: string;
}

interface CheckUpdatesResult {
  success: boolean;
  isGitRepo: boolean;
  branch?: string;
  updatesAvailable: boolean;
  behindCount: number;
  pendingCommits: PendingCommit[];
  message: string;
}

interface SystemManagerProps {
  token: string | null;
}

export const SystemManager: React.FC<SystemManagerProps> = ({ token }) => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [checkingUpdates, setCheckingUpdates] = useState<boolean>(false);
  const [updateResult, setUpdateResult] = useState<CheckUpdatesResult | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [clearingCache, setClearingCache] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const fetchStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const res = await fetch("/api/admin/system/status", { headers });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Fout bij ophalen systeemstatus:", err);
    } finally {
      setLoadingStatus(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const appendLog = (line: string) => {
    setLogs((prev) => [...prev, line]);
  };

  // 1. Alleen cache legen
  const handleClearCache = async () => {
    try {
      setClearingCache(true);
      setFeedback(null);
      const res = await fetch("/api/admin/system/clear-cache", {
        method: "POST",
        headers,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: "success", message: data.message || "Cache succesvol gewist." });
        appendLog(`[${new Date().toLocaleTimeString()}] Server- en applicatiecache succesvol gewist.`);
        fetchStatus();
      } else {
        setFeedback({ type: "error", message: data.error || "Fout bij wissen van cache." });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Verbindingsfout bij wissen van cache.";
      setFeedback({ type: "error", message: errorMsg });
    } finally {
      setClearingCache(false);
    }
  };

  // 2. Controleren op GitHub updates
  const handleCheckUpdates = async () => {
    try {
      setCheckingUpdates(true);
      setFeedback(null);
      appendLog(`[${new Date().toLocaleTimeString()}] Controleren op wijzigingen in GitHub repository...`);

      const res = await fetch("/api/admin/system/check-updates", {
        method: "POST",
        headers,
      });
      const data: CheckUpdatesResult = await res.json();
      setUpdateResult(data);

      if (data.updatesAvailable) {
        setFeedback({
          type: "info",
          message: `Er zijn ${data.behindCount} nieuwe commit(s) gevonden op GitHub! Klik op 'Cache Legen & Direct Updaten' om deze direct te installeren.`,
        });
        appendLog(`[${new Date().toLocaleTimeString()}] ${data.behindCount} nieuwe commit(s) gedetecteerd op origin/${data.branch || "main"}.`);
      } else {
        setFeedback({
          type: "success",
          message: data.message || "De server is al helemaal up-to-date.",
        });
        appendLog(`[${new Date().toLocaleTimeString()}] Geen nieuwe wijzigingen. Server is up-to-date.`);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Fout bij controleren van GitHub.";
      setFeedback({ type: "error", message: errorMsg });
    } finally {
      setCheckingUpdates(false);
    }
  };

  // 3. Alles-in-één: Cache legen, Git pull, npm run build & herladen
  const handleFullSync = async (force = false) => {
    if (syncing) return;
    const confirmText = force
      ? "Wilt u geforceerd de repository updaten en de applicatie opnieuw bouwen?"
      : "Wilt u de servercache legen, de laatste GitHub-versie ophalen en de applicatie direct opnieuw bouwen?";

    if (!window.confirm(confirmText)) return;

    try {
      setSyncing(true);
      setFeedback(null);
      appendLog(`[${new Date().toLocaleTimeString()}] Start geautomatiseerde update- en bouwcyclus...`);

      const res = await fetch("/api/admin/system/full-sync", {
        method: "POST",
        headers,
        body: JSON.stringify({ force }),
      });
      const data = await res.json();

      if (data.logs && Array.isArray(data.logs)) {
        setLogs((prev) => [...prev, ...data.logs]);
      }

      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          message: data.message || "Update en her-build succesvol afgerond!",
        });
        setUpdateResult(null);
        fetchStatus();
      } else {
        setFeedback({
          type: "error",
          message: data.error || data.message || "Er is een waarschuwing of fout opgetreden tijdens de update.",
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Verbindingsfout tijdens update.";
      setFeedback({ type: "error", message: errorMsg });
      appendLog(`[${new Date().toLocaleTimeString()}] Fout: ${errorMsg}`);
    } finally {
      setSyncing(false);
    }
  };

  const formatUptime = (totalSeconds: number) => {
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}u ${minutes}m`;
    if (hours > 0) return `${hours}u ${minutes}m`;
    return `${minutes} minuten`;
  };

  const copyLogsToClipboard = () => {
    if (logs.length === 0) return;
    navigator.clipboard.writeText(logs.join("\n"));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Introductie & Hoofdactieknoppen */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border/60">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/30 mb-2">
              <Server className="w-3.5 h-3.5" />
              <span>Automatisch Serverbeheer</span>
            </div>
            <h2 className="text-2xl font-display text-foreground">Systeem, Cache & GitHub Updates</h2>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Voer met één klik onderhoud uit op uw server. Deze tool leegt de server- en bouwcache,
              controleert of er nieuwe commits op GitHub staan en bouwt de applicatie automatisch opnieuw via{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs font-mono">npm run build</code>.
            </p>
          </div>

          {/* Actieknoppen */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Hoofdknop: Alles-in-één automatische sync */}
            <Button
              type="button"
              onClick={() => handleFullSync(false)}
              disabled={syncing || checkingUpdates || clearingCache}
              className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm font-semibold text-xs uppercase tracking-wider h-11 px-5 gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "Bezig met updaten..." : "Cache Legen & Direct Updaten"}</span>
            </Button>

            {/* Controleer op updates */}
            <Button
              type="button"
              variant="outline"
              onClick={handleCheckUpdates}
              disabled={syncing || checkingUpdates || clearingCache}
              className="h-11 px-4 text-xs font-medium gap-2 border-border cursor-pointer"
            >
              <ArrowDownCircle className={`w-4 h-4 text-accent ${checkingUpdates ? "animate-bounce" : ""}`} />
              <span>{checkingUpdates ? "GitHub controleren..." : "Controleer op updates"}</span>
            </Button>

            {/* Alleen cache wissen */}
            <Button
              type="button"
              variant="outline"
              onClick={handleClearCache}
              disabled={syncing || checkingUpdates || clearingCache}
              className="h-11 px-3.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 border-border cursor-pointer"
              title="Leegt alleen tijdelijke bestanden en servercaches"
            >
              <Trash2 className={`w-4 h-4 ${clearingCache ? "animate-spin" : ""}`} />
              <span>{clearingCache ? "Wissen..." : "Alleen cache legen"}</span>
            </Button>
          </div>
        </div>

        {/* Feedback melding */}
        {feedback && (
          <div
            className={`mt-4 p-4 rounded-xl border flex items-start gap-3 text-sm transition-all ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : feedback.type === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
            }`}
          >
            {feedback.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />}
            {feedback.type === "error" && <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />}
            {feedback.type === "info" && <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />}
            <div className="flex-1 leading-relaxed">{feedback.message}</div>
          </div>
        )}

        {/* Status Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* 1. Git Status Card */}
          <div className="bg-muted/30 border border-border/80 rounded-xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <GitBranch className="w-4 h-4 text-accent" />
                <span>Git Versiebeheer</span>
              </div>
              {updateResult?.updatesAvailable ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {updateResult.behindCount} update(s) klaar
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Up-to-date
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Branch:</span>
                <span className="font-mono font-medium text-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                  {status?.branch || "main"}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Laatste commit:</span>
                <span className="font-mono font-medium text-accent">
                  {status?.currentCommit?.hash ? `#${status.currentCommit.hash}` : "—"}
                </span>
              </div>
              {status?.currentCommit?.message && (
                <div className="pt-1 text-[11px] text-muted-foreground line-clamp-2 border-t border-border/50">
                  &ldquo;{status.currentCommit.message}&rdquo;
                </div>
              )}
            </div>
          </div>

          {/* 2. Server Runtime Card */}
          <div className="bg-muted/30 border border-border/80 rounded-xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Cpu className="w-4 h-4 text-accent" />
                <span>Server Runtime</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                status?.environment === "production"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30"
              }`}>
                {status?.environment || "development"}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Node.js:</span>
                <span className="font-mono font-medium text-foreground">{status?.nodeVersion || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Geheugengebruik (RAM):</span>
                <span className="font-mono font-medium text-foreground">{status?.memoryUsage?.rss || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Uptime:</span>
                <span className="font-medium text-foreground">
                  {status?.uptimeSeconds ? formatUptime(status.uptimeSeconds) : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Onderhoud & Cache Status */}
          <div className="bg-muted/30 border border-border/80 rounded-xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="w-4 h-4 text-accent" />
                <span>Laatste Onderhoud</span>
              </div>
              <button
                type="button"
                onClick={fetchStatus}
                disabled={loadingStatus}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-xs flex items-center gap-1"
                title="Status verversen"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loadingStatus ? "animate-spin" : ""}`} />
                <span>Status</span>
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Laatst gesynchroniseerd:</span>
                <span className="font-medium text-foreground">
                  {status?.lastSystemSync ? new Date(status.lastSystemSync).toLocaleTimeString() : "Nog niet"}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Cache gewist op:</span>
                <span className="font-medium text-foreground">
                  {status?.lastCacheCleared ? new Date(status.lastCacheCleared).toLocaleTimeString() : "Nog niet"}
                </span>
              </div>
              <div className="pt-1 text-[11px] text-muted-foreground border-t border-border/50">
                {status?.isGitRepo ? "Live verbonden met Git repo." : "Draait in container preview."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lijst met wachtende commits indien updates beschikbaar */}
      {updateResult?.updatesAvailable && updateResult.pendingCommits?.length > 0 && (
        <div className="bg-card rounded-xl border border-amber-500/30 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Klaarstaande wijzigingen op GitHub ({updateResult.pendingCommits.length})</span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => handleFullSync(false)}
              disabled={syncing}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>Nu installeren & bouwen</span>
            </Button>
          </div>

          <div className="divide-y divide-border/60">
            {updateResult.pendingCommits.map((c, i) => (
              <div key={i} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <div className="font-medium text-foreground">{c.message}</div>
                  <div className="text-muted-foreground text-[11px]">
                    door {c.author} • {c.time}
                  </div>
                </div>
                <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded border border-border shrink-0 text-accent font-semibold">
                  #{c.hash}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Terminal / Uitvoer Logboek */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-accent" />
            <h3 className="font-display text-lg text-foreground">Systeem- en Uitvoerlogboek</h3>
            {syncing && (
              <span className="flex items-center gap-1 text-xs text-accent font-medium animate-pulse">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                Opdracht wordt uitgevoerd...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyLogsToClipboard}
                  className="h-8 text-xs gap-1.5 border-border cursor-pointer"
                >
                  {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLogs ? "Gekopieerd" : "Kopieer log"}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogs([])}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Log wissen
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Console venster */}
        <div className="bg-slate-950 text-slate-100 dark:bg-black dark:text-zinc-200 rounded-lg p-4 font-mono text-xs overflow-x-auto min-h-[140px] max-h-[360px] border border-slate-800 shadow-inner flex flex-col justify-between">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic py-6 text-center">
              Geen recente console-uitvoer. Klik op &apos;Cache Legen & Direct Updaten&apos; of &apos;Controleer op updates&apos; om live de voortgang te volgen.
            </div>
          ) : (
            <div className="space-y-1 whitespace-pre-wrap leading-relaxed">
              {logs.map((line, idx) => (
                <div
                  key={idx}
                  className={`${
                    line.includes("Fout") || line.includes("LET OP") || line.includes("WAARSCHUWING")
                      ? "text-amber-400"
                      : line.includes("SUCCES") || line.includes("succesvol") || line.includes("Voltooid")
                      ? "text-emerald-400 font-semibold"
                      : line.startsWith("[")
                      ? "text-slate-300"
                      : "text-slate-400 pl-4"
                  }`}
                >
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Uitleg over de werking */}
        <div className="text-xs text-muted-foreground bg-muted/40 p-3.5 rounded-lg border border-border/60 leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            💡 <strong>Hoe dit werkt:</strong> Deze knop voert geautomatiseerd de serverstappen uit:{" "}
            <code className="text-foreground font-mono font-semibold">git fetch</code> $\rightarrow${" "}
            <code className="text-foreground font-mono font-semibold">git pull</code> $\rightarrow${" "}
            <code className="text-foreground font-mono font-semibold">npm run build</code>. U hoeft hiervoor niet langer handmatig via SSH in te loggen.
          </span>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => handleFullSync(true)}
            disabled={syncing}
            className="text-[11px] text-muted-foreground hover:text-accent p-0 h-auto cursor-pointer self-start sm:self-auto"
          >
            Herbouw forceren
          </Button>
        </div>
      </div>
    </div>
  );
};
