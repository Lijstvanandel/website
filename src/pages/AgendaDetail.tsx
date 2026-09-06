import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
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
  QrCode,
  CreditCard,
  UserCheck,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Ticket,
  Mail,
  User,
  Phone,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { extractCity } from "@/lib/utils";
import { ShareDialog } from "@/components/ShareDialog";
import { GuestEventRegistrationModal } from "@/components/GuestEventRegistrationModal";

export interface EventLocationStatus {
  isReleased: boolean;
  releaseDate?: string;
  reason?: string;
  hoursLeft?: number;
  message?: string;
}

export interface EventDetailItem {
  id: string;
  title: string;
  date: string;
  address?: string;
  city?: string;
  fullAddress?: string;
  isAttending?: boolean;
  ticketCode?: string;
  startTime?: string;
  endTime?: string;
  shortDescription?: string;
  description: string;
  isPublic: boolean;
  isPublished: boolean;
  isCancelled: boolean;
  nonMemberPrice?: number;
  ticketNotes?: string;
  locationHiddenUntil12h?: boolean;
  locationStatus?: EventLocationStatus;
  lat?: number;
  lng?: number;
  thumbnailUrl?: string;
  image?: string;
  attendees?: string[];
  isPrivateForUser?: boolean;
}

export default function AgendaDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [event, setEvent] = useState<EventDetailItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isAttending, setIsAttending] = useState<boolean>(false);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);
  const [submittingRegistration, setSubmittingRegistration] = useState<boolean>(false);

  // Guest registration form state
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestRegistrationSuccess, setGuestRegistrationSuccess] = useState<{
    ticketCode: string;
    ticketUrl: string;
  } | null>(null);

  // Cancellation (afmelden) modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("Onverwachte verplichting / afspraak");
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const { isAuthenticated, token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get("payment") === "cancelled") {
      toast.info("De betaling is geannuleerd. U kunt het desgewenst opnieuw proberen.");
    }
  }, [searchParams]);

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
          if (data.ticketCode) {
            setTicketCode(data.ticketCode);
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

  // Handle member registration
  const handleMemberAttend = async () => {
    if (!event || event.isCancelled) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    setSubmittingRegistration(true);
    try {
      const res = await fetch(`/api/events/${event.id}/attend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setIsAttending(true);
        if (data.ticketCode) setTicketCode(data.ticketCode);
        if (data.locationStatus) {
          setEvent((prev) =>
            prev
              ? {
                  ...prev,
                  locationStatus: data.locationStatus,
                  address: data.fullAddress || prev.address,
                  fullAddress: data.fullAddress,
                }
              : null
          );
        }
        toast.success("Aanmelding voltooid! Uw digitale toegangsbewijs met QR-code is naar uw e-mailadres verzonden.");
      } else {
        toast.error(data.error || "Aanmelden mislukt");
      }
    } catch {
      toast.error("Fout bij aanmelden. Controleer uw verbinding.");
    } finally {
      setSubmittingRegistration(false);
    }
  };

  // Handle guest (anonymous) registration
  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || event.isCancelled) return;
    if (!guestName.trim()) {
      toast.error("Vul alstublieft uw naam in.");
      return;
    }
    if (!guestEmail.trim() || !guestEmail.includes("@")) {
      toast.error("Vul een geldig e-mailadres in om uw ticket te ontvangen.");
      return;
    }

    setSubmittingRegistration(true);

    const price = event.nonMemberPrice || 0;

    // Paid guest ticket -> Stripe Checkout
    if (price > 0) {
      try {
        const res = await fetch(`/api/events/${event.id}/guest-checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: guestName.trim(),
            email: guestEmail.trim(),
            phone: guestPhone.trim(),
          }),
        });
        const data = await res.json();
        if (res.ok && data.checkoutUrl) {
          toast.loading("U wordt doorgestuurd naar de veilige betaalpagina...");
          window.location.href = data.checkoutUrl;
        } else {
          toast.error(data.error || "Fout bij initialiseren van de betaling.");
          setSubmittingRegistration(false);
        }
      } catch {
        toast.error("Er is een verbindingsfout opgetreden bij het starten van de betaling.");
        setSubmittingRegistration(false);
      }
      return;
    }

    // Free guest ticket
    try {
      const res = await fetch(`/api/events/${event.id}/guest-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: guestName.trim(),
          email: guestEmail.trim(),
          phone: guestPhone.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGuestRegistrationSuccess({
          ticketCode: data.ticketCode,
          ticketUrl: data.ticketUrl,
        });
        setIsAttending(true);
        setTicketCode(data.ticketCode);
        if (data.locationStatus) {
          setEvent((prev) =>
            prev
              ? {
                  ...prev,
                  locationStatus: data.locationStatus,
                }
              : null
          );
        }
        toast.success(data.message || "Aanmelding bevestigd! Uw ticket met QR-code is per e-mail verstuurd.");
      } else {
        toast.error(data.error || "Aanmelden niet gelukt.");
      }
    } catch {
      toast.error("Er is een fout opgetreden.");
    } finally {
      setSubmittingRegistration(false);
    }
  };

  // Handle cancellation (afmelden) for member or guest
  const handleConfirmCancel = async () => {
    if (!event) return;
    setCancelling(true);

    const fullReason =
      cancelReason === "Anders, namelijk:"
        ? customCancelReason || "Anders"
        : cancelReason;

    try {
      let res;
      if (ticketCode) {
        res = await fetch(`/api/tickets/${ticketCode}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: fullReason }),
        });
      } else if (isAuthenticated) {
        res = await fetch(`/api/events/${event.id}/unattend`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: fullReason }),
        });
      }

      if (res && res.ok) {
        setIsAttending(false);
        setGuestRegistrationSuccess(null);
        setShowCancelModal(false);
        toast.success("U bent succesvol afgemeld. Uw afmelding is geregistreerd voor onze organisatie.");
      } else {
        toast.error("Kon afmelding niet verwerken.");
      }
    } catch {
      toast.error("Fout bij doorvoeren van afmelding.");
    } finally {
      setCancelling(false);
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
  const heroImage = event.thumbnailUrl || event.image || "/assets/markt-steenwijk.jpg";
  const nonMemberPrice = event.nonMemberPrice || 0;
  const isLocationReleased = Boolean(event.locationStatus?.isReleased);

  return (
    <div className="pb-24 bg-background min-h-screen">
      {/* Background Hero Header */}
      <div className="relative w-full h-[45vh] md:h-[55vh] bg-muted overflow-hidden">
        <img
          src={heroImage}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-black/30" />
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl -mt-40 md:-mt-44 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Link
            to="/agenda"
            className="inline-flex items-center text-sm font-semibold text-foreground/90 hover:text-primary transition-colors bg-background/90 backdrop-blur px-4 py-2 rounded-full border border-border shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Terug naar agenda
          </Link>

          <div className="flex items-center gap-2">
            {event.isPublic && !isAuthenticated && !isAttending && !event.isCancelled && (
              <button
                type="button"
                onClick={() => setGuestModalOpen(true)}
                className="inline-flex items-center text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all px-4 py-2 rounded-full shadow-sm"
              >
                <Ticket className="w-3.5 h-3.5 mr-1.5" />
                Meld u aan
              </button>
            )}

            <button
              type="button"
              onClick={() => setShareDialogOpen(true)}
              className="inline-flex items-center text-xs font-semibold text-accent hover:text-accent/90 transition-colors bg-background/90 backdrop-blur px-4 py-2 rounded-full border border-border shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" /> Deel dit evenement
            </button>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-10 shadow-sm animate-fade-up">
          {/* Badges */}
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
              <span className="inline-flex items-center px-3 py-1 bg-primary/15 text-primary text-xs font-semibold rounded-full border border-primary/30">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" /> U bent aangemeld
              </span>
            )}

            {event.isPublic && nonMemberPrice > 0 && (
              <span className="inline-flex items-center px-3 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-full">
                Niet-leden: €{nonMemberPrice.toFixed(2)} (Geen cashback)
              </span>
            )}

            {event.isPublic && nonMemberPrice === 0 && (
              <span className="inline-flex items-center px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-full">
                Gratis toegang
              </span>
            )}
          </div>

          {/* Event Title */}
          <h1 className="text-3xl md:text-5xl font-display leading-tight mb-6 text-foreground">
            {event.title}
          </h1>

          {/* Quick Info Grid */}
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

            {/* Location strip with 12h security logic */}
            <div className="flex items-start text-foreground/90 text-sm sm:col-span-2 pt-3 border-t border-border/60">
              <MapPin className="w-5 h-5 mr-3 text-accent shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground font-medium">Locatie / Adres</div>
                
                {isLocationReleased && (event.fullAddress || event.address) ? (
                  <div className="mt-0.5">
                    <div className="font-semibold text-foreground text-base">
                      {event.fullAddress || event.address}
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Adres vrijgegeven (binnen 12 uur voor bijeenkomst of bevestigde aanmelding)
                    </div>
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
                  </div>
                ) : (
                  <div className="mt-0.5 space-y-2">
                    <div className="font-semibold text-foreground text-base">
                      Plaats: {event.city || extractCity(event.address)}
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/60 p-3 rounded-lg border border-border/80 space-y-1">
                      <div className="flex items-center gap-1.5 text-foreground font-semibold">
                        <Lock className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span>Locatiebescherming van kracht</span>
                      </div>
                      <p className="leading-relaxed">
                        Om veiligheids- en organisatieredenen is het exacte adres (straat en nummer){" "}
                        <strong>
                          {event.isPublic
                            ? "zichtbaar na aanmelden via ledenportaal of e-mail"
                            : "zichtbaar na aanmelden via het ledenportaal"}
                        </strong>
                        , tenzij de bijeenkomst al binnen 12 uur plaatsvindt. 
                        U ontvangt een unieke QR-toegangscode per e-mail; uw digitale ticket update het adres automatisch zodra deze beschikbaar is.
                      </p>
                      {event.locationStatus?.releaseDate && (
                        <p className="text-[11px] text-accent font-medium pt-1">
                          Verwachte adresvrijgave: {new Date(event.locationStatus.releaseDate).toLocaleString("nl-NL")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Short description lead */}
          {event.shortDescription && (
            <div className="lead font-medium text-lg md:text-xl text-foreground mb-8 border-l-4 border-accent pl-5 py-2 leading-relaxed bg-accent/5 rounded-r">
              {event.shortDescription}
            </div>
          )}

          {/* Full description */}
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

          {/* ATTENDANCE & TICKETING SECTION */}
          <div className="my-10 p-6 md:p-8 rounded-2xl bg-secondary/30 border border-border shadow-sm">
            {event.isCancelled ? (
              <div className="text-center py-4">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <h3 className="font-display text-xl text-red-600 dark:text-red-400">Evenement Geannuleerd</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Deze bijeenkomst is helaas afgelast. Houd onze website in de gaten voor nieuwe data.
                </p>
              </div>
            ) : isAttending ? (
              /* State: Already Registered / Attending */
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl text-foreground">Uw aanmelding is bevestigd!</h3>
                      <p className="text-xs text-muted-foreground">
                        {ticketCode ? `Ticket #${ticketCode}` : "Geregistreerd via ledenaccount"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {ticketCode && (
                      <Link
                        to={`/ticket/${ticketCode}`}
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold shadow-sm transition-all"
                      >
                        <QrCode className="w-4 h-4 mr-1.5" /> Bekijk uw QR-Ticket
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> Afmelden
                    </button>
                  </div>
                </div>

                <div className="bg-background/80 rounded-xl p-4 border border-border/80 text-xs text-muted-foreground space-y-2">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-accent" /> Toegangsinformatie & QR-Code
                  </div>
                  <p>
                    Uw unieke toegangsbewijs met scanbare QR-code is per e-mail naar u verzonden. 
                    Neem uw ticket mee op uw smartphone of geprint naar de ingang van de bijeenkomst.
                  </p>
                  <p>
                    Kunt u onverwacht toch niet aanwezig zijn? Maak dan gebruik van de knop <strong>Afmelden</strong> hierboven, 
                    zodat wij het aantal stoelen en koffie direct kunnen bijstellen.
                  </p>
                </div>
              </div>
            ) : isAuthenticated ? (
              /* State: Logged-in member can attend directly */
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-accent font-semibold uppercase tracking-wider mb-1">
                    <UserCheck className="w-3.5 h-3.5" /> Ingelogd als lid
                  </div>
                  <h3 className="font-display text-2xl text-foreground">Aanwezig zijn bij deze bijeenkomst?</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-lg">
                    Als lid van Lijst van Andel heeft u altijd kosteloos toegang. Meld u met één klik aan, 
                    zodat wij uw plaats kunnen reserveren en u uw digitale ticket met QR-code ontvangt.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleMemberAttend}
                  disabled={submittingRegistration}
                  className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm shadow-md transition-all shrink-0 w-full sm:w-auto"
                >
                  {submittingRegistration ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      Aanmelden verwerken...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Meld u direct aan (Gratis)
                    </>
                  )}
                </button>
              </div>
            ) : !event.isPublic ? (
              /* State: Private event for non-logged-in visitor */
              <div className="text-center py-6 max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-display text-2xl mb-2">Besloten Bijeenkomst voor Leden</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Dit evenement is uitsluitend toegankelijk voor ingeschreven leden van Lijst van Andel. 
                  Log in met uw account of meld u aan als lid om deel te nemen.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm shadow-sm transition-all w-full sm:w-auto"
                  >
                    Inloggen als lid
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-border text-foreground hover:bg-secondary font-semibold text-sm transition-colors w-full sm:w-auto"
                  >
                    Lid worden van Lijst van Andel
                  </Link>
                </div>
              </div>
            ) : (
              /* State: Public event with Anonymous / Guest Registration */
              <div className="space-y-6">
                <div className="border-b border-border/80 pb-4">
                  <div className="inline-flex items-center gap-1.5 text-xs text-accent font-semibold uppercase tracking-wider mb-1">
                    <Ticket className="w-3.5 h-3.5" /> Publieke Aanmelding & Tickets
                  </div>
                  <h3 className="font-display text-2xl text-foreground">
                    Reserveer uw ticket voor deze bijeenkomst
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vul uw gegevens in om direct een digitaal toegangsbewijs met unieke QR-code via e-mail te ontvangen. 
                    {nonMemberPrice > 0 ? (
                      <span className="font-medium text-foreground ml-1">
                        Voor niet-leden geldt een toegangsprijs van <strong>€{nonMemberPrice.toFixed(2)}</strong> (definitieve inschrijving, geen cashback).
                      </span>
                    ) : (
                      <span className="font-medium text-emerald-600 dark:text-emerald-400 ml-1">
                        Toegang is gratis.
                      </span>
                    )}
                  </p>
                </div>

                {guestRegistrationSuccess ? (
                  <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-4">
                    <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-6 h-6 shrink-0" />
                      <div className="font-semibold text-base">
                        Aanmelding succesvol! Uw ticket is verzonden naar {guestEmail}.
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Uw ticketnummer is <strong>#{guestRegistrationSuccess.ticketCode}</strong>. 
                      U kunt uw QR-code en locatie te allen tijde openen via onderstaande knop:
                    </p>
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <Link
                        to={`/ticket/${guestRegistrationSuccess.ticketCode}`}
                        className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-xs shadow-sm transition-all"
                      >
                        <QrCode className="w-4 h-4 mr-2" /> Direct digitaal ticket openen
                      </Link>
                      <button
                        type="button"
                        onClick={() => setShowCancelModal(true)}
                        className="text-xs text-muted-foreground hover:text-red-500 transition-colors underline"
                      >
                        Toch verhinderd? Afmelden
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleGuestSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">
                          Uw Volledige Naam *
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                          <input
                            type="text"
                            required
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="Bijv. Jan de Vries"
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">
                          E-mailadres (voor uw QR-ticket) *
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                          <input
                            type="email"
                            required
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="naam@voorbeeld.nl"
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Telefoonnummer (optioneel, voor updates)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <input
                          type="tel"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="06 - 12345678"
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>
                    </div>

                    {/* Notice & Pricing */}
                    <div className="p-4 rounded-xl bg-background border border-border/80 text-xs text-muted-foreground space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Kosten voor niet-leden:</span>
                        <span className="text-sm font-bold text-accent">
                          {nonMemberPrice > 0 ? `€${nonMemberPrice.toFixed(2)}` : "Gratis"}
                        </span>
                      </div>
                      {nonMemberPrice > 0 && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                          * Let op: Voor niet-leden bijeenkomsten geldt bij afmelding of verhindering <strong>geen cashback of restitutie</strong>.
                        </p>
                      )}
                      <p className="text-[11px]">
                        Het exacte adres wordt om veiligheidsredenen 12 uur na inschrijving of uiterlijk 12 uur voor de bijeenkomst vrijgegeven op uw ticket.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                      <button
                        type="submit"
                        disabled={submittingRegistration}
                        className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm shadow-md transition-all w-full sm:w-auto"
                      >
                        {submittingRegistration ? (
                          <>
                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                            Aanmelding verwerken...
                          </>
                        ) : nonMemberPrice > 0 ? (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Betalen & Ticket Ontvangen (€{nonMemberPrice.toFixed(2)})
                          </>
                        ) : (
                          <>
                            <QrCode className="w-4 h-4 mr-2" />
                            Aanmelden & QR-Ticket Ontvangen
                          </>
                        )}
                      </button>

                      <div className="text-xs text-muted-foreground text-center sm:text-right">
                        Bent u al partijlid?{" "}
                        <Link to="/login" className="text-accent underline font-medium hover:text-accent/80">
                          Log in voor directe toegang
                        </Link>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}
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

      {/* CANCELLATION / AFMELDEN MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="font-display text-xl text-foreground flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                Afmelden voor bijeenkomst
              </h3>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Wat jammer dat u verhinderd bent. Wilt u ons laten weten wat de reden is? 
              Dit wordt anoniem geregistreerd in ons beheerderspaneel voor analyse en capaciteitsplanning.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Reden van afmelding
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-background p-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="Onverwachte verplichting / afspraak">Onverwachte verplichting / afspraak</option>
                  <option value="Ziekte of gezondheid">Ziekte of gezondheid</option>
                  <option value="Geen vervoer beschikbaar">Geen vervoer beschikbaar</option>
                  <option value="Tijdstip komt niet meer uit">Tijdstip komt niet meer uit</option>
                  <option value="Anders, namelijk:">Anders, namelijk...</option>
                </select>
              </div>

              {cancelReason === "Anders, namelijk:" && (
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Toelichting (optioneel)
                  </label>
                  <textarea
                    value={customCancelReason}
                    onChange={(e) => setCustomCancelReason(e.target.value)}
                    placeholder="Korte reden..."
                    rows={2}
                    className="w-full text-xs rounded-lg border border-border bg-background p-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              )}

              {nonMemberPrice > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400">
                  Let op: conform de reserveringsvoorwaarden voor niet-leden geldt er <strong>geen cashback</strong>.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="px-4 py-2 rounded-full border border-border text-xs font-semibold hover:bg-secondary"
              >
                Sluiten
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-all"
              >
                {cancelling ? "Bezig met afmelden..." : "Definitief Afmelden"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        title={`${event.title} | Agenda Lijst van Andel`}
        description={event.shortDescription || (event.description ? event.description.replace(/<[^>]*>/g, '').slice(0, 160) : "")}
        url={currentUrl}
      />

      {/* Guest Event Registration Modal (Pop-up without requiring an account) */}
      <GuestEventRegistrationModal
        open={guestModalOpen}
        onOpenChange={setGuestModalOpen}
        event={event}
        onSuccess={(data) => {
          setIsAttending(true);
          setTicketCode(data.ticketCode);
          setGuestRegistrationSuccess({
            ticketCode: data.ticketCode,
            ticketUrl: data.ticketUrl,
          });
          if (data.fullAddress) {
            setEvent((prev) => (prev ? { ...prev, fullAddress: data.fullAddress } : null));
          }
        }}
      />
    </div>
  );
}
