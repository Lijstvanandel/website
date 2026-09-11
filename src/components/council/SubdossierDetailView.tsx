import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  FolderTree,
  FileText,
  Link2,
  Clock,
  MapPin,
  Calendar,
  Download,
  Eye,
  Star,
  Edit3,
  Plus,
  Search,
  Share2,
  CheckCircle2,
  AlertCircle,
  Filter,
  FolderOpen,
  ChevronRight,
  Sparkles,
  Layers,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { DossierNetworkGraph } from "./DossierNetworkGraph";
import { getSubdossierClientThumbnail } from "@/lib/dossierClientUtils";
import type {
  Dossier,
  DossierSubdossier,
  DossierDocument,
  GraphNode,
  GraphEdge,
} from "@/types/dossier";

interface SubdossierDetailViewProps {
  hoofddossier: Dossier;
  subdossier: DossierSubdossier;
  allDossierDocuments: DossierDocument[];
  onBackToHoofddossier: () => void;
  onBackToOverview: () => void;
  onOpenDocumentViewer: (doc: DossierDocument) => void;
  onOpenDocumentEditor: (doc: DossierDocument) => void;
  onOpenAddDocument: (subdossierTitle: string, mode: "upload" | "link") => void;
  onEditSubdossier: (sub: DossierSubdossier) => void;
  isCouncilOrAdmin: boolean;
  user: any;
  favoritesSet: Set<string>;
  onToggleFavorite: (doc: DossierDocument, e: React.MouseEvent) => void;
  initialTab?: "graph" | "documents" | "timeline" | "wijken";
}

export const SubdossierDetailView: React.FC<SubdossierDetailViewProps> = ({
  hoofddossier,
  subdossier,
  allDossierDocuments,
  onBackToHoofddossier,
  onBackToOverview,
  onOpenDocumentViewer,
  onOpenDocumentEditor,
  onOpenAddDocument,
  onEditSubdossier,
  isCouncilOrAdmin,
  favoritesSet,
  onToggleFavorite,
  initialTab = "graph",
}) => {
  // Active standalone tab: graph | documents | timeline | wijken
  const [activeTab, setActiveTab] = useState<"graph" | "documents" | "timeline" | "wijken">(
    initialTab
  );

  // Search and filter inside this subdossier
  const [docSearch, setDocSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "live" | "meta">("all");

  // Server-fetched graph state for this specific subdossier
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({
    nodes: [],
    edges: [],
  });
  const [loadingGraph, setLoadingGraph] = useState(false);

  // Helper slugify
  const slugify = (text: string) =>
    (text || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // All documents strictly belonging to this subdossier
  const subDocs = useMemo(() => {
    const targetSlug = slugify(subdossier.slug || subdossier.title);
    const targetTitle = (subdossier.title || "").toLowerCase().trim();

    return (allDossierDocuments || []).filter((doc) => {
      const docSub = (doc.subdossier || "").toLowerCase().trim();
      const docSlug = slugify(doc.subdossier || "");
      return (
        docSub === targetTitle ||
        docSlug === targetSlug ||
        docSub.includes(targetTitle) ||
        targetTitle.includes(docSub)
      );
    });
  }, [allDossierDocuments, subdossier]);

  // Fetch server sub-graph specifically for this subdossier
  const fetchSubdossierGraph = useCallback(async () => {
    setLoadingGraph(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const dSlug = hoofddossier.slug || hoofddossier.id;
      const sSlug = subdossier.slug || subdossier.title;

      const res = await fetch(
        `/api/council/dossiers/${encodeURIComponent(dSlug)}?subdossier=${encodeURIComponent(sSlug)}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.graph && (data.graph.nodes?.length > 0 || data.graph.edges?.length > 0)) {
          setGraphData(data.graph);
          return;
        }
      }
    } catch {
      // Fallback to client-generated graph
    } finally {
      setLoadingGraph(false);
    }
  }, [hoofddossier, subdossier]);

  useEffect(() => {
    fetchSubdossierGraph();
  }, [fetchSubdossierGraph]);

  // Client-computed graph fallback/enrichment to ensure rich network
  const finalGraph = useMemo(() => {
    const docMap = new Map<string, DossierDocument>();
    subDocs.forEach((d) => docMap.set(d.bestandsnaam, d));

    // Nodes
    const nodeMap = new Map<string, GraphNode>();

    // Add nodes from server graph if they belong to this subdossier
    (graphData.nodes || []).forEach((n) => {
      if (docMap.has(n.id)) {
        nodeMap.set(n.id, n);
      }
    });

    // Ensure EVERY document of this subdossier is represented as a node
    subDocs.forEach((doc) => {
      if (!nodeMap.has(doc.bestandsnaam)) {
        nodeMap.set(doc.bestandsnaam, {
          id: doc.bestandsnaam,
          label: doc.titel || doc.bestandsnaam,
          type: "Raadsstuk",
          val: doc.fileExists ? 14 : 10,
          date: doc.datum,
          fileExists: doc.fileExists,
        });
      }
    });

    const nodes = Array.from(nodeMap.values());
    const nodeIds = new Set(nodes.map((n) => n.id));

    // Edges
    const edgeKeySet = new Set<string>();
    const edges: GraphEdge[] = [];

    // Keep server edges between these subdossier nodes
    (graphData.edges || []).forEach((e) => {
      if (nodeIds.has(e.source) && nodeIds.has(e.target)) {
        const key = [e.source, e.target].sort().join("|||");
        if (!edgeKeySet.has(key)) {
          edgeKeySet.add(key);
          edges.push(e);
        }
      }
    });

    // Connect documents that share specific entities
    for (let i = 0; i < subDocs.length; i++) {
      const docA = subDocs[i];
      const entA = (docA.entiteiten || []).map((e) => e.toLowerCase().trim()).filter((e) => e.length > 2);

      for (let j = i + 1; j < subDocs.length; j++) {
        const docB = subDocs[j];
        const entB = (docB.entiteiten || []).map((e) => e.toLowerCase().trim()).filter((e) => e.length > 2);
        const commonEnts = entA.filter((e) => entB.includes(e));

        if (commonEnts.length > 0) {
          const key = [docA.bestandsnaam, docB.bestandsnaam].sort().join("|||");
          if (!edgeKeySet.has(key)) {
            edgeKeySet.add(key);
            edges.push({
              source: docA.bestandsnaam,
              target: docB.bestandsnaam,
              label: `Onderwerp: ${commonEnts.slice(0, 2).join(", ")}`,
              reasons: commonEnts,
            });
          }
        }

        // Direct mention in relaties
        const relStr = Array.isArray(docA.relaties) ? docA.relaties.join(" ") : docA.relaties || "";
        if (relStr && (relStr.includes(docB.bestandsnaam) || relStr.includes(docB.titel))) {
          const key = [docA.bestandsnaam, docB.bestandsnaam].sort().join("|||");
          if (!edgeKeySet.has(key)) {
            edgeKeySet.add(key);
            edges.push({
              source: docA.bestandsnaam,
              target: docB.bestandsnaam,
              label: "Directe verwijzing",
              reasons: ["Verwijzing in raadsstuk"],
            });
          }
        }
      }
    }

    // Procedural sequence link so all docs form a cohesive line if edges are sparse
    if (edges.length < Math.max(1, nodes.length - 1)) {
      const sortedByDate = [...subDocs].sort((a, b) => {
        const dA = a.datum ? new Date(a.datum).getTime() : 0;
        const dB = b.datum ? new Date(b.datum).getTime() : 0;
        return dA - dB;
      });

      for (let i = 0; i < sortedByDate.length - 1; i++) {
        const key = [sortedByDate[i].bestandsnaam, sortedByDate[i + 1].bestandsnaam].sort().join("|||");
        if (!edgeKeySet.has(key)) {
          edgeKeySet.add(key);
          edges.push({
            source: sortedByDate[i].bestandsnaam,
            target: sortedByDate[i + 1].bestandsnaam,
            label: "Procedurele opvolging",
            reasons: ["Besluitvormingstraject"],
          });
        }
      }
    }

    return { nodes, edges };
  }, [subDocs, graphData]);

  // Filtered documents list for documents tab
  const filteredDocs = useMemo(() => {
    let list = subDocs;

    if (docSearch.trim()) {
      const q = docSearch.toLowerCase();
      list = list.filter(
        (d) =>
          d.titel.toLowerCase().includes(q) ||
          d.bestandsnaam.toLowerCase().includes(q) ||
          d.datum?.toLowerCase().includes(q) ||
          d.entiteiten?.some((e) => e.toLowerCase().includes(q))
      );
    }

    if (typeFilter !== "all") {
      const tf = typeFilter.toLowerCase();
      list = list.filter(
        (d) =>
          d.type?.toLowerCase().includes(tf) ||
          d.titel.toLowerCase().includes(tf) ||
          d.bestandsnaam.toLowerCase().includes(tf)
      );
    }

    if (availabilityFilter === "live") {
      list = list.filter((d) => d.fileExists);
    } else if (availabilityFilter === "meta") {
      list = list.filter((d) => !d.fileExists);
    }

    return list;
  }, [subDocs, docSearch, typeFilter, availabilityFilter]);

  // Chronological timeline
  const timelineDocs = useMemo(() => {
    return [...filteredDocs].sort((a, b) => {
      const dateA = a.datum ? new Date(a.datum).getTime() : 0;
      const dateB = b.datum ? new Date(b.datum).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredDocs]);

  // Unique document types in this subdossier
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    subDocs.forEach((d) => {
      if (d.type) set.add(d.type);
    });
    return Array.from(set);
  }, [subDocs]);

  // Count live PDFs in this subdossier
  const liveCount = useMemo(() => {
    return subDocs.filter((d) => d.fileExists).length;
  }, [subDocs]);

  // Subdossier thumbnail banner image
  const subThumbnail =
    subdossier.thumbnail ||
    getSubdossierClientThumbnail(subdossier.title, hoofddossier.title, hoofddossier.thumbnail);

  const handleShareLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "dossiers");
    url.searchParams.set("dossier", hoofddossier.slug || hoofddossier.id);
    url.searchParams.set("subdossier", subdossier.slug || subdossier.title);
    navigator.clipboard.writeText(url.toString());
    toast.success("Directe link naar dit subdossier gekopieerd naar klembord!");
  };

  return (
    <div id="subdossier-standalone-view" className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Top Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/60 backdrop-blur-xs border border-border px-4 py-3 rounded-2xl">
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <button
            onClick={onBackToOverview}
            className="hover:text-foreground hover:underline font-medium transition-colors flex items-center gap-1"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Dossiers
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <button
            onClick={onBackToHoofddossier}
            className="hover:text-foreground hover:underline font-medium transition-colors max-w-[200px] truncate"
            title={hoofddossier.title}
          >
            {hoofddossier.title}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20 flex items-center gap-1">
            <FolderTree className="w-3 h-3" />
            {subdossier.title}
          </span>
        </div>

        {/* Back and Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            id="btn-back-to-hoofddossier"
            onClick={onBackToHoofddossier}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-semibold h-8 border-border hover:bg-accent/10 hover:text-accent"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Terug naar {hoofddossier.title}
          </Button>

          <Button
            onClick={handleShareLink}
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs rounded-xl text-muted-foreground hover:text-foreground"
            title="Kopieer directe link naar dit subdossier"
          >
            <Share2 className="w-3.5 h-3.5" />
          </Button>

          {isCouncilOrAdmin && (
            <Button
              id="btn-edit-subdossier-standalone"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-semibold h-8 text-accent border-accent/30 hover:bg-accent/15"
              onClick={() => onEditSubdossier(subdossier)}
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" />
              Subdossier Bewerken
            </Button>
          )}
        </div>
      </div>

      {/* Standalone Subdossier Hero Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-border bg-card shadow-sm">
        {/* Banner Image with high-contrast gradient */}
        <div className="relative h-60 sm:h-72 w-full overflow-hidden bg-muted">
          <img
            src={subThumbnail}
            alt={subdossier.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/25" />

          {/* Top badges inside hero image */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/60 text-white backdrop-blur-md border border-white/25 flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-accent" />
                Zelfstandig Subdossier
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-black/40 text-white/90 backdrop-blur-md border border-white/15">
                Onderdeel van: {hoofddossier.title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {liveCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/80 text-white backdrop-blur-md border border-emerald-400/40 flex items-center gap-1.5 shadow-sm">
                  <FileCheck className="w-3.5 h-3.5" />
                  {liveCount} Live PDF's beschikbaar
                </span>
              )}
            </div>
          </div>

          {/* Main Title & Details positioned at bottom of hero */}
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <div className="max-w-4xl space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow-md text-white">
                {subdossier.title}
              </h1>

              {subdossier.description && (
                <p className="text-xs sm:text-sm text-white/90 line-clamp-2 leading-relaxed drop-shadow-sm font-medium">
                  {subdossier.description}
                </p>
              )}

              {/* Tags & Wijken badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                {subdossier.tags &&
                  subdossier.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-[11px] font-medium border border-white/20 transition-colors"
                    >
                      #{t}
                    </span>
                  ))}

                {subdossier.wijken &&
                  subdossier.wijken.map((w, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-accent/30 text-white text-[11px] font-medium border border-accent/40 flex items-center gap-1 backdrop-blur-sm"
                    >
                      <MapPin className="w-3 h-3 text-accent" />
                      {w}
                    </span>
                  ))}

                {(subdossier.dateRange?.start || subdossier.dateRange?.end) && (
                  <span className="px-2 py-0.5 rounded-md bg-black/40 text-white/80 text-[11px] font-mono flex items-center gap-1 border border-white/10">
                    <Calendar className="w-3 h-3" />
                    {subdossier.dateRange.start || "—"} t/m {subdossier.dateRange.end || "heden"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subdossier Metric Overview Bar */}
        <div className="p-4 sm:p-5 bg-card border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground block leading-tight">
                {subDocs.length}
              </span>
              <span className="text-xs text-muted-foreground">Stukken & Besluiten</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground block leading-tight">
                {liveCount}
              </span>
              <span className="text-xs text-muted-foreground">Fysieke PDF's</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground block leading-tight">
                {finalGraph.edges.length}
              </span>
              <span className="text-xs text-muted-foreground">Relaties in Netwerk</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground block leading-tight">
                {subdossier.wijken?.length || 0}
              </span>
              <span className="text-xs text-muted-foreground">Betrokken Kernen</span>
            </div>
          </div>
        </div>
      </div>

      {/* Standalone Subdossier Tabs Navigation */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-1 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <button
            id="sub-tab-graph"
            onClick={() => setActiveTab("graph")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "graph"
                ? "bg-accent/15 text-accent border border-accent/30 shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Link2 className="w-4 h-4 text-accent" />
            Interactieve Relatiekaart ({finalGraph.nodes.length})
          </button>

          <button
            id="sub-tab-documents"
            onClick={() => setActiveTab("documents")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "documents"
                ? "bg-accent/15 text-accent border border-accent/30 shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <FileText className="w-4 h-4" />
            Eigen Documentenlijst ({subDocs.length})
          </button>

          <button
            id="sub-tab-timeline"
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "timeline"
                ? "bg-accent/15 text-accent border border-accent/30 shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Clock className="w-4 h-4" />
            Eigen Tijdlijn ({subDocs.length})
          </button>

          <button
            id="sub-tab-wijken"
            onClick={() => setActiveTab("wijken")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "wijken"
                ? "bg-accent/15 text-accent border border-accent/30 shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <MapPin className="w-4 h-4" />
            Wijken & Kernen ({subdossier.wijken?.length || 0})
          </button>
        </div>

        {/* Action Button inside Tab Bar */}
        {isCouncilOrAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenAddDocument(subdossier.title, "upload")}
              className="rounded-xl text-xs h-8 font-semibold border-accent/30 text-accent hover:bg-accent/15"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Stuk toevoegen aan subdossier
            </Button>
          </div>
        )}
      </div>

      {/* TAB 1: INTERACTIEVE RELATIEKAART VAN DIT SUBDOSSIER */}
      {activeTab === "graph" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Information & Context Banner */}
          <div className="p-4 rounded-2xl bg-accent/10 border border-accent/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
                <Link2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">
                  Zelfstandige Relatiegraaf: {subdossier.title}
                </h4>
                <p className="text-muted-foreground text-[11px]">
                  Visualiseert de onderlinge relaties tussen de raadsvoorstellen, besluiten, moties en wettelijke kaders binnen dit specifieke subdossier.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
              <span className="px-2 py-0.5 rounded-md bg-background border border-border">
                {finalGraph.nodes.length} knopen
              </span>
              <span className="px-2 py-0.5 rounded-md bg-background border border-border">
                {finalGraph.edges.length} relaties
              </span>
            </div>
          </div>

          {/* The Network Graph Component specifically showing this subdossier */}
          {loadingGraph ? (
            <div className="h-[450px] bg-card border border-border rounded-2xl flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-muted-foreground">Relatienetwerk van subdossier berekenen...</p>
            </div>
          ) : (
            <DossierNetworkGraph
              nodes={finalGraph.nodes}
              edges={finalGraph.edges}
              documents={subDocs}
              onSelectDocument={(docItem) => {
                const found = subDocs.find((d) => d.bestandsnaam === docItem.bestandsnaam);
                if (found) {
                  onOpenDocumentViewer(found);
                } else {
                  onOpenDocumentViewer({
                    id: (docItem as any).id || docItem.bestandsnaam,
                    bestandsnaam: docItem.bestandsnaam,
                    titel: docItem.titel,
                    dossier: hoofddossier.title,
                    subdossier: subdossier.title,
                    datum: (docItem as any).datum,
                    fileExists: (docItem as any).fileExists ?? true,
                  });
                }
              }}
              title={`Relatiekaart: ${subdossier.title}`}
            />
          )}

          {/* Quick Access Card Grid under the Graph */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Gekoppelde Stukken in deze Graaf ({subDocs.length})
                </h4>
                <p className="text-xs text-muted-foreground">
                  Klik op een stuk om het PDF-document direct in de viewer te openen
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("documents")}
                className="text-xs text-accent hover:text-accent/90"
              >
                Volledige documentenlijst
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {subDocs.slice(0, 6).map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-border bg-background hover:border-accent/50 transition-all flex flex-col justify-between group shadow-2xs cursor-pointer"
                  onClick={() => onOpenDocumentViewer(doc)}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="p-1.5 rounded-lg bg-accent/10 text-accent shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {doc.datum || "—"}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-foreground line-clamp-2 mb-1 group-hover:text-accent transition-colors">
                      {doc.titel}
                    </h5>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      {doc.bestandsnaam}
                    </p>
                  </div>

                  <div className="pt-2.5 mt-2.5 border-t border-border flex items-center justify-between text-[11px]">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        doc.fileExists
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {doc.fileExists ? "Live PDF" : "Metadata"}
                    </span>
                    <span className="text-accent flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform">
                      <Eye className="w-3 h-3" />
                      Bekijk
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EIGEN DOCUMENTENLIJST */}
      {activeTab === "documents" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs space-y-4 p-5 animate-in fade-in-50 duration-200">
          {/* Header & Filter Controls */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder={`Zoek in ${subDocs.length} stukken van dit subdossier...`}
                  className="pl-9 h-9 text-xs rounded-xl bg-background"
                />
              </div>

              {/* Type Filter */}
              {availableTypes.length > 0 && (
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-hidden cursor-pointer h-9"
                >
                  <option value="all">Alle type stukken ({subDocs.length})</option>
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}

              {/* Availability Filter */}
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-hidden cursor-pointer h-9"
              >
                <option value="all">Alle bestanden</option>
                <option value="live">Alleen Live PDF ({liveCount})</option>
                <option value="meta">Alleen Metadata ({subDocs.length - liveCount})</option>
              </select>
            </div>

            {/* Stuk Toevoegen */}
            {isCouncilOrAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-xs h-9 font-semibold border-accent/30 text-accent hover:bg-accent/15"
                onClick={() => onOpenAddDocument(subdossier.title, "upload")}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Stuk Toevoegen
              </Button>
            )}
          </div>

          {/* Document list count feedback */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              {filteredDocs.length} van {subDocs.length} raadsstukken in dit subdossier
            </span>
            {(docSearch || typeFilter !== "all" || availabilityFilter !== "all") && (
              <button
                onClick={() => {
                  setDocSearch("");
                  setTypeFilter("all");
                  setAvailabilityFilter("all");
                }}
                className="text-accent hover:underline"
              >
                Wis filters
              </button>
            )}
          </div>

          {/* Documents Table / Card List */}
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 border border-border/60 rounded-2xl">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h4 className="text-sm font-bold text-foreground">Geen documenten gevonden</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Er zijn geen documenten die overeenkomen met de gekozen zoekcriteria binnen dit subdossier.
              </p>
              {isCouncilOrAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs"
                  onClick={() => onOpenAddDocument(subdossier.title, "upload")}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Voeg eerste stuk toe aan dit subdossier
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredDocs.map((doc, idx) => (
                <div
                  key={doc.id || idx}
                  className="p-4 rounded-xl border border-border bg-background hover:border-accent/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        {doc.datum || "Geen datum"}
                      </span>

                      {doc.type && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                          {doc.type}
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          doc.fileExists
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {doc.fileExists ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5" /> Live PDF
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-2.5 h-2.5" /> Verwacht
                          </>
                        )}
                      </span>

                      {doc.fileSize && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {doc.fileSize}
                        </span>
                      )}
                    </div>

                    <h4
                      className="text-sm font-bold text-foreground group-hover:text-accent transition-colors cursor-pointer"
                      onClick={() => onOpenDocumentViewer(doc)}
                    >
                      {doc.titel}
                    </h4>

                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {doc.bestandsnaam}
                    </p>

                    {/* Entities and relationships */}
                    {doc.entiteiten && doc.entiteiten.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {doc.entiteiten.slice(0, 4).map((ent, eIdx) => (
                          <span
                            key={eIdx}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-muted/80 text-foreground"
                          >
                            {ent}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions buttons on document */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={(e) => onToggleFavorite(doc, e)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        favoritesSet.has(doc.bestandsnaam.toLowerCase().trim())
                          ? "bg-amber-500/20 text-amber-500"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                      title="Vastpinnen als favoriet"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          favoritesSet.has(doc.bestandsnaam.toLowerCase().trim())
                            ? "fill-amber-500 text-amber-500"
                            : ""
                        }`}
                      />
                    </button>

                    {isCouncilOrAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => onOpenDocumentEditor(doc)}
                        title="Document bewerken"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        Bewerken
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs rounded-xl text-accent border-accent/30 hover:bg-accent/15 font-semibold"
                      onClick={() => onOpenDocumentViewer(doc)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Bekijk in viewer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EIGEN TIJDLIJN */}
      {activeTab === "timeline" && (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Chronologische Tijdlijn: {subdossier.title}
              </h4>
              <p className="text-xs text-muted-foreground">
                Reconstructie van het besluitvormingstraject van de recentste raadsstukken tot de oudste onderleggers
              </p>
            </div>
            {isCouncilOrAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs h-8"
                onClick={() => onOpenAddDocument(subdossier.title, "upload")}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Document Toevoegen
              </Button>
            )}
          </div>

          <div className="max-w-3xl mx-auto space-y-8 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border pt-2">
            {timelineDocs.map((doc, idx) => (
              <div key={idx} className="relative pl-10 group">
                {/* Node icon on line */}
                <div className="absolute left-1.5 -translate-x-1/2 top-1.5 w-5 h-5 rounded-full bg-background border-2 border-accent flex items-center justify-center shadow-xs">
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
                          <CheckCircle2 className="w-3 h-3" /> Live PDF
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Geregistreerd
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCouncilOrAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs rounded-lg text-muted-foreground hover:text-foreground"
                          onClick={() => onOpenDocumentEditor(doc)}
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          Bewerken
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs rounded-lg text-accent hover:bg-accent/15 border-accent/30 font-semibold"
                        onClick={() => onOpenDocumentViewer(doc)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Bekijk
                      </Button>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-foreground mb-1">
                    {doc.titel}
                  </h4>
                  <p className="text-xs font-mono text-muted-foreground truncate mb-2">
                    {doc.bestandsnaam}
                  </p>

                  {/* Entities & mentions */}
                  {((doc.entiteiten && doc.entiteiten.length > 0) || (doc.relaties && doc.relaties.length > 0)) && (
                    <div className="pt-2 border-t border-border flex flex-wrap gap-1 text-[11px]">
                      {doc.entiteiten?.map((ent, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-muted text-foreground text-[10px]">
                          {ent}
                        </span>
                      ))}
                      {doc.relaties && (
                        <span className="px-2 py-0.5 rounded bg-accent/10 text-accent text-[10px]">
                          {Array.isArray(doc.relaties) ? doc.relaties.join(", ") : doc.relaties}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: BETROKKEN WIJKEN & KERNEN */}
      {activeTab === "wijken" && (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 animate-in fade-in-50 duration-200">
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Betrokken Kernen & Wijken bij {subdossier.title}
            </h4>
            <p className="text-xs text-muted-foreground">
              Bekijk welke dorpskernen en wijken binnen Steenwijkerland direct geraakt worden door de besluitvorming in dit subdossier
            </p>
          </div>

          {subdossier.wijken && subdossier.wijken.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subdossier.wijken.map((wijkNaam, idx) => {
                // Documents specifically linked to this wijk in this subdossier
                const wijkDocs = subDocs.filter(
                  (d) =>
                    (d.wijk_of_kern && d.wijk_of_kern.toLowerCase().includes(wijkNaam.toLowerCase())) ||
                    d.wijken?.some((w) => w.toLowerCase().includes(wijkNaam.toLowerCase()))
                );

                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-border bg-background hover:border-accent/50 transition-all flex flex-col justify-between shadow-2xs group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-foreground">
                          {wijkDocs.length} {wijkDocs.length === 1 ? "stuk" : "stukken"}
                        </span>
                      </div>

                      <h5 className="font-bold text-base text-foreground mb-1 group-hover:text-accent transition-colors">
                        {wijkNaam}
                      </h5>
                      <p className="text-xs text-muted-foreground mb-3">
                        Koppeling via raadsvoorstellen, bestemmingsplannen en beleidskaders in {subdossier.title}.
                      </p>

                      {wijkDocs.length > 0 && (
                        <div className="space-y-1 p-2.5 rounded-xl bg-muted/40 border border-border/50 text-[11px] mb-2">
                          <span className="font-semibold text-muted-foreground block text-[10px]">
                            Stukken in {wijkNaam}:
                          </span>
                          {wijkDocs.slice(0, 2).map((wd, wdi) => (
                            <div
                              key={wdi}
                              onClick={() => onOpenDocumentViewer(wd)}
                              className="text-foreground hover:text-accent truncate cursor-pointer flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3 text-accent shrink-0" />
                              <span className="truncate">{wd.titel}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs rounded-xl border-accent/30 text-accent hover:bg-accent/15"
                        onClick={() => {
                          setDocSearch(wijkNaam);
                          setActiveTab("documents");
                        }}
                      >
                        Filter stukken op {wijkNaam}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-muted/20 border border-border/60 rounded-2xl">
              <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h5 className="text-sm font-bold text-foreground">Geen specifieke wijken gekoppeld</h5>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Dit subdossier heeft een gemeente-breed karakter of er zijn nog geen specifieke dorpskernen aan gekoppeld.
              </p>
              {isCouncilOrAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs"
                  onClick={() => onEditSubdossier(subdossier)}
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  Wijken en tags toevoegen
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
