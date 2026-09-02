import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, token, isAuthenticated, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProfile() {
      if (!token) return;
      try {
        const response = await fetch("/api/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          setProfile(data.user);
        } else {
          toast.error("Sessie verlopen, log opnieuw in.");
          logout();
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated, token, logout]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="container py-20 flex justify-center">
        <p className="text-foreground/70">Gegevens laden...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-16 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-display mb-2">Ledendashboard</h1>
          <p className="text-foreground/80">Welkom terug, {profile?.salutation} {profile?.fullName}</p>
        </div>
        <Button variant="outline" onClick={logout} className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
          <LogOut className="w-4 h-4 mr-2" />
          Uitloggen
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card rounded-lg shadow border border-accent/10 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Uw Profiel</h3>
                <p className="text-sm text-foreground/60">Lid sinds {new Date(profile?.createdAt).getFullYear()}</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-foreground/60">Naam:</span>
                <span className="font-medium text-right">{profile?.fullName}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-foreground/60">Adres:</span>
                <span className="font-medium text-right">{profile?.address}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-foreground/60">Woonplaats:</span>
                <span className="font-medium text-right">{profile?.city}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-foreground/60">Incasso:</span>
                <span className="font-medium text-right flex items-center gap-1">
                  {profile?.directDebit ? <><CheckCircle2 className="w-3 h-3 text-green-500"/> Actief</> : "Niet actief"}
                </span>
              </div>
            </div>
            
            <Button variant="link" className="w-full mt-4 text-accent px-0 h-auto flex items-center justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Gegevens wijzigen
            </Button>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-card rounded-lg shadow border border-accent/10 p-6">
            <h3 className="font-semibold text-xl mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              Exclusief voor leden
            </h3>
            <p className="text-foreground/80 mb-6">
              Binnenkort vindt u hier exclusieve updates, documenten en kunt u zich inschrijven voor interne partijbijeenkomsten.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded border border-border bg-background/50 hover:border-accent/50 transition-colors cursor-pointer">
                <h4 className="font-medium mb-1">Concept Partijprogramma</h4>
                <p className="text-xs text-foreground/60 mb-3">Lees mee met de nieuwste concepten en geef feedback.</p>
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">Lezen &rarr;</span>
              </div>
              <div className="p-4 rounded border border-border bg-background/50 hover:border-accent/50 transition-colors cursor-pointer">
                <h4 className="font-medium mb-1">Interne Agenda</h4>
                <p className="text-xs text-foreground/60 mb-3">Aankomende ledenvergaderingen en brainstormsessies.</p>
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">Bekijken &rarr;</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
