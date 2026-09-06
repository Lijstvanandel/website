import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Ticket,
  User,
  Mail,
  Phone,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  QrCode,
  Lock,
  Sparkles,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";

export interface GuestRegistrationEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  city?: string;
  nonMemberPrice?: number;
  ticketNotes?: string;
  isPublic?: boolean;
}

interface GuestEventRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: GuestRegistrationEvent | null;
  onSuccess?: (data: { ticketCode: string; ticketUrl: string; fullAddress?: string }) => void;
}

export function GuestEventRegistrationModal({
  open,
  onOpenChange,
  event,
  onSuccess,
}: GuestEventRegistrationModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    ticketCode: string;
    ticketUrl: string;
    message?: string;
    fullAddress?: string;
    locationStatus?: Record<string, unknown>;
  } | null>(null);

  if (!event) return null;

  const price = event.nonMemberPrice ? Number(event.nonMemberPrice) : 0;
  const isPaid = price > 0;

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after transition
    setTimeout(() => {
      setSuccessData(null);
      setFullName("");
      setEmail("");
      setPhone("");
      setSubmitting(false);
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (!fullName.trim()) {
      toast.error("Vul alstublieft uw voor- en achternaam in.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      toast.error("Vul een geldig e-mailadres in om uw QR-ticket te ontvangen.");
      return;
    }

    setSubmitting(true);

    // Paid guest ticket -> Stripe Checkout
    if (isPaid) {
      try {
        const res = await fetch(`/api/events/${event.id}/guest-checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: cleanEmail,
            phone: phone.trim(),
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.checkoutUrl) {
          toast.loading("U wordt doorgestuurd naar de beveiligde betaalpagina...");
          window.location.href = data.checkoutUrl;
        } else {
          toast.error(data.error || "Fout bij initialiseren van de betaling.");
          setSubmitting(false);
        }
      } catch {
        toast.error("Verbindingsfout bij het starten van de betaling. Probeer het opnieuw.");
        setSubmitting(false);
      }
      return;
    }

    // Free guest ticket -> Direct Registration & QR Email
    try {
      const res = await fetch(`/api/events/${event.id}/guest-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: cleanEmail,
          phone: phone.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccessData({
          ticketCode: data.ticketCode,
          ticketUrl: data.ticketUrl || `/ticket/${data.ticketCode}`,
          message: data.message,
          fullAddress: data.fullAddress,
          locationStatus: data.locationStatus,
        });

        if (onSuccess) {
          onSuccess({
            ticketCode: data.ticketCode,
            ticketUrl: data.ticketUrl || `/ticket/${data.ticketCode}`,
            fullAddress: data.fullAddress,
          });
        }

        toast.success("Aanmelding voltooid! Uw QR-ticket is per e-mail verstuurd.");
      } else {
        toast.error(data.error || "Aanmelden is niet gelukt.");
      }
    } catch {
      toast.error("Er is een onverwachte fout opgetreden bij het aanmelden.");
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : onOpenChange(val))}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-border bg-card">
        {/* Top Header Banner */}
        <div className="bg-muted/60 p-6 border-b border-border/80">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent/15 text-accent text-[11px] font-semibold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              Publiek Evenement
            </span>
            {isPaid ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                Toegang: €{price.toFixed(2)}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                Gratis Toegang
              </span>
            )}
          </div>

          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-xl font-display leading-snug text-foreground">
              {event.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
              {formattedDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-accent" />
                  {formattedDate}
                </span>
              )}
              {event.startTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  {event.startTime} {event.endTime ? `– ${event.endTime}` : ""}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {successData ? (
            /* SUCCESS STATE */
            <div className="space-y-5 text-center py-2 animate-fade-up">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="font-display text-xl text-foreground">
                  Aanmelding Bevestigd!
                </h3>
                <p className="text-xs text-muted-foreground">
                  Uw unieke toegangsbewijs met QR-code is zojuist verstuurd naar{" "}
                  <strong className="text-foreground">{email}</strong>.
                </p>
              </div>

              <div className="bg-muted/40 p-4 rounded-xl border border-border text-left space-y-2.5">
                <div className="flex items-center justify-between border-b border-border/70 pb-2">
                  <span className="text-xs text-muted-foreground">Ticketnummer</span>
                  <span className="font-mono text-sm font-bold text-accent">
                    #{successData.ticketCode}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/70 pb-2 text-xs">
                  <span className="text-muted-foreground">Deelnemer</span>
                  <span className="font-medium text-foreground">{fullName}</span>
                </div>
                <div className="text-[11px] text-muted-foreground pt-1 flex items-start gap-1.5 leading-relaxed">
                  <Lock className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                  <span>
                    Het exacte adres wordt uiterlijk 12 uur voor de start van de bijeenkomst of via uw ticketlink vrijgegeven.
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <Link
                  to={`/ticket/${successData.ticketCode}`}
                  onClick={handleClose}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold shadow-sm transition-all"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Bekijk uw QR-Ticket
                </Link>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-semibold transition-colors"
                >
                  Venster sluiten
                </button>
              </div>
            </div>
          ) : (
            /* FORM STATE */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-xs text-foreground/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-accent text-sm">
                    <Ticket className="w-4 h-4 text-accent" />
                    Leden hebben gratis toegang
                  </div>
                  <p className="text-muted-foreground text-[12px] leading-relaxed">
                    Bent u partijlid? Log in met uw account voor gratis toegang. U hoeft dan geen gastgegevens in te vullen of af te rekenen.
                  </p>
                </div>
                <Link
                  to="/login"
                  onClick={handleClose}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold transition-all shadow-sm shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Inloggen
                </Link>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Voor- en Achternaam *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Bijv. Jan de Vries"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  E-mailadres (voor toezending QR-code) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="uw.naam@voorbeeld.nl"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Het adres en de QR-toegangscode worden naar dit e-mailadres verzonden.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Telefoonnummer <span className="text-muted-foreground font-normal">(optioneel)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="06 - 12345678"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              {isPaid ? (
                <div className="p-3.5 rounded-xl bg-muted/60 border border-border text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-foreground">
                    <span>Toegangsprijs niet-leden</span>
                    <span className="text-emerald-600 font-bold text-sm">€{price.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    U wordt na het invullen direct doorgestuurd naar de kassa van Stripe (iDEAL, Bancontact of kaart). Let op: definitieve inschrijving, geen cashback bij afmelding.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 flex items-center justify-between font-medium">
                  <span>Toegang voor publiek</span>
                  <span className="font-bold">Gratis</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      {isPaid ? "Kassa laden..." : "Aanmelding verwerken..."}
                    </>
                  ) : isPaid ? (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Afrekenen & QR-Ticket ontvangen (€{price.toFixed(2)})
                    </>
                  ) : (
                    <>
                      <Ticket className="w-4 h-4 mr-2" />
                      Aanmelden & QR-Ticket ontvangen (Gratis)
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
