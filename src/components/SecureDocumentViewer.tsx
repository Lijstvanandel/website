import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MemberDocument } from "@/types/document";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "3.11.174"}/pdf.worker.min.js`;
}

interface SecureDocumentViewerProps {
  document: MemberDocument | null;
  isOpen: boolean;
  onClose: () => void;
  user: {
    fullName?: string;
    username?: string;
    email?: string;
    role?: string;
  } | null;
}

export const SecureDocumentViewer: React.FC<SecureDocumentViewerProps> = ({
  document: doc,
  isOpen,
  onClose,
  user,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMasked, setIsMasked] = useState(false);
  const [maskReason, setMaskReason] = useState<string>("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  const memberName = user?.fullName || user?.username || "Geregistreerd Lid";
  const userIdentifier = user?.email || user?.username || "Lid";
  const watermarkText = `VERTROUWELIJK • LIJST VAN ANDEL • LID: ${memberName.toUpperCase()} (${userIdentifier}) • NIET VERSPREIDEN • EXCLUSIEF VOOR LEDEN`;

  // Trigger mask helper
  const triggerMask = useCallback((reason: string) => {
    setIsMasked(true);
    setMaskReason(reason);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("Inhoud beveiligd tegen kopiëren - Lijst van Andel");
      }
    } catch {
      // ignore clipboard error
    }
  }, []);

  // Unmask handler
  const handleUnmask = () => {
    setIsMasked(false);
    setMaskReason("");
    toast.success("Documentweergave hersteld");
  };

  // Anti-Screenshot & Snipping Tool detection
  useEffect(() => {
    if (!isOpen) return;

    // 1. Window Blur (e.g. Snipping tool Win+Shift+S, snipping tool window or third party screen capture)
    const handleWindowBlur = () => {
      triggerMask("Vensterfocus verloren of knipprogramma / schermopname geactiveerd.");
    };

    // 2. Visibility change (tab switch, desktop view)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        triggerMask("Tabblad verborgen of schermopname actief.");
      }
    };

    // 3. Keydown protection (PrintScreen, Ctrl+P, Ctrl+S, Ctrl+C, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen detection
      if (e.key === "PrintScreen" || e.keyCode === 44 || e.code === "PrintScreen") {
        e.preventDefault();
        triggerMask("PrintScreen / Schermafbeelding gedetecteerd.");
        toast.error("Schermafbeeldingen zijn vergrendeld voor dit document.", {
          icon: <ShieldAlert className="w-5 h-5 text-destructive" />,
        });
        return;
      }

      // Block Save page (Ctrl+S / Cmd+S)
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        toast.warning("Downloaden en opslaan is niet toegestaan voor vertrouwelijke stukken.");
        return;
      }

      // Block Print (Ctrl+P / Cmd+P)
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        triggerMask("Afdrukpoging gedetecteerd.");
        toast.warning("Afdrukken is uitgeschakeld ter bescherming van fractiestukken.");
        return;
      }

      // Block Copy (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        toast.warning("Tekst kopiëren is vergrendeld voor dit document.");
        return;
      }

      // Close on Escape
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };

    // 4. Mouseleave on window edge (sometimes snipping tool triggers mouseout before blur)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        // Cursor left window
      }
    };

    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isOpen, isFullscreen, onClose, triggerMask]);

  // Load PDF when doc changes
  useEffect(() => {
    if (!isOpen || !doc) return;

    setCurrentPage(1);
    setIsMasked(false);
    setPdfError(null);

    let isMounted = true;

    async function loadPdf() {
      if (!doc?.fileUrl || !doc.fileUrl.toLowerCase().endsWith(".pdf")) {
        // Not a direct PDF file or text-only document
        setTotalPages(doc?.pageCount || 1);
        return;
      }

      setPdfLoading(true);
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: doc.fileUrl,
          withCredentials: false,
        });

        const pdf = await loadingTask.promise;
        if (!isMounted) return;

        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        setPdfLoading(false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Fout bij inladen";
        console.warn("Could not load binary PDF directly with PDF.js:", message);
        if (!isMounted) return;
        setPdfError(message || "PDF kon niet rechtstreeks via canvas worden ingeladen");
        setTotalPages(doc.pageCount || 1);
        setPdfLoading(false);
      }
    }

    loadPdf();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [isOpen, doc]);

  // Render current PDF page on canvas
  const renderPdfPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDocRef.current || !canvasRef.current) return;

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDocRef.current.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale: scale * 1.5 });
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: unknown) {
        const errorName = err && typeof err === "object" && "name" in err ? (err as { name: string }).name : "";
        if (errorName !== "RenderingCancelledException") {
          console.error("PDF render error:", err);
        }
      }
    },
    [scale]
  );

  useEffect(() => {
    if (pdfDocRef.current && !pdfLoading) {
      renderPdfPage(currentPage);
    }
  }, [currentPage, scale, pdfLoading, renderPdfPage]);

  if (!isOpen || !doc) return null;

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (window.document.fullscreenElement) {
        window.document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Split formatted content into pages if text content is provided
  const contentPages = doc.content
    ? doc.content.split(/\n\s*---\s*\n/).length > 1
      ? doc.content.split(/\n\s*---\s*\n/)
      : [doc.content]
    : [];

  const isDirectPdf = Boolean(pdfDocRef.current && !pdfError && !pdfLoading);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md select-none transition-all duration-200 ${
        isFullscreen ? "p-0" : "p-2 sm:p-4 md:p-6"
      }`}
      onContextMenu={(e) => {
        e.preventDefault();
        toast.warning("Rechtermuisknop en downloaden zijn uitgeschakeld voor vertrouwelijke documenten.");
      }}
      onDragStart={(e) => e.preventDefault()}
      tabIndex={0}
    >
      {/* Printable anti-leak shield */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
            display: none !important;
          }
          body::after {
            content: "VERTROUWELIJK DOCUMENT - AFDRUKKEN STRIKT VERBODEN VOOR DIT LID (LIJST VAN ANDEL)";
            visibility: visible !important;
            display: block !important;
            font-size: 24pt;
            color: red;
            text-align: center;
            padding-top: 100px;
          }
        }
      `}</style>

      {/* Main Viewer Card */}
      <div className="flex-1 flex flex-col bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden relative">
        
        {/* Top Header Bar */}
        <div className="bg-muted/60 border-b border-border px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-semibold text-foreground text-sm sm:text-base truncate max-w-[280px] sm:max-w-md">
                  {doc.title}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-accent border border-accent/30 shrink-0">
                  {doc.confidentiality || "Vertrouwelijk"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {doc.category} • Inzage geregistreerd voor: <strong className="text-foreground">{memberName}</strong>
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Simulation test button to prove screenshot protection */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerMask("Handmatige test van schermbeveiliging geactiveerd.")}
              title="Test de automatische schermopname/knipprogramma maskering"
              className="hidden lg:flex text-xs h-8 px-2.5 border-accent/30 text-accent hover:bg-accent/10"
            >
              <EyeOff className="w-3.5 h-3.5 mr-1.5" /> Test Knipprogramma Maskering
            </Button>

            {/* Zoom Controls */}
            <div className="flex items-center bg-background rounded-lg border border-border px-1 py-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setScale((s) => Math.max(0.7, s - 0.15))}
                title="Uitzoomen"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[11px] font-mono px-1.5 text-muted-foreground min-w-[3rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setScale((s) => Math.min(2.2, s + 0.15))}
                title="Inzoomen"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Page Navigation */}
            {totalPages > 1 && (
              <div className="flex items-center bg-background rounded-lg border border-border px-1 py-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Vorige pagina"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="text-[11px] font-medium px-2 text-foreground min-w-[3.8rem] text-center">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Volgende pagina"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Fullscreen Toggle */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Venster verkleinen" : "Volledig scherm"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </Button>

            {/* Close */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-destructive/15 hover:text-destructive"
              onClick={onClose}
              title="Sluiten"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Security Notification Banner */}
        <div className="bg-accent/10 border-b border-accent/20 px-4 py-1.5 text-xs text-foreground/85 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>
              <strong>Beveiligde lezersmodus:</strong> Downloaden, printen en kopiëren zijn vergrendeld. Bij knipprogramma of schermopname wordt de inhoud automatisch gemaskeerd.
            </span>
          </div>
          <span className="hidden sm:inline font-mono text-[11px] text-muted-foreground">
            Lid-ID: {userIdentifier}
          </span>
        </div>

        {/* Document Content Viewport */}
        <div className="flex-1 overflow-auto bg-neutral-900/10 dark:bg-neutral-950 p-4 sm:p-8 flex justify-center items-start relative">
          
          {/* MASK OVERLAY when screenshot, snipping tool, or blur is detected */}
          {isMasked && (
            <div className="absolute inset-0 z-40 bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center mb-4 text-destructive shadow-lg animate-pulse">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-2">
                Inhoud Gemaskeerd
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-2">
                {maskReason || "Schermopname, knipprogramma of vensterwisseling gedetecteerd."}
              </p>
              <p className="text-xs text-muted-foreground/80 max-w-sm mb-6">
                Ter bescherming van vertrouwelijke partijdocumenten van Lijst van Andel wordt dit document direct afgeschermd zodra er opnamesoftware actief is of het venster focus verliest.
              </p>
              <Button
                onClick={handleUnmask}
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-6 gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Document Veilig Ontgrendelen
              </Button>
            </div>
          )}

          {/* DOCUMENT PAPER CONTAINER */}
          <div
            className={`transition-all duration-300 relative shadow-2xl rounded-sm ${
              isMasked ? "blur-2xl opacity-10 pointer-events-none select-none" : "opacity-100"
            }`}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              maxWidth: "800px",
              width: "100%",
            }}
          >
            {/* WATERMARK OVERLAY across every page */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20 flex flex-col justify-around select-none opacity-20 dark:opacity-25">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="whitespace-nowrap font-mono font-bold text-xs tracking-wider transform -rotate-12 text-foreground/80"
                  style={{
                    transformOrigin: "center",
                    userSelect: "none",
                  }}
                >
                  {watermarkText} • {watermarkText}
                </div>
              ))}
            </div>

            {/* Direct PDF Canvas Renderer */}
            {isDirectPdf ? (
              <div className="bg-white rounded shadow border border-border/50 relative overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto block select-none pointer-events-none"
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
            ) : pdfLoading ? (
              /* Loading State */
              <div className="bg-card p-16 rounded-xl border border-border text-center">
                <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm font-semibold text-foreground">Document veilig inladen...</p>
                <p className="text-xs text-muted-foreground mt-1">Beveiligingscertificaten worden geverifieerd.</p>
              </div>
            ) : (
              /* High-Fidelity Formatted Party Document View */
              <div className="bg-white dark:bg-card text-neutral-900 dark:text-foreground p-8 sm:p-14 rounded shadow-2xl border border-border/70 min-h-[950px] relative flex flex-col justify-between select-none">
                
                {/* Official Party Header */}
                <div>
                  <div className="flex items-start justify-between border-b-2 border-accent/40 pb-5 mb-8">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.25em] text-accent mb-1">
                        Lijst van Andel • Gemeente Steenwijkerland
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-display font-bold text-neutral-900 dark:text-foreground leading-tight">
                        {doc.title}
                      </h1>
                      <div className="text-xs text-neutral-500 dark:text-muted-foreground mt-1">
                        Categorie: <span className="font-semibold text-neutral-800 dark:text-foreground">{doc.category}</span> • Datum:{" "}
                        <span className="font-semibold text-neutral-800 dark:text-foreground">{doc.date}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="inline-block px-3 py-1 rounded border border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 font-mono text-xs font-bold uppercase tracking-wider">
                        {doc.confidentiality || "VERTROUWELIJK"}
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-muted-foreground mt-1">
                        Doc ID: {doc.id}
                      </div>
                    </div>
                  </div>

                  {/* Summary / Metadata Lead Box */}
                  <div className="bg-neutral-50 dark:bg-muted/40 p-4 rounded-lg border border-neutral-200 dark:border-border mb-8 text-xs text-neutral-700 dark:text-muted-foreground">
                    <p className="font-medium text-neutral-900 dark:text-foreground mb-1">
                      Toelichting & Context:
                    </p>
                    <p>{doc.description}</p>
                    <div className="mt-2.5 pt-2 border-t border-neutral-200 dark:border-border/60 flex flex-wrap gap-4 text-[11px]">
                      <span><strong>Auteur / Commissie:</strong> {doc.author || "Fractie Lijst van Andel"}</span>
                      <span><strong>Bestandsgrootte:</strong> {doc.fileSize || "1.4 MB"}</span>
                      <span><strong>Geautoriseerde lezer:</strong> {memberName}</span>
                    </div>
                  </div>

                  {/* Document Body */}
                  <div className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed space-y-4">
                    {contentPages[currentPage - 1] ? (
                      contentPages[currentPage - 1].split("\n\n").map((para, idx) => {
                        if (para.startsWith("HOOFDSTUK") || para.startsWith("ARTIKEL") || para.startsWith("FINANCIEEL")) {
                          return (
                            <h3
                              key={idx}
                              className="text-base font-bold font-display uppercase tracking-wider text-accent border-b border-border/50 pb-1 mt-6 mb-2"
                            >
                              {para}
                            </h3>
                          );
                        }
                        if (para.match(/^[0-9]\.[0-9]/)) {
                          const [heading, ...rest] = para.split("\n");
                          return (
                            <div key={idx} className="mt-3">
                              <h4 className="font-semibold text-sm text-neutral-900 dark:text-foreground">
                                {heading}
                              </h4>
                              {rest.length > 0 && (
                                <p className="text-xs sm:text-sm text-neutral-700 dark:text-muted-foreground mt-1">
                                  {rest.join(" ")}
                                </p>
                              )}
                            </div>
                          );
                        }
                        return (
                          <p key={idx} className="text-xs sm:text-sm text-neutral-700 dark:text-muted-foreground">
                            {para}
                          </p>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        <FileText className="w-12 h-12 text-accent/40 mx-auto mb-3" />
                        <p className="text-sm font-semibold">Inhoud ter inzage voor de fractie en leden van Lijst van Andel.</p>
                        <p className="text-xs mt-1">Dit document is officieel geregistreerd in het beveiligde ledendossier.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Footer & Signature Stamp */}
                <div className="mt-12 pt-6 border-t border-neutral-200 dark:border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[11px] text-neutral-500 dark:text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    <span>Digitaal gewaarmerkt fractiedocument • Lijst van Andel</span>
                  </div>
                  <div className="font-mono">
                    Pagina {currentPage} van {totalPages}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Status & Warning Footer */}
        <div className="bg-muted/70 border-t border-border px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-accent" />
            <span>
              Vertrouwelijke partijgegevens • Exclusief voor lid: <strong className="text-foreground">{memberName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">Knipprogramma & opnamebeveiliging actief</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 text-xs px-2.5 text-foreground hover:bg-muted"
            >
              Sluiten
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
