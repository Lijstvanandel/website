import { useEffect, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * PwaUpdatePrompt:
 * Luistert naar Service Worker lifecycle events en updates.
 * Wanneer er een nieuwe commit of build is uitgerold:
 * 1. Detecteert de browser direct de nieuwe SW (dankzij no-cache headers).
 * 2. Zodra de nieuwe SW klaarstaat of geactiveerd is, toont deze component een subtiele,
 *    elegante melding onderin het scherm of voert bij controllerchange een zachte refresh uit.
 */
export function PwaUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let refreshing = false;

    // Luister naar wisseling van actieve Service Worker (controllerchange)
    const onControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // Controleer periodiek (elke 15 minuten) en bij het terugkeren naar het tabblad op updates
    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          if (registration.waiting) {
            setNeedRefresh(true);
          }
          registration.update().catch(() => {
            // Negeer netwerkfouten bij offline gebruik
          });
        }
      } catch (_e) {
        // Geen SW ondersteuning of private mode
      }
    };

    // Luister naar visibilitychange: als de gebruiker de app na een tijdje weer opent
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = setInterval(checkForUpdates, 15 * 60 * 1000);

    // Initiële controle na laden van de pagina
    checkForUpdates();

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        // Stuur bericht naar de wachtende worker om skipWaiting uit te voeren
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      } else {
        window.location.reload();
      }
    } catch (_e) {
      window.location.reload();
    }
  };

  if (!needRefresh) return null;

  return (
    <div
      id="pwa-update-banner"
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-xl border border-amber-500/40 shadow-2xl shadow-black/60 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-display font-bold text-sm text-amber-400">
            Nieuwe versie beschikbaar
          </h4>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            Er zijn zojuist verbeteringen en updates uitgerold voor Lijst van Andel.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="h-8 px-3 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? "animate-spin" : ""}`} />
              <span>{isUpdating ? "Vernieuwen..." : "Nu vernieuwen"}</span>
            </Button>
            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors text-xs ml-auto"
              title="Later"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
