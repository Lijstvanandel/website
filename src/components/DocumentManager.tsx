import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  Eye,
  ShieldCheck,
  Lock,
  Calendar,
  Tag,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCw,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { MemberDocument } from "@/types/document";
import { SecureDocumentViewer } from "./SecureDocumentViewer";

interface DocumentManagerProps {
  token: string | null;
  currentUser: {
    fullName?: string;
    username?: string;
    email?: string;
    role?: string;
  } | null;
}

const DEFAULT_CATEGORIES = [
  "Partijprogramma",
  "Financiën",
  "Statuten & Reglementen",
  "Fractie & Beraad",
  "Campagne & Strategie",
  "Ledenraadpleging",
  "Algemeen",
];

const CONFIDENTIALITY_LEVELS = [
  "Vertrouwelijk - Alleen Leden",
  "Strikt Vertrouwelijk",
  "Intern Concept",
  "Bestuur & Fractie",
];

export const DocumentManager: React.FC<DocumentManagerProps> = ({ token, currentUser }) => {
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedConfidentiality, setSelectedConfidentiality] = useState("all");

  // Modal states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<MemberDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<MemberDocument | null>(null);

  // Secure viewer preview state
  const [previewDoc, setPreviewDoc] = useState<MemberDocument | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Partijprogramma");
  const [confidentiality, setConfidentiality] = useState("Vertrouwelijk - Alleen Leden");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [author, setAuthor] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("1.0 MB");
  const [pageCount, setPageCount] = useState(1);
  const [content, setContent] = useState("");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/documents", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json().catch(() => []);
        setDocuments(Array.isArray(data) ? data : []);
      } else {
        toast.error("Kon documenten niet laden");
      }
    } catch {
      toast.error("Fout bij ophalen van documenten");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle open create dialog
  const handleOpenCreate = () => {
    setActiveDoc(null);
    setTitle("");
    setDescription("");
    setCategory("Partijprogramma");
    setConfidentiality("Vertrouwelijk - Alleen Leden");
    setDate(new Date().toISOString().split("T")[0]);
    setAuthor(currentUser?.fullName || "Fractie Lijst van Andel");
    setFileUrl("");
    setFileName("");
    setFileSize("1.2 MB");
    setPageCount(1);
    setContent(
      "HOOFDSTUK 1: INLEIDING & CONTEXT\n\n1.1 Aanleiding\nBeschrijving van het onderwerp en de betekenis voor de fractie en onze kiezers in Steenwijkerland.\n\nHOOFDSTUK 2: SPEERPUNTEN & VOORSTELLEN\n\n2.1 Kernpunten\nConcrete acties en standpunten die ter inzage liggen voor de leden."
    );
    setDialogOpen(true);
  };

  // Handle open edit dialog
  const handleOpenEdit = (doc: MemberDocument) => {
    setActiveDoc(doc);
    setTitle(doc.title);
    setDescription(doc.description);
    setCategory(doc.category || "Algemeen");
    setConfidentiality(doc.confidentiality || "Vertrouwelijk - Alleen Leden");
    setDate(doc.date || new Date().toISOString().split("T")[0]);
    setAuthor(doc.author || "");
    setFileUrl(doc.fileUrl || "");
    setFileName(doc.fileName || "");
    setFileSize(doc.fileSize || "1.0 MB");
    setPageCount(doc.pageCount || 1);
    setContent(doc.content || "");
    setDialogOpen(true);
  };

  // Upload PDF file handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Alleen .pdf bestanden zijn toegestaan");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/documents/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setFileUrl(data.url);
        setFileName(data.fileName);
        setFileSize(data.fileSize);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
        }
        toast.success("PDF succesvol geüpload naar beveiligde opslag");
      } else {
        const err = await res.json();
        toast.error(err.error || "Fout bij uploaden van PDF");
      }
    } catch {
      toast.error("Fout bij verbinding met de server");
    } finally {
      setUploading(false);
    }
  };

  // Save document handler
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Titel is verplicht");
      return;
    }

    setSaving(true);
    const payload = {
      title,
      description,
      category,
      confidentiality,
      date,
      author,
      fileUrl,
      fileName,
      fileSize,
      pageCount: Number(pageCount) || 1,
      content,
    };

    try {
      const url = activeDoc
        ? `/api/admin/documents/${activeDoc.id}`
        : "/api/admin/documents";
      const method = activeDoc ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          activeDoc ? "Document succesvol bijgewerkt" : "Document succesvol toegevoegd"
        );
        setDialogOpen(false);
        fetchDocuments();
      } else {
        const err = await res.json();
        toast.error(err.error || "Fout bij opslaan");
      }
    } catch {
      toast.error("Fout bij verbinding met de server");
    } finally {
      setSaving(false);
    }
  };

  // Delete document handler
  const handleDelete = async () => {
    if (!docToDelete) return;

    try {
      const res = await fetch(`/api/admin/documents/${docToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        toast.success("Document succesvol verwijderd");
        setDeleteDialogOpen(false);
        setDocToDelete(null);
        fetchDocuments();
      } else {
        toast.error("Fout bij verwijderen");
      }
    } catch {
      toast.error("Fout bij verbinding met de server");
    }
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || doc.category === selectedCategory;

    const matchesConfidentiality =
      selectedConfidentiality === "all" ||
      doc.confidentiality === selectedConfidentiality;

    return matchesSearch && matchesCategory && matchesConfidentiality;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            Exclusieve Ledendocumenten
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            Beheer Ledendocumenten & Vertrouwelijke Stukken
          </h2>
          <p className="text-sm text-muted-foreground">
            Beheer hier de documenten die exclusief getoond worden op het leden-dashboard.
            Alle documenten worden op de site geopend in de <strong>beveiligde lezersmodus</strong>:
            zonder downloadmogelijkheid, met dynamisch ledenwatermerk en met automatische maskering bij knipprogramma's en schermopnames.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold gap-2 shrink-0 self-start md:self-center shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nieuw Document Toevoegen
        </Button>
      </div>

      {/* Security Feature Highlights for Admin */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-muted/30 p-4 rounded-xl border border-border/60 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0 text-accent">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">Geen Download & Geen Print</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Directe downloads en contextmenu's zijn uitgeschakeld. Geen save knoppen.
            </p>
          </div>
        </div>

        <div className="bg-muted/30 p-4 rounded-xl border border-border/60 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0 text-accent">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">Anti-Knipprogramma Maskering</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Zodra Snipping Tool, PrintScreen of schermopname actief is, wordt het document direct geblurd.
            </p>
          </div>
        </div>

        <div className="bg-muted/30 p-4 rounded-xl border border-border/60 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0 text-accent">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">Gepersonaliseerd Watermerk</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Elke pagina toont doorlopend de naam en gegevens van het ingelogde lid.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card p-4 rounded-xl border border-border flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op titel of omschrijving..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="all">Alle categorieën</option>
            {DEFAULT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Confidentiality filter */}
          <select
            value={selectedConfidentiality}
            onChange={(e) => setSelectedConfidentiality(e.target.value)}
            className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="all">Alle vertrouwelijkheidsniveaus</option>
            {CONFIDENTIALITY_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocuments}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            title="Vernieuwen"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="p-12 text-center bg-card rounded-xl border border-border">
          <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Documenten inladen...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-xl border border-border">
          <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">Geen documenten gevonden</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Er zijn momenteel geen documenten die overeenkomen met de filters. Voeg een nieuw document toe om te beginnen.
          </p>
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Nieuw Document
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-card hover:bg-muted/20 border border-border rounded-xl p-5 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center shrink-0 text-accent mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-semibold text-foreground text-base truncate">
                      {doc.title}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/25">
                      {doc.confidentiality || "Vertrouwelijk"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] bg-muted border border-border text-muted-foreground">
                      {doc.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {doc.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-accent" /> {doc.date}
                    </span>
                    <span>Grootte: <strong>{doc.fileSize || "1.0 MB"}</strong></span>
                    <span>Pagina's: <strong>{doc.pageCount || 1}</strong></span>
                    {doc.author && <span>Auteur: <strong>{doc.author}</strong></span>}
                    {doc.fileUrl && (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <FileCheck className="w-3 h-3" /> PDF Gekoppeld
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-border/60 w-full md:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewDoc(doc)}
                  className="border-accent/40 text-accent hover:bg-accent/10 text-xs h-8 gap-1.5"
                  title="Bekijk hoe leden dit document zien (inclusief knipprogramma-beveiliging)"
                >
                  <Eye className="w-3.5 h-3.5" /> Veilig Testen / Inzien
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(doc)}
                  className="text-xs h-8 px-2.5"
                  title="Bewerken"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDocToDelete(doc);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-xs h-8 px-2.5 text-destructive hover:bg-destructive/10 border-destructive/30"
                  title="Verwijderen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT DOCUMENT DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">
              {activeDoc ? "Document Bewerken" : "Nieuw Exclusief Document Toevoegen"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Documenten worden uitsluitend getoond aan ingelogde leden en worden geopend in de beveiligde viewer (zonder downloadoptie en met automatische schermmaskering).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Title */}
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Titel van het document <span className="text-destructive">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="bv. Concept Partijprogramma 2026-2030"
                className="text-xs"
              />
            </div>

            {/* Category & Confidentiality */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Categorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Vertrouwelijkheidsniveau
                </label>
                <select
                  value={confidentiality}
                  onChange={(e) => setConfidentiality(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {CONFIDENTIALITY_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date & Author */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Datum
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Auteur / Commissie
                </label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="bv. Sammy van Andel / Fractiebestuur"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Korte Toelichting / Omschrijving
              </label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Geef een korte toelichting op het document voor de leden..."
                className="text-xs"
              />
            </div>

            {/* PDF File Upload Box */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-accent" />
                  PDF Bestand Koppelen
                </label>
                {fileUrl && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Bestand gereed: {fileName || "document.pdf"}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full sm:w-auto text-xs gap-1.5 border-accent/40 text-accent hover:bg-accent/10"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? "Bezig met uploaden..." : fileUrl ? "Ander PDF Bestand Kiezen" : "Upload .PDF Bestand"}
                </Button>

                {fileUrl && (
                  <span className="text-[11px] text-muted-foreground font-mono truncate max-w-xs">
                    {fileUrl}
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-0.5">
                    Weergegeven bestandsgrootte
                  </label>
                  <Input
                    value={fileSize}
                    onChange={(e) => setFileSize(e.target.value)}
                    placeholder="bv. 1.8 MB"
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-0.5">
                    Aantal pagina's
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={pageCount}
                    onChange={(e) => setPageCount(Number(e.target.value) || 1)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            {/* Document Content / Body */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-foreground">
                  Document Tekstinhoud / Officiële Artikelen (In-App Weergave)
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Ondersteunt HOOFDSTUK, ARTIKEL en paragrafen
                </span>
              </div>
              <Textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Vul hier eventueel de tekstuele inhoud van het document in..."
                className="font-mono text-[11px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="text-xs"
            >
              Annuleren
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold"
            >
              {saving ? "Bezig met opslaan..." : activeDoc ? "Wijzigingen Opslaan" : "Document Aanmaken"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-display text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Document Verwijderen
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Weet u zeker dat u het vertrouwelijke document <strong>{docToDelete?.title}</strong> wilt verwijderen? Leden kunnen dit document hierna niet langer inzien.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              className="text-xs"
            >
              Annuleren
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="text-xs font-semibold"
            >
              Ja, Document Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SECURE VIEWER PREVIEW FOR ADMIN */}
      <SecureDocumentViewer
        document={previewDoc}
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        user={{
          fullName: currentUser?.fullName || "Beheerder",
          username: currentUser?.username || "admin",
          email: currentUser?.email || "beheer@lijstvanandel.nl",
          role: "admin",
        }}
      />
    </div>
  );
};
