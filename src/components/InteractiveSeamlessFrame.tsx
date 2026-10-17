import React, { useState, useEffect, useRef, useMemo } from "react";
import { Maximize2, Minimize2, RotateCcw, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InteractiveSeamlessFrameProps {
  content?: string;
  src?: string;
  title?: string;
  caption?: string;
  className?: string;
}

/**
 * Cleans raw LaTeX tokens and accidental duplicate sections in standalone HTML dossiers
 */
function sanitizeDossierHtml(rawHtml: string): string {
  let cleaned = rawHtml;

  // 1. Remove accidental duplicate Section 1 block if present (e.g. in Eesveen dossier where Section 1 was pasted twice with raw LaTeX)
  const duplicateBlockPattern =
    /<p>\s*Het grote misverstand in het maatschappelijke debat over gaswinning[\s\S]*?\$\\text\{M\}_\\text\{L\}\s*=\s*3,0\$[\s\S]*?157 miljoen \$\\text\{Nm\}\^3\$ aardgas herbergt\s*<a[^>]*>\[6\]<\/a>\.\s*<\/p>/i;
  if (duplicateBlockPattern.test(cleaned)) {
    cleaned = cleaned.replace(duplicateBlockPattern, "");
  }

  // 2. Replace raw inline LaTeX tokens with clean HTML formatting
  cleaned = cleaned
    .replace(/\$\\text\{M\}_\\text\{L\}\s*=\s*([0-9,.]+)\$/g, '<span class="math-var">M</span><sub>L</sub> = $1')
    .replace(/\$\\text\{M\}_\\text\{L\}\$/g, '<span class="math-var">M</span><sub>L</sub>')
    .replace(/\$\\text\{Nm\}\^3\$/g, '<span class="math-unit">Nm<sup>3</sup></span>')
    .replace(/\$\\text\{CO\}_2\$/g, '<span class="math-unit">CO<sub>2</sub></span>')
    .replace(/\$\\text\{NO\}_\\text\{x\}\$/g, '<span class="math-unit">NO<sub>x</sub></span>');

  return cleaned;
}

export const InteractiveSeamlessFrame: React.FC<InteractiveSeamlessFrameProps> = ({
  content,
  src,
  title,
  caption,
  className = "",
}) => {
  const [fetchedContent, setFetchedContent] = useState<string>("");
  const [frameHeight, setFrameHeight] = useState<number>(850);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameId = useRef<string>(`article-frame-${Math.random().toString(36).substring(2, 9)}`).current;

  // Load content from src if provided
  useEffect(() => {
    if (content) {
      setFetchedContent(content);
      setIsLoading(false);
      return;
    }
    if (src) {
      let isMounted = true;
      setIsLoading(true);
      const cleanSrc = src.trim();
      const targetUrl =
        cleanSrc.startsWith("/uploads/") && (cleanSrc.endsWith(".html") || cleanSrc.endsWith(".htm"))
          ? `/api/dataproduct/view?file=${encodeURIComponent(cleanSrc)}`
          : cleanSrc;

      fetch(targetUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Fout bij ophalen");
          return res.text();
        })
        .then((html) => {
          if (isMounted) {
            setFetchedContent(html);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          console.error("Fout bij laden interactief HTML-artikel:", err);
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [content, src, reloadKey]);

  const activeContent = content || fetchedContent;

  // Build the complete HTML document with Leaflet, Chart.js, KaTeX, anchor navigation and resize reporter
  const buildDocumentHtml = (standaloneMode: boolean) => {
    if (!activeContent) return "";

    const sanitizedContent = sanitizeDossierHtml(activeContent);
    const isFullDoc = /<!doctype/i.test(sanitizedContent) || /<html/i.test(sanitizedContent);

    const helperScript = `
<script>
(function() {
  var frameId = "${frameId}";
  var isStandalone = ${standaloneMode ? "true" : "false"};
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
      // Add 32px bottom breathing room
      return Math.max(calculated + 32, 150);
    } catch(err) {
      return document.body ? document.body.scrollHeight : 0;
    }
  }

  function sendHeight() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      try {
        var h = getContentHeight();
        if (h > 60 && Math.abs(h - lastSentHeight) >= 6) {
          lastSentHeight = h;
          window.parent.postMessage({
            type: "interactive-article-resize",
            frameId: frameId,
            height: h
          }, "*");
        }
      } catch(err) {}
    }, 35);
  }

  // Hook into custom dossier notifyParentResize if defined
  window.notifyParentResize = sendHeight;

  function fixLinks() {
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var rawHref = a.getAttribute("href") || "";
      if (rawHref.charAt(0) === "#") {
        // Internal anchor link: never open in new tab
        a.removeAttribute("target");
      } else if (/^https?:\\/\\//i.test(rawHref)) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      }
    }
  }

  window.addEventListener("DOMContentLoaded", function() {
    ensureSentinel();
    fixLinks();
    window.notifyParentResize = sendHeight;
    sendHeight();
  });

  window.addEventListener("load", function() {
    ensureSentinel();
    fixLinks();
    window.notifyParentResize = sendHeight;
    sendHeight();
    setTimeout(sendHeight, 150);
    setTimeout(sendHeight, 500);
    setTimeout(sendHeight, 1200);

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

  if (window.MutationObserver && document.body) {
    try {
      var mo = new MutationObserver(function() {
        fixLinks();
        sendHeight();
      });
      mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden", "style", "aria-expanded"] });
    } catch(e) {}
  }

  // Handle clicks on internal #anchor links and source cards
  document.addEventListener("click", function(e) {
    // 1. Handle internal #hash navigation links (e.g. .nav-link, .pub-brand, etc.)
    var anchor = e.target.closest("a[href^='#']");
    if (anchor) {
      var hash = anchor.getAttribute("href");
      var isRefTrigger =
        anchor.classList.contains("ref-tag") ||
        anchor.classList.contains("sidenote-trigger") ||
        anchor.classList.contains("infocard-trigger") ||
        anchor.classList.contains("token-source__trigger") ||
        anchor.hasAttribute("aria-controls") ||
        anchor.getAttribute("data-source-trigger") === "true";

      if (isRefTrigger) {
        // Inline reference tag is handled either by the dossier's own setupInlineRefCards() or by the universal handler below
        setTimeout(sendHeight, 50);
        return;
      }

      if (hash && hash.length > 1) {
        e.preventDefault();
        var targetId = hash.substring(1);
        var targetEl = targetId === "top" ? document.body : (document.getElementById(targetId) || document.querySelector(hash));
        if (targetEl) {
          if (isStandalone) {
            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          } else {
            var rect = targetEl.getBoundingClientRect();
            window.parent.postMessage({
              type: "interactive-article-scroll-to",
              frameId: frameId,
              targetTop: rect.top
            }, "*");
          }
        }
        return;
      }
    }

    // 2. Universal click handler for De Correspondent source cards & sidenotes (when not managed by custom script)
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
      return;
    }

    // Any other interactive click (tabs, geo-layers, factchecks, accordions)
    setTimeout(sendHeight, 60);
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

    // Styles injected into embedded mode to prevent duplicate H1 title and ensure clean responsive fit
    const embeddedOverrideStyle = `
<style>
  html, body {
    height: auto !important;
    min-height: 0 !important;
    overflow-x: hidden;
  }
  .sidenote-card[hidden] {
    display: none !important;
  }
  ${
    !standaloneMode
      ? `
  /* Hide duplicate H1 title when already displayed by parent NieuwsDetail page */
  header.article-header {
    padding-top: 1.5rem !important;
  }
  header.article-header h1.article-title {
    display: none !important;
  }
  /* Allow sticky topbar inside non-scrolling iframe to move smoothly with parent scroll */
  .pub-topbar {
    position: relative !important;
    top: 0 !important;
    z-index: 1000 !important;
    will-change: transform;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  }
  `
      : ""
  }
</style>`;

    if (isFullDoc) {
      let doc = sanitizedContent;

      // Inject override styles into <head>
      doc = doc.replace(/<head[^>]*>/i, `$&${embeddedOverrideStyle}`);

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
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
  ${embeddedOverrideStyle}
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
  ${sanitizedContent}
  <div id="__frame_sentinel" style="clear:both;display:block;height:1px;width:100%;margin:0;padding:0;border:none;visibility:hidden;pointer-events:none;"></div>
  ${helperScript}
</body>
</html>`;
  };

  const compiledHtml = useMemo(() => buildDocumentHtml(false), [activeContent, frameId]);
  const standaloneHtml = useMemo(() => buildDocumentHtml(true), [activeContent, frameId]);

  const lastSetHeightRef = useRef<number>(0);

  // Height sync & smooth anchor scroll listener
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || e.data.frameId !== frameId) return;

      if (
        e.data.type === "interactive-article-resize" &&
        typeof e.data.height === "number" &&
        e.data.height > 60
      ) {
        const rawH = Math.round(e.data.height);
        if (Math.abs(rawH - lastSetHeightRef.current) >= 6) {
          lastSetHeightRef.current = rawH;
          setFrameHeight(rawH);
          setIsLoading(false);
        }
      } else if (
        e.data.type === "interactive-article-scroll-to" &&
        typeof e.data.targetTop === "number" &&
        frameRef.current
      ) {
        const frameRect = frameRef.current.getBoundingClientRect();
        const absoluteTargetY = window.scrollY + frameRect.top + e.data.targetTop - 135;
        window.scrollTo({
          top: Math.max(0, absoluteTargetY),
          behavior: "smooth",
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [frameId]);

  // Synchronize parent window scroll with iframe's sticky .pub-topbar and #scrollProgress bar
  useEffect(() => {
    const syncParentScrollToIframe = () => {
      const iframe = frameRef.current;
      if (!iframe) return;
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        const rect = iframe.getBoundingClientRect();
        const viewportH = window.innerHeight;
        const siteHeaderOffset = 72; // Height of main sticky site header

        // 1. Update #scrollProgress bar inside the dossier
        const progressEl = doc.getElementById("scrollProgress");
        if (progressEl) {
          const totalScrollable = Math.max(1, rect.height - viewportH * 0.6);
          const scrolledAmount = siteHeaderOffset - rect.top;
          const pct = Math.min(100, Math.max(0, (scrolledAmount / totalScrollable) * 100));
          progressEl.style.width = `${pct}%`;
        }

        // 2. Keep .pub-topbar sticky at the top of the viewport while scrolling through the dossier
        const topbar = doc.querySelector(".pub-topbar") as HTMLElement | null;
        if (topbar) {
          const topbarH = topbar.offsetHeight || 56;
          if (rect.top < siteHeaderOffset && rect.bottom > siteHeaderOffset + topbarH + 120) {
            const translateY = Math.min(rect.height - topbarH - 40, siteHeaderOffset - rect.top);
            topbar.style.transform = `translateY(${Math.max(0, translateY)}px)`;
          } else {
            topbar.style.transform = "translateY(0px)";
          }
        }

        // 3. Highlight active chapter link in .pub-topbar
        const navLinks = doc.querySelectorAll(".nav-links .nav-link[href^='#']");
        if (navLinks.length > 0) {
          let activeHash = "";
          navLinks.forEach((link) => {
            const hash = link.getAttribute("href");
            if (hash && hash.length > 1) {
              const sec = doc.querySelector(hash);
              if (sec) {
                const secRect = sec.getBoundingClientRect();
                // secRect.top is relative to the iframe top; actual viewport Y is rect.top + secRect.top
                if (rect.top + secRect.top <= siteHeaderOffset + 180) {
                  activeHash = hash;
                }
              }
            }
          });
          navLinks.forEach((link) => {
            const isMatch = activeHash && link.getAttribute("href") === activeHash;
            link.classList.toggle("active", Boolean(isMatch));
          });
        }
      } catch {
        // Ignore cross-origin if any
      }
    };

    window.addEventListener("scroll", syncParentScrollToIframe, { passive: true });
    window.addEventListener("resize", syncParentScrollToIframe, { passive: true });
    return () => {
      window.removeEventListener("scroll", syncParentScrollToIframe);
      window.removeEventListener("resize", syncParentScrollToIframe);
    };
  }, []);

  const handleReload = () => {
    lastSetHeightRef.current = 0;
    setReloadKey((k) => k + 1);
    setIsLoading(true);
  };

  const handleOpenInNewTab = () => {
    const blob = new Blob([standaloneHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  // Keep badge concise so long article titles don't wrap across 3 lines in the toolbar
  const badgeLabel =
    title && title.length <= 42 ? title : "Interactief Onderzoeksdossier";

  return (
    <>
      <div
        className={`interactive-article-frame-container relative w-full my-6 rounded-2xl border border-border/80 bg-[#f9f9f2] dark:bg-[#121614] shadow-xs overflow-hidden transition-all duration-200 group ${className}`}
      >
        {/* Subtle Interactive Header Ribbon */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border/60 text-xs text-muted-foreground select-none gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/15 text-accent font-semibold text-[11px] border border-accent/25 shrink-0">
              <Sparkles className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[220px] sm:max-w-[320px]">{badgeLabel}</span>
            </span>
            <span className="hidden md:inline text-muted-foreground text-[11px] truncate">
              {caption || "Met interactieve datavisualisaties, bronkaarten & verdieping"}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReload}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              title="Herlaad visualisaties en animaties"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Herladen</span>
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
              <span className="hidden sm:inline">Nieuw tabblad</span>
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
              <span>Interactieve visualisaties en dossier laden...</span>
            </div>
          )}

          <iframe
            key={reloadKey}
            ref={frameRef}
            srcDoc={compiledHtml}
            title={title || "Interactief artikel"}
            scrolling="no"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
            className="w-full border-0 block bg-transparent"
            style={{
              height: `${frameHeight}px`,
              minHeight: "450px",
            }}
            onLoad={() => {
              setTimeout(() => setIsLoading(false), 250);
            }}
          />
        </div>
      </div>

      {/* Fullscreen Overlay Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col p-2 sm:p-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-t-xl text-white">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-accent shrink-0" />
              <span className="font-semibold text-sm truncate">
                {title || "Interactieve Longread"} — Volledig Scherm
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
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
              srcDoc={standaloneHtml}
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
