import React, { useState, useEffect, useRef } from "react";
import {
  Headphones,
  Play,
  Pause,
  Clock,
  MapPin,
  Calendar,
  ExternalLink,
  Volume2,
  VolumeX,
  RotateCcw,
  Eye,
  Filter,
  Sparkles,
  Share2
} from "lucide-react";
import { ChromecastButton } from "./ChromecastButton";
import { PodcastItem } from "@/types/podcast";
import { useAuth } from "@/context/AuthContext";

export function PodcastSection() {
  const { user, isAuthenticated } = useAuth();
  const [podcasts, setPodcasts] = useState<PodcastItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activePodcastId, setActivePodcastId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeViews, setActiveViews] = useState<{ [id: string]: number }>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reportedMilestones = useRef<{ [podcastId: string]: Set<string> }>({});

  const isAdmin = Boolean(
    isAuthenticated &&
      user &&
      (user.role === "admin" ||
        user.role === "voorzitter" ||
        user.role === "secretaris" ||
        user.role === "penningmeester")
  );

  useEffect(() => {
    fetchPodcasts();
  }, []);

  const fetchPodcasts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/podcasts");
      if (res.ok) {
        const data: PodcastItem[] = await res.json();
        setPodcasts(data);
        const viewsMap: { [id: string]: number } = {};
        data.forEach((p) => {
          viewsMap[p.id] = p.views || 0;
        });
        setActiveViews(viewsMap);
      }
    } catch (err) {
      console.error("Failed to load podcasts:", err);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    "all",
    ...Array.from(new Set(podcasts.map((p) => p.category).filter(Boolean))),
  ];

  const filteredPodcasts =
    selectedCategory === "all"
      ? podcasts
      : podcasts.filter(
          (p) => p.category?.toLowerCase() === selectedCategory.toLowerCase()
        );

  const activePodcast = podcasts.find((p) => p.id === activePodcastId) || null;

  const trackMilestone = (podcastId: string, milestone: "start" | "p25" | "p50" | "p75" | "p100") => {
    if (!reportedMilestones.current[podcastId]) {
      reportedMilestones.current[podcastId] = new Set();
    }
    if (reportedMilestones.current[podcastId].has(milestone)) return;
    reportedMilestones.current[podcastId].add(milestone);

    fetch(`/api/podcasts/${podcastId}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ milestone }),
    })
      .then((r) => r.json())
      .then((result) => {
        if (typeof result.views === "number") {
          setActiveViews((prev) => ({ ...prev, [podcastId]: result.views }));
        }
      })
      .catch(() => {});
  };

  const handlePlayToggle = (podcast: PodcastItem) => {
    if (!podcast.audioUrl) {
      if (podcast.spotifyUrl) {
        window.open(podcast.spotifyUrl, "_blank");
      } else if (podcast.appleUrl) {
        window.open(podcast.appleUrl, "_blank");
      }
      return;
    }

    if (activePodcastId === podcast.id) {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play().catch(console.error);
          setIsPlaying(true);
        }
      }
    } else {
      setActivePodcastId(podcast.id);
      setIsPlaying(true);
      setCurrentTime(0);
      trackMilestone(podcast.id, "start");
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.playbackRate = playbackSpeed;
          audioRef.current.play().catch(console.error);
        }
      }, 50);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current || !activePodcastId) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 1;
    setCurrentTime(cur);
    setDuration(dur);

    const ratio = cur / dur;
    if (ratio >= 0.25) trackMilestone(activePodcastId, "p25");
    if (ratio >= 0.5) trackMilestone(activePodcastId, "p50");
    if (ratio >= 0.75) trackMilestone(activePodcastId, "p75");
    if (ratio >= 0.98) trackMilestone(activePodcastId, "p100");
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const next = !isMuted;
    audioRef.current.muted = next;
    setIsMuted(next);
  };

  const cycleSpeed = () => {
    if (!audioRef.current) return;
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    audioRef.current.playbackRate = nextSpeed;
    setPlaybackSpeed(nextSpeed);
  };

  const rewind10 = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  };

  return (
    <div className="mt-24 border-t border-border/80 pt-16">
      {/* Hidden audio element for playback */}
      {activePodcast?.audioUrl && (
        <audio
          ref={audioRef}
          src={activePodcast.audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            setIsPlaying(false);
            if (activePodcastId) trackMilestone(activePodcastId, "p100");
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration || 0);
            }
          }}
        />
      )}

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold uppercase tracking-wider mb-3">
          <Headphones className="w-3.5 h-3.5" />
          Podcast & Audio
        </div>
        <h2 className="text-3xl md:text-4xl font-display text-zinc-950 dark:text-white mb-3">
          Lijst van Andel Podcasts
        </h2>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
          Beluister gesprekken over actuele onderwerpen, interviews met inwoners en standpunten van Lijst van Andel in Steenwijkerland.
        </p>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 2 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-card border border-border/70 hover:border-purple-500/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat === "all" ? "Alle Afleveringen" : cat}
            </button>
          ))}
        </div>
      )}

      {/* Sticky / Active Audio Player when an episode is playing */}
      {activePodcast && activePodcast.audioUrl && (
        <div className="mb-10 bg-gradient-to-r from-purple-950/20 via-purple-900/10 to-background border-2 border-purple-500/40 rounded-2xl p-5 shadow-lg animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={activePodcast.thumbnailUrl || "/assets/news-kopwijzer.jpg"}
                alt={activePodcast.title}
                className="w-16 h-16 rounded-xl object-cover border border-purple-500/30 shrink-0 shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/steenwijk-aerial.webp";
                }}
              />
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-0.5">
                  Nu aan het afspelen • {activePodcast.category}
                </span>
                <h4 className="font-display text-base md:text-lg text-foreground truncate max-w-xl">
                  {activePodcast.title}
                </h4>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{activePodcast.author || "Lijst van Andel"}</span>
                  {activePodcast.wijkNaam && (
                    <span className="flex items-center gap-1 text-accent font-medium">
                      <MapPin className="w-3 h-3" /> {activePodcast.wijkNaam}
                    </span>
                  )}
                  {isAdmin && (
                    <span className="flex items-center gap-1 text-purple-600 dark:text-purple-300 font-mono font-semibold" title="Live weergaven (zichtbaar voor beheerder)">
                      <Eye className="w-3 h-3" /> {activeViews[activePodcast.id] ?? (activePodcast.views || 0)} weergaven
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <button
                onClick={rewind10}
                title="10 seconden terug"
                className="p-2 rounded-lg bg-card border border-border/80 hover:bg-muted text-foreground transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => handlePlayToggle(activePodcast)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{isPlaying ? "Pauzeren" : "Afspelen"}</span>
              </button>

              <button
                onClick={cycleSpeed}
                title="Afspeelsnelheid wijzigen"
                className="px-2.5 py-1.5 rounded-lg bg-card border border-border/80 hover:bg-muted text-xs font-mono font-bold text-foreground transition-colors"
              >
                {playbackSpeed}x
              </button>

              <button
                onClick={toggleMute}
                title={isMuted ? "Geluid aan" : "Dempen"}
                className="p-2 rounded-lg bg-card border border-border/80 hover:bg-muted text-foreground transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {activePodcast.audioUrl && (
                <ChromecastButton
                  mediaUrl={activePodcast.audioUrl}
                  mediaTitle={activePodcast.title}
                />
              )}
            </div>
          </div>

          {/* Time scrubber */}
          <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCurrentTime(val);
                if (audioRef.current) audioRef.current.currentTime = val;
              }}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <span className="text-xs font-mono text-muted-foreground w-12">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      )}

      {/* Podcast Grid */}
      {loading ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Podcasts inladen...</p>
        </div>
      ) : filteredPodcasts.length === 0 ? (
        <div className="text-center py-14 bg-card rounded-2xl border border-border/80 p-8">
          <Headphones className="w-10 h-10 mx-auto mb-3 text-purple-600/40" />
          <h3 className="font-display text-lg text-foreground mb-1">
            Momenteel geen podcasts beschikbaar
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Er zijn nog geen afleveringen geplaatst in deze categorie. Zodra een nieuwe podcast wordt gepubliceerd, verschijnt deze hier direct.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredPodcasts.map((podcast) => {
            const isThisPlaying = activePodcastId === podcast.id && isPlaying;
            return (
              <div
                key={podcast.id}
                className={`bg-card rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between hover:shadow-md ${
                  activePodcastId === podcast.id
                    ? "border-purple-500 shadow-purple-500/10 shadow-lg"
                    : "border-border/80 hover:border-purple-500/50"
                }`}
              >
                <div>
                  {/* Thumbnail Banner with Play Overlay */}
                  <div className="relative aspect-video w-full overflow-hidden bg-muted group">
                    <img
                      src={podcast.thumbnailUrl || "/assets/news-kopwijzer.jpg"}
                      alt={podcast.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/assets/steenwijk-aerial.webp";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 bg-purple-900/90 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full shadow-sm flex items-center gap-1 border border-purple-400/30">
                        <Headphones className="w-3 h-3" />
                        {podcast.category || "Podcast"}
                      </span>

                      {podcast.wijkNaam && (
                        <span className="px-2.5 py-1 bg-background/90 backdrop-blur-sm text-foreground text-[11px] font-medium rounded-full shadow-sm flex items-center gap-1 border border-border/60">
                          <MapPin className="w-3 h-3 text-accent" />
                          {podcast.wijkNaam}
                        </span>
                      )}
                    </div>

                    {/* Duration badge */}
                    {podcast.duration && (
                      <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[11px] font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {podcast.duration}
                      </div>
                    )}

                    {/* Big Center Play Button */}
                    <button
                      onClick={() => handlePlayToggle(podcast)}
                      aria-label={isThisPlaying ? "Pauzeren" : "Beluisteren"}
                      className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-xl transition-transform transform active:scale-90 hover:scale-110"
                    >
                      {isThisPlaying ? (
                        <Pause className="w-6 h-6 fill-white" />
                      ) : (
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      )}
                    </button>

                    {/* Admin Views Overlay */}
                    {isAdmin && (
                      <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-white text-[10px] font-mono flex items-center gap-1" title="Live weergaven (zichtbaar voor beheerder)">
                        <Eye className="w-3 h-3 text-purple-400" />
                        <span>{activeViews[podcast.id] ?? (podcast.views || 0)} views</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(podcast.date || podcast.createdAt || 0).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        })}
                      </span>
                      <span>•</span>
                      <span>{podcast.author || "Lijst van Andel"}</span>
                    </div>

                    <h3 className="font-display text-lg text-foreground mb-2 leading-snug">
                      {podcast.title}
                    </h3>

                    {podcast.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                        {podcast.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 pt-0 border-t border-border/40 mt-auto flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => handlePlayToggle(podcast)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
                  >
                    {isThisPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-white" /> Pauzeer
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" /> Direct Luisteren
                      </>
                    )}
                  </button>

                  {/* External Podcast Platform Links */}
                  <div className="flex items-center gap-2">
                    {podcast.spotifyUrl && (
                      <a
                        href={podcast.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] text-[11px] font-semibold transition-colors"
                        title="Beluister op Spotify"
                      >
                        <ExternalLink className="w-3 h-3" /> Spotify
                      </a>
                    )}
                    {podcast.appleUrl && (
                      <a
                        href={podcast.appleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FA2D48]/10 hover:bg-[#FA2D48]/20 text-[#FA2D48] text-[11px] font-semibold transition-colors"
                        title="Beluister op Apple Podcasts"
                      >
                        <ExternalLink className="w-3 h-3" /> Apple
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
