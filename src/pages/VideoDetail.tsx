import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Video as VideoIcon,
  Calendar,
  MapPin,
  Tag,
  Share2,
  Copy,
  Check,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Shuffle,
  Play,
  Pause,
  AlertCircle,
  Phone,
  User,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/VideoPlayer";
import { getVideoThumbnail } from "@/lib/videoUtils";
import { FractielidItem } from "@/components/FractielidWidget";
import { DEFAULT_FRACTIELEDEN } from "@/data/fractieleden";
import { ShareDialog } from "@/components/ShareDialog";
import { BelafspraakDialog } from "@/components/BelafspraakDialog";
import { toast } from "sonner";

interface VideoItem {
  id: string;
  title: string;
  burgerraadslidTitle?: string;
  category?: string;
  date?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  description?: string;
  fractieledenIds?: string[];
  wijkSlug?: string;
  views?: number;
}

export default function VideoDetail() {
  const { id } = useParams<{ id: string }>();

  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);
  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [fractieleden, setFractieleden] = useState<FractielidItem[]>(DEFAULT_FRACTIELEDEN);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sharing states
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Belafspraak state
  const [belOpen, setBelOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  // Random carousel state for right column
  const [shuffledVideos, setShuffledVideos] = useState<VideoItem[]>([]);
  const [carouselPage, setCarouselPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const ITEMS_PER_CAROUSEL_PAGE = 5;

  // 1. Fetch fractieleden
  useEffect(() => {
    fetch("/api/fractieleden")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: FractielidItem[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setFractieleden(data);
        }
      })
      .catch(() => {
        // Fallback already set
      });
  }, []);

  // 2. Fetch all videos & select current video
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch("/api/videos")
      .then((res) => (res.ok ? res.json() : []))
      .then((videos: VideoItem[]) => {
        setAllVideos(videos);

        const target = videos.find((v) => String(v.id).toLowerCase() === String(id).toLowerCase());
        if (target) {
          setCurrentVideo(target);
          // Initialiseer willekeurige volgorde voor alle overige video's van alle raadsleden
          const others = videos.filter((v) => String(v.id) !== String(target.id));
          const randomized = [...others].sort(() => Math.random() - 0.5);
          setShuffledVideos(randomized);
          setCarouselPage(0);
        } else {
          setError(`De opgevraagde video (ID: ${id}) kon niet worden gevonden.`);
        }
      })
      .catch((err) => {
        console.error("Fout bij ophalen van video:", err);
        setError("Er is een fout opgetreden bij het laden van de video.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Update document title for SEO & UX
  useEffect(() => {
    if (currentVideo) {
      const displayTitle = currentVideo.burgerraadslidTitle || currentVideo.title;
      document.title = `${displayTitle} | Lijst van Andel Video's`;
    }
  }, [currentVideo]);

  // Gekoppelde spreker (raadslid / burgerraadslid)
  const speaker = useMemo(() => {
    if (!currentVideo || !currentVideo.fractieledenIds || currentVideo.fractieledenIds.length === 0) {
      return fractieleden[0] || null;
    }
    const targetId = String(currentVideo.fractieledenIds[0]).toLowerCase();
    return (
      fractieleden.find(
        (m) =>
          String(m.id).toLowerCase() === targetId ||
          m.name.toLowerCase().includes(targetId)
      ) || fractieleden[0]
    );
  }, [currentVideo, fractieleden]);

  // Helper om een spreker voor een willekeurige video in de carrousel te vinden
  const getSpeakerForVideo = useCallback(
    (vid: VideoItem): FractielidItem | null => {
      if (!vid.fractieledenIds || vid.fractieledenIds.length === 0) return null;
      const targetId = String(vid.fractieledenIds[0]).toLowerCase();
      return (
        fractieleden.find((m) => String(m.id).toLowerCase() === targetId) ||
        DEFAULT_FRACTIELEDEN.find((m) => String(m.id).toLowerCase() === targetId) ||
        null
      );
    },
    [fractieleden]
  );

  // Willekeurige carrousel navigatie
  const totalCarouselPages = Math.ceil(shuffledVideos.length / ITEMS_PER_CAROUSEL_PAGE) || 1;

  const goToPrevCarousel = useCallback(() => {
    if (totalCarouselPages <= 1) return;
    setCarouselPage((p) => (p - 1 + totalCarouselPages) % totalCarouselPages);
  }, [totalCarouselPages]);

  const goToNextCarousel = useCallback(() => {
    if (totalCarouselPages <= 1) return;
    setCarouselPage((p) => (p + 1) % totalCarouselPages);
  }, [totalCarouselPages]);

  const shuffleVideos = useCallback(() => {
    if (!currentVideo) return;
    const others = allVideos.filter((v) => String(v.id) !== String(currentVideo.id));
    const randomized = [...others].sort(() => Math.random() - 0.5);
    setShuffledVideos(randomized);
    setCarouselPage(0);
    toast.success("Video's opnieuw willekeurig geschud!");
  }, [allVideos, currentVideo]);

  // Autoplay ticker voor de carrousel met willekeurige video's
  useEffect(() => {
    if (totalCarouselPages <= 1 || isPaused || isHovered) return;
    const interval = setInterval(() => {
      goToNextCarousel();
    }, 8500);
    return () => clearInterval(interval);
  }, [totalCarouselPages, isPaused, isHovered, goToNextCarousel]);

  // URL voor delen
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/video/${id}` : "";

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link gekopieerd naar klembord!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-12 min-h-[75vh]">
        <div className="h-4 w-40 bg-muted/60 rounded mb-8 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <div className="aspect-video bg-muted/70 rounded-xl animate-pulse" />
            <div className="h-8 bg-muted/60 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-muted/40 rounded w-1/3 animate-pulse" />
          </div>
          <div className="lg:col-span-4 space-y-3">
            <div className="h-6 bg-muted/60 rounded w-1/2 animate-pulse" />
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex gap-3 h-20 bg-muted/40 rounded p-2 animate-pulse">
                <div className="w-28 bg-muted/70 rounded shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-muted/60 rounded w-4/5" />
                  <div className="h-3 bg-muted/40 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentVideo) {
    return (
      <div className="container max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="font-display text-3xl mb-3">Video niet gevonden</h1>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          {error || "De opgevraagde videobijdrage is niet beschikbaar of verplaatst."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="bg-primary hover:bg-primary/90 font-semibold text-xs uppercase tracking-wider">
            <Link to="/fractie">
              <ArrowLeft className="w-4 h-4 mr-2" /> Bekijk fractieleden
            </Link>
          </Button>
          <Button asChild variant="outline" className="text-xs uppercase tracking-wider">
            <Link to="/nieuws">Naar nieuwsberichten</Link>
          </Button>
        </div>
      </div>
    );
  }

  const displayTitle = currentVideo.burgerraadslidTitle || currentVideo.title;
  const effectivePoster =
    getVideoThumbnail(currentVideo.videoUrl, currentVideo.thumbnailUrl) ||
    speaker?.imgUrl ||
    "/assets/markt-steenwijk.jpg";

  const formattedDate = currentVideo.date
    ? new Date(currentVideo.date).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Recent";

  const isBurger =
    speaker?.type?.toLowerCase() === "burgerraadslid" ||
    speaker?.role?.toLowerCase().includes("burgerraadslid");

  // Huidige zichtbare video's in de verticale carrousel
  const visibleCarouselVideos = shuffledVideos.slice(
    carouselPage * ITEMS_PER_CAROUSEL_PAGE,
    (carouselPage + 1) * ITEMS_PER_CAROUSEL_PAGE
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        {/* Navigatie / Terug-knop */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <nav aria-label="Kruimelpad" className="flex items-center gap-2">
            <Link to="/" className="hover:text-accent transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link to="/fractie" className="hover:text-accent transition-colors">
              Fractie
            </Link>
            {speaker && (
              <>
                <span>/</span>
                <Link
                  to={`/raadsleden/${speaker.id}`}
                  className="hover:text-accent transition-colors"
                >
                  {speaker.name}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-md">
              {displayTitle}
            </span>
          </nav>

          <Link
            to={speaker ? `/raadsleden/${speaker.id}` : "/fractie"}
            className="inline-flex items-center gap-1.5 font-semibold text-accent hover:text-accent/80 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Terug naar {speaker ? speaker.name : "overzicht"}</span>
          </Link>
        </div>

        {/* Hoofdindeling: Video links (8 cols), Willekeurige carrousel rechts (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* LINKER KOLOM: Grote videospeler, titel, deelknoppen, beschrijving en spreker profiel */}
          <div className="lg:col-span-8 space-y-6">
            {/* Videospeler container */}
            <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative border border-border">
              <VideoPlayer
                url={currentVideo.videoUrl}
                title={displayTitle}
                poster={effectivePoster}
              />
            </div>

            {/* Titel en Metadata */}
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2.5">
                <span className="px-2.5 py-0.5 rounded-sm bg-accent/15 border border-accent/30 text-[11px] uppercase tracking-wider text-accent font-semibold flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {currentVideo.category || (isBurger ? "Burgerraadslid Bijdrage" : "Raadsdebat")}
                </span>

                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span>{formattedDate}</span>
                </span>

                {currentVideo.wijkSlug && (
                  <Link
                    to={`/wijken-en-kernen/${currentVideo.wijkSlug}`}
                    className="flex items-center gap-1 text-muted-foreground hover:text-accent transition-colors"
                  >
                    <MapPin className="w-3 h-3 text-accent" />
                    <span className="capitalize">{currentVideo.wijkSlug.replace("-", " ")}</span>
                  </Link>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight">
                {displayTitle}
              </h1>
            </div>

            {/* Actiebalk: Social Share knoppen (geïnspireerd op referentie) */}
            <div className="py-3 px-4 bg-card rounded-lg border border-border flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                  Deel video:
                </span>

                {/* X (Twitter) */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    displayTitle
                  )}&url=${encodeURIComponent(shareUrl)}&hashtags=LijstvanAndel,Steenwijkerland`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-secondary/80 hover:bg-secondary text-foreground flex items-center justify-center transition-transform hover:scale-110"
                  title="Deel op X (Twitter)"
                  aria-label="Deel op X"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>

                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center transition-transform hover:scale-110"
                  title="Deel op Facebook"
                  aria-label="Deel op Facebook"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>

                {/* WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `${displayTitle} - ${shareUrl}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center transition-transform hover:scale-110"
                  title="Deel via WhatsApp"
                  aria-label="Deel via WhatsApp"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                  </svg>
                </a>

                {/* Telegram */}
                <a
                  href={`https://telegram.me/share/url?url=${encodeURIComponent(
                    shareUrl
                  )}&text=${encodeURIComponent(displayTitle)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center transition-transform hover:scale-110"
                  title="Deel via Telegram"
                  aria-label="Deel via Telegram"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.197 1.006.128.828.942z" />
                  </svg>
                </a>

                {/* Link kopiëren */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="h-8 px-2.5 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors border border-border"
                  title="Kopieer directe videolink"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">Gekopieerd!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-accent" />
                      <span>Kopieer link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Uitgebreide deelmodal knop */}
              <button
                type="button"
                onClick={() => setShareDialogOpen(true)}
                className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Meer opties</span>
              </button>
            </div>

            {/* Beschrijving */}
            {currentVideo.description && (
              <div className="bg-card rounded-lg border border-border p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Toelichting & Context
                </h3>
                <div
                  className={`text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap ${
                    !descExpanded && currentVideo.description.length > 250
                      ? "line-clamp-3"
                      : ""
                  }`}
                >
                  {currentVideo.description}
                </div>
                {currentVideo.description.length > 250 && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                  >
                    {descExpanded ? "Toon minder" : "Toon meer..."}
                  </button>
                )}
              </div>
            )}

            {/* Spreker / Raadslid Profielbalk (zoals kanaalbox in FVD referentie) */}
            {speaker && (
              <div className="bg-gradient-to-r from-card via-card to-secondary/30 rounded-xl border border-border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5 min-w-0">
                  <Link
                    to={`/raadsleden/${speaker.id}`}
                    className="w-14 h-14 rounded-full overflow-hidden bg-muted border-2 border-accent/40 shrink-0 hover:border-accent transition-colors block"
                    title={`Bekijk profiel van ${speaker.name}`}
                  >
                    {speaker.imgUrl ? (
                      <img
                        src={speaker.imgUrl}
                        alt={speaker.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/assets/silhouette.png";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-accent/20 text-accent font-bold">
                        {speaker.name.charAt(0)}
                      </div>
                    )}
                  </Link>

                  <div>
                    <h3 className="font-display text-lg font-bold hover:text-accent transition-colors">
                      <Link to={`/raadsleden/${speaker.id}`}>{speaker.name}</Link>
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span className="font-semibold text-accent uppercase tracking-wider text-[10px]">
                        {isBurger ? "Burgerraadslid" : (speaker.role || "Gemeenteraadslid")}
                      </span>
                      <span>•</span>
                      <span>Lijst van Andel Steenwijkerland</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto shrink-0">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs uppercase tracking-wider font-semibold border-border hover:border-accent"
                  >
                    <Link to={`/raadsleden/${speaker.id}`}>
                      <span>Bekijk profiel & alle video's</span>
                    </Link>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setBelOpen(true)}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Belafspraak</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* RECHTER KOLOM: Verticale Carrousel met Willekeurige Video's van Alle Raadsleden */}
          <aside
            className="lg:col-span-4 space-y-4"
            aria-label="Willekeurige video's van alle raadsleden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Carrousel Header met shuffle & navigatieknoppen */}
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <VideoIcon className="w-5 h-5 text-accent" />
                  <span>Meer Video's</span>
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Willekeurige video's van alle raadsleden
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Shuffle knop */}
                <button
                  type="button"
                  onClick={shuffleVideos}
                  title="Video's willekeurig husselen"
                  className="w-7 h-7 rounded-sm border border-border hover:border-accent text-muted-foreground hover:text-accent flex items-center justify-center transition-colors"
                  aria-label="Video's willekeurig husselen"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>

                {totalCarouselPages > 1 && (
                  <>
                    {/* Auto-scroll pauzeren/hervatten */}
                    <button
                      type="button"
                      onClick={() => setIsPaused(!isPaused)}
                      title={isPaused ? "Carrousel hervatten" : "Carrousel pauzeren"}
                      className="w-7 h-7 rounded-sm border border-border hover:border-accent text-muted-foreground hover:text-accent flex items-center justify-center transition-colors"
                      aria-label={isPaused ? "Carrousel hervatten" : "Carrousel pauzeren"}
                    >
                      {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    </button>

                    {/* Vorige pagina */}
                    <button
                      type="button"
                      onClick={goToPrevCarousel}
                      title="Vorige video's"
                      className="w-7 h-7 rounded-sm border border-border hover:border-accent text-foreground hover:text-accent flex items-center justify-center transition-colors bg-secondary/30 hover:bg-secondary/70"
                      aria-label="Vorige video's"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Volgende pagina */}
                    <button
                      type="button"
                      onClick={goToNextCarousel}
                      title="Volgende video's"
                      className="w-7 h-7 rounded-sm border border-border hover:border-accent text-foreground hover:text-accent flex items-center justify-center transition-colors bg-secondary/30 hover:bg-secondary/70"
                      aria-label="Volgende video's"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Lijst met willekeurige video's (verticale carrousel items) */}
            {shuffledVideos.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-6 text-center text-xs text-muted-foreground">
                Er zijn geen andere video's gevonden.
              </div>
            ) : (
              <div className="space-y-2.5">
                <div
                  key={carouselPage}
                  className="space-y-2.5 animate-fade-up"
                >
                  {visibleCarouselVideos.map((v) => {
                    const vTitle = v.burgerraadslidTitle || v.title || "Videobijdrage";
                    const vPoster =
                      getVideoThumbnail(v.videoUrl, v.thumbnailUrl) ||
                      "/assets/markt-steenwijk.jpg";
                    const vSpeaker = getSpeakerForVideo(v);

                    const vDate = v.date
                      ? new Date(v.date).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                        })
                      : "Recent";

                    return (
                      <Link
                        key={v.id}
                        to={`/video/${v.id}`}
                        className="group bg-card hover:bg-secondary/30 border border-border hover:border-accent/60 rounded-lg p-2.5 flex gap-3 items-stretch transition-all shadow-sm"
                        title={vTitle}
                      >
                        {/* Thumbnail met play-icoon overlay */}
                        <div className="aspect-video w-32 sm:w-36 rounded-md bg-black relative shrink-0 overflow-hidden">
                          <img
                            src={vPoster}
                            alt={vTitle}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/assets/markt-steenwijk.jpg";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="w-7 h-7 rounded-full bg-accent/90 text-accent-foreground flex items-center justify-center shadow group-hover:scale-110 transition-transform">
                              <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                            </div>
                          </div>
                          {v.category && (
                            <span className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-sm text-accent text-[9px] font-semibold px-1 py-0.5 rounded">
                              {v.category}
                            </span>
                          )}
                        </div>

                        {/* Video metadata rechts */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <h3 className="font-display font-semibold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                              {vTitle}
                            </h3>

                            {vSpeaker && (
                              <p className="text-[11px] text-muted-foreground mt-1 truncate flex items-center gap-1">
                                <User className="w-2.5 h-2.5 text-accent shrink-0" />
                                <span className="font-medium text-foreground/80 truncate">
                                  {vSpeaker.name}
                                </span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                            <span>{vDate}</span>
                            <span className="font-semibold text-accent group-hover:underline">
                              Bekijk video →
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Carrousel paginering footer */}
                {totalCarouselPages > 1 && (
                  <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground px-1 border-t border-border/50">
                    <span>
                      Pagina {carouselPage + 1} van {totalCarouselPages}
                    </span>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalCarouselPages }).map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCarouselPage(idx)}
                          className={`transition-all rounded-full ${
                            idx === carouselPage
                              ? "w-4 h-1.5 bg-accent"
                              : "w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                          }`}
                          aria-label={`Ga naar pagina ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Social Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        title={`${displayTitle} - ${speaker?.name || "Lijst van Andel"}`}
        description={currentVideo.description || `Bekijk deze videobijdrage in Steenwijkerland.`}
        url={shareUrl}
        imageUrl={effectivePoster}
      />

      {/* Belafspraak Dialog */}
      {speaker && (
        <BelafspraakDialog
          open={belOpen}
          onOpenChange={setBelOpen}
          defaultRaadslid={`${speaker.name} — ${speaker.role}`}
        />
      )}
    </div>
  );
}
