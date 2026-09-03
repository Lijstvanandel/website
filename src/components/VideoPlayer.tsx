import React from "react";
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
  const { type, src } = parseVideoUrl(url);

  if (!src) {
    return (
      <div className={`w-full h-full bg-black/60 flex flex-col items-center justify-center text-muted-foreground p-4 ${className}`}>
        <Play className="w-8 h-8 mb-2 opacity-40" />
        <span className="text-xs">Geen video beschikbaar</span>
      </div>
    );
  }

  if (type === "youtube" || type === "vimeo") {
    return (
      <div className={`relative w-full h-full bg-black overflow-hidden ${className}`}>
        <iframe
          src={src}
          title={title}
          className="w-full h-full border-0 absolute inset-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden ${className}`}>
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
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
