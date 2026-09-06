import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchWithAuth } from "@/lib/api";
import { 
  Briefcase, 
  Mail, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Plus, 
  MapPin, 
  Users, 
  MessageSquare, 
  Check, 
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Eye,
  Pencil
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface VacancyApplication {
  id: string;
  vacancyId: string;
  vacancyTitle: string;
  wijkNaam: string;
  userId: string;
  applicantName: string;
  applicantEmail: string;
  motivation: string;
  status: "nieuw" | "in_behandeling" | "gecontacteerd" | "geaccepteerd" | "afgewezen" | string;
  adminNotes?: string;
  createdAt: string;
}

export interface CustomVacancy {
  id: string;
  title: string;
  category: string;
  wijkNaam: string;
  description: string;
  isOpen: boolean;
  createdAt?: string;
}

export interface WijkItem {
  slug: string;
  naam: string;
  type: string;
  vertegenwoordiger: {
    voornaam?: string;
    achternaam?: string;
  } | null;
}

export function VacancyManager() {
  const { token } = useAuth();
  const [applications, setApplications] = useState<VacancyApplication[]>([]);
  const [customVacancies, setCustomVacancies] = useState<CustomVacancy[]>([]);
  const [wijkenZonderRep, setWijkenZonderRep] = useState<WijkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected application for detail dialog
  const [selectedApp, setSelectedApp] = useState<VacancyApplication | null>(null);

  // Create / Edit custom vacancy dialog
  const [isVacModalOpen, setIsVacModalOpen] = useState(false);
  const [editingVac, setEditingVac] = useState<CustomVacancy | null>(null);
  const [vacTitle, setVacTitle] = useState("");
  const [vacCategory, setVacCategory] = useState("Algemeen");
  const [vacWijk, setVacWijk] = useState("Heel Steenwijkerland");
  const [vacDesc, setVacDesc] = useState("");
  const [vacIsOpen, setVacIsOpen] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [appRes, vacRes, wijkRes] = await Promise.all([
        fetchWithAuth("/api/admin/vacancies/applications"),
        fetchWithAuth("/api/admin/vacancies/custom"),
        fetch("/api/wijken"),
      ]);

      if (appRes.ok) {
        const appData = await appRes.json().catch(() => []);
        setApplications(Array.isArray(appData) ? appData : []);
      }
      if (vacRes.ok) {
        const vacData = await vacRes.json().catch(() => []);
        setCustomVacancies(Array.isArray(vacData) ? vacData : []);
      }
      if (wijkRes.ok) {
        const wijkData: WijkItem[] = await wijkRes.json().catch(() => []);
        if (Array.isArray(wijkData)) {
          const openWijken = wijkData.filter(
            (w) => !w.vertegenwoordiger || !w.vertegenwoordiger.voornaam
          );
          setWijkenZonderRep(openWijken);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Kon gegevens niet ophalen");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      const res = await fetchWithAuth(`/api/admin/vacancies/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Status kon niet worden bijgewerkt");

      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      toast.success("Status bijgewerkt naar: " + newStatus);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Fout bij bijwerken status");
    }
  };

  const handleSaveNotes = async (appId: string, notes: string) => {
    try {
      const res = await fetchWithAuth(`/api/admin/vacancies/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes: notes }),
      });
      if (!res.ok) throw new Error("Notities konden niet worden opgeslagen");

      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, adminNotes: notes } : a))
      );
      toast.success("Beheerdersnotities opgeslagen");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Fout bij opslaan");
    }
  };

  const handleDeleteApplication = async (appId: string) => {
    if (!confirm("Weet u zeker dat u deze aanmelding wilt verwijderen?")) return;
    try {
      const res = await fetchWithAuth(`/api/admin/vacancies/applications/${appId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Kon aanmelding niet verwijderen");

      setApplications((prev) => prev.filter((a) => a.id !== appId));
      if (selectedApp?.id === appId) setSelectedApp(null);
      toast.success("Aanmelding verwijderd");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Fout bij verwijderen");
    }
  };

  const handleOpenVacModal = (vac?: CustomVacancy) => {
    if (vac) {
      setEditingVac(vac);
      setVacTitle(vac.title);
      setVacCategory(vac.category || "Algemeen");
      setVacWijk(vac.wijkNaam || "Heel Steenwijkerland");
      setVacDesc(vac.description || "");
      setVacIsOpen(vac.isOpen !== false);
    } else {
      setEditingVac(null);
      setVacTitle("");
      setVacCategory("Algemeen");
      setVacWijk("Heel Steenwijkerland");
      setVacDesc("");
      setVacIsOpen(true);
    }
    setIsVacModalOpen(true);
  };

  const handleSaveVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vacTitle.trim()) {
      toast.error("Voer een titel in voor de vacature");
      return;
    }

    try {
      const payload = {
        title: vacTitle.trim(),
        category: vacCategory.trim(),
        wijkNaam: vacWijk.trim(),
        description: vacDesc.trim(),
        isOpen: vacIsOpen,
      };

      let res;
      if (editingVac) {
        res = await fetchWithAuth(`/api/admin/vacancies/custom/${editingVac.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetchWithAuth("/api/admin/vacancies/custom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij opslaan");

      toast.success(editingVac ? "Vacature bijgewerkt" : "Vacature succesvol aangemaakt");
      setIsVacModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Fout bij opslaan van vacature");
    }
  };

  const handleDeleteVacancy = async (id: string) => {
    if (!confirm("Weet u zeker dat u deze vacature wilt verwijderen?")) return;
    try {
      const res = await fetchWithAuth(`/api/admin/vacancies/custom/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Kon vacature niet verwijderen");
      toast.success("Vacature verwijderd");
      setCustomVacancies((prev) => prev.filter((v) => v.id !== id));
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Fout bij verwijderen");
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicantEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.vacancyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.wijkNaam.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.motivation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || app.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "nieuw":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> Nieuw
          </span>
        );
      case "in_behandeling":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30">
            <RotateCcw className="w-3 h-3" /> In behandeling
          </span>
        );
      case "gecontacteerd":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30">
            <Mail className="w-3 h-3" /> Gecontacteerd
          </span>
        );
      case "geaccepteerd":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3" /> Geaccepteerd
          </span>
        );
      case "afgewezen":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            Afgewezen
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header Card */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display text-foreground flex items-center gap-3">
              <Briefcase className="w-7 h-7 text-accent" />
              <span>Vacatures & Aanmeldingen</span>
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Beheer openstaande posities en bekijk de motivatiebrieven van leden die zich hebben aangemeld voor wijken en functies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => handleOpenVacModal()}
              className="bg-accent text-accent-foreground font-semibold hover:bg-accent/90 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nieuwe Vacature Toevoegen
            </Button>
            <Button
              variant="outline"
              onClick={fetchData}
              className="flex items-center gap-2 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Vernieuwen
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Totaal Aanmeldingen
            </div>
            <div className="text-2xl font-bold text-foreground mt-1">{applications.length}</div>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold">
              Nieuw / Te beoordelen
            </div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
              {applications.filter((a) => a.status === "nieuw").length}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
            <div className="text-xs uppercase tracking-wider text-accent font-semibold">
              Wijken Zonder Vertegenw.
            </div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {wijkenZonderRep.length}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Maatwerk Vacatures
            </div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {customVacancies.length}
            </div>
          </div>
        </div>
      </div>

      {/* SECTIE 1: AANMELDINGEN MET MOTIVERENDE BESCHRIJVING */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-display text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-accent" />
              <span>Binnengekomen Aanmeldingen</span>
              <span className="text-xs font-normal text-muted-foreground ml-2">
                ({filteredApplications.length} weergegeven)
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hieronder vindt u de volledige motiverende beschrijving van leden die zich hebben aangemeld.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Zoek op lid, wijk of motivatie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm w-full sm:w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs sm:text-sm w-full sm:w-44">
                <SelectValue placeholder="Status filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="nieuw">Nieuw</SelectItem>
                <SelectItem value="in_behandeling">In behandeling</SelectItem>
                <SelectItem value="gecontacteerd">Gecontacteerd</SelectItem>
                <SelectItem value="geaccepteerd">Geaccepteerd</SelectItem>
                <SelectItem value="afgewezen">Afgewezen</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List of Applications */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Gegevens laden...
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-8 text-center bg-muted/20 rounded-xl border border-border/60 text-muted-foreground text-sm">
            {searchQuery || statusFilter !== "all"
              ? "Geen aanmeldingen gevonden die voldoen aan het zoekfilter."
              : "Er zijn momenteel nog geen aanmeldingen binnengekomen via het ledendashboard."}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app) => (
              <div
                key={app.id}
                className="p-5 sm:p-6 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-all space-y-4 shadow-sm"
              >
                {/* Header row of card */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0 font-bold">
                      {app.applicantName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground text-base">
                          {app.applicantName}
                        </span>
                        {getStatusBadge(app.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                        <a
                          href={`mailto:${app.applicantEmail}?subject=Aanmelding ${encodeURIComponent(
                            app.vacancyTitle
                          )}`}
                          className="flex items-center gap-1 text-accent hover:underline"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {app.applicantEmail}
                        </a>
                        <span>•</span>
                        <span>
                          {new Date(app.createdAt).toLocaleDateString("nl-NL", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Vacancy / Wijk info tag */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-accent/15 text-accent border border-accent/30 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{app.vacancyTitle}</span>
                    </span>
                  </div>
                </div>

                {/* THE MOTIVATIONAL DESCRIPTION (Central Requirement) */}
                <div className="bg-background rounded-xl p-4 border border-border/80 relative">
                  <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>Motiverende beschrijving van het lid:</span>
                  </div>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed italic bg-accent/5 p-3 rounded-lg border border-accent/10">
                    "{app.motivation}"
                  </div>
                </div>

                {/* Footer action bar: status changer, notes, email, delete */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Status wijzigen:</span>
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className="text-xs bg-card border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="nieuw">Nieuw</option>
                      <option value="in_behandeling">In behandeling</option>
                      <option value="gecontacteerd">Gecontacteerd</option>
                      <option value="geaccepteerd">Geaccepteerd</option>
                      <option value="afgewezen">Afgewezen</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`mailto:${app.applicantEmail}?subject=Reactie op uw aanmelding voor ${encodeURIComponent(
                        app.vacancyTitle
                      )} - Lijst van Andel`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-foreground hover:bg-muted/80 border border-border flex items-center gap-1.5 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-accent" />
                      <span>E-mail sturen</span>
                    </a>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedApp(app)}
                      className="h-8 text-xs text-foreground hover:text-accent"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Notities & Details
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteApplication(app.id)}
                      className="h-8 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTIE 2: MAATWERK VACATURES BEHEREN */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <h3 className="text-xl font-display text-foreground flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-accent" />
              <span>Maatwerk Vacatures</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Voeg algemene vacatures toe (bijv. fractieondersteuning, communicatie, evenementen) die ook op het dashboard worden getoond.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => handleOpenVacModal()}
            className="bg-accent text-accent-foreground font-semibold text-xs h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Vacature Aanmaken
          </Button>
        </div>

        {customVacancies.length === 0 ? (
          <div className="p-6 text-center bg-muted/20 rounded-xl border border-border text-sm text-muted-foreground">
            Er zijn nog geen maatwerk vacatures aangemaakt.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {customVacancies.map((vac) => (
              <div
                key={vac.id}
                className="p-5 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent border border-accent/20">
                      {vac.category || "Algemeen"}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        vac.isOpen !== false
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {vac.isOpen !== false ? "Openstaand" : "Gesloten"}
                    </span>
                  </div>
                  <h4 className="font-semibold text-base text-foreground mb-1">{vac.title}</h4>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-accent" />
                    <span>{vac.wijkNaam || "Gemeente Steenwijkerland"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-4">
                    {vac.description || "Geen beschrijving opgegeven."}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenVacModal(vac)}
                    className="h-8 text-xs hover:text-accent"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Bewerken
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteVacancy(vac.id)}
                    className="h-8 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTIE 3: WIJKEN & KERNEN ZONDER VERTEGENWOORDIGER */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
          <div>
            <h3 className="text-lg font-display text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              <span>Wijken & Kernen zonder vertegenwoordiger ({wijkenZonderRep.length})</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Deze wijken en kernen worden automatisch als openstaande vacature getoond op het ledendashboard. Zodra u in het tabblad "Wijken & Kernen" een vertegenwoordiger toewijst, verdwijnt deze positie automatisch uit de lijst.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 max-h-56 overflow-y-auto pr-1">
          {wijkenZonderRep.map((w) => (
            <span
              key={w.slug}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-muted/40 border border-border text-foreground hover:border-accent/40 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span className="font-medium">{w.naam}</span>
              <span className="text-[10px] text-muted-foreground">({w.type})</span>
            </span>
          ))}
        </div>
      </div>

      {/* DIALOG: DETAIL & NOTITIES AANMELDING */}
      {selectedApp && (
        <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-display">
                Aanmelding: {selectedApp.applicantName}
              </DialogTitle>
              <DialogDescription>
                Voor positie: <strong>{selectedApp.vacancyTitle}</strong> ({selectedApp.wijkNaam})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-xs bg-muted/20 p-3 rounded-lg border border-border">
                <div>
                  <span className="text-muted-foreground block">E-mailadres</span>
                  <span className="font-semibold text-foreground">{selectedApp.applicantEmail}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Ontvangen op</span>
                  <span className="font-semibold text-foreground">
                    {new Date(selectedApp.createdAt).toLocaleString("nl-NL")}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Motiverende Beschrijving
                </span>
                <div className="text-sm p-4 bg-accent/5 border border-accent/20 rounded-xl whitespace-pre-wrap leading-relaxed text-foreground">
                  {selectedApp.motivation}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Beheerdersnotities
                </span>
                <Textarea
                  defaultValue={selectedApp.adminNotes || ""}
                  id={`notes-${selectedApp.id}`}
                  placeholder="Noteer hier gespreksverslagen of vervolgstappen..."
                  rows={3}
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <select
                    value={selectedApp.status}
                    onChange={(e) => handleStatusChange(selectedApp.id, e.target.value)}
                    className="text-xs bg-card border border-border rounded-lg px-2.5 py-1.5"
                  >
                    <option value="nieuw">Nieuw</option>
                    <option value="in_behandeling">In behandeling</option>
                    <option value="gecontacteerd">Gecontacteerd</option>
                    <option value="geaccepteerd">Geaccepteerd</option>
                    <option value="afgewezen">Afgewezen</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById(
                        `notes-${selectedApp.id}`
                      ) as HTMLTextAreaElement;
                      if (input) handleSaveNotes(selectedApp.id, input.value);
                    }}
                    className="bg-accent text-accent-foreground font-semibold text-xs"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Notities Opslaan
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG: MAATWERK VACATURE AANMAKEN OF BEWERKEN */}
      <Dialog open={isVacModalOpen} onOpenChange={setIsVacModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">
              {editingVac ? "Vacature Bewerken" : "Nieuwe Vacature Aanmaken"}
            </DialogTitle>
            <DialogDescription>
              Deze functie verschijnt voor ingelogde leden op hun dashboard.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVacancy} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Functietitel *
              </label>
              <Input
                value={vacTitle}
                onChange={(e) => setVacTitle(e.target.value)}
                placeholder="Bijv. Fractieondersteuner Communicatie"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Categorie
                </label>
                <Input
                  value={vacCategory}
                  onChange={(e) => setVacCategory(e.target.value)}
                  placeholder="Bijv. Campagneteam"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Wijk / Gebied
                </label>
                <Input
                  value={vacWijk}
                  onChange={(e) => setVacWijk(e.target.value)}
                  placeholder="Heel Steenwijkerland"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Korte Taakomschrijving
              </label>
              <Textarea
                value={vacDesc}
                onChange={(e) => setVacDesc(e.target.value)}
                placeholder="Beschrijf wat de functie inhoudt en wat voor persoon we zoeken..."
                rows={4}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isOpenVac"
                checked={vacIsOpen}
                onChange={(e) => setVacIsOpen(e.target.checked)}
                className="w-4 h-4 rounded text-accent focus:ring-accent"
              />
              <label htmlFor="isOpenVac" className="text-xs text-foreground cursor-pointer">
                Vacature staat open voor sollicitatie
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsVacModalOpen(false)}
                className="text-xs"
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                className="bg-accent text-accent-foreground font-semibold text-xs"
              >
                {editingVac ? "Wijzigingen Opslaan" : "Vacature Plaatsen"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
