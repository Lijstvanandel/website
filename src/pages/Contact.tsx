import { useState, useEffect, useRef } from "react";
import { Mail, Phone, MapPin, CheckCircle2, Sparkles, Send, MessageSquare, Clock, HelpCircle, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { BelafspraakDialog } from "@/components/BelafspraakDialog";
import { ContactFaqSection } from "@/components/ContactFaqSection";

const Contact = () => {
  const { user } = useAuth();
  const formRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [belOpen, setBelOpen] = useState(false);

  // Prefill user details if logged in
  useEffect(() => {
    if (user?.fullName) {
      setName((prev) => (prev ? prev : user.fullName));
    }
    if (user?.username && user.username.includes("@")) {
      setEmail((prev) => (prev ? prev : user.username));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Vul alstublieft alle verplichte velden in (naam, e-mail en bericht).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          subject: subject.trim() || "Contactbericht via website",
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Uw bericht is succesvol verzonden!");
        setSubmitted(true);
      } else {
        toast.error(data.error || "Er is een fout opgetreden bij het verzenden.");
      }
    } catch (err) {
      console.error("Fout bij verzenden contactformulier:", err);
      toast.error("Kon bericht niet verzenden. Controleer uw verbinding en probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setName(user?.fullName || "");
    setEmail(user?.username && user.username.includes("@") ? user.username : "");
    setPhone("");
    setSubject("");
    setMessage("");
  };

  const scrollToFaq = () => {
    const el = document.getElementById("faq");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="container py-16 md:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 border border-accent/40 rounded-full mb-5 bg-accent/5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs uppercase tracking-[0.25em] text-accent font-semibold">
              Neem contact op
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl mb-4">Wij horen graag van u</h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Heeft u een vraag, idee, signaal uit uw wijk of dorp? Stuur ons direct een bericht of plan een belafspraak met onze fractie.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={scrollToFaq}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full border border-border bg-card/60 hover:bg-card hover:border-accent/50 text-foreground transition-all cursor-pointer shadow-xs"
            >
              <HelpCircle className="w-3.5 h-3.5 text-accent" />
              Bekijk veelgestelde vragen (FAQ)
              <ArrowDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div ref={formRef} className="grid lg:grid-cols-[1.5fr_1fr] gap-8 scroll-mt-28">
          {submitted ? (
            <div className="bg-card border border-border p-8 md:p-12 rounded-2xl shadow-sm animate-fade-up text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="font-display text-3xl md:text-4xl mb-3 text-foreground">
                Bedankt voor uw bericht!
              </h2>
              <p className="text-base text-foreground/85 mb-2 max-w-md">
                Beste {name.split(" ")[0] || "inwoner"}, wij hebben uw vraag of opmerking in goede orde ontvangen.
              </p>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Een van onze fractieleden bekijkt uw bericht zo spoedig mogelijk en reageert naar{" "}
                <span className="font-semibold text-foreground">{email}</span>.
              </p>

              <div className="w-full max-w-md p-4 rounded-xl bg-secondary/50 border border-border/80 text-left text-xs text-muted-foreground mb-8 space-y-1.5">
                <div className="flex items-center text-foreground font-medium">
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-accent" />
                  <span>Onderwerp: {subject || "Contactbericht via website"}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-accent" />
                  <span>Status: Direct opgenomen in ons beheerdersoverzicht</span>
                </div>
              </div>

              <Button
                onClick={handleReset}
                variant="outline"
                className="border-accent text-accent hover:bg-accent hover:text-accent-foreground rounded-full px-6"
              >
                Nog een bericht sturen
              </Button>
            </div>
          ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-card border border-border p-6 md:p-10 rounded-2xl shadow-sm space-y-6"
          >
            <div className="border-b border-border/80 pb-4">
              <h2 className="font-display text-2xl text-foreground mb-1">Stuur ons een bericht</h2>
              <p className="text-xs text-muted-foreground">
                Velden met een sterretje (*) zijn verplicht.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cname" className="text-xs font-semibold">
                  Uw naam *
                </Label>
                <Input
                  id="cname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  placeholder="Bijv. Jan de Vries"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cemail" className="text-xs font-semibold">
                  E-mailadres *
                </Label>
                <Input
                  id="cemail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  placeholder="naam@voorbeeld.nl"
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cphone" className="text-xs font-semibold">
                  Telefoonnummer (optioneel)
                </Label>
                <Input
                  id="cphone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={30}
                  placeholder="Bijv. 06-12345678"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="csubject" className="text-xs font-semibold">
                  Onderwerp (optioneel)
                </Label>
                <Input
                  id="csubject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={150}
                  placeholder="Bijv. Vraag over woningbouw / verkeer"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cmsg" className="text-xs font-semibold">
                Uw bericht of signaal *
              </Label>
              <Textarea
                id="cmsg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={3000}
                rows={6}
                placeholder="Typ hier uw vraag, opmerking of situatie..."
                required
                className="mt-1 resize-y"
              />
              <p className="text-[11px] text-muted-foreground mt-1 text-right">
                {message.length} / 3000 tekens
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold tracking-wide py-6 rounded-xl"
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Verzenden...
                </span>
              ) : (
                <span className="flex items-center">
                  <Send className="w-4 h-4 mr-2" />
                  Verstuur bericht
                </span>
              )}
            </Button>
          </form>
          )}

          <aside className="space-y-6">
            <div className="bg-gradient-to-br from-twente-red-deep to-card border border-accent/30 p-7 rounded-2xl shadow-sm">
              <Phone className="w-8 h-8 text-accent mb-3" />
              <h3 className="font-display text-2xl mb-2 text-gradient-gold">Liever direct bellen?</h3>
              <p className="text-sm text-foreground/85 mb-5 leading-relaxed">
                Plan direct een persoonlijke belafspraak van maximaal 30 minuten met een van onze raadsleden.
                Woensdag, donderdag of vrijdag tussen 19:00 en 21:00.
              </p>
              <Button
                onClick={() => setBelOpen(true)}
                className="bg-primary hover:bg-primary/90 uppercase tracking-wider text-xs font-semibold w-full rounded-xl"
              >
                Belafspraak inplannen
              </Button>
            </div>

            <div className="bg-card border border-border p-7 rounded-2xl shadow-sm space-y-5">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-accent mb-1 font-semibold">
                    Gemeente
                  </div>
                  <p className="text-sm text-foreground/85 font-medium">Steenwijkerland</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Actief in alle wijken en kernen van onze gemeente
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-4 border-t border-border/60">
                <Mail className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-accent mb-1 font-semibold">
                    E-mailadres
                  </div>
                  <a
                    href="mailto:info@lijstvanandel.nl"
                    className="text-sm text-foreground/85 font-medium hover:text-accent transition-colors"
                  >
                    info@lijstvanandel.nl
                  </a>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reactie doorgaans binnen 1 tot 2 werkdagen
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* DYNAMISCHE FAQ SECTIE */}
        <ContactFaqSection
          onOpenBelafspraak={() => setBelOpen(true)}
          onScrollToForm={scrollToForm}
        />
      </div>
      <BelafspraakDialog open={belOpen} onOpenChange={setBelOpen} />
    </div>
  );
};

export default Contact;
