import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Mail,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Send,
  Video,
  Phone,
  ArrowLeft,
  ArrowRight,
  FileText,
  Newspaper,
  MessageSquare,
  BarChart3,
  User,
  Users,
  MapPin,
  RefreshCw,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { BelafspraakDialog } from "@/components/BelafspraakDialog";
import { VideoPlayer } from "@/components/VideoPlayer";
import { news } from "@/data/news";
import { WijkItem } from "@/types/wijk";
import { useAuth } from "@/context/AuthContext";

function formatSocialUrl(platform: string, value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (platform === "instagram") return `https://instagram.com/${trimmed.replace(/^@/, "")}`;
  if (platform === "facebook") return `https://facebook.com/${trimmed}`;
  if (platform === "twitter") return `https://x.com/${trimmed.replace(/^@/, "")}`;
  if (platform === "telegram") return `https://t.me/${trimmed.replace(/^@/, "")}`;
  if (platform === "tiktok") return `https://tiktok.com/@${trimmed.replace(/^@/, "")}`;
  if (platform === "linkedin") return `https://linkedin.com/in/${trimmed}`;
  return `https://${trimmed}`;
}

const DEFAULT_DOSSIERS = [
  {
    titel: "Verkeersveiligheid en wijkontsluiting",
    status: "Lopend",
    samenvatting: "Aandacht voor veilige fietspaden, oversteekplaatsen en remmende maatregelen rondom scholen en kruispunten.",
  },
  {
    titel: "Behoud voorzieningen en leefbaarheid",
    status: "In voorbereiding",
    samenvatting: "Onderzoek naar behoeften aan buurtactiviteiten, ontmoetingsruimten en behoud van lokale basisvoorzieningen.",
  },
  {
    titel: "Duurzaamheid en energiekosten",
    status: "Verkennend",
    samenvatting: "Betaalbare verduurzaming zonder onevenredig hoge lasten voor bewoners en ondernemers in de buurt.",
  },
];

const DEFAULT_CIJFERS = [
  { label: "Woningmarkt", waarde: "Lokale voorrang", gemeente: "Speerpunt", nederland: "Lijst van Andel" },
  { label: "Groenvoorziening", waarde: "Kwaliteit & rust", gemeente: "Behoud", nederland: "Natuur" },
  { label: "Bereikbaarheid", waarde: "Fiets & OV", gemeente: "Prioriteit", nederland: "Veilig" },
  { label: "Inspraak", waarde: "Direct contact", gemeente: "Wijkgericht", nederland: "Inwoner eerst" },
];

interface WijkVideo {
  id: string;
  title: string;
  videoUrl: string;
  category?: string;
  date?: string;
}

const WijkDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [belOpen, setBelOpen] = useState(false);
  const [wijk, setWijk] = useState<WijkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<WijkVideo[]>([]);

  const handleHelpClick = () => {
    if (!wijk) return;
    const targetPath = `/dashboard?applyWijk=${encodeURIComponent(wijk.slug)}`;
    if (isAuthenticated) {
      navigate(targetPath);
    } else {
      navigate(`/login?redirect=${encodeURIComponent(targetPath)}`);
    }
  };

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    // Fetch dynamic wijk data from backend
    fetch(`/api/wijken/${slug}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Wijk of kern niet gevonden");
        }
        return res.json().catch(() => null);
      })
      .then((data: WijkItem | null) => {
        if (!data) throw new Error("Ongeldige wijk gegevens");
        setWijk(data);
        document.title = `${data.naam} (${data.type || 'Wijk/Kern'}) | Lijst van Andel`;
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    // Fetch videos for this wijk
    fetch(`/api/videos?wijkSlug=${slug}`)
      .then((res) => (res.ok ? res.json().catch(() => []) : []))
      .then(setVideos)
      .catch(() => setVideos([]));
  }, [slug]);

  if (loading) {
    return (
      <div className="container py-24 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-accent mb-4" />
        <p className="text-muted-foreground text-sm">Wijkgegevens laden...</p>
      </div>
    );
  }

  if (error || !wijk) {
    const readableName = (slug ?? "")
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return (
      <div className="container py-24">
        <Link
          to="/wijken-en-kernen"
          className="inline-flex items-center gap-2 text-accent text-xs uppercase tracking-widest mb-8 hover:text-accent/80"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Terug naar overzicht
        </Link>
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Wijk / kern</div>
          <h1 className="font-display text-5xl md:text-7xl mb-6 border-gold-line pb-5">
            {readableName || "Onbekend gebied"}
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Voor dit gebied is nog geen specifieke wijkpagina aangemaakt of gepubliceerd in het
            beheerderspaneel. Laat ons gerust weten wat er bij u in de buurt speelt!
          </p>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link to="/contact">Neem contact op met de fractie</Link>
          </Button>
        </div>
      </div>
    );
  }

  const rep = wijk.vertegenwoordiger;
  const repFullName = rep ? `${rep.voornaam} ${rep.achternaam}`.trim() : "";
  const repRole =
    rep?.rol ||
    (wijk.type === "Wijk" ? "Wijkvertegenwoordiger" : "Kernvertegenwoordiger");

  const facebookUrl = formatSocialUrl("facebook", rep?.socials?.facebook);
  const instagramUrl = formatSocialUrl("instagram", rep?.socials?.instagram);
  const linkedinUrl = formatSocialUrl("linkedin", rep?.socials?.linkedin);
  const twitterUrl = formatSocialUrl("twitter", rep?.socials?.twitter);
  const telegramUrl = formatSocialUrl("telegram", rep?.socials?.telegram);
  const tiktokUrl = formatSocialUrl("tiktok", rep?.socials?.tiktok);

  const hasAnySocial =
    facebookUrl || instagramUrl || linkedinUrl || twitterUrl || telegramUrl || tiktokUrl;

  return (
    <div>
      {/* ========================================================
          HERO BANNER MET ACHTERGRONDFOTO
          ======================================================== */}
      <section className="relative w-full min-h-[320px] md:min-h-[420px] flex items-center overflow-hidden border-b border-accent/30 bg-black">
        <img
          src={wijk.bannerUrl || "/assets/steenwijk-aerial.jpg"}
          alt={`Achtergrond van ${wijk.naam}`}
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/assets/steenwijk-aerial.jpg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        <div className="relative container z-10 py-12 md:py-16 flex flex-col justify-between h-full">
          <Link
            to="/wijken-en-kernen"
            className="inline-flex items-center gap-2 text-accent text-xs uppercase tracking-widest hover:text-accent/80 w-fit mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Terug naar wijken en kernen
          </Link>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-accent/40 bg-black/60 backdrop-blur rounded mb-4">
                <MapPin className="w-3 h-3 text-accent" />
                <span className="text-xs uppercase tracking-[0.25em] text-accent font-semibold">
                  {wijk.type === "Wijk" ? "Wijk in Steenwijk" : `Kern in ${wijk.gemeente}`}
                </span>
              </div>
              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-white tracking-tight leading-none mb-3">
                {wijk.naam}
              </h1>
              <p className="text-xs text-white/70 uppercase tracking-widest">
                Gemeente {wijk.gemeente}
              </p>
            </div>

            <div className="bg-black/40 backdrop-blur border border-white/10 p-6 rounded-lg">
              <div className="text-[10px] uppercase tracking-widest text-accent mb-2 font-semibold">
                Over {wijk.naam}
              </div>
              <p className="text-sm md:text-base text-white/90 leading-relaxed">
                {wijk.beschrijving ||
                  `${wijk.naam} is een belangrijk onderdeel van Steenwijkerland. Lijst van Andel zet zich actief in voor de leefbaarheid, veiligheid en het behoud van voorzieningen.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-12 md:py-16 space-y-20">
        {/* ========================================================
            WIJK-/KERNVERTEGENWOORDIGER + FEITEN & CIJFERS
            ======================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Vertegenwoordiger Card */}
          {rep ? (
            <article className="group relative bg-card border border-border overflow-hidden hover-lift flex flex-col justify-between rounded-lg shadow-sm">
              <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-black/80 backdrop-blur border border-accent text-[10px] uppercase tracking-widest text-accent font-semibold rounded">
                {repRole}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] md:grid-cols-[200px_1fr]">
                {/* Foto */}
                <div className="aspect-[4/5] sm:aspect-auto sm:h-full overflow-hidden bg-muted relative">
                  <img
                    src={rep.fotoUrl || "/assets/stef-mars.jpg"}
                    alt={`${repFullName} - ${repRole}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/assets/silhouette.png";
                    }}
                  />
                </div>

                {/* Info */}
                <div className="p-6 md:p-7 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-accent mb-1 font-semibold">
                      Uw aanspreekpunt
                    </div>
                    <h2 className="font-display text-3xl md:text-4xl mb-3">{repFullName}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      {rep.beschrijving ||
                        `${rep.voornaam} is uw aanspreekpunt in ${wijk.naam}. Signalen, ideeën en knelpunten worden rechtstreeks besproken en ingebracht bij de fractie.`}
                    </p>

                    {/* Email contact */}
                    {rep.email && (
                      <div className="mb-4">
                        <a
                          href={`mailto:${rep.email}`}
                          className="inline-flex items-center gap-2 text-xs text-accent hover:text-accent/80 transition-colors font-medium break-all"
                        >
                          <Mail className="w-4 h-4 shrink-0" />
                          {rep.email}
                        </a>
                      </div>
                    )}

                    {/* Social Media icons */}
                    {hasAnySocial && (
                      <div className="flex flex-wrap items-center gap-2 mb-6 pt-1">
                        {facebookUrl && (
                          <a
                            href={facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Facebook"
                            title="Facebook"
                            className="w-8 h-8 rounded flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <Facebook className="w-4 h-4" />
                          </a>
                        )}
                        {instagramUrl && (
                          <a
                            href={instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                            title="Instagram"
                            className="w-8 h-8 rounded flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <Instagram className="w-4 h-4" />
                          </a>
                        )}
                        {linkedinUrl && (
                          <a
                            href={linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="LinkedIn"
                            title="LinkedIn"
                            className="w-8 h-8 rounded flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <Linkedin className="w-4 h-4" />
                          </a>
                        )}
                        {twitterUrl && (
                          <a
                            href={twitterUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Twitter / X"
                            title="Twitter / X"
                            className="w-8 h-8 rounded flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <Twitter className="w-4 h-4" />
                          </a>
                        )}
                        {telegramUrl && (
                          <a
                            href={telegramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Telegram"
                            title="Telegram"
                            className="w-8 h-8 rounded flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </a>
                        )}
                        {tiktokUrl && (
                          <a
                            href={tiktokUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="TikTok"
                            title="TikTok"
                            className="w-8 h-8 rounded flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <Video className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Belafspraak action */}
                  <Button
                    onClick={() => setBelOpen(true)}
                    variant="outline"
                    className="border-accent text-accent hover:bg-accent hover:text-accent-foreground uppercase tracking-wider text-xs font-semibold w-fit gap-2"
                  >
                    <Phone className="w-3.5 h-3.5" /> Belafspraak inplannen
                  </Button>
                </div>
              </div>
            </article>
          ) : (
            <article className="bg-card border border-dashed border-border p-8 rounded-lg flex flex-col justify-between hover-lift">
              <div>
                <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent mb-4">
                  <User className="w-6 h-6" />
                </div>
                <div className="text-[10px] uppercase tracking-widest text-accent mb-1 font-semibold">
                  {wijk.type === "Wijk" ? "Wijkvertegenwoordiger" : "Kernvertegenwoordiger"}
                </div>
                <h2 className="font-display text-3xl mb-3">Aanspreekpunt gezocht</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Voor {wijk.naam} is er momenteel nog geen vaste vertegenwoordiger geregistreerd.
                  Woont u hier en wilt u meedenken met Lijst van Andel, of heeft u een actuele
                  kwestie die u wilt aankaarten?
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                <Button asChild className="bg-primary hover:bg-primary/90 text-xs">
                  <Link to="/contact">Stel een vraag aan de fractie</Link>
                </Button>
                <Button
                  onClick={handleHelpClick}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold shadow-sm"
                >
                  <HeartHandshake className="w-3.5 h-3.5 mr-1.5" /> Ik wil helpen
                </Button>
                <Button
                  onClick={() => setBelOpen(true)}
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground text-xs"
                >
                  <Phone className="w-3.5 h-3.5 mr-1" /> Belafspraak maken
                </Button>
              </div>
            </article>
          )}

          {/* Feiten & Speerpunten */}
          <article className="bg-card border border-border p-6 md:p-8 flex flex-col justify-between hover-lift rounded-lg">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-accent mb-2 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" /> Lokaal Profiel
              </div>
              <h3 className="font-display text-3xl mb-5 border-gold-line pb-3">
                Prioriteiten in {wijk.naam}
              </h3>

              <dl className="grid grid-cols-2 gap-x-5 gap-y-4 mb-6">
                {DEFAULT_CIJFERS.map((c) => (
                  <div key={c.label} className="border-l-2 border-accent/40 pl-3">
                    <dt className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                      {c.label}
                    </dt>
                    <dd className="font-display text-xl text-foreground leading-none mb-1">
                      {c.waarde}
                    </dd>
                    <div className="text-[10px] text-muted-foreground/80 leading-tight">
                      {c.gemeente} · {c.nederland}
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Lijst van Andel — Steenwijkerland
              </span>
              <Link
                to="/standpunten"
                className="text-xs text-accent hover:underline inline-flex items-center gap-1"
              >
                Lees onze standpunten <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </article>
        </section>

        {/* ========================================================
            VIDEOS VAN DEZE WIJK
            ======================================================== */}
        {videos && videos.length > 0 && (
          <CarouselSection
            icon={<MessageSquare className="w-3.5 h-3.5" />}
            eyebrow="Media"
            title={`Video's over ${wijk.naam}`}
            ctaHref="#"
          >
            {videos.map((v) => (
              <CarouselItem key={v.id} className="md:basis-1/2 lg:basis-1/3">
                <div className="bg-card border border-border h-full flex flex-col hover-lift overflow-hidden rounded-lg">
                  <div className="aspect-video bg-black flex-shrink-0 relative overflow-hidden">
                    <VideoPlayer url={v.videoUrl} title={v.title} className="w-full h-full" />
                  </div>
                  <div className="p-6 flex flex-col">
                    <div className="text-[10px] uppercase tracking-widest text-accent mb-3">
                      {v.category} • {v.date}
                    </div>
                    <h3 className="font-display text-xl mb-3 leading-snug">{v.title}</h3>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselSection>
        )}

        {/* ========================================================
            NIEUWS UIT DE GEMEENTE
            ======================================================== */}
        <CarouselSection
          icon={<Newspaper className="w-3.5 h-3.5" />}
          eyebrow="Wat speelt er"
          title="Nieuws & Actualiteiten"
          ctaHref="/nieuws"
        >
          {news.map((n) => (
            <CarouselItem key={n.id} className="md:basis-1/2 lg:basis-1/3">
              <Link
                to={`/nieuws/${n.id}`}
                className="block bg-card border border-border h-full flex flex-col hover-lift overflow-hidden rounded-lg"
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
                  <div className="text-[10px] uppercase tracking-widest text-accent mb-2">
                    {n.category}
                  </div>
                  <h3 className="font-display text-lg mb-2 leading-snug">{n.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {n.excerpt}
                  </p>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselSection>

        {/* ========================================================
            DOSSIERS
            ======================================================== */}
        <CarouselSection
          icon={<FileText className="w-3.5 h-3.5" />}
          eyebrow="Lopende zaken"
          title={`Dossiers in ${wijk.naam}`}
          ctaHref="#"
        >
          {DEFAULT_DOSSIERS.map((d, i) => (
            <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3">
              <div className="bg-card border border-border p-6 h-full flex flex-col hover-lift rounded-lg">
                <div className="text-[10px] uppercase tracking-widest text-accent mb-3 font-semibold">
                  {d.status}
                </div>
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
        defaultRaadslid={
          repFullName
            ? `${repFullName} — ${repRole} ${wijk.naam}`
            : `Sammy van Andel — Fractievoorzitter Lijst van Andel`
        }
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
      {ctaHref && ctaHref !== "#" && (
        <Button
          asChild
          variant="outline"
          className="border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground uppercase tracking-wider text-xs font-semibold"
        >
          <Link to={ctaHref}>
            Bekijk meer <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      )}
    </div>
    <Carousel opts={{ align: "start" }} className="relative">
      <CarouselContent>{children}</CarouselContent>
      <CarouselPrevious className="hidden md:flex -left-4" />
      <CarouselNext className="hidden md:flex -right-4" />
    </Carousel>
  </section>
);

export default WijkDetail;
