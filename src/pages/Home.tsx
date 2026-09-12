import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Phone, Home as HomeIcon, TreePine, Tractor, Coins, Landmark, Calendar as CalIcon, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import heroBanner from "@/assets/steenwijk-aerial.jpg";
import sammyImg from "@/assets/sammy.png";
import lisaImg from "@/assets/lisa.png";
import { BelafspraakDialog } from "@/components/BelafspraakDialog";
import { HeroBuurtkaart } from "@/components/HeroBuurtkaart";
import { news } from "@/data/news";
import { WijkItem } from "@/types/wijk";
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

const Home = () => {
  const [belOpen, setBelOpen] = useState(false);
  const [homeNews, setHomeNews] = useState<any[]>(() => news.filter((n: any) => !n.wijkSlug));
  const [wijken, setWijken] = useState<WijkItem[]>([]);
  const [hoveredWijkSlug, setHoveredWijkSlug] = useState<string | null>(null);
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
  }, []);

  useEffect(() => {
    const slugify = (s: string) =>
      s.toLowerCase().replace(/[,]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "wijk-click" && typeof e.data.slug === "string") {
        navigate(`/wijken-en-kernen/${slugify(e.data.slug)}`);
      } else if (e.data.type === "wijk-hover" && typeof e.data.slug === "string") {
        setHoveredWijkSlug(slugify(e.data.slug));
      } else if (e.data.type === "wijk-unhover") {
        setHoveredWijkSlug(null);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [navigate]);

  // Find hovered wijk and its custom hero background image if available
  const hoveredWijk = hoveredWijkSlug ? wijken.find((w) => w.slug === hoveredWijkSlug) : null;
  const customHeroBackground = hoveredWijk?.heroBannerUrl?.trim() || null;

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
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-700"
        />

        {/* Dynamische hover achtergrondfoto van de geselecteerde wijk / kern indien geconfigureerd */}
        {customHeroBackground && (
          <img
            key={customHeroBackground}
            src={customHeroBackground}
            alt={`Sfeerbeeld van ${hoveredWijk?.naam || "wijk"}`}
            width={1920}
            height={1080}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none animate-fade-in transition-opacity duration-700 z-[1]"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-twente-black via-twente-black/85 to-transparent pointer-events-none z-[2]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none z-[2]" />

        <div className="container relative z-10 py-1 sm:py-2">
          <div className="grid lg:grid-cols-[1.1fr_1.3fr] xl:grid-cols-[1fr_1.2fr] gap-6 lg:gap-8 xl:gap-12 items-center">
            <div className="max-w-3xl space-y-3.5 sm:space-y-4 md:space-y-5 animate-fade-up">
              {/* Compacte badge direct onder de navbar */}
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-accent/40 bg-twente-black/70 backdrop-blur rounded-xs">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs uppercase tracking-[0.25em] text-accent font-medium">
                  {hoveredWijk ? `Wijk in beeld — ${hoveredWijk.naam}` : "In de Gemeenteraad — Steenwijkerland"}
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

      {/* PERSOONLIJK GESPREK CTA */}
      <section className="container py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Direct contact</div>
          <h2 className="font-display text-5xl md:text-6xl mb-10 border-gold-line pb-4">Plan een belafspraak</h2>

          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-center bg-card border border-accent/20 p-8 md:p-12">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-accent mb-3">
                <img src={sammyImg} alt="Sammy" className="w-full h-full object-cover" />
              </div>
              <div className="font-display text-2xl">Sammy van Andel</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Fractievoorzitter</div>
            </div>

            <div className="text-center px-4">
              <Phone className="w-12 h-12 mx-auto text-accent mb-2" />
              <div className="text-xs uppercase tracking-widest text-accent">Wo · Do · Vrij</div>
              <div className="font-display text-3xl text-gradient-gold mt-1">19:00–21:00</div>
              <div className="text-xs text-muted-foreground mt-1">max. 30 minuten</div>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-accent mb-3">
                <img src={lisaImg} alt="Lisa Mars" className="w-full h-full object-cover" />
              </div>
              <div className="font-display text-2xl">Lisa Mars</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Raadslid</div>
            </div>
          </div>
          <div className="text-center mt-6">
            <Button
              onClick={() => setBelOpen(true)}
              size="lg"
              className="bg-primary hover:bg-primary/90 uppercase tracking-wider font-semibold"
            >
              <Phone className="w-4 h-4" /> Plan uw belafspraak
            </Button>
          </div>
        </div>
      </section>

      {/* FEATURE GRID / SPEERPUNTEN */}
      <section className="container py-14 sm:py-16">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2.5">Waar wij voor staan</div>
        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl mb-6 sm:mb-8 border-gold-line pb-4">Speerpunten</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3.5">
          {[
            {
              icon: HomeIcon,
              title: "Voorrang voor inwoners",
              text: "Lokale binding telt bij woningtoewijzing. Onze eigen jongeren en starters verdienen een eerlijke kans op een betaalbaar thuis.",
              to: "/standpunten",
            },
            {
              icon: TreePine,
              title: "Behoud van natuur",
              text: "Bescherming van Nationaal Park Weerribben-Wieden en onze kenmerkende landschappen als groen erfgoed.",
              to: "/standpunten",
            },
            {
              icon: Tractor,
              title: "Boer terug in beleid",
              text: "Een gemeente die als betrouwbare bondgenoot náást de agrariërs en lokale ondernemers staat, niet ertegenover.",
              to: "/standpunten",
            },
            {
              icon: Coins,
              title: "Geen lastenverhoging",
              text: "Zuinig huishoudboekje en een lage OZB. De gemeente moet eerst op eigen apparaat besparen voordat lasten stijgen.",
              to: "/standpunten",
            },
            {
              icon: Landmark,
              title: "Leefbare kernen",
              text: "Behoud van dorpshuizen, scholen, veilige fietspaden en directe inspraak voor alle 43 wijken en kernen.",
              to: "/standpunten",
            },
          ].map((f) => (
            <Link
              key={f.title}
              to={f.to}
              className="group flex flex-col justify-between bg-card border border-border/80 hover:border-accent/60 p-4 sm:p-5 rounded-xs hover-lift transition-all"
            >
              <div>
                <div className="w-10 h-10 rounded-xs bg-accent/10 border border-accent/30 flex items-center justify-center mb-3.5 text-accent group-hover:scale-105 transition-transform">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold mb-2 text-foreground group-hover:text-accent transition-colors leading-snug">
                  {f.title}
                </h3>
                <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
                  {f.text}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 text-[11px] uppercase tracking-widest text-accent font-semibold flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                Lees meer <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* NIEUWS */}
      <section className="container py-20">
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
