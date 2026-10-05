import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Share2,
  MapPin,
  Tag,
  Clock,
  Volume2,
  Play,
  Pause,
  Square,
  ArrowRight,
  Headphones,
  Eye,
  Video,
  Settings,
  Radio,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { NewsItem } from "@/data/news";
import { useAuth } from "@/context/AuthContext";
import { ShareDialog } from "@/components/ShareDialog";
import { InteractiveArticleRenderer } from "@/components/InteractiveArticleRenderer";

export default function NieuwsDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);

  // Podcast views state & tracking
  const [podcastViews, setPodcastViews] = useState<number>(0);
  const [hasTrackedPlay, setHasTrackedPlay] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Is current viewer an administrator/beheerder?
  const isAdmin = Boolean(
    isAuthenticated &&
      user &&
      (user.role === "admin" ||
        user.role === "voorzitter" ||
        user.role === "secretaris" ||
        user.role === "penningmeester")
  );

  // Audio / Speech synthesis state for accessibility
  const [isPlayingSpeech, setIsPlayingSpeech] = useState<boolean>(false);
  const [isPausedSpeech, setIsPausedSpeech] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [speechRate, setSpeechRate] = useState<number>(1.0);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    fetch(`/api/news/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return null;
        }
        return res.json().catch(() => null);
      })
      .then((data: NewsItem | null) => {
        if (data && data.title) {
          setArticle(data);
          setPodcastViews(Number(data.podcastViews) || 0);
          document.title = `${data.title} | Lijst van Andel`;
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        console.error(err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Handle podcast playback tracking (increment view count)
  const handlePodcastPlay = async () => {
    if (!hasTrackedPlay && id) {
      setHasTrackedPlay(true);
      try {
        const res = await fetch(`/api/news/${id}/podcast-view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const result = await res.json();
          if (typeof result.podcastViews === "number") {
            setPodcastViews(result.podcastViews);
          } else {
            setPodcastViews((prev) => prev + 1);
          }
        }
      } catch (err) {
        console.error("Fout bij registreren weergave:", err);
      }
    }
  };

  // Clean up speech on unmount
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeechSupported(false);
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Calculate reading time
  const readingMinutes = useMemo(() => {
    if (!article) return 1;
    const cleanText = `${article.title || ""} ${article.description || article.excerpt || ""} ${article.content || ""}`;
    const plainText = cleanText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = plainText ? plainText.split(/\s+/).length : 0;
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [article]);

  const handleToggleSpeech = () => {
    if (!article) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Voorlezen wordt niet ondersteund door uw browser");
      return;
    }

    const synth = window.speechSynthesis;

    if (isPlayingSpeech && !isPausedSpeech) {
      synth.pause();
      setIsPausedSpeech(true);
      return;
    }

    if (isPlayingSpeech && isPausedSpeech) {
      synth.resume();
      setIsPausedSpeech(false);
      return;
    }

    synth.cancel();

    // Prepare clear text for speech synthesis
    const titleText = `Nieuwsbericht van Lijst van Andel: ${article.title}. `;
    const authorText = article.authorName ? `Geschreven door ${article.authorName}. ` : "";
    const bodyContent = (article.content || article.description || "")
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "$1. ")
      .replace(/<li[^>]*>(.*?)<\/li>/gi, "$1. ")
      .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1. ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "en")
      .replace(/\s+/g, " ")
      .trim();

    const fullText = `${titleText} ${authorText} ${bodyContent}`;
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = "nl-NL";
    utterance.rate = speechRate;

    const voices = synth.getVoices();
    const dutchVoice = voices.find(
      (v) => v.lang.startsWith("nl") || v.lang.includes("NL") || v.name.toLowerCase().includes("dutch")
    );
    if (dutchVoice) {
      utterance.voice = dutchVoice;
    }

    utterance.onstart = () => {
      setIsPlayingSpeech(true);
      setIsPausedSpeech(false);
    };

    utterance.onend = () => {
      setIsPlayingSpeech(false);
      setIsPausedSpeech(false);
    };

    utterance.onerror = () => {
      setIsPlayingSpeech(false);
      setIsPausedSpeech(false);
    };

    synth.speak(utterance);
  };

  const handleStopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingSpeech(false);
    setIsPausedSpeech(false);
  };

  const handleRateChange = () => {
    const nextRate = speechRate === 1.0 ? 1.25 : speechRate === 1.25 ? 0.9 : 1.0;
    setSpeechRate(nextRate);
    if (isPlayingSpeech) {
      handleStopSpeech();
      toast.info(`Spraaksnelheid ingesteld op ${nextRate}x`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] pt-36 pb-24 flex flex-col items-center justify-center text-center px-4">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground text-sm font-medium">Nieuwsbericht laden...</p>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="min-h-[70vh] pt-36 pb-24 flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-md bg-card border border-border p-8 rounded-2xl shadow-sm">
          <h2 className="text-2xl font-display mb-3">Bericht niet gevonden</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Het opgevraagde nieuwsbericht bestaat niet (meer) of is verplaatst.
          </p>
          <Link
            to="/nieuws"
            className="inline-flex items-center text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-5 py-2.5 rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Terug naar nieuwsoverzicht
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = article.createdAt
    ? new Date(article.createdAt).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : article.date
    ? new Date(article.date).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="pb-24 bg-background min-h-screen">
      {/* Header / Hero */}
      <div className="relative w-full h-[50vh] md:h-[60vh] bg-muted">
        {article.headerUrl || article.thumbnailUrl || article.image ? (
          <img
            src={article.headerUrl || article.thumbnailUrl || article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-primary/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="container mx-auto px-6 max-w-4xl -mt-40 relative z-10">
        <Link
          to="/nieuws"
          className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-primary transition-colors mb-8 bg-background/80 backdrop-blur px-4 py-2 rounded-full border border-border shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Terug naar overzicht
        </Link>

        <div className="bg-card rounded-2xl border border-border p-8 md:p-12 shadow-sm animate-fade-up">
          {/* Metadata Row with Category, Wijk, Date & Reading Time */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/15 text-accent text-xs font-semibold uppercase tracking-wider rounded-full">
              <Tag className="w-3 h-3" />
              {article.category || "Algemeen"}
            </span>

            {article.wijkNaam && (
              <Link
                to={`/wijken-en-kernen/${article.wijkSlug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary text-foreground text-xs font-semibold rounded-full hover:bg-secondary/80 transition-colors border border-border"
                title={`Bekijk alle informatie over ${article.wijkNaam}`}
              >
                <MapPin className="w-3.5 h-3.5 text-accent" /> {article.wijkNaam}
              </Link>
            )}

            <div className="flex items-center text-xs sm:text-sm text-muted-foreground font-medium ml-auto gap-3 flex-wrap">
              {isAdmin && (article.isPodcast || article.podcastAudioUrl) && (
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 font-semibold text-xs border border-purple-500/30"
                  title="Aantal podcast weergaven (zichtbaar voor beheerders)"
                >
                  <Headphones className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <Eye className="w-3.5 h-3.5" />
                  <span className="font-mono font-bold">{podcastViews}</span>
                  <span>{podcastViews === 1 ? "weergave" : "weergaven"}</span>
                </div>
              )}
              {formattedDate && (
                <div className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-accent" />
                  {formattedDate}
                </div>
              )}
              <span className="text-border hidden sm:inline">•</span>
              <div className="flex items-center text-xs">
                <Clock className="w-3.5 h-3.5 mr-1.5 text-accent" />
                {readingMinutes} min leestijd
              </div>
            </div>
          </div>

          <h1 className="text-3xl md:text-5xl font-display leading-tight mb-6">
            {article.title}
          </h1>

          {/* Beheerderspaneel voor Podcast weergaven (indien ingelogd als admin) */}
          {isAdmin && (article.isPodcast || article.podcastAudioUrl) && (
            <div className="mb-6 p-4 rounded-xl bg-purple-500/10 dark:bg-purple-950/30 border-2 border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">Podcast Statistieken</span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-purple-600 text-white tracking-wider">
                      Alleen Beheerders
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Live geregistreerde luisterbeurten en weergaven voor deze podcast aflevering.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="px-3.5 py-1.5 rounded-lg bg-background border border-purple-500/30 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs text-muted-foreground font-medium">Totaal weergaven:</span>
                  <span className="font-mono font-bold text-base text-purple-700 dark:text-purple-300">
                    {podcastViews}
                  </span>
                </div>
                <Link
                  to="/admin"
                  className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border transition-colors flex items-center gap-1.5"
                  title="Beheer nieuws en podcasts op /admin"
                >
                  <Settings className="w-3.5 h-3.5" /> Beheer
                </Link>
              </div>
            </div>
          )}

          {/* Podcast Audiospeler & Details */}
          {(article.isPodcast || article.podcastAudioUrl) && (
            <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-2 border-purple-500/30 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm shrink-0">
                    <Radio className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1">
                        <Headphones className="w-3 h-3" /> Podcast Aflevering
                      </span>
                      {article.podcastDuration && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5" /> {article.podcastDuration}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg md:text-xl font-display font-bold mt-1 text-foreground">
                      {article.podcastTitle || article.title}
                    </h3>
                  </div>
                </div>

                {/* Externe streaming links (Spotify, Apple Podcasts) */}
                {(article.podcastSpotifyUrl || article.podcastAppleUrl) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {article.podcastSpotifyUrl && (
                      <a
                        href={article.podcastSpotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#1DB954] text-white hover:bg-[#1aa34a] transition-all shadow-xs"
                      >
                        <ExternalLink className="w-3 h-3" /> Spotify
                      </a>
                    )}
                    {article.podcastAppleUrl && (
                      <a
                        href={article.podcastAppleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-xs"
                      >
                        <ExternalLink className="w-3 h-3" /> Apple Podcasts
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Audio player met automatische weergaventelling bij afspelen */}
              {article.podcastAudioUrl ? (
                <div className="space-y-2 pt-2 border-t border-purple-500/20">
                  <audio
                    ref={audioRef}
                    controls
                    onPlay={handlePodcastPlay}
                    className="w-full h-11 rounded-lg"
                    preload="metadata"
                  >
                    <source src={article.podcastAudioUrl} />
                    Uw browser ondersteunt de HTML5 audiospeler niet.
                  </audio>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-1 px-1">
                    <span>Druk op afspelen om deze podcast direct te beluisteren.</span>
                    {isAdmin && (
                      <span className="font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> {podcastViews} weergaven (zichtbaar voor beheerder)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic pt-2">
                  Deze podcast heeft geen direct audiobestand gekoppeld. Gebruik eventueel de externe Spotify / Apple knoppen hierboven.
                </p>
              )}
            </div>
          )}

          {/* Hoofdvideo Speler (indien meegeleverd als videoUrl en niet reeds in de tekst) */}
          {article.videoUrl && !article.content?.includes("<video") && (
            <figure className="my-8 rounded-2xl overflow-hidden border border-border shadow-md bg-black">
              {article.videoTitle && (
                <div className="p-3 bg-card border-b border-border text-xs font-semibold flex items-center gap-2 text-foreground">
                  <Video className="w-4 h-4 text-blue-500" />
                  <span>{article.videoTitle}</span>
                </div>
              )}
              <video
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[520px] object-contain bg-black"
              >
                <source src={article.videoUrl} type="video/mp4" />
                Uw browser ondersteunt de HTML5 videospeler niet.
              </video>
            </figure>
          )}

          {/* Optioneel: Auteur / (Burger)raadslid blok - zoals op wijken- en kernenpagina */}
          {(article.authorName || (article.author && article.author !== "Redactie" && article.author !== "Lijst van Andel")) && (
            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-3 text-xs mb-6">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0 border border-accent/30">
                  {article.authorAvatar ? (
                    <img
                      src={article.authorAvatar}
                      alt={article.authorName || article.author}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/assets/silhouette.png";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-accent/20 text-accent font-semibold text-[10px]">
                      {(article.authorName || article.author || "A").charAt(0)}
                    </div>
                  )}
                </div>
                <span className="font-medium text-foreground truncate">
                  {article.authorName || article.author}
                  {article.authorRole && (
                    <span className="text-muted-foreground ml-1.5 font-normal">
                      • {article.authorRole}
                    </span>
                  )}
                </span>
              </div>
              <Link
                to="/raadsleden"
                className="text-accent flex items-center gap-1 shrink-0 text-xs font-semibold hover:translate-x-1 transition-transform"
              >
                Bekijk raadslid <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Toegankelijkheid: Voorlezen / Audio speler */}
          {speechSupported && (
            <div className="mb-8 p-3.5 sm:p-4 rounded-xl bg-secondary/40 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isPlayingSpeech && !isPausedSpeech
                      ? "bg-accent text-accent-foreground animate-pulse"
                      : "bg-accent/15 text-accent"
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                    <span>Voorlezen voor toegankelijkheid</span>
                    {isPlayingSpeech && !isPausedSpeech && (
                      <span className="flex items-center gap-1 text-[11px] font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Voorlezen actief
                      </span>
                    )}
                    {isPlayingSpeech && isPausedSpeech && (
                      <span className="text-[11px] font-normal text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        Gepauzeerd
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Beluister dit nieuwsbericht in natuurlijk gesproken Nederlands.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleToggleSpeech}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
                    isPlayingSpeech && !isPausedSpeech
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                  title={
                    isPlayingSpeech
                      ? isPausedSpeech
                        ? "Hervat voorlezen"
                        : "Pauzeer voorlezen"
                      : "Start voorlezen"
                  }
                >
                  {isPlayingSpeech && !isPausedSpeech ? (
                    <>
                      <Pause className="w-3.5 h-3.5" /> Pauzeren
                    </>
                  ) : isPlayingSpeech && isPausedSpeech ? (
                    <>
                      <Play className="w-3.5 h-3.5" /> Hervatten
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> Beluister bericht
                    </>
                  )}
                </button>

                {isPlayingSpeech && (
                  <button
                    type="button"
                    onClick={handleStopSpeech}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors"
                    title="Voorlezen stoppen"
                  >
                    <Square className="w-3 h-3" /> Stop
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleRateChange}
                  className="px-2.5 py-1.5 rounded-full text-xs font-semibold bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors"
                  title={`Spraaksnelheid: ${speechRate}x (klik om te wijzigen)`}
                >
                  {speechRate}x
                </button>
              </div>
            </div>
          )}

          <div className="mb-12">
            {(article.description || article.excerpt) && (
              <p className="lead font-medium text-lg md:text-xl text-foreground mb-8 border-l-4 border-accent pl-4 py-1 leading-relaxed bg-accent/5 rounded-r">
                {article.description || article.excerpt}
              </p>
            )}

            {/* Render formatted HTML content with interactive dataproducts & hover-activated maps */}
            {article.content?.includes("<") ? (
              <InteractiveArticleRenderer content={article.content} />
            ) : (
              <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed text-base md:text-lg">
                {article.content}
              </div>
            )}
          </div>

          {/* Social Share Section - Alleen 'Deel via sociale media' */}
          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-display text-lg flex items-center">
                <Share2 className="w-5 h-5 mr-2.5 text-accent" /> Deel dit bericht
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Deel dit artikel met dorps- en stadsgenoten via sociale media of directe link.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShareDialogOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground font-semibold rounded-full text-xs hover:bg-accent/90 transition-all shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" /> Deel via sociale media
              </button>
            </div>
          </div>
        </div>
      </div>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        title={article.title}
        description={article.description || article.excerpt}
        url={window.location.href}
      />
    </div>
  );
}
