import { useState, useEffect } from "react";
import { ExternalLink, Star } from "lucide-react";

interface GooglePreferredSourceCardProps {
  className?: string;
  onStateChange?: (isVisible: boolean) => void;
}

const STORAGE_KEY = "lvandel_google_preferred_source_selected";

export function GooglePreferredSourceCard({
  className = "",
  onStateChange,
}: GooglePreferredSourceCardProps) {
  const [isDismissed, setIsDismissed] = useState<boolean>(true); // default true until verified client-side

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const isSelected = stored === "true";
      setIsDismissed(isSelected);
      onStateChange?.(!isSelected);
    } catch {
      setIsDismissed(false);
      onStateChange?.(true);
    }
  }, [onStateChange]);

  const handleClick = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch (e) {
      console.warn("Kon voorkeur niet opslaan in localStorage:", e);
    }
    setIsDismissed(true);
    onStateChange?.(false);
  };

  if (isDismissed) {
    return null;
  }

  const targetUrl = "https://www.google.com/preferences/source?q=swl.scientiarum.nl";

  return (
    <div
      className={`rounded-2xl border border-border bg-gradient-to-br from-card via-card to-accent/5 p-5 sm:p-6 shadow-sm flex flex-col justify-between transition-all duration-300 hover:border-accent/40 ${className}`}
    >
      <div>
        <div className="flex items-start gap-3.5 mb-2.5">
          {/* Clickable Google Icon */}
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="p-2 rounded-xl bg-background border border-border/80 shadow-xs hover:scale-105 hover:border-accent/50 transition-all flex-shrink-0 group/icon"
            title="Open Google bronvoorkeuren voor Lijst van Andel"
            aria-label="Open Google bronvoorkeuren voor Lijst van Andel"
          >
            <svg
              className="w-6 h-6 transition-transform group-hover/icon:scale-110"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.43 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.21 0 10.05 0 12s.45 3.79 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.57 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          </a>

          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-base sm:text-lg text-foreground leading-snug">
              Maak Lijst van Andel jouw voorkeursbron in Google
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent mt-0.5 uppercase tracking-wider">
              <Star className="w-3 h-3 fill-accent" /> Nieuwe Google functie
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2">
          Met een nieuwe functie van Google bepaal je voortaan zelf welke bronnen je als eerste ziet wanneer je zoekt. Zo mis je nooit meer de laatste berichten van Lijst van Andel.
        </p>
      </div>

      <div className="pt-4 mt-2 flex items-center justify-between gap-3 border-t border-border/50">
        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          swl.scientiarum.nl
        </span>
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 hover:shadow-md transition-all active:scale-98 ml-auto sm:ml-0"
        >
          <span>Instellen als voorkeursbron</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </a>
      </div>
    </div>
  );
}
