import React from "react";
import {
  FileText,
  Folder,
  Star,
  ExternalLink,
  Calendar,
  Layers,
  FileSearch,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SearchHit, DossierDocument, CouncilSearchResponse } from "@/types/dossier";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

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

  const hits = response?.hits || rawHits || [];
  const totalHits = response?.totalHits ?? rawTotalHits ?? hits.length;
  const tookMs = response?.tookMs ?? rawTookMs;

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

  // Results list
  return (
    <div id="council-search-results-list" className="space-y-3">
      {/* Results Subheader */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          <strong className="text-foreground">{totalHits}</strong> resultaten gevonden
          {tookMs !== undefined && <span> in {tookMs}ms</span>}
        </span>
        <span className="text-[11px]">Gerangschikt op relevantie</span>
      </div>

      {/* Results List */}
      <div className="grid grid-cols-1 gap-2.5">
        {hits.map((hit, index) => {
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
    </div>
  );
};
