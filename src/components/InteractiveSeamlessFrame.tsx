import React, { useState, useEffect, useRef, useMemo } from "react";
import { Maximize2, Minimize2, RotateCcw, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InteractiveSeamlessFrameProps {
  content: string;
  className?: string;
}

export const InteractiveSeamlessFrame: React.FC<InteractiveSeamlessFrameProps> = ({
  content,
  className = "",
}) => {
  const [frameHeight, setFrameHeight] = useState<number>(750);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameId = useRef<string>(`article-frame-${Math.random().toString(36).substring(2, 9)}`).current;

  // Build the complete HTML document with Leaflet, Chart.js, KaTeX and resize reporter
  const compiledHtml = useMemo(() => {
    if (!content) return "";

    const isFullDoc = /<!doctype/i.test(content) || /<html/i.test(content);

    // Injection script that calculates dynamic content height safely without feedback loops
    const helperScript = `
<script>
(function() {
  var frameId = "${frameId}";
  var lastSentHeight = 0;
  var debounceTimer = null;

  function ensureSentinel() {
    var sentinel = document.getElementById("__frame_sentinel");
    if (!sentinel && document.body) {
      sentinel = document.createElement("div");
      sentinel.id = "__frame_sentinel";
      sentinel.style.cssText = "clear:both;display:block;height:1px;width:100%;margin:0;padding:0;border:none;visibility:hidden;pointer-events:none;";
      document.body.appendChild(sentinel);
    }
    return sentinel;
  }

  function getContentHeight() {
    try {
      var sentinel = ensureSentinel();
      var sentinelHeight = 0;
      if (sentinel) {
        sentinelHeight = Math.ceil(sentinel.offsetTop);
      }

      var body = document.body;
      var maxBottom = 0;
      if (body) {
        var children = body.children;
        for (var i = 0; i < children.length; i++) {
          var child = children[i];
          if (child.id === "__frame_sentinel" || child.tagName === "SCRIPT" || child.tagName === "STYLE") continue;
          var bottom = child.offsetTop + child.offsetHeight;
          if (bottom > maxBottom) maxBottom = bottom;
        }
      }

      var calculated = Math.max(sentinelHeight, maxBottom);
      if (calculated < 100 && body) {
        calculated = Math.max(calculated, body.scrollHeight);
      }
      return Math.max(calculated, 150);
    } catch(err) {
      return document.body ? document.body.scrollHeight : 0;
    }
  }

  function sendHeight() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      try {
        var h = getContentHeight();
        // Only send if height changed by at least 8px to strictly prevent feedback loops
        if (h > 60 && Math.abs(h - lastSentHeight) >= 8) {
          lastSentHeight = h;
          window.parent.postMessage({
            type: "interactive-article-resize",
            frameId: frameId,
            height: h
          }, "*");
        }
      } catch(err) {
        // ignore
      }
    }, 40);
  }

  window.addEventListener("DOMContentLoaded", function() {
    ensureSentinel();
    sendHeight();
  });

  window.addEventListener("load", function() {
    ensureSentinel();
    sendHeight();
    setTimeout(sendHeight, 200);
    setTimeout(sendHeight, 600);
    setTimeout(sendHeight, 1500);

    // Invalidate Leaflet maps so tiles render with full dimensions
    try {
      if (window.L) {
        var mapElements = document.querySelectorAll('.leaflet-container');
        mapElements.forEach(function(el) {
          if (el._leaflet_map) {
            el._leaflet_map.invalidateSize();
          }
        });
      }
    } catch(e) {}
    window.dispatchEvent(new Event('resize'));
  });

  // Track DOM mutations (e.g. accordions/cards expanding) without listening to window viewport resize
  if (window.MutationObserver && document.body) {
    try {
      var mo = new MutationObserver(function() {
        sendHeight();
      });
      mo.observe(document.body, { childList: true, subtree: true, attributes: true });
    } catch(e) {}
  }

  // Universal click & keyboard handler for De Correspondent source cards & sidenotes
  document.addEventListener("click", function(e) {
    var trigger = e.target.closest(".sidenote-trigger, .infocard-trigger, .token-source__trigger, [data-source-trigger='true']");
    if (trigger) {
      e.preventDefault();
      var controlsId = trigger.getAttribute("aria-controls");
      var card = controlsId ? document.getElementById(controlsId) : null;
      if (!card) {
        var wrapper = trigger.closest(".token-source__wrapper, .token-source, p");
        card = wrapper ? wrapper.querySelector(".sidenote-card, .infocard-card, .token-source__card") : null;
        if (!card && trigger.nextElementSibling && (
          trigger.nextElementSibling.classList.contains("token-source__card") ||
          trigger.nextElementSibling.classList.contains("sidenote-card") ||
          trigger.nextElementSibling.classList.contains("infocard-card")
        )) {
          card = trigger.nextElementSibling;
        }
      }

      if (card) {
        var isHidden = card.hasAttribute("hidden") || card.style.display === "none" || !card.classList.contains("is-open");
        if (isHidden) {
          card.removeAttribute("hidden");
          card.style.display = "block";
          card.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
        } else {
          card.setAttribute("hidden", "");
          card.style.display = "none";
          card.classList.remove("is-open");
          trigger.setAttribute("aria-expanded", "false");
        }
        sendHeight();
      }
      return;
    }

    var closeBtn = e.target.closest(".source-card__close, .token-source__close");
    if (closeBtn) {
      e.preventDefault();
      var c = closeBtn.closest(".sidenote-card, .infocard-card, .token-source__card");
      if (c) {
        c.setAttribute("hidden", "");
        c.style.display = "none";
        c.classList.remove("is-open");
        var cid = c.id;
        if (cid) {
          var t = document.querySelector("[aria-controls='" + cid + "']");
          if (t) t.setAttribute("aria-expanded", "false");
        }
        sendHeight();
      }
    }
  });

  document.addEventListener("keydown", function(e) {
    if (e.key === "Enter" || e.key === " ") {
      var trigger = e.target.closest(".sidenote-trigger, .infocard-trigger, .token-source__trigger");
      if (trigger) {
        e.preventDefault();
        trigger.click();
      }
    }
  });
})();
</script>
`;

    if (isFullDoc) {
      let doc = content;

      // Reset html/body height to auto inside iframe to prevent viewport feedback loops
      doc = doc.replace(
        /<head[^>]*>/i,
        `$&<style>html, body { height: auto !important; min-height: 0 !important; }</style>`
      );

      // Ensure Leaflet CSS & JS exist if not in document
      if (!doc.includes("leaflet.css")) {
        doc = doc.replace(
          /<head[^>]*>/i,
          `$&<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />`
        );
      }
      if (!doc.includes("leaflet.js")) {
        doc = doc.replace(
          /<head[^>]*>/i,
          `$&<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>`
        );
      }

      // Ensure Chart.js exists if not in document
      if (!doc.includes("chart.js") && !doc.includes("Chart.js")) {
        doc = doc.replace(
          /<head[^>]*>/i,
          `$&<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`
        );
      }

      // Ensure links open in new tab
      if (!doc.includes("<base ")) {
        doc = doc.replace(/<head[^>]*>/i, `$&<base target="_blank">`);
      }

      const sentinelHtml = `<div id="__frame_sentinel" style="clear:both;display:block;height:1px;width:100%;margin:0;padding:0;border:none;visibility:hidden;pointer-events:none;"></div>`;

      // Inject sentinel and helper script before </body> or at end
      if (doc.includes("</body>")) {
        doc = doc.replace("</body>", `${sentinelHtml}${helperScript}</body>`);
      } else {
        doc += `${sentinelHtml}${helperScript}`;
      }

      return doc;
    }

    // Fragment mode: wrap in complete HTML document
    return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_blank">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
  <style>
    :root {
      --bg-color: #f9f9f2;
      --text-color: #1a1a1a;
      --accent-color: #e04b3f;
      --border-color: #e2e2dc;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: Georgia, Cambria, "Times New Roman", Times, serif;
      color: #1a1a1a;
      background-color: transparent;
      line-height: 1.75;
      -webkit-font-smoothing: antialiased;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
    canvas {
      max-width: 100%;
    }
    #map, .leaflet-map-container {
      min-height: 420px;
      width: 100%;
      border-radius: 10px;
      margin: 1.5rem 0;
      z-index: 1;
    }
    .leaflet-container {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }
    /* De Correspondent Source Card Defaults */
    .token-source__wrapper {
      position: relative;
      display: inline;
    }
    .sidenote-trigger, .infocard-trigger, .token-source__trigger {
      cursor: pointer;
      color: inherit;
      text-decoration: underline;
      text-decoration-color: #e04b3f;
      text-underline-offset: 3px;
      font-weight: 500;
    }
    .sidenote-trigger:hover, .infocard-trigger:hover, .token-source__trigger:hover {
      color: #e04b3f;
    }
    .token-source__star {
      color: #e04b3f;
      font-weight: bold;
      margin-left: 1px;
    }
    .sidenote-card, .infocard-card, .token-source__card {
      display: none;
      background: #ffffff;
      border: 1px solid #d4d4cc;
      border-left: 4px solid #e04b3f;
      border-radius: 6px;
      padding: 14px 18px;
      margin: 12px 0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 0.875rem;
      line-height: 1.5;
      color: #2b2b2b;
    }
    .sidenote-card.is-open, .infocard-card.is-open, .token-source__card.is-open {
      display: block !important;
      animation: fadeIn 0.18s ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .source--label {
      font-weight: 600;
      color: #1a1a1a;
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 0.05em;
    }
    .source--link {
      color: #e04b3f;
      font-weight: 500;
      text-decoration: underline;
    }
    .source--note {
      display: block;
      margin-top: 6px;
      color: #555550;
      font-size: 0.8125rem;
    }
    .source-card__close {
      float: right;
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      color: #888;
      padding: 0 4px;
    }
    .source-card__close:hover {
      color: #111;
    }
  </style>
</head>
<body>
  ${content}
  <div id="__frame_sentinel" style="clear:both;display:block;height:1px;width:100%;margin:0;padding:0;border:none;visibility:hidden;pointer-events:none;"></div>
  ${helperScript}
</body>
</html>`;
  }, [content, frameId]);

  const lastSetHeightRef = useRef<number>(0);

  // Height sync listener with strict loop prevention
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (
        e.data &&
        e.data.type === "interactive-article-resize" &&
        e.data.frameId === frameId &&
        typeof e.data.height === "number" &&
        e.data.height > 60
      ) {
        const rawH = Math.round(e.data.height);
        // Only trigger update if change is at least 8px to guarantee zero infinite resize loop
        if (Math.abs(rawH - lastSetHeightRef.current) >= 8) {
          lastSetHeightRef.current = rawH;
          setFrameHeight(rawH + 8);
          setIsLoading(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [frameId]);

  const handleReload = () => {
    setReloadKey((k) => k + 1);
    setIsLoading(true);
  };

  const handleOpenInNewTab = () => {
    const blob = new Blob([compiledHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <>
      <div
        className={`interactive-article-frame-container relative w-full my-6 rounded-2xl border border-border/80 bg-[#f9f9f2] dark:bg-[#121614] shadow-xs overflow-hidden transition-all duration-200 group ${className}`}
      >
        {/* Subtle Interactive Header Ribbon */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border/60 text-xs text-muted-foreground select-none">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/15 text-accent font-semibold text-[11px] border border-accent/25">
              <Sparkles className="w-3 h-3" />
              Interactief artikel
            </span>
            <span className="hidden sm:inline text-muted-foreground text-[11px]">
              Met interactieve datavisualisaties, bronkaarten & kaart
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReload}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              title="Herlaad visualisaties en animaties"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              <span className="hidden md:inline">Herladen</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenInNewTab}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              title="Open volledig artikel in nieuw venster"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              <span className="hidden md:inline">Nieuw tabblad</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              className="h-7 px-2 text-[11px] font-semibold text-accent hover:text-accent hover:bg-accent/10"
              title="Volledig scherm bekijken"
            >
              <Maximize2 className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Volledig scherm</span>
            </Button>
          </div>
        </div>

        {/* Seamless Iframe */}
        <div className="relative w-full overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-xs py-16 text-xs text-muted-foreground animate-pulse">
              <span>Interactieve visualisaties en kaart laden...</span>
            </div>
          )}

          <iframe
            key={reloadKey}
            ref={frameRef}
            srcDoc={compiledHtml}
            title="Interactief artikel"
            scrolling="no"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
            className="w-full border-0 block bg-transparent"
            style={{
              height: `${frameHeight}px`,
              minHeight: "450px",
            }}
            onLoad={() => {
              setTimeout(() => setIsLoading(false), 300);
            }}
          />
        </div>
      </div>

      {/* Fullscreen Overlay Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col p-2 sm:p-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-t-xl text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="font-semibold text-sm">Interactieve Longread — Volledig Scherm</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                className="h-8 text-xs bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Nieuw tabblad
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="h-8 text-xs bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
              >
                <Minimize2 className="w-3.5 h-3.5 mr-1" /> Sluiten
              </Button>
            </div>
          </div>

          <div className="flex-1 w-full bg-[#f9f9f2] rounded-b-xl overflow-hidden shadow-2xl">
            <iframe
              srcDoc={compiledHtml}
              title="Interactief artikel volledig scherm"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
    </>
  );
};
