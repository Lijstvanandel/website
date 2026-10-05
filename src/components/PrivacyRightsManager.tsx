import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  Eye,
  Edit3,
  Trash2,
  PauseCircle,
  PlayCircle,
  Download,
  Copy,
  Printer,
  Check,
  AlertTriangle,
  Info,
  ExternalLink,
  Loader2,
  Calendar,
  Lock,
  UserCheck,
  FileSpreadsheet,
  FileCode,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface PrivacyRightsManagerProps {
  onClose: () => void;
  initialTab?: "inzage" | "rectificatie" | "wissing" | "beperking" | "portabiliteit";
}

export function PrivacyRightsManager({ onClose, initialTab = "rectificatie" }: PrivacyRightsManagerProps) {
  const { user, token, updateUser, logout } = useAuth();
  const [activeRight, setActiveRight] = useState<
    "inzage" | "rectificatie" | "wissing" | "beperking" | "portabiliteit"
  >(initialTab);

  // Loading & export states
  const [isLoadingExport, setIsLoadingExport] = useState(false);
  const [exportData, setExportData] = useState<any>(null);
  const [showJsonRaw, setShowJsonRaw] = useState(false);

  // Rectificatie form states
  const [profileSalutation, setProfileSalutation] = useState(user?.salutation || "Dhr.");
  const [profileFullName, setProfileFullName] = useState(user?.fullName || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [profileAddress, setProfileAddress] = useState(user?.address || "");
  const [profileCity, setProfileCity] = useState(user?.city || "");
  const [profileUsername, setProfileUsername] = useState(user?.username || "");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileRemarks, setProfileRemarks] = useState(user?.remarks || "");
  const [profileDirectDebit, setProfileDirectDebit] = useState(user?.directDebit || false);
  const [profileNewsletter, setProfileNewsletter] = useState(user?.newsletterSubscribed !== false);
  const [isSavingRectification, setIsSavingRectification] = useState(false);

  // Beperking (Restriction) states
  const [isUpdatingRestriction, setIsUpdatingRestriction] = useState(false);
  const [restrictionReason, setRestrictionReason] = useState(user?.restrictionReason || "");

  // Wissing (Erasure) states
  const [isClearingSelective, setIsClearingSelective] = useState(false);
  const [clearRemarksCheck, setClearRemarksCheck] = useState(true);
  const [clearEventsCheck, setClearEventsCheck] = useState(true);
  const [clearNewsletterCheck, setClearNewsletterCheck] = useState(true);
  const [showFullDeleteConfirm, setShowFullDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeletingFullAccount, setIsDeletingFullAccount] = useState(false);

  // Sync user state
  useEffect(() => {
    if (user) {
      setProfileSalutation(user.salutation || "Dhr.");
      setProfileFullName(user.fullName || "");
      setProfileEmail(user.email || (user.username?.includes("@") ? user.username : ""));
      setProfileAddress(user.address || "");
      setProfileCity(user.city || "");
      setProfileUsername(user.username || "");
      setProfileRemarks(user.remarks || "");
      setProfileDirectDebit(Boolean(user.directDebit));
      setProfileNewsletter(user.newsletterSubscribed !== false);
      setRestrictionReason(user.restrictionReason || "");
    }
  }, [user]);

  // Load live export data for Inzage and Portabiliteit
  const fetchExportData = async () => {
    if (!token) return;
    setIsLoadingExport(true);
    try {
      const res = await fetch("/api/me/gdpr/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExportData(data);
      }
    } catch (e) {
      console.warn("Kon live AVG export niet laden:", e);
    } finally {
      setIsLoadingExport(false);
    }
  };

  useEffect(() => {
    fetchExportData();
  }, [token]);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  // 2. Recht op Rectificatie: Gegevens corrigeren & opslaan
  const handleSaveRectification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!profileFullName.trim()) {
      toast.error("Volledige naam is verplicht");
      return;
    }
    if (!profileEmail.trim() || !profileEmail.includes("@")) {
      toast.error("Voer een geldig e-mailadres in");
      return;
    }
    if (!profileUsername.trim() || profileUsername.trim().length < 3) {
      toast.error("Gebruikersnaam moet minimaal 3 tekens bevatten");
      return;
    }
    if (profilePassword && profilePassword.trim().length < 6) {
      toast.error("Wachtwoord moet minimaal 6 tekens bevatten");
      return;
    }

    setIsSavingRectification(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          salutation: profileSalutation,
          fullName: profileFullName.trim(),
          email: profileEmail.trim(),
          address: profileAddress.trim(),
          city: profileCity.trim(),
          username: profileUsername.trim(),
          password: profilePassword.trim() || undefined,
          remarks: profileRemarks.trim(),
          directDebit: profileDirectDebit,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Kon gegevens niet rectificeren");
      }

      // Also sync newsletter preference if changed
      if (profileNewsletter !== (user?.newsletterSubscribed !== false)) {
        await fetch("/api/me/newsletter", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            newsletterSubscribed: profileNewsletter,
            email: profileEmail.trim(),
          }),
        });
      }

      updateUser({ ...data.user, newsletterSubscribed: profileNewsletter }, data.token);
      setProfilePassword("");
      toast.success("Recht op rectificatie succesvol uitgeoefend: uw persoonsgegevens zijn bijgewerkt!");
      fetchExportData();
    } catch (err: any) {
      toast.error(err.message || "Er is een fout opgetreden bij het rectificeren van uw gegevens.");
    } finally {
      setIsSavingRectification(false);
    }
  };

  // 4. Recht op Beperking: Opschorten of hervatten
  const handleToggleRestriction = async (newRestrictedState: boolean) => {
    if (!token) return;
    setIsUpdatingRestriction(true);
    try {
      const res = await fetch("/api/me/gdpr/restriction", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          restricted: newRestrictedState,
          reason: restrictionReason,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Kon status van beperking niet wijzigen");
      }

      updateUser(data.user);
      toast.success(data.message);
      fetchExportData();
    } catch (err: any) {
      toast.error(err.message || "Fout bij wijzigen verwerkingsbeperking");
    } finally {
      setIsUpdatingRestriction(false);
    }
  };

  // 3. Recht op Gegevenswissing: Selectieve opschoning
  const handleSelectiveErasure = async () => {
    if (!token) return;
    if (!clearRemarksCheck && !clearEventsCheck && !clearNewsletterCheck) {
      toast.info("Selecteer minimaal één categorie om te wissen.");
      return;
    }

    setIsClearingSelective(true);
    try {
      const res = await fetch("/api/me/gdpr/erasure/selective", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clearRemarks: clearRemarksCheck,
          clearEventHistory: clearEventsCheck,
          unsubscribeNewsletter: clearNewsletterCheck,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Kon niet-essentiële gegevens niet wissen");
      }

      updateUser(data.user);
      if (clearRemarksCheck) setProfileRemarks("");
      if (clearNewsletterCheck) setProfileNewsletter(false);
      toast.success(data.message);
      fetchExportData();
    } catch (err: any) {
      toast.error(err.message || "Fout bij selectieve wissing");
    } finally {
      setIsClearingSelective(false);
    }
  };

  // 3. Recht op Gegevenswissing: Volledige accountverwijdering
  const handleFullAccountDeletion = async () => {
    if (!token) return;
    if (deleteConfirmationText.trim().toLowerCase() !== "verwijderen") {
      toast.error("Typ 'verwijderen' ter bevestiging van de accountwissing.");
      return;
    }

    setIsDeletingFullAccount(true);
    try {
      const res = await fetch("/api/me/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Kon account niet wissen");
      }

      toast.success(data.message || "Uw account en persoonsgegevens zijn definitief gewist.");
      logout();
    } catch (err: any) {
      toast.error(err.message || "Fout bij wissen van uw account");
      setIsDeletingFullAccount(false);
    }
  };

  // 5. Recht op Dataportabiliteit: Directe Downloads
  const downloadJsonExport = () => {
    const dataToExport = exportData || {
      user: {
        id: user?.id,
        username: user?.username,
        fullName: user?.fullName,
        email: user?.email,
        address: user?.address,
        city: user?.city,
        createdAt: user?.createdAt,
      },
    };
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonStr);
    downloadAnchor.setAttribute("download", `lijstvanandel-avg-export-${user?.username || "lid"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("JSON bestand gestart met downloaden (RFC 8259 machineleesbaar formaat)!");
  };

  const downloadCsvExport = () => {
    if (token) {
      window.location.href = `/api/me/gdpr/export?format=csv`;
      toast.success("CSV bestand gestart met downloaden (compatibel met Excel en spreadsheets)!");
    }
  };

  const copyJsonToClipboard = () => {
    if (exportData) {
      navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      toast.success("Gestructureerde JSON gekopieerd naar klembord!");
    } else {
      toast.info("Gegevens worden nog geladen...");
    }
  };

  const printGdprDossier = () => {
    window.print();
  };

  const isRestricted = Boolean(user?.processingRestricted);

  return (
    <div className="w-full text-foreground space-y-6">
      {/* ============================================================ */}
      {/* HEADER MET JURIDISCHE AVG CLAUSULE */}
      {/* ============================================================ */}
      <div className="bg-muted/40 rounded-2xl p-5 border border-border/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-accent/15 text-accent">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <span className="text-xs uppercase tracking-wider font-semibold text-accent">
                AVG / GDPR Zelfservice Portaal
              </span>
              {isRestricted ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <PauseCircle className="w-3 h-3" /> Verwerking Beperkt
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <UserCheck className="w-3 h-3" /> Verwerking Normaal
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-display text-foreground">
              Gegevens Wijzigen &amp; Privacyrechten
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Op grond van de <strong>Algemene Verordening Gegevensbescherming (AVG)</strong> heeft u te allen tijde de onderstaande rechten. U kunt deze hieronder <strong>volledig dynamisch en zelfstandig</strong> uitoefenen zonder handmatige wachttijden.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadJsonExport}
              className="text-xs h-8 gap-1.5 shadow-sm bg-background hover:border-accent hover:text-accent"
            >
              <Download className="w-3.5 h-3.5 text-accent" />
              Directe JSON Export
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadCsvExport}
              className="text-xs h-8 gap-1.5 shadow-sm bg-background hover:border-accent hover:text-accent"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-accent" />
              Directe CSV Export
            </Button>
          </div>
        </div>

        {/* Status Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-4 border-t border-border/60 text-[11px]">
          <div className="p-2 rounded-lg bg-background/80 border border-border/50">
            <span className="text-muted-foreground block">1. Inzage</span>
            <span className="font-semibold text-accent flex items-center gap-1 mt-0.5">
              <Check className="w-3 h-3" /> Real-time dossier
            </span>
          </div>
          <div className="p-2 rounded-lg bg-background/80 border border-border/50">
            <span className="text-muted-foreground block">2. Rectificatie</span>
            <span className="font-semibold text-emerald-500 flex items-center gap-1 mt-0.5">
              <Check className="w-3 h-3" /> Direct bewerkbaar
            </span>
          </div>
          <div className="p-2 rounded-lg bg-background/80 border border-border/50">
            <span className="text-muted-foreground block">3. Gegevenswissing</span>
            <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
              <Check className="w-3 h-3" /> Zelfbediening
            </span>
          </div>
          <div className="p-2 rounded-lg bg-background/80 border border-border/50">
            <span className="text-muted-foreground block">4. Beperking</span>
            <span className={`font-semibold flex items-center gap-1 mt-0.5 ${isRestricted ? "text-amber-500" : "text-emerald-500"}`}>
              {isRestricted ? "Opgeschort" : "Actief (Normaal)"}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-background/80 border border-border/50 col-span-2 sm:col-span-1">
            <span className="text-muted-foreground block">5. Portabiliteit</span>
            <span className="font-semibold text-accent flex items-center gap-1 mt-0.5">
              <Check className="w-3 h-3" /> JSON &amp; CSV
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DE 5 AVG RECHTEN TAB-KIEZER */}
      {/* ============================================================ */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-muted/60 rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setActiveRight("rectificatie")}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeRight === "rectificatie"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
        >
          <Edit3 className="w-3.5 h-3.5 text-accent" />
          <span>2. Rectificatie (Wijzigen)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRight("inzage")}
          className={`flex-1 min-w-[130px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeRight === "inzage"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-accent" />
          <span>1. Inzage Dossier</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRight("portabiliteit")}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeRight === "portabiliteit"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
        >
          <Download className="w-3.5 h-3.5 text-accent" />
          <span>5. Dataportabiliteit</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRight("beperking")}
          className={`flex-1 min-w-[130px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeRight === "beperking"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
        >
          <PauseCircle className="w-3.5 h-3.5 text-accent" />
          <span>4. Beperking (Opschorten)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRight("wissing")}
          className={`flex-1 min-w-[130px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeRight === "wissing"
              ? "bg-card text-destructive shadow-sm border border-destructive/30"
              : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>3. Gegevenswissing</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB CONTENT 2: RECHT OP RECTIFICATIE */}
      {/* ============================================================ */}
      {activeRight === "rectificatie" && (
        <section className="bg-card rounded-2xl p-6 border border-border space-y-5">
          <div className="border-b border-border pb-3">
            <h3 className="text-lg font-display flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-accent" />
              <span>2. Recht op rectificatie</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              <em>&ldquo;U kunt onjuiste of onvolledige gegevens laten corrigeren.&rdquo;</em> Wijzig uw gegevens hieronder direct in de database.
            </p>
          </div>

          <form onSubmit={handleSaveRectification} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Aanhef
                </label>
                <Select value={profileSalutation} onValueChange={setProfileSalutation}>
                  <SelectTrigger className="h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Aanhef" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dhr.">Dhr.</SelectItem>
                    <SelectItem value="Mevr.">Mevr.</SelectItem>
                    <SelectItem value="Anders">Anders</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Volledige naam *
                </label>
                <Input
                  value={profileFullName}
                  onChange={(e) => setProfileFullName(e.target.value)}
                  placeholder="Voor- en achternaam"
                  className="h-9 text-xs sm:text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                E-mailadres *
              </label>
              <Input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="uw.email@voorbeeld.nl"
                className="h-9 text-xs sm:text-sm"
                required
              />
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Hierop ontvangt u belangrijke ledencorrespondentie en bevestigingen.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Adres (Straat &amp; huisnummer)
                </label>
                <Input
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  placeholder="Kerkstraat 12"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Woonplaats / Kern (Gemeente Steenwijkerland)
                </label>
                <Input
                  value={profileCity}
                  onChange={(e) => setProfileCity(e.target.value)}
                  placeholder="Steenwijk, Blokzijl, Giethoorn, Oldemarkt..."
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Gebruikersnaam *
                </label>
                <Input
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  placeholder="Gebruikersnaam"
                  className="h-9 text-xs sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Nieuw Wachtwoord (optioneel)
                </label>
                <Input
                  type="password"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  placeholder="Alleen invullen bij wachtwoordwijziging"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Persoonlijke opmerkingen / Interessegebieden (optioneel)
              </label>
              <Textarea
                value={profileRemarks}
                onChange={(e) => setProfileRemarks(e.target.value)}
                placeholder="Bijv. interesse in woningbouw, buitengebied, cultuur..."
                rows={2}
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-start space-x-3 p-3 rounded-xl border border-border bg-muted/20">
                <Checkbox
                  id="gdprDirectDebitCheck"
                  checked={profileDirectDebit}
                  onCheckedChange={(c) => setProfileDirectDebit(Boolean(c))}
                />
                <div className="space-y-0.5 leading-none">
                  <label
                    htmlFor="gdprDirectDebitCheck"
                    className="text-xs font-semibold text-foreground cursor-pointer"
                  >
                    Automatische incasso (contributie)
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Toestemming voor jaarlijkse automatische partijbijdrage.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-xl border border-border bg-muted/20">
                <Checkbox
                  id="gdprNewsletterCheck"
                  checked={profileNewsletter}
                  onCheckedChange={(c) => setProfileNewsletter(Boolean(c))}
                />
                <div className="space-y-0.5 leading-none">
                  <label
                    htmlFor="gdprNewsletterCheck"
                    className="text-xs font-semibold text-foreground cursor-pointer"
                  >
                    Partijnieuwsbrief ontvangen
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Regelmatige updates over onze fractie en bijeenkomsten.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Gewijzigde gegevens worden direct opgeslagen en gesynchroniseerd.
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-xs h-9"
                >
                  Sluiten
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingRectification}
                  className="bg-accent text-accent-foreground font-semibold text-xs h-9 gap-1.5 shadow-sm"
                >
                  {isSavingRectification ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Opslaan...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Gegevens Corrigeren &amp; Opslaan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* ============================================================ */}
      {/* TAB CONTENT 1: RECHT OP INZAGE */}
      {/* ============================================================ */}
      {activeRight === "inzage" && (
        <section className="bg-card rounded-2xl p-6 border border-border space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-lg font-display flex items-center gap-2">
                <Eye className="w-5 h-5 text-accent" />
                <span>1. Recht op inzage</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                <em>&ldquo;U kunt te allen tijde opvragen welke persoonsgegevens wij van u verwerken.&rdquo;</em>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowJsonRaw(!showJsonRaw)}
                className="text-xs h-8 gap-1.5"
              >
                <FileCode className="w-3.5 h-3.5 text-accent" />
                {showJsonRaw ? "Visuele weergave" : "Bekijk ruwe JSON"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={printGdprDossier}
                className="text-xs h-8 gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Afdrukken
              </Button>
            </div>
          </div>

          {isLoadingExport ? (
            <div className="flex items-center justify-center p-12 text-sm text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <span>Uw persoonlijke gegevensdossier samenstellen...</span>
            </div>
          ) : showJsonRaw ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Ruwe datastructuur (conform RFC 8259)
                </span>
                <button
                  type="button"
                  onClick={copyJsonToClipboard}
                  className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
                >
                  <Copy className="w-3 h-3" /> Kopieer JSON
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-muted/60 border border-border text-xs font-mono overflow-x-auto max-h-96">
                {JSON.stringify(exportData || { user }, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Category 1: Identificatie & NAW */}
              <div className="p-4 rounded-xl border border-border bg-background space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-accent flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  1. Identificatie- &amp; Contactgegevens
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[11px]">Volledige naam</span>
                    <span className="font-semibold text-foreground">
                      {user?.salutation} {user?.fullName || "Niet opgegeven"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[11px]">E-mailadres</span>
                    <span className="font-semibold text-foreground">{user?.email || "Geen e-mail"}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[11px]">Gebruikersnaam</span>
                    <span className="font-semibold text-foreground">{user?.username}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[11px]">Adres</span>
                    <span className="font-semibold text-foreground">{user?.address || "Niet opgegeven"}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[11px]">Woonplaats</span>
                    <span className="font-semibold text-foreground">{user?.city || "Steenwijkerland"}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[11px]">Registratiedatum</span>
                    <span className="font-semibold text-foreground">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("nl-NL") : "2024"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category 2: Lidmaatschap & Financiën */}
              <div className="p-4 rounded-xl border border-border bg-background space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-accent flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  2. Lidmaatschap, Rechten &amp; Financiële Bijdrage
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[11px]">Partijrol</span>
                    <span className="font-semibold text-foreground capitalize">{user?.role || "Lid"}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[11px]">Lidmaatschapsstatus</span>
                    <span className="font-semibold text-emerald-500">
                      {user?.isFullMember ? "Volwaardig lid (Stemgerechtigd)" : "Actief geregistreerd"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[11px]">Contributie incasso</span>
                    <span className="font-semibold text-foreground">
                      {user?.directDebit ? "Automatische incasso actief" : "Handmatige overboeking"}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground bg-muted/20 p-2.5 rounded-lg">
                  <Info className="w-3.5 h-3.5 inline mr-1 text-accent" />
                  Financiële administratiegegevens vallen onder de wettelijke bewaartermijn van 7 jaar conform de Algemene wet inzake rijksbelastingen.
                </p>
              </div>

              {/* Category 3: Toestemmingen & Beveiliging */}
              <div className="p-4 rounded-xl border border-border bg-background space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-accent flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  3. Toestemmingen, Communicatie &amp; Beveiliging
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[11px]">Nieuwsbrief inschrijving</span>
                    <span className="font-semibold text-foreground">
                      {user?.newsletterSubscribed !== false ? "Aangemeld" : "Afgemeld"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[11px]">Verwerkingsstatus</span>
                    <span className={`font-semibold ${isRestricted ? "text-amber-500" : "text-emerald-500"}`}>
                      {isRestricted ? "Tijdelijk beperkt" : "Normaal actief"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[11px]">Wachtwoordbeveiliging</span>
                    <span className="font-semibold text-emerald-500">
                      Bcrypt hash (onleesbaar voor beheerders)
                    </span>
                  </div>
                </div>
              </div>

              {/* Category 4: Evenementen & Activiteit */}
              {exportData?.activityAndEvents && (
                <div className="p-4 rounded-xl border border-border bg-background space-y-3">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-accent flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    4. Geregistreerde Activiteiten &amp; Evenementen ({exportData.activityAndEvents.totalEventsRegistered})
                  </h4>
                  {exportData.activityAndEvents.events.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      U staat momenteel niet aangemeld voor partijbijeenkomsten.
                    </p>
                  ) : (
                    <div className="divide-y divide-border/50 text-xs">
                      {exportData.activityAndEvents.events.map((ev: any) => (
                        <div key={ev.id} className="py-2 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-foreground">{ev.title}</span>
                            <span className="text-muted-foreground block text-[11px]">
                              {ev.date} om {ev.time} • {ev.location}
                            </span>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                            {ev.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Link to="/privacyverklaring" target="_blank" className="hover:text-accent hover:underline flex items-center gap-1">
                Privacyverklaring <ExternalLink className="w-3 h-3" />
              </Link>
              <span>•</span>
              <Link to="/verwerkingsreglement" target="_blank" className="hover:text-accent hover:underline flex items-center gap-1">
                Verwerkingsreglement <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-8"
            >
              Sluiten
            </Button>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* TAB CONTENT 5: RECHT OP DATAPORTABILITEIT */}
      {/* ============================================================ */}
      {activeRight === "portabiliteit" && (
        <section className="bg-card rounded-2xl p-6 border border-border space-y-5">
          <div className="border-b border-border pb-3">
            <h3 className="text-lg font-display flex items-center gap-2">
              <Download className="w-5 h-5 text-accent" />
              <span>5. Recht op dataportabiliteit</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              <em>&ldquo;U kunt verzoeken uw gegevens in een gestructureerd en gangbaar machineleesbaar formaat te ontvangen.&rdquo;</em>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* JSON Export Card */}
            <div className="p-5 rounded-xl border border-border bg-background space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-accent/10 text-accent">
                    <FileCode className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="font-semibold text-sm">JSON Formaat (RFC 8259)</h4>
                    <span className="text-[11px] text-muted-foreground block">
                      Gestructureerd, open en universeel machineleesbaar formaat.
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ideaal voor geautomatiseerde import in andere systemen, software of persoonlijke digitale kluizen.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  onClick={downloadJsonExport}
                  className="w-full text-xs h-9 bg-accent text-accent-foreground font-semibold gap-2 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download JSON Bestand (.json)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyJsonToClipboard}
                  className="w-full text-xs h-8 gap-2"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Kopieer naar klembord
                </Button>
              </div>
            </div>

            {/* CSV Export Card */}
            <div className="p-5 rounded-xl border border-border bg-background space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="font-semibold text-sm">CSV Formaat (Spreadsheet)</h4>
                    <span className="text-[11px] text-muted-foreground block">
                      Direct te openen in Excel, LibreOffice of Google Spreadsheets.
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Geschikt voor menselijk overzicht in tabelvorm met veldnamen en actuele waarden.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  onClick={downloadCsvExport}
                  variant="outline"
                  className="w-full text-xs h-9 border-accent/40 text-accent hover:bg-accent/10 font-semibold gap-2 shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Download CSV Bestand (.csv)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={printGdprDossier}
                  className="w-full text-xs h-8 gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Printbaar Dossier Bekijken
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Directe beschikbaarheid
            </span>
            <p>
              In tegenstelling tot traditionele formulieren waarbij u weken moet wachten op een functionaris, genereert onze server deze exportbestanden <strong>real-time en direct</strong> uit onze database.
            </p>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* TAB CONTENT 4: RECHT OP BEPERKING VAN DE VERWERKING */}
      {/* ============================================================ */}
      {activeRight === "beperking" && (
        <section className="bg-card rounded-2xl p-6 border border-border space-y-5">
          <div className="border-b border-border pb-3">
            <h3 className="text-lg font-display flex items-center gap-2">
              <PauseCircle className="w-5 h-5 text-accent" />
              <span>4. Recht op beperking van de verwerking</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              <em>&ldquo;U kunt verzoeken de verwerking tijdelijk op te schorten.&rdquo;</em>
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-background space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-border/80">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                  Status verwerking:
                  {isRestricted ? (
                    <span className="text-amber-500 font-bold flex items-center gap-1">
                      <PauseCircle className="w-4 h-4" /> TIJDELIJK BEPERKT / OPGESCHORT
                    </span>
                  ) : (
                    <span className="text-emerald-500 font-bold flex items-center gap-1">
                      <PlayCircle className="w-4 h-4" /> ACTIEF (NORMAAL)
                    </span>
                  )}
                </span>
                <p className="text-xs text-muted-foreground">
                  {isRestricted
                    ? `Verwerking is opgeschort sinds ${user?.processingRestrictedAt ? new Date(user.processingRestrictedAt).toLocaleString("nl-NL") : "recent"}. Partijnieuwsbrieven en geautomatiseerde mailings zijn stopgezet.`
                    : "Uw gegevens worden normaal gebruikt voor ledencorrespondentie, bijeenkomsten en fractieberichten."}
                </p>
              </div>

              <div>
                {isRestricted ? (
                  <Button
                    type="button"
                    onClick={() => handleToggleRestriction(false)}
                    disabled={isUpdatingRestriction}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 gap-1.5 shadow-sm"
                  >
                    {isUpdatingRestriction ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PlayCircle className="w-3.5 h-3.5" />
                    )}
                    Beperking Opheffen &amp; Hervatten
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleToggleRestriction(true)}
                    disabled={isUpdatingRestriction}
                    className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-semibold h-9 gap-1.5 shadow-sm"
                  >
                    {isUpdatingRestriction ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PauseCircle className="w-3.5 h-3.5" />
                    )}
                    Verwerking Tijdelijk Opschorten
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Reden van opschorting (optioneel, conform art. 18 AVG)
              </label>
              <Input
                value={restrictionReason}
                onChange={(e) => setRestrictionReason(e.target.value)}
                placeholder="Bijv. in afwachting van rectificatie, tijdelijke pauze, geschil over gegevens..."
                className="h-9 text-xs sm:text-sm"
                disabled={isUpdatingRestriction}
              />
              <span className="text-[11px] text-muted-foreground block">
                Tijdens opschorting worden uw gegevens uitsluitend bewaard en niet meer actief gebruikt voor partijdoeleinden.
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* TAB CONTENT 3: RECHT OP GEGEVENSWISSING */}
      {/* ============================================================ */}
      {activeRight === "wissing" && (
        <section className="bg-card rounded-2xl p-6 border border-destructive/30 space-y-5">
          <div className="border-b border-border pb-3">
            <h3 className="text-lg font-display flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              <span>3. Recht op gegevenswissing (&lsquo;Recht op vergetelheid&rsquo;)</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              <em>&ldquo;U kunt verzoeken om verwijdering van uw gegevens, mits er geen wettelijke bewaarplicht geldt.&rdquo;</em>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-xs text-foreground space-y-2">
            <div className="flex items-center gap-2 font-semibold text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Wettelijke bewaartermijnen &amp; Reikwijdte</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Op grond van de Algemene Verordening Gegevensbescherming kunt u wissing van uw gegevens vorderen. Let op: op financiële gegevens (zoals reeds betaalde lidmaatschapscontributies of donaties) rust een wettelijke fiscale bewaarplicht van <strong>7 jaar</strong> krachtens de Algemene wet inzake rijksbelastingen. Uw gebruikersaccount, communicatievoorkeuren en persoonlijke opmerkingen worden echter <strong>direct en permanent gewist</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Optie A: Selectieve Opschoning */}
            <div className="p-5 rounded-xl border border-border bg-background space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm">Optie A: Selectieve Wissing (Aanbevolen)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Wis niet-essentiële gegevens zonder uw partijlidmaatschap of inlogaccount te verliezen.
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-start space-x-2.5">
                    <Checkbox
                      id="clearRemarks"
                      checked={clearRemarksCheck}
                      onCheckedChange={(c) => setClearRemarksCheck(Boolean(c))}
                    />
                    <label htmlFor="clearRemarks" className="text-xs text-foreground cursor-pointer">
                      Persoonlijke opmerkingen &amp; interessegebieden wissen
                    </label>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <Checkbox
                      id="clearEvents"
                      checked={clearEventsCheck}
                      onCheckedChange={(c) => setClearEventsCheck(Boolean(c))}
                    />
                    <label htmlFor="clearEvents" className="text-xs text-foreground cursor-pointer">
                      Deelnamehistorie aan partijbijeenkomsten wissen
                    </label>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <Checkbox
                      id="clearNewsletter"
                      checked={clearNewsletterCheck}
                      onCheckedChange={(c) => setClearNewsletterCheck(Boolean(c))}
                    />
                    <label htmlFor="clearNewsletter" className="text-xs text-foreground cursor-pointer">
                      Nieuwsbriefinschrijving permanent verwijderen
                    </label>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleSelectiveErasure}
                disabled={isClearingSelective}
                variant="outline"
                className="w-full text-xs h-9 mt-4 font-semibold hover:border-accent hover:text-accent"
              >
                {isClearingSelective ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 mr-1.5 text-accent" />
                )}
                Geselecteerde Gegevens Wissen
              </Button>
            </div>

            {/* Optie B: Volledig Account Wissen */}
            <div className="p-5 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div>
                  <h4 className="font-semibold text-sm text-destructive">
                    Optie B: Volledige Accountwissing
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Definitief opheffen van uw account en wissen van al uw profielgegevens op de server.
                  </p>
                </div>
                <p className="text-[11px] text-destructive/90">
                  U verliest direct toegang tot het ledenportaal, stemformulieren en ledendocumenten.
                </p>
              </div>

              {!showFullDeleteConfirm ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowFullDeleteConfirm(true)}
                  className="w-full text-xs h-9 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Mijn Account &amp; Gegevens Definitief Wissen
                </Button>
              ) : (
                <div className="space-y-2.5 p-3 rounded-lg bg-background border border-destructive/40">
                  <span className="text-[11px] font-semibold text-destructive block">
                    Typ &ldquo;verwijderen&rdquo; ter bevestiging:
                  </span>
                  <Input
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder="verwijderen"
                    className="h-8 text-xs border-destructive/50"
                  />
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowFullDeleteConfirm(false);
                        setDeleteConfirmationText("");
                      }}
                      className="text-xs h-8 flex-1"
                    >
                      Annuleren
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={isDeletingFullAccount || deleteConfirmationText.trim().toLowerCase() !== "verwijderen"}
                      onClick={handleFullAccountDeletion}
                      className="text-xs h-8 flex-1"
                    >
                      {isDeletingFullAccount ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Definitief Wissen"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
