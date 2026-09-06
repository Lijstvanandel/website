import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  QrCode,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  User,
  Mail,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Ban,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
// @ts-expect-error - jsqr package doesn't ship declaration files by default
import jsQR from "jsqr";

interface TicketScanData {
  id: string;
  ticketCode: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventCity?: string;
  eventAddress?: string;
  fullName: string;
  email: string;
  phone?: string;
  isMember?: boolean;
  price?: number;
  paid?: boolean;
  status: "active" | "cancelled";
  checkedIn?: boolean;
  checkedInAt?: string;
  checkInStatus?: "accepted" | "rejected" | "pending";
  scannedBy?: {
    id: string;
    name: string;
    role: string;
  };
  rejectionReason?: string;
}

interface TicketScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | null;
}

export function TicketScannerModal({ open, onOpenChange, token }: TicketScannerModalProps) {
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannedTicket, setScannedTicket] = useState<TicketScanData | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const scanPausedRef = useRef<boolean>(false);

  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const lookupTicket = useCallback(
    async (rawCode: string) => {
      let code = rawCode.trim();
      // If full URL was scanned (e.g. https://.../ticket/12345 or /ticket/12345), extract the code
      if (code.includes("/ticket/")) {
        const parts = code.split("/ticket/");
        code = parts[1].split("?")[0].split("#")[0].replace(/[^a-zA-Z0-9_-]/g, "");
      } else {
        code = code.replace(/[^a-zA-Z0-9_-]/g, "");
      }

      if (!code) {
        toast.error("Ongeldige ticketcode gescand");
        return;
      }

      setLoading(true);
      scanPausedRef.current = true;
      try {
        const res = await fetch(`/api/tickets/scan/${encodeURIComponent(code)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok && data.ticket) {
          setScannedTicket(data.ticket);
          setLastScannedCode(code);
          setShowRejectInput(false);
          setRejectionNote("");
        } else {
          toast.error(data.error || "Ticket niet gevonden in het systeem.");
          setScannedTicket(null);
          // Resume scanning after 2 seconds
          setTimeout(() => {
            scanPausedRef.current = false;
          }, 2000);
        }
      } catch {
        toast.error("Fout bij ophalen van ticket.");
        scanPausedRef.current = false;
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || scanPausedRef.current) {
      if (cameraActive) {
        animFrameIdRef.current = requestAnimationFrame(scanFrame);
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        try {
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code && code.data) {
            const trimmed = code.data.trim();
            if (trimmed && trimmed !== lastScannedCode) {
              lookupTicket(trimmed);
            }
          }
        } catch {
          // Ignore QR decode glitch
        }
      }
    }

    if (cameraActive) {
      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    }
  }, [cameraActive, lastScannedCode, lookupTicket]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    scanPausedRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera wordt niet ondersteund in deze browser.");
      return;
    }

    try {
      // Prefer back camera (environment)
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      setCameraError(
        "Cameratoegang geweigerd of camera niet beschikbaar. Geef toestemming voor de camera of voer de code handmatig in."
      );
      setCameraActive(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setScannedTicket(null);
      setManualCode("");
      setLastScannedCode(null);
    }
    return () => {
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  useEffect(() => {
    if (cameraActive && !scannedTicket) {
      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    }
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [cameraActive, scannedTicket, scanFrame]);

  const handleDecision = async (decision: "accepted" | "rejected") => {
    if (!scannedTicket) return;
    setProcessingAction(true);

    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(scannedTicket.ticketCode)}/scan-decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision,
          reason: decision === "rejected" ? rejectionNote.trim() || "Geweigerd door controleur" : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setScannedTicket(data.ticket);
        if (decision === "accepted") {
          toast.success(`Toegang geaccepteerd voor ${scannedTicket.fullName}!`);
        } else {
          toast.error(`Toegang geweigerd voor ${scannedTicket.fullName}.`);
        }
      } else {
        toast.error(data.error || "Fout bij verwerken beslissing.");
      }
    } catch {
      toast.error("Netwerkfout bij bijwerken status.");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleNextScan = () => {
    setScannedTicket(null);
    setLastScannedCode(null);
    setManualCode("");
    setShowRejectInput(false);
    setRejectionNote("");
    scanPausedRef.current = false;
    if (!cameraActive) {
      startCamera();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      lookupTicket(manualCode.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden border-border bg-card max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent/20 text-accent">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-display text-white">
                Ticket Scanner
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                Toegangscontrole voor evenementen
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            onClick={startCamera}
            title="Herstart camera"
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* SCANNED TICKET RESULT CARD */}
          {scannedTicket ? (
            <div className="space-y-4 animate-fade-up">
              {/* STATUS BANNER */}
              {scannedTicket.checkInStatus === "accepted" || scannedTicket.checkedIn ? (
                <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-bold text-sm">Toegang Toegestaan (Ingecheckt)</div>
                      <div className="text-[11px] opacity-85">
                        {scannedTicket.checkedInAt
                          ? `Ingecheckt om ${new Date(scannedTicket.checkedInAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`
                          : "Status: Geaccepteerd"}
                        {scannedTicket.scannedBy?.name ? ` door ${scannedTicket.scannedBy.name}` : ""}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500 text-white font-bold">
                    OK
                  </span>
                </div>
              ) : scannedTicket.checkInStatus === "rejected" ? (
                <div className="p-3.5 bg-destructive/15 border border-destructive/30 rounded-xl flex items-center justify-between text-destructive">
                  <div className="flex items-center gap-2">
                    <Ban className="w-5 h-5 text-destructive shrink-0" />
                    <div>
                      <div className="font-bold text-sm">Toegang Geweigerd</div>
                      <div className="text-[11px] opacity-85">
                        {scannedTicket.rejectionReason || "Aanwezigheid afgekeurd bij de deur"}
                        {scannedTicket.scannedBy?.name ? ` door ${scannedTicket.scannedBy.name}` : ""}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-destructive text-white font-bold">
                    Geweigerd
                  </span>
                </div>
              ) : scannedTicket.status === "cancelled" ? (
                <div className="p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <div className="font-bold text-sm">Let op: Ticket is Afgemeld / Geannuleerd</div>
                    <div className="text-[11px] opacity-85">
                      Deze bezoeker heeft zich vooraf afgemeld voor de bijeenkomst.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-blue-500/15 border border-blue-500/30 rounded-xl flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <div className="font-bold text-sm">Geldig Toegangsbewijs</div>
                    <div className="text-[11px] opacity-85">
                      Controleer de gegevens hieronder en accepteer of weiger toegang.
                    </div>
                  </div>
                </div>
              )}

              {/* TICKET DETAILS BOX */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
                  <div className="font-mono text-base font-bold text-accent">
                    #{scannedTicket.ticketCode}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {scannedTicket.isMember ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                        Partijlid (Gratis)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold text-xs">
                        Gast {scannedTicket.price ? `(€${scannedTicket.price.toFixed(2)})` : "(Gratis)"}
                      </span>
                    )}
                  </div>
                </div>

                {/* NAAM EN EMAIL (Centraal gevraagd) */}
                <div className="space-y-2 py-1">
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Naam bezoeker</span>
                      <span className="font-bold text-base text-foreground">
                        {scannedTicket.fullName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground block">E-mailadres</span>
                      <span className="font-mono text-xs text-foreground block truncate">
                        {scannedTicket.email}
                      </span>
                    </div>
                  </div>

                  {scannedTicket.phone && (
                    <div className="text-xs text-muted-foreground pl-6">
                      Tel: {scannedTicket.phone}
                    </div>
                  )}
                </div>

                {/* EVENEMENT INFO */}
                <div className="pt-2 border-t border-border/70 text-xs text-muted-foreground space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    {scannedTicket.eventTitle}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      {scannedTicket.eventDate} ({scannedTicket.eventTime || "19:30"})
                    </span>
                    {scannedTicket.eventCity && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        {scannedTicket.eventCity}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* REJECTION REASON INPUT (Optional) */}
              {showRejectInput && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 space-y-2 animate-fade-up">
                  <label className="text-xs font-semibold text-destructive block">
                    Reden van weigering (optioneel):
                  </label>
                  <input
                    type="text"
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    placeholder="Bijv. Geen geldige legitimatie, niet betaald..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-destructive/30 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-destructive"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={processingAction}
                      onClick={() => handleDecision("rejected")}
                      className="px-4 py-1.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Definitief Weigeren
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(false)}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS: ACCEPTEREN & WEIGEREN */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  disabled={processingAction || scannedTicket.checkInStatus === "accepted"}
                  onClick={() => handleDecision("accepted")}
                  className={`flex-1 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm shadow-md transition-all ${
                    scannedTicket.checkInStatus === "accepted"
                      ? "bg-emerald-600/50 text-white cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-[0.99]"
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {scannedTicket.checkInStatus === "accepted" ? "Al Geaccepteerd" : "Toegang Accepteren"}
                </button>

                {!showRejectInput && (
                  <button
                    type="button"
                    disabled={processingAction}
                    onClick={() => setShowRejectInput(true)}
                    className="flex-1 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/15 transition-all"
                  >
                    <XCircle className="w-5 h-5" />
                    Toegang Weigeren
                  </button>
                )}
              </div>

              {/* VOLGENDE TICKET SCANNEN */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleNextScan}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold text-xs border border-border transition-colors"
                >
                  <Camera className="w-4 h-4 text-accent" />
                  Volgend ticket scannen
                  <ArrowRight className="w-3.5 h-3.5 ml-1 text-muted-foreground" />
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE CAMERA & SCANNER INTERFACE */
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video sm:aspect-[4/3] flex items-center justify-center shadow-inner border border-border">
                {/* Real video element */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                {/* Hidden canvas for QR analysis */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanner viewfinder overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-52 h-52 border-2 border-accent/80 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-accent -mt-1 -ml-1 rounded-tl-md" />
                    <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-accent -mt-1 -mr-1 rounded-tr-md" />
                    <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-accent -mb-1 -ml-1 rounded-bl-md" />
                    <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-accent -mb-1 -mr-1 rounded-br-md" />

                    {/* Animated scanning line */}
                    <div className="w-full h-0.5 bg-accent shadow-[0_0_8px_rgba(245,158,11,0.9)] animate-pulse absolute top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {loading && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 z-10">
                    <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold">Ticket verifiëren...</span>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/90 text-white p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
                    <AlertTriangle className="w-10 h-10 text-amber-500" />
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">Geen camerabeeld</p>
                      <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 bg-accent text-accent-foreground font-semibold rounded-full text-xs hover:bg-accent/90 transition-colors"
                    >
                      Opnieuw proberen
                    </button>
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-accent" />
                Richt de camera op de QR-code van het bezoekersticket.
              </div>

              {/* MANUAL CODE INPUT FALLBACK */}
              <div className="pt-2 border-t border-border">
                <form onSubmit={handleManualSubmit} className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Of vul ticketcode handmatig in:</span>
                    <span className="text-[11px] text-muted-foreground">bijv. 56234</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Voer 5-cijferige ticketcode in..."
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!manualCode.trim() || loading}
                      className="px-4 py-2 bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 text-xs font-bold rounded-lg transition-all shadow-sm shrink-0"
                    >
                      Controleren
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
