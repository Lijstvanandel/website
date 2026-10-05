import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  FileText,
  Clock,
  User,
  Trash2,
  RefreshCw,
  Download,
  Filter,
  Layers,
  ShieldCheck,
  Eye,
  BarChart3,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileQuestion,
  TrendingUp,
  Tag,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface SearchLog {
  id: string | number;
  userId?: string | null;
  username?: string | null;
  userName?: string | null;
  userRole?: string | null;
  query: string;
  filtersJson?: string | null;
  resultsCount: number;
  totalHits?: number;
  tookMs?: number | null;
  ipAddress?: string | null;
  ip?: string | null;
  createdAt: string;
  timestamp?: string;
}

interface DocumentViewLog {
  id: string | number;
  userId?: string | null;
  username?: string | null;
  userName?: string | null;
  userRole?: string | null;
  filename: string;
  documentTitle?: string | null;
  title?: string;
  dossierName?: string | null;
  documentId?: string | null;
  source?: string | null;
  ipAddress?: string | null;
  ip?: string | null;
  createdAt: string;
  timestamp?: string;
}

interface NavbarSearchLog {
  id: string | number;
  userId?: string | null;
  username?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  isAnonymous?: boolean;
  query: string;
  resultsCount: number;
  countsBreakdown?: {
    all: number;
    nieuws: number;
    standpunt: number;
    agenda: number;
  } | null;
  activeTab?: string;
  source?: string;
  ipAddress?: string | null;
  ip?: string | null;
  userAgent?: string;
  createdAt: string;
  timestamp?: string;
}

export const CouncilAuditManager: React.FC = () => {
  const { token: authContextToken } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<"navbar-searches" | "searches" | "views">("navbar-searches");
  const [navbarLogs, setNavbarLogs] = useState<NavbarSearchLog[]>([]);
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
  const [viewLogs, setViewLogs] = useState<DocumentViewLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterText, setFilterText] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "auth" | "anon">("all");
  const [navbarCategoryFilter, setNavbarCategoryFilter] = useState<"all" | "nieuws" | "standpunt" | "agenda">("all");
  const [navbarHitsFilter, setNavbarHitsFilter] = useState<"all" | "has_hits" | "zero_hits">("all");

  // Pagination for logs table
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const getHeaders = useCallback(() => {
    const token =
      authContextToken ||
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [authContextToken]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getHeaders();
      const [searchRes, viewRes, navbarRes] = await Promise.all([
        fetch("/api/admin/council-audit/searches?limit=500", { headers }),
        fetch("/api/admin/council-audit/document-views?limit=500", { headers }),
        fetch("/api/admin/council-audit/navbar-searches?limit=1000", { headers }),
      ]);

      if (searchRes.ok) {
        const data = await searchRes.json();
        const raw = data.logs || data.searches || [];
        const normalized: SearchLog[] = raw.map((item: any) => ({
          ...item,
          id: item.id,
          username: item.username || item.userName || "Anoniem",
          resultsCount: item.resultsCount ?? item.totalHits ?? 0,
          createdAt: item.createdAt || item.timestamp || new Date().toISOString(),
          ipAddress: item.ipAddress || item.ip || "—",
        }));
        setSearchLogs(normalized);
      }

      if (viewRes.ok) {
        const data = await viewRes.json();
        const raw = data.logs || data.views || [];
        const normalized: DocumentViewLog[] = raw.map((item: any) => ({
          ...item,
          id: item.id,
          username: item.username || item.userName || "Anoniem",
          documentTitle: item.documentTitle || item.title || item.filename,
          createdAt: item.createdAt || item.timestamp || new Date().toISOString(),
          ipAddress: item.ipAddress || item.ip || "—",
        }));
        setViewLogs(normalized);
      }

      if (navbarRes.ok) {
        const data = await navbarRes.json();
        const raw = data.logs || data.searches || [];
        const normalized: NavbarSearchLog[] = raw.map((item: any) => ({
          ...item,
          id: item.id,
          username: item.userName || item.username || (item.isAnonymous ? "Anonieme Bezoeker" : "Ingelogde Bezoeker"),
          userName: item.userName || item.username || (item.isAnonymous ? "Anonieme Bezoeker" : "Ingelogde Bezoeker"),
          userEmail: item.userEmail || null,
          userRole: item.userRole || (item.isAnonymous ? "Bezoeker (Niet ingelogd)" : "Lid"),
          isAnonymous: item.isAnonymous ?? (!item.userId && !item.userEmail),
          resultsCount: item.resultsCount ?? item.totalHits ?? 0,
          countsBreakdown: item.countsBreakdown || null,
          activeTab: item.activeTab || "all",
          source: item.source || "navbar",
          createdAt: item.timestamp || item.createdAt || new Date().toISOString(),
          ipAddress: item.ipAddress || item.ip || "—",
        }));
        setNavbarLogs(normalized);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Fout bij ophalen van auditlogs.");
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset pagination on tab or filter change
  useEffect(() => {
    setPage(1);
  }, [activeSubTab, filterText, userFilter, navbarCategoryFilter, navbarHitsFilter, pageSize]);

  // Actions
  const handleClearSearches = async () => {
    if (!confirm("Weet u zeker dat u alle raadsarchief zoekopdracht logs wilt wissen? Dit kan niet ongedaan gemaakt worden.")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/council-audit/searches/clear", {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        toast.success("Raadsarchief zoekopdracht logs succesvol gewist.");
        setSearchLogs([]);
      } else {
        toast.error("Kon logs niet wissen.");
      }
    } catch {
      toast.error("Netwerkfout bij wissen.");
    }
  };

  const handleClearViews = async () => {
    if (!confirm("Weet u zeker dat u alle documentweergaven logs wilt wissen? Dit kan niet ongedaan gemaakt worden.")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/council-audit/document-views/clear", {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        toast.success("Documentweergaven logs succesvol gewist.");
        setViewLogs([]);
      } else {
        toast.error("Kon logs niet wissen.");
      }
    } catch {
      toast.error("Netwerkfout bij wissen.");
    }
  };

  const handleClearNavbarSearches = async () => {
    if (!confirm("Weet u zeker dat u alle navbar zoekopdracht logs wilt wissen? Dit kan niet ongedaan gemaakt worden.")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/council-audit/navbar-searches/clear", {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        toast.success("Navbar zoekopdrachten logs succesvol gewist.");
        setNavbarLogs([]);
      } else {
        toast.error("Kon navbar zoeklogs niet wissen.");
      }
    } catch {
      toast.error("Netwerkfout bij wissen.");
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalSearches = searchLogs.length;
    const totalViews = viewLogs.length;
    const totalNavbarSearches = navbarLogs.length;

    // Archief
    const anonSearches = searchLogs.filter((s) => !s.username || s.username === "Anoniem").length;
    const authSearches = totalSearches - anonSearches;

    // Navbar
    const anonNavbarSearches = navbarLogs.filter((s) => s.isAnonymous || s.username === "Anonieme Bezoeker").length;
    const authNavbarSearches = totalNavbarSearches - anonNavbarSearches;
    const zeroHitsNavbarSearches = navbarLogs.filter((s) => s.resultsCount === 0).length;

    // Top navbar search terms
    const navQueryCounts: Record<string, { count: number; zeroHits: number }> = {};
    navbarLogs.forEach((s) => {
      const q = (s.query || "").trim().toLowerCase();
      if (q) {
        if (!navQueryCounts[q]) {
          navQueryCounts[q] = { count: 0, zeroHits: 0 };
        }
        navQueryCounts[q].count += 1;
        if (s.resultsCount === 0) {
          navQueryCounts[q].zeroHits += 1;
        }
      }
    });

    const topNavbarQueries = Object.entries(navQueryCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);

    // Top zero hit terms (content gaps)
    const topZeroHits = Object.entries(navQueryCounts)
      .filter(([, data]) => data.zeroHits > 0)
      .sort((a, b) => b[1].zeroHits - a[1].zeroHits)
      .slice(0, 5);

    // Top archief search terms
    const queryCounts: Record<string, number> = {};
    searchLogs.forEach((s) => {
      const q = (s.query || "").trim().toLowerCase();
      if (q) {
        queryCounts[q] = (queryCounts[q] || 0) + 1;
      }
    });

    const topQueries = Object.entries(queryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalSearches,
      totalViews,
      anonSearches,
      authSearches,
      topQueries,
      totalNavbarSearches,
      anonNavbarSearches,
      authNavbarSearches,
      zeroHitsNavbarSearches,
      topNavbarQueries,
      topZeroHits,
    };
  }, [searchLogs, viewLogs, navbarLogs]);

  // Filtered navbar logs
  const filteredNavbarLogs = useMemo(() => {
    return navbarLogs.filter((log) => {
      const queryMatch = (log.query || "").toLowerCase();
      const userMatch = (log.username || "").toLowerCase();
      const roleMatch = (log.userRole || "").toLowerCase();
      const ipMatch = (log.ipAddress || "").toLowerCase();
      const emailMatch = (log.userEmail || "").toLowerCase();

      const matchText =
        !filterText ||
        queryMatch.includes(filterText.toLowerCase()) ||
        userMatch.includes(filterText.toLowerCase()) ||
        roleMatch.includes(filterText.toLowerCase()) ||
        ipMatch.includes(filterText.toLowerCase()) ||
        emailMatch.includes(filterText.toLowerCase());

      const isAnon = log.isAnonymous ?? (!log.userId && !log.userEmail);
      const matchUser =
        userFilter === "all" ||
        (userFilter === "anon" && isAnon) ||
        (userFilter === "auth" && !isAnon);

      const matchCategory =
        navbarCategoryFilter === "all" || log.activeTab === navbarCategoryFilter;

      const matchHits =
        navbarHitsFilter === "all" ||
        (navbarHitsFilter === "has_hits" && log.resultsCount > 0) ||
        (navbarHitsFilter === "zero_hits" && log.resultsCount === 0);

      return matchText && matchUser && matchCategory && matchHits;
    });
  }, [navbarLogs, filterText, userFilter, navbarCategoryFilter, navbarHitsFilter]);

  // Filtered search logs (Archief)
  const filteredSearchLogs = useMemo(() => {
    return searchLogs.filter((log) => {
      const matchText =
        !filterText ||
        log.query.toLowerCase().includes(filterText.toLowerCase()) ||
        (log.username || "").toLowerCase().includes(filterText.toLowerCase()) ||
        (log.userRole || "").toLowerCase().includes(filterText.toLowerCase());

      const isAnon = !log.username || log.username === "Anoniem";
      const matchUser =
        userFilter === "all" ||
        (userFilter === "anon" && isAnon) ||
        (userFilter === "auth" && !isAnon);

      return matchText && matchUser;
    });
  }, [searchLogs, filterText, userFilter]);

  // Filtered view logs
  const filteredViewLogs = useMemo(() => {
    return viewLogs.filter((log) => {
      const matchText =
        !filterText ||
        (log.filename || "").toLowerCase().includes(filterText.toLowerCase()) ||
        (log.documentTitle || "").toLowerCase().includes(filterText.toLowerCase()) ||
        (log.dossierName || "").toLowerCase().includes(filterText.toLowerCase()) ||
        (log.username || "").toLowerCase().includes(filterText.toLowerCase());

      const isAnon = !log.username || log.username === "Anoniem";
      const matchUser =
        userFilter === "all" ||
        (userFilter === "anon" && isAnon) ||
        (userFilter === "auth" && !isAnon);

      return matchText && matchUser;
    });
  }, [viewLogs, filterText, userFilter]);

  // Active items based on current tab
  const activeItems =
    activeSubTab === "navbar-searches"
      ? filteredNavbarLogs
      : activeSubTab === "searches"
      ? filteredSearchLogs
      : filteredViewLogs;

  const totalPages = Math.ceil(activeItems.length / pageSize) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginatedItems = activeItems.slice((safePage - 1) * pageSize, safePage * pageSize);

  // CSV Export
  const handleExportCSV = () => {
    if (activeSubTab === "navbar-searches") {
      const headers = [
        "ID",
        "Tijdstip",
        "Gebruiker",
        "E-mail",
        "Rol",
        "Status",
        "Zoekopdracht",
        "Categorie_Tab",
        "Totaal_Resultaten",
        "Hits_Nieuws",
        "Hits_Standpunten",
        "Hits_Agenda",
        "IP_Adres",
      ];
      const rows = filteredNavbarLogs.map((l) => [
        l.id,
        new Date(l.createdAt).toLocaleString("nl-NL"),
        `"${(l.username || "").replace(/"/g, '""')}"`,
        `"${(l.userEmail || "").replace(/"/g, '""')}"`,
        `"${(l.userRole || "").replace(/"/g, '""')}"`,
        l.isAnonymous ? "Anoniem" : "Ingelogd",
        `"${(l.query || "").replace(/"/g, '""')}"`,
        l.activeTab || "all",
        l.resultsCount,
        l.countsBreakdown?.nieuws ?? "",
        l.countsBreakdown?.standpunt ?? "",
        l.countsBreakdown?.agenda ?? "",
        l.ipAddress || "",
      ]);
      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `navbar_zoekopdrachten_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Navbar zoekopdrachten geëxporteerd naar CSV.");
    } else if (activeSubTab === "searches") {
      const headers = ["ID", "Tijdstip", "Gebruiker", "Rol", "Zoekterm", "Resultaten", "Laadtijd ms"];
      const rows = filteredSearchLogs.map((l) => [
        l.id,
        new Date(l.createdAt).toLocaleString("nl-NL"),
        l.username || "Anoniem",
        l.userRole || "Bezoeker",
        `"${(l.query || "").replace(/"/g, '""')}"`,
        l.resultsCount,
        l.tookMs ?? "",
      ]);
      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `raad_zoekopdrachten_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Raadsarchief zoekopdrachten geëxporteerd naar CSV.");
    } else {
      const headers = ["ID", "Tijdstip", "Gebruiker", "Rol", "Bestandsnaam", "Titel", "Dossier", "Bron"];
      const rows = filteredViewLogs.map((l) => [
        l.id,
        new Date(l.createdAt).toLocaleString("nl-NL"),
        l.username || "Anoniem",
        l.userRole || "Bezoeker",
        `"${(l.filename || "").replace(/"/g, '""')}"`,
        `"${(l.documentTitle || "").replace(/"/g, '""')}"`,
        `"${(l.dossierName || "").replace(/"/g, '""')}"`,
        l.source || "",
      ]);
      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `raad_documentweergaven_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Documentweergaven geëxporteerd naar CSV.");
    }
  };

  return (
    <div id="council-audit-manager" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-accent/15 text-accent">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold font-display text-foreground">
              Raadsarchief Audit & Gebruikslogs
            </h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Inzicht in alle zoekopdrachten die worden ingetypt op de website (zowel via de globale navbar zoekbalk als in het raadsarchief) en welke raadsdocumenten worden bekeken en gedownload door ingelogde raadsleden, burgers of anonieme bezoekers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="rounded-xl text-xs gap-1.5 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Vernieuwen
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="rounded-xl text-xs gap-1.5 h-9"
            title="Exporteer de huidige tabel naar CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Exporteer CSV
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Navbar Zoekopdrachten */}
        <div
          onClick={() => setActiveSubTab("navbar-searches")}
          className={`p-4 rounded-2xl bg-card border transition-all cursor-pointer shadow-xs ${
            activeSubTab === "navbar-searches"
              ? "border-accent ring-2 ring-accent/20"
              : "border-border hover:border-accent/40"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Navbar Zoekopdrachten</span>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.totalNavbarSearches}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-emerald-600 font-medium">✓ {stats.authNavbarSearches} ingelogd</span>
            <span>•</span>
            <span>{stats.anonNavbarSearches} anoniem</span>
            {stats.zeroHitsNavbarSearches > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-600 font-medium">{stats.zeroHitsNavbarSearches} zonder hits</span>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Archief Zoekopdrachten */}
        <div
          onClick={() => setActiveSubTab("searches")}
          className={`p-4 rounded-2xl bg-card border transition-all cursor-pointer shadow-xs ${
            activeSubTab === "searches"
              ? "border-accent ring-2 ring-accent/20"
              : "border-border hover:border-accent/40"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Archief Zoekopdrachten</span>
            <Search className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.totalSearches}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
            <span className="text-emerald-600 font-medium">✓ {stats.authSearches} ingelogd</span>
            <span>•</span>
            <span>{stats.anonSearches} anoniem</span>
          </div>
        </div>

        {/* Card 3: Documenten Bekeken */}
        <div
          onClick={() => setActiveSubTab("views")}
          className={`p-4 rounded-2xl bg-card border transition-all cursor-pointer shadow-xs ${
            activeSubTab === "views"
              ? "border-accent ring-2 ring-accent/20"
              : "border-border hover:border-accent/40"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Documenten Bekeken</span>
            <Eye className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.totalViews}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Geregistreerde PDF inspecties en downloads
          </div>
        </div>

        {/* Card 4: Top Ingetypte Termen (Navbar / Algemeen) */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Veelgezochte Termen (Navbar)</span>
            <BarChart3 className="w-4 h-4 text-accent" />
          </div>
          {stats.topNavbarQueries.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {stats.topNavbarQueries.map(([term, data]) => (
                <span
                  key={term}
                  onClick={() => {
                    setActiveSubTab("navbar-searches");
                    setFilterText(term);
                  }}
                  className="px-2 py-0.5 rounded-lg text-xs bg-muted font-medium text-foreground border border-border/70 flex items-center gap-1.5 cursor-pointer hover:border-accent transition-colors"
                  title={`${data.count}x gezocht (${data.zeroHits}x zonder resultaten)`}
                >
                  <span className="font-semibold text-accent">{term}</span>
                  <span className="text-[10px] bg-background px-1.5 py-0.2 rounded font-mono text-muted-foreground">
                    {data.count}x
                  </span>
                </span>
              ))}
            </div>
          ) : stats.topQueries.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {stats.topQueries.map(([term, count]) => (
                <span
                  key={term}
                  className="px-2 py-0.5 rounded-lg text-xs bg-muted font-medium text-foreground border border-border/70 flex items-center gap-1.5"
                >
                  <span className="font-semibold text-accent">{term}</span>
                  <span className="text-[10px] bg-background px-1.5 py-0.2 rounded font-mono text-muted-foreground">
                    {count}x
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Nog geen zoekopdrachten geregistreerd</div>
          )}
        </div>
      </div>

      {/* Special Data Analysis Box for Navbar Search Insights */}
      {activeSubTab === "navbar-searches" && stats.topZeroHits.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-foreground">
              Data Analyse &amp; Content Gap Detectie
            </div>
            <p className="text-muted-foreground">
              Bezoekers hebben gezocht naar de volgende onderwerpen waar op dat moment <strong>0 resultaten</strong> voor zijn gevonden. Handig voor de fractie of redactie om hier nieuwsberichten of standpunten over te publiceren:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {stats.topZeroHits.map(([term, data]) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setFilterText(term)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-background/80 hover:bg-background border border-amber-500/40 font-medium text-foreground flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span className="font-bold text-amber-700 dark:text-amber-300">"{term}"</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-200 px-1.5 py-0.2 rounded font-mono font-bold">
                    {data.zeroHits}x 0 hits
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subtabs Selector & Filter Toolbar */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          {/* Subtab buttons */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl w-fit flex-wrap">
            <button
              type="button"
              id="subtab-btn-navbar-searches"
              onClick={() => setActiveSubTab("navbar-searches")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeSubTab === "navbar-searches"
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Navbar Zoekopdrachten ({filteredNavbarLogs.length})</span>
            </button>

            <button
              type="button"
              id="subtab-btn-searches"
              onClick={() => setActiveSubTab("searches")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeSubTab === "searches"
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Raadsarchief Zoekopdrachten ({filteredSearchLogs.length})</span>
            </button>

            <button
              type="button"
              id="subtab-btn-views"
              onClick={() => setActiveSubTab("views")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeSubTab === "views"
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Bekeken Documenten ({filteredViewLogs.length})</span>
            </button>
          </div>

          {/* Destructive Clear Logs Button */}
          {activeSubTab === "navbar-searches" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearNavbarSearches}
              disabled={navbarLogs.length === 0}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-500/10 border-red-500/20 rounded-xl gap-1.5 h-8 self-end sm:self-auto cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Wis Navbar Zoekgeschiedenis
            </Button>
          ) : activeSubTab === "searches" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearSearches}
              disabled={searchLogs.length === 0}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-500/10 border-red-500/20 rounded-xl gap-1.5 h-8 self-end sm:self-auto cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Wis Archief Zoekgeschiedenis
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearViews}
              disabled={viewLogs.length === 0}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-500/10 border-red-500/20 rounded-xl gap-1.5 h-8 self-end sm:self-auto cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Wis Documentlogs
            </Button>
          )}
        </div>

        {/* Filters Bar: Text filter, user status filter, category filter, hits filter, page size selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[200px] flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder={
                  activeSubTab === "navbar-searches"
                    ? "Filter op zoekterm, gebruiker, e-mail of IP..."
                    : activeSubTab === "searches"
                    ? "Zoek op zoekterm, gebruiker of rol..."
                    : "Zoek op bestandsnaam, dossier of gebruiker..."
                }
                className="h-8 pl-8 text-xs rounded-xl"
              />
            </div>

            {/* Ingelogd / Anoniem Filter */}
            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/60">
              <span className="text-[11px] text-muted-foreground px-2">Gebruiker:</span>
              {(["all", "auth", "anon"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setUserFilter(type)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    userFilter === type
                      ? "bg-accent text-accent-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type === "all" ? "Alles" : type === "auth" ? "Ingelogd" : "Anoniem"}
                </button>
              ))}
            </div>

            {/* Categorie / Tab Filter (alleen voor navbar zoekopdrachten) */}
            {activeSubTab === "navbar-searches" && (
              <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/60">
                <span className="text-[11px] text-muted-foreground px-2">Tab:</span>
                {(["all", "nieuws", "standpunt", "agenda"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNavbarCategoryFilter(cat)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      navbarCategoryFilter === cat
                        ? "bg-accent text-accent-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat === "all"
                      ? "Alle"
                      : cat === "nieuws"
                      ? "Nieuws"
                      : cat === "standpunt"
                      ? "Standpunt"
                      : "Agenda"}
                  </button>
                ))}
              </div>
            )}

            {/* Zero-hits filter (alleen voor navbar) */}
            {activeSubTab === "navbar-searches" && (
              <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/60">
                <span className="text-[11px] text-muted-foreground px-2">Hits:</span>
                {(
                  [
                    { id: "all", label: "Alles" },
                    { id: "has_hits", label: ">0 Resultaten" },
                    { id: "zero_hits", label: "0 Resultaten (Gaps)" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNavbarHitsFilter(opt.id)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      navbarHitsFilter === opt.id
                        ? "bg-accent text-accent-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-[11px] text-muted-foreground">Rijen per pagina:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 px-2 rounded-xl bg-background border border-border text-foreground text-xs font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto rounded-xl border border-border">
          {activeSubTab === "navbar-searches" ? (
            /* TAB: NAVBAR ZOEKOPDRACHTEN */
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/50 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Tijdstip</th>
                  <th className="px-4 py-3">Gebruiker &amp; Status</th>
                  <th className="px-4 py-3">Ingetypte Zoekopdracht</th>
                  <th className="px-4 py-3">Categorie</th>
                  <th className="px-4 py-3">Gevonden Resultaten</th>
                  <th className="px-4 py-3">IP-adres</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Sparkles className="w-7 h-7 text-muted-foreground/40" />
                        <span className="font-medium text-foreground">Geen navbar zoekopdrachten gevonden.</span>
                        <span className="text-[11px] max-w-sm">
                          Elke zoekopdracht die een bezoeker of raadslid in de navbar typt (ingelogd of anoniem) wordt hier real-time vastgelegd voor data analyse.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (paginatedItems as NavbarSearchLog[]).map((log) => {
                    const isAnon = log.isAnonymous ?? (!log.userId && !log.userEmail);
                    const dateFormatted = new Date(log.createdAt).toLocaleString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });

                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        {/* 1. Tijdstip */}
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span>{dateFormatted}</span>
                          </div>
                        </td>

                        {/* 2. Gebruiker & Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isAnon ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-[11px] text-muted-foreground font-medium border border-border/80">
                              <User className="w-3 h-3 opacity-60" /> Anonieme bezoeker
                            </span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">{log.username}</span>
                                {log.userRole && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-accent/15 text-accent text-[10px] font-semibold uppercase">
                                    {log.userRole}
                                  </span>
                                )}
                              </div>
                              {log.userEmail && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {log.userEmail}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 3. Ingetypte Zoekopdracht */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/30 text-accent font-mono text-xs font-semibold">
                              {log.query}
                            </span>
                          </div>
                        </td>

                        {/* 4. Geselecteerde Categorie (Tab) */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium border border-border/60 capitalize">
                            <Tag className="w-3 h-3 text-accent" />
                            {log.activeTab === "all"
                              ? "Alle categorieën"
                              : log.activeTab === "nieuws"
                              ? "Nieuws"
                              : log.activeTab === "standpunt"
                              ? "Standpunten"
                              : "Agenda"}
                          </span>
                        </td>

                        {/* 5. Gevonden Resultaten & Uitsplitsing */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {log.resultsCount === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
                              <AlertCircle className="w-3 h-3" /> 0 resultaten (Content gap)
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                                <CheckCircle2 className="w-3 h-3" /> {log.resultsCount} hits
                              </span>
                              {log.countsBreakdown && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                                  {log.countsBreakdown.nieuws > 0 && (
                                    <span className="bg-muted px-1.5 py-0.2 rounded">
                                      {log.countsBreakdown.nieuws} nieuws
                                    </span>
                                  )}
                                  {log.countsBreakdown.standpunt > 0 && (
                                    <span className="bg-muted px-1.5 py-0.2 rounded">
                                      {log.countsBreakdown.standpunt} standpunt
                                    </span>
                                  )}
                                  {log.countsBreakdown.agenda > 0 && (
                                    <span className="bg-muted px-1.5 py-0.2 rounded">
                                      {log.countsBreakdown.agenda} agenda
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 6. IP-adres */}
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-[11px] font-mono">
                          {log.ipAddress || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : activeSubTab === "searches" ? (
            /* TAB: RAADSARCHIEF ZOEKOPDRACHTEN */
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/50 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Tijdstip</th>
                  <th className="px-4 py-3">Gebruiker</th>
                  <th className="px-4 py-3">Zoekopdracht</th>
                  <th className="px-4 py-3">Resultaten</th>
                  <th className="px-4 py-3">Laadtijd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Geen zoekopdrachten gevonden.
                    </td>
                  </tr>
                ) : (
                  (paginatedItems as SearchLog[]).map((log) => {
                    const isAnon = !log.username || log.username === "Anoniem";
                    const dateFormatted = new Date(log.createdAt).toLocaleString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {dateFormatted}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {isAnon ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px] text-muted-foreground font-medium border border-border">
                                <User className="w-3 h-3 opacity-60" /> Anonieme bezoeker
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">{log.username}</span>
                                {log.userRole && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-accent/15 text-accent text-[10px] font-semibold uppercase">
                                    {log.userRole}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-accent/10 text-accent font-mono text-xs">
                              {log.query || "(lege filterzoekopdracht)"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                          {log.resultsCount} hits
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-[11px] font-mono">
                          {log.tookMs !== null && log.tookMs !== undefined ? `${log.tookMs} ms` : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* TAB: BEKEKEN DOCUMENTEN */
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/50 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Tijdstip</th>
                  <th className="px-4 py-3">Gebruiker</th>
                  <th className="px-4 py-3">Document / Titel</th>
                  <th className="px-4 py-3">Dossier</th>
                  <th className="px-4 py-3">Bron</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Geen documentweergaven geregistreerd.
                    </td>
                  </tr>
                ) : (
                  (paginatedItems as DocumentViewLog[]).map((log) => {
                    const isAnon = !log.username || log.username === "Anoniem";
                    const dateFormatted = new Date(log.createdAt).toLocaleString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {dateFormatted}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {isAnon ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px] text-muted-foreground font-medium border border-border">
                                <User className="w-3 h-3 opacity-60" /> Anonieme bezoeker
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">{log.username}</span>
                                {log.userRole && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-accent/15 text-accent text-[10px] font-semibold uppercase">
                                    {log.userRole}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5 max-w-sm">
                            <div className="font-semibold text-foreground line-clamp-1">
                              {log.documentTitle || log.filename}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground line-clamp-1">
                              {log.filename}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px]">
                            <Layers className="w-3 h-3 text-accent" />
                            {log.dossierName || "Overig"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-[11px]">
                          {log.source === "download" ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Download</span>
                          ) : (
                            <span>Modal viewer</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border text-xs text-muted-foreground">
            <div>
              Toont {(safePage - 1) * pageSize + 1} t/m {Math.min(safePage * pageSize, activeItems.length)} van{" "}
              {activeItems.length} regels
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 text-xs rounded-xl cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Vorige
              </Button>

              <span className="px-2 text-xs font-semibold text-foreground">
                Pagina {safePage} van {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-2.5 text-xs rounded-xl cursor-pointer"
              >
                Volgende
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
