import { Mail, Instagram, Facebook, Linkedin, FileText } from "lucide-react";
import placeholder from "@/assets/silhouette.png";

interface Bestuurslid {
  id: string;
  naam: string;
  voornaam: string;
  rol: string;
  img: string;
  bio: string;
  socials: { instagram?: string; facebook?: string; linkedin?: string };
}

const bestuur: Bestuurslid[] = [
  {
    id: "voorzitter",
    naam: "?",
    voornaam: "?",
    rol: "Voorzitter",
    img: placeholder,
    bio: "Voorzitter van het bestuur van Lijst van Andel. Bewaakt koers, samenhang en verbinding tussen bestuur en fractie.",
    socials: { instagram: "#", facebook: "#", linkedin: "#" },
  },
  {
    id: "secretaris",
    naam: "?",
    voornaam: "?",
    rol: "Secretaris",
    img: placeholder,
    bio: "Bestuurslid van Lijst van Andel. Betrokken bij organisatie, leden en lokale verankering van de partij.",
    socials: { instagram: "#", facebook: "#", linkedin: "#" },
  },
  {
    id: "penningmeester",
    naam: "?",
    voornaam: "?",
    rol: "Penningmeester",
    img: placeholder,
    bio: "Bestuurslid van Lijst van Andel. Met een nuchtere blik en oog voor detail draagt hij bij aan een gezonde partijorganisatie.",
    socials: { instagram: "#", facebook: "#", linkedin: "#" },
  },
  {
    id: "algemeen-bestuurslid",
    naam: "?",
    voornaam: "",
    rol: "Algemeen bestuurslid",
    img: placeholder,
    bio: "Bestuurslid van Lijst van Andel. Met een nuchtere blik en oog voor detail draagt hij bij aan een gezonde partijorganisatie.",
    socials: { instagram: "#", facebook: "#", linkedin: "#" },
  },
];

const organisatieDocs = [
  { titel: "Statuten", href: "#" },
  { titel: "Huishoudelijk Reglement", href: "#" },
  { titel: "Integriteitscode", href: "#" },
  { titel: "Bestuursreglement", href: "#" },
  { titel: "Kandidaatstellingsreglement", href: "#" },
];

const Bestuur = () => {
  return (
    <div className="container py-16 md:py-24">
      <div className="max-w-3xl mb-16">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Onze partij</div>
        <h1 className="font-display text-6xl md:text-7xl mb-6 border-gold-line pb-5">Bestuur</h1>
        <p className="text-lg text-muted-foreground">
          Het bestuur bewaakt de koers van Lijst van Andel, zorgt voor een gezonde organisatie en vormt de schakel
          tussen leden, fractie en samenleving.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {bestuur.map((p) => (
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

                {p.voornaam && p.voornaam !== "?" ? (
                  <a
                    href={`mailto:${p.voornaam.toLowerCase()}@lijstvanandel.nl`}
                    className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 mb-3 break-all"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    {p.voornaam.toLowerCase()}@lijstvanandel.nl
                  </a>
                ) : (
                  <a
                    href="mailto:bestuur@lijstvanandel.nl"
                    className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 mb-3 break-all"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    bestuur@lijstvanandel.nl
                  </a>
                )}

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

        <aside className="bg-card border border-accent/30 p-6 md:p-8 h-fit lg:sticky lg:top-32">
          <div className="text-[10px] uppercase tracking-[0.3em] text-accent mb-2">Documenten</div>
          <h2 className="font-display text-2xl mb-5 border-gold-line pb-4">Organisatie-informatie</h2>
          <ul className="space-y-1">
            {organisatieDocs.map((doc) => (
              <li key={doc.titel}>
                <a
                  href={doc.href}
                  className="group flex items-center gap-3 px-3 py-3 border-l-2 border-transparent hover:border-accent hover:bg-accent/5 transition-colors"
                >
                  <FileText className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-sm text-foreground/90 group-hover:text-accent">{doc.titel}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-5 leading-relaxed">Documenten worden binnenkort toegevoegd.</p>
        </aside>
      </div>
    </div>
  );
};

export default Bestuur;
