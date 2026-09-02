import { useState } from "react";
import { Mail, Phone, MapPin, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { BelafspraakDialog } from "@/components/BelafspraakDialog";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [belOpen, setBelOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast({ title: "Vul alle verplichte velden in", variant: "destructive" });
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="container py-24">
        <div className="max-w-xl mx-auto text-center bg-card border border-accent p-12">
          <CheckCircle2 className="w-20 h-20 mx-auto text-accent mb-5" />
          <h1 className="font-display text-5xl text-gradient-gold mb-4">Bedankt, {name.split(" ")[0]}!</h1>
          <p className="text-lg text-foreground/85 mb-2">Uw bericht is binnen.</p>
          <p className="text-sm text-muted-foreground mb-8">We reageren zo snel mogelijk op {email}.</p>
          <Button onClick={() => { setSubmitted(false); setName(""); setEmail(""); setMessage(""); }} variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
            Nieuw bericht
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-16 md:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-accent/40 mb-5">
            <Sparkles className="w-3 h-3 text-accent" />
            <span className="text-xs uppercase tracking-[0.3em] text-accent">Neem contact op</span>
          </div>
          <h1 className="font-display text-6xl md:text-7xl mb-5">Wij horen graag van u</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Heeft u een vraag, idee of zorg? Stuur ons een bericht of plan direct een belafspraak met een raadslid.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
          <form onSubmit={handleSubmit} className="bg-card border border-border p-8 md:p-10 space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cname">Naam *</Label>
                <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
              </div>
              <div>
                <Label htmlFor="cemail">E-mail *</Label>
                <Input id="cemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required />
              </div>
            </div>
            <div>
              <Label htmlFor="cmsg">Uw bericht *</Label>
              <Textarea id="cmsg" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={6} required />
            </div>
            <Button type="submit" disabled={loading} size="lg" className="w-full bg-primary hover:bg-primary/90 uppercase tracking-wider font-bold">
              <Mail className="w-5 h-5" />
              {loading ? "Versturen..." : "Verstuur bericht"}
            </Button>
          </form>

          <aside className="space-y-5">
            <div className="bg-gradient-to-br from-twente-red-deep to-card border border-accent/30 p-7">
              <Phone className="w-8 h-8 text-accent mb-3" />
              <h3 className="font-display text-2xl mb-2 text-gradient-gold">Liever direct bellen?</h3>
              <p className="text-sm text-foreground/85 mb-5">
                Plan een belafspraak van maximaal 30 minuten met een van onze raadsleden.
                Wo, do of vrij tussen 19:00 en 21:00.
              </p>
              <Button onClick={() => setBelOpen(true)} className="bg-primary hover:bg-primary/90 uppercase tracking-wider text-xs font-semibold w-full">
                Belafspraak inplannen
              </Button>
            </div>

            <div className="bg-card border border-border p-7 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-accent mb-1">Gemeente</div>
                  <p className="text-sm text-foreground/85">Steenwijkerland</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-accent mb-1">E-mail</div>
                  <p className="text-sm text-foreground/85">info@lijstvanandel.nl</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <BelafspraakDialog open={belOpen} onOpenChange={setBelOpen} />
    </div>
  );
};

export default Contact;
