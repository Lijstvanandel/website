import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Users, Bell, Vote, Calendar, ArrowRight, Sparkles } from "lucide-react";
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
import { useAuth } from "@/context/AuthContext";

const loginSchema = z.object({
  username: z.string().min(1, "Gebruikersnaam is verplicht"),
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
        description: `Welkom terug, ${result.user.username}!`,
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
            Vul uw gebruikersnaam en wachtwoord in om verder te gaan.
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
                    <FormLabel>Gebruikersnaam</FormLabel>
                    <FormControl>
                      <Input placeholder="Uw gebruikersnaam" {...field} />
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
    </div>
  );
}
