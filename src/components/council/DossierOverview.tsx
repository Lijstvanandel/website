import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  FolderPlus,
  Upload,
  Calendar,
  Layers,
  FileText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Filter,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DossierBulkUploadModal } from "./DossierBulkUploadModal";
import { CreateDossierModal } from "./CreateDossierModal";
import { DossierDetail } from "./DossierDetail";
import type { Dossier } from "@/types/dossier";
import { toast } from "sonner";

export const DossierOverview: React.FC = () => {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<{
    totalDossiers: number;
    totalDocuments: number;
    totalUploadedFiles: number;
  }>({
    totalDossiers: 0,
    totalDocuments: 0,
    totalUploadedFiles: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [hasFilesOnly, setHasFilesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected dossier for drill-down view
  const [activeDossierSlug, setActiveDossierSlug] = useState<string | null>(null);

  // Modals
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isCreateDossierOpen, setIsCreateDossierOpen] = useState(false);

  const fetchDossiers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "12",
        search,
        category: selectedCategory === "all" ? "" : selectedCategory,
        hasFiles: hasFilesOnly ? "true" : "false",
      });

      const res = await fetch(`/api/council/dossiers?${params.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error("Kon dossiers niet ophalen");
      }

      const data = await res.json();
      setDossiers(data.dossiers || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
      setCategories(data.categories || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Fout bij ophalen dossiers");
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategory, hasFilesOnly]);

  useEffect(() => {
    fetchDossiers();
  }, [fetchDossiers]);

  // Reset page when search or filters change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setPage(1);
  };

  if (activeDossierSlug) {
    return (
      <DossierDetail
        dossierSlug={activeDossierSlug}
        onBack={() => setActiveDossierSlug(null)}
      />
    );
  }

  return (
    <div id="dossier-overview-page" className="space-y-6">
      {/* Top Banner with Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wider mb-1">
            <FolderOpen className="w-4 h-4" />
            Raadspaneel Dossiersysteem
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Raadsdossiers & Stukkenarchief
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Interactief netwerk van gemeentelijke dossiers, besluitvormingslijnen en gekoppelde raadsstukken uit de Steenwijkerlandse raad.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            id="btn-open-bulk-upload"
            onClick={() => setIsBulkUploadOpen(true)}
            variant="outline"
            className="border-accent/40 text-accent hover:bg-accent/15 text-xs font-semibold h-9 rounded-xl shadow-xs"
            title="Upload alle bestanden herkenbaar door de metadata in één keer"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Documenten Bulk-Uploaden
          </Button>

          <Button
            id="btn-open-create-dossier"
            onClick={() => setIsCreateDossierOpen(true)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold h-9 rounded-xl shadow-xs"
          >
            <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
            Dossier Aanmaken
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Totaal Dossiers</span>
            <Layers className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.totalDossiers}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Gedefinieerde dossiers & beleidsthema's
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Gekoppelde Raadsstukken</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.totalDocuments}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Stukken in metadata netwerkgraaf
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">PDF's Live op Server</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.totalUploadedFiles}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Fysiek aanwezig en direct leesbaar in viewer
          </span>
        </div>
      </div>

      {/* Search and Category Filter Bar */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search-dossiers-input"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Zoek in dossiers op titel, beleidsonderwerp, tags of specifieke raadsstukken..."
              className="pl-9 h-9 text-xs rounded-xl bg-background"
            />
            {search && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Wis
              </button>
            )}
          </div>

          {/* Filter options */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-xl border border-border bg-background select-none">
              <input
                type="checkbox"
                checked={hasFilesOnly}
                onChange={(e) => {
                  setHasFilesOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded text-accent focus:ring-accent w-3.5 h-3.5"
              />
              <span>Alleen met live bestanden</span>
            </label>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDossiers}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              title="Vernieuwen"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => handleCategoryChange("all")}
            className={`px-3 py-1 rounded-xl font-medium transition-colors shrink-0 ${
              selectedCategory === "all"
                ? "bg-accent text-accent-foreground font-semibold"
                : "bg-muted/50 text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            Alle Categorieën ({stats.totalDossiers})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-3 py-1 rounded-xl font-medium transition-colors shrink-0 ${
                selectedCategory === cat
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Dossier Tiles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 py-8">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-3xl h-80 animate-pulse"
            />
          ))}
        </div>
      ) : dossiers.length === 0 ? (
        <div className="p-12 text-center bg-card border border-border rounded-3xl my-6">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-bold text-foreground mb-1">Geen dossiers gevonden</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
            Geen dossiers die voldoen aan uw zoekopdracht of filter. Probeer een andere term of maak een nieuw dossier aan.
          </p>
          <Button
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
              setHasFilesOnly(false);
            }}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs"
          >
            Filters wissen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {dossiers.map((dossier) => (
            <div
              key={dossier.id}
              id={`dossier-card-${dossier.slug}`}
              onClick={() => setActiveDossierSlug(dossier.slug)}
              className="group bg-card border border-border rounded-3xl overflow-hidden hover:border-accent/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer"
            >
              <div>
                {/* Thumbnail Header */}
                <div className="relative h-44 w-full bg-muted overflow-hidden">
                  <img
                    src={dossier.thumbnail}
                    alt={dossier.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Badges on image */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-black/60 text-white backdrop-blur-xs border border-white/20">
                      {dossier.category}
                    </span>
                    {dossier.isCustom && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-foreground shadow-xs">
                        Aangemaakt
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                    <span className="flex items-center gap-1.5 font-medium drop-shadow-xs">
                      <FileText className="w-3.5 h-3.5" />
                      {dossier.documentCount} {dossier.documentCount === 1 ? "stuk" : "stukken"}
                    </span>
                    {dossier.uploadedCount > 0 ? (
                      <span className="flex items-center gap-1 font-semibold text-emerald-300 drop-shadow-xs text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {dossier.uploadedCount} PDF's live
                      </span>
                    ) : (
                      <span className="text-[11px] text-white/70">
                        In afwachting van upload
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5">
                  {dossier.dateRange.start && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1.5 font-medium">
                      <Calendar className="w-3 h-3" />
                      {dossier.dateRange.start} {dossier.dateRange.end && `– ${dossier.dateRange.end}`}
                    </div>
                  )}

                  <h3 className="font-bold text-foreground text-base group-hover:text-accent transition-colors line-clamp-2 leading-snug mb-2">
                    {dossier.title}
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-4">
                    {dossier.description}
                  </p>

                  {/* Tags */}
                  {dossier.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {dossier.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-muted text-muted-foreground border border-border"
                        >
                          #{tag}
                        </span>
                      ))}
                      {dossier.tags.length > 3 && (
                        <span className="text-[10px] text-muted-foreground self-center">
                          +{dossier.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs">
                <span className="text-[11px] text-muted-foreground font-medium">
                  Bekijk tijdlijn & netwerk
                </span>
                <span className="text-accent font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Open dossier
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border text-xs text-muted-foreground">
          <div>
            Toont {(page - 1) * 12 + 1} t/m {Math.min(page * 12, totalCount)} van de {totalCount} dossiers
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              id="btn-pagination-prev"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 text-xs rounded-xl"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Vorige
            </Button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pNum = i + 1;
                // Show first, last, and window around current page
                if (
                  pNum === 1 ||
                  pNum === totalPages ||
                  (pNum >= page - 2 && pNum <= page + 2)
                ) {
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`h-8 w-8 rounded-xl text-xs font-semibold transition-colors ${
                        page === pNum
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                }
                if (pNum === page - 3 || pNum === page + 3) {
                  return <span key={pNum} className="px-1 text-muted-foreground">...</span>;
                }
                return null;
              })}
            </div>

            <Button
              id="btn-pagination-next"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2.5 text-xs rounded-xl"
            >
              Volgende
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      <DossierBulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onUploadSuccess={() => {
          fetchDossiers();
        }}
      />

      {/* Create Dossier Modal */}
      <CreateDossierModal
        isOpen={isCreateDossierOpen}
        onClose={() => setIsCreateDossierOpen(false)}
        onCreated={(newDossier) => {
          fetchDossiers();
          setActiveDossierSlug(newDossier.slug);
        }}
      />
    </div>
  );
};
