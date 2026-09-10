import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Navigate, Link, useSearchParams, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { DossierOverview } from "@/components/council/DossierOverview";
import {
  FileText,
  Calendar,
  UserCheck,
  CheckCircle2,
  Circle,
  MessageSquare,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  Shield,
  Eye,
  Trash2,
  Send,
  Sparkles,
  Archive,
  ChevronRight,
  Clock,
  Layers,
  FileCheck,
  AlertCircle,
  Download,
  X,
  Plus,
  RotateCcw,
  AlertTriangle,
  FolderArchive,
  ThumbsUp,
  ThumbsDown,
  Scale,
  BookOpen,
  Building2,
  Waves,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CouncilAgendaTopic,
  CouncilDocument,
  CouncilTopicNote,
  CouncilMeetingScrapeSummary,
} from "@/types/council";
import { SupportDossierPanel } from "@/components/SupportDossierPanel";
import { SecureDocumentViewer } from "@/components/SecureDocumentViewer";
import { TopicStandpuntenSection } from "@/components/council/TopicStandpuntenSection";
import { OverijsselNotubizManager } from "@/components/council/OverijsselNotubizManager";
import { WaterschapManager } from "@/components/council/WaterschapManager";
import { MemberDocument } from "@/types/document";


const PROCEDURAL_KEYWORDS = [
  "opening",
  "sluiting",
  "agenda",
  "spreekrecht",
  "vragen",
  "besluitenlijst",
  "notulen",
  "mededelingen",
  "beediging",
  "beëdiging",
  "installatie",
  "afscheid",
  "toezegging",
  "advies van de commissie",
  "besluit",
  "pauze",
  "schorsing",
  "hervatting",
  "rondvraag",
  "insprekers",
  "onderwerp",
  "vragenhalfuur",
  "vragenhalfuurtje",
  "vragenkwartier",
];

const SECTION_HEADER_PATTERNS = [
  "oordeelvorming - hamerstukken",
  "oordeelvorming - bespreekstukken",
  "beeldvorming - bespreekstukken",
  "beeldvorming - hamerstukken",
  "besluitvorming - hamerstukken",
  "besluitvorming - bespreekstukken",
  "hamerstukken",
  "bespreekstukken",
  "politieke markt",
  "raadsvergadering",
  "gemeenteraad",
  "raadsbijeenkomst",
  "presidium",
  "commissie",
  "informatief",
  "informatieve bijeenkomst",
  "algemeen",
];

function isSectionHeader(rawTitle: string): boolean {
  if (!rawTitle) return true;
  const clean = rawTitle.toLowerCase().replace(/^\d+[.\s-]+/, "").replace(/\s+/g, " ").trim();
  return SECTION_HEADER_PATTERNS.some((h) => clean === h || clean.startsWith(h));
}

function isProceduralTopic(rawTitle: string): boolean {
  if (!rawTitle) return true;
  const clean = rawTitle.toLowerCase().replace(/^\d+[.\s-]+/, "").replace(/\s+/g, " ").trim();
  return PROCEDURAL_KEYWORDS.some((k) => clean.includes(k));
}

function isRawDocumentFileName(rawTitle: string): boolean {
  if (!rawTitle) return true;
  const clean = rawTitle.toLowerCase().trim();
  if (/\d+\s*(kb|mb|gb)$/i.test(clean)) return true;
  if (/\.(pdf|docx|xlsx)$/i.test(clean)) return true;
  if (clean.includes("- raadsvoorstel") || clean.includes("- besluitenlijst") || clean.includes("- adviesnota")) return true;
  if (/^zienswijze\s+\d+/i.test(clean) || /^nieuw\s*-\s*/i.test(clean) || /^bijlage\s+\d+/i.test(clean)) return true;
  return false;
}

function isInvalidOrJunkTopic(rawTitle: string): boolean {
  if (!rawTitle) return true;
  const tLower = rawTitle.toLowerCase().trim();
  if (tLower.startsWith("http://") || tLower.startsWith("https://")) return true;
  if (tLower.includes("de voorzitter sluit") || tLower.includes("de voorzitter opent") || tLower.includes("de voorzitter vermeld") || tLower.includes("zegt toe") || tLower.includes("toezegging")) {
    return true;
  }
  const JUNK = [
    "welkom",
    "vergaderingen",
    "overzichten",
    "wie is wie",
    "uw invloed",
    "veel gestelde vragen",
    "de griffie",
    "ibabs vergadermanagement",
    "bijlagen",
    "inloggen",
    "cookie",
    "cookies",
    "zoek",
    "zoeken",
    "privacy",
    "contact",
  ];
  if (JUNK.includes(tLower)) return true;
  if (/^(dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|maandag)\s+\d{1,2}\s+[a-z]+\s+\d{4}$/i.test(rawTitle)) return true;
  if (isSectionHeader(rawTitle)) return true;
  if (isProceduralTopic(rawTitle)) return true;
  if (isRawDocumentFileName(rawTitle)) return true;
  return false;
}

export default function Raadspaneel() {
  const { user, token, isAuthenticated } = useAuth();
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const isCouncilOrAdmin = Boolean(
    user && (user.role === "admin" || user.role === "raadslid" || user.role === "fractielid")
  );

  const initialDossierSlug = slug || searchParams.get("dossier") || null;
  const tabParam = searchParams.get("tab");
  const activePanelTab: "dossiers" | "agenda" | "overijssel" | "waterschap" =
    tabParam === "waterschap"
      ? "waterschap"
      : tabParam === "overijssel"
      ? "overijssel"
      : tabParam === "agenda" && isCouncilOrAdmin
      ? "agenda"
      : "dossiers";

  const setActivePanelTab = (tab: "dossiers" | "agenda" | "overijssel" | "waterschap") => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      const currentTopic = searchParams.get("topic") || localStorage.getItem("lva_last_selected_topic_id");
      if (tab === "agenda" && currentTopic) {
        next.set("topic", currentTopic);
      }
      return next;
    });
  };

  const [topics, setTopics] = useState<CouncilAgendaTopic[]>([]);
  const [summary, setSummary] = useState<CouncilMeetingScrapeSummary | null>(null);
  const [councilMembers, setCouncilMembers] = useState<{ id: string; username: string; fullName: string; role?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [isDiffChecking, setIsDiffChecking] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("oordeelvorming"); // "all" | "oordeelvorming" | "mine" | "unassigned" | "archived"
  const [meetingDateFilter, setMeetingDateFilter] = useState<string>("all");
  const [standpuntFilter, setStandpuntFilter] = useState<"all" | "negatief" | "positief" | "genuanceerd">("all");

  // Summary statistics for party standpoints across active topics
  const standpuntStats = useMemo(() => {
    let negatief = 0;
    let positief = 0;
    let genuanceerd = 0;
    topics.forEach((t) => {
      if (t.isArchived) return;
      if ((t.standpuntSummary?.negatiefCount || 0) > 0 || (t.matchedStandpunten && t.matchedStandpunten.some((m) => m.stance === "negatief"))) {
        negatief++;
      }
      if ((t.standpuntSummary?.positiefCount || 0) > 0 || (t.matchedStandpunten && t.matchedStandpunten.some((m) => m.stance === "positief"))) {
        positief++;
      }
      if ((t.standpuntSummary?.genuanceerdCount || 0) > 0 || (t.matchedStandpunten && t.matchedStandpunten.some((m) => m.stance === "genuanceerd"))) {
        genuanceerd++;
      }
    });
    return { negatief, positief, genuanceerd };
  }, [topics]);

  // Document modal viewer
  const [activeDoc, setActiveDoc] = useState<{ doc: CouncilDocument; topic: CouncilAgendaTopic } | null>(null);
  const [modalNoteText, setModalNoteText] = useState("");
  const [submittingModalNote, setSubmittingModalNote] = useState(false);
  const [showModalNotes, setShowModalNotes] = useState(true);

  // Contributions state (Politieke Markt & Raadsvergadering)
  const [isPolitiekeMarktModalOpen, setIsPolitiekeMarktModalOpen] = useState(false);
  const [politiekeMarktText, setPolitiekeMarktText] = useState("");
  const [isRaadsvergaderingModalOpen, setIsRaadsvergaderingModalOpen] = useState(false);
  const [raadsvergaderingText, setRaadsvergaderingText] = useState("");
  const [isSavingContribution, setIsSavingContribution] = useState(false);

  // Active topic for note dialog or details - persisted in URL param and localStorage
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(() => {
    try {
      const fromUrl = searchParams.get("topic");
      if (fromUrl) return fromUrl;
      const fromStorage = localStorage.getItem("lva_last_selected_topic_id");
      if (fromStorage) return fromStorage;
    } catch (_e) {
      // ignore
    }
    return null;
  });

  const handleSelectTopic = useCallback((topicId: string) => {
    setSelectedTopicId(topicId);
    try {
      localStorage.setItem("lva_last_selected_topic_id", topicId);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("topic", topicId);
        return next;
      });
    } catch (_e) {
      // ignore
    }
  }, [setSearchParams]);

  const [newNoteText, setNewNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteTargetDocId, setNoteTargetDocId] = useState<string | null>(null);

  // Secure Document Viewer for click-to-verify
  const [secureViewerDoc, setSecureViewerDoc] = useState<MemberDocument | null>(null);
  const [secureViewerPage, setSecureViewerPage] = useState<number>(1);


  // Safe JSON parser for API responses to prevent HTML syntax errors
  const parseApiResponse = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (_err) {
      if (res.status === 504 || res.status === 502) {
        throw new Error("De externe gemeenteserver reageerde te traag (timeout). Probeer het over een momentje nogmaals.");
      }
      throw new Error(`Serverfout (${res.status}): ${text.slice(0, 100)}`);
    }
  };

  const fetchCouncilData = useCallback(async (quiet = false) => {
    if (!token) return;
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/council/topics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        throw new Error(data.error || "Kon raadsstukken niet ophalen");
      }
      setTopics(data.topics || []);
      setSummary(data.summary || null);
      setCouncilMembers(data.councilMembers || []);
      
      // Auto-select topic: preserve current selection, preferred URL/storage, or fallback to first bespreekstuk
      if (data.topics && data.topics.length > 0) {
        const preferredId = selectedTopicId || searchParams.get("topic") || localStorage.getItem("lva_last_selected_topic_id");
        const foundPreferred = preferredId ? data.topics.find((t: CouncilAgendaTopic) => t.id === preferredId) : null;

        if (foundPreferred) {
          setSelectedTopicId(foundPreferred.id);
        } else if (!selectedTopicId || !data.topics.some((t: CouncilAgendaTopic) => t.id === selectedTopicId)) {
          const firstBespreek = data.topics.find((t: CouncilAgendaTopic) => !t.isArchived && t.category.includes("Oordeelvorming"));
          const fallback = firstBespreek ? firstBespreek.id : data.topics[0].id;
          setSelectedTopicId(fallback);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (!quiet) toast.error(err.message || "Fout bij inladen");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [token, selectedTopicId, searchParams]);

  useEffect(() => {
    if (isAuthenticated && isCouncilOrAdmin) {
      fetchCouncilData();
    }
  }, [isAuthenticated, isCouncilOrAdmin, fetchCouncilData]);

  // Trigger manual scrape
  const handleTriggerScrape = async () => {
    if (!token) return;
    setIsScraping(true);
    try {
      const res = await fetch("/api/council/scrape-now", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || "Scrapen mislukt");
      toast.success(data.message || "Agenda's en documenten succesvol gescraped!");
      await fetchCouncilData(true);
    } catch (err: any) {
      toast.error(err.message || "Fout bij scrapen");
    } finally {
      setIsScraping(false);
    }
  };

  // Trigger manual diff-check (Watchdog)
  const handleDiffCheckNow = async () => {
    if (!token) return;
    setIsDiffChecking(true);
    try {
      const res = await fetch("/api/council/diff-check-now", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || "Diff-check mislukt");

      if (data.topicsWithDumpsCount > 0) {
        toast.warning("Update(s) gedetecteerd!", {
          description: data.message,
        });
        setCategoryFilter("dumps");
      } else {
        toast.success("iBabs Watchdog: Up-to-date", {
          description: data.message,
        });
      }
      if (data.topics) setTopics(data.topics);
      if (data.summary) setSummary(data.summary);
    } catch (err: any) {
      toast.error(err.message || "Fout bij diff-check");
    } finally {
      setIsDiffChecking(false);
    }
  };

  // Dismiss diff alerts on a specific topic
  const handleDismissTopicDiff = async (topicId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/council/topics/${encodeURIComponent(topicId)}/dismiss-diff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await parseApiResponse(res);
      if (res.ok && data.topic) {
        setTopics((prev) => prev.map((t) => (t.id === topicId ? data.topic : t)));
        toast.success("Melding gemarkeerd als gecontroleerd");
      }
    } catch (err: any) {
      toast.error("Kon melding niet markeren");
    }
  };

  // Dismiss all diff alerts across all topics
  const handleDismissAllDiffs = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/council/dismiss-all-diffs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await parseApiResponse(res);
      if (res.ok) {
        toast.success(`${data.updatedCount || 0} melding(en) gemarkeerd als gecontroleerd`);
        if (data.topics) setTopics(data.topics);
      }
    } catch (err: any) {
      toast.error("Kon meldingen niet wissen");
    }
  };

  // Clear unassigned topics handler (preserves assigned topics and notes)
  const handleClearUnassigned = async () => {
    if (!token) return;
    setIsClearing(true);
    try {
      const res = await fetch("/api/council/clear-unassigned", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || "Wissen mislukt");
      
      toast.success(data.message || "Onverdeelde stukken succesvol gewist!");
      setTopics(data.topics || []);
      setSummary(data.summary || null);
      setShowClearConfirm(false);
    } catch (err: any) {
      toast.error(err.message || "Fout bij wissen");
    } finally {
      setIsClearing(false);
    }
  };

  // Assign topic handler
  const handleAssignTopic = async (topicId: string, assignedTo: string) => {
    if (!token) return;
    try {
      const value = assignedTo === "none" ? null : assignedTo;
      const res = await fetch(`/api/council/topics/${topicId}/assign`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assignedTo: value }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || "Kon toewijzing niet aanpassen");
      
      setTopics((prev) => prev.map((t) => (t.id === topicId ? data.topic : t)));
      toast.success(data.message || "Toewijzing bijgewerkt");
    } catch (err: any) {
      toast.error(err.message || "Fout bij toewijzen");
    }
  };

  // Save Politieke Markt contribution / Mark as hamerstuk
  const handleSavePolitiekeMarkt = async (topicId: string, markAsHamerstuk?: boolean) => {
    if (!token) return;
    setIsSavingContribution(true);
    try {
      const res = await fetch(`/api/council/topics/${topicId}/contributions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bijdragePolitiekeMarkt: politiekeMarktText,
          markAsHamerstuk: markAsHamerstuk,
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || "Kon bijdrage niet opslaan");

      setTopics((prev) => prev.map((t) => (t.id === topicId ? data.topic : t)));
      setIsPolitiekeMarktModalOpen(false);
      toast.success(
        markAsHamerstuk
          ? "Bijdrage opgeslagen en gemarkeerd als afgehandeld hamerstuk!"
          : "Bijdrage Politieke Markt succesvol opgeslagen!"
      );
    } catch (err: any) {
      toast.error(err.message || "Fout bij opslaan");
    } finally {
      setIsSavingContribution(false);
    }
  };

  // Save Raadsvergadering contribution
  const handleSaveRaadsvergadering = async (topicId: string) => {
    if (!token) return;
    setIsSavingContribution(true);
    try {
      const res = await fetch(`/api/council/topics/${topicId}/contributions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bijdrageRaadsvergadering: raadsvergaderingText,
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || "Kon bijdrage niet opslaan");

      setTopics((prev) => prev.map((t) => (t.id === topicId ? data.topic : t)));
      setIsRaadsvergaderingModalOpen(false);
      toast.success("Bijdrage Raadsvergadering succesvol opgeslagen!");
    } catch (err: any) {
      toast.error(err.message || "Fout bij opslaan");
    } finally {
      setIsSavingContribution(false);
    }
  };

  const handleDirectSaveContribution = async (topicId: string, payload: { bijdragePolitiekeMarkt?: string; bijdrageRaadsvergadering?: string }) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/council/topics/${topicId}/contributions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse(res);
      if (res.ok && data.topic) {
        setTopics((prev) => prev.map((t) => (t.id === topicId ? data.topic : t)));
        toast.success("Inbreng bijgewerkt met klemzet-vraag.");
      }
    } catch (e) {
      console.warn("Kon bijdrage niet direct opslaan:", e);
    }
  };

  // Mark document as viewed toggle

  const handleToggleDocViewed = async (topicId: string, docId: string, isCurrentlyViewed: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/council/topics/${topicId}/documents/${docId}/view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ toggleOff: isCurrentlyViewed }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || "Kon bekeken-status niet updaten");

      setTopics((prev) => prev.map((t) => (t.id === topicId ? data.topic : t)));
      toast.success(isCurrentlyViewed ? "Gemarkeerd als ongelezen" : "Gemarkeerd als gelezen/bekeken!");
    } catch (err: any) {
      toast.error(err.message || "Fout bij markeren");
    }
  };

  // Add note handler
  const handleAddNote = async (topicId: string) => {
    if (!token || !newNoteText.trim()) return;
    setSubmittingNote(true);
    try {
      let docTitle: string | undefined;
      if (noteTargetDocId) {
        const topic = topics.find((t) => t.id === topicId);
        const doc = topic?.documents.find((d) => d.id === noteTargetDocId);
        docTitle = doc?.title;
      }

      const res = await fetch(`/api/council/topics/${topicId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          note: newNoteText.trim(),
          documentId: noteTargetDocId || null,
          documentTitle: docTitle || null,
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || "Kon notitie niet opslaan");

      setTopics((prev) => prev.map((t) => (t.id === topicId ? data.topic : t)));
      setNewNoteText("");
      setNoteTargetDocId(null);
      toast.success("Notitie succesvol toegevoegd!");
    } catch (err: any) {
      toast.error(err.message || "Fout bij notitie toevoegen");
    } finally {
      setSubmittingNote(false);
    }
  };

  // Add modal note handler
  const handleAddModalNote = async () => {
    if (!activeDoc || !modalNoteText.trim() || !token) return;
    setSubmittingModalNote(true);
    try {
      const res = await fetch(`/api/council/topics/${activeDoc.topic.id}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          note: modalNoteText.trim(),
          documentId: activeDoc.doc.id,
          documentTitle: activeDoc.doc.title,
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || "Kon opmerking niet opslaan");

      setTopics((prev) => prev.map((t) => (t.id === activeDoc.topic.id ? data.topic : t)));
      setActiveDoc((prev) => (prev ? { ...prev, topic: data.topic } : null));
      setModalNoteText("");
      toast.success("Opmerking bij dit document geplaatst!");
    } catch (err: any) {
      toast.error(err.message || "Fout bij opmerking plaatsen");
    } finally {
      setSubmittingModalNote(false);
    }
  };

  // Delete note handler
  const handleDeleteNote = async (topicId: string, noteId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/council/topics/${topicId}/notes/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || "Kon notitie niet verwijderen");

      setTopics((prev) => prev.map((t) => (t.id === topicId ? data.topic : t)));
      toast.success("Notitie verwijderd");
    } catch (err: any) {
      toast.error(err.message || "Fout bij verwijderen");
    }
  };

  // Distinct meeting dates for filter dropdown
  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    topics.forEach((t) => {
      if (t.meetingDate && !isInvalidOrJunkTopic(t.title)) set.add(t.meetingDate);
    });
    return Array.from(set).sort();
  }, [topics]);

  // Topics with dumps or new documents since compilation
  const topicsWithDumps = useMemo(() => {
    return topics.filter(
      (t) => !isInvalidOrJunkTopic(t.title) && (t.hasRecentDump || t.hasDocumentDiff || t.hasNewDocumentsSinceCompile)
    );
  }, [topics]);

  // Filtered topics (excluding procedural items & section headers)
  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      // Exclude procedural items & headers
      if (isInvalidOrJunkTopic(t.title)) {
        return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = (t.description || "").toLowerCase().includes(q);
        const matchMeeting = t.meetingTitle.toLowerCase().includes(q);
        const matchAssigned = (t.assignedName || t.assignedTo || "").toLowerCase().includes(q);
        const matchDocs = t.documents.some((d) => d.title.toLowerCase().includes(q));
        const matchNotes = t.notes.some((n) => n.note.toLowerCase().includes(q));
        const matchStandpunten = (t.matchedStandpunten || []).some(
          (m) =>
            m.standpuntTitel.toLowerCase().includes(q) ||
            m.explanation.toLowerCase().includes(q) ||
            m.hoofdstukTitel.toLowerCase().includes(q) ||
            (m.matchedKeywords || []).some((kw) => kw.toLowerCase().includes(q))
        );
        if (!matchTitle && !matchDesc && !matchMeeting && !matchAssigned && !matchDocs && !matchNotes && !matchStandpunten) {
          return false;
        }
      }

      // Standpunt Stance filter
      if (standpuntFilter === "negatief") {
        const hasNeg =
          (t.standpuntSummary?.negatiefCount || 0) > 0 ||
          (t.matchedStandpunten && t.matchedStandpunten.some((m) => m.stance === "negatief"));
        if (!hasNeg) return false;
      } else if (standpuntFilter === "positief") {
        const hasPos =
          (t.standpuntSummary?.positiefCount || 0) > 0 ||
          (t.matchedStandpunten && t.matchedStandpunten.some((m) => m.stance === "positief"));
        if (!hasPos) return false;
      } else if (standpuntFilter === "genuanceerd") {
        const hasNuanced =
          (t.standpuntSummary?.genuanceerdCount || 0) > 0 ||
          (t.matchedStandpunten && t.matchedStandpunten.some((m) => m.stance === "genuanceerd"));
        if (!hasNuanced) return false;
      }

      // Date filter
      if (meetingDateFilter !== "all" && t.meetingDate !== meetingDateFilter) {
        return false;
      }

      // Category tab filter
      if (categoryFilter === "dumps") {
        return !t.isArchived && (t.hasRecentDump || t.hasDocumentDiff || t.hasNewDocumentsSinceCompile);
      }
      if (categoryFilter === "oordeelvorming") {
        return !t.isArchived && t.category === "Oordeelvorming - bespreekstukken";
      }
      if (categoryFilter === "mine") {
        return !t.isArchived && t.assignedTo === user?.username;
      }
      if (categoryFilter === "unassigned") {
        return !t.isArchived && !t.assignedTo;
      }
      if (categoryFilter === "archived") {
        return t.isArchived;
      }
      if (categoryFilter === "all_active") {
        return !t.isArchived;
      }

      return true;
    });
  }, [topics, searchQuery, categoryFilter, meetingDateFilter, standpuntFilter, user?.username]);

  // Active selected topic
  const selectedTopic = useMemo(() => {
    return topics.find((t) => t.id === selectedTopicId) || filteredTopics[0] || null;
  }, [topics, selectedTopicId, filteredTopics]);

  return (
    <div className="pt-28 pb-24 min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        
        {/* Top Banner & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-border/80 pb-6 animate-fade-up">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-accent/20 text-accent border border-accent/40 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                {isCouncilOrAdmin ? "Interne Fractietool" : "Openbare Raadsinformatie"}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-accent" />
                Gemeenteraad Steenwijkerland
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display text-primary font-bold">
              {isCouncilOrAdmin ? "Raadspaneel Steenwijkerland" : "Gemeentelijke Dossiers & Raadsstukken"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {isCouncilOrAdmin
                ? "Vergaderstukken, bespreekstukken en voorbereiding voor de gemeenteraadsfractie. Verdeel onderwerpen onder fractieleden, markeer gelezen documenten en deel interne notities."
                : "Openbaar inzicht in alle gemeentelijke beleidsdossiers, raadsstukken en besluitvorming van Steenwijkerland en haar wijken en kernen."}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isCouncilOrAdmin && (
              <>
                <Button
                  onClick={handleClearUnassigned}
                  disabled={isClearing || isScraping}
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 text-xs font-semibold h-9 rounded-xl shadow-xs"
                  title="Wis alle binnengehaalde onverdeelde stukken en behoud toegewezen stukken"
                >
                  <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isClearing ? "animate-spin" : ""}`} />
                  {isClearing ? "Wissen..." : "Onverdeelde Stukken Wissen"}
                </Button>
                <Button
                  onClick={handleDiffCheckNow}
                  disabled={isDiffChecking || isScraping}
                  variant="outline"
                  className={`text-xs font-semibold h-9 rounded-xl shadow-xs ${
                    topicsWithDumps.length > 0
                      ? "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20"
                      : "border-sky-500/40 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
                  }`}
                  title="Controleer iBabs direct op nieuwe documenten of 'vrijdagmiddag-dumps'"
                >
                  <Search className={`w-3.5 h-3.5 mr-1.5 ${isDiffChecking ? "animate-spin" : ""}`} />
                  {isDiffChecking ? "Controleren..." : "iBabs Diff-Check"}
                  {topicsWithDumps.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                      {topicsWithDumps.length}
                    </span>
                  )}
                </Button>
                <Button
                  onClick={handleTriggerScrape}
                  disabled={isScraping || isClearing || isDiffChecking}
                  variant="outline"
                  className="border-accent/40 text-accent hover:bg-accent/15 text-xs font-semibold h-9 rounded-xl shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isScraping ? "animate-spin" : ""}`} />
                  {isScraping ? "Scrapen..." : "Vergaderstukken Nu Ophalen"}
                </Button>
              </>
            )}
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="ghost" className="text-xs h-9 text-muted-foreground hover:text-foreground">
                  Mijn Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="outline" className="text-xs h-9 border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground">
                  Inloggen als Raadslid
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Raadspaneel Main Modules Tab Navigation */}
        <div className="flex items-center gap-2.5 mb-8 border-b border-border pb-3 overflow-x-auto">
          <button
            id="tab-btn-panel-dossiers"
            onClick={() => setActivePanelTab("dossiers")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activePanelTab === "dossiers"
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card border border-border/70"
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            Dossiers & Raadsstukken Archief
          </button>

          {isCouncilOrAdmin && (
            <button
              id="tab-btn-panel-agenda"
              onClick={() => setActivePanelTab("agenda")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                activePanelTab === "agenda"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-card border border-border/70"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Vergaderagenda & Bespreekstukken
            </button>
          )}

          <button
            id="tab-btn-panel-overijssel"
            onClick={() => setActivePanelTab("overijssel")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activePanelTab === "overijssel"
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card border border-border/70"
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Provincie Overijssel
          </button>

          <button
            id="tab-btn-panel-waterschap"
            onClick={() => setActivePanelTab("waterschap")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activePanelTab === "waterschap"
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card border border-border/70"
            }`}
          >
            <Waves className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Waterschap Drents Overijsselse Delta
          </button>
        </div>

        {activePanelTab === "dossiers" ? (
          <DossierOverview initialDossierSlug={initialDossierSlug} />
        ) : activePanelTab === "waterschap" ? (
          <WaterschapManager token={token || undefined} />
        ) : activePanelTab === "overijssel" ? (
          <OverijsselNotubizManager token={token || undefined} />
        ) : isCouncilOrAdmin ? (
          <>
            {/* 🚨 VRIJDAGMIDDAG-DUMP ALERT BANNER */}
            {topicsWithDumps.length > 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 dark:bg-rose-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in shadow-xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span className="text-rose-700 dark:text-rose-400">
                        🚨 {topicsWithDumps.length} Agendapunt{topicsWithDumps.length > 1 ? "en" : ""} met 'Vrijdagmiddag-dump' of document-update!
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-3xl">
                      Het college heeft recent een Nota van Inlichtingen, gewijzigd raadsvoorstel of financiële bijlage aan iBabs toegevoegd. Controleer de stukken om te voorkomen dat u in de raadszaal verrast wordt met nieuwere stukken.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCategoryFilter("dumps")}
                    className="h-8 text-xs font-bold border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25 rounded-xl"
                  >
                    Bekijk Gewijzigde Stukken ({topicsWithDumps.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismissAllDiffs}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                  >
                    Alles Markeren
                  </Button>
                </div>
              </div>
            )}

            {/* Watchdog Status & Polling Bar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-muted/40 border border-border/80 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-semibold text-foreground">iBabs Watchdog Diff-Checker:</span>
                <span>
                  {summary?.activePollingIntervalMinutes
                    ? `Actief (Controleert elke ${summary.activePollingIntervalMinutes} minuten ivm vergaderritme)`
                    : "Actief (Dagelijks + elk uur binnen 24u voor debat)"}
                </span>
              </div>
              {summary?.lastDiffCheckAt && (
                <div className="text-[11px] text-muted-foreground">
                  Laatste controle: {new Date(summary.lastDiffCheckAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                  {summary.nextExpectedCheckAt && (
                    <span className="ml-1.5 opacity-80">
                      • Volgende: {new Date(summary.nextExpectedCheckAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* KPI / Status Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold">Bespreekstukken</span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {topics.filter((t) => !isInvalidOrJunkTopic(t.title) && t.category === "Oordeelvorming - bespreekstukken" && !t.isArchived).length}
            </div>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Oordeelsvorming
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold">Aan Mij Toegewezen</span>
              <UserCheck className="w-4 h-4 text-accent" />
            </div>
            <div className="text-2xl font-bold text-accent">
              {topics.filter((t) => !isInvalidOrJunkTopic(t.title) && !t.isArchived && t.assignedTo === user?.username).length}
            </div>
            <span className="text-[11px] text-muted-foreground">
              Jouw agendapunten
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold">Nog Onverdeeld</span>
              <Layers className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {topics.filter((t) => !isInvalidOrJunkTopic(t.title) && !t.isArchived && !t.assignedTo).length}
            </div>
            <span className="text-[11px] text-muted-foreground">
              Kies een fractielid
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold">Gearchiveerd</span>
              <Archive className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {topics.filter((t) => !isInvalidOrJunkTopic(t.title) && t.isArchived).length}
            </div>
            <span className="text-[11px] text-muted-foreground">
              &gt; 7 dagen na vergadering
            </span>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm mb-6 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zoek op onderwerp, raadsvoorstel, fractielid of notities..."
                className="pl-9 text-xs h-9 rounded-xl bg-background"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date filter dropdown */}
            <div className="w-full md:w-56 shrink-0">
              <Select value={meetingDateFilter} onValueChange={setMeetingDateFilter}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-accent" />
                  <SelectValue placeholder="Filter op vergaderdatum" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">Alle vergaderingen</SelectItem>
                  {uniqueDates.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/50 text-xs">
            {[
              { id: "oordeelvorming", label: "Oordeelvorming - Bespreekstukken", icon: AlertCircle },
              {
                id: "dumps",
                label: `🚨 Dumps / Gewijzigd (${topicsWithDumps.length})`,
                icon: AlertTriangle,
                highlight: topicsWithDumps.length > 0,
              },
              { id: "mine", label: "Aan Mij Toegewezen", icon: UserCheck },
              { id: "unassigned", label: "Onverdeeld", icon: Layers },
              { id: "all_active", label: "Alle Actieve Punten", icon: FileCheck },
              { id: "archived", label: "Archief (> 7 dagen)", icon: Archive },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all ${
                    isActive
                      ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                      : tab.highlight
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/40 hover:bg-rose-500/25 font-bold animate-pulse"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Standpunten Partijprogramma Filter Row */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/40 text-xs flex-wrap">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-accent" />
              <span>Standpunten:</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setStandpuntFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  standpuntFilter === "all"
                    ? "bg-foreground text-background font-semibold shadow-2xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Alle ({topics.filter((t) => !t.isArchived).length})
              </button>

              <button
                type="button"
                onClick={() => setStandpuntFilter("negatief")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  standpuntFilter === "negatief"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20"
                }`}
                title="Toon onderwerpen waar Lijst van Andel kritisch of negatief tegenover staat"
              >
                <ThumbsDown className="w-3 h-3" />
                <span>Kritisch / Negatief ({standpuntStats.negatief})</span>
              </button>

              <button
                type="button"
                onClick={() => setStandpuntFilter("positief")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  standpuntFilter === "positief"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                }`}
                title="Toon onderwerpen waar Lijst van Andel positief of ondersteunend tegenover staat"
              >
                <ThumbsUp className="w-3 h-3" />
                <span>Positief / Voor ({standpuntStats.positief})</span>
              </button>

              <button
                type="button"
                onClick={() => setStandpuntFilter("genuanceerd")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  standpuntFilter === "genuanceerd"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                }`}
                title="Toon onderwerpen met een genuanceerd of gemengd standpunt"
              >
                <Scale className="w-3 h-3" />
                <span>Genuanceerd ({standpuntStats.genuanceerd})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main 2-Column Interface: Left List, Right Detail & Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Agenda List (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
              <span>Gevonden onderwerpen ({filteredTopics.length})</span>
              <span>Klik om stukken in te zien</span>
            </div>

            {loading ? (
              <div className="p-12 text-center bg-card rounded-2xl border border-border">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-accent mb-2" />
                <p className="text-xs text-muted-foreground">Vergaderstukken inladen...</p>
              </div>
            ) : filteredTopics.length === 0 ? (
              <div className="p-12 text-center bg-card rounded-2xl border border-dashed border-border space-y-3">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
                <h3 className="font-display text-base text-foreground font-semibold">Geen onderwerpen gevonden</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Er zijn geen agendapunten gevonden voor deze selectie. Klik op 'Vergaderstukken Nu Ophalen' om de meest actuele raadsagenda te scrapen.
                </p>
                <Button onClick={handleTriggerScrape} size="sm" variant="outline" className="text-xs">
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Nu Scrapen
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
                {filteredTopics.map((topic) => {
                  const isSelected = selectedTopic?.id === topic.id;
                  const isBespreek = topic.category === "Oordeelvorming - bespreekstukken";
                  const totalDocs = topic.documents.length;
                  const viewedDocsCount = topic.documents.filter((d) =>
                    d.viewedBy?.some((v) => v.username === user?.username)
                  ).length;
                  const isFullyViewed = totalDocs > 0 && viewedDocsCount === totalDocs;

                  return (
                    <div
                      key={topic.id}
                      onClick={() => handleSelectTopic(topic.id)}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 relative group ${
                        isSelected
                          ? "bg-accent/10 border-accent shadow-sm ring-1 ring-accent"
                          : "bg-card hover:bg-muted/40 border-border"
                      }`}
                    >
                      {/* Top labels */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {topic.hasRecentDump ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40 flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                              Vrijdagmiddag-dump!
                            </span>
                          ) : topic.hasDocumentDiff ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-500" />
                              Nieuwe Stukken
                            </span>
                          ) : null}
                          {topic.hasNewDocumentsSinceCompile && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 flex items-center gap-1">
                              Update na compilatie
                            </span>
                          )}
                          {isBespreek ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              Bespreekstuk
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground">
                              {topic.category}
                            </span>
                          )}
                          {topic.isArchived && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted/80 text-muted-foreground">
                              Archief
                            </span>
                          )}
                          {topic.compiledDossier && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent/15 text-accent border border-accent/30 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              Dossier
                            </span>
                          )}

                        </div>
                        <span className="text-[10.5px] font-medium text-muted-foreground shrink-0">
                          {topic.meetingDateDisplay || topic.meetingDate}
                        </span>
                      </div>

                      {/* Title (not bold) */}
                      <h3 className="font-normal text-sm text-foreground mb-2 line-clamp-2 leading-snug">
                        {topic.title}
                      </h3>

                      {/* Standpunt badges preview */}
                      {topic.standpuntSummary && topic.standpuntSummary.total > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          {topic.standpuntSummary.negatiefCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                              <ThumbsDown className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
                              <span>{topic.standpuntSummary.negatiefCount} Kritisch</span>
                            </span>
                          )}
                          {topic.standpuntSummary.positiefCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <ThumbsUp className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                              <span>{topic.standpuntSummary.positiefCount} Positief</span>
                            </span>
                          )}
                          {topic.standpuntSummary.genuanceerdCount > 0 && topic.standpuntSummary.negatiefCount === 0 && topic.standpuntSummary.positiefCount === 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <Scale className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                              <span>Genuanceerd</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer Info: Assignment & Read Progress */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-border/50 text-[11px] gap-2">
                        {/* Assignee */}
                        <div className="flex items-center gap-1.5 truncate text-foreground/85">
                          <UserCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="truncate">
                            {topic.assignedName ? (
                              <span className="font-medium text-accent">{topic.assignedName}</span>
                            ) : (
                              <span className="text-muted-foreground italic">Nog niet verdeeld</span>
                            )}
                          </span>
                        </div>

                        {/* Document read status */}
                        <div className="flex items-center gap-2 shrink-0">
                          {totalDocs > 0 && (
                            <span
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                                isFullyViewed
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : viewedDocsCount > 0
                                  ? "bg-amber-500/15 text-amber-600"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              <FileCheck className="w-3 h-3" />
                              <span>
                                {viewedDocsCount}/{totalDocs}
                              </span>
                            </span>
                          )}
                          {topic.notes.length > 0 && (
                            <span className="flex items-center gap-0.5 text-muted-foreground font-semibold">
                              <MessageSquare className="w-3 h-3 text-accent" />
                              <span>{topic.notes.length}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Topic Details, Document Viewer & Fractienotities (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {selectedTopic ? (
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
                
                {/* Header & Category info */}
                <div className="border-b border-border/80 pb-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/30">
                        {selectedTopic.category}
                      </span>
                      {selectedTopic.meetingType && (
                        <span className="text-xs text-muted-foreground">
                          • {selectedTopic.meetingType}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-accent" />
                      {selectedTopic.meetingDateDisplay || selectedTopic.meetingDate}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground leading-snug">
                    {selectedTopic.title}
                  </h2>

                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span>Vergadering: {selectedTopic.meetingTitle}</span>
                    {selectedTopic.sourceUrl && (
                      <a
                        href={selectedTopic.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline font-semibold"
                      >
                        Bronpagina <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* 🚨 Topic-Specifieke Vrijdagmiddag-Dump Alert Box */}
                {(selectedTopic.hasRecentDump || selectedTopic.hasDocumentDiff || (selectedTopic.diffAlerts && selectedTopic.diffAlerts.some((a) => !a.dismissed))) && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/40 text-xs space-y-2.5 animate-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400 text-sm">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-pulse shrink-0" />
                        <span>
                          {selectedTopic.hasRecentDump
                            ? "VRIJDAGMIDDAG-DUMP: Nieuwe documenten toegevoegd kort voor de vergadering!"
                            : "UPDATE DETECTIE: Gewijzigde of nieuwe raadsstukken gevonden!"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDismissTopicDiff(selectedTopic.id)}
                        className="h-7 text-[11px] font-semibold border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
                      >
                        Markeer als Gecontroleerd
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      De iBabs Diff-Checker heeft geconstateerd dat de documentstructuur van dit agendapunt is gewijzigd na de initiële publicatie. Bekijk de nieuw toegevoegde documenten hieronder zorgvuldig.
                    </p>
                    {selectedTopic.diffAlerts && selectedTopic.diffAlerts.length > 0 && (
                      <div className="pt-2 border-t border-rose-500/20 space-y-1">
                        {selectedTopic.diffAlerts.filter((a) => !a.dismissed).map((alert) => (
                          <div key={alert.id} className="text-foreground/90 pl-3 border-l-2 border-rose-500 text-[11.5px]">
                            <span className="font-semibold">{alert.summary}</span>
                            {alert.detectedAt && (
                              <span className="text-[10px] text-muted-foreground ml-2">
                                (Gedetecteerd: {new Date(alert.detectedAt).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Assignment Box */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-accent" />
                      <span>Verantwoordelijk Fractielid:</span>
                    </div>
                    {selectedTopic.assignedName ? (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0 border border-accent/30">
                          <img
                            src={selectedTopic.assignedMemberAvatar || "/assets/sammy.png"}
                            alt={selectedTopic.assignedName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/assets/sammy.png";
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {selectedTopic.assignedName}
                          <span className="text-muted-foreground ml-1.5 font-normal">
                            • {selectedTopic.assignedMemberRole || "Fractielid"}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Dit onderwerp is nog door niemand binnen de fractie geadopteerd.
                      </p>
                    )}
                  </div>

                  {/* Toewijzen Dropdown (Admin of Zelf toewijzen) */}
                  <div className="w-full sm:w-56 shrink-0">
                    <Select
                      value={selectedTopic.assignedTo || "none"}
                      onValueChange={(val) => handleAssignTopic(selectedTopic.id, val)}
                    >
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-background">
                        <SelectValue placeholder="Kies fractielid..." />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="none">Geen (Onverdeeld)</SelectItem>
                        {councilMembers.map((m) => (
                          <SelectItem key={m.username} value={m.username}>
                            {m.fullName} (@{m.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 🏛️ Standpunten & Partijlijn Koppeling (Positief / Negatief / Genuanceerd) */}
                <TopicStandpuntenSection
                  topic={selectedTopic}
                  token={token}
                  onTopicUpdated={(updatedTopic) => {
                    setTopics((prev) => prev.map((t) => (t.id === updatedTopic.id ? updatedTopic : t)));
                  }}
                  onOpenDocumentViewer={(doc) => {
                    setActiveDoc({ doc, topic: selectedTopic });
                  }}
                />

                {/* ⚙️ Zero-Hallucination Ondersteuningsdossier per agendapunt */}
                <SupportDossierPanel
                  topic={selectedTopic}
                  token={token}
                  onDossierUpdated={(updatedTopic) => {
                    setTopics((prev) => prev.map((t) => (t.id === updatedTopic.id ? updatedTopic : t)));
                  }}
                  onOpenDocumentViewer={(doc, page) => {
                    setSecureViewerDoc(doc);
                    setSecureViewerPage(page || 1);
                  }}
                  onOpenDossierTab={(slug) => {
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("tab", "dossiers");
                      next.set("dossier", slug);
                      if (selectedTopicId) next.set("topic", selectedTopicId);
                      return next;
                    });
                    setActivePanelTab("dossiers");
                  }}
                  onAppendToInbreng={async (textToAppend, target) => {
                    if (!selectedTopic) return;
                    if (target === "markt") {
                      const current = selectedTopic.bijdragePolitiekeMarkt || "";
                      const next = current ? `${current}\n\n${textToAppend}` : textToAppend;
                      setPolitiekeMarktText(next);
                      await handleDirectSaveContribution(selectedTopic.id, { bijdragePolitiekeMarkt: next });
                    } else {
                      const current = selectedTopic.bijdrageRaadsvergadering || "";
                      const next = current ? `${current}\n\n${textToAppend}` : textToAppend;
                      setRaadsvergaderingText(next);
                      await handleDirectSaveContribution(selectedTopic.id, { bijdrageRaadsvergadering: next });
                    }
                  }}
                />

                {/* Fractie Bijdragen & Behandeling Actieknoppen */}

                <div className="p-4 rounded-xl bg-background border border-border/90 shadow-2xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span>Fractie-Inbreng & Behandeling</span>
                    </div>
                    {selectedTopic.status === "hamerstuk_afgehandeld" ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Afgehandeld als hamerstuk {selectedTopic.hamerstukAfgehandeldBy ? `door ${selectedTopic.hamerstukAfgehandeldBy}` : ""}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                        In behandeling (Bespreekstuk)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Knop 1: Bijdrage Politieke Markt */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPolitiekeMarktText(selectedTopic.bijdragePolitiekeMarkt || "");
                        setIsPolitiekeMarktModalOpen(true);
                      }}
                      className="h-auto py-2.5 px-3.5 text-xs rounded-xl border-accent/40 bg-accent/5 hover:bg-accent/15 text-foreground justify-start text-left flex items-start gap-2.5 group transition-all"
                    >
                      <MessageSquare className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-accent group-hover:underline flex items-center justify-between">
                          <span>Bijdrage Politieke Markt</span>
                          {selectedTopic.bijdragePolitiekeMarkt ? (
                            <span className="text-[10px] bg-accent/20 px-1.5 py-0.2 rounded font-semibold text-accent">Ingevuld</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-normal">Nog leeg</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {selectedTopic.bijdragePolitiekeMarkt ? selectedTopic.bijdragePolitiekeMarkt : "Concept inbreng, standpunt & spreektijd..."}
                        </p>
                      </div>
                    </Button>

                    {/* Knop 2: Bijdrage Raadsvergadering */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setRaadsvergaderingText(selectedTopic.bijdrageRaadsvergadering || "");
                        setIsRaadsvergaderingModalOpen(true);
                      }}
                      className="h-auto py-2.5 px-3.5 text-xs rounded-xl border-border bg-card hover:bg-muted/40 text-foreground justify-start text-left flex items-start gap-2.5 group transition-all"
                    >
                      <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-foreground group-hover:text-accent flex items-center justify-between">
                          <span>Bijdrage Raadsvergadering</span>
                          {selectedTopic.bijdrageRaadsvergadering ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-semibold">Ingevuld</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-normal">Nog leeg</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {selectedTopic.bijdrageRaadsvergadering ? selectedTopic.bijdrageRaadsvergadering : "Definitieve inbreng, stemadvies & moties..."}
                        </p>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Documentenlijst (Direct te bekijken en af te vinken) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-accent" />
                      <span>Bijbehorende Vergaderstukken ({selectedTopic.documents.length})</span>
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      Vink aan zodra doorgenomen
                    </span>
                  </div>

                  {selectedTopic.documents.length === 0 ? (
                    <div className="p-4 rounded-xl bg-muted/20 border border-dashed border-border text-center text-xs text-muted-foreground">
                      Geen afzonderlijke PDF bijlagen gekoppeld aan dit agendapunt.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedTopic.documents.map((doc) => {
                        const isViewedByMe = doc.viewedBy?.some((v) => v.username === user?.username);
                        const otherViewers = (doc.viewedBy || []).filter((v) => v.username !== user?.username);

                        return (
                          <div
                            key={doc.id}
                            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                              isViewedByMe
                                ? "bg-emerald-500/5 border-emerald-500/20"
                                : "bg-card border-border/80 hover:border-accent/40"
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleDocViewed(selectedTopic.id, doc.id, !!isViewedByMe)}
                                className={`mt-0.5 p-1 rounded-lg transition-colors ${
                                  isViewedByMe
                                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                                title={isViewedByMe ? "Klik om op ongelezen te zetten" : "Klik om te markeren als bekeken"}
                              >
                                {isViewedByMe ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <Circle className="w-4 h-4" />
                                )}
                              </button>

                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-foreground truncate flex items-center gap-1.5 flex-wrap" title={doc.title}>
                                  <span>{doc.title}</span>
                                  {doc.isLateDump && (
                                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40 inline-flex items-center gap-1 shrink-0 animate-pulse">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      Vrijdagmiddag-dump
                                    </span>
                                  )}
                                  {doc.isNewAfterCompile && !doc.isLateDump && (
                                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 inline-flex items-center gap-1 shrink-0">
                                      <AlertCircle className="w-2.5 h-2.5" />
                                      Nieuw na compilatie
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                                  <span className="uppercase font-mono text-[10px] px-1.5 py-0.2 bg-muted rounded">
                                    {doc.fileType || "PDF"}
                                  </span>
                                  {doc.firstDetectedAt && (
                                    <span className="text-[10px] text-muted-foreground">
                                      Toegevoegd: {new Date(doc.firstDetectedAt).toLocaleDateString("nl-NL")}
                                    </span>
                                  )}
                                  {doc.viewedBy && doc.viewedBy.length > 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                      Bekeken door: {doc.viewedBy.map((v) => v.fullName || v.username).join(", ")}
                                    </span>
                                  )}
                                </div>

                                {/* Matched standpunten for this specific document */}
                                {doc.matchedStandpunten && doc.matchedStandpunten.length > 0 && (
                                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                                    {doc.matchedStandpunten.map((dsp, dIdx) => (
                                      <Link
                                        key={dIdx}
                                        to={`/standpunten?hoofdstuk=${dsp.hoofdstukNr}&standpunt=${dsp.standpuntNr}`}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold inline-flex items-center gap-1 border transition-all hover:scale-105 ${
                                          dsp.stance === "negatief"
                                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25"
                                            : dsp.stance === "positief"
                                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                                        }`}
                                        title={`Standpunt H${dsp.hoofdstukNr}.${dsp.standpuntNr}: ${dsp.standpuntTitel}${dsp.matchedReason ? `\n${dsp.matchedReason}` : (dsp as any).explanation ? `\n${(dsp as any).explanation}` : ''}${dsp.citedPassage ? `\n\nCitaat: "${dsp.citedPassage}"` : ''}`}
                                      >
                                        {dsp.stance === "negatief" ? (
                                          <ThumbsDown className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
                                        ) : dsp.stance === "positief" ? (
                                          <ThumbsUp className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                          <Scale className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                        )}
                                        <span>H{dsp.hoofdstukNr}.{dsp.standpuntNr} {dsp.standpuntTitel}</span>
                                        <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              {/* Open in modal viewer */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setActiveDoc({ doc, topic: selectedTopic })}
                                className="h-8 text-xs px-3 border-accent/40 text-accent hover:bg-accent/10 rounded-lg"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                Inzien
                              </Button>

                              {/* Direct download link */}
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                                className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground rounded-lg"
                              >
                                <a href={doc.url} target="_blank" rel="noreferrer" title="Open originele link">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Fractienotities & Interne Afstemming */}
                <div className="pt-4 border-t border-border/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-accent" />
                      <span>Fractienotities & Standpuntbepaling ({selectedTopic.notes.length})</span>
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      Zichtbaar voor de fractie
                    </span>
                  </div>

                  {/* Bestaande notities */}
                  {selectedTopic.notes.length === 0 ? (
                    <div className="p-4 rounded-xl bg-muted/20 border border-dashed border-border text-center text-xs text-muted-foreground">
                      Nog geen notities of vragen geplaatst bij dit raadsvoorstel.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedTopic.notes.map((note) => {
                        const isMemberFeedback = note.source === "ledenfeedback";
                        const isAuthor = note.authorUsername === user?.username;
                        const canDelete = isAuthor || user?.role === "admin";

                        return (
                          <div
                            key={note.id}
                            className={`p-3.5 rounded-xl border space-y-1.5 transition-all ${
                              isMemberFeedback
                                ? "bg-blue-500/5 border-blue-500/30"
                                : "bg-muted/40 border-border/70"
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-foreground">
                                  {note.authorName || note.authorUsername}
                                </span>
                                {isMemberFeedback && (
                                  <span className="text-[10px] px-2 py-0.5 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-full font-bold border border-blue-500/30">
                                    Ledenfeedback / Inbreng
                                  </span>
                                )}
                                {note.memberEmail && (
                                  <span className="text-[10.5px] text-muted-foreground">
                                    ({note.memberEmail})
                                  </span>
                                )}
                                {note.documentTitle && (
                                  <span className="text-[10.5px] px-2 py-0.5 bg-accent/15 text-accent rounded-full font-medium truncate max-w-xs">
                                    Bij stuk: {note.documentTitle}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(note.createdAt).toLocaleString("nl-NL", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNote(selectedTopic.id, note.id)}
                                    className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                                    title="Notitie verwijderen"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                              {note.note}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Nieuwe notitie invoer */}
                  <div className="p-4 rounded-xl bg-background border border-border/80 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-accent" />
                        <span>Notitie toevoegen voor de fractie</span>
                      </label>

                      {/* Optioneel koppelen aan document */}
                      {selectedTopic.documents.length > 0 && (
                        <div className="w-48">
                          <Select
                            value={noteTargetDocId || "none"}
                            onValueChange={(v) => setNoteTargetDocId(v === "none" ? null : v)}
                          >
                            <SelectTrigger className="h-7 text-[11px] rounded-lg">
                              <SelectValue placeholder="Koppel aan stuk..." />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                              <SelectItem value="none">Algemeen agendapunt</SelectItem>
                              {selectedTopic.documents.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <Textarea
                      rows={3}
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Bijv. Vragen over financiële onderbouwing par. 3; fractiestandpunt: voorstel steunen onder voorwaarde van..."
                      className="text-xs bg-muted/20"
                    />

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={submittingNote || !newNoteText.trim()}
                        onClick={() => handleAddNote(selectedTopic.id)}
                        className="text-xs h-8 px-4 rounded-lg bg-accent text-accent-foreground font-semibold"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        {submittingNote ? "Opslaan..." : "Plaats Notitie"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-16 text-center bg-card rounded-2xl border border-dashed border-border space-y-2">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
                <h3 className="font-display text-lg text-foreground">Selecteer een agendapunt</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Klik in de linkerlijst op een voorstel of bespreekstuk om de vergaderstukken en fractienotities in te zien.
                </p>
              </div>
            )}
          </div>
        </div>
          </>
        ) : (
          <div className="py-16 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2">Toegang Vergaderagenda</h3>
            <p className="text-xs text-muted-foreground mb-4">
              De interne bespreekstukken en agendaplanning zijn voorbehouden aan raads- en fractieleden. U kunt wel alle dossiers en raadsstukken inzien.
            </p>
            <Button onClick={() => setActivePanelTab("dossiers")} className="text-xs">
              Bekijk Dossiers
            </Button>
          </div>
        )}
      </div>

      {/* Document Viewer Modal Dialog met geïntegreerde Fractie-notities */}
      {activeDoc && (() => {
        const currentModalTopic = topics.find((t) => t.id === activeDoc.topic.id) || activeDoc.topic;
        const currentModalDoc = currentModalTopic.documents.find((d) => d.id === activeDoc.doc.id) || activeDoc.doc;
        const isDocViewedByMe = currentModalDoc.viewedBy?.some((v) => v.username === user?.username);
        const docNotes = currentModalTopic.notes?.filter((n) => n.documentId === currentModalDoc.id) || [];
        const generalNotes = currentModalTopic.notes?.filter((n) => !n.documentId) || [];
        const proxyUrl = `/api/council/document-proxy?url=${encodeURIComponent(currentModalDoc.url)}${token ? `&token=${encodeURIComponent(token)}` : ""}`;

        return (
          <Dialog open={!!activeDoc} onOpenChange={(open) => !open && setActiveDoc(null)}>
            <DialogContent className="max-w-6xl w-[96vw] h-[92vh] max-h-[95vh] flex flex-col p-4 sm:p-6 rounded-2xl bg-card border-border">
              <DialogHeader className="pb-3 border-b border-border/80 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold uppercase tracking-wider bg-accent/20 text-accent border border-accent/40">
                        {currentModalDoc.fileType}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {currentModalTopic.meetingTitle} • {currentModalTopic.meetingDateDisplay || currentModalTopic.meetingDate}
                      </span>
                    </div>
                    <DialogTitle className="font-display text-base sm:text-lg text-foreground truncate" title={currentModalDoc.title}>
                      {currentModalDoc.title}
                    </DialogTitle>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant={isDocViewedByMe ? "default" : "outline"}
                      onClick={() => handleToggleDocViewed(currentModalTopic.id, currentModalDoc.id, !!isDocViewedByMe)}
                      className={`h-8 text-xs font-semibold ${
                        isDocViewedByMe
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                          : "border-accent/40 text-accent hover:bg-accent/15"
                      }`}
                    >
                      {isDocViewedByMe ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Gelezen
                        </>
                      ) : (
                        <>
                          <Circle className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                          Gelezen markeren
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowModalNotes(!showModalNotes)}
                      className="h-8 text-xs relative"
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1 text-accent" />
                      <span>Notities ({docNotes.length})</span>
                      {docNotes.length > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-accent text-accent-foreground">
                          {docNotes.length}
                        </span>
                      )}
                    </Button>

                    <Button size="sm" variant="secondary" asChild className="h-8 text-xs">
                      <a href={currentModalDoc.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        Origineel
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Gelezen door badge indicator */}
                {currentModalDoc.viewedBy && currentModalDoc.viewedBy.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1.5">
                    <Eye className="w-3 h-3 text-emerald-500" />
                    <span>Gelezen door fractieleden:</span>
                    <span className="font-medium text-foreground">
                      {currentModalDoc.viewedBy.map((v) => v.fullName || v.username).join(", ")}
                    </span>
                  </div>
                )}

                {/* Standpunten banner in modal */}
                {((currentModalDoc.matchedStandpunten && currentModalDoc.matchedStandpunten.length > 0) || (currentModalTopic.matchedStandpunten && currentModalTopic.matchedStandpunten.length > 0)) && (
                  <div className="mt-2 p-2.5 rounded-xl bg-accent/5 border border-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-accent" />
                        <span>Partijstandpunt:</span>
                      </span>
                      {((currentModalDoc.matchedStandpunten && currentModalDoc.matchedStandpunten.length > 0) ? currentModalDoc.matchedStandpunten : currentModalTopic.matchedStandpunten || []).map((sp, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold inline-flex items-center gap-1 border ${
                            sp.stance === "negatief"
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                              : sp.stance === "positief"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {sp.stance === "negatief" ? <ThumbsDown className="w-3 h-3" /> : sp.stance === "positief" ? <ThumbsUp className="w-3 h-3" /> : <Scale className="w-3 h-3" />}
                          <span>H{sp.hoofdstukNr}.{sp.standpuntNr} {sp.standpuntTitel} ({sp.stance.toUpperCase()})</span>
                        </span>
                      ))}
                    </div>
                    <Link
                      to={`/standpunten?hoofdstuk=${(currentModalDoc.matchedStandpunten?.[0] || currentModalTopic.matchedStandpunten?.[0])?.hoofdstukNr || 1}&standpunt=${(currentModalDoc.matchedStandpunten?.[0] || currentModalTopic.matchedStandpunten?.[0])?.standpuntNr || 1}`}
                      target="_blank"
                      className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 shrink-0"
                    >
                      <span>Bekijk standpunt in verkiezingsprogramma</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </DialogHeader>

              {/* Hoofdsectie: Documentviewer + Notities Paneel */}
              <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 mt-3 overflow-hidden">
                {/* Linkerzijde: Document Iframe */}
                <div className="flex-1 min-h-[350px] h-full bg-muted/30 rounded-xl overflow-hidden border border-border relative flex flex-col">
                  <div className="px-3 py-1.5 bg-background/80 border-b border-border text-[11px] text-muted-foreground flex items-center justify-between">
                    <span className="truncate">Beveiligde viewer • Steenwijkerland Raadsstuk</span>
                    <a
                      href={currentModalDoc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline inline-flex items-center gap-1 font-semibold shrink-0 ml-2"
                    >
                      Direct downloaden <Download className="w-3 h-3" />
                    </a>
                  </div>
                  <iframe
                    src={proxyUrl}
                    className="w-full flex-1 border-0 bg-white"
                    title={currentModalDoc.title}
                  />
                </div>

                {/* Rechterzijde: Direct Notities & Opmerkingen achterlaten */}
                {showModalNotes && (
                  <div className="w-full lg:w-84 xl:w-96 flex flex-col h-full bg-background rounded-xl border border-border p-3.5 space-y-3 shrink-0 overflow-hidden shadow-2xs">
                    <div className="flex items-center justify-between border-b border-border pb-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <MessageSquare className="w-3.5 h-3.5 text-accent" />
                        <span>Opmerkingen bij dit stuk ({docNotes.length})</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Fractie intern</span>
                    </div>

                    {/* Scrollable list of notes */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                      {docNotes.length === 0 ? (
                        <div className="p-4 rounded-xl bg-muted/20 border border-dashed border-border text-center text-xs text-muted-foreground">
                          Nog geen notities bij dit specifieke document. Typ hieronder een opmerking of vraag om met de fractie af te stemmen.
                        </div>
                      ) : (
                        docNotes.map((note) => {
                          const isAuthor = note.authorUsername === user?.username;
                          const canDelete = isAuthor || user?.role === "admin";
                          return (
                            <div
                              key={note.id}
                              className="p-2.5 rounded-xl bg-muted/40 border border-border text-xs space-y-1 relative group"
                            >
                              <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
                                <span className="font-semibold text-foreground">
                                  {note.authorName || note.authorUsername}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span>{new Date(note.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                                  {canDelete && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteNote(currentModalTopic.id, note.id)}
                                      className="text-muted-foreground hover:text-destructive opacity-80 hover:opacity-100 p-0.5"
                                      title="Verwijder notitie"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[11.5px]">
                                {note.note}
                              </p>
                            </div>
                          );
                        })
                      )}

                      {/* Algemene notities van het hoofdonderwerp */}
                      {generalNotes.length > 0 && (
                        <div className="pt-2 border-t border-border/60">
                          <span className="text-[10.5px] font-semibold text-muted-foreground block mb-1.5">
                            Algemene agendapunt-notities ({generalNotes.length})
                          </span>
                          <div className="space-y-1.5">
                            {generalNotes.map((gn) => (
                              <div key={gn.id} className="p-2 rounded-lg bg-muted/20 border border-border/60 text-[11px]">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                                  <span className="font-medium text-foreground">{gn.authorName}</span>
                                  <span>{new Date(gn.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</span>
                                </div>
                                <p className="text-foreground/80">{gn.note}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Nieuwe notitie invoer bij dit document */}
                    <div className="pt-2 border-t border-border shrink-0 space-y-2">
                      <Textarea
                        rows={3}
                        value={modalNoteText}
                        onChange={(e) => setModalNoteText(e.target.value)}
                        placeholder="Schrijf een opmerking, vraag of stemadvies bij dit stuk..."
                        className="text-xs bg-muted/20 resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Koppeling: Dit document</span>
                        <Button
                          size="sm"
                          disabled={submittingModalNote || !modalNoteText.trim()}
                          onClick={handleAddModalNote}
                          className="text-xs h-7 px-3 rounded-lg bg-accent text-accent-foreground font-semibold"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          {submittingModalNote ? "Opslaan..." : "Plaats Notitie"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Clear Unassigned Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-display">Onverdeelde stukken wissen?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-2 space-y-2">
              <span>
                Hiermee verwijdert u alle binnengehaalde agendapunten die <strong>nog niet zijn toegewezen</strong> en waar <strong>geen fractie-notities</strong> bij staan.
              </span>
              <span className="block text-xs p-2.5 rounded-lg bg-accent/10 border border-accent/20 text-accent font-medium mt-2">
                ✓ Alle onderwerpen die aan een fractielid zijn toegekend, gelezen markeringen en geschreven notities blijven <strong>100% veilig bewaard</strong>.
              </span>
              <span className="block text-xs text-muted-foreground mt-1">
                Hierna kunt u met een schone lei opnieuw vergaderstukken ophalen.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowClearConfirm(false)}
              disabled={isClearing}
            >
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearUnassigned}
              disabled={isClearing}
              className="gap-1.5"
            >
              <RotateCcw className={`w-4 h-4 ${isClearing ? "animate-spin" : ""}`} />
              {isClearing ? "Bezig met wissen..." : "Ja, onverdeelde stukken wissen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bijdrage Politieke Markt Dialog */}
      {selectedTopic && (
        <Dialog open={isPolitiekeMarktModalOpen} onOpenChange={setIsPolitiekeMarktModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/30">
                  Politieke Markt
                </span>
                {selectedTopic.status === "hamerstuk_afgehandeld" && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    Afgehandeld als hamerstuk
                  </span>
                )}
              </div>
              <DialogTitle className="text-lg font-display font-bold leading-snug">
                Bijdrage Politieke Markt: {selectedTopic.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Noteer hier het standpunt, de inbreng van de fractie en de concept spreektijd voor de Politieke Markt.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Fractie-inbreng & Standpunt (Politieke Markt)
                </label>
                <Textarea
                  rows={8}
                  value={politiekeMarktText}
                  onChange={(e) => setPolitiekeMarktText(e.target.value)}
                  placeholder="Noteer hier uw standpunt, vragen aan het college/wethouder en kernpunten voor de politieke markt..."
                  className="text-xs bg-muted/20"
                />
              </div>

              {selectedTopic.bijdragePolitiekeMarktUpdatedAt && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Laatst gewijzigd door {selectedTopic.bijdragePolitiekeMarktUpdatedBy || "onbekend"} op{" "}
                    {new Date(selectedTopic.bijdragePolitiekeMarktUpdatedAt).toLocaleString("nl-NL")}
                  </span>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPolitiekeMarktModalOpen(false)}
                  disabled={isSavingContribution}
                  className="text-xs"
                >
                  Sluiten
                </Button>
                {selectedTopic.status !== "hamerstuk_afgehandeld" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSavingContribution}
                    onClick={() => handleSavePolitiekeMarkt(selectedTopic.id, true)}
                    className="text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold gap-1"
                    title="Markeer als afgehandeld hamerstuk (geen verdere bespreking in de raad nodig)"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Afgehandeld als hamerstuk
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSavingContribution}
                    onClick={() => handleSavePolitiekeMarkt(selectedTopic.id, false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                    title="Zet terug naar bespreekstuk"
                  >
                    Terugzetten naar bespreekstuk
                  </Button>
                )}
              </div>

              <Button
                type="button"
                size="sm"
                disabled={isSavingContribution}
                onClick={() => handleSavePolitiekeMarkt(selectedTopic.id, undefined)}
                className="text-xs bg-accent text-accent-foreground font-semibold"
              >
                {isSavingContribution ? "Opslaan..." : "Bijdrage Opslaan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Bijdrage Raadsvergadering Dialog */}
      {selectedTopic && (
        <Dialog open={isRaadsvergaderingModalOpen} onOpenChange={setIsRaadsvergaderingModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                  Raadsvergadering
                </span>
                <span className="text-xs text-muted-foreground">Besluitvorming</span>
              </div>
              <DialogTitle className="text-lg font-display font-bold leading-snug">
                Bijdrage Raadsvergadering: {selectedTopic.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Noteer hier de definitieve inbreng, eventuele moties/amendementen en het fractie-stemadvies voor de raadsvergadering.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Definitieve inbreng, Stemadvies & Moties
                </label>
                <Textarea
                  rows={8}
                  value={raadsvergaderingText}
                  onChange={(e) => setRaadsvergaderingText(e.target.value)}
                  placeholder="Bijv. Stemadvies: VOOR / TEGEN; Motie 'Behoud dorpshuis' indienen met mede-indieners..."
                  className="text-xs bg-muted/20"
                />
              </div>

              {selectedTopic.bijdrageRaadsvergaderingUpdatedAt && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Laatst gewijzigd door {selectedTopic.bijdrageRaadsvergaderingUpdatedBy || "onbekend"} op{" "}
                    {new Date(selectedTopic.bijdrageRaadsvergaderingUpdatedAt).toLocaleString("nl-NL")}
                  </span>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRaadsvergaderingModalOpen(false)}
                disabled={isSavingContribution}
                className="text-xs"
              >
                Sluiten
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSavingContribution}
                onClick={() => handleSaveRaadsvergadering(selectedTopic.id)}
                className="text-xs bg-accent text-accent-foreground font-semibold"
              >
                {isSavingContribution ? "Opslaan..." : "Bijdrage Raadsvergadering Opslaan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Secure Document Viewer voor Click-to-Verify & Pagina-Archief */}
      <SecureDocumentViewer
        document={secureViewerDoc}
        isOpen={!!secureViewerDoc}
        onClose={() => setSecureViewerDoc(null)}
        user={user}
        initialPage={secureViewerPage}
      />
    </div>
  );
}

