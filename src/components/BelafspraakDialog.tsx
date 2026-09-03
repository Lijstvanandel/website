import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Phone, Clock, Calendar as CalendarIcon, UserCheck, AlertCircle } from "lucide-react";

interface BelafspraakDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRaadslid?: string;
}

interface FractiePersoon {
  id: string;
  name: string;
  role: string;
  type: string;
  imgUrl?: string;
  linkedUserId?: string | null;
  linkedUsername?: string | null;
}

const FALLBACK_PERSONEN: FractiePersoon[] = [
  { id: "1", name: "Sammy van Andel", role: "Fractievoorzitter", type: "Raadslid" },
  { id: "2", name: "Lisa Mars", role: "Raadslid", type: "Raadslid" },
  { id: "3", name: "Nathan ten Wolde", role: "Burgerraadslid", type: "Burgerraadslid" },
  { id: "4", name: "Chris van Andel", role: "Burgerraadslid", type: "Burgerraadslid" }
];

const TIJDSLOTS = [
  { label: "19:00 – 19:30", start: "19:00", end: "19:30" },
  { label: "19:30 – 20:00", start: "19:30", end: "20:00" },
  { label: "20:00 – 20:30", start: "20:00", end: "20:30" },
  { label: "20:30 – 21:00", start: "20:30", end: "21:00" }
];

// Generate upcoming Wednesday, Thursday, and Friday dates
function getUpcomingAvailableDates() {
  const dates: { dateStr: string; label: string }[] = [];
  const now = new Date();

  // Look ahead 21 days
  for (let i = 0; i < 21; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const day = d.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
    if (day === 3 || day === 4 || day === 5) {
      const dayNames = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
      const monthNames = [
        "januari", "februari", "maart", "april", "mei", "juni",
        "juli", "augustus", "september", "oktober", "november", "december"
      ];
      const dateStr = d.toISOString().split("T")[0];
      const label = `${dayNames[day]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
      dates.push({ dateStr, label });
    }
    if (dates.length >= 6) break;
  }
  return dates;
}

export const BelafspraakDialog = ({ open, onOpenChange, defaultRaadslid }: BelafspraakDialogProps) => {
  const [personen, setPersonen] = useState<FractiePersoon[]>(FALLBACK_PERSONEN);
  const [loadingPersonen, setLoadingPersonen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableDates] = useState(getUpcomingAvailableDates());

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    persoonId: "",
    datum: "",
    tijdslot: "19:00 – 19:30",
    onderwerp: ""
  });

  // Fetch available fractieleden
  useEffect(() => {
    let isMounted = true;
    setLoadingPersonen(true);
    fetch("/api/belafspraken/personen")
      .then((res) => (res.ok ? res.json().catch(() => []) : []))
      .then((data: FractiePersoon[]) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setPersonen(data);
        }
      })
      .catch(() => {
        // Fallback is already initialized
      })
      .finally(() => {
        if (isMounted) setLoadingPersonen(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Pre-fill person whenever defaultRaadslid changes or personen are loaded
  useEffect(() => {
    if (!personen.length) return;

    if (defaultRaadslid) {
      const match = personen.find(p => 
        p.id === defaultRaadslid ||
        `${p.name} — ${p.role}`.toLowerCase() === defaultRaadslid.toLowerCase() ||
        p.name.toLowerCase() === defaultRaadslid.toLowerCase() ||
        defaultRaadslid.toLowerCase().includes(p.name.toLowerCase()) ||
        p.name.toLowerCase().includes(defaultRaadslid.toLowerCase())
      );

      if (match) {
        setForm(prev => ({ ...prev, persoonId: match.id }));
        return;
      }
    }

    // Default to first person or "any"
    if (!form.persoonId && personen.length > 0) {
      setForm(prev => ({ ...prev, persoonId: personen[0].id }));
    }
  }, [defaultRaadslid, personen]);

  // Set default date if empty
  useEffect(() => {
    if (!form.datum && availableDates.length > 0) {
      setForm(prev => ({ ...prev, datum: availableDates[0].dateStr }));
    }
  }, [availableDates]);

  const selectedPerson = personen.find(p => p.id === form.persoonId) || personen[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.datum || !form.tijdslot) {
      toast.error("Vul alle verplichte velden in (naam, telefoon, datum en tijdslot)");
      return;
    }

    const slotObj = TIJDSLOTS.find(s => s.label === form.tijdslot) || TIJDSLOTS[0];

    setLoading(true);
    try {
      const res = await fetch("/api/belafspraken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          fractielidId: selectedPerson?.id,
          fractielidNaam: selectedPerson ? `${selectedPerson.name} — ${selectedPerson.role}` : "Raadslid",
          datum: form.datum,
          startTijd: slotObj.start,
          eindTijd: slotObj.end,
          onderwerp: form.onderwerp.trim()
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Er is een fout opgetreden bij het inplannen.");
      }

      setSubmitted(true);
      toast.success("Belafspraak succesvol ingepland!");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Kon de afspraak niet inplannen. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSubmitted(false);
    setForm({
      name: "",
      email: "",
      phone: "",
      persoonId: personen[0]?.id || "",
      datum: availableDates[0]?.dateStr || "",
      tijdslot: "19:00 – 19:30",
      onderwerp: ""
    });
    onOpenChange(false);
  };

  const selectedDateLabel = availableDates.find(d => d.dateStr === form.datum)?.label || form.datum;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); }}>
      <DialogContent className="max-w-lg bg-card border-accent/30 p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        {submitted ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/20 border border-accent flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </div>
            <h3 className="font-display text-3xl text-gradient-gold">Bedankt, {form.name.split(" ")[0]}!</h3>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
              Uw belafspraak met <span className="text-accent font-semibold">{selectedPerson?.name} ({selectedPerson?.role})</span> op{" "}
              <span className="text-foreground font-semibold">{selectedDateLabel} tussen {form.tijdslot}</span> is succesvol ingepland.
            </p>
            <div className="bg-muted/40 p-4 rounded-sm border border-border/50 text-xs text-left space-y-1.5 text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Phone className="w-3.5 h-3.5 text-accent" /> We bellen u op: <span className="text-accent font-mono">{form.phone}</span>
              </div>
              {form.email && (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 text-center">•</span> Bevestiging wordt verzonden naar: {form.email}
                </div>
              )}
              {form.onderwerp && (
                <div className="pt-1 border-t border-border/40 italic">
                  &ldquo;{form.onderwerp}&rdquo;
                </div>
              )}
            </div>
            <Button onClick={reset} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold uppercase tracking-wider text-xs px-6 py-2.5 mt-2">
              Sluiten
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="space-y-1.5">
              <div className="flex items-center gap-2 text-accent">
                <Phone className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-widest font-semibold">Persoonlijk gesprek</span>
              </div>
              <DialogTitle className="font-display text-3xl">Plan een belafspraak</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>Woensdag, donderdag of vrijdag tussen 19:00 en 21:00 — max. 30 minuten per gesprek.</span>
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-3">
              {/* Met wie wilt u spreken? */}
              <div>
                <Label htmlFor="persoonId" className="text-xs uppercase tracking-wider font-semibold text-foreground/90 flex items-center gap-1.5 mb-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-accent" />
                  Met wie wilt u spreken? *
                </Label>
                <Select
                  value={form.persoonId}
                  onValueChange={(v) => setForm({ ...form, persoonId: v })}
                  disabled={loadingPersonen}
                >
                  <SelectTrigger id="persoonId" className="bg-background border-border">
                    <SelectValue placeholder="Kies een raadslid of burgerraadslid" />
                  </SelectTrigger>
                  <SelectContent>
                    {personen.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {p.role} ({p.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {defaultRaadslid && selectedPerson && (
                  <div className="text-[11px] text-accent mt-1 flex items-center gap-1">
                    <span>Voorgeselecteerd: <strong>{selectedPerson.name}</strong></span>
                  </div>
                )}
              </div>

              {/* Datum en tijdslot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="datum" className="text-xs uppercase tracking-wider font-semibold text-foreground/90 flex items-center gap-1.5 mb-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-accent" />
                    Voorkeursdatum *
                  </Label>
                  <Select
                    value={form.datum}
                    onValueChange={(v) => setForm({ ...form, datum: v })}
                  >
                    <SelectTrigger id="datum" className="bg-background border-border">
                      <SelectValue placeholder="Kies datum" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDates.map(d => (
                        <SelectItem key={d.dateStr} value={d.dateStr}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tijdslot" className="text-xs uppercase tracking-wider font-semibold text-foreground/90 flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    Tijdslot *
                  </Label>
                  <Select
                    value={form.tijdslot}
                    onValueChange={(v) => setForm({ ...form, tijdslot: v })}
                  >
                    <SelectTrigger id="tijdslot" className="bg-background border-border">
                      <SelectValue placeholder="Kies tijdslot" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIJDSLOTS.map(t => (
                        <SelectItem key={t.label} value={t.label}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contactgegevens burger */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="bname" className="text-xs uppercase tracking-wider font-semibold text-foreground/90 mb-1.5 block">
                    Uw naam *
                  </Label>
                  <Input
                    id="bname"
                    placeholder="bijv. Jan Jansen"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    maxLength={100}
                    required
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="bphone" className="text-xs uppercase tracking-wider font-semibold text-foreground/90 mb-1.5 block">
                    Telefoonnummer *
                  </Label>
                  <Input
                    id="bphone"
                    type="tel"
                    placeholder="06 - 12345678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    maxLength={25}
                    required
                    className="bg-background border-border"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bemail" className="text-xs uppercase tracking-wider font-semibold text-foreground/90 mb-1.5 block">
                  E-mailadres (voor bevestiging)
                </Label>
                <Input
                  id="bemail"
                  type="email"
                  placeholder="uw.email@domein.nl"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={255}
                  className="bg-background border-border"
                />
              </div>

              <div>
                <Label htmlFor="onderwerp" className="text-xs uppercase tracking-wider font-semibold text-foreground/90 mb-1.5 block">
                  Onderwerp of korte toelichting (optioneel)
                </Label>
                <Textarea
                  id="onderwerp"
                  value={form.onderwerp}
                  onChange={(e) => setForm({ ...form, onderwerp: e.target.value })}
                  maxLength={500}
                  rows={2}
                  placeholder="Waarover wilt u van gedachten wisselen? Bijv. verkeersveiligheid, woningbouw, wmo..."
                  className="bg-background border-border text-sm"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold uppercase tracking-wider text-xs py-3 h-auto shadow-md"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      Bezig met inplannen...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Belafspraak definitief inplannen
                    </span>
                  )}
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                Geen kosten verbonden. Uw gegevens worden uitsluitend gebruikt voor deze belafspraak.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
