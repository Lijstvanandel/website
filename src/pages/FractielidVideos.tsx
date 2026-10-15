import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Video, Calendar, Tag, MapPin, AlertCircle, Share2, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FractielidWidget, FractielidItem } from "@/components/FractielidWidget";
import { BelafspraakDialog } from "@/components/BelafspraakDialog";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ShareDialog } from "@/components/ShareDialog";
import { VerticalNewsCarousel } from "@/components/VerticalNewsCarousel";
import { getVideoThumbnail } from "@/lib/videoUtils";
import { DEFAULT_FRACTIELEDEN } from "@/data/fractieleden";
import { NewsItem } from "@/data/news";

interface VideoItem {
  id: string;
  title: string;
  burgerraadslidTitle?: string;
  description?: string;
  category: string;
  date: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  wijkSlug?: string;
  fractieledenIds?: string[];
}

export default function FractielidVideos() {
  const { id } = useParams<{ id: string }>();

  // Synchronous initial fallback resolution for 0ms First Contentful Paint & 0 CLS
  const defaultMember = React.useMemo(() => {
    return DEFAULT_FRACTIELEDEN.find((m) => String(m.id) === String(id)) || null;
  }, [id]);

  const [member, setMember] = useState<FractielidItem | null>(defaultMember);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(!defaultMember);
  const [videosLoading, setVideosLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [belOpen, setBelOpen] = useState(false);
  const [voorgeselecteerd, setVoorgeselecteerd] = useState<string | undefined>(undefined);

  // Paginering voor gekoppelde video's (per 6)
  const [videoPage, setVideoPage] = useState(1);
  const VIDEOS_PER_PAGE = 6;

  // Social share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareData, setShareData] = useState<{
    title: string;
    description?: string;
    url?: string;
    imageUrl?: string;
  }>({
    title: "",
    description: "",
    url: "",
    imageUrl: "",
  });

  useEffect(() => {
    if (defaultMember) {
      setMember((prev) => prev || defaultMember);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setVideosLoading(true);
    setNewsLoading(true);

    // 1. Fetch targeted fractielid videos with fast fallback
    fetch(`/api/videos?memberId=${encodeURIComponent(id || "")}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((videosData: VideoItem[]) => {
        if (Array.isArray(videosData)) {
          // Sort by date descending
          const sorted = [...videosData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setVideos(sorted);
        }
      })
      .catch((err) => {
        console.warn("Fout bij ophalen fractielid video data:", err);
      })
      .finally(() => {
        setVideosLoading(false);
      });

    // 2. Fetch targeted fractielid gekoppelde nieuwsberichten (geen fallback of voorbeelddata)
    fetch(`/api/news?memberId=${encodeURIComponent(id || "")}&includeAll=true`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: NewsItem[]) => {
        if (Array.isArray(data)) {
          const sorted = [...data].sort(
            (a, b) =>
              new Date(b.date || b.createdAt || 0).getTime() -
              new Date(a.date || a.createdAt || 0).getTime()
          );
          setNewsItems(sorted);
        } else {
          setNewsItems([]);
        }
      })
      .catch((err) => {
        console.warn("Fout bij ophalen gekoppelde nieuwsberichten:", err);
        setNewsItems([]);
      })
      .finally(() => {
        setNewsLoading(false);
      });

    // 3. Optionally refresh member info in background if customized
    fetch("/api/fractieleden")
      .then((res) => (res.ok ? res.json() : []))
      .then((ledenData: FractielidItem[]) => {
        if (Array.isArray(ledenData)) {
          const found = ledenData.find((l) => String(l.id) === String(id));
          if (found) {
            setMember(found);
          }
        }
      })
      .catch(() => {});
  }, [id, defaultMember]);

  // Reset paginering als het fractielid verandert
  useEffect(() => {
    setVideoPage(1);
  }, [id]);

  const totalVideoPages = Math.ceil(videos.length / VIDEOS_PER_PAGE) || 1;
  const paginatedVideos = videos.slice(
    (videoPage - 1) * VIDEOS_PER_PAGE,
    videoPage * VIDEOS_PER_PAGE
  );

  // Handle deep-link anchor or ?v=ID parameter scrolling without forced reflow
  useEffect(() => {
    if (videosLoading || videos.length === 0) return;

    // Check query params ?v= or ?video=
    const params = new URLSearchParams(window.location.search);
    const targetVideoId = params.get("v") || params.get("video");

    let targetElementId = "";
    if (targetVideoId) {
      targetElementId = `video-item-${targetVideoId}`;
    } else if (window.location.hash) {
      targetElementId = window.location.hash.replace("#", "");
    }

    if (targetElementId) {
      const el = document.getElementById(targetElementId);
      if (el) {
        const timer = setTimeout(() => {
          requestAnimationFrame(() => {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-2", "ring-accent");
            setTimeout(() => {
              el.classList.remove("ring-2", "ring-accent");
            }, 3000);
          });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [videosLoading, videos]);

  const handleOpenBelafspraak = (lid: FractielidItem) => {
    setVoorgeselecteerd(`${lid.name} — ${lid.role}`);
    setBelOpen(true);
  };

  const handleShareMemberPage = () => {
    const pageUrl = window.location.origin + window.location.pathname;
    setShareData({
      title: `${member?.name || "Fractielid"} | Lijst van Andel`,
      description: `Bekijk de debatten, videobijdragen en nieuwsberichten van ${member?.name || "Lijst van Andel"} in Steenwijkerland.`,
      url: pageUrl,
      imageUrl: member?.imgUrl || "/assets/logo.png",
    });
    setShareDialogOpen(true);
  };

  const handleShareVideo = (video: VideoItem) => {
    let cleanVTitle = (video.burgerraadslidTitle || video.title || "").trim();
    const nameOverRegex = new RegExp(`^${member?.name || "Lijst van Andel"}\\s+over\\s+`, "i");
    cleanVTitle = cleanVTitle.replace(nameOverRegex, "");
    cleanVTitle = cleanVTitle.replace(/^(?:videobijdrage|video bijdrage|videobijdragen|video-bijdrage|tussenkomst|bijdrage|inbreng|toelichting)\s*(?:over\s*)?/i, "");
    cleanVTitle = cleanVTitle.replace(/^['"‘“](.*)['"’”]$/, "$1").trim() || "het raadsvoorstel";
    const formattedTitle = `${member?.name || "Lijst van Andel"} over ‘${cleanVTitle}’`;
    const videoUrl = `${window.location.origin}/video/${video.id}`;
    setShareData({
      title: `${formattedTitle} | Lijst van Andel`,
      description: video.description || `Bekijk hoe ${member?.name || "Lijst van Andel"} spreekt over ‘${cleanVTitle}’ in de gemeenteraad van Steenwijkerland.`,
      url: videoUrl,
      imageUrl: video.thumbnailUrl || `/api/videos/${video.id}/thumbnail.jpg`,
    });
    setShareDialogOpen(true);
  };

  const handleShareArticle = (article: NewsItem) => {
    const articleUrl = `${window.location.origin}/nieuws/${article.id}`;
    setShareData({
      title: `${article.title} - ${member?.name || "Lijst van Andel"}`,
      description: article.excerpt || article.description || `Lees dit bericht van ${member?.name || "Lijst van Andel"}.`,
      url: articleUrl,
      imageUrl: article.thumbnailUrl || article.headerUrl || member?.imgUrl || "/assets/logo.png",
    });
    setShareDialogOpen(true);
  };

  const isBurgerraadslid =
    member?.type?.toLowerCase() === "burgerraadslid" ||
    member?.role?.toLowerCase().includes("burgerraadslid");

  if (loading) {
    return (
      <div className="container py-12 md:py-20 min-h-[75vh]">
        <div className="h-5 w-40 bg-muted/60 rounded mb-8 animate-pulse" />
        <div className="max-w-3xl mb-10 space-y-3">
          <div className="h-3.5 w-32 bg-muted/60 rounded animate-pulse" />
          <div className="h-12 w-80 bg-muted/60 rounded animate-pulse" />
          <div className="h-5 w-full max-w-lg bg-muted/40 rounded animate-pulse" />
        </div>
        <div className="h-64 max-w-4xl bg-muted/30 rounded border border-border animate-pulse mb-14" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((n) => (
            <div key={n} className="h-80 bg-muted/20 rounded border border-border/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="container py-20 text-center max-w-xl mx-auto">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="font-display text-3xl mb-3">Fractielid niet gevonden</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Het opgevraagde (burger)raadslid kon niet worden gevonden of is niet meer actief.
        </p>
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
          <Link to="/fractie">
            <ArrowLeft className="w-4 h-4 mr-2" /> Terug naar fractieoverzicht
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-20">
      {/* Top navigatie en acties */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <Link
          to="/fractie"
          className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Terug naar alle fractieleden
        </Link>

        <div className="flex items-center gap-2">
          <Button
            id="btn-share-fractielid"
            variant="outline"
            size="sm"
            onClick={handleShareMemberPage}
            className="text-xs uppercase tracking-wider border-border hover:border-accent text-foreground"
          >
            <Share2 className="w-3.5 h-3.5 mr-1 text-accent" /> Deel profiel & bijdragen
          </Button>
        </div>
      </div>

      {/* Pagina Header */}
      <div className="max-w-3xl mb-10">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">
          {member.type} • Profiel & Bijdragen
        </div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl mb-4 border-gold-line pb-4">
          {member.name}
        </h1>
        <p className="text-base text-muted-foreground">
          Bekijk alle geregistreerde debatten, videobijdragen en gekoppelde nieuwsberichten van {member.name} in de
          gemeenteraad van Steenwijkerland.
        </p>
      </div>

      {/* EXACT DEZELFDE WIDGET VAN HET (BURGER)RAADSLID */}
      <div className="mb-14 max-w-4xl">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-semibold flex items-center gap-2">
          <span>Profiel & Gegevens</span>
        </div>
        <FractielidWidget
          lid={member}
          videoCount={videos.length}
          onPlanBelafspraak={handleOpenBelafspraak}
          showVideoButton={false}
          eagerPhoto={true}
        />
      </div>

      {/* GEKOPPELDE VIDEO'S EN GEKOPPELDE BERICHTEN NAAST ELKAAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-16">
        {/* Kolom Links: Gekoppelde Video's (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div id="videos-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4 min-h-[76px]">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl flex items-center gap-2.5">
                <Video className="w-6 h-6 text-accent" />
                <span>Gekoppelde Video's</span>
                <span className="text-sm font-sans font-semibold px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
                  {videos.length} {videos.length === 1 ? "video" : "video's"}
                </span>
                {totalVideoPages > 1 && (
                  <span className="text-xs font-sans text-muted-foreground font-normal">
                    (Pagina {videoPage} van {totalVideoPages})
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {isBurgerraadslid
                  ? "Bijdragen en tussenkomsten van dit burgerraadslid (6 per pagina)."
                  : "Alle raadsbijdragen en mediaoptredens gekoppeld aan dit fractielid (6 per pagina)."}
              </p>
            </div>

            {videos.length > 0 && (
              <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                Meest recente datum
              </div>
            )}
          </div>

          {videosLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 min-h-[300px]">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="bg-card border border-border rounded-sm overflow-hidden flex flex-col h-72 animate-pulse"
                >
                  <div className="aspect-video bg-muted/60" />
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted/60 rounded w-3/4" />
                      <div className="h-3 bg-muted/40 rounded w-1/2" />
                    </div>
                    <div className="h-8 bg-muted/30 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div className="bg-card border border-border p-8 text-center rounded-sm min-h-[300px] flex flex-col items-center justify-center flex-1">
              <div className="w-14 h-14 mx-auto mb-3.5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Video className="w-7 h-7 opacity-70" />
              </div>
              <h3 className="font-display text-xl mb-1.5">Geen video's gevonden</h3>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed max-w-md">
                Er zijn op dit moment nog geen specifieke videobijdragen aan {member.name} gekoppeld.
                Zodra er nieuwe raadsvergaderingen of interviews online komen, worden deze hier getoond.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <Button asChild variant="outline" size="sm" className="uppercase tracking-wider text-xs">
                  <Link to="/agenda">Bekijk raadsagenda</Link>
                </Button>
                <Button asChild size="sm" className="bg-primary hover:bg-primary/90 uppercase tracking-wider text-xs font-semibold">
                  <Link to="/fractie">Andere fractieleden</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className={`grid grid-cols-1 ${paginatedVideos.length > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1"} gap-5 pt-2`}>
                {paginatedVideos.map((v) => {
                  let cleanVideoTitle = (v.burgerraadslidTitle || v.title || "").trim();
                  const nameOverRegex = new RegExp(`^${member?.name || "Lijst van Andel"}\\s+over\\s+`, "i");
                  cleanVideoTitle = cleanVideoTitle.replace(nameOverRegex, "");
                  cleanVideoTitle = cleanVideoTitle.replace(/^(?:videobijdrage|video bijdrage|videobijdragen|video-bijdrage|tussenkomst|bijdrage|inbreng|toelichting)\s*(?:over\s*)?/i, "");
                  cleanVideoTitle = cleanVideoTitle.replace(/^['"‘“](.*)['"’”]$/, "$1").trim() || "het raadsvoorstel";
                  const displayTitle = `${member?.name || "Lijst van Andel"} over ‘${cleanVideoTitle}’`;
                  const effectivePoster =
                    getVideoThumbnail(v.videoUrl, v.thumbnailUrl, v.id, member?.id) ||
                    `/api/videos/${v.id}/thumbnail.jpg?personId=${encodeURIComponent(member?.id || "")}`;

                  return (
                    <article
                      key={v.id}
                      id={`video-item-${v.id}`}
                      className="bg-card border border-border rounded-sm overflow-hidden flex flex-col hover-lift transition-all group shadow-sm"
                    >
                      {/* Klikbare Videothumbnail met speelknop overlay die naar de losse videopagina leidt */}
                      <Link
                        to={`/video/${v.id}`}
                        className="aspect-video bg-black relative overflow-hidden flex-shrink-0 block cursor-pointer group/thumb"
                        title={`Bekijk video: ${displayTitle}`}
                      >
                        {effectivePoster ? (
                          <img
                            src={effectivePoster}
                            alt={displayTitle}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `/api/thumbnail/video/compose?title=${encodeURIComponent(cleanVideoTitle)}&personId=${encodeURIComponent(member?.id || "")}&wijk=${encodeURIComponent(v.wijkSlug || "")}`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-muted-foreground">
                            <Video className="w-12 h-12 opacity-30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover/thumb:opacity-20 transition-opacity pointer-events-none" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-12 h-12 rounded-full bg-accent/90 text-accent-foreground flex items-center justify-center shadow-xl group-hover/thumb:scale-110 group-hover/thumb:bg-accent transition-all ring-4 ring-black/40">
                            <Play className="w-5 h-5 fill-current translate-x-0.5" />
                          </div>
                        </div>
                        {v.wijkSlug && (
                          <span
                            className="absolute top-2 left-2 bg-secondary/90 backdrop-blur text-secondary-foreground px-2 py-0.5 rounded text-[10px] font-semibold z-10 flex items-center gap-1 shadow-sm"
                          >
                            <MapPin className="w-3 h-3 text-accent" />
                            <span className="capitalize">{v.wijkSlug.replace("-", " ")}</span>
                          </span>
                        )}
                      </Link>

                      {/* Video Metadata, Titel & Beschrijving */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Burgerraadslid badge als het lid burgerraadslid is */}
                          {isBurgerraadslid && (
                            <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-accent/15 border border-accent/30 text-[10px] uppercase tracking-wider text-accent font-semibold">
                              <Tag className="w-3 h-3" />
                              <span>Burgerraadslid</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="uppercase tracking-wider text-accent font-semibold">
                                {v.category || "Algemeen"}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                {v.date}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleShareVideo(v)}
                              title="Deel deze video op Facebook, X, Telegram of kopieer link"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/80 transition-colors cursor-pointer py-1 px-2 rounded-md hover:bg-accent/10"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Deel video</span>
                            </button>
                          </div>

                          {/* Prominente titel (linkt naar losse videopagina) */}
                          <h3 className="font-display text-lg sm:text-xl font-semibold leading-snug mb-1.5 group-hover:text-accent transition-colors line-clamp-2">
                            <Link to={`/video/${v.id}`}>{displayTitle}</Link>
                          </h3>

                          {/* Optionele beschrijving */}
                          {v.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                              {v.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-2 pt-2.5 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                          <Link
                            to={`/video/${v.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
                          >
                            <span>Bekijk video</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                          <span className="text-[10px] uppercase tracking-widest text-accent font-semibold">
                            {isBurgerraadslid ? "Burgerraad" : "Gemeenteraad"}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Paginering voor video's (per 6) - sluit strak aan onder de videokaarten, gelijk aan de berichtenpaginering */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border mt-auto min-h-[56px]">
                <div className="text-xs text-muted-foreground">
                  Toont {(videoPage - 1) * VIDEOS_PER_PAGE + 1}–
                  {Math.min(videoPage * VIDEOS_PER_PAGE, videos.length)} van {videos.length} video's
                </div>

                {totalVideoPages > 1 ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={videoPage === 1}
                      onClick={() => {
                        setVideoPage((p) => Math.max(1, p - 1));
                        document.getElementById("videos-header")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="h-8 px-2.5 text-xs border-border hover:border-accent text-foreground"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                      <span>Vorige</span>
                    </Button>

                    {Array.from({ length: totalVideoPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={videoPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setVideoPage(pageNum);
                            document.getElementById("videos-header")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className={`h-8 w-8 p-0 text-xs font-semibold ${
                            videoPage === pageNum
                              ? "bg-accent text-accent-foreground hover:bg-accent/90"
                              : "border-border hover:border-accent text-foreground"
                          }`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={videoPage === totalVideoPages}
                      onClick={() => {
                        setVideoPage((p) => Math.min(totalVideoPages, p + 1));
                        document.getElementById("videos-header")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="h-8 px-2.5 text-xs border-border hover:border-accent text-foreground"
                    >
                      <span>Volgende</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground/80">
                    Alle bijdragen weergegeven
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Kolom Rechts: Gekoppelde Berichten (Verticale Carrousel) (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <VerticalNewsCarousel
            member={member}
            newsItems={newsItems}
            loading={newsLoading}
            onShareArticle={handleShareArticle}
            className="flex-1 flex flex-col justify-between"
          />
        </div>
      </div>

      {/* Social Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        title={shareData.title}
        description={shareData.description}
        url={shareData.url}
        imageUrl={shareData.imageUrl}
      />

      {/* Belafspraak Dialog */}
      <BelafspraakDialog
        key={voorgeselecteerd ?? "leeg"}
        open={belOpen}
        onOpenChange={setBelOpen}
        defaultRaadslid={voorgeselecteerd}
      />
    </div>
  );
}
