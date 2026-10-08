import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Layers,
  ArrowUpDown,
  Download,
  FileQuestion,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Info,
  Paperclip,
  Check,
  X,
  Eye,
  ShieldCheck,
  Building,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export interface ToezeggingBijlage {
  title: string;
  url: string;
  size?: string;
}

export interface ToezeggingItem {
  id: string;
  rowId: string;
  identity: string;
  datum: string;
  datumIso?: string;
  year?: number;
  title: string;
  toezeggingText: string;
  toelichting?: string;
  portefeuillehouder: string;
  deadline?: string | null;
  deadlineIso?: string | null;
  datumAfdoening?: string | null;
  datumAfdoeningIso?: string | null;
  status: string;
  isAfgedaan: boolean;
  isOverdue?: boolean;
  standVanZaken?: string;
  agendapuntTitle?: string;
  agendapuntUrl?: string;
  bijlagen?: ToezeggingBijlage[];
  municipality: string;
  detailFetched?: boolean;
  updatedAt: string;
}

export interface ToezeggingStats {
  total: number;
  open: number;
  afgedaan: number;
  overdue: number;
  withDeadline: number;
  byPortefeuillehouder: { [name: string]: { total: number; open: number; afgedaan: number } };
  byYear: { [year: string]: { total: number; open: number; afgedaan: number } };
  lastSyncedAt?: string;
}

interface ToezeggingenManagerProps {
  municipality?: string;
  onNavigateToWizard?: (prefill: { topicTitle?: string; promisedQuote?: string; wethouder?: string; toezeggingId?: string }) => void;
}

export const ToezeggingenManager: React.FC<ToezeggingenManagerProps> = ({
  municipality = "steenwijkerland",
  onNavigateToWizard,
}) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ToezeggingItem[]>([]);
  const [stats, setStats] = useState<ToezeggingStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "afgedaan" | "overdue">("all");
  const [portefeuilleFilter, setPortefeuilleFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"id_desc" | "id_asc" | "date_desc" | "date_asc" | "deadline_asc" | "deadline_desc">("id_desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedItem, setSelectedItem] = useState<ToezeggingItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);

  // Fetch toezeggingen from backend API
  const fetchToezeggingen = useCallback(async (page = 1, showToast = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        sort: sortBy,
        municipality,
      });

      if (statusFilter !== "all") params.set("status", statusFilter);
      if (portefeuilleFilter !== "all") params.set("portefeuillehouder", portefeuilleFilter);
      if (yearFilter !== "all") params.set("year", yearFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/council/toezeggingen?${params.toString()}`);
      if (!res.ok) throw new Error("Kon toezeggingen niet ophalen");
      const data = await res.json();

      setItems(data.items || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.page || 1);
      if (data.stats) setStats(data.stats);

      if (showToast) {
        toast.success(`${data.totalCount} toezeggingen geladen`);
      }
    } catch (err: any) {
      console.error("[TOEZEGGINGEN FETCH ERROR]:", err);
      toast.error("Fout bij ophalen van toezeggingen: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [pageSize, sortBy, statusFilter, portefeuilleFilter, yearFilter, searchQuery, municipality]);

  // Initial load and filter change trigger
  useEffect(() => {
    fetchToezeggingen(1);
  }, [fetchToezeggingen]);

  // Manual Synchronize button
  const handleSync = async () => {
    try {
      setSyncing(true);
      toast.info("Synchronisatie gestart met iBabs Publieksportaal (LTA)...");

      const res = await fetch(`/api/council/toezeggingen/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ municipality }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Synchronisatiefout");
      }

      const data = await res.json();
      toast.success(data.message || `Succesvol ${data.totalFetched} toezeggingen gesynchroniseerd!`);
      await fetchToezeggingen(1, false);
    } catch (err: any) {
      console.error("[SYNC TOEZEGGINGEN ERROR]:", err);
      toast.error("Fout bij synchroniseren met iBabs: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Click on a toezegging row / card
  const handleOpenDetail = async (item: ToezeggingItem) => {
    setSelectedItem(item);
    setDetailModalOpen(true);

    try {
      const res = await fetch(`/api/council/toezeggingen/${item.rowId}?municipality=${municipality}`);
      if (res.ok) {
        const enriched = await res.json();
        setSelectedItem(enriched);
        setItems((prev) => prev.map((it) => (it.rowId === item.rowId ? enriched : it)));
      }
    } catch (err) {
      console.warn("[LTA DETAIL ENRICH ERR]:", err);
    }
  };

  // Launch written questions wizard pre-filled with this toezegging
  const handleLaunchQuestionWizard = (item: ToezeggingItem) => {
    if (onNavigateToWizard) {
      onNavigateToWizard({
        topicTitle: item.title,
        promisedQuote: item.toezeggingText || item.title,
        wethouder: item.portefeuillehouder,
        toezeggingId: item.identity,
      });
    } else {
      // Fallback url navigation
      navigate(`/raadspaneel?tab=vragenformulator&toezeggingId=${encodeURIComponent(item.identity)}&topicTitle=${encodeURIComponent(item.title)}&promisedQuote=${encodeURIComponent(item.toezeggingText || item.title)}&wethouder=${encodeURIComponent(item.portefeuillehouder)}`);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (items.length === 0) {
      toast.error("Geen toezeggingen om te exporteren");
      return;
    }

    const headers = [
      "ID",
      "Datum Raad",
      "Onderwerp",
      "Portefeuillehouder",
      "Status",
      "Afgedaan",
      "Deadline",
      "Datum Afdoening",
      "Toezegging Citaat",
      "Stand van Zaken",
      "Toelichting",
      "Agendapunt",
      "iBabs Link",
    ];

    const rows = items.map((i) => [
      `"${i.identity}"`,
      `"${i.datum}"`,
      `"${(i.title || "").replace(/"/g, '""')}"`,
      `"${(i.portefeuillehouder || "").replace(/"/g, '""')}"`,
      `"${i.status}"`,
      i.isAfgedaan ? "Ja" : "Nee",
      `"${i.deadline || ""}"`,
      `"${i.datumAfdoening || ""}"`,
      `"${(i.toezeggingText || "").replace(/"/g, '""')}"`,
      `"${(i.standVanZaken || "").replace(/"/g, '""')}"`,
      `"${(i.toelichting || "").replace(/"/g, '""')}"`,
      `"${(i.agendapuntTitle || "").replace(/"/g, '""')}"`,
      `"https://steenwijkerland.bestuurlijkeinformatie.nl/Reports/Item/${i.rowId}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LTA_Toezeggingen_${municipality}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export succesvol gedownload");
  };

  // Portefeuillehouder options
  const portefeuilleOptions = useMemo(() => {
    if (!stats?.byPortefeuillehouder) return [];
    return Object.entries(stats.byPortefeuillehouder)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [stats]);

  // Year options
  const yearOptions = useMemo(() => {
    if (!stats?.byYear) return [];
    return Object.entries(stats.byYear)
      .map(([year, data]) => ({ year, ...data }))
      .sort((a, b) => b.year.localeCompare(a.year));
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* Header Banner & Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/40 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600/30 border border-indigo-400/40 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  LTA Toezeggingenregister
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 uppercase font-semibold">
                    Steenwijkerland
                  </span>
                </h1>
                <p className="text-sm text-slate-300">
                  Officiële Lange Termijn Agenda (LTA) toezeggingen van het college van B&W van Steenwijkerland, rechtstreeks gesynchroniseerd met het iBabs Publieksportaal.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md border border-indigo-400/30"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Bezig met synchroniseren..." : "Toezeggingen Nu Synchroniseren"}
            </Button>

            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV Export
            </Button>
          </div>
        </div>

        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-indigo-900/60">
          <div
            onClick={() => setStatusFilter("all")}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
              statusFilter === "all"
                ? "bg-indigo-600/30 border-indigo-400 shadow-md"
                : "bg-slate-800/50 border-slate-700/60 hover:bg-slate-800"
            }`}
          >
            <div className="text-xs font-medium text-slate-300">Totaal Toezeggingen</div>
            <div className="text-2xl font-bold text-white mt-1">{stats?.total ?? items.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Alle geregistreerde toezeggingen</div>
          </div>

          <div
            onClick={() => setStatusFilter("open")}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
              statusFilter === "open"
                ? "bg-amber-600/30 border-amber-400 shadow-md"
                : "bg-slate-800/50 border-slate-700/60 hover:bg-slate-800"
            }`}
          >
            <div className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Openstaand
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{stats?.open ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Nog in behandeling / opvolging</div>
          </div>

          <div
            onClick={() => setStatusFilter("afgedaan")}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
              statusFilter === "afgedaan"
                ? "bg-emerald-600/30 border-emerald-400 shadow-md"
                : "bg-slate-800/50 border-slate-700/60 hover:bg-slate-800"
            }`}
          >
            <div className="text-xs font-medium text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Afgedaan
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{stats?.afgedaan ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Voldaan of afgehandeld</div>
          </div>

          <div
            onClick={() => setStatusFilter("overdue")}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
              statusFilter === "overdue"
                ? "bg-rose-600/30 border-rose-400 shadow-md"
                : "bg-slate-800/50 border-slate-700/60 hover:bg-slate-800"
            }`}
          >
            <div className="text-xs font-medium text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Verlopen Deadline
            </div>
            <div className="text-2xl font-bold text-rose-400 mt-1">{stats?.overdue ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Deadline gepasseerd</div>
          </div>

          <div className="p-3.5 rounded-xl border bg-slate-800/50 border-slate-700/60">
            <div className="text-xs font-medium text-sky-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Met Harde Deadline
            </div>
            <div className="text-2xl font-bold text-sky-300 mt-1">{stats?.withDeadline ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Met einddatum / termijn</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Zoek op onderwerp, toezegging citaat, ID (#312)..."
              className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="md:col-span-2">
            <Select
              value={statusFilter}
              onValueChange={(val: any) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Statussen</SelectItem>
                <SelectItem value="open">Alleen Openstaand</SelectItem>
                <SelectItem value="afgedaan">Alleen Afgedaan</SelectItem>
                <SelectItem value="overdue">Alleen Verlopen Deadline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Portefeuillehouder filter */}
          <div className="md:col-span-3">
            <Select
              value={portefeuilleFilter}
              onValueChange={(val) => {
                setPortefeuilleFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Portefeuillehouder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Portefeuillehouders</SelectItem>
                {portefeuilleOptions.map((opt) => (
                  <SelectItem key={opt.name} value={opt.name}>
                    {opt.name} ({opt.open} open / {opt.total})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Jaar filter */}
          <div className="md:col-span-1">
            <Select
              value={yearFilter}
              onValueChange={(val) => {
                setYearFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Jaar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Jaar: Alles</SelectItem>
                {yearOptions.map((opt) => (
                  <SelectItem key={opt.year} value={opt.year}>
                    {opt.year} ({opt.total})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sortering */}
          <div className="md:col-span-2">
            <Select
              value={sortBy}
              onValueChange={(val: any) => {
                setSortBy(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Sortering" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id_desc">ID (Nieuwste eerst)</SelectItem>
                <SelectItem value="id_asc">ID (Oudste eerst)</SelectItem>
                <SelectItem value="date_desc">Datum Raad (Nieuwste)</SelectItem>
                <SelectItem value="date_asc">Datum Raad (Oudste)</SelectItem>
                <SelectItem value="deadline_asc">Deadline (Eerstvolgend)</SelectItem>
                <SelectItem value="deadline_desc">Deadline (Laatste)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active filters pill bar */}
        {(statusFilter !== "all" || portefeuilleFilter !== "all" || yearFilter !== "all" || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">Actieve filters:</span>
            {searchQuery && (
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                Zoekopdracht: &quot;{searchQuery}&quot;
                <button onClick={() => setSearchQuery("")}>
                  <X className="w-3 h-3 hover:text-indigo-900" />
                </button>
              </span>
            )}
            {statusFilter !== "all" && (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter("all")}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {portefeuilleFilter !== "all" && (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                Wethouder: {portefeuilleFilter}
                <button onClick={() => setPortefeuilleFilter("all")}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {yearFilter !== "all" && (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                Jaar: {yearFilter}
                <button onClick={() => setYearFilter("all")}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setPortefeuilleFilter("all");
                setYearFilter("all");
              }}
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline ml-auto"
            >
              Reset alle filters
            </button>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-3.5">
        {loading && items.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
            <RefreshCw className="w-8 h-8 mx-auto text-indigo-500 animate-spin mb-3" />
            <p className="text-slate-600 dark:text-slate-300 font-medium">LTA toezeggingen laden...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
            <FileQuestion className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Geen toezeggingen gevonden</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
              Er zijn geen toezeggingen die voldoen aan de huidige zoektermen of filters.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setPortefeuilleFilter("all");
                setYearFilter("all");
              }}
            >
              Filters resetten
            </Button>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id || item.rowId}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md ${
                item.isOverdue
                  ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10"
                  : item.isAfgedaan
                  ? "border-emerald-200 dark:border-emerald-900/40"
                  : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700"
              }`}
            >
              {/* Card Top Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    ID #{item.identity}
                  </span>

                  <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Raadsvergadering: {item.datum}
                  </span>

                  <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1.5">
                    <User className="w-3 h-3 text-indigo-500" />
                    {item.portefeuillehouder}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {item.isAfgedaan ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Afgedaan {item.datumAfdoening ? `(${item.datumAfdoening})` : ""}
                    </span>
                  ) : item.isOverdue ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-semibold flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Verlopen Deadline ({item.deadline})
                    </span>
                  ) : item.deadline ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Deadline: {item.deadline}
                    </span>
                  ) : (
                    <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Openstaand
                    </span>
                  )}
                </div>
              </div>

              {/* Title / Subject */}
              <h3
                onClick={() => handleOpenDetail(item)}
                className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
              >
                {item.title}
              </h3>

              {/* Exact Promise / Toezegging Quote Block */}
              <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border-l-4 border-indigo-500 dark:border-indigo-400 border-y border-r border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Gedane Toezegging:
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 italic leading-relaxed">
                  &quot;{item.toezeggingText || item.title}&quot;
                </p>
              </div>

              {/* Stand van zaken if available */}
              {item.standVanZaken && (
                <div className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Stand van zaken: </span>
                    {item.standVanZaken}
                  </div>
                </div>
              )}

              {/* Linked Standpoints Preview */}
              {item.matchedStandpunten && item.matchedStandpunten.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-indigo-500" />
                    Raakvlakken:
                  </span>
                  {item.matchedStandpunten.map((sp, idx) => (
                    <span
                      key={idx}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border flex items-center gap-1 ${
                        sp.stance === "positief"
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30"
                          : sp.stance === "negatief"
                          ? "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/30"
                          : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/30"
                      }`}
                      title={`${sp.standpuntTitel}: ${sp.explanation}`}
                    >
                      H{sp.hoofdstukNr}.{sp.standpuntNr}
                    </span>
                  ))}
                </div>
              )}

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {item.agendapuntUrl ? (
                    <a
                      href={item.agendapuntUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 flex items-center gap-1 underline underline-offset-2"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {item.agendapuntTitle || "Agendapunt in iBabs"}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : item.agendapuntTitle ? (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {item.agendapuntTitle}
                    </span>
                  ) : null}

                  {item.bijlagen && item.bijlagen.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      {item.bijlagen.length} bijlage(n)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!item.isAfgedaan && (
                    <Button
                      size="sm"
                      onClick={() => handleLaunchQuestionWizard(item)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 text-xs shadow-sm"
                    >
                      <FileQuestion className="w-3.5 h-3.5 mr-1.5" />
                      Stel Schriftelijke Vraag
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDetail(item)}
                    className="h-8 text-xs border-slate-200 dark:border-slate-700"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Details
                  </Button>

                  <a
                    href={`https://steenwijkerland.bestuurlijkeinformatie.nl/Reports/Item/${item.rowId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    title="Open in iBabs Publieksportaal"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Toon pagina <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPage}</span> van{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span> (Totaal{" "}
            {totalCount} toezeggingen)
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchToezeggingen(1)}
              disabled={currentPage <= 1 || loading}
              className="h-8 px-2.5"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchToezeggingen(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="h-8 px-2.5"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {currentPage} / {totalPages}
            </span>

            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchToezeggingen(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="h-8 px-2.5"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchToezeggingen(totalPages)}
              disabled={currentPage >= totalPages || loading}
              className="h-8 px-2.5"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Item Detail Dialog */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedItem && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    ID #{selectedItem.identity}
                  </span>
                  {selectedItem.isAfgedaan ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold">
                      Afgedaan
                    </span>
                  ) : selectedItem.isOverdue ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 font-semibold">
                      Verlopen Deadline
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-semibold">
                      Openstaand
                    </span>
                  )}
                </div>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {selectedItem.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Steenwijkerland LTA Toezegging &bull; Raadsvergadering {selectedItem.datum}
                </DialogDescription>
              </DialogHeader>

              {/* Exact Promise Quote */}
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-indigo-600 dark:border-indigo-400 space-y-1">
                <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Exacte Toezegging van het College
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed italic">
                  &quot;{selectedItem.toezeggingText || selectedItem.title}&quot;
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 block">Portefeuillehouder:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    {selectedItem.portefeuillehouder}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Datum Raad:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {selectedItem.datum}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Deadline / Termijn:</span>
                  <span className={`font-semibold flex items-center gap-1 mt-0.5 ${selectedItem.isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-800 dark:text-slate-200"}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {selectedItem.deadline || "Geen specifieke datum vermeld"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Datum Afdoening:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {selectedItem.datumAfdoening || "Nog niet afgedaan"}
                  </span>
                </div>

                {selectedItem.agendapuntTitle && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 block">Oorspronkelijk Agendapunt:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">
                      {selectedItem.agendapuntTitle}
                    </span>
                  </div>
                )}
              </div>

              {/* Stand van Zaken & Toelichting */}
              {selectedItem.standVanZaken && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Stand van zaken
                  </h4>
                  <div className="text-sm bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    {selectedItem.standVanZaken}
                  </div>
                </div>
              )}

              {selectedItem.toelichting && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Toelichting
                  </h4>
                  <div className="text-sm bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    {selectedItem.toelichting}
                  </div>
                </div>
              )}

              {/* Linked Standpoints Detail List */}
              {selectedItem.matchedStandpunten && selectedItem.matchedStandpunten.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-indigo-500" />
                    Politieke Raakvlakken &amp; Standpunten ({selectedItem.matchedStandpunten.length})
                  </h4>
                  <div className="space-y-2.5">
                    {selectedItem.matchedStandpunten.map((sp, spIdx) => (
                      <div
                        key={spIdx}
                        className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                          sp.stance === "positief"
                            ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-900/30"
                            : sp.stance === "negatief"
                            ? "bg-rose-50/40 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-900/30"
                            : "bg-amber-50/40 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Hoofdstuk {sp.hoofdstukNr}: {sp.hoofdstukTitel} &bull; Standpunt {sp.standpuntNr}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                              sp.stance === "positief"
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                                : sp.stance === "negatief"
                                ? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
                                : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                            }`}
                          >
                            {sp.stance}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {sp.standpuntTitel}
                        </div>
                        {sp.standpuntText && (
                          <div className="text-xs text-slate-500 italic dark:text-slate-400">
                            &quot;{sp.standpuntText}&quot;
                          </div>
                        )}
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed bg-white/70 dark:bg-slate-950/50 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/40 mt-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">FractieToelichting:</span>
                          {sp.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bijlagen */}
              {selectedItem.bijlagen && selectedItem.bijlagen.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    Bijbehorende Documenten &amp; Bijlagen ({selectedItem.bijlagen.length})
                  </h4>
                  <div className="space-y-1.5">
                    {selectedItem.bijlagen.map((b, bIdx) => (
                      <a
                        key={bIdx}
                        href={b.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-xs text-indigo-600 dark:text-indigo-400 font-medium"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 shrink-0 text-slate-400" />
                          <span className="truncate">{b.title}</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-2" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <a
                  href={`https://steenwijkerland.bestuurlijkeinformatie.nl/Reports/Item/${selectedItem.rowId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 self-start sm:self-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Bekijk op iBabs Publieksportaal
                </a>

                <div className="flex items-center gap-2 self-end">
                  {!selectedItem.isAfgedaan && (
                    <Button
                      onClick={() => {
                        setDetailModalOpen(false);
                        handleLaunchQuestionWizard(selectedItem);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                    >
                      <FileQuestion className="w-3.5 h-3.5 mr-1.5" />
                      Stel Schriftelijke Vraag
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setDetailModalOpen(false)} className="text-xs">
                    Sluiten
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
