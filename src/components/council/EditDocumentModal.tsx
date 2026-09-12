import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Calendar,
  Tag,
  Link2,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { DossierDocument } from "@/types/dossier";

interface EditDocumentModalProps {
  isOpen: boolean;
  dossierSlug: string;
  document: DossierDocument | null;
  availableSubdossiers?: Array<{ slug: string; title: string }>;
  onClose: () => void;
  onDocumentUpdated: (updatedDoc: DossierDocument) => void;
  onDocumentDeleted: (deletedDocId: string) => void;
}

export const EditDocumentModal: React.FC<EditDocumentModalProps> = ({
  isOpen,
  dossierSlug,
  document,
  availableSubdossiers = [],
  onClose,
  onDocumentUpdated,
  onDocumentDeleted,
}) => {
  const [titel, setTitel] = useState("");
  const [bestandsnaam, setBestandsnaam] = useState("");
  const [subdossier, setSubdossier] = useState("");
  const [customSubdossier, setCustomSubdossier] = useState("");
  const [wijkOfKern, setWijkOfKern] = useState("");
  const [datum, setDatum] = useState("");
  const [entiteiten, setEntiteiten] = useState<string[]>([]);
  const [relaties, setRelaties] = useState<string[]>([]);

  // Input helpers for tags
  const [newEntity, setNewEntity] = useState("");
  const [newRelation, setNewRelation] = useState("");

  // Optional replacement PDF
  const [replacementFile, setReplacementFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (document) {
      setTitel(document.titel || "");
      setBestandsnaam(document.bestandsnaam || "");
      setDatum(document.datum || "");
      const docSub = document.subdossier || "";
      const isKnownSub = availableSubdossiers.some(
        (s) => s.title.toLowerCase() === docSub.toLowerCase()
      );
      if (isKnownSub || !docSub) {
        setSubdossier(docSub);
        setCustomSubdossier("");
      } else {
        setSubdossier("__custom__");
        setCustomSubdossier(docSub);
      }
      setWijkOfKern(document.wijk_of_kern || (document.wijken ? document.wijken.join(", ") : ""));
      setEntiteiten(Array.isArray(document.entiteiten) ? [...document.entiteiten] : []);
      setRelaties(Array.isArray(document.relaties) ? [...document.relaties] : []);
      setReplacementFile(null);
      setShowDeleteConfirm(false);
    }
  }, [document, availableSubdossiers]);

  if (!isOpen || !document) return null;

  const handleAddEntity = () => {
    const trimmed = newEntity.trim();
    if (trimmed && !entiteiten.includes(trimmed)) {
      setEntiteiten([...entiteiten, trimmed]);
      setNewEntity("");
    }
  };

  const handleRemoveEntity = (item: string) => {
    setEntiteiten(entiteiten.filter((e) => e !== item));
  };

  const handleAddRelation = () => {
    const trimmed = newRelation.trim();
    if (trimmed && !relaties.includes(trimmed)) {
      setRelaties([...relaties, trimmed]);
      setNewRelation("");
    }
  };

  const handleRemoveRelation = (item: string) => {
    setRelaties(relaties.filter((r) => r !== item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titel.trim()) {
      toast.error("Documenttitel is verplicht");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const docIdentifier = document.id || document.bestandsnaam;
      const targetSub = subdossier === "__custom__" ? customSubdossier.trim() : subdossier.trim();

      let res: Response;
      if (replacementFile) {
        const formData = new FormData();
        formData.append("titel", titel.trim());
        formData.append("bestandsnaam", bestandsnaam.trim());
        formData.append("subdossier", targetSub);
        formData.append("wijk_of_kern", wijkOfKern.trim());
        formData.append("datum", datum);
        formData.append("entiteiten", JSON.stringify(entiteiten));
        formData.append("relaties", JSON.stringify(relaties));
        formData.append("file", replacementFile);

        res = await fetch(
          `/api/council/dossiers/${encodeURIComponent(dossierSlug)}/documents/${encodeURIComponent(docIdentifier)}`,
          {
            method: "PUT",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
          }
        );
      } else {
        res = await fetch(
          `/api/council/dossiers/${encodeURIComponent(dossierSlug)}/documents/${encodeURIComponent(docIdentifier)}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              titel: titel.trim(),
              bestandsnaam: bestandsnaam.trim(),
              subdossier: targetSub,
              wijk_of_kern: wijkOfKern.trim(),
              datum: datum || null,
              entiteiten,
              relaties,
            }),
          }
        );
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij bijwerken document");

      toast.success("Document succesvol bijgewerkt!");
      onDocumentUpdated(data.document);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Fout bij opslaan document");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const docIdentifier = document.id || document.bestandsnaam;

      const res = await fetch(
        `/api/council/dossiers/${encodeURIComponent(dossierSlug)}/documents/${encodeURIComponent(docIdentifier)}`,
        {
          method: "DELETE",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij verwijderen document");

      toast.success("Document ontkoppeld uit dit dossier");
      onDocumentDeleted(docIdentifier);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Fout bij ontkoppelen document");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      id="edit-document-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs transition-opacity overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="edit-document-modal-card"
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/10 text-accent">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base leading-tight">
                Document Bewerken
              </h3>
              <p className="text-xs text-muted-foreground">
                Titel, datum, bestandsnaam en relaties beheren
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Titel */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">
              Documenttitel *
            </label>
            <Input
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="Bijv. Raadsvoorstel Bestemmingsplan Woningbouw"
              required
              className="text-xs rounded-xl"
            />
          </div>

          {/* Bestandsnaam & Datum in 2 kolommen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Bestandsnaam (.pdf)
              </label>
              <Input
                value={bestandsnaam}
                onChange={(e) => setBestandsnaam(e.target.value)}
                placeholder="naam-van-stuk.pdf"
                className="text-xs rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Datum (YYYY-MM-DD)
              </label>
              <Input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Subdossier & Wijk/Kern */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Thematisch Subdossier
              </label>
              <select
                id="select-edit-doc-subdossier"
                value={subdossier}
                onChange={(e) => setSubdossier(e.target.value)}
                className="w-full text-xs rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-hidden font-medium"
              >
                {availableSubdossiers.map((s) => (
                  <option key={s.slug} value={s.title}>
                    {s.title}
                  </option>
                ))}
                <option value="__custom__">+ Aangepast subdossier opgeven...</option>
              </select>
              {subdossier === "__custom__" && (
                <Input
                  value={customSubdossier}
                  onChange={(e) => setCustomSubdossier(e.target.value)}
                  placeholder="Naam nieuw subdossier..."
                  className="text-xs rounded-xl mt-1.5"
                  autoFocus
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Wijk of Kern (locatie)
              </label>
              <Input
                value={wijkOfKern}
                onChange={(e) => setWijkOfKern(e.target.value)}
                placeholder="Bijv. Steenwijk, Blokzijl, Vollenhove..."
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Huidige Bestandsstatus & Optioneel Vervangend Bestand */}
          <div className="p-3 rounded-2xl bg-muted/30 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Fysiek PDF Bestand:</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  document.fileExists
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {document.fileExists ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> Live op server ({document.fileSize ? `${Math.round(document.fileSize / 1024)} KB` : "PDF"})
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" /> Nog niet fysiek aanwezig
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <label className="cursor-pointer flex-1">
                <div className="border border-dashed border-border rounded-xl p-2.5 bg-background text-center hover:border-accent/50 transition-colors">
                  <p className="font-semibold text-foreground text-[11px]">
                    {replacementFile ? replacementFile.name : "Nieuw/vervangend PDF bestand selecteren..."}
                  </p>
                  <span className="text-[10px] text-muted-foreground block">
                    {replacementFile ? `${(replacementFile.size / 1024 / 1024).toFixed(2)} MB geselecteerd` : "Klik om een PDF te uploaden"}
                  </span>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setReplacementFile(file);
                      if (!bestandsnaam || bestandsnaam === document.bestandsnaam) {
                        setBestandsnaam(file.name);
                      }
                    }
                  }}
                />
              </label>
              {replacementFile && (
                <button
                  type="button"
                  onClick={() => setReplacementFile(null)}
                  className="p-2 text-muted-foreground hover:text-destructive text-xs"
                  title="Bestandsselectie ongedaan maken"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Betrokken Entiteiten / Partijen */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground flex items-center justify-between">
              <span>Betrokken Entiteiten / Partijen</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Verbindt nodes in de netwerkgraaf
              </span>
            </label>

            <div className="flex flex-wrap gap-1 min-h-[30px] p-2 bg-muted/20 border border-border rounded-xl">
              {entiteiten.length === 0 ? (
                <span className="text-[11px] text-muted-foreground italic">
                  Geen entiteiten gekoppeld
                </span>
              ) : (
                entiteiten.map((ent, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-card border border-border text-foreground text-[11px]"
                  >
                    {ent}
                    <button
                      type="button"
                      onClick={() => handleRemoveEntity(ent)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={newEntity}
                onChange={(e) => setNewEntity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddEntity();
                  }
                }}
                placeholder="Bijv. Gemeente Steenwijkerland, Provincie..."
                className="text-xs rounded-xl"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEntity}
                className="rounded-xl text-xs shrink-0"
              >
                + Voeg toe
              </Button>
            </div>
          </div>

          {/* Relaties / Beleidslijnen */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground flex items-center justify-between">
              <span>Relaties / Type Verbinding</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Bijv. Raadsvoorstel, Amendement, Motie, Inspraak
              </span>
            </label>

            <div className="flex flex-wrap gap-1 min-h-[30px] p-2 bg-muted/20 border border-border rounded-xl">
              {relaties.length === 0 ? (
                <span className="text-[11px] text-muted-foreground italic">
                  Geen relaties gekoppeld
                </span>
              ) : (
                relaties.map((rel, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px]"
                  >
                    {rel}
                    <button
                      type="button"
                      onClick={() => handleRemoveRelation(rel)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={newRelation}
                onChange={(e) => setNewRelation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddRelation();
                  }
                }}
                placeholder="Bijv. Raadsvoorstel, Amendement, Collegebesluit..."
                className="text-xs rounded-xl"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRelation}
                className="rounded-xl text-xs shrink-0"
              >
                + Voeg toe
              </Button>
            </div>
          </div>

          {/* Gevaarlijke zone: Document ontkoppelen */}
          <div className="pt-2 border-t border-border">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive text-xs hover:underline flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Document ontkoppelen uit dossier...
              </button>
            ) : (
              <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-2">
                <p className="font-bold text-destructive text-xs">
                  Weet u zeker dat u dit document wilt ontkoppelen?
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Het document verdwijnt uit dit dossier en uit de relatiekaart van dit dossier.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="h-7 text-xs rounded-xl"
                  >
                    Annuleren
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="h-7 text-xs rounded-xl"
                  >
                    {isDeleting ? "Ontkoppelen..." : "Ja, ontkoppelen"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer actieknoppen */}
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
