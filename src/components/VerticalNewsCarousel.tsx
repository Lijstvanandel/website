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
  Tag,
  Clock,
  Headphones,
  Video,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewsItem } from "@/data/news";
import { FractielidItem } from "@/components/FractielidWidget";

function getReadingTime(item: NewsItem): number {
  const text = `${item.title || ""} ${item.description || item.excerpt || ""} ${item.content || ""}`;
  const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = clean ? clean.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

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

  // Autoplay ticker: advance every 8.5 seconds if multiple pages and not paused/hovered
  useEffect(() => {
    if (totalPages <= 1 || isPaused || isHovered) return;

    const interval = setInterval(() => {
      goToNext();
    }, 8500);

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
      <div className={`flex flex-col space-y-6 ${className}`}>
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="h-7 w-52 bg-muted rounded animate-pulse" />
          <div className="h-6 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-6 pt-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-card rounded-xl border border-border overflow-hidden animate-pulse flex flex-col"
            >
              <div className="h-40 sm:h-44 bg-muted/60 shrink-0" />
              <div className="p-4 sm:p-5 space-y-2.5">
                <div className="flex justify-between">
                  <div className="h-3 bg-muted/50 rounded w-24" />
                  <div className="h-3 bg-muted/50 rounded w-16" />
                </div>
                <div className="h-5 bg-muted/70 rounded w-3/4" />
                <div className="h-3 bg-muted/40 rounded w-full" />
                <div className="pt-2.5 border-t border-border/40 flex justify-between">
                  <div className="h-4 bg-muted/50 rounded w-20" />
                  <div className="h-5 w-5 rounded-full bg-muted/50" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-border mt-6 h-10 bg-muted/20 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <section
      id="gekoppelde-berichten-section"
      className={`flex-1 flex flex-col justify-between ${className}`}
      aria-label={`Gekoppelde berichten van ${member.name}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      ref={containerRef}
    >
      {/* Header met titel, teller en carrousel knoppen */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4 min-h-[76px]">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl flex items-center gap-2.5">
            <Newspaper className="w-6 h-6 text-accent" />
            <span>Gekoppelde Berichten</span>
            <span className="text-sm font-sans font-semibold px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
              {total} {total === 1 ? "bericht" : "berichten"}
            </span>
            {totalPages > 1 && (
              <span className="text-xs font-sans text-muted-foreground font-normal">
                (Pagina {currentPage + 1} van {totalPages})
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Nieuwsberichten en bijdragen gekoppeld aan {member.name} (3 per weergave).
          </p>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
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
              title="Vorige 3 berichten"
              aria-label="Vorige 3 berichten"
              className="w-8 h-8 rounded-sm border border-border hover:border-accent text-foreground hover:text-accent flex items-center justify-center transition-colors bg-secondary/30 hover:bg-secondary/70"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            {/* Omlaag / Volgende 3 artikelen */}
            <button
              type="button"
              onClick={goToNext}
              title="Volgende 3 berichten"
              aria-label="Volgende 3 berichten"
              className="w-8 h-8 rounded-sm border border-border hover:border-accent text-foreground hover:text-accent flex items-center justify-center transition-colors bg-secondary/30 hover:bg-secondary/70"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Carrousel Inhoud */}
      {total === 0 ? (
        <div className="bg-card border border-border p-8 text-center rounded-xl min-h-[300px] shadow-sm flex flex-col items-center justify-center">
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
        <div className="flex-1 flex flex-col justify-between pt-2">
          {/* Weergave van 3 artikelen onder elkaar */}
          <div
            key={currentPage}
            className={`space-y-5 ${
              direction === "down" ? "animate-fade-up" : "animate-fade-down"
            }`}
          >
            {visibleItems.map((article, index) => {
              const effectiveThumbnail =
                article.thumbnailUrl ||
                article.headerUrl ||
                article.image ||
                "/assets/markt-steenwijk.jpg";

              const formattedDate = article.date || article.createdAt
                ? new Date(article.date || article.createdAt || "").toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Recent";

              const excerptText =
                article.description ||
                article.excerpt ||
                (article.content
                  ? article.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) + "..."
                  : "");

              const readingTime = getReadingTime(article);

              return (
                <article
                  key={article.id}
                  id={`carousel-article-${article.id}`}
                  className="group bg-card rounded-xl border border-border overflow-hidden hover-lift flex flex-col transition-all hover:border-accent/50 shadow-sm"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {/* Afbeelding bovenaan: compacte en beschaafde hoogte, GEEN overdreven grote foto */}
                  <Link
                    to={`/nieuws/${article.id}`}
                    className="h-36 sm:h-40 w-full bg-muted relative overflow-hidden block shrink-0"
                    title={article.title}
                  >
                    {effectiveThumbnail ? (
                      <img
                        src={effectiveThumbnail}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/assets/markt-steenwijk.jpg";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/50">
                        <Newspaper className="w-10 h-10 opacity-20" />
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 max-w-[90%] z-10">
                      <span className="px-2 py-0.5 bg-background/90 backdrop-blur-sm text-foreground text-[10px] font-semibold uppercase tracking-wider rounded-full shadow-sm flex items-center gap-1 border border-border/50">
                        <Tag className="w-2.5 h-2.5 text-accent" />
                        {article.category || "Algemeen"}
                      </span>
                      {(article.isPodcast || article.podcastAudioUrl) && (
                        <span className="px-2 py-0.5 bg-purple-600/95 backdrop-blur-sm text-white text-[10px] font-semibold rounded-full shadow-sm flex items-center gap-1 border border-purple-400/40">
                          <Headphones className="w-2.5 h-2.5" /> Podcast
                        </span>
                      )}
                      {article.videoUrl && (
                        <span className="px-2 py-0.5 bg-blue-600/95 backdrop-blur-sm text-white text-[10px] font-semibold rounded-full shadow-sm flex items-center gap-1 border border-blue-400/40">
                          <Video className="w-2.5 h-2.5" /> Video
                        </span>
                      )}
                      {article.wijkNaam && (
                        <span className="px-2 py-0.5 bg-accent/90 backdrop-blur-sm text-accent-foreground text-[10px] font-semibold rounded-full shadow-sm flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {article.wijkNaam}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Kaart Inhoud: ingekorte, directe afstand tussen beschrijving en lees meer */}
                  <div className="p-4 sm:p-5 flex flex-col justify-start">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5 font-medium">
                      <span>{formattedDate}</span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-accent" />
                        {readingTime} min
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-display font-bold mb-1.5 leading-snug group-hover:text-accent transition-colors line-clamp-2">
                      <Link to={`/nieuws/${article.id}`}>{article.title}</Link>
                    </h3>

                    <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2 leading-relaxed mb-2.5">
                      {excerptText}
                    </p>

                    {/* Footer direct strak en compact aansluitend onder de beschrijving */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-border/60 mt-0">
                      <Link
                        to={`/nieuws/${article.id}`}
                        className="inline-flex items-center text-xs font-semibold text-primary group-hover:text-accent transition-colors"
                      >
                        Lees meer{" "}
                        <ArrowRight className="ml-1.5 w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </Link>

                      {onShareArticle && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onShareArticle(article);
                          }}
                          className="p-1 rounded-full text-muted-foreground hover:text-accent hover:bg-accent/15 transition-all cursor-pointer"
                          title="Deel dit nieuwsbericht"
                          aria-label={`Deel bericht: ${article.title}`}
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

          {/* Pagina-indicatoren en teller onderaan - sluit direct en strak aan onder de 3 artikelen, uitgelijnd met videopaginering */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border mt-auto min-h-[56px] text-xs text-muted-foreground">
            <span>
              Toont {total > 0 ? currentPage * ITEMS_PER_PAGE + 1 : 0}–
              {Math.min((currentPage + 1) * ITEMS_PER_PAGE, total)} van {total} berichten
            </span>

            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={goToPrev}
                  className="h-8 px-2.5 text-xs border-border hover:border-accent text-foreground"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  <span>Vorige</span>
                </Button>

                <div className="flex items-center gap-1.5 px-1">
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

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages - 1}
                  onClick={goToNext}
                  className="h-8 px-2.5 text-xs border-border hover:border-accent text-foreground"
                >
                  <span>Volgende</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground/80">
                Alle berichten weergegeven
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
