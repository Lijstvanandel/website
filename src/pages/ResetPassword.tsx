import React, { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Eye, EyeOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get("token") || "").trim();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [requestEmail, setRequestEmail] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Wachtwoord moet minimaal 6 tekens bevatten");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("De wachtwoorden komen niet overeen");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Wachtwoord herstellen mislukt");
      }

      setIsSuccess(true);
      toast.success("Wachtwoord succesvol gewijzigd!");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Er is een fout opgetreden");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmail.trim()) {
      toast.error("Vul uw e-mailadres in");
      return;
    }
    setIsRequesting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: requestEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon herstellink niet verzenden");
      setRequestSuccess(true);
      toast.success("Als dit e-mailadres bij ons bekend is, ontvangt u een herstellink.");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Er is een fout opgetreden");
    } finally {
      setIsRequesting(false);
    }
  };

  if (!token) {
    return (
      <div className="container max-w-md mx-auto py-20 px-4">
        <div className="bg-card p-8 rounded-2xl shadow-lg border border-border space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto ring-8 ring-primary/5">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Wachtwoord vergeten
            </h1>
            <p className="text-sm text-muted-foreground">
              Vul uw e-mailadres in om een herstellink te ontvangen voor uw ledenaccount.
            </p>
          </div>

          {requestSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">E-mail verstuurd</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Als het e-mailadres bij ons bekend is, ontvangt u binnen enkele minuten een e-mail met een herstellink.
                </p>
              </div>
              <Link to="/login">
                <Button variant="outline" className="w-full mt-2">
                  Terug naar inloggen
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                  E-mailadres
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="uw-adres@voorbeeld.nl"
                    value={requestEmail}
                    onChange={(e) => setRequestEmail(e.target.value)}
                    required
                    className="pl-9"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <Button type="submit" disabled={isRequesting} className="w-full h-11 text-sm font-semibold">
                {isRequesting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Versturen...</> : "Verstuur herstellink"}
              </Button>
            </form>
          )}

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Terug naar inloggen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-20 px-4">
      <div className="bg-card p-8 rounded-2xl shadow-lg border border-border space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto ring-8 ring-primary/5">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Nieuw wachtwoord instellen
          </h1>
          <p className="text-sm text-muted-foreground">
            Kies een veilig nieuw wachtwoord voor uw ledenaccount.
          </p>
        </div>

        {isSuccess ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Wachtwoord gewijzigd</h3>
              <p className="text-xs text-muted-foreground">
                U kunt nu inloggen met uw nieuwe wachtwoord.
              </p>
            </div>
            <Link to="/login">
              <Button className="w-full mt-2">
                Naar inloggen
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                Nieuw wachtwoord
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimaal 6 tekens"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                Bevestig nieuw wachtwoord
              </label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Herhaal wachtwoord"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-11 text-sm font-semibold">
              {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Bezig met opslaan...</> : "Wachtwoord opslaan"}
            </Button>
          </form>
        )}

        <div className="text-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Terug naar inloggen
          </Link>
        </div>
      </div>
    </div>
  );
}
