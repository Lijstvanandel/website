import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Phone, Home as HomeIcon, TreePine, Tractor, Calendar as CalIcon, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import heroBanner from "@/assets/steenwijk-aerial.jpg";
import sammyImg from "@/assets/sammy.png";
import lisaImg from "@/assets/lisa.png";
import { BelafspraakDialog } from "@/components/BelafspraakDialog";
import { news } from "@/data/news";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

const Home = () => {
  const [belOpen, setBelOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const slugify = (s: string) =>
      s.toLowerCase().replace(/[,]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === "wijk-click" && typeof e.data.slug === "string") {
        navigate(`/wijken-en-kernen/${slugify(e.data.slug)}`);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [navigate]);

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <img
          src={heroBanner}
          alt="Luchtfoto van Steenwijk bij zonsondergang"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-twente-black via-twente-black/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        <div className="container relative z-10 py-24">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 items-center">
            <div className="max-w-3xl space-y-6 animate-fade-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-accent/40 bg-twente-black/60 backdrop-blur">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs uppercase tracking-[0.3em] text-accent">
                  In de Gemeenteraad — Steenwijkerland
                </span>
              </div>
              <h1 className="font-display text-6xl md:text-8xl lg:text-9xl leading-[0.9] tracking-tight">
                <span className="block">Meer inspraak</span>
                <span className="block text-gradient-gold">Meer vrijheid</span>
                <span className="block text-primary">Lijst van Andel</span>
              </h1>
              <p className="text-lg md:text-xl text-foreground/85 max-w-xl leading-relaxed">
                Met twee raadszetels zetten Sammy van Andel en Lisa Mars zich in voor een gemeente waar lokale binding
                telt, natuur beschermd wordt en bestuur dichtbij staat.
              </p>
              <div className="flex flex-wrap gap-3 pt-4">
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 uppercase tracking-wider font-semibold">
                  <Link to="/standpunten">
                    Onze standpunten <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground uppercase tracking-wider font-semibold">
                  <Link to="/fractie">
                    <Users className="w-4 h-4" /> Ontmoet de fractie
                  </Link>
                </Button>
              </div>
            </div>

            {/* Interactieve transparante buurtkaart */}
            <div className="hidden lg:block relative h-[1100px] xl:h-[1300px] -mr-12 xl:-mr-24 animate-fade-up">
              <iframe
                src="/maps/buurtkaart-hero.html"
                title="Interactieve buurtkaart Steenwijkerland"
                className="w-full h-full block"
                style={{ background: "transparent" }}
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-accent/20 bg-twente-black/80 backdrop-blur">
          <div className="container grid grid-cols-2 md:grid-cols-4 gap-px">
            {[
              { v: "2", l: "Raadszetels" },
              { v: "2", l: "Burgerraadsleden" },
              { v: "10", l: "Speerpunten" },
              { v: "∞", l: "Lokale trots" },
            ].map((s) => (
              <div key={s.l} className="px-4 py-5 text-center bg-twente-black/40">
                <div className="font-display text-3xl md:text-4xl text-gradient-gold">{s.v}</div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1">{s.l}</div>
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

      {/* FEATURE GRID */}
      <section className="container py-20">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Waar wij voor staan</div>
        <h2 className="font-display text-5xl md:text-6xl mb-10 border-gold-line pb-4">Speerpunten</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: HomeIcon,
              title: "Voorrang voor inwoners",
              text: "Lokale binding telt bij woningtoewijzing. Onze jongeren verdienen een eerlijke kans.",
              to: "/standpunten",
            },
            {
              icon: TreePine,
              title: "Behoud van natuur",
              text: "Bescherming van de Weerribben-Wieden — ons unieke visitekaartje.",
              to: "/standpunten",
            },
            {
              icon: Tractor,
              title: "Boer terug in beleid",
              text: "Een gemeente die als bondgenoot náást de boer staat, niet ertegenover.",
              to: "/standpunten",
            },
          ].map((f) => (
            <Link key={f.title} to={f.to} className="group block bg-card border border-border p-8 hover-lift">
              <f.icon className="w-10 h-10 text-accent mb-5" />
              <h3 className="font-display text-2xl mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
              <div className="mt-5 text-xs uppercase tracking-widest text-accent flex items-center gap-2 group-hover:gap-3 transition-all">
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
          {news.slice(0, 2).map((n) => (
            <Link
              key={n.id}
              to={`/nieuws/${n.id}`}
              className="group bg-card border border-border hover-lift overflow-hidden flex flex-col"
            >
              <div className="aspect-[16/9] overflow-hidden">
                <img
                  src={n.image}
                  alt={n.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-accent mb-3">
                  <span>{n.category}</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <CalIcon className="w-3 h-3" /> {format(parseISO(n.date), "d MMM yyyy", { locale: nl })}
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
