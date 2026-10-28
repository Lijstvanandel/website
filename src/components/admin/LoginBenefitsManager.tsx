import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users,
  Bell,
  Vote,
  Calendar,
  CheckCircle2,
  Heart,
  Handshake,
  ShieldCheck,
  Sparkles,
  Megaphone,
  MapPin,
  Building2,
  Award,
  BookOpen,
  MessageSquare,
  ThumbsUp,
  FileText,
  Globe,
  Star,
  Lightbulb,
  Flag,
  Landmark,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Upload,
  Save,
  RotateCcw,
  Image as ImageIcon,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Check,
  Loader2,
  Pencil,
} from "lucide-react";
import {
  LoginBenefitItem,
  LoginImageOption,
  LoginPageSettings,
  DEFAULT_LOGIN_BENEFITS,
  DEFAULT_LOGIN_SETTINGS,
  PRESET_LOGIN_IMAGES,
  LOGIN_BENEFIT_ICONS,
} from "@/data/loginBenefits";
import { Link } from "react-router-dom";

export const ICON_COMPONENTS_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Bell,
  Vote,
  Calendar,
  CheckCircle2,
  Heart,
  Handshake,
  ShieldCheck,
  Sparkles,
  Megaphone,
  MapPin,
  Building2,
  Award,
  BookOpen,
  MessageSquare,
  ThumbsUp,
  FileText,
  Globe,
  Star,
  Lightbulb,
  Flag,
  Landmark,
};

export function renderLoginBenefitIcon(iconName: string, className = "w-4 h-4") {
  const IconComp = ICON_COMPONENTS_MAP[iconName] || CheckCircle2;
  return <IconComp className={className} />;
}

interface LoginBenefitsManagerProps {
  token: string | null;
  headers: Record<string, string>;
}

export function LoginBenefitsManager({ headers }: LoginBenefitsManagerProps) {
  const [benefits, setBenefits] = useState<LoginBenefitItem[]>(DEFAULT_LOGIN_BENEFITS);
  const [customImages, setCustomImages] = useState<LoginImageOption[]>([]);
  const [presetImages, setPresetImages] = useState<LoginImageOption[]>(PRESET_LOGIN_IMAGES);
  const [settings, setSettings] = useState<LoginPageSettings>(DEFAULT_LOGIN_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newImageLabel, setNewImageLabel] = useState("");
  const [selectedBenefitIndex, setSelectedBenefitIndex] = useState<number>(0);
  const [previewSlideIndex, setPreviewSlideIndex] = useState<number>(0);
  const [previewPlaying, setPreviewPlaying] = useState<boolean>(true);

  const fetchLoginConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/login-benefits", { headers });
      const data = res.ok
        ? await res.json()
        : await fetch("/api/login-benefits").then((r) => r.json());

      if (data) {
        if (Array.isArray(data.benefits) && data.benefits.length > 0) {
          setBenefits(data.benefits);
        }
        if (Array.isArray(data.customImages)) {
          setCustomImages(data.customImages);
        }
        if (Array.isArray(data.presetImages) && data.presetImages.length > 0) {
          setPresetImages(data.presetImages);
        }
        if (data.settings) {
          setSettings({ ...DEFAULT_LOGIN_SETTINGS, ...data.settings });
        }
      }
    } catch (err) {
      console.error("Fout bij ophalen login-instellingen:", err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchLoginConfig();
  }, [fetchLoginConfig]);

  // Auto-advance live preview carousel
  useEffect(() => {
    if (!previewPlaying || !settings.autoPlay || benefits.length <= 1) return;
    const intervalMs = Math.max(2000, Number(settings.autoPlayIntervalMs) || 5000);
    const timer = setInterval(() => {
      setPreviewSlideIndex((prev) => (prev + 1) % benefits.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [previewPlaying, settings.autoPlay, settings.autoPlayIntervalMs, benefits.length]);

  useEffect(() => {
    if (previewSlideIndex >= benefits.length) {
      setPreviewSlideIndex(Math.max(0, benefits.length - 1));
    }
    if (selectedBenefitIndex >= benefits.length) {
      setSelectedBenefitIndex(Math.max(0, benefits.length - 1));
    }
  }, [benefits.length, previewSlideIndex, selectedBenefitIndex]);

  const allAvailableImages = [...customImages, ...presetImages];

  const saveAllChanges = async (
    nextBenefits: LoginBenefitItem[] = benefits,
    nextSettings: LoginPageSettings = settings,
    successMsg = "Wijzigingen voor /login opgeslagen!"
  ) => {
    try {
      setSaving(true);
      const normalized = nextBenefits.map((b, idx) => ({
        ...b,
        order: idx + 1,
      }));
      const res = await fetch("/api/admin/login-benefits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          benefits: normalized,
          settings: nextSettings,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Kon wijzigingen niet opslaan");
      }
      if (Array.isArray(data.benefits)) {
        setBenefits(data.benefits);
      }
      if (data.settings) {
        setSettings(data.settings);
      }
      toast.success(successMsg);
    } catch (err: any) {
      toast.error(err?.message || "Fout bij opslaan van login-voordelen");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveBenefit = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= benefits.length) return;

    const reordered = [...benefits];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    const withOrder = reordered.map((item, idx) => ({ ...item, order: idx + 1 }));

    setBenefits(withOrder);
    setSelectedBenefitIndex(targetIndex);
    setPreviewSlideIndex(targetIndex);

    try {
      const res = await fetch("/api/admin/login-benefits/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          orderedIds: withOrder.map((b) => b.id),
        }),
      });
      if (res.ok) {
        toast.success(`Volgorde aangepast: positie #${targetIndex + 1} in carrousel`);
      } else {
        await saveAllChanges(withOrder, settings, "Carrousel volgorde opgeslagen!");
      }
    } catch {
      await saveAllChanges(withOrder, settings, "Carrousel volgorde opgeslagen!");
    }
  };

  const handleUpdateBenefitField = (
    index: number,
    field: keyof LoginBenefitItem,
    value: string | number
  ) => {
    setBenefits((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const handleAddBenefit = () => {
    const newItem: LoginBenefitItem = {
      id: `benefit-${Date.now()}`,
      text: "Nieuw voordeel voor leden van Lijst van Andel",
      icon: "CheckCircle2",
      imageUrl: allAvailableImages[0]?.url || "/assets/markt-steenwijk.jpg",
      imageAlt: "Voordeel Lijst van Andel",
      order: benefits.length + 1,
    };
    const next = [...benefits, newItem];
    setBenefits(next);
    setSelectedBenefitIndex(next.length - 1);
    setPreviewSlideIndex(next.length - 1);
    toast.info("Nieuw voordeel toegevoegd. Pas de tekst, het icoon en de afbeelding aan en klik op Opslaan.");
  };

  const handleDeleteBenefit = async (index: number) => {
    if (benefits.length <= 1) {
      toast.error("Er moet minimaal één voordeel in de carrousel blijven staan.");
      return;
    }
    const item = benefits[index];
    if (!confirm(`Weet u zeker dat u dit voordeel wilt verwijderen?\n\n"${item.text}"`)) {
      return;
    }
    const next = benefits
      .filter((_, idx) => idx !== index)
      .map((b, idx) => ({ ...b, order: idx + 1 }));
    setBenefits(next);
    setSelectedBenefitIndex(Math.max(0, index - 1));
    await saveAllChanges(next, settings, "Voordeel verwijderd uit carrousel");
  };

  const handleUploadImage = async (
    file: File,
    assignToBenefitIndex?: number
  ) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("loginImage", file);
      if (newImageLabel.trim()) {
        formData.append("label", newImageLabel.trim());
      }

      const res = await fetch("/api/admin/login-benefits/upload-image", {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.image) {
        throw new Error(data.error || "Uploaden van afbeelding mislukt");
      }

      if (Array.isArray(data.customImages)) {
        setCustomImages(data.customImages);
      }
      setNewImageLabel("");

      if (typeof assignToBenefitIndex === "number" && benefits[assignToBenefitIndex]) {
        const nextBenefits = [...benefits];
        nextBenefits[assignToBenefitIndex] = {
          ...nextBenefits[assignToBenefitIndex],
          imageUrl: data.image.url,
          imageAlt: data.image.label || nextBenefits[assignToBenefitIndex].text,
        };
        setBenefits(nextBenefits);
        await saveAllChanges(
          nextBenefits,
          settings,
          `Afbeelding geüpload en gekoppeld aan voordeel #${assignToBenefitIndex + 1}!`
        );
      } else {
        toast.success("Nieuwe afbeelding toegevoegd aan de /login bibliotheek!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Fout bij uploaden afbeelding");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteCustomImage = async (img: LoginImageOption) => {
    if (!confirm(`Afbeelding "${img.label}" verwijderen uit de bibliotheek?`)) return;
    try {
      let res = await fetch(`/api/admin/login-benefits/images/${img.id}`, {
        method: "DELETE",
        headers,
      });
      if (res.status === 404 || res.status === 405) {
        res = await fetch(`/api/admin/login-benefits/images/${img.id}/delete`, {
          method: "POST",
          headers,
        });
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (Array.isArray(data.customImages)) {
          setCustomImages(data.customImages);
        } else {
          setCustomImages((prev) => prev.filter((i) => i.id !== img.id));
        }
        toast.success("Afbeelding verwijderd uit bibliotheek");
      } else {
        toast.error(data.error || "Kon afbeelding niet verwijderen");
      }
    } catch (err: any) {
      toast.error(err?.message || "Fout bij verwijderen afbeelding");
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm("Wilt u de voordelen en carrousel-instellingen terugzetten naar de standaardwaarden?")) {
      return;
    }
    try {
      setSaving(true);
      const res = await fetch("/api/admin/login-benefits/reset", {
        method: "POST",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.benefits) {
        setBenefits(data.benefits);
        setSettings(data.settings || DEFAULT_LOGIN_SETTINGS);
        setSelectedBenefitIndex(0);
        setPreviewSlideIndex(0);
        toast.success("Standaard voordelen en volgorde hersteld!");
      }
    } catch {
      toast.error("Kon standaardwaarden niet herstellen");
    } finally {
      setSaving(false);
    }
  };

  const activeBenefit = benefits[selectedBenefitIndex] || benefits[0];
  const activePreviewBenefit = benefits[previewSlideIndex] || benefits[0];

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
        <span className="text-sm">Inlogpagina (/login) instellingen en afbeeldingen laden...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header Bar */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-1">
            Inlogpagina &amp; Ledenvoordelen Carrousel
          </div>
          <h2 className="text-2xl font-display text-foreground">
            Beheer /login Afbeeldingen, Voordelen &amp; Carrousel
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Pas hier de voordelen op <strong>/login</strong> aan (zoals <em>&ldquo;Ontmoet u andere LVA&apos;ers die de gemeente een warm hart toedragen&rdquo;</em>), kies per voordeel een icoon en een gekoppelde afbeelding die boven het balkje wordt getoond, en bepaal de volgorde van het automatisch scrollende carrousel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link to="/login" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-border">
              <ExternalLink className="w-3.5 h-3.5 text-accent" />
              <span>Bekijk /login</span>
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            disabled={saving}
            className="h-9 text-xs gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Standaardwaarden</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => saveAllChanges(benefits, settings)}
            disabled={saving}
            className="h-9 px-4 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5 shadow-sm"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Alle wijzigingen opslaan</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Left = Benefits & Order + Editor, Right = Live Carousel Preview & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): Carousel Order List + Selected Benefit Editor */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Carousel Items & Order List */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
              <div>
                <h3 className="text-lg font-display text-foreground">
                  1. Carrousel Volgorde &amp; Voordelen ({benefits.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Gebruik de pijltjes om de volgorde van het carrousel te bepalen of klik op een voordeel om deze hieronder aan te passen.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleAddBenefit}
                className="h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Voordeel toevoegen</span>
              </Button>
            </div>

            <div className="space-y-2.5">
              {benefits.map((item, idx) => {
                const isSelected = idx === selectedBenefitIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedBenefitIndex(idx);
                      setPreviewSlideIndex(idx);
                    }}
                    className={`group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-accent/10 border-accent ring-1 ring-accent shadow-sm"
                        : "bg-background/60 hover:bg-muted/40 border-border/80"
                    }`}
                  >
                    {/* Position number badge */}
                    <div
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {idx + 1}
                    </div>

                    {/* Linked Image Thumbnail */}
                    <div className="w-16 h-11 rounded-lg overflow-hidden border border-border bg-muted shrink-0 relative">
                      <img
                        src={item.imageUrl}
                        alt={item.imageAlt || item.text}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/assets/markt-steenwijk.jpg";
                        }}
                      />
                    </div>

                    {/* Selected Icon + Benefit Text */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                        {renderLoginBenefitIcon(item.icon, "w-4 h-4")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-medium text-foreground line-clamp-2 leading-snug">
                          {item.text || <span className="italic text-muted-foreground">(Geen tekst)</span>}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>Icoon: {item.icon}</span>
                          <span>&bull;</span>
                          <span className="truncate">{item.imageUrl.split("/").pop()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Up / Down / Edit / Delete buttons */}
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={idx === 0}
                        onClick={() => handleMoveBenefit(idx, "up")}
                        className="h-8 w-8 border-border"
                        title="Verplaats omhoog in carrousel"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={idx === benefits.length - 1}
                        onClick={() => handleMoveBenefit(idx, "down")}
                        className="h-8 w-8 border-border"
                        title="Verplaats omlaag in carrousel"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedBenefitIndex(idx);
                          setPreviewSlideIndex(idx);
                        }}
                        className="h-8 w-8 text-accent hover:bg-accent/15"
                        title="Bewerk dit voordeel"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={benefits.length <= 1}
                        onClick={() => handleDeleteBenefit(idx)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        title="Verwijder dit voordeel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Active Benefit Editor */}
          {activeBenefit && (
            <div className="bg-card rounded-xl border-2 border-accent/40 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-accent text-accent-foreground font-bold text-xs flex items-center justify-center">
                    #{selectedBenefitIndex + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-display text-foreground">
                      2. Voordeel #{selectedBenefitIndex + 1} Bewerken
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Wijzig de tekst in het balkje, kies het bijbehorende icoon en selecteer de afbeelding die boven het balkje verschijnt.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    saveAllChanges(
                      benefits,
                      settings,
                      `Voordeel #${selectedBenefitIndex + 1} opgeslagen!`
                    )
                  }
                  disabled={saving}
                  className="h-9 px-3.5 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Opslaan</span>
                </Button>
              </div>

              {/* Text Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground block">
                  Tekst van het voordeel (in het balkje onder de afbeelding)
                </label>
                <Textarea
                  rows={2}
                  value={activeBenefit.text}
                  onChange={(e) =>
                    handleUpdateBenefitField(selectedBenefitIndex, "text", e.target.value)
                  }
                  placeholder="Bijv. Ontmoet u andere LVA'ers die de gemeente een warm hart toedragen"
                  className="text-sm font-medium"
                />
              </div>

              {/* Icon Picker */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground block">
                  Kies een icoon voor in het balkje (Huidig: <span className="text-accent">{activeBenefit.icon}</span>)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1">
                  {LOGIN_BENEFIT_ICONS.map((iconOpt) => {
                    const isCurrentIcon = activeBenefit.icon === iconOpt.name;
                    return (
                      <button
                        key={iconOpt.name}
                        type="button"
                        onClick={() =>
                          handleUpdateBenefitField(selectedBenefitIndex, "icon", iconOpt.name)
                        }
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                          isCurrentIcon
                            ? "bg-accent text-accent-foreground border-accent font-semibold shadow-sm"
                            : "bg-background/70 hover:bg-muted border-border text-foreground/80"
                        }`}
                      >
                        {renderLoginBenefitIcon(iconOpt.name, "w-4 h-4")}
                        <span className="text-[10px] leading-tight line-clamp-1">
                          {iconOpt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Image Selector for this Benefit */}
              <div className="space-y-3 pt-2 border-t border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-foreground block">
                      Gekoppelde afbeelding boven het balkje
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Selecteer een afbeelding uit de galerij hieronder of upload direct een nieuwe foto voor voordeel #{selectedBenefitIndex + 1}.
                    </p>
                  </div>

                  {/* Direct upload button for this benefit */}
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30 text-xs font-semibold cursor-pointer shrink-0 transition-colors">
                    {uploadingImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Nieuwe foto uploaden &amp; koppelen</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadImage(file, selectedBenefitIndex);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Visual Image Picker Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
                  {allAvailableImages.map((img) => {
                    const isSelectedImg = activeBenefit.imageUrl === img.url;
                    return (
                      <div
                        key={img.id}
                        onClick={() =>
                          handleUpdateBenefitField(selectedBenefitIndex, "imageUrl", img.url)
                        }
                        className={`group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                          isSelectedImg
                            ? "border-accent ring-2 ring-accent/40 shadow-md"
                            : "border-border/80 hover:border-accent/50"
                        }`}
                      >
                        <div className="aspect-16/10 bg-muted relative overflow-hidden">
                          <img
                            src={img.url}
                            alt={img.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {isSelectedImg && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {!img.isPreset && (
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-semibold uppercase">
                              Eigen upload
                            </span>
                          )}
                        </div>
                        <div className="p-2 bg-card flex items-center justify-between gap-1">
                          <span className="text-[11px] font-medium text-foreground truncate">
                            {img.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Image URL fallback input */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground shrink-0">Afbeeldingspad:</span>
                  <Input
                    value={activeBenefit.imageUrl}
                    onChange={(e) =>
                      handleUpdateBenefitField(selectedBenefitIndex, "imageUrl", e.target.value)
                    }
                    placeholder="/assets/markt-steenwijk.jpg of /uploads/login/..."
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (5 cols): Live Carousel Preview + Carousel Speed & Texts + Image Library */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Preview Card matching /login */}
          <div className="bg-accent/5 border border-accent/30 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-wider font-semibold text-accent flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Live Voorbeeld op /login</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewPlaying((p) => !p)}
                  className="h-7 px-2.5 text-[11px] gap-1 border-accent/30"
                >
                  {previewPlaying ? (
                    <>
                      <Pause className="w-3 h-3" /> Pauzeer
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" /> Auto-scroll
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent/15 text-accent">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                </span>
                <h3 className="text-xl font-display text-foreground">
                  {settings.sectionTitle || "Voordelen als lid"}
                </h3>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed mb-4">
                {settings.sectionSubtitle}
              </p>

              {/* Active Carousel Slide: Image ABOVE the benefit bar */}
              {activePreviewBenefit && (
                <div className="space-y-3">
                  <div className="rounded-xl overflow-hidden border border-accent/25 bg-background/80 shadow-md transition-all">
                    {/* Gekoppelde afbeelding BOVEN het balkje */}
                    <div className="relative aspect-16/10 w-full bg-muted overflow-hidden">
                      <img
                        src={activePreviewBenefit.imageUrl}
                        alt={activePreviewBenefit.imageAlt || activePreviewBenefit.text}
                        className="w-full h-full object-cover transition-all duration-500"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/assets/markt-steenwijk.jpg";
                        }}
                      />
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-xs text-white text-[11px] font-semibold">
                        {previewSlideIndex + 1} / {benefits.length}
                      </div>
                    </div>

                    {/* Het balkje met icoon en tekst eronder */}
                    <div className="flex items-start gap-3.5 p-4 bg-background/90 border-t border-accent/20">
                      <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center text-accent">
                        {renderLoginBenefitIcon(activePreviewBenefit.icon, "w-4 h-4")}
                      </div>
                      <span className="text-sm text-foreground font-medium leading-snug">
                        {activePreviewBenefit.text}
                      </span>
                    </div>
                  </div>

                  {/* Carousel Controls & Dots */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      {benefits.map((b, idx) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setPreviewSlideIndex(idx);
                            setSelectedBenefitIndex(idx);
                          }}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            idx === previewSlideIndex
                              ? "w-6 bg-accent"
                              : "w-2 bg-accent/30 hover:bg-accent/50"
                          }`}
                          title={`Slide ${idx + 1}: ${b.text}`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setPreviewSlideIndex(
                            (prev) => (prev - 1 + benefits.length) % benefits.length
                          )
                        }
                        className="h-7 w-7 border-accent/30"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setPreviewSlideIndex((prev) => (prev + 1) % benefits.length)
                        }
                        className="h-7 w-7 border-accent/30"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Carousel Settings & Texts */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-display text-foreground">
              3. Carrousel Snelheid &amp; Teksten
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground block">
                  Automatisch scrollen
                </label>
                <select
                  value={settings.autoPlay ? "true" : "false"}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, autoPlay: e.target.value === "true" }))
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
                >
                  <option value="true">Aan (Automatisch afspelen)</option>
                  <option value="false">Uit (Alleen handmatig bladeren)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground block">
                  Snelheid per slide
                </label>
                <select
                  value={String(settings.autoPlayIntervalMs || 5000)}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      autoPlayIntervalMs: Number(e.target.value) || 5000,
                    }))
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
                >
                  <option value="3000">Elke 3 seconden</option>
                  <option value="4000">Elke 4 seconden</option>
                  <option value="5000">Elke 5 seconden (Aanbevolen)</option>
                  <option value="6000">Elke 6 seconden</option>
                  <option value="8000">Elke 8 seconden</option>
                  <option value="10000">Elke 10 seconden</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground block">
                Koptekst boven voordelen
              </label>
              <Input
                value={settings.sectionTitle}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, sectionTitle: e.target.value }))
                }
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground block">
                Introductietekst
              </label>
              <Textarea
                rows={2}
                value={settings.sectionSubtitle}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, sectionSubtitle: e.target.value }))
                }
                className="text-xs"
              />
            </div>

            <Button
              type="button"
              onClick={() => saveAllChanges(benefits, settings)}
              disabled={saving}
              className="w-full h-9 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Carrousel-instellingen opslaan</span>
            </Button>
          </div>

          {/* 4. Dedicated /login Image Library Manager */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-display text-foreground flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-accent" />
                  <span>4. Afbeeldingenbibliotheek voor /login</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Upload extra foto&apos;s om te gebruiken in het voordelen-carrousel op /login.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newImageLabel}
                onChange={(e) => setNewImageLabel(e.target.value)}
                placeholder="Optioneel: Naam/bijschrift voor nieuwe foto..."
                className="h-9 text-xs flex-1"
              />
              <label className="inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold cursor-pointer shrink-0">
                {uploadingImage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>Foto Uploaden</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUploadImage(file);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>

            {customImages.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-foreground">
                  Eigen geüploade foto&apos;s ({customImages.length})
                </div>
                <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {customImages.map((img) => (
                    <div
                      key={img.id}
                      className="rounded-lg border border-border overflow-hidden bg-background/60 flex flex-col justify-between"
                    >
                      <div className="aspect-16/10 bg-muted relative">
                        <img
                          src={img.url}
                          alt={img.label}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2 flex items-center justify-between gap-1">
                        <span className="text-[11px] font-medium truncate" title={img.label}>
                          {img.label}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              handleUpdateBenefitField(
                                selectedBenefitIndex,
                                "imageUrl",
                                img.url
                              );
                              toast.info(
                                `Foto gekoppeld aan voordeel #${selectedBenefitIndex + 1}`
                              );
                            }}
                            className="h-6 w-6 text-accent hover:bg-accent/15"
                            title={`Koppel aan voordeel #${selectedBenefitIndex + 1}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCustomImage(img)}
                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            title="Verwijder foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Nog geen eigen foto&apos;s geüpload. U kunt hierboven een eigen foto uploaden of kiezen uit de {presetImages.length} standaard Steenwijkerland/LVA afbeeldingen.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
