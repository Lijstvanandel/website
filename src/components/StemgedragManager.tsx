import React, { useState, useEffect, useRef } from "react";
import {
  Vote,
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  FileText,
  FileDown,
  Check,
  X,
  Sparkles,
  Users,
  Calendar,
  Eye,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileCheck2,
  Handshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { StemgedragItem, MotionType, VoteType, MotionCategory, isIngetrokkenDoorToezegging } from "@/types/stemgedrag";

interface StemgedragManagerProps {
  token: string | null;
}

export const StemgedragManager: React.FC<StemgedragManagerProps> = ({ token }) => {
  const [items, setItems] = useState<StemgedragItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<MotionCategory>("motie");
  const [motionType, setMotionType] = useState<MotionType>("eigen");
  const [vote, setVote] = useState<VoteType>("voor");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [raadsvergadering, setRaadsvergadering] = useState<string>("");
  const [resultaat, setResultaat] = useState<string>("Aangenomen");

  // Files
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string>("");

  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const authHeaders = {
    Authorization: `Bearer ${token || localStorage.getItem("auth_token") || localStorage.getItem("token") || ""}`,
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stemgedrag");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setItems(data);
        }
      }
    } catch {
      toast.error("Fout bij ophalen van stemgedrag");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setCategory("motie");
    setMotionType("eigen");
    setVote("voor");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setRaadsvergadering("");
    setResultaat("Aangenomen");
    setImageFile(null);
    setImagePreview(null);
    setCurrentImageUrl("");
    setPdfFile(null);
    setPdfFileName("");
    setCurrentPdfUrl("");
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const handleEditClick = (item: StemgedragItem) => {
    const itemIngetrokken = isIngetrokkenDoorToezegging(item);
    setEditingId(item.id);
    setTitle(item.title || "");
    setCategory(item.category || "motie");
    setMotionType(itemIngetrokken ? "eigen" : (item.motionType || "regulier"));
    setVote(itemIngetrokken ? "ingetrokken-toezegging" : (item.vote || "voor"));
    setDescription(item.description || "");
    setDate(item.date || new Date().toISOString().split("T")[0]);
    setRaadsvergadering(item.raadsvergadering || "");
    setResultaat(
      item.resultaat
        ? item.resultaat.replace(/Ingetrokken\s+i\.?v\.?m\.?\s+toezegging/gi, "Ingetrokken door toezegging")
        : itemIngetrokken
        ? "Ingetrokken door toezegging"
        : ""
    );

    setImageFile(null);
    setCurrentImageUrl(item.imageUrl || "");
    setImagePreview(item.imageUrl || null);

    setPdfFile(null);
    setCurrentPdfUrl(item.pdfUrl || "");
    setPdfFileName(item.pdfFileName || "");

    toast.info(`Item '${item.title}' geladen in bewerker`);
    window.scrollTo({ top: 350, behavior: "smooth" });
  };

  const handleSelectVote = (newVote: VoteType) => {
    setVote(newVote);
    if (newVote === "ingetrokken-toezegging") {
      // Automatisch op Eigen zetten en categorie op Motie of Amendement houden
      setMotionType("eigen");
      if (category === "voorstel") {
        setCategory("motie");
      }
      if (
        !resultaat.trim() ||
        resultaat === "Aangenomen" ||
        resultaat === "Verworpen" ||
        /ingetrokken.*toezegging/i.test(resultaat)
      ) {
        setResultaat("Ingetrokken door toezegging");
      }
    } else if (/ingetrokken.*toezegging/i.test(resultaat)) {
      setResultaat(newVote === "voor" ? "Aangenomen" : "Verworpen");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPdfFile(file);
      setPdfFileName(file.name);
    }
  };

  const removeSelectedImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setCurrentImageUrl("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeSelectedPdf = () => {
    setPdfFile(null);
    setPdfFileName("");
    setCurrentPdfUrl("");
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vul een titel of onderwerp in.");
      return;
    }

    if (description.trim().length > 600) {
      toast.error(`De toelichting mag maximaal 600 tekens bevatten (huidige lengte: ${description.trim().length}).`);
      return;
    }

    const effectiveCategory: MotionCategory =
      vote === "ingetrokken-toezegging" && category === "voorstel" ? "motie" : category;
    const effectiveMotionType: MotionType =
      vote === "ingetrokken-toezegging" ? "eigen" : motionType;
    const effectiveResultaat =
      vote === "ingetrokken-toezegging" &&
      (!resultaat.trim() ||
        resultaat === "Aangenomen" ||
        resultaat === "Verworpen" ||
        /ingetrokken\s+i\.?v\.?m\.?\s+toezegging/i.test(resultaat))
        ? "Ingetrokken door toezegging"
        : resultaat.trim();

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("category", effectiveCategory);
      formData.append("motionType", effectiveMotionType);
      formData.append("vote", vote);
      formData.append("description", description.trim());
      formData.append("date", date);
      formData.append("raadsvergadering", raadsvergadering.trim());
      formData.append("resultaat", effectiveResultaat);

      if (imageFile) {
        formData.append("image", imageFile);
      } else if (!currentImageUrl && editingId) {
        formData.append("removeImage", "true");
      }

      if (pdfFile) {
        formData.append("pdf", pdfFile);
      } else if (!currentPdfUrl && editingId) {
        formData.append("removePdf", "true");
      }

      const url = editingId ? `/api/admin/stemgedrag/${editingId}` : "/api/admin/stemgedrag";
      const method = editingId ? "PUT" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        body: formData,
      });

      if (res.ok) {
        toast.success(editingId ? "Stemgedrag succesvol bijgewerkt!" : "Nieuw stemgedrag succesvol toegevoegd!");
        resetForm();
        fetchItems();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Fout bij opslaan.");
      }
    } catch {
      toast.error("Er is een onverwachte serverfout opgetreden.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    if (!confirm(`Weet u zeker dat u '${itemTitle}' wilt verwijderen?`)) {
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/admin/stemgedrag/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Stemgedrag succesvol verwijderd");
        if (editingId === id) resetForm();
        fetchItems();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Kon het item niet verwijderen.");
      }
    } catch {
      toast.error("Fout bij verwijderen.");
    }
  };

  // Filtered list for display
  const filteredList = items.filter((item) => {
    const itemCat = item.category || "motie";
    const itemIngetrokken = isIngetrokkenDoorToezegging(item);
    if (filterCategory !== "all" && itemCat !== filterCategory) return false;

    if (filterType === "eigen" && item.motionType !== "eigen" && !itemIngetrokken) return false;
    if (filterType === "mede-indiener" && item.motionType !== "mede-indiener") return false;
    if (filterType === "voor" && (itemIngetrokken || item.vote !== "voor")) return false;
    if (filterType === "tegen" && (itemIngetrokken || item.vote !== "tegen")) return false;
    if (filterType === "ingetrokken-toezegging" && !itemIngetrokken) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchVergadering = item.raadsvergadering?.toLowerCase().includes(q);
      const matchCat = itemCat.toLowerCase().includes(q);
      return Boolean(matchTitle || matchDesc || matchVergadering || matchCat);
    }
    return true;
  });

  const charsLeft = 600 - description.length;

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-1">
            <Vote className="w-4 h-4" />
            <span>Beheer Stemgedrag</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl text-foreground">
            Stemgedrag Gemeenteraad
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Registreer moties, voorstellen en amendementen inclusief toelichting (max. 600 tekens), vaste afbeelding en origineel PDF-document.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            className="gap-1.5 text-xs border-border"
          >
            <a href="/fractie#stemgedrag" target="_blank" rel="noopener noreferrer">
              <span>Bekijk op /fractie</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>

          {editingId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetForm}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Annuleren bewerken</span>
            </Button>
          )}
        </div>
      </div>

      {/* Formulier: Toevoegen of Bewerken */}
      <div className="bg-muted/20 border border-border rounded-xl p-5 md:p-6 shadow-xs">
        <div className="flex items-center gap-2 font-display text-lg font-semibold text-foreground mb-4">
          {editingId ? (
            <>
              <Pencil className="w-4 h-4 text-accent" />
              <span>Stemgedrag bewerken</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 text-accent" />
              <span>Nieuw stemgedrag toevoegen</span>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Categorie selectie: Motie, Voorstel, Amendement */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Categorie <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2 bg-background p-1.5 rounded-lg border border-border max-w-lg">
              <button
                type="button"
                id="btn-cat-motie"
                onClick={() => setCategory("motie")}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  category === "motie"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Motie</span>
              </button>
              <button
                type="button"
                id="btn-cat-voorstel"
                onClick={() => {
                  setCategory("voorstel");
                  if (vote === "ingetrokken-toezegging") {
                    setVote("voor");
                    if (/ingetrokken.*toezegging/i.test(resultaat)) {
                      setResultaat("Aangenomen");
                    }
                  }
                }}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  category === "voorstel"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Voorstel</span>
              </button>
              <button
                type="button"
                id="btn-cat-amendement"
                onClick={() => setCategory("amendement")}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  category === "amendement"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Amendement</span>
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Bepaalt de knoptekst op de fractiepagina (bijv. &apos;Bekijk originele motie&apos;, &apos;Bekijk origineel voorstel&apos; of &apos;Bekijk origineel amendement&apos;).
            </p>
          </div>

          {/* Titel van de motie / voorstel / amendement */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Titel of onderwerp <span className="text-red-500">*</span>
            </label>
            <Input
              id="motie-title-input"
              type="text"
              placeholder={
                category === "motie"
                  ? "Bijv. Motie: Voorrang voor lokale starters bij nieuwbouwprojecten"
                  : category === "voorstel"
                  ? "Bijv. Raadsvoorstel: Vaststelling bestemmingsplan centrum Steenwijk"
                  : "Bijv. Amendement: Behoud groenstrook en speelplek Meenthehof"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-background border-border text-sm"
            />
          </div>

          {/* Grid met Metadata: Type indiening, Stemkeuze, Datum */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Type indiener: Eigen motie, Mede-indiener, Regulier */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Type indiening
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-background p-1 rounded-lg border border-border">
                <button
                  type="button"
                  id="btn-type-eigen"
                  onClick={() => setMotionType("eigen")}
                  className={`py-1.5 px-2 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    motionType === "eigen"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Eigen</span>
                </button>
                <button
                  type="button"
                  id="btn-type-mede"
                  onClick={() => {
                    setMotionType("mede-indiener");
                    if (vote === "ingetrokken-toezegging") {
                      setVote("voor");
                      if (/ingetrokken.*toezegging/i.test(resultaat)) {
                        setResultaat("Aangenomen");
                      }
                    }
                  }}
                  className={`py-1.5 px-2 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    motionType === "mede-indiener"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="w-3 h-3" />
                  <span>Mede</span>
                </button>
                <button
                  type="button"
                  id="btn-type-regulier"
                  onClick={() => {
                    setMotionType("regulier");
                    if (vote === "ingetrokken-toezegging") {
                      setVote("voor");
                      if (/ingetrokken.*toezegging/i.test(resultaat)) {
                        setResultaat("Aangenomen");
                      }
                    }
                  }}
                  className={`py-1.5 px-2 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    motionType === "regulier"
                      ? "bg-muted text-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Regulier</span>
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {motionType === "eigen"
                  ? "Eigen indiening: zelf geschreven en ingediend door Lijst van Andel."
                  : motionType === "mede-indiener"
                  ? "Mede-indiener: samen met een andere partij ingediend."
                  : "Regulier: ingediend door een andere partij of college."}
              </p>
            </div>

            {/* 2. Onze Stem / Afdoening: VOOR, TEGEN of INGETROKKEN DOOR TOEZEGGING */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Stemkeuze / Afdoening Lijst van Andel
              </label>
              <div className="space-y-1.5 bg-background p-1.5 rounded-lg border border-border">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    id="btn-vote-voor"
                    onClick={() => handleSelectVote("voor")}
                    className={`py-1.5 px-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      vote === "voor"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Voor gestemd</span>
                  </button>
                  <button
                    type="button"
                    id="btn-vote-tegen"
                    onClick={() => handleSelectVote("tegen")}
                    className={`py-1.5 px-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      vote === "tegen"
                        ? "bg-red-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Tegen gestemd</span>
                  </button>
                </div>
                <button
                  type="button"
                  id="btn-vote-ingetrokken-toezegging"
                  onClick={() => handleSelectVote("ingetrokken-toezegging")}
                  className={`w-full py-1.5 px-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    vote === "ingetrokken-toezegging"
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-dashed border-border"
                  }`}
                >
                  <Handshake className="w-3.5 h-3.5" />
                  <span>Ingetrokken door toezegging</span>
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {vote === "ingetrokken-toezegging"
                  ? "Eigen motie/amendement ingetrokken door toezegging van de wethouder (geen stemming)."
                  : "Fractiestem tijdens de besluitvorming in de raad."}
              </p>
            </div>

            {/* 3. Datum van stemming / behandeling */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                {vote === "ingetrokken-toezegging" ? "Datum van behandeling" : "Datum van de stemming"}
              </label>
              <Input
                id="motie-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="bg-background border-border text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {vote === "ingetrokken-toezegging"
                  ? "Datum waarop de toezegging in de raad is gedaan."
                  : "Datum waarop over het voorstel is gestemd."}
              </p>
            </div>
          </div>

          {/* Optionele velden: Raadsvergadering & Resultaat */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Raadsvergadering (optioneel)
              </label>
              <Input
                type="text"
                placeholder="Bijv. Raadsvergadering 28 mei 2026 of Commissie Ruimte"
                value={raadsvergadering}
                onChange={(e) => setRaadsvergadering(e.target.value)}
                className="bg-background border-border text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Uitslag / Resultaat van de raad (optioneel)
              </label>
              <Input
                type="text"
                placeholder="Bijv. Aangenomen, Verworpen of Ingetrokken door toezegging"
                value={resultaat}
                onChange={(e) => setResultaat(e.target.value)}
                className="bg-background border-border text-sm"
              />
            </div>
          </div>

          {/* Beschrijving & Uitleg (Maximaal 600 tekens) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {vote === "ingetrokken-toezegging"
                  ? "Toelichting op de toezegging & intrekking"
                  : "Uitleg waarom er zo is gestemd"}{" "}
                <span className="text-red-500">* (max. 600 tekens)</span>
              </label>
              <span
                className={`text-xs font-mono font-medium ${
                  charsLeft < 0
                    ? "text-red-500 font-bold"
                    : charsLeft < 50
                    ? "text-amber-500 font-bold"
                    : "text-muted-foreground"
                }`}
              >
                {description.length} / 600 tekens ({charsLeft >= 0 ? `${charsLeft} over` : `${Math.abs(charsLeft)} te veel`})
              </span>
            </div>
            <Textarea
              id="motie-description-input"
              rows={4}
              maxLength={600}
              placeholder={
                vote === "ingetrokken-toezegging"
                  ? "Geef een heldere toelichting welke toezegging de wethouder heeft gedaan waardoor deze eigen motie of dit eigen amendement is ingetrokken..."
                  : "Geef een heldere toelichting waarom Lijst van Andel vóór of tegen dit voorstel heeft gestemd..."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`bg-background border-border text-sm leading-relaxed ${
                description.length > 600 ? "border-red-500 ring-1 ring-red-500" : ""
              }`}
              required
            />
            {description.length >= 600 && (
              <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>U heeft het maximum van 600 tekens bereikt.</span>
              </p>
            )}
          </div>

          {/* Uploads: Afbeelding & PDF Document */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* 1. Afbeelding upload */}
            <div className="border border-border rounded-xl p-4 bg-background">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-accent" />
                <span>Bijbehorende afbeelding (vaste grootte op pagina)</span>
              </label>

              {imagePreview ? (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden border border-border max-h-40 bg-muted/30 flex items-center justify-center">
                    <img
                      src={imagePreview}
                      alt="Voorvertoning"
                      className="object-contain max-h-36 w-auto"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground truncate">
                      {imageFile ? imageFile.name : "Huidige afbeelding bewaard"}
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeSelectedImage}
                      className="h-7 text-xs px-2"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Verwijder
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    ref={imageInputRef}
                    id="motie-image-file"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent/15 file:text-accent hover:file:bg-accent/25 cursor-pointer"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Wordt links van de uitleg in een vaste grootte weergegeven.
                  </p>
                </div>
              )}
            </div>

            {/* 2. PDF Document upload */}
            <div className="border border-border rounded-xl p-4 bg-background">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <FileDown className="w-3.5 h-3.5 text-accent" />
                <span>Origineel document (.pdf)</span>
              </label>

              {pdfFile || currentPdfUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-accent/30 bg-accent/5">
                    <FileText className="w-8 h-8 text-accent shrink-0" />
                    <div className="truncate flex-1">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {pdfFileName || "Origineel_document.pdf"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {pdfFile ? `${Math.round(pdfFile.size / 1024)} KB` : "PDF document gekoppeld"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {currentPdfUrl && !pdfFile ? (
                      <a
                        href={currentPdfUrl.startsWith("/uploads/") ? `/api/document/view?file=${encodeURIComponent(currentPdfUrl)}` : currentPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Bekijk huidige PDF
                      </a>
                    ) : (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Nieuw PDF bestand geselecteerd
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeSelectedPdf}
                      className="h-7 text-xs px-2"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Verwijder
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    ref={pdfInputRef}
                    id="motie-pdf-file"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfChange}
                    className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent/15 file:text-accent hover:file:bg-accent/25 cursor-pointer"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Koppelt de knop &apos;Bekijk originele {category}&apos; aan dit document.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Opslaan & Annuleren knoppen */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {editingId && (
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={submitting}
              >
                Annuleren
              </Button>
            )}
            <Button
              type="submit"
              disabled={submitting || description.length > 600}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
            >
              {submitting ? (
                <span>Opslaan...</span>
              ) : editingId ? (
                <span>Wijzigingen opslaan</span>
              ) : (
                <span>Stemgedrag toevoegen</span>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Overzicht van geregistreerde items */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-xl text-foreground">
              Geregistreerd Stemgedrag ({items.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Beheer, wijzig of verwijder gepubliceerd stemgedrag.
            </p>
          </div>

          {/* Zoeken & Filteren in Beheerderslijst */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-9 text-xs rounded-md bg-background border border-border px-3 text-foreground"
            >
              <option value="all">Alle categorieën</option>
              <option value="motie">Moties ({items.filter(i => (i.category || 'motie') === 'motie').length})</option>
              <option value="voorstel">Voorstellen ({items.filter(i => i.category === 'voorstel').length})</option>
              <option value="amendement">Amendementen ({items.filter(i => i.category === 'amendement').length})</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-9 text-xs rounded-md bg-background border border-border px-3 text-foreground"
            >
              <option value="all">Alle types ({items.length})</option>
              <option value="eigen">Eigen indiening ({items.filter(i => i.motionType === 'eigen' || isIngetrokkenDoorToezegging(i)).length})</option>
              <option value="mede-indiener">Mede-indiener ({items.filter(i => i.motionType === 'mede-indiener' && !isIngetrokkenDoorToezegging(i)).length})</option>
              <option value="voor">Voor gestemd ({items.filter(i => !isIngetrokkenDoorToezegging(i) && i.vote === 'voor').length})</option>
              <option value="tegen">Tegen gestemd ({items.filter(i => !isIngetrokkenDoorToezegging(i) && i.vote === 'tegen').length})</option>
              <option value="ingetrokken-toezegging">Ingetrokken door toezegging ({items.filter(i => isIngetrokkenDoorToezegging(i)).length})</option>
            </select>

            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Zoek in overzicht..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs bg-background border-border"
              />
            </div>
          </div>
        </div>

        {/* Kaartenlijst */}
        {loading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Gegevens worden geladen...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
            Geen items gevonden voor de geselecteerde zoek- of filteropdracht.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredList.map((item) => {
              const isIngetrokkenToezegging = isIngetrokkenDoorToezegging(item);
              const isVoor = !isIngetrokkenToezegging && item.vote === "voor";
              const isEigen = item.motionType === "eigen" || isIngetrokkenToezegging;
              const isMede = !isEigen && item.motionType === "mede-indiener";
              const itemCat = item.category || "motie";
              const displayResultaat = item.resultaat
                ? item.resultaat.replace(/Ingetrokken\s+i\.?v\.?m\.?\s+toezegging/gi, "Ingetrokken door toezegging")
                : "";

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    editingId === item.id
                      ? "border-accent ring-1 ring-accent bg-accent/5"
                      : "border-border bg-background hover:border-border/80"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          {itemCat === "voorstel"
                            ? "Voorstel"
                            : itemCat === "amendement"
                            ? "Amendement"
                            : "Motie"}
                        </span>

                        {isIngetrokkenToezegging ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                            <Handshake className="w-3 h-3" /> Ingetrokken door toezegging
                          </span>
                        ) : isVoor ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <Check className="w-3 h-3 stroke-[3]" /> Voor gestemd
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30">
                            <X className="w-3 h-3 stroke-[3]" /> Tegen gestemd
                          </span>
                        )}

                        {isEigen && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <Sparkles className="w-3 h-3" /> Eigen
                          </span>
                        )}
                        {isMede && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                            <Users className="w-3 h-3" /> Mede-indiener
                          </span>
                        )}
                        {!isEigen && !isMede && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                            <FileText className="w-3 h-3" /> Regulier
                          </span>
                        )}

                        <span className="text-xs text-muted-foreground flex items-center gap-1 ml-1">
                          <Calendar className="w-3 h-3 text-accent" /> {item.date}
                        </span>

                        {displayResultaat && (
                          <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                            Uitslag: {displayResultaat}
                          </span>
                        )}
                      </div>

                      {/* Titel */}
                      <h4 className="font-semibold text-base text-foreground">
                        {item.title}
                      </h4>

                      {/* Uitleg */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {item.description}
                      </p>

                      {/* Attachments indicators */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {item.imageUrl && (
                          <a
                            href={item.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                          >
                            <Eye className="w-3 h-3" /> Afbeelding bekijken
                          </a>
                        )}
                        {item.pdfUrl && (
                          <a
                            href={item.pdfUrl.startsWith("/uploads/") ? `/api/document/view?file=${encodeURIComponent(item.pdfUrl)}` : item.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline font-medium"
                          >
                            <FileDown className="w-3 h-3" /> Origineel ({itemCat}) PDF
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Actieknoppen */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(item)}
                        className="h-8 text-xs gap-1 border-border"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Bewerken</span>
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item.id, item.title)}
                        className="h-8 text-xs gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Verwijder</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
