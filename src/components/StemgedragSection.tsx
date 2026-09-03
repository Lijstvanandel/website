import React, { useState, useEffect, useMemo } from "react";
import { 
  Check, 
  X, 
  FileText, 
  FileCheck2,
  Download, 
  Sparkles, 
  Users, 
  Calendar, 
  Search, 
  SlidersHorizontal,
  ExternalLink,
  Vote,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Filter
} from "lucide-react";
import { StemgedragItem, PrimaryFilter, VoteFilter, MotionCategory } from "@/types/stemgedrag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ITEMS_PER_PAGE = 6;

export const StemgedragSection: React.FC = () => {
  const [items, setItems] = useState<StemgedragItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [primaryFilter, setPrimaryFilter] = useState<PrimaryFilter>("alle-stemmingen");
  const [voteFilter, setVoteFilter] = useState<VoteFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    fetchStemgedrag();
  }, []);

  const fetchStemgedrag = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stemgedrag");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setItems(data);
        }
      }
    } catch (err) {
      console.error("Fout bij ophalen stemgedrag:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handlers for filter changes
  const handlePrimaryFilterChange = (newPrimary: PrimaryFilter) => {
    setPrimaryFilter(newPrimary);
    setCurrentPage(1);
  };

  const handleVoteToggle = (clickedVote: "voor" | "tegen") => {
    // If clicked vote is already active, toggle off to "all", else activate clicked vote
    if (voteFilter === clickedVote) {
      setVoteFilter("all");
    } else {
      setVoteFilter(clickedVote);
    }
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setPrimaryFilter("alle-stemmingen");
    setVoteFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Filter and search logic (supports combining primary filter + vote filter + search)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const itemCategory = item.category || "motie";

      // 1. Primary filter
      if (primaryFilter === "alle-moties") {
        if (itemCategory !== "motie") return false;
      } else if (primaryFilter === "eigen-moties") {
        if (itemCategory !== "motie" || item.motionType !== "eigen") return false;
      } else if (primaryFilter === "alle-amendementen") {
        if (itemCategory !== "amendement") return false;
      } else if (primaryFilter === "eigen-amendementen") {
        if (itemCategory !== "amendement" || item.motionType !== "eigen") return false;
      } else if (primaryFilter === "mede-indiener") {
        if (item.motionType !== "mede-indiener") return false;
      }
      // "alle-stemmingen" permits all categories and origin types

      // 2. Vote filter (combinable with any primary filter)
      if (voteFilter === "voor" && item.vote !== "voor") return false;
      if (voteFilter === "tegen" && item.vote !== "tegen") return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchVergadering = item.raadsvergadering?.toLowerCase().includes(q);
        const matchResultaat = item.resultaat?.toLowerCase().includes(q);
        const matchCategory = itemCategory.toLowerCase().includes(q);
        return Boolean(matchTitle || matchDesc || matchVergadering || matchResultaat || matchCategory);
      }

      return true;
    });
  }, [items, primaryFilter, voteFilter, searchQuery]);

  // Counts for each filter button (contextual to allow smart combination previews)
  const counts = useMemo(() => {
    const alleStemmingen = items.length;
    const alleMoties = items.filter((i) => (i.category || "motie") === "motie").length;
    const eigenMoties = items.filter((i) => (i.category || "motie") === "motie" && i.motionType === "eigen").length;
    const alleAmendementen = items.filter((i) => i.category === "amendement").length;
    const eigenAmendementen = items.filter((i) => i.category === "amendement" && i.motionType === "eigen").length;
    const medeIndiener = items.filter((i) => i.motionType === "mede-indiener").length;

    // Subset for Voor / Tegen count based on active primary filter
    let subset = items;
    if (primaryFilter === "alle-moties") {
      subset = items.filter((i) => (i.category || "motie") === "motie");
    } else if (primaryFilter === "eigen-moties") {
      subset = items.filter((i) => (i.category || "motie") === "motie" && i.motionType === "eigen");
    } else if (primaryFilter === "alle-amendementen") {
      subset = items.filter((i) => i.category === "amendement");
    } else if (primaryFilter === "eigen-amendementen") {
      subset = items.filter((i) => i.category === "amendement" && i.motionType === "eigen");
    } else if (primaryFilter === "mede-indiener") {
      subset = items.filter((i) => i.motionType === "mede-indiener");
    }

    const voor = subset.filter((i) => i.vote === "voor").length;
    const tegen = subset.filter((i) => i.vote === "tegen").length;

    return {
      alleStemmingen,
      alleMoties,
      eigenMoties,
      alleAmendementen,
      eigenAmendementen,
      medeIndiener,
      voor,
      tegen,
    };
  }, [items, primaryFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getOriginalButtonLabel = (category?: MotionCategory) => {
    switch (category) {
      case "voorstel":
        return "Bekijk origineel voorstel";
      case "amendement":
        return "Bekijk origineel amendement";
      case "motie":
      default:
        return "Bekijk originele motie";
    }
  };

  const getCategoryBadgeLabel = (category?: MotionCategory) => {
    switch (category) {
      case "voorstel":
        return "Voorstel";
      case "amendement":
        return "Amendement";
      case "motie":
      default:
        return "Motie";
    }
  };

  return (
    <section id="stemgedrag" className="mt-24 pt-12 border-t border-border">
      {/* Section Header */}
      <div className="max-w-3xl mb-10">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-accent font-semibold mb-2">
          <Vote className="w-4 h-4" />
          <span>Verantwoording & Transparantie</span>
        </div>
        <h2 className="font-display text-4xl md:text-5xl mb-4 border-gold-line pb-4">
          Stemgedrag
        </h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
          Lijst van Andel staat voor openheid en een duidelijke koers. Hieronder vindt u exact hoe 
          onze fractie heeft gestemd over moties, voorstellen en amendementen in de gemeenteraad van Steenwijkerland, 
          inclusief de inhoudelijke toelichting waarom wij voor of tegen hebben gestemd.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-6 mb-10 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Main Filters: Alle stemmingen, Alle moties, Eigen moties, Alle amendementen, Eigen amendementen, Mede-indiener */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Alle stemmingen */}
            <button
              id="filter-alle-stemmingen"
              type="button"
              onClick={() => handlePrimaryFilterChange("alle-stemmingen")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                primaryFilter === "alle-stemmingen"
                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>Alle stemmingen</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${primaryFilter === "alle-stemmingen" ? "bg-white/20 text-white" : "bg-background/80 text-muted-foreground"}`}>
                {counts.alleStemmingen}
              </span>
            </button>

            {/* 2. Alle moties */}
            <button
              id="filter-alle-moties"
              type="button"
              onClick={() => handlePrimaryFilterChange("alle-moties")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                primaryFilter === "alle-moties"
                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Alle moties</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${primaryFilter === "alle-moties" ? "bg-white/20 text-white" : "bg-background/80 text-muted-foreground"}`}>
                {counts.alleMoties}
              </span>
            </button>

            {/* 3. Eigen moties */}
            <button
              id="filter-eigen-moties"
              type="button"
              onClick={() => handlePrimaryFilterChange("eigen-moties")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                primaryFilter === "eigen-moties"
                  ? "bg-amber-600 text-white shadow-sm ring-1 ring-amber-500/50"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Eigen moties</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${primaryFilter === "eigen-moties" ? "bg-white/20 text-white" : "bg-background/80 text-muted-foreground"}`}>
                {counts.eigenMoties}
              </span>
            </button>

            {/* 4. Alle amendementen */}
            <button
              id="filter-alle-amendementen"
              type="button"
              onClick={() => handlePrimaryFilterChange("alle-amendementen")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                primaryFilter === "alle-amendementen"
                  ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500/50"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Alle amendementen</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${primaryFilter === "alle-amendementen" ? "bg-white/20 text-white" : "bg-background/80 text-muted-foreground"}`}>
                {counts.alleAmendementen}
              </span>
            </button>

            {/* 5. Eigen amendementen */}
            <button
              id="filter-eigen-amendementen"
              type="button"
              onClick={() => handlePrimaryFilterChange("eigen-amendementen")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                primaryFilter === "eigen-amendementen"
                  ? "bg-amber-700 text-white shadow-sm ring-1 ring-amber-600/50"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Eigen amendementen</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${primaryFilter === "eigen-amendementen" ? "bg-white/20 text-white" : "bg-background/80 text-muted-foreground"}`}>
                {counts.eigenAmendementen}
              </span>
            </button>

            {/* 6. Mede-indiener */}
            <button
              id="filter-mede-indiener"
              type="button"
              onClick={() => handlePrimaryFilterChange("mede-indiener")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                primaryFilter === "mede-indiener"
                  ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-500/50"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Mede-indiener</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${primaryFilter === "mede-indiener" ? "bg-white/20 text-white" : "bg-background/80 text-muted-foreground"}`}>
                {counts.medeIndiener}
              </span>
            </button>
          </div>

          {/* Zoekveld */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="stemgedrag-search"
              type="text"
              placeholder="Zoek op titel of trefwoord..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-10 text-sm bg-background border-border"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Zoekveld legen"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Combined Vote Selection Bar: Voor en Tegen, selecteerbaar i.c.m. moties of amendementen */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
              Stemkeuze combineren:
            </span>

            {/* VOOR knop (toggle) */}
            <button
              id="filter-voor"
              type="button"
              onClick={() => handleVoteToggle("voor")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                voteFilter === "voor"
                  ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
              }`}
              title="Klik om te filteren op 'Voor gestemd' (klik nogmaals om uit te zetten)"
            >
              <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-200" />
              <span>Voor</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${voteFilter === "voor" ? "bg-white/20 text-white" : "bg-background/80 text-muted-foreground"}`}>
                {counts.voor}
              </span>
            </button>

            {/* TEGEN knop (toggle) */}
            <button
              id="filter-tegen"
              type="button"
              onClick={() => handleVoteToggle("tegen")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                voteFilter === "tegen"
                  ? "bg-red-600 text-white shadow-sm ring-2 ring-red-500/30"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
              }`}
              title="Klik om te filteren op 'Tegen gestemd' (klik nogmaals om uit te zetten)"
            >
              <X className="w-3.5 h-3.5 stroke-[3] text-red-200" />
              <span>Tegen</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${voteFilter === "tegen" ? "bg-white/20 text-white" : "bg-background/80 text-muted-foreground"}`}>
                {counts.tegen}
              </span>
            </button>

            {voteFilter !== "all" && (
              <button
                type="button"
                onClick={() => {
                  setVoteFilter("all");
                  setCurrentPage(1);
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline ml-1 cursor-pointer"
              >
                Stemkeuze filter wissen
              </button>
            )}
          </div>

          <div className="text-[11px] text-muted-foreground">
            {primaryFilter === "alle-moties" && voteFilter === "all" && (
              <span>Toont alle moties. Klik op Voor of Tegen om specifiek te filteren.</span>
            )}
            {primaryFilter === "alle-amendementen" && voteFilter === "all" && (
              <span>Toont alle amendementen. Klik op Voor of Tegen om specifiek te filteren.</span>
            )}
            {primaryFilter === "alle-amendementen" && voteFilter !== "all" && (
              <span className="text-foreground font-medium">Combinatie actief: Alle amendementen + {voteFilter === "voor" ? "Voor" : "Tegen"}</span>
            )}
            {primaryFilter === "alle-moties" && voteFilter !== "all" && (
              <span className="text-foreground font-medium">Combinatie actief: Alle moties + {voteFilter === "voor" ? "Voor" : "Tegen"}</span>
            )}
          </div>
        </div>

        {/* Active filter summary feedback */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3 gap-2">
          <div>
            Toont <strong className="text-foreground">{filteredItems.length}</strong> van de {items.length} stemmingen
            {primaryFilter !== "alle-stemmingen" && (
              <span>
                {" "}• Categorie:{" "}
                <span className="font-semibold text-accent">
                  {primaryFilter === "alle-moties" && "Alle moties"}
                  {primaryFilter === "eigen-moties" && "Eigen moties"}
                  {primaryFilter === "alle-amendementen" && "Alle amendementen"}
                  {primaryFilter === "eigen-amendementen" && "Eigen amendementen"}
                  {primaryFilter === "mede-indiener" && "Mede-indiener"}
                </span>
              </span>
            )}
            {voteFilter !== "all" && (
              <span>
                {" "}• Stemkeuze:{" "}
                <span className={`font-semibold ${voteFilter === "voor" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {voteFilter === "voor" ? "Voor gestemd" : "Tegen gestemd"}
                </span>
              </span>
            )}
            {searchQuery.trim() && (
              <span> • Zoekterm: &quot;{searchQuery}&quot;</span>
            )}
            {totalPages > 1 && (
              <span> • Pagina {currentPage} van {totalPages}</span>
            )}
          </div>

          {(primaryFilter !== "alle-stemmingen" || voteFilter !== "all" || searchQuery.trim()) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-accent hover:underline font-medium text-xs cursor-pointer text-left sm:text-right"
            >
              Alle filters resetten
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-16 text-center text-muted-foreground">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
          <p>Stemgedrag wordt geladen...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredItems.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <h3 className="font-display text-xl mb-2">Geen stemmingen gevonden</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Er zijn geen items die voldoen aan de geselecteerde filtercombinatie of zoekopdracht.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
          >
            Alle stemmingen weergeven
          </Button>
        </div>
      )}

      {/* Stemgedrag kaartenlijst: afbeelding links (vaste grootte), uitleg rechts */}
      {!loading && filteredItems.length > 0 && (
        <div className="space-y-6">
          {currentItems.map((item) => {
            const isVoor = item.vote === "voor";
            const isEigen = item.motionType === "eigen";
            const isMedeIndiener = item.motionType === "mede-indiener";
            const itemCategory = item.category || "motie";
            const originalButtonLabel = getOriginalButtonLabel(itemCategory);
            const categoryBadge = getCategoryBadgeLabel(itemCategory);

            // Fallback image if no specific photo was uploaded
            const displayImageUrl = item.imageUrl || "/assets/markt-steenwijk.jpg";

            return (
              <article
                key={item.id}
                id={`motie-card-${item.id}`}
                className="bg-card border border-border hover:border-accent/40 rounded-xl overflow-hidden shadow-sm transition-all"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Afbeelding links in een vaste grootte */}
                  <div className="relative md:w-80 lg:w-96 shrink-0 bg-muted/40 overflow-hidden border-b md:border-b-0 md:border-r border-border group">
                    <div className="w-full h-56 md:h-full min-h-[260px] relative">
                      <img
                        src={displayImageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden" />

                      {/* Klik om afbeelding te vergroten knop */}
                      <button
                        type="button"
                        onClick={() => setSelectedImage({ url: displayImageUrl, title: item.title })}
                        className="absolute bottom-3 right-3 bg-black/70 hover:bg-black text-white p-2 rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                        title="Vergroot afbeelding"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium hidden sm:inline">Vergroten</span>
                      </button>

                      {/* Categorie badge linksboven op de afbeelding */}
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-black/75 text-white backdrop-blur-xs border border-white/20">
                          {categoryBadge}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Uitleg & informatie rechts van de afbeelding */}
                  <div className="p-6 md:p-7 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Bovenste rij met stemstatus (voor/tegen), type indiening en datum */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Stemming: VOOR of TEGEN */}
                          {isVoor ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span>Voor gestemd</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30">
                              <X className="w-4 h-4 stroke-[2.5]" />
                              <span>Tegen gestemd</span>
                            </span>
                          )}

                          {/* Indieningstype Badge */}
                          {isEigen && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Eigen initiatief</span>
                            </span>
                          )}
                          {isMedeIndiener && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                              <Users className="w-3.5 h-3.5" />
                              <span>Mede-indiener</span>
                            </span>
                          )}
                          {!isEigen && !isMedeIndiener && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                              <FileText className="w-3.5 h-3.5" />
                              <span>Regulier</span>
                            </span>
                          )}
                        </div>

                        {/* Datum en optionele vergadering */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-accent" />
                            <span>{formatDate(item.date)}</span>
                          </span>
                          {item.raadsvergadering && (
                            <span className="hidden sm:inline bg-muted/60 px-2 py-0.5 rounded text-[11px] border border-border/50">
                              {item.raadsvergadering}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Titel van de motie/voorstel/amendement */}
                      <h3 className="font-display text-xl md:text-2xl text-foreground font-semibold mb-3 leading-snug">
                        {item.title}
                      </h3>

                      {/* Uitslag raadsvergadering indien ingevuld */}
                      {item.resultaat && (
                        <div className="mb-3 text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="font-medium text-foreground">Besluit gemeenteraad:</span>
                          <span className="bg-muted/70 px-2 py-0.5 rounded font-semibold text-foreground border border-border/60">
                            {item.resultaat}
                          </span>
                        </div>
                      )}

                      {/* Rechts van de afbeelding: Uitleg waarom er voor of tegen is gestemd (max 600 tekens) */}
                      <div className="space-y-1.5 mb-6">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <span>Waarom heeft Lijst van Andel {isVoor ? "voor" : "tegen"} gestemd?</span>
                        </div>
                        <div className="text-sm md:text-base text-foreground/95 leading-relaxed bg-muted/25 p-4 rounded-xl border border-border/60">
                          <p className="whitespace-pre-line">{item.description}</p>
                          <div className="mt-2 text-right">
                            <span className="text-[10px] text-muted-foreground">
                              {item.description.length}/600 tekens toelichting
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Onderaan: actieknop 'Bekijk originele motie / voorstel / amendement' */}
                    <div className="border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        {item.pdfUrl ? (
                          <a
                            href={item.pdfUrl.startsWith("/uploads/") ? `/api/document/view?file=${encodeURIComponent(item.pdfUrl)}` : item.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider bg-accent text-accent-foreground hover:bg-accent/90 shadow-xs transition-all cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                            <span>{originalButtonLabel} (.PDF)</span>
                          </a>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled
                            className="text-xs text-muted-foreground cursor-not-allowed border-dashed"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            <span>{originalButtonLabel} (niet digitaal beschikbaar)</span>
                          </Button>
                        )}
                      </div>

                      {item.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setSelectedImage({ url: item.imageUrl!, title: item.title })}
                          className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Foto in volledig scherm bekijken</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Pagination Controls (max 6 items per page) */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border mt-8">
              <div className="text-xs text-muted-foreground order-2 sm:order-1">
                Pagina <strong className="text-foreground">{currentPage}</strong> van de <strong className="text-foreground">{totalPages}</strong> (totaal {filteredItems.length} resultaten)
              </div>

              <div className="flex items-center gap-1.5 order-1 sm:order-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPage((prev) => Math.max(prev - 1, 1));
                    document.getElementById("stemgedrag")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  disabled={currentPage === 1}
                  className="h-9 px-3 text-xs gap-1 border-border"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Vorige</span>
                </Button>

                {/* Pagina knoppen */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => {
                      setCurrentPage(pageNum);
                      document.getElementById("stemgedrag")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                    document.getElementById("stemgedrag")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  disabled={currentPage === totalPages}
                  className="h-9 px-3 text-xs gap-1 border-border"
                >
                  <span>Volgende</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image Lightbox Modal */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-3xl p-4 bg-card border-border">
          <DialogHeader className="mb-2">
            <DialogTitle className="font-display text-lg text-foreground">
              {selectedImage?.title || "Bijbehorende afbeelding"}
            </DialogTitle>
          </DialogHeader>
          {selectedImage?.url && (
            <div className="relative rounded-lg overflow-hidden border border-border bg-black/40 flex items-center justify-center max-h-[75vh]">
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className="object-contain max-h-[70vh] w-auto max-w-full"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <a
              href={selectedImage?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
            >
              <span>Afbeelding in nieuw tabblad openen</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
