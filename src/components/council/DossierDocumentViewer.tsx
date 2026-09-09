import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Download,
  ExternalLink,
  Upload,
  Calendar,
  Layers,
  Link as LinkIcon,
  Tag,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import type { DossierDocument } from "@/types/dossier";
import { logDocumentView } from "@/lib/councilAuditLogger";

interface DossierDocumentViewerProps {
  document: DossierDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onDocumentUpdated?: (updatedDoc: DossierDocument) => void;
}

export const DossierDocumentViewer: React.FC<DossierDocumentViewerProps> = ({
  document,
  isOpen,
  onClose,
  onDocumentUpdated,
}) => {
  const { token: authContextToken } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen && document) {
      const bestandsnaam = (document.bestandsnaam || document.titel || `document_${document.id || "onbekend"}`).trim();
      if (bestandsnaam) {
        logDocumentView({
          filename: bestandsnaam,
          title: document.titel || bestandsnaam,
          dossierName: document.dossier,
          documentId: document.id,
          source: "modal_viewer",
        });
      }
    }
  }, [isOpen, document?.bestandsnaam, document?.id, document?.titel]);

  if (!isOpen || !document) return null;

  const handleSpecificUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 28 * 1024 * 1024) {
      toast.error(`Bestand '${file.name}' is groter dan 28 MB. Kies een kleiner bestand.`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", file, document.bestandsnaam);

      const token =
        authContextToken ||
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

      const res = await fetch("/api/council/dossiers/bulk-upload", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const responseText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch (_jsonErr) {
        if (res.status === 413 || responseText.includes("413") || responseText.toLowerCase().includes("too large")) {
          throw new Error(`Het bestand '${file.name}' is te groot voor de server (maximaal 25 MB).`);
        }
        if (!res.ok) {
          throw new Error(`Serverfout (${res.status}): upload kon niet worden verwerkt.`);
        }
        throw new Error("Ongeldig serverantwoord ontvangen.");
      }

      if (!res.ok) throw new Error(data?.error || "Uploaden mislukt");

      toast.success(`Bestand '${document.bestandsnaam}' succesvol gekoppeld!`);
      if (onDocumentUpdated) {
        onDocumentUpdated({
          ...document,
          fileExists: true,
          fileUrl: `/uploads/documents/${encodeURIComponent(document.bestandsnaam)}`,
        });
      }
    } catch (err: any) {
      console.error("[DOCUMENT VIEWER UPLOAD ERROR]:", err);
      toast.error(err.message || "Fout bij uploaden van document");
    } finally {
      setUploading(false);
    }
  };

  const fileUrl = document.fileUrl || `/uploads/documents/${encodeURIComponent(document.bestandsnaam)}`;

  return (
    <div
      id="dossier-document-viewer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        id="dossier-document-viewer-card"
        className={`relative w-full bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? "h-[98vh] max-w-[98vw]" : "h-[90vh] max-w-5xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="p-2 rounded-xl bg-accent/15 text-accent shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-foreground truncate leading-tight">
                {document.titel}
              </h3>
              <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">
                {document.bestandsnaam}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {document.fileExists && (
              <>
                <a
                  href={fileUrl}
                  download={document.bestandsnaam}
                  className="inline-flex"
                >
                  <Button
                    id="btn-doc-download"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    title="Download bestand"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Download
                  </Button>
                </a>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex"
                >
                  <Button
                    id="btn-doc-open-tab"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    title="Openen in nieuw tabblad"
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Nieuw tabblad
                  </Button>
                </a>
              </>
            )}

            <Button
              id="btn-doc-fullscreen"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Venster verkleinen" : "Volledig scherm"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>

            <Button
              id="btn-doc-close"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={onClose}
              title="Sluiten"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-background overflow-hidden">
          {/* Main Viewer Area */}
          <div className="flex-1 h-full flex flex-col bg-muted/20 relative min-h-0">
            {document.fileExists ? (
              <iframe
                id="dossier-pdf-iframe"
                src={`${fileUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full border-0 bg-white"
                title={document.titel}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 shadow-xs">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-foreground mb-1">
                  Documentbestand nog niet geüpload
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mb-6 leading-relaxed">
                  De metadata en relaties voor dit raadsstuk zijn geregistreerd in het systeem. U kunt het fysieke PDF-bestand uploaden om het direct in deze viewer beschikbaar te maken.
                </p>

                <div className="p-4 rounded-xl border border-dashed border-border bg-card max-w-md w-full text-center">
                  <label
                    htmlFor="specific-doc-upload"
                    className="cursor-pointer flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-accent" />
                    <span className="text-xs font-semibold text-foreground">
                      {uploading ? "Bezig met uploaden..." : "Bestand selecteren en koppelen"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Verwachte bestandsnaam: <span className="font-mono text-accent">{document.bestandsnaam}</span>
                    </span>
                    <input
                      id="specific-doc-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={handleSpecificUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar / Metadata details */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border bg-card p-4 overflow-y-auto shrink-0 flex flex-col gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Status
              </span>
              {document.fileExists ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Beschikbaar in viewer
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-xs border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  In afwachting van upload
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Dossier
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Layers className="w-3.5 h-3.5 text-accent" />
                {document.dossier}
              </div>
            </div>

            {document.datum && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Datum
                </span>
                <div className="flex items-center gap-1.5 text-foreground">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  {document.datum}
                </div>
              </div>
            )}

            {document.entiteiten && document.entiteiten.length > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Betrokken Entiteiten ({document.entiteiten.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {document.entiteiten.map((ent, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-muted text-[11px] text-foreground border border-border/60"
                    >
                      {ent}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {document.relaties && document.relaties.length > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Gerelateerde Stukken & Wetten ({document.relaties.length})
                </span>
                <div className="space-y-1.5">
                  {document.relaties.map((rel, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-1.5 p-1.5 rounded-lg bg-muted/40 border border-border/50 text-[11px] text-muted-foreground"
                    >
                      <LinkIcon className="w-3 h-3 text-accent shrink-0 mt-0.5" />
                      <span className="leading-snug">{rel}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Bestandsnaam
              </span>
              <p className="font-mono text-[11px] text-muted-foreground break-all bg-muted/30 p-2 rounded-lg border border-border/40 select-all">
                {document.bestandsnaam}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
