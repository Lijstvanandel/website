import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Upload,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Link2,
  Tag,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Dossier, DossierDocument } from "@/types/dossier";

interface AddDocumentModalProps {
  isOpen: boolean;
  dossier: Dossier | null;
  initialMode?: "upload" | "link";
  onClose: () => void;
  onAdded: (updatedDossier: Dossier) => void;
}

export const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  isOpen,
  dossier,
  initialMode = "upload",
  onClose,
  onAdded,
}) => {
  const [activeTab, setActiveTab] = useState<"upload" | "link">(initialMode);

  // Tab 1: New Document State
  const [file, setFile] = useState<File | null>(null);
  const [titel, setTitel] = useState("");
  const [bestandsnaam, setBestandsnaam] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [entiteiten, setEntiteiten] = useState<string[]>([]);
  const [relaties, setRelaties] = useState<string[]>([]);
  const [newEntity, setNewEntity] = useState("");
  const [newRelation, setNewRelation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab 2: Link Catalog State
  const [catalogDocs, setCatalogDocs] = useState<DossierDocument[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setFile(null);
      setTitel("");
      setBestandsnaam("");
      setDatum(new Date().toISOString().split("T")[0]);
      setEntiteiten([]);
      setRelaties([]);
      setSelectedDocIds(new Set());
    }
  }, [isOpen, initialMode]);

  // Load catalog on open or tab switch
  useEffect(() => {
    if (isOpen && activeTab === "link") {
      loadCatalog();
    }
  }, [isOpen, activeTab]);

  const loadCatalog = async () => {
    setIsLoadingCatalog(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/council/catalog/all-documents", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error("Kon documentencatalogus niet ophalen");
      const data = await res.json();
      setCatalogDocs(data.documents || []);
    } catch (err: any) {
      toast.error(err.message || "Fout bij ophalen catalogus");
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  if (!isOpen || !dossier) return null;

  const existingFileNames = new Set(dossier.documents.map((d) => d.bestandsnaam.toLowerCase()));

  // File selection for new upload
  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
    setBestandsnaam(selectedFile.name);
    if (!titel.trim()) {
      const cleanTitle = selectedFile.name
        .replace(/\.pdf$/i, "")
        .replace(/[-_]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      setTitel(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
    }
  };

  const handleAddEntity = () => {
    const t = newEntity.trim();
    if (t && !entiteiten.includes(t)) {
      setEntiteiten([...entiteiten, t]);
      setNewEntity("");
    }
  };

  const handleAddRelation = () => {
    const t = newRelation.trim();
    if (t && !relaties.includes(t)) {
      setRelaties([...relaties, t]);
      setNewRelation("");
    }
  };

  // Submit new document
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titel.trim()) {
      toast.error("Documenttitel is verplicht");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const formData = new FormData();
      formData.append("titel", titel.trim());
      formData.append("bestandsnaam", bestandsnaam.trim() || `${titel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
      formData.append("datum", datum);
      formData.append("entiteiten", JSON.stringify(entiteiten));
      formData.append("relaties", JSON.stringify(relaties));
      if (file) {
        formData.append("file", file);
      }

      const res = await fetch(`/api/council/dossiers/${encodeURIComponent(dossier.slug || dossier.id)}/documents`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij toevoegen document");

      toast.success(data.message || "Document succesvol toegevoegd aan dossier!");
      onAdded(data.dossier);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Fout bij toevoegen document");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle selection in catalog
  const toggleDocSelection = (doc: DossierDocument) => {
    const key = doc.bestandsnaam;
    const next = new Set(selectedDocIds);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedDocIds(next);
  };

  // Link selected catalog documents
  const handleLinkSelected = async () => {
    if (selectedDocIds.size === 0) {
      toast.error("Selecteer minimaal één document om te koppelen.");
      return;
    }

    const docsToLink = catalogDocs.filter((d) => selectedDocIds.has(d.bestandsnaam));
    setIsLinking(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/council/dossiers/${encodeURIComponent(dossier.slug || dossier.id)}/link-documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ documents: docsToLink }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij koppelen van documenten");

      toast.success(data.message || "Documenten succesvol gekoppeld aan dossier!");
      onAdded(data.dossier);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Fout bij koppelen documenten");
    } finally {
      setIsLinking(false);
    }
  };

  // Filter catalog docs
  const filteredCatalog = catalogDocs.filter((d) => {
    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase();
    return (
      d.titel.toLowerCase().includes(q) ||
      d.bestandsnaam.toLowerCase().includes(q) ||
      d.dossier.toLowerCase().includes(q) ||
      d.datum?.includes(q)
    );
  });

  return (
    <div
      id="add-document-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs transition-opacity overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="add-document-modal-card"
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/10 text-accent">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base leading-tight">
                Document toevoegen aan dossier
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-sm">
                Dossier: <span className="font-semibold text-foreground">{dossier.title}</span>
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

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-2 bg-muted/40 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "upload"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Nieuw Document / Bestand Uploaden
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("link")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "link"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            Bestaand Stuk Koppelen (in relatie brengen)
          </button>
        </div>

        {/* TAB 1: NEW DOCUMENT / UPLOAD */}
        {activeTab === "upload" && (
          <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* File Dropzone */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                PDF Bestand Selecteren (optioneel of direct live)
              </label>
              <div
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${
                  file
                    ? "border-accent/60 bg-accent/5"
                    : "border-border hover:border-accent/40 bg-background/50"
                }`}
                onClick={() => document.getElementById("file-input-add-doc")?.click()}
              >
                <Upload className="w-6 h-6 text-accent mx-auto mb-1.5" />
                {file ? (
                  <div>
                    <p className="font-bold text-foreground text-xs">{file.name}</p>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Klik om te wijzigen
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-foreground text-xs">
                      Klik om een PDF te uploaden of sleep het hierheen
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      Ondersteunt officiële raadsstukken, besluiten, kaarten (PDF)
                    </span>
                  </div>
                )}
                <input
                  id="file-input-add-doc"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileChange(f);
                  }}
                />
              </div>
            </div>

            {/* Titel */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Documenttitel *
              </label>
              <Input
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder="Bijv. Raadsvoorstel Vaststelling Bestemmingsplan"
                required
                className="text-xs rounded-xl"
              />
            </div>

            {/* Bestandsnaam & Datum */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Bestandsnaam (.pdf)
                </label>
                <Input
                  value={bestandsnaam}
                  onChange={(e) => setBestandsnaam(e.target.value)}
                  placeholder="bestand.pdf"
                  className="text-xs rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Datum
                </label>
                <Input
                  type="date"
                  value={datum}
                  onChange={(e) => setDatum(e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Entiteiten */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span>Betrokken Partijen & Entiteiten</span>
                <span className="text-[10px] text-muted-foreground">
                  Worden zichtbaar in relatienetwerk
                </span>
              </label>
              {entiteiten.length > 0 && (
                <div className="flex flex-wrap gap-1 p-2 bg-muted/20 border border-border rounded-xl">
                  {entiteiten.map((ent, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-card border border-border text-[11px]"
                    >
                      {ent}
                      <button
                        type="button"
                        onClick={() => setEntiteiten(entiteiten.filter((e) => e !== ent))}
                      >
                        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
                  placeholder="Bijv. Gemeente Steenwijkerland..."
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

            {/* Relaties */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span>Relaties / Type Verbinding</span>
                <span className="text-[10px] text-muted-foreground">
                  Bijv. Raadsvoorstel, Amendement
                </span>
              </label>
              {relaties.length > 0 && (
                <div className="flex flex-wrap gap-1 p-2 bg-muted/20 border border-border rounded-xl">
                  {relaties.map((rel, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px]"
                    >
                      {rel}
                      <button
                        type="button"
                        onClick={() => setRelaties(relaties.filter((r) => r !== rel))}
                      >
                        <X className="w-3 h-3 hover:text-destructive" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
                  placeholder="Bijv. Raadsvoorstel, Motie..."
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

            {/* Footer Buttons */}
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
                {isSubmitting ? "Bezig met opslaan..." : "Document Toevoegen"}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: LINK EXISTING PIECES FROM CATALOG */}
        {activeTab === "link" && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">
                Selecteer raadsstukken uit de centrale catalogus om deze in relatie te brengen met het dossier '{dossier.title}'.
              </p>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Zoek in alle raadsstukken op titel, datum of dossier..."
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Document list */}
            {isLoadingCatalog ? (
              <div className="py-12 text-center text-muted-foreground">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Catalogus inladen...
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground bg-muted/20 rounded-2xl">
                Geen raadsstukken gevonden die voldoen aan uw zoekopdracht.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-2xl border border-border divide-y divide-border bg-background">
                {filteredCatalog.map((doc, idx) => {
                  const isAlreadyInDossier = existingFileNames.has(doc.bestandsnaam.toLowerCase());
                  const isSelected = selectedDocIds.has(doc.bestandsnaam);

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (!isAlreadyInDossier) toggleDocSelection(doc);
                      }}
                      className={`p-3 flex items-start gap-3 transition-colors ${
                        isAlreadyInDossier
                          ? "opacity-60 bg-muted/30 cursor-not-allowed"
                          : isSelected
                          ? "bg-accent/10 cursor-pointer"
                          : "hover:bg-muted/40 cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected || isAlreadyInDossier}
                        disabled={isAlreadyInDossier}
                        onChange={() => {
                          if (!isAlreadyInDossier) toggleDocSelection(doc);
                        }}
                        className="mt-0.5 rounded text-accent focus:ring-accent w-4 h-4"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-bold text-foreground line-clamp-1">
                            {doc.titel}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                            {doc.datum || "—"}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground truncate">
                          {doc.bestandsnaam}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                            Bron: {doc.dossier}
                          </span>
                          {isAlreadyInDossier && (
                            <span className="text-[10px] font-semibold text-accent flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Reeds in dit dossier
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selection Summary and Link Button */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{selectedDocIds.size}</span> document(en) geselecteerd
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="text-xs rounded-xl h-9"
                >
                  Annuleren
                </Button>
                <Button
                  type="button"
                  disabled={selectedDocIds.size === 0 || isLinking}
                  onClick={handleLinkSelected}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold rounded-xl h-9 px-5 shadow-xs"
                >
                  {isLinking ? "Koppelen..." : `Koppel (${selectedDocIds.size}) Stukken`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
