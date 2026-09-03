import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  MapPin,
  Search,
  Pencil,
  ExternalLink,
  Upload,
  User,
  Mail,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Send,
  Video,
  Check,
  X,
  Sparkles,
  Plus,
  RefreshCw,
  ImageIcon,
  Eye,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { WijkItem, WijkVertegenwoordiger } from "@/types/wijk";

interface WijkManagerProps {
  token: string | null;
}

const PRESET_BANNERS = [
  { label: "Oostermeenthe", url: "/assets/oostermeenthe-banner.jpg" },
  { label: "Markt Steenwijk", url: "/assets/markt-steenwijk.jpg" },
  { label: "Luchtfoto Steenwijk", url: "/assets/steenwijk-aerial.jpg" },
  { label: "Weerribben / Natuur", url: "/assets/hero-banner.jpg" },
];

export const WijkManager: React.FC<WijkManagerProps> = ({ token }) => {
  const [wijken, setWijken] = useState<WijkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "Wijk" | "Kern" | "with-rep" | "without-rep">("all");

  // Edit modal state
  const [editingWijk, setEditingWijk] = useState<WijkItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // New Wijk dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newNaam, setNewNaam] = useState("");
  const [newType, setNewType] = useState<"Wijk" | "Kern">("Wijk");
  const [newGemeente, setNewGemeente] = useState("Steenwijk");

  // Form states for the currently edited wijk
  const [bannerUrl, setBannerUrl] = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [hasRep, setHasRep] = useState(false);
  const [voornaam, setVoornaam] = useState("");
  const [achternaam, setAchternaam] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [repRol, setRepRol] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [repBeschrijving, setRepBeschrijving] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [tiktok, setTiktok] = useState("");

  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const fetchWijken = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wijken");
      if (!res.ok) throw new Error("Fout bij ophalen van wijken en kernen");
      const data = await res.json();
      setWijken(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Kon wijken en kernen niet laden";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWijken();
  }, []);

  const handleOpenEdit = (wijk: WijkItem) => {
    setEditingWijk(wijk);
    setBannerUrl(wijk.bannerUrl || "");
    setBeschrijving(wijk.beschrijving || "");

    if (wijk.vertegenwoordiger) {
      setHasRep(true);
      setVoornaam(wijk.vertegenwoordiger.voornaam || "");
      setAchternaam(wijk.vertegenwoordiger.achternaam || "");
      setFotoUrl(wijk.vertegenwoordiger.fotoUrl || "");
      setRepRol(wijk.vertegenwoordiger.rol || (wijk.type === "Wijk" ? "Wijkvertegenwoordiger" : "Kernvertegenwoordiger"));
      setRepEmail(wijk.vertegenwoordiger.email || "");
      setRepBeschrijving(wijk.vertegenwoordiger.beschrijving || "");
      setFacebook(wijk.vertegenwoordiger.socials?.facebook || "");
      setInstagram(wijk.vertegenwoordiger.socials?.instagram || "");
      setLinkedin(wijk.vertegenwoordiger.socials?.linkedin || "");
      setTwitter(wijk.vertegenwoordiger.socials?.twitter || "");
      setTelegram(wijk.vertegenwoordiger.socials?.telegram || "");
      setTiktok(wijk.vertegenwoordiger.socials?.tiktok || "");
    } else {
      setHasRep(false);
      setVoornaam("");
      setAchternaam("");
      setFotoUrl("");
      setRepRol(wijk.type === "Wijk" ? "Wijkvertegenwoordiger" : "Kernvertegenwoordiger");
      setRepEmail("");
      setRepBeschrijving("");
      setFacebook("");
      setInstagram("");
      setLinkedin("");
      setTwitter("");
      setTelegram("");
      setTiktok("");
    }

    setIsEditDialogOpen(true);
  };

  const handleUploadFile = async (file: File, type: "banner" | "avatar") => {
    if (!token) {
      toast.error("Niet geauthenticeerd");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    if (type === "banner") setUploadingBanner(true);
    else setUploadingAvatar(true);

    try {
      const res = await fetch("/api/admin/wijken/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload mislukt");
      }

      const data = await res.json();
      if (type === "banner") {
        setBannerUrl(data.url);
        toast.success("Achtergrondfoto geüpload");
      } else {
        setFotoUrl(data.url);
        toast.success("Foto van vertegenwoordiger geüpload");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Fout bij uploaden afbeelding";
      toast.error(message);
    } finally {
      if (type === "banner") setUploadingBanner(false);
      else setUploadingAvatar(false);
    }
  };

  const handleSaveWijk = async () => {
    if (!editingWijk) return;
    if (!token) {
      toast.error("Geen actieve beheerderssessie");
      return;
    }

    if (hasRep) {
      if (!voornaam.trim() || !achternaam.trim()) {
        toast.error("Voor- en achternaam van de vertegenwoordiger zijn verplicht");
        return;
      }
      if (!repEmail.trim()) {
        toast.error("E-mailadres van de vertegenwoordiger is verplicht");
        return;
      }
    }

    setSaving(true);
    try {
      const vertegenwoordigerPayload: WijkVertegenwoordiger | null = hasRep
        ? {
            voornaam: voornaam.trim(),
            achternaam: achternaam.trim(),
            fotoUrl: fotoUrl.trim(),
            rol: repRol.trim() || (editingWijk.type === "Wijk" ? "Wijkvertegenwoordiger" : "Kernvertegenwoordiger"),
            email: repEmail.trim(),
            beschrijving: repBeschrijving.trim(),
            socials: {
              facebook: facebook.trim(),
              instagram: instagram.trim(),
              linkedin: linkedin.trim(),
              twitter: twitter.trim(),
              telegram: telegram.trim(),
              tiktok: tiktok.trim(),
            },
          }
        : null;

      const payload = {
        bannerUrl: bannerUrl.trim(),
        beschrijving: beschrijving.trim(),
        vertegenwoordiger: vertegenwoordigerPayload,
        removeVertegenwoordiger: !hasRep,
      };

      const res = await fetch(`/api/admin/wijken/${editingWijk.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Fout bij opslaan");
      }

      const updated = await res.json();
      toast.success(`${editingWijk.naam} succesvol bijgewerkt!`);

      // Update in local state
      setWijken((prev) =>
        prev.map((w) => (w.slug === editingWijk.slug ? updated.data : w))
      );
      setIsEditDialogOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Kon wijzigingen niet opslaan";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewWijk = async () => {
    if (!newNaam.trim()) {
      toast.error("Naam is verplicht");
      return;
    }
    if (!token) {
      toast.error("Geen beheerderssessie");
      return;
    }

    try {
      const res = await fetch("/api/admin/wijken", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          naam: newNaam.trim(),
          type: newType,
          gemeente: newGemeente.trim(),
          bannerUrl: "/assets/hero-banner.jpg",
          beschrijving: `Informatie over ${newNaam.trim()} in ${newGemeente.trim()}.`,
          vertegenwoordiger: null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Kon wijk niet toevoegen");
      }

      const created = await res.json();
      toast.success(`${newNaam} succesvol toegevoegd!`);
      setWijken((prev) => [...prev, created.data]);
      setIsAddDialogOpen(false);
      setNewNaam("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Fout bij toevoegen";
      toast.error(message);
    }
  };

  const filteredWijken = wijken.filter((w) => {
    const matchesSearch =
      w.naam.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.gemeente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.vertegenwoordiger &&
        `${w.vertegenwoordiger.voornaam} ${w.vertegenwoordiger.achternaam}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === "Wijk") return w.type === "Wijk";
    if (filterType === "Kern") return w.type === "Kern";
    if (filterType === "with-rep") return !!w.vertegenwoordiger;
    if (filterType === "without-rep") return !w.vertegenwoordiger;
    return true;
  });

  const withRepCount = wijken.filter((w) => !!w.vertegenwoordiger).length;
  const wijkCount = wijken.filter((w) => w.type === "Wijk").length;
  const kernCount = wijken.filter((w) => w.type === "Kern").length;

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-md bg-accent/15 text-accent">
                <MapPin className="w-5 h-5" />
              </span>
              <h2 className="font-display text-2xl md:text-3xl">Wijken & Kernen Beheer</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Beheer dynamisch per wijk of kern de achtergrondfoto, beschrijving en de wijk- of
              kernvertegenwoordiger inclusief foto, contactgegevens en sociale media.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchWijken}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Vernieuwen
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              className="gap-1.5 bg-primary hover:bg-primary/90"
            >
              <Plus className="w-3.5 h-3.5" />
              Nieuwe Wijk / Kern
            </Button>
          </div>
        </div>

        {/* Quick summary metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/60">
          <div className="p-3 bg-muted/30 rounded border border-border/50">
            <div className="text-xs text-muted-foreground">Totaal Gebieden</div>
            <div className="text-xl font-bold font-display mt-0.5 text-foreground">
              {wijken.length}
            </div>
          </div>
          <div className="p-3 bg-muted/30 rounded border border-border/50">
            <div className="text-xs text-muted-foreground">Stadswijken</div>
            <div className="text-xl font-bold font-display mt-0.5 text-accent">
              {wijkCount}
            </div>
          </div>
          <div className="p-3 bg-muted/30 rounded border border-border/50">
            <div className="text-xs text-muted-foreground">Kernen & Dorpen</div>
            <div className="text-xl font-bold font-display mt-0.5 text-accent">
              {kernCount}
            </div>
          </div>
          <div className="p-3 bg-muted/30 rounded border border-border/50">
            <div className="text-xs text-muted-foreground">Met Vertegenwoordiger</div>
            <div className="text-xl font-bold font-display mt-0.5 text-emerald-500">
              {withRepCount}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op wijknaam of vertegenwoordiger..."
            className="pl-9 bg-card text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              filterType === "all"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            Alle ({wijken.length})
          </button>
          <button
            onClick={() => setFilterType("Wijk")}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              filterType === "Wijk"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            Wijken ({wijkCount})
          </button>
          <button
            onClick={() => setFilterType("Kern")}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              filterType === "Kern"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            Kernen ({kernCount})
          </button>
          <button
            onClick={() => setFilterType("with-rep")}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              filterType === "with-rep"
                ? "bg-emerald-600 text-white font-medium"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            Met vertegenwoordiger ({withRepCount})
          </button>
          <button
            onClick={() => setFilterType("without-rep")}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              filterType === "without-rep"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            Nog open ({wijken.length - withRepCount})
          </button>
        </div>
      </div>

      {/* Grid of Wijken en Kernen */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground bg-card rounded-lg border border-border">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-accent" />
          Wijken en kernen laden...
        </div>
      ) : filteredWijken.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-lg border border-border">
          <MapPin className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-50" />
          <h3 className="font-display text-lg mb-1">Geen resultaten gevonden</h3>
          <p className="text-xs text-muted-foreground">
            Er zijn geen wijken of kernen die voldoen aan de zoekfilter.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWijken.map((wijk) => {
            const rep = wijk.vertegenwoordiger;
            const hasSocials =
              rep?.socials &&
              (rep.socials.facebook ||
                rep.socials.instagram ||
                rep.socials.linkedin ||
                rep.socials.twitter ||
                rep.socials.telegram ||
                rep.socials.tiktok);

            return (
              <div
                key={wijk.slug}
                className="bg-card border border-border rounded-lg overflow-hidden flex flex-col justify-between hover:border-accent/40 transition-colors shadow-sm"
              >
                {/* Top Banner image preview */}
                <div className="relative h-36 w-full bg-muted overflow-hidden">
                  <img
                    src={wijk.bannerUrl || "/assets/steenwijk-aerial.jpg"}
                    alt={wijk.naam}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/assets/steenwijk-aerial.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* Badges top */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        wijk.type === "Wijk"
                          ? "bg-accent text-accent-foreground"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {wijk.type}
                    </Badge>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 text-white backdrop-blur">
                      {wijk.gemeente}
                    </span>
                  </div>

                  {/* Title over bottom of banner */}
                  <div className="absolute bottom-2.5 left-3 right-3">
                    <h3 className="font-display text-lg text-white font-bold leading-snug drop-shadow">
                      {wijk.naam}
                    </h3>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  {/* Area description snippet */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {wijk.beschrijving || "Nog geen wijkbeschrijving ingevuld."}
                  </p>

                  {/* Representative Card / Section */}
                  <div className="pt-3 border-t border-border/60">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-accent mb-2">
                      {wijk.type === "Wijk" ? "Wijkvertegenwoordiger" : "Kernvertegenwoordiger"}
                    </div>

                    {rep ? (
                      <div className="bg-muted/40 p-3 rounded-md border border-border/50 flex items-start gap-3">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-muted shrink-0 border border-border">
                          {rep.fotoUrl ? (
                            <img
                              src={rep.fotoUrl}
                              alt={`${rep.voornaam} ${rep.achternaam}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/assets/silhouette.png";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <User className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate">
                            {rep.voornaam} {rep.achternaam}
                          </div>
                          {rep.email && (
                            <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 shrink-0 text-accent" />
                              <span className="truncate">{rep.email}</span>
                            </div>
                          )}

                          {/* Social links summary icons */}
                          {hasSocials && (
                            <div className="flex items-center gap-2 mt-2 pt-1 text-muted-foreground">
                              {rep.socials.facebook && (
                                <Facebook className="w-3 h-3 hover:text-foreground" title="Facebook" />
                              )}
                              {rep.socials.instagram && (
                                <Instagram className="w-3 h-3 hover:text-foreground" title="Instagram" />
                              )}
                              {rep.socials.linkedin && (
                                <Linkedin className="w-3 h-3 hover:text-foreground" title="LinkedIn" />
                              )}
                              {rep.socials.twitter && (
                                <Twitter className="w-3 h-3 hover:text-foreground" title="Twitter / X" />
                              )}
                              {rep.socials.telegram && (
                                <Send className="w-3 h-3 hover:text-foreground" title="Telegram" />
                              )}
                              {rep.socials.tiktok && (
                                <Video className="w-3 h-3 hover:text-foreground" title="TikTok" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted/20 p-3 rounded-md border border-dashed border-border/80 text-xs text-muted-foreground flex items-center justify-between">
                        <span>Geen vertegenwoordiger ingesteld</span>
                        <span className="text-[10px] text-accent">Vacant</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-4 py-3 bg-muted/20 border-t border-border flex items-center justify-between gap-2">
                  <a
                    href={`/wijken-en-kernen/${wijk.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Bekijk pagina
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleOpenEdit(wijk)}
                    className="gap-1.5 text-xs bg-primary hover:bg-primary/90"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Beheren
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          EDIT WIJK & VERTEGENWOORDIGER MODAL
          ======================================================== */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-accent font-semibold">
                {editingWijk?.type} in {editingWijk?.gemeente}
              </span>
            </div>
            <DialogTitle className="font-display text-2xl">
              Beheer wijk: {editingWijk?.naam}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pas de achtergrondfoto, wijkbeschrijving en de wijk- of kernvertegenwoordiger aan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* SECTIE 1: ACHTERGRONDFOTO EN BESCHRIJVING VAN HET GEBIED */}
            <div className="bg-muted/20 p-4 rounded-lg border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-accent" />
                  <h4 className="font-display text-base font-semibold">
                    1. Achtergrondfoto & Algemene Informatie
                  </h4>
                </div>
              </div>

              {/* Achtergrondfoto preview */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Achtergrondfoto (Banner)
                </label>
                <div className="relative h-44 w-full rounded-md border border-border overflow-hidden bg-black/20 mb-3">
                  <img
                    src={bannerUrl || "/assets/steenwijk-aerial.jpg"}
                    alt="Achtergrond preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/assets/steenwijk-aerial.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => bannerFileInputRef.current?.click()}
                      disabled={uploadingBanner}
                      className="gap-1.5 text-xs shadow-lg"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingBanner ? "Uploaden..." : "Nieuwe foto uploaden"}
                    </Button>
                  </div>
                </div>

                {/* Upload & URL Input */}
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <Input
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="URL naar achtergrondfoto (bijv. /assets/... of https://...)"
                    className="text-xs flex-1"
                  />
                  <input
                    type="file"
                    ref={bannerFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadFile(file, "banner");
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => bannerFileInputRef.current?.click()}
                    disabled={uploadingBanner}
                    className="text-xs shrink-0 gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingBanner ? "Uploaden..." : "Bladeren"}
                  </Button>
                </div>

                {/* Preset quick picker */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground mr-1">Snelle keuze:</span>
                  {PRESET_BANNERS.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setBannerUrl(preset.url)}
                      className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 border border-border/80 text-foreground transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Beschrijving van de wijk */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Beschrijving van {editingWijk?.naam}
                </label>
                <Textarea
                  value={beschrijving}
                  onChange={(e) => setBeschrijving(e.target.value)}
                  placeholder={`Beschrijf de wijk of kern ${editingWijk?.naam}: karakter, voorzieningen, historie en lokale aandachtspunten...`}
                  rows={4}
                  className="text-xs leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Deze tekst wordt prominent getoond op de wijkpagina onder de hoofdtitel.
                </p>
              </div>
            </div>

            {/* SECTIE 2: WIJK- OF KERNVERTEGENWOORDIGER */}
            <div className="bg-card p-4 rounded-lg border border-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-accent" />
                  <h4 className="font-display text-base font-semibold">
                    2. {editingWijk?.type === "Wijk" ? "Wijkvertegenwoordiger" : "Kernvertegenwoordiger"}
                  </h4>
                </div>

                {/* Toggle checkbox */}
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={hasRep}
                    onChange={(e) => setHasRep(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-accent w-4 h-4"
                  />
                  <span>Vertegenwoordiger koppelen aan deze pagina</span>
                </label>
              </div>

              {hasRep ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Naam & Rol */}
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Voornaam <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={voornaam}
                        onChange={(e) => setVoornaam(e.target.value)}
                        placeholder="bijv. Stef"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Achternaam <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={achternaam}
                        onChange={(e) => setAchternaam(e.target.value)}
                        placeholder="bijv. Mars"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Functie / Rol
                      </label>
                      <Input
                        value={repRol}
                        onChange={(e) => setRepRol(e.target.value)}
                        placeholder={
                          editingWijk?.type === "Wijk"
                            ? "Wijkvertegenwoordiger"
                            : "Kernvertegenwoordiger"
                        }
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Foto van de vertegenwoordiger & Live Preview */}
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                      Foto van de vertegenwoordiger
                    </label>
                    <div className="flex items-center gap-4">
                      {/* Avatar preview */}
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-accent/40 shrink-0">
                        {fotoUrl ? (
                          <img
                            src={fotoUrl}
                            alt="Vertegenwoordiger preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/assets/silhouette.png";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <User className="w-7 h-7" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={fotoUrl}
                            onChange={(e) => setFotoUrl(e.target.value)}
                            placeholder="URL naar foto (bijv. /assets/stef-mars.jpg of upload)"
                            className="text-xs flex-1"
                          />
                          <input
                            type="file"
                            ref={avatarFileInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadFile(file, "avatar");
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => avatarFileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                            className="text-xs shrink-0 gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            {uploadingAvatar ? "Uploaden..." : "Upload foto"}
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Aanbevolen: een vierkante portretfoto van het gezicht.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* E-mailadres */}
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      E-mailadres <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        value={repEmail}
                        onChange={(e) => setRepEmail(e.target.value)}
                        placeholder="bijv. naam@lijstvanandel.nl"
                        className="text-xs pl-8"
                      />
                    </div>
                  </div>

                  {/* Beschrijving / Biografie */}
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Beschrijving / Introductie van de vertegenwoordiger
                    </label>
                    <Textarea
                      value={repBeschrijving}
                      onChange={(e) => setRepBeschrijving(e.target.value)}
                      placeholder="Vertel wie deze persoon is, wat zijn of haar band met de wijk is en hoe inwoners contact kunnen opnemen..."
                      rows={3}
                      className="text-xs leading-relaxed"
                    />
                  </div>

                  {/* Sociale media kanalen (Optioneel) */}
                  <div className="pt-3 border-t border-border/80">
                    <label className="text-xs font-semibold text-foreground block mb-2">
                      Sociale Media Kanalen (optioneel)
                    </label>
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      {/* Facebook */}
                      <div className="relative">
                        <Facebook className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={facebook}
                          onChange={(e) => setFacebook(e.target.value)}
                          placeholder="Facebook profiel link"
                          className="text-xs pl-8"
                        />
                      </div>

                      {/* Instagram */}
                      <div className="relative">
                        <Instagram className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          placeholder="Instagram (@gebruikersnaam of link)"
                          className="text-xs pl-8"
                        />
                      </div>

                      {/* LinkedIn */}
                      <div className="relative">
                        <Linkedin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={linkedin}
                          onChange={(e) => setLinkedin(e.target.value)}
                          placeholder="LinkedIn profiel link"
                          className="text-xs pl-8"
                        />
                      </div>

                      {/* Twitter / X */}
                      <div className="relative">
                        <Twitter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={twitter}
                          onChange={(e) => setTwitter(e.target.value)}
                          placeholder="Twitter / X (@gebruikersnaam of link)"
                          className="text-xs pl-8"
                        />
                      </div>

                      {/* Telegram */}
                      <div className="relative">
                        <Send className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={telegram}
                          onChange={(e) => setTelegram(e.target.value)}
                          placeholder="Telegram (t.me/... of gebruikersnaam)"
                          className="text-xs pl-8"
                        />
                      </div>

                      {/* TikTok */}
                      <div className="relative">
                        <Video className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={tiktok}
                          onChange={(e) => setTiktok(e.target.value)}
                          placeholder="TikTok (@gebruikersnaam of link)"
                          className="text-xs pl-8"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setHasRep(false)}
                      className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      Vertegenwoordiger ontkoppelen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground bg-muted/20 rounded border border-dashed border-border">
                  Er is momenteel geen vertegenwoordiger gekoppeld aan deze wijk of kern.
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setHasRep(true)}
                      className="text-xs gap-1.5"
                    >
                      <Plus className="w-3 h-3" />
                      Vertegenwoordiger instellen
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={saving}
              className="text-xs"
            >
              Annuleren
            </Button>
            <Button
              type="button"
              onClick={handleSaveWijk}
              disabled={saving}
              className="text-xs gap-1.5 bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {saving ? "Opslaan..." : "Wijzigingen opslaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          ADD NEW WIJK / KERN DIALOG
          ======================================================== */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Nieuwe wijk of kern toevoegen
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Voeg een nieuw gebied toe aan Steenwijkerland.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold block mb-1">Naam</label>
              <Input
                value={newNaam}
                onChange={(e) => setNewNaam(e.target.value)}
                placeholder="bijv. Woldmeenthe Noord"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as "Wijk" | "Kern")}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="Wijk">Wijk (in Steenwijk)</option>
                  <option value="Kern">Kern (buiten Steenwijk)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Gemeente</label>
                <Input
                  value={newGemeente}
                  onChange={(e) => setNewGemeente(e.target.value)}
                  placeholder="Steenwijk"
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddDialogOpen(false)}
              className="text-xs"
            >
              Annuleren
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddNewWijk}
              className="text-xs bg-primary hover:bg-primary/90"
            >
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
