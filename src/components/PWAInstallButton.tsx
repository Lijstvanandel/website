import { useState } from "react";
import { Download, Smartphone, Share, PlusSquare, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface PWAInstallButtonProps {
  variant?: "header" | "button" | "banner";
  className?: string;
}

export function PWAInstallButton({ variant = "button", className = "" }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // If already running inside standalone PWA, don't show prompt
  if (isInstalled) {
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Fallback for browsers that support manual install
      setShowIOSModal(true);
    }
  };

  if (variant === "header") {
    return (
      <>
        <Button
          id="pwa-install-header-btn"
          variant="outline"
          size="sm"
          onClick={handleAction}
          className={`h-9 gap-1.5 px-3 rounded-full text-xs font-medium border-primary/30 hover:border-primary text-foreground bg-primary/5 hover:bg-primary/10 transition-all ${className}`}
          title="Installeer Lijst van Andel als PWA App op uw apparaat"
        >
          <Smartphone className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">App</span>
          <span className="sm:hidden">App</span>
        </Button>

        {/* iOS Install Dialog */}
        <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground font-display text-lg">
                <Smartphone className="w-5 h-5 text-primary" />
                Lijst van Andel App Installeren
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Installeer onze PWA direct op het startscherm van uw telefoon of computer voor snellere toegang en notificaties.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-sm text-foreground">
              {isIOS ? (
                <div className="space-y-3 bg-muted/40 p-4 rounded-xl border border-border/60">
                  <p className="font-semibold text-foreground text-xs uppercase tracking-wider">
                    Instructies voor iPhone / iPad (Safari):
                  </p>
                  <ol className="space-y-2.5 list-decimal list-inside text-xs sm:text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Share className="w-4 h-4 text-primary shrink-0" />
                      <span>Tik onderin op de <strong>Deel-knop</strong> in Safari</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <PlusSquare className="w-4 h-4 text-primary shrink-0" />
                      <span>Scroll naar beneden en kies <strong>&apos;Zet op beginscherm&apos;</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Tik rechtsboven op <strong>&apos;Voeg toe&apos;</strong></span>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3 bg-muted/40 p-4 rounded-xl border border-border/60">
                  <p className="font-semibold text-foreground text-xs uppercase tracking-wider">
                    Instructies voor Chrome / Edge / Android:
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Klik in het browsermenu (rechtsboven bij de 3 puntjes) op <strong>&apos;App installeren&apos;</strong> of <strong>&apos;Toevoegen aan startscherm&apos;</strong>.
                  </p>
                </div>
              )}

              <Button
                id="pwa-install-modal-close-btn"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                onClick={() => setShowIOSModal(false)}
              >
                Begrepen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (variant === "banner") {
    if (bannerDismissed) return null;
    return (
      <div className="bg-primary/10 border-b border-primary/20 text-foreground px-4 py-2.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary shrink-0" />
            <span>
              <strong>Lijst van Andel App:</strong> Installeer voor snelle toegang en directe notificaties voor belafspraken.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              id="pwa-banner-install-action"
              size="sm"
              onClick={handleAction}
              className="h-7 text-xs px-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
            >
              Installeren
            </Button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
              title="Sluiten"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      id="pwa-install-default-btn"
      variant="outline"
      onClick={handleAction}
      className={`gap-2 ${className}`}
    >
      <Download className="w-4 h-4 text-primary" />
      <span>Installeer PWA App</span>
    </Button>
  );
}
