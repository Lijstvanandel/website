import React, { useState, useEffect, useCallback } from "react";
import { FaqItem } from "@/types/faq";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  Eye,
  EyeOff,
  Tag,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";

interface FaqManagerProps {
  token: string | null;
}

const DEFAULT_CATEGORIES = [
  "Algemeen",
  "Contact & Inwoners",
  "Politiek & Standpunten",
  "Lidmaatschap",
  "Wijken & Kernen",
  "Woningbouw",
];

export function FaqManager({ token }: FaqManagerProps) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("alle");

  // Modal states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [formCategory, setFormCategory] = useState("Algemeen");
  const [formCustomCategory, setFormCustomCategory] = useState("");
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formPublished, setFormPublished] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal state
  const [faqToDelete, setFaqToDelete] = useState<FaqItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/admin/faqs");
      if (res.ok) {
        const data = await res.json().catch(() => []);
        setFaqs(Array.isArray(data) ? data : []);
      } else {
        toast.error("Kon FAQ's niet ophalen");
      }
    } catch {
      toast.error("Verbindingsfout bij ophalen FAQ's");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const handleOpenCreate = () => {
    setEditingFaq(null);
    setFormQuestion("");
    setFormAnswer("");
    setFormCategory("Algemeen");
    setFormCustomCategory("");
    const nextOrder = faqs.length > 0 ? Math.max(...faqs.map((f) => f.order || 0)) + 1 : 1;
    setFormOrder(nextOrder);
    setFormPublished(true);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (faq: FaqItem) => {
    setEditingFaq(faq);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    if (DEFAULT_CATEGORIES.includes(faq.category)) {
      setFormCategory(faq.category);
      setFormCustomCategory("");
    } else {
      setFormCategory("Aangepast");
      setFormCustomCategory(faq.category);
    }
    setFormOrder(faq.order || 1);
    setFormPublished(faq.published !== false);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const trimmedQuestion = formQuestion.trim();
    const trimmedAnswer = formAnswer.trim();
    const finalCategory =
      formCategory === "Aangepast"
        ? formCustomCategory.trim() || "Algemeen"
        : formCategory;

    if (!trimmedQuestion) {
      toast.error("Vul een vraag in");
      return;
    }
    if (!trimmedAnswer) {
      toast.error("Vul een antwoord in");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        question: trimmedQuestion,
        answer: trimmedAnswer,
        category: finalCategory,
        order: Number(formOrder) || 1,
        published: formPublished,
      };

      if (editingFaq) {
        const res = await fetchWithAuth(`/api/admin/faqs/${editingFaq.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          toast.success("Veelgestelde vraag succesvol bijgewerkt");
          setIsDialogOpen(false);
          fetchFaqs();
        } else {
          const err = await res.json();
          toast.error(err.error || "Fout bij bijwerken vraag");
        }
      } else {
        const res = await fetchWithAuth("/api/admin/faqs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          toast.success("Nieuwe veelgestelde vraag toegevoegd");
          setIsDialogOpen(false);
          fetchFaqs();
        } else {
          const err = await res.json();
          toast.error(err.error || "Fout bij toevoegen vraag");
        }
      }
    } catch {
      toast.error("Er is een onverwachte netwerkfout opgetreden");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublished = async (faq: FaqItem) => {
    const newStatus = !faq.published;
    try {
      // Optimistic update
      setFaqs((prev) =>
        prev.map((f) => (f.id === faq.id ? { ...f, published: newStatus } : f))
      );
      const res = await fetchWithAuth(`/api/admin/faqs/${faq.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ published: newStatus }),
      });
      if (res.ok) {
        toast.success(
          newStatus
            ? "Vraag staat nu online op de contactpagina"
            : "Vraag is nu verborgen voor bezoekers"
        );
      } else {
        fetchFaqs();
        toast.error("Kon status niet bijwerken");
      }
    } catch {
      fetchFaqs();
      toast.error("Fout bij bijwerken status");
    }
  };

  const handleDelete = async () => {
    if (!faqToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/admin/faqs/${faqToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Vraag definitief verwijderd");
        setFaqToDelete(null);
        fetchFaqs();
      } else {
        toast.error("Kon vraag niet verwijderen");
      }
    } catch {
      toast.error("Fout bij verwijderen");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= faqs.length) return;

    const newFaqs = [...faqs];
    const [moved] = newFaqs.splice(index, 1);
    newFaqs.splice(targetIndex, 0, moved);

    // Update order numbers sequentially
    const updatedIds = newFaqs.map((f) => f.id);
    setFaqs(newFaqs.map((f, idx) => ({ ...f, order: idx + 1 })));

    try {
      const res = await fetchWithAuth("/api/admin/faqs-reorder", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: updatedIds }),
      });
      if (!res.ok) {
        toast.error("Kon volgorde niet opslaan op de server");
        fetchFaqs();
      }
    } catch {
      toast.error("Fout bij opslaan volgorde");
      fetchFaqs();
    }
  };

  // Extract all categories available in faqs + defaults
  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...faqs.map((f) => f.category)])
  ).filter(Boolean);

  const filteredFaqs = faqs.filter((f) => {
    const matchesSearch =
      searchQuery === "" ||
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "alle" || f.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const publishedCount = faqs.filter((f) => f.published !== false).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent border border-accent/25 mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            Veelgestelde Vragen
          </div>
          <h2 className="text-2xl md:text-3xl font-display">FAQ Beheer</h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">
            Beheer hier dynamisch de vragen en antwoorden die zichtbaar zijn in de FAQ-sectie op de contactpagina. Wijzigingen zijn direct zichtbaar voor inwoners.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/contact#faq"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-2 border border-border rounded-xl transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-accent" />
            Bekijk op contactpagina
          </a>
          <Button
            onClick={fetchFaqs}
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5"
            title="Vernieuwen"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold gap-2"
          >
            <Plus className="w-4 h-4" /> Vraag toevoegen
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Totaal vragen
          </div>
          <div className="text-2xl font-display mt-1 text-foreground">{faqs.length}</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Gepubliceerd
          </div>
          <div className="text-2xl font-display mt-1 text-emerald-600 dark:text-emerald-400">
            {publishedCount}
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Verborgen
          </div>
          <div className="text-2xl font-display mt-1 text-amber-600 dark:text-amber-400">
            {faqs.length - publishedCount}
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Categorieën
          </div>
          <div className="text-2xl font-display mt-1 text-accent">
            {new Set(faqs.map((f) => f.category)).size}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op vraag, antwoord of categorie..."
            className="pl-9 text-xs rounded-xl"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory("alle")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedCategory === "alle"
                ? "bg-accent text-accent-foreground font-semibold"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Alle ({faqs.length})
          </button>
          {allCategories.map((cat) => {
            const count = faqs.filter((f) => f.category === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* List of FAQs */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-accent" />
          FAQ-items worden geladen...
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl p-6">
          <HelpCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-1">Geen vragen gevonden</h3>
          <p className="text-xs max-w-md mx-auto mb-4">
            {searchQuery || selectedCategory !== "alle"
              ? "Er zijn geen FAQ's die voldoen aan de huidige zoekfilters."
              : "Er zijn nog geen veelgestelde vragen toegevoegd."}
          </p>
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="rounded-xl text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Eerste vraag toevoegen
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq, index) => (
            <div
              key={faq.id}
              className={`bg-card border rounded-2xl p-5 transition-all shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                faq.published !== false
                  ? "border-border hover:border-accent/40"
                  : "border-border/50 opacity-70 bg-muted/20"
              }`}
            >
              {/* Order buttons + Content */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Reorder up/down controls */}
                <div className="flex flex-col items-center shrink-0 bg-muted/40 border border-border/60 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => handleMove(index, "up")}
                    disabled={index === 0}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-25 hover:bg-muted rounded"
                    title="Omhoog verplaatsen"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-bold text-muted-foreground my-0.5">
                    {faq.order || index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleMove(index, "down")}
                    disabled={index === faqs.length - 1}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-25 hover:bg-muted rounded"
                    title="Omlaag verplaatsen"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium border border-accent/20">
                      <Tag className="w-3 h-3" />
                      {faq.category}
                    </span>

                    {faq.published !== false ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/25">
                        <Eye className="w-3 h-3" /> Gepubliceerd
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium border border-amber-500/25">
                        <EyeOff className="w-3 h-3" /> Verborgen (concept)
                      </span>
                    )}
                  </div>

                  <h4 className="font-display text-lg text-foreground leading-snug">
                    {faq.question}
                  </h4>

                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-3 md:line-clamp-none">
                    {faq.answer}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end md:self-start shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40 w-full md:w-auto justify-end">
                {/* Fast Publish Toggle */}
                <button
                  type="button"
                  onClick={() => handleTogglePublished(faq)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5 ${
                    faq.published !== false
                      ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                      : "border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                  }`}
                  title={faq.published !== false ? "Zet op verborgen" : "Publiceer online"}
                >
                  {faq.published !== false ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Online
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Verborgen
                    </>
                  )}
                </button>

                <Button
                  onClick={() => handleOpenEdit(faq)}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs gap-1.5 h-8"
                >
                  <Pencil className="w-3.5 h-3.5 text-accent" /> Bewerken
                </Button>

                <Button
                  onClick={() => setFaqToDelete(faq)}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs gap-1.5 h-8 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-accent" />
              {editingFaq ? "Veelgestelde vraag bewerken" : "Nieuwe veelgestelde vraag toevoegen"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Deze vraag en dit antwoord worden getoond in het uitklapbare FAQ-overzicht op de contactpagina.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Vraag */}
            <div className="space-y-1.5">
              <Label htmlFor="faq-q" className="text-xs font-semibold">
                Vraag (Koptekst) *
              </Label>
              <Input
                id="faq-q"
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="Bijv. Hoe kan ik een probleem in mijn straat aankaarten?"
                required
                className="text-sm"
              />
            </div>

            {/* Antwoord */}
            <div className="space-y-1.5">
              <Label htmlFor="faq-a" className="text-xs font-semibold">
                Antwoord (Duidelijke uitleg voor inwoners) *
              </Label>
              <Textarea
                id="faq-a"
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                rows={6}
                placeholder="Geef hier een helder, vriendelijk en informatief antwoord..."
                required
                className="text-sm leading-relaxed"
              />
            </div>

            {/* Categorie */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="faq-cat" className="text-xs font-semibold">
                  Categorie
                </Label>
                <select
                  id="faq-cat"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full text-xs h-10 px-3 rounded-md border border-input bg-background text-foreground"
                >
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Aangepast">+ Zelf een categorie typen...</option>
                </select>
              </div>

              {formCategory === "Aangepast" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="faq-custom-cat" className="text-xs font-semibold">
                    Aangepaste categorienaam
                  </Label>
                  <Input
                    id="faq-custom-cat"
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    placeholder="Bijv. Milieu & Afval"
                    className="text-xs"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="faq-ord" className="text-xs font-semibold">
                    Weergavevolgorde (1 = bovenaan)
                  </Label>
                  <Input
                    id="faq-ord"
                    type="number"
                    min={1}
                    value={formOrder}
                    onChange={(e) => setFormOrder(parseInt(e.target.value) || 1)}
                    className="text-xs"
                  />
                </div>
              )}
            </div>

            {/* Gepubliceerd toggle */}
            <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-foreground">
                  Gepubliceerd op de website
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Wanneer ingeschakeld, is deze vraag direct zichtbaar voor alle bezoekers van de contactpagina.
                </div>
              </div>
              <Switch
                checked={formPublished}
                onCheckedChange={setFormPublished}
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="text-xs rounded-xl"
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-xl font-semibold"
              >
                {isSaving ? "Opslaan..." : editingFaq ? "Wijzigingen opslaan" : "Vraag toevoegen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!faqToDelete} onOpenChange={(open) => !open && setFaqToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Vraag verwijderen?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Weet u zeker dat u de vraag <strong className="text-foreground">"{faqToDelete?.question}"</strong> wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFaqToDelete(null)}
              className="text-xs rounded-xl"
            >
              Annuleren
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
              className="text-xs rounded-xl font-semibold"
            >
              {isDeleting ? "Verwijderen..." : "Definitief verwijderen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
