import React, { useState, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const [activeView, setActiveView] = useState<"visual" | "code" | "preview">("visual");
  const [htmlFileName, setHtmlFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Handle importing a .html file directly into the content
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

      // Extract body if full HTML document, otherwise use snippet
      let extractedContent = fullHtml;

      const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch && bodyMatch[1]) {
        extractedContent = bodyMatch[1];
      }

      // Remove script tags and style tags for hygiene
      extractedContent = extractedContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .trim();

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

      toast.success(`.html bestand '${file.name}' succesvol ingevoegd in de inhoud!`);
      // Reset input so the same file can be re-selected if needed
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
    <div className="border border-border rounded-lg bg-background overflow-hidden">
      {/* Top action header */}
      <div className="bg-secondary/40 border-b border-border p-2.5 flex flex-wrap items-center justify-between gap-2">
        {/* Left: View Mode Switches */}
        <div className="flex items-center gap-1 bg-background/80 p-1 rounded-md border border-border/80">
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
            <Eye className="w-3.5 h-3.5 mr-1" /> Voorbeeld
          </Button>
        </div>

        {/* Right: Explicit .HTML file insertion and helper */}
        <div className="flex items-center gap-2">
          {/* Hidden File input specifically for .html */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".html,.htm"
            onChange={handleHtmlFileUpload}
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 text-xs font-semibold border-accent/40 bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground"
            title="Upload een lokaal .html bestand en voeg direct in"
          >
            <FileCode className="w-3.5 h-3.5 mr-1.5 text-accent" /> .html bestand invoegen
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
          <div className="flex items-center gap-0.5 pr-2 border-r border-border/60">
            <button
              type="button"
              onClick={() => insertHtmlTag("<strong>", "</strong>", "belangrijke tekst")}
              className="p-1.5 rounded hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Vet (<strong>)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertHtmlTag("<em>", "</em>", "cursieve tekst")}
              className="p-1.5 rounded hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Cursief (<em>)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertHtmlTag("<u>", "</u>", "onderstreepte tekst")}
              className="p-1.5 rounded hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Onderstreept (<u>)"
            >
              <Underline className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-0.5 px-2 border-r border-border/60">
            <button
              type="button"
              onClick={() => insertHtmlTag('<h2 class="text-2xl font-display mt-6 mb-3 text-foreground">', "</h2>", "Tussenkop (H2)")}
              className="p-1.5 rounded hover:bg-muted text-foreground/80 hover:text-foreground font-semibold text-xs flex items-center"
              title="Kop 2 (<h2>)"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertHtmlTag('<h3 class="text-xl font-display mt-4 mb-2 text-accent">', "</h3>", "Kopje (H3)")}
              className="p-1.5 rounded hover:bg-muted text-foreground/80 hover:text-foreground font-semibold text-xs flex items-center"
              title="Kop 3 (<h3>)"
            >
              <Heading3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertHtmlTag('<p class="mb-4 leading-relaxed">', "</p>", "Alinea tekst")}
              className="p-1.5 rounded hover:bg-muted text-foreground/80 hover:text-foreground text-xs font-bold"
              title="Paragraaf (<p>)"
            >
              ¶
            </button>
          </div>

          <div className="flex items-center gap-0.5 px-2 border-r border-border/60">
            <button
              type="button"
              onClick={() => insertHtmlTag('<ul class="list-disc pl-6 my-4 space-y-1">\n  <li>', "</li>\n  <li>Tweede punt</li>\n</ul>", "Opsommingspunt")}
              className="p-1.5 rounded hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Opsommingslijst (<ul>)"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertHtmlTag('<ol class="list-decimal pl-6 my-4 space-y-1">\n  <li>', "</li>\n  <li>Tweede stap</li>\n</ol>", "Stap 1")}
              className="p-1.5 rounded hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Genummerde lijst (<ol>)"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertHtmlTag('<blockquote class="border-l-4 border-accent pl-4 my-4 italic text-muted-foreground">', "</blockquote>", "Belangrijk citaat")}
              className="p-1.5 rounded hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Citaat (<blockquote>)"
            >
              <Quote className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-0.5 px-2">
            <button
              type="button"
              onClick={insertLink}
              className="p-1.5 rounded hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Link invoegen (<a>)"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const hr = '\n<hr class="my-6 border-border/80" />\n';
                const textarea = textareaRef.current;
                const start = textarea?.selectionStart ?? value.length;
                onChange(value.substring(0, start) + hr + value.substring(start));
              }}
              className="p-1.5 rounded hover:bg-muted text-foreground/80 hover:text-foreground"
              title="Horizontale scheidingslijn (<hr/>)"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={insertCallout}
              className="text-xs px-2 py-1 rounded hover:bg-muted text-accent font-medium"
              title="Uitgelicht kader invoegen"
            >
              Kader
            </button>
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
              placeholder="Typ hier de tekst van het nieuwsbericht, selecteer woorden om opmaak toe te voegen (zoals vet, koppen of lijsten), of klik op '.html bestand invoegen' om een compleet bestand in te laden..."
              className="w-full min-h-[260px] p-3.5 bg-transparent border-0 outline-none resize-y text-sm text-foreground leading-relaxed focus:ring-0"
            />
          </div>
        )}

        {activeView === "code" && (
          <div className="p-1 bg-[#0f1412]">
            <textarea
              ref={textareaRef}
              required={required}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="<p>Typ of bewerk hier de ruwe HTML-code...</p>"
              className="w-full min-h-[260px] p-3.5 bg-transparent border-0 outline-none resize-y text-xs font-mono text-[#d4d4d4] leading-relaxed focus:ring-0 selection:bg-accent/40"
              spellCheck={false}
            />
          </div>
        )}

        {activeView === "preview" && (
          <div className="p-6 min-h-[260px] max-h-[500px] overflow-y-auto bg-card text-card-foreground">
            {value.trim() ? (
              <div
                className="prose prose-sm md:prose-base dark:prose-invert max-w-none [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mb-3 [&_h2]:mt-6 [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-accent [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground italic text-sm">
                Nog geen inhoud om weer te geven. Typ tekst of voeg een .html bestand in om het voorbeeld te zien.
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
          <span>Ondersteunt volledige HTML-opmaak, alinea's, koppen en tabellen</span>
        </div>
      </div>
    </div>
  );
};

export default NewsContentEditor;
