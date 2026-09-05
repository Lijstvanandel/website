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
} from "lucide-react";
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

    // Build the structured HTML container with paragraph before and after
    const dpSnippet = `\n<p class="mb-4 leading-relaxed"></p>\n<div class="data-product-container my-8" data-dataproduct="true" data-src="${finalSrc}" data-title="${title}" data-caption="${caption}" data-height="${height}px" data-hover="${hoverAttr}" data-type="${dpType}">\n  <!-- Interactief dataproduct placeholder (geoptimaliseerd voor Core Web Vitals en SEO) -->\n  <div class="p-5 border border-border/80 rounded-xl bg-card text-center my-4">\n    <h4 class="font-display font-semibold text-foreground text-base">${title}</h4>\n    <p class="text-xs text-muted-foreground mt-1">${caption}</p>\n    <p class="text-xs text-accent mt-2 font-medium">Beweeg muis over dit vlak om interactieve weergave direct te laden</p>\n  </div>\n</div>\n<p class="mb-4 leading-relaxed"></p>\n`;

    insertAtCursor(dpSnippet);

    setShowDataProductModal(false);
    setDpFile(null);
    setDpUrl("");
    setDpTitle("");
    setDpCaption("");
    toast.success("Dataproduct ingevoegd! Het activeert automatisch bij hover voor snelle laadtijd.");
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

      // Detect if this is an interactive Python Folium map or Plotly chart
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
    </div>
  );
};

export default NewsContentEditor;
