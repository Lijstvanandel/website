import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileSearch,
  Search,
  Plus,
  Edit3,
  Trash2,
  FileText,
  Download,
  ExternalLink,
  MessageSquare,
  X,
  Calendar,
  User,
  Tag,
  Building2,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  Loader2,
  Maximize2,
  Filter,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export interface CouncilResearchComment {
  id: string;
  authorUsername: string;
  authorName: string;
  note: string;
  createdAt: string;
}

export interface CouncilResearchItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  date?: string;
  authorName?: string;
  createdByName?: string;
  createdByUsername?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  comments?: CouncilResearchComment[];
  createdAt: string;
  updatedAt?: string;
}

interface CouncilResearchManagerProps {
  token?: string;
}

const CATEGORIES = [
  "Alle",
  "Competenties",
  "Ruimtelijke Ordening",
  "Financiën",
  "Sociaal Domein",
  "Verkeer & Mobiliteit",
  "Veiligheid",
  "Bestuur & Organisatie",
  "Duurzaamheid & Milieu",
  "Overig",
];

export const CouncilResearchManager: React.FC<CouncilResearchManagerProps> = ({ token: propToken }) => {
  const { user, token: authContextToken } = useAuth();
  const token = propToken || authContextToken || localStorage.getItem("token") || sessionStorage.getItem("token");

  const [items, setItems] = useState<CouncilResearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Alle");

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CouncilResearchItem | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("Ruimtelijke Ordening");
  const [formAuthorName, setFormAuthorName] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formTags, setFormTags] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formFileUrl, setFormFileUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Viewer state
  const [activeViewerItem, setActiveViewerItem] = useState<CouncilResearchItem | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Fetch research items
  const fetchResearchItems = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/council/research", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon onderzoeken niet laden");
      setItems(data.items || []);
    } catch (err: any) {
      console.error("[RESEARCH FETCH ERROR]", err);
      toast.error(err.message || "Fout bij ophalen van onderzoeken");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchResearchItems();
  }, [fetchResearchItems]);

  // Open add modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormDescription("");
    setFormCategory("Ruimtelijke Ordening");
    setFormAuthorName("Rekenkamer Steenwijkerland");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormTags("");
    setFormFile(null);
    setFormFileUrl("");
    setIsFormModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (item: CouncilResearchItem) => {
    setEditingItem(item);
    setFormTitle(item.title || "");
    setFormDescription(item.description || "");
    setFormCategory(item.category || "Ruimtelijke Ordening");
    setFormAuthorName(item.authorName || "");
    setFormDate(item.date || new Date().toISOString().split("T")[0]);
    setFormTags(item.tags ? item.tags.join(", ") : "");
    setFormFile(null);
    setFormFileUrl(item.fileUrl || "");
    setIsFormModalOpen(true);
  };

  // Submit form (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Titel is verplicht!");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", formTitle.trim());
      formData.append("description", formDescription.trim());
      formData.append("category", formCategory);
      formData.append("authorName", formAuthorName.trim());
      formData.append("date", formDate);
      formData.append("tags", formTags.trim());
      if (formFileUrl) {
        formData.append("fileUrl", formFileUrl.trim());
      }
      if (formFile) {
        formData.append("file", formFile);
      }

      const isEdit = !!editingItem;
      const url = isEdit ? `/api/council/research/${editingItem.id}` : "/api/council/research";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");

      toast.success(isEdit ? "Onderzoek bijgewerkt!" : "Nieuw onderzoek succesvol toegevoegd!");
      setIsFormModalOpen(false);
      fetchResearchItems();
    } catch (err: any) {
      toast.error(err.message || "Fout bij opslaan");
    } finally {
      setSaving(false);
    }
  };

  // Delete research item
  const handleDeleteItem = async (id: string, title: string) => {
    if (!confirm(`Weet u zeker dat u het onderzoek "${title}" wilt verwijderen?`)) return;

    try {
      const res = await fetch(`/api/council/research/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verwijderen mislukt");

      toast.success("Onderzoek verwijderd");
      if (activeViewerItem?.id === id) {
        setActiveViewerItem(null);
      }
      fetchResearchItems();
    } catch (err: any) {
      toast.error(err.message || "Fout bij verwijderen");
    }
  };

  // Add comment to active viewer item
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeViewerItem || !commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/council/research/${activeViewerItem.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: commentText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon opmerking niet opslaan");

      toast.success("Opmerking geplaatst!");
      setCommentText("");

      // Update active viewer item state dynamically
      if (data.item) {
        setActiveViewerItem(data.item);
        setItems((prev) => prev.map((it) => (it.id === data.item.id ? data.item : it)));
      } else {
        fetchResearchItems();
      }
    } catch (err: any) {
      toast.error(err.message || "Fout bij plaatsen opmerking");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!activeViewerItem) return;

    try {
      const res = await fetch(`/api/council/research/${activeViewerItem.id}/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon opmerking niet verwijderen");

      toast.success("Opmerking verwijderd");
      if (data.item) {
        setActiveViewerItem(data.item);
        setItems((prev) => prev.map((it) => (it.id === data.item.id ? data.item : it)));
      }
    } catch (err: any) {
      toast.error(err.message || "Fout bij verwijderen opmerking");
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesCategory = selectedCategory === "Alle" || item.category === selectedCategory;

      if (!q) return matchesCategory;

      const matchesQuery =
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.authorName && item.authorName.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q))) ||
        (item.createdByName && item.createdByName.toLowerCase().includes(q));

      return matchesCategory && matchesQuery;
    });
  }, [items, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-card via-card to-muted/40 border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-bold border border-accent/20">
            <FileSearch className="w-3.5 h-3.5" />
            <span>Raadsonderzoeken & Rapporten</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground">
            Onderzoeken
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Centrale kennisbank voor onderzoeken, rekenkamerrapporten, evaluaties en beleidsanalyses.
            Elk raadslid kan onderzoeken toevoegen, bewerken en inzien met een PDF-viewer en fractie-opmerkingen.
          </p>
        </div>

        <Button
          id="btn-add-research"
          onClick={handleOpenAddModal}
          className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold h-11 px-5 rounded-xl shadow-md flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Onderzoek toevoegen</span>
        </Button>
      </div>

      {/* Zoekbalk & Categorie Filter Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="input-search-research"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek in onderzoeken op titel, rekenkamer, onderwerp, tags of trefwoorden..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-foreground placeholder:text-muted-foreground/70"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-muted-foreground font-medium shrink-0 px-1">
            {filteredItems.length} {filteredItems.length === 1 ? "onderzoek" : "onderzoeken"} gevonden
          </div>
        </div>

        {/* Categorie Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1 mr-1 shrink-0">
            <Filter className="w-3 h-3" /> Categorie:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${
                selectedCategory === cat
                  ? "bg-accent text-accent-foreground border-accent shadow-2xs"
                  : "bg-card text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tegeloverzicht (Grid of Research Items) */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Onderzoeken inladen...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-card border border-dashed border-border space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <FileSearch className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            Geen onderzoeken gevonden
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {searchQuery || selectedCategory !== "Alle"
              ? "Geen onderzoeken gevonden met de huidige zoekopdracht of categorie-filter. Probeer de zoekopdracht aan te passen."
              : "Er zijn nog geen onderzoeken geüpload. Klik op 'Onderzoek toevoegen' om het eerste onderzoek op te slaan."}
          </p>
          <Button onClick={handleOpenAddModal} size="sm" variant="outline" className="mt-2">
            <Plus className="w-4 h-4 mr-1.5" /> Nieuw onderzoek toevoegen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredItems.map((item) => {
            const commentsCount = item.comments?.length || 0;
            const hasPdf = Boolean(item.fileUrl);

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-card border border-border/90 hover:border-accent/40 hover:shadow-md transition-all duration-200"
              >
                <div className="space-y-3">
                  {/* Top Row Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/25 truncate">
                      {item.category || "Overig"}
                    </span>
                    {item.date && (
                      <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3 text-muted-foreground/80" />
                        {new Date(item.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-display font-bold text-base sm:text-lg text-foreground group-hover:text-accent transition-colors leading-snug line-clamp-2">
                    {item.title}
                  </h3>

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  )}

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-muted text-muted-foreground border border-border/50"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Metadata & Actions */}
                <div className="mt-4 pt-3.5 border-t border-border/80 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 truncate font-medium text-foreground/80">
                      <Building2 className="w-3 h-3 text-accent shrink-0" />
                      <span className="truncate">{item.authorName || "Gemeenteraad"}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0 ml-2">
                      <MessageSquare className="w-3 h-3 text-accent" />
                      <span>{commentsCount} {commentsCount === 1 ? "opmerking" : "opmerkingen"}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {/* View & PDF Viewer Button */}
                    <Button
                      size="sm"
                      onClick={() => setActiveViewerItem(item)}
                      className="flex-1 bg-accent/15 hover:bg-accent text-accent hover:text-accent-foreground font-bold h-9 text-xs rounded-xl border border-accent/30 transition-all flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Bekijken & PDF</span>
                    </Button>

                    {/* Edit Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditModal(item)}
                      className="h-9 w-9 p-0 rounded-xl border-border hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                      title="Onderzoek bewerken"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>

                    {/* Delete Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteItem(item.id, item.title)}
                      className="h-9 w-9 p-0 rounded-xl border-border hover:bg-destructive/10 hover:text-destructive text-muted-foreground shrink-0"
                      title="Onderzoek verwijderen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Onderzoek Toevoegen / Bewerken */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-2xl bg-card border-border">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-accent" />
              <span>{editingItem ? "Onderzoek bewerken" : "Nieuw onderzoek toevoegen"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingItem
                ? "Pas de gegevens of het geüploade PDF-document van het onderzoek aan."
                : "Vul de titel en gegevens in en upload het onderzoeksrapport of rekenkamerstuk."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            {/* Titel (Verplicht) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Titel van onderzoek <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Bijv. Rekenkameronderzoek Woningbouw en Vergunningen 2026"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
            </div>

            {/* Categorie & Auteur Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Categorie / Onderwerp</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                >
                  {CATEGORIES.filter((c) => c !== "Alle").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Auteur / Organisatie</label>
                <input
                  type="text"
                  value={formAuthorName}
                  onChange={(e) => setFormAuthorName(e.target.value)}
                  placeholder="Bijv. Rekenkamer, Raadscommissie, Audit"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                />
              </div>
            </div>

            {/* Datum & Tags Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Datum van onderzoek</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Tags (komma-gescheiden)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="Bijv. Woningbouw, Subsidies, Verkeer"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                />
              </div>
            </div>

            {/* Beschrijving */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Beschrijving / Samenvatting</label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Korte toelichting of bevindingen uit het onderzoek..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
              />
            </div>

            {/* PDF Bestand Upload & URL */}
            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
              <label className="text-xs font-bold text-foreground block">
                PDF Document Uploaden
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <label className="cursor-pointer flex-1 w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 text-xs font-semibold text-foreground transition-all">
                  <Upload className="w-4 h-4 text-accent" />
                  <span>{formFile ? formFile.name : "Selecteer .pdf bestand"}</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setFormFile(e.target.files[0]);
                    }}
                  />
                </label>

                <span className="text-xs text-muted-foreground font-medium">of</span>

                <input
                  type="url"
                  value={formFileUrl}
                  onChange={(e) => setFormFileUrl(e.target.value)}
                  placeholder="https://.../rapport.pdf"
                  className="flex-1 w-full px-3 py-2 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Upload een .pdf onderzoeksrapport of geef de directe URL op naar een openbaar document.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsFormModalOpen(false)}
                className="h-10 text-xs"
              >
                Annuleren
              </Button>

              <Button
                type="submit"
                disabled={saving}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold h-10 px-5 text-xs rounded-xl"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opslaan...
                  </>
                ) : editingItem ? (
                  "Wijzigingen opslaan"
                ) : (
                  "Onderzoek opslaan"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: PDF Viewer met Geïntegreerd Opmerkingenveld */}
      {activeViewerItem && (() => {
        const docUrl = activeViewerItem.fileUrl || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
        const proxyUrl = docUrl.startsWith("/uploads/")
          ? `/api/council/document-proxy?url=${encodeURIComponent(docUrl)}${token ? `&token=${encodeURIComponent(token)}` : ""}`
          : docUrl;

        const comments = activeViewerItem.comments || [];

        return (
          <Dialog open={!!activeViewerItem} onOpenChange={(open) => !open && setActiveViewerItem(null)}>
            <DialogContent className="max-w-6xl w-[96vw] h-[92vh] max-h-[95vh] flex flex-col p-4 sm:p-6 rounded-2xl bg-card border-border overflow-hidden">
              <DialogHeader className="pb-3 border-b border-border/80 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold uppercase tracking-wider bg-accent/20 text-accent border border-accent/40">
                        {activeViewerItem.category || "Onderzoek"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {activeViewerItem.authorName || "Gemeenteraad"} • {activeViewerItem.date ? new Date(activeViewerItem.date).toLocaleDateString("nl-NL") : "Geen datum"}
                      </span>
                    </div>
                    <DialogTitle className="font-display text-base sm:text-lg text-foreground truncate" title={activeViewerItem.title}>
                      {activeViewerItem.title}
                    </DialogTitle>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <a href={docUrl} download={activeViewerItem.fileName || "Onderzoek.pdf"} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="h-8 text-xs">
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Download PDF
                      </Button>
                    </a>

                    <a href={docUrl} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="secondary" className="h-8 text-xs">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        Nieuw tabblad
                      </Button>
                    </a>
                  </div>
                </div>
              </DialogHeader>

              {/* Main Content: Left PDF Viewer + Right Opmerkingenveld Sidebar */}
              <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 mt-3 overflow-hidden">
                {/* Left side: PDF Viewer iframe */}
                <div className="flex-1 min-h-[350px] h-full bg-muted/30 rounded-xl overflow-hidden border border-border relative flex flex-col">
                  <div className="px-3 py-1.5 bg-background/80 border-b border-border text-[11px] text-muted-foreground flex items-center justify-between">
                    <span className="truncate">Beveiligde viewer • Raadsonderzoek PDF</span>
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline inline-flex items-center gap-1 font-semibold shrink-0 ml-2"
                    >
                      Direct openen <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {docUrl ? (
                    <iframe
                      src={`${proxyUrl}#toolbar=1&navpanes=0`}
                      className="w-full flex-1 border-0 bg-white"
                      title={activeViewerItem.title}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                      <Info className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">Geen PDF document gekoppeld aan dit onderzoek.</p>
                    </div>
                  )}
                </div>

                {/* Right side: Opmerkingenveld (Opmerkingen & Notities van Raadsleden) */}
                <div className="w-full lg:w-84 xl:w-96 flex flex-col h-full bg-background rounded-xl border border-border p-3.5 space-y-3 shrink-0 overflow-hidden shadow-2xs">
                  <div className="flex items-center justify-between border-b border-border pb-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <MessageSquare className="w-3.5 h-3.5 text-accent" />
                      <span>Opmerkingen bij dit onderzoek ({comments.length})</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Fractie & Raad</span>
                  </div>

                  {/* Scrollable list of comments */}
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                    {comments.length === 0 ? (
                      <div className="p-4 rounded-xl bg-muted/20 border border-dashed border-border text-center text-xs text-muted-foreground">
                        Nog geen opmerkingen geplaatst bij dit onderzoek. Deel uw bevindingen, vragen of aandachtspunten hieronder.
                      </div>
                    ) : (
                      comments.map((comment) => {
                        const isAuthor = comment.authorUsername === user?.username;
                        const canDelete = isAuthor || user?.role === "admin";

                        return (
                          <div
                            key={comment.id}
                            className="p-2.5 rounded-xl bg-muted/40 border border-border text-xs space-y-1 relative group"
                          >
                            <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
                              <span className="font-semibold text-foreground">
                                {comment.authorName || comment.authorUsername}
                              </span>
                              <div className="flex items-center gap-1">
                                <span>
                                  {new Date(comment.createdAt).toLocaleDateString("nl-NL", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-muted-foreground hover:text-destructive opacity-80 hover:opacity-100 p-0.5 ml-1"
                                    title="Verwijder opmerking"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[11.5px]">
                              {comment.note}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* New comment input form */}
                  <form onSubmit={handleAddComment} className="pt-2 border-t border-border space-y-2 shrink-0">
                    <textarea
                      rows={2}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Plaats een opmerking of notitie..."
                      className="w-full px-3 py-2 text-xs bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
                    />
                    <Button
                      type="submit"
                      disabled={submittingComment || !commentText.trim()}
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold h-8 text-xs rounded-xl"
                    >
                      {submittingComment ? "Bezig met opslaan..." : "Opmerking plaatsen"}
                    </Button>
                  </form>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
};
