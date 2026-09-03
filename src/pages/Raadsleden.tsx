import { useState, useEffect } from "react";
import { Phone, Calendar, Mail, Instagram, Facebook, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BelafspraakDialog } from "@/components/BelafspraakDialog";
import { Link } from "react-router-dom";
import { VideoPlayer } from "@/components/VideoPlayer";

const Raadsleden = () => {
  const [belOpen, setBelOpen] = useState(false);
  const [voorgeselecteerd, setVoorgeselecteerd] = useState<string | undefined>(undefined);
  const [leden, setLeden] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/fractieleden").then(res => res.json()).then(setLeden);
    fetch("/api/videos").then(res => res.json()).then(setVideos);
  }, []);

  const openMet = (lid: any) => {
    setVoorgeselecteerd(`${lid.name} — ${lid.role}`);
    setBelOpen(true);
  };

  return (
    <div className="container py-16 md:py-24">
      <div className="max-w-3xl mb-16">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Onze fractie</div>
        <h1 className="font-display text-6xl md:text-7xl mb-6 border-gold-line pb-5">Fractie</h1>
        <p className="text-lg text-muted-foreground">
          Mensen die week in, week uit knokken voor een beter Steenwijkerland — en die u rechtstreeks kunt spreken.
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
        {leden.length === 0 && <div className="col-span-2 text-center text-muted-foreground py-10">Nog geen fractieleden toegevoegd via het dashboard.</div>}
        {leden.map((p) => {
          const personalVideos = videos.filter(v => v.fractieledenIds?.includes(p.id)).slice(0, 3);
          
          return (
          <article key={p.id} className="group relative bg-card border border-border overflow-hidden hover-lift flex flex-col">
            <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-twente-black/80 backdrop-blur border border-accent text-[10px] uppercase tracking-widest text-accent font-semibold">
              {p.role}
            </div>
            <div className="grid grid-cols-[160px_1fr] sm:grid-cols-[200px_1fr]">
              <div className="aspect-[4/5] overflow-hidden bg-muted flex items-center justify-center">
                {p.imgUrl ? (
                  <img src={p.imgUrl} alt={p.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="text-muted-foreground text-xs uppercase tracking-wider">Geen foto</div>
                )}
              </div>
              <div className="p-5 md:p-6 flex flex-col">
                <div className="text-[10px] uppercase tracking-widest text-accent mb-1">{p.type}</div>
                <h3 className="font-display text-3xl mb-3">{p.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.bio}</p>
                
                {p.speerpunten && p.speerpunten.length > 0 && (
                  <ul className="space-y-1.5 mb-4">
                    {p.speerpunten.map((s: string) => (
                      <li key={s} className="flex items-start gap-2 text-xs text-foreground/80">
                        <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
                
                {p.email && (
                  <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 mb-3 break-all">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    {p.email}
                  </a>
                )}
                
                <div className="flex items-center gap-2 mb-4">
                  {p.socials?.instagram && (
                    <a href={p.socials.instagram} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors">
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {p.socials?.facebook && (
                    <a href={p.socials.facebook} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors">
                      <Facebook className="w-4 h-4" />
                    </a>
                  )}
                  {p.socials?.linkedin && (
                    <a href={p.socials.linkedin} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <Button onClick={() => openMet(p)} variant="outline" className="mt-auto border-accent text-accent hover:bg-accent hover:text-accent-foreground uppercase tracking-wider text-xs font-semibold w-fit">
                  <Phone className="w-3.5 h-3.5" /> Belafspraak inplannen
                </Button>
              </div>
            </div>
            
            {/* Videobijdragen sectie */}
            {personalVideos.length > 0 && (
              <div className="border-t border-border p-5 bg-black/20">
                <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-semibold">Laatste Bijdragen ({personalVideos.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {personalVideos.map(v => (
                    <div key={v.id} className="bg-background rounded overflow-hidden border border-border flex flex-col">
                      <div className="aspect-video bg-black flex-shrink-0 relative overflow-hidden">
                        <VideoPlayer url={v.videoUrl} title={v.title} className="w-full h-full" />
                        {v.wijkSlug && (
                          <Link to={`/wijken-en-kernen/${v.wijkSlug}`} className="absolute top-1 left-1 bg-secondary/90 text-secondary-foreground px-1.5 py-0.5 rounded text-[8px] hover:bg-secondary transition-colors z-10">
                            Wijk/Kern
                          </Link>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="text-[9px] uppercase tracking-wider text-accent mb-1">{v.category} • {v.date}</div>
                        <div className="text-xs font-semibold leading-tight line-clamp-2">{v.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        )})}
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
