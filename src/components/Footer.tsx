import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import logo from "@/assets/logo.png";

const socials = [
  { icon: Facebook, label: "Facebook", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
  { icon: Twitter, label: "X", href: "#" },
];

export const Footer = () => (
  <footer className="border-t border-accent/20 bg-twente-black mt-20">
    <div className="container py-12 grid md:grid-cols-3 gap-8">
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
          {socials.map(s => (
            <a
              key={s.label}
              href={s.href}
              aria-label={s.label}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 inline-flex items-center justify-center rounded-sm border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
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
        <p className="text-sm text-muted-foreground">
          Gemeente Steenwijkerland<br />
          Vendelweg 1<br />
          8331 XE Steenwijk
        </p>
      </div>
    </div>
    <div className="border-t border-accent/10">
      <div className="container py-5 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Lijst van Andel — Lokale partij Steenwijkerland.</p>
        <p className="text-accent/70 uppercase tracking-widest">Dichtbij de inwoner</p>
      </div>
    </div>
  </footer>
);
