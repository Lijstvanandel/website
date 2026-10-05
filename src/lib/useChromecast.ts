import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

// Declare window types for Google Cast SDK
declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    cast?: any;
    chrome?: any;
  }
}

export interface UseChromecastReturn {
  castAvailable: boolean;
  isCasting: boolean;
  deviceName: string | null;
  startCasting: (mediaUrl: string, mediaTitle?: string, audioElement?: HTMLAudioElement | null) => Promise<void>;
  stopCasting: () => Promise<void>;
}

export function useChromecast(): UseChromecastReturn {
  const [castAvailable, setCastAvailable] = useState<boolean>(false);
  const [isCasting, setIsCasting] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const currentSessionRef = useRef<any>(null);

  // Initialize Cast Context when Cast SDK is ready
  useEffect(() => {
    const initCastFramework = () => {
      try {
        if (window.cast?.framework) {
          const context = window.cast.framework.CastContext.getInstance();
          context.setOptions({
            receiverApplicationId: window.chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID || "CC1AD845",
            autoJoinPolicy: window.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED || "origin_scoped",
            androidReceiverCompatible: true,
            language: "nl-NL",
          });

          setCastAvailable(true);

          // Listen for session state changes
          context.addEventListener(
            window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            (event: any) => {
              const session = context.getCurrentSession();
              if (
                event.sessionState === window.cast.framework.SessionState.SESSION_STARTED ||
                event.sessionState === window.cast.framework.SessionState.SESSION_RESUMED
              ) {
                setIsCasting(true);
                currentSessionRef.current = session;
                const receiverName = session?.getCastDevice()?.friendlyName || "Chromecast";
                setDeviceName(receiverName);
                toast.success(`Verbonden met ${receiverName}! Podcast wordt gecast.`);
              } else if (event.sessionState === window.cast.framework.SessionState.SESSION_ENDED) {
                setIsCasting(false);
                setDeviceName(null);
                currentSessionRef.current = null;
                toast.info("Chromecast verbinding verbroken");
              }
            }
          );
        }
      } catch (err) {
        console.warn("Google Cast framework initialization:", err);
      }
    };

    // If Cast API is already available on window:
    if (window.cast?.framework) {
      initCastFramework();
    } else {
      // Register global callback that sender SDK calls when loaded
      window.__onGCastApiAvailable = (isAvailable: boolean) => {
        if (isAvailable) {
          initCastFramework();
        }
      };
    }

    // Check fallback: Remote Playback API in modern browsers (Chrome Android & Desktop)
    if (typeof window !== "undefined" && "RemotePlayback" in window) {
      setCastAvailable(true);
    }
  }, []);

  const startCasting = useCallback(
    async (mediaUrl: string, mediaTitle?: string, audioElement?: HTMLAudioElement | null) => {
      // 1. Try Google Cast Framework SDK first
      if (window.cast?.framework && window.chrome?.cast) {
        try {
          const context = window.cast.framework.CastContext.getInstance();
          await context.requestSession();
          const session = context.getCurrentSession();

          if (session) {
            currentSessionRef.current = session;
            const fullUrl = mediaUrl.startsWith("http")
              ? mediaUrl
              : `${window.location.origin}${mediaUrl.startsWith("/") ? "" : "/"}${mediaUrl}`;

            const mediaInfo = new window.chrome.cast.media.MediaInfo(fullUrl, "audio/mp3");
            mediaInfo.metadata = new window.chrome.cast.media.MusicTrackMediaMetadata();
            mediaInfo.metadata.title = mediaTitle || "Lijst van Andel Podcast";
            mediaInfo.metadata.artist = "Lijst van Andel • Lokale Politiek Steenwijkerland";
            mediaInfo.metadata.albumName = "Lijst van Andel Podcast";
            mediaInfo.metadata.images = [
              { url: `${window.location.origin}/apple-touch-icon.png` },
            ];

            const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
            request.autoplay = true;

            // Sync current play time if audio is already playing locally
            if (audioElement && audioElement.currentTime > 0) {
              request.currentTime = audioElement.currentTime;
              audioElement.pause();
            }

            await session.loadMedia(request);
            const devName = session.getCastDevice()?.friendlyName || "Chromecast";
            setIsCasting(true);
            setDeviceName(devName);
            return;
          }
        } catch (err: any) {
          if (err !== "cancel") {
            console.warn("Cast framework requestSession:", err);
          }
        }
      }

      // 2. Fallback: Browser Remote Playback API (e.g. Chrome Android or desktop without Cast SDK)
      if (audioElement && (audioElement as any).remote) {
        try {
          const remote = (audioElement as any).remote;
          await remote.prompt();
          setIsCasting(true);
          setDeviceName("Draadloos Scherm / Speaker");
          toast.success("Verbinden met draadloos apparaat...");
          return;
        } catch (err: any) {
          if (err?.name !== "NotAllowedError") {
            console.warn("Remote playback prompt failed:", err);
          }
        }
      }

      // If no Cast receiver could be started:
      toast.info(
        "Kies een Chromecast, Google Nest of Smart TV in het cast-menu van uw browser (via de 3 puntjes rechtsboven in Google Chrome -> Casten)."
      );
    },
    []
  );

  const stopCasting = useCallback(async () => {
    try {
      if (window.cast?.framework) {
        const context = window.cast.framework.CastContext.getInstance();
        await context.endCurrentSession(true);
      }
    } catch (err) {
      console.warn("Fout bij stoppen cast:", err);
    }
    setIsCasting(false);
    setDeviceName(null);
    currentSessionRef.current = null;
  }, []);

  return {
    castAvailable,
    isCasting,
    deviceName,
    startCasting,
    stopCasting,
  };
}
