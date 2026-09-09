import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Star,
  FileText,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Calendar,
  Layers,
  Sparkles,
  LogIn,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import type { DocumentFavorite, DossierDocument } from "@/types/dossier";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface FavoritesCarouselProps {
  onOpenDocument?: (doc: DossierDocument) => void;
  onSelectDossier?: (slug: string) => void;
  refreshTrigger?: number;
  onFavoritesChange?: (favorites: DocumentFavorite[]) => void;
}

export const FavoritesCarousel: React.FC<FavoritesCarouselProps> = ({
  onOpenDocument,
  onSelectDossier,
  refreshTrigger = 0,
  onFavoritesChange,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<DocumentFavorite[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }

    const token =
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch("/api/council/documents/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const favs = data.favorites || [];
        setFavorites(favs);
        if (onFavoritesChange) onFavoritesChange(favs);
      }
    } catch (err) {
      console.warn("Could not fetch document favorites:", err);
    } finally {
      setLoading(false);
    }
  }, [user, onFavoritesChange]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites, refreshTrigger]);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 10);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      return () => el.removeEventListener("scroll", checkScroll);
    }
  }, [favorites]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (el) {
      const offset = direction === "left" ? -320 : 320;
      el.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const handleToggleFavorite = async (fav: DocumentFavorite, e: React.MouseEvent) => {
    e.stopPropagation();
    const token =
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (!token) {
      toast.error("Log in om favorieten te beheren");
      return;
    }

    // Optimistic removal
    setFavorites((prev) => prev.filter((item) => item.filename !== fav.filename));

    try {
      const res = await fetch("/api/council/documents/favorites/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: fav.filename,
          title: fav.title,
          dossier: fav.dossier,
          date: fav.date,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
        if (onFavoritesChange) onFavoritesChange(data.favorites || []);
        toast.info(`'${fav.title || fav.filename}' verwijderd uit favorieten`);
      } else {
        // Revert
        fetchFavorites();
      }
    } catch {
      fetchFavorites();
      toast.error("Fout bij bijwerken favoriet");
    }
  };

  const handleCardClick = (fav: DocumentFavorite) => {
    if (onOpenDocument) {
      const doc: DossierDocument = {
        id: `fav-${fav.filename}`,
        bestandsnaam: fav.filename,
        titel: fav.title || fav.filename,
        dossier: fav.dossier || "Overig",
        datum: fav.date || null,
        entiteiten: [],
        relaties: [],
        fileExists: fav.fileExists ?? true,
        fileUrl: fav.fileUrl || `/uploads/documents/${encodeURIComponent(fav.filename)}`,
        fileSize: fav.fileSize,
      };
      onOpenDocument(doc);
    }
  };

  // If not logged in, show small non-intrusive prompt
  if (!user) {
    return (
      <div className="bg-muted/30 border border-border/60 rounded-2xl p-3.5 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-500/20 text-amber-500" />
          </div>
          <div>
            <span className="font-semibold text-foreground">Favorieten Carrousel</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Log in om uw belangrijkste raadsstukken als favoriet vast te pinnen voor snelle toegang.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/login")}
          className="h-7 text-xs font-semibold gap-1.5 self-start sm:self-auto shrink-0 border-border"
        >
          <LogIn className="w-3 h-3" /> Inloggen
        </Button>
      </div>
    );
  }

  // Logged in with 0 favorites
  if (favorites.length === 0) {
    return (
      <div className="bg-card border border-dashed border-border rounded-2xl p-4 text-xs text-muted-foreground flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
          <Star className="w-4 h-4 fill-amber-500/20 text-amber-500" />
        </div>
        <div className="flex-1">
          <span className="font-semibold text-foreground">Mijn Favoriete Raadsstukken</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            U heeft nog geen stukken bewaard. Klik op de ster (★) bij een raadsstuk in de zoekbalk of dossiers om het hier vast te pinnen.
          </p>
        </div>
      </div>
    );
  }

  // Logged in with favorites list
  return (
    <div id="favorites-carousel-container" className="space-y-2">
      {/* Carousel Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          </div>
          <span className="text-xs font-bold text-foreground tracking-tight">
            Mijn Favoriete Raadsstukken ({favorites.length})
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            Direct openen of raadplegen
          </span>
        </div>

        {/* Scroll Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={!canScrollLeft}
            onClick={() => scroll("left")}
            className="h-7 w-7 p-0 rounded-lg text-muted-foreground disabled:opacity-30"
            title="Naar links schuiven"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!canScrollRight}
            onClick={() => scroll("right")}
            className="h-7 w-7 p-0 rounded-lg text-muted-foreground disabled:opacity-30"
            title="Naar rechts schuiven"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Carousel Scroll Track */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch gap-3 overflow-x-auto pb-2 scroll-smooth no-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {favorites.map((fav) => (
          <div
            key={fav.id || fav.filename}
            onClick={() => handleCardClick(fav)}
            className="group relative flex flex-col justify-between w-64 shrink-0 p-3 rounded-2xl bg-card border border-border/80 hover:border-accent/60 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer text-left"
          >
            {/* Top row: PDF Icon, Dossier Badge & Star */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent truncate max-w-[130px]">
                  {fav.dossier}
                </span>
              </div>

              {/* Star Button */}
              <button
                onClick={(e) => handleToggleFavorite(fav, e)}
                className="w-6 h-6 rounded-md hover:bg-amber-500/20 text-amber-500 flex items-center justify-center transition-colors shrink-0"
                title="Verwijder uit favorieten"
              >
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              </button>
            </div>

            {/* Title & Filename */}
            <div className="space-y-1 mb-2.5">
              <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                {fav.title || fav.filename}
              </h4>
              <p className="text-[10px] font-mono text-muted-foreground truncate" title={fav.filename}>
                {fav.filename}
              </p>
            </div>

            {/* Bottom row: Date & Quick open */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{fav.date || "Zonder datum"}</span>
              </div>
              <span className="text-accent group-hover:underline flex items-center gap-0.5 font-medium">
                Bekijken <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
