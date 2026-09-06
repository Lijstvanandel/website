import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Mail, CheckCircle2, AlertCircle, RefreshCw, ArrowLeft, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function NieuwsbriefAfmelden() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const tokenParam = searchParams.get("token") || "";

  const [email, setEmail] = useState(emailParam);
  const [loading, setLoading] = useState(false);
  const [resubscribing, setResubscribing] = useState(false);
  const [isUnsubscribed, setIsUnsubscribed] = useState(false);
  const [resubscribed, setResubscribed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Automatically process unsubscribe if email is passed from link
  useEffect(() => {
    if (emailParam) {
      handleUnsubscribe(emailParam, tokenParam);
    }
  }, [emailParam, tokenParam]);

  const handleUnsubscribe = async (targetEmail: string, targetToken?: string) => {
    if (!targetEmail || !targetEmail.includes("@")) {
      setErrorMsg("Vul alstublieft een geldig e-mailadres in.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, token: targetToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon afmelding niet verwerken.");

      setIsUnsubscribed(true);
      setResubscribed(false);
      toast.success("U bent succesvol afgemeld voor de nieuwsbrief.");
    } catch (err: any) {
      setErrorMsg(err.message || "Er is een fout opgetreden bij het afmelden.");
    } finally {
      setLoading(false);
    }
  };

  const handleResubscribe = async () => {
    if (!email || !email.includes("@")) return;
    setResubscribing(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon niet opnieuw aanmelden.");

      setResubscribed(true);
      setIsUnsubscribed(false);
      toast.success("U bent weer opnieuw aangemeld voor de nieuwsbrief!");
    } catch (err: any) {
      toast.error(err.message || "Fout bij opnieuw aanmelden.");
    } finally {
      setResubscribing(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 bg-muted/20">
      <Card className="max-w-md w-full border-accent/30 shadow-lg bg-card">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center mb-3">
            {isUnsubscribed ? (
              <CheckCircle2 className="w-8 h-8 text-accent" />
            ) : resubscribed ? (
              <HeartHandshake className="w-8 h-8 text-emerald-500" />
            ) : (
              <Mail className="w-7 h-7 text-accent" />
            )}
          </div>
          <CardTitle className="font-display text-2xl">
            {isUnsubscribed
              ? "U bent afgemeld"
              : resubscribed
              ? "Opnieuw aangemeld!"
              : "Afmelden voor de nieuwsbrief"}
          </CardTitle>
          <CardDescription className="text-sm">
            {isUnsubscribed
              ? "U ontvangt voortaan geen algemene nieuwsbrieven meer van Lijst van Andel."
              : resubscribed
              ? "Fijn dat u verbonden blijft! U ontvangt voortaan weer onze periodieke updates."
              : "Vul uw e-mailadres in om uw uitschrijving direct te bevestigen."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isUnsubscribed ? (
            <div className="space-y-4">
              <div className="bg-muted/40 p-3.5 rounded border border-border/60 text-xs text-muted-foreground space-y-1">
                <div>Afmeldingsbevestiging voor: <strong className="text-foreground">{email}</strong></div>
                <div>Status: <span className="text-rose-500 font-medium">Uitgeschreven</span></div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={handleResubscribe}
                  disabled={resubscribing}
                  className="w-full text-xs font-semibold uppercase tracking-wider border-accent/40 text-accent hover:bg-accent/10"
                >
                  {resubscribing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" />
                  ) : null}
                  Per ongeluk afgemeld? Weer aanmelden
                </Button>

                <Link to="/" className="w-full">
                  <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Terug naar de website
                  </Button>
                </Link>
              </div>
            </div>
          ) : resubscribed ? (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 p-3.5 rounded border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300">
                Uw e-mailadres <strong>{email}</strong> staat weer ingeschreven op onze nieuwsbrief.
              </div>

              <Link to="/" className="w-full block">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold uppercase tracking-wider text-xs">
                  <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Terug naar de website
                </Button>
              </Link>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUnsubscribe(email);
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                  Uw E-mailadres
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bijv. naam@domein.nl"
                  className="bg-background border-border"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold uppercase tracking-wider text-xs py-2.5"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Bezig met verwerken...
                  </span>
                ) : (
                  "Definitief afmelden"
                )}
              </Button>

              <div className="text-center pt-2">
                <Link to="/" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1.5">
                  <ArrowLeft className="w-3 h-3" /> Annuleren en terug naar homepage
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
