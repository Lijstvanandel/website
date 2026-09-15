import React, { useState, useEffect, useMemo } from "react";
import {
  FileQuestion,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Sliders,
  Scale,
  Plus,
  Trash2,
  FileText,
  Upload,
  ArrowRight,
  ArrowLeft,
  Download,
  Copy,
  Lock,
  Unlock,
  Check,
  Building2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Save,
  FolderOpen,
  Send,
  AlertCircle,
  Layers,
  Flame,
  Clock,
  UserCheck,
  Newspaper,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import {
  WrittenQuestionDossier,
  QuestionDossierSource,
  QuestionDossierAttachment,
  QuestionItem,
  FramingType,
} from "@/types/questionWizard";
import {
  calculateTriageScore,
  validateQuestionText,
  FRAMING_DEFINITIONS,
  generateSuggestedConsiderans,
} from "@/utils/questionWizardLogic";
import {
  generateQuestionDossierDocx,
  generateQuestionDossierPdf,
  formatQuestionDossierAsPlainText,
} from "@/utils/questionDocumentGenerator";

interface VragenFormulatorWizardProps {
  token?: string | null;
  currentUser?: {
    id: string;
    username: string;
    fullName?: string;
    role?: string;
  } | null;
  initialTopic?: {
    id: string;
    title: string;
    meetingDate?: string;
  } | null;
}

const STORAGE_KEY = "lva_written_question_active_dossier";

const createDefaultDossier = (
  topic?: { id: string; title: string; meetingDate?: string } | null,
  user?: { id: string; username: string; fullName?: string } | null
): WrittenQuestionDossier => ({
  id: `lva-sq-${Date.now()}`,
  title: topic ? `Schriftelijke vragen inzake: ${topic.title}` : "",
  authorId: user?.id || user?.username || "fractielid",
  authorName: user?.fullName || user?.username || "Fractielid Lijst van Andel",
  topicId: topic?.id,
  topicTitle: topic?.title,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: "concept",

  // Module 1: Triage
  isLocalPolicy: null,
  problemType: "structureel",
  conflictScore: 3,
  impactScore: 3,
  scaleScore: 3,
  triageCalculatedScore: 0,
  triagePassed: false,

  // Module 2: Datamining
  sources: [
    {
      id: "src-1",
      type: topic ? "notubiz" : "url",
      title: topic ? `Agendapunt: ${topic.title}` : "",
      reference: topic ? `Raadsvergadering ${topic.meetingDate || ""}` : "",
    },
  ],
  promisedQuote: "",
  contradictingReality: "",
  attachments: [],

  // Module 3: Framing
  framing: null,
  journalistPitch: "",

  // Module 4: Vragen
  considerans: "",
  questions: [
    {
      id: "q-1",
      text: "Klopt het dat het college op de hoogte was van de overschrijdingen alvorens de raad werd ingelicht?",
    },
  ],

  // Module 5: Distributie
  pitchJournalistName: "",
  pitchJournalistConfirmed: false,
  embargoDateTime: "",
  embargoConfirmed: false,
});

export const VragenFormulatorWizard: React.FC<VragenFormulatorWizardProps> = ({
  token,
  currentUser,
  initialTopic,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [dossier, setDossier] = useState<WrittenQuestionDossier>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return {
            ...createDefaultDossier(initialTopic, currentUser),
            ...parsed,
          };
        }
      }
    } catch (e) {
      console.error("Failed to load saved draft", e);
    }
    return createDefaultDossier(initialTopic, currentUser);
  });

  const [savedDossiers, setSavedDossiers] = useState<WrittenQuestionDossier[]>([]);
  const [showDossierDrawer, setShowDossierDrawer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Auto-save to localStorage whenever dossier changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dossier));
    } catch (e) {
      console.error("Local storage save error", e);
    }
  }, [dossier]);

  // Load dossiers list from server
  const fetchDossiers = async () => {
    try {
      const res = await fetch("/api/council/written-questions", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.dossiers)) {
          setSavedDossiers(data.dossiers);
        }
      }
    } catch (err) {
      console.warn("Could not fetch server dossiers", err);
    }
  };

  useEffect(() => {
    fetchDossiers();
  }, [token]);

  // Triage calculation (deterministic)
  const triageResult = useMemo(() => {
    return calculateTriageScore(
      dossier.conflictScore,
      dossier.impactScore,
      dossier.scaleScore,
      dossier.problemType,
      dossier.isLocalPolicy
    );
  }, [
    dossier.conflictScore,
    dossier.impactScore,
    dossier.scaleScore,
    dossier.problemType,
    dossier.isLocalPolicy,
  ]);

  // Update triage scores in dossier state when calculated
  useEffect(() => {
    if (
      dossier.triageCalculatedScore !== triageResult.totalScore ||
      dossier.triagePassed !== triageResult.passed
    ) {
      setDossier((prev) => ({
        ...prev,
        triageCalculatedScore: triageResult.totalScore,
        triagePassed: triageResult.passed,
      }));
    }
  }, [triageResult.totalScore, triageResult.passed]);

  // Save dossier to server
  const handleSaveDossier = async (customStatus?: "concept" | "gereed" | "ingediend") => {
    setIsSaving(true);
    const payload = {
      ...dossier,
      status: customStatus || dossier.status,
      updatedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/council/written-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Fout bij opslaan");
      }

      const data = await res.json();
      setDossier(data.dossier);
      toast.success(
        customStatus === "ingediend"
          ? "Dossier gemarkeerd als officieel ingediend!"
          : "Dossier succesvol opgeslagen!"
      );
      fetchDossiers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Kon dossier niet opslaan op server");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to brand new dossier
  const handleNewDossier = () => {
    if (
      dossier.title &&
      !window.confirm("Weet u zeker dat u een nieuw dossier wilt starten? Zorg dat u het huidige concept heeft opgeslagen.")
    ) {
      return;
    }
    const fresh = createDefaultDossier(null, currentUser);
    setDossier(fresh);
    setCurrentStep(1);
    toast.info("Nieuw blanco dossier geopend.");
  };

  // Switch to an existing dossier
  const handleLoadDossier = (d: WrittenQuestionDossier) => {
    setDossier(d);
    setShowDossierDrawer(false);
    setCurrentStep(1);
    toast.success(`Dossier "${d.title}" geladen.`);
  };

  // Delete dossier
  const handleDeleteDossier = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Weet u zeker dat u dit dossier wilt verwijderen?")) return;

    try {
      const res = await fetch(`/api/council/written-questions/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        toast.success("Dossier verwijderd");
        setSavedDossiers((prev) => prev.filter((item) => item.id !== id));
        if (dossier.id === id) {
          handleNewDossier();
        }
      }
    } catch (err) {
      toast.error("Fout bij verwijderen");
    }
  };

  // Module 2: Sources handlers
  const handleAddSource = () => {
    const newSrc: QuestionDossierSource = {
      id: `src-${Date.now()}`,
      type: "url",
      title: "",
      reference: "",
    };
    setDossier((prev) => ({
      ...prev,
      sources: [...prev.sources, newSrc],
    }));
  };

  const handleUpdateSource = (
    id: string,
    field: keyof QuestionDossierSource,
    value: any
  ) => {
    setDossier((prev) => ({
      ...prev,
      sources: prev.sources.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };

  const handleRemoveSource = (id: string) => {
    setDossier((prev) => ({
      ...prev,
      sources: prev.sources.filter((s) => s.id !== id),
    }));
  };

  // Module 2: Document upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Alleen PDF-documenten zijn toegestaan als bijlage.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/council/written-questions/upload-attachment", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload mislukt");
      }

      const data = await res.json();
      if (data.attachment) {
        setDossier((prev) => ({
          ...prev,
          attachments: [...prev.attachments, data.attachment],
        }));
        toast.success(`Bijlage "${file.name}" succesvol toegevoegd.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Fout bij uploaden van bijlage");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    setDossier((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a.id !== attId),
    }));
  };

  // Module 4: Questions handlers
  const handleAddQuestion = () => {
    const newQ: QuestionItem = {
      id: `q-${Date.now()}`,
      text: "Klopt het dat ",
    };
    setDossier((prev) => ({
      ...prev,
      questions: [...prev.questions, newQ],
    }));
  };

  const handleUpdateQuestion = (id: string, text: string) => {
    setDossier((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === id ? { ...q, text } : q)),
    }));
  };

  const handleRemoveQuestion = (id: string) => {
    if (dossier.questions.length <= 1) {
      toast.error("U heeft minimaal 1 schriftelijke vraag nodig.");
      return;
    }
    setDossier((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== id),
    }));
  };

  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= dossier.questions.length) return;
    const newQuestions = [...dossier.questions];
    const [moved] = newQuestions.splice(index, 1);
    newQuestions.splice(targetIdx, 0, moved);
    setDossier((prev) => ({ ...prev, questions: newQuestions }));
  };

  // Auto-generate considerans
  const handleAutoConsiderans = () => {
    const generated = generateSuggestedConsiderans(dossier);
    setDossier((prev) => ({ ...prev, considerans: generated }));
    toast.success("Considerans gegenereerd uit uw feiten en bronnen!");
  };

  // Step validation checkers
  const isStep1Valid = Boolean(
    dossier.isLocalPolicy === true && triageResult.passed
  );

  const isStep2Valid = Boolean(
    dossier.promisedQuote.trim().length >= 10 &&
      dossier.contradictingReality.trim().length >= 10
  );

  const isStep3Valid = Boolean(
    dossier.framing !== null &&
      dossier.journalistPitch.trim().length >= 10 &&
      dossier.journalistPitch.trim().length <= 250
  );

  const questionValidations = useMemo(() => {
    return dossier.questions.map((q) => validateQuestionText(q.text));
  }, [dossier.questions]);

  const hasBannedQuestions = useMemo(() => {
    return questionValidations.some((v) => v.isBanned || !v.isValid);
  }, [questionValidations]);

  const isStep4Valid = Boolean(
    (dossier.considerans || "").trim().length >= 20 &&
      dossier.questions.length > 0 &&
      !hasBannedQuestions
  );

  const isStep5Unlocked = Boolean(
    dossier.pitchJournalistConfirmed && dossier.embargoConfirmed
  );

  // Document downloads
  const handleDownloadDocx = async () => {
    if (!isStep5Unlocked) return;
    setExportingDocx(true);
    try {
      const blob = await generateQuestionDossierDocx(
        dossier,
        currentUser?.fullName || currentUser?.username || "Fractie Lijst van Andel"
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Schriftelijke_Vragen_${dossier.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Officiële Word (.docx) succesvol gedownload!");
    } catch (err: any) {
      console.error(err);
      toast.error("Fout bij genereren van Word document.");
    } finally {
      setExportingDocx(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!isStep5Unlocked) return;
    setExportingPdf(true);
    try {
      const pdfBytes = await generateQuestionDossierPdf(
        dossier,
        currentUser?.fullName || currentUser?.username || "Fractie Lijst van Andel"
      );
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Schriftelijke_Vragen_${dossier.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Officiële PDF succesvol gedownload!");
    } catch (err: any) {
      console.error(err);
      toast.error("Fout bij genereren van PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleCopyEmailText = () => {
    const text = formatQuestionDossierAsPlainText(
      dossier,
      currentUser?.fullName || currentUser?.username || "Fractie Lijst van Andel"
    );
    navigator.clipboard.writeText(text);
    toast.success("Officiële tekst gekopieerd! Plak direct in e-mail naar griffie@steenwijkerland.nl.");
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header Card */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <FileQuestion className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                  Vragen Formulator & Dossierbouwer
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                    Art. 41 RvO
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Deterministische beslisboom en bewijslast-wizard voor vlijmscherpe schriftelijke vragen zonder politieke wolligheid.
                </p>
              </div>
            </div>
          </div>

          {/* Actions & Draft Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowDossierDrawer(!showDossierDrawer)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Dossiers ({savedDossiers.length})</span>
            </button>

            <button
              onClick={handleNewDossier}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Nieuw</span>
            </button>

            <button
              onClick={() => handleSaveDossier()}
              disabled={isSaving || !dossier.title}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-accent text-accent-foreground shadow-xs hover:opacity-90 disabled:opacity-50 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Opslaan..." : "Concept Opslaan"}</span>
            </button>
          </div>
        </div>

        {/* Dossiers Selector Drawer */}
        {showDossierDrawer && (
          <div className="mt-4 pt-4 border-t border-border/60 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Opgeslagen Vragendossiers
              </h4>
              <button
                onClick={() => setShowDossierDrawer(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Sluiten
              </button>
            </div>
            {savedDossiers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Nog geen opgeslagen dossiers op de server. Uw huidige concept wordt automatisch lokaal bewaard.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {savedDossiers.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => handleLoadDossier(d)}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-start justify-between gap-2 ${
                      dossier.id === d.id
                        ? "bg-amber-500/10 border-amber-500/50 shadow-xs"
                        : "bg-card/70 border-border/70 hover:bg-card hover:border-border"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">
                        {d.title || "Naamloos dossier"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span>{d.questions?.length || 0} vragen</span>
                        <span>•</span>
                        <span className="capitalize">{d.status}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteDossier(d.id, e)}
                      title="Dossier verwijderen"
                      className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dossier Title Input */}
        <div className="mt-5">
          <label className="block text-xs font-bold text-foreground mb-1.5">
            Onderwerp / Titel van de schriftelijke vragen: <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={dossier.title}
            onChange={(e) => setDossier((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="bijv. Schriftelijke vragen inzake budgetoverschrijding en geheimhouding Huis van Steenwijkerland"
            className="w-full px-4 py-2.5 rounded-2xl bg-background border border-border/80 text-sm font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        {/* Step Indicator Navigation */}
        <div className="mt-6 pt-5 border-t border-border/60">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              {
                step: 1,
                title: "1. Triage",
                desc: "Bullshit-Filter",
                valid: isStep1Valid,
                locked: false,
              },
              {
                step: 2,
                title: "2. Bewijslast",
                desc: "Datamining",
                valid: isStep2Valid,
                locked: !isStep1Valid,
              },
              {
                step: 3,
                title: "3. Framing",
                desc: "Standpuntbepaling",
                valid: isStep3Valid,
                locked: !isStep1Valid || !isStep2Valid,
              },
              {
                step: 4,
                title: "4. Vragen",
                desc: "Het Keurslijf",
                valid: isStep4Valid,
                locked: !isStep1Valid || !isStep2Valid || !isStep3Valid,
              },
              {
                step: 5,
                title: "5. Distributie",
                desc: "Embargo & Export",
                valid: isStep5Unlocked,
                locked: !isStep1Valid || !isStep2Valid || !isStep3Valid || !isStep4Valid,
              },
            ].map((s) => {
              const isActive = currentStep === s.step;
              const isLocked = s.locked;

              return (
                <button
                  key={s.step}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setCurrentStep(s.step as any)}
                  className={`p-3 rounded-2xl text-left transition-all relative border ${
                    isActive
                      ? "bg-accent text-accent-foreground border-accent shadow-xs"
                      : isLocked
                      ? "opacity-50 cursor-not-allowed bg-muted/40 border-border/40 text-muted-foreground"
                      : s.valid
                      ? "bg-card border-emerald-500/40 text-foreground hover:bg-card/80"
                      : "bg-card border-border/80 text-foreground hover:bg-card/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black tracking-tight">{s.title}</span>
                    {isLocked ? (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : s.valid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                    )}
                  </div>
                  <div className="text-[11px] truncate text-muted-foreground font-medium">
                    {s.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODULE 1: TRIAGE & HET BULLSHIT-FILTER (GO / NO-GO)       */}
      {/* ========================================================= */}
      {currentStep === 1 && (
        <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xs">
          <div className="border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400">
                MODULE 1
              </span>
              <h3 className="text-lg font-black text-foreground">
                Triage & Het Bullshit-Filter (Go / No-Go)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              De applicatie dwingt eerst af dat de nieuwswaarde en haalbaarheid bewezen zijn vóórdat er überhaupt vragen getypt mogen worden.
            </p>
          </div>

          {/* Functie 1.1: Harde Binaire Checks */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Functie 1.1: Harde Binaire Checks
            </h4>

            {/* Check A: Lokaal beleid? */}
            <div className="p-5 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
              <label className="block text-sm font-bold text-foreground">
                1. Gaat dit onderwerp over lokaal gemeentelijk beleid (Steenwijkerland)? <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Valt dit binnen de wettelijke bevoegdheden van het college van B&W of de gemeenteraad (Gemeentewet art. 155/169)?
              </p>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="isLocalPolicy"
                    checked={dossier.isLocalPolicy === true}
                    onChange={() => setDossier((prev) => ({ ...prev, isLocalPolicy: true }))}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Ja (Gemeentelijk beleid)</span>
                </label>
                <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="isLocalPolicy"
                    checked={dossier.isLocalPolicy === false}
                    onChange={() => setDossier((prev) => ({ ...prev, isLocalPolicy: false }))}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <span>Nee (Landelijk, provinciaal of particulier)</span>
                </label>
              </div>

              {/* Hard Stop Screen if NO */}
              {dossier.isLocalPolicy === false && (
                <div className="mt-4 p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-800 dark:text-rose-200 animate-fade-in space-y-3">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-7 h-7 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-base font-black text-rose-700 dark:text-rose-400">
                        🛑 STOP: Proces direct afgebroken!
                      </h5>
                      <p className="text-xs leading-relaxed mt-1 text-rose-900 dark:text-rose-200">
                        Schriftelijke vragen op grond van artikel 41 van het Reglement van Orde kunnen uitsluitend worden gesteld over aangelegenheden die tot de bevoegdheid van het gemeentebestuur van Steenwijkerland behoren.
                      </p>
                      <p className="text-xs leading-relaxed mt-1.5 font-medium text-rose-900 dark:text-rose-300">
                        Onderwerpen die onder de Provincie Overijssel, het Rijk, het Waterschap of het particuliere recht vallen, worden door de griffie per direct geweigerd. Verwijs de burger door naar het bevoegde bestuursorgaan.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setDossier((prev) => ({ ...prev, isLocalPolicy: true }))}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                    >
                      Antwoord corrigeren naar Ja
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Check B: Incidenteel of Structureel? */}
            {dossier.isLocalPolicy !== false && (
              <div className="p-5 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                <label className="block text-sm font-bold text-foreground">
                  2. Is het probleem incidenteel of structureel? <span className="text-rose-500">*</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  Betreft dit een eenmalige klacht/geval, of is er sprake van een herhalend patroon en structureel falend beleid?
                </p>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="problemType"
                      checked={dossier.problemType === "structureel"}
                      onChange={() => setDossier((prev) => ({ ...prev, problemType: "structureel" }))}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Structureel (Herhalend beleidsfalen / structurele misstand)</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="problemType"
                      checked={dossier.problemType === "incidenteel"}
                      onChange={() => setDossier((prev) => ({ ...prev, problemType: "incidenteel" }))}
                      className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                    />
                    <span>Incidenteel (Eenmalige klacht / individueel geval)</span>
                  </label>
                </div>

                {dossier.problemType === "incidenteel" && (
                  <div className="mt-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 animate-fade-in text-xs leading-relaxed">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Waarschuwing bij incidentele problemen:</strong>
                      <p className="mt-0.5">
                        Incidentele kwesties kunnen doorgaans sneller worden opgelost via een rechtstreekse technische vraag aan de vakambtenaar of een melding openbare ruimte. Schriftelijke vragen kosten ambtelijke capaciteit en zijn primair bedoeld voor structurele misstanden. (Rekenmodule trekt automatisch 15 punten af).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Functie 1.2: Impact Scorecard */}
          {dossier.isLocalPolicy === true && (
            <div className="space-y-6 pt-4 border-t border-border/60">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                Functie 1.2: Impact Scorecard (1 tot 5)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Conflict Slider */}
                <div className="p-5 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">
                      Conflict (Gewicht: 35%)
                    </span>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      Score: {dossier.conflictScore} / 5
                    </span>
                  </div>
                  <p className="text-xs font-bold text-foreground">
                    Is er sprake van budgetoverschrijding, leugens of interne ruzie?
                  </p>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={dossier.conflictScore}
                    onChange={(e) =>
                      setDossier((prev) => ({ ...prev, conflictScore: Number(e.target.value) }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="text-[11px] text-muted-foreground font-medium">
                    {dossier.conflictScore === 1 && "1 = Geen enkel conflict / puur administratief"}
                    {dossier.conflictScore === 2 && "2 = Lichte meningsverschillen"}
                    {dossier.conflictScore === 3 && "3 = Duidelijke tegenstrijdigheid of begrotingsdruk"}
                    {dossier.conflictScore === 4 && "4 = Aanzienlijke budgetoverschrijding of coalitieruzie"}
                    {dossier.conflictScore === 5 && "5 = Hard bewijs van leugens, verzwegen stukken of crisis"}
                  </div>
                </div>

                {/* Impact Slider */}
                <div className="p-5 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">
                      Impact (Gewicht: 40%)
                    </span>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      Score: {dossier.impactScore} / 5
                    </span>
                  </div>
                  <p className="text-xs font-bold text-foreground">
                    Raken we direct de portemonnee of leefomgeving van inwoners?
                  </p>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={dossier.impactScore}
                    onChange={(e) =>
                      setDossier((prev) => ({ ...prev, impactScore: Number(e.target.value) }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="text-[11px] text-muted-foreground font-medium">
                    {dossier.impactScore === 1 && "1 = Minimaal / theoretisch"}
                    {dossier.impactScore === 2 && "2 = Indirect merkbaar voor kleine groep"}
                    {dossier.impactScore === 3 && "3 = Tastbare overlast of extra kosten voor inwoners"}
                    {dossier.impactScore === 4 && "4 = Flinke financiële schade of ernstige aantasting leefomgeving"}
                    {dossier.impactScore === 5 && "5 = Acute, directe aanslag op portemonnee, veiligheid of woonzekerheid"}
                  </div>
                </div>

                {/* Scale Slider */}
                <div className="p-5 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">
                      Schaalgrootte (Gewicht: 25%)
                    </span>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      Score: {dossier.scaleScore} / 5
                    </span>
                  </div>
                  <p className="text-xs font-bold text-foreground">
                    Gaat het om 1 straat of de gehele gemeente?
                  </p>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={dossier.scaleScore}
                    onChange={(e) =>
                      setDossier((prev) => ({ ...prev, scaleScore: Number(e.target.value) }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="text-[11px] text-muted-foreground font-medium">
                    {dossier.scaleScore === 1 && "1 = 1 straat of specifiek adres"}
                    {dossier.scaleScore === 2 && "2 = Een wijk of kleine buurt"}
                    {dossier.scaleScore === 3 && "3 = Een heel dorp of meerdere buurten"}
                    {dossier.scaleScore === 4 && "4 = Grote doelgroep (bijv. alle ondernemers/ouderen)"}
                    {dossier.scaleScore === 5 && "5 = De gehele gemeente Steenwijkerland"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Functie 1.3: Deterministische Rekenmodule */}
          {dossier.isLocalPolicy === true && (
            <div className="p-6 rounded-3xl bg-muted/40 border border-border/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Scale className="w-5 h-5 text-amber-500" />
                  <h4 className="text-sm font-bold text-foreground">
                    Functie 1.3: Deterministische Scorecard & Prullenbak-Kans
                  </h4>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Prullenbak-Kans
                    </span>
                    <span
                      className={`text-sm font-black ${
                        triageResult.prullenbakKans > 40 ? "text-rose-500" : "text-emerald-500"
                      }`}
                    >
                      {triageResult.prullenbakKans}%
                    </span>
                  </div>
                  <div className="text-right pl-3 border-l border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Nieuwswaarde
                    </span>
                    <span
                      className={`text-base font-black ${
                        triageResult.totalScore >= 60 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {triageResult.totalScore}% / 100%
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-muted border border-border/60 overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-300 ${
                    triageResult.totalScore >= 60 ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${triageResult.totalScore}%` }}
                />
                {/* Drempel Marker at 60% */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-foreground/70"
                  style={{ left: "60%" }}
                  title="Drempelwaarde (60%)"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <span>0% Geen nieuwswaarde</span>
                <span className="font-bold text-foreground">Drempel: 60%</span>
                <span>100% Maximale impact</span>
              </div>

              {/* Status Callout */}
              {!triageResult.passed ? (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Te weinig nieuwswaarde.</strong> Stop met dit onderwerp of zoek meer bewijs. De drempelwaarde van 60% is niet behaald.
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Goedgekeurd voor onderzoek!</strong> De score van {triageResult.totalScore}% toont voldoende politieke en journalistieke urgentie aan.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 1 Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            <span className="text-xs text-muted-foreground">
              {!dossier.title
                ? "Voer bovenaan eerst een titel/onderwerp in."
                : !triageResult.passed
                ? "Drempelwaarde van 60% vereist om door te gaan."
                : "Triage succesvol voltooid."}
            </span>

            <button
              onClick={() => setCurrentStep(2)}
              disabled={!isStep1Valid || !dossier.title}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-accent text-accent-foreground shadow-xs hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span>Ga door naar onderzoek</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODULE 2: DATAMINING & DOSSIEROPBOUW (DE BEWIJSLAST)      */}
      {/* ========================================================= */}
      {currentStep === 2 && (
        <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xs">
          <div className="border-b border-border/60 pb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  MODULE 2
                </span>
                <h3 className="text-lg font-black text-foreground">
                  Datamining & Dossieropbouw (De Bewijslast)
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Hier voert u handmatig de feiten en documenten in die tijdens het eigen onderzoek zijn gevonden.
              </p>
            </div>
          </div>

          {/* Functie 2.1: Bronnen-invoer */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" />
                Functie 2.1: Bronnen & Verwijzingen (Dynamische input-lijst)
              </h4>
              <button
                type="button"
                onClick={handleAddSource}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-amber-500" />
                <span>Bron toevoegen</span>
              </button>
            </div>

            <div className="space-y-3">
              {dossier.sources.map((src, idx) => (
                <div
                  key={src.id}
                  className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                      Bron #{idx + 1}
                    </span>
                    {dossier.sources.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSource(src.id)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 transition-colors"
                        title="Bron verwijderen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        Type bron
                      </label>
                      <select
                        value={src.type}
                        onChange={(e) => handleUpdateSource(src.id, "type", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-hidden"
                      >
                        <option value="notubiz">Raadsbesluit / iBabs / Notubiz</option>
                        <option value="motie">Motie / Amendement</option>
                        <option value="wob_woo">Wob / Woo-document</option>
                        <option value="begroting">Gemeentebegroting / Jaarrekening</option>
                        <option value="url">Nieuwsbericht / Externe URL</option>
                        <option value="anders">Overig bewijsstuk</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        Omschrijving / Titel <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={src.title}
                        onChange={(e) => handleUpdateSource(src.id, "title", e.target.value)}
                        placeholder="bijv. Raadsbesluit 12 dec 2023 kredietverlening"
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        Referentie / URL / Zaaknummer
                      </label>
                      <input
                        type="text"
                        value={src.reference}
                        onChange={(e) => handleUpdateSource(src.id, "reference", e.target.value)}
                        placeholder="bijv. Zaaknummer 2023-891 of https://..."
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Functie 2.2: De 'Smoking Gun' velden */}
          <div className="space-y-6 pt-4 border-t border-border/60">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              Functie 2.2: De 'Smoking Gun' velden (Harde Tegenstelling)
            </h4>

            {/* Veld 1: Wat heeft de wethouder beloofd? */}
            <div className="p-5 rounded-2xl bg-muted/30 border border-border/70 space-y-2">
              <label className="block text-sm font-bold text-foreground">
                Veld 1: Wat heeft de wethouder in het verleden beloofd? <span className="text-rose-500">* (Verplicht citaat)</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Citeer exact de belofte, uitspraak in de raadsvergadering of toezegging in een raadsvoorstel.
              </p>
              <textarea
                rows={3}
                value={dossier.promisedQuote}
                onChange={(e) => setDossier((prev) => ({ ...prev, promisedQuote: e.target.value }))}
                placeholder={`bijv. "Wethouder X verklaarde tijdens het raadsdebat van 14 maart letterlijk: 'De kosten zullen te allen tijde binnen het gereserveerde budget van € 250.000 blijven en oplevering geschiedt vóór het zomerreces.'"`}
                className="w-full p-3.5 rounded-2xl bg-background border border-border text-xs font-serif leading-relaxed text-foreground focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
              />
              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>Minimaal 10 tekens verplicht.</span>
                <span className={dossier.promisedQuote.trim().length >= 10 ? "text-emerald-500 font-bold" : "text-amber-500"}>
                  {dossier.promisedQuote.trim().length} tekens
                </span>
              </div>
            </div>

            {/* Veld 2: Wat is de huidige, tegenstrijdige realiteit? */}
            <div className="p-5 rounded-2xl bg-muted/30 border border-border/70 space-y-2">
              <label className="block text-sm font-bold text-foreground">
                Veld 2: Wat is de huidige, tegenstrijdige realiteit? <span className="text-rose-500">* (Verplicht feitenveld)</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Beschrijf de harde feiten die aantonen dat de werkelijkheid haaks staat op de toezegging van het college.
              </p>
              <textarea
                rows={3}
                value={dossier.contradictingReality}
                onChange={(e) =>
                  setDossier((prev) => ({ ...prev, contradictingReality: e.target.value }))
                }
                placeholder={`bijv. "Uit de financiële tussenrapportage Q3 blijkt dat er reeds € 480.000 is uitgegeven (+92%), de opening met een jaar is uitgesteld en het college deze overschrijding niet actief aan de raad heeft gemeld."`}
                className="w-full p-3.5 rounded-2xl bg-background border border-border text-xs leading-relaxed text-foreground focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
              />
              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>Minimaal 10 tekens verplicht.</span>
                <span className={dossier.contradictingReality.trim().length >= 10 ? "text-emerald-500 font-bold" : "text-amber-500"}>
                  {dossier.contradictingReality.trim().length} tekens
                </span>
              </div>
            </div>
          </div>

          {/* Functie 2.3: Document-upload (Optioneel) */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-500" />
              Functie 2.3: Document-upload (Optionele Dossierbijlagen)
            </h4>
            <p className="text-xs text-muted-foreground">
              Voeg PDF-bewijsstukken (bijv. Woo-documenten, ambtelijke nota's of begrotingspagina's) toe als officiële bijlage.
            </p>

            <div className="border-2 border-dashed border-border/80 rounded-2xl p-6 text-center hover:border-amber-500/50 transition-colors">
              <input
                type="file"
                id="dossier-pdf-upload"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <label
                htmlFor="dossier-pdf-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-foreground">
                  {isUploading ? "Bezig met uploaden..." : "Klik om een PDF-bewijsstuk toe te voegen"}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Alleen PDF-bestanden (max 50 MB per bestand)
                </p>
              </label>
            </div>

            {/* Uploaded attachments list */}
            {dossier.attachments.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground block">
                  Toegevoegde bewijsstukken ({dossier.attachments.length}):
                </span>
                {dossier.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-semibold text-foreground truncate">
                        {att.filename}
                      </span>
                      {att.fileSize && (
                        <span className="text-muted-foreground text-[11px]">
                          ({Math.round(att.fileSize / 1024)} KB)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-600 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span>Inzien</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="text-muted-foreground hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 2 Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Terug naar Triage</span>
            </button>

            <button
              onClick={() => setCurrentStep(3)}
              disabled={!isStep2Valid}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-accent text-accent-foreground shadow-xs hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span>Ga door naar Framing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODULE 3: FRAMING (STANDPUNTBEPALING)                     */}
      {/* ========================================================= */}
      {currentStep === 3 && (
        <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xs">
          <div className="border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400">
                MODULE 3
              </span>
              <h3 className="text-lg font-black text-foreground">
                Framing (Standpuntbepaling)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              De applicatie dwingt een scherpe, gemeenterechtelijke invalshoek af. Kies één concrete aanvalshoek.
            </p>
          </div>

          {/* Functie 3.1: Trias Politica Selectie */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-500" />
              Functie 3.1: Trias Politica Selectie (Kies verplicht 1 invalshoek) <span className="text-rose-500">*</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.keys(FRAMING_DEFINITIONS) as FramingType[]).map((fKey) => {
                const f = FRAMING_DEFINITIONS[fKey];
                const isSelected = dossier.framing === fKey;

                return (
                  <div
                    key={fKey}
                    onClick={() => setDossier((prev) => ({ ...prev, framing: fKey }))}
                    className={`p-5 rounded-2xl border text-left cursor-pointer transition-all space-y-3 relative ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500 shadow-xs ring-2 ring-amber-500/20"
                        : "bg-muted/30 border-border/70 hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-4 h-4 rounded-full border border-border flex items-center justify-center mt-0.5">
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-background/80 text-muted-foreground">
                        {f.subtitle}
                      </span>
                    </div>

                    <div>
                      <h5 className="text-sm font-black text-foreground">{f.title}</h5>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {f.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/50 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                      {f.legalBasis}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Functie 3.2: De Pitch-begrenzer */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-amber-500" />
                Functie 3.2: De Pitch-begrenzer (Max. 250 tekens) <span className="text-rose-500">*</span>
              </h4>
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-xl ${
                  dossier.journalistPitch.length > 250
                    ? "bg-rose-500/20 text-rose-600"
                    : dossier.journalistPitch.length >= 15
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {dossier.journalistPitch.length} / 250 tekens
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Dwingt beknoptheid af voor de journalist en de griffie. Schrijf in maximaal 250 tekens de absolute kern van het schandaal/probleem op.
            </p>

            <textarea
              rows={3}
              maxLength={250}
              value={dossier.journalistPitch}
              onChange={(e) =>
                setDossier((prev) => ({ ...prev, journalistPitch: e.target.value }))
              }
              placeholder="bijv. Steenwijkerland steekt € 480k extra in het project zonder raadsbesluit, terwijl de wethouder bezwoer dat er geen cent bij zou komen. De oppositie eist opheldering."
              className="w-full p-4 rounded-2xl bg-background border border-border text-sm font-medium leading-relaxed text-foreground focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
            />

            {/* Character warning */}
            {dossier.journalistPitch.length > 0 && dossier.journalistPitch.length < 15 && (
              <p className="text-xs text-amber-600">
                Minimaal 15 tekens nodig voor een krachtige pitch.
              </p>
            )}
          </div>

          {/* Step 3 Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Terug naar Bewijslast</span>
            </button>

            <button
              onClick={() => setCurrentStep(4)}
              disabled={!isStep3Valid}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-accent text-accent-foreground shadow-xs hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span>Ga door naar Vragen Formulator</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODULE 4: VRAGEN FORMULATOR (HET KEURSLIJF)              */}
      {/* ========================================================= */}
      {currentStep === 4 && (
        <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xs">
          <div className="border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400">
                MODULE 4
              </span>
              <h3 className="text-lg font-black text-foreground">
                Vragen Formulator (Het Keurslijf)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Hier worden de daadwerkelijke schriftelijke vragen opgesteld onder strikte client-side validatieregels.
            </p>
          </div>

          {/* Functie 4.1: Considerans-veld met referentiekader */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                Functie 4.1: Considerans & Inleidende Feiten
              </h4>
              <button
                type="button"
                onClick={handleAutoConsiderans}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Genereer considerans opzet</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Considerans Editor */}
              <div className="lg:col-span-8 space-y-2">
                <textarea
                  rows={8}
                  value={dossier.considerans}
                  onChange={(e) => setDossier((prev) => ({ ...prev, considerans: e.target.value }))}
                  placeholder={`De ondergetekende, lid van de raad der gemeente Steenwijkerland namens de fractie Lijst van Andel;\n\nOverwegende dat:\n- Het college in het verleden heeft toegezegd dat...\n- De huidige feitelijke realiteit daarmee in directe tegenspraak is...\n\nStelt de volgende vragen aan het College van B&W:`}
                  className="w-full p-4 rounded-2xl bg-background border border-border text-xs leading-relaxed font-sans text-foreground focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Inleidende considerans conform art. 41 RvO.
                </p>
              </div>

              {/* Referentiekader Sidebar (Automatisch opgehaald uit Module 2 & 3) */}
              <div className="lg:col-span-4 p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3 text-xs">
                <span className="text-[11px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider block">
                  Referentiekader (Module 2 & 3)
                </span>

                {/* Toezegging */}
                <div>
                  <strong className="block text-foreground font-bold text-[11px]">
                    Belofte Wethouder:
                  </strong>
                  <p className="italic text-muted-foreground mt-0.5 line-clamp-3">
                    "{dossier.promisedQuote || "Geen toezegging ingevoerd"}"
                  </p>
                </div>

                {/* Realiteit */}
                <div className="pt-2 border-t border-border/60">
                  <strong className="block text-foreground font-bold text-[11px]">
                    Tegenstrijdige Realiteit:
                  </strong>
                  <p className="text-muted-foreground mt-0.5 line-clamp-3">
                    {dossier.contradictingReality || "Geen realiteit ingevoerd"}
                  </p>
                </div>

                {/* Bronnen */}
                <div className="pt-2 border-t border-border/60">
                  <strong className="block text-foreground font-bold text-[11px]">
                    Bronnen ({dossier.sources.length}):
                  </strong>
                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground text-[11px] mt-0.5">
                    {dossier.sources.map((s, idx) => (
                      <li key={idx} className="truncate">
                        {s.title || s.reference || "Bron"}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Functie 4.2 & 4.3: Gesloten-Vragen Generator & Client-side Regex Validatie */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  Functie 4.2 & 4.3: Gesloten-Vragen Generator met Regex-Controle
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vragen beginnend met "Waarom", "Hoe kijkt" of "Wat vindt" zijn <strong className="text-rose-500">verboden</strong> en blokkeren het formulier.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddQuestion}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-accent text-accent-foreground shadow-xs hover:opacity-90 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Vraag toevoegen</span>
              </button>
            </div>

            {/* Questions list */}
            <div className="space-y-4">
              {dossier.questions.map((q, idx) => {
                const validation = questionValidations[idx] || { isValid: true, isBanned: false };

                return (
                  <div
                    key={q.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 ${
                      validation.isBanned
                        ? "bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/20"
                        : validation.warning
                        ? "bg-amber-500/5 border-amber-500/40"
                        : "bg-muted/30 border-border/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                            validation.isBanned
                              ? "bg-rose-600 text-white"
                              : "bg-amber-500/20 text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          Vraag {idx + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(idx, "up")}
                          disabled={idx === 0}
                          title="Omhoog"
                          className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(idx, "down")}
                          disabled={idx === dossier.questions.length - 1}
                          title="Omlaag"
                          className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 transition-colors"
                          title="Vraag verwijderen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question text input */}
                    <textarea
                      rows={2}
                      value={q.text}
                      onChange={(e) => handleUpdateQuestion(q.id, e.target.value)}
                      placeholder="bijv. Klopt het dat het college op de hoogte was van de tekorten alvorens de raad werd ingelicht?"
                      className={`w-full p-3 rounded-xl text-xs font-medium text-foreground focus:outline-hidden transition-colors ${
                        validation.isBanned
                          ? "bg-rose-50/50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-900 dark:text-rose-200"
                          : "bg-background border border-border"
                      }`}
                    />

                    {/* Regex Validation Feedback */}
                    {validation.isBanned && (
                      <div className="p-3 rounded-xl bg-rose-600 text-white text-xs font-semibold flex items-start gap-2 animate-fade-in shadow-xs">
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          {validation.error}
                          <div className="mt-1 text-[11px] text-rose-100 font-normal">
                            Tip: Herschrijf als: "Klopt het dat...", "Erkent het college dat...", of "Kan de wethouder bevestigen dat...".
                          </div>
                        </div>
                      </div>
                    )}

                    {!validation.isBanned && validation.warning && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2 animate-fade-in">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>{validation.warning}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 4 Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Terug naar Framing</span>
            </button>

            <button
              onClick={() => setCurrentStep(5)}
              disabled={!isStep4Valid}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-accent text-accent-foreground shadow-xs hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span>Ga door naar Distributie & Export</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODULE 5: DISTRIBUTIE & EXPORT (DE EMBARGO-CHECK)         */}
      {/* ========================================================= */}
      {currentStep === 5 && (
        <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xs">
          <div className="border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400">
                MODULE 5
              </span>
              <h3 className="text-lg font-black text-foreground">
                Distributie & Export (De Embargo-check)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              De laatste controle vóórdat de schriftelijke vragen officieel de deur uit gaan. Maximale politieke en journalistieke impact vereist regie.
            </p>
          </div>

          {/* Functie 5.1: Mediapitch Checklist */}
          <div className="p-6 rounded-3xl bg-muted/40 border border-border/80 space-y-5">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-amber-500" />
              Functie 5.1: Mediapitch Checklist (Exclusieve Primeur)
            </h4>

            <div className="space-y-4">
              {/* Check 1 */}
              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dossier.pitchJournalistConfirmed}
                    onChange={(e) =>
                      setDossier((prev) => ({
                        ...prev,
                        pitchJournalistConfirmed: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 mt-0.5 rounded-lg text-amber-600 focus:ring-amber-500"
                  />
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-foreground block">
                      "Ik heb het dossier exclusief gepitcht bij journalist X."
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Een schriftelijke vraag heeft 10x zoveel effect als een journalist het dossier klaar heeft liggen op de ochtend van indiening.
                    </p>
                  </div>
                </label>

                {dossier.pitchJournalistConfirmed && (
                  <div className="pt-2 pl-8">
                    <input
                      type="text"
                      value={dossier.pitchJournalistName}
                      onChange={(e) =>
                        setDossier((prev) => ({
                          ...prev,
                          pitchJournalistName: e.target.value,
                        }))
                      }
                      placeholder="Naam journalist & medium (bijv. Jan Jansen, De Stentor / Steenwijker Courant)"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              {/* Check 2 */}
              <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dossier.embargoConfirmed}
                    onChange={(e) =>
                      setDossier((prev) => ({
                        ...prev,
                        embargoConfirmed: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 mt-0.5 rounded-lg text-amber-600 focus:ring-amber-500"
                  />
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-foreground block">
                      "Embargo-tijd en datum is afgesproken."
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Voorkomt dat de pers te vroeg publiceert vóórdat de griffie de vragen officieel heeft gestempeld.
                    </p>
                  </div>
                </label>

                {dossier.embargoConfirmed && (
                  <div className="pt-2 pl-8">
                    <input
                      type="text"
                      value={dossier.embargoDateTime}
                      onChange={(e) =>
                        setDossier((prev) => ({
                          ...prev,
                          embargoDateTime: e.target.value,
                        }))
                      }
                      placeholder="bijv. Donderdagochtend 18 september om 06:00 uur"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Lock status warning */}
            {!isStep5Unlocked ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Exportvergrendeling actief:</strong> Pas wanneer beide voorwaarden zijn aangevinkt, wordt de downloadknop voor het officiële Word/PDF-document vrijgegeven.
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-200">
                <Unlock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Document Generator ontgrendeld!</strong> U kunt nu de officiële fractiedocumenten downloaden in de huisstijl van Lijst van Andel.
                </div>
              </div>
            )}
          </div>

          {/* Functie 5.2: Document Generator (Export & Klembord) */}
          <div className="space-y-5 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-500" />
                Functie 5.2: Officiële Document Generator (Lijst van Andel Huisstijl)
              </h4>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
                Klaar voor griffie@steenwijkerland.nl
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Word Export */}
              <button
                type="button"
                onClick={handleDownloadDocx}
                disabled={!isStep5Unlocked || exportingDocx}
                className="p-5 rounded-2xl border border-border/80 bg-card hover:border-amber-500 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed group shadow-xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </span>
                  <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                </div>
                <h5 className="text-sm font-bold text-foreground">
                  {exportingDocx ? "Bezig met exporteren..." : "Officiële Word (.docx)"}
                </h5>
                <p className="text-xs text-muted-foreground mt-1">
                  Volledig opgemaakt Word-document met briefhoofd, considerans en vragen.
                </p>
              </button>

              {/* PDF Export */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={!isStep5Unlocked || exportingPdf}
                className="p-5 rounded-2xl border border-border/80 bg-card hover:border-amber-500 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed group shadow-xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </span>
                  <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                </div>
                <h5 className="text-sm font-bold text-foreground">
                  {exportingPdf ? "Bezig met genereren..." : "Officiële PDF"}
                </h5>
                <p className="text-xs text-muted-foreground mt-1">
                  Gestyled PDF-bestand met marineblauw en goud briefhoofd, direct printklaar.
                </p>
              </button>

              {/* Copy plain text for email */}
              <button
                type="button"
                onClick={handleCopyEmailText}
                className="p-5 rounded-2xl border border-border/80 bg-card hover:border-amber-500 text-left transition-all group shadow-xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    <Copy className="w-5 h-5" />
                  </span>
                  <Send className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                </div>
                <h5 className="text-sm font-bold text-foreground">Kopieer Griffie-mail</h5>
                <p className="text-xs text-muted-foreground mt-1">
                  Kopieer de volledige opgemaakte tekst om direct in een e-mail naar de griffie te plakken.
                </p>
              </button>
            </div>

            {/* Final Submission status */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground">
                Status: <strong className="text-foreground capitalize">{dossier.status}</strong>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveDossier("gereed")}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/70 transition-colors"
                >
                  Als Gereed Opslaan
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDossier("ingediend")}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Markeer als Ingediend</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step 5 Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            <button
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Terug naar Vragen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VragenFormulatorWizard;
