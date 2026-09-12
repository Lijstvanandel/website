import React, { useState, useEffect } from "react";
import { FolderTree, Plus, X, Search, FileText, Check, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dossier, DossierDocument } from "@/types/council";

interface CreateSubdossierModalProps {
  isOpen: boolean;
  dossier: Dossier | null;
  onClose: () => void;
  onCreated: (updatedDossier: Dossier, createdSub: any) => void;
}

export const CreateSubdossierModal: React.FC<CreateSubdossierModalProps> = ({
  isOpen,
  dossier,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [docSearch, setDocSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setThumbnail("");
      setSelectedDocIds(new Set());
      setDocSearch("");
    }
  }, [isOpen]);

  if (!isOpen || !dossier) return null;

  const toggleSelectDoc = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedDocIds(new Set(filteredDocs.map((d) => d.bestandsnaam)));
  };

  const clearSelection = () => {
    setSelectedDocIds(new Set());
  };

  const filteredDocs = (dossier.documents || []).filter((d) => {
    if (!docSearch.trim()) return true;
    const q = docSearch.toLowerCase();
    return (
      d.titel.toLowerCase().includes(q) ||
      d.bestandsnaam.toLowerCase().includes(q) ||
      (d.subdossier || "").toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error("Geef een titel op voor het nieuwe subdossier");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/council/dossiers/${dossier.slug}/subdossiers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: cleanTitle,
          description: description.trim() || undefined,
          thumbnail: thumbnail.trim() || undefined,
          documentIds: Array.from(selectedDocIds),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fout bij aanmaken van subdossier");
      }

      toast.success(data.message || `Subdossier '${cleanTitle}' succesvol aangemaakt!`);
      onCreated(data.dossier, data.subdossier);
      onClose();
    } catch (err: any) {
      console.error("Create subdossier error:", err);
      toast.error(err.message || "Er is een fout opgetreden");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="create-subdossier-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs transition-opacity overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="create-subdossier-modal-card"
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/10 text-accent">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base leading-tight">
                Nieuw Subdossier Aanmaken
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-md">
                Binnen hoofdonderwerp: <span className="font-semibold text-foreground">{dossier.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Subdossier Title */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">
              Titel van het subdossier *
            </label>
            <Input
              id="input-new-subdossier-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Woningbouw & Grondzaken, Verkeersveiligheid Centrum, etc."
              required
              className="text-xs rounded-xl"
            />
            <p className="text-[11px] text-muted-foreground">
              Dit maakt een zelfstandig subdossier aan onder het hoofdonderwerp &quot;{dossier.title}&quot;.
            </p>
          </div>

          {/* Subdossier Description */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">
              Beschrijving & Doel (optioneel)
            </label>
            <Textarea
              id="input-new-subdossier-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Korte toelichting over de specifieke raadsbesluiten, moties of projecten in dit subdossier..."
              rows={2}
              className="text-xs rounded-xl resize-none"
            />
          </div>

          {/* Subdossier Thumbnail */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-accent" />
              Afbeeldings-URL (optioneel)
            </label>
            <Input
              id="input-new-subdossier-thumb"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              placeholder="https://images.unsplash.com/... (of laat leeg voor automatische achtergrond)"
              className="text-xs rounded-xl"
            />
          </div>

          {/* Document Assignment Section */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-accent" />
                  Documenten direct toewijzen ({selectedDocIds.size} geselecteerd)
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Selecteer raadsstukken uit dit hoofdonderwerp die naar dit nieuwe subdossier verplaatst moeten worden.
                </p>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllFiltered}
                  className="h-7 px-2 text-[11px] rounded-lg"
                >
                  Selecteer alles ({filteredDocs.length})
                </Button>
                {selectedDocIds.size > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="h-7 px-2 text-[11px] rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    Wissen
                  </Button>
                )}
              </div>
            </div>

            {/* Document search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Zoek documenten op titel of bestandsnaam..."
                className="pl-8 h-8 text-xs rounded-xl bg-muted/20"
              />
            </div>

            {/* Document checklist box */}
            <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-background">
              {filteredDocs.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-xs">
                  Geen documenten gevonden in dit dossier.
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const isChecked = selectedDocIds.has(doc.bestandsnaam);
                  return (
                    <div
                      key={doc.bestandsnaam}
                      onClick={() => toggleSelectDoc(doc.bestandsnaam)}
                      className={`flex items-start gap-2.5 p-2.5 cursor-pointer transition-colors ${
                        isChecked ? "bg-accent/10 hover:bg-accent/15" : "hover:bg-muted/40"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? "bg-accent border-accent text-accent-foreground"
                            : "border-muted-foreground/40 bg-card"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate leading-snug">
                          {doc.titel}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="font-mono truncate max-w-[200px]">{doc.bestandsnaam}</span>
                          {doc.subdossier && (
                            <span className="px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                              Huidig: {doc.subdossier}
                            </span>
                          )}
                          {doc.datum && <span>{doc.datum}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-[11px] text-muted-foreground">
              {selectedDocIds.size > 0
                ? `${selectedDocIds.size} stuk(ken) worden direct verdeeld`
                : "Aanmaken zonder documenten (lege indeling)"}
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-9 px-4 rounded-xl text-xs"
              >
                Annuleren
              </Button>
              <Button
                id="btn-confirm-create-subdossier"
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="h-9 px-4 rounded-xl text-xs bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {isSubmitting ? "Bezig..." : "Subdossier Aanmaken"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
