import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ThumbsUp,
  ThumbsDown,
  Scale,
  BookOpen,
  Sparkles,
  ExternalLink,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit3,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Tag,
  X,
  FileText,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type {
  CouncilAgendaTopic,
  CouncilDocument,
  MatchedStandpunt,
  StandpuntStance,
} from "@/types/council";
import { hoofdstukken } from "@/data/partijprogramma";

interface TopicStandpuntenSectionProps {
  topic: CouncilAgendaTopic;
  token?: string | null;
  onTopicUpdated: (updatedTopic: CouncilAgendaTopic) => void;
  onOpenDocumentViewer?: (doc: CouncilDocument) => void;
}

export function TopicStandpuntenSection({
  topic,
  token,
  onTopicUpdated,
  onOpenDocumentViewer,
}: TopicStandpuntenSectionProps) {
  const [filterStance, setFilterStance] = useState<"all" | "positief" | "negatief" | "genuanceerd">("all");
  const [expandedQuotes, setExpandedQuotes] = useState<Record<string, boolean>>({});
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Manual standpoint modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedHoofdstukNr, setSelectedHoofdstukNr] = useState<number>(1);
  const [selectedStandpuntNr, setSelectedStandpuntNr] = useState<number>(1);
  const [newStance, setNewStance] = useState<StandpuntStance>("negatief");
  const [customExplanation, setCustomExplanation] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);

  const matched = topic.matchedStandpunten || [];
  const summary = topic.standpuntSummary || {
    total: matched.length,
    positiefCount: matched.filter((m) => m.stance === "positief").length,
    negatiefCount: matched.filter((m) => m.stance === "negatief").length,
    genuanceerdCount: matched.filter((m) => m.stance === "genuanceerd").length,
    primaryStance:
      matched.filter((m) => m.stance === "negatief").length > 0 &&
      matched.filter((m) => m.stance === "positief").length > 0
        ? "gemengd"
        : matched.filter((m) => m.stance === "negatief").length > 0
        ? "negatief"
        : matched.filter((m) => m.stance === "positief").length > 0
        ? "positief"
        : "neutraal",
  };

  const filteredStandpunten = useMemo(() => {
    if (filterStance === "all") return matched;
    return matched.filter((m) => m.stance === filterStance);
  }, [matched, filterStance]);

  const toggleQuote = (id: string) => {
    setExpandedQuotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // AI Deep Analysis
  const handleRunAiAnalysis = async () => {
    if (!token) return;
    setIsAiAnalyzing(true);
    setAiError(null);
    setAiSuccessMessage(null);

    try {
      const res = await fetch(`/api/council/topics/${topic.id}/standpunten/ai-analyze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fout bij uitvoeren van AI-analyse.");
      }

      if (data.topic) {
        onTopicUpdated(data.topic);
      }
      setAiSuccessMessage(data.message || "Partijprogramma AI-analyse succesvol bijgewerkt!");
      setTimeout(() => setAiSuccessMessage(null), 5000);
    } catch (err: any) {
      setAiError(err.message || "Fout bij uitvoeren AI analyse.");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Save manual standpoint
  const handleSaveManualStandpunt = async () => {
    if (!token) return;
    setIsSavingManual(true);

    try {
      const h = hoofdstukken.find((item) => item.nr === selectedHoofdstukNr);
      const sp = h?.standpunten.find((item) => item.nr === selectedStandpuntNr);

      const newEntry: MatchedStandpunt = {
        id: `${topic.id}_manual_h${selectedHoofdstukNr}_s${selectedStandpuntNr}_${Date.now()}`,
        hoofdstukNr: selectedHoofdstukNr,
        hoofdstukTitel: h?.titel || `Hoofdstuk ${selectedHoofdstukNr}`,
        standpuntNr: selectedStandpuntNr,
        standpuntTitel: sp?.titel || `Standpunt ${selectedStandpuntNr}`,
        standpuntText: sp?.beschrijving || "",
        stance: newStance,
        explanation:
          customExplanation.trim() ||
          `Lijst van Andel neemt een ${newStance} standpunt in conform ${h?.titel} - Standpunt ${selectedStandpuntNr}.`,
        relevanceScore: 100,
        matchedKeywords: ["Handmatig gekoppeld"],
        manuallyAdjusted: true,
        adjustedBy: "Fractielid",
        adjustedAt: new Date().toISOString(),
      };

      // Filter out duplicate if already exists
      const existing = matched.filter(
        (m) => !(m.hoofdstukNr === selectedHoofdstukNr && m.standpuntNr === selectedStandpuntNr)
      );
      const updatedList = [newEntry, ...existing];

      const res = await fetch(`/api/council/topics/${topic.id}/standpunten`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchedStandpunten: updatedList,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fout bij opslaan van standpunt.");
      }

      if (data.topic) {
        onTopicUpdated(data.topic);
      }
      setIsAddModalOpen(false);
      setCustomExplanation("");
    } catch (err: any) {
      alert("Fout bij opslaan: " + err.message);
    } finally {
      setIsSavingManual(false);
    }
  };

  // Remove standpoint
  const handleRemoveStandpunt = async (itemToRemove: MatchedStandpunt) => {
    if (!token) return;
    if (!confirm(`Weet je zeker dat je standpunt '${itemToRemove.standpuntTitel}' wilt ontkoppelen?`)) return;

    try {
      const updatedList = matched.filter((m) => m.id !== itemToRemove.id);
      const res = await fetch(`/api/council/topics/${topic.id}/standpunten`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchedStandpunten: updatedList,
        }),
      });

      const data = await res.json();
      if (res.ok && data.topic) {
        onTopicUpdated(data.topic);
      }
    } catch (err: any) {
      alert("Fout bij verwijderen: " + err.message);
    }
  };

  const currentChapter = hoofdstukken.find((h) => h.nr === selectedHoofdstukNr);

  return (
    <section
      id="topic-standpunten-section"
      className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="space-y-1 min-w-0 max-w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 rounded-lg bg-accent/10 text-accent shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm sm:text-base text-foreground flex items-center gap-2 flex-wrap">
              <span>Partijprogramma & Standpunten</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-mono font-medium">
                {matched.length} gekoppeld
              </span>
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Direct inzicht in welke standpunten van <strong className="font-medium text-foreground">Lijst van Andel</strong> positief, negatief of genuanceerd aansluiten op dit onderwerp en de vergaderstukken.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0 max-w-full">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleRunAiAnalysis}
            disabled={isAiAnalyzing}
            className="h-8 text-xs px-2.5 border-accent/40 text-accent hover:bg-accent/10 rounded-lg gap-1.5"
            title="Scan alle raadsstukken en koppel alle relevante standpunten van Lijst van Andel (meerdere standpunten tegelijk via Gemini)"
          >
            {isAiAnalyzing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 text-accent" />
            )}
            <span>{isAiAnalyzing ? "Stukken scannen..." : "Stukken Scannen (AI)"}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsAddModalOpen(true)}
            className="h-8 text-xs px-2.5 rounded-lg gap-1 border-border text-foreground hover:bg-muted"
            title="Handmatig een partijstandpunt toevoegen of koppelen"
          >
            <Plus className="w-3 h-3" />
            <span>Koppelen</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            asChild
            className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground rounded-lg border border-border/50 hover:bg-muted/60 gap-1.5"
          >
            <Link to="/standpunten" target="_blank" title="Bekijk het volledige verkiezingsprogramma van Lijst van Andel">
              <BookOpen className="w-3.5 h-3.5 text-accent" />
              <span>Standpunten</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </Link>
          </Button>
        </div>
      </div>

      {/* AI Alert Messages */}
      {aiSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{aiSuccessMessage}</span>
        </div>
      )}
      {aiError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{aiError}</span>
        </div>
      )}

      {/* Primary Stance Banner */}
      <div
        className={`p-4 rounded-xl border transition-all ${
          summary.primaryStance === "negatief"
            ? "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100"
            : summary.primaryStance === "positief"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
            : summary.primaryStance === "gemengd"
            ? "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
            : "bg-muted/40 border-border text-foreground"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                summary.primaryStance === "negatief"
                  ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                  : summary.primaryStance === "positief"
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : summary.primaryStance === "gemengd"
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {summary.primaryStance === "negatief" ? (
                <ThumbsDown className="w-5 h-5" />
              ) : summary.primaryStance === "positief" ? (
                <ThumbsUp className="w-5 h-5" />
              ) : summary.primaryStance === "gemengd" ? (
                <Scale className="w-5 h-5" />
              ) : (
                <HelpCircle className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs uppercase tracking-wider">
                  Lijst van Andel Stellingname:
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    summary.primaryStance === "negatief"
                      ? "bg-rose-600 text-white shadow-xs"
                      : summary.primaryStance === "positief"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : summary.primaryStance === "gemengd"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  {summary.primaryStance === "negatief"
                    ? "Kritisch / Negatief (Tegen)"
                    : summary.primaryStance === "positief"
                    ? "Positief / Ondersteunend (Voor)"
                    : summary.primaryStance === "gemengd"
                    ? "Gemengd / Genuanceerd"
                    : "Neutraal / Nog te bepalen"}
                </span>
              </div>

              <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90">
                {summary.summaryText || (
                  summary.primaryStance === "negatief"
                    ? `Lijst van Andel staat kritisch of afwijzend tegenover dit voorstel op basis van ${summary.negatiefCount} partijstandpunt(en).`
                    : summary.primaryStance === "positief"
                    ? `Lijst van Andel ondersteunt dit initiatief op basis van ${summary.positiefCount} partijstandpunt(en).`
                    : summary.primaryStance === "gemengd"
                    ? `Lijst van Andel herkent zowel positieve elementen (${summary.positiefCount}) als kritische aandachtspunten (${summary.negatiefCount}) in dit voorstel.`
                    : "Er is nog geen directe match met het partijprogramma gevonden. Klik op 'AI Analyse' om de inhoud diep te toetsen."
                )}
              </p>
            </div>
          </div>

          {/* Counts pill cluster */}
          <div className="flex items-center gap-1.5 shrink-0">
            {summary.negatiefCount > 0 && (
              <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1">
                <ThumbsDown className="w-3 h-3" />
                {summary.negatiefCount}
              </span>
            )}
            {summary.positiefCount > 0 && (
              <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                {summary.positiefCount}
              </span>
            )}
            {summary.genuanceerdCount > 0 && (
              <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Scale className="w-3 h-3" />
                {summary.genuanceerdCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs if multiple matched */}
      {matched.length > 1 && (
        <div className="flex items-center gap-1.5 border-b border-border pb-2 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterStance("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              filterStance === "all"
                ? "bg-accent text-accent-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Alle standpunten ({matched.length})
          </button>
          {summary.negatiefCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterStance("negatief")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                filterStance === "negatief"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
              }`}
            >
              <ThumbsDown className="w-3 h-3" />
              Kritisch / Negatief ({summary.negatiefCount})
            </button>
          )}
          {summary.positiefCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterStance("positief")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                filterStance === "positief"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
              Positief / Voor ({summary.positiefCount})
            </button>
          )}
          {summary.genuanceerdCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterStance("genuanceerd")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                filterStance === "genuanceerd"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              }`}
            >
              <Scale className="w-3 h-3" />
              Genuanceerd ({summary.genuanceerdCount})
            </button>
          )}
        </div>
      )}

      {/* List of Matched Standpoints */}
      {filteredStandpunten.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-muted/20 border border-dashed border-border space-y-2">
          <BookOpen className="w-6 h-6 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground">
            {matched.length === 0
              ? "Nog geen specifieke partijstandpunten gematcht aan dit agendapunt. Klik op 'AI Analyse' of 'Standpunt Koppelen'."
              : "Geen standpunten gevonden voor het geselecteerde filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStandpunten.map((m) => {
            const isExpanded = !!expandedQuotes[m.id];
            const isNegative = m.stance === "negatief";
            const isPositive = m.stance === "positief";
            const isNuanced = m.stance === "genuanceerd";

            return (
              <div
                key={m.id}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                  isNegative
                    ? "bg-rose-500/[0.04] border-rose-500/25 hover:border-rose-500/40"
                    : isPositive
                    ? "bg-emerald-500/[0.04] border-emerald-500/25 hover:border-emerald-500/40"
                    : "bg-amber-500/[0.04] border-amber-500/25 hover:border-amber-500/40"
                }`}
              >
                {/* Standpoint Title & Stance Badge */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Chapter badge */}
                      <span className="text-[10.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/80">
                        Hoofdstuk {m.hoofdstukNr}: {m.hoofdstukTitel}
                      </span>
                      {/* Standpoint number badge */}
                      <span className="text-[10.5px] font-mono font-medium text-muted-foreground">
                        Standpunt #{m.standpuntNr}
                      </span>
                      {m.manuallyAdjusted && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-accent/15 text-accent font-medium">
                          {m.adjustedBy ? `Aangepast door ${m.adjustedBy}` : "Handmatig"}
                        </span>
                      )}
                    </div>

                    <h4 className="font-semibold text-sm text-foreground">
                      {m.standpuntTitel}
                    </h4>
                  </div>

                  {/* Stance Pill */}
                  <div className="flex items-center gap-1.5 shrink-0 self-start">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider ${
                        isNegative
                          ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                          : isPositive
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {isNegative ? (
                        <>
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>Negatief / Tegen</span>
                        </>
                      ) : isPositive ? (
                        <>
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Positief / Voor</span>
                        </>
                      ) : (
                        <>
                          <Scale className="w-3.5 h-3.5" />
                          <span>Genuanceerd</span>
                        </>
                      )}
                    </span>

                    {/* Delete button if manual */}
                    {m.manuallyAdjusted && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStandpunt(m)}
                        className="p-1 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                        title="Standpunt ontkoppelen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Explanation: Lijst van Andel's direct position on this agenda topic */}
                <div className="text-xs text-foreground/90 font-medium leading-relaxed bg-background/80 p-3 rounded-lg border border-border/70 mb-2">
                  <div className="flex items-start gap-2">
                    <span className="text-accent font-bold shrink-0">Fractielijn:</span>
                    <span>{m.explanation}</span>
                  </div>
                </div>

                {/* Scanned Document Passage */}
                {m.citedPassage && (
                  <div className="text-xs bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-foreground/90 p-2.5 rounded-lg mb-2 flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-800 dark:text-amber-300 block text-[11px] mb-0.5">
                        Gevonden passage in gescande stukken:
                      </span>
                      <span className="italic text-[11.5px] leading-relaxed">"{m.citedPassage}"</span>
                    </div>
                  </div>
                )}

                {/* Party Program Original Quote (expandable) */}
                {m.standpuntText && (
                  <div className="text-xs space-y-1 mt-2">
                    <button
                      type="button"
                      onClick={() => toggleQuote(m.id)}
                      className="text-[11px] font-medium text-accent hover:underline flex items-center gap-1"
                    >
                      <span>
                        {isExpanded ? "Verberg officiële partijprogramma tekst" : "Toon officiële partijprogramma tekst"}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {isExpanded && (
                      <blockquote className="p-3 rounded-lg bg-muted/40 border-l-2 border-accent text-[11.5px] italic text-muted-foreground leading-relaxed mt-1">
                        "{m.standpuntText}"
                      </blockquote>
                    )}
                  </div>
                )}

                {/* Footer: matched keywords, documents and direct link to /standpunten */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-2 border-t border-border/50 text-[11px]">
                  {/* Keywords */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
                    {m.matchedKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.2 rounded text-[10px] bg-muted text-muted-foreground"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>

                  {/* Link directly to /standpunten with chapter & standpoint */}
                  <Link
                    to={`/standpunten?hoofdstuk=${m.hoofdstukNr}&standpunt=${m.standpuntNr}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-accent font-medium hover:underline text-[11px]"
                  >
                    <span>Bekijk standpunt #{m.standpuntNr} in /standpunten</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {/* Specific Vergaderstukken matched to this standpoint */}
                {topic.documents && topic.documents.some((d) =>
                  d.matchedStandpunten?.some(
                    (dsp) => dsp.hoofdstukNr === m.hoofdstukNr && dsp.standpuntNr === m.standpuntNr
                  )
                ) && (
                  <div className="mt-2.5 pt-2 border-t border-border/40">
                    <span className="text-[10.5px] font-medium text-muted-foreground block mb-1">
                      Direct gekoppelde raadsstukken:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {topic.documents
                        .filter((d) =>
                          d.matchedStandpunten?.some(
                            (dsp) => dsp.hoofdstukNr === m.hoofdstukNr && dsp.standpuntNr === m.standpuntNr
                          )
                        )
                        .map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => onOpenDocumentViewer && onOpenDocumentViewer(d)}
                            className="inline-flex items-center gap-1 px-2 py-0.8 rounded text-[10.5px] bg-background border border-border/80 hover:border-accent hover:text-accent transition-colors"
                          >
                            <FileText className="w-3 h-3 text-accent shrink-0" />
                            <span className="truncate max-w-[220px]">{d.title}</span>
                            <Eye className="w-2.5 h-2.5 opacity-70" />
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Standpunt handmatig koppelen */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-4 h-4 text-accent" />
              <span>Standpunt Koppelen aan Agendapunt</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Koppel een officieel standpunt uit het verkiezingsprogramma aan dit raadsvoorstel en geef aan of Lijst van Andel positief, negatief of genuanceerd staat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Hoofdstuk Kiezen */}
            <div className="space-y-1.5">
              <Label className="text-xs">Hoofdstuk uit Partijprogramma</Label>
              <Select
                value={String(selectedHoofdstukNr)}
                onValueChange={(val) => {
                  const num = Number(val);
                  setSelectedHoofdstukNr(num);
                  setSelectedStandpuntNr(1);
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hoofdstukken.map((h) => (
                    <SelectItem key={h.nr} value={String(h.nr)} className="text-xs">
                      Hoofdstuk {h.nr}: {h.titel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Standpunt Kiezen */}
            <div className="space-y-1.5">
              <Label className="text-xs">Specifiek Standpunt</Label>
              <Select
                value={String(selectedStandpuntNr)}
                onValueChange={(val) => setSelectedStandpuntNr(Number(val))}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {currentChapter?.standpunten.map((sp) => (
                    <SelectItem key={sp.nr} value={String(sp.nr)} className="text-xs">
                      #{sp.nr}: {sp.titel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stance Kiezen */}
            <div className="space-y-1.5">
              <Label className="text-xs">Stellingname t.a.v. dit agendapunt</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNewStance("negatief")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    newStance === "negatief"
                      ? "bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500"
                      : "bg-card border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <ThumbsDown className="w-4 h-4 text-rose-600" />
                  <span>Negatief / Tegen</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewStance("positief")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    newStance === "positief"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500"
                      : "bg-card border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <ThumbsUp className="w-4 h-4 text-emerald-600" />
                  <span>Positief / Voor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewStance("genuanceerd")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    newStance === "genuanceerd"
                      ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500"
                      : "bg-card border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Scale className="w-4 h-4 text-amber-600" />
                  <span>Genuanceerd</span>
                </button>
              </div>
            </div>

            {/* Toelichting / Fractielijn */}
            <div className="space-y-1.5">
              <Label className="text-xs">Fractie Toelichting / Rationale (Optioneel)</Label>
              <Textarea
                placeholder="Waarom neemt de fractie deze positie in t.a.v. dit agendapunt en deze stukken?"
                value={customExplanation}
                onChange={(e) => setCustomExplanation(e.target.value)}
                className="text-xs min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              className="text-xs"
            >
              Annuleren
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveManualStandpunt}
              disabled={isSavingManual}
              className="text-xs bg-accent text-accent-foreground"
            >
              {isSavingManual ? "Opslaan..." : "Standpunt Toevoegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
