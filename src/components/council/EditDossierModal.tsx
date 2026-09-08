import React, { useState, useEffect } from "react";
import {
  X,
  Edit3,
  Image,
  Tag,
  Upload,
  Trash2,
  Check,
  AlertTriangle,
  FolderEdit,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Dossier } from "@/types/dossier";

interface EditDossierModalProps {
  isOpen: boolean;
  dossier: Dossier | null;
  onClose: () => void;
  onUpdated: (updatedDossier: Dossier) => void;
  onDeleted?: (deletedSlug: string) => void;
}

const CATEGORY_OPTIONS = [
  "Gemeenteraad & Beleid",
  "Ruimte & Wonen",
  "Bestuur & Regelingen",
  "Sociaal Domein & Zorg",
  "Natuur & Milieu",
  "Energie & Duurzaamheid",
  "Cultuur & Erfgoed",
  "Financiën & Economie",
  "Verkeer & Vervoer",
  "Veiligheid & Handhaving",
];

const PRESET_THUMBNAILS = [
  {
    label: "Raadhuis / Bestuur",
    url: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Woningbouw / Kernen",
    url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Natuur & Water",
    url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Energie & Duurzaam",
    url: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Samenleving & Zorg",
    url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Verkeer & Infra",
    url: "https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=800&auto=format&fit=crop&q=80",
  },
];

export const EditDossierModal: React.FC<EditDossierModalProps> = ({
  isOpen,
  dossier,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Gemeenteraad & Beleid");
  const [thumbnail, setThumbnail] = useState("");
  const [thumbnailTab, setThumbnailTab] = useState<"presets" | "upload" | "url">("presets");
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);

  // Tags management
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (dossier) {
      setTitle(dossier.title || "");
      setDescription(dossier.description || "");
      setCategory(dossier.category || "Gemeenteraad & Beleid");
      setThumbnail(dossier.thumbnail || PRESET_THUMBNAILS[0].url);
      setTags(Array.isArray(dossier.tags) ? [...dossier.tags] : []);
      setShowDeleteConfirm(false);
    }
  }, [dossier]);

  if (!isOpen || !dossier) return null;

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#+/, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleCustomThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Upload a.u.b. een afbeeldingsbestand (JPG, PNG, WebP).");
      return;
    }

    setIsUploadingThumb(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const formData = new FormData();
      formData.append("thumbnail", file);

      const res = await fetch("/api/council/upload-thumbnail", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij uploaden thumbnail");

      setThumbnail(data.url);
      toast.success("Nieuwe thumbnail afbeelding geüpload!");
    } catch (err: any) {
      toast.error(err.message || "Fout bij uploaden thumbnail");
    } finally {
      setIsUploadingThumb(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Vul een titel in voor het dossier");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/council/dossiers/${encodeURIComponent(dossier.slug || dossier.id)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          thumbnail,
          tags,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon dossier niet bijwerken");

      toast.success(`Dossier '${title}' succesvol bijgewerkt!`);
      onUpdated(data.dossier);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Fout bij bijwerken dossier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDossier = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/council/dossiers/${encodeURIComponent(dossier.slug || dossier.id)}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon dossier niet verwijderen");

      toast.success(`Dossier '${dossier.title}' is verwijderd.`);
      if (onDeleted) {
        onDeleted(dossier.slug || dossier.id);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Fout bij verwijderen dossier");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      id="edit-dossier-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs transition-opacity overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="edit-dossier-modal-card"
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/10 text-accent">
              <FolderEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base leading-tight">
                Dossier Bewerken
              </h3>
              <p className="text-xs text-muted-foreground">
                Pas titel, beschrijving, thumbnail en hashtags aan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Titel */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Dossiertitel *</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Korte, duidelijke naam van het beleidsonderwerp
              </span>
            </label>
            <Input
              id="edit-dossier-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Woningbouw & Uitbreidingslocaties"
              required
              className="text-xs rounded-xl"
            />
          </div>

          {/* Categorie */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Beleidscategorie
            </label>
            <select
              id="edit-dossier-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Beschrijving */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Beschrijving & Doelstelling
            </label>
            <Textarea
              id="edit-dossier-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschrijf de context, relevante raadsbesluiten en achtergrond van dit dossier..."
              rows={3}
              className="text-xs rounded-xl resize-none"
            />
          </div>

          {/* Thumbnail Management */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-accent" />
                Thumbnail Omslagafbeelding
              </label>

              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setThumbnailTab("presets")}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    thumbnailTab === "presets"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Presets
                </button>
                <button
                  type="button"
                  onClick={() => setThumbnailTab("upload")}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    thumbnailTab === "upload"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Uploaden
                </button>
                <button
                  type="button"
                  onClick={() => setThumbnailTab("url")}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    thumbnailTab === "url"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  URL
                </button>
              </div>
            </div>

            {/* Live Thumbnail Preview */}
            <div className="relative h-28 w-full rounded-2xl overflow-hidden border border-border bg-muted">
              <img
                src={thumbnail}
                alt="Thumbnail preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = PRESET_THUMBNAILS[0].url;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2.5">
                <span className="text-[11px] text-white font-medium drop-shadow-xs">
                  Huidige voorvertoning
                </span>
              </div>
            </div>

            {/* Tab: Presets */}
            {thumbnailTab === "presets" && (
              <div className="grid grid-cols-3 gap-2">
                {PRESET_THUMBNAILS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setThumbnail(preset.url)}
                    className={`relative rounded-xl overflow-hidden border text-left h-16 group transition-all ${
                      thumbnail === preset.url
                        ? "border-accent ring-2 ring-accent/30"
                        : "border-border hover:border-accent/40"
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                      <span className="text-[9px] font-semibold text-white leading-tight">
                        {preset.label}
                      </span>
                    </div>
                    {thumbnail === preset.url && (
                      <div className="absolute top-1 right-1 bg-accent text-accent-foreground rounded-full p-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Tab: Upload */}
            {thumbnailTab === "upload" && (
              <div className="p-3 border border-dashed border-border rounded-xl bg-background/50 flex flex-col items-center justify-center text-center">
                <Upload className="w-6 h-6 text-accent mb-1.5" />
                <p className="text-xs font-semibold text-foreground mb-0.5">
                  Upload een eigen foto
                </p>
                <p className="text-[10px] text-muted-foreground mb-2">
                  JPG, PNG of WebP (max 15 MB)
                </p>
                <label className="cursor-pointer">
                  <span className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90 transition-colors inline-block">
                    {isUploadingThumb ? "Bezig met uploaden..." : "Bestand kiezen"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCustomThumbnailUpload}
                    disabled={isUploadingThumb}
                  />
                </label>
              </div>
            )}

            {/* Tab: URL */}
            {thumbnailTab === "url" && (
              <Input
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="text-xs rounded-xl"
              />
            )}
          </div>

          {/* Hashtags / Tags Management */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-accent" />
              Hashtags & Beleidstrefwoorden
            </label>

            {/* Existing tags badges */}
            <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 bg-muted/30 border border-border rounded-xl">
              {tags.length === 0 ? (
                <span className="text-[11px] text-muted-foreground italic">
                  Nog geen hashtags toegevoegd. Voeg trefwoorden toe hieronder.
                </span>
              ) : (
                tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs bg-card border border-border text-foreground shadow-2xs"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Add Tag Input */}
            <div className="flex items-center gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Nieuwe hashtag (bijv. Woningbouw, Steenwijk)..."
                className="text-xs rounded-xl flex-1"
              />
              <Button
                type="button"
                onClick={handleAddTag}
                variant="outline"
                size="sm"
                className="rounded-xl text-xs shrink-0"
              >
                Toevoegen
              </Button>
            </div>

            {/* Tag suggestions */}
            <div className="flex flex-wrap gap-1 pt-1 text-[10px] text-muted-foreground">
              <span className="self-center font-medium mr-1">Suggesties:</span>
              {[
                "Woningbouw",
                "RuimtelijkeOrdening",
                "Duurzaamheid",
                "Raadsvoorstel",
                "Participatie",
                "Financiën",
                "Steenwijk",
                "Kernen",
              ].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => {
                    if (!tags.includes(sug)) setTags([...tags, sug]);
                  }}
                  className="px-1.5 py-0.5 rounded bg-muted hover:bg-accent/15 hover:text-accent transition-colors"
                >
                  +{sug}
                </button>
              ))}
            </div>
          </div>

          {/* Delete Dossier Accordion / Danger Zone */}
          <div className="pt-3 border-t border-border">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-destructive hover:underline flex items-center gap-1.5 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Dossier verwijderen...
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-2">
                <div className="flex items-start gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold">Weet u zeker dat u dit dossier wilt verwijderen?</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Het dossier '{title}' wordt verwijderd uit de overzichten. De raadsdocumenten blijven bewaard in het archief.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="h-8 text-xs rounded-xl"
                  >
                    Annuleren
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                    onClick={handleDeleteDossier}
                    className="h-8 text-xs rounded-xl"
                  >
                    {isDeleting ? "Bezig met verwijderen..." : "Ja, definitief verwijderen"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs rounded-xl h-9"
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold rounded-xl h-9 px-5 shadow-xs"
            >
              {isSubmitting ? "Opslaan..." : "Wijzigingen Opslaan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
