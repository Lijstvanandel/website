import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, CreditCard, ShieldCheck, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const registerSchema = z.object({
  salutation: z.string().min(1, "Aanhef is verplicht"),
  fullName: z.string().min(2, "Naam is verplicht"),
  email: z.string().email("Ongeldig e-mailadres").min(5, "E-mailadres is verplicht"),
  address: z.string().min(5, "Adres is verplicht"),
  city: z.string().min(2, "Woonplaats is verplicht"),
  username: z.string().min(3, "Gebruikersnaam moet minimaal 3 tekens zijn"),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 tekens zijn"),
  remarks: z.string().optional(),
  directDebit: z.boolean().default(false),
  newsletterSubscribed: z.boolean().default(true),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

interface MembershipConfig {
  enabled: boolean;
  amount: number;
  currency: string;
  interval: string;
  productName: string;
  description: string;
  requirePaymentAtRegistration: boolean;
  isStripeConfigured: boolean;
}

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [membershipConfig, setMembershipConfig] = useState<MembershipConfig | null>(null);
  const [registeredPaymentInfo, setRegisteredPaymentInfo] = useState<{ checkoutUrl: string; sessionId?: string } | null>(null);

  // Verification states when returning from Stripe Checkout
  const isPaymentSuccess = searchParams.get("payment_success") === "true";
  const isPaymentCancelled = searchParams.get("payment_cancelled") === "true";
  const sessionId = searchParams.get("session_id");

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const redirectUrl = searchParams.get("redirect");

  // Load membership configuration
  useEffect(() => {
    fetch("/api/membership/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setMembershipConfig(data);
      })
      .catch(() => {
        // Fallback default
        setMembershipConfig({
          enabled: true,
          amount: 12.0,
          currency: "eur",
          interval: "year",
          productName: "Lidmaatschap Lijst van Andel (1 jaar)",
          description: "Jaarlijkse contributie voor partijleden",
          requirePaymentAtRegistration: true,
          isStripeConfigured: false,
        });
      });
  }, []);

  // Handle return from Stripe Checkout
  useEffect(() => {
    if (isPaymentSuccess && sessionId) {
      setIsVerifying(true);
      fetch(`/api/checkout/verify-session?sessionId=${encodeURIComponent(sessionId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user && data.token) {
            setVerificationSuccess(true);
            login(data.user, data.token);
            toast.success("Welkom als lid!", {
              description: "Uw contributie is succesvol ontvangen en uw account is geactiveerd.",
            });
          } else {
            setVerificationError(data.error || "Kon de betaling niet verifiëren.");
          }
        })
        .catch((err) => {
          setVerificationError(err.message || "Netwerkfout bij verifiëren van de sessie.");
        })
        .finally(() => {
          setIsVerifying(false);
        });
    }
  }, [isPaymentSuccess, sessionId, login]);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      salutation: "",
      fullName: "",
      email: "",
      address: "",
      city: "",
      username: "",
      password: "",
      remarks: "",
      directDebit: false,
      newsletterSubscribed: true,
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registratie mislukt");
      }

      if (result.checkoutUrl) {
        setRegisteredPaymentInfo({
          checkoutUrl: result.checkoutUrl,
          sessionId: result.sessionId,
        });

        const isInIframe = typeof window !== "undefined" && window.self !== window.top;
        const opened = window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");

        if (!isInIframe && !opened) {
          if (result.checkoutUrl.startsWith("http")) {
            window.location.href = result.checkoutUrl;
          } else {
            navigate(result.checkoutUrl);
          }
        }
        return;
      }

      toast.success("Registratie succesvol!", {
        description: "U kunt nu inloggen met uw nieuwe account.",
      });
      navigate(redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login");
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Fout bij registratie", {
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  // View when user registered and is prompted to complete Stripe Checkout
  if (registeredPaymentInfo) {
    return (
      <div className="container max-w-xl mx-auto py-16 px-4">
        <div className="bg-card p-8 rounded-xl shadow-lg border border-border text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto ring-8 ring-primary/5">
            <CreditCard className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              Account gereed &mdash; Rond uw contributie af
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
              Uw account is succesvol aangemaakt! Voldoe de jaarlijkse lidmaatschapscontributie van €
              {membershipConfig ? membershipConfig.amount.toFixed(2) : "12,00"} om uw lidmaatschap direct te activeren.
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 text-xs text-left text-amber-900 dark:text-amber-200 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              Veilig afrekenen via Stripe (nieuw venster)
            </div>
            <p className="leading-relaxed">
              Om clickjacking en phishing te voorkomen, staat Stripe geen betaling toe binnen ingesloten voorvertoningen of iframes. Daarom opent Stripe veilig in een nieuw tabblad.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <a
              href={registeredPaymentInfo.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow transition-colors"
            >
              <span>Naar officiële Stripe betaalpagina</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <Button
              variant="outline"
              onClick={() => navigate("/login")}
              className="w-full text-xs h-10"
            >
              Naar inlogpagina (u kunt later altijd betalen via het dashboard)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // View when returning from Stripe verification
  if (isPaymentSuccess) {
    return (
      <div className="container max-w-xl mx-auto py-16 px-4">
        <div className="bg-card p-8 rounded-xl shadow-lg border border-border text-center">
          {isVerifying ? (
            <div className="py-12 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <h2 className="text-2xl font-bold font-display">Betaling verifiëren...</h2>
              <p className="text-muted-foreground text-sm">
                Een ogenblik geduld alstublieft, we bevestigen uw lidmaatschapsbetaling via Stripe.
              </p>
            </div>
          ) : verificationSuccess ? (
            <div className="py-8 space-y-6">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-3xl font-display font-bold text-foreground">Hartelijk welkom als lid!</h2>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  Uw lidmaatschapscontributie van €
                  {membershipConfig ? membershipConfig.amount.toFixed(2) : "12.00"} voor Lijst van Andel is succesvol voldaan.
                </p>
              </div>

              <div className="bg-secondary/60 p-4 rounded-lg text-sm text-left border border-border/80 space-y-2">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Factuurstatus: Voldaan (1 jaar actief)
                </div>
                <p className="text-xs text-muted-foreground">
                  U heeft nu volledige toegang tot het ledenportaal, fractiestukken en partij-activiteiten.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
                >
                  Naar mijn ledenportaal
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                >
                  Naar startpagina
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 space-y-5">
              <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold font-display">Verificatie mislukt</h2>
              <p className="text-muted-foreground text-sm">
                {verificationError || "We konden uw betaling niet automatisch bevestigen."}
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate("/login")}
                >
                  Inloggen op account
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                >
                  Opnieuw proberen
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const duesAmount = membershipConfig ? membershipConfig.amount : 12.0;

  return (
    <div className="container max-w-2xl mx-auto py-16 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-display mb-2">Word lid</h1>
        <p className="text-foreground/80">Registreer u bij Lijst van Andel en steun onze lokale beweging</p>
      </div>

      {isPaymentCancelled && (
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Betaling geannuleerd</p>
            <p className="text-xs opacity-90 mt-0.5">
              De betaling via Stripe is afgebroken. U kunt zich alsnog registreren of inloggen in uw ledenportaal om de contributie te voldoen.
            </p>
          </div>
        </div>
      )}

      {/* Membership Dues Highlight Banner */}
      <div className="mb-8 rounded-xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-primary/20 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Lidmaatschapscontributie: €{duesAmount.toFixed(2)} per jaar
              </div>
              <div className="text-xs text-muted-foreground">
                Veilig afrekenen via Stripe (iDEAL, Bancontact, Visa/Mastercard)
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Direct lidmaatschap
          </div>
        </div>
      </div>

      <div className="bg-card p-6 md:p-8 rounded-xl shadow-lg border border-border">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="salutation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aanhef</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Kies aanhef" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Dhr.">Dhr.</SelectItem>
                        <SelectItem value="Mevr.">Mevr.</SelectItem>
                        <SelectItem value="Anders">Anders</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Volledige naam</FormLabel>
                    <FormControl>
                      <Input placeholder="Voor- en achternaam" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mailadres</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="uw.naam@voorbeeld.nl" {...field} />
                  </FormControl>
                  <FormDescription>
                    Hierop ontvangt u de betaalbevestiging, factuur en ledencorrespondentie.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adres</FormLabel>
                    <FormControl>
                      <Input placeholder="Straat en huisnummer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Woonplaats</FormLabel>
                    <FormControl>
                      <Input placeholder="Bijv. Steenwijk, Giethoorn..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gebruikersnaam</FormLabel>
                    <FormControl>
                      <Input placeholder="Kies een gebruikersnaam" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wachtwoord</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Kies een veilig wachtwoord" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opmerkingen (optioneel)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Heeft u nog opmerkingen of interessegebieden?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Newsletter Subscription Checkbox */}
            <FormField
              control={form.control}
              name="newsletterSubscribed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-border p-4 bg-muted/30">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer font-medium text-foreground">
                      Ontvang de periodieke Lijst van Andel Nieuwsbrief
                    </FormLabel>
                    <FormDescription>
                      Blijf op de hoogte van actuele standpunten, fractieverslagen en bijeenkomsten in Steenwijkerland.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="directDebit"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer font-medium text-foreground">
                      Jaarlijkse verlenging via Stripe
                    </FormLabel>
                    <FormDescription>
                      U rekent nu €{duesAmount.toFixed(2)} af voor het eerste jaar lidmaatschap.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Bezig met account aanmaken...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Registreren & Contributie afrekenen (€{duesAmount.toFixed(2)})
                </>
              )}
            </Button>

            <div className="mt-4 text-center text-xs text-muted-foreground">
              Al lid van Lijst van Andel?{" "}
              <Link
                to={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login"}
                className="text-primary hover:underline font-semibold"
              >
                Log hier in
              </Link>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
