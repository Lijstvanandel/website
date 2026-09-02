import { useState } from "react";
import { Phone, Calendar, Mail, Instagram, Facebook, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BelafspraakDialog } from "@/components/BelafspraakDialog";
import sammyImg from "@/assets/sammy.png";
import lisaImg from "@/assets/lisa.png";
import nathanImg from "@/assets/nathan.png";
import chrisImg from "@/assets/chris.jpg";

interface Lid {
  naam: string;
  voornaam: string;
  rol: string;
  type: "Raadslid" | "Burgerraadslid";
  img: string;
  bio: string;
  speerpunten: string[];
  selectValue: string;
  socials: { instagram?: string; facebook?: string; linkedin?: string };
}

const leden: Lid[] = [
  {
    naam: "Sammy van Andel",
    voornaam: "sammy",
    rol: "Fractievoorzitter",
    type: "Raadslid",
    img: sammyImg,
    bio: "26 jaar, geboren en getogen in Steenwijk. Werkt als informatiearchitect na zijn HBO-ICT opleiding. Zet zich met een frisse, analytische blik in voor Steenwijkerland.",
    speerpunten: ["Voorrang voor eigen inwoners", "Behoud van de natuur", "Slimmer & digitaal bestuur"],
    selectValue: "Sammy van Andel — Fractievoorzitter",
    socials: { instagram: "#", facebook: "#", linkedin: "#" },
  },
  {
    naam: "Lisa Mars",
    voornaam: "lisa",
    rol: "Raadslid",
    type: "Raadslid",
    img: lisaImg,
    bio: "Als raadslid zet Lisa zich dagelijks in voor de inwoners van Steenwijkerland. Bevlogen, benaderbaar en met oog voor het persoonlijke verhaal achter beleid.",
    speerpunten: ["Sociale samenhang", "Veilige leefomgeving", "Aandacht voor jongeren"],
    selectValue: "Lisa Mars — Raadslid",
    socials: { instagram: "#", facebook: "#", linkedin: "#" },
  },
  {
    naam: "Nathan ten Wolde",
    voornaam: "nathan",
    rol: "Burgerraadslid",
    type: "Burgerraadslid",
    img: nathanImg,
    bio: "Diep geworteld in de gemeente. Actief lid van muziekvereniging De Woldklank en belijdend lid van de Christelijk Gereformeerde Kerk. Kent de agrarische praktijk van binnenuit.",
    speerpunten: ["Boerenpraktijk in beleid", "Behoud agrarisch landschap", "Bestuur vanuit principes"],
    selectValue: "Nathan ten Wolde — Burgerraadslid",
    socials: { instagram: "#", facebook: "#", linkedin: "#" },
  },
  {
    naam: "Chris van Andel",
    voornaam: "chris",
    rol: "Burgerraadslid",
    type: "Burgerraadslid",
    img: chrisImg,
    bio: "Burgerraadslid met jarenlange betrokkenheid bij Steenwijkerland. Brengt levenservaring, nuchterheid en een scherp oog voor lokaal belang naar de fractie.",
    speerpunten: ["Realistisch lokaal beleid", "Aandacht voor ondernemers", "Korte lijnen met inwoners"],
    selectValue: "Chris van Andel — Burgerraadslid",
    socials: { instagram: "#", facebook: "#", linkedin: "#" },
  },
];

const Raadsleden = () => {
  const [belOpen, setBelOpen] = useState(false);
  const [voorgeselecteerd, setVoorgeselecteerd] = useState<string | undefined>(undefined);

  const openMet = (lid: Lid) => {
    setVoorgeselecteerd(lid.selectValue);
    setBelOpen(true);
  };

  return (
    <div className="container py-16 md:py-24">
      <div className="max-w-3xl mb-16">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Onze fractie</div>
        <h1 className="font-display text-6xl md:text-7xl mb-6 border-gold-line pb-5">Fractie</h1>
        <p className="text-lg text-muted-foreground">
          Twee raadsleden en twee burgerraadsleden. Vier mensen die week in, week uit knokken
          voor een beter Steenwijkerland — en die u rechtstreeks kunt spreken.
        </p>
      </div>

      {/* Belafspraak strip */}
      <div className="mb-12 bg-gradient-to-br from-twente-red-deep to-card border border-accent/30 p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5 justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-sm bg-accent/15 border border-accent flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 text-accent" />
          </div>
          <div>
            <div className="font-display text-2xl mb-1">Persoonlijke belafspraak inplannen</div>
            <p className="text-sm text-muted-foreground">
              Spreek één van onze raadsleden of burgerraadsleden — woensdag, donderdag of vrijdag, 19:00–21:00, max. 30 minuten.
            </p>
          </div>
        </div>
        <Button onClick={() => { setVoorgeselecteerd(undefined); setBelOpen(true); }} size="lg" className="bg-primary hover:bg-primary/90 uppercase tracking-wider font-semibold whitespace-nowrap">
          <Phone className="w-4 h-4" /> Plan een gesprek
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {leden.map((p) => (
          <article key={p.naam} className="group relative bg-card border border-border overflow-hidden hover-lift flex flex-col">
            <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-twente-black/80 backdrop-blur border border-accent text-[10px] uppercase tracking-widest text-accent font-semibold">
              {p.rol}
            </div>
            <div className="grid grid-cols-[160px_1fr] sm:grid-cols-[200px_1fr]">
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={p.img}
                  alt={`${p.naam} - ${p.rol}`}
                  loading="lazy"
                  width={800}
                  height={1000}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-5 md:p-6 flex flex-col">
                <div className="text-[10px] uppercase tracking-widest text-accent mb-1">{p.rol}</div>
                <h3 className="font-display text-3xl mb-3">{p.naam}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.bio}</p>
                <ul className="space-y-1.5 mb-4">
                  {p.speerpunten.map(s => (
                    <li key={s} className="flex items-start gap-2 text-xs text-foreground/80">
                      <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>

                <a
                  href={`mailto:${p.voornaam}@lijstvanandel.nl`}
                  className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 mb-3 break-all"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  {p.voornaam}@lijstvanandel.nl
                </a>

                <div className="flex items-center gap-2 mb-4">
                  {p.socials.instagram && (
                    <a href={p.socials.instagram} target="_blank" rel="noopener noreferrer" aria-label={`Instagram van ${p.naam}`}
                       className="w-8 h-8 flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors">
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {p.socials.facebook && (
                    <a href={p.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label={`Facebook van ${p.naam}`}
                       className="w-8 h-8 flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors">
                      <Facebook className="w-4 h-4" />
                    </a>
                  )}
                  {p.socials.linkedin && (
                    <a href={p.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`LinkedIn van ${p.naam}`}
                       className="w-8 h-8 flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <Button
                  onClick={() => openMet(p)}
                  variant="outline"
                  className="mt-auto border-accent text-accent hover:bg-accent hover:text-accent-foreground uppercase tracking-wider text-xs font-semibold w-fit"
                >
                  <Phone className="w-3.5 h-3.5" /> Belafspraak inplannen
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <BelafspraakDialog
        key={voorgeselecteerd ?? "leeg"}
        open={belOpen}
        onOpenChange={setBelOpen}
        defaultRaadslid={voorgeselecteerd}
      />
    </div>
  );
};

export default Raadsleden;
