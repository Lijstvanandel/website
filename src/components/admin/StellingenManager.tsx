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
  Sparkles
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

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"stellingen" | "resultaten" | "opmerkingen" | "qr-locations">("stellingen");

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

  const filteredStellingen = stellingen.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
            Beheer interactieve stellingen (swipe / schaal 1-10) voor contributiebetalende leden én anonieme peilingen via unieke QR-locaties.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            {stellingen.filter((s) => s.active !== false).length} / {stellingen.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Beschikbaar in de PWA & QR
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
          Resultaten & Locatie-uitslagen
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

      {/* TAB 1: STELLINGEN OVERZICHT */}
      {activeTab === "stellingen" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Zoek stellingen op onderwerp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredStellingen.length} van {stellingen.length} stellingen
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStellingen.map((st) => {
              const stStat = stats?.perStelling?.[st.id];
              return (
                <div
                  key={st.id}
                  className={`bg-card rounded-2xl border overflow-hidden shadow-sm flex flex-col justify-between transition-all ${
                    st.active !== false ? "border-border hover:border-accent/40" : "border-border/50 opacity-60"
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
                        {st.active === false && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-600 border border-rose-500/30">
                            Inactief
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
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="w-3.5 h-3.5 text-accent" />
                          <span>{stStat?.totalResponses || 0} stemmen</span>
                          {st.maxParticipants ? <span className="text-muted-foreground/60">/ max. {st.maxParticipants}</span> : null}
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

                  <div className="p-4 bg-muted/20 border-t border-border/60 flex items-center justify-end gap-2">
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
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: QR-LOCATIES & STICKERS */}
      {activeTab === "qr-locations" && (
        <QrLocationManager token={token} />
      )}

      {/* TAB 3: RESULTATEN & STATISTIEKEN */}
      {activeTab === "resultaten" && (
        <div className="space-y-6">
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

                  <div className="text-xs text-muted-foreground flex items-center gap-3">
                    <span className="font-semibold text-foreground text-sm">{total} respondenten</span>
                    {st.startDate && <span>• Vanaf: {st.startDate}</span>}
                    {st.deadlineDate && <span>• Deadline: {st.deadlineDate}</span>}
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

      {/* TAB 4: FRACTIE OPMERKINGEN & SUGGESTIES */}
      {activeTab === "opmerkingen" && (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground pb-2">
            Onderstaande opmerkingen zijn door partijleden én anonieme QR-bezoekers achtergelaten na het stemmen op de stellingen.
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
