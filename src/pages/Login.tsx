import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  CheckCircle2,
  Users,
  Bell,
  Vote,
  Calendar,
  ArrowRight,
  Sparkles,
  KeyRound,
  Mail,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";

const loginSchema = z.object({
  username: z.string().min(1, "Gebruikersnaam of e-mailadres is verplicht"),
  password: z.string().min(1, "Wachtwoord is verplicht"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const memberBenefits = [
  {
    icon: Users,
    text: "Ontmoet u andere LVA'ers die de gemeente een warm hart toedragen",
  },
  {
    icon: Bell,
    text: "Wordt u regelmatig op de hoogte gehouden met wat speelt in de gemeente",
  },
  {
    icon: Vote,
    text: "Kunt u actief participeren in het democratisch proces via het ledenportaal",
  },
  {
    icon: Calendar,
    text: "Krijgt u toegang tot tal van evenementen in Steenwijkerland",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const redirectUrl = searchParams.get("redirect");

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingForgot, setIsSendingForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [previewResetUrl, setPreviewResetUrl] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Inloggen mislukt");
      }

      login(result.user, result.token);
      toast.success("Succesvol ingelogd", {
        description: `Welkom terug, ${result.user.name || result.user.username}!`,
      });
      navigate(redirectUrl || "/dashboard");
    } catch (err) {
      const error = err as Error;
      toast.error("Fout bij inloggen", {
        description: error.message || "Er is een onbekende fout opgetreden",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error("Vul uw e-mailadres in");
      return;
    }

    setIsSendingForgot(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Kon herstellink niet verzenden");
      }

      setForgotSent(true);
      if (data.previewResetUrl) {
        setPreviewResetUrl(data.previewResetUrl);
      }
      toast.success("Herstellink verzonden!", {
        description: data.message,
      });
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Er is een fout opgetreden");
    } finally {
      setIsSendingForgot(false);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-12 md:py-20 px-4">
      <div className="text-center mb-10 md:mb-12">
        <h1 className="text-3xl md:text-5xl font-display mb-3">Inloggen Ledenportaal</h1>
        <p className="text-foreground/80 max-w-lg mx-auto text-base">
          Welkom terug bij Lijst van Andel. Log in met uw account om toegang te krijgen tot uw persoonlijke omgeving.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Inloggen Formulier Card */}
        <div className="lg:col-span-6 bg-card p-6 sm:p-8 rounded-xl shadow-lg border border-accent/20">
          <h2 className="text-xl font-display mb-1 text-foreground">Account inloggen</h2>
          <p className="text-xs text-foreground/70 mb-4">
            Vul uw gebruikersnaam of e-mailadres en wachtwoord in om verder te gaan.
          </p>

          {redirectUrl && (
            <div className="mb-5 p-3 rounded-lg bg-accent/10 border border-accent/30 text-xs text-foreground flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-accent shrink-0" />
              <span>Log in met uw account om direct door te gaan naar uw sollicitatie of aanmelding.</span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gebruikersnaam of e-mailadres</FormLabel>
                    <FormControl>
                      <Input placeholder="Gebruikersnaam of e-mailadres" {...field} />
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Wachtwoord</FormLabel>
                      <button
                        type="button"
                        onClick={() => setForgotOpen(true)}
                        className="text-xs text-accent hover:underline focus:outline-none font-medium"
                      >
                        Wachtwoord vergeten?
                      </button>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="Uw wachtwoord" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11"
                disabled={isLoading}
              >
                {isLoading ? "Bezig met inloggen..." : "Inloggen"}
              </Button>
            </form>
          </Form>

          <div className="mt-8 pt-6 border-t border-accent/20 text-center">
            <p className="text-sm text-foreground/80 mb-3">Nog geen account?</p>
            <Link to={redirectUrl ? `/registreren?redirect=${encodeURIComponent(redirectUrl)}` : "/registreren"}>
              <Button
                variant="outline"
                className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground font-medium"
              >
                Word lid (Registreren)
              </Button>
            </Link>
          </div>
        </div>

        {/* Voordelen als lid Vak */}
        <div className="lg:col-span-6 bg-accent/5 border border-accent/30 rounded-xl p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent/15 text-accent">
                <CheckCircle2 className="w-5 h-5 text-accent" />
              </span>
              <h2 className="text-xl md:text-2xl font-display text-foreground">
                Voordelen als lid
              </h2>
            </div>
            <p className="text-sm text-foreground/80 mb-6 leading-relaxed">
              Als lid van Lijst van Andel staat u dicht bij de lokale politiek van Steenwijkerland en bouwt u actief mee aan een betrokken en sterke gemeenschap.
            </p>

            <ul className="space-y-4">
              {memberBenefits.map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <li
                    key={index}
                    className="flex items-start gap-3.5 p-3 rounded-lg bg-background/60 border border-accent/15 backdrop-blur-sm transition-colors hover:border-accent/35"
                  >
                    <div className="shrink-0 mt-0.5 w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center text-accent">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-foreground/90 font-medium leading-snug">
                      {benefit.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-accent/20">
            <p className="text-xs text-foreground/70 mb-3">
              Samen bereiken we meer voor Steenwijk en alle kernen.
            </p>
            <Link to={redirectUrl ? `/registreren?redirect=${encodeURIComponent(redirectUrl)}` : "/registreren"}>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold flex items-center justify-center gap-2">
                <span>Sluit u vandaag nog aan</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* DIALOG: WACHTWOORD VERGETEN */}
      <Dialog
        open={forgotOpen}
        onOpenChange={(open) => {
          setForgotOpen(open);
          if (!open) {
            setTimeout(() => {
              setForgotSent(false);
              setForgotEmail("");
              setPreviewResetUrl(null);
            }, 300);
          }
        }}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-2 ring-8 ring-accent/5">
              <KeyRound className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-display font-bold text-foreground">
              Wachtwoord vergeten
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Voer het e-mailadres van uw ledenaccount in. Wij sturen u direct een veilige herstellink om een nieuw wachtwoord in te stellen.
            </DialogDescription>
          </DialogHeader>

          {forgotSent ? (
            <div className="space-y-4 py-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <div className="font-semibold text-emerald-800 dark:text-emerald-300">E-mail verstuurd</div>
                  <p>
                    Als het e-mailadres <strong>{forgotEmail}</strong> bij ons bekend is, heeft u een e-mail ontvangen met instructies en een link om uw wachtwoord opnieuw in te stellen.
                  </p>
                </div>
              </div>

              {previewResetUrl && (
                <div className="p-3 bg-secondary/50 rounded-lg border border-border text-xs space-y-1.5">
                  <span className="font-semibold text-foreground block">Testlink voor deze sessie:</span>
                  <a href={previewResetUrl} className="text-accent hover:underline break-all block text-[11px]">
                    {previewResetUrl}
                  </a>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotOpen(false)}
                className="w-full text-xs h-10 mt-2"
              >
                Sluiten en terug naar inloggen
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider block text-foreground">
                  E-mailadres
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="uw-naam@voorbeeld.nl"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="pl-9"
                    autoFocus
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <Button type="submit" disabled={isSendingForgot} className="w-full h-11 text-sm font-semibold">
                {isSendingForgot ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Versturen...</> : "Verstuur herstellink"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
