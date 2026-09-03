import React, { useState, useEffect, useCallback } from "react";
import { Plus, Tag, Trash2, Edit3, Check, X, Palette, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export interface NewsCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  createdAt?: string;
}

interface CategoryManagerProps {
  token: string | null;
  onCategoriesChange?: (categories: NewsCategory[]) => void;
  className?: string;
}

const COLOR_PRESETS = [
  { label: "Goud (Partij)", hex: "#c6a858" },
  { label: "Donkergroen", hex: "#2d6a4f" },
  { label: "Bosgroen", hex: "#40916c" },
  { label: "Steenblauw", hex: "#3d5a80" },
  { label: "Warm Terra", hex: "#d4a373" },
  { label: "Robijnrood", hex: "#e76f51" },
  { label: "Dieppaars", hex: "#7209b7" },
  { label: "Neutraal Grijs", hex: "#6c757d" },
];

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  token,
  onCategoriesChange,
  className = "",
}) => {
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // New category form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#c6a858");
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("#c6a858");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data: NewsCategory[] = await res.json();
        setCategories(data);
        if (onCategoriesChange) onCategoriesChange(data);
      }
    } catch (e) {
      console.error("Fout bij ophalen categorieën:", e);
    } finally {
      setLoading(false);
    }
  }, [onCategoriesChange]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleNameChange = (val: string) => {
    setName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(autoSlug);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Voer een categorienaam in");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim(),
          color,
        }),
      });

      if (res.ok) {
        toast.success(`Categorie '${name}' toegevoegd!`);
        setName("");
        setSlug("");
        setDescription("");
        setColor("#c6a858");
        fetchCategories();
      } else {
        const err = await res.json();
        toast.error(err.error || "Fout bij toevoegen categorie");
      }
    } catch (err) {
      toast.error("Er is een fout opgetreden");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (cat: NewsCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditSlug(cat.slug);
    setEditDescription(cat.description || "");
    setEditColor(cat.color || "#c6a858");
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editName.trim()) {
      toast.error("Naam is verplicht");
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim(),
          description: editDescription.trim(),
          color: editColor,
        }),
      });

      if (res.ok) {
        toast.success("Categorie bijgewerkt!");
        setEditingId(null);
        fetchCategories();
      } else {
        const err = await res.json();
        toast.error(err.error || "Fout bij bijwerken");
      }
    } catch (err) {
      toast.error("Fout bij bijwerken van categorie");
    }
  };

  const handleDeleteCategory = async (id: string, catName: string) => {
    if (!window.confirm(`Weet u zeker dat u de categorie '${catName}' wilt verwijderen?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
        headers,
      });

      if (res.ok) {
        toast.success(`Categorie '${catName}' verwijderd`);
        fetchCategories();
      } else {
        toast.error("Kon categorie niet verwijderen");
      }
    } catch (err) {
      toast.error("Fout bij verwijderen");
    }
  };

  return (
    <div className={`space-y-8 ${className}`}>
      <div className="grid md:grid-cols-12 gap-8">
        {/* Left Column: Form to Add Category */}
        <div className="md:col-span-5 bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-accent">
            <Tag className="w-5 h-5" />
            <h2 className="text-xl font-display text-foreground">Nieuwe Categorie Aanmaken</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            Voeg categorieën toe om nieuwsberichten helder te ordenen en filteren voor de inwoners.
          </p>

          <form onSubmit={handleAddCategory} className="space-y-4">
            <div>
              <label className="text-xs font-semibold mb-1 block uppercase tracking-wider text-muted-foreground">
                Categorienaam *
              </label>
              <Input
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Bijv. Lokale Zorg, Economie, Natuur..."
                className="bg-background text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block uppercase tracking-wider text-muted-foreground">
                URL Slug
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="bijv. lokale-zorg"
                  className="pl-8 text-xs font-mono bg-background"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block uppercase tracking-wider text-muted-foreground">
                Korte toelichting (optioneel)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Waarover gaan berichten in deze categorie?"
                className="h-16 text-xs bg-background"
              />
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-accent" /> Badge Kleur
                </span>
                <span
                  className="inline-block w-4 h-4 rounded-full border border-border"
                  style={{ backgroundColor: color }}
                />
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setColor(preset.hex)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      color === preset.hex ? "scale-125 border-white shadow-md ring-2 ring-accent" : "border-border/50 hover:scale-110"
                    }`}
                    style={{ backgroundColor: preset.hex }}
                    title={preset.label}
                  />
                ))}
              </div>
              <Input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#c6a858"
                className="text-xs font-mono h-8 bg-background"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold uppercase tracking-wider text-xs h-10 mt-2"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Categorie Opslaan
            </Button>
          </form>
        </div>

        {/* Right Column: Existing Categories List */}
        <div className="md:col-span-7 bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-display text-foreground">
                Bestaande Categorieën ({categories.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Deze categorieën zijn direct beschikbaar bij het aanmaken van nieuws.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Categorieën laden...</div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground italic">
              Nog geen categorieën gevonden. Maak er links één aan!
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => {
                const isEditing = editingId === cat.id;

                if (isEditing) {
                  return (
                    <div
                      key={cat.id}
                      className="p-4 rounded-lg border-2 border-accent/60 bg-secondary/40 space-y-3 animate-fade-in"
                    >
                      <div className="grid sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                            Naam
                          </label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                            Slug
                          </label>
                          <Input
                            value={editSlug}
                            onChange={(e) => setEditSlug(e.target.value)}
                            className="h-8 text-xs font-mono bg-background"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                          Beschrijving
                        </label>
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="h-8 text-xs bg-background"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-muted-foreground">Kleur:</span>
                        <div className="flex gap-1.5 flex-1">
                          {COLOR_PRESETS.map((p) => (
                            <button
                              key={p.hex}
                              type="button"
                              onClick={() => setEditColor(p.hex)}
                              className={`w-5 h-5 rounded-full border ${
                                editColor === p.hex ? "ring-2 ring-accent scale-110" : ""
                              }`}
                              style={{ backgroundColor: p.hex }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEditing}
                          className="h-7 text-xs"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> Annuleren
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateCategory(cat.id)}
                          className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Opslaan
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={cat.id}
                    className="p-3.5 rounded-lg border border-border/70 bg-background/60 hover:bg-background transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 mt-1"
                        style={{ backgroundColor: cat.color || "#c6a858" }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {cat.name}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                            #{cat.slug}
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {cat.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(cat)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        title="Bewerken"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
