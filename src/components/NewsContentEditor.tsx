import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Minus,
  FileCode,
  Eye,
  Code,
  Type,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Image as ImageIcon,
  Map,
  BarChart3,
  Upload,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  X,
  PlusCircle,
  Layers,
  Table as TableIcon,
  Video,
  Calculator,
  Sigma,
  Superscript,
  Subscript,
  FileText,
  BookOpen,
  Asterisk,
  ExternalLink,
} from "lucide-react";
import katex from "katex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { InteractiveArticleRenderer } from "@/components/InteractiveArticleRenderer";

interface NewsContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const NewsContentEditor: React.FC<NewsContentEditorProps> = ({
  value,
  onChange,
  required = false,
}) => {
  const { token: authContextToken } = useAuth();
  const [activeView, setActiveView] = useState<"visual" | "code" | "preview">("visual");
  const [htmlFileName, setHtmlFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Modal Dialog states
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [showDataProductModal, setShowDataProductModal] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Image insertion form state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageCaption, setImageCaption] = useState<string>("");
  const [imageAlt, setImageAlt] = useState<string>("");
  const [imageSize, setImageSize] = useState<string>("75"); // 25, 33, 50, 75, 100, or custom
  const [imageAlign, setImageAlign] = useState<"center" | "left" | "right">("center");

  // Data Product insertion form state
  const [dpFile, setDpFile] = useState<File | null>(null);
  const [dpUrl, setDpUrl] = useState<string>("");
  const [dpTitle, setDpTitle] = useState<string>("");
  const [dpCaption, setDpCaption] = useState<string>("");
  const [dpHeight, setDpHeight] = useState<string>("520");
  const [dpType, setDpType] = useState<"map" | "chart" | "data">("map");
  const [dpHoverActivate, setDpHoverActivate] = useState<boolean>(true);
  const [dpAutoResize, setDpAutoResize] = useState<boolean>(true);

  // Video insertion form state
  const [showVideoModal, setShowVideoModal] = useState<boolean>(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoCaption, setVideoCaption] = useState<string>("");
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [videoControls, setVideoControls] = useState<boolean>(true);
  const [videoAutoplay, setVideoAutoplay] = useState<boolean>(false);

  // Math & Formula insertion form state
  const [showMathModal, setShowMathModal] = useState<boolean>(false);
  const [mathInput, setMathInput] = useState<string>("z_0 = 0,05\\text{ m}");
  const [mathIsBlock, setMathIsBlock] = useState<boolean>(false);
  const [showPdfImportModal, setShowPdfImportModal] = useState<boolean>(false);
  const [pdfPasteText, setPdfPasteText] = useState<string>("");

  // Interactive Source & Footnote insertion form state (De Correspondent style)
  const [showSourceModal, setShowSourceModal] = useState<boolean>(false);
  const [sourceSelectedText, setSourceSelectedText] = useState<string>("");
  const [sourceTitle, setSourceTitle] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [sourceNote, setSourceNote] = useState<string>("");
  const [sourceVariant, setSourceVariant] = useState<"asterisk" | "infocard" | "sidenote">("asterisk");
  const [previewCardOpen, setPreviewCardOpen] = useState<boolean>(true);

  // Helper: insert HTML snippet at exact cursor position in textarea, with optional focus position
  const insertAtCursor = (htmlToInsert: string, moveCursorOffset?: number) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + htmlToInsert);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;

    const newValue = value.substring(0, start) + htmlToInsert + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const targetPos = moveCursorOffset !== undefined ? start + moveCursorOffset : start + htmlToInsert.length;
      textarea.setSelectionRange(targetPos, targetPos);
    }, 20);
  };

  // Helper to wrap or insert HTML tags around selected text in textarea
  const insertHtmlTag = (openTag: string, closeTag: string, placeholder = "tekst") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || placeholder;

    const replacement = `${openTag}${selectedText}${closeTag}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + openTag.length,
        start + openTag.length + selectedText.length
      );
    }, 10);
  };

  // Insert a custom link with URL prompt
  const insertLink = () => {
    const url = prompt("Voer de link-URL in (bijv. https://www.voorbeeld.nl):", "https://");
    if (!url) return;

    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selectedText = value.substring(start, end) || "Klik hier";

    const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-accent underline font-medium hover:text-accent/80">${selectedText}</a>`;
    const newValue = value.substring(0, start) + linkHtml + value.substring(end);
    onChange(newValue);
  };

  // Insert an emphasized callout card
  const insertCallout = () => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selectedText = value.substring(start, end) || "Belangrijke mededeling of speerpunt...";

    const calloutHtml = `\n<div class="my-5 p-4 rounded-lg bg-accent/10 border border-accent/30 text-foreground">\n  <strong class="text-accent font-semibold block mb-1">Let op / Toelichting</strong>\n  <p class="m-0">${selectedText}</p>\n</div>\n`;
    const newValue = value.substring(0, start) + calloutHtml + value.substring(end);
    onChange(newValue);
  };

  // Insert an empty paragraph before or after current cursor
  const insertEmptyParagraph = (position: "before" | "after") => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const pTag = `<p class="mb-4 leading-relaxed">Typ hier verder...</p>\n\n`;

    if (position === "before") {
      const newValue = value.substring(0, start) + pTag + value.substring(start);
      onChange(newValue);
      setTimeout(() => {
        textarea?.focus();
        textarea?.setSelectionRange(start + 32, start + 50);
      }, 20);
    } else {
      const end = textarea?.selectionEnd ?? value.length;
      const newValue = value.substring(0, end) + `\n\n` + pTag + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea?.focus();
        textarea?.setSelectionRange(end + 2 + 32, end + 2 + 50);
      }, 20);
    }
  };

  // Insert standard responsive data table
  const insertDataTable = () => {
    const tableHtml = `\n<div class="my-6 overflow-x-auto rounded-lg border border-border">\n  <table class="w-full text-left text-sm">\n    <thead class="bg-secondary/60 text-xs font-semibold uppercase text-muted-foreground border-b border-border">\n      <tr>\n        <th class="px-4 py-2.5">Wijk / Kern</th>\n        <th class="px-4 py-2.5">Onderwerp / Indicator</th>\n        <th class="px-4 py-2.5">Resultaat / Aantal</th>\n      </tr>\n    </thead>\n    <tbody class="divide-y divide-border/60">\n      <tr class="hover:bg-muted/30">\n        <td class="px-4 py-2.5 font-medium text-foreground">Steenwijk West</td>\n        <td class="px-4 py-2.5 text-muted-foreground">Woningzoekenden</td>\n        <td class="px-4 py-2.5 font-semibold text-accent">142</td>\n      </tr>\n      <tr class="hover:bg-muted/30">\n        <td class="px-4 py-2.5 font-medium text-foreground">Oldemarkt</td>\n        <td class="px-4 py-2.5 text-muted-foreground">Woningzoekenden</td>\n        <td class="px-4 py-2.5 font-semibold text-accent">58</td>\n      </tr>\n      <tr class="hover:bg-muted/30">\n        <td class="px-4 py-2.5 font-medium text-foreground">Vollenhove</td>\n        <td class="px-4 py-2.5 text-muted-foreground">Woningzoekenden</td>\n        <td class="px-4 py-2.5 font-semibold text-accent">89</td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n<p class="mb-4 leading-relaxed"></p>\n`;
    insertAtCursor(tableHtml);
    toast.success("Gegevens-tabel ingevoegd!");
  };

  // Insert math formula with dollar delimiters
  const handleInsertMath = () => {
    const trimmed = mathInput.trim();
    if (!trimmed) {
      toast.error("Voer een wiskundige formule in");
      return;
    }
    const snippet = mathIsBlock ? `\n\n$$${trimmed}$$\n\n` : `$${trimmed}$`;
    insertAtCursor(snippet);
    setShowMathModal(false);
    toast.success("Wiskundige formule ingevoegd!");
  };

  const insertInlineMathQuick = () => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.substring(start, end) || "z_0 = 0,05\\text{ m}";
    insertAtCursor(`$${selected}$`);
  };

  const insertBlockMathQuick = () => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.substring(start, end) || "P = \\frac{1}{2} \\rho A v^3 C_p";
    insertAtCursor(`\n\n$$${selected}$$\n\n`);
  };

  // Convert pasted PDF or research paper text into clean LaTeX math and HTML paragraphs
  const handleProcessPdfText = () => {
    if (!pdfPasteText.trim()) {
      toast.error("Plak eerst de tekst uit de PDF of het document.");
      return;
    }

    let processed = pdfPasteText;

    // Convert raw degree symbols or parameters copied from scientific PDFs into proper LaTeX math notation
    processed = processed
      .replace(/\(z0\s*=\s*0,05\s*m\)/gi, "($z_0 = 0,05\\text{ m}$)")
      .replace(/\(z_0\s*=\s*0,05\s*m\)/gi, "($z_0 = 0,05\\text{ m}$)")
      .replace(/\(z0\s*=\s*0,25\s*tot\s*0,40\s*m\)/gi, "($z_0 = 0,25\\text{ tot }0,40\\text{ m}$)")
      .replace(/\(z_0\s*=\s*0,25\s*tot\s*0,40\s*m\)/gi, "($z_0 = 0,25\\text{ tot }0,40\\text{ m}$)")
      .replace(/\(210°?\s*-\s*250°?\)/gi, "($210^\\circ - 250^\\circ$)")
      .replace(/<\s*0,01°?/gi, "$< 0,01^\\circ$")
      .replace(/onder\s+de\s+3°?\s+buiten/gi, "onder de $3^\\circ$ buiten")
      .replace(/circa\s+0,533°?\./gi, "circa $0,533^\\circ$.")
      .replace(/circa\s+107,4\s*[x×]\s*de/gi, "circa $107,4 \\times$ de")
      .replace(/\(b_?max\)/gi, "($b_{\\text{max}}$)")
      .replace(/12\s*[x×]\s*rotordiameter/gi, "$12 \\times \\text{rotordiameter}$")
      .replace(/\(12D\)/gi, "($12D$)");

    // Convert newlines into clean <p> tags
    const paragraphs = processed
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p class="mb-4 leading-relaxed">${p.replace(/\n/g, "<br/>")}</p>`)
      .join("\n\n");

    if (value && value.trim()) {
      onChange(value + "\n\n" + paragraphs);
    } else {
      onChange(paragraphs);
    }

    setShowPdfImportModal(false);
    setPdfPasteText("");
    toast.success("Wetenschappelijke tekst met wiskundige formules succesvol ingevoegd!");
  };

  // Open the source / footnote insertion modal, capturing selected text from textarea if available
  const handleOpenSourceModal = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.substring(start, end).trim();
      setSourceSelectedText(selected || "");
    } else {
      setSourceSelectedText("");
    }
    setPreviewCardOpen(true);
    setShowSourceModal(true);
  };

  // Insert the interactive source token and expandable footnote card
  const handleInsertSource = () => {
    const textToAnnotate = sourceSelectedText.trim();
    if (!textToAnnotate) {
      toast.error("Geef a.u.b. het zinsdeel of woord op dat u wilt voorzien van een bronvermelding.");
      return;
    }

    const title = sourceTitle.trim();
    const url = sourceUrl.trim();
    const note = sourceNote.trim();

    if (!title && !url) {
      toast.error("Geef a.u.b. minimaal een brontitel of bron-URL op.");
      return;
    }

    const uniqueId = `src-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const effectiveTitle = title || url;

    let snippet = "";

    if (sourceVariant === "asterisk") {
      // De Correspondent style: Text with asterisk (*) that expands an inline source card
      snippet = `<span class="token-source__wrapper" data-source-id="${uniqueId}"><a class="token-source__trigger" role="button" tabindex="0" aria-expanded="false" aria-controls="${uniqueId}-card">${textToAnnotate}<sup aria-hidden="true" class="token-source__star">*</sup></a><div class="token-source__card" aria-live="polite" id="${uniqueId}-card" hidden><small><span class="source--label">Bron: </span>${
        url
          ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="source--link">${effectiveTitle} <svg class="w-3.5 h-3.5 inline ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`
          : `<span class="source--title font-medium">${effectiveTitle}</span>`
      }${note ? `<span class="source--note">${note}</span>` : ""}</small></div></span>`;
    } else if (sourceVariant === "infocard") {
      // Infocard style with dropdown arrow
      snippet = `<span class="token-source__wrapper" data-source-id="${uniqueId}"><a class="infocard-trigger" role="button" tabindex="0" aria-expanded="false" aria-controls="${uniqueId}-card">${textToAnnotate} <span class="text-xs text-accent">▼</span></a><div class="infocard-card" aria-live="polite" id="${uniqueId}-card" hidden><small><span class="source--label">Toelichting: </span><span class="source--title font-medium">${effectiveTitle}</span>${
        url
          ? `<div class="mt-1"><a href="${url}" target="_blank" rel="noopener noreferrer" class="source--link">Bekijk bron ↗</a></div>`
          : ""
      }${note ? `<span class="source--note">${note}</span>` : ""}</small></div></span>`;
    } else {
      // Sidenote style with external link arrow
      snippet = `<span class="token-source__wrapper" data-source-id="${uniqueId}"><a class="sidenote-trigger" role="button" tabindex="0" aria-expanded="false" aria-controls="${uniqueId}-card"><em>${textToAnnotate}</em> <span class="text-xs text-accent">↗</span></a><div class="sidenote-card" aria-live="polite" id="${uniqueId}-card" hidden><small><span class="source--label">Referentie: </span>${
        url
          ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="source--link">${effectiveTitle} ↗</a>`
          : `<span class="source--title font-medium">${effectiveTitle}</span>`
      }${note ? `<span class="source--note">${note}</span>` : ""}</small></div></span>`;
    }

    const textarea = textareaRef.current;
    if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + snippet + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + snippet.length, start + snippet.length);
      }, 20);
    } else {
      insertAtCursor(snippet);
    }

    setShowSourceModal(false);
    toast.success("Interactieve bronvermelding (*) succesvol toegevoegd!");
  };

  // Handle uploading and inserting an image with responsive sizing and alignment
  const handleInsertImage = async () => {
    let finalUrl = imageUrl.trim();

    if (imageFile) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("image", imageFile);

      try {
        const token = authContextToken || localStorage.getItem("auth_token") || localStorage.getItem("token") || "";
        const res = await fetch("/api/admin/news/upload-image", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.url) {
          throw new Error(data.error || "Uploaden van afbeelding mislukt");
        }
        finalUrl = data.url;
        toast.success("Afbeelding succesvol geüpload naar server!");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Fout bij uploaden afbeelding";
        toast.error(message);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    if (!finalUrl) {
      toast.error("Kies een afbeeldingsbestand of vul een afbeeldings-URL in.");
      return;
    }

    // Determine sizing CSS classes
    let sizeClass = "w-full max-w-full";
    let containerClass = "my-6";

    if (imageSize === "25") {
      sizeClass = "w-full max-w-[25%]";
    } else if (imageSize === "33") {
      sizeClass = "w-full max-w-[33%]";
    } else if (imageSize === "50") {
      sizeClass = "w-full max-w-[50%]";
    } else if (imageSize === "75") {
      sizeClass = "w-full max-w-[75%]";
    } else if (imageSize === "100") {
      sizeClass = "w-full max-w-full";
    } else if (imageSize.includes("px") || !isNaN(Number(imageSize))) {
      const px = imageSize.endsWith("px") ? imageSize : `${imageSize}px`;
      sizeClass = `w-full max-w-[${px}]`;
    }

    // Alignment classes
    if (imageAlign === "left") {
      containerClass = `my-4 mr-6 float-left ${sizeClass}`;
    } else if (imageAlign === "right") {
      containerClass = `my-4 ml-6 float-right ${sizeClass}`;
    } else {
      containerClass = `my-6 mx-auto ${sizeClass} text-center clear-both`;
    }

    const captionTag = imageCaption.trim()
      ? `\n  <figcaption class="text-xs text-muted-foreground mt-2 italic font-normal text-center">${imageCaption.trim()}</figcaption>`
      : "";

    // Insert image WITH an explicit paragraph before AND after, so user can easily continue typing!
    const figureSnippet = `\n<p class="mb-4 leading-relaxed"></p>\n<figure class="${containerClass}" data-image-size="${imageSize}" data-align="${imageAlign}">\n  <img src="${finalUrl}" alt="${imageAlt || imageCaption || "Afbeelding"}" class="w-full h-auto rounded-xl shadow-xs border border-border/80 object-cover" loading="lazy" />${captionTag}\n</figure>\n<p class="mb-4 leading-relaxed"></p>\n`;

    // Position cursor in the empty paragraph directly AFTER the figure
    insertAtCursor(figureSnippet);

    setShowImageModal(false);
    setImageFile(null);
    setImageUrl("");
    setImageCaption("");
    setImageAlt("");
    toast.success("Afbeelding ingevoegd! U kunt direct voor en na de afbeelding blijven typen.");
  };

  // Handle uploading and inserting an interactive .html Data Product / Map
  const handleInsertDataProduct = async () => {
    let finalSrc = dpUrl.trim();

    if (dpFile) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", dpFile);

      try {
        const token = authContextToken || localStorage.getItem("auth_token") || localStorage.getItem("token") || "";
        const res = await fetch("/api/admin/news/upload-dataproduct", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.url) {
          throw new Error(data.error || "Uploaden van .html bestand mislukt");
        }
        finalSrc = data.url;
        toast.success("Interactief .html dataproduct succesvol geüpload!");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Fout bij uploaden .html bestand";
        toast.error(message);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    if (!finalSrc) {
      toast.error("Kies een .html bestand of vul de URL/pad in.");
      return;
    }

    const title = dpTitle.trim() || (dpType === "map" ? "Interactieve Kaart Steenwijkerland" : "Interactief Dataproduct");
    const caption = dpCaption.trim() || "Gegenereerd met Python (Pandas/Folium) o.b.v. gemeentelijke data";
    const height = dpHeight.trim() || "520";
    const hoverAttr = dpHoverActivate ? "true" : "false";
    const autoResizeAttr = dpAutoResize ? "true" : "false";

    // Build the structured HTML container with paragraph before and after
    const dpSnippet = `\n<p class="mb-4 leading-relaxed"></p>\n<div class="data-product-container my-8" data-dataproduct="true" data-src="${finalSrc}" data-title="${title}" data-caption="${caption}" data-height="${height}px" data-hover="${hoverAttr}" data-autoresize="${autoResizeAttr}" data-type="${dpType}">\n  <!-- Interactief dataproduct placeholder (geoptimaliseerd voor Core Web Vitals en SEO) -->\n  <div class="p-5 border border-border/80 rounded-xl bg-card text-center my-4">\n    <h4 class="font-display font-semibold text-foreground text-base">${title}</h4>\n    <p class="text-xs text-muted-foreground mt-1">${caption}</p>\n    <p class="text-xs text-accent mt-2 font-medium">Beweeg muis over dit vlak om interactieve weergave direct te laden</p>\n  </div>\n</div>\n<p class="mb-4 leading-relaxed"></p>\n`;

    insertAtCursor(dpSnippet);

    setShowDataProductModal(false);
    setDpFile(null);
    setDpUrl("");
    setDpTitle("");
    setDpCaption("");
    toast.success("Dataproduct ingevoegd! Het activeert automatisch bij hover voor snelle laadtijd.");
  };

  // Handle uploading and inserting an MP4 video into the news content
  const handleInsertVideo = async () => {
    let finalUrl = videoUrl.trim();

    if (videoFile) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("video", videoFile);

      try {
        const token = authContextToken || localStorage.getItem("auth_token") || localStorage.getItem("token") || "";
        const res = await fetch("/api/admin/news/upload-video", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.url) {
          throw new Error(data.error || "Uploaden van videobestand mislukt");
        }
        finalUrl = data.url;
        toast.success("MP4 Videobestand succesvol geüpload!");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Fout bij uploaden video";
        toast.error(message);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    if (!finalUrl) {
      toast.error("Kies een videobestand (.mp4) of vul een video-URL in.");
      return;
    }

    const captionText = videoCaption.trim();
    const captionHtml = captionText
      ? `<figcaption class="p-3 text-xs text-muted-foreground text-center italic bg-muted/40 border-t border-border/60">${captionText}</figcaption>`
      : "";

    const titleAttr = videoTitle.trim() ? `title="${videoTitle.trim().replace(/"/g, '&quot;')}"` : "";

    const videoHtml = `\n<figure class="my-6 rounded-2xl overflow-hidden border border-border/80 shadow-md bg-black/5 dark:bg-black/40">
  <video ${videoControls ? "controls" : ""} playsinline preload="metadata" ${videoAutoplay ? "autoplay muted" : ""} ${titleAttr} class="w-full max-h-[520px] rounded-xl object-contain bg-black">
    <source src="${finalUrl}" type="video/mp4" />
    Uw browser ondersteunt de HTML5 videospeler niet.
  </video>
  ${captionHtml}
</figure>\n<p class="mb-4 leading-relaxed"></p>\n`;

    insertAtCursor(videoHtml);
    setShowVideoModal(false);
    setVideoFile(null);
    setVideoUrl("");
    setVideoCaption("");
    setVideoTitle("");
    toast.success("MP4 Video succesvol ingevoegd in artikel!");
  };

  // Handle importing a .html file directly into the content (either as text or dataproduct prompt)
  const handleHtmlFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".html") && !file.name.toLowerCase().endsWith(".htm")) {
      toast.error("Selecteer een geldig .html of .htm bestand");
      return;
    }

    setHtmlFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const fullHtml = event.target?.result as string;
      if (!fullHtml) return;

      // Detect if this is an interactive Python Folium map or Plotly chart / HTML dataproduct
      const isInteractive =
        fullHtml.includes("leaflet") ||
        fullHtml.includes("folium") ||
        fullHtml.includes("plotly") ||
        fullHtml.includes("bokeh") ||
        fullHtml.includes("d3") ||
        fullHtml.includes("<script");

      if (isInteractive) {
        // Automatically open the Data Product Modal pre-filled!
        setDpFile(file);
        setDpTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
        setDpCaption("Gegenereerd onderzoek o.b.v. Python/Pandas data");
        setShowDataProductModal(true);
        toast.info(
          `'${file.name}' is herkend als een interactief dataproduct / kaart. Configureer de weergave in het venster.`
        );
        return;
      }

      // If it's regular HTML document text:
      let extractedContent = fullHtml;
      const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch && bodyMatch[1]) {
        extractedContent = bodyMatch[1];
      }

      if (value && value.trim().length > 0) {
        const replaceChoice = window.confirm(
          `Wilt u de inhoud van '${file.name}' toevoegen aan uw huidige tekst?\n\n• OK: Toevoegen aan het einde\n• Annuleren: Huidige tekst volledig vervangen door dit HTML-bestand`
        );
        if (replaceChoice) {
          onChange(`${value}\n\n<!-- Ingevoegd vanuit ${file.name} -->\n${extractedContent}`);
        } else {
          onChange(extractedContent);
        }
      } else {
        onChange(extractedContent);
      }

      toast.success(`.html bestand '${file.name}' succesvol ingevoegd!`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      toast.error("Fout bij het lezen van het .html bestand");
    };

    reader.readAsText(file);
  };

  // Convert plain text newlines into clean <p> tags if user wants instant formatting
  const autoFormatPlainParagraphs = () => {
    if (!value.trim()) return;
    if (value.includes("<p>") || value.includes("<div>")) {
      toast.info("De tekst bevat reeds HTML-structuur");
      return;
    }
    const paragraphs = value
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p class="mb-4 leading-relaxed">${p.replace(/\n/g, "<br/>")}</p>`)
      .join("\n\n");

    onChange(paragraphs);
    toast.success("Alinea's automatisch omgezet naar HTML <p> tags!");
  };

  return (
    <div className="border border-border rounded-xl bg-background overflow-hidden shadow-xs">
      {/* Top action header */}
      <div className="bg-secondary/40 border-b border-border p-2.5 flex flex-wrap items-center justify-between gap-2">
        {/* Left: View Mode Switches */}
        <div className="flex items-center gap-1 bg-background/80 p-1 rounded-lg border border-border/80">
          <Button
            type="button"
            size="sm"
            variant={activeView === "visual" ? "default" : "ghost"}
            onClick={() => setActiveView("visual")}
            className="h-7 text-xs px-2.5 font-medium"
          >
            <Type className="w-3.5 h-3.5 mr-1" /> Visueel
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeView === "code" ? "default" : "ghost"}
            onClick={() => setActiveView("code")}
            className="h-7 text-xs px-2.5 font-medium"
          >
            <Code className="w-3.5 h-3.5 mr-1" /> HTML Code
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeView === "preview" ? "default" : "ghost"}
            onClick={() => setActiveView("preview")}
            className="h-7 text-xs px-2.5 font-medium"
          >
            <Eye className="w-3.5 h-3.5 mr-1" /> Live Voorbeeld
          </Button>
        </div>

        {/* Right: Rich insertion tools (Images, Dataproducts, HTML file) */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Button: Invoegen van Afbeelding & Sizen */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowImageModal(true)}
            className="h-8 text-xs font-semibold border-border bg-background hover:bg-secondary text-foreground"
            title="Voeg een afbeelding of grafiek in en stel formaat & uitlijning in"
          >
            <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-accent" /> Afbeelding invoegen
          </Button>

          {/* Button: Invoegen van Interactief Dataproduct (.html / kaart / grafiek) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDataProductModal(true)}
            className="h-8 text-xs font-semibold border-accent/50 bg-accent/15 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Voeg een interactieve .html kaart (Folium/Leaflet) of grafiek (Plotly/Pandas) in"
          >
            <Map className="w-3.5 h-3.5 mr-1.5" /> 📊 Dataproduct / Kaart (.html)
          </Button>

          {/* Button: Invoegen van Wiskundige Formule & LaTeX ($) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMathModal(true)}
            className="h-8 text-xs font-semibold border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white transition-colors"
            title="Wiskundige symbolen en LaTeX formules invoegen ($z_0$, $^\circ$, koordebreedte, etc.)"
          >
            <Calculator className="w-3.5 h-3.5 mr-1.5" /> 🧮 Wiskundige Formule ($)
          </Button>

          {/* Button: Invoegen van Bronvermelding / Voetnoot (*) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenSourceModal}
            className="h-8 text-xs font-semibold border-accent/50 bg-accent/15 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Selecteer tekst en voeg een interactieve bronvermelding (*) of uitvouw toe (zoals De Correspondent)"
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5 text-accent" /> 📚 Bron toevoegen (*)
          </Button>

          {/* Button: PDF / Rapport tekst converteren */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPdfImportModal(true)}
            className="h-8 text-xs font-semibold border-border bg-background hover:bg-secondary text-foreground"
            title="Plak tekst uit een PDF-onderzoek; behoudt formules en maakt automatisch nette alinea's"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5 text-accent" /> PDF Tekst Plakken
          </Button>

          {/* Button: Invoegen van MP4 Video */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowVideoModal(true)}
            className="h-8 text-xs font-semibold border-accent/50 bg-accent/15 text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Upload en voeg een .mp4 video in met afspeelbediening"
          >
            <Video className="w-3.5 h-3.5 mr-1.5" /> 🎥 MP4 Video invoegen
          </Button>

          {/* Hidden File input specifically for direct .html import */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".html,.htm"
            onChange={handleHtmlFileUpload}
            className="hidden"
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 text-xs text-muted-foreground hover:text-foreground hidden sm:inline-flex"
            title="Upload direct een lokaal .html bestand"
          >
            <FileCode className="w-3.5 h-3.5 mr-1" /> .html upload
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={autoFormatPlainParagraphs}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            title="Zet losse alinea's automatisch om naar HTML <p> tags"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-accent" /> Automatisch opmaken
          </Button>
        </div>
      </div>

      {/* Formatting Toolbar (shown in visual and code mode) */}
      {activeView !== "preview" && (
        <div className="bg-muted/25 border-b border-border px-2.5 py-1.5 flex flex-wrap items-center gap-1">
          {/* Typography styles */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-border/60">
            <button
              type="button"
              onClick={() => insertHtmlTag("<strong>", "</strong>", "belangrijke tekst")}
              className="p-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Vet (<strong>)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertHtmlTag("<em>", "</em>", "cursieve tekst")}
              className="p-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Cursief (<em>)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertHtmlTag("<u>", "</u>", "onderstreepte tekst")}
              className="p-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Onderstreept (<u>)"
            >
              <Underline className="w-4 h-4" />
            </button>
          </div>

          {/* Headings and Paragraph */}
          <div className="flex items-center gap-0.5 px-2 border-r border-border/60">
            <button
              type="button"
              onClick={() => insertHtmlTag('<h2 class="text-2xl font-display mt-6 mb-3 text-foreground">', "</h2>", "Tussenkop (H2)")}
              className="p-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground font-semibold text-xs flex items-center"
              title="Kop 2 (<h2>)"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertHtmlTag('<h3 class="text-xl font-display mt-4 mb-2 text-accent">', "</h3>", "Kopje (H3)")}
              className="p-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground font-semibold text-xs flex items-center"
              title="Kop 3 (<h3>)"
            >
              <Heading3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertHtmlTag('<p class="mb-4 leading-relaxed">', "</p>", "Alinea tekst")}
              className="p-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground text-xs font-bold"
              title="Paragraaf (<p>)"
            >
              ¶
            </button>
          </div>

          {/* Lists & Quotes */}
          <div className="flex items-center gap-0.5 px-2 border-r border-border/60">
            <button
              type="button"
              onClick={() => insertHtmlTag('<ul class="list-disc pl-6 my-4 space-y-1">\n  <li>', "</li>\n  <li>Tweede punt</li>\n</ul>", "Opsommingspunt")}
              className="p-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Opsommingslijst (<ul>)"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertHtmlTag('<ol class="list-decimal pl-6 my-4 space-y-1">\n  <li>', "</li>\n  <li>Tweede stap</li>\n</ol>", "Stap 1")}
              className="p-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Genummerde lijst (<ol>)"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertHtmlTag('<blockquote class="border-l-4 border-accent pl-4 my-4 italic text-muted-foreground">', "</blockquote>", "Belangrijk citaat")}
              className="p-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Citaat (<blockquote>)"
            >
              <Quote className="w-4 h-4" />
            </button>
          </div>

          {/* Special blocks: Link, Hr, Callout, Table */}
          <div className="flex items-center gap-1 px-2 border-r border-border/60">
            <button
              type="button"
              onClick={insertLink}
              className="p-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Link invoegen (<a>)"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const hr = '\n<hr class="my-6 border-border/80" />\n';
                insertAtCursor(hr);
              }}
              className="p-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Horizontale scheidingslijn (<hr/>)"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={insertDataTable}
              className="p-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Dataset-tabel invoegen (<table>)"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={insertCallout}
              className="text-xs px-2 py-1 rounded-md hover:bg-muted text-accent font-medium"
              title="Uitgelicht kader invoegen"
            >
              Kader
            </button>
            <button
              type="button"
              onClick={handleOpenSourceModal}
              className="text-xs px-2 py-1 rounded-md hover:bg-muted text-accent font-semibold flex items-center gap-1 border border-accent/30 bg-accent/10"
              title="Geselecteerde tekst koppelen aan een interactieve bronvermelding (*)"
            >
              <BookOpen className="w-3.5 h-3.5 text-accent" />
              <span>Bron</span>
              <sup className="font-bold text-accent text-sm leading-none">*</sup>
            </button>
          </div>

          {/* Quick Math Tools */}
          <div className="flex items-center gap-1 px-2 border-r border-border/60">
            <button
              type="button"
              onClick={insertInlineMathQuick}
              className="px-2 py-1 text-xs font-mono font-bold rounded-md hover:bg-muted text-amber-600 dark:text-amber-400"
              title="Inline formule invoegen ($...$)"
            >
              $ ... $
            </button>
            <button
              type="button"
              onClick={insertBlockMathQuick}
              className="px-2 py-1 text-xs font-mono font-bold rounded-md hover:bg-muted text-amber-600 dark:text-amber-400"
              title="Gecentreerde blokformule invoegen ($$...$$)"
            >
              $$ ... $$
            </button>
            <button
              type="button"
              onClick={() => setShowMathModal(true)}
              className="p-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-amber-500"
              title="Wiskundig formulepaneel openen"
            >
              <Sigma className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Paragraph Insertion Before / After to guarantee easy writing */}
          <div className="flex items-center gap-1 pl-1">
            <span className="text-[11px] text-muted-foreground mr-1 hidden md:inline">Doortypen:</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertEmptyParagraph("before")}
              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
              title="Voeg een lege alinea in vóór de huidige positie"
            >
              + Alinea ervoor
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertEmptyParagraph("after")}
              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
              title="Voeg een lege alinea in ná de huidige positie"
            >
              + Alinea erna
            </Button>
          </div>
        </div>
      )}

      {/* Editor Content Body */}
      <div className="relative">
        {activeView === "visual" && (
          <div className="p-1">
            <textarea
              ref={textareaRef}
              required={required}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Typ hier uw nieuwsbericht. Voeg tussenkoppen, afbeeldingen of interactieve Python/pandas dataproducten en kaarten in met de knoppen hierboven. U kunt altijd direct voor en na afbeeldingen en kaarten blijven typen..."
              className="w-full min-h-[300px] p-4 bg-transparent border-0 outline-none resize-y text-sm text-foreground leading-relaxed focus:ring-0 font-normal"
            />
          </div>
        )}

        {activeView === "code" && (
          <div className="p-1 bg-[#0b100e]">
            <textarea
              ref={textareaRef}
              required={required}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="<p>Typ of bewerk hier de ruwe HTML-code...</p>"
              className="w-full min-h-[300px] p-4 bg-transparent border-0 outline-none resize-y text-xs font-mono text-[#dcdcdc] leading-relaxed focus:ring-0 selection:bg-accent/40"
              spellCheck={false}
            />
          </div>
        )}

        {activeView === "preview" && (
          <div className="p-6 min-h-[300px] max-h-[600px] overflow-y-auto bg-card text-card-foreground">
            {value.trim() ? (
              <InteractiveArticleRenderer content={value} />
            ) : (
              <div className="text-center py-16 text-muted-foreground italic text-sm">
                Nog geen inhoud om weer te geven. Typ tekst of voeg afbeeldingen / .html dataproducten in om het voorbeeld direct te bekijken.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="bg-secondary/30 border-t border-border px-3 py-2 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
        <div className="flex items-center gap-3">
          <span>{value.length} tekens</span>
          <span>•</span>
          <span>
            {value.trim() ? value.trim().split(/\s+/).filter(Boolean).length : 0} woorden
          </span>
          {htmlFileName && (
            <>
              <span>•</span>
              <span className="text-accent flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Geladen bestand: {htmlFileName}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <HelpCircle className="w-3.5 h-3.5 text-accent" />
          <span>Ondersteunt Python Folium kaarten, Plotly grafieken en afbeeldingen met tekstomloop</span>
        </div>
      </div>

      {/* ================= MODAL: Afbeelding Invoegen & Sizen ================= */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">Afbeelding / Grafiek Invoegen</h3>
                  <p className="text-xs text-muted-foreground">Upload een afbeelding en stel de gewenste grootte en uitlijning in</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Option 1: File Upload */}
              <div>
                <label className="text-xs font-semibold block mb-1.5 text-foreground">
                  Afbeeldingsbestand uploaden (PNG, JPG, WEBP, SVG)
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setImageFile(f);
                    if (f && !imageAlt) {
                      setImageAlt(f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
                    }
                  }}
                  className="text-xs cursor-pointer"
                />
              </div>

              {/* Option 2: Image URL */}
              <div>
                <label className="text-xs font-semibold block mb-1.5 text-foreground">
                  Of voer een afbeeldings-URL / pad in:
                </label>
                <Input
                  type="text"
                  placeholder="https://... of /uploads/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Sizing Options */}
              <div>
                <label className="text-xs font-semibold block mb-1.5 text-foreground">
                  Breedte / Formaat (Sizing)
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: "25", label: "25% (Kwart)" },
                    { id: "33", label: "33% (1/3e)" },
                    { id: "50", label: "50% (Half)" },
                    { id: "75", label: "75% (3/4e)" },
                    { id: "100", label: "100% (Volledig)" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setImageSize(s.id)}
                      className={`px-2 py-1.5 text-xs rounded-md border font-medium transition-all text-center ${
                        imageSize === s.id
                          ? "bg-accent text-accent-foreground border-accent font-semibold"
                          : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  75% is ideaal voor grafieken en visualisaties zodat ze scherp en overzichtelijk blijven.
                </p>
              </div>

              {/* Alignment Options */}
              <div>
                <label className="text-xs font-semibold block mb-1.5 text-foreground">
                  Uitlijning
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setImageAlign("center")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md border transition-all ${
                      imageAlign === "center"
                        ? "bg-accent text-accent-foreground border-accent font-semibold"
                        : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                    }`}
                  >
                    <AlignCenter className="w-3.5 h-3.5" /> Gecentreerd
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageAlign("left")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md border transition-all ${
                      imageAlign === "left"
                        ? "bg-accent text-accent-foreground border-accent font-semibold"
                        : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" /> Links (tekstomloop)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageAlign("right")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md border transition-all ${
                      imageAlign === "right"
                        ? "bg-accent text-accent-foreground border-accent font-semibold"
                        : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                    }`}
                  >
                    <AlignRight className="w-3.5 h-3.5" /> Rechts (tekstomloop)
                  </button>
                </div>
              </div>

              {/* Caption & Alt Text */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1 text-foreground">
                    Bijschrift / Ondertitel (optioneel)
                  </label>
                  <Input
                    type="text"
                    placeholder="bijv. Grafiek 1: Prijsontwikkeling per kern"
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1 text-foreground">
                    Alt-tekst (SEO & Toegankelijkheid)
                  </label>
                  <Input
                    type="text"
                    placeholder="Korte beschrijving van de afbeelding"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImageModal(false)}
                  className="text-xs"
                >
                  Annuleren
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isUploading}
                  onClick={handleInsertImage}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold"
                >
                  {isUploading ? "Uploaden..." : "Afbeelding invoegen"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: Dataproduct / Kaart (.html) Invoegen ================= */}
      {showDataProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center">
                  <Map className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">
                    Interactief Dataproduct / Kaart (.html)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Python Folium kaarten, Plotly grafieken of Pandas HTML analyses invoegen
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDataProductModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Option 1: File Upload */}
              <div>
                <label className="text-xs font-semibold block mb-1.5 text-foreground">
                  Selecteer .html bestand (Folium kaart, Plotly plot, Pandas export)
                </label>
                <Input
                  type="file"
                  accept=".html,.htm"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setDpFile(f);
                    if (f && !dpTitle) {
                      setDpTitle(f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
                    }
                  }}
                  className="text-xs cursor-pointer"
                />
              </div>

              {/* Option 2: Direct URL */}
              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground">
                  Of voer direct het bestandspad / URL in:
                </label>
                <Input
                  type="text"
                  placeholder="/uploads/dataproducts/... of https://..."
                  value={dpUrl}
                  onChange={(e) => setDpUrl(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Type selector */}
              <div>
                <label className="text-xs font-semibold block mb-1.5 text-foreground">
                  Soort Dataproduct
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDpType("map")}
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-md border font-medium ${
                      dpType === "map"
                        ? "bg-accent text-accent-foreground border-accent font-semibold"
                        : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                    }`}
                  >
                    <Map className="w-4 h-4" /> Interactieve Kaart (Folium/Leaflet)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDpType("chart")}
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-md border font-medium ${
                      dpType === "chart"
                        ? "bg-accent text-accent-foreground border-accent font-semibold"
                        : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" /> Grafiek / Analyse (Plotly/Pandas)
                  </button>
                </div>
              </div>

              {/* Title & Caption */}
              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground">
                  Titel van het Dataproduct / Kaart *
                </label>
                <Input
                  type="text"
                  placeholder="bijv. Interactieve Kaart: Woningbouwlocaties Steenwijkerland"
                  value={dpTitle}
                  onChange={(e) => setDpTitle(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground">
                  Toelichting / Databron (optioneel)
                </label>
                <Input
                  type="text"
                  placeholder="bijv. Bron: Python Geopandas & Folium analyse gemeentelijke data 2026"
                  value={dpCaption}
                  onChange={(e) => setDpCaption(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Height selection */}
              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground">
                  Hoogte van de weergave
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["420", "520", "640"].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setDpHeight(h)}
                      className={`px-3 py-1.5 text-xs rounded-md border font-medium ${
                        dpHeight === h
                          ? "bg-accent text-accent-foreground border-accent font-semibold"
                          : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                      }`}
                    >
                      {h}px {h === "520" ? "(Standaard)" : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verticaal meeschalen optie */}
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dpAutoResize}
                    onChange={(e) => setDpAutoResize(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-foreground">
                    Verticaal meeschalen met inhoud (voorkom interne scrollbalk)
                  </span>
                </label>
                <p className="text-[11px] text-muted-foreground pl-6">
                  Schakel in om de hoogte van het nieuwsbericht en iframe automatisch te laten meeschalen met de inhoud van de kaart of grafiek, zodat er geen scrollbalk ontstaat inside het venster.
                </p>
              </div>

              {/* Lazy-load on hover checkbox for SEO & Speed */}
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dpHoverActivate}
                    onChange={(e) => setDpHoverActivate(e.target.checked)}
                    className="rounded text-accent focus:ring-accent w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-foreground">
                    Pas activeren bij hover (voor laadsnelheid & SEO)
                  </span>
                </label>
                <p className="text-[11px] text-muted-foreground pl-6">
                  Aanbevolen: De interactieve scripts en kaarttegels worden pas geladen wanneer een bezoeker met de muis over het blok beweegt. Hierdoor blijft de pagina supersnel voor Google (Core Web Vitals) en wordt scroll-hijacking voorkomen.
                </p>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDataProductModal(false)}
                  className="text-xs"
                >
                  Annuleren
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isUploading}
                  onClick={handleInsertDataProduct}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold"
                >
                  {isUploading ? "Uploaden..." : "Dataproduct invoegen"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MP4 Video Invoegen ================= */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    MP4 Video Uploaden &amp; Invoegen
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Upload een .mp4 videobestand of geef een directe video-URL op
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Option A: Direct Video Upload (.mp4) */}
              <div className="p-3.5 rounded-lg border-2 border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 transition-colors">
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Selecteer .mp4 videobestand vanaf computer
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setVideoFile(file);
                      if (!videoTitle) {
                        setVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
                      }
                    }
                  }}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/90 cursor-pointer"
                />
                {videoFile && (
                  <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Geselecteerd: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ondersteunt .mp4 en .webm bestanden. Wordt automatisch geoptimaliseerd voor HTML5 weergave.
                </p>
              </div>

              {/* Option B: Direct URL */}
              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground">
                  Of voer een directe video-URL in
                </label>
                <Input
                  type="url"
                  placeholder="bijv. /uploads/videos/mijn-video.mp4 of https://..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  disabled={Boolean(videoFile)}
                  className="text-xs"
                />
              </div>

              {/* Title & Caption */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold block mb-1 text-foreground">
                    Videotitel / Beschrijving (optioneel)
                  </label>
                  <Input
                    type="text"
                    placeholder="bijv. Sammy van Andel licht standpunt over woningbouw toe"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1 text-foreground">
                    Bijschrift onder videospeler (optioneel)
                  </label>
                  <Input
                    type="text"
                    placeholder="bijv. Beelden uit de raadsvergadering van 18 april"
                    value={videoCaption}
                    onChange={(e) => setVideoCaption(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Playback Options */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={videoControls}
                    onChange={(e) => setVideoControls(e.target.checked)}
                    className="rounded text-accent focus:ring-accent w-4 h-4"
                  />
                  <span>Bedieningsknoppen (controls)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={videoAutoplay}
                    onChange={(e) => setVideoAutoplay(e.target.checked)}
                    className="rounded text-accent focus:ring-accent w-4 h-4"
                  />
                  <span>Automatisch afspelen (stil)</span>
                </label>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowVideoModal(false)}
                  className="text-xs"
                >
                  Annuleren
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isUploading}
                  onClick={handleInsertVideo}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold"
                >
                  {isUploading ? "Video Uploaden..." : "MP4 Video Invoegen"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Wiskundige Formules & LaTeX ($) invoegen */}
      {showMathModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    Wiskundige Symbolen & Formules Invoegen (LaTeX)
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Ondersteunt alle wetenschappelijke notaties zoals windturbinesimulaties, aerodynamica en wiskunde
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMathModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Formula input */}
              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground flex items-center justify-between">
                  <span>LaTeX Formule of Symbool</span>
                  <span className="text-[11px] text-muted-foreground">Typ of klik op een snelknop hieronder</span>
                </label>
                <Input
                  type="text"
                  value={mathInput}
                  onChange={(e) => setMathInput(e.target.value)}
                  placeholder="bijv. z_0 = 0,05\text{ m} of 210^\circ - 250^\circ"
                  className="font-mono text-sm"
                  autoFocus
                />
              </div>

              {/* Mode: Inline vs Block */}
              <div className="flex items-center gap-4 p-2.5 rounded-lg bg-muted/40 border border-border text-xs">
                <span className="font-medium text-foreground">Weergave:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="mathMode"
                    checked={!mathIsBlock}
                    onChange={() => setMathIsBlock(false)}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span>Inline formule ($...$) in lopende tekst</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="mathMode"
                    checked={mathIsBlock}
                    onChange={() => setMathIsBlock(true)}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span>Blokformule ($$...$$) gecentreerd op eigen regel</span>
                </label>
              </div>

              {/* Live KaTeX Preview */}
              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground">
                  Live KaTeX Voorbeeld
                </label>
                <div className="min-h-[60px] p-4 rounded-xl bg-[#0c1311] border border-border/80 flex items-center justify-center text-center text-foreground overflow-x-auto">
                  {(() => {
                    if (!mathInput.trim()) {
                      return (
                        <span className="text-muted-foreground italic text-xs">
                          Typ hierboven een formule of klik op een snelknop hieronder om het voorbeeld te zien...
                        </span>
                      );
                    }
                    try {
                      const rendered = katex.renderToString(mathInput.trim(), {
                        displayMode: mathIsBlock,
                        throwOnError: false,
                        strict: false,
                      });
                      return <div dangerouslySetInnerHTML={{ __html: rendered }} />;
                    } catch (e: unknown) {
                      const err = e as Error;
                      return <span className="text-amber-500 text-xs">Controleren... {err?.message}</span>;
                    }
                  })()}
                </div>
              </div>

              {/* Quick Presets: Category 1 Windturbines / Groot Verlaat */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-accent flex items-center gap-1">
                  <span>🌬️</span> Wetenschappelijke Modellering Windturbines & Groot Verlaat (uit PDF):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "z₀ = 0,05 m (Polder)", formula: "z_0 = 0,05\\text{ m}" },
                    { label: "z₀ = 0,25 tot 0,40 m (Bebouwing)", formula: "z_0 = 0,25\\text{ tot }0,40\\text{ m}" },
                    { label: "210° - 250° (Windrichting)", formula: "210^\\circ - 250^\\circ" },
                    { label: "< 0,01° (Precisie)", formula: "< 0,01^\\circ" },
                    { label: "3° (Minimale zonshoogte)", formula: "3^\\circ" },
                    { label: "0,533° (Zonshoekdiameter)", formula: "0,533^\\circ" },
                    { label: "107,4 × (Kernschaduw)", formula: "107,4 \\times" },
                    { label: "b_max (Koordebreedte)", formula: "b_{\\text{max}}" },
                    { label: "12 × rotordiameter (12D)", formula: "12 \\times \\text{rotordiameter}" },
                    { label: "12D (Wettelijke norm)", formula: "12D" },
                    { label: "Betz Vermogen P = ½ρAv³Cp", formula: "P = \\frac{1}{2} \\rho A v^3 C_p" },
                  ].map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMathInput(p.formula)}
                      className="px-2.5 py-1 text-xs rounded-md bg-secondary/80 hover:bg-amber-500 hover:text-white border border-border/80 text-foreground transition-colors font-mono"
                      title={`Kies formule: ${p.formula}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Presets: Category 2 Math symbols */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>📐</span> Symbolen & Berekeningen:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "° Graden", formula: "^\\circ" },
                    { label: "× Maal", formula: "\\times" },
                    { label: "· Punt", formula: "\\cdot" },
                    { label: "≤ Kleiner/gelijk", formula: "\\le" },
                    { label: "≥ Groter/gelijk", formula: "\\ge" },
                    { label: "≈ Ongeveer", formula: "\\approx" },
                    { label: "± Plusminus", formula: "\\pm" },
                    { label: "≠ Ongelijk", formula: "\\ne" },
                    { label: "a/b Breuk", formula: "\\frac{a}{b}" },
                    { label: "√x Wortel", formula: "\\sqrt{x}" },
                    { label: "x² Kwadraat", formula: "x^2" },
                    { label: "x₀ Subscript", formula: "x_0" },
                    { label: "\\text{...}", formula: "\\text{tekst}" },
                  ].map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMathInput((prev) => (prev ? `${prev} ${p.formula}` : p.formula))}
                      className="px-2 py-0.5 text-xs rounded bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground font-mono"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Presets: Category 3 Greek letters */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-foreground">Griekse Letters:</span>
                <div className="flex flex-wrap gap-1">
                  {["\\alpha", "\\beta", "\\gamma", "\\Delta", "\\theta", "\\lambda", "\\mu", "\\pi", "\\rho", "\\sigma", "\\Omega"].map((letter) => (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => setMathInput((prev) => (prev ? `${prev} ${letter}` : letter))}
                      className="px-2 py-0.5 text-xs rounded bg-muted/40 hover:bg-muted border border-border font-mono text-muted-foreground hover:text-foreground"
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMathModal(false)}
                  className="text-xs"
                >
                  Annuleren
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleInsertMath}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                >
                  Formule Invoegen in Artikel ({mathIsBlock ? "$$...$$" : "$...$"})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: PDF / Wetenschappelijke tekst importeren & repareren */}
      {showPdfImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    PDF / Wetenschappelijk Artikel Plakken & Repareren
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Zet gekopieerde PDF-teksten automatisch om met behoud van wiskundige formules en nette alinea's
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfImportModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground">
                  Plak hier de ruwe tekst uit uw PDF of onderzoeksrapport
                </label>
                <Textarea
                  value={pdfPasteText}
                  onChange={(e) => setPdfPasteText(e.target.value)}
                  placeholder="Plak hier bijvoorbeeld: 'Waarom de locatie Groot Verlaat (Steenwijk-West) extra kwetsbaar is. De onderzochte locatie op het Groot Verlaat... ($z_0 = 0,05 m$)... ($210° - 250°)...'"
                  className="min-h-[220px] text-xs font-normal leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Herstelt automatisch windturbinemodellen (zoals <code className="text-accent">$z_0$</code>, <code className="text-accent">$^\circ$</code>, <code className="text-accent">b_max</code>, <code className="text-accent">12D</code>), voorkomt dat haakjes leeg blijven en maakt nette HTML-alinea's.
                </p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPdfImportModal(false)}
                  className="text-xs"
                >
                  Annuleren
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleProcessPdfText}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold"
                >
                  Tekst met Formules Converteren & Invoegen
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: Invoegen van Interactieve Bronvermelding / Voetnoot (De Correspondent stijl) */}
      {showSourceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    Interactieve Bronvermelding & Voetnoot Toevoegen
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Koppel geselecteerde tekst aan een aanklikbare bron met een asterisk (*), uitvouw en link (De Correspondent-stijl)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSourceModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              {/* 1. Geselecteerde tekst */}
              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground">
                  Geselecteerd zinsdeel of woord in het artikel <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  value={sourceSelectedText}
                  onChange={(e) => setSourceSelectedText(e.target.value)}
                  placeholder="Bijv. moreel verdacht of onderzoek op onderzoek toont aan"
                  className="text-xs font-medium"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Dit is het zinsdeel waar de lezer op klikt om de bronvermelding uit te klappen.
                </p>
              </div>

              {/* 2. Brontitel / Publicatie */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">
                    Bronvermelding / Publicatie / Rapport <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Snelle sjablonen:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSourceTitle("Mads Gamborg et al., ‘Long-term nationwide emulated trial’ (2025)");
                        setSourceUrl("https://www.sciencedirect.com/");
                        setSourceNote("Gepubliceerd in toonaangevend medisch vakblad. Onderzoek over 10 jaar.");
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground"
                    >
                      Studie
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSourceTitle("CBS Bevolkings- en Woningstatistieken Steenwijkerland (2024)");
                        setSourceUrl("https://www.cbs.nl/");
                        setSourceNote("Officiële kerncijfers per wijk en kern van gemeente Steenwijkerland.");
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground"
                    >
                      CBS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSourceTitle("Gemeenteraad Steenwijkerland, Raadsbesluit Energietransitie & Groot Verlaat");
                        setSourceUrl("https://steenwijkerland.notubiz.nl/");
                        setSourceNote("Officieel verslag en stemgedrag van de gemeenteraad.");
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground"
                    >
                      Gemeente
                    </button>
                  </div>
                </div>
                <Input
                  type="text"
                  value={sourceTitle}
                  onChange={(e) => setSourceTitle(e.target.value)}
                  placeholder="Bijv. Mads Gamborg et al., ‘Long-term cancer risk in users of GLP-1 agonists’ (2025)"
                  className="text-xs"
                />
              </div>

              {/* 3. Bron URL / Weblink */}
              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground">
                  Aanklikbare Bron-URL / Weblink (optioneel, maar aanbevolen)
                </label>
                <Input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://www.sciencedirect.com/... of https://cbs.nl/..."
                  className="text-xs font-mono"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  De lezer kan hier direct op doorklikken om het originele rapport of de wetenschappelijke pagina te openen.
                </p>
              </div>

              {/* 4. Extra toelichting / samenvatting */}
              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground">
                  Extra toelichting of duiding (optioneel)
                </label>
                <Textarea
                  value={sourceNote}
                  onChange={(e) => setSourceNote(e.target.value)}
                  placeholder="Bijv. Nationaal registeronderzoek onder 45.000 deelnemers. Toont aan dat risico's niet significant verhoogd zijn."
                  className="text-xs min-h-[60px]"
                  rows={2}
                />
              </div>

              {/* 5. Weergavestijl */}
              <div>
                <label className="text-xs font-semibold block mb-1.5 text-foreground">
                  Weergavestijl in het artikel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceVariant("asterisk")}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      sourceVariant === "asterisk"
                        ? "bg-accent/15 border-accent text-accent"
                        : "bg-secondary/30 border-border hover:bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>De Correspondent (*)</span>
                      <span className="font-bold text-accent">*</span>
                    </div>
                    <p className="text-[10px] mt-1 text-muted-foreground leading-tight">
                      Woord met asterisk (*), vouwt bronkaart direct inline uit.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceVariant("infocard")}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      sourceVariant === "infocard"
                        ? "bg-accent/15 border-accent text-accent"
                        : "bg-secondary/30 border-border hover:bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>Infokaart (▼)</span>
                      <span className="text-xs text-accent">▼</span>
                    </div>
                    <p className="text-[10px] mt-1 text-muted-foreground leading-tight">
                      Met uitvouwpijltje voor verdere toelichting en link.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceVariant("sidenote")}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      sourceVariant === "sidenote"
                        ? "bg-accent/15 border-accent text-accent"
                        : "bg-secondary/30 border-border hover:bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>Zijnoot (↗)</span>
                      <span className="text-xs text-accent">↗</span>
                    </div>
                    <p className="text-[10px] mt-1 text-muted-foreground leading-tight">
                      Cursieve titel met extern icoon naar de publicatie.
                    </p>
                  </button>
                </div>
              </div>

              {/* 6. Live interactief voorbeeld van hoe het eruit ziet */}
              <div className="bg-muted/20 border border-border/80 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-accent">
                    Live Voorbeeldweergave (Klik om te testen)
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {previewCardOpen ? "Uitgevouwen" : "Ingeklapt (klik op het zinsdeel)"}
                  </span>
                </div>

                <div className="text-xs leading-relaxed text-foreground">
                  <span>De situatie is </span>
                  <button
                    type="button"
                    onClick={() => setPreviewCardOpen(!previewCardOpen)}
                    className="inline cursor-pointer text-accent border-b border-dotted border-accent hover:bg-accent/10 px-0.5 rounded-xs"
                    title="Klik om bron te bekijken"
                  >
                    <span>{sourceSelectedText.trim() || "dit onderzochte zinsdeel"}</span>
                    {sourceVariant === "asterisk" && <sup className="font-bold text-accent ml-0.5">*</sup>}
                    {sourceVariant === "infocard" && <span className="text-[10px] text-accent ml-0.5">▼</span>}
                    {sourceVariant === "sidenote" && <span className="text-[10px] text-accent ml-0.5">↗</span>}
                  </button>
                  <span> en vormt een belangrijke conclusie in het rapport.</span>

                  {/* Expandable Preview Card */}
                  {previewCardOpen && (
                    <div className="mt-2 p-3 rounded-lg bg-card border border-accent/40 shadow-xs relative text-xs animate-in fade-in-50 duration-150">
                      <button
                        type="button"
                        onClick={() => setPreviewCardOpen(false)}
                        className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground text-xs p-1"
                        title="Sluiten"
                      >
                        ✕
                      </button>
                      <div>
                        <span className="font-bold text-accent uppercase text-[10px] tracking-wide mr-1.5">
                          {sourceVariant === "infocard" ? "Toelichting:" : "Bron:"}
                        </span>
                        {sourceUrl.trim() ? (
                          <a
                            href={sourceUrl.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent underline font-medium hover:opacity-80 inline-flex items-center gap-1"
                            onClick={(e) => e.preventDefault()}
                          >
                            <span>{sourceTitle.trim() || sourceUrl.trim() || "Bronverwijzing"}</span>
                            <span className="text-[10px]">↗</span>
                          </a>
                        ) : (
                          <span className="font-medium text-foreground">
                            {sourceTitle.trim() || "Titel van de publicatie"}
                          </span>
                        )}
                        {sourceNote.trim() && (
                          <span className="block text-[11px] text-muted-foreground italic mt-1 pt-1 border-t border-border/50">
                            {sourceNote.trim()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSourceModal(false)}
                  className="text-xs"
                >
                  Annuleren
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleInsertSource}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Bronvermelding Invoegen (*)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsContentEditor;
