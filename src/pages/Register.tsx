import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const redirectUrl = searchParams.get("redirect");

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

  return (
    <div className="container max-w-2xl mx-auto py-16 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-display mb-2">Word lid</h1>
        <p className="text-foreground/80">Registreer u bij Lijst van Andel</p>
      </div>

      <div className="bg-card p-6 md:p-8 rounded-lg shadow-lg border border-accent/20">
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
                    Hierop ontvangt u uw ledencorrespondentie en (optioneel) de nieuwsbrief.
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
                      <Input placeholder="Bijv. Steenwijk, Oldemarkt..." {...field} />
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
                      <Input type="password" placeholder="Kies een wachtwoord" {...field} />
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
                    <Textarea placeholder="Heeft u nog opmerkingen of specifieke interessegebieden?" {...field} />
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
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-accent/20 p-4 bg-accent/5">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer font-medium">
                      Ontvang de periodieke Lijst van Andel Nieuwsbrief
                    </FormLabel>
                    <FormDescription>
                      Blijf op de hoogte van actuele standpunten, fractieverslagen en evenementen in Steenwijkerland. U kunt dit later altijd aan- of uitzetten in uw dashboard.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="directDebit"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-accent/20 p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer font-medium">
                      Automatische incasso (contributie)
                    </FormLabel>
                    <FormDescription>
                      Ik geef toestemming voor automatische incasso. (Voor nu is registratie gratis, de betaalmodule wordt later gekoppeld.)
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
              disabled={isLoading}
            >
              {isLoading ? "Bezig met registreren..." : "Registreer als lid"}
            </Button>

            <div className="mt-4 text-center text-xs text-foreground/70">
              Al lid van Lijst van Andel?{" "}
              <Link
                to={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login"}
                className="text-accent hover:underline font-semibold"
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
