import React, { useState, useEffect } from "react";
import {
  X,
  Image,
  Tag,
  Upload,
  Check,
  FolderEdit,
  FolderTree,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DossierSubdossier } from "@/types/dossier";

interface EditSubdossierModalProps {
  isOpen: boolean;
  dossierSlug: string;
  hoofddossierTitle: string;
  subdossier: DossierSubdossier | null;
  onClose: () => void;
  onUpdated: (updatedSub: any) => void;
}

const PRESET_SUB_THUMBNAILS = [
  {
    label: "Woningbouw & Kernen",
    url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Natuur, Weerribben & Stikstof",
    url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Waterbeheer & Waterschap",
    url: "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Milieu, Lucht & Handhaving",
    url: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Zonne-energie & Zonneparken",
    url: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Windenergie & Duurzaamheid",
    url: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Wegen, Verkeer & Infrastructuur",
    url: "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Sociaal Domein, Gezin & Zorg",
    url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Bestuur, APV & Veiligheid",
    url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Financiën, Begroting & Subsidie",
    url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80",
  },
];

export const EditSubdossierModal: React.FC<EditSubdossierModalProps> = ({
  isOpen,
  dossierSlug,
  hoofddossierTitle,
  subdossier,
  onClose,
  onUpdated,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (subdossier) {
      setTitle(subdossier.title || "");
      setDescription(subdossier.description || "");
      setThumbnail(subdossier.thumbnail || "");
      setTagsInput((subdossier.tags || []).join(", "));
    }
  }, [subdossier]);

  if (!isOpen || !subdossier) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Uploaden van omslag mislukt");
      }

      const data = await res.json();
      if (data.url) {
        setThumbnail(data.url);
        toast.success("Afbeelding geüpload!");
      }
    } catch (err: any) {
      toast.error(err.message || "Fout bij uploaden afbeelding");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Subdossiertitel is verplicht");
      return;
    }

    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const subSlug = subdossier.slug || subdossier.id;
      const res = await fetch(
        `/api/council/dossiers/${encodeURIComponent(dossierSlug)}/subdossiers/${encodeURIComponent(subSlug)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            thumbnail: thumbnail.trim(),
            tags,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Fout bij opslaan van subdossier");
      }

      toast.success("Subdossier succesvol bijgewerkt!");
      onUpdated({
        ...subdossier,
        title: title.trim(),
        description: description.trim(),
        thumbnail: thumbnail.trim(),
        tags,
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Fout bij bijwerken");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-accent uppercase tracking-wider">
                Subdossier binnen {hoofddossierTitle}
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">
                Subdossier Gegevens & Thumbnail
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Titel */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Titel van het subdossier</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Handhaving en Geurmetingen"
              className="rounded-xl h-10 text-xs"
              required
            />
          </div>

          {/* Beschrijving */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Korte toelichting</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschrijf de specifieke reikwijdte van dit subdossier..."
              className="rounded-xl min-h-[80px] text-xs resize-y"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-accent" />
              Tags & Trefwoorden (kommagescheiden)
            </label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Bijv. Handhaving, Geurhinder, IceBear, Milieuvergunning"
              className="rounded-xl h-10 text-xs"
            />
          </div>

          {/* Subdossier Thumbnail */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Image className="w-4 h-4 text-accent" />
                Zelfstandige Thumbnail / Omslagafbeelding
              </label>
              {thumbnail && (
                <a
                  href={thumbnail}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-accent hover:underline flex items-center gap-1"
                >
                  Bekijk volledig <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Thumbnail Preview Banner */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-muted border border-border shadow-2xs group">
              <img
                src={
                  thumbnail ||
                  "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80"
                }
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <div className="text-[10px] font-bold uppercase tracking-wider text-accent drop-shadow-xs">
                  Thumbnail voorbeeld
                </div>
                <div className="text-sm font-bold truncate drop-shadow-xs">{title || subdossier.title}</div>
              </div>
            </div>

            {/* Input & Upload */}
            <div className="flex gap-2">
              <Input
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                placeholder="https://images.unsplash.com/... of /uploads/..."
                className="rounded-xl h-9 text-xs flex-1"
              />
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  className="rounded-xl h-9 text-xs flex items-center gap-1.5"
                  asChild
                >
                  <span>
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? "Uploaden..." : "Upload foto"}
                  </span>
                </Button>
              </label>
            </div>

            {/* Presets */}
            <div>
              <div className="text-[11px] font-medium text-muted-foreground mb-2">
                Of kies een relevante thematische foto:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {PRESET_SUB_THUMBNAILS.map((preset, idx) => {
                  const isSelected = thumbnail === preset.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setThumbnail(preset.url)}
                      className={`relative rounded-xl overflow-hidden aspect-[4/3] border text-left transition-all ${
                        isSelected
                          ? "border-accent ring-2 ring-accent/40 shadow-xs"
                          : "border-border hover:border-accent/40"
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                      <div className="absolute bottom-1 left-1 right-1">
                        <span className="text-[9px] font-semibold text-white line-clamp-1 leading-tight">
                          {preset.label}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs h-9"
              disabled={saving}
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl text-xs h-9 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
            >
              {saving ? "Opslaan..." : "Wijzigingen opslaan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
