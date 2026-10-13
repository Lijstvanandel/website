import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Newspaper,
  ChevronUp,
  ChevronDown,
  Calendar,
  ArrowRight,
  Share2,
  MapPin,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewsItem } from "@/data/news";
import { FractielidItem } from "@/components/FractielidWidget";

interface VerticalNewsCarouselProps {
  member: FractielidItem;
  newsItems: NewsItem[];
  loading?: boolean;
  onShareArticle?: (article: NewsItem) => void;
  className?: string;
}

export const VerticalNewsCarousel: React.FC<VerticalNewsCarouselProps> = ({
  member,
  newsItems,
  loading = false,
  onShareArticle,
  className = "",
}) => {
  const ITEMS_PER_PAGE = 3;
  const total = newsItems.length;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1;

  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState<"up" | "down">("down");
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset page when items change
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(0);
    }
  }, [totalPages, currentPage]);

  const goToPrev = useCallback(() => {
    if (totalPages <= 1) return;
    setDirection("up");
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  }, [totalPages]);

  const goToNext = useCallback(() => {
    if (totalPages <= 1) return;
    setDirection("down");
    setCurrentPage((prev) => (prev + 1) % totalPages);
  }, [totalPages]);

  const goToPage = (page: number) => {
    if (page === currentPage) return;
    setDirection(page > currentPage ? "down" : "up");
    setCurrentPage(page);
  };

  // Autoplay ticker: advance every 7.5 seconds if multiple pages and not paused/hovered
  useEffect(() => {
    if (totalPages <= 1 || isPaused || isHovered) return;

    const interval = setInterval(() => {
      goToNext();
    }, 7500);

    return () => clearInterval(interval);
  }, [totalPages, isPaused, isHovered, goToNext]);

  // Handle keyboard navigation (ArrowUp / ArrowDown)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      goToPrev();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      goToNext();
    }
  };

  // Get currently visible 3 items for this page
  const visibleItems = newsItems.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="h-6 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-3.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-card border border-border rounded-sm p-4 flex gap-4 h-[120px] animate-pulse"
            >
              <div className="w-28 bg-muted/70 rounded-sm shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-muted/60 rounded w-1/4" />
                <div className="h-4 bg-muted/80 rounded w-3/4" />
                <div className="h-3 bg-muted/50 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section
      className={`space-y-4 ${className}`}
      aria-label={`Gekoppelde berichten van ${member.name}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      ref={containerRef}
    >
      {/* Header met titel, teller en carrousel knoppen */}
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl flex items-center gap-2.5">
            <Newspaper className="w-6 h-6 text-accent" />
            <span>Gekoppelde Berichten</span>
            <span className="text-sm font-sans font-semibold px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
              {total} {total === 1 ? "bericht" : "berichten"}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Nieuwsberichten en bijdragen gekoppeld aan {member.name} (3 per weergave).
          </p>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Auto-scroll toggle knop */}
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? "Carrousel hervatten" : "Carrousel pauzeren"}
              className="w-8 h-8 rounded-sm border border-border hover:border-accent text-muted-foreground hover:text-accent flex items-center justify-center transition-colors"
              aria-label={isPaused ? "Carrousel hervatten" : "Carrousel pauzeren"}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            {/* Omhoog / Vorige 3 artikelen */}
            <button
              type="button"
              onClick={goToPrev}
              title="Vorige berichten"
              aria-label="Vorige berichten"
              className="w-8 h-8 rounded-sm border border-border hover:border-accent text-foreground hover:text-accent flex items-center justify-center transition-colors bg-secondary/30 hover:bg-secondary/70"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            {/* Omlaag / Volgende 3 artikelen */}
            <button
              type="button"
              onClick={goToNext}
              title="Volgende berichten"
              aria-label="Volgende berichten"
              className="w-8 h-8 rounded-sm border border-border hover:border-accent text-foreground hover:text-accent flex items-center justify-center transition-colors bg-secondary/30 hover:bg-secondary/70"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Carrousel Inhoud */}
      {total === 0 ? (
        <div className="bg-card border border-border p-8 text-center rounded-sm min-h-[300px] flex flex-col items-center justify-center">
          <div className="w-14 h-14 mx-auto mb-3.5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Newspaper className="w-7 h-7 opacity-75" />
          </div>
          <h3 className="font-display text-xl mb-1.5">Geen gekoppelde berichten</h3>
          <p className="text-xs text-muted-foreground mb-5 leading-relaxed max-w-sm">
            Er zijn op dit moment nog geen nieuwsberichten specifiek gekoppeld aan {member.name}. Zodra
            nieuwe artikelen of moties worden gepubliceerd, verschijnen deze hier.
          </p>
          <Button asChild variant="outline" size="sm" className="text-xs uppercase tracking-wider">
            <Link to="/nieuws">Bekijk alle nieuwsberichten</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Weergave van 3 artikelen onder elkaar met soepele overgang */}
          <div
            key={currentPage}
            className={`space-y-3.5 ${
              direction === "down" ? "animate-fade-up" : "animate-fade-down"
            }`}
          >
            {visibleItems.map((article) => {
              const cleanExcerpt =
                article.excerpt ||
                article.description ||
                (article.content
                  ? article.content.replace(/<[^>]*>/g, "").slice(0, 140) + "..."
                  : "");

              const effectiveThumbnail =
                article.thumbnailUrl ||
                article.headerUrl ||
                article.image ||
                "/assets/markt-steenwijk.jpg";

              const formattedDate = article.date
                ? new Date(article.date).toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Recent";

              return (
                <article
                  key={article.id}
                  id={`carousel-article-${article.id}`}
                  className="bg-card border border-border hover:border-accent/60 rounded-sm p-3.5 sm:p-4 flex gap-3.5 sm:gap-4 items-stretch hover-lift transition-all group shadow-sm"
                >
                  {/* Thumbnail afbeelding links */}
                  <Link
                    to={`/nieuws/${article.id}`}
                    className="w-24 sm:w-28 md:w-32 aspect-[4/3] rounded-sm overflow-hidden bg-muted shrink-0 relative block"
                    title={article.title}
                  >
                    <img
                      src={effectiveThumbnail}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/assets/markt-steenwijk.jpg";
                      }}
                    />
                    <div className="absolute top-1 left-1 bg-black/80 backdrop-blur-sm text-accent text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm">
                      {article.category || "Nieuws"}
                    </div>
                  </Link>

                  {/* Tekst en metadata rechts */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      {/* Datum en optionele wijkbadge */}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="w-3 h-3 text-accent" />
                          <span>{formattedDate}</span>
                        </span>
                        {article.wijkSlug && (
                          <>
                            <span className="text-muted-foreground/60">•</span>
                            <span className="flex items-center gap-0.5 truncate text-[10px] text-foreground/80">
                              <MapPin className="w-2.5 h-2.5 text-accent shrink-0" />
                              <span className="capitalize truncate">
                                {article.wijkNaam || article.wijkSlug.replace("-", " ")}
                              </span>
                            </span>
                          </>
                        )}
                      </div>

                      {/* Titel */}
                      <h3 className="font-display text-sm sm:text-base font-bold leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                        <Link to={`/nieuws/${article.id}`}>{article.title}</Link>
                      </h3>

                      {/* Korte inleiding */}
                      {cleanExcerpt && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1 sm:line-clamp-2 mt-1">
                          {cleanExcerpt}
                        </p>
                      )}
                    </div>

                    {/* Actielinks onderaan het kaartje */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-border/40">
                      <Link
                        to={`/nieuws/${article.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:text-accent/80 transition-colors"
                      >
                        <span>Lees bericht</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </Link>

                      {onShareArticle && (
                        <button
                          type="button"
                          onClick={() => onShareArticle(article)}
                          title="Deel dit bericht"
                          aria-label={`Deel bericht: ${article.title}`}
                          className="text-muted-foreground hover:text-accent p-1 transition-colors rounded hover:bg-accent/10"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagina-indicatoren en teller onderaan */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-2 px-1 text-xs text-muted-foreground">
              <span>
                Toont {currentPage * ITEMS_PER_PAGE + 1}–
                {Math.min((currentPage + 1) * ITEMS_PER_PAGE, total)} van {total} berichten
              </span>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => goToPage(idx)}
                    className={`transition-all duration-300 rounded-full ${
                      idx === currentPage
                        ? "w-5 h-2 bg-accent shadow"
                        : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                    }`}
                    aria-label={`Ga naar pagina ${idx + 1}`}
                    title={`Pagina ${idx + 1} van ${totalPages}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
