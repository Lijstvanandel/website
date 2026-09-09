import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText,
  Folder,
  Star,
  ExternalLink,
  Calendar,
  Layers,
  FileSearch,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Check,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SearchHit, DossierDocument, CouncilSearchResponse } from "@/types/dossier";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  useCouncilPreferences,
  SortByOption,
  PageSizeOption,
} from "@/lib/councilPreferences";

export interface SearchResultsViewProps {
  response?: CouncilSearchResponse | null;
  hits?: SearchHit[];
  totalHits?: number;
  tookMs?: number;
  isLoading?: boolean;
  query: string;
  onOpenDocument: (doc: DossierDocument) => void;
  onSelectDossier: (dossierSlug: string) => void;
  onToggleFavorite?: (doc: DossierDocument) => void;
  onFavoriteToggled?: () => void;
  onClearSearch?: () => void;
  favoritesSet: Set<string>;
}

/**
 * Robust date parser for Dutch/ISO council dates
 */
function parseCouncilDate(dateStr?: string | null): number {
  if (!dateStr) return 0;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return 0;

  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const t = new Date(trimmed).getTime();
    if (!isNaN(t)) return t;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddmmyyyy) {
    const d = new Date(
      parseInt(ddmmyyyy[3], 10),
      parseInt(ddmmyyyy[2], 10) - 1,
      parseInt(ddmmyyyy[1], 10)
    ).getTime();
    if (!isNaN(d)) return d;
  }

  // Year only: 2024
  const yearOnly = trimmed.match(/\b(20\d\d|19\d\d)\b/);
  if (yearOnly) {
    return new Date(parseInt(yearOnly[1], 10), 0, 1).getTime();
  }

  const parsed = Date.parse(trimmed);
  return isNaN(parsed) ? 0 : parsed;
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  response,
  hits: rawHits,
  totalHits: rawTotalHits,
  tookMs: rawTookMs,
  isLoading = false,
  query,
  onOpenDocument,
  onSelectDossier,
  onToggleFavorite,
  onFavoriteToggled,
  onClearSearch,
  favoritesSet,
}) => {
  const { user } = useAuth();
  const { pageSize, sortBy, setPageSize, setSortBy } = useCouncilPreferences();

  const [page, setPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const hits = response?.hits || rawHits || [];
  const tookMs = response?.tookMs ?? rawTookMs;

  // Reset to page 1 whenever query, hits array, or pageSize changes
  useEffect(() => {
    setPage(1);
  }, [query, hits.length, pageSize, sortBy]);

  // Sort hits based on user selection
  const sortedHits = useMemo(() => {
    const list = [...hits];

    switch (sortBy) {
      case "az":
        return list.sort((a, b) => {
          const titleA = (a.title || a.filename || "").toLowerCase();
          const titleB = (b.title || b.filename || "").toLowerCase();
          return titleA.localeCompare(titleB, "nl");
        });

      case "za":
        return list.sort((a, b) => {
          const titleA = (a.title || a.filename || "").toLowerCase();
          const titleB = (b.title || b.filename || "").toLowerCase();
          return titleB.localeCompare(titleA, "nl");
        });

      case "date_desc":
        return list.sort((a, b) => {
          const dateA = parseCouncilDate(a.date);
          const dateB = parseCouncilDate(b.date);
          if (dateA === 0 && dateB > 0) return 1;
          if (dateB === 0 && dateA > 0) return -1;
          if (dateB !== dateA) return dateB - dateA;
          return b.score - a.score;
        });

      case "date_asc":
        return list.sort((a, b) => {
          const dateA = parseCouncilDate(a.date);
          const dateB = parseCouncilDate(b.date);
          if (dateA === 0 && dateB > 0) return 1;
          if (dateB === 0 && dateA > 0) return -1;
          if (dateA !== dateB) return dateA - dateB;
          return b.score - a.score;
        });

      case "relevance":
      default:
        // Default ranking: highest score first
        return list.sort((a, b) => b.score - a.score);
    }
  }, [hits, sortBy]);

  // Pagination calculations
  const totalItems = sortedHits.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentHits = sortedHits.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    const targetPage = Math.min(totalPages, Math.max(1, newPage));
    setPage(targetPage);
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handlePageSizeChange = (newSize: PageSizeOption) => {
    setPageSize(newSize);
    toast.success(`Persoonlijke voorkeur opgeslagen: ${newSize} per pagina`);
  };

  const handleSortChange = (newSort: SortByOption) => {
    setSortBy(newSort);
    const labels: Record<SortByOption, string> = {
      relevance: "Relevantie",
      az: "A tot Z",
      za: "Z tot A",
      date_desc: "Datum: Nieuw naar oud",
      date_asc: "Datum: Oud naar nieuw",
    };
    toast.success(`Sortering gewijzigd naar: ${labels[newSort]}`);
  };

  const handleDocumentClick = (hit: SearchHit) => {
    if (!hit.filename) return;
    const doc: DossierDocument = {
      id: hit.id,
      bestandsnaam: hit.filename,
      titel: hit.title,
      dossier: hit.dossierName || "Overig",
      datum: hit.date || null,
      entiteiten: [],
      relaties: [],
      fileExists: hit.fileExists ?? true,
      fileUrl: hit.fileUrl || `/uploads/documents/${encodeURIComponent(hit.filename)}`,
    };
    onOpenDocument(doc);
  };

  const handleFavoriteClick = async (hit: SearchHit, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hit.filename) return;

    const doc: DossierDocument = {
      id: hit.id,
      bestandsnaam: hit.filename,
      titel: hit.title,
      dossier: hit.dossierName || "Overig",
      datum: hit.date || null,
      entiteiten: [],
      relaties: [],
      fileExists: hit.fileExists ?? true,
      fileUrl: hit.fileUrl || `/uploads/documents/${encodeURIComponent(hit.filename)}`,
    };

    if (onToggleFavorite) {
      onToggleFavorite(doc);
      return;
    }

    if (!user) {
      toast.error("Log in om raadsstukken als favoriet op te slaan.");
      return;
    }

    const token =
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (!token) return;

    try {
      const res = await fetch("/api/council/documents/favorites/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: hit.filename,
          title: hit.title,
          dossier: hit.dossierName,
          date: hit.date,
          fileExists: hit.fileExists,
          fileUrl: hit.fileUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          data.isFavorite
            ? `'${hit.title || hit.filename}' toegevoegd aan favorieten carrousel`
            : `'${hit.title || hit.filename}' verwijderd uit favorieten`
        );
        if (onFavoriteToggled) onFavoriteToggled();
      }
    } catch {
      toast.error("Fout bij bijwerken favoriet");
    }
  };

  const getMatchLabel = (field: SearchHit["matchField"]) => {
    switch (field) {
      case "content":
        return { label: "Inhoud van PDF bestand", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
      case "title":
        return { label: "Titel raadsstuk", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400" };
      case "filename":
        return { label: "Bestandsnaam", bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400" };
      case "description":
        return { label: "Dossier toelichting", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
      case "entities":
        return { label: "Raadslid / Entiteit", bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" };
      case "relations":
        return { label: "Gerelateerd beleid", bg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" };
      default:
        return { label: "Exacte match", bg: "bg-muted text-muted-foreground" };
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div id="council-search-results-loading" className="space-y-3 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span className="animate-pulse">Zoeken in alle dossiers en PDF bestanden...</span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-card border border-border/60 animate-pulse flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-muted shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/4 bg-muted rounded" />
                <div className="h-5 w-3/4 bg-muted rounded" />
                <div className="h-4 w-full bg-muted/70 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (hits.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-3xl bg-card border border-border/80 shadow-xs space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-muted/50 text-muted-foreground flex items-center justify-center mx-auto">
          <FileSearch className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          Geen exacte overeenkomsten gevonden
        </h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          {query
            ? `Geen dossiers of documenten gevonden voor de zoekterm "${query}".`
            : "Geen resultaten die voldoen aan de geselecteerde filters."}{" "}
          Controleer de spelling of verruim de tijdlijn- en bestandsaantalfilters.
        </p>
        {onClearSearch && (
          <Button
            onClick={onClearSearch}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs gap-1.5 mt-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Filters wissen
          </Button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} id="council-search-results-list" className="space-y-3">
      {/* Controls Bar: Results Count, Sorting & Items Per Page Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-card border border-border/80 shadow-xs text-xs">
        {/* Left: Counts and timing */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">
            {totalItems} resultaten gevonden
          </span>
          {tookMs !== undefined && (
            <span className="text-[11px] text-muted-foreground">({tookMs}ms)</span>
          )}
          <span className="text-muted-foreground/60">•</span>
          <span className="text-muted-foreground">
            Toont {startIndex + 1} t/m {endIndex}
          </span>
        </div>

        {/* Right: Sortering en Paginagrootte selector */}
        <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto">
          {/* Sortering */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-[11px] flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-accent" />
              Sorteer:
            </span>
            <select
              id="select-council-search-sort"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortByOption)}
              className="h-8 px-2.5 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-accent cursor-pointer"
            >
              <option value="relevance">Relevantie</option>
              <option value="az">Titel (A tot Z)</option>
              <option value="za">Titel (Z tot A)</option>
              <option value="date_desc">Datum (Nieuw naar oud)</option>
              <option value="date_asc">Datum (Oud naar nieuw)</option>
            </select>
          </div>

          {/* Paginagrootte (10, 20, 50) */}
          <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-xl border border-border/60">
            <span className="text-[11px] text-muted-foreground pl-2 pr-1">Per pagina:</span>
            {([10, 20, 50] as PageSizeOption[]).map((size) => (
              <button
                key={size}
                id={`btn-pagesize-${size}`}
                type="button"
                onClick={() => handlePageSizeChange(size)}
                className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all ${
                  pageSize === size
                    ? "bg-accent text-accent-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                }`}
                title={`Toon ${size} resultaten per pagina (opgeslagen in persoonlijke instellingen)`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="grid grid-cols-1 gap-2.5">
        {currentHits.map((hit, index) => {
          const isDoc = hit.type === "document";
          const matchMeta = getMatchLabel(hit.matchField);
          const isFav = isDoc && hit.filename ? favoritesSet.has(hit.filename.toLowerCase().trim()) : false;

          return (
            <div
              key={`${hit.type}-${hit.id}-${index}`}
              onClick={() => {
                if (isDoc) {
                  handleDocumentClick(hit);
                } else if (hit.dossierSlug) {
                  onSelectDossier(hit.dossierSlug);
                }
              }}
              className="group relative p-3.5 sm:p-4 rounded-2xl bg-card border border-border/70 hover:border-accent/60 shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer text-left"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: Icon & Main Content */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isDoc
                        ? "bg-red-500/10 text-red-500"
                        : "bg-accent/10 text-accent"
                    }`}
                  >
                    {isDoc ? <FileText className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Header tags: Type, MatchField, Dossier name */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full ${
                          isDoc
                            ? "bg-muted text-muted-foreground"
                            : "bg-accent/15 text-accent"
                        }`}
                      >
                        {isDoc ? "Raadsstuk / Document" : "Dossier"}
                      </span>

                      <span className={`px-2 py-0.5 rounded-full font-medium ${matchMeta.bg}`}>
                        {matchMeta.label}
                      </span>

                      {hit.dossierName && (
                        <span className="text-muted-foreground truncate max-w-[200px]">
                          • {hit.dossierName}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors leading-snug">
                      {hit.title}
                    </h4>

                    {/* Snippet with exact phrase mark */}
                    {hit.snippet && (
                      <p
                        className="text-xs text-muted-foreground leading-relaxed line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: hit.snippet }}
                      />
                    )}

                    {/* Metadata Footer: Date, File count, Filename */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                      {hit.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {hit.date}
                        </span>
                      )}

                      {hit.documentCount !== undefined && (
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {hit.documentCount} stukken
                        </span>
                      )}

                      {isDoc && hit.filename && (
                        <span className="font-mono text-[10px] truncate max-w-[240px]">
                          {hit.filename}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions & Star button */}
                <div className="flex items-center gap-1.5 shrink-0 self-start">
                  {isDoc && (
                    <button
                      type="button"
                      onClick={(e) => handleFavoriteClick(hit, e)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                        isFav
                          ? "bg-amber-500/20 text-amber-500"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                      title={isFav ? "Verwijder uit favorieten" : "Voeg toe aan favorieten carrousel"}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          isFav ? "fill-amber-500 text-amber-500" : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 rounded-xl text-xs font-semibold group-hover:bg-accent group-hover:text-accent-foreground transition-all gap-1"
                  >
                    <span>{isDoc ? "Bekijk" : "Open"}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border text-xs text-muted-foreground">
          <div>
            Pagina <strong className="text-foreground">{safePage}</strong> van{" "}
            <strong className="text-foreground">{totalPages}</strong> (
            {totalItems} items in totaal)
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              id="btn-search-pagination-prev"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => handlePageChange(safePage - 1)}
              className="h-8 px-2.5 text-xs rounded-xl"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Vorige
            </Button>

            {/* Windowed Page Number Buttons */}
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pNum = i + 1;
                if (
                  pNum === 1 ||
                  pNum === totalPages ||
                  (pNum >= safePage - 2 && pNum <= safePage + 2)
                ) {
                  return (
                    <button
                      key={pNum}
                      onClick={() => handlePageChange(pNum)}
                      className={`h-8 w-8 rounded-xl text-xs font-semibold transition-colors ${
                        safePage === pNum
                          ? "bg-accent text-accent-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                }
                if (pNum === safePage - 3 || pNum === safePage + 3) {
                  return (
                    <span key={pNum} className="px-1 text-muted-foreground">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <Button
              id="btn-search-pagination-next"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => handlePageChange(safePage + 1)}
              className="h-8 px-2.5 text-xs rounded-xl"
            >
              Volgende
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
