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

  const speakerName = speaker?.name || "Lijst van Andel";
  let cleanVideoTitle = (currentVideo.burgerraadslidTitle || currentVideo.title || "").trim();
  const nameOverRegex = new RegExp(`^${speakerName}\\s+over\\s+`, "i");
  cleanVideoTitle = cleanVideoTitle.replace(nameOverRegex, "");
  cleanVideoTitle = cleanVideoTitle.replace(/^(?:videobijdrage|video bijdrage|videobijdragen|video-bijdrage|tussenkomst|bijdrage|inbreng|toelichting)\s*(?:over\s*)?/i, "");
  cleanVideoTitle = cleanVideoTitle.replace(/^['"‘“](.*)['"’”]$/, "$1").trim() || "het raadsvoorstel";
  const displayTitle = `${speakerName} over ‘${cleanVideoTitle}’`;

  const effectivePoster =
    getVideoThumbnail(currentVideo.videoUrl, currentVideo.thumbnailUrl, currentVideo.id) ||
    `/api/videos/${currentVideo.id}/thumbnail.jpg`;

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
                  {currentVideo.category || (isBurger ? "Burgerraadslid" : "Raadsdebat")}
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

            {/* Actiebalk: Alleen de deelknop met alle opties in de dialoog */}
            <div className="py-2.5 px-4 bg-card rounded-lg border border-border flex items-center justify-between gap-3 shadow-sm">
              <span className="text-xs text-muted-foreground font-medium">
                Vind je deze bijdrage waardevol? Deel hem met anderen:
              </span>
              <Button
                type="button"
                onClick={() => setShareDialogOpen(true)}
                variant="outline"
                size="sm"
                className="border-border hover:border-accent text-foreground hover:text-accent font-semibold text-xs gap-2 shrink-0 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-accent" />
                <span>Video delen</span>
              </Button>
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

          {/* RECHTER KOLOM: Verticale Carrousel met Willekeurige Video's van Alle Raadsleden (handmatig bladeren) */}
          <aside
            className="lg:col-span-4 space-y-4"
            aria-label="Willekeurige video's van alle raadsleden"
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
                    const vSpeaker = getSpeakerForVideo(v);
                    const vSpeakerName = vSpeaker?.name || "Lijst van Andel";
                    let cleanVTitle = (v.burgerraadslidTitle || v.title || "").trim();
                    const nameOverRegex = new RegExp(`^${vSpeakerName}\\s+over\\s+`, "i");
                    cleanVTitle = cleanVTitle.replace(nameOverRegex, "");
                    cleanVTitle = cleanVTitle.replace(/^(?:videobijdrage|video bijdrage|videobijdragen|video-bijdrage|tussenkomst|bijdrage|inbreng|toelichting)\s*(?:over\s*)?/i, "");
                    cleanVTitle = cleanVTitle.replace(/^['"‘“](.*)['"’”]$/, "$1").trim() || "het raadsvoorstel";
                    const vTitle = `${vSpeakerName} over ‘${cleanVTitle}’`;
                    const vPoster =
                      getVideoThumbnail(v.videoUrl, v.thumbnailUrl, v.id) ||
                      `/api/videos/${v.id}/thumbnail.jpg`;

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
        title={`${displayTitle} | Lijst van Andel`}
        description={currentVideo.description || `Bekijk hoe ${speaker?.name || "Lijst van Andel"} spreekt over ‘${cleanVideoTitle}’ in de gemeenteraad van Steenwijkerland.`}
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
