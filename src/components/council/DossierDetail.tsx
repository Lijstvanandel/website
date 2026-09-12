import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Edit3,
  Plus,
  Trash2,
  FolderEdit,
  Upload,
  MapPin,
  Star,
  FolderTree,
  Folder,
  X,
  Filter,
  FileCheck,
  ArrowRightLeft,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DossierNetworkGraph } from "./DossierNetworkGraph";
import { DossierDocumentViewer } from "./DossierDocumentViewer";
import { EditDossierModal } from "./EditDossierModal";
import { EditDocumentModal } from "./EditDocumentModal";
import { AddDocumentModal } from "./AddDocumentModal";
import { EditSubdossierModal } from "./EditSubdossierModal";
import { CreateSubdossierModal } from "./CreateSubdossierModal";
import { DistributeDocumentsModal } from "./DistributeDocumentsModal";
import { SubdossierDetailView } from "./SubdossierDetailView";
import { getSubdossierClientThumbnail } from "@/lib/dossierClientUtils";
import type { Dossier, DossierDocument, GraphNode, GraphEdge, DossierSubdossier } from "@/types/dossier";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface DossierDetailProps {
  dossierSlug: string;
  initialSubdossierSlug?: string | null;
  onBack: () => void;
}

export const DossierDetail: React.FC<DossierDetailProps> = ({
  dossierSlug,
  initialSubdossierSlug,
  onBack,
}) => {
  const { user } = useAuth();
  const isCouncilOrAdmin = Boolean(
    user && (user.role === "admin" || user.role === "raadslid" || user.role === "fractielid")
  );

  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({
    nodes: [],
    edges: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view tab: "subdossiers" | "documents" | "overview" | "timeline"
  const [activeTab, setActiveTab] = useState<"subdossiers" | "documents" | "overview" | "timeline">("subdossiers");
  const [selectedSubdossier, setSelectedSubdossier] = useState<string | null>(initialSubdossierSlug || null);
  const [subdossierInitialTab, setSubdossierInitialTab] = useState<"graph" | "documents" | "timeline" | "wijken">("graph");
  const [selectedWijkFilter, setSelectedWijkFilter] = useState<string | null>(null);
  const [docSearch, setDocSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");

  // Document Viewer state
  const [activeDocForViewer, setActiveDocForViewer] = useState<DossierDocument | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Editing Modals State
  const [isEditDossierOpen, setIsEditDossierOpen] = useState(false);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [addDocInitialMode, setAddDocInitialMode] = useState<"upload" | "link">("upload");
  const [isEditDocOpen, setIsEditDocOpen] = useState(false);
  const [activeDocForEdit, setActiveDocForEdit] = useState<DossierDocument | null>(null);
  const [isEditSubdossierOpen, setIsEditSubdossierOpen] = useState(false);
  const [activeSubdossierForEdit, setActiveSubdossierForEdit] = useState<DossierSubdossier | null>(null);
  const [isCreateSubdossierOpen, setIsCreateSubdossierOpen] = useState(false);
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [distributeTargetInitial, setDistributeTargetInitial] = useState<string | undefined>(undefined);
  const [preselectedDocIdsForDistribute, setPreselectedDocIdsForDistribute] = useState<string[]>([]);
  const [selectedTableDocIds, setSelectedTableDocIds] = useState<Set<string>>(new Set());

  const fetchDossierData = useCallback(async () => {
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
      setDossier(data.dossier);
      setGraph(data.graph || { nodes: [], edges: [] });
    } catch (err: any) {
      setError(err.message || "Fout bij ophalen van dossier");
    } finally {
      setLoading(false);
    }
  }, [dossierSlug]);

  const [favoritesSet, setFavoritesSet] = useState<Set<string>>(new Set());

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    const token =
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/council/documents/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const set = new Set<string>();
        for (const item of data.favorites || []) {
          if (item.filename) set.add(item.filename.toLowerCase().trim());
        }
        setFavoritesSet(set);
      }
    } catch {
      // Ignore background fetch error
    }
  }, [user]);

  const handleToggleFavorite = async (
    doc: DossierDocument | { bestandsnaam: string; titel: string; dossier?: string; datum?: string | null; fileExists?: boolean; fileUrl?: string; fileSize?: number },
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Log in om raadsstukken als favoriet te bewaren.");
      return;
    }
    const token =
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");
    if (!token) return;

    const fnKey = doc.bestandsnaam.toLowerCase().trim();
    const willBeFavorite = !favoritesSet.has(fnKey);

    // Optimistic update
    setFavoritesSet((prev) => {
      const next = new Set(prev);
      if (willBeFavorite) next.add(fnKey);
      else next.delete(fnKey);
      return next;
    });

    try {
      const res = await fetch("/api/council/documents/favorites/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: doc.bestandsnaam,
          title: doc.titel,
          dossier: doc.dossier || dossier?.title,
          date: (doc as any).datum,
          fileExists: doc.fileExists,
          fileUrl: (doc as any).fileUrl,
          fileSize: (doc as any).fileSize,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          data.isFavorite
            ? `'${doc.titel || doc.bestandsnaam}' toegevoegd aan favorieten carrousel`
            : `'${doc.titel || doc.bestandsnaam}' verwijderd uit favorieten`
        );
      } else {
        fetchFavorites();
      }
    } catch {
      fetchFavorites();
      toast.error("Fout bij bijwerken favoriet");
    }
  };

  useEffect(() => {
    fetchDossierData();
    fetchFavorites();
  }, [fetchDossierData, fetchFavorites]);

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

  const openDocumentEditor = (doc: DossierDocument) => {
    setActiveDocForEdit(doc);
    setIsEditDocOpen(true);
  };

  const handleDocumentUpdated = (updatedDoc: DossierDocument) => {
    if (!dossier) return;
    setDossier({
      ...dossier,
      documents: dossier.documents.map((d) =>
        d.bestandsnaam === updatedDoc.bestandsnaam ? updatedDoc : d
      ),
      uploadedCount: updatedDoc.fileExists
        ? Math.max(dossier.uploadedCount, dossier.documents.filter((d) => d.fileExists).length)
        : dossier.uploadedCount,
    });
    if (activeDocForViewer?.bestandsnaam === updatedDoc.bestandsnaam) {
      setActiveDocForViewer(updatedDoc);
    }
  };

  const handleDocumentDeleted = (deletedDocId: string) => {
    if (!dossier) return;
    const remainingDocs = dossier.documents.filter(
      (d) => d.id !== deletedDocId && d.bestandsnaam !== deletedDocId
    );
    setDossier({
      ...dossier,
      documents: remainingDocs,
      documentCount: remainingDocs.length,
      uploadedCount: remainingDocs.filter((d) => d.fileExists).length,
    });
    fetchDossierData();
  };

  const handleQuickUnlinkDoc = async (doc: DossierDocument) => {
    if (!window.confirm(`Weet u zeker dat u '${doc.titel}' wilt ontkoppelen uit dit dossier?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const docIdentifier = doc.id || doc.bestandsnaam;
      const res = await fetch(
        `/api/council/dossiers/${encodeURIComponent(dossierSlug)}/documents/${encodeURIComponent(docIdentifier)}`,
        {
          method: "DELETE",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij ontkoppelen document");

      toast.success("Document ontkoppeld");
      handleDocumentDeleted(docIdentifier);
    } catch (err: any) {
      toast.error(err.message || "Fout bij ontkoppelen document");
    }
  };

  const handleDossierUpdated = (updatedDossier: Dossier) => {
    setDossier(updatedDossier);
    fetchDossierData();
  };

  const handleDossierDeleted = () => {
    onBack();
  };

  const handleDocsAddedOrLinked = (updatedDossier: Dossier) => {
    setDossier(updatedDossier);
    fetchDossierData();
  };

  const handleSubdossierUpdated = (updatedSub: any) => {
    if (!dossier) return;
    const updatedSubs = (dossier.subdossiers || []).map((s) =>
      s.id === updatedSub.id || s.slug === updatedSub.slug ? { ...s, ...updatedSub } : s
    );
    setDossier({
      ...dossier,
      subdossiers: updatedSubs,
    });
    fetchDossierData();
  };

  const handleSubdossierCreated = (updatedDossier: Dossier, createdSub: any) => {
    setDossier(updatedDossier);
    fetchDossierData();
    if (createdSub?.slug) {
      handleSelectSubdossier(createdSub, "documents");
    }
  };

  const handleDocumentsDistributed = (updatedDossier: Dossier) => {
    setDossier(updatedDossier);
    setSelectedTableDocIds(new Set());
    fetchDossierData();
  };

  const handleDeleteSubdossier = async (sub: DossierSubdossier) => {
    if (!dossier) return;
    const isConfirmed = window.confirm(
      `Weet u zeker dat u het subdossier "${sub.title}" wilt verwijderen?\n\nAlle ${sub.documentCount} documenten worden veilig overgezet naar het hoofdonderwerp "${dossier.title}".`
    );
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(
        `/api/council/dossiers/${encodeURIComponent(dossier.slug)}/subdossiers/${encodeURIComponent(sub.slug)}`,
        {
          method: "DELETE",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij verwijderen subdossier");

      toast.success(data.message || "Subdossier succesvol verwijderd");
      if (selectedSubdossier === sub.title || selectedSubdossier === sub.slug) {
        setSelectedSubdossier(null);
      }
      setDossier(data.dossier);
      fetchDossierData();
    } catch (err: any) {
      console.error("Delete subdossier error:", err);
      toast.error(err.message || "Fout bij verwijderen subdossier");
    }
  };

  const handleOpenDistribute = (targetSub?: string, docIds?: string[]) => {
    setDistributeTargetInitial(targetSub);
    setPreselectedDocIdsForDistribute(docIds || Array.from(selectedTableDocIds));
    setIsDistributeModalOpen(true);
  };

  const handleToggleTableDoc = (bestandsnaam: string) => {
    setSelectedTableDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(bestandsnaam)) next.delete(bestandsnaam);
      else next.add(bestandsnaam);
      return next;
    });
  };

  const handleSelectAllTableDocs = (docs: DossierDocument[]) => {
    setSelectedTableDocIds(new Set(docs.map((d) => d.bestandsnaam)));
  };

  const handleClearTableDocSelection = () => {
    setSelectedTableDocIds(new Set());
  };

  // Helper slugify
  const slugify = useCallback(
    (text: string) =>
      (text || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    []
  );

  // Sync initialSubdossierSlug when set or changed from outside
  useEffect(() => {
    if (initialSubdossierSlug) {
      setSelectedSubdossier(initialSubdossierSlug);
    }
  }, [initialSubdossierSlug]);

  // Resolve active subdossier object if selected
  const activeSubdossierObj = useMemo(() => {
    if (!selectedSubdossier || !dossier) return null;
    const target = selectedSubdossier.toLowerCase().trim();
    const targetSlug = slugify(selectedSubdossier);

    const found = (dossier.subdossiers || []).find(
      (s) =>
        s.slug?.toLowerCase() === target ||
        s.slug?.toLowerCase() === targetSlug ||
        s.id?.toLowerCase() === target ||
        s.title.toLowerCase().trim() === target ||
        slugify(s.title) === targetSlug
    );

    if (found) return found;

    // Check if there are any documents mentioning this subdossier
    const matchingDocs = (dossier.documents || []).filter(
      (d) =>
        (d.subdossier && d.subdossier.toLowerCase().trim() === target) ||
        slugify(d.subdossier || "") === targetSlug
    );

    if (matchingDocs.length > 0) {
      return {
        id: targetSlug,
        slug: targetSlug,
        title: selectedSubdossier,
        description: `Zelfstandig subdossier binnen ${dossier.title}`,
        documentCount: matchingDocs.length,
        uploadedCount: matchingDocs.filter((d) => d.fileExists).length,
        dateRange: { start: "", end: "" },
        tags: [dossier.category],
        wijken: Array.from(
          new Set(
            matchingDocs.flatMap((d) =>
              d.wijken || (d.wijk_of_kern ? [d.wijk_of_kern] : [])
            )
          )
        ),
        thumbnail: getSubdossierClientThumbnail(
          selectedSubdossier,
          dossier.title,
          dossier.thumbnail
        ),
      } as DossierSubdossier;
    }

    return null;
  }, [selectedSubdossier, dossier, slugify]);

  const handleSelectSubdossier = (
    sub: DossierSubdossier | string,
    tab: "graph" | "documents" | "timeline" | "wijken" = "graph"
  ) => {
    const subIdentifier = typeof sub === "string" ? sub : sub.slug || sub.title;
    setSelectedSubdossier(subIdentifier);
    setSubdossierInitialTab(tab);

    const url = new URL(window.location.href);
    url.searchParams.set("tab", "dossiers");
    url.searchParams.set("dossier", dossierSlug);
    url.searchParams.set("subdossier", subIdentifier);
    window.history.pushState({}, "", url.toString());
  };

  const handleBackFromSubdossier = () => {
    setSelectedSubdossier(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("subdossier");
    window.history.pushState({}, "", url.toString());
  };

  // All unique wijken across documents in this dossier
  const availableWijken = useMemo(() => {
    if (!dossier?.documents) return [];
    const set = new Set<string>();
    dossier.documents.forEach((d) => {
      if (d.wijken && d.wijken.length > 0) {
        d.wijken.forEach((w) => set.add(w));
      } else if (d.wijk_of_kern) {
        d.wijk_of_kern.split(",").forEach((w) => {
          const clean = w.trim();
          if (clean) set.add(clean);
        });
      }
    });
    return Array.from(set).sort();
  }, [dossier?.documents]);

  // Filtered subdossiers list
  const filteredSubdossiers = useMemo(() => {
    if (!dossier?.subdossiers) return [];
    let list = dossier.subdossiers;

    if (selectedWijkFilter) {
      const wClean = selectedWijkFilter.toLowerCase();
      list = list.filter((s) =>
        s.wijken?.some(
          (w) => w.toLowerCase().includes(wClean) || wClean.includes(w.toLowerCase())
        )
      );
    }

    if (subSearch.trim()) {
      const q = subSearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.tags?.some((t) => t.toLowerCase().includes(q)) ||
          s.wijken?.some((w) => w.toLowerCase().includes(q))
      );
    }
    return list;
  }, [dossier?.subdossiers, selectedWijkFilter, subSearch]);

  // Filtered documents list
  const filteredDocuments = useMemo(() => {
    if (!dossier?.documents) return [];
    let list = dossier.documents;

    if (selectedSubdossier) {
      const target = selectedSubdossier.toLowerCase();
      list = list.filter(
        (d) =>
          (d.subdossier && d.subdossier.toLowerCase() === target) ||
          slugify(d.subdossier || "") === target
      );
    }

    if (selectedWijkFilter) {
      const wClean = selectedWijkFilter.toLowerCase();
      list = list.filter(
        (d) =>
          (d.wijk_of_kern && d.wijk_of_kern.toLowerCase().includes(wClean)) ||
          (d.wijken &&
            d.wijken.some(
              (w) => w.toLowerCase().includes(wClean) || wClean.includes(w.toLowerCase())
            ))
      );
    }

    if (docSearch.trim()) {
      const q = docSearch.toLowerCase();
      list = list.filter(
        (d) =>
          d.titel.toLowerCase().includes(q) ||
          d.bestandsnaam.toLowerCase().includes(q) ||
          d.datum?.toLowerCase().includes(q) ||
          d.subdossier?.toLowerCase().includes(q) ||
          d.entiteiten?.some((e) => e.toLowerCase().includes(q)) ||
          d.relaties?.some((r) => r.toLowerCase().includes(q))
      );
    }
    return list;
  }, [dossier?.documents, selectedSubdossier, selectedWijkFilter, docSearch, slugify]);

  // Chronological timeline sorted newest -> oldest
  const timelineDocuments = useMemo(() => {
    if (!filteredDocuments) return [];
    return [...filteredDocuments].sort((a, b) => {
      const dateA = a.datum ? new Date(a.datum).getTime() : 0;
      const dateB = b.datum ? new Date(b.datum).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredDocuments]);

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

  // Standalone Subdossier Page View
  if (activeSubdossierObj && dossier) {
    return (
      <div id="subdossier-standalone-container" className="space-y-6">
        <SubdossierDetailView
          hoofddossier={dossier}
          subdossier={activeSubdossierObj}
          allDossierDocuments={dossier.documents || []}
          onBackToHoofddossier={handleBackFromSubdossier}
          onBackToOverview={onBack}
          onOpenDocumentViewer={openDocumentViewer}
          onOpenDocumentEditor={openDocumentEditor}
          onOpenAddDocument={(subTitle, mode) => {
            setAddDocInitialMode(mode);
            setIsAddDocOpen(true);
          }}
          onEditSubdossier={(sub) => {
            setActiveSubdossierForEdit(sub);
            setIsEditSubdossierOpen(true);
          }}
          isCouncilOrAdmin={isCouncilOrAdmin}
          user={user}
          favoritesSet={favoritesSet}
          onToggleFavorite={handleToggleFavorite}
          initialTab={subdossierInitialTab}
        />

        {/* Global Modals for Standalone Subdossier View */}
        <DossierDocumentViewer
          document={activeDocForViewer}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          onDocumentUpdated={handleDocumentUpdated}
        />

        <EditDossierModal
          isOpen={isEditDossierOpen}
          dossier={dossier}
          onClose={() => setIsEditDossierOpen(false)}
          onUpdated={handleDossierUpdated}
          onDeleted={handleDossierDeleted}
        />

        <EditDocumentModal
          isOpen={isEditDocOpen}
          dossierSlug={dossierSlug}
          document={activeDocForEdit}
          onClose={() => {
            setIsEditDocOpen(false);
            setActiveDocForEdit(null);
          }}
          onDocumentUpdated={handleDocumentUpdated}
          onDocumentDeleted={handleDocumentDeleted}
        />

        <AddDocumentModal
          isOpen={isAddDocOpen}
          dossier={dossier}
          initialMode={addDocInitialMode}
          onClose={() => setIsAddDocOpen(false)}
          onAdded={handleDocsAddedOrLinked}
        />

        <EditSubdossierModal
          isOpen={isEditSubdossierOpen}
          dossierSlug={dossierSlug}
          hoofddossierTitle={dossier?.title || ""}
          subdossier={activeSubdossierForEdit || activeSubdossierObj}
          onClose={() => {
            setIsEditSubdossierOpen(false);
            setActiveSubdossierForEdit(null);
          }}
          onUpdated={handleSubdossierUpdated}
        />
      </div>
    );
  }

  return (
    <div id="dossier-detail-view" className="space-y-6">
      {/* Top Breadcrumbs & Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        {/* Action button bar */}
        <div className="flex items-center gap-2">
          {isCouncilOrAdmin && (
            <>
              {/* Dossier bewerken button */}
              <Button
                id="btn-edit-dossier"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-semibold h-9 text-accent hover:bg-accent/15 border-accent/30"
                onClick={() => setIsEditDossierOpen(true)}
              >
                <FolderEdit className="w-3.5 h-3.5 mr-1.5" />
                Dossier Bewerken
              </Button>

              {/* Document toevoegen button */}
              <Button
                id="btn-add-doc-header"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-semibold h-9"
                onClick={() => {
                  setAddDocInitialMode("upload");
                  setIsAddDocOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Document Toevoegen
              </Button>

              {/* Stukken in relatie brengen button */}
              <Button
                id="btn-link-docs-header"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-semibold h-9"
                onClick={() => {
                  setAddDocInitialMode("link");
                  setIsAddDocOpen(true);
                }}
              >
                <Link2 className="w-3.5 h-3.5 mr-1.5" />
                Stukken Koppelen
              </Button>
            </>
          )}

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
          <div className="w-full md:w-80 h-52 md:h-auto shrink-0 relative overflow-hidden bg-muted group">
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

            {/* Quick edit thumbnail hover overlay */}
            {isCouncilOrAdmin && (
              <button
                onClick={() => setIsEditDossierOpen(true)}
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center gap-1 font-medium"
                title="Omslag of dossier aanpassen"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Thumbnail wijzigen
              </button>
            )}
          </div>

          {/* Details Content */}
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-accent uppercase tracking-wider">
                    Raadsdossier
                  </span>
                  {dossier.wijkNaam && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {dossier.wijkNaam}
                    </span>
                  )}
                  {dossier.dateRange.start && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {dossier.dateRange.start} {dossier.dateRange.end && `– ${dossier.dateRange.end}`}
                    </span>
                  )}
                </div>

                {isCouncilOrAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditDossierOpen(true)}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <FolderEdit className="w-3.5 h-3.5" />
                    Dossier bewerken
                  </Button>
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
                  <button
                    onClick={() => setIsEditDossierOpen(true)}
                    className="px-2 py-0.5 rounded-lg text-xs text-accent hover:bg-accent/10 transition-colors"
                  >
                    + tags beheren
                  </button>
                </div>
              )}
            </div>

            {/* Metrics bar */}
            <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-6">
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

              {/* Fast action shortcut */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddDocInitialMode("upload");
                    setIsAddDocOpen(true);
                  }}
                  className="rounded-xl text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Stuk toevoegen
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          id="tab-btn-subdossiers"
          onClick={() => setActiveTab("subdossiers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "subdossiers"
              ? "bg-accent/15 text-accent border border-accent/30 shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <FolderTree className="w-4 h-4" />
          Thematische Subdossiers ({dossier.subdossiers?.length || 0})
        </button>

        <button
          id="tab-btn-documents"
          onClick={() => setActiveTab("documents")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "documents"
              ? "bg-accent/15 text-accent border border-accent/30 shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <FileText className="w-4 h-4" />
          Documentenlijst ({filteredDocuments.length}{selectedSubdossier || selectedWijkFilter ? ` / ${dossier.documents.length}` : ""})
        </button>

        <button
          id="tab-btn-overview"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "timeline"
              ? "bg-accent/15 text-accent border border-accent/30 shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Clock className="w-4 h-4" />
          Tijdlijn van Bestanden ({timelineDocuments.length})
        </button>
      </div>

      {/* TAB CONTENT: THEMATISCHE SUBDOSSIERS OVERZICHT MET TEGELS */}
      {activeTab === "subdossiers" && (
        <div className="space-y-6">
          {/* Subdossier Filter & Info Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border border-border p-4 rounded-2xl">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search-subdossiers-input"
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                placeholder="Zoek in subdossiers, onderwerpen of tags..."
                className="pl-9 h-9 text-xs rounded-xl bg-background"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Wijk Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                <select
                  id="select-wijk-subdossier-filter"
                  value={selectedWijkFilter || ""}
                  onChange={(e) => setSelectedWijkFilter(e.target.value || null)}
                  className="bg-transparent text-foreground text-xs focus:outline-hidden cursor-pointer"
                >
                  <option value="">Alle wijken & kernen</option>
                  {availableWijken.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              {(subSearch || selectedWijkFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSubSearch("");
                    setSelectedWijkFilter(null);
                  }}
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Wis filters
                </Button>
              )}

              <span className="text-xs text-muted-foreground">
                {filteredSubdossiers.length} van {dossier.subdossiers?.length || 0} subdossiers
              </span>

              {isCouncilOrAdmin && (
                <div className="flex items-center gap-2 pl-2 border-l border-border">
                  <Button
                    id="btn-distribute-docs-toolbar"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs rounded-xl border-border text-foreground hover:bg-muted font-semibold flex items-center gap-1.5"
                    onClick={() => handleOpenDistribute()}
                    title="Verdeel documenten tussen subdossiers"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-accent" />
                    <span>Documenten Verdelen</span>
                  </Button>

                  <Button
                    id="btn-create-subdossier-toolbar"
                    size="sm"
                    className="h-8 px-3 text-xs rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-semibold flex items-center gap-1.5 shadow-xs"
                    onClick={() => setIsCreateSubdossierOpen(true)}
                    title="Nieuw subdossier aanmaken binnen dit hoofdonderwerp"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nieuw Subdossier</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Subdossiers Tegels Grid */}
          {filteredSubdossiers.length === 0 ? (
            <div className="p-12 text-center bg-card border border-border rounded-2xl">
              <FolderTree className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-foreground mb-1">Geen subdossiers gevonden</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Er zijn geen subdossiers die voldoen aan de huidige zoek- of wijkfilters.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSubSearch("");
                  setSelectedWijkFilter(null);
                }}
                className="rounded-xl text-xs"
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubdossiers.map((sub, idx) => {
                // Find a few documents belonging to this subdossier
                const subDocs = (dossier.documents || []).filter(
                  (d) =>
                    (d.subdossier && d.subdossier.toLowerCase() === sub.title.toLowerCase()) ||
                    slugify(d.subdossier || "") === sub.slug.toLowerCase()
                );

                const subThumbnail =
                  sub.thumbnail ||
                  getSubdossierClientThumbnail(sub.title, dossier?.title, dossier?.thumbnail);

                return (
                  <div
                    key={sub.id || idx}
                    id={`subdossier-card-${sub.slug}`}
                    className="group bg-card border border-border hover:border-accent/50 rounded-2xl overflow-hidden transition-all duration-200 shadow-2xs hover:shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Thumbnail Header Banner */}
                      <div
                        className="relative aspect-[16/9] w-full overflow-hidden bg-muted group/thumb cursor-pointer"
                        onClick={() => handleSelectSubdossier(sub, "graph")}
                        title={`Open zelfstandig subdossier: ${sub.title}`}
                      >
                        <img
                          src={subThumbnail}
                          alt={sub.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                        {/* Badges on thumbnail */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs border border-white/20 flex items-center gap-1">
                            <FolderTree className="w-3 h-3 text-accent" /> Zelfstandig Subdossier
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isCouncilOrAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveSubdossierForEdit(sub);
                                  setIsEditSubdossierOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white backdrop-blur-xs border border-white/20 transition-all hover:text-accent cursor-pointer"
                                title="Subdossier & thumbnail bewerken"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-foreground shadow-xs">
                              {sub.documentCount} {sub.documentCount === 1 ? "stuk" : "stukken"}
                            </span>
                          </div>
                        </div>

                        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-[11px]">
                          {sub.uploadedCount > 0 ? (
                            <span className="font-semibold drop-shadow-xs flex items-center gap-1 text-emerald-400">
                              <FileCheck className="w-3 h-3" />
                              {sub.uploadedCount} live PDF
                            </span>
                          ) : (
                            <span className="font-semibold drop-shadow-xs flex items-center gap-1 text-white/80">
                              <FileText className="w-3 h-3 text-accent" />
                              {sub.documentCount} besluiten
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Content Body */}
                      <div className="p-5 pb-0">
                        {/* Title & Description */}
                        <h4
                          className="text-sm font-bold text-foreground group-hover:text-accent transition-colors mb-1.5 cursor-pointer line-clamp-2"
                          onClick={() => handleSelectSubdossier(sub, "graph")}
                          title={`Open ${sub.title}`}
                        >
                          {sub.title}
                        </h4>

                        {sub.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                            {sub.description}
                          </p>
                        )}

                        {/* Date Range if available */}
                        {(sub.dateRange.start || sub.dateRange.end) && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-3 font-mono">
                            <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span>
                              {sub.dateRange.start || "—"} t/m {sub.dateRange.end || "heden"}
                            </span>
                          </div>
                        )}

                        {/* Wijken chips */}
                        {sub.wijken && sub.wijken.length > 0 && (
                          <div className="mb-3">
                            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
                              Wijken & kernen ({sub.wijken.length})
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {sub.wijken.slice(0, 3).map((w, wi) => (
                                <span
                                  key={wi}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-foreground border border-border/60"
                                >
                                  <MapPin className="w-2.5 h-2.5 text-accent" />
                                  {w}
                                </span>
                              ))}
                              {sub.wijken.length > 3 && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground">
                                  +{sub.wijken.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Top tags */}
                        {sub.tags && sub.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {sub.tags.slice(0, 3).map((t, ti) => (
                              <span
                                key={ti}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Quick Document snippet */}
                        {subDocs.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 mb-1 space-y-1">
                            <div className="text-[10px] font-semibold text-muted-foreground flex items-center justify-between">
                              <span>Recente stukken:</span>
                              <span>{subDocs.length} totaal</span>
                            </div>
                            {subDocs.slice(0, 2).map((sd, sdi) => (
                              <div
                                key={sdi}
                                onClick={() => openDocumentViewer(sd)}
                                className="text-[11px] text-foreground hover:text-accent truncate cursor-pointer flex items-center gap-1.5 transition-colors"
                              >
                                <FileText className="w-3 h-3 text-accent shrink-0" />
                                <span className="truncate">{sd.titel}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Action Buttons */}
                    <div className="p-5 pt-3 border-t border-border flex items-center justify-between gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs rounded-xl flex-1 border-accent/30 text-accent hover:bg-accent/15 font-semibold"
                        onClick={() => handleSelectSubdossier(sub, "documents")}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Bekijk Subdossier ({sub.documentCount})
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs rounded-xl border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/15 font-semibold flex items-center gap-1 cursor-pointer"
                        title="Open direct de interactieve relatiekaart van dit subdossier"
                        onClick={() => handleSelectSubdossier(sub, "graph")}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Relatiekaart</span>
                      </Button>

                      {isCouncilOrAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs rounded-xl text-muted-foreground hover:text-accent"
                            title={`Documenten verdelen naar "${sub.title}"`}
                            onClick={() => handleOpenDistribute(sub.title)}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs rounded-xl text-muted-foreground hover:text-accent"
                            title="Subdossier & thumbnail bewerken"
                            onClick={() => {
                              setActiveSubdossierForEdit(sub);
                              setIsEditSubdossierOpen(true);
                            }}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>

                          {/* Delete option only for non-primary custom subdossiers */}
                          {sub.slug !== dossier.slug && sub.title.toLowerCase() !== dossier.title.toLowerCase() && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Subdossier verwijderen (stukken gaan naar primair)"
                              onClick={() => handleDeleteSubdossier(sub)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 1: INTERACTIVE NETWORK MAP */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Subdossier filter banner on graph */}
          {selectedSubdossier && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-accent/10 border border-accent/30 text-xs">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-accent" />
                <span className="font-semibold text-foreground">
                  Graaf gefilterd op subdossier: <span className="text-accent font-bold">{selectedSubdossier}</span>
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-accent hover:bg-accent/20"
                onClick={() => setSelectedSubdossier(null)}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Toon alle subdossiers
              </Button>
            </div>
          )}

          <DossierNetworkGraph
            nodes={graph.nodes}
            edges={graph.edges}
            documents={dossier.documents}
            onSelectDocument={openDocumentViewer}
            title={dossier.title}
          />

          {/* Quick preview strip of documents */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Documenten in dit dossier ({dossier.documents.length})
                </h4>
                <p className="text-xs text-muted-foreground">
                  Klik op een document om te bekijken, of pas documentgegevens aan
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isCouncilOrAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-8"
                      onClick={() => {
                        setAddDocInitialMode("upload");
                        setIsAddDocOpen(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Nieuw Document
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-8"
                      onClick={() => {
                        setAddDocInitialMode("link");
                        setIsAddDocOpen(true);
                      }}
                    >
                      <Link2 className="w-3.5 h-3.5 mr-1" />
                      Stukken Koppelen
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-accent hover:text-accent/90 h-8"
                  onClick={() => setActiveTab("documents")}
                >
                  Alle ({dossier.documents.length})
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
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
                    <h5
                      className="text-xs font-bold text-foreground line-clamp-2 mb-1 cursor-pointer hover:text-accent"
                      onClick={() => openDocumentViewer(doc)}
                    >
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
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(doc, e)}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                          favoritesSet.has(doc.bestandsnaam.toLowerCase().trim())
                            ? "bg-amber-500/20 text-amber-500"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                        title={
                          favoritesSet.has(doc.bestandsnaam.toLowerCase().trim())
                            ? "Verwijder uit favorieten"
                            : "Vastpinnen als favoriet"
                        }
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
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
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => openDocumentEditor(doc)}
                          title="Document bewerken"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                      )}
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
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: TIJDLIJN VAN BESTANDEN */}
      {activeTab === "timeline" && (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Chronologische Dossiergeschiedenis
              </h4>
              <p className="text-xs text-muted-foreground">
                Van recentste raadsvoorstellen tot de oudste onderliggende stukken
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs h-8"
                onClick={() => {
                  setAddDocInitialMode("upload");
                  setIsAddDocOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Document Toevoegen
              </Button>
            </div>
          </div>

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

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs rounded-lg text-muted-foreground hover:text-foreground"
                        onClick={() => openDocumentEditor(doc)}
                        title="Document bewerken"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        Bewerken
                      </Button>
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

      {/* TAB CONTENT 3: DOCUMENTENLIJST MET BEHEER, OOGJE EN CRUD */}
      {activeTab === "documents" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs space-y-4 p-5">
          {/* Active Filter Banner if filtered */}
          {(selectedSubdossier || selectedWijkFilter) && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-accent/10 border border-accent/30 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-4 h-4 text-accent" />
                <span className="text-muted-foreground">Actieve filters:</span>
                {selectedSubdossier && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-accent text-accent-foreground font-bold">
                    <FolderTree className="w-3 h-3" />
                    {selectedSubdossier}
                    <button
                      onClick={() => setSelectedSubdossier(null)}
                      className="hover:opacity-80 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedWijkFilter && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-background border border-border text-foreground font-bold">
                    <MapPin className="w-3 h-3 text-accent" />
                    {selectedWijkFilter}
                    <button
                      onClick={() => setSelectedWijkFilter(null)}
                      className="hover:opacity-80 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <span className="text-muted-foreground font-medium">
                  ({filteredDocuments.length} van {dossier.documents.length} stukken)
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-accent hover:bg-accent/20"
                onClick={() => {
                  setSelectedSubdossier(null);
                  setSelectedWijkFilter(null);
                }}
              >
                Wis alle filters
              </Button>
            </div>
          )}

          {/* List Search & Action Toolbar Header */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search-dossier-docs"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Filter documenten op titel, datum of bestandsnaam..."
                  className="pl-9 h-9 text-xs rounded-xl bg-background"
                />
              </div>

              {/* Subdossier Selector */}
              {dossier.subdossiers && dossier.subdossiers.length > 0 && (
                <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-muted-foreground">
                  <FolderTree className="w-3.5 h-3.5 text-accent shrink-0" />
                  <select
                    id="select-subdossier-in-docs-table"
                    value={selectedSubdossier || ""}
                    onChange={(e) =>
                      e.target.value
                        ? handleSelectSubdossier(e.target.value, "graph")
                        : setSelectedSubdossier(null)
                    }
                    className="bg-transparent text-foreground text-xs focus:outline-hidden cursor-pointer max-w-[180px] truncate"
                  >
                    <option value="">Alle subdossiers ({dossier.subdossiers.length})</option>
                    {dossier.subdossiers.map((sub) => (
                      <option key={sub.slug} value={sub.title}>
                        {sub.title} ({sub.documentCount})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Wijk Selector */}
              {availableWijken.length > 0 && (
                <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                  <select
                    id="select-wijk-in-docs-table"
                    value={selectedWijkFilter || ""}
                    onChange={(e) => setSelectedWijkFilter(e.target.value || null)}
                    className="bg-transparent text-foreground text-xs focus:outline-hidden cursor-pointer max-w-[160px] truncate"
                  >
                    <option value="">Alle wijken & kernen</option>
                    {availableWijken.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground mr-2">
                {filteredDocuments.length} van {dossier.documents.length} documenten
              </span>

              <Button
                id="btn-add-doc-table"
                size="sm"
                variant="outline"
                className="rounded-xl text-xs font-semibold h-9"
                onClick={() => {
                  setAddDocInitialMode("upload");
                  setIsAddDocOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Nieuw Document
              </Button>

              <Button
                id="btn-link-docs-table"
                size="sm"
                className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl text-xs font-semibold h-9 shadow-xs"
                onClick={() => {
                  setAddDocInitialMode("link");
                  setIsAddDocOpen(true);
                }}
              >
                <Link2 className="w-3.5 h-3.5 mr-1.5" />
                Stukken Koppelen
              </Button>
            </div>
          </div>

          {/* Bulk Selection Action Bar */}
          {selectedTableDocIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-accent/15 border border-accent/40 rounded-xl text-xs">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <CheckSquare className="w-4 h-4 text-accent" />
                <span>{selectedTableDocIds.size} document(en) geselecteerd</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  id="btn-bulk-distribute-selected"
                  size="sm"
                  className="h-8 px-3 text-xs bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl font-semibold shadow-xs flex items-center gap-1.5"
                  onClick={() => handleOpenDistribute(undefined, Array.from(selectedTableDocIds))}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Verdelen naar Subdossier...</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                  onClick={handleClearTableDocSelection}
                >
                  Selectie wissen
                </Button>
              </div>
            </div>
          )}

          {/* Document Table */}
          <div className="rounded-xl border border-border overflow-x-auto bg-background">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredDocuments.length > 0 && filteredDocuments.every((d) => selectedTableDocIds.has(d.bestandsnaam))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSelectAllTableDocs(filteredDocuments);
                        } else {
                          handleClearTableDocSelection();
                        }
                      }}
                      className="rounded border-border text-accent focus:ring-accent w-3.5 h-3.5 cursor-pointer"
                      title="Selecteer alle getoonde documenten"
                    />
                  </th>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4 w-40">Subdossier / Wijk</th>
                  <th className="py-3 px-4 w-28">Datum</th>
                  <th className="py-3 px-4 hidden md:table-cell">Relaties / Entiteiten</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4 w-48 text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Geen documenten gevonden die voldoen aan de filters.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-muted/30 transition-colors ${
                        selectedTableDocIds.has(doc.bestandsnaam) ? "bg-accent/5" : ""
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedTableDocIds.has(doc.bestandsnaam)}
                          onChange={() => handleToggleTableDoc(doc.bestandsnaam)}
                          className="rounded border-border text-accent focus:ring-accent w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2.5">
                          <FileText className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span
                              className="font-bold text-foreground block hover:text-accent cursor-pointer"
                              onClick={() => openDocumentViewer(doc)}
                            >
                              {doc.titel}
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground truncate block">
                              {doc.bestandsnaam}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          {doc.subdossier ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground hover:text-accent cursor-pointer truncate max-w-[180px]"
                              onClick={() => handleSelectSubdossier(doc.subdossier!, "graph")}
                              title={`Open zelfstandig subdossier: ${doc.subdossier}`}
                            >
                              <FolderTree className="w-3 h-3 text-accent shrink-0" />
                              <span className="truncate">{doc.subdossier}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                          {doc.wijk_of_kern && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground cursor-pointer truncate max-w-[180px]"
                              onClick={() => setSelectedWijkFilter(doc.wijk_of_kern || null)}
                              title={`Filter op ${doc.wijk_of_kern}`}
                            >
                              <MapPin className="w-2.5 h-2.5 text-accent shrink-0" />
                              <span className="truncate">{doc.wijk_of_kern}</span>
                            </span>
                          )}
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
                        <div className="inline-flex items-center justify-end gap-1">
                          {/* Favoriet Ster */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavorite(doc, e)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              favoritesSet.has(doc.bestandsnaam.toLowerCase().trim())
                                ? "bg-amber-500/20 text-amber-500"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                            title={
                              favoritesSet.has(doc.bestandsnaam.toLowerCase().trim())
                                ? "Verwijder uit favorieten"
                                : "Vastpinnen als favoriet"
                            }
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                favoritesSet.has(doc.bestandsnaam.toLowerCase().trim())
                                  ? "fill-amber-500 text-amber-500"
                                  : ""
                              }`}
                            />
                          </button>

                          {/* Bekijken Oogje */}
                          <Button
                            id={`btn-table-eye-${idx}`}
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 rounded-lg text-accent hover:bg-accent/15 font-semibold text-xs inline-flex items-center gap-1"
                            onClick={() => openDocumentViewer(doc)}
                            title="Document bekijken in viewer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Bekijk</span>
                          </Button>

                          {/* Bewerken Pen */}
                          {isCouncilOrAdmin && (
                            <>
                              <Button
                                id={`btn-table-distribute-${idx}`}
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 rounded-lg text-muted-foreground hover:text-accent font-semibold text-xs inline-flex items-center gap-1"
                                onClick={() => handleOpenDistribute(undefined, [doc.bestandsnaam])}
                                title="Document toewijzen aan ander subdossier"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </Button>

                              <Button
                                id={`btn-table-edit-${idx}`}
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 rounded-lg text-muted-foreground hover:text-foreground font-semibold text-xs inline-flex items-center gap-1"
                                onClick={() => openDocumentEditor(doc)}
                                title="Document metadata of bestand bewerken"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>

                              {/* Verwijderen / Ontkoppelen */}
                              <Button
                                id={`btn-table-delete-${idx}`}
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 rounded-lg text-muted-foreground hover:text-destructive font-semibold text-xs inline-flex items-center gap-1"
                                onClick={() => handleQuickUnlinkDoc(doc)}
                                title="Document ontkoppelen uit dit dossier"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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

      {/* Dossier Bewerken Modal */}
      <EditDossierModal
        isOpen={isEditDossierOpen}
        dossier={dossier}
        onClose={() => setIsEditDossierOpen(false)}
        onUpdated={handleDossierUpdated}
        onDeleted={handleDossierDeleted}
      />

      {/* Document Bewerken Modal */}
      <EditDocumentModal
        isOpen={isEditDocOpen}
        dossierSlug={dossierSlug}
        document={activeDocForEdit}
        availableSubdossiers={dossier?.subdossiers?.map((s) => ({ slug: s.slug, title: s.title })) || []}
        onClose={() => {
          setIsEditDocOpen(false);
          setActiveDocForEdit(null);
        }}
        onDocumentUpdated={handleDocumentUpdated}
        onDocumentDeleted={handleDocumentDeleted}
      />

      {/* Document Toevoegen & Stukken Koppelen Modal */}
      <AddDocumentModal
        isOpen={isAddDocOpen}
        dossier={dossier}
        initialMode={addDocInitialMode}
        onClose={() => setIsAddDocOpen(false)}
        onAdded={handleDocsAddedOrLinked}
      />

      {/* Subdossier Bewerken & Thumbnail Modal */}
      <EditSubdossierModal
        isOpen={isEditSubdossierOpen}
        dossierSlug={dossierSlug}
        hoofddossierTitle={dossier?.title || ""}
        subdossier={activeSubdossierForEdit}
        onClose={() => {
          setIsEditSubdossierOpen(false);
          setActiveSubdossierForEdit(null);
        }}
        onUpdated={handleSubdossierUpdated}
      />

      {/* Nieuw Subdossier Aanmaken Modal */}
      <CreateSubdossierModal
        isOpen={isCreateSubdossierOpen}
        dossier={dossier}
        onClose={() => setIsCreateSubdossierOpen(false)}
        onCreated={handleSubdossierCreated}
      />

      {/* Documenten Verdelen Tussen Subdossiers Modal */}
      <DistributeDocumentsModal
        isOpen={isDistributeModalOpen}
        dossier={dossier}
        initialTargetSubdossier={distributeTargetInitial}
        preselectedDocIds={preselectedDocIdsForDistribute}
        onClose={() => {
          setIsDistributeModalOpen(false);
          setDistributeTargetInitial(undefined);
          setPreselectedDocIdsForDistribute([]);
        }}
        onDistributed={handleDocumentsDistributed}
      />
    </div>
  );
};

