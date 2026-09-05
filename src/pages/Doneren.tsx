import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Heart,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Users,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PRESET_AMOUNTS = [15, 25, 50, 100, 250];

export default function Doneren() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Form states
  const [selectedAmount, setSelectedAmount] = useState<number | null>(25);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showRegulations, setShowRegulations] = useState(false);

  // Modal for Stripe redirect & polling
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    checkoutUrl: string;
    sessionId: string;
    amount: number;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Return query parameters detection
  const isDonationSuccess = searchParams.get("donation_success") === "true";
  const isDonationCancelled = searchParams.get("donation_cancelled") === "true";
  const returnSessionId = searchParams.get("session_id");

  useEffect(() => {
    if (isDonationSuccess && returnSessionId) {
      fetch(`/api/donations/verify-session?sessionId=${encodeURIComponent(returnSessionId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            toast.success("Hartelijk dank voor uw donatie!", {
              description: "Uw gift is succesvol ontvangen en draagt direct bij aan onze lokale partij.",
            });
          }
        })
        .catch(console.error);
    } else if (isDonationCancelled) {
      toast.info("De donatie is geannuleerd.", {
        description: "Er is geen bedrag in rekening gebracht.",
      });
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("donation_cancelled");
      setSearchParams(nextParams, { replace: true });
    }
  }, [isDonationSuccess, isDonationCancelled, returnSessionId, searchParams, setSearchParams]);

  // Background polling while payment modal is open
  useEffect(() => {
    if (!paymentModal?.open || !paymentModal.sessionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/donations/verify-session?sessionId=${encodeURIComponent(paymentModal.sessionId)}`);
        const data = await res.json();
        if (data.success) {
          setPaymentModal(null);
          const nextParams = new URLSearchParams();
          nextParams.set("donation_success", "true");
          nextParams.set("session_id", paymentModal.sessionId);
          setSearchParams(nextParams);
          toast.success("Hartelijk dank voor uw donatie!");
        }
      } catch {
        // Silent background polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [paymentModal, setSearchParams]);

  const effectiveAmount = selectedAmount !== null ? selectedAmount : parseFloat(customAmount) || 0;

  const handleSelectPreset = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setSelectedAmount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (effectiveAmount < 1) {
      toast.error("Voer een geldig donatiebedrag in van minimaal € 1,00.");
      return;
    }

    if (effectiveAmount > 4500) {
      toast.error(
        "Conform artikel 3 van het Giftenreglement worden giften boven € 4.500,- per jaar slechts geaccepteerd na schriftelijke instemming van het bestuur. Neem a.u.b. contact op via bestuur@lijstvanandel.nl."
      );
      return;
    }

    if (!agreedToTerms) {
      toast.error("U dient akkoord te gaan met de bepalingen uit het Giftenreglement.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/donations/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: effectiveAmount,
          donorName: name,
          donorEmail: email,
          message,
          agreedToTerms,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon donatie niet starten");

      if (data.checkoutUrl) {
        setPaymentModal({
          open: true,
          checkoutUrl: data.checkoutUrl,
          sessionId: data.sessionId,
          amount: effectiveAmount,
        });

        const isInIframe = typeof window !== "undefined" && window.self !== window.top;
        const opened = window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");

        if (!isInIframe && !opened) {
          window.location.href = data.checkoutUrl;
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Er is een fout opgetreden");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualCheckDonation = async () => {
    if (!paymentModal?.sessionId) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/donations/verify-session?sessionId=${encodeURIComponent(paymentModal.sessionId)}`);
      const data = await res.json();
      if (data.success) {
        setPaymentModal(null);
        const nextParams = new URLSearchParams();
        nextParams.set("donation_success", "true");
        nextParams.set("session_id", paymentModal.sessionId);
        setSearchParams(nextParams);
        toast.success("Donatie succesvol ontvangen!", {
          description: "Hartelijk dank voor uw waardevolle steun aan Lijst van Andel.",
        });
      } else {
        toast.info("Betaling nog niet afgerond bij Stripe. Heeft u de betaling in het andere tabblad al voltooid?");
      }
    } catch {
      toast.error("Kon donatiestatus nog niet controleren.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isDonationSuccess) {
    return (
      <div className="container max-w-xl mx-auto py-20 px-4">
        <div className="bg-card p-8 md:p-10 rounded-2xl shadow-xl border border-border text-center space-y-6">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-rose-500/5">
            <Heart className="w-8 h-8 fill-rose-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-display font-bold text-foreground">
              Hartelijk dank voor uw steun!
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
              Uw donatie aan <strong>Lijst van Andel</strong> is in goede orde ontvangen. Dankzij betrokken inwoners zoals u kunnen wij ons inzetten voor een leefbaar, bereikbaar en krachtig Steenwijkerland.
            </p>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-3 text-left">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Uw bijdrage wordt verantwoord en besteed conform ons partijstatuut en Giftenreglement.</span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/">
              <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6">
                Terug naar home
              </Button>
            </Link>
            <Link to="/standpunten">
              <Button variant="outline" className="w-full sm:w-auto">
                Bekijk onze standpunten
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4 space-y-12">
      {/* Introductie & Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 text-xs font-semibold border border-rose-500/20">
          <Heart className="w-3.5 h-3.5 fill-rose-600" />
          Steun de lokale democratie
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
          Doneren aan Lijst van Andel
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Als onafhankelijke lokale partij zijn wij niet afhankelijk van landelijke subsidies. Uw donatie stelt ons in staat om actief aanwezig te zijn in alle kernen en wijken van Steenwijkerland, bijeenkomsten te organiseren en dossiers grondig uit te pluizen.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Donatie Formulier */}
        <div className="lg:col-span-7 bg-card p-6 sm:p-8 rounded-2xl shadow-sm border border-border space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bedrag Selectie */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground block">
                1. Kies uw donatiebedrag
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleSelectPreset(amt)}
                    className={`py-3 px-2 rounded-xl text-sm font-bold transition-all border ${
                      selectedAmount === amt
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-secondary/40 text-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    € {amt}
                  </button>
                ))}
              </div>

              <div className="relative pt-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  €
                </span>
                <Input
                  type="number"
                  min="1"
                  max="4500"
                  step="any"
                  placeholder="Of vul zelf een ander bedrag in..."
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className="pl-8 h-11 text-sm font-medium"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Minimaal € 1,00. Giften boven € 4.500,- per jaar vereisen voorafgaande schriftelijke instemming van het bestuur.
              </p>
            </div>

            {/* Gegevens Donateur */}
            <div className="space-y-3 pt-2 border-t border-border">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground block">
                2. Uw gegevens (optioneel)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Input
                    type="text"
                    placeholder="Uw naam (of anoniem)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Uw e-mailadres (voor bewijs van gift)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <Textarea
                  placeholder="Laat eventueel een persoonlijke boodschap of wens achter voor onze fractie..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            {/* Giftenreglement Akkoord */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border text-xs">
                <input
                  type="checkbox"
                  id="agree-reglement"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  required
                />
                <label htmlFor="agree-reglement" className="text-muted-foreground leading-snug cursor-pointer select-none">
                  Ik verklaar dat deze gift afkomstig is van mijzelf en niet gedaan wordt in de verwachting van economische of politieke begunstiging, conform het{" "}
                  <button
                    type="button"
                    onClick={() => setShowRegulations(true)}
                    className="text-primary underline font-medium hover:text-primary/90"
                  >
                    Giftenreglement van Lijst van Andel
                  </button>
                  .
                </label>
              </div>
            </div>

            {/* Betaalknop */}
            <Button
              type="submit"
              disabled={isLoading || effectiveAmount < 1 || !agreedToTerms}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base shadow flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Betaalomgeving voorbereiden...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Doneer € {effectiveAmount.toFixed(2)} via Stripe
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Veilige betaling via o.a. iDEAL, Bancontact, Creditcard en Apple/Google Pay</span>
            </div>
          </form>
        </div>

        {/* Zijbalk met toelichting & ANBI/Transparantie */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Waarom uw gift telt
            </h3>
            <ul className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Onafhankelijk & Lokaal:</strong> Wij behartigen uitsluitend het belang van Steenwijkerland en haar inwoners.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Actief in alle kernen:</strong> Campagnes, flyers, dorpsbezoeken en bijeenkomsten worden bekostigd vanuit contributies en giften.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Grondig onderzoek:</strong> Kennisopbouw en burgerparticipatie over dossiers zoals woningbouw, zorg en lokale voorzieningen.</span>
              </li>
            </ul>
          </div>

          <div className="bg-secondary/40 p-6 rounded-2xl border border-border space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Transparantie & Giftenreglement
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Lijst van Andel hecht aan absolute integriteit. In onze jaarstukken leggen wij volledige verantwoording af over omvang, herkomst en bestemming van ontvangen giften. Giften vanaf € 4.500,- worden tevens openbaar vermeld op onze website.
            </p>
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowRegulations(!showRegulations)}
              className="w-full text-xs h-9 flex items-center justify-between"
            >
              <span>{showRegulations ? "Verberg giftenreglement" : "Bekijk volledig giftenreglement"}</span>
              {showRegulations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-start gap-3">
            <Users className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground block">Liever lid worden?</span>
              Voor slechts € 12,00 per jaar bent u officieel lid met stemrecht op de algemene ledenvergadering.{" "}
              <Link to="/registreren" className="text-primary font-semibold underline hover:text-primary/90">
                Word direct lid
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Volledige Weergave Giftenreglement */}
      {showRegulations && (
        <div className="bg-card p-6 sm:p-8 rounded-2xl border border-border shadow-sm space-y-6 animate-in fade-in">
          <div className="border-b border-border pb-4">
            <h2 className="text-xl font-display font-bold text-foreground">
              Giftenreglement Lijst van Andel
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Vastgesteld door het partijbestuur conform de beginselen van integriteit, openbaarheid en onafhankelijkheid.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-muted-foreground leading-relaxed">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Artikel 1 &ndash; Het begrip gift</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Als gift worden beschouwd een door de partij om niet ontvangen geldsom of op geld waardeerbare prestatie met inbegrip van contributie van leden van de partij.</li>
                  <li>Kwijtscheldingen van schulden van de partij, waaronder declarabele, maar nog niet in rekening gebrachte kosten, worden eveneens als gift aangemerkt.</li>
                  <li>Bij sponsoring is geen sprake van een gift, indien de sponsor een tegenprestatie verkrijgt die hij ook elders in het maatschappelijk verkeer tegen een vergelijkbare prijs kan verwerven. Te denken valt aan verkoop van advertentieruimte in geschriften van de partij of van andere mogelijkheden tot het maken van reclame.</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Artikel 2 &ndash; De toelaatbaarheid van giften</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Raadsleden van Lijst van Andel doneren boven op de jaarlijkse contributie (op vrijwillige basis) een onderling afgestemd bedrag.</li>
                  <li>Giften waarvan de juiste herkomst niet vast te stellen is, worden niet aangenomen.</li>
                  <li>Giften die kennelijk gedaan worden in de verwachting van een economische of politieke begunstiging, worden niet aangenomen.</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Artikel 3 &ndash; Maximale omvang</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Giften, groter dan € 4.500,- per jaar worden slechts geaccepteerd na schriftelijke instemming van het bestuur.</li>
                  <li>Het is individuele leden niet toegestaan giften te ontvangen ten behoeve van politieke activiteiten. Giften ten behoeve van voorkeursacties voor een bepaalde kandidaat worden slechts geaccepteerd na instemming van het bestuur.</li>
                </ol>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Artikel 4 &ndash; Verantwoording van giften</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>In de jaarstukken wordt verantwoording afgelegd over alle in het betreffende jaar ontvangen giften, zowel qua omvang, herkomst als bestemming. Giften vanaf € 4.500,- worden tevens bekend gemaakt op de website van de partij.</li>
                  <li>De in 4.1. genoemde verantwoording geldt voor alle geledingen binnen de partij en betreft ook de in 3.2. genoemde giften ten behoeve van individuele kandidaten.</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Artikel 5 &ndash; Sponsoring</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Bij sponsoring is sprake van een ontvangen geldsom of geldswaardige prestatie, waarbij de partij een duidelijke tegenprestatie levert aan de sponsor. Deze tegenprestatie kan bijvoorbeeld bestaan uit het bieden van ruimte voor promotie van diensten en producten of naamvermelding bij partijactiviteiten.</li>
                  <li>Sponsoring is herkenbaar verbonden aan een activiteit of project van de partij.</li>
                  <li>In de jaarstukken wordt verantwoording afgelegd over alle in het betreffende jaar ontvangen sponsorgelden.</li>
                  <li>Voor Lijst van Andel gelden geen beperkingen met betrekking tot de hoogte van in totaal ontvangen sponsorgelden. Sponsoring is pas toegestaan na goedkeuring van het bestuur.</li>
                  <li>Het is individuele leden niet toegestaan sponsorgelden te ontvangen.</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Artikel 6 &ndash; Slotbepalingen</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Financieringsbronnen die wettelijk zijn toegestaan maar waarvan het gebruik door de partij niet is geregeld, mogen slechts gebruikt worden na instemming van het bestuur.</li>
                  <li>Daar waar de wet afwijkt in beperkende zin van een of meerdere bepalingen uit deze regeling, is de wettelijke van toepassing onder volledig behoud van alle overige bepalingen van deze regeling.</li>
                  <li>Daar waar in deze regeling gesproken wordt over beperking van een bepaald bedrag, geldt deze beperking voor het totaal aan ontvangen gelden in enig kalenderjaar van een bepaalde natuurlijk persoon of rechtspersoon.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: STRIPE DONATIE BETALING */}
      <Dialog
        open={Boolean(paymentModal?.open)}
        onOpenChange={(open) => {
          if (!open) setPaymentModal(null);
        }}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-2 ring-8 ring-rose-500/5">
              <Heart className="w-6 h-6 fill-rose-600" />
            </div>
            <DialogTitle className="text-xl font-display font-bold text-foreground">
              Veilige Stripe Betaalomgeving
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Vrijwillige donatie aan Lijst van Andel Steenwijkerland
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                Veilig afrekenen via Stripe (nieuw venster)
              </div>
              <p className="leading-relaxed">
                Stripe beschermt betaaltransacties met strenge banknormen en vereist opening in een apart venster om clickjacking en iframe-beperkingen te voorkomen.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/50 border border-border text-xs space-y-2">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Doel:</span>
                <span className="font-medium text-foreground">Gift Lijst van Andel</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-border/60">
                <span className="font-medium text-foreground">Donatiebedrag:</span>
                <span className="text-xl font-bold font-display text-primary">
                  € {paymentModal?.amount.toFixed(2)}
                </span>
              </div>
            </div>

            {paymentModal?.checkoutUrl && (
              <a
                href={paymentModal.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow transition-colors"
              >
                <span>Naar officiële Stripe betaalpagina</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="outline"
                type="button"
                onClick={handleManualCheckDonation}
                disabled={isVerifying}
                className="w-full text-xs h-10 flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Status controleren...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Ik heb betaald / Status nu controleren
                  </>
                )}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                Zodra u de betaling afrondt, detecteert het systeem dit vanzelf.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
