import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Share2,
  CheckCircle2,
  AlertCircle,
  Compass,
  ExternalLink,
  Lock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { extractCity } from "@/lib/utils";
import { ShareDialog } from "@/components/ShareDialog";

export interface EventDetailItem {
  id: string;
  title: string;
  date: string;
  address?: string;
  city?: string;
  fullAddress?: string;
  isAttending?: boolean;
  startTime?: string;
  endTime?: string;
  shortDescription?: string;
  description: string;
  isPublic: boolean;
  isPublished: boolean;
  isCancelled: boolean;
  lat?: number;
  lng?: number;
  thumbnailUrl?: string;
  image?: string;
  attendees?: string[];
  isPrivateForUser?: boolean;
}

export default function AgendaDetail() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetailItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isAttending, setIsAttending] = useState<boolean>(false);
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);
  const { isAuthenticated, token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(`/api/events/${id}`, { headers })
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return null;
        }
        return res.json().catch(() => null);
      })
      .then((data: EventDetailItem | null) => {
        if (data && data.title) {
          setEvent(data);
          document.title = `${data.title} | Agenda Lijst van Andel`;
          if (data.isAttending || (user?.id && data.attendees?.includes(user.id))) {
            setIsAttending(true);
          }
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        console.error("Error loading event:", err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id, token, user?.id]);

  const handleAttend = async () => {
    if (!event || event.isCancelled) return;
    if (!isAuthenticated) {
      toast.info("Log in op het ledenportaal om u aan te melden voor dit evenement");
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`/api/events/${event.id}/attend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setIsAttending(true);
        if (data.fullAddress) {
          setEvent((prev) => (prev ? { ...prev, address: data.fullAddress, fullAddress: data.fullAddress } : null));
        }
        toast.success("Goed dat u komt! Op uw ledendashboard vindt u alle details en het adres. Tot dan!");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Aanmelden mislukt");
      }
    } catch {
      toast.error("Fout bij aanmelden");
    }
  };

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  if (loading) {
    return (
      <div className="min-h-[70vh] pt-36 pb-24 flex flex-col items-center justify-center text-center px-4">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground text-sm font-medium">Evenement laden...</p>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-[70vh] pt-36 pb-24 flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-md bg-card border border-border p-8 rounded-2xl shadow-sm">
          <h2 className="text-2xl font-display mb-3">Evenement niet gevonden</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Het opgevraagde evenement bestaat niet (meer) of is alleen zichtbaar voor ingelogde leden.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/agenda"
              className="inline-flex items-center justify-center text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-5 py-2.5 rounded-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Terug naar agenda
            </Link>
            {!isAuthenticated && (
              <Link
                to="/login"
                className="inline-flex items-center justify-center text-sm font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors px-5 py-2.5 rounded-full border border-border"
              >
                Inloggen als lid
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Format date
  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const capitalizedDate = formattedDate ? formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1) : "";

  // Hero background image
  const heroImage = event.thumbnailUrl || event.image || "/assets/markt-steenwijk.jpg";

  return (
    <div className="pb-24 bg-background min-h-screen">
      {/* Background Hero Header */}
      <div className="relative w-full h-[50vh] md:h-[60vh] bg-muted overflow-hidden">
        <img
          src={heroImage}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-black/30" />
      </div>

      {/* Main Content Container with negative top margin overlapping hero banner */}
      <div className="container mx-auto px-6 max-w-4xl -mt-44 md:-mt-48 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Link
            to="/agenda"
            className="inline-flex items-center text-sm font-semibold text-foreground/90 hover:text-primary transition-colors bg-background/90 backdrop-blur px-4 py-2 rounded-full border border-border shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Terug naar agenda
          </Link>

          <button
            type="button"
            onClick={() => setShareDialogOpen(true)}
            className="inline-flex items-center text-xs font-semibold text-accent hover:text-accent/90 transition-colors bg-background/90 backdrop-blur px-4 py-2 rounded-full border border-border shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" /> Deel dit evenement
          </button>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-12 shadow-sm animate-fade-up">
          {/* Status and Category Badges */}
          <div className="flex flex-wrap items-center gap-2.5 mb-6">
            <span className="inline-flex items-center px-3 py-1 bg-accent/15 text-accent text-xs font-semibold uppercase tracking-wider rounded-full">
              {event.isPublic ? "Publiek Toegankelijk" : "Alleen voor Leden"}
            </span>

            {event.isCancelled ? (
              <span className="inline-flex items-center px-3 py-1 bg-red-500/15 text-red-500 text-xs font-semibold uppercase tracking-wider rounded-full">
                <AlertCircle className="w-3 h-3 mr-1" /> Evenement Gecanceld
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider rounded-full">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Bijeenkomst Gepland
              </span>
            )}

            {isAttending && (
              <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">
                U bent aangemeld
              </span>
            )}
          </div>

          {/* Event Title */}
          <h1 className="text-3xl md:text-5xl font-display leading-tight mb-6 text-foreground">
            {event.title}
          </h1>

          {/* Quick Info Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 md:p-5 rounded-xl bg-secondary/50 border border-border/80 mb-8">
            <div className="flex items-center text-foreground/90 text-sm">
              <Calendar className="w-5 h-5 mr-3 text-accent shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Datum</div>
                <div className="font-semibold">{capitalizedDate || "Datum op aanvraag"}</div>
              </div>
            </div>

            <div className="flex items-center text-foreground/90 text-sm">
              <Clock className="w-5 h-5 mr-3 text-accent shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Tijd</div>
                <div className="font-semibold">
                  {event.startTime ? `${event.startTime} ${event.endTime ? `– ${event.endTime}` : ""}` : "Tijd n.o.t."}
                </div>
              </div>
            </div>

            <div className="flex items-start text-foreground/90 text-sm sm:col-span-2 pt-2 border-t border-border/60">
              <MapPin className="w-5 h-5 mr-3 text-accent shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Locatie / Adres</div>
                {isAttending ? (
                  <div className="mt-0.5">
                    <div className="font-semibold text-foreground text-base">
                      {event.fullAddress || event.address}
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Volledig adres zichtbaar omdat u bent aangemeld via het ledenportaal
                    </div>
                    {(event.fullAddress || event.address) && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${event.fullAddress || event.address}, Steenwijkerland`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs text-accent hover:underline mt-2 font-medium"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" /> Route plannen via Google Maps
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="mt-0.5">
                    <div className="font-semibold text-foreground text-base">
                      Plaats: {event.city || extractCity(event.address)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 bg-muted/50 p-2.5 rounded-lg border border-border/60">
                      <Lock className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span>Straat en huisnummer worden alleen getoond na aanmelden via het ledenportaal.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Short description lead block */}
          {event.shortDescription && (
            <div className="lead font-medium text-lg md:text-xl text-foreground mb-8 border-l-4 border-accent pl-5 py-2 leading-relaxed bg-accent/5 rounded-r">
              {event.shortDescription}
            </div>
          )}

          {/* Full description / HTML content */}
          <div className="mb-12">
            {event.description?.includes("<") ? (
              <div
                className="prose prose-lg dark:prose-invert max-w-none text-foreground/90 leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-foreground [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-accent [&_h3]:mt-6 [&_h3]:mb-2 [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed text-base md:text-lg">
                {event.description}
              </div>
            )}
          </div>

          {/* Action / RSVP Card */}
          <div className="p-6 md:p-8 rounded-xl bg-card border border-border/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
            <div>
              <h3 className="font-display text-xl mb-1">Aanwezig zijn bij deze bijeenkomst?</h3>
              <p className="text-sm text-muted-foreground">
                {event.isCancelled
                  ? "Dit evenement is helaas geannuleerd."
                  : event.isPublic
                  ? "Meld u gratis aan zodat we rekening kunnen houden met het aantal stoelen en koffie."
                  : "Besloten bijeenkomst exclusief voor leden van Lijst van Andel."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleAttend}
                disabled={event.isCancelled}
                className={`inline-flex items-center justify-center px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 shadow-md ${
                  event.isCancelled
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : isAttending
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {event.isCancelled
                  ? "Evenement Gecanceld"
                  : isAttending
                  ? "Aanmelding Bevestigd"
                  : "Meld u direct aan"}
              </button>

              <Link
                to="/agenda"
                className="inline-flex items-center justify-center px-4 py-3 rounded-full border border-border text-foreground hover:bg-secondary text-xs font-semibold transition-colors"
              >
                <Compass className="w-3.5 h-3.5 mr-1.5 text-accent" /> Bekijk op agenda-kaart
              </Link>
            </div>
          </div>

          {/* Social Share Bar */}
          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-display text-lg flex items-center">
                <Share2 className="w-5 h-5 mr-2.5 text-accent" /> Deel dit evenement
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Deel via WhatsApp, Facebook, X, Telegram of kopieer de link voor Instagram/TikTok.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShareDialogOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-xs font-semibold shadow-sm transition-all"
              >
                <Share2 className="w-4 h-4 text-accent" /> Deelopties openen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reusable Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        title={`${event.title} | Agenda Lijst van Andel`}
        description={event.shortDescription || (event.description ? event.description.replace(/<[^>]*>/g, '').slice(0, 160) : "")}
        url={currentUrl}
      />
    </div>
  );
}
