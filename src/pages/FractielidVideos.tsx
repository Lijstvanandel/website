import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Video, Calendar, Tag, MapPin, AlertCircle, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FractielidWidget, FractielidItem } from "@/components/FractielidWidget";
import { BelafspraakDialog } from "@/components/BelafspraakDialog";
import { VideoPlayer } from "@/components/VideoPlayer";

interface VideoItem {
  id: string;
  title: string;
  burgerraadslidTitle?: string;
  category: string;
  date: string;
  videoUrl?: string;
  wijkSlug?: string;
  fractieledenIds?: string[];
}

const FractielidVideos = () => {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<FractielidItem | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [belOpen, setBelOpen] = useState(false);
  const [voorgeselecteerd, setVoorgeselecteerd] = useState<string | undefined>(undefined);

  useEffect(() => {
    setLoading(true);

    // Fetch fractielid and all videos
    Promise.all([
      fetch("/api/fractieleden").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/videos").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([ledenData, videosData]: [FractielidItem[], VideoItem[]]) => {
        if (Array.isArray(ledenData)) {
          const found = ledenData.find((l) => String(l.id) === String(id));
          setMember(found || null);
        }

        if (Array.isArray(videosData)) {
          // Filter all videos linked to this member
          const memberVideos = videosData.filter((v) =>
            v.fractieledenIds?.map(String).includes(String(id))
          );
          // Sort by date descending
          memberVideos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setVideos(memberVideos);
        }
      })
      .catch((err) => {
        console.error("Fout bij ophalen fractielid video data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleOpenBelafspraak = (lid: FractielidItem) => {
    setVoorgeselecteerd(`${lid.name} — ${lid.role}`);
    setBelOpen(true);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isBurgerraadslid =
    member?.type?.toLowerCase() === "burgerraadslid" ||
    member?.role?.toLowerCase().includes("burgerraadslid");

  if (loading) {
    return (
      <div className="container py-20 text-center">
        <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground text-sm">Fractielid en video's laden...</p>
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
            onClick={handleShare}
            className="text-xs uppercase tracking-wider border-border hover:border-accent text-foreground"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-green-500" /> Link gekopieerd!
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 mr-1" /> Deel profiel & video's
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Pagina Header */}
      <div className="max-w-3xl mb-10">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">
          {member.type} • Videobijdragen
        </div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl mb-4 border-gold-line pb-4">
          Video's van {member.name}
        </h1>
        <p className="text-base text-muted-foreground">
          Bekijk alle geregistreerde debatten, raadsvoorstellen en interviews van {member.name} in de gemeenteraad
          van Steenwijkerland.
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
        />
      </div>

      {/* OVERZICHT VAN ALLE GEKOPPELDE VIDEO'S */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl flex items-center gap-2.5">
              <Video className="w-6 h-6 text-accent" />
              <span>Gekoppelde Video's</span>
              <span className="text-sm font-sans font-semibold px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
                {videos.length} {videos.length === 1 ? "video" : "video's"}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {isBurgerraadslid
                ? "Bijdragen en tussenkomsten van dit burgerraadslid, voorzien van onderwerp en titel."
                : "Alle raadsbijdragen en mediaoptredens gekoppeld aan dit fractielid."}
            </p>
          </div>

          {videos.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Gesorteerd op meest recente datum
            </div>
          )}
        </div>

        {videos.length === 0 ? (
          <div className="bg-card border border-border p-12 text-center rounded-sm max-w-2xl mx-auto my-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Video className="w-8 h-8 opacity-70" />
            </div>
            <h3 className="font-display text-2xl mb-2">Geen video's gevonden</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Er zijn op dit moment nog geen specifieke videobijdragen aan {member.name} gekoppeld.
              Zodra er nieuwe raadsvergaderingen of interviews online komen, worden deze hier getoond.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild variant="outline" size="sm" className="uppercase tracking-wider text-xs">
                <Link to="/agenda">Bekijk raadsagenda</Link>
              </Button>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 uppercase tracking-wider text-xs font-semibold">
                <Link to="/fractie">Bekijk andere fractieleden</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {videos.map((v) => {
              const displayTitle = v.burgerraadslidTitle || v.title || "Videobijdrage";

              return (
                <article
                  key={v.id}
                  id={`video-item-${v.id}`}
                  className="bg-card border border-border rounded-sm overflow-hidden flex flex-col hover-lift transition-all group"
                >
                  {/* Videospeler bovenaan */}
                  <div className="aspect-video bg-black relative overflow-hidden flex-shrink-0">
                    <VideoPlayer url={v.videoUrl} title={displayTitle} className="w-full h-full" />
                    {v.wijkSlug && (
                      <Link
                        to={`/wijken-en-kernen/${v.wijkSlug}`}
                        className="absolute top-2 left-2 bg-secondary/90 backdrop-blur text-secondary-foreground px-2 py-0.5 rounded text-[10px] font-semibold hover:bg-secondary transition-colors z-10 flex items-center gap-1 shadow-sm"
                      >
                        <MapPin className="w-3 h-3 text-accent" />
                        <span className="capitalize">{v.wijkSlug.replace("-", " ")}</span>
                      </Link>
                    )}
                  </div>

                  {/* Video Metadata & Titel */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Burgerraadslid badge als het lid burgerraadslid is */}
                      {isBurgerraadslid && (
                        <div className="mb-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-accent/15 border border-accent/30 text-[10px] uppercase tracking-wider text-accent font-semibold">
                          <Tag className="w-3 h-3" />
                          <span>Burgerraadslid Bijdrage</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
                        <span className="uppercase tracking-wider text-accent font-semibold">
                          {v.category || "Algemeen"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {v.date}
                        </span>
                      </div>

                      {/* Prominente titel */}
                      <h3 className="font-display text-xl sm:text-2xl font-semibold leading-snug mb-2 group-hover:text-accent transition-colors">
                        {displayTitle}
                      </h3>
                    </div>

                    {isBurgerraadslid && (
                      <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                        <span className="text-foreground/80 font-medium">Spreker: {member.name}</span>
                        <span className="text-[10px] uppercase tracking-widest text-accent font-semibold">
                          Burgerraad
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Belafspraak Dialog */}
      <BelafspraakDialog
        key={voorgeselecteerd ?? "leeg"}
        open={belOpen}
        onOpenChange={setBelOpen}
        defaultRaadslid={voorgeselecteerd}
      />
    </div>
  );
};

export default FractielidVideos;
