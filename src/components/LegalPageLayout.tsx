import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Calendar,
  User,
  Printer,
  Download,
  Share2,
  ExternalLink,
  ChevronRight,
  Clock,
  Pencil,
  FileText,
  Scale,
  Shield,
  CheckCircle2,
  Mail,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { LegalDocumentData, LEGAL_DOCUMENTS } from "@/data/legalDocuments";

interface LegalPageLayoutProps {
  slug: "privacyverklaring" | "voorwaarden" | "verwerkingsreglement";
  icon?: React.ComponentType<{ className?: string }>;
}

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ slug, icon: Icon = ShieldCheck }) => {
  const fallback = LEGAL_DOCUMENTS[slug] || LEGAL_DOCUMENTS.privacyverklaring;
  const [doc, setDoc] = useState<LegalDocumentData>(fallback);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const isAdmin =
    user &&
    (user.role === "admin" ||
      user.role === "secretaris" ||
      user.role === "penningmeester" ||
      user.role === "voorzitter" ||
      user.role === "bestuur");

  useEffect(() => {
    let isMounted = true;
    async function loadDoc() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/documents/legal/${slug}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.title && isMounted) {
            setDoc((prev) => ({
              ...prev,
              ...data,
              content: data.content || prev.content,
            }));
          }
        }
      } catch {
        // Fallback already set
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDoc();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${doc.title} — Lijst van Andel`,
          text: doc.description,
          url,
        });
        return;
      } catch {
        // user cancelled or fallback
      }
    }
    navigator.clipboard?.writeText(url);
    toast.success("Paginalink gekopieerd naar klembord!");
  };

  // Extract table of contents from content headers
  const toc = useMemo(() => {
    const lines = (doc.content || "").split("\n");
    const items: { id: string; text: string; level: number }[] = [];
    lines.forEach((line) => {
      const h3Match = line.match(/^###\s+(.+)$/);
      const h2Match = line.match(/^##\s+(.+)$/);
      if (h3Match) {
        const clean = h3Match[1].replace(/[*_]/g, "").trim();
        const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        items.push({ id, text: clean, level: 3 });
      } else if (h2Match) {
        const clean = h2Match[1].replace(/[*_]/g, "").trim();
        const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        items.push({ id, text: clean, level: 2 });
      }
    });
    return items;
  }, [doc.content]);

  // Simple clean markdown paragraph formatter
  const renderFormattedContent = () => {
    const lines = (doc.content || "").split("\n");
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];

    const flushList = (key: number) => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`ul-${key}`} className="space-y-1.5 my-3 pl-5 list-disc text-muted-foreground">
            {currentList.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInlineFormatting(item)}
              </li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // List item
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        currentList.push(trimmed.substring(2));
        return;
      } else {
        flushList(index);
      }

      // Title H1
      if (trimmed.startsWith("# ")) {
        return; // Title is in hero
      }

      // H2
      if (trimmed.startsWith("## ")) {
        const text = trimmed.substring(3).replace(/[*_]/g, "");
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        elements.push(
          <h2
            key={index}
            id={id}
            className="text-xl sm:text-2xl font-display font-bold text-foreground mt-8 mb-3 pb-1 border-b border-border/80 scroll-mt-24"
          >
            {text}
          </h2>
        );
        return;
      }

      // H3
      if (trimmed.startsWith("### ")) {
        const text = trimmed.substring(4).replace(/[*_]/g, "");
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        elements.push(
          <h3
            key={index}
            id={id}
            className="text-lg font-display font-semibold text-accent mt-6 mb-2.5 scroll-mt-24"
          >
            {text}
          </h3>
        );
        return;
      }

      // H4
      if (trimmed.startsWith("#### ")) {
        const text = trimmed.substring(5).replace(/[*_]/g, "");
        elements.push(
          <h4 key={index} className="text-sm font-semibold text-foreground mt-4 mb-1.5">
            {text}
          </h4>
        );
        return;
      }

      // Horizontal Rule
      if (trimmed === "---") {
        elements.push(<hr key={index} className="my-6 border-border/60" />);
        return;
      }

      // Empty line
      if (!trimmed) {
        return;
      }

      // Paragraph
      elements.push(
        <p key={index} className="text-sm leading-relaxed text-foreground/90 my-2">
          {renderInlineFormatting(line)}
        </p>
      );
    });

    flushList(lines.length);
    return elements;
  };

  const renderInlineFormatting = (text: string) => {
    // Bold italic or bold
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={i} className="text-muted-foreground">{part.slice(1, -1)}</em>;
      }
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={i}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline hover:text-accent/80 font-medium"
          >
            {linkMatch[1]}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Breadcrumbs & Header Hero */}
      <div className="bg-card border-b border-border/80 pt-8 pb-10">
        <div className="container max-w-6xl mx-auto px-4">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-muted-foreground">Juridisch</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-accent font-medium truncate">{doc.title}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/30 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{doc.category || "Juridisch & Privacy"}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-muted border border-border text-muted-foreground">
                  {doc.confidentiality || "Openbaar / Publiek"}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
                {doc.title}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {doc.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-accent" />
                  <span>Laatst bijgewerkt: {doc.date}</span>
                </span>
                {doc.author && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-accent" />
                    <span>{doc.author}</span>
                  </span>
                )}
                {doc.fileSize && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-accent" />
                    <span>PDF: {doc.fileSize} ({doc.pageCount || 1} pag.)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {doc.fileUrl && (
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={doc.fileName || `${doc.title}.pdf`}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground text-xs h-9"
                    title="Download het officiële PDF document"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </Button>
                </a>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs h-9"
                title="Print dit document"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Printen</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="gap-1.5 text-xs h-9"
                title="Deel deze pagina"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Delen</span>
              </Button>
            </div>
          </div>

          {/* Admin shortcut banner */}
          {isAdmin && (
            <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Beheerdersmodus:</strong> Dit document wordt beheerd onder <em>'Exclusieve Documenten'</em> in het adminpaneel onder de categorie <em>'Juridisch & Privacy'</em>.
                </span>
              </div>
              <Link to="/admin">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-600/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 text-xs h-7 shrink-0"
                >
                  <Pencil className="w-3 h-3 mr-1" /> Document beheren in /admin
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container max-w-6xl mx-auto px-4 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Table of Contents Sidebar */}
          {toc.length > 0 && (
            <aside className="lg:col-span-4 hidden lg:block sticky top-24">
              <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
                  <BookOpen className="w-4 h-4" />
                  <span>Inhoudsopgave</span>
                </div>
                <div className="space-y-1 text-xs max-h-[60vh] overflow-y-auto pr-1">
                  {toc.map((item, idx) => (
                    <a
                      key={idx}
                      href={`#${item.id}`}
                      className={`block py-1 hover:text-accent transition-colors line-clamp-1 ${
                        item.level === 3 ? "pl-2 text-muted-foreground" : "font-medium text-foreground"
                      }`}
                    >
                      {item.text}
                    </a>
                  ))}
                </div>

                <div className="pt-3 border-t border-border/60">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>AVG & Wetgeving Steenwijkerland</span>
                  </div>
                </div>
              </div>

              {/* Related Legal Links */}
              <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 mt-4 space-y-2 text-xs">
                <span className="font-semibold text-foreground block">Gerelateerde documenten:</span>
                <div className="space-y-1.5">
                  {slug !== "privacyverklaring" && (
                    <Link
                      to="/privacyverklaring"
                      className="flex items-center justify-between text-muted-foreground hover:text-accent transition-colors py-0.5"
                    >
                      <span>Privacyverklaring</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                  {slug !== "voorwaarden" && (
                    <Link
                      to="/algemene-voorwaarden"
                      className="flex items-center justify-between text-muted-foreground hover:text-accent transition-colors py-0.5"
                    >
                      <span>Algemene voorwaarden</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                  {slug !== "verwerkingsreglement" && (
                    <Link
                      to="/verwerkingsreglement"
                      className="flex items-center justify-between text-muted-foreground hover:text-accent transition-colors py-0.5"
                    >
                      <span>Verwerkingsreglement</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </aside>
          )}

          {/* Legal Text Body */}
          <main className={toc.length > 0 ? "lg:col-span-8" : "lg:col-span-12"}>
            <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-10 shadow-xs">
              <div className="space-y-1">{renderFormattedContent()}</div>

              {/* Bottom Support / Questions Box */}
              <div className="mt-12 pt-6 border-t border-border/80 bg-muted/20 -mx-6 -mb-6 sm:-mx-10 sm:-mb-10 p-6 sm:p-8 rounded-b-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-display font-semibold text-foreground text-sm">
                    Vragen over dit document?
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Neem contact op met het partijbestuur of onze privacycoördinator.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to="/contact">
                    <Button variant="outline" size="sm" className="text-xs gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> Contact opnemen
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Links Footer in Page */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground px-2">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-accent" />
                <span>Lijst van Andel Steenwijkerland</span>
              </div>
              <div className="flex items-center gap-4">
                <Link to="/privacyverklaring" className="hover:text-accent transition-colors">
                  Privacyverklaring
                </Link>
                <span>•</span>
                <Link to="/algemene-voorwaarden" className="hover:text-accent transition-colors">
                  Algemene voorwaarden
                </Link>
                <span>•</span>
                <Link to="/verwerkingsreglement" className="hover:text-accent transition-colors">
                  Verwerkingsreglement
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
