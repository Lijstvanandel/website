import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Download,
  Play,
  Square,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
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

interface SyncStatus {
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
  hoogeveenCount: number;
  provinciebreedCount: number;
  externCount: number;
  currentAction: string;
  logs: Array<{ timestamp: string; message: string; level: "info" | "success" | "warn" | "error" }>;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

interface DrentheDoc {
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
  source_url: string;
  grootte_bytes: number;
  gesynchroniseerd_op: string;
}

interface DrentheProvincieManagerProps {
  token?: string;
  onClose?: () => void;
}

export const DrentheProvincieManager: React.FC<DrentheProvincieManagerProps> = ({
  token,
  onClose,
}) => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [documents, setDocuments] = useState<DrentheDoc[]>([]);
  const [totalDocs, setTotalDocs] = useState<number>(0);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [selectedYears, setSelectedYears] = useState<number[]>([2021, 2022, 2023, 2024, 2025, 2026]);
  const [showLogs, setShowLogs] = useState<boolean>(true);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, scopeFilter, yearFilter, pageSize]);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/council/drenthe/sync-status", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
      }
    } catch {
      // ignore
    }
  }, [token]);

  const fetchDocuments = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoadingDocs(true);
    try {
      const params = new URLSearchParams();
      if (scopeFilter !== "all") params.set("scope", scopeFilter);
      if (yearFilter !== "all") params.set("year", yearFilter);
      if (searchQuery.trim()) params.set("query", searchQuery.trim());

      const res = await fetch(`/api/council/drenthe/documents?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setTotalDocs(data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      if (!isSilent) setIsLoadingDocs(false);
    }
  }, [token, scopeFilter, yearFilter, searchQuery]);

  useEffect(() => {
    fetchStatus();
    fetchDocuments(false);

    let docPollCounter = 0;
    pollIntervalRef.current = setInterval(() => {
      fetchStatus();
      docPollCounter++;
      // Live reload documents list every 5 seconds during active sync silently without blinking the table
      if (docPollCounter % 2 === 0) {
        fetchDocuments(true);
      }
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchStatus, fetchDocuments]);

  // When sync completes or status changes to not running, re-fetch documents silently
  useEffect(() => {
    if (status && !status.isRunning) {
      fetchDocuments(true);
    }
  }, [status?.isRunning, fetchDocuments]);

  const handleStartSync = async () => {
    try {
      const res = await fetch("/api/council/drenthe/start-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ years: selectedYears }),
      });
      if (res.ok) {
        toast.success("Synchronisatie Provincie Drenthe gestart!");
        fetchStatus();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Kon synchronisatie niet starten");
      }
    } catch (err: any) {
      toast.error(err.message || "Verbindingsfout bij starten");
    }
  };

  const handleStopSync = async () => {
    try {
      const res = await fetch("/api/council/drenthe/stop-sync", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        toast.info("Synchronisatie gestopt");
        fetchStatus();
      }
    } catch {
      toast.error("Kon synchronisatie niet stoppen");
    }
  };

  const handleClearCache = async () => {
    if (!confirm("Weet u zeker dat u de lokale Drenthe metadata en documentencache wilt wissen?")) return;
    try {
      const res = await fetch("/api/council/drenthe/clear-cache", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        toast.success("Lokale cache van Provincie Drenthe gewist");
        fetchStatus();
        fetchDocuments();
      }
    } catch {
      toast.error("Kon cache niet wissen");
    }
  };

  const handleExportCsv = () => {
    window.open("/api/council/drenthe/export-csv", "_blank");
  };

  const toggleYear = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year].sort()
    );
  };

  // Pagination calculation
  const totalPages = Math.ceil(documents.length / pageSize) || 1;
  const paginatedDocs = documents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      {/* Top Banner Card */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-rose-600" />
                Drents Parlement • Statencommissie & Provinciale Staten
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                Gemini 2.5 Flash AI Filter
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Provincie Drenthe Scraper & Dossierfilter
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Automatische synchronisatie van provinciale vergaderstukken via <a href="https://www.drentsparlement.nl/Vergaderingen" target="_blank" rel="noopener noreferrer" className="text-rose-600 dark:text-rose-400 underline font-semibold">drentsparlement.nl</a> (2021 – heden). Filtert op de <strong>Zwarte lijst</strong> (externe niet-Drentse steden), <strong>Witte lijst</strong> (Hoogeveense wijken en dorpen) en <strong>Gemini Flash AI</strong> voor provinciaal beleid. Exporteert direct naar <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-rose-600 font-mono">raadsstukken_metadata_drenthe.csv</code>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={handleExportCsv}
              variant="outline"
              size="sm"
              className="rounded-xl border-border hover:bg-muted font-bold text-xs gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Exporteer CSV
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="ghost" size="sm" className="rounded-xl text-xs">
                Sluiten
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-6">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Vergaderingen</div>
            <div className="text-xl font-display font-bold text-foreground mt-0.5">
              {status?.totalMeetingsFound ?? 0}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Gescand</div>
            <div className="text-xl font-display font-bold text-foreground mt-0.5">
              {status?.scannedDocuments ?? 0}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Hoogeveen</div>
            <div className="text-xl font-display font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {status?.hoogeveenCount ?? documents.filter((d) => d.scope === "Lokaal - Hoogeveen").length}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
            <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">Provinciebreed</div>
            <div className="text-xl font-display font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              {status?.provinciebreedCount ?? documents.filter((d) => d.scope === "Provinciebreed").length}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-500/10 border border-slate-500/30">
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Genegeerd</div>
            <div className="text-xl font-display font-bold text-slate-600 dark:text-slate-400 mt-0.5">
              {status?.externCount ?? documents.filter((d) => d.scope === "Lokaal - Externe Gemeente").length}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-accent/15 border border-accent/30">
            <div className="text-[11px] font-bold text-accent uppercase tracking-wider">Totaal Bewaard</div>
            <div className="text-xl font-display font-bold text-foreground mt-0.5">
              {status?.savedDocuments ?? documents.filter((d) => d.opslaan).length}
            </div>
          </div>
        </div>

        {/* Live Controller Bar */}
        <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              {status?.isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 text-rose-600 animate-spin" />
                  <span>Synchronisatie actief ({status.currentYear || "Initialiseren"}):</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Status: Gereed voor synchronisatie</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground italic truncate max-w-xl">
              {status?.currentAction || "Geen actieve taak"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Year Selector Buttons */}
            <div className="flex items-center gap-1 bg-background/80 p-1 rounded-xl border border-border/60">
              {[2021, 2022, 2023, 2024, 2025, 2026].map((yr) => {
                const isSelected = selectedYears.includes(yr);
                return (
                  <button
                    key={yr}
                    onClick={() => toggleYear(yr)}
                    disabled={status?.isRunning}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      isSelected
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>

            {status?.isRunning ? (
              <Button
                onClick={handleStopSync}
                variant="destructive"
                size="sm"
                className="rounded-xl font-bold text-xs gap-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Stoppen
              </Button>
            ) : (
              <Button
                onClick={handleStartSync}
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Start Drenthe Scraper
              </Button>
            )}

            <Button
              onClick={handleClearCache}
              disabled={status?.isRunning}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs text-muted-foreground hover:text-rose-600"
            >
              Wis Cache
            </Button>
          </div>
        </div>

        {/* Live Terminal Log Toggle */}
        <div className="mt-4">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-rose-600" />
            {showLogs ? "Verberg live audit logs" : "Toon live audit logs"} ({status?.logs?.length || 0})
          </button>

          {showLogs && (
            <div className="mt-2.5 p-3 rounded-xl bg-zinc-950 text-zinc-200 border border-zinc-800 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1">
              {status?.logs && status.logs.length > 0 ? (
                status.logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-zinc-500 shrink-0">[{log.timestamp}]</span>
                    <span
                      className={
                        log.level === "success"
                          ? "text-emerald-400 font-semibold"
                          : log.level === "warn"
                          ? "text-amber-400 font-semibold"
                          : log.level === "error"
                          ? "text-rose-400 font-bold"
                          : "text-zinc-300"
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-zinc-500 italic">Geen logberichten aanwezig. Klik op 'Start Drenthe Scraper' om te starten.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter & Documents Table */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-600" />
            Geïndexeerde Provinciale Stukken ({totalDocs > 0 ? totalDocs : documents.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Zoek in titels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="h-9 text-xs rounded-xl min-w-[150px]">
                <SelectValue placeholder="Filter op Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle scopes</SelectItem>
                <SelectItem value="Lokaal - Hoogeveen">Lokaal - Hoogeveen</SelectItem>
                <SelectItem value="Provinciebreed">Provinciebreed</SelectItem>
                <SelectItem value="Lokaal - Externe Gemeente">Lokaal - Externe Gemeente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-9 text-xs rounded-xl min-w-[110px]">
                <SelectValue placeholder="Jaartal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle jaren</SelectItem>
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

        {/* Table View */}
        <div className="border border-border/70 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-bold border-b border-border/70">
              <tr>
                <th className="py-2.5 px-3">Datum</th>
                <th className="py-2.5 px-3">Documenttitel & Vergadering</th>
                <th className="py-2.5 px-3">Scope</th>
                <th className="py-2.5 px-3">Filter / Reden (AI / Lijst)</th>
                <th className="py-2.5 px-3 text-right">Actie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoadingDocs ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-600" />
                    Documenten laden...
                  </td>
                </tr>
              ) : paginatedDocs.length > 0 ? (
                paginatedDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      {doc.datum}
                    </td>
                    <td className="py-3 px-3 max-w-md">
                      <div className="font-bold text-foreground line-clamp-1">{doc.titel}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">
                        {doc.gremium_naam} • {doc.meeting_titel}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.scope === "Lokaal - Hoogeveen"
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                            : doc.scope === "Provinciebreed"
                            ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                            : "bg-slate-500/20 text-slate-700 dark:text-slate-400 border border-slate-500/30"
                        }`}
                      >
                        {doc.scope}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <div className="text-[11px] font-semibold text-foreground">{doc.filter_methode}</div>
                      <div className="text-[10.5px] text-muted-foreground line-clamp-1 italic">{doc.reden}</div>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const target = doc.lokaal_pad || doc.source_url;
                            setPreviewDocUrl(`/api/council/drenthe/pdf-proxy?url=${encodeURIComponent(target)}`);
                            setPreviewDocTitle(doc.titel);
                          }}
                          className="h-7 px-2 text-[11px] font-semibold rounded-lg hover:bg-muted"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Bekijk
                        </Button>
                        <a
                          href={doc.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-muted-foreground hover:text-foreground rounded"
                          title="Open originele link op drentsparlement.nl"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground italic">
                    Geen documenten gevonden die voldoen aan de filtercriteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              Pagina {currentPage} van {totalPages} ({documents.length} documenten)
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2 rounded-lg"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* PDF Document Preview Modal */}
      <Dialog open={!!previewDocUrl} onOpenChange={() => setPreviewDocUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6 rounded-2xl">
          <DialogHeader className="pb-2 border-b border-border/80">
            <DialogTitle className="text-lg font-bold text-foreground line-clamp-1">
              {previewDocTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Officiële provinciale publicatie van het Drents Parlement
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full min-h-[550px] bg-muted/30 rounded-xl overflow-hidden mt-3">
            {previewDocUrl && (
              <iframe
                src={previewDocUrl}
                className="w-full h-full border-0 rounded-xl"
                title="Document Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
