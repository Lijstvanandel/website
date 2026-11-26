import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Video, Calendar, Tag, MapPin, AlertCircle, Share2, ChevronLeft, ChevronRight, Play, Phone, CheckCircle2, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FractielidWidget, FractielidItem, FractielidBelofte } from "@/components/FractielidWidget";
import { BelafspraakDialog } from "@/components/BelafspraakDialog";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ShareDialog } from "@/components/ShareDialog";
import { VerticalNewsCarousel } from "@/components/VerticalNewsCarousel";
import { getVideoThumbnail, getVideoThumbnailFallbackUrl } from "@/lib/videoUtils";
import { getInitialPublicSnapshot } from "@/lib/publicSnapshotClient";
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
  posterJpgUrl?: string;
  wijkSlug?: string;
  personId?: string;
  fractieledenIds?: string[];
}

function filterMemberVideos(allVideos: VideoItem[], memberId?: string, memberName?: string): VideoItem[] {
  if (!Array.isArray(allVideos) || !memberId) return [];
  const lowerName = memberName?.toLowerCase() || "";
  return allVideos
    .filter(
      (v) =>
        (Array.isArray(v.fractieledenIds) && v.fractieledenIds.some((fid) => String(fid) === String(memberId))) ||
        String(v.personId || "") === String(memberId) ||
        (lowerName && v.title && v.title.toLowerCase().includes(lowerName))
    )
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
}

function filterMemberNews(allNews: NewsItem[], memberId?: string, memberName?: string): NewsItem[] {
  if (!Array.isArray(allNews) || !memberId) return [];
  const lowerName = memberName?.toLowerCase() || "";
  return allNews
    .filter(
      (n: any) =>
        !n.isHidden &&
        ((Array.isArray(n.fractieledenIds) && n.fractieledenIds.some((fid: any) => String(fid) === String(memberId))) ||
          (lowerName && n.author && String(n.author).toLowerCase().includes(lowerName)))
    )
    .sort(
      (a, b) =>
        new Date(b.date || b.createdAt || 0).getTime() -
        new Date(a.date || a.createdAt || 0).getTime()
    );
}

export default function FractielidVideos() {
  const { id } = useParams<{ id: string }>();

  // Synchronous 0ms hydration from Server-Side Public Snapshot or DEFAULT_FRACTIELEDEN
  const initialSnapshot = React.useMemo(() => getInitialPublicSnapshot(), []);

  const defaultMember = React.useMemo(() => {
    if (initialSnapshot?.fractieleden?.length) {
      const snapFound = initialSnapshot.fractieleden.find((m: any) => String(m.id) === String(id));
      if (snapFound) return snapFound as FractielidItem;
    }
    return DEFAULT_FRACTIELEDEN.find((m) => String(m.id) === String(id)) || null;
  }, [id, initialSnapshot]);

  const initialVideos = React.useMemo(() => {
    if (initialSnapshot?.videos?.length && id) {
      return filterMemberVideos(initialSnapshot.videos, id, defaultMember?.name);
    }
    return [];
  }, [id, initialSnapshot, defaultMember?.name]);

  const initialNews = React.useMemo(() => {
    if (initialSnapshot?.newsSummaries?.length && id) {
      return filterMemberNews(initialSnapshot.newsSummaries, id, defaultMember?.name);
    }
    return [];
  }, [id, initialSnapshot, defaultMember?.name]);

  const [member, setMember] = useState<FractielidItem | null>(defaultMember);
  const [videos, setVideos] = useState<VideoItem[]>(initialVideos);
  const [newsItems, setNewsItems] = useState<NewsItem[]>(initialNews);
  const [loading, setLoading] = useState(!defaultMember);
  const [videosLoading, setVideosLoading] = useState(!initialSnapshot?.videos);
  const [newsLoading, setNewsLoading] = useState(!initialSnapshot?.newsSummaries);
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

  // 45-seconden maandresultaat video dialog state
  const [activeShortVideo, setActiveShortVideo] = useState<{
    title: string;
    subtitle?: string;
    url: string;
    poster?: string;
    videoId?: string;
    durationLabel?: string;
  } | null>(null);

  useEffect(() => {
    if (defaultMember) {
      setMember(defaultMember);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Hydrate immediately if snapshot already contains data for this member
    if (initialSnapshot?.videos) {
      setVideos(filterMemberVideos(initialSnapshot.videos, id, defaultMember?.name));
      setVideosLoading(false);
    } else {
      setVideosLoading(true);
    }

    if (initialSnapshot?.newsSummaries) {
      setNewsItems(filterMemberNews(initialSnapshot.newsSummaries, id, defaultMember?.name));
      setNewsLoading(false);
    } else {
      setNewsLoading(true);
    }

    // 1. Revalidate targeted fractielid videos from cached server snapshot
    fetch(`/api/videos?memberId=${encodeURIComponent(id || "")}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((videosData: VideoItem[]) => {
        if (Array.isArray(videosData)) {
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

    // 2. Fetch lightweight news summaries (never includeAll=true with multi-MB HTML bodies)
    fetch(`/api/news?memberId=${encodeURIComponent(id || "")}&summary=1`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: NewsItem[]) => {
        if (Array.isArray(data)) {
          const sorted = [...data].sort(
            (a, b) =>
              new Date(b.date || b.createdAt || 0).getTime() -
              new Date(a.date || a.createdAt || 0).getTime()
          );
          setNewsItems(sorted);
        }
      })
      .catch((err) => {
        console.warn("Fout bij ophalen gekoppelde nieuwsberichten:", err);
      })
      .finally(() => {
        setNewsLoading(false);
      });

    // 3. Only fetch fractieleden if not already in initialSnapshot
    if (!initialSnapshot?.fractieleden?.length) {
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
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id, defaultMember, initialSnapshot]);

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
      title: `${member?.name || "Fractielid"} | Onafhankelijk Steenwijkerland`,
      description: `Bekijk de debatten, videobijdragen en nieuwsberichten van ${member?.name || "Onafhankelijk Steenwijkerland"} in Steenwijkerland.`,
      url: pageUrl,
      imageUrl: member?.imgUrl || "/assets/osl-logo.png?v=osl2",
    });
    setShareDialogOpen(true);
  };

  const handleShareVideo = (video: VideoItem) => {
    let cleanVTitle = (video.burgerraadslidTitle || video.title || "").trim();
    const nameOverRegex = new RegExp(`^${member?.name || "Onafhankelijk Steenwijkerland"}\\s+over\\s+`, "i");
    cleanVTitle = cleanVTitle.replace(nameOverRegex, "");
    cleanVTitle = cleanVTitle.replace(/^(?:videobijdrage|video bijdrage|videobijdragen|video-bijdrage|tussenkomst|bijdrage|inbreng|toelichting)\s*(?:over\s*)?/i, "");
    cleanVTitle = cleanVTitle.replace(/^['"‘“](.*)['"’”]$/, "$1").trim() || "het raadsvoorstel";
    const formattedTitle = `${member?.name || "Onafhankelijk Steenwijkerland"} over ‘${cleanVTitle}’`;
    const videoUrl = `${window.location.origin}/video/${video.id}`;
    setShareData({
      title: `${formattedTitle} | Onafhankelijk Steenwijkerland`,
      description: video.description || `Bekijk hoe ${member?.name || "Onafhankelijk Steenwijkerland"} spreekt over ‘${cleanVTitle}’ in de gemeenteraad van Steenwijkerland.`,
      url: videoUrl,
      imageUrl: video.thumbnailUrl || `/api/videos/${video.id}/thumbnail.jpg`,
    });
    setShareDialogOpen(true);
  };

  const handleShareArticle = (article: NewsItem) => {
    const articleUrl = `${window.location.origin}/nieuws/${article.id}`;
    setShareData({
      title: `${article.title} - ${member?.name || "Onafhankelijk Steenwijkerland"}`,
      description: article.excerpt || article.description || `Lees dit bericht van ${member?.name || "Onafhankelijk Steenwijkerland"}.`,
      url: articleUrl,
      imageUrl: article.thumbnailUrl || article.headerUrl || member?.imgUrl || "/assets/osl-logo.png?v=osl2",
    });
    setShareDialogOpen(true);
  };

  const isBurgerraadslid =
    member?.type?.toLowerCase() === "burgerraadslid" ||
    member?.role?.toLowerCase().includes("burgerraadslid");

  const resolvedBeloftes: FractielidBelofte[] = React.useMemo(() => {
    if (member?.beloftes && member.beloftes.length > 0) {
      return member.beloftes.slice(0, 3);
    }
    if (member?.speerpunten && member.speerpunten.length > 0) {
      return member.speerpunten.slice(0, 3).map((s) => ({ title: s }));
    }
    return [];
  }, [member]);

  const monthlyResults = member?.monthlyResults || [];

  const allKnownVideos = React.useMemo(() => {
    const map = new Map<string, VideoItem>();
    for (const v of initialSnapshot?.videos || []) {
      if (v?.id) map.set(String(v.id), v as VideoItem);
    }
    for (const v of videos) {
      if (v?.id) map.set(String(v.id), v);
    }
    return map;
  }, [initialSnapshot?.videos, videos]);

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

      {/* PROFIEL & GEGEVENS + DRIE SCANBARE BLOKKEN NAAST ELKAAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-14">
        <div className="lg:col-span-6 flex flex-col">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-semibold flex items-center gap-2">
            <span>Profiel & Gegevens</span>
          </div>
          <FractielidWidget
            lid={member}
            videoCount={videos.length}
            onPlanBelafspraak={handleOpenBelafspraak}
            showVideoButton={false}
            eagerPhoto={true}
            className="flex-1 h-full"
          />
        </div>

        <section
          aria-labelledby="beloftes-maandresultaat-heading"
          className="lg:col-span-6 flex flex-col"
        >
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-semibold flex items-center justify-between gap-2">
            <span id="beloftes-maandresultaat-heading">Beloftes &amp; Maandresultaat</span>
            <span className="text-[11px] font-normal tracking-normal normal-case text-accent">
              {member.monthlyResultsMonth?.trim() || "Actueel overzicht"}
            </span>
          </div>

          <div className="bg-card border border-border rounded-sm shadow-sm p-5 md:p-6 flex-1 flex flex-col justify-between gap-6">
            {/* Blok 1: Mijn 3 beloftes voor jou */}
            <div>
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h2 className="font-display text-xl sm:text-2xl text-foreground">
                  1. Mijn 3 beloftes voor jou
                </h2>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground tabular-nums shrink-0">
                  {resolvedBeloftes.length}/3
                </span>
              </div>

              {resolvedBeloftes.length > 0 ? (
                <ol className="divide-y divide-border/60">
                  {resolvedBeloftes.map((belofte, index) => (
                    <li
                      key={`${index}-${belofte.title}`}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3"
                    >
                      <span className="font-mono text-xs font-semibold text-accent tabular-nums pt-0.5 shrink-0">
                        0{index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground leading-snug">
                          {belofte.title}
                        </div>
                        {belofte.detail && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {belofte.detail}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  De 3 kernbeloftes van {member.name} worden binnenkort ingevuld.
                </p>
              )}
            </div>

            {/* Blok 2: Wat ik deze maand concreet heb afgedwongen (met 45-seconden video's) */}
            <div className="border-t border-border/60 pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <h2 className="font-display text-xl sm:text-2xl text-foreground">
                  2. Wat ik deze maand concreet heb afgedwongen
                </h2>
                <span className="text-xs text-muted-foreground">
                  met 45-seconden video&apos;s
                  {member.monthlyResultsMonth?.trim() ? ` · ${member.monthlyResultsMonth.trim()}` : ""}
                </span>
              </div>

              {monthlyResults.length > 0 ? (
                <ul className="divide-y divide-border/60">
                  {monthlyResults.map((item, idx) => {
                    const linkedVideo = item.videoId ? allKnownVideos.get(String(item.videoId)) : undefined;
                    const resolvedUrl = (item.videoUrl && item.videoUrl.trim()) || linkedVideo?.videoUrl || "";
                    const resolvedPoster = linkedVideo
                      ? getVideoThumbnail(linkedVideo.videoUrl, linkedVideo.thumbnailUrl, linkedVideo.id, member?.id)
                      : undefined;
                    const durationText = item.durationLabel?.trim() || "0:45";

                    return (
                      <li
                        key={item.id || `mr-${idx}`}
                        className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                            <div>
                              <div className="text-sm font-medium text-foreground leading-snug">
                                {item.title}
                              </div>
                              {item.result && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                  {item.result}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {resolvedUrl ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setActiveShortVideo({
                                title: item.title,
                                subtitle: item.result,
                                url: resolvedUrl,
                                poster: resolvedPoster,
                                videoId: linkedVideo?.id,
                                durationLabel: durationText,
                              })
                            }
                            className="shrink-0 h-8 px-3 text-xs font-semibold border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                            <span className="tabular-nums">45s video ({durationText})</span>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            Video volgt
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nog geen maandresultaten of 45-seconden video&apos;s toegevoegd voor {member.name}.
                </p>
              )}
            </div>

            {/* Blok 3: Direct contact & raadsbijdragen */}
            <div className="border-t border-border/60 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-foreground">
                  3. Direct meedenken of controleren
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                  {videos.length} volledige {videos.length === 1 ? "raadsbijdrage" : "raadsbijdragen"} · {newsItems.length} {newsItems.length === 1 ? "bericht" : "berichten"}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleOpenBelafspraak(member)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-8 px-3"
                >
                  <Phone className="w-3.5 h-3.5 mr-1.5" /> Belafspraak met {member.name.split(" ")[0]}
                </Button>
                {videos.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("videos-header")?.scrollIntoView({ behavior: "smooth" })}
                    className="text-xs h-8 px-3 border-border hover:border-accent"
                  >
                    <Film className="w-3.5 h-3.5 mr-1.5 text-accent" /> Alle video&apos;s
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
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
                {paginatedVideos.map((v, idx) => {
                  let cleanVideoTitle = (v.burgerraadslidTitle || v.title || "").trim();
                  const nameOverRegex = new RegExp(`^${member?.name || "Onafhankelijk Steenwijkerland"}\\s+over\\s+`, "i");
                  cleanVideoTitle = cleanVideoTitle.replace(nameOverRegex, "");
                  cleanVideoTitle = cleanVideoTitle.replace(/^(?:videobijdrage|video bijdrage|videobijdragen|video-bijdrage|tussenkomst|bijdrage|inbreng|toelichting)\s*(?:over\s*)?/i, "");
                  cleanVideoTitle = cleanVideoTitle.replace(/^['"‘“](.*)['"’”]$/, "$1").trim() || "het raadsvoorstel";
                  const displayTitle = `${member?.name || "Onafhankelijk Steenwijkerland"} over ‘${cleanVideoTitle}’`;
                  const effectivePoster =
                    getVideoThumbnail(v.videoUrl, v.thumbnailUrl, v.id, member?.id) ||
                    `/uploads/thumbnails/video-${v.id}.webp`;

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
                            loading="eager"
                            // @ts-expect-error fetchpriority is standard HTML attribute
                            fetchpriority={idx < 4 ? "high" : "auto"}
                            decoding="async"
                            width={640}
                            height={360}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              const nextSrc = getVideoThumbnailFallbackUrl(v.id, member?.id, img.src);
                              if (img.src !== window.location.origin + nextSrc) {
                                img.src = nextSrc;
                              }
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

      {/* 45-seconden Video Dialog */}
      <Dialog
        open={Boolean(activeShortVideo)}
        onOpenChange={(open) => {
          if (!open) setActiveShortVideo(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl sm:text-2xl pr-6">
              {activeShortVideo?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {member.name}
              {member.monthlyResultsMonth?.trim() ? ` · ${member.monthlyResultsMonth.trim()}` : ""}
              {activeShortVideo?.durationLabel ? ` · ${activeShortVideo.durationLabel}` : " · 45-seconden video"}
              {activeShortVideo?.subtitle ? ` — ${activeShortVideo.subtitle}` : ""}
            </DialogDescription>
          </DialogHeader>
          {activeShortVideo?.url && (
            <div className="mt-2">
              <VideoPlayer
                url={activeShortVideo.url}
                title={activeShortVideo.title}
                poster={activeShortVideo.poster}
                videoId={activeShortVideo.videoId}
                memberId={member.id}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
