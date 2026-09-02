import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Phone, Clock } from "lucide-react";

interface BelafspraakDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRaadslid?: string;
}

const RAADSLEDEN_OPTIES = [
  "Sammy — Raadslid · Fractievoorzitter",
  "Lisa Mars — Raadslid",
  "Nathan ten Wolde — Burgerraadslid",
  "Chris van Andel — Burgerraadslid",
  "Stef Mars — Wijkvertegenwoordiger Oostermeenthe",
];

const DAGEN = ["Woensdag", "Donderdag", "Vrijdag"];

const TIJDSLOTS = [
  "19:00 – 19:30",
  "19:30 – 20:00",
  "20:00 – 20:30",
  "20:30 – 21:00",
];

export const BelafspraakDialog = ({ open, onOpenChange, defaultRaadslid }: BelafspraakDialogProps) => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    raadslid: defaultRaadslid ?? "",
    dag: "", tijd: "", onderwerp: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.raadslid || !form.dag || !form.tijd) {
      toast({ title: "Vul alle verplichte velden in", variant: "destructive" });
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
    toast({ title: "Belafspraak ingepland!", description: "U ontvangt een bevestiging per e-mail." });
  };

  const reset = () => {
    setSubmitted(false);
    setForm({ name: "", email: "", phone: "", raadslid: defaultRaadslid ?? "", dag: "", tijd: "", onderwerp: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); }}>
      <DialogContent className="max-w-lg bg-card border-accent/30">
        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 mx-auto text-accent" />
            <h3 className="font-display text-3xl text-gradient-gold">Bedankt, {form.name.split(" ")[0]}!</h3>
            <p className="text-muted-foreground">
              Uw belafspraak met <span className="text-accent font-semibold">{form.raadslid.split(" — ")[0]}</span> op{" "}
              <span className="text-foreground">{form.dag.toLowerCase()} {form.tijd}</span> is ingepland.
              We bellen u op het opgegeven nummer.
            </p>
            <Button onClick={reset} className="bg-primary hover:bg-primary/90 mt-4">Sluiten</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-accent mb-2">
                <Phone className="w-5 h-5" />
                <span className="text-xs uppercase tracking-widest font-semibold">Belafspraak inplannen</span>
              </div>
              <DialogTitle className="font-display text-3xl">Plan een gesprek</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                <span>Woensdag, donderdag of vrijdag tussen 19:00 en 21:00 — max. 30 minuten.</span>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div>
                <Label htmlFor="raadslid">Met wie wilt u spreken? *</Label>
                <Select value={form.raadslid} onValueChange={(v) => setForm({ ...form, raadslid: v })}>
                  <SelectTrigger><SelectValue placeholder="Kies een raadslid" /></SelectTrigger>
                  <SelectContent>
                    {RAADSLEDEN_OPTIES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dag">Dag *</Label>
                  <Select value={form.dag} onValueChange={(v) => setForm({ ...form, dag: v })}>
                    <SelectTrigger><SelectValue placeholder="Kies dag" /></SelectTrigger>
                    <SelectContent>
                      {DAGEN.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tijd">Tijdslot *</Label>
                  <Select value={form.tijd} onValueChange={(v) => setForm({ ...form, tijd: v })}>
                    <SelectTrigger><SelectValue placeholder="Kies tijd" /></SelectTrigger>
                    <SelectContent>
                      {TIJDSLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="bname">Naam *</Label>
                  <Input id="bname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} required />
                </div>
                <div>
                  <Label htmlFor="bphone">Telefoon *</Label>
                  <Input id="bphone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} required />
                </div>
              </div>
              <div>
                <Label htmlFor="bemail">E-mail</Label>
                <Input id="bemail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
              </div>
              <div>
                <Label htmlFor="onderwerp">Onderwerp (optioneel)</Label>
                <Textarea id="onderwerp" value={form.onderwerp} onChange={(e) => setForm({ ...form, onderwerp: e.target.value })} maxLength={500} rows={3} placeholder="Waar wilt u over praten?" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 font-semibold uppercase tracking-wider">
                {loading ? "Versturen..." : "Belafspraak inplannen"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
