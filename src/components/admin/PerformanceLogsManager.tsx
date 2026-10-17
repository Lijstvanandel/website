import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Activity,
  Download,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  Filter,
  Globe,
  Laptop,
  Smartphone,
  Tablet,
  FileJson,
  Layers,
  WifiOff,
  ServerCrash,
  ChevronDown,
  ChevronUp,
  Eye,
  Check,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ComponentTiming {
  name: string;
  durationMs: number;
}

interface ErrorDetail {
  url: string;
  status?: number;
  statusText?: string;
  durationMs?: number;
  errorMessage?: string;
}

export interface PerformanceLogItem {
  id: string;
  timestamp: string;
  visitorId: string;
  sessionId?: string;
  navigationType: "initial_load" | "route_change" | "reload";
  path: string;
  fromPath?: string;
  pageTitle?: string;
  pageLoadDurationMs: number;
  fetchDurationMs: number;
  renderDurationMs: number;
  ttfbMs?: number;
  domInteractiveMs?: number;
  domContentLoadedMs?: number;
  componentsBuilt?: ComponentTiming[];
  fetchCallsCount: number;
  failedFetchCount: number;
  hasBadGateway: boolean;
  hasServerError: boolean;
  hasFetchError: boolean;
  status: "success" | "warning" | "error" | "bad_gateway";
  httpStatusCode?: number;
  errorDetails?: ErrorDetail[];
  deviceType?: "desktop" | "mobile" | "tablet";
  browser?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  ip?: string;
  userAgent?: string;
}

interface PerformanceStats {
  totalLogs: number;
  uniqueVisitors: number;
  avgLoadTimeMs: number;
  avgFetchDurationMs: number;
  avgRenderDurationMs: number;
  badGatewayCount: number;
  serverErrorCount: number;
  fetchErrorCount: number;
  recentSlowestRoutes: { path: string; avgLoadTimeMs: number; count: number }[];
}

export const PerformanceLogsManager: React.FC = () => {
  const { token } = useAuth();

  const [logs, setLogs] = useState<PerformanceLogItem[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // all, errors, success, bad_gateway
  const [navTypeFilter, setNavTypeFilter] = useState<string>("all"); // all, route_change, initial_load
  const [selectedVisitor, setSelectedVisitor] = useState<string>("all");

  // Expanded log row
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 25;

  const fetchLogs = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let url = "/api/admin/performance-logs?limit=1000";
      if (statusFilter === "bad_gateway") url += "&status=bad_gateway";
      else if (statusFilter === "errors") url += "&hasErrorsOnly=true";
      else if (statusFilter === "success") url += "&status=success";

      if (selectedVisitor !== "all") url += `&visitorId=${encodeURIComponent(selectedVisitor)}`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Fout bij ophalen van prestatielogs");

      const data = await res.json();
      setLogs(data.logs || []);
      setStats(data.stats || null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Fout bij ophalen logs");
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter, selectedVisitor]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  // Extract unique visitors for filter dropdown
  const uniqueVisitorsList = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of logs) {
      if (log.visitorId) {
        map.set(log.visitorId, (map.get(log.visitorId) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([visitorId, count]) => ({ visitorId, count }))
      .sort((a, b) => b.count - a.count);
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Navigation type filter
      if (navTypeFilter !== "all" && log.navigationType !== navTypeFilter) {
        return false;
      }

      // Visitor filter
      if (selectedVisitor !== "all" && log.visitorId !== selectedVisitor) {
        return false;
      }

      // Search query (path, visitor ID, error message, title)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPath = log.path?.toLowerCase().includes(q);
        const matchesFrom = log.fromPath?.toLowerCase().includes(q);
        const matchesVisitor = log.visitorId?.toLowerCase().includes(q);
        const matchesTitle = log.pageTitle?.toLowerCase().includes(q);
        const matchesErrors = (log.errorDetails || []).some(
          (e) => e.url?.toLowerCase().includes(q) || e.errorMessage?.toLowerCase().includes(q)
        );

        if (!matchesPath && !matchesFrom && !matchesVisitor && !matchesTitle && !matchesErrors) {
          return false;
        }
      }

      return true;
    });
  }, [logs, navTypeFilter, selectedVisitor, searchQuery]);

  // Paginated logs
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // Export handlers
  const handleExport = async (format: "csv" | "json") => {
    setIsExporting(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/performance-logs/export?format=${format}`, { headers });
      if (!res.ok) throw new Error("Export mislukt");

      const blob = await res.blob();
      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `bezoekers_laadtijden_logs_${dateStr}.${format}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Logs succesvol geëxporteerd als ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || "Fout bij exporteren");
    } finally {
      setIsExporting(false);
    }
  };

  // Clear logs handler
  const handleClearLogs = async () => {
    if (!window.confirm("Weet u zeker dat u alle opgeslagen prestatie- en laadtijdenlogs wilt wissen?")) {
      return;
    }

    setIsClearing(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/performance-logs", {
        method: "DELETE",
        headers,
      });

      if (!res.ok) throw new Error("Fout bij wissen van logs");
      toast.success("Alle prestatielogs zijn succesvol gewist.");
      fetchLogs();
    } catch (err: any) {
      toast.error(err.message || "Fout bij wissen");
    } finally {
      setIsClearing(false);
    }
  };

  const getLoadTimeBadge = (ms: number) => {
    if (ms < 500) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
          <Zap className="w-3 h-3" />
          {ms} ms
        </span>
      );
    }
    if (ms < 1500) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
          <Clock className="w-3 h-3" />
          {ms} ms
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
        <AlertTriangle className="w-3 h-3" />
        {ms} ms
      </span>
    );
  };

  const getStatusBadge = (log: PerformanceLogItem) => {
    if (log.hasBadGateway || log.status === "bad_gateway") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white shadow-xs animate-pulse">
          <ServerCrash className="w-3 h-3" />
          502 Bad Gateway
        </span>
      );
    }
    if (log.hasFetchError) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
          <WifiOff className="w-3 h-3" />
          Fetch Mislukt
        </span>
      );
    }
    if (log.hasServerError || log.status === "error") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3" />
          {log.httpStatusCode || 500} Fout
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        200 OK
      </span>
    );
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("nl-NL", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Bezoekers Laadtijden &amp; Diagnostiek</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Exacte monitoring van laadtijden per bezoeker, paginawissels (SPA), fetch-duur, componentopbouw en 502 Bad Gateways.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`h-9 text-xs gap-1.5 ${autoRefresh ? "bg-accent/15 text-accent border-accent/40 font-semibold" : ""}`}
            title="Schakel automatische 10s live verversing in of uit"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Live (10s)" : "Auto-verversen"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            className="h-9 text-xs gap-1.5"
            title="Herlaad prestatielogs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Verversen
          </Button>

          {/* Export CSV knop */}
          <Button
            type="button"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={isExporting || logs.length === 0}
            className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            title="Download alle gelogde laadtijden en fouten als Excel-compatible CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Exporteer CSV
          </Button>

          {/* Export JSON knop */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleExport("json")}
            disabled={isExporting || logs.length === 0}
            className="h-9 text-xs gap-1.5"
            title="Download volledige logs als JSON"
          >
            <FileJson className="w-3.5 h-3.5" />
            JSON
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearLogs}
            disabled={isClearing || logs.length === 0}
            className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Wis alle opgeslagen logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Wissen
          </Button>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Gemiddelde Laadtijd</span>
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-display tracking-tight text-foreground">
                {stats.avgLoadTimeMs} <span className="text-sm font-normal text-muted-foreground">ms</span>
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  stats.avgLoadTimeMs < 600
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : stats.avgLoadTimeMs < 1200
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                }`}
              >
                {stats.avgLoadTimeMs < 600 ? "Snel" : stats.avgLoadTimeMs < 1200 ? "Gemiddeld" : "Aandacht nodig"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Gemeten over {stats.totalLogs} pagina- en componentopbouwen
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Unieke Bezoekers</span>
              <Globe className="w-4 h-4 text-accent" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-display tracking-tight text-foreground">
                {stats.uniqueVisitors}
              </span>
              <span className="text-xs text-muted-foreground">actieve apparaten</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Elke bezoeker heeft een anonieme unieke identifier
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Bad Gateways &amp; Fouten</span>
              <ServerCrash
                className={`w-4 h-4 ${
                  stats.badGatewayCount > 0 ? "text-rose-600 animate-bounce" : "text-emerald-500"
                }`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold font-display tracking-tight ${
                  stats.badGatewayCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                }`}
              >
                {stats.badGatewayCount}
              </span>
              <span className="text-xs text-muted-foreground">502 Bad Gateway(s)</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {stats.fetchErrorCount + stats.serverErrorCount > 0
                ? `${stats.fetchErrorCount + stats.serverErrorCount} overige fetch-fouten geregistreerd`
                : "Geen server-side gateway crashes"}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Onderdelen &amp; Fetch</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-display tracking-tight text-foreground">
                {stats.avgFetchDurationMs} <span className="text-sm font-normal text-muted-foreground">ms</span>
              </span>
              <span className="text-xs text-muted-foreground">API wachttijd</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Component render: gemiddeld {stats.avgRenderDurationMs} ms
            </p>
          </div>
        </div>
      )}

      {/* Traagste pagina's waarschuwing / inzicht */}
      {stats && stats.recentSlowestRoutes && stats.recentSlowestRoutes.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-muted/20 text-xs">
          <div className="flex items-center gap-2 font-semibold text-foreground mb-2">
            <Activity className="w-3.5 h-3.5 text-accent" />
            <span>Overzicht van laadtijden per specifieke route:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.recentSlowestRoutes.map((r, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border text-foreground font-mono text-[11px]"
              >
                <span className="font-sans font-semibold text-muted-foreground">{r.path}</span>
                <span className="text-accent font-bold">{r.avgLoadTimeMs} ms</span>
                <span className="text-[10px] text-muted-foreground">({r.count}x)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Zoek op paginapad, bezoeker ID (vis_...), of foutmelding..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">Alle Statussen</option>
              <option value="bad_gateway">Alleen 502 Bad Gateways</option>
              <option value="errors">Alle Fouten (502, 500, Failed)</option>
              <option value="success">Alleen Succesvol (200)</option>
            </select>

            {/* Navigation Type Filter */}
            <select
              value={navTypeFilter}
              onChange={(e) => {
                setNavTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">Alle Navigaties</option>
              <option value="route_change">Routewissels (SPA overgangen)</option>
              <option value="initial_load">Eerste Paginalaadbeurt</option>
            </select>

            {/* Visitor filter */}
            <select
              value={selectedVisitor}
              onChange={(e) => {
                setSelectedVisitor(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent max-w-[200px]"
            >
              <option value="all">Alle Bezoekers ({uniqueVisitorsList.length})</option>
              {uniqueVisitorsList.map((v) => (
                <option key={v.visitorId} value={v.visitorId}>
                  {v.visitorId} ({v.count} pagina's)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span>
            Getoond: <strong className="text-foreground">{filteredLogs.length}</strong> van{" "}
            {logs.length} gelogde laadmomenten
          </span>
          {selectedVisitor !== "all" && (
            <button
              onClick={() => setSelectedVisitor("all")}
              className="text-accent underline text-[11px] hover:opacity-80"
            >
              Filter op bezoeker opheffen
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground select-none">
                <th className="py-3 px-3">Tijdstip</th>
                <th className="py-3 px-3">Bezoeker</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Paginawissel / Route</th>
                <th className="py-3 px-3">Totale Laadtijd</th>
                <th className="py-3 px-3">Fetch Tijd</th>
                <th className="py-3 px-3">Render Tijd</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground animate-pulse">
                    Prestatielogs inladen...
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-foreground">Geen prestatielogs gevonden</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Zodra bezoekers door de website navigeren worden laadtijden en fetch-diagnostiek hier direct getoond.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const isExpanded = expandedRowId === log.id;
                  const isBad = log.hasBadGateway || log.status === "bad_gateway";

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                        className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                          isBad ? "bg-rose-500/5 dark:bg-rose-950/20" : ""
                        }`}
                      >
                        {/* Tijdstip */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </td>

                        {/* Bezoeker ID */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-foreground font-mono text-[11px] border border-border"
                            title={`Sessie: ${log.sessionId || "—"}`}
                          >
                            {log.deviceType === "mobile" ? (
                              <Smartphone className="w-3 h-3 text-muted-foreground" />
                            ) : log.deviceType === "tablet" ? (
                              <Tablet className="w-3 h-3 text-muted-foreground" />
                            ) : (
                              <Laptop className="w-3 h-3 text-muted-foreground" />
                            )}
                            {log.visitorId.slice(0, 12)}
                          </span>
                        </td>

                        {/* Type Navigatie */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {log.navigationType === "initial_load" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              Eerste laadbeurt
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                              Routewissel
                            </span>
                          )}
                        </td>

                        {/* Route / Wissel */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-medium max-w-[340px] truncate">
                            {log.fromPath ? (
                              <>
                                <span className="text-muted-foreground truncate max-w-[120px]" title={log.fromPath}>
                                  {log.fromPath}
                                </span>
                                <ArrowRight className="w-3 h-3 text-accent shrink-0" />
                                <span className="text-foreground font-semibold truncate" title={log.path}>
                                  {log.path}
                                </span>
                              </>
                            ) : (
                              <span className="text-foreground font-semibold truncate" title={log.path}>
                                {log.path}
                              </span>
                            )}
                          </div>
                          {log.pageTitle && (
                            <div className="text-[10px] text-muted-foreground truncate max-w-[320px] mt-0.5">
                              {log.pageTitle}
                            </div>
                          )}
                        </td>

                        {/* Totale Laadtijd */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono">
                          {getLoadTimeBadge(log.pageLoadDurationMs)}
                        </td>

                        {/* Fetch Duur */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-muted-foreground">
                          {log.fetchDurationMs ? `${log.fetchDurationMs} ms` : "—"}
                          {log.fetchCallsCount > 0 && (
                            <span className="text-[10px] text-muted-foreground/70 ml-1">
                              ({log.fetchCallsCount}x)
                            </span>
                          )}
                        </td>

                        {/* Render Duur */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-muted-foreground">
                          {log.renderDurationMs ? `${log.renderDurationMs} ms` : "—"}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {getStatusBadge(log)}
                        </td>

                        {/* Details toggle */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Diagnostic Details */}
                      {isExpanded && (
                        <tr className="bg-muted/15 border-b border-border">
                          <td colSpan={9} className="p-4 sm:p-5">
                            <div className="space-y-4 text-xs">
                              {/* Gateway Error Warning if Bad Gateway */}
                              {log.hasBadGateway && (
                                <div className="p-3.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
                                  <ServerCrash className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                  <div>
                                    <h4 className="font-bold text-sm">
                                      502 Bad Gateway gedetecteerd tijdens deze pagina-actie!
                                    </h4>
                                    <p className="text-xs mt-0.5 opacity-90">
                                      De browser of proxy heeft een ongeldig/geen antwoord ontvangen van de server.
                                      Controleer onderstaande endpoints om te zien welke specifieke API-aanroep is gefaald.
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Performance Breakdown Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* W3C Metrics */}
                                <div className="p-3 rounded-lg border border-border bg-card">
                                  <div className="font-semibold text-foreground flex items-center gap-1.5 mb-2">
                                    <Clock className="w-3.5 h-3.5 text-accent" />
                                    <span>Tijdmeting details</span>
                                  </div>
                                  <div className="space-y-1 font-mono text-[11px]">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Totale wachttijd:</span>
                                      <span className="font-bold text-foreground">{log.pageLoadDurationMs} ms</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Fetch / API data:</span>
                                      <span>{log.fetchDurationMs} ms</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Component opbouw:</span>
                                      <span>{log.renderDurationMs} ms</span>
                                    </div>
                                    {log.ttfbMs !== undefined && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Server TTFB (latency):</span>
                                        <span>{log.ttfbMs} ms</span>
                                      </div>
                                    )}
                                    {log.domInteractiveMs !== undefined && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">DOM Interactive:</span>
                                        <span>{log.domInteractiveMs} ms</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Componenten Breakdown */}
                                <div className="p-3 rounded-lg border border-border bg-card">
                                  <div className="font-semibold text-foreground flex items-center gap-1.5 mb-2">
                                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Opgebouwde onderdelen</span>
                                  </div>
                                  {log.componentsBuilt && log.componentsBuilt.length > 0 ? (
                                    <div className="space-y-1 text-[11px]">
                                      {log.componentsBuilt.map((comp, idx) => (
                                        <div key={idx} className="flex justify-between font-mono">
                                          <span className="text-muted-foreground font-sans">{comp.name}:</span>
                                          <span className="text-foreground">{comp.durationMs} ms</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground italic text-[11px]">
                                      Reguliere weergaveopbouw voltooid in {log.renderDurationMs} ms
                                    </p>
                                  )}
                                </div>

                                {/* Omgeving & Bezoeker Details */}
                                <div className="p-3 rounded-lg border border-border bg-card">
                                  <div className="font-semibold text-foreground flex items-center gap-1.5 mb-2">
                                    <Laptop className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Apparaat &amp; Bezoeker</span>
                                  </div>
                                  <div className="space-y-1 text-[11px]">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Bezoeker ID:</span>
                                      <span className="font-mono">{log.visitorId}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Browser:</span>
                                      <span>{log.browser || "Onbekend"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Type:</span>
                                      <span className="capitalize">{log.deviceType || "desktop"}</span>
                                    </div>
                                    {log.viewportWidth && log.viewportHeight && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Schermresolutie:</span>
                                        <span>
                                          {log.viewportWidth} × {log.viewportHeight}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Mislukte / Geregistreerde API calls */}
                              {log.errorDetails && log.errorDetails.length > 0 && (
                                <div className="p-3.5 rounded-lg border border-rose-500/30 bg-rose-500/10">
                                  <div className="font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 mb-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>Mislukte netwerkaanroepen tijdens deze paginawissel:</span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {log.errorDetails.map((errItem, idx) => (
                                      <div
                                        key={idx}
                                        className="p-2 rounded bg-card/80 border border-rose-500/20 font-mono text-[11px] flex flex-col gap-1"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-rose-600 dark:text-rose-400">
                                            Status: {errItem.status || "0"} ({errItem.statusText || "Netwerkfout"})
                                          </span>
                                          <span className="text-muted-foreground">{errItem.durationMs} ms</span>
                                        </div>
                                        <div className="text-foreground break-all">{errItem.url}</div>
                                        {errItem.errorMessage && (
                                          <div className="text-muted-foreground italic text-[10px]">
                                            Foutmelding: {errItem.errorMessage}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3.5 border-t border-border bg-muted/20 text-xs">
            <span className="text-muted-foreground">
              Pagina <strong className="text-foreground">{currentPage}</strong> van {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 px-2.5 text-xs"
              >
                Vorige
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 px-2.5 text-xs"
              >
                Volgende
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceLogsManager;
