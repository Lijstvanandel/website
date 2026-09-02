import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const VERTEGENWOORDIGD: { naam: string; slug: string; vertegenwoordiger: string; type: "Wijk" | "Kern" }[] = [
  { naam: "Oostermeenthe", slug: "oostermeenthe", vertegenwoordiger: "Stef Mars", type: "Wijk" },
];

const WijkenEnKernen = () => {
  return (
    <div className="container py-16 md:py-24">
      <div className="max-w-3xl mb-12">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Verken Steenwijkerland</div>
        <h1 className="font-display text-6xl md:text-7xl mb-6 border-gold-line pb-5">Wijken en kernen</h1>
        <p className="text-lg text-muted-foreground">
          Steenwijkerland bestaat uit één stad — Steenwijk — met daaromheen tientallen kernen, dorpen en buurtschappen.
          Gebruik de interactieve kaart bovenaan de homepagina om een gebied te openen, of kies hieronder een wijk of
          kern met een eigen aanspreekpunt.
        </p>
      </div>

      <aside className="bg-card border border-accent/30 p-6 md:p-8 mb-16">
        <div className="text-[10px] uppercase tracking-[0.3em] text-accent mb-2">Hoe werkt het</div>
        <h2 className="font-display text-2xl mb-4 border-gold-line pb-4">Klik op uw wijk of kern</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          Elke wijk en kern krijgt een eigen pagina met wijkvertegenwoordiger, lopende dossiers, recente bijdragen
          en nieuwsberichten. Zo weet u precies wat er bij u in de buurt speelt en wie u kunt benaderen.
        </p>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="text-accent font-display text-xl leading-none mt-0.5">01</span>
            <span><span className="text-foreground font-medium">Wijken</span> liggen binnen de stad Steenwijk.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-accent font-display text-xl leading-none mt-0.5">02</span>
            <span><span className="text-foreground font-medium">Kernen</span> zijn alle dorpen en buurtschappen buiten Steenwijk.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-accent font-display text-xl leading-none mt-0.5">03</span>
            <span>Niet elke pagina is al gevuld — we breiden dit doorlopend uit.</span>
          </li>
        </ul>
      </aside>

      <section>
        <div className="text-[10px] uppercase tracking-[0.3em] text-accent mb-2">Met een eigen aanspreekpunt</div>
        <h2 className="font-display text-4xl md:text-5xl mb-8 border-gold-line pb-4">Vertegenwoordigde wijken en kernen</h2>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VERTEGENWOORDIGD.map((w) => (
            <li key={w.slug}>
              <Link
                to={`/wijken-en-kernen/${w.slug}`}
                className="group bg-card border border-border p-5 flex items-center justify-between gap-4 hover-lift"
              >
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-accent mb-1">{w.type}</div>
                  <h3 className="font-display text-2xl leading-tight mb-1">{w.naam}</h3>
                  <p className="text-xs text-muted-foreground">Vertegenwoordiger: {w.vertegenwoordiger}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-accent shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default WijkenEnKernen;
