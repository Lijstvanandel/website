import React, { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Copy,
  Check,
  Search,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Clock,
  Layers,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CouncilAgendaTopic, SupportDossier, DossierEvidenceItem } from "@/types/council";
import { MemberDocument } from "@/types/document";

interface SupportDossierPanelProps {
  topic: CouncilAgendaTopic;
  onDossierUpdated: (updatedTopic: CouncilAgendaTopic) => void;
  onOpenDocumentViewer: (doc: MemberDocument, initialPage?: number) => void;
  onOpenDossierTab?: (slug: string) => void;
  onAppendToInbreng?: (text: string, target: "markt" | "raad") => void;
}

export const SupportDossierPanel: React.FC<SupportDossierPanelProps> = ({
  topic,
  onDossierUpdated,
  onOpenDocumentViewer,
  onOpenDossierTab,
  onAppendToInbreng,
}) => {
  const [isCompiling, setIsCompiling] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedQuestionIdx, setCopiedQuestionIdx] = useState<number | null>(null);
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);
  const [showSourcesList, setShowSourcesList] = useState(false);
  const [resetting, setResetting] = useState(false);

  const dossier: SupportDossier | undefined = topic.compiledDossier;
  const isBespreek = topic.category === "Oordeelvorming - bespreekstukken" || topic.category.toLowerCase().includes("bespreek");

  // Compile / Recompile Handler
  const handleCompileDossier = async () => {
    setIsCompiling(true);
    setIsExpanded(true);
    try {
      const res = await fetch(`/api/council/topics/${encodeURIComponent(topic.id)}/compile-dossier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Fout bij het compileren van het ondersteuningsdossier.");
      }

      toast.success("Ondersteuningsdossier gecompileerd en gekoppeld!", {
        description: `Gekoppeld aan dossiersysteem: "${data.linkedDossier?.title || topic.title}"`,
      });

      onDossierUpdated(data.topic);
    } catch (err: any) {
      console.error("Fout bij compileren dossier:", err);
      toast.error(err.message || "Er is een fout opgetreden bij het compileren.");
    } finally {
      setIsCompiling(false);
    }
  };

  // Reset dossier handler
  const handleResetDossier = async () => {
    if (!confirm("Weet u zeker dat u dit ondersteuningsdossier wilt wissen?")) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/council/topics/${encodeURIComponent(topic.id)}/support-dossier`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.info("Ondersteuningsdossier gereset.");
        onDossierUpdated(data.topic);
      }
    } catch (err: any) {
      toast.error("Kon dossier niet resetten.");
    } finally {
      setResetting(false);
    }
  };

  const handleCopyQuestion = (question: string, idx: number) => {
    navigator.clipboard.writeText(question);
    setCopiedQuestionIdx(idx);
    toast.success("Vraag gekopieerd naar klembord!");
    setTimeout(() => setCopiedQuestionIdx(null), 2000);
  };

  const handleCopyQuote = (quote: string, id: string) => {
    navigator.clipboard.writeText(`"${quote}"`);
    setCopiedQuoteId(id);
    toast.success("Citaat gekopieerd!");
    setTimeout(() => setCopiedQuoteId(null), 2000);
  };

  // Helper to open document at exact page
  const handleVerifyAtPage = (filename: string, page: number, quote?: string) => {
    // Construct MemberDocument object for viewer
    const docObj: MemberDocument = {
      id: `doc_verify_${filename.replace(/\W+/g, "_")}`,
      title: filename.replace(/\.pdf$/i, "").replace(/^[\d\s.\-_]+/, ""),
      fileUrl: `/uploads/fractiestukken/${encodeURIComponent(filename)}`,
      fileType: "pdf",
      classification: "intern",
      description: quote ? `Verificatiepassage pagina ${page}: "${quote.slice(0, 80)}..."` : `Bronverificatie pagina ${page}`,
      pageCount: Math.max(page, 16),
      uploadedAt: new Date().toISOString(),
      uploadedBy: "Gemeente Steenwijkerland",
      tags: ["Ondersteuningsdossier", "Verificatie"],
    };

    onOpenDocumentViewer(docObj, page);
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden transition-all duration-300">
      {/* 1. Header & Compileer Blok (Het Strakke Blok met Opties) */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-accent/5 via-background to-muted/20 border-b border-border/70">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Linker info */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10.5px]">
                Agendapunt:
              </span>
              <span className="font-medium text-foreground truncate max-w-md">
                {topic.title}
              </span>
              <div className="flex items-center gap-1.5 ml-1">
                <span className="text-muted-foreground text-xs">•</span>
                <span className="font-semibold text-muted-foreground text-[10.5px]">Status:</span>
                {isBespreek ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1 animate-pulse" />
                    Bespreekstuk (Rood)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                    {topic.category || "Hamerstuk"}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero-Hallucination Garantie
              </span>
              <span>•</span>
              <span>Metadata Term Store + 3.000+ raadsstukken archief</span>
              {dossier && (
                <>
                  <span>•</span>
                  <span className="text-foreground/80 font-mono text-[11px]">
                    Gecompileerd op {new Date(dossier.compiledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Rechter actieknoppen */}
          <div className="flex items-center gap-2 shrink-0">
            {dossier && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
                title={isExpanded ? "Klap dossier in" : "Klap dossier uit"}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1 text-accent" />
                    Inklappen
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1 text-accent" />
                    Uitklappen
                  </>
                )}
              </Button>
            )}

            <Button
              type="button"
              variant={dossier ? "outline" : "default"}
              size="sm"
              disabled={isCompiling}
              onClick={handleCompileDossier}
              className={`h-9 px-4 text-xs font-semibold rounded-xl shadow-xs transition-all ${
                dossier
                  ? "border-accent/40 text-accent hover:bg-accent/10"
                  : "bg-accent hover:bg-accent/90 text-accent-foreground"
              }`}
            >
              {isCompiling ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 mr-2 animate-spin text-accent" />
                  Compileren...
                </>
              ) : dossier ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                  Hercompileer Dossier
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                  Compileer Ondersteuningsdossier
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Laadanimatie bij compileren */}
        {isCompiling && (
          <div className="mt-4 p-3.5 rounded-xl bg-accent/10 border border-accent/30 flex items-center gap-3 animate-pulse">
            <Search className="w-5 h-5 text-accent animate-spin" />
            <div className="text-xs">
              <div className="font-semibold text-foreground">
                Zoeken in archief en feiten verifiëren...
              </div>
              <div className="text-muted-foreground text-[11px] mt-0.5">
                Hybride filtering over 3.000+ raadsstukken via Term Store tags &amp; kernen, extractie van letterlijke citaten met zero-hallucination controle.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Gecompileerd Dossier Output (Uitklapbare Sectie) */}
      {dossier && isExpanded && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Dossiersysteem Koppeling Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/80">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">Gekoppeld aan Dossiersysteem: </span>
                <span className="font-bold text-foreground">
                  {topic.linkedDossierSlug ? topic.linkedDossierSlug.replace(/-/g, " ") : topic.title}
                </span>
                <span className="ml-2 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Actief gekoppeld
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {onOpenDossierTab && topic.linkedDossierSlug && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenDossierTab(topic.linkedDossierSlug!)}
                  className="h-7 text-[11px] px-2.5 rounded-lg border-accent/40 text-accent hover:bg-accent/10"
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  Open in Dossiersysteem
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                disabled={resetting}
                onClick={handleResetDossier}
                className="h-7 text-[11px] px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                title="Wissen / herstarten"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Drie Pijlers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* PIJLER A: Historische Lijn (Context) */}
            <div className="p-4 rounded-xl border border-border bg-background space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/15 text-accent font-bold text-xs flex items-center justify-center">
                      A
                    </span>
                    <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Historische Lijn
                    </h4>
                  </div>
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {dossier.historischeLijn}
                  </p>

                  {dossier.historischeLijn.includes("Geen waterdichte historische referentie") && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Strikte zero-hallucination regel actief: er worden geen aannames gedaan zonder directe archiefdekking.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-border/50 text-[10.5px] text-muted-foreground">
                Bronkoppeling: Woonagenda, Omgevingsvisie &amp; eerdere raadsbesluiten.
              </div>
            </div>

            {/* PIJLER B: De Bewijslast (Harde Feiten & Contradicties) */}
            <div className="p-4 rounded-xl border border-border bg-background space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center">
                      B
                    </span>
                    <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      De Bewijslast
                    </h4>
                  </div>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>

                {dossier.bewijslast.length === 0 ? (
                  <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-border text-center text-xs text-muted-foreground">
                    Geen harde contradicties aangetroffen in de gefilterde documenten.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dossier.bewijslast.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 space-y-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-700 dark:text-rose-300">
                            {item.type || "Contradictie"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyQuote(item.quote, item.id)}
                            className="text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-1"
                            title="Kopieer citaat"
                          >
                            {copiedQuoteId === item.id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Citaat</span>
                          </button>
                        </div>

                        {/* Finding description */}
                        <p className="text-[11.5px] font-medium text-foreground leading-snug">
                          {item.finding}
                        </p>

                        {/* Primary Source Reference */}
                        <div className="p-2 rounded bg-background/80 border border-border/70 space-y-1">
                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="font-semibold text-foreground truncate max-w-[170px]" title={item.sourceDocName}>
                              📄 {item.sourceDocName}
                            </span>
                            <span className="text-muted-foreground font-mono">
                              Pagina {item.page}
                            </span>
                          </div>
                          <p className="text-[11px] italic text-muted-foreground border-l-2 border-accent/70 pl-2">
                            "{item.quote}"
                          </p>

                          {/* CLICK-TO-VERIFY KNOP */}
                          <div className="pt-1.5 flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerifyAtPage(item.sourceDocName, item.page, item.quote)}
                              className="h-6 text-[10.5px] px-2.5 rounded border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent font-semibold flex items-center gap-1 shadow-2xs"
                            >
                              <CheckCircle2 className="w-3 h-3 text-accent" />
                              <span>Click-to-Verify (Pagina {item.page})</span>
                            </Button>
                          </div>
                        </div>

                        {/* Contradiction secondary source if present */}
                        {item.contradictionWith && (
                          <div className="p-2 rounded bg-background/80 border border-dashed border-rose-500/30 space-y-1">
                            <div className="flex items-center justify-between text-[10.5px]">
                              <span className="font-semibold text-rose-600 dark:text-rose-400 truncate max-w-[170px]" title={item.contradictionWith.sourceDocName}>
                                ⚖️ Tegenover: {item.contradictionWith.sourceDocName}
                              </span>
                              <span className="text-muted-foreground font-mono">
                                Pagina {item.contradictionWith.page}
                              </span>
                            </div>
                            <p className="text-[11px] italic text-muted-foreground border-l-2 border-rose-500/50 pl-2">
                              "{item.contradictionWith.quote}"
                            </p>

                            <div className="pt-1.5 flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleVerifyAtPage(item.contradictionWith!.sourceDocName, item.contradictionWith!.page, item.contradictionWith!.quote)}
                                className="h-6 text-[10.5px] px-2.5 rounded border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Verifieer Pagina {item.contradictionWith.page}</span>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/50 text-[10.5px] text-muted-foreground">
                Zero-Hallucination: Citaten zijn 1:1 geverifieerd tegen het PDF-archief.
              </div>
            </div>

            {/* PIJLER C: Klemzet-vragen voor de Wethouder */}
            <div className="p-4 rounded-xl border border-border bg-background space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center justify-center">
                      C
                    </span>
                    <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Klemzet-vragen Wethouder
                    </h4>
                  </div>
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                </div>

                <div className="space-y-3">
                  {dossier.klemzetVragen.map((question, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-accent text-xs">
                          #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyQuestion(question, idx)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Kopieer vraag"
                          >
                            {copiedQuestionIdx === idx ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-foreground leading-relaxed">
                        {question}
                      </p>

                      {/* Quick insert into inbreng */}
                      {onAppendToInbreng && (
                        <div className="flex items-center gap-2 pt-1 border-t border-border/40 text-[10px]">
                          <span className="text-muted-foreground">Invoegen in:</span>
                          <button
                            type="button"
                            onClick={() => onAppendToInbreng(`Vraag #${idx + 1}: ${question}\n`, "markt")}
                            className="text-accent hover:underline font-medium"
                          >
                            + Politieke Markt
                          </button>
                          <span className="text-muted-foreground">•</span>
                          <button
                            type="button"
                            onClick={() => onAppendToInbreng(`Vraag #${idx + 1}: ${question}\n`, "raad")}
                            className="text-accent hover:underline font-medium"
                          >
                            + Raadsvergadering
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-border/50 text-[10.5px] text-muted-foreground">
                Geschikt voor Politieke Markt en mondelinge vragen in de raad.
              </div>
            </div>
          </div>

          {/* Gefilterde Bronnen & Audit Trail (Hybride Zoekresultaten) */}
          <div className="pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setShowSourcesList(!showSourcesList)}
              className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground py-1"
            >
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-accent" />
                <span>
                  Geraadpleegde Archiefstukken via Hybride Zoekopdracht ({dossier.gefilterdeDocumenten.length} documenten)
                </span>
              </div>
              {showSourcesList ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showSourcesList && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {dossier.gefilterdeDocumenten.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-border/70 bg-card/60 text-xs flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate" title={doc.title}>
                        {doc.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5" title={doc.filename}>
                        {doc.filename}
                      </div>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] bg-muted font-medium text-muted-foreground">
                          {doc.dossier}
                        </span>
                        {doc.matchedTags?.slice(0, 2).map((t, i) => (
                          <span key={i} className="px-1.5 py-0.2 rounded text-[9.5px] bg-accent/10 text-accent font-medium">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleVerifyAtPage(doc.filename, 1)}
                      className="h-7 w-7 p-0 shrink-0 text-accent hover:bg-accent/10"
                      title="Bekijk archiefstuk"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
