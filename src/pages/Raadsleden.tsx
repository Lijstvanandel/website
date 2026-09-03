import { useState, useEffect } from "react";
import { Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BelafspraakDialog } from "@/components/BelafspraakDialog";
import { FractielidWidget, FractielidItem } from "@/components/FractielidWidget";
import { StemgedragSection } from "@/components/StemgedragSection";

interface VideoItem {
  id: string;
  fractieledenIds?: string[];
}

const Raadsleden = () => {
  const [belOpen, setBelOpen] = useState(false);
  const [voorgeselecteerd, setVoorgeselecteerd] = useState<string | undefined>(undefined);
  const [leden, setLeden] = useState<FractielidItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/fractieleden").then((res) => (res.ok ? res.json().catch(() => []) : [])),
      fetch("/api/videos").then((res) => (res.ok ? res.json().catch(() => []) : [])),
    ])
      .then(([ledenData, videosData]) => {
        if (Array.isArray(ledenData)) setLeden(ledenData);
        if (Array.isArray(videosData)) setVideos(videosData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openMet = (lid: FractielidItem) => {
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
      <div className="mb-12 bg-gradient-to-br from-twente-red-deep to-card border border-accent/30 p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5 justify-between rounded-sm">
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
        <Button
          onClick={() => {
            setVoorgeselecteerd(undefined);
            setBelOpen(true);
          }}
          size="lg"
          className="bg-primary hover:bg-primary/90 uppercase tracking-wider font-semibold whitespace-nowrap"
        >
          <Phone className="w-4 h-4 mr-2" /> Plan een gesprek
        </Button>
      </div>

      {/* Fractieleden Grid met 'Bekijk video's' knop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {loading && (
          <div className="col-span-2 text-center text-muted-foreground py-10">
            Fractieleden laden...
          </div>
        )}

        {!loading && leden.length === 0 && (
          <div className="col-span-2 text-center text-muted-foreground py-10">
            Nog geen fractieleden toegevoegd via het dashboard.
          </div>
        )}

        {leden.map((lid) => {
          const memberVideosCount = videos.filter((v) =>
            v.fractieledenIds?.map(String).includes(String(lid.id))
          ).length;

          return (
            <FractielidWidget
              key={lid.id}
              lid={lid}
              videoCount={memberVideosCount}
              onPlanBelafspraak={openMet}
              showVideoButton={true}
            />
          );
        })}
      </div>

      {/* Extra sectie onder de fractieleden: Stemgedrag */}
      <StemgedragSection />

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
