import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Building2,
  Download,
  Play,
  Square,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Waves,
  Layers,
  Sparkles,
  ExternalLink,
  Search,
  Eye,
  Terminal,
  ShieldCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react";
import { toast } from "sonner";
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
} from "@/components/ui/dialog";

interface WaterschapSyncStatus {
  isRunning: boolean;
  isPaused: boolean;
  currentYear: number | null;
  totalYears: number[];
  totalMeetingsFound: number;
  processedMeetings: number;
  totalDocumentsFound: number;
  scannedDocuments: number;
  savedDocuments: number;
  excludedDocuments: number;
  steenwijkerlandCount: number;
  waterschapbreedCount: number;
  externCount: number;
  currentAction: string;
  logs: Array<{ timestamp: string; message: string; level: "info" | "success" | "warn" | "error" }>;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

interface WaterschapDoc {
  id: string;
  document_id: string;
  version: number | string;
  meeting_id: string;
  datum: string;
  titel: string;
  meeting_titel: string;
  gremium_naam: string;
  document_type: string;
  filetype: string;
  scope: string;
  filter_methode: string;
  reden: string;
  opslaan: boolean;
  bestandsnaam: string;
  lokaal_pad: string;
  notubiz_url: string;
  grootte_bytes: number;
  gesynchroniseerd_op: string;
}

interface WaterschapManagerProps {
  token?: string | null;
}

export const WaterschapManager: React.FC<WaterschapManagerProps> = ({ token }) => {
  const [syncStatus, setSyncStatus] = useState<WaterschapSyncStatus | null>(null);
  const [documents, setDocuments] = useState<WaterschapDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [showLogs, setShowLogs] = useState<boolean>(true);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, scopeFilter, yearFilter, pageSize]);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/council/waterschap/sync-status", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch (err) {
      console.error("Fout bij ophalen Waterschap sync status:", err);
    }
  }, [token]);

  // Fetch documents list
  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (scopeFilter !== "all") params.append("scope", scopeFilter);
      if (yearFilter !== "all") params.append("year", yearFilter);

      const res = await fetch(`/api/council/waterschap/documents?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Fout bij ophalen Waterschap documenten:", err);
      toast.error("Kon waterschapsdocumenten niet laden");
    } finally {
      setLoadingDocs(false);
    }
  }, [token, searchQuery, scopeFilter, yearFilter]);

  // Start polling when sync is running
  useEffect(() => {
    fetchSyncStatus();
    fetchDocuments();

    pollIntervalRef.current = setInterval(() => {
      fetchSyncStatus();
      if (syncStatus?.isRunning) {
        fetchDocuments();
      }
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchSyncStatus, fetchDocuments, syncStatus?.isRunning]);

  // Handler: Start sync
  const handleStartSync = async () => {
    try {
      const res = await fetch("/api/council/waterschap/start-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        toast.success("Synchronisatie Waterschap gestart!");
        fetchSyncStatus();
      } else {
        const err = await res.json();
        toast.error(err.message || "Kon synchronisatie niet starten");
      }
    } catch {
      toast.error("Serverfout bij starten synchronisatie");
    }
  };

  // Handler: Cancel sync
  const handleCancelSync = async () => {
    try {
      const res = await fetch("/api/council/waterschap/cancel-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        toast.info("Synchronisatie wordt geannuleerd...");
        fetchSyncStatus();
      }
    } catch {
      toast.error("Kon synchronisatie niet annuleren");
    }
  };

  return (
    <div id="waterschap-manager" className="space-y-6">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-blue-900 via-sky-900 to-indigo-950 text-white rounded-xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <Waves className="w-96 h-96" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5 text-blue-300" />
                Waterschap Drents Overijsselse Delta
              </span>
              <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                3-Tier AI Filter Engine
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Waterschapsvergaderingen & Besluiten Scraper
            </h2>
            <p className="text-blue-100/80 text-xs sm:text-sm mt-1 max-w-3xl">
              Automatische synchronisatie van waterschapsstukken via het bestuursinformatiesysteem van{" "}
              <a
                href="https://bestuursinformatie.wdodelta.nl/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-200 underline font-mono"
              >
                Waterschap Drents Overijsselse Delta
              </a>{" "}
              (2021 – heden). Filtert op <strong>Steenwijkerland &amp; Wateren</strong> (Giethoorn, Weerribben, Vollenhove, Blokzijl, Kuinre, etc.),{" "}
              <strong>Waterschapbreed beleid</strong> en ziften van externe projecten buiten de gemeente. Exporteert direct naar{" "}
              <code className="bg-blue-950/80 px-1.5 py-0.5 rounded text-xs text-sky-300 font-mono">
                raadsstukken_metadata_waterschap.csv
              </code>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            <a
              id="download-waterschap-csv-btn"
              href="/api/council/waterschap/metadata.csv"
              download="raadsstukken_metadata_waterschap.csv"
            >
              <Button variant="secondary" size="sm" className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20">
                <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                Download CSV Overzicht
              </Button>
            </a>

            {syncStatus?.isRunning ? (
              <Button
                id="cancel-waterschap-sync-btn"
                onClick={handleCancelSync}
                variant="destructive"
                size="sm"
                className="gap-2"
              >
                <Square className="w-4 h-4" />
                Stop Sync
              </Button>
            ) : (
              <Button
                id="start-waterschap-sync-btn"
                onClick={handleStartSync}
                size="sm"
                className="gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow"
              >
                <Play className="w-4 h-4" />
                Start Synchronisatie
              </Button>
            )}

            <Button
              id="refresh-waterschap-btn"
              onClick={() => {
                fetchSyncStatus();
                fetchDocuments();
                toast.success("Gegevens ververst");
              }}
              variant="outline"
              size="sm"
              className="gap-1.5 bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Live Status Cards */}
      <div className="grid grid-cols 1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Totaal Gescand</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {syncStatus?.scannedDocuments || 0}
            </div>
            <div className="text-[11px] text-slate-400">
              {syncStatus?.processedMeetings || 0} vergaderingen verwerkt
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Geaccepteerd &amp; Opgeslagen</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {syncStatus?.savedDocuments || 0}
            </div>
            <div className="text-[11px] text-slate-400">
              PDF-bestanden fysiek bewaard
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Lokaal Steenwijkerland</div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {syncStatus?.steenwijkerlandCount || 0}
            </div>
            <div className="text-[11px] text-slate-400">
              Kernen &amp; Polders in Steenwijkerland
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Waterschapbreed Beleid</div>
            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {syncStatus?.waterschapbreedCount || 0}
            </div>
            <div className="text-[11px] text-slate-400">
              Algemeen waterschap-beleid
            </div>
          </div>
        </div>
      </div>

      {/* Scrape Historie & Live Logs Console */}
      <div className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-md overflow-hidden">
        <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono">
            <History className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-slate-200">Scrape-historie &amp; Live Status</span>
            {syncStatus?.isRunning && (
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 rounded text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Synchroniseren
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              {syncStatus?.currentAction || "Inactief"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-slate-400 hover:text-white"
              onClick={() => setShowLogs(!showLogs)}
            >
              {showLogs ? "Verberg Historie" : "Toon Historie"}
            </Button>
          </div>
        </div>

        {showLogs && (
          <div className="p-4 font-mono text-xs max-h-56 overflow-y-auto space-y-1 bg-slate-900/90 divide-y divide-slate-800/40">
            {syncStatus?.logs && syncStatus.logs.length > 0 ? (
              syncStatus.logs.map((log, idx) => (
                <div key={idx} className="pt-1 flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span
                    className={
                      log.level === "success"
                        ? "text-emerald-400 font-medium"
                        : log.level === "warn"
                        ? "text-amber-400"
                        : log.level === "error"
                        ? "text-rose-400 font-bold"
                        : "text-slate-300"
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-slate-500 italic py-2">
                Nog geen scrape-historie beschikbaar. Klik op "Start Synchronisatie" om de waterschapsvergaderingen (2021-heden) te scannen.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Classified Documents Table & Filter Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Geklasseerde Waterschapsdocumenten ({documents.length})
            </h3>
            <p className="text-xs text-slate-500">
              Filter op scope, jaartal of trefwoord om relevante bestanden snel in te zien.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                placeholder="Zoek op titel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="w-[180px] text-xs h-9">
                <SelectValue placeholder="Filter op scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Scopes</SelectItem>
                <SelectItem value="Lokaal - Steenwijkerland">Lokaal - Steenwijkerland</SelectItem>
                <SelectItem value="Waterschapbreed">Waterschapbreed</SelectItem>
                <SelectItem value="Lokaal - Externe Gemeente">Lokaal - Externe Gemeente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[120px] text-xs h-9">
                <SelectValue placeholder="Jaartal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Jaren</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
                <SelectItem value="2021">2021</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Documents Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold">
                <th className="py-2.5 px-3">Datum</th>
                <th className="py-2.5 px-3">Titel &amp; Vergadering</th>
                <th className="py-2.5 px-3">Scope &amp; Status</th>
                <th className="py-2.5 px-3">Filter Methode &amp; Reden</th>
                <th className="py-2.5 px-3 text-right">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loadingDocs ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    Laden van waterschapsdocumenten...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    Geen documenten gevonden. Start een synchronisatie om waterschapsstukken op te halen.
                  </td>
                </tr>
              ) : (
                (() => {
                  const totalPages = Math.ceil(documents.length / pageSize) || 1;
                  const safeCurrentPage = Math.min(currentPage, totalPages);
                  const startIndex = (safeCurrentPage - 1) * pageSize;
                  const endIndex = Math.min(startIndex + pageSize, documents.length);
                  const paginatedDocs = documents.slice(startIndex, endIndex);

                  return paginatedDocs.map((doc) => {
                    const isSteenwijk = doc.scope === "Lokaal - Steenwijkerland";
                    const isWaterschapbreed = doc.scope === "Waterschapbreed";

                    return (
                      <tr
                        key={doc.id || doc.document_id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                      >
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono">
                          {doc.datum}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs sm:max-w-md">
                          <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                            {doc.titel}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {doc.meeting_titel} • {doc.gremium_naam}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              isSteenwijk
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : isWaterschapbreed
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {doc.scope}
                          </span>
                          {doc.opslaan ? (
                            <span className="block text-[10px] text-emerald-600 mt-0.5">● Opgeslagen</span>
                          ) : (
                            <span className="block text-[10px] text-slate-500 mt-0.5">○ Genegeerd</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                            {doc.filter_methode}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-2">
                            {doc.reden}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {doc.lokaal_pad ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs px-2 gap-1 text-blue-600 hover:text-blue-700"
                                onClick={() => {
                                  setPreviewDocUrl(doc.lokaal_pad);
                                  setPreviewDocTitle(doc.titel);
                                }}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Bekijk
                              </Button>
                            ) : doc.notubiz_url ? (
                              <a
                                href={doc.notubiz_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 p-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Origineel
                              </a>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {documents.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-medium">Toon per pagina:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[110px] text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per pagina</SelectItem>
                  <SelectItem value="20">20 per pagina</SelectItem>
                  <SelectItem value="50">50 per pagina</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-slate-500 ml-1">
                ({(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, documents.length)} van {documents.length} documenten)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs gap-1"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Vorige
              </Button>

              <span className="px-2 font-medium">
                Pagina {currentPage} van {Math.ceil(documents.length / pageSize) || 1}
              </span>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs gap-1"
                disabled={currentPage >= (Math.ceil(documents.length / pageSize) || 1)}
                onClick={() => setCurrentPage((p) => Math.min(Math.ceil(documents.length / pageSize) || 1, p + 1))}
              >
                Volgende
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      <Dialog open={Boolean(previewDocUrl)} onOpenChange={(open) => !open && setPreviewDocUrl(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold truncate">
              {previewDocTitle || "Document Voorbeeld"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Voorbeeldweergave van opgeslagen Waterschap PDF
            </DialogDescription>
          </DialogHeader>
          {previewDocUrl && (
            <div className="flex-1 w-full bg-slate-100 rounded overflow-hidden mt-2">
              <iframe
                src={previewDocUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default WaterschapManager;
