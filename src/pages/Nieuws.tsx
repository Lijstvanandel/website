import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight, Calendar as CalIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { news } from "@/data/news";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

const Nieuws = () => {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      news.filter(n =>
        (n.title + n.excerpt + n.category).toLowerCase().includes(q.toLowerCase())
      ),
    [q]
  );

  return (
    <div className="container py-16 md:py-24">
      <div className="max-w-3xl mb-12">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Het laatste van de fractie</div>
        <h1 className="font-display text-6xl md:text-7xl mb-6 border-gold-line pb-5">Nieuws</h1>
        <p className="text-lg text-muted-foreground">
          Berichten, updates en mediaoptredens van Lijst van Andel.
        </p>
      </div>

      <div className="relative max-w-xl mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Zoek in nieuwsberichten…"
          className="pl-11 h-12 bg-card border-accent/40 focus-visible:ring-accent"
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(n => (
          <Link
            to={`/nieuws/${n.id}`}
            key={n.id}
            className="group bg-card border border-border hover-lift overflow-hidden flex flex-col"
          >
            <div className="aspect-[16/10] overflow-hidden">
              <img
                src={n.image}
                alt={n.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="p-6 flex flex-col flex-1">
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-accent mb-3">
                <span>{n.category}</span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <CalIcon className="w-3 h-3" /> {format(parseISO(n.date), "d MMM yyyy", { locale: nl })}
                </span>
              </div>
              <h3 className="font-display text-2xl mb-2 leading-tight">{n.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{n.excerpt}</p>
              <div className="mt-auto text-xs uppercase tracking-widest text-accent flex items-center gap-2 group-hover:gap-3 transition-all">
                Lees verder <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-muted-foreground">Geen nieuwsberichten gevonden.</p>
        )}
      </div>
    </div>
  );
};

export default Nieuws;
