import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import {
  Mail,
  Instagram,
  Facebook,
  Linkedin,
  Phone,
  ArrowLeft,
  ArrowRight,
  FileText,
  Newspaper,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { BelafspraakDialog } from "@/components/BelafspraakDialog";
import banner from "@/assets/oostermeenthe-banner.jpg";
import stef from "@/assets/stef-mars.jpg";
import { news } from "@/data/news";

interface WijkData {
  naam: string;
  type: "wijk" | "kern";
  banner: string;
  intro: string;
  vertegenwoordiger: {
    naam: string;
    rol: string;
    img: string;
    bio: string;
    email: string;
    socials: { instagram?: string; facebook?: string; linkedin?: string };
  };
  bijdragen: { titel: string; datum: string; samenvatting: string; video?: string }[];
  dossiers: { titel: string; status: string; samenvatting: string }[];
  cijfers?: { label: string; waarde: string; gemeente?: string; nederland?: string }[];
}

const wijken: Record<string, WijkData> = {
  oostermeenthe: {
    naam: "Oostermeenthe",
    type: "wijk",
    banner,
    intro:
      "Oostermeenthe is een ruim opgezette woonwijk aan de oostzijde van Steenwijk. Een wijk met karakter, met aandacht voor verkeersveiligheid, groen onderhoud en voorzieningen voor jong en oud.",
    vertegenwoordiger: {
      naam: "Stef Mars",
      rol: "Wijkvertegenwoordiger",
      img: stef,
      bio: "Stef is uw aanspreekpunt in Oostermeenthe. Hij verzamelt signalen uit de wijk en brengt deze onder de aandacht van de fractie.",
      email: "stef@lijstvanandel.nl",
      socials: { instagram: "#", facebook: "#", linkedin: "#" },
    },
    bijdragen: [
      {
        titel: "Bijdrage Oostermeenthe",
        datum: "Recent",
        samenvatting: "Bekijk de bijdrage van Lijst van Andel over Oostermeenthe.",
        video: "/videos/oostermeenthe-bijdrage.mp4",
      },
    ],
    dossiers: [
      {
        titel: "Herinrichting Oostermeentheweg",
        status: "Lopend",
        samenvatting: "Plannen voor een veiligere en groenere weginrichting met aandacht voor fietsers.",
      },
      {
        titel: "Wijkvoorzieningen",
        status: "In voorbereiding",
        samenvatting: "Onderzoek naar behoefte aan ontmoetingsplek en buurtactiviteiten in de wijk.",
      },
      {
        titel: "Energietransitie woonwijk",
        status: "Verkennend",
        samenvatting: "Hoe maken we de woonwijk klaar voor de toekomst zonder dat inwoners de rekening betalen?",
      },
    ],
    cijfers: [
      { label: "Inwoners", waarde: "3.055", gemeente: "492 gem.", nederland: "1.225 NL" },
      { label: "Huishoudens", waarde: "1.315", gemeente: "220 gem.", nederland: "572 NL" },
      { label: "Bevolkingsdichtheid", waarde: "3.962 / km²", gemeente: "795 gem.", nederland: "3.308 NL" },
      { label: "Gem. WOZ-waarde", waarde: "€ 245.000", gemeente: "€ 442.000 gem.", nederland: "€ 450.000 NL" },
      { label: "Koopwoningen", waarde: "61%", gemeente: "81% gem.", nederland: "68% NL" },
      { label: "Huurwoningen", waarde: "39%", gemeente: "19% gem.", nederland: "32% NL" },
      { label: "Eengezinswoningen", waarde: "84%", gemeente: "91% gem.", nederland: "76% NL" },
      { label: "Afstand supermarkt", waarde: "0,5 km", gemeente: "2,8 km gem.", nederland: "1,6 km NL" },
      { label: "Afstand basisschool", waarde: "0,7 km", gemeente: "1,9 km gem.", nederland: "1,2 km NL" },
      { label: "Auto's per huishouden", waarde: "1,1", gemeente: "1,4 gem.", nederland: "1,2 NL" },
    ],
  },
};

const WijkDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [belOpen, setBelOpen] = useState(false);
  const data = slug ? wijken[slug] : undefined;

  if (!data) {
    const naam = (slug ?? "")
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return (
      <div className="container py-24">
        <Link
          to="/wijken-en-kernen"
          className="inline-flex items-center gap-2 text-accent text-xs uppercase tracking-widest mb-8 hover:text-accent/80"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Terug naar de kaart
        </Link>
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Wijk / kern</div>
          <h1 className="font-display text-6xl md:text-7xl mb-6 border-gold-line pb-5">{naam || "Onbekend"}</h1>
          <p className="text-lg text-muted-foreground">
            Deze pagina wordt binnenkort gevuld met een wijkvertegenwoordiger, lopende dossiers, bijdragen en nieuws.
            Kom snel terug — of laat ons weten wat er bij u in de buurt speelt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* BANNER */}
      <section className="relative w-full h-[240px] sm:h-[300px] md:h-[360px] lg:h-[400px] overflow-hidden border-b border-accent/30">
        <img
          src={data.banner}
          alt={`Banner van ${data.naam}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/55 to-background/30" />
        <div className="absolute inset-0 container flex flex-col">
          <Link
            to="/wijken-en-kernen"
            className="inline-flex items-center gap-2 text-accent text-xs uppercase tracking-widest mt-5 hover:text-accent/80 w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Terug naar de kaart
          </Link>
          <div className="flex-1 grid md:grid-cols-2 gap-6 items-center py-6">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">
                {data.type === "wijk" ? "Wijk in Steenwijk" : "Kern in Steenwijkerland"}
              </div>
              <h1 className="font-display text-5xl md:text-7xl">{data.naam}</h1>
            </div>
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed max-w-md">{data.intro}</p>
          </div>
        </div>
      </section>

      <div className="container py-12 md:py-16 space-y-20">


        {/* WIJKVERTEGENWOORDIGER + FEITEN */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vertegenwoordiger — zelfde stijl als fractiepagina */}
          <article className="group relative bg-card border border-border overflow-hidden hover-lift flex flex-col self-start">
            <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-twente-black/80 backdrop-blur border border-accent text-[10px] uppercase tracking-widest text-accent font-semibold">
              {data.vertegenwoordiger.rol}
            </div>
            <div className="grid grid-cols-[160px_1fr] sm:grid-cols-[200px_1fr]">
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={data.vertegenwoordiger.img}
                  alt={`${data.vertegenwoordiger.naam} - ${data.vertegenwoordiger.rol}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-5 md:p-6 flex flex-col">
                <div className="text-[10px] uppercase tracking-widest text-accent mb-1">
                  {data.vertegenwoordiger.rol}
                </div>
                <h3 className="font-display text-3xl mb-3">{data.vertegenwoordiger.naam}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{data.vertegenwoordiger.bio}</p>

                <a
                  href={`mailto:${data.vertegenwoordiger.email}`}
                  className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 mb-3 break-all"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  {data.vertegenwoordiger.email}
                </a>

                <div className="flex items-center gap-2 mb-4">
                  {data.vertegenwoordiger.socials.instagram && (
                    <a
                      href={data.vertegenwoordiger.socials.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="w-8 h-8 flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {data.vertegenwoordiger.socials.facebook && (
                    <a
                      href={data.vertegenwoordiger.socials.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="w-8 h-8 flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Facebook className="w-4 h-4" />
                    </a>
                  )}
                  {data.vertegenwoordiger.socials.linkedin && (
                    <a
                      href={data.vertegenwoordiger.socials.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="LinkedIn"
                      className="w-8 h-8 flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <Button
                  onClick={() => setBelOpen(true)}
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground uppercase tracking-wider text-xs font-semibold w-fit"
                >
                  <Phone className="w-3.5 h-3.5" /> Belafspraak inplannen
                </Button>
              </div>
            </div>
          </article>

          {/* FEITEN & CIJFERS */}
          {data.cijfers && data.cijfers.length > 0 && (
            <article className="bg-card border border-border p-6 md:p-8 flex flex-col hover-lift">
              <div className="text-[10px] uppercase tracking-[0.3em] text-accent mb-2 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" /> Kerncijfers
              </div>
              <h3 className="font-display text-3xl mb-5 border-gold-line pb-3">Feiten & cijfers</h3>

              <dl className="grid grid-cols-2 gap-x-5 gap-y-4 mb-5">
                {data.cijfers.map((c) => (
                  <div key={c.label} className="border-l-2 border-accent/40 pl-3">
                    <dt className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{c.label}</dt>
                    <dd className="font-display text-xl text-foreground leading-none mb-1">{c.waarde}</dd>
                    {(c.gemeente || c.nederland) && (
                      <div className="text-[10px] text-muted-foreground/80 leading-tight">
                        {c.gemeente}
                        {c.gemeente && c.nederland ? " · " : ""}
                        {c.nederland}
                      </div>
                    )}
                  </div>
                ))}
              </dl>

              <p className="mt-auto text-[10px] uppercase tracking-widest text-muted-foreground/70 border-t border-border pt-3">
                Bron: CBS — Kerncijfers wijken en buurten
              </p>
            </article>
          )}
        </section>

        {/* BIJDRAGEN */}
        <CarouselSection
          icon={<MessageSquare className="w-3.5 h-3.5" />}
          eyebrow="Inzet voor de wijk"
          title="Bijdragen"
          ctaHref="#"
        >
          {data.bijdragen.map((b, i) => (
            <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3">
              <div className="bg-card border border-border h-full flex flex-col hover-lift overflow-hidden">
                {b.video ? (
                  <video
                    src={b.video}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full aspect-video bg-black object-cover"
                  />
                ) : null}
                <div className="p-6 flex flex-col">
                  <div className="text-[10px] uppercase tracking-widest text-accent mb-3">{b.datum}</div>
                  <h3 className="font-display text-xl mb-3 leading-snug">{b.titel}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.samenvatting}</p>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselSection>

        {/* NIEUWS */}
        <CarouselSection
          icon={<Newspaper className="w-3.5 h-3.5" />}
          eyebrow="Wat speelt er"
          title="Nieuws"
          ctaHref="/nieuws"
        >
          {news.map((n) => (
            <CarouselItem key={n.id} className="md:basis-1/2 lg:basis-1/3">
              <Link
                to={`/nieuws/${n.id}`}
                className="block bg-card border border-border h-full flex flex-col hover-lift overflow-hidden"
              >
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  <img
                    src={n.image}
                    alt={n.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-accent mb-2">{n.category}</div>
                  <h3 className="font-display text-lg mb-2 leading-snug">{n.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{n.excerpt}</p>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselSection>

        {/* DOSSIERS */}
        <CarouselSection
          icon={<FileText className="w-3.5 h-3.5" />}
          eyebrow="Lopende zaken"
          title="Dossiers"
          ctaHref="#"
        >
          {data.dossiers.map((d, i) => (
            <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3">
              <div className="bg-card border border-border p-6 h-full flex flex-col hover-lift">
                <div className="text-[10px] uppercase tracking-widest text-accent mb-3">{d.status}</div>
                <h3 className="font-display text-xl mb-3 leading-snug">{d.titel}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{d.samenvatting}</p>
              </div>
            </CarouselItem>
          ))}
        </CarouselSection>
      </div>

      <BelafspraakDialog
        open={belOpen}
        onOpenChange={setBelOpen}
        defaultRaadslid={`Stef Mars — Wijkvertegenwoordiger Oostermeenthe`}
      />
    </div>
  );
};

const CarouselSection = ({
  icon,
  eyebrow,
  title,
  ctaHref,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  ctaHref: string;
  children: React.ReactNode;
}) => (
  <section>
    <div className="flex items-end justify-between mb-6 gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-accent mb-2 flex items-center gap-2">
          {icon} {eyebrow}
        </div>
        <h2 className="font-display text-4xl md:text-5xl border-gold-line pb-4">{title}</h2>
      </div>
      <Button
        asChild
        variant="outline"
        className="border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground uppercase tracking-wider text-xs font-semibold"
      >
        <Link to={ctaHref}>
          Bekijk meer <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </Button>
    </div>
    <Carousel opts={{ align: "start" }} className="relative">
      <CarouselContent>{children}</CarouselContent>
      <CarouselPrevious className="hidden md:flex -left-4" />
      <CarouselNext className="hidden md:flex -right-4" />
    </Carousel>
  </section>
);

export default WijkDetail;
