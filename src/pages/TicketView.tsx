import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ArrowLeft,
  Lock,
  Unlock,
  XCircle,
  User,
  Mail,
  ShieldCheck,
  Printer,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface TicketData {
  ticketCode: string;
  fullName: string;
  email: string;
  phone?: string;
  isMember: boolean;
  registeredAt: string;
  price: number;
  paid: boolean;
  status: "active" | "cancelled" | "attended";
  cancelledAt?: string;
  cancelReason?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
  qrCodeDataUrl: string;
  event: {
    id: string;
    title: string;
    date: string;
    startTime?: string;
    endTime?: string;
    address?: string;
    city?: string;
    fullAddress?: string;
    ticketNotes?: string;
    thumbnailUrl?: string;
    isCancelled?: boolean;
  };
  locationStatus: {
    isReleased: boolean;
    isShortNotice: boolean;
    releaseDate: string;
    message: string;
  };
}

export default function TicketView() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Afmelden dialoog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "cancel") {
      setCancelOpen(true);
    }
  }, [searchParams]);

  const loadTicket = async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        setTicket(data);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Ticket niet gevonden");
      }
    } catch (_err) {
      setError("Fout bij ophalen van ticket.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [code]);

  const handleCancelTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(code)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message || "Aanmelding succesvol geannuleerd.");
        setCancelOpen(false);
        loadTicket();
      } else {
        toast.error(data.error || "Afmelden mislukt");
      }
    } catch {
      toast.error("Fout bij afmelden.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] pt-32 pb-16 flex flex-col items-center justify-center px-4">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground text-sm font-medium">Toegangsticket laden...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-[70vh] pt-32 pb-16 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-card border border-border p-8 rounded-2xl shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-display mb-2">Ticket Niet Gevonden</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {error || "Het opgegeven ticketnummer is ongeldig of verlopen."}
          </p>
          <Link
            to="/agenda"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Naar de agenda
          </Link>
        </div>
      </div>
    );
  }

  const { event, locationStatus } = ticket;
  const isCancelled = ticket.status === "cancelled";
  const releaseDateObj = locationStatus.releaseDate ? new Date(locationStatus.releaseDate) : null;

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 bg-muted/30">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Back & Print Nav */}
        <div className="flex items-center justify-between">
          <Link
            to={`/agenda/${event.id}`}
            className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Terug naar evenement
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-xs font-medium text-foreground transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-accent" /> Ticket printen
            </button>
          </div>
        </div>

        {/* Status banner if cancelled */}
        {isCancelled && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-center gap-3">
            <XCircle className="w-6 h-6 shrink-0" />
            <div className="text-xs">
              <div className="font-semibold text-sm">Dit ticket is geannuleerd</div>
              <div>
                U heeft zich voor dit evenement afgemeld op{" "}
                {ticket.cancelledAt ? new Date(ticket.cancelledAt).toLocaleString("nl-NL") : ""}.
                {ticket.cancelReason && ` Opgegeven reden: "${ticket.cancelReason}"`}
              </div>
            </div>
          </div>
        )}

        {/* Main Ticket Card */}
        <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden">
          {/* Header Banner */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-accent/30 text-accent border border-accent/40">
                  Digitaal Toegangsticket
                </span>
                <span className="font-mono text-sm font-bold tracking-widest text-accent">
                  #{ticket.ticketCode}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display leading-tight mb-2">
                {event.title}
              </h1>
              {event.ticketNotes && (
                <p className="text-xs sm:text-sm text-slate-300 italic">
                  {event.ticketNotes}
                </p>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Quick Details Grid */}
            <div className="grid sm:grid-cols-2 gap-4 pb-6 border-b border-border/70">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Datum & Tijd
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {event.date}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.startTime || "19:30"} {event.endTime ? `tot ${event.endTime}` : ""}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Bezoeker
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {ticket.fullName}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {ticket.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Location Section with 12h Security Lock */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Locatie & Adres
                    </div>
                    {locationStatus.isReleased ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        <Unlock className="w-3 h-3" /> Adres vrijgegeven
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                        <Lock className="w-3 h-3" /> Veiligheidsprotocol actief
                      </span>
                    )}
                  </div>

                  {locationStatus.isReleased ? (
                    <div>
                      <div className="font-semibold text-base text-foreground">
                        {event.fullAddress || event.address}
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Volledig adres zichtbaar voor geverifieerde tickethouder.
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
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> Route plannen via Google Maps
                        </a>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold text-base text-foreground">
                        Plaats: {event.city || "Steenwijkerland"}
                      </div>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                        🔒 <strong>Locatiebeveiliging:</strong> Het exacte adres wordt binnen 12 uur na uw aanmelding
                        {releaseDateObj ? ` (op ${releaseDateObj.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}) ` : " "}
                        automatisch op dit scherm en per e-mail vrijgegeven.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="text-center py-4 space-y-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Uw Toegangscode voor het Event
              </div>

              <div className="inline-block p-4 bg-white rounded-2xl border-2 border-border/80 shadow-inner">
                {ticket.qrCodeDataUrl ? (
                  <img
                    src={ticket.qrCodeDataUrl}
                    alt={`Ticket QR Code #${ticket.ticketCode}`}
                    className="w-56 h-56 mx-auto"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center bg-muted rounded-xl">
                    <QrCode className="w-16 h-16 text-muted-foreground/40 animate-pulse" />
                  </div>
                )}
                <div className="mt-2 font-mono text-lg font-bold text-slate-900 tracking-widest">
                  #{ticket.ticketCode}
                </div>
              </div>

              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-normal">
                Toon deze QR-code bij aankomst vanaf uw smartphone. Onze gastheer scant uw toegangscode bij de ingang.
              </p>

              {ticket.checkedIn && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4" /> Aanwezig gemarkeerd op locatie
                </div>
              )}
            </div>

            {/* Ticket Tarief & Cashback Info */}
            <div className="p-3 rounded-lg bg-secondary/50 border border-border/60 text-xs text-muted-foreground flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Tarief:</span>{" "}
                {ticket.price > 0 ? `€${ticket.price.toFixed(2)} (Niet-lid tarief)` : "Gratis toegang"}
              </div>
              <div>
                {ticket.price > 0 && (
                  <span className="text-[11px] text-muted-foreground italic">
                    Geen cashback bij afmelding
                  </span>
                )}
              </div>
            </div>

            {/* Afmelden Button */}
            {!isCancelled && (
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Kunt u toch niet aanwezig zijn? Meld u tijdig af zodat we het aantal stoelen kunnen aanpassen.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelOpen(true)}
                  className="shrink-0 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  Afmelden voor bijeenkomst
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Afmelden Dialoog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Afmelden voor bijeenkomst</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u uw aanmelding voor <strong>{event.title}</strong> wilt annuleren?
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCancelTicket} className="space-y-4">
            <div>
              <label className="text-xs font-semibold block mb-1">
                Reden van verhindering (optioneel, voor onze analyse)
              </label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Bijv. ziekte, onverwacht werk, dubbele afspraak..."
                rows={3}
                className="text-xs"
              />
            </div>

            {ticket.price > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                <strong>Let op:</strong> Zoals vermeld bij het reserveren geldt er voor niet-leden tickets geen restitutie of cashback.
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelOpen(false)}
                disabled={cancelling}
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={cancelling}
              >
                {cancelling ? "Bezig met afmelden..." : "Definitief afmelden"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
