import React, { useState, useRef, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { renderMathInHtml } from "@/utils/mathRenderer";
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

export const isInteractiveOrFullHtml = (text: string): boolean => {
  if (!text || typeof text !== "string") return false;
  const lower = text.toLowerCase();
  return (
    lower.includes("<!doctype") ||
    lower.includes("<html") ||
    lower.includes("<head") ||
    lower.includes("<body") ||
    lower.includes("<script") ||
    lower.includes("<canvas") ||
    lower.includes("<style") ||
    lower.includes("leaflet") ||
    lower.includes("chart.js") ||
    lower.includes('id="map"') ||
    lower.includes("id='map'") ||
    lower.includes("sidenote-trigger") ||
    lower.includes("infocard-trigger")
  );
};

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
  autoResize?: boolean;
  type?: "map" | "chart" | "data";
}

// Subcomponent: Individual interactive Folium map / Plotly chart / Pandas dataproduct card
export const InteractiveDataProductEmbed: React.FC<DataProductMeta> = ({
  src,
  title,
  caption,
  height = "520px",
  activateOnHover = true,
  autoResize = true,
  type = "map",
}) => {
  const [isActivated, setIsActivated] = useState<boolean>(!activateOnHover);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Guarantee that data products route through /api/dataproduct/view so Nginx proxy will never 404
  const effectiveSrc = useMemo(() => {
    if (!src) return "";
    const clean = src.trim();
    if (
      clean.startsWith("/uploads/dataproducts/") ||
      (clean.startsWith("/uploads/") && (clean.endsWith(".html") || clean.endsWith(".htm")))
    ) {
      return `/api/dataproduct/view?file=${encodeURIComponent(clean)}`;
    }
    return clean;
  }, [src]);

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

  // Auto-resize listener for dynamic height adjustment
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (
        e.data &&
        (e.data.type === "dataproduct-resize" || e.data.type === "resize") &&
        typeof e.data.height === "number" &&
        e.data.height > 100
      ) {
        // Strict upper limit (850px) to prevent recursive height growth
        const safeHeight = Math.min(e.data.height, 850);
        setContentHeight(safeHeight);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleIframeLoad = () => {
    setIsLoading(false);
    if (!autoResize) return;
    try {
      if (iframeRef.current) {
        const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
        if (doc && doc.body) {
          const h = Math.max(
            doc.body.scrollHeight,
            doc.documentElement.scrollHeight,
            doc.body.offsetHeight
          );
          if (h && h > 150) {
            // Strictly cap at max 850px to prevent infinite stretching feedback loops
            const safeH = Math.min(h, 850);
            setContentHeight(safeH);
          }
        }
      }
    } catch (e) {
      // Cross-origin fallback via postMessage
    }
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

  const parsedDefaultHeight = parseInt(height, 10) || 520;
  const effectiveHeight = height.endsWith("px") || height.endsWith("%") || height.endsWith("vh") ? height : `${parsedDefaultHeight}px`;
  const containerStyleHeight = autoResize && contentHeight ? `${Math.min(contentHeight, 850)}px` : effectiveHeight;

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
              href={effectiveSrc}
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
          className="relative w-full bg-[#0d1412] overflow-hidden transition-all duration-300 max-h-[850px]"
          style={{ height: containerStyleHeight, minHeight: "360px" }}
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
                ref={iframeRef}
                src={effectiveSrc}
                title={title || "Interactief Dataproduct"}
                onLoad={handleIframeLoad}
                scrolling="auto"
                className="w-full h-full border-0 overflow-auto"
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
                href={effectiveSrc}
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
              src={effectiveSrc}
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

// Unified interactive article renderer matching the structure of 'Windturbine op het Groot verlaat'
export const InteractiveArticleRenderer: React.FC<InteractiveArticleRendererProps> = ({
  content,
  className = "",
}) => {
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string; caption?: string } | null>(null);
  const articleContainerRef = useRef<HTMLDivElement>(null);

  // Automatically fall back to /api/image/view if any uploaded image fails to load (bypasses Nginx static proxy issues)
  useEffect(() => {
    if (!articleContainerRef.current) return;
    const images = articleContainerRef.current.querySelectorAll("img");
    const cleanupFns: (() => void)[] = [];

    images.forEach((img) => {
      const handleImgError = () => {
        const rawSrc = img.getAttribute("src");
        if (
          rawSrc &&
          (rawSrc.startsWith("/uploads/") || rawSrc.startsWith("uploads/")) &&
          !rawSrc.startsWith("/api/image/view")
        ) {
          img.src = `/api/image/view?file=${encodeURIComponent(rawSrc)}`;
        }
      };
      img.addEventListener("error", handleImgError);
      cleanupFns.push(() => img.removeEventListener("error", handleImgError));
    });

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, [content]);

  // Dynamically load dependencies (Leaflet CSS/JS, Chart.js) and execute article scripts
  useEffect(() => {
    if (!articleContainerRef.current) return;
    const container = articleContainerRef.current;

    const rawLower = (content || "").toLowerCase();
    const needsLeaflet =
      rawLower.includes("leaflet") ||
      Boolean(container.querySelector("#map, .leaflet-map-container, [data-leaflet]"));
    const needsChart =
      rawLower.includes("chart.js") ||
      rawLower.includes("new chart") ||
      Boolean(container.querySelector("canvas"));

    // Ensure Leaflet core CSS
    if (needsLeaflet && !document.getElementById("leaflet-core-cdn-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-core-cdn-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const loadScript = (src: string, globalName?: string): Promise<void> => {
      if (globalName && (window as any)[globalName]) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement;
        if (existing) {
          if (globalName && (window as any)[globalName]) {
            resolve();
          } else {
            existing.addEventListener("load", () => resolve(), { once: true });
            setTimeout(resolve, 300);
          }
          return;
        }
        const s = document.createElement("script");
        s.src = src;
        s.async = false;
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.head.appendChild(s);
      });
    };

    let cancelled = false;

    const runScripts = async () => {
      if (needsLeaflet) {
        await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "L");
      }
      if (needsChart) {
        await loadScript("https://cdn.jsdelivr.net/npm/chart.js", "Chart");
      }

      if (cancelled) return;

      // Ensure any #map element has height so Leaflet does not initialize with 0px height
      const mapEl = container.querySelector("#map") as HTMLElement;
      if (mapEl) {
        if (!mapEl.style.height || mapEl.offsetHeight === 0) {
          mapEl.style.height = "440px";
        }
        if (!mapEl.style.width) {
          mapEl.style.width = "100%";
        }
      }

      // Find all script tags in the rendered article container
      const scripts = Array.from(container.querySelectorAll("script"));
      for (const oldScript of scripts) {
        if (cancelled) return;
        if (oldScript.getAttribute("data-executed") === "true") continue;
        oldScript.setAttribute("data-executed", "true");

        if (oldScript.src) {
          await loadScript(oldScript.src);
        } else if (oldScript.textContent && oldScript.textContent.trim()) {
          try {
            const fn = new Function(oldScript.textContent);
            fn();
            // Dispatch synthetic events so scripts with DOMContentLoaded or load event listeners execute immediately
            document.dispatchEvent(new Event("DOMContentLoaded"));
            window.dispatchEvent(new Event("load"));
          } catch (err) {
            console.warn("Fout bij uitvoeren van artikel-script:", err);
          }
        }
      }

      // Refresh any Leaflet maps after initialization
      setTimeout(() => {
        if (cancelled) return;
        if ((window as any).L) {
          try {
            const mapNodes = container.querySelectorAll(".leaflet-container");
            mapNodes.forEach((node) => {
              const m = (node as any)._leaflet_map;
              if (m && typeof m.invalidateSize === "function") {
                m.invalidateSize();
              }
            });
          } catch (e) {}
        }
        window.dispatchEvent(new Event("resize"));
      }, 350);
    };

    runScripts();

    return () => {
      cancelled = true;
    };
  }, [content]);

  // Initialize source cards state (ensuring cards start collapsed unless specified)
  useEffect(() => {
    if (!articleContainerRef.current) return;
    const triggers = articleContainerRef.current.querySelectorAll<HTMLElement>(
      ".token-source__trigger, .sidenote-trigger, .infocard-trigger, [data-source-trigger='true']"
    );

    triggers.forEach((trigger) => {
      const controlsId = trigger.getAttribute("aria-controls");
      let card: HTMLElement | null = null;
      if (controlsId) {
        card = articleContainerRef.current?.querySelector(`#${CSS.escape(controlsId)}`) || document.getElementById(controlsId);
      }
      if (!card) {
        const wrapper = trigger.closest(".token-source__wrapper, .token-source, p");
        card = wrapper?.querySelector(".token-source__card, .sidenote-card, .infocard-card") as HTMLElement | null;
        if (!card && trigger.nextElementSibling && (
          trigger.nextElementSibling.classList.contains("token-source__card") ||
          trigger.nextElementSibling.classList.contains("sidenote-card") ||
          trigger.nextElementSibling.classList.contains("infocard-card")
        )) {
          card = trigger.nextElementSibling as HTMLElement;
        }
      }

      if (card) {
        const isExpanded = trigger.getAttribute("aria-expanded") === "true";
        if (!isExpanded) {
          card.setAttribute("hidden", "");
          card.classList.remove("is-open");
        } else {
          card.removeAttribute("hidden");
          card.classList.add("is-open");
        }

        // Add close button inside card if not present
        if (!card.querySelector(".source-card__close")) {
          const closeBtn = document.createElement("button");
          closeBtn.type = "button";
          closeBtn.className = "source-card__close";
          closeBtn.title = "Bronkaart sluiten";
          closeBtn.setAttribute("aria-label", "Sluit bronkaart");
          closeBtn.innerHTML = "✕";
          card.appendChild(closeBtn);
        }
      }
    });
  }, [content]);

  // Extract all sources cited in the article for a clean summary at the bottom if any exist
  const citedSources = useMemo(() => {
    if (!content) return [];
    const list: { id: string; text: string; title: string; url?: string; note?: string }[] = [];

    // Match both De Correspondent style and our token-source cards
    const sourceRegex =
      /<(?:a|button)[^>]*class=["'][^"']*token-source__trigger[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|button)>[\s\S]*?<(?:div|span)[^>]*class=["'][^"']*token-source__card[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span)>/gi;
    let m;
    while ((m = sourceRegex.exec(content)) !== null) {
      const triggerContent = m[1].replace(/<[^>]+>/g, "").replace(/\*$/, "").trim();
      const cardHtml = m[2];
      const linkMatch = cardHtml.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      const url = linkMatch ? linkMatch[1] : undefined;
      const title = linkMatch
        ? linkMatch[2].replace(/<[^>]+>/g, "").trim()
        : cardHtml.replace(/<[^>]+>/g, "").replace(/^Bron:\s*/i, "").replace(/✕/g, "").trim();

      const noteMatch = cardHtml.match(/class=["'][^"']*(?:source--note|token-source__note)[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div)>/i);
      const note = noteMatch ? noteMatch[1].replace(/<[^>]+>/g, "").trim() : undefined;

      if (title && !list.some((item) => item.title === title && item.url === url)) {
        list.push({
          id: `ref-${list.length + 1}`,
          text: triggerContent,
          title,
          url,
          note,
        });
      }
    }
    return list;
  }, [content]);

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
    const autoResizeMatch = fullMatch.match(/data-autoresize=["']([^"']+)["']/i);
    const typeMatch = fullMatch.match(/data-type=["']([^"']+)["']/i);

    const src = srcMatch ? srcMatch[1] : "";
    const title = titleMatch ? titleMatch[1] : "";
    const caption = captionMatch ? captionMatch[1] : "";
    const height = heightMatch ? heightMatch[1] : "520px";
    const activateOnHover = hoverMatch ? hoverMatch[1] !== "false" : true;
    const autoResize = autoResizeMatch ? autoResizeMatch[1] !== "false" : true;
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
          autoResize,
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

  // Handle clicks for images (lightbox), source cards toggle, and external citations
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // 1. Let external source links navigate naturally
    const link = target.closest("a");
    if (
      link &&
      link.href &&
      !link.classList.contains("token-source__trigger") &&
      !link.classList.contains("sidenote-trigger") &&
      !link.classList.contains("infocard-trigger")
    ) {
      // Allow browser to open link (target="_blank" or same tab)
      return;
    }

    // 2. Handle close button inside source cards
    const closeBtn = target.closest(".source-card__close, .token-source__close, .source-close-btn");
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const card = closeBtn.closest(".token-source__card, .sidenote-card, .infocard-card") as HTMLElement | null;
      if (card) {
        card.setAttribute("hidden", "");
        card.classList.remove("is-open");
        const id = card.id;
        if (id) {
          const trigger = articleContainerRef.current?.querySelector(`[aria-controls="${id}"]`);
          if (trigger) trigger.setAttribute("aria-expanded", "false");
        }
      }
      return;
    }

    // 3. Handle source trigger clicks (asterisk / word / info dropdown)
    const trigger = target.closest(
      ".token-source__trigger, .sidenote-trigger, .infocard-trigger, [data-source-trigger='true']"
    ) as HTMLElement | null;

    if (trigger) {
      e.preventDefault();
      e.stopPropagation();

      const controlsId = trigger.getAttribute("aria-controls");
      let card: HTMLElement | null = null;
      if (controlsId) {
        card = articleContainerRef.current?.querySelector(`#${CSS.escape(controlsId)}`) || document.getElementById(controlsId);
      }
      if (!card) {
        const wrapper = trigger.closest(".token-source__wrapper, .token-source, p");
        card = wrapper?.querySelector(".token-source__card, .sidenote-card, .infocard-card") as HTMLElement | null;
        if (!card && trigger.nextElementSibling && (
          trigger.nextElementSibling.classList.contains("token-source__card") ||
          trigger.nextElementSibling.classList.contains("sidenote-card") ||
          trigger.nextElementSibling.classList.contains("infocard-card")
        )) {
          card = trigger.nextElementSibling as HTMLElement;
        }
      }

      if (card) {
        const isCurrentlyExpanded =
          trigger.getAttribute("aria-expanded") === "true" ||
          card.classList.contains("is-open") ||
          !card.hasAttribute("hidden");

        if (isCurrentlyExpanded) {
          trigger.setAttribute("aria-expanded", "false");
          card.setAttribute("hidden", "");
          card.classList.remove("is-open");
        } else {
          trigger.setAttribute("aria-expanded", "true");
          card.removeAttribute("hidden");
          card.classList.add("is-open");
        }
      }
      return;
    }

    // 4. Handle image lightbox
    if (target.tagName.toLowerCase() === "img") {
      const img = target as HTMLImageElement;
      const figure = img.closest("figure");
      const figcaption = figure ? figure.querySelector("figcaption")?.textContent || "" : "";
      setLightboxImage({
        src: img.src,
        alt: img.alt || "Afbeelding",
        caption: figcaption || img.title || "",
      });
    }
  };

  if (!content) return null;

  return (
    <div ref={articleContainerRef} className={`interactive-article-renderer ${className}`}>
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
            className="prose prose-lg dark:prose-invert max-w-none text-foreground/90 leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-foreground [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-accent [&_h3]:mt-6 [&_h3]:mb-2 [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_figure]:my-6 [&_figure_img]:cursor-zoom-in [&_figure_img]:rounded-xl [&_figure_img]:shadow-sm [&_figure_img]:border [&_figure_img]:border-border/80 [&_figure_figcaption]:text-xs [&_figure_figcaption]:text-muted-foreground [&_figure_figcaption]:mt-2 [&_figure_figcaption]:italic [&_iframe]:max-w-full [&_iframe]:max-h-[850px] [&_img]:max-w-full [&_img]:h-auto [&_.katex-display]:my-4 [&_.katex]:text-foreground [&_.wide-container]:max-w-4xl [&_.wide-container]:mx-auto [&_.wide-container]:my-8 [&_.wide-container]:p-6 [&_.wide-container]:bg-card [&_.wide-container]:rounded-xl [&_.wide-container]:border [&_.wide-container]:border-border/80 [&_.wide-container]:shadow-xs [&_#map]:min-h-[440px] [&_#map]:w-full [&_#map]:rounded-xl [&_#map]:border [&_#map]:border-border/80 [&_#map]:my-4 [&_.leaflet-container]:z-[1] [&_canvas]:max-w-full [&_.chart-container]:relative [&_.chart-container]:w-full [&_.chart-container]:h-[380px] [&_.key-metrics]:grid [&_.key-metrics]:grid-cols-2 md:[&_.key-metrics]:grid-cols-4 [&_.key-metrics]:gap-4 [&_.key-metrics]:my-6 [&_.metric-card]:p-4 [&_.metric-card]:rounded-xl [&_.metric-card]:border [&_.metric-card]:border-border/80 [&_.metric-card]:bg-card [&_table]:w-full [&_table]:border-collapse [&_table]:my-6 [&_table]:text-sm [&_th]:border [&_th]:border-border [&_th]:p-2.5 [&_th]:bg-muted/50 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:p-2.5 [&_.token-source__card]:bg-card [&_.token-source__card]:border [&_.token-source__card]:border-border/80 [&_.token-source__card]:border-l-4 [&_.token-source__card]:border-l-accent [&_.token-source__card]:rounded-lg [&_.token-source__card]:p-4 [&_.token-source__card]:my-3 [&_.token-source__card]:shadow-md [&_.token-source__card]:text-sm [&_.sidenote-card]:bg-card [&_.sidenote-card]:border [&_.sidenote-card]:border-border/80 [&_.sidenote-card]:border-l-4 [&_.sidenote-card]:border-l-accent [&_.sidenote-card]:rounded-lg [&_.sidenote-card]:p-4 [&_.sidenote-card]:my-3 [&_.sidenote-card]:shadow-md [&_.sidenote-card]:text-sm [&_.infocard-card]:bg-card [&_.infocard-card]:border [&_.infocard-card]:border-border/80 [&_.infocard-card]:border-l-4 [&_.infocard-card]:border-l-accent [&_.infocard-card]:rounded-lg [&_.infocard-card]:p-4 [&_.infocard-card]:my-3 [&_.infocard-card]:shadow-md [&_.infocard-card]:text-sm"
            dangerouslySetInnerHTML={{ __html: renderMathInHtml(part.html) }}
          />
        );
      })}

      {/* Optional reference overview when sources are cited */}
      {citedSources.length > 0 && (
        <details className="mt-8 pt-6 border-t border-border/80 text-sm group bg-muted/15 p-4 rounded-xl border border-border/60">
          <summary className="font-semibold text-foreground cursor-pointer select-none flex items-center justify-between hover:text-accent transition-colors">
            <span className="flex items-center gap-2">
              <span>📚 Geraadpleegde bronnen & documentatie</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold border border-accent/30">
                {citedSources.length}
              </span>
            </span>
            <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <ol className="mt-4 space-y-2.5 pl-5 list-decimal text-xs text-muted-foreground leading-relaxed">
            {citedSources.map((s, i) => (
              <li key={i} className="pl-1">
                {s.text && <span className="text-foreground font-semibold">"{s.text}" — </span>}
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline font-medium hover:opacity-80 inline-flex items-center gap-1"
                  >
                    <span>{s.title}</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                ) : (
                  <span className="text-foreground/90">{s.title}</span>
                )}
                {s.note && <span className="block text-[11px] text-muted-foreground italic mt-0.5">{s.note}</span>}
              </li>
            ))}
          </ol>
        </details>
      )}

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

