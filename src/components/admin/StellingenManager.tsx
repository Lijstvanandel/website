import React, { useState, useEffect } from "react";
import { 
  Vote, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  Users, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Sliders, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Upload, 
  X,
  Smartphone,
  BarChart2,
  RefreshCw,
  Search,
  Check,
  QrCode,
  MapPin,
  Sparkles,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown,
  History,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import { StellingItem, StellingStats, StellingSubmission, QrLocation } from "@/types/stelling";
import { QrLocationManager } from "./QrLocationManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface StellingenManagerProps {
  token: string | null;
}

export function StellingenManager({ token }: StellingenManagerProps) {
  const [stellingen, setStellingen] = useState<StellingItem[]>([]);
  const [qrLocations, setQrLocations] = useState<QrLocation[]>([]);
  const [submissions, setSubmissions] = useState<StellingSubmission[]>([]);
  const [stats, setStats] = useState<StellingStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search & Sorting & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"stellingen" | "resultaten" | "activiteiten" | "opmerkingen" | "qr-locations">("stellingen");
  const [sortOption, setSortOption] = useState<"active-first" | "expired" | "most-answered" | "least-answered" | "newest">("active-first");
  const [showExpiredInList, setShowExpiredInList] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Activity Log Filter
  const [activitySearch, setActivitySearch] = useState("");
  const [activityLocationFilter, setActivityLocationFilter] = useState("all");
  const [activityPage, setActivityPage] = useState(1);
  const activityPerPage = 15;

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStellingId, setEditingStellingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Wonen");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<"swipe" | "scale">("swipe");
  const [formScaleMin, setFormScaleMin] = useState("1 - Helemaal oneens");
  const [formScaleMax, setFormScaleMax] = useState("10 - Volledig mee eens");
  const [formStartDate, setFormStartDate] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [formMaxParticipants, setFormMaxParticipants] = useState<number | "">("");
  const [formTargetLocations, setFormTargetLocations] = useState<string[]>([]);
  const [formShowInPwaAndApp, setFormShowInPwaAndApp] = useState(true);
  const [formActive, setFormActive] = useState(true);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formExistingImageUrl, setFormExistingImageUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/admin/stellingen");
      const data = await res.json();
      if (res.ok) {
        setStellingen(data.stellingen || []);
        setQrLocations(data.qrLocations || []);
        setSubmissions(data.submissions || []);
        setStats(data.stats || null);
      } else {
        toast.error(data.error || "Kon peilingen niet ophalen");
      }
    } catch (err) {
      console.error(err);
      toast.error("Fout bij laden van stellingen");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to check if a stelling is expired
  const isStellingExpired = (st: StellingItem) => {
    if (st.active === false) return true;
    const now = new Date();
    if (st.deadlineDate) {
      const d = new Date(st.deadlineDate);
      d.setHours(23, 59, 59, 999);
      if (now > d) return true;
    }
    const respCount = stats?.perStelling?.[st.id]?.totalResponses || 0;
    if (st.maxParticipants && respCount >= st.maxParticipants) return true;
    return false;
  };

  const openCreateModal = () => {
    setEditingStellingId(null);
    setFormTitle("");
    setFormCategory("Wonen");
    setFormDescription("");
    setFormType("swipe");
    setFormScaleMin("1 - Helemaal oneens");
    setFormScaleMax("10 - Volledig mee eens");
    setFormStartDate("");
    setFormDeadline("");
    setFormMaxParticipants("");
    setFormTargetLocations([]);
    setFormShowInPwaAndApp(true);
    setFormActive(true);
    setFormFile(null);
    setFormExistingImageUrl("/assets/stemmen.jpg");
    setIsModalOpen(true);
  };

  const openEditModal = (st: StellingItem) => {
    setEditingStellingId(st.id);
    setFormTitle(st.title);
    setFormCategory(st.category || "Algemeen");
    setFormDescription(st.description || "");
    setFormType(st.type || "swipe");
    setFormScaleMin(st.scaleMinLabel || "1 - Helemaal oneens");
    setFormScaleMax(st.scaleMaxLabel || "10 - Volledig mee eens");
    setFormStartDate(st.startDate || "");
    setFormDeadline(st.deadlineDate || "");
    setFormMaxParticipants(st.maxParticipants || "");
    setFormTargetLocations(Array.isArray(st.targetLocations) ? st.targetLocations : []);
    setFormShowInPwaAndApp(st.showInPwaAndApp !== false);
    setFormActive(st.active !== false);
    setFormFile(null);
    setFormExistingImageUrl(st.imageUrl || "/assets/stemmen.jpg");
    setIsModalOpen(true);
  };

  const handleToggleLocation = (locId: string) => {
    setFormTargetLocations((prev) =>
      prev.includes(locId) ? prev.filter((id) => id !== locId) : [...prev, locId]
    );
  };

  const handleSaveStelling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Vul een titel voor de stelling in");
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", formTitle.trim());
      formData.append("category", formCategory.trim());
      formData.append("description", formDescription.trim());
      formData.append("type", formType);
      formData.append("scaleMinLabel", formScaleMin.trim());
      formData.append("scaleMaxLabel", formScaleMax.trim());
      formData.append("startDate", formStartDate);
      formData.append("deadlineDate", formDeadline);
      if (formMaxParticipants !== "") {
        formData.append("maxParticipants", String(formMaxParticipants));
      }
      formData.append("targetLocations", JSON.stringify(formTargetLocations));
      formData.append("showInPwaAndApp", String(formShowInPwaAndApp));
      formData.append("active", String(formActive));
      if (formFile) {
        formData.append("stellingImage", formFile);
      } else {
        formData.append("imageUrl", formExistingImageUrl);
      }

      const url = editingStellingId ? `/api/admin/stellingen/${editingStellingId}` : "/api/admin/stellingen";
      const method = editingStellingId ? "PUT" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kon stelling niet opslaan");
      }

      toast.success(editingStellingId ? "Stelling succesvol bijgewerkt!" : "Nieuwe stelling geplaatst!");
      setIsModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Fout bij opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStelling = async (id: string, title: string) => {
    if (!confirm(`Weet u zeker dat u de stelling '${title}' wilt verwijderen?`)) return;

    try {
      const res = await fetchWithAuth(`/api/admin/stellingen/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Stelling verwijderd");
        fetchData();
      } else {
        toast.error("Kon stelling niet verwijderen");
      }
    } catch (err) {
      toast.error("Fout bij verwijderen");
    }
  };

  // CSV Export Handler
  const handleExportCsv = (stellingId?: string) => {
    const url = stellingId 
      ? `/api/admin/stellingen/export-csv?stellingId=${encodeURIComponent(stellingId)}`
      : "/api/admin/stellingen/export-csv";

    // Download using auth token
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Kon CSV export niet genereren");
        }
        return res.blob();
      })
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = stellingId 
          ? `stelling_${stellingId}_export.csv` 
          : `stellingen_en_qr_locaties_export_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("CSV export succesvol gedownload!");
      })
      .catch((err) => {
        console.error(err);
        toast.error(err.message || "Fout bij downloaden CSV.");
      });
  };

  // 1. Filter stellingen
  const filteredList = stellingen.filter((s) => {
    const matchesSearch = 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    const expired = isStellingExpired(s);

    // If "expired" sort is explicitly chosen, show expired
    if (sortOption === "expired") {
      return expired;
    }

    // Otherwise, exclude expired from default overview unless user explicitly toggled it
    if (!showExpiredInList && expired) {
      return false;
    }

    return true;
  });

  // 2. Sort stellingen
  const sortedStellingen = [...filteredList].sort((a, b) => {
    const responsesA = stats?.perStelling?.[a.id]?.totalResponses || 0;
    const responsesB = stats?.perStelling?.[b.id]?.totalResponses || 0;

    if (sortOption === "most-answered") {
      return responsesB - responsesA;
    }
    if (sortOption === "least-answered") {
      return responsesA - responsesB;
    }
    if (sortOption === "expired") {
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    }
    if (sortOption === "newest") {
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    }

    // Default "active-first": active non-expired first, then newest
    const aExp = isStellingExpired(a) ? 1 : 0;
    const bExp = isStellingExpired(b) ? 1 : 0;
    if (aExp !== bExp) return aExp - bExp;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });

  // 3. Paginate stellingen (10 per page)
  const totalPages = Math.max(1, Math.ceil(sortedStellingen.length / itemsPerPage));
  const currentStellingenPage = Math.min(currentPage, totalPages);
  const paginatedStellingen = sortedStellingen.slice(
    (currentStellingenPage - 1) * itemsPerPage,
    currentStellingenPage * itemsPerPage
  );

  // 4. Filter & Paginate Activity Log
  const filteredActivities = submissions.filter((sub) => {
    const matchesSearch = 
      (sub.fullName && sub.fullName.toLowerCase().includes(activitySearch.toLowerCase())) ||
      (sub.qrLocationName && sub.qrLocationName.toLowerCase().includes(activitySearch.toLowerCase())) ||
      (sub.city && sub.city.toLowerCase().includes(activitySearch.toLowerCase())) ||
      (sub.generalFeedback && sub.generalFeedback.toLowerCase().includes(activitySearch.toLowerCase()));

    if (!matchesSearch) return false;

    if (activityLocationFilter !== "all") {
      if (activityLocationFilter === "pwa") {
        if (!sub.isPWA || sub.isAnonymous) return false;
      } else if (activityLocationFilter === "web") {
        if (sub.isPWA || sub.isAnonymous) return false;
      } else if (activityLocationFilter === "anon_qr") {
        if (!sub.isAnonymous) return false;
      } else {
        // Specific QR Location ID or slug
        if (sub.qrLocationId !== activityLocationFilter && sub.qrLocationSlug !== activityLocationFilter) {
          return false;
        }
      }
    }

    return true;
  });

  const totalActivityPages = Math.max(1, Math.ceil(filteredActivities.length / activityPerPage));
  const currentActPage = Math.min(activityPage, totalActivityPages);
  const paginatedActivities = filteredActivities.slice(
    (currentActPage - 1) * activityPerPage,
    currentActPage * activityPerPage
  );

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-display text-foreground">Fractie Peilingen & Stellingen</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/20 text-accent border border-accent/30">
              PWA & QR Locaties
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Beheer interactieve stellingen (swipe / schaal 1-10) voor contributiebetalende leden én anonieme peilingen via unieke QR-locaties met activiteitslog en CSV-export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* CSV Export All */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportCsv()}
            className="text-xs font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            title="Download CSV export van alle stellingen en QR-resultaten"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Exporteer .CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Vernieuwen
          </Button>
          <Button
            onClick={openCreateModal}
            className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nieuwe Stelling Plaatsen
          </Button>
        </div>
      </div>

      {/* KPI Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-muted/40 p-4 rounded-xl border border-border">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Actieve Stellingen</span>
            <Vote className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-bold font-display text-foreground">
            {stellingen.filter((s) => !isStellingExpired(s)).length} / {stellingen.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Openstaand in PWA & QR
          </div>
        </div>

        <div className="bg-muted/40 p-4 rounded-xl border border-border">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Totaal Deelnemers</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-display text-emerald-600">
            {stats?.totalSubmissions || submissions.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span>{stats?.totalAnonymous || submissions.filter((s) => s.isAnonymous).length} anoniem via QR</span>
          </div>
        </div>

        <div className="bg-muted/40 p-4 rounded-xl border border-border">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>QR Locaties</span>
            <QrCode className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-display text-foreground">
            {qrLocations.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Sticker campagnes in beheer
          </div>
        </div>

        <div className="bg-muted/40 p-4 rounded-xl border border-border">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Fractie Opmerkingen</span>
            <MessageSquare className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-display text-amber-600">
            {stats?.remarks?.length || submissions.filter((s) => s.generalFeedback).length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Suggesties voor fractieoverleg
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("stellingen")}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "stellingen"
              ? "bg-accent text-accent-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Vote className="w-4 h-4" />
          Stellingen ({stellingen.length})
        </button>
        <button
          onClick={() => setActiveTab("qr-locations")}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "qr-locations"
              ? "bg-accent text-accent-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <QrCode className="w-4 h-4" />
          QR Locaties & Stickers ({qrLocations.length})
        </button>
        <button
          onClick={() => setActiveTab("resultaten")}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "resultaten"
              ? "bg-accent text-accent-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Resultaten & Uitslagen
        </button>
        <button
          onClick={() => setActiveTab("activiteiten")}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "activiteiten"
              ? "bg-accent text-accent-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <History className="w-4 h-4" />
          Activiteitslog QR ({submissions.length})
        </button>
        <button
          onClick={() => setActiveTab("opmerkingen")}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "opmerkingen"
              ? "bg-accent text-accent-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Fractie Opmerkingen ({stats?.remarks?.length || 0})
        </button>
      </div>

      {/* TAB 1: STELLINGEN OVERZICHT MET SORTERING & PAGINERING */}
      {activeTab === "stellingen" && (
        <div className="space-y-4">
          {/* Controls bar: Search, Sortering, Verlopen toggle */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-muted/20 rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search box */}
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Zoek stellingen..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Sortering dropdown */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-accent shrink-0" />
                <select
                  value={sortOption}
                  onChange={(e) => {
                    setSortOption(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="h-9 px-3 rounded-md border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="active-first">Actieve stellingen eerst</option>
                  <option value="most-answered">Meest beantwoorde stelling</option>
                  <option value="least-answered">Minst beantwoorde stelling</option>
                  <option value="expired">Verlopen stellingen</option>
                  <option value="newest">Nieuwste eerst</option>
                </select>
              </div>

              {/* Toggle to show/hide expired stellingen in standard view */}
              {sortOption !== "expired" && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none ml-1">
                  <input
                    type="checkbox"
                    checked={showExpiredInList}
                    onChange={(e) => {
                      setShowExpiredInList(e.target.checked);
                      setCurrentPage(1);
                    }}
                    className="w-3.5 h-3.5 rounded text-accent accent-accent"
                  />
                  <span>Toon ook verlopen stellingen</span>
                </label>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 justify-between lg:justify-end">
              <span>
                {sortedStellingen.length} stellingen gevonden (10 per pagina)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCsv()}
                className="text-xs h-8 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                CSV
              </Button>
            </div>
          </div>

          {/* Stellingen Cards Grid */}
          {paginatedStellingen.length === 0 ? (
            <div className="p-12 text-center bg-muted/20 rounded-2xl border border-border text-muted-foreground text-sm space-y-2">
              <Vote className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-semibold text-foreground">Geen stellingen gevonden</p>
              <p className="text-xs max-w-md mx-auto">
                {sortOption === "expired" 
                  ? "Er zijn momenteel geen verlopen stellingen." 
                  : "Er zijn geen stellingen die aan de huidige zoekfilters voldoen."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedStellingen.map((st) => {
                const stStat = stats?.perStelling?.[st.id];
                const expired = isStellingExpired(st);
                return (
                  <div
                    key={st.id}
                    className={`bg-card rounded-2xl border overflow-hidden shadow-sm flex flex-col justify-between transition-all ${
                      !expired ? "border-border hover:border-accent/40" : "border-border/50 opacity-70 bg-muted/20"
                    }`}
                  >
                    <div>
                      <div className="relative h-44 w-full bg-muted overflow-hidden">
                        <img
                          src={st.imageUrl || "/assets/stemmen.jpg"}
                          alt={st.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/assets/stemmen.jpg";
                          }}
                        />
                        <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-accent border border-accent/30">
                          {st.category || "Algemeen"}
                        </div>
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            st.type === "scale" ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30" : "bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                          }`}>
                            {st.type === "scale" ? "1-10 Schaal" : "Tinder Swipe"}
                          </span>
                          {expired ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-600 border border-rose-500/30">
                              Verlopen / Gesloten
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                              Actief
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-5 space-y-3">
                        <h3 className="font-display font-bold text-base text-foreground leading-snug">
                          {st.title}
                        </h3>
                        {st.description && (
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {st.description}
                          </p>
                        )}

                        {/* Targeted Locations Badges */}
                        {st.targetLocations && st.targetLocations.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mr-1">
                              <MapPin className="w-3 h-3 text-accent" /> Gekoppeld aan:
                            </span>
                            {st.targetLocations.map((locId) => {
                              const foundLoc = qrLocations.find((l) => l.id === locId || l.slug === locId);
                              return (
                                <span
                                  key={locId}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                                >
                                  {foundLoc ? foundLoc.name : locId}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Stats quick pill */}
                        <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                            <Users className="w-3.5 h-3.5 text-accent" />
                            <span>{stStat?.totalResponses || 0} stemmen</span>
                            {st.maxParticipants ? <span className="text-muted-foreground/60 font-normal">/ max. {st.maxParticipants}</span> : null}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            {st.startDate && <span>Vanaf {st.startDate}</span>}
                            {st.deadlineDate && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-accent" />
                                Tot {st.deadlineDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportCsv(st.id)}
                        className="text-xs h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                        title="Download CSV export voor deze stelling"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        CSV Export
                      </Button>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(st)}
                          className="text-xs h-8"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1 text-accent" />
                          Bewerken
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStelling(st.id, st.title)}
                          className="text-xs h-8 text-destructive hover:bg-destructive/10"
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

          {/* Pagination Controls (10 per page) */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Pagina {currentStellingenPage} van {totalPages} ({sortedStellingen.length} stellingen totaal)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentStellingenPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="text-xs h-8"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Vorige
                </Button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === currentStellingenPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`text-xs h-8 w-8 p-0 ${
                      pageNumber === currentStellingenPage ? "bg-accent text-accent-foreground font-bold" : ""
                    }`}
                  >
                    {pageNumber}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentStellingenPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="text-xs h-8"
                >
                  Volgende <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QR-LOCATIES & STICKERS */}
      {activeTab === "qr-locations" && (
        <QrLocationManager token={token} />
      )}

      {/* TAB 3: RESULTATEN & STATISTIEKEN */}
      {activeTab === "resultaten" && (
        <div className="space-y-6">
          {/* Action header with CSV Download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/20 rounded-2xl border border-border">
            <div>
              <h3 className="text-sm font-bold text-foreground">Uitgebreide Resultaten & Locatie-uitslagen</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bekijk hoe er is gestemd via de PWA en per specifieke fysieke QR-stickerlocatie in de gemeente.
              </p>
            </div>
            <Button
              onClick={() => handleExportCsv()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Exporteer alle uitslagen (.CSV)
            </Button>
          </div>

          {/* Per Location Overview stats */}
          {stats?.perLocationCount && Object.keys(stats.perLocationCount).length > 0 && (
            <div className="bg-muted/30 p-5 rounded-2xl border border-border space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-accent" />
                Stemmen verdeeld per QR-locatie / kanaal:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(stats.perLocationCount).map(([locName, count]) => (
                  <div key={locName} className="p-3 bg-card rounded-xl border border-border/60 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground truncate">{locName}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-accent/20 text-accent ml-2">
                      {count}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stellingen.map((st) => {
            const stStat = stats?.perStelling?.[st.id];
            const total = stStat?.totalResponses || 0;
            const eensPct = stStat?.eensPercentage || 0;
            const oneensPct = stStat?.oneensPercentage || 0;

            return (
              <div key={st.id} className="bg-muted/30 rounded-2xl p-6 border border-border space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-accent border border-accent/30">
                        {st.category || "Algemeen"}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        Type: {st.type === "scale" ? "Schaal 1 tot 10" : "Eens / Oneens (Swipe)"}
                      </span>
                    </div>
                    <h3 className="text-lg font-display font-bold text-foreground">
                      {st.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportCsv(st.id)}
                      className="text-xs h-7 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      .CSV Stelling
                    </Button>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{total} respondenten</span>
                      {st.startDate && <span>• Vanaf: {st.startDate}</span>}
                      {st.deadlineDate && <span>• Deadline: {st.deadlineDate}</span>}
                    </div>
                  </div>
                </div>

                {/* SWIPE RESULTS (BAR GRAPH) */}
                {st.type === "swipe" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-emerald-600 flex items-center gap-1.5">
                        <ThumbsUp className="w-4 h-4" /> Eens ({eensPct}%) - {stStat?.eensCount || 0} stemmen
                      </span>
                      <span className="text-rose-600 flex items-center gap-1.5">
                        Oneens ({oneensPct}%) - {stStat?.oneensCount || 0} stemmen <ThumbsDown className="w-4 h-4" />
                      </span>
                    </div>

                    <div className="w-full h-4 bg-muted rounded-full overflow-hidden flex border border-border">
                      <div
                        className="h-full bg-emerald-600 transition-all"
                        style={{ width: `${eensPct}%` }}
                        title={`Eens: ${eensPct}%`}
                      />
                      <div
                        className="h-full bg-rose-600 transition-all"
                        style={{ width: `${oneensPct}%` }}
                        title={`Oneens: ${oneensPct}%`}
                      />
                    </div>
                  </div>
                )}

                {/* SCALE 1-10 RESULTS (DISTRIBUTION & AVERAGE) */}
                {st.type === "scale" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Gemiddelde score uit {total} beoordelingen:
                      </span>
                      <span className="text-2xl font-display font-black text-accent">
                        {stStat?.scaleAverage ? `${stStat.scaleAverage} / 10` : "Nog geen stemmen"}
                      </span>
                    </div>

                    {/* Bar distribution for 1..10 */}
                    <div className="grid grid-cols-10 gap-1 pt-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                        const count = stStat?.scaleDistribution?.[num] || 0;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={num} className="flex flex-col items-center gap-1.5 text-center">
                            <div className="w-full h-24 bg-muted/60 rounded-lg flex flex-col justify-end p-1 border border-border/40">
                              <div
                                className="w-full bg-accent rounded-sm transition-all"
                                style={{ height: `${pct}%`, minHeight: count > 0 ? "4px" : "0px" }}
                              />
                            </div>
                            <span className="text-xs font-bold text-foreground">{num}</span>
                            <span className="text-[10px] text-muted-foreground">{count}x</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Location breakdown for this stelling */}
                {stStat?.locationBreakdown && Object.keys(stStat.locationBreakdown).length > 0 && (
                  <div className="pt-3 border-t border-border/60">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Uitslag per locatie / kanaal:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(stStat.locationBreakdown).map(([locName, breakdown]: [string, any]) => (
                        <div key={locName} className="p-2.5 bg-card rounded-lg border border-border text-xs flex flex-col justify-between">
                          <div className="font-semibold text-foreground mb-1">{locName} ({breakdown.total} stemmen)</div>
                          {st.type === "swipe" ? (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-emerald-600 font-bold">{breakdown.eens} eens</span>
                              <span className="text-rose-600 font-bold">{breakdown.oneens} oneens</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-accent font-bold">
                              Gemiddeld: {breakdown.avgScale || "-"} / 10
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: ACTIVITEITSLOG QR & INZENDINGEN */}
      {activeTab === "activiteiten" && (
        <div className="space-y-4">
          {/* Activity Log Filter Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/20 rounded-2xl border border-border">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Zoek in activiteitslog..."
                  value={activitySearch}
                  onChange={(e) => {
                    setActivitySearch(e.target.value);
                    setActivityPage(1);
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Location Filter dropdown */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-accent shrink-0" />
                <select
                  value={activityLocationFilter}
                  onChange={(e) => {
                    setActivityLocationFilter(e.target.value);
                    setActivityPage(1);
                  }}
                  className="h-9 px-3 rounded-md border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="all">Alle QR-locaties & kanalen</option>
                  <option value="anon_qr">Alleen anonieme QR-stickers</option>
                  <option value="pwa">Alleen PWA App (Leden)</option>
                  <option value="web">Alleen Website (Leden)</option>
                  {qrLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      Locatie: {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">
                {filteredActivities.length} inzendingen gelogd
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCsv()}
                className="text-xs h-8 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Exporteer Log (.CSV)
              </Button>
            </div>
          </div>

          {/* Activity Log Table / Cards */}
          {paginatedActivities.length === 0 ? (
            <div className="p-12 text-center bg-muted/20 rounded-2xl border border-border text-muted-foreground text-sm space-y-2">
              <History className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-semibold text-foreground">Nog geen activiteit gevonden</p>
              <p className="text-xs max-w-md mx-auto">
                Er zijn nog geen QR-inzendingen geregistreerd die voldoen aan het geselecteerde zoekfilter.
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Datum & Tijd</th>
                      <th className="py-3 px-4">Type Deelnemer</th>
                      <th className="py-3 px-4">Locatie / Sticker</th>
                      <th className="py-3 px-4">Aantal Vragen Beantwoord</th>
                      <th className="py-3 px-4">Opmerking</th>
                      <th className="py-3 px-4">Platform</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paginatedActivities.map((act) => {
                      const dateObj = new Date(act.submittedAt);
                      const isAnon = !!act.isAnonymous;
                      return (
                        <tr key={act.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                            {dateObj.toLocaleDateString("nl-NL", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}{" "}
                            {dateObj.toLocaleTimeString("nl-NL", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>
                          <td className="py-3 px-4">
                            {isAnon ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                Anoniem via QR
                              </span>
                            ) : (
                              <div className="font-semibold text-foreground">
                                {act.fullName || act.username || "Partijlid"}
                                {act.city && <span className="text-[10px] text-muted-foreground ml-1">({act.city})</span>}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span>{act.qrLocationName || "PWA / Hoofdkanaal"}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-accent/15 text-accent font-bold text-[11px]">
                              {Array.isArray(act.answers) ? act.answers.length : 0} stellingen
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-muted-foreground italic">
                            {act.generalFeedback ? `"${act.generalFeedback}"` : <span className="text-muted-foreground/40">-</span>}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {act.isPWA ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent">
                                <Smartphone className="w-3 h-3" /> PWA App
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Browser</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Activity Log Pagination */}
          {totalActivityPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Pagina {currentActPage} van {totalActivityPages} ({filteredActivities.length} logs)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentActPage <= 1}
                  onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                  className="text-xs h-8"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Vorige
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentActPage >= totalActivityPages}
                  onClick={() => setActivityPage((p) => Math.min(totalActivityPages, p + 1))}
                  className="text-xs h-8"
                >
                  Volgende <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: FRACTIE OPMERKINGEN & SUGGESTIES */}
      {activeTab === "opmerkingen" && (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground pb-2 flex items-center justify-between">
            <span>
              Onderstaande opmerkingen zijn door partijleden én anonieme QR-bezoekers achtergelaten na het stemmen op de stellingen.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCsv()}
              className="text-xs h-8 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Exporteer naar .CSV
            </Button>
          </div>

          {(!stats?.remarks || stats.remarks.length === 0) ? (
            <div className="p-8 text-center bg-muted/20 rounded-2xl border border-border text-muted-foreground text-sm">
              Er zijn nog geen toelichtingen of opmerkingen achtergelaten.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.remarks.map((rem) => (
                <div key={rem.id} className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <span>{rem.fullName}</span>
                        {rem.isAnonymous && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-muted text-muted-foreground border">
                            Anoniem
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-accent" />
                        <span>{rem.qrLocationName || rem.city || "Steenwijkerland"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(rem.submittedAt).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      {rem.isPWA && (
                        <div className="flex items-center gap-1 text-[10px] text-accent font-semibold justify-end">
                          <Smartphone className="w-3 h-3" /> PWA
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-foreground/90 italic leading-relaxed whitespace-pre-wrap">
                    "{rem.generalFeedback}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT STELLING MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display text-primary flex items-center gap-2">
              <Vote className="w-5 h-5 text-accent" />
              {editingStellingId ? "Stelling Bewerken" : "Nieuwe Stelling Aanmaken"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configureer de stelling, categorie, datumvenster (vanaf / tot wanneer), doelgroep / QR-locaties en type.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveStelling} className="space-y-4 pt-2">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                Titel / Stelling *
              </label>
              <Input
                required
                placeholder="Bijv. Voorrang voor eigen inwoners bij nieuwbouw in Steenwijkerland"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                  Categorie / Dossier
                </label>
                <Input
                  placeholder="Bijv. Wonen, Leefbaarheid, Financiën, Jeugd"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                />
              </div>

              {/* Type selector */}
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                  Vraagtype
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as "swipe" | "scale")}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="swipe">Tinder-formaat Swipe (Eens / Oneens)</option>
                  <option value="scale">Schaal van 1 tot 10</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                Toelichting / Context voor de kiezer
              </label>
              <Textarea
                rows={3}
                placeholder="Geef hier extra context of achtergrondinformatie mee zodat men een onderbouwde keuze kan maken..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            {/* Scale Min / Max Labels if scale */}
            {formType === "scale" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/40 rounded-xl border border-border">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                    Label voor 1 (Laagste score)
                  </label>
                  <Input
                    placeholder="Bijv. 1 - Helemaal oneens"
                    value={formScaleMin}
                    onChange={(e) => setFormScaleMin(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                    Label voor 10 (Hoogste score)
                  </label>
                  <Input
                    placeholder="Bijv. 10 - Volledig mee eens"
                    value={formScaleMax}
                    onChange={(e) => setFormScaleMax(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Image Upload */}
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                Afbeelding (Kaart foto)
              </label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFormFile(e.target.files?.[0] || null)}
              />
              {formExistingImageUrl && !formFile && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Huidige afbeelding: {formExistingImageUrl}
                </p>
              )}
            </div>

            {/* Date Window (Vanaf wanneer & Tot wanneer) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl border border-border">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-accent" />
                  Vanaf datum tonen (Startdatum)
                </label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                />
                <span className="text-[10px] text-muted-foreground">Leeg = direct beschikbaar</span>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  Mening vragen tot datum (Deadline)
                </label>
                <Input
                  type="date"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                />
                <span className="text-[10px] text-muted-foreground">Leeg = geen einddatum</span>
              </div>
            </div>

            {/* Max Participants */}
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                Maximaal aantal respondenten (Optioneel)
              </label>
              <Input
                type="number"
                placeholder="Bijv. 100 (als dit maximum is behaald wordt de stelling gesloten)"
                value={formMaxParticipants}
                onChange={(e) => setFormMaxParticipants(e.target.value ? parseInt(e.target.value, 10) : "")}
              />
            </div>

            {/* Target QR Locations Checkboxes */}
            <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-3">
              <label className="text-xs font-bold uppercase text-foreground block flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-accent" />
                Koppelen aan specifieke QR-Locaties
              </label>
              <p className="text-xs text-muted-foreground">
                Kies op welke fysieke stickerlocaties deze stelling getoond mag worden wanneer iemand de QR-code scant.
              </p>

              {qrLocations.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  Nog geen QR-locaties aangemaakt. U kunt deze aanmaken onder het tabblad 'QR Locaties & Stickers'.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {qrLocations.map((loc) => {
                    const isChecked = formTargetLocations.includes(loc.id) || formTargetLocations.includes(loc.slug);
                    return (
                      <label
                        key={loc.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          isChecked ? "bg-accent/15 border-accent text-foreground font-semibold" : "bg-card border-border hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleLocation(loc.id)}
                          className="w-4 h-4 rounded text-accent accent-accent"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{loc.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{loc.stickerText}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PWA & Active Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="formShowPwaCheck"
                  checked={formShowInPwaAndApp}
                  onChange={(e) => setFormShowInPwaAndApp(e.target.checked)}
                  className="w-4 h-4 rounded text-accent accent-accent"
                />
                <label htmlFor="formShowPwaCheck" className="text-xs font-medium text-foreground cursor-pointer">
                  Ook tonen in de algemene PWA & website voor ingelogde partijleden
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="formActiveCheck"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 rounded text-accent accent-accent"
                />
                <label htmlFor="formActiveCheck" className="text-xs font-medium text-foreground cursor-pointer">
                  Stelling is actief
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
              >
                {isSaving ? "Opslaan..." : (editingStellingId ? "Wijzigingen Opslaan" : "Stelling Publiceren")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
