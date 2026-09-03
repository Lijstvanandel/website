import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Search, User, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WijkItem } from "@/types/wijk";

const WijkenEnKernen = () => {
  const [wijken, setWijken] = useState<WijkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "vertegenwoordigd" | "Wijk" | "Kern">("vertegenwoordigd");

  useEffect(() => {
    fetch("/api/wijken")
      .then((res) => (res.ok ? res.json().catch(() => []) : []))
      .then((data: WijkItem[]) => {
        setWijken(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const vertegenwoordigdeWijken = wijken.filter((w) => !!w.vertegenwoordiger);

  const displayedList = wijken.filter((w) => {
    const matchesSearch =
      w.naam.toLowerCase().includes(search.toLowerCase()) ||
      w.gemeente.toLowerCase().includes(search.toLowerCase()) ||
      (w.vertegenwoordiger &&
        `${w.vertegenwoordiger.voornaam} ${w.vertegenwoordiger.achternaam}`
          .toLowerCase()
          .includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (tab === "vertegenwoordigd") return !!w.vertegenwoordiger;
    if (tab === "Wijk") return w.type === "Wijk";
    if (tab === "Kern") return w.type === "Kern";
    return true;
  });

  return (
    <div className="container py-16 md:py-24">
      {/* Header */}
      <div className="max-w-3xl mb-12">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">
          Verken Steenwijkerland
        </div>
        <h1 className="font-display text-6xl md:text-7xl mb-6 border-gold-line pb-5">
          Wijken en kernen
        </h1>
        <p className="text-lg text-muted-foreground">
          Steenwijkerland bestaat uit de historische stad Steenwijk met daaromheen tientallen
          karakteristieke kernen, dorpen en buurtschappen. Ontdek hieronder de actuele status,
          vertegenwoordigers en dossiers van uw eigen woonomgeving.
        </p>
      </div>

      {/* Informatieblok */}
      <aside className="bg-card border border-accent/30 p-6 md:p-8 mb-16 rounded-lg">
        <div className="text-[10px] uppercase tracking-[0.3em] text-accent mb-2">Hoe werkt het</div>
        <h2 className="font-display text-2xl mb-4 border-gold-line pb-4">
          Uw wijk of kern op de kaart
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          Elke wijk en kern heeft een eigen profielpagina met een achtergrondfoto, wijkbeschrijving,
          aanspreekpunt, video's en dossiers. Zo weet u precies wat er speelt en wie u kunt benaderen.
        </p>
        <ul className="grid sm:grid-cols-3 gap-4 text-sm">
          <li className="flex items-start gap-3 bg-muted/30 p-3 rounded border border-border/40">
            <span className="text-accent font-display text-xl leading-none mt-0.5">01</span>
            <span>
              <span className="text-foreground font-medium">Stadswijken</span> liggen binnen de stad
              Steenwijk (bijv. Oostermeenthe, Centrum, De Gagels).
            </span>
          </li>
          <li className="flex items-start gap-3 bg-muted/30 p-3 rounded border border-border/40">
            <span className="text-accent font-display text-xl leading-none mt-0.5">02</span>
            <span>
              <span className="text-foreground font-medium">Kernen</span> zijn alle dorpen en
              buurtschappen in Steenwijkerland (bijv. Giethoorn, Vollenhove, Oldemarkt).
            </span>
          </li>
          <li className="flex items-start gap-3 bg-muted/30 p-3 rounded border border-border/40">
            <span className="text-accent font-display text-xl leading-none mt-0.5">03</span>
            <span>
              <span className="text-foreground font-medium">Aanspreekpunt</span>: per gebied kunt u
              direct mailen of een belafspraak inplannen.
            </span>
          </li>
        </ul>
      </aside>

      {/* Filter & Zoekbalk */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTab("vertegenwoordigd")}
            className={`px-4 py-2 text-xs rounded-full font-medium transition-colors ${
              tab === "vertegenwoordigd"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Met aanspreekpunt ({vertegenwoordigdeWijken.length})
          </button>
          <button
            onClick={() => setTab("all")}
            className={`px-4 py-2 text-xs rounded-full font-medium transition-colors ${
              tab === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Alle gebieden ({wijken.length})
          </button>
          <button
            onClick={() => setTab("Wijk")}
            className={`px-4 py-2 text-xs rounded-full font-medium transition-colors ${
              tab === "Wijk"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Stadswijken ({wijken.filter((w) => w.type === "Wijk").length})
          </button>
          <button
            onClick={() => setTab("Kern")}
            className={`px-4 py-2 text-xs rounded-full font-medium transition-colors ${
              tab === "Kern"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Kernen & Dorpen ({wijken.filter((w) => w.type === "Kern").length})
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek een wijk of kern..."
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Grid met wijken & kernen */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-accent mb-2" />
          Wijken en kernen laden...
        </div>
      ) : displayedList.length === 0 ? (
        <div className="p-12 text-center bg-card border border-border rounded-lg">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-60" />
          <h3 className="font-display text-xl mb-1">Geen wijken of kernen gevonden</h3>
          <p className="text-xs text-muted-foreground">
            Probeer een andere zoekterm of bekijk alle gebieden.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedList.map((w) => {
            const rep = w.vertegenwoordiger;
            const repName = rep ? `${rep.voornaam} ${rep.achternaam}` : null;

            return (
              <Link
                key={w.slug}
                to={`/wijken-en-kernen/${w.slug}`}
                className="group bg-card border border-border rounded-lg overflow-hidden hover-lift flex flex-col justify-between transition-all hover:border-accent/50 shadow-sm"
              >
                {/* Banner thumbnail */}
                <div className="relative h-36 w-full overflow-hidden bg-muted">
                  <img
                    src={w.bannerUrl || "/assets/steenwijk-aerial.jpg"}
                    alt={w.naam}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/assets/steenwijk-aerial.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-2.5 left-2.5">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-semibold uppercase ${
                        w.type === "Wijk"
                          ? "bg-accent text-accent-foreground"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {w.type}
                    </Badge>
                  </div>
                  <div className="absolute bottom-2.5 left-3 right-3">
                    <h3 className="font-display text-2xl text-white font-bold leading-tight drop-shadow">
                      {w.naam}
                    </h3>
                  </div>
                </div>

                {/* Info block */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {w.beschrijving || `Bekijk de actuele dossiers en ontwikkelingen in ${w.naam}.`}
                  </p>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-3 text-xs">
                    {repName ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0 border border-accent/30">
                          {rep?.fotoUrl ? (
                            <img
                              src={rep.fotoUrl}
                              alt={repName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/assets/silhouette.png";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <User className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-foreground truncate">{repName}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Fractie aanspreekpunt</span>
                    )}

                    <span className="text-accent flex items-center gap-1 shrink-0 text-xs font-semibold group-hover:translate-x-1 transition-transform">
                      Bekijk wijk <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WijkenEnKernen;
