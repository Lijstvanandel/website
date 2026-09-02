import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  address: z.string().min(5, "Adres is verplicht"),
  city: z.string().min(2, "Woonplaats is verplicht"),
  username: z.string().min(3, "Gebruikersnaam moet minimaal 3 tekens zijn"),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 tekens zijn"),
  remarks: z.string().optional(),
  directDebit: z.boolean().default(false),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      salutation: "",
      fullName: "",
      address: "",
      city: "",
      username: "",
      password: "",
      remarks: "",
      directDebit: false,
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
        description: "Je kunt nu inloggen met je nieuwe account.",
      });
      navigate("/login");
    } catch (error: any) {
      toast.error("Fout bij registratie", {
        description: error.message,
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
                    <Input placeholder="Woonplaats" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    <Textarea placeholder="Heeft u nog opmerkingen?" {...field} />
                  </FormControl>
                  <FormMessage />
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
                    <FormLabel>
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
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Bezig met registreren..." : "Registreer als lid"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
