import { useState } from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Twitter, Mail, CheckCircle2, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const socials = [
  { icon: Facebook, label: "Facebook", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
  { icon: Twitter, label: "X", href: "#" },
];

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Vul een geldig e-mailadres in.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon niet aanmelden");
      setSubscribed(true);
      toast.success(data.message || "U bent aangemeld voor onze nieuwsbrief!");
      setEmail("");
    } catch (err: any) {
      toast.error(err.message || "Fout bij aanmelden.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="border-t border-accent/20 bg-twente-black mt-20">
      <div className="container py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img src={logo} alt="Lijst van Andel logo" className="w-11 h-11 rounded-full object-cover" />
            <div>
              <div className="font-display text-lg">Lijst van Andel</div>
              <div className="text-[10px] uppercase tracking-widest text-accent">Steenwijkerland</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Een lokale stem voor Steenwijkerland. Voor lokale binding, behoud van natuur en bestuur dichtbij de inwoner.
          </p>
          <div className="flex gap-2 mt-5">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 inline-flex items-center justify-center rounded-sm border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <s.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-display text-lg text-accent mb-3">Navigatie</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="text-muted-foreground hover:text-accent transition-colors">Home</Link></li>
            <li><Link to="/fractie" className="text-muted-foreground hover:text-accent transition-colors">Fractie</Link></li>
            <li><Link to="/standpunten" className="text-muted-foreground hover:text-accent transition-colors">Standpunten</Link></li>
            <li><Link to="/agenda" className="text-muted-foreground hover:text-accent transition-colors">Agenda</Link></li>
            <li><Link to="/nieuws" className="text-muted-foreground hover:text-accent transition-colors">Nieuws</Link></li>
            <li><Link to="/contact" className="text-muted-foreground hover:text-accent transition-colors">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg text-accent mb-3">Gemeente</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Gemeente Steenwijkerland<br />
            Vendelweg 1<br />
            8331 XE Steenwijk<br />
            <br />
            <span className="text-xs text-muted-foreground/80">Fractiekamer Lijst van Andel</span>
          </p>
        </div>

        <div>
          <h4 className="font-display text-lg text-accent mb-3">Nieuwsbrief</h4>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Ontvang periodiek onze fractie-updates, video's en verslagen uit de gemeenteraad per e-mail.
          </p>
          {subscribed ? (
            <div className="space-y-2">
              <div className="bg-accent/15 border border-accent/40 rounded p-3 text-xs text-accent flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Bedankt voor uw aanmelding!</span>
              </div>
              <div className="text-[11px] text-muted-foreground/70">
                <Link to="/nieuwsbrief/afmelden" className="hover:text-accent hover:underline transition-colors">
                  Nieuwsbrief afmelden
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Uw e-mailadres..."
                  className="bg-background/80 border-accent/30 text-xs h-9 pr-9"
                />
                <Mail className="w-4 h-4 text-muted-foreground absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground uppercase tracking-wider text-[11px] font-semibold h-8"
              >
                {loading ? "Bezig..." : (
                  <span className="flex items-center justify-center gap-1.5">
                    <span>Aanmelden</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </Button>
              <div className="text-[11px] text-muted-foreground/70 pt-1 text-right">
                <Link to="/nieuwsbrief/afmelden" className="hover:text-accent hover:underline transition-colors">
                  Nieuwsbrief afmelden
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
      <div className="border-t border-accent/10">
        <div className="container py-5 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Lijst van Andel — Lokale partij Steenwijkerland.</p>
          <span className="text-accent/70 uppercase tracking-widest">Dichtbij de inwoner</span>
        </div>
      </div>
    </footer>
  );
};
