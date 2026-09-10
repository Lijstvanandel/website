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
  steenwijkerlandCount: number;
  provinciebreedCount: number;
  externCount: number;
  currentAction: string;
  logs: Array<{ timestamp: string; message: string; level: "info" | "success" | "warn" | "error" }>;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

interface OverijsselDoc {
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

interface OverijsselNotubizManagerProps {
  token?: string;
  onClose?: () => void;
}

export const OverijsselNotubizManager: React.FC<OverijsselNotubizManagerProps> = ({
  token,
  onClose,
}) => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [documents, setDocuments] = useState<OverijsselDoc[]>([]);
  const [totalDocs, setTotalDocs] = useState<number>(0);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [selectedYears, setSelectedYears] = useState<number[]>([2021, 2022, 2023, 2024, 2025, 2026]);
  const [showLogs, setShowLogs] = useState<boolean>(true);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>("");

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/council/overijssel/sync-status", {
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

  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      const params = new URLSearchParams();
      if (scopeFilter !== "all") params.set("scope", scopeFilter);
      if (yearFilter !== "all") params.set("year", yearFilter);
      if (searchQuery.trim()) params.set("query", searchQuery.trim());

      const res = await fetch(`/api/council/overijssel/documents?${params.toString()}`, {
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
      setIsLoadingDocs(false);
    }
  }, [scopeFilter, yearFilter, searchQuery, token]);

  useEffect(() => {
    fetchStatus();
    fetchDocuments();

    pollIntervalRef.current = setInterval(() => {
      fetchStatus();
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchStatus, fetchDocuments]);

  // Refresh docs when sync finishes or progresses
  useEffect(() => {
    if (status?.isRunning) {
      const timer = setTimeout(() => {
        fetchDocuments();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status?.scannedDocuments, fetchDocuments, status?.isRunning]);

  const handleStartSync = async () => {
    try {
      const res = await fetch("/api/council/overijssel/start-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          years: selectedYears,
          forceRescan: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Synchronisatie kon niet worden gestart");
      toast.success("Synchronisatie Provincie Overijssel (OpenRaadsinformatie) gestart!");
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || "Fout bij starten sync");
    }
  };

  const handleCancelSync = async () => {
    try {
      const res = await fetch("/api/council/overijssel/cancel-sync", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) {
        toast.info(data.message || "Synchronisatie geannuleerd");
        fetchStatus();
      }
    } catch (err: any) {
      toast.error(err.message || "Fout bij annuleren");
    }
  };

  const toggleYear = (y: number) => {
    if (selectedYears.includes(y)) {
      if (selectedYears.length > 1) {
        setSelectedYears(selectedYears.filter((item) => item !== y));
      }
    } else {
      setSelectedYears([...selectedYears, y].sort());
    }
  };

  const progressPercent = status?.totalMeetingsFound
    ? Math.min(100, Math.round((status.processedMeetings / status.totalMeetingsFound) * 100))
    : 0;

  return (
    <div id="overijssel-notubiz-manager" className="space-y-6">
      {/* Header & Badges */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Building2 className="w-3.5 h-3.5" />
                Provincie Overijssel
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                OpenRaadsinformatie Overijssel
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                <Sparkles className="w-3 h-3" />
                3-Tier Filter (Zwart/Wit/AI)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              OpenRaadsinformatie Scraper & AI-Filter Provincie Overijssel
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              Automatische synchronisatie van provinciale vergaderstukken via <a href="https://zoek.openraadsinformatie.nl/?organization=overijssel&sort=date_desc" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-mono">OpenRaadsinformatie</a> (2021 – heden). Filtert op de <strong>Zwarte lijst</strong> (externe Twentse/Sallandse steden), <strong>Witte lijst</strong> (kernen Steenwijkerland) en <strong>Gemini Flash AI</strong> voor provinciebreed beleid. Exporteert direct naar <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs text-rose-600 font-mono">raadsstukken_metadata_overijssel.csv</code>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              id="download-overijssel-csv-btn"
              href="/api/council/overijssel/metadata.csv"
              download="raadsstukken_metadata_overijssel.csv"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Download CSV Overzicht
            </a>

            {status?.isRunning ? (
              <Button
                id="cancel-overijssel-sync-btn"
                variant="destructive"
                onClick={handleCancelSync}
                className="gap-1.5"
              >
                <Square className="w-4 h-4" />
                Stop Sync
              </Button>
            ) : (
              <Button
                id="start-overijssel-sync-btn"
                onClick={handleStartSync}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Play className="w-4 h-4" />
                Start NotuBiz Sync (2021 - Heden)
              </Button>
            )}

            <Button
              id="refresh-overijssel-btn"
              variant="outline"
              size="icon"
              onClick={() => {
                fetchStatus();
                fetchDocuments();
                toast.success("Gegevens vernieuwd");
              }}
              title="Vernieuwen"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Year selectors */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Te doorzoeken jaren:</span>
          {[2021, 2022, 2023, 2024, 2025, 2026].map((y) => {
            const isSelected = selectedYears.includes(y);
            return (
              <button
                key={y}
                type="button"
                disabled={status?.isRunning}
                onClick={() => toggleYear(y)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                } ${status?.isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {y}
              </button>
            );
          })}
        </div>

        {/* Sync Progress Bar */}
        {status && (status.isRunning || status.processedMeetings > 0) && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                {status.isRunning && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />}
                {status.currentAction}
              </span>
              <span>
                {status.processedMeetings} / {status.totalMeetingsFound} vergaderingen ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  status.isRunning ? "bg-blue-600" : "bg-emerald-600"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">Totaal Beoordeeld</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {status?.scannedDocuments ?? documents.length}
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
            <div className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Steenwijkerland
            </div>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {status?.steenwijkerlandCount ?? documents.filter((d) => d.scope === "Lokaal - Steenwijkerland").length}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-lg border border-blue-100 dark:border-blue-900/40">
            <div className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Provinciebreed Beleid
            </div>
            <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {status?.provinciebreedCount ?? documents.filter((d) => d.scope === "Provinciebreed").length}
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-100 dark:border-amber-900/40">
            <div className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Genegeerd (Extern)
            </div>
            <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
              {status?.excludedDocuments ?? documents.filter((d) => !d.opslaan).length}
            </div>
          </div>
        </div>
      </div>

      {/* Live Logs Terminal */}
      <div className="bg-slate-900 text-slate-200 rounded-xl border border-slate-800 p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Live Classificatie & Synchronisatie Logs</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLogs(!showLogs)}
            className="text-xs text-slate-400 hover:text-white h-7"
          >
            {showLogs ? "Verberg logs" : "Toon logs"}
          </Button>
        </div>

        {showLogs && (
          <div className="mt-3 max-h-48 overflow-y-auto space-y-1 font-mono text-xs text-slate-300 pr-2">
            {status?.logs && status.logs.length > 0 ? (
              status.logs.map((log, idx) => {
                let colorClass = "text-slate-400";
                if (log.level === "success") colorClass = "text-emerald-400";
                if (log.level === "warn") colorClass = "text-amber-400";
                if (log.level === "error") colorClass = "text-rose-400";
                return (
                  <div key={idx} className="flex items-start gap-2 leading-tight">
                    <span className="text-slate-600 select-none">[{log.timestamp}]</span>
                    <span className={colorClass}>{log.message}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-slate-500 italic py-2">
                Nog geen logs. Klik op 'Start NotuBiz Sync' om te beginnen.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document Search & Filter Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Geklasseerde Provinciale Documenten ({totalDocs})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Zoek in titel, reden, datum..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="w-[180px] text-xs h-9">
                <SelectValue placeholder="Filter op scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle scopes</SelectItem>
                <SelectItem value="Lokaal - Steenwijkerland">Steenwijkerland</SelectItem>
                <SelectItem value="Provinciebreed">Provinciebreed</SelectItem>
                <SelectItem value="Lokaal - Externe Gemeente">Externe Gemeente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[120px] text-xs h-9">
                <SelectValue placeholder="Jaar" />
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

        {/* Documents Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3">Datum</th>
                <th className="py-3 px-3">Titel & Vergadering</th>
                <th className="py-3 px-3">Scope & Status</th>
                <th className="py-3 px-3">Filter Methode & Reden</th>
                <th className="py-3 px-3 text-right">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoadingDocs ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    Documenten laden...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Geen documenten gevonden met de huidige filters.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const isSteenwijk = doc.scope === "Lokaal - Steenwijkerland";
                  const isProvinciebreed = doc.scope === "Provinciebreed";
                  const isExtern = doc.scope === "Lokaal - Externe Gemeente";

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
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : isProvinciebreed
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {doc.scope}
                        </span>
                        {doc.opslaan ? (
                          <span className="block text-[10px] text-emerald-600 mt-0.5">● Opgeslagen</span>
                        ) : (
                          <span className="block text-[10px] text-amber-600 mt-0.5">○ Genegeerd</span>
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
                              NotuBiz
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Preview Modal */}
      <Dialog open={!!previewDocUrl} onOpenChange={() => setPreviewDocUrl(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold line-clamp-1">{previewDocTitle}</DialogTitle>
            <DialogDescription className="text-xs">
              Lokaal opgeslagen provinciaal document uit NotuBiz
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full h-full min-h-0 bg-slate-100 dark:bg-slate-950 rounded-md overflow-hidden">
            {previewDocUrl && (
              <iframe
                src={previewDocUrl}
                title={previewDocTitle}
                className="w-full h-full border-0"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
