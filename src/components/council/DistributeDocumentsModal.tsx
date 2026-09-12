import React, { useState, useEffect } from "react";
import { ArrowRightLeft, FolderTree, X, Search, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dossier, DossierDocument } from "@/types/council";

interface DistributeDocumentsModalProps {
  isOpen: boolean;
  dossier: Dossier | null;
  preselectedDocIds?: string[];
  targetSubdossierInitial?: string;
  onClose: () => void;
  onDistributed: (updatedDossier: Dossier) => void;
}

export const DistributeDocumentsModal: React.FC<DistributeDocumentsModalProps> = ({
  isOpen,
  dossier,
  preselectedDocIds = [],
  targetSubdossierInitial,
  onClose,
  onDistributed,
}) => {
  const [targetSubdossier, setTargetSubdossier] = useState("");
  const [customSubdossierName, setCustomSubdossierName] = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [docSearch, setDocSearch] = useState("");
  const [currentSubFilter, setCurrentSubFilter] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && dossier) {
      // Default to initial target or the first available subdossier
      const defaultSub =
        targetSubdossierInitial ||
        (dossier.subdossiers && dossier.subdossiers.length > 0 ? dossier.subdossiers[0].title : dossier.title);
      setTargetSubdossier(defaultSub);
      setCustomSubdossierName("");
      setSelectedDocIds(new Set(preselectedDocIds));
      setDocSearch("");
      setCurrentSubFilter("all");
    }
  }, [isOpen, dossier, targetSubdossierInitial, preselectedDocIds]);

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

  const filteredDocs = (dossier.documents || []).filter((d) => {
    if (currentSubFilter !== "all") {
      const docSub = d.subdossier || dossier.title;
      if (docSub.toLowerCase() !== currentSubFilter.toLowerCase()) return false;
    }
    if (!docSearch.trim()) return true;
    const q = docSearch.toLowerCase();
    return (
      d.titel.toLowerCase().includes(q) ||
      d.bestandsnaam.toLowerCase().includes(q) ||
      (d.subdossier || "").toLowerCase().includes(q)
    );
  });

  const selectAllFiltered = () => {
    setSelectedDocIds(new Set(filteredDocs.map((d) => d.bestandsnaam)));
  };

  const clearSelection = () => {
    setSelectedDocIds(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalTarget =
      targetSubdossier === "__custom__" ? customSubdossierName.trim() : targetSubdossier.trim();

    if (!finalTarget) {
      toast.error("Selecteer of geef een doel-subdossier op");
      return;
    }

    if (selectedDocIds.size === 0) {
      toast.error("Selecteer minimaal één document om te verdelen");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/council/dossiers/${dossier.slug}/distribute-documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          targetSubdossier: finalTarget,
          documentIds: Array.from(selectedDocIds),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fout bij verdelen van documenten");
      }

      toast.success(
        data.message || `${data.distributedCount} document(en) verdeeld naar '${finalTarget}'!`
      );
      onDistributed(data.dossier);
      onClose();
    } catch (err: any) {
      console.error("Distribute documents error:", err);
      toast.error(err.message || "Er is een fout opgetreden bij het verdelen");
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectiveTargetTitle =
    targetSubdossier === "__custom__"
      ? customSubdossierName.trim() || "(nieuw subdossier)"
      : targetSubdossier;

  return (
    <div
      id="distribute-documents-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs transition-opacity overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="distribute-documents-modal-card"
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/10 text-accent">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base leading-tight">
                Documenten Verdelen naar Subdossier
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-md">
                Hoofdonderwerp: <span className="font-semibold text-foreground">{dossier.title}</span>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Target Subdossier Selection */}
          <div className="space-y-2 p-3.5 bg-muted/20 border border-border rounded-2xl">
            <label className="font-semibold text-foreground flex items-center gap-1.5">
              <FolderTree className="w-4 h-4 text-accent" />
              Doel-subdossier voor geselecteerde stukken *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <select
                id="select-target-subdossier"
                value={targetSubdossier}
                onChange={(e) => setTargetSubdossier(e.target.value)}
                className="w-full text-xs rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-hidden font-medium"
              >
                {(dossier.subdossiers || []).map((sub) => (
                  <option key={sub.slug} value={sub.title}>
                    {sub.title} ({sub.documentCount} stukken)
                  </option>
                ))}
                <option value="__custom__">+ Nieuw subdossier aanmaken...</option>
              </select>

              {targetSubdossier === "__custom__" && (
                <Input
                  id="input-custom-subdossier-name"
                  value={customSubdossierName}
                  onChange={(e) => setCustomSubdossierName(e.target.value)}
                  placeholder="Naam nieuw subdossier..."
                  required
                  className="text-xs rounded-xl"
                  autoFocus
                />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Alle geselecteerde documenten worden direct overgezet naar &quot;{effectiveTargetTitle}&quot;.
            </p>
          </div>

          {/* Document Selection Section */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="font-semibold text-foreground flex items-center gap-1.5">
                  Selecteer te verdelen documenten ({selectedDocIds.size} geselecteerd)
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Kies welke raadsstukken verplaatst moeten worden
                </span>
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

            {/* Filter toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Filter op titel of bestand..."
                  className="pl-8 h-8 text-xs rounded-xl bg-background"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-2.5 py-1">
                <span className="text-[11px] text-muted-foreground shrink-0">Bron:</span>
                <select
                  value={currentSubFilter}
                  onChange={(e) => setCurrentSubFilter(e.target.value)}
                  className="bg-transparent text-foreground text-xs focus:outline-hidden cursor-pointer w-full"
                >
                  <option value="all">Alle huidige subdossiers</option>
                  {(dossier.subdossiers || []).map((s) => (
                    <option key={s.slug} value={s.title}>
                      Alleen uit: {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Documents Checklist list */}
            <div className="max-h-60 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-background">
              {filteredDocs.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs">
                  Geen documenten gevonden die aan het zoekfilter voldoen.
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const isChecked = selectedDocIds.has(doc.bestandsnaam);
                  const isAlreadyInTarget =
                    doc.subdossier?.toLowerCase() === effectiveTargetTitle.toLowerCase();

                  return (
                    <div
                      key={doc.bestandsnaam}
                      onClick={() => toggleSelectDoc(doc.bestandsnaam)}
                      className={`flex items-start gap-2.5 p-2.5 cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-accent/10 hover:bg-accent/15"
                          : "hover:bg-muted/40"
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
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="font-mono truncate max-w-[180px]">
                            {doc.bestandsnaam}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-semibold">
                            Huidig: {doc.subdossier || dossier.title}
                          </span>
                          {isAlreadyInTarget && (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-2.5 h-2.5" /> Zit al in dit subdossier
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
              {selectedDocIds.size === 0 ? (
                "Selecteer minimaal één document"
              ) : (
                <span className="text-accent font-semibold">
                  {selectedDocIds.size} stuk(ken) gaan naar &quot;{effectiveTargetTitle}&quot;
                </span>
              )}
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
                id="btn-confirm-distribute-docs"
                type="submit"
                disabled={isSubmitting || selectedDocIds.size === 0 || !effectiveTargetTitle}
                className="h-9 px-4 rounded-xl text-xs bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-xs"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                {isSubmitting ? "Bezig met verdelen..." : "Verdelen Toepassen"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
