import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  Search,
  FileSpreadsheet,
  AlertTriangle,
  Upload,
  FileText,
  Layers,
  CheckCircle2,
  Filter,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MissingDocumentDetail {
  id: string;
  bestandsnaam: string;
  titel: string;
  dossier: string;
  dossierSlug: string;
  dossierCategory: string;
  datum: string | null;
  entiteiten: string[];
  relaties: string[];
  linkCount: number;
}

interface UniqueMissingFile {
  bestandsnaam: string;
  titel: string;
  dossiers: Array<{ title: string; slug: string; category: string }>;
  datum: string | null;
  linkCount: number;
}

interface MissingFilesExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBulkUpload?: () => void;
}

export const MissingFilesExportModal: React.FC<MissingFilesExportModalProps> = ({
  isOpen,
  onClose,
  onOpenBulkUpload,
}) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDossiers: 0,
    totalDocuments: 0,
    totalUploadedFiles: 0,
    totalMissingLinks: 0,
    uniqueMissingFilesCount: 0,
  });
  const [missingDocuments, setMissingDocuments] = useState<MissingDocumentDetail[]>([]);
  const [uniqueMissingFiles, setUniqueMissingFiles] = useState<UniqueMissingFile[]>([]);
  const [viewMode, setViewMode] = useState<"unique" | "detailed">("unique");
  const [search, setSearch] = useState("");
  const [selectedDossier, setSelectedDossier] = useState<string>("all");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const fetchMissingData = async () => {
    setLoading(true);
    try {
      const token =
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token") ||
        localStorage.getItem("token");
      const res = await fetch("/api/council/dossiers/missing-files", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Kon ontbrekende documenten niet ophalen");
      const data = await res.json();
      if (data.stats) setStats(data.stats);
      if (data.missingDocuments) setMissingDocuments(data.missingDocuments);
      if (data.uniqueMissingFiles) setUniqueMissingFiles(data.uniqueMissingFiles);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Fout bij ophalen van ontbrekende bestanden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMissingData();
      setPage(1);
    }
  }, [isOpen]);

  // Unique dossiers for filter dropdown
  const dossierOptions = useMemo(() => {
    const set = new Set<string>();
    missingDocuments.forEach((doc) => {
      if (doc.dossier) set.add(doc.dossier);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "nl"));
  }, [missingDocuments]);

  // Filtered lists
  const filteredUniqueFiles = useMemo(() => {
    const q = search.toLowerCase().trim();
    return uniqueMissingFiles.filter((item) => {
      if (selectedDossier !== "all") {
        const matchDossier = item.dossiers.some((d) => d.title === selectedDossier);
        if (!matchDossier) return false;
      }
      if (!q) return true;
      return (
        item.bestandsnaam.toLowerCase().includes(q) ||
        item.titel.toLowerCase().includes(q) ||
        item.dossiers.some((d) => d.title.toLowerCase().includes(q))
      );
    });
  }, [uniqueMissingFiles, search, selectedDossier]);

  const filteredDetailedDocs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return missingDocuments.filter((doc) => {
      if (selectedDossier !== "all" && doc.dossier !== selectedDossier) {
        return false;
      }
      if (!q) return true;
      return (
        doc.bestandsnaam.toLowerCase().includes(q) ||
        doc.titel.toLowerCase().includes(q) ||
        doc.dossier.toLowerCase().includes(q) ||
        (doc.dossierCategory && doc.dossierCategory.toLowerCase().includes(q))
      );
    });
  }, [missingDocuments, search, selectedDossier]);

  // Active items based on current view
  const currentItems = viewMode === "unique" ? filteredUniqueFiles : filteredDetailedDocs;
  const totalPages = Math.ceil(currentItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentItems.slice(start, start + pageSize);
  }, [currentItems, page, pageSize]);

  // Trigger server CSV download
  const handleDownloadCsv = (mode: "unique" | "detailed") => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");
    link.href = `/api/council/dossiers/missing-files?format=csv&mode=${mode}`;
    link.download =
      mode === "unique"
        ? `ontbrekende_raadsstukken_uniek_${timestamp}.csv`
        : `ontbrekende_raadsstukken_koppelingen_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export gestart!");
  };

  // Copy all unique filenames to clipboard
  const handleCopyFilenames = () => {
    const targetList =
      viewMode === "unique"
        ? filteredUniqueFiles.map((f) => f.bestandsnaam)
        : Array.from(new Set(filteredDetailedDocs.map((d) => d.bestandsnaam)));

    if (targetList.length === 0) {
      toast.warning("Geen bestanden in de huidige selectie om te kopiëren");
      return;
    }

    const text = targetList.join("\n");
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 3000);
    toast.success(`${targetList.length} bestandsnamen gekopieerd naar klembord!`);
  };

  // Copy single filename
  const handleCopySingle = (filename: string) => {
    navigator.clipboard.writeText(filename);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2000);
    toast.success(`Bestandsnaam gekopieerd: ${filename}`);
  };

  // Download JSON report
  const handleDownloadJson = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(
        JSON.stringify(
          {
            exportDate: new Date().toISOString(),
            stats,
            uniqueMissingFiles,
            missingDocuments,
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ontbrekende_raadsstukken_audit_${timestamp}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("JSON audit bestand gedownload!");
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-missing-files-export"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card text-card-foreground w-full max-w-5xl rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border flex items-start justify-between gap-4 bg-muted/20">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <span>Ontbrekende Raadsstukken Export & Audit</span>
                {stats.totalMissingLinks > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
                    {stats.totalMissingLinks} koppelingen ontbreken
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                Vergelijking tussen de geregistreerde stukken in de metadata netwerkgraaf en de
                fysieke bestanden live op de server. Download de export om direct te zien welke PDF-bestanden
                nog moeten worden geüpload.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-6 bg-muted/10 border-b border-border">
          <div className="p-3.5 rounded-2xl bg-card border border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1 text-[11px] font-semibold">
              <span>Gekoppeld in Graaf</span>
              <Layers className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-foreground">{stats.totalDocuments}</div>
            <div className="text-[10.5px] text-muted-foreground truncate">
              Stukken in dossiers
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1 text-[11px] font-semibold">
              <span>PDF's Live op Server</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.totalUploadedFiles}
            </div>
            <div className="text-[10.5px] text-muted-foreground truncate">
              Fysiek aanwezig
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1 text-[11px] font-semibold">
              <span>Ontbrekende Koppelingen</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {stats.totalMissingLinks}
            </div>
            <div className="text-[10.5px] text-muted-foreground truncate">
              Verschil gekoppeld vs live
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-border">
            <div className="flex items-center justify-between text-muted-foreground mb-1 text-[11px] font-semibold">
              <span>Unieke PDF Bestanden</span>
              <FileText className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="text-xl font-bold text-foreground">
              {stats.uniqueMissingFilesCount}
            </div>
            <div className="text-[10.5px] text-muted-foreground truncate">
              Dedupliceerde PDF's
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="p-4 sm:px-6 bg-card border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleDownloadCsv("detailed")}
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold h-8.5 rounded-xl shadow-xs"
              title="Exporteer alle regels (inclusief dossiernaam) naar Excel CSV met UTF-8 ondersteuning"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download CSV (Koppelingen)
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDownloadCsv("unique")}
              className="border-border text-foreground hover:bg-muted text-xs font-semibold h-8.5 rounded-xl"
              title="Exporteer alleen unieke bestandsnamen naar CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
              Download CSV (Unieke PDF's)
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyFilenames}
              className="border-border text-foreground hover:bg-muted text-xs font-semibold h-8.5 rounded-xl"
              title="Kopieer alle bestandsnamen naar klembord (1 per regel)"
            >
              {copiedAll ? (
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 mr-1.5" />
              )}
              {copiedAll ? "Gekopieerd!" : "Kopieer Namenlijst"}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownloadJson}
              className="text-xs text-muted-foreground hover:text-foreground h-8.5 rounded-xl"
              title="Download ruwe JSON met audit metadata"
            >
              JSON
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {onOpenBulkUpload && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onOpenBulkUpload();
                }}
                className="border-accent/40 text-accent hover:bg-accent/10 text-xs font-semibold h-8.5 rounded-xl"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Naar Bulk-Uploader
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={fetchMissingData}
              disabled={loading}
              className="h-8.5 w-8.5 p-0 rounded-xl text-muted-foreground hover:text-foreground"
              title="Gegevens verversen"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* View Toggle & Search Filters */}
        <div className="p-4 sm:px-6 bg-muted/20 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 self-start">
            <button
              onClick={() => {
                setViewMode("unique");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "unique"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Unieke Bestanden ({uniqueMissingFiles.length})
            </button>
            <button
              onClick={() => {
                setViewMode("detailed");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "detailed"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Alle Koppelingen ({missingDocuments.length})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 flex-1 sm:justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Zoek op bestandsnaam, titel..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-accent"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="relative w-full sm:w-56">
              <select
                value={selectedDossier}
                onChange={(e) => {
                  setSelectedDossier(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-accent appearance-none cursor-pointer"
              >
                <option value="all">Alle Dossiers ({dossierOptions.length})</option>
                {dossierOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <Filter className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Content Table / List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[260px]">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-accent animate-spin mx-auto" />
              <div className="text-sm font-semibold text-foreground">
                Ontbrekende raadsstukken analyseren...
              </div>
              <p className="text-xs text-muted-foreground">
                Documenten uit dossiers worden vergeleken met de uploads map.
              </p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <div className="text-sm font-bold text-foreground">
                {search || selectedDossier !== "all"
                  ? "Geen ontbrekende bestanden gevonden voor deze filters."
                  : "Geweldig! Geen ontbrekende bestanden gevonden."}
              </div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {search || selectedDossier !== "all"
                  ? "Probeer de zoekopdracht of het geselecteerde dossier aan te passen."
                  : "Alle raadsstukken die gekoppeld zijn in de dossiers zijn fysiek aanwezig op de server."}
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold text-[11px]">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Bestandsnaam</th>
                    <th className="py-2.5 px-3">Titel van het Raadsstuk</th>
                    <th className="py-2.5 px-3">Gekoppeld Dossier</th>
                    <th className="py-2.5 px-3 w-28">Datum</th>
                    <th className="py-2.5 px-3 w-24 text-center">Koppelingen</th>
                    <th className="py-2.5 px-3 w-20 text-right">Actie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedItems.map((item: any, idx: number) => {
                    const rowNumber = (page - 1) * pageSize + idx + 1;
                    const filename: string = item.bestandsnaam;
                    const isUnique = viewMode === "unique";
                    const dossiersText: string = isUnique
                      ? item.dossiers.map((d: any) => d.title).join(", ")
                      : item.dossier;

                    return (
                      <tr
                        key={`${item.id || item.bestandsnaam}-${idx}`}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        <td className="py-2.5 px-3 text-center text-muted-foreground font-mono text-[11px]">
                          {rowNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-foreground max-w-[240px] truncate">
                          <span
                            className="text-amber-700 dark:text-amber-400 font-semibold cursor-pointer hover:underline flex items-center gap-1.5"
                            onClick={() => handleCopySingle(filename)}
                            title={`Klik om '${filename}' te kopiëren`}
                          >
                            <FileText className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                            <span className="truncate">{filename}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-foreground font-medium max-w-[280px] truncate" title={item.titel}>
                          {item.titel}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground max-w-[200px] truncate" title={dossiersText}>
                          <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium border border-border inline-block truncate max-w-full">
                            {dossiersText}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          {item.datum ? (
                            new Date(item.datum).toLocaleDateString("nl-NL")
                          ) : (
                            <span className="text-muted-foreground/60 italic">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            {item.linkCount || 1}x
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopySingle(filename)}
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                            title="Kopieer bestandsnaam"
                          >
                            {copiedFile === filename ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with Pagination */}
        <div className="p-4 sm:px-6 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Toont{" "}
            <span className="font-bold text-foreground">
              {currentItems.length === 0 ? 0 : (page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, currentItems.length)}
            </span>{" "}
            van <span className="font-bold text-foreground">{currentItems.length}</span>{" "}
            {viewMode === "unique" ? "unieke ontbrekende bestanden" : "ontbrekende koppelingen"}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-3 text-xs"
            >
              Vorige
            </Button>
            <span className="text-xs font-semibold px-2">
              Pagina {page} van {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-3 text-xs"
            >
              Volgende
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground ml-2"
            >
              Sluiten
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
