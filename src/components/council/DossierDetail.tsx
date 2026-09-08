import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Calendar,
  Layers,
  FileText,
  Eye,
  Download,
  Share2,
  Clock,
  Link2,
  CheckCircle2,
  AlertCircle,
  Tag,
  Search,
  ExternalLink,
  ChevronRight,
  ListFilter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DossierNetworkGraph } from "./DossierNetworkGraph";
import { DossierDocumentViewer } from "./DossierDocumentViewer";
import type { Dossier, DossierDocument, GraphNode, GraphEdge } from "@/types/dossier";
import { toast } from "sonner";

interface DossierDetailProps {
  dossierSlug: string;
  onBack: () => void;
}

export const DossierDetail: React.FC<DossierDetailProps> = ({ dossierSlug, onBack }) => {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({
    nodes: [],
    edges: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view tab: "overview" (Graph + Quick list) | "timeline" (Chronological) | "documents" (Full table)
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "documents">("overview");
  const [docSearch, setDocSearch] = useState("");

  // Document Viewer state
  const [activeDocForViewer, setActiveDocForViewer] = useState<DossierDocument | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchDossierData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
        const res = await fetch(`/api/council/dossiers/${encodeURIComponent(dossierSlug)}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Dossier '${dossierSlug}' kon niet worden ingeladen`);
        }

        const data = await res.json();
        if (isMounted) {
          setDossier(data.dossier);
          setGraph(data.graph || { nodes: [], edges: [] });
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Fout bij ophalen van dossier");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDossierData();

    return () => {
      isMounted = false;
    };
  }, [dossierSlug]);

  const openDocumentViewer = (doc: DossierDocument | { bestandsnaam: string; titel: string; dossier?: string }) => {
    // If partial node, match with full dossier documents or build fallback
    const fullDoc = dossier?.documents.find((d) => d.bestandsnaam === doc.bestandsnaam);
    if (fullDoc) {
      setActiveDocForViewer(fullDoc);
    } else {
      setActiveDocForViewer({
        bestandsnaam: doc.bestandsnaam,
        titel: doc.titel,
        dossier: doc.dossier || dossier?.title || "Dossier",
        fileExists: false,
      });
    }
    setIsViewerOpen(true);
  };

  const handleDocumentUpdated = (updatedDoc: DossierDocument) => {
    if (!dossier) return;
    setDossier({
      ...dossier,
      documents: dossier.documents.map((d) =>
        d.bestandsnaam === updatedDoc.bestandsnaam ? updatedDoc : d
      ),
      uploadedCount: dossier.uploadedCount + 1,
    });
    setActiveDocForViewer(updatedDoc);
  };

  // Filtered documents list
  const filteredDocuments = useMemo(() => {
    if (!dossier?.documents) return [];
    if (!docSearch.trim()) return dossier.documents;
    const q = docSearch.toLowerCase();
    return dossier.documents.filter(
      (d) =>
        d.titel.toLowerCase().includes(q) ||
        d.bestandsnaam.toLowerCase().includes(q) ||
        d.datum?.toLowerCase().includes(q) ||
        d.entiteiten?.some((e) => e.toLowerCase().includes(q)) ||
        d.relaties?.some((r) => r.toLowerCase().includes(q))
    );
  }, [dossier?.documents, docSearch]);

  // Chronological timeline sorted newest -> oldest
  const timelineDocuments = useMemo(() => {
    if (!dossier?.documents) return [];
    return [...dossier.documents].sort((a, b) => {
      const dateA = a.datum ? new Date(a.datum).getTime() : 0;
      const dateB = b.datum ? new Date(b.datum).getTime() : 0;
      return dateB - dateA;
    });
  }, [dossier?.documents]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">
          Dossier en documentenrelaties inladen...
        </p>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-2xl max-w-xl mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
        <h3 className="text-base font-bold text-foreground mb-1">Dossier niet gevonden</h3>
        <p className="text-xs text-muted-foreground mb-5">{error || "Het opgevraagde dossier bestaat niet."}</p>
        <Button onClick={onBack} variant="outline" size="sm" className="rounded-xl text-xs">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Terug naar Dossieroverzicht
        </Button>
      </div>
    );
  }

  return (
    <div id="dossier-detail-view" className="space-y-6">
      {/* Top Breadcrumbs & Back Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button
          id="btn-back-to-dossiers"
          onClick={onBack}
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-semibold h-9"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Terug naar Dossiers
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-9"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Dossier-link gekopieerd naar klembord");
            }}
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Delen
          </Button>
        </div>
      </div>

      {/* Dossier Header Card */}
      <div
        id="dossier-header-card"
        className="relative bg-card border border-border rounded-3xl overflow-hidden shadow-sm"
      >
        <div className="flex flex-col md:flex-row items-stretch">
          {/* Thumbnail */}
          <div className="w-full md:w-80 h-52 md:h-auto shrink-0 relative overflow-hidden bg-muted">
            <img
              src={dossier.thumbnail}
              alt={dossier.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 text-white backdrop-blur-xs border border-white/20">
                {dossier.category}
              </span>
            </div>
          </div>

          {/* Details Content */}
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-bold text-accent uppercase tracking-wider">
                  Raadsdossier
                </span>
                {dossier.dateRange.start && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    {dossier.dateRange.start} {dossier.dateRange.end && `– ${dossier.dateRange.end}`}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-3">
                {dossier.title}
              </h1>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl mb-4">
                {dossier.description}
              </p>

              {/* Tags */}
              {dossier.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {dossier.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-lg text-xs bg-muted text-muted-foreground border border-border"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Metrics bar */}
            <div className="pt-4 border-t border-border flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground text-sm block leading-none">
                    {dossier.documentCount}
                  </span>
                  <span className="text-[11px]">Raadsstukken</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground text-sm block leading-none">
                    {dossier.uploadedCount}
                  </span>
                  <span className="text-[11px]">PDF's Live op Server</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground text-sm block leading-none">
                    {graph.edges.length}
                  </span>
                  <span className="text-[11px]">Gekoppelde Relaties</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          id="tab-btn-overview"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "overview"
              ? "bg-accent/15 text-accent border border-accent/30 shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Link2 className="w-4 h-4" />
          Interactieve Relatiekaart ({graph.nodes.length})
        </button>

        <button
          id="tab-btn-timeline"
          onClick={() => setActiveTab("timeline")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "timeline"
              ? "bg-accent/15 text-accent border border-accent/30 shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Clock className="w-4 h-4" />
          Tijdlijn van Bestanden ({timelineDocuments.length})
        </button>

        <button
          id="tab-btn-documents"
          onClick={() => setActiveTab("documents")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "documents"
              ? "bg-accent/15 text-accent border border-accent/30 shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <FileText className="w-4 h-4" />
          Documentenlijst & Viewer ({dossier.documents.length})
        </button>
      </div>

      {/* TAB CONTENT 1: INTERACTIVE NETWORK MAP */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <DossierNetworkGraph
            nodes={graph.nodes}
            edges={graph.edges}
            documents={dossier.documents}
            onSelectDocument={openDocumentViewer}
            title={dossier.title}
          />

          {/* Quick preview strip of documents */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-foreground">
                Documenten in dit dossier ({dossier.documents.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-accent hover:text-accent/90"
                onClick={() => setActiveTab("documents")}
              >
                Bekijk alle documenten in lijst
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dossier.documents.slice(0, 6).map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-border bg-background hover:border-accent/50 transition-all flex flex-col justify-between group shadow-2xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="p-1.5 rounded-lg bg-accent/10 text-accent shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {doc.datum || "—"}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-foreground line-clamp-2 mb-1">
                      {doc.titel}
                    </h5>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      {doc.bestandsnaam}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-border flex items-center justify-between">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        doc.fileExists
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {doc.fileExists ? "Beschikbaar" : "Verwacht"}
                    </span>
                    <Button
                      id={`btn-quick-view-doc-${idx}`}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-accent hover:bg-accent/15"
                      onClick={() => openDocumentViewer(doc)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Bekijk
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: TIJDLIJN VAN BESTANDEN */}
      {activeTab === "timeline" && (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-8 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border">
            {timelineDocuments.map((doc, idx) => (
              <div key={idx} className="relative pl-10 group">
                {/* Timeline node icon */}
                <div className="absolute left-1.5 -translate-x-1/2 top-1 w-5 h-5 rounded-full bg-background border-2 border-accent flex items-center justify-center shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                </div>

                {/* Timeline item card */}
                <div className="p-4 rounded-2xl bg-background border border-border hover:border-accent/40 transition-all shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-accent px-2 py-0.5 rounded-md bg-accent/10">
                        {doc.datum || "Datum onbekend"}
                      </span>
                      {doc.fileExists ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Live
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Metadata geregistreerd
                        </span>
                      )}
                    </div>

                    <Button
                      id={`btn-timeline-eye-${idx}`}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs rounded-lg text-accent hover:bg-accent/15 border-accent/30"
                      onClick={() => openDocumentViewer(doc)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Bekijk in viewer
                    </Button>
                  </div>

                  <h4 className="text-sm font-bold text-foreground mb-1">
                    {doc.titel}
                  </h4>
                  <p className="text-xs font-mono text-muted-foreground truncate mb-3">
                    {doc.bestandsnaam}
                  </p>

                  {/* Entities and relationships */}
                  {((doc.entiteiten && doc.entiteiten.length > 0) || (doc.relaties && doc.relaties.length > 0)) && (
                    <div className="pt-2.5 border-t border-border flex flex-wrap gap-1 text-[11px]">
                      {doc.entiteiten?.map((ent, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-muted text-foreground">
                          {ent}
                        </span>
                      ))}
                      {doc.relaties?.map((rel, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {rel}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: DOCUMENTENLIJST MET OOGJE */}
      {activeTab === "documents" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs space-y-4 p-5">
          {/* List Search Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search-dossier-docs"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Filter documenten op titel, datum of bestandsnaam..."
                className="pl-9 h-9 text-xs rounded-xl bg-background"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              {filteredDocuments.length} van de {dossier.documents.length} documenten
            </div>
          </div>

          {/* Document Table */}
          <div className="rounded-xl border border-border overflow-x-auto bg-background">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4 w-32">Datum</th>
                  <th className="py-3 px-4 hidden md:table-cell">Relaties / Entiteiten</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4 w-28 text-right">Bekijken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocuments.map((doc, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-start gap-2.5">
                        <FileText className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="font-bold text-foreground block hover:text-accent cursor-pointer" onClick={() => openDocumentViewer(doc)}>
                            {doc.titel}
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground truncate block">
                            {doc.bestandsnaam}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {doc.datum || "—"}
                    </td>

                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {doc.entiteiten?.slice(0, 2).map((ent, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-foreground">
                            {ent}
                          </span>
                        ))}
                        {doc.relaties?.slice(0, 2).map((rel, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400">
                            {rel}
                          </span>
                        ))}
                        {((doc.entiteiten?.length || 0) + (doc.relaties?.length || 0) > 4) && (
                          <span className="text-[10px] text-muted-foreground">
                            +meer
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          doc.fileExists
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {doc.fileExists ? "Live" : "Verwacht"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {/* Oogje icon button to view document */}
                      <Button
                        id={`btn-table-eye-${idx}`}
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 rounded-lg text-accent hover:bg-accent/15 font-semibold text-xs inline-flex items-center gap-1.5"
                        onClick={() => openDocumentViewer(doc)}
                        title="Document bekijken in viewer"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">Bekijk</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      <DossierDocumentViewer
        document={activeDocForViewer}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        onDocumentUpdated={handleDocumentUpdated}
      />
    </div>
  );
};
