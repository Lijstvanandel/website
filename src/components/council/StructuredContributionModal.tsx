import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  Pencil,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  Layers,
  Flame,
  Target,
  CornerDownRight,
  Shield,
  Zap,
  Lock,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { CouncilStructuredContribution } from "@/types/council";

interface StructuredContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicTitle: string;
  type: "politieke_markt" | "raadsvergadering";
  initialStructured?: CouncilStructuredContribution | null;
  initialRawText?: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
  status?: string;
  onSave: (payload: {
    rawText: string;
    structured: CouncilStructuredContribution;
    markAsHamerstuk?: boolean;
  }) => Promise<void>;
  isSaving: boolean;
}

export function StructuredContributionModal({
  isOpen,
  onClose,
  topicTitle,
  type,
  initialStructured,
  initialRawText = "",
  updatedAt,
  updatedBy,
  status,
  onSave,
  isSaving,
}: StructuredContributionModalProps) {
  // Determine if a contribution has already been completed
  const hasExistingContribution = useMemo(() => {
    if (initialStructured) {
      return Boolean(
        initialStructured.pijn ||
        initialStructured.eis ||
        initialStructured.pivot ||
        initialStructured.spons ||
        initialStructured.klemzet ||
        initialStructured.dictum
      );
    }
    return Boolean(initialRawText && initialRawText.trim().length > 0);
  }, [initialStructured, initialRawText]);

  // View vs Edit Mode
  const [isEditing, setIsEditing] = useState(!hasExistingContribution);

  // 6 Input fields state
  const [pijn, setPijn] = useState("");
  const [eis, setEis] = useState("");
  const [pivot, setPivot] = useState("");
  const [spons, setSpons] = useState("");
  const [klemzet, setKlemzet] = useState("");
  const [dictum, setDictum] = useState("");

  const [copiedSpeech, setCopiedSpeech] = useState(false);

  // Collapsible state for Spreektekst & Debatstrategie guides (standaard ingeklapt)
  const [showStrategyGuides, setShowStrategyGuides] = useState(false);
  const [individualGuides, setIndividualGuides] = useState<{ [key: string]: boolean }>({
    spons: false,
    klemzet: false,
    dictum: false,
  });

  const toggleGuide = (key: string) => {
    setIndividualGuides((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Sync inputs whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      if (initialStructured) {
        setPijn(initialStructured.pijn || "");
        setEis(initialStructured.eis || "");
        setPivot(initialStructured.pivot || "");
        setSpons(initialStructured.spons || "");
        setKlemzet(initialStructured.klemzet || "");
        setDictum(initialStructured.dictum || "");
        setIsEditing(
          !(
            (initialStructured.pijn?.trim().length || 0) >= 8 &&
            (initialStructured.eis?.trim().length || 0) >= 8 &&
            (initialStructured.pivot?.trim().length || 0) >= 8 &&
            (initialStructured.spons?.trim().length || 0) >= 8 &&
            (initialStructured.klemzet?.trim().length || 0) >= 8 &&
            (initialStructured.dictum?.trim().length || 0) >= 8
          )
        );
      } else if (initialRawText) {
        // Fallback for older unstructured contributions
        setSpons(initialRawText);
        setPijn("");
        setEis("");
        setPivot("");
        setKlemzet("");
        setDictum("");
        setIsEditing(false);
      } else {
        setPijn("");
        setEis("");
        setPivot("");
        setSpons("");
        setKlemzet("");
        setDictum("");
        setIsEditing(true);
      }
      setCopiedSpeech(false);
    }
  }, [isOpen, initialStructured, initialRawText]);

  // Validation: each field must have at least 8 characters
  const isPijnValid = pijn.trim().length >= 8;
  const isEisValid = eis.trim().length >= 8;
  const isPivotValid = pivot.trim().length >= 8;
  const isSponsValid = spons.trim().length >= 8;
  const isKlemzetValid = klemzet.trim().length >= 8;
  const isDictumValid = dictum.trim().length >= 8;

  const validFieldsCount = [
    isPijnValid,
    isEisValid,
    isPivotValid,
    isSponsValid,
    isKlemzetValid,
    isDictumValid,
  ].filter(Boolean).length;

  const isAllValid = validFieldsCount === 6;

  // Handle Save ('Maak bijdrage')
  const handleMakeContribution = async (markAsHamerstuk?: boolean) => {
    if (!isAllValid) return;

    const structured: CouncilStructuredContribution = {
      pijn: pijn.trim(),
      eis: eis.trim(),
      pivot: pivot.trim(),
      spons: spons.trim(),
      klemzet: klemzet.trim(),
      dictum: dictum.trim(),
    };

    // Compile the 3-part debate speech into composite text for external compatibility
    const compiledSpeech = `[SPONS]\n${spons.trim()}\n\n[KLEMZET]\n${klemzet.trim()}\n\n[DICTUM]\n${dictum.trim()}`;

    await onSave({
      rawText: compiledSpeech,
      structured,
      markAsHamerstuk,
    });

    setIsEditing(false);
    toast.success("Bijdrage succesvol aangemaakt en opgeslagen in de kluis!");
  };

  // Copy composite speech to clipboard for speaker podium
  const handleCopySpeech = () => {
    const textToCopy = `SPREEKTEKST: ${topicTitle} (${type === "politieke_markt" ? "Politieke Markt" : "Raadsvergadering"})\n\n` +
      `--- DEEL 1: SPONS ---\n${spons.trim()}\n\n` +
      `--- DEEL 2: KLEMZET ---\n${klemzet.trim()}\n\n` +
      `--- DEEL 3: HET DICTUM ---\n${dictum.trim()}\n\n` +
      `[TERUGVALPOSITIE / PIVOT]\n${pivot.trim()}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedSpeech(true);
    toast.success("Volledige spreektekst gekopieerd naar klembord!");
    setTimeout(() => setCopiedSpeech(false), 2500);
  };

  const isPM = type === "politieke_markt";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[96vw] max-h-[92vh] flex flex-col p-4 sm:p-6 bg-card border-border rounded-2xl shadow-xl">
        <DialogHeader className="pb-3 border-b border-border shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  isPM
                    ? "bg-accent/15 text-accent border-accent/30"
                    : "bg-primary/15 text-primary border-primary/30"
                }`}
              >
                {isPM ? "Politieke Markt" : "Raadsvergadering"}
              </span>

              {status === "hamerstuk_afgehandeld" && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Hamerstuk
                </span>
              )}

              {!isEditing && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  Volledige 6-vaks bijdrage opgeslagen
                </span>
              )}
            </div>

            {/* View Mode Toolbar Buttons */}
            {!isEditing && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopySpeech}
                  className="h-8 text-xs font-semibold gap-1.5 border-border bg-card hover:bg-muted"
                  title="Kopieer de 3-delige spreektekst voor op het spreekgestoelte"
                >
                  {copiedSpeech ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Gekopieerd</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Kopieer Spreektekst</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 text-xs font-semibold gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 shadow-xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Bewerken</span>
                </Button>
              </div>
            )}
          </div>

          <DialogTitle className="text-lg sm:text-xl font-display font-bold leading-snug line-clamp-1">
            Bijdrage {isPM ? "Politieke Markt" : "Raadsvergadering"}: {topicTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEditing
              ? "Vul de 6 vakken in (minimaal 8 tekens elk). Boven verticaal: Pijn, Eis, Pivot. Onder horizontaal: Spons, Klemzet, Het Dictum."
              : "Hieronder ziet u de complete bijdrage: de strategische analyse erboven en de 3-delige spreektekst eronder."}
          </DialogDescription>
        </DialogHeader>

        {/* ========================================================================= */}
        {/* MAIN BODY: VIEW MODE OR EDIT MODE */}
        {/* ========================================================================= */}
        <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-6 pr-1">
          {/* ------------------------------------------------------------------- */}
          {/* VIEW MODE: Gestructureerde weergave van de bijdrage                 */}
          {/* ------------------------------------------------------------------- */}
          {!isEditing ? (
            <div className="space-y-6">
              {/* DEEL 1: Pijn, Eis, Pivot (Verticaal bovenaan) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Layers className="w-3.5 h-3.5 text-accent" />
                    <span>Strategische Analyse & Terugvalpositie</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">Bovenzijde (Verticaal)</span>
                </div>

                <div className="space-y-3">
                  {/* Pijn Card */}
                  <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        De Pijn
                      </span>
                      <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80">Participatie, Financiën, Betrokkenheid, College</span>
                    </div>
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans bg-background/60 p-2.5 rounded-lg border border-amber-500/15">
                      {pijn || <span className="italic text-muted-foreground">Nog niet ingevuld</span>}
                    </p>
                  </div>

                  {/* Eis Card */}
                  <div className="p-3.5 rounded-xl border border-sky-500/25 bg-sky-500/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-sky-500" />
                        De Eis
                      </span>
                      <span className="text-[10px] text-sky-700/80 dark:text-sky-300/80">Voorwaarden waaraan het bespreekstuk moet voldoen</span>
                    </div>
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans bg-background/60 p-2.5 rounded-lg border border-sky-500/15">
                      {eis || <span className="italic text-muted-foreground">Nog niet ingevuld</span>}
                    </p>
                  </div>

                  {/* Pivot Card */}
                  <div className="p-3.5 rounded-xl border border-violet-500/25 bg-violet-500/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
                        <CornerDownRight className="w-3.5 h-3.5 text-violet-500" />
                        De Pivot (Terugvalpositie)
                      </span>
                      <span className="text-[10px] text-violet-700/80 dark:text-violet-300/80">Terugvaltekst bij onverwachte inkomende vragen</span>
                    </div>
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans bg-background/60 p-2.5 rounded-lg border border-violet-500/15">
                      {pivot || <span className="italic text-muted-foreground">Nog niet ingevuld</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* DEEL 2: Spons, Klemzet, Dictum (Horizontaal in 3 Kolommen) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Zap className="w-3.5 h-3.5 text-accent" />
                    <span>Spreektekst & Debatvoering (In 3 Delen)</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">Onderzijde (Horizontaal)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Kolom 1: Spons */}
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                        <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-emerald-500" />
                          1. Spons
                        </span>
                        <span className="text-[9.5px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          Deel 1
                        </span>
                      </div>
                      <div className="text-[10.5px] text-emerald-800/80 dark:text-emerald-300/80 italic leading-snug">
                        Valideer intentie & masseer ego van tegenstander. Geen aanval, geen excuses.
                      </div>
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans bg-background/70 p-3 rounded-lg border border-emerald-500/20 min-h-[120px]">
                        {spons || <span className="italic text-muted-foreground">Nog niet ingevuld</span>}
                      </p>
                    </div>
                  </div>

                  {/* Kolom 2: Klemzet */}
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                        <span className="font-bold text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          2. Klemzet
                        </span>
                        <span className="text-[9.5px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          Deel 2
                        </span>
                      </div>
                      <div className="text-[10.5px] text-amber-800/80 dark:text-amber-300/80 italic leading-snug">
                        Columbo-tactiek & procedurele verbazing gewapend met harde datapunten.
                      </div>
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans bg-background/70 p-3 rounded-lg border border-amber-500/20 min-h-[120px]">
                        {klemzet || <span className="italic text-muted-foreground">Nog niet ingevuld</span>}
                      </p>
                    </div>
                  </div>

                  {/* Kolom 3: Dictum */}
                  <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                        <span className="font-bold text-xs text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-rose-500" />
                          3. Het Dictum
                        </span>
                        <span className="text-[9.5px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300">
                          Deel 3
                        </span>
                      </div>
                      <div className="text-[10.5px] text-rose-800/80 dark:text-rose-300/80 italic leading-snug">
                        Geen ontsnappingsluik. Gesloten, binaire ja/nee vraag of snoeiharde eis.
                      </div>
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans bg-background/70 p-3 rounded-lg border border-rose-500/20 min-h-[120px]">
                        {dictum || <span className="italic text-muted-foreground">Nog niet ingevuld</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamp metadata */}
              {updatedAt && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Laatst gewijzigd door {updatedBy || "onbekend"} op{" "}
                    {new Date(updatedAt).toLocaleString("nl-NL")}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* ------------------------------------------------------------------- */
            /* EDIT MODE: De 6 invulvakken                                         */
            /* ------------------------------------------------------------------- */
            <div className="space-y-6">
              {/* SECTIE 1: DE DRIE VERTICALE VAKKEN (Pijn, Eis, Pivot) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-border">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-accent"></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      1. Strategische Voorbereiding (Verticaal)
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Pijn, Eis en Pivot als fundament vóór het debat
                  </span>
                </div>

                {/* VAK 1: DE PIJN */}
                <div className="space-y-1.5 p-3.5 rounded-xl bg-card border border-border/80 focus-within:border-accent transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>De Pijn</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <span
                      className={`text-[10.5px] font-mono px-2 py-0.2 rounded ${
                        isPijnValid
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {pijn.trim().length} / min. 8 tekens {isPijnValid ? "✓" : ""}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-normal">
                    Beschrijf hier waar de pijn zit in het bespreekstuk, denk aan participatie, financiën, betrokkenheid, handelen van het college.
                  </p>
                  <Textarea
                    rows={3}
                    value={pijn}
                    onChange={(e) => setPijn(e.target.value)}
                    placeholder="Waar wringt de schoen? Bijv. 'De participatieprocedure is pas gestart na het definitieve collegebesluit; omwonenden zijn buitenspel gezet en de kosten zijn 40% hoger uitgevallen'..."
                    className="text-xs bg-background resize-y"
                  />
                </div>

                {/* VAK 2: DE EIS */}
                <div className="space-y-1.5 p-3.5 rounded-xl bg-card border border-border/80 focus-within:border-accent transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-sky-500" />
                      <span>De Eis</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <span
                      className={`text-[10.5px] font-mono px-2 py-0.2 rounded ${
                        isEisValid
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {eis.trim().length} / min. 8 tekens {isEisValid ? "✓" : ""}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-normal">
                    Beschrijf hier onder welke voorwaarden het bespreekstuk voldoet aan jouw eisen
                  </p>
                  <Textarea
                    rows={3}
                    value={eis}
                    onChange={(e) => setEis(e.target.value)}
                    placeholder="Onder welke voorwaarden kan Lijst van Andel instemmen? Bijv. '1. Een harde dekkingsbron binnen de begroting; 2. Een bindend referendum onder omwonenden; 3. Geen extra OZB-verhoging'..."
                    className="text-xs bg-background resize-y"
                  />
                </div>

                {/* VAK 3: DE PIVOT */}
                <div className="space-y-1.5 p-3.5 rounded-xl bg-card border border-border/80 focus-within:border-accent transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CornerDownRight className="w-3.5 h-3.5 text-violet-500" />
                      <span>De Pivot (Terugvalpositie)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <span
                      className={`text-[10.5px] font-mono px-2 py-0.2 rounded ${
                        isPivotValid
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {pivot.trim().length} / min. 8 tekens {isPivotValid ? "✓" : ""}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-normal">
                    Schrijf hier de tekst waar je op terugvalt wanneer je het antwoord niet weet op de inkomende vraag.
                  </p>
                  <Textarea
                    rows={3}
                    value={pivot}
                    onChange={(e) => setPivot(e.target.value)}
                    placeholder="Jouw veilige uitwijktekst. Bijv. 'Voorzitter, juist omdat die details nog niet door het college zijn aangeleverd, is het nu onverantwoord om akkoord te gaan. Laten we eerst de feiten op tafel krijgen'..."
                    className="text-xs bg-background resize-y"
                  />
                </div>
              </div>

              {/* SECTIE 2: DE DRIE HORIZONTALE VAKKEN (Spons, Klemzet, Het Dictum) */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between pb-1 border-b border-border gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      2. Spreektekst & Debatstrategie (Horizontaal, 3 Delen)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      Spons, Klemzet en Het Dictum in 3 opeenvolgende stappen
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const next = !showStrategyGuides;
                        setShowStrategyGuides(next);
                        setIndividualGuides({ spons: next, klemzet: next, dictum: next });
                      }}
                      className="h-6 px-2 text-[10.5px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {showStrategyGuides ? (
                        <>
                          <ChevronUp className="w-3 h-3" />
                          <span>Toelichtingen inklappen</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          <span>Toelichtingen uitklappen</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                  {/* VAK 4: SPONS */}
                  <div className="space-y-2 p-3.5 rounded-xl bg-card border border-border/80 focus-within:border-emerald-500/60 flex flex-col justify-between transition-all">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Deel 1: Spons</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                            isSponsValid
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {spons.trim().length} / min. 8 {isSponsValid ? "✓" : ""}
                        </span>
                      </div>

                      {/* Collapsible toggle & text */}
                      <button
                        type="button"
                        onClick={() => toggleGuide("spons")}
                        className="text-[10.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors"
                      >
                        <HelpCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{(showStrategyGuides || individualGuides.spons) ? "Richtlijn inklappen" : "Bekijk richtlijn"}</span>
                        {(showStrategyGuides || individualGuides.spons) ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {(showStrategyGuides || individualGuides.spons) && (
                        <p className="text-[11px] text-muted-foreground leading-normal p-2 rounded-lg bg-muted/40 border border-border/50 animate-in fade-in duration-150">
                          Je opent nóóit met een aanval, en je opent nooit met een verontschuldiging. Je neemt je ruimte in en masseert het ego van de tegenstander door hun intentie te valideren.
                        </p>
                      )}
                    </div>
                    <Textarea
                      rows={7}
                      value={spons}
                      onChange={(e) => setSpons(e.target.value)}
                      placeholder="Voorzitter, we waarderen de inzet van de wethouder om dit dossier met ambitie op te pakken. Iedereen in deze zaal deelt immers het doel om onze dorpen leefbaar te houden..."
                      className="text-xs bg-background resize-y mt-2"
                    />
                  </div>

                  {/* VAK 5: KLEMZET */}
                  <div className="space-y-2 p-3.5 rounded-xl bg-card border border-border/80 focus-within:border-amber-500/60 flex flex-col justify-between transition-all">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Deel 2: Klemzet</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                            isKlemzetValid
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {klemzet.trim().length} / min. 8 {isKlemzetValid ? "✓" : ""}
                        </span>
                      </div>

                      {/* Collapsible toggle & text */}
                      <button
                        type="button"
                        onClick={() => toggleGuide("klemzet")}
                        className="text-[10.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors"
                      >
                        <HelpCircle className="w-3 h-3 text-amber-500" />
                        <span>{(showStrategyGuides || individualGuides.klemzet) ? "Columbo-tactiek & voorbeeld inklappen" : "Bekijk Columbo-tactiek & voorbeeld"}</span>
                        {(showStrategyGuides || individualGuides.klemzet) ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {(showStrategyGuides || individualGuides.klemzet) && (
                        <div className="text-[11px] text-muted-foreground leading-normal space-y-1.5 p-2 rounded-lg bg-muted/40 border border-border/50 animate-in fade-in duration-150">
                          <p>
                            Dit is het moment waarop je de Columbo-tactiek inzet. Je draait het mes om, niet met boosheid, maar met procedurele verbazing, gewapend met één of maximaal twee harde datapunten uit je systeem.
                          </p>
                          <p className="font-semibold text-foreground/90">
                            De werking: Je legt de hypocrisie, het financiële gat of het ontbrekende beleid bloot op basis van hún eigen stukken of wetgeving.
                          </p>
                          <p className="text-[10.5px] italic text-muted-foreground bg-background/80 p-1.5 rounded border border-border/40">
                            Bijvoorbeeld; Voorzitter, als ik de stukken vanuit dat gezamenlijke doel bestudeer, loop ik ambtelijk vast. Op pagina [X] zien we namelijk dat de financiële dekking voor [Y] ontbreekt / dat we onszelf afhankelijk maken van [Z]. Dat is bestuurlijk tegenstrijdig met de ambitie die eerder zijn uitgesproken.
                          </p>
                        </div>
                      )}
                    </div>
                    <Textarea
                      rows={7}
                      value={klemzet}
                      onChange={(e) => setKlemzet(e.target.value)}
                      placeholder="Voorzitter, als ik de stukken vanuit dat gezamenlijke doel bestudeer, loop ik ambtelijk vast. Op pagina [X] zien we namelijk dat de financiële dekking voor [Y] ontbreekt / dat we onszelf afhankelijk maken van [Z]. Dat is bestuurlijk tegenstrijdig met de ambities die eerder zijn uitgesproken..."
                      className="text-xs bg-background resize-y mt-2"
                    />
                  </div>

                  {/* VAK 6: HET DICTUM */}
                  <div className="space-y-2 p-3.5 rounded-xl bg-card border border-border/80 focus-within:border-rose-500/60 flex flex-col justify-between transition-all">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-rose-500" />
                          <span>Deel 3: Het Dictum</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                            isDictumValid
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {dictum.trim().length} / min. 8 {isDictumValid ? "✓" : ""}
                        </span>
                      </div>

                      {/* Collapsible toggle & text */}
                      <button
                        type="button"
                        onClick={() => toggleGuide("dictum")}
                        className="text-[10.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors"
                      >
                        <HelpCircle className="w-3 h-3 text-rose-500" />
                        <span>{(showStrategyGuides || individualGuides.dictum) ? "Richtlijn inklappen" : "Bekijk richtlijn"}</span>
                        {(showStrategyGuides || individualGuides.dictum) ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {(showStrategyGuides || individualGuides.dictum) && (
                        <p className="text-[11px] text-muted-foreground leading-normal p-2 rounded-lg bg-muted/40 border border-border/50 animate-in fade-in duration-150">
                          Je bouwt nooit meer een ontsnappingsluik in voor de wethouder. Je eindigt met een gesloten, binaire (ja/nee) vraag of een snoeiharde eis.
                        </p>
                      )}
                    </div>
                    <Textarea
                      rows={7}
                      value={dictum}
                      onChange={(e) => setDictum(e.target.value)}
                      placeholder="Mijn vraag aan de wethouder is dan ook heel simpel: Kan de wethouder vandaag onvoorwaardelijk toezeggen dat [X] niet wordt uitgevoerd vóórdat [Y] is gerealiseerd? Ja of nee?"
                      className="text-xs bg-background resize-y mt-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* FOOTER: CONTROLS & MAAK BIJDRAGE BUTTON                                   */}
        {/* ========================================================================= */}
        <DialogFooter className="pt-3 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs"
            >
              Sluiten
            </Button>

            {/* In view mode, show button to switch to edit */}
            {!isEditing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Teksten Aanpassen</span>
              </Button>
            )}

            {/* Politieke Markt: Optie om af te handelen als hamerstuk */}
            {isPM && isEditing && (
              <>
                {status !== "hamerstuk_afgehandeld" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSaving || !isAllValid}
                    onClick={() => handleMakeContribution(true)}
                    className="text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold gap-1"
                    title="Maak bijdrage en markeer direct als afgehandeld hamerstuk"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Als hamerstuk afhandelen
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => handleMakeContribution(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                    title="Zet terug naar bespreekstuk"
                  >
                    Terugzetten naar bespreekstuk
                  </Button>
                )}
              </>
            )}
          </div>

          {/* EDIT MODE: Het verschijnen van de 'Maak bijdrage' knop bij 6x >= 8 tekens */}
          {isEditing && (
            <div className="flex items-center gap-3">
              {!isAllValid ? (
                <div className="text-right">
                  <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 justify-end">
                    <span>{validFieldsCount} van de 6 vakken gereed</span>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground">
                    Vul alle 6 vakken in met minimaal 8 tekens om de knop 'Maak bijdrage' te tonen.
                  </p>
                </div>
              ) : (
                <Button
                  type="button"
                  size="default"
                  disabled={isSaving}
                  onClick={() => handleMakeContribution(undefined)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 h-9 rounded-xl shadow-md gap-2 animate-in fade-in zoom-in-95 duration-200"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>{isSaving ? "Bezig met opslaan..." : "Maak bijdrage"}</span>
                </Button>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
