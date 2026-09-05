import React, { useState, useRef, useEffect } from "react";
import {
  Map,
  BarChart3,
  Sparkles,
  Maximize2,
  ExternalLink,
  Minimize2,
  ZoomIn,
  X,
  Play,
  RotateCcw,
  Layers,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface InteractiveArticleRendererProps {
  content: string;
  className?: string;
}

interface DataProductMeta {
  src: string;
  title: string;
  caption?: string;
  height: string;
  activateOnHover: boolean;
  type?: "map" | "chart" | "data";
}

// Subcomponent: Individual interactive Folium map / Plotly chart / Pandas dataproduct card
export const InteractiveDataProductEmbed: React.FC<DataProductMeta> = ({
  src,
  title,
  caption,
  height = "520px",
  activateOnHover = true,
  type = "map",
}) => {
  const [isActivated, setIsActivated] = useState<boolean>(!activateOnHover);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-detect if it's a map or a chart based on name/url
  const isMap =
    type === "map" ||
    src.toLowerCase().includes("kaart") ||
    src.toLowerCase().includes("map") ||
    src.toLowerCase().includes("folium") ||
    src.toLowerCase().includes("geo");

  const handleActivate = () => {
    if (!isActivated) {
      setIsLoading(true);
      setIsActivated(true);
    }
  };

  const handleMouseEnter = () => {
    if (activateOnHover && !isActivated) {
      handleActivate();
    }
  };

  const handleDeactivate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActivated(false);
    setIsLoading(false);
  };

  // Close fullscreen on ESC key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  const effectiveHeight = height.endsWith("px") || height.endsWith("%") || height.endsWith("vh") ? height : `${height}px`;

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        className="my-8 rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm transition-all hover:shadow-md group"
      >
        {/* Header bar of the data product */}
        <div className="bg-secondary/60 border-b border-border/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
              {isMap ? <Map className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">
                {title || (isMap ? "Interactieve Kaart Steenwijkerland" : "Interactief Dataproduct")}
              </h4>
              {caption && (
                <p className="text-[11px] text-muted-foreground truncate">{caption}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* SEO & Performance badge */}
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 border ${
                isActivated
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-accent/15 text-accent border-accent/30"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              {isActivated ? "Interactief actief" : "Hover om te activeren"}
            </span>

            {/* Action buttons */}
            {isActivated && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeactivate}
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                title="Deactiveer om pagina te scrollen zonder in te zoomen op de kaart"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Deactiveren
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              className="h-7 text-xs px-2 border-border"
              title="Volledig scherm weergave"
            >
              <Maximize2 className="w-3 h-3 mr-1" /> Groot
            </Button>

            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-7 px-2 text-xs rounded-md border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Open in nieuw venster"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Interactive Viewer Area */}
        <div
          className="relative w-full bg-[#0d1412] overflow-hidden"
          style={{ height: effectiveHeight, minHeight: "360px" }}
        >
          {isActivated ? (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/70 z-10">
                  <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                    <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    Dataproduct laden...
                  </div>
                </div>
              )}
              <iframe
                src={src}
                title={title || "Interactief Dataproduct"}
                onLoad={() => setIsLoading(false)}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                loading="lazy"
              />
            </>
          ) : (
            /* Inactive state: fast-loading SEO and CWV placeholder */
            <div
              onClick={handleActivate}
              className="w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer relative group/placeholder select-none bg-gradient-to-b from-card via-card/95 to-secondary/40"
            >
              {/* Subtle background decorative grid */}
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
                  backgroundSize: "24px 24px",
                }}
              />

              <div className="relative z-10 max-w-md mx-auto space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-accent/20 border border-accent/40 text-accent flex items-center justify-center mx-auto shadow-sm group-hover/placeholder:scale-105 group-hover/placeholder:bg-accent group-hover/placeholder:text-accent-foreground transition-all">
                  {isMap ? <Map className="w-7 h-7" /> : <BarChart3 className="w-7 h-7" />}
                </div>

                <div>
                  <h5 className="font-display text-lg text-foreground font-semibold">
                    {title || (isMap ? "Interactieve Kaart Steenwijkerland" : "Interactief Dataproduct")}
                  </h5>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {caption ||
                      "Beweeg met de muis over dit vlak (of klik) om de interactieve weergave direct te laden en te bedienen."}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivate();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 shadow-xs transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {isMap ? "Interactieve kaart activeren" : "Dataproduct activeren"}
                  </button>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    • Snelle laadtijd geoptimaliseerd
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div className="bg-secondary/40 border-t border-border/60 px-4 py-2 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-accent" />
            <span>Dataset & analyse • Lijst van Andel Steenwijkerland</span>
          </span>
          <span className="text-muted-foreground/80">
            {isActivated
              ? "Tip: Zoom in met de muis of sleep om door de kaart te navigeren."
              : "Wordt pas geladen bij hover om laadsnelheid en SEO te beschermen."}
          </span>
        </div>
      </div>

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
          <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center">
                {isMap ? <Map className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">
                  {title || (isMap ? "Interactieve Kaart" : "Dataproduct")}
                </h3>
                {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-secondary text-foreground"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Nieuw tabblad
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="h-8 text-xs font-medium"
              >
                <Minimize2 className="w-3.5 h-3.5 mr-1" /> Sluiten (ESC)
              </Button>
            </div>
          </div>

          <div className="flex-1 w-full h-full bg-[#0d1412] relative">
            <iframe
              src={src}
              title={title || "Dataproduct Fullscreen"}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </div>
      )}
    </>
  );
};

// Main renderer component that parses HTML, handles custom dataproduct blocks and image sizing
export const InteractiveArticleRenderer: React.FC<InteractiveArticleRendererProps> = ({
  content,
  className = "",
}) => {
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string; caption?: string } | null>(null);

  if (!content) return null;

  // Split content into regular HTML segments and <div data-dataproduct="true" ...> or <div class="data-product-container" ...>
  // Regex to match data-product blocks
  const dataProductRegex = /<div[^>]*data-dataproduct=["']true["'][^>]*>([\s\S]*?)<\/div>/gi;

  const parts: (
    | { type: "html"; html: string }
    | { type: "dataproduct"; meta: DataProductMeta }
  )[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = dataProductRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      parts.push({
        type: "html",
        html: content.substring(lastIndex, matchIndex),
      });
    }

    // Extract attributes from fullMatch
    const srcMatch = fullMatch.match(/data-src=["']([^"']+)["']/i);
    const titleMatch = fullMatch.match(/data-title=["']([^"']+)["']/i);
    const captionMatch = fullMatch.match(/data-caption=["']([^"']+)["']/i);
    const heightMatch = fullMatch.match(/data-height=["']([^"']+)["']/i);
    const hoverMatch = fullMatch.match(/data-hover=["']([^"']+)["']/i);
    const typeMatch = fullMatch.match(/data-type=["']([^"']+)["']/i);

    const src = srcMatch ? srcMatch[1] : "";
    const title = titleMatch ? titleMatch[1] : "";
    const caption = captionMatch ? captionMatch[1] : "";
    const height = heightMatch ? heightMatch[1] : "520px";
    const activateOnHover = hoverMatch ? hoverMatch[1] !== "false" : true;
    const itemType = (typeMatch ? typeMatch[1] : "map") as "map" | "chart" | "data";

    if (src) {
      parts.push({
        type: "dataproduct",
        meta: {
          src,
          title,
          caption,
          height,
          activateOnHover,
          type: itemType,
        },
      });
    } else {
      parts.push({
        type: "html",
        html: fullMatch,
      });
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: "html",
      html: content.substring(lastIndex),
    });
  }

  // Handle image clicks for lightbox
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === "img") {
      const img = target as HTMLImageElement;
      // Find parent figure caption if any
      const figure = img.closest("figure");
      const figcaption = figure ? figure.querySelector("figcaption")?.textContent || "" : "";
      setLightboxImage({
        src: img.src,
        alt: img.alt || "Afbeelding",
        caption: figcaption || img.title || "",
      });
    }
  };

  return (
    <div className={`interactive-article-renderer ${className}`}>
      {parts.map((part, index) => {
        if (part.type === "dataproduct") {
          return (
            <InteractiveDataProductEmbed
              key={`dataproduct-${index}`}
              {...part.meta}
            />
          );
        }

        return (
          <div
            key={`html-${index}`}
            onClick={handleContentClick}
            className="prose prose-lg dark:prose-invert max-w-none text-foreground/90 leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-foreground [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-accent [&_h3]:mt-6 [&_h3]:mb-2 [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_figure]:my-6 [&_figure_img]:cursor-zoom-in [&_figure_img]:rounded-xl [&_figure_img]:shadow-sm [&_figure_img]:border [&_figure_img]:border-border/80 [&_figure_figcaption]:text-xs [&_figure_figcaption]:text-muted-foreground [&_figure_figcaption]:mt-2 [&_figure_figcaption]:italic"
            dangerouslySetInnerHTML={{ __html: part.html }}
          />
        );
      })}

      {/* Lightbox for zooming in on high-resolution charts & images */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-1 text-xs font-semibold"
            >
              <X className="w-5 h-5" /> Sluiten
            </button>
            <img
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg shadow-2xl border border-white/20 bg-background"
            />
            {lightboxImage.caption && (
              <p className="text-xs sm:text-sm text-white/90 text-center mt-3 max-w-2xl px-4 py-1.5 rounded-full bg-black/50 border border-white/10">
                {lightboxImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveArticleRenderer;
