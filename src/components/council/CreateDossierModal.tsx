import React, { useState } from "react";
import { X, FolderPlus, Image, Tag, Sparkles, Layers, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Dossier } from "@/types/dossier";
import { WIJKEN_EN_KERNEN } from "@/data/wijken";

interface CreateDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (dossier: Dossier) => void;
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
];

export const CreateDossierModal: React.FC<CreateDossierModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Gemeenteraad & Beleid");
  const [thumbnail, setThumbnail] = useState(PRESET_THUMBNAILS[0].url);
  const [tags, setTags] = useState("");
  const [wijkSlug, setWijkSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Vul een titel in voor het dossier");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedWijk = WIJKEN_EN_KERNEN.find((w) => w.slug === wijkSlug);
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/council/dossiers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          thumbnail,
          wijkSlug: wijkSlug || "",
          wijkNaam: selectedWijk ? selectedWijk.naam : "",
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon dossier niet aanmaken");

      toast.success(`Dossier '${title}' succesvol aangemaakt!`);
      onCreated(data.dossier);
      onClose();
      // Reset form
      setTitle("");
      setDescription("");
      setTags("");
      setWijkSlug("");
    } catch (err: any) {
      toast.error(err.message || "Fout bij aanmaken dossier");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="create-dossier-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        id="create-dossier-modal-card"
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/15 text-accent">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Nieuw Raadsdossier Aanmaken
              </h3>
              <p className="text-xs text-muted-foreground">
                Voeg handmatig een nieuw dossier toe aan het raadspaneel
              </p>
            </div>
          </div>
          <Button
            id="btn-close-create-dossier"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Dossiertitel *
            </label>
            <Input
              id="input-dossier-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Woningbouwplan Eeserwold 2026..."
              className="text-xs h-9 rounded-xl"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Categorie
            </label>
            <select
              id="select-dossier-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs h-9 px-3 rounded-xl bg-background border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-accent"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-accent" />
                Koppel aan Wijk of Kern (Optioneel)
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">Voor wijkpagina</span>
            </label>
            <select
              id="select-dossier-wijk"
              value={wijkSlug}
              onChange={(e) => setWijkSlug(e.target.value)}
              className="w-full text-xs h-9 px-3 rounded-xl bg-background border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-accent"
            >
              <option value="">Geen / Gemeentebreed (Algemeen)</option>
              <optgroup label="Stadswijken Steenwijk">
                {WIJKEN_EN_KERNEN.filter((w) => w.type === "Wijk").map((w) => (
                  <option key={w.slug} value={w.slug}>
                    {w.naam}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Kernen & Dorpen">
                {WIJKEN_EN_KERNEN.filter((w) => w.type === "Kern").map((w) => (
                  <option key={w.slug} value={w.slug}>
                    {w.naam}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Beschrijving & Context
            </label>
            <Textarea
              id="textarea-dossier-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Korte toelichting over de context, betrokken partijen en raadsbehandeling..."
              rows={3}
              className="text-xs rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Tags / Trefwoorden (gescheiden door komma's)
            </label>
            <Input
              id="input-dossier-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Steenwijk, Woningbouw, Bestemmingsplan, Didam..."
              className="text-xs h-9 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Thumbnail Afbeelding
            </label>
            <Input
              id="input-dossier-thumbnail"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="text-xs h-9 rounded-xl mb-2 font-mono text-[11px]"
            />
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {PRESET_THUMBNAILS.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setThumbnail(preset.url)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors shrink-0 ${
                    thumbnail === preset.url
                      ? "bg-accent/15 border-accent text-accent"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview banner */}
          <div className="rounded-xl overflow-hidden border border-border bg-muted/20 p-2.5 flex items-center gap-3">
            <img
              src={thumbnail}
              alt="Preview"
              className="w-16 h-12 rounded-lg object-cover bg-muted shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = PRESET_THUMBNAILS[0].url;
              }}
            />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">
                {category}
              </span>
              <div className="text-xs font-bold text-foreground truncate">
                {title || "Voorbeeld Dossiertitel"}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {description || "Geen beschrijving opgegeven"}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs rounded-xl"
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !title.trim()}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-xs rounded-xl"
            >
              {isSubmitting ? "Aanmaken..." : "Dossier Opslaan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
