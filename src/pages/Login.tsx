import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

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
      navigate("/dashboard");
    } catch (error: any) {
      toast.error("Fout bij inloggen", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container max-w-md mx-auto py-20 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-display mb-2">Inloggen</h1>
        <p className="text-foreground/80">Welkom terug bij Lijst van Andel</p>
      </div>

      <div className="bg-card p-6 md:p-8 rounded-lg shadow-lg border border-accent/20">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Bezig met inloggen..." : "Inloggen"}
            </Button>
          </form>
        </Form>

        <div className="mt-8 pt-6 border-t border-accent/20 text-center">
          <p className="text-sm text-foreground/80 mb-4">Nog geen lid?</p>
          <Link to="/registreren">
            <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              Word lid (Registreren)
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
