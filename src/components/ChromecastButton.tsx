import React from "react";
import { Cast, Radio, Check, X } from "lucide-react";
import { useChromecast } from "@/lib/useChromecast";

interface ChromecastButtonProps {
  mediaUrl: string;
  mediaTitle?: string;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  className?: string;
}

export const ChromecastButton: React.FC<ChromecastButtonProps> = ({
  mediaUrl,
  mediaTitle,
  audioRef,
  className = "",
}) => {
  const { castAvailable, isCasting, deviceName, startCasting, stopCasting } = useChromecast();

  const handleToggleCast = async () => {
    if (isCasting) {
      await stopCasting();
    } else {
      await startCasting(mediaUrl, mediaTitle, audioRef?.current);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleCast}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs ${
        isCasting
          ? "bg-purple-600 text-white hover:bg-purple-700 ring-2 ring-purple-400/50 animate-pulse"
          : "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
      } ${className}`}
      title={
        isCasting
          ? `Gecast naar ${deviceName || "Chromecast"}. Klik om te stoppen.`
          : "Cast deze podcast naar Chromecast, Google Nest of Smart TV"
      }
    >
      <Cast className={`w-3.5 h-3.5 ${isCasting ? "text-white animate-bounce" : "text-accent"}`} />
      <span>{isCasting ? `Gecast naar ${deviceName || "Chromecast"}` : "Cast naar Chromecast"}</span>
      {isCasting && <X className="w-3 h-3 ml-0.5 opacity-80 hover:opacity-100" />}
    </button>
  );
};
