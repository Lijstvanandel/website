import React, { useState } from "react";
import {
  X,
  FileText,
  Download,
  ExternalLink,
  Calendar,
  Maximize2,
  Minimize2,
  HardDrive,
  Tag,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSafeDocumentUrl } from "@/lib/documentUrl";

export interface BestuurDocViewerItem {
  id?: string;
  titel: string;
  beschrijving?: string;
  category?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  datum?: string;
  href?: string;
}

interface BestuurDocumentViewerProps {
  document: BestuurDocViewerItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BestuurDocumentViewer: React.FC<BestuurDocumentViewerProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen || !document) return null;

  let resolvedUrl = getSafeDocumentUrl(document.fileUrl, document.fileName, document.href);
  if (!resolvedUrl && document.fileName) {
    resolvedUrl = `/api/document/view?file=${encodeURIComponent(document.fileName)}`;
  }

  const isPdf =
    resolvedUrl.toLowerCase().includes(".pdf") ||
    (document.fileName && document.fileName.toLowerCase().endsWith(".pdf")) ||
    resolvedUrl.includes("/api/document/view") ||
    resolvedUrl.includes("blob:") ||
    resolvedUrl.startsWith("/uploads/");

  const displayName = document.fileName || document.titel;

  return (
    <div
      id="bestuur-doc-viewer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        id="bestuur-doc-viewer-card"
        className={`relative w-full bg-card border border-accent/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? "h-[98vh] max-w-[98vw]" : "h-[90vh] max-w-5xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="p-2 rounded-xl bg-accent/15 text-accent shrink-0 border border-accent/30">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-foreground truncate leading-tight">
                {document.titel}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground truncate">
                {document.category && (
                  <span className="font-semibold text-accent">{document.category}</span>
                )}
                {document.fileName && (
                  <span className="font-mono text-[11px] opacity-80 truncate">
                    • {document.fileName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {resolvedUrl && (
              <>
                <a
                  href={resolvedUrl}
                  download={document.fileName || `${document.titel}.pdf`}
                  className="inline-flex"
                >
                  <Button
                    id="btn-bestuur-doc-download"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10"
                    title="Download bestand"
                  >
                    <Download className="w-4 h-4 mr-1.5 text-accent" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </a>
                <a
                  href={resolvedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex"
                >
                  <Button
                    id="btn-bestuur-doc-open-tab"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10"
                    title="Openen in nieuw tabblad"
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Nieuw tabblad</span>
                  </Button>
                </a>
              </>
            )}

            <Button
              id="btn-bestuur-doc-fullscreen"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Venster verkleinen" : "Volledig scherm"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>

            <Button
              id="btn-bestuur-doc-close"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={onClose}
              title="Sluiten"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-background overflow-hidden">
          {/* Main Viewer Canvas / Iframe */}
          <div className="flex-1 h-full flex flex-col bg-muted/20 relative min-h-0">
            {resolvedUrl ? (
              <iframe
                id="bestuur-pdf-iframe"
                src={`${resolvedUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full border-0 bg-white dark:bg-zinc-900"
                title={document.titel}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground mb-3">
                  <FileText className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-foreground mb-1">
                  Geen PDF-koppeling gevonden
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Dit document heeft nog geen digitaal bestand gekoppeld in het bestuurspaneel.
                </p>
              </div>
            )}
          </div>

          {/* Details Sidebar */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border bg-card p-4 overflow-y-auto shrink-0 flex flex-col gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-accent block mb-1">
                Document Details
              </span>
              <h4 className="font-semibold text-foreground text-sm leading-snug">
                {document.titel}
              </h4>
              {document.beschrijving && (
                <p className="text-muted-foreground mt-1.5 leading-relaxed">
                  {document.beschrijving}
                </p>
              )}
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              {document.category && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-accent" /> Categorie
                  </span>
                  <span className="font-medium text-foreground">{document.category}</span>
                </div>
              )}

              {document.datum && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-accent" /> Datum
                  </span>
                  <span className="font-medium text-foreground">{document.datum}</span>
                </div>
              )}

              {document.fileSize && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-accent" /> Grootte
                  </span>
                  <span className="font-medium text-foreground">{document.fileSize}</span>
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-border/60">
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20 flex items-start gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>
                  Officieel partijdocument van Lijst van Andel conform verenigingsstatuten.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
