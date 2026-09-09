import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  Calendar,
  Layers,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export interface SearchFilterState {
  query: string;
  exactPhrase: boolean;
  startDate: string;
  endDate: string;
  minFiles: number;
  maxFiles: number;
  category: string;
  hasFilesOnly: boolean;
  type: "all" | "dossiers" | "documents";
}

export interface MeiliSearchBarProps {
  filters: SearchFilterState;
  onChange?: (updated: Partial<SearchFilterState>) => void;
  onFilterChange?: (updated: Partial<SearchFilterState>) => void;
  onReset?: () => void;
  onResetFilters?: () => void;
  onRefreshAll?: () => void;
  categories: string[];
  totalHits?: number;
  tookMs?: number;
  loading?: boolean;
  isSearching?: boolean;
  searchStats?: {
    tookMs?: number;
    totalHits?: number;
    documentsCount?: number;
    dossiersCount?: number;
  };
}

export const MeiliSearchBar: React.FC<MeiliSearchBarProps> = ({
  filters,
  onChange,
  onFilterChange,
  onReset,
  onResetFilters,
  categories,
  totalHits,
  tookMs,
  loading = false,
  isSearching = false,
  searchStats,
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const effectiveLoading = loading || isSearching;
  const effectiveTookMs = searchStats?.tookMs ?? tookMs;

  const triggerChange = (updated: Partial<SearchFilterState>) => {
    onFilterChange?.(updated);
    onChange?.(updated);
  };

  const triggerReset = () => {
    onResetFilters?.();
    onReset?.();
  };

  // Count active filters (excluding defaults)
  const activeFilterCount = [
    Boolean(filters.startDate),
    Boolean(filters.endDate),
    filters.minFiles > 0,
    filters.maxFiles < 35,
    filters.category !== "all",
    filters.hasFilesOnly,
    filters.type !== "all",
  ].filter(Boolean).length;

  const handleSliderChange = (vals: number[]) => {
    if (vals.length === 2) {
      triggerChange({ minFiles: vals[0], maxFiles: vals[1] });
    } else if (vals.length === 1) {
      triggerChange({ minFiles: vals[0] });
    }
  };

  return (
    <div id="meilisearch-bar-wrapper" className="space-y-3">
      {/* Primary Search Input Row */}
      <div className="relative flex flex-col sm:flex-row items-stretch gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            id="council-fulltext-search-input"
            type="text"
            value={filters.query}
            onChange={(e) => triggerChange({ query: e.target.value })}
            placeholder="Zoek exact op dossiers, besluiten of inhoud van PDF bestanden..."
            className="pl-10 pr-24 h-11 rounded-2xl bg-card border-border shadow-xs text-sm focus-visible:ring-accent"
          />

          {/* Right badges / clear */}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {effectiveLoading ? (
              <span className="text-[11px] text-muted-foreground animate-pulse font-mono">
                Zoeken...
              </span>
            ) : effectiveTookMs !== undefined ? (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground hidden md:inline"
                title={`Zoektijd: ${effectiveTookMs}ms`}
              >
                ⚡ {effectiveTookMs}ms
              </span>
            ) : null}

            {filters.query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => triggerChange({ query: "" })}
                className="h-6 w-6 p-0 rounded-full hover:bg-muted text-muted-foreground"
                title="Wissen"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Filter Toggle Button */}
        <div className="flex items-center gap-1.5">
          <Button
            id="toggle-search-filters-btn"
            type="button"
            variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="h-11 px-4 rounded-2xl gap-2 text-xs font-semibold shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={triggerReset}
              className="h-11 px-3 rounded-2xl text-xs text-muted-foreground hover:text-foreground gap-1"
              title="Alle filters wissen"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Result Type Tabs & Exact Phrase Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => triggerChange({ type: "all" })}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filters.type === "all"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Alles
          </button>
          <button
            type="button"
            onClick={() => triggerChange({ type: "dossiers" })}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filters.type === "dossiers"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Dossiers
          </button>
          <button
            type="button"
            onClick={() => triggerChange({ type: "documents" })}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filters.type === "documents"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Documenten & PDF's
          </button>
        </div>

        {/* Exact phrase match toggle */}
        <button
          type="button"
          onClick={() => triggerChange({ exactPhrase: !filters.exactPhrase })}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border transition-all ${
            filters.exactPhrase
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted/40 border-border text-muted-foreground"
          }`}
          title="Schakelen tussen exacte zinsdeelzoektocht of vrije zoektocht"
        >
          <span className={`w-2 h-2 rounded-full ${filters.exactPhrase ? "bg-primary" : "bg-muted-foreground"}`} />
          <span>{filters.exactPhrase ? "Exacte hit (volledige woordvolgorde)" : "Flexibele zoektocht"}</span>
        </button>
      </div>

      {/* Expanded Filter Panel */}
      {showFilters && (
        <div
          id="search-filters-expanded-panel"
          className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Period / Timeline Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-accent" />
                <span>Tijdlijn & Periode</span>
              </label>
              <p className="text-[11px] text-muted-foreground">
                Toont dossiers waarvan documenten actief zijn binnen deze tijdspanne.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] font-medium text-muted-foreground block mb-1">
                    Vanaf datum
                  </span>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => triggerChange({ startDate: e.target.value })}
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-medium text-muted-foreground block mb-1">
                    Tot en met datum
                  </span>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => triggerChange({ endDate: e.target.value })}
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>
              </div>

              {/* Quick Period Presets */}
              <div className="flex flex-wrap gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => triggerChange({ startDate: "2024-06-06", endDate: "" })}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                    filters.startDate === "2024-06-06"
                      ? "bg-accent/15 border-accent text-accent font-semibold"
                      : "bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Vanaf 06-06-2024
                </button>
                <button
                  type="button"
                  onClick={() => triggerChange({ startDate: "2025-01-01", endDate: "2025-12-31" })}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                    filters.startDate === "2025-01-01"
                      ? "bg-accent/15 border-accent text-accent font-semibold"
                      : "bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Jaar 2025
                </button>
                <button
                  type="button"
                  onClick={() => triggerChange({ startDate: "2024-01-01", endDate: "2024-12-31" })}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                    filters.startDate === "2024-01-01"
                      ? "bg-accent/15 border-accent text-accent font-semibold"
                      : "bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Jaar 2024
                </button>
                {(filters.startDate || filters.endDate) && (
                  <button
                    type="button"
                    onClick={() => triggerChange({ startDate: "", endDate: "" })}
                    className="text-[10px] px-2 py-0.5 rounded-lg text-red-500 hover:underline"
                  >
                    Wissen
                  </button>
                )}
              </div>
            </div>

            {/* 2. File Count Range Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-accent" />
                  <span>Aantal bestanden per dossier</span>
                </label>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-accent/10 text-accent">
                  {filters.minFiles} - {filters.maxFiles >= 35 ? "35+ (alle)" : filters.maxFiles} st.
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Schuif om dossiers te filteren op minimaal en maximaal volume.
              </p>

              <div className="pt-3 px-1">
                <Slider
                  min={0}
                  max={35}
                  step={1}
                  value={[filters.minFiles, filters.maxFiles]}
                  onValueChange={handleSliderChange}
                  className="w-full"
                />
              </div>

              {/* Slider Quick Presets */}
              <div className="flex flex-wrap gap-1 pt-2">
                <button
                  type="button"
                  onClick={() => triggerChange({ minFiles: 0, maxFiles: 35 })}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                    filters.minFiles === 0 && filters.maxFiles === 35
                      ? "bg-accent/15 border-accent text-accent font-semibold"
                      : "bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Alles
                </button>
                <button
                  type="button"
                  onClick={() => triggerChange({ minFiles: 1, maxFiles: 5 })}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                    filters.minFiles === 1 && filters.maxFiles === 5
                      ? "bg-accent/15 border-accent text-accent font-semibold"
                      : "bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  1-5 stukken
                </button>
                <button
                  type="button"
                  onClick={() => triggerChange({ minFiles: 5, maxFiles: 15 })}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                    filters.minFiles === 5 && filters.maxFiles === 15
                      ? "bg-accent/15 border-accent text-accent font-semibold"
                      : "bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  5-15 stukken
                </button>
                <button
                  type="button"
                  onClick={() => triggerChange({ minFiles: 15, maxFiles: 35 })}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                    filters.minFiles === 15 && filters.maxFiles === 35
                      ? "bg-accent/15 border-accent text-accent font-semibold"
                      : "bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  15+ stukken
                </button>
              </div>
            </div>

            {/* 3. Category & Physical File Filter */}
            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-accent" />
                <span>Categorie & Beschikbaarheid</span>
              </label>

              <div className="space-y-2 pt-1">
                <select
                  value={filters.category}
                  onChange={(e) => triggerChange({ category: e.target.value })}
                  aria-label="Filter op beleidscategorie"
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-accent"
                >
                  <option value="all">Alle beleidscategorieën</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={filters.hasFilesOnly}
                    onChange={(e) => triggerChange({ hasFilesOnly: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span>Alleen fysiek geüploade bestanden</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
