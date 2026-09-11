import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  FolderPlus,
  Upload,
  Calendar,
  Layers,
  FileText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Filter,
  RefreshCw,
  FolderOpen,
  FolderEdit,
  Edit3,
  MapPin,
  FileSpreadsheet,
  AlertTriangle,
  FolderTree,
  Download,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DossierBulkUploadModal } from "./DossierBulkUploadModal";
import { MissingFilesExportModal } from "./MissingFilesExportModal";
import { CreateDossierModal } from "./CreateDossierModal";
import { EditDossierModal } from "./EditDossierModal";
import { DossierDetail } from "./DossierDetail";
import { FavoritesCarousel } from "./FavoritesCarousel";
import { MeiliSearchBar, type SearchFilterState } from "./MeiliSearchBar";
import { SearchResultsView } from "./SearchResultsView";
import { DossierDocumentViewer } from "./DossierDocumentViewer";
import type { Dossier, DossierDocument, SearchHit, CouncilSearchResponse, DocumentFavorite } from "@/types/dossier";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  useCouncilPreferences,
  type SortByOption,
  type PageSizeOption,
} from "@/lib/councilPreferences";

interface DossierOverviewProps {
  initialDossierSlug?: string | null;
  initialWijkSlug?: string | null;
}

export const DossierOverview: React.FC<DossierOverviewProps> = ({
  initialDossierSlug,
  initialWijkSlug,
}) => {
  const { user } = useAuth();
  const isCouncilOrAdmin = Boolean(
    user && (user.role === "admin" || user.role === "raadslid" || user.role === "fractielid")
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const { pageSize, sortBy, setPageSize, setSortBy } = useCouncilPreferences();

  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<{
    totalDossiers: number;
    totalDocuments: number;
    totalUploadedFiles: number;
  }>({
    totalDossiers: 0,
    totalDocuments: 0,
    totalUploadedFiles: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [hasFilesOnly, setHasFilesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Meilisearch & advanced filter state
  const [searchFilters, setSearchFilters] = useState<SearchFilterState>({
    query: "",
    exactPhrase: true,
    startDate: "",
    endDate: "",
    minFiles: 0,
    maxFiles: 35,
    category: "all",
    hasFilesOnly: false,
    type: "all",
  });
  const [searchResponse, setSearchResponse] = useState<CouncilSearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Favorites carousel sync state
  const [favoritesRefresh, setFavoritesRefresh] = useState(0);
  const [favoritesSet, setFavoritesSet] = useState<Set<string>>(new Set());

  // Document viewer modal
  const [activeViewerDoc, setActiveViewerDoc] = useState<DossierDocument | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Check if search or custom filters are currently active
  const isSearchActive = Boolean(
    searchFilters.query.trim() ||
      searchFilters.startDate ||
      searchFilters.endDate ||
      searchFilters.minFiles > 0 ||
      searchFilters.maxFiles < 35 ||
      searchFilters.category !== "all" ||
      searchFilters.hasFilesOnly ||
      searchFilters.type !== "all"
  );

  // Selected dossier for drill-down view (from query param or prop)
  const urlDossier =
    searchParams.get("dossier") ||
    initialDossierSlug ||
    searchParams.get("subdossier") ||
    null;
  const [activeDossierSlug, setActiveDossierSlug] = useState<string | null>(urlDossier);

  useEffect(() => {
    const qDossier =
      searchParams.get("dossier") ||
      initialDossierSlug ||
      searchParams.get("subdossier") ||
      null;
    if (qDossier && qDossier !== activeDossierSlug) {
      setActiveDossierSlug(qDossier);
    }
  }, [searchParams, initialDossierSlug]);

  const handleSelectDossier = (slug: string) => {
    setActiveDossierSlug(slug);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("dossier", slug);
      return next;
    });
  };

  const handleBackToOverview = () => {
    setActiveDossierSlug(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("dossier");
      next.delete("subdossier");
      return next;
    });
    fetchDossiers();
  };

  // Modals
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isMissingFilesModalOpen, setIsMissingFilesModalOpen] = useState(false);
  const [isCreateDossierOpen, setIsCreateDossierOpen] = useState(false);
  const [isEditDossierOpen, setIsEditDossierOpen] = useState(false);
  const [editingDossier, setEditingDossier] = useState<Dossier | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [filesystemScan, setFilesystemScan] = useState<{
    totalFiles: number;
    rootCount: number;
    waterschapCount: number;
    overijsselCount: number;
    metadataCount: number;
    needsSync: boolean;
  } | null>(null);
  const [isSyncingFilesystem, setIsSyncingFilesystem] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<{
    isRunning: boolean;
    total: number;
    processed: number;
    newlyClassified: number;
    alreadyProcessed: number;
    activeFile: string;
    logs: string[];
  } | null>(null);

  const fetchBulkStatus = useCallback(async () => {
    const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
    try {
      const res = await fetch("/api/council/classify-bulk-status", {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBulkStatus(data);
        if (data && data.isRunning) {
          setIsClassifying(true);
        } else {
          setIsClassifying(false);
        }
      }
    } catch (err) {
      console.error("Fout bij ophalen bulkstatus:", err);
    }
  }, []);

  useEffect(() => {
    fetchBulkStatus();
    const interval = setInterval(() => {
      fetchBulkStatus();
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchBulkStatus]);

  const handleBulkClassify = async () => {
    setIsClassifying(true);
    const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
    try {
      const res = await fetch("/api/council/classify-bulk-documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ force: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fout bij bulk-classificatie");
      }
      toast.info("Bulk-classificatie gestart in de achtergrond.");
      fetchBulkStatus();
    } catch (err: any) {
      toast.error(err.message || "Fout bij uitvoeren bulk-classificatie");
      setIsClassifying(false);
    }
  };

  const handleCancelBulkClassify = async () => {
    const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
    try {
      const res = await fetch("/api/council/classify-bulk-cancel", {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (res.ok) {
        toast.success("Bulk-classificatie wordt geannuleerd...");
        fetchBulkStatus();
      }
    } catch (err: any) {
      toast.error("Kon annulering niet verzenden");
    }
  };

  const fetchFilesystemScanStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/council/filesystem-scan-status");
      if (res.ok) {
        const data = await res.json();
        if (data.diskStats) {
          setFilesystemScan({
            totalFiles: data.diskStats.totalFiles,
            rootCount: data.diskStats.rootCount,
            waterschapCount: data.diskStats.waterschapCount,
            overijsselCount: data.diskStats.overijsselCount,
            metadataCount: data.metadataCount,
            needsSync: !!data.needsSync,
          });
        }
      }
    } catch (_e) {
      // Ignore background filesystem scan fetch errors
    }
  }, []);

  useEffect(() => {
    fetchFilesystemScanStatus();
  }, [fetchFilesystemScanStatus]);

  const handleSyncFilesystem = async () => {
    setIsSyncingFilesystem(true);
    const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
    try {
      const res = await fetch("/api/council/sync-filesystem-documents", {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fout bij synchroniseren");
      }
      toast.success(data.message || "Serverbestanden succesvol gesynchroniseerd!");
      await fetchFilesystemScanStatus();
      await fetchDossiers();
    } catch (err: any) {
      toast.error(err.message || "Fout bij synchroniseren serverbestanden");
    } finally {
      setIsSyncingFilesystem(false);
    }
  };

  const fetchDossiers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy: sortBy,
        search,
        category: selectedCategory === "all" ? "" : selectedCategory,
        hasFiles: hasFilesOnly ? "true" : "false",
      });

      const res = await fetch(`/api/council/dossiers?${params.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error("Kon dossiers niet ophalen");
      }

      const data = await res.json();
      setDossiers(data.dossiers || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
      setCategories(data.categories || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Fout bij ophalen dossiers");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, search, selectedCategory, hasFilesOnly]);

  useEffect(() => {
    fetchDossiers();
  }, [fetchDossiers]);

  // Reset page when search or filters change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setPage(1);
  };

  // Fetch user favorites list to populate favoritesSet
  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavoritesSet(new Set());
      return;
    }
    const token =
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/council/documents/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const set = new Set<string>();
        for (const item of data.favorites || []) {
          if (item.filename) set.add(item.filename.toLowerCase().trim());
        }
        setFavoritesSet(set);
      }
    } catch {
      // Ignore background error
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites, favoritesRefresh]);

  // Execute search when searchFilters change
  useEffect(() => {
    if (!isSearchActive) {
      setSearchResponse(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const token =
          localStorage.getItem("auth_token") ||
          sessionStorage.getItem("auth_token") ||
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        const params = new URLSearchParams({
          q: searchFilters.query,
          exact: searchFilters.exactPhrase ? "true" : "false",
          startDate: searchFilters.startDate,
          endDate: searchFilters.endDate,
          minFiles: searchFilters.minFiles.toString(),
          maxFiles: searchFilters.maxFiles.toString(),
          category: searchFilters.category,
          hasFiles: searchFilters.hasFilesOnly ? "true" : "false",
          type: searchFilters.type,
        });

        const res = await fetch(`/api/council/search?${params.toString()}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.ok) {
          const data: CouncilSearchResponse = await res.json();
          setSearchResponse(data);
        } else {
          setSearchResponse(null);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [
    isSearchActive,
    searchFilters.query,
    searchFilters.exactPhrase,
    searchFilters.startDate,
    searchFilters.endDate,
    searchFilters.minFiles,
    searchFilters.maxFiles,
    searchFilters.category,
    searchFilters.hasFilesOnly,
    searchFilters.type,
  ]);

  const handleOpenDocument = (doc: {
    bestandsnaam: string;
    titel: string;
    dossier?: string;
    datum?: string | null;
    fileExists?: boolean;
    fileUrl?: string;
    fileSize?: number;
  }) => {
    setActiveViewerDoc({
      bestandsnaam: doc.bestandsnaam,
      titel: doc.titel,
      dossier: doc.dossier || "Dossier",
      datum: doc.datum || undefined,
      fileExists: doc.fileExists ?? true,
      fileUrl: doc.fileUrl,
      fileSize: doc.fileSize,
    });
    setIsViewerOpen(true);
  };

  const handleToggleFavorite = async (doc: {
    bestandsnaam: string;
    titel: string;
    dossier?: string;
    datum?: string | null;
    fileExists?: boolean;
    fileUrl?: string;
    fileSize?: number;
  }) => {
    if (!user) {
      toast.error("Log in om raadsstukken als favoriet te bewaren.");
      return;
    }
    const token =
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");
    if (!token) return;

    const fnKey = doc.bestandsnaam.toLowerCase().trim();
    const willBeFav = !favoritesSet.has(fnKey);

    // Optimistic state
    setFavoritesSet((prev) => {
      const next = new Set(prev);
      if (willBeFav) next.add(fnKey);
      else next.delete(fnKey);
      return next;
    });

    try {
      const res = await fetch("/api/council/documents/favorites/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: doc.bestandsnaam,
          title: doc.titel,
          dossier: doc.dossier,
          date: doc.datum,
          fileExists: doc.fileExists,
          fileUrl: doc.fileUrl,
          fileSize: doc.fileSize,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFavoritesRefresh((r) => r + 1);
        toast.success(
          data.isFavorite
            ? `'${doc.titel || doc.bestandsnaam}' toegevoegd aan favorieten carrousel`
            : `'${doc.titel || doc.bestandsnaam}' verwijderd uit favorieten`
        );
      } else {
        fetchFavorites();
      }
    } catch {
      fetchFavorites();
      toast.error("Fout bij bijwerken favoriet");
    }
  };

  const handleFilterChange = useCallback((updated: Partial<SearchFilterState>) => {
    setSearchFilters((prev) => ({ ...prev, ...updated }));
  }, []);

  const handleResetSearch = () => {
    setSearchFilters({
      query: "",
      exactPhrase: true,
      startDate: "",
      endDate: "",
      minFiles: 0,
      maxFiles: 35,
      category: "all",
      hasFilesOnly: false,
      type: "all",
    });
    setSearchResponse(null);
  };

  if (activeDossierSlug) {
    return (
      <DossierDetail
        dossierSlug={activeDossierSlug}
        initialSubdossierSlug={searchParams.get("subdossier") || null}
        onBack={handleBackToOverview}
      />
    );
  }

  return (
    <div id="dossier-overview-page" className="space-y-6">
      {/* Top Banner with Actions */}
      <div className="bg-card border border-border p-6 rounded-3xl shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wider mb-1">
              <FolderOpen className="w-4 h-4" />
              {isCouncilOrAdmin ? "Raadspaneel Dossiersysteem" : "Openbaar Dossierarchief"}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Raadsdossiers & Stukkenarchief
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              {isCouncilOrAdmin
                ? "Interactief netwerk van gemeentelijke dossiers, besluitvormingslijnen en gekoppelde raadsstukken uit de Steenwijkerlandse raad."
                : "Bekijk gemeentelijke dossiers, besluitvorming, tijdlijnen en officiële raadsstukken van Steenwijkerland en haar wijken en kernen."}
            </p>
          </div>

          {isCouncilOrAdmin && (
            <div className="shrink-0 flex items-center gap-2">
              <Button
                id="btn-open-create-dossier"
                onClick={() => setIsCreateDossierOpen(true)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold h-9 rounded-xl shadow-xs"
              >
                <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                Dossier Aanmaken
              </Button>
            </div>
          )}
        </div>

        {/* Global Beheer & Synchronisatie Toolbar */}
        {isCouncilOrAdmin && (
          <div className="pt-4 border-t border-border/70 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-1">
              Beheer & Data:
            </span>

            <Button
              id="btn-sync-filesystem-docs"
              onClick={handleSyncFilesystem}
              disabled={isSyncingFilesystem}
              variant="outline"
              className="border-sky-500/40 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 text-xs font-semibold h-8 rounded-xl shadow-2xs"
              title="Scan direct alle 5000+ fysieke bestanden op de server en neem ze op in de master metadata catalogus"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncingFilesystem ? 'animate-spin' : ''}`} />
              {isSyncingFilesystem ? "Scannen..." : "Serverbestanden Scannen"}
              {filesystemScan && (
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${filesystemScan.needsSync ? 'bg-amber-500 text-white animate-pulse' : 'bg-sky-500/20 text-sky-600 dark:text-sky-300'}`}>
                  {filesystemScan.totalFiles > 0 ? `${filesystemScan.totalFiles}` : "Scan"}
                </span>
              )}
            </Button>

            <Button
              id="btn-open-bulk-upload"
              onClick={() => setIsBulkUploadOpen(true)}
              variant="outline"
              className="border-accent/40 text-accent hover:bg-accent/15 text-xs font-semibold h-8 rounded-xl shadow-2xs"
              title="Upload alle bestanden herkenbaar door de metadata in één keer"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Documenten Bulk-Uploaden
            </Button>

            <Button
              id="btn-run-bulk-classify"
              onClick={handleBulkClassify}
              disabled={isClassifying}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 rounded-xl shadow-2xs"
              title="Breng alle documenten in overijssel, waterschap en algemene uploads samen in dossiers op basis van de taxonomie-richtlijnen"
            >
              <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${isClassifying ? 'animate-spin' : ''}`} />
              {isClassifying ? "Samenbrengen..." : "Breng Samen in Dossiers"}
            </Button>

            <a
              id="btn-download-master-csv"
              href="/api/council/metadata.csv"
              download
              className="inline-flex items-center justify-center border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold h-8 px-3 rounded-xl shadow-2xs transition-colors"
              title="Download het complete master CSV-bestand met alle geregistreerde bestanden"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              Complete CSV
            </a>

            <Button
              id="btn-export-missing-files"
              onClick={() => setIsMissingFilesModalOpen(true)}
              variant="outline"
              className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-semibold h-8 rounded-xl shadow-2xs"
              title="Exporteer en bekijk de raadsstukken die gekoppeld zijn maar ontbreken op de server"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              Ontbrekende Bestanden
              {stats.totalDocuments > stats.totalUploadedFiles && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                  {stats.totalDocuments - stats.totalUploadedFiles}
                </span>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Alert banner if physical files on disk exceed metadata catalog */}
      {isCouncilOrAdmin && filesystemScan && filesystemScan.needsSync && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                Serverbestanden niet volledig gesynchroniseerd ({filesystemScan.totalFiles} bestanden op server vs {filesystemScan.metadataCount} in catalogus)
              </p>
              <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                Er staan {filesystemScan.totalFiles} documenten op de server (waarvan {filesystemScan.rootCount} algemeen, {filesystemScan.waterschapCount} waterschap, {filesystemScan.overijsselCount} overijssel).
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSyncFilesystem}
            disabled={isSyncingFilesystem}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncingFilesystem ? 'animate-spin' : ''}`} />
            {isSyncingFilesystem ? "Synchroniseren..." : "Nu Alles Synchroniseren"}
          </Button>
        </div>
      )}
      
      {/* Realtime Bulk Classification Progress Panel */}
      {bulkStatus && (bulkStatus.isRunning || bulkStatus.processed > 0) && (
        <div className="bg-card border-2 border-emerald-600/20 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Sparkles className={`w-5 h-5 ${bulkStatus.isRunning ? "animate-spin" : ""}`} />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm sm:text-base flex items-center gap-2">
                  Dossier Samenbrengingsproces (Taxonomie-AI)
                  {!bulkStatus.isRunning && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full dark:bg-emerald-950 dark:text-emerald-300">
                      Voltooid
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bulkStatus.isRunning 
                    ? `Actief bezig met analyseren en classificeren van bestanden volgens de Steenwijkerlandse datataxonomie...` 
                    : "Alle bestanden zijn geanalyseerd en ingedeeld volgens de ontologische routeringsregels."}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {bulkStatus.isRunning ? (
                <Button 
                  onClick={handleCancelBulkClassify}
                  variant="destructive"
                  className="h-8 text-xs font-semibold rounded-xl px-3"
                >
                  Annuleren
                </Button>
              ) : (
                <Button 
                  onClick={() => setBulkStatus(null)}
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-full"
                >
                  ✕
                </Button>
              )}
            </div>
          </div>

          {/* Counts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-2xl border border-border">
            <div className="text-center p-2">
              <span className="block text-[11px] text-muted-foreground font-medium">Voortgang</span>
              <span className="text-lg font-bold text-foreground">
                {bulkStatus.processed} <span className="text-xs text-muted-foreground">/ {bulkStatus.total}</span>
              </span>
            </div>
            <div className="text-center p-2 border-l border-border">
              <span className="block text-[11px] text-muted-foreground font-medium">Nieuw Ingedeeld</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {bulkStatus.newlyClassified}
              </span>
            </div>
            <div className="text-center p-2 border-l border-border">
              <span className="block text-[11px] text-muted-foreground font-medium">Reeds Verwerkt</span>
              <span className="text-lg font-bold text-muted-foreground">
                {bulkStatus.alreadyProcessed}
              </span>
            </div>
            <div className="text-center p-2 border-l border-border">
              <span className="block text-[11px] text-muted-foreground font-medium">Status</span>
              <span className="text-sm font-bold flex items-center justify-center gap-1.5 mt-1">
                {bulkStatus.isRunning ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    <span className="text-emerald-600 dark:text-emerald-400">Bezig...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" />
                    <span className="text-foreground">Klaar</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          {bulkStatus.total > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground px-1">
                <span className="truncate max-w-[70%]">
                  {bulkStatus.activeFile ? `Verwerkt nu: ${bulkStatus.activeFile}` : "Bestanden verwerkt"}
                </span>
                <span>
                  {Math.round((bulkStatus.processed / bulkStatus.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border border-border">
                <div 
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${(bulkStatus.processed / bulkStatus.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Realtime Terminal Log */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-foreground rounded-full" />
              Activiteitenlog (Realtime)
            </span>
            <div className="bg-neutral-900 text-neutral-100 font-mono text-[11px] p-4 rounded-xl h-44 overflow-y-auto space-y-1 border border-neutral-800 shadow-inner scrollbar-thin scrollbar-thumb-neutral-800">
              {bulkStatus.logs && bulkStatus.logs.length > 0 ? (
                bulkStatus.logs.map((log, index) => (
                  <div key={index} className="leading-relaxed whitespace-pre-wrap select-text selection:bg-emerald-600/50">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-neutral-500 italic">Nog geen logs beschikbaar...</div>
              )}
              {/* Scroll anchor */}
              <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} />
            </div>
          </div>
        </div>
      )}
      
      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Totaal Dossiers</span>
            <Layers className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.totalDossiers}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Gedefinieerde dossiers & beleidsthema's
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Gekoppelde Raadsstukken</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.totalDocuments}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[11px] text-muted-foreground">
              Stukken in metadata netwerkgraaf
            </span>
            {stats.totalDocuments > stats.totalUploadedFiles && (
              <button
                onClick={() => setIsMissingFilesModalOpen(true)}
                className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                title="Klik om ontbrekende bestanden te exporteren"
              >
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                {stats.totalDocuments - stats.totalUploadedFiles} ontbreken
              </button>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">PDF's Live op Server</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.totalUploadedFiles}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[11px] text-muted-foreground">
              Fysiek aanwezig en direct leesbaar
            </span>
            {stats.totalDocuments > stats.totalUploadedFiles && (
              <button
                onClick={() => setIsMissingFilesModalOpen(true)}
                className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:underline"
              >
                Exporteer audit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Missing Files Reconciliation Banner */}
      {stats.totalDocuments > stats.totalUploadedFiles && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                <span className="text-amber-700 dark:text-amber-400">
                  {stats.totalDocuments - stats.totalUploadedFiles} raadsstukken gekoppeld zonder fysiek PDF-bestand
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                  Audit vereist
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                Er zijn {stats.totalDocuments} stukken gekoppeld in de metadata graaf, maar slechts {stats.totalUploadedFiles} bestanden aanwezig op de server. Download een Excel (CSV) export om exact te zien welke bestandsnamen ontbreken.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              size="sm"
              onClick={() => setIsMissingFilesModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-9 rounded-xl shadow-xs"
              id="btn-open-missing-files-modal"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
              Exporteer Ontbrekende Bestanden ({stats.totalDocuments - stats.totalUploadedFiles})
            </Button>
          </div>
        </div>
      )}

      {/* 1. Favorites Carousel (positioned directly above the search bar as requested) */}
      <FavoritesCarousel
        key={`fav-carousel-${favoritesRefresh}`}
        onOpenDocument={handleOpenDocument}
        onSelectDossier={handleSelectDossier}
      />

      {/* 2. MeiliSearch & Advanced Filters Bar */}
      <MeiliSearchBar
        filters={searchFilters}
        categories={categories}
        onFilterChange={handleFilterChange}
        onChange={handleFilterChange}
        onResetFilters={handleResetSearch}
        onReset={handleResetSearch}
        onRefreshAll={() => {
          fetchDossiers();
          fetchFavorites();
        }}
        isSearching={searchLoading}
        searchStats={
          searchResponse
            ? {
                tookMs: searchResponse.tookMs,
                totalHits: searchResponse.totalHits,
                documentsCount: searchResponse.totalDocuments ?? searchResponse.documents?.length ?? 0,
                dossiersCount: searchResponse.totalDossiers ?? searchResponse.dossiers?.length ?? 0,
              }
            : undefined
        }
      />

      {/* 3. Search Results OR Standard Dossier Grid */}
      {isSearchActive ? (
        <SearchResultsView
          response={searchResponse}
          isLoading={searchLoading}
          query={searchFilters.query}
          favoritesSet={favoritesSet}
          onOpenDocument={handleOpenDocument}
          onSelectDossier={handleSelectDossier}
          onToggleFavorite={handleToggleFavorite}
          onClearSearch={handleResetSearch}
        />
      ) : (
        <>
          {/* Controls Bar for Dossier Grid: Counts, Sorting & Page Size */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-card border border-border/80 shadow-xs text-xs mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">
                {totalCount} dossiers
              </span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-muted-foreground">
                Toont {(page - 1) * pageSize + 1} t/m {Math.min(page * pageSize, totalCount)}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px]">Sorteer:</span>
                <select
                  id="select-dossiers-sort"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortByOption);
                    setPage(1);
                  }}
                  className="h-8 px-2.5 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-accent cursor-pointer"
                >
                  <option value="az">Titel (A tot Z)</option>
                  <option value="za">Titel (Z tot A)</option>
                  <option value="date_desc">Datum (Nieuw naar oud)</option>
                  <option value="date_asc">Datum (Oud naar nieuw)</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-xl border border-border/60">
                <span className="text-[11px] text-muted-foreground pl-2 pr-1">Per pagina:</span>
                {([10, 20, 50] as PageSizeOption[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size);
                      setPage(1);
                    }}
                    className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all ${
                      pageSize === size
                        ? "bg-accent text-accent-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                    }`}
                    title={`Toon ${size} dossiers per pagina`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dossier Tiles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 py-8">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-3xl h-80 animate-pulse"
            />
          ))}
        </div>
      ) : dossiers.length === 0 ? (
        <div className="p-12 text-center bg-card border border-border rounded-3xl my-6">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-bold text-foreground mb-1">Geen dossiers gevonden</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
            Geen dossiers die voldoen aan uw zoekopdracht of filter. Probeer een andere term of maak een nieuw dossier aan.
          </p>
          <Button
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
              setHasFilesOnly(false);
            }}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs"
          >
            Filters wissen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {dossiers.map((dossier) => (
            <div
              key={dossier.id}
              id={`dossier-card-${dossier.slug}`}
              onClick={() => handleSelectDossier(dossier.slug)}
              className="group bg-card border border-border rounded-3xl overflow-hidden hover:border-accent/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer"
            >
              <div>
                {/* Thumbnail Header */}
                <div className="relative h-44 w-full bg-muted overflow-hidden">
                  <img
                    src={dossier.thumbnail}
                    alt={dossier.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Badges on image */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-black/60 text-white backdrop-blur-xs border border-white/20">
                      {dossier.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {dossier.wijkNaam && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/90 text-accent-foreground flex items-center gap-1 shadow-xs">
                          <MapPin className="w-2.5 h-2.5" />
                          {dossier.wijkNaam}
                        </span>
                      )}
                      {dossier.isCustom && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-foreground shadow-xs">
                          Aangemaakt
                        </span>
                      )}
                      {isCouncilOrAdmin && (
                        <button
                          type="button"
                          title="Dossier bewerken"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDossier(dossier);
                            setIsEditDossierOpen(true);
                          }}
                          className="p-1.5 rounded-full bg-black/60 text-white hover:bg-accent hover:text-accent-foreground backdrop-blur-xs border border-white/20 transition-all opacity-80 group-hover:opacity-100"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                    <div className="flex items-center gap-2 font-medium drop-shadow-xs">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {dossier.documentCount} {dossier.documentCount === 1 ? "stuk" : "stukken"}
                      </span>
                      {dossier.subdossierCount ? (
                        <span className="flex items-center gap-1 text-[11px] bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-xs text-white/90">
                          <FolderTree className="w-3 h-3 text-accent" />
                          {dossier.subdossierCount} subdossiers
                        </span>
                      ) : null}
                    </div>
                    {dossier.uploadedCount > 0 ? (
                      <span className="flex items-center gap-1 font-semibold text-emerald-300 drop-shadow-xs text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {dossier.uploadedCount} PDF's live
                      </span>
                    ) : (
                      <span className="text-[11px] text-white/70">
                        In afwachting van upload
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5">
                  {dossier.dateRange.start && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1.5 font-medium">
                      <Calendar className="w-3 h-3" />
                      {dossier.dateRange.start} {dossier.dateRange.end && `– ${dossier.dateRange.end}`}
                    </div>
                  )}

                  <h3 className="font-bold text-foreground text-base group-hover:text-accent transition-colors line-clamp-2 leading-snug mb-2">
                    {dossier.title}
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-4">
                    {dossier.description}
                  </p>

                  {/* Tags */}
                  {dossier.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {dossier.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-muted text-muted-foreground border border-border"
                        >
                          #{tag}
                        </span>
                      ))}
                      {dossier.tags.length > 3 && (
                        <span className="text-[10px] text-muted-foreground self-center">
                          +{dossier.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingDossier(dossier);
                    setIsEditDossierOpen(true);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-accent font-medium flex items-center gap-1 transition-colors"
                >
                  <FolderEdit className="w-3.5 h-3.5" />
                  Bewerken
                </button>
                <span className="text-accent font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Open dossier
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border text-xs text-muted-foreground">
          <div>
            Toont {(page - 1) * pageSize + 1} t/m {Math.min(page * pageSize, totalCount)} van de {totalCount} dossiers
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              id="btn-pagination-prev"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 text-xs rounded-xl"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Vorige
            </Button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pNum = i + 1;
                // Show first, last, and window around current page
                if (
                  pNum === 1 ||
                  pNum === totalPages ||
                  (pNum >= page - 2 && pNum <= page + 2)
                ) {
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`h-8 w-8 rounded-xl text-xs font-semibold transition-colors ${
                        page === pNum
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                }
                if (pNum === page - 3 || pNum === page + 3) {
                  return <span key={pNum} className="px-1 text-muted-foreground">...</span>;
                }
                return null;
              })}
            </div>

            <Button
              id="btn-pagination-next"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2.5 text-xs rounded-xl"
            >
              Volgende
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
        </>
      )}

      {/* Document Viewer Modal */}
      <DossierDocumentViewer
        document={activeViewerDoc}
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          setActiveViewerDoc(null);
        }}
      />

      {/* Bulk Upload Modal */}
      <DossierBulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onUploadSuccess={() => {
          fetchDossiers();
        }}
      />

      {/* Missing Files Export & Audit Modal */}
      <MissingFilesExportModal
        isOpen={isMissingFilesModalOpen}
        onClose={() => setIsMissingFilesModalOpen(false)}
        onOpenBulkUpload={() => setIsBulkUploadOpen(true)}
      />

      {/* Create Dossier Modal */}
      <CreateDossierModal
        isOpen={isCreateDossierOpen}
        onClose={() => setIsCreateDossierOpen(false)}
        onCreated={(newDossier) => {
          fetchDossiers();
          setActiveDossierSlug(newDossier.slug);
        }}
      />

      {/* Edit Dossier Modal */}
      <EditDossierModal
        isOpen={isEditDossierOpen}
        dossier={editingDossier}
        onClose={() => {
          setIsEditDossierOpen(false);
          setEditingDossier(null);
        }}
        onUpdated={() => {
          fetchDossiers();
        }}
        onDeleted={() => {
          fetchDossiers();
        }}
      />
    </div>
  );
};
