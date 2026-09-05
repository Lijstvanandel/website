import { Mail, Instagram, Facebook, Linkedin } from "lucide-react";
import silhouette from "@/assets/silhouette.png";

interface Steunlid {
  id: string;
  naam: string;
  voornaam: string;
  rol: string;
  img: string;
  bio: string;
  socials: { instagram?: string; facebook?: string; linkedin?: string };
}

const steunfractie: Steunlid[] = [
  {
    id: "nico",
    naam: "?",
    voornaam: "?",
    rol: "Steunfractielid",
    img: silhouette,
    bio: "Lid van de steunfractie van Lijst van Andel. Ondersteunt de fractie inhoudelijk en helpt bij onderzoek, dossiers en contact met inwoners.",
    socials: { instagram: "#", facebook: "#", linkedin: "#" },
  },
  {
    id: "antonius",
    naam: "?",
    voornaam: "?",
    rol: "Steunfractielid",
    img: silhouette,
    bio: "Lid van de steunfractie van Lijst van Andel. Ondersteunt de fractie inhoudelijk en helpt bij onderzoek, dossiers en contact met inwoners.",
    socials: { instagram: "#", facebook: "#", linkedin: "#" },
  },
  {
    id: "volgt-nog",
    naam: "Volgt nog",
    voornaam: "info",
    rol: "Steunfractielid",
    img: silhouette,
    bio: "Lid van de steunfractie van Lijst van Andel. Ondersteunt de fractie inhoudelijk en helpt bij onderzoek, dossiers en contact met inwoners.",
    socials: { instagram: "#", facebook: "#", linkedin: "#" },
  },
];

const Steunfractie = () => {
  return (
    <div className="container py-16 md:py-24">
      <div className="max-w-3xl mb-16">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Onze partij</div>
        <h1 className="font-display text-6xl md:text-7xl mb-6 border-gold-line pb-5">Steunfractie</h1>
        <p className="text-lg text-muted-foreground">
          De steunfractie versterkt onze raadsleden en burgerraadsleden. Zij denken mee, duiken in dossiers en houden de
          verbinding met de samenleving levend.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steunfractie.map((p) => (
          <article
            key={p.id}
            className="group relative bg-card border border-border overflow-hidden hover-lift flex flex-col"
          >
            <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-twente-black/80 backdrop-blur border border-accent text-[10px] uppercase tracking-widest text-accent font-semibold">
              {p.rol}
            </div>
            <div className="aspect-[4/5] overflow-hidden bg-muted">
              <img
                src={p.img}
                alt={`${p.naam} - ${p.rol}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="p-5 md:p-6 flex flex-col">
              <div className="text-[10px] uppercase tracking-widest text-accent mb-1">{p.rol}</div>
              <h3 className="font-display text-2xl mb-3">{p.naam}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.bio}</p>

              <a
                href={`mailto:${p.voornaam}@lijstvanandel.nl`}
                className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 mb-3 break-all"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                {p.voornaam}@lijstvanandel.nl
              </a>

              <div className="flex items-center gap-2 mt-auto">
                {p.socials.instagram && (
                  <a
                    href={p.socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Instagram van ${p.naam}`}
                    className="w-8 h-8 flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {p.socials.facebook && (
                  <a
                    href={p.socials.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Facebook van ${p.naam}`}
                    className="w-8 h-8 flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {p.socials.linkedin && (
                  <a
                    href={p.socials.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`LinkedIn van ${p.naam}`}
                    className="w-8 h-8 flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Steunfractie;
