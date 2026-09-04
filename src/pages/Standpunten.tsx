import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Vote,
  Shield,
  Globe,
  Landmark,
  Home,
  Map,
  Briefcase,
  Heart,
  Leaf,
  Cpu,
  FileText,
  BookOpen,
  Video,
  Library,
  Calendar,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { hoofdstukken, type Standpunt } from "@/data/partijprogramma";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, typeof Vote> = {
  vote: Vote,
  shield: Shield,
  globe: Globe,
  landmark: Landmark,
  home: Home,
  map: Map,
  briefcase: Briefcase,
  heart: Heart,
  leaf: Leaf,
  cpu: Cpu,
};

type TabKey = "standpunt" | "verdieping" | "bijdragen" | "bronnen";

const tabs: { key: TabKey; label: string; icon: typeof FileText }[] = [
  { key: "standpunt", label: "Standpunt", icon: FileText },
  { key: "verdieping", label: "Verdieping", icon: BookOpen },
  { key: "bijdragen", label: "Bijdragen", icon: Video },
  { key: "bronnen", label: "Bronnen", icon: Library },
];

export interface VideoItem {
  id: string;
  title: string;
  burgerraadslidTitle?: string;
  description?: string;
  category: string;
  date: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  fractieledenIds?: string[];
  wijkSlug?: string;
  hoofdstukNr?: number | null;
  standpuntNr?: number | null;
  standpuntTitel?: string | null;
}

export interface FractielidItem {
  id: string;
  name: string;
  role: string;
  type?: string;
  imgUrl?: string;
}

interface StandpuntCardProps {
  hNr: number;
  s: Standpunt;
  dynamicVideos: VideoItem[];
  fractieleden: FractielidItem[];
}

const StandpuntCard = ({ hNr, s, dynamicVideos, fractieleden }: StandpuntCardProps) => {
  const [tab, setTab] = useState<TabKey>("standpunt");

  // Combine static videos from partijprogramma with dynamic database videos
  const combinedVideos = [
    ...(s.videos || []).map((v, i) => ({
      id: `static-${hNr}-${s.nr}-${i}`,
      title: v.titel || s.titel,
      videoUrl: v.url,
      category: "Raadsbijdrage",
      date: "",
      fractieledenIds: [] as string[],
      wijkSlug: undefined as string | undefined,
      isBurger: false,
    })),
    ...dynamicVideos.map((v) => {
      const isBurger = fractieleden.some(
        (f) =>
          v.fractieledenIds?.includes(f.id) &&
          (f.type?.toLowerCase() === "burgerraadslid" || f.role?.toLowerCase().includes("burgerraadslid"))
      );
      return {
        id: v.id,
        title: v.burgerraadslidTitle || v.title,
        videoUrl: v.videoUrl,
        category: v.category,
        date: v.date,
        fractieledenIds: v.fractieledenIds || [],
        wijkSlug: v.wijkSlug,
        isBurger,
      };
    }),
  ];

  const totalBijdragen = combinedVideos.length;

  return (
    <div className="bg-secondary/40 border border-border p-5 md:p-6 rounded-sm flex flex-col justify-between">
      <div>
        <div className="flex items-start gap-3 mb-4">
          <div className="font-display text-3xl text-accent leading-none shrink-0 w-9">
            {s.nr.toString().padStart(2, "0")}
          </div>
          <h3 className="font-display text-xl md:text-2xl leading-tight pt-1 text-foreground">{s.titel}</h3>
        </div>

        <div className="flex flex-wrap gap-1 mb-4 border-b border-border">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-widest font-semibold border-b-2 -mb-px transition-colors ${
                  active
                    ? "text-accent border-accent"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {t.key === "bijdragen" && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] transition-colors ${
                      totalBijdragen > 0
                        ? active
                          ? "bg-accent text-accent-foreground font-bold"
                          : "bg-accent/20 text-accent font-bold"
                        : active
                        ? "bg-muted text-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {totalBijdragen}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-sm text-foreground/85 leading-relaxed min-h-[80px]">
          {tab === "standpunt" && <p className="leading-relaxed">{s.standpunt}</p>}

          {tab === "verdieping" && <p className="italic text-muted-foreground leading-relaxed">{s.verdieping}</p>}

          {tab === "bijdragen" && (
            totalBijdragen > 0 ? (
              <div className="space-y-5">
                {combinedVideos.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 bg-card border border-border/80 rounded-sm space-y-2.5 shadow-sm"
                  >
                    {/* Titel en badges */}
                    <div>
                      {v.isBurger && (
                        <span className="inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/30 mb-1.5">
                          Burgerraadslid Bijdrage
                        </span>
                      )}
                      <div className="font-semibold text-sm text-foreground leading-snug">
                        {v.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-1">
                        <span className="text-accent font-medium uppercase tracking-wider">{v.category}</span>
                        {v.date && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {v.date}
                            </span>
                          </>
                        )}
                        {v.wijkSlug && (
                          <>
                            <span>•</span>
                            <Link
                              to={`/wijken-en-kernen/${v.wijkSlug}`}
                              className="inline-flex items-center gap-1 text-muted-foreground hover:text-accent transition-colors"
                            >
                              <MapPin className="w-3 h-3 text-accent" />
                              <span className="capitalize">{v.wijkSlug.replace("-", " ")}</span>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Speler */}
                    <div className="aspect-video w-full bg-black rounded overflow-hidden border border-border">
                      <VideoPlayer url={v.videoUrl} title={v.title} poster={v.thumbnailUrl} className="w-full h-full" />
                    </div>

                    {v.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {v.description}
                      </p>
                    )}

                    {/* Gekoppelde fractieleden */}
                    {v.fractieledenIds && v.fractieledenIds.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/50">
                        <span className="text-[10px] text-muted-foreground">Spreker(s):</span>
                        {v.fractieledenIds.map((fid) => {
                          const fl = fractieleden.find((f) => String(f.id) === String(fid));
                          if (!fl) return null;
                          const isB =
                            fl.type?.toLowerCase() === "burgerraadslid" ||
                            fl.role?.toLowerCase().includes("burgerraadslid");
                          return (
                            <Link
                              key={fid}
                              to={`/fractie/${fl.id}/videos`}
                              className={`text-[10px] px-2 py-0.5 rounded border transition-colors inline-flex items-center gap-1 ${
                                isB
                                  ? "bg-accent/15 border-accent/30 text-accent font-semibold hover:bg-accent hover:text-accent-foreground"
                                  : "bg-secondary text-secondary-foreground border-border hover:border-accent"
                              }`}
                            >
                              {fl.name} {isB ? "(Burgerraadslid)" : ""} ↗
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic leading-relaxed py-2">
                Er zijn momenteel nog geen video-bijdragen aan dit standpunt gekoppeld. Zodra er in de gemeenteraad
                of commissie over dit onderwerp wordt gesproken, wordt de videobijdrage hier automatisch geplaatst.
              </p>
            )
          )}

          {tab === "bronnen" && (
            <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
              {s.bronnen.map((b, i) => (
                <li key={i} className="leading-relaxed">{b}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

const Standpunten = () => {
  const { user } = useAuth();
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [fractieleden, setFractieleden] = useState<FractielidItem[]>([]);

  useEffect(() => {
    // Ophalen van dynamische video's en fractieleden
    Promise.all([
      fetch("/api/videos").then((r) => (r.ok ? r.json().catch(() => []) : [])),
      fetch("/api/fractieleden").then((r) => (r.ok ? r.json().catch(() => []) : [])),
    ])
      .then(([vData, fData]) => {
        if (Array.isArray(vData)) setVideos(vData);
        if (Array.isArray(fData)) setFractieleden(fData);
      })
      .catch((err) => {
        console.error("Fout bij laden van video's en fractieleden voor standpunten:", err);
      });
  }, []);

  const isAdmin = user && (user.role === "admin" || user.role === "superadmin");

  return (
    <div className="container py-16 md:py-24">
      {/* Pagina Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Partijprogramma</div>
          <h1 className="font-display text-6xl md:text-7xl mb-6 border-gold-line pb-5">Onze Standpunten</h1>
          <p className="text-lg text-muted-foreground">
            Tien hoofdstukken die samen onze visie vormen voor Steenwijkerland.
            Per standpunt vindt u het standpunt zelf, verdieping, video-bijdragen en bronnen.
          </p>
        </div>

        {isAdmin && (
          <div className="shrink-0">
            <Button asChild variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground text-xs uppercase tracking-wider font-semibold">
              <Link to="/admin">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Beheer video's in Admin
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Hoofdstukken Accordeon / Lijst */}
      <div className="space-y-4 max-w-6xl">
        {hoofdstukken.map((h, idx) => {
          const isOpen = openIdx === idx;
          const Icon = iconMap[h.iconKey] ?? FileText;

          // Split intro: first sentence as teaser, rest shown when expanded
          const paragraphs = h.intro.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
          const firstPara = paragraphs[0] ?? "";
          const sentenceMatch = firstPara.match(/^(.*?[.!?])(\s|$)/);
          const teaser = sentenceMatch ? sentenceMatch[1] : firstPara;
          const restOfFirst = sentenceMatch ? firstPara.slice(sentenceMatch[0].length).trim() : "";
          const remainingParagraphs = [
            ...(restOfFirst ? [restOfFirst] : []),
            ...paragraphs.slice(1),
          ];

          // Count how many videos in this entire chapter
          const chapterVideos = videos.filter((v) => Number(v.hoofdstukNr) === h.nr);

          return (
            <article
              key={h.nr}
              id={`hoofdstuk-${h.nr}`}
              className="bg-card border border-border overflow-hidden hover:border-accent/50 transition-colors rounded-sm"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full grid md:grid-cols-[110px_1fr_auto] gap-0 text-left items-center focus:outline-none"
              >
                <div className="hidden md:flex items-center justify-center self-stretch bg-gradient-to-br from-twente-red-deep to-card border-r border-accent/20">
                  <div className="text-center p-4">
                    <Icon className="w-7 h-7 text-accent mx-auto mb-2" />
                    <div className="font-display text-3xl text-gradient-gold leading-none">
                      {h.nr.toString().padStart(2, "0")}
                    </div>
                  </div>
                </div>
                <div className="p-6 md:p-7">
                  <div className="flex items-center gap-3 mb-2 md:hidden">
                    <Icon className="w-5 h-5 text-accent" />
                    <span className="text-xs uppercase tracking-widest text-accent font-semibold">
                      Hoofdstuk {h.nr}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h2 className="font-display text-2xl md:text-3xl leading-tight text-foreground">{h.titel}</h2>
                    {chapterVideos.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                        <Video className="w-3 h-3" />
                        {chapterVideos.length} {chapterVideos.length === 1 ? "video" : "video's"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{teaser}</p>
                </div>
                <div className="px-6 pb-6 md:py-7 md:pr-7 flex md:items-center">
                  <ChevronDown
                    className={`w-6 h-6 text-accent transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="px-6 md:px-7 pb-8 md:ml-[110px] animate-fade-up">
                  {remainingParagraphs.length > 0 && (
                    <div className="border-t border-accent/20 pt-6 mb-6 space-y-4 text-sm md:text-base text-foreground/85 leading-relaxed max-w-4xl">
                      {remainingParagraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  )}
                  <div
                    className={`${
                      remainingParagraphs.length > 0 ? "" : "border-t border-accent/20 pt-6"
                    } mb-6 text-xs uppercase tracking-[0.25em] text-accent font-semibold`}
                  >
                    Wij willen:
                  </div>
                  <div className="grid lg:grid-cols-2 gap-4">
                    {h.standpunten.map((s) => {
                      const standpuntVideos = videos.filter(
                        (v) => Number(v.hoofdstukNr) === h.nr && Number(v.standpuntNr) === s.nr
                      );
                      return (
                        <StandpuntCard
                          key={s.nr}
                          hNr={h.nr}
                          s={s}
                          dynamicVideos={standpuntVideos}
                          fractieleden={fractieleden}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default Standpunten;
