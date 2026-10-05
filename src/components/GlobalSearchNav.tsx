import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Newspaper,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Clock,
  Tag,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { hoofdstukken } from "@/data/partijprogramma";
import { NewsItem, news as fallbackNews } from "@/data/news";
import { EventItem, events as fallbackEvents } from "@/data/events";
import { logNavbarSearch } from "@/lib/councilAuditLogger";

export type SearchResultType = "nieuws" | "standpunt" | "agenda";

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  snippet: string;
  url: string;
  badgeLabel: string;
  dateOrMeta?: string;
  extraInfo?: string;
  image?: string;
}

const ITEMS_PER_PAGE = 5;

// Strip HTML tags for cleaner snippet display and search
function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Highlight matched query substrings in text
function highlightMatch(text: string, query: string) {
  if (!query || !text) return text;
  const terms = query.trim().split(/\s+/).filter((t) => t.length > 1);
  if (terms.length === 0) return text;

  try {
    const escapedTerms = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(${escapedTerms.join("|")})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-accent/30 text-accent font-semibold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  } catch {
    return text;
  }
}

export interface GlobalSearchNavProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export const GlobalSearchNav: React.FC<GlobalSearchNavProps> = ({
  isOpen: controlledIsOpen,
  onOpenChange,
  className = "",
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = typeof controlledIsOpen === "boolean";
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === "function" ? val(isOpen) : val;
    if (!isControlled) {
      setInternalIsOpen(nextVal);
    }
    onOpenChange?.(nextVal);
  };

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | SearchResultType>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [newsList, setNewsList] = useState<NewsItem[]>(fallbackNews);
  const [eventsList, setEventsList] = useState<EventItem[]>(fallbackEvents);
  const [dataLoaded, setDataLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const lastLoggedRef = useRef<string>("");
  const navigate = useNavigate();

  // Fetch live news & events when search is opened (or on mount once)
  useEffect(() => {
    if (!isOpen || dataLoaded) return;

    let isMounted = true;
    Promise.all([
      fetch("/api/news").then((r) => (r.ok ? r.json().catch(() => fallbackNews) : fallbackNews)),
      fetch("/api/events").then((r) => (r.ok ? r.json().catch(() => fallbackEvents) : fallbackEvents)),
    ])
      .then(([newsData, eventsData]) => {
        if (isMounted) {
          if (Array.isArray(newsData) && newsData.length > 0) setNewsList(newsData);
          if (Array.isArray(eventsData) && eventsData.length > 0) setEventsList(eventsData);
          setDataLoaded(true);
        }
      })
      .catch((err) => {
        console.warn("[GLOBAL SEARCH] Kon realtime data niet ophalen, gebruik fallback data:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, dataLoaded]);

  // Focus input whenever opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setCurrentPage(1);
      setActiveTab("all");
    }
  }, [isOpen]);

  // Global keyboard shortcut: Ctrl+K or Cmd+K to toggle search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Click outside listener to collapse
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Filter & Search Logic across the 3 domains
  const allResults: SearchResultItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const searchTokens = q.split(/\s+/).filter(Boolean);

    const matchesTokens = (text: string) => {
      const lower = text.toLowerCase();
      return searchTokens.every((token) => lower.includes(token));
    };

    const results: SearchResultItem[] = [];

    // 1. Search in Nieuws
    for (const item of newsList) {
      const rawContent = stripHtml(item.content || "");
      const combined = `${item.title || ""} ${item.excerpt || item.description || ""} ${rawContent} ${item.category || ""} ${item.wijkNaam || ""}`;

      if (matchesTokens(combined)) {
        // Build a snippet around the matched token
        let snippet = item.excerpt || item.description || rawContent;
        if (snippet.length > 140) {
          snippet = snippet.slice(0, 140) + "...";
        }

        results.push({
          id: `news_${item.id}`,
          type: "nieuws",
          title: item.title,
          snippet,
          url: `/nieuws/${item.id}`,
          badgeLabel: item.category || "Nieuws",
          dateOrMeta: item.date ? new Date(item.date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : undefined,
          extraInfo: item.wijkNaam ? `Wijk: ${item.wijkNaam}` : undefined,
          image: item.image || item.thumbnailUrl,
        });
      }
    }

    // 2. Search in Standpunten (Partijprogramma)
    for (const h of hoofdstukken) {
      for (const s of h.standpunten) {
        const combined = `${h.titel} ${s.titel} ${s.standpunt} ${s.verdieping || ""}`;

        if (matchesTokens(combined)) {
          let snippet = s.standpunt || s.verdieping || "";
          if (snippet.length > 140) {
            snippet = snippet.slice(0, 140) + "...";
          }

          results.push({
            id: `standpunt_${h.nr}_${s.nr}`,
            type: "standpunt",
            title: `${s.nr.toString().padStart(2, "0")}. ${s.titel}`,
            snippet,
            url: `/standpunten?hoofdstuk=${h.nr}&standpunt=${s.nr}`,
            badgeLabel: `H${h.nr}: ${h.titel.split(":")[0] || h.titel.slice(0, 18)}`,
            dateOrMeta: `Hoofdstuk ${h.nr} • Standpunt ${s.nr}`,
            extraInfo: s.bijdragen ? `${s.bijdragen} videobijdrage(n)` : undefined,
          });
        }
      }
    }

    // 3. Search in Agenda-items
    for (const ev of eventsList) {
      const combined = `${ev.title || ""} ${ev.shortDescription || ev.description || ""} ${ev.location || ""} ${ev.address || ""} ${ev.city || ""}`;

      if (matchesTokens(combined)) {
        let snippet = ev.shortDescription || ev.description || "";
        if (snippet.length > 140) {
          snippet = snippet.slice(0, 140) + "...";
        }

        results.push({
          id: `event_${ev.id}`,
          type: "agenda",
          title: ev.title,
          snippet,
          url: `/agenda/${ev.id}`,
          badgeLabel: "Agenda",
          dateOrMeta: ev.date ? new Date(ev.date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : undefined,
          extraInfo: ev.location || ev.city ? (ev.location || ev.city) : undefined,
        });
      }
    }

    return results;
  }, [query, newsList, eventsList]);

  // Counts per tab
  const counts = useMemo(() => {
    const newsCount = allResults.filter((r) => r.type === "nieuws").length;
    const standpuntenCount = allResults.filter((r) => r.type === "standpunt").length;
    const agendaCount = allResults.filter((r) => r.type === "agenda").length;
    return {
      all: allResults.length,
      nieuws: newsCount,
      standpunt: standpuntenCount,
      agenda: agendaCount,
    };
  }, [allResults]);

  // Filtered by selected tab
  const filteredResults = useMemo(() => {
    if (activeTab === "all") return allResults;
    return allResults.filter((r) => r.type === activeTab);
  }, [allResults, activeTab]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE) || 1;
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredResults.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredResults, currentPage]);

  // Record audit log for every search query (logged in or anonymous)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const timer = setTimeout(() => {
      const stateKey = `${trimmed}_${activeTab}_${counts.all}`;
      if (lastLoggedRef.current !== stateKey) {
        lastLoggedRef.current = stateKey;
        logNavbarSearch({
          query: trimmed,
          resultsCount: counts.all,
          countsBreakdown: counts,
          activeTab,
        });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [query, activeTab, counts]);

  const handleTabChange = (tab: "all" | SearchResultType) => {
    setActiveTab(tab);
    setCurrentPage(1);
    resultsContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    resultsContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectResult = (url: string) => {
    const trimmed = query.trim();
    if (trimmed) {
      logNavbarSearch({
        query: trimmed,
        resultsCount: counts.all,
        countsBreakdown: counts,
        activeTab,
      });
    }
    setIsOpen(false);
    navigate(url);
  };

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      {/* 1. Closed state: Magnifying Glass Toggle Button */}
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-sm border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-all shrink-0 cursor-pointer shadow-2xs group"
          title="Zoeken in nieuws, standpunten en agenda (Ctrl+K)"
          aria-label="Globale zoekfunctie openen"
        >
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
        </button>
      ) : (
        /* 2. Expanded state: Unfolding Search Bar */
        <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent absolute left-2.5 sm:left-3 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const trimmed = query.trim();
                  if (trimmed) {
                    logNavbarSearch({
                      query: trimmed,
                      resultsCount: counts.all,
                      countsBreakdown: counts,
                      activeTab,
                    });
                  }
                }
              }}
              placeholder="Zoek in nieuws, standpunten, agenda..."
              className="w-40 sm:w-56 md:w-64 xl:w-60 2xl:w-72 max-w-[calc(100vw-110px)] pl-8 sm:pl-9 pr-8 h-8 sm:h-9 text-xs sm:text-sm bg-background border border-accent rounded-sm focus:outline-none focus:ring-1 focus:ring-accent text-foreground placeholder:text-muted-foreground shadow-md transition-all"
              aria-label="Zoekterm invoeren"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCurrentPage(1);
                  inputRef.current?.focus();
                }}
                className="absolute right-2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Wissen"
                aria-label="Zoekterm wissen"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:inline-block absolute right-2.5 text-[10px] text-muted-foreground/60 border border-border px-1 py-0.2 rounded font-mono">
                ESC
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-sm border border-accent/40 text-muted-foreground hover:text-accent hover:border-accent hover:bg-accent/10 transition-colors shrink-0 cursor-pointer"
            title="Zoeken sluiten (Esc)"
            aria-label="Zoeken sluiten"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Floating Results Dropdown Modal */}
      {isOpen && (
        <div
          className="fixed inset-x-3 top-20 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 w-auto sm:w-[540px] md:w-[620px] max-h-[82vh] bg-card/95 backdrop-blur-xl border border-accent/35 shadow-2xl rounded-xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ minHeight: query.trim().length >= 2 ? "320px" : "180px" }}
        >
          {/* Header Bar with Category Filters */}
          <div className="p-3 sm:p-3.5 border-b border-border/80 bg-muted/40 shrink-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Doorzoek de hele website</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                {query.trim().length >= 2 ? (
                  <>
                    <strong className="text-foreground">{counts.all}</strong> resultaten gevonden
                  </>
                ) : (
                  "Typ minstens 2 letters"
                )}
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              <button
                type="button"
                onClick={() => handleTabChange("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "all"
                    ? "bg-accent text-accent-foreground shadow-xs"
                    : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                }`}
              >
                <span>Alles</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "all" ? "bg-accent-foreground/20 text-accent-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {counts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("nieuws")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "nieuws"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                }`}
              >
                <Newspaper className="w-3 h-3 text-emerald-500" />
                <span>Nieuws</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "nieuws" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {counts.nieuws}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("standpunt")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "standpunt"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                }`}
              >
                <BookOpen className="w-3 h-3 text-amber-500" />
                <span>Standpunten</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "standpunt" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {counts.standpunt}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("agenda")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "agenda"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                }`}
              >
                <Calendar className="w-3 h-3 text-sky-500" />
                <span>Agenda</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "agenda" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {counts.agenda}
                </span>
              </button>
            </div>
          </div>

          {/* Results List */}
          <div ref={resultsContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[50vh]">
            {query.trim().length < 2 ? (
              <div className="py-8 px-4 text-center space-y-3">
                <Search className="w-8 h-8 text-accent/50 mx-auto animate-pulse" />
                <div className="text-sm font-semibold text-foreground">Waar bent u naar op zoek?</div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Typ een trefwoord zoals <em className="text-accent">"woningbouw"</em>,{" "}
                  <em className="text-accent">"weerribben"</em>, <em className="text-accent">"politieke markt"</em> of{" "}
                  <em className="text-accent">"dorpskernen"</em> om direct te zoeken in alle 136 standpunten, artikelen en agenda-items.
                </p>
                <div className="pt-2 flex flex-wrap justify-center gap-1.5">
                  {["Woningbouw", "OZB", "Starters", "Centrum Steenwijk", "Participatie", "Weerribben"].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setQuery(chip);
                        inputRef.current?.focus();
                      }}
                      className="px-2.5 py-1 rounded-full text-[11px] bg-secondary hover:bg-accent/15 hover:text-accent border border-border/70 transition-colors cursor-pointer text-foreground/85"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : paginatedResults.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                  <X className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-foreground">Geen resultaten gevonden</div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Geen overeenkomsten gevonden voor <strong className="text-foreground">"{query}"</strong>{" "}
                  {activeTab !== "all" && `binnen de categorie ${activeTab}`}. Probeer een algemenere zoekterm.
                </p>
                {activeTab !== "all" && (
                  <button
                    type="button"
                    onClick={() => handleTabChange("all")}
                    className="text-xs text-accent hover:underline font-semibold mt-1 inline-block"
                  >
                    Zoek in alle categorieën ({counts.all})
                  </button>
                )}
              </div>
            ) : (
              paginatedResults.map((item) => {
                const isNews = item.type === "nieuws";
                const isStandpunt = item.type === "standpunt";
                const isAgenda = item.type === "agenda";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectResult(item.url)}
                    className="group p-3 rounded-lg border border-border/70 bg-background/80 hover:bg-muted/50 hover:border-accent/50 transition-all cursor-pointer flex flex-col sm:flex-row gap-3 items-start justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Top Badges & Meta */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                            isNews
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                              : isStandpunt
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                              : "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30"
                          }`}
                        >
                          {isNews && <Newspaper className="w-3 h-3" />}
                          {isStandpunt && <BookOpen className="w-3 h-3" />}
                          {isAgenda && <Calendar className="w-3 h-3" />}
                          <span>{item.badgeLabel}</span>
                        </span>

                        {item.dateOrMeta && (
                          <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3 text-muted-foreground/70" />
                            <span>{item.dateOrMeta}</span>
                          </span>
                        )}

                        {item.extraInfo && (
                          <span className="text-muted-foreground/80 flex items-center gap-1 text-[11px] truncate">
                            <Tag className="w-3 h-3 text-accent/70" />
                            <span>{item.extraInfo}</span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-accent transition-colors leading-snug line-clamp-2">
                        {highlightMatch(item.title, query)}
                      </h4>

                      {/* Snippet */}
                      <p className="text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2">
                        {highlightMatch(item.snippet, query)}
                      </p>
                    </div>

                    {/* Right action indicator */}
                    <div className="hidden sm:flex items-center text-xs font-semibold text-muted-foreground group-hover:text-accent shrink-0 pt-1 transition-colors gap-1">
                      <span>Bekijken</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Pagination Bar */}
          {filteredResults.length > 0 && (
            <div className="p-2.5 sm:p-3 border-t border-border/80 bg-muted/30 shrink-0 flex items-center justify-between gap-2 text-xs">
              <div className="text-muted-foreground text-[11px]">
                Pagina <strong className="text-foreground">{currentPage}</strong> van{" "}
                <strong className="text-foreground">{totalPages}</strong>{" "}
                <span className="hidden sm:inline">({filteredResults.length} resultaten)</span>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-2 py-1 rounded border border-border/80 bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-0.5 cursor-pointer text-xs"
                  aria-label="Vorige pagina"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Vorige</span>
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((pageNum, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && pageNum - prev > 1;

                      return (
                        <React.Fragment key={pageNum}>
                          {showEllipsis && <span className="px-1 text-muted-foreground">…</span>}
                          <button
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            className={`min-w-6 h-6 px-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                              currentPage === pageNum
                                ? "bg-accent text-accent-foreground font-bold shadow-2xs"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {pageNum}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-2 py-1 rounded border border-border/80 bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-0.5 cursor-pointer text-xs"
                  aria-label="Volgende pagina"
                >
                  <span className="hidden sm:inline">Volgende</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
