import katex from "katex";
import DOMPurify from "dompurify";

/**
 * Standardizes Dutch decimal notation in math if needed, e.g., "0,05" inside math
 * KaTeX parses commas as list separators by default unless wrapped or formatted.
 * In European / Dutch texts, comma is the decimal separator (e.g. 0,05 m).
 * In KaTeX, "{0{,}05}" or regular "0{,}05" ensures no unwanted spacing around the comma.
 */
function normalizeDutchDecimals(math: string): string {
  // Replace comma surrounded by digits (e.g. 0,05 -> 0{,}05 or 107,4 -> 107{,}4)
  return math.replace(/(\d+),(\d+)/g, "$1{,}$2");
}

/**
 * Renders mathematical LaTeX expressions in HTML or plain text using KaTeX.
 * Supports:
 * - Block formulas: $$...$$ and \[...\]
 * - Inline formulas: $...$ and \(...\)
 *
 * It uses a token replacement strategy:
 * 1. Extract formulas and replace with alphanumeric placeholders
 * 2. Sanitize surrounding HTML safely via DOMPurify without swallowing `<` in math
 * 3. Replace placeholders with pristine KaTeX rendered markup
 */
export function renderMathInHtml(rawContent: string): string {
  if (!rawContent || typeof rawContent !== "string") {
    return "";
  }

  let text = rawContent;

  // If text is purely plain text without any HTML block tags, convert newlines to paragraphs
  const hasHtmlTags = /<\s*(?:p|div|h[1-6]|ul|ol|table|blockquote|figure|article|section)[^>]*>/i.test(text);
  if (!hasHtmlTags) {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p class="mb-4 leading-relaxed">${p.replace(/\n/g, "<br/>")}</p>`)
      .join("\n\n");
    text = paragraphs || text;
  }

  const tokens: { id: string; html: string }[] = [];
  let tokenCounter = 0;

  // 1. Detect block formulas: $$...$$ or \[...\]
  text = text.replace(/\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]/g, (match, p1, p2) => {
    const math = (p1 !== undefined ? p1 : p2 || "").trim();
    if (!math) return "";
    try {
      const normalized = normalizeDutchDecimals(math);
      const rendered = katex.renderToString(normalized, {
        displayMode: true,
        throwOnError: false,
        strict: false,
      });
      const id = `___KATEX_BLOCK_${tokenCounter++}___`;
      tokens.push({
        id,
        html: `<div class="katex-block-wrapper my-6 overflow-x-auto overflow-y-hidden py-2 px-3 rounded-xl bg-muted/20 border border-border/60 text-center">${rendered}</div>`,
      });
      return id;
    } catch {
      return match;
    }
  });

  // 2. Detect inline formulas: $...$ or \(...\)
  // Inline formulas should not span multiple lines or be purely currency (e.g. $100 or $ 25)
  text = text.replace(/\$((?:\\\$|[^$\n])+?)\$|\\\(([\s\S]*?)\\\)/g, (match, p1, p2) => {
    const math = (p1 !== undefined ? p1 : p2 || "").trim();
    if (!math) return match;

    // Skip plain currency like $50, $ 100, $25.00
    if (/^\s*\d+(?:[.,]\d+)?\s*(?:euro|dollar|usd|eur)?\s*$/i.test(math)) {
      return match;
    }

    try {
      const normalized = normalizeDutchDecimals(math);
      const rendered = katex.renderToString(normalized, {
        displayMode: false,
        throwOnError: false,
        strict: false,
      });
      const id = `___KATEX_INLINE_${tokenCounter++}___`;
      tokens.push({
        id,
        html: `<span class="katex-inline-wrapper px-0.5 inline-block align-baseline">${rendered}</span>`,
      });
      return id;
    } catch {
      return match;
    }
  });

  // 3. Sanitize HTML via DOMPurify
  const sanitized = DOMPurify.sanitize(text, {
    ADD_TAGS: [
      "iframe",
      "figure",
      "figcaption",
      "video",
      "source",
      "math",
      "mrow",
      "mi",
      "mn",
      "mo",
      "msup",
      "msub",
      "msubsup",
      "mfrac",
      "mover",
      "munder",
      "munderover",
      "mspace",
      "msqrt",
      "annotation",
      "semantics",
      "details",
      "summary",
      "button",
      "sup",
      "sub",
      "small",
      "svg",
      "path",
      "use",
    ],
    ADD_ATTR: [
      "target",
      "rel",
      "data-dataproduct",
      "data-src",
      "data-title",
      "data-caption",
      "data-height",
      "data-hover",
      "data-autoresize",
      "data-type",
      "data-image-size",
      "data-align",
      "xmlns",
      "display",
      "displaystyle",
      "mathvariant",
      "columnalign",
      "rowspacing",
      "playsinline",
      "preload",
      "controls",
      "autoplay",
      "muted",
      "aria-expanded",
      "aria-controls",
      "aria-live",
      "aria-hidden",
      "role",
      "tabindex",
      "hidden",
      "data-source-id",
      "data-source-title",
      "data-source-url",
      "data-source-note",
      "data-source-type",
      "data-source-trigger",
      "data-link-type",
      "viewBox",
      "fill",
      "stroke",
      "stroke-width",
      "stroke-linecap",
      "stroke-linejoin",
      "d",
      "xlink:href",
    ],
  });

  // 4. Restore tokens with KaTeX rendered HTML
  let finalHtml = sanitized;
  for (const token of tokens) {
    finalHtml = finalHtml.split(token.id).join(token.html);
  }

  return finalHtml;
}

/**
 * Converts mathematical formulas into natural Dutch spoken text for screen readers and accessibility TTS.
 * E.g., "$z_0 = 0,05\text{ m}$" -> "z nul is 0,05 meter"
 */
export function mathToSpeechText(text: string): string {
  if (!text) return "";

  let spoken = text;

  // Replace common formulas in wind turbine / scientific context
  spoken = spoken
    .replace(/\$z_0\s*=\s*0,05\\text\{\s*m\s*\}\$/gi, "z nul is 0,05 meter")
    .replace(/\$z_0\s*=\s*0,25\\text\{\s*tot\s*\}0,40\\text\{\s*m\s*\}\$/gi, "z nul is 0,25 tot 0,40 meter")
    .replace(/\$210\^\\circ\s*-\s*250\^\\circ\$/gi, "210 tot 250 graden")
    .replace(/\$<\s*0,01\^\\circ\$/gi, "kleiner dan 0,01 graden")
    .replace(/\$3\^\\circ\$/gi, "3 graden")
    .replace(/\$0,533\^\\circ\$/gi, "0,533 graden")
    .replace(/\$107,4\s*\\times\$/gi, "107,4 maal")
    .replace(/\$b_\{?\\text\{max\}\}?\$/gi, "b maximaal")
    .replace(/\$12\s*\\times\s*\\text\{rotordiameter\}\$/gi, "12 maal rotordiameter")
    .replace(/\$12D\$/gi, "12 D")
    .replace(/\$z_0\$/gi, "z nul")
    .replace(/\$P\s*=\s*\\frac\{1\}\{2\}\s*\\rho\s*A\s*v\^3\s*C_p\$/gi, "P is een half rho A v tot de derde C p");

  // Generic math cleaning for any remaining $...$ or $$...$$
  spoken = spoken.replace(/\$\$?([\s\S]*?)\$\$?/g, (_, math) => {
    const m = math
      .replace(/\\text\{([^}]+)\}/g, "$1")
      .replace(/\^\\circ/g, " graden")
      .replace(/\\times/g, " maal ")
      .replace(/\\cdot/g, " maal ")
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 gedeeld door $2")
      .replace(/\\sqrt\{([^}]+)\}/g, "wortel uit $1")
      .replace(/\\le/g, " kleiner dan of gelijk aan ")
      .replace(/\\ge/g, " groter dan of gelijk aan ")
      .replace(/</g, " kleiner dan ")
      .replace(/>/g, " groter dan ")
      .replace(/=/g, " is ")
      .replace(/_/g, " subscript ")
      .replace(/\^2/g, " kwadraat")
      .replace(/\^3/g, " tot de derde")
      .replace(/\\alpha/g, "alfa")
      .replace(/\\beta/g, "bèta")
      .replace(/\\lambda/g, "lambda")
      .replace(/\\rho/g, "rho")
      .replace(/\\Delta/g, "delta")
      .replace(/\\pi/g, "pi")
      .replace(/\\Omega/g, "omega");
    return ` ${m.trim()} `;
  });

  return spoken;
}

export { FormattedMathText } from "@/components/FormattedMathText";
