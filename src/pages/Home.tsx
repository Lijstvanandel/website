import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Phone, Video, Home as HomeIcon, TreePine, Tractor, Coins, Landmark, Calendar as CalIcon, MapPin } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import heroBanner from "@/assets/steenwijk-aerial.jpg";
import sammyImg from "@/assets/sammy.png";
import lisaImg from "@/assets/lisa.png";
import { BelafspraakDialog } from "@/components/BelafspraakDialog";
import { HeroBuurtkaart } from "@/components/HeroBuurtkaart";
import { news } from "@/data/news";
import { WijkItem } from "@/types/wijk";
import { BUURTKAART_WIJKEN, LEGACY_SLUG_MAP } from "@/data/defaultWijken";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

const formatDateSafe = (dateStr?: string) => {
  if (!dateStr) return "";
  try {
    const parsed = parseISO(dateStr);
    return isNaN(parsed.getTime()) ? dateStr : format(parsed, "d MMM yyyy", { locale: nl });
  } catch {
    return dateStr;
  }
};

const normalizeSlug = (s: string): string => {
  const clean = s
    .toLowerCase()
    .replace(/[,]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return LEGACY_SLUG_MAP[clean] || clean;
};

const DEFAULT_FRACTIELEDEN = [
  { id: "1", name: "Sammy van Andel", role: "Fractievoorzitter", type: "Raadslid", imgUrl: sammyImg },
  { id: "2", name: "Lisa Mars", role: "Raadslid", type: "Raadslid", imgUrl: lisaImg },
  { id: "3", name: "Nathan ten Wolde", role: "Burgerraadslid", type: "Burgerraadslid", imgUrl: "/assets/nathan.png" },
  { id: "4", name: "Chris van Andel", role: "Burgerraadslid", type: "Burgerraadslid", imgUrl: "/assets/chris.jpg" },
];

const Home = () => {
  const [belOpen, setBelOpen] = useState(false);
  const [homeNews, setHomeNews] = useState<any[]>(() => news.filter((n: any) => !n.wijkSlug));
  const [wijken, setWijken] = useState<WijkItem[]>([]);
  const [fractieleden, setFractieleden] = useState<any[]>(DEFAULT_FRACTIELEDEN);
  const [hoveredWijkSlug, setHoveredWijkSlug] = useState<string | null>(null);
  const [bgLayerA, setBgLayerA] = useState<{ url: string; visible: boolean }>({ url: "", visible: false });
  const [bgLayerB, setBgLayerB] = useState<{ url: string; visible: boolean }>({ url: "", visible: false });
  const [activeBuffer, setActiveBuffer] = useState<"A" | "B" | null>(null);

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unhoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/news")
      .then((res) => (res.ok ? res.json().catch(() => []) : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setHomeNews(data);
        }
      })
      .catch(() => {});

    fetch("/api/wijken")
      .then((res) => (res.ok ? res.json().catch(() => []) : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setWijken(data);
        }
      })
      .catch(() => {});

    fetch("/api/fractieleden")
      .then((res) => (res.ok ? res.json().catch(() => []) : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFractieleden(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "wijk-click" && typeof e.data.slug === "string") {
        navigate(`/wijken-en-kernen/${normalizeSlug(e.data.slug)}`);
      } else if (e.data.type === "wijk-hover" && typeof e.data.slug === "string") {
        const slug = normalizeSlug(e.data.slug);
        if (unhoverTimerRef.current) {
          clearTimeout(unhoverTimerRef.current);
          unhoverTimerRef.current = null;
        }
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
        }
        // Smooth debounce of 100ms so moving cursor smoothly across polygons does not cause rapid flashing
        hoverTimerRef.current = setTimeout(() => {
          setHoveredWijkSlug(slug);
        }, 100);
      } else if (e.data.type === "wijk-unhover") {
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }
        // Grace period of 350ms before clearing hover state to bridge polygon borders seamlessly
        if (unhoverTimerRef.current) {
          clearTimeout(unhoverTimerRef.current);
        }
        unhoverTimerRef.current = setTimeout(() => {
          setHoveredWijkSlug(null);
        }, 350);
      }
    };
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (unhoverTimerRef.current) clearTimeout(unhoverTimerRef.current);
    };
  }, [navigate]);

  // Find hovered wijk and synchronize active background with smooth dual-buffer crossfade
  const hoveredWijk = hoveredWijkSlug
    ? (wijken.find((w) => normalizeSlug(w.slug) === hoveredWijkSlug) ||
       BUURTKAART_WIJKEN.find((w) => normalizeSlug(w.slug) === hoveredWijkSlug))
    : null;

  useEffect(() => {
    const targetUrl = (hoveredWijk?.heroBannerUrl || hoveredWijk?.bannerUrl)?.trim();
    if (targetUrl) {
      // Preload image before fading to avoid any blank flash
      const img = new Image();
      img.src = targetUrl;
      img.onload = () => {
        if (activeBuffer === "A") {
          setBgLayerB({ url: targetUrl, visible: true });
          setBgLayerA((prev) => ({ ...prev, visible: false }));
          setActiveBuffer("B");
        } else {
          setBgLayerA({ url: targetUrl, visible: true });
          setBgLayerB((prev) => ({ ...prev, visible: false }));
          setActiveBuffer("A");
        }
      };
    } else {
      setBgLayerA((prev) => ({ ...prev, visible: false }));
      setBgLayerB((prev) => ({ ...prev, visible: false }));
      setActiveBuffer(null);
    }
  }, [hoveredWijk]);

  return (
    <>
      {/* HERO — Verticaal compact met minimale afstand tot de navbar & interactieve achtergrond */}
      <section className="relative overflow-hidden pt-2 sm:pt-3 lg:pt-4 pb-0 bg-background transition-colors">
        {/* Standaard achtergrondfoto (Steenwijk aerial) */}
        <img
          src={heroBanner}
          alt="Luchtfoto van Steenwijk bij zonsondergang"
          width={1920}
          height={1080}
          fetchpriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-1000 ease-out"
        />

        {/* Dynamische hover achtergrondfoto Layer A met ultra-zachte crossfade */}
        {bgLayerA.url && (
          <img
            src={bgLayerA.url}
            alt="Sfeerbeeld wijk of kern Steenwijkerland"
            width={1920}
            height={1080}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-[1] transition-opacity duration-700 ease-in-out ${
              bgLayerA.visible ? "opacity-100" : "opacity-0"
            }`}
            style={{ willChange: "opacity" }}
          />
        )}

        {/* Dynamische hover achtergrondfoto Layer B met ultra-zachte crossfade */}
        {bgLayerB.url && (
          <img
            src={bgLayerB.url}
            alt="Sfeerbeeld wijk of kern Steenwijkerland"
            width={1920}
            height={1080}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-[1] transition-opacity duration-700 ease-in-out ${
              bgLayerB.visible ? "opacity-100" : "opacity-0"
            }`}
            style={{ willChange: "opacity" }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-twente-black via-twente-black/85 to-transparent pointer-events-none z-[2]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none z-[2]" />

        <div className="container relative z-10 py-1 sm:py-2">
          <div className="grid lg:grid-cols-[1.1fr_1.3fr] xl:grid-cols-[1fr_1.2fr] gap-6 lg:gap-8 xl:gap-12 items-center">
            <div className="max-w-3xl space-y-3.5 sm:space-y-4 md:space-y-5 animate-fade-up">
              {/* Compacte badge direct onder de navbar */}
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-accent/40 bg-twente-black/70 backdrop-blur rounded-xs transition-all duration-300">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs uppercase tracking-[0.25em] text-accent font-medium transition-opacity duration-300">
                  {hoveredWijk
                    ? `${hoveredWijk.type === "Kern" ? "Kern" : "Wijk"} in beeld — ${hoveredWijk.naam}`
                    : "In de Gemeenteraad — Steenwijkerland"}
                </span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-[0.93] tracking-tight">
                <span className="block">Meer inspraak</span>
                <span className="block text-gradient-gold">Meer vrijheid</span>
                <span className="block text-primary">Lijst van Andel</span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-foreground/85 max-w-xl leading-relaxed">
                Met twee raadszetels zetten Sammy van Andel en Lisa Mars zich in voor een gemeente waar lokale binding
                telt, natuur beschermd wordt en bestuur dichtbij staat.
              </p>
              <div className="flex flex-wrap gap-2.5 sm:gap-3 pt-1 sm:pt-2">
                <Button asChild size="default" className="sm:h-11 sm:px-6 bg-primary hover:bg-primary/90 uppercase tracking-wider font-semibold text-xs sm:text-sm">
                  <Link to="/standpunten">
                    Onze standpunten <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
                <Button asChild size="default" variant="outline" className="sm:h-11 sm:px-6 border-accent text-accent hover:bg-accent hover:text-accent-foreground uppercase tracking-wider font-semibold text-xs sm:text-sm">
                  <Link to="/fractie">
                    <Users className="w-4 h-4 mr-1.5" /> Ontmoet de fractie
                  </Link>
                </Button>
              </div>
            </div>

            {/* Buurtkaart: Statisch voor SEO, dynamisch interactief bij hoveren */}
            <div className="hidden lg:block relative h-[460px] lg:h-[500px] xl:h-[550px] animate-fade-up">
              <HeroBuurtkaart onWijkHover={setHoveredWijkSlug} />
            </div>
          </div>
        </div>

        {/* Compacte stats bar */}
        <div className="relative z-10 mt-5 sm:mt-6 lg:mt-8 border-t border-accent/20 bg-twente-black/85 backdrop-blur">
          <div className="container grid grid-cols-2 md:grid-cols-4 gap-px">
            {[
              { v: "2", l: "Raadszetels" },
              { v: "2", l: "Burgerraadsleden" },
              { v: "10", l: "Speerpunten" },
              { v: "∞", l: "Lokale trots" },
            ].map((s) => (
              <div key={s.l} className="px-3 py-2.5 sm:py-3 text-center bg-twente-black/40">
                <div className="font-display text-2xl sm:text-3xl text-gradient-gold">{s.v}</div>
                <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FRACTIE & PERSOONLIJK GESPREK CTA */}
      <section className="container pt-8 sm:pt-10 pb-6 sm:pb-8">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">Direct contact</div>
        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl mb-6 sm:mb-8 border-gold-line pb-4">De fractie</h2>

        <div className="bg-card border border-accent/20 p-6 md:p-8 rounded-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
              {fractieleden.map((lid: any) => (
                <Link
                  key={lid.id}
                  to={`/fractie/${lid.id}/videos`}
                  className="group flex flex-col bg-muted/20 border border-border/60 hover:border-accent/80 rounded-sm overflow-hidden transition-all hover-lift"
                >
                  <div className="relative aspect-[4/5] w-full bg-muted overflow-hidden border-b border-border/50">
                    {lid.imgUrl ? (
                      <img
                        src={lid.imgUrl}
                        alt={lid.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        Geen foto
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 bg-black/80 backdrop-blur border border-accent/50 text-[10px] uppercase tracking-widest text-accent font-semibold rounded-xs">
                      {lid.role || lid.type}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1 justify-between text-center bg-card">
                    <div>
                      <div className="font-display text-lg sm:text-xl font-bold group-hover:text-accent transition-colors leading-snug">
                        {lid.name}
                      </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-border/40 text-[11px] uppercase tracking-widest text-accent font-semibold flex items-center justify-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      <Video className="w-3.5 h-3.5" /> Bekijk video's
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-border/60 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left px-2">
              <div className="space-y-1">
                <div className="flex items-center justify-center md:justify-start gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 text-accent shrink-0" />
                  <span>
                    Spreek een raadslid of burgerraadslid op <strong className="text-foreground">woensdag, donderdag of vrijdag (19:00–21:00)</strong>
                  </span>
                </div>
                <div className="text-[11px] text-accent font-semibold tracking-wider uppercase md:pl-6">
                  Max. 30 minuten per gesprek
                </div>
              </div>
              <Button
                onClick={() => setBelOpen(true)}
                size="default"
                className="bg-primary hover:bg-primary/90 uppercase tracking-wider font-semibold shrink-0"
              >
                <Phone className="w-4 h-4 mr-1.5" /> Plan uw belafspraak
              </Button>
            </div>
          </div>
        </section>

      {/* FEATURE GRID / SPEERPUNTEN */}
      <section className="container pt-2 sm:pt-4 pb-6 sm:pb-8">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2.5">Waar wij voor staan</div>
        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl mb-6 sm:mb-8 border-gold-line pb-4">Speerpunten</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {[
            {
              image: "/assets/speerpunt-voorrang.jpg",
              title: "Voorrang voor inwoners",
              text: "Lokale binding telt bij woningtoewijzing. Onze eigen jongeren en starters verdienen een eerlijke kans op een betaalbaar thuis.",
              to: "/standpunten",
            },
            {
              image: "/assets/speerpunt-natuur.jpg",
              title: "Behoud van natuur",
              text: "Bescherming van Nationaal Park Weerribben-Wieden en onze kenmerkende landschappen als groen erfgoed.",
              to: "/standpunten",
            },
            {
              image: "/assets/speerpunt-boeren.jpg",
              title: "Boer terug in beleid",
              text: "Een gemeente die als betrouwbare bondgenoot náást de agrariërs en lokale ondernemers staat, niet ertegenover.",
              to: "/standpunten",
            },
            {
              image: "/assets/speerpunt-lasten.jpg",
              title: "Geen lastenverhoging",
              text: "Zuinig huishoudboekje en een lage OZB. De gemeente moet eerst op eigen apparaat besparen voordat lasten stijgen.",
              to: "/standpunten",
            },
            {
              image: "/assets/speerpunt-kernen.jpg",
              title: "Leefbare kernen",
              text: "Behoud van dorpshuizen, scholen, veilige fietspaden en directe inspraak voor alle 43 wijken en kernen.",
              to: "/standpunten",
            },
          ].map((f) => (
            <Link
              key={f.title}
              to={f.to}
              className="group flex flex-col justify-between bg-card border border-border/80 hover:border-accent/60 rounded-xs overflow-hidden hover-lift transition-all"
            >
              <div>
                <div className="relative h-40 w-full overflow-hidden bg-black/20 border-b border-border/50">
                  <img
                    src={f.image}
                    alt={f.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-75 group-hover:opacity-40 transition-opacity" />
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="font-display text-lg sm:text-xl font-bold mb-2 text-foreground group-hover:text-accent transition-colors leading-snug">
                    {f.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
                    {f.text}
                  </p>
                </div>
              </div>
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-[11px] uppercase tracking-widest text-accent font-semibold flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                Lees meer <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* NIEUWS */}
      <section className="container pt-2 sm:pt-4 pb-10 sm:pb-12">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Laatste berichten</div>
            <h2 className="font-display text-5xl md:text-6xl border-gold-line pb-4">Nieuws</h2>
          </div>
          <Link
            to="/nieuws"
            className="hidden sm:inline-flex text-xs uppercase tracking-widest text-accent items-center gap-2 hover:gap-3 transition-all"
          >
            Alle nieuws <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {homeNews.slice(0, 2).map((n) => (
            <Link
              key={n.id}
              to={`/nieuws/${n.id}`}
              className="group bg-card border border-border hover-lift overflow-hidden flex flex-col"
            >
              <div className="aspect-[16/9] overflow-hidden bg-muted">
                <img
                  src={n.image || n.thumbnailUrl || n.headerUrl || heroBanner}
                  alt={n.title || "Nieuwsbericht"}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-accent mb-3">
                  <span>{n.category || "Nieuws"}</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <CalIcon className="w-3 h-3" /> {formatDateSafe(n.date || n.createdAt)}
                  </span>
                </div>
                <h3 className="font-display text-2xl mb-2 leading-tight">{n.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">{n.excerpt}</p>
                <div className="mt-auto text-xs uppercase tracking-widest text-accent flex items-center gap-2 group-hover:gap-3 transition-all">
                  Lees verder <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <BelafspraakDialog open={belOpen} onOpenChange={setBelOpen} />
    </>
  );
};

export default Home;
