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
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DossierBulkUploadModal } from "./DossierBulkUploadModal";
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
  const urlDossier = searchParams.get("dossier") || initialDossierSlug || null;
  const [activeDossierSlug, setActiveDossierSlug] = useState<string | null>(urlDossier);

  useEffect(() => {
    const qDossier = searchParams.get("dossier") || initialDossierSlug || null;
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
      return next;
    });
    fetchDossiers();
  };

  // Modals
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isCreateDossierOpen, setIsCreateDossierOpen] = useState(false);
  const [isEditDossierOpen, setIsEditDossierOpen] = useState(false);
  const [editingDossier, setEditingDossier] = useState<Dossier | null>(null);

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
        onBack={handleBackToOverview}
      />
    );
  }

  return (
    <div id="dossier-overview-page" className="space-y-6">
      {/* Top Banner with Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wider mb-1">
            <FolderOpen className="w-4 h-4" />
            {isCouncilOrAdmin ? "Raadspaneel Dossiersysteem" : "Openbaar Dossierarchief"}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Raadsdossiers & Stukkenarchief
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            {isCouncilOrAdmin
              ? "Interactief netwerk van gemeentelijke dossiers, besluitvormingslijnen en gekoppelde raadsstukken uit de Steenwijkerlandse raad."
              : "Bekijk gemeentelijke dossiers, besluitvorming, tijdlijnen en officiële raadsstukken van Steenwijkerland en haar wijken en kernen."}
          </p>
        </div>

        {/* Global Action Buttons */}
        {isCouncilOrAdmin && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              id="btn-open-bulk-upload"
              onClick={() => setIsBulkUploadOpen(true)}
              variant="outline"
              className="border-accent/40 text-accent hover:bg-accent/15 text-xs font-semibold h-9 rounded-xl shadow-xs"
              title="Upload alle bestanden herkenbaar door de metadata in één keer"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Documenten Bulk-Uploaden
            </Button>

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
          <span className="text-[11px] text-muted-foreground">
            Stukken in metadata netwerkgraaf
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">PDF's Live op Server</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.totalUploadedFiles}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Fysiek aanwezig en direct leesbaar in viewer
          </span>
        </div>
      </div>

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
                    <span className="flex items-center gap-1.5 font-medium drop-shadow-xs">
                      <FileText className="w-3.5 h-3.5" />
                      {dossier.documentCount} {dossier.documentCount === 1 ? "stuk" : "stukken"}
                    </span>
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
