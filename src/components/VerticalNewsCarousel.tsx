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
  Play,
  Pause,
  User,
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"up" | "down">("down");
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const total = newsItems.length;

  // Reset index if items change or index is out of bounds
  useEffect(() => {
    if (currentIndex >= total && total > 0) {
      setCurrentIndex(0);
    }
  }, [total, currentIndex]);

  const goToPrev = useCallback(() => {
    if (total <= 1) return;
    setDirection("up");
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToNext = useCallback(() => {
    if (total <= 1) return;
    setDirection("down");
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToIndex = (index: number) => {
    if (index === currentIndex) return;
    setDirection(index > currentIndex ? "down" : "up");
    setCurrentIndex(index);
  };

  // Autoplay ticker timer: advances every 6 seconds if not paused/hovered
  useEffect(() => {
    if (total <= 1 || isPaused || isHovered) return;

    const interval = setInterval(() => {
      goToNext();
    }, 6500);

    return () => clearInterval(interval);
  }, [total, isPaused, isHovered, goToNext]);

  // Handle keyboard arrow navigation inside carousel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      goToPrev();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      goToNext();
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="h-6 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="bg-card border border-border rounded-sm p-6 space-y-4 h-[440px] flex flex-col justify-between animate-pulse">
          <div className="aspect-video bg-muted/70 rounded-sm" />
          <div className="space-y-2">
            <div className="h-4 bg-muted/60 rounded w-1/3" />
            <div className="h-6 bg-muted/80 rounded w-4/5" />
            <div className="h-3 bg-muted/50 rounded w-full" />
            <div className="h-3 bg-muted/50 rounded w-2/3" />
          </div>
          <div className="h-9 bg-muted/70 rounded w-full" />
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
            Nieuwsberichten, opiniestukken en verslagen gekoppeld aan {member.name}.
          </p>
        </div>

        {total > 1 && (
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

            {/* Omhoog / Vorig bericht knop */}
            <button
              type="button"
              onClick={goToPrev}
              title="Vorig bericht"
              aria-label="Vorig bericht"
              className="w-8 h-8 rounded-sm border border-border hover:border-accent text-foreground hover:text-accent flex items-center justify-center transition-colors bg-secondary/30 hover:bg-secondary/70"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            {/* Omlaag / Volgend bericht knop */}
            <button
              type="button"
              onClick={goToNext}
              title="Volgend bericht"
              aria-label="Volgend bericht"
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
        <div className="relative">
          {/* Verticale carrousel viewport met vloeiende transitie */}
          <div className="relative overflow-hidden min-h-[460px] rounded-sm">
            {newsItems.map((article, idx) => {
              if (idx !== currentIndex) return null;

              const cleanExcerpt =
                article.excerpt ||
                article.description ||
                (article.content ? article.content.replace(/<[^>]*>/g, "").slice(0, 180) + "..." : "");

              const effectiveThumbnail =
                article.thumbnailUrl ||
                article.headerUrl ||
                article.image ||
                "/assets/markt-steenwijk.jpg";

              return (
                <article
                  key={article.id}
                  id={`carousel-article-${article.id}`}
                  className={`bg-card border border-border rounded-sm overflow-hidden flex flex-col justify-between h-full shadow-sm hover:border-accent/60 transition-all duration-500 ${
                    direction === "down" ? "animate-fade-up" : "animate-fade-down"
                  }`}
                >
                  {/* Artikel Afbeelding & Tags */}
                  <div className="relative aspect-[16/9] bg-muted overflow-hidden group">
                    <img
                      src={effectiveThumbnail}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/assets/markt-steenwijk.jpg";
                      }}
                    />

                    {/* Gradient overlay voor leesbaarheid */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                    {/* Categorie & Wijk tags */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
                      <span className="bg-primary/90 backdrop-blur-sm text-primary-foreground text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm shadow">
                        {article.category || "Nieuws"}
                      </span>
                      {article.wijkSlug && (
                        <span className="bg-background/90 backdrop-blur-sm text-foreground text-[10px] font-semibold px-2 py-0.5 rounded-sm shadow flex items-center gap-1 border border-border/50">
                          <MapPin className="w-2.5 h-2.5 text-accent" />
                          <span className="capitalize">
                            {article.wijkNaam || article.wijkSlug.replace("-", " ")}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Datum & Auteur overlay onderaan afbeelding */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white/90 z-10">
                      <div className="flex items-center gap-1.5 drop-shadow-sm">
                        <Calendar className="w-3.5 h-3.5 text-accent" />
                        <span>
                          {article.date
                            ? new Date(article.date).toLocaleDateString("nl-NL", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : "Onlangs"}
                        </span>
                      </div>

                      {total > 1 && (
                        <div className="bg-black/60 backdrop-blur-sm text-accent text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sm border border-accent/40">
                          {currentIndex + 1} / {total}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Artikel Tekst & Informatie */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Gekoppeld aan fractielid auteur badge */}
                      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border/60 text-xs">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-muted shrink-0 border border-accent/40">
                          {article.authorAvatar || member.imgUrl ? (
                            <img
                              src={article.authorAvatar || member.imgUrl}
                              alt={member.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/assets/silhouette.png";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-accent/20 text-accent font-semibold text-[10px]">
                              {member.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-foreground truncate">
                          {article.authorName || article.author || member.name}
                          <span className="text-muted-foreground ml-1.5 font-normal">
                            • {article.authorRole || member.role}
                          </span>
                        </span>
                      </div>

                      {/* Titel met directe doorkliklink */}
                      <h3 className="font-display text-xl sm:text-2xl font-bold leading-snug mb-3 hover:text-accent transition-colors">
                        <Link to={`/nieuws/${article.id}`}>{article.title}</Link>
                      </h3>

                      {/* Inleiding / Excerpt */}
                      {cleanExcerpt && (
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-4 mb-4">
                          {cleanExcerpt}
                        </p>
                      )}
                    </div>

                    {/* Actieknoppen onderaan */}
                    <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-3">
                      <Button
                        asChild
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs uppercase tracking-wider font-semibold shadow-sm flex-1"
                      >
                        <Link to={`/nieuws/${article.id}`}>
                          <span>Lees bericht</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Link>
                      </Button>

                      {onShareArticle && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onShareArticle(article)}
                          title="Deel dit bericht"
                          aria-label={`Deel bericht: ${article.title}`}
                          className="text-xs border-border hover:border-accent text-foreground hover:text-accent px-3 shrink-0"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Verticale stappen / bullet navigatie (indien meerdere berichten) */}
          {total > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3 pt-2">
              {newsItems.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToIndex(idx)}
                  className={`transition-all duration-300 rounded-full ${
                    idx === currentIndex
                      ? "w-6 h-2 bg-accent shadow"
                      : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  }`}
                  aria-label={`Ga naar bericht ${idx + 1}: ${item.title}`}
                  title={`${item.title} (${idx + 1}/${total})`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
