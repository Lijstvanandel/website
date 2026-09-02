import { useState } from "react";
import { ChevronDown, Vote, Shield, Globe, Landmark, Home, Map, Briefcase, Heart, Leaf, Cpu, FileText, BookOpen, Video, Library } from "lucide-react";
import { hoofdstukken, type Standpunt } from "@/data/partijprogramma";

const iconMap: Record<string, typeof Vote> = {
  vote: Vote, shield: Shield, globe: Globe, landmark: Landmark, home: Home,
  map: Map, briefcase: Briefcase, heart: Heart, leaf: Leaf, cpu: Cpu,
};

type TabKey = "standpunt" | "verdieping" | "bijdragen" | "bronnen";

const tabs: { key: TabKey; label: string; icon: typeof FileText }[] = [
  { key: "standpunt", label: "Standpunt", icon: FileText },
  { key: "verdieping", label: "Verdieping", icon: BookOpen },
  { key: "bijdragen", label: "Bijdragen", icon: Video },
  { key: "bronnen", label: "Bronnen", icon: Library },
];

const StandpuntCard = ({ s }: { s: Standpunt }) => {
  const [tab, setTab] = useState<TabKey>("standpunt");

  return (
    <div className="bg-secondary/40 border border-border p-5 md:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="font-display text-3xl text-accent leading-none shrink-0 w-9">
          {s.nr.toString().padStart(2, "0")}
        </div>
        <h3 className="font-display text-xl md:text-2xl leading-tight pt-1">{s.titel}</h3>
      </div>

      <div className="flex flex-wrap gap-1 mb-4 border-b border-border">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-widest font-semibold border-b-2 -mb-px transition-colors ${
                active
                  ? "text-accent border-accent"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.key === "bijdragen" && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                  {s.bijdragen}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="text-sm text-foreground/85 leading-relaxed min-h-[80px]">
        {tab === "standpunt" && <p>{s.standpunt}</p>}

        {tab === "verdieping" && <p className="italic text-muted-foreground">{s.verdieping}</p>}

        {tab === "bijdragen" && (
          s.videos && s.videos.length > 0 ? (
            <div className="space-y-4">
              {s.videos.map((v, i) => (
                <div key={i} className="space-y-2">
                  {v.titel && (
                    <div className="text-xs uppercase tracking-widest text-accent font-semibold">{v.titel}</div>
                  )}
                  <video controls preload="metadata" className="w-full rounded border border-border bg-black">
                    <source src={v.url} type="video/mp4" />
                    Je browser ondersteunt deze video niet.
                  </video>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic">
              Er zijn nog geen video-bijdragen aan dit standpunt. Zodra er in de raad over wordt gesproken,
              komen de video's hier te staan.
            </p>
          )
        )}

        {tab === "bronnen" && (
          <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
            {s.bronnen.map((b, i) => (
              <li key={i} className="leading-relaxed">{b}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

const Standpunten = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="container py-16 md:py-24">
      <div className="max-w-3xl mb-16">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Partijprogramma</div>
        <h1 className="font-display text-6xl md:text-7xl mb-6 border-gold-line pb-5">Onze Standpunten</h1>
        <p className="text-lg text-muted-foreground">
          Tien hoofdstukken die samen onze visie vormen voor Steenwijkerland.
          Per standpunt vindt u het standpunt zelf, verdieping, video-bijdragen en bronnen.
        </p>
      </div>

      <div className="space-y-4 max-w-6xl">
        {hoofdstukken.map((h, idx) => {
          const isOpen = openIdx === idx;
          const Icon = iconMap[h.iconKey] ?? FileText;
          // Split intro: first sentence as teaser, rest shown when expanded
          const paragraphs = h.intro.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
          const firstPara = paragraphs[0] ?? "";
          const sentenceMatch = firstPara.match(/^(.*?[.!?])(\s|$)/);
          const teaser = sentenceMatch ? sentenceMatch[1] : firstPara;
          const restOfFirst = sentenceMatch ? firstPara.slice(sentenceMatch[0].length).trim() : "";
          const remainingParagraphs = [
            ...(restOfFirst ? [restOfFirst] : []),
            ...paragraphs.slice(1),
          ];
          return (
            <article key={h.nr} className="bg-card border border-border overflow-hidden hover:border-accent/50 transition-colors">
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full grid md:grid-cols-[110px_1fr_auto] gap-0 text-left items-center"
              >
                <div className="hidden md:flex items-center justify-center self-stretch bg-gradient-to-br from-twente-red-deep to-card border-r border-accent/20">
                  <div className="text-center p-4">
                    <Icon className="w-7 h-7 text-accent mx-auto mb-2" />
                    <div className="font-display text-3xl text-gradient-gold leading-none">{h.nr.toString().padStart(2, "0")}</div>
                  </div>
                </div>
                <div className="p-6 md:p-7">
                  <div className="flex items-center gap-3 mb-2 md:hidden">
                    <Icon className="w-5 h-5 text-accent" />
                    <span className="text-xs uppercase tracking-widest text-accent font-semibold">Hoofdstuk {h.nr}</span>
                  </div>
                  <h2 className="font-display text-2xl md:text-3xl mb-2 leading-tight">{h.titel}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{teaser}</p>
                </div>
                <div className="px-6 pb-6 md:py-7 md:pr-7 flex md:items-center">
                  <ChevronDown className={`w-6 h-6 text-accent transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </button>
              {isOpen && (
                <div className="px-6 md:px-7 pb-8 md:ml-[110px] animate-fade-up">
                  {remainingParagraphs.length > 0 && (
                    <div className="border-t border-accent/20 pt-6 mb-6 space-y-4 text-sm md:text-base text-foreground/85 leading-relaxed max-w-4xl">
                      {remainingParagraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  )}
                  <div className={`${remainingParagraphs.length > 0 ? "" : "border-t border-accent/20 pt-6"} mb-6 text-xs uppercase tracking-[0.25em] text-accent`}>
                    Wij willen:
                  </div>
                  <div className="grid lg:grid-cols-2 gap-4">
                    {h.standpunten.map(s => (
                      <StandpuntCard key={s.nr} s={s} />
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default Standpunten;
