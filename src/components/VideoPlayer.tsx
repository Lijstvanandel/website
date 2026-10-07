import React, { useState } from "react";
import { Play } from "lucide-react";

interface VideoPlayerProps {
  url?: string;
  title?: string;
  className?: string;
  poster?: string;
}

function parseVideoUrl(rawUrl?: string): {
  type: "youtube" | "vimeo" | "native" | "unknown";
  src: string;
} {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { type: "unknown", src: "" };
  }

  const url = rawUrl.trim();

  // YouTube match: standard watch, short URL, embed, or shorts
  const ytRegex = /(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const ytMatch = url.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    return {
      type: "youtube",
      src: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
    };
  }

  // Vimeo match
  const vimeoRegex = /(?:vimeo\.com\/(?:video\/)?)([0-9]+)/i;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: "vimeo",
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // Check for common video file extensions or local uploads
  const isVideoFile =
    url.startsWith("/uploads/") ||
    url.startsWith("/videos/") ||
    /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);

  if (isVideoFile || url.startsWith("http") || url.startsWith("/")) {
    return {
      type: "native",
      src: url,
    };
  }

  return { type: "unknown", src: url };
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  title = "Video",
  className = "",
  poster,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const { type, src } = parseVideoUrl(url);

  if (!src) {
    return (
      <div className={`w-full h-full bg-black/60 flex flex-col items-center justify-center text-muted-foreground p-4 ${className}`}>
        <Play className="w-8 h-8 mb-2 opacity-40" />
        <span className="text-xs">Geen video beschikbaar</span>
      </div>
    );
  }

  // Ultra-lightweight click-to-play facade: eliminates 10MB+ video buffering overhead on page load
  if (!isPlaying) {
    const webpPoster = poster?.replace(/\.(jpg|jpeg|png)$/i, ".webp");
    return (
      <div
        className={`relative w-full h-full bg-black overflow-hidden group cursor-pointer select-none ${className}`}
        onClick={() => setIsPlaying(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsPlaying(true);
          }
        }}
        aria-label={`Speel video af: ${title}`}
      >
        {poster ? (
          <picture className="w-full h-full">
            {webpPoster && <source srcSet={webpPoster} type="image/webp" />}
            <img
              src={poster}
              alt={title}
              loading="lazy"
              decoding="async"
              width="640"
              height="360"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-85 group-hover:opacity-100"
            />
          </picture>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-900 to-black" />
        )}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-accent/90 text-accent-foreground group-hover:bg-accent group-hover:scale-110 transition-all flex items-center justify-center shadow-lg ring-4 ring-black/40">
            <Play className="w-6 h-6 ml-0.5 fill-current" />
          </div>
        </div>
      </div>
    );
  }

  if (type === "youtube" || type === "vimeo") {
    const embedUrl = src.includes("?") ? `${src}&autoplay=1` : `${src}?autoplay=1`;
    return (
      <div className={`relative w-full h-full bg-black overflow-hidden ${className}`}>
        <iframe
          src={embedUrl}
          title={title}
          className="w-full h-full border-0 absolute inset-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden ${className}`}>
      <video
        src={src}
        controls
        autoPlay
        playsInline
        preload="auto"
        poster={poster}
        className="w-full h-full object-cover"
      >
        <p className="text-xs text-white p-4">
          Uw browser ondersteunt deze video niet.{" "}
          <a href={src} target="_blank" rel="noopener noreferrer" className="underline text-accent">
            Klik hier om direct te bekijken
          </a>
        </p>
      </video>
    </div>
  );
};

export default VideoPlayer;
