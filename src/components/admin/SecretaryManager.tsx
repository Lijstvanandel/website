import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/api";
import {
  FileText,
  Mail,
  Phone,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Clock3,
  Plus,
  Trash2,
  Pencil,
  Search,
  Filter,
  Download,
  Users,
  ShieldCheck,
  Scale,
  Building2,
  FolderKanban,
  CheckSquare,
  ListTodo,
  ExternalLink,
  ChevronRight,
  Briefcase,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  RotateCcw,
  Send,
  UserCheck,
  BookOpen,
  Info
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
import { BelafsprakenManager } from "@/components/BelafsprakenManager";
import { DocumentManager } from "@/components/DocumentManager";
import { VacancyManager } from "@/components/VacancyManager";

export interface SecretaryMeeting {
  id: string;
  title: string;
  type: "ALV" | "Bestuursvergadering";
  date: string;
  time: string;
  location: string;
  status: "voorbereiding" | "geagendeerd" | "afgerond";
  agenda: string[];
  minutes?: string;
  decisions?: string[];
  attachments?: string[];
  attendeesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SecretaryAction {
  id: string;
  title: string;
  meetingTitle: string;
  assignedTo: string;
  dueDate: string;
  priority: "hoog" | "normaal" | "laag";
  status: "open" | "in_behandeling" | "voltooid";
  completedAt?: string | null;
  notes?: string;
}

export interface SecretaryCompliance {
  kvk?: {
    kvkNumber?: string;
    associationName?: string;
    statutorySeat?: string;
    lastMutationDate?: string;
    status?: string;
    boardMembersRegistered?: string[];
    extractAvailable?: boolean;
  };
  wbtr?: {
    compliant?: boolean;
    tegenstrijdigBelangRegeling?: boolean;
    beletEnOntstentenisRegeling?: boolean;
    meervoudigStemrechtBeperkt?: boolean;
    aansprakelijkheidsverzekeringBestuur?: boolean;
    lastReviewedDate?: string;
    notes?: string;
  };
  ubo?: {
    registered?: boolean;
    registrationDate?: string;
    lastVerificationDate?: string;
    status?: string;
    confirmedUbos?: string[];
  };
  avg?: {
    compliant?: boolean;
    privacyStatementPublished?: boolean;
    processingRegisterActive?: boolean;
    memberConsentLogged?: boolean;
    dataRetentionPolicyEnforced?: boolean;
    lastAuditDate?: string;
    notes?: string;
  };
  giftenreglement?: {
    publishedOnWebsite?: boolean;
    adoptedByAlv?: boolean;
    publicationUrl?: string;
    notes?: string;
  };
  lastUpdated?: string;
}

export interface SecretaryYearcycleItem {
  quarter: string;
  title: string;
  period: string;
  status: "afgerond" | "actief" | "gepland";
  items: string[];
}

export interface SecretaryElections {
  campaignEvaluation?: {
    previousResult?: string;
    keyLearnings?: string[];
    focusAreasNextElection?: string;
  };
  programCommittee?: {
    status?: string;
    lead?: string;
    members?: string[];
    deadlineDraft?: string;
    alvAdoptionDate?: string;
    notes?: string;
  };
  candidateCommittee?: {
    status?: string;
    lead?: string;
    members?: string[];
    interviewPeriod?: string;
    kiesraadDeadlinesChecked?: boolean;
    notes?: string;
  };
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  wijkNaam?: string;
  status?: "moet nog beantwoord worden" | "afgehandeld";
  notes?: string;
  handledAt?: string | null;
  handledBy?: string | null;
  createdAt: string;
}

interface SecretaryManagerProps {
  token: string | null;
  currentUser: {
    fullName?: string;
    username?: string;
    email?: string;
    role?: string;
  } | null;
  defaultSubTab?: string;
  headers?: Record<string, string>;
}

export function SecretaryManager({
  token,
  currentUser,
  defaultSubTab = "overview",
  headers = {},
}: SecretaryManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<string>(defaultSubTab);
  const [loading, setLoading] = useState(true);

  // Secretary data state
  const [meetings, setMeetings] = useState<SecretaryMeeting[]>([]);
  const [actions, setActions] = useState<SecretaryAction[]>([]);
  const [compliance, setCompliance] = useState<SecretaryCompliance>({});
  const [yearcycle, setYearcycle] = useState<SecretaryYearcycleItem[]>([]);
  const [elections, setElections] = useState<SecretaryElections>({});
  const [stats, setStats] = useState<any>({});

  // Messages state
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [messageFilter, setMessageFilter] = useState<"all" | "open" | "handled">("all");
  const [messageSearch, setMessageSearch] = useState("");
  const [messageNotes, setMessageNotes] = useState("");
  const [isUpdatingMessage, setIsUpdatingMessage] = useState(false);

  // Dialog states
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    type: "ALV" as "ALV" | "Bestuursvergadering",
    date: new Date().toISOString().split("T")[0],
    time: "19:30 - 22:00",
    location: "Partijkantoor Steenwijk",
    agendaText: "1. Opening door de voorzitter\n2. Vaststelling agenda\n3. Notulen vorige vergadering\n4. Mededelingen secretariaat & ingekomen stukken\n5. Rondvraag en sluiting",
  });

  const [isMinutesDialogOpen, setIsMinutesDialogOpen] = useState(false);
  const [selectedMeetingForMinutes, setSelectedMeetingForMinutes] = useState<SecretaryMeeting | null>(null);
  const [minutesText, setMinutesText] = useState("");
  const [decisionsText, setDecisionsText] = useState("");
  const [meetingStatus, setMeetingStatus] = useState<"voorbereiding" | "geagendeerd" | "afgerond">("afgerond");

  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionForm, setActionForm] = useState({
    title: "",
    meetingTitle: "Regulier Secretariaat",
    assignedTo: currentUser?.fullName || "Anja ter Horst (Secretaris)",
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    priority: "normaal" as "hoog" | "normaal" | "laag",
    notes: "",
  });

  const [actionFilter, setActionFilter] = useState<"all" | "open" | "voltooid">("all");

  const authHeaders = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  const loadSecretaryData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/secretary/data");
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
        setActions(data.actions || []);
        setCompliance(data.compliance || {});
        setYearcycle(data.yearcycle || []);
        setElections(data.elections || {});
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error("Fout bij ophalen secretarisgegevens:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadContactMessages = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/admin/contact-messages");
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        if (data.length > 0 && !selectedMessage) {
          setSelectedMessage(data[0]);
          setMessageNotes(data[0].notes || "");
        }
      }
    } catch (err) {
      console.error("Fout bij ophalen contactberichten:", err);
    }
  }, [selectedMessage]);

  useEffect(() => {
    loadSecretaryData();
    loadContactMessages();
  }, [loadSecretaryData, loadContactMessages]);

  useEffect(() => {
    if (defaultSubTab) {
      setActiveSubTab(defaultSubTab);
    }
  }, [defaultSubTab]);

  // Handle Meeting Creation
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.title.trim() || !meetingForm.date) {
      toast.error("Vul een titel en datum in.");
      return;
    }

    const agendaItems = meetingForm.agendaText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    try {
      const res = await fetchWithAuth("/api/secretary/meetings", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: meetingForm.title.trim(),
          type: meetingForm.type,
          date: meetingForm.date,
          time: meetingForm.time,
          location: meetingForm.location,
          agenda: agendaItems,
        }),
      });

      if (res.ok) {
        toast.success("Vergadering succesvol ingepland.");
        setIsMeetingDialogOpen(false);
        setMeetingForm({
          title: "",
          type: "ALV",
          date: new Date().toISOString().split("T")[0],
          time: "19:30 - 22:00",
          location: "Partijkantoor Steenwijk",
          agendaText: "1. Opening door de voorzitter\n2. Vaststelling agenda\n3. Notulen vorige vergadering\n4. Mededelingen secretariaat\n5. Rondvraag en sluiting",
        });
        loadSecretaryData();
      } else {
        toast.error("Fout bij aanmaken vergadering.");
      }
    } catch {
      toast.error("Verbindingsfout bij aanmaken vergadering.");
    }
  };

  // Handle Save Minutes & Decisions
  const handleSaveMinutes = async () => {
    if (!selectedMeetingForMinutes) return;

    const decisions = decisionsText
      .split("\n")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    try {
      const res = await fetchWithAuth(`/api/secretary/meetings/${selectedMeetingForMinutes.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          minutes: minutesText,
          decisions,
          status: meetingStatus,
        }),
      });

      if (res.ok) {
        toast.success("Notulen en besluitenlijst opgeslagen.");
        setIsMinutesDialogOpen(false);
        loadSecretaryData();
      } else {
        toast.error("Fout bij opslaan notulen.");
      }
    } catch {
      toast.error("Verbindingsfout bij opslaan notulen.");
    }
  };

  // Handle Action Creation
  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionForm.title.trim()) {
      toast.error("Vul een actiepunt-titel in.");
      return;
    }

    try {
      const res = await fetchWithAuth("/api/secretary/actions", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(actionForm),
      });

      if (res.ok) {
        toast.success("Actiepunt toegevoegd aan de actielijst.");
        setIsActionDialogOpen(false);
        setActionForm({
          title: "",
          meetingTitle: "Regulier Secretariaat",
          assignedTo: currentUser?.fullName || "Anja ter Horst (Secretaris)",
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
          priority: "normaal",
          notes: "",
        });
        loadSecretaryData();
      } else {
        toast.error("Fout bij toevoegen actiepunt.");
      }
    } catch {
      toast.error("Verbindingsfout bij toevoegen actiepunt.");
    }
  };

  // Toggle Action Status
  const handleToggleActionStatus = async (action: SecretaryAction) => {
    const nextStatus = action.status === "voltooid" ? "open" : "voltooid";
    try {
      const res = await fetchWithAuth(`/api/secretary/actions/${action.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        toast.success(`Actiepunt gemarkeerd als ${nextStatus === "voltooid" ? "voltooid" : "open"}`);
        loadSecretaryData();
      }
    } catch {
      toast.error("Fout bij bijwerken status.");
    }
  };

  // Delete Action
  const handleDeleteAction = async (id: string) => {
    if (!window.confirm("Weet u zeker dat u dit actiepunt wilt verwijderen?")) return;
    try {
      const res = await fetchWithAuth(`/api/secretary/actions/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) {
        toast.success("Actiepunt verwijderd.");
        loadSecretaryData();
      }
    } catch {
      toast.error("Fout bij verwijderen actiepunt.");
    }
  };

  // Handle Contact Message Status Toggle
  const handleToggleMessageStatus = async (msg: ContactMessage) => {
    const nextStatus = msg.status === "afgehandeld" ? "moet nog beantwoord worden" : "afgehandeld";
    setIsUpdatingMessage(true);
    try {
      const res = await fetchWithAuth(`/api/admin/contact-messages/${msg.id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status: nextStatus, notes: messageNotes }),
      });

      if (res.ok) {
        toast.success(`Status gewijzigd naar '${nextStatus}'`);
        loadContactMessages();
        loadSecretaryData();
        if (selectedMessage?.id === msg.id) {
          setSelectedMessage({
            ...selectedMessage,
            status: nextStatus,
            handledAt: nextStatus === "afgehandeld" ? new Date().toISOString() : null,
            handledBy: nextStatus === "afgehandeld" ? currentUser?.fullName || "Secretaris" : null,
          });
        }
      }
    } catch {
      toast.error("Fout bij bijwerken status.");
    } finally {
      setIsUpdatingMessage(false);
    }
  };

  // Save Message Notes
  const handleSaveMessageNotes = async () => {
    if (!selectedMessage) return;
    setIsUpdatingMessage(true);
    try {
      const res = await fetchWithAuth(`/api/admin/contact-messages/${selectedMessage.id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ notes: messageNotes }),
      });

      if (res.ok) {
        toast.success("Interne secretarisnotitie opgeslagen.");
        loadContactMessages();
        setSelectedMessage({ ...selectedMessage, notes: messageNotes });
      }
    } catch {
      toast.error("Fout bij opslaan notitie.");
    } finally {
      setIsUpdatingMessage(false);
    }
  };

  // Delete Contact Message
  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm("Weet u zeker dat u dit contactbericht wilt verwijderen?")) return;
    try {
      const res = await fetchWithAuth(`/api/admin/contact-messages/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (res.ok) {
        toast.success("Bericht verwijderd.");
        loadContactMessages();
        loadSecretaryData();
        if (selectedMessage?.id === id) {
          setSelectedMessage(null);
        }
      }
    } catch {
      toast.error("Fout bij verwijderen bericht.");
    }
  };

  // Filter messages
  const filteredMessages = messages.filter((m) => {
    if (messageFilter === "open" && m.status === "afgehandeld") return false;
    if (messageFilter === "handled" && m.status !== "afgehandeld") return false;
    if (messageSearch.trim()) {
      const q = messageSearch.toLowerCase();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchEmail = m.email?.toLowerCase().includes(q);
      const matchSubj = m.subject?.toLowerCase().includes(q);
      const matchBody = m.message?.toLowerCase().includes(q);
      const matchWijk = m.wijkNaam?.toLowerCase().includes(q);
      return matchName || matchEmail || matchSubj || matchBody || matchWijk;
    }
    return true;
  });

  // Filter actions
  const filteredActions = actions.filter((a) => {
    if (actionFilter === "open" && a.status === "voltooid") return false;
    if (actionFilter === "voltooid" && a.status !== "voltooid") return false;
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner: Spilfunctie Kennispunt Introductie */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white p-6 md:p-8 border border-indigo-800/40 shadow-xl">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider border border-indigo-500/30">
              <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
              Partijsecretariaat & Verenigingsbestuur
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
              Secretarispaneel — Organisatie, Governance & Aanspreekpunt
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Als secretaris vervul je de spilfunctie binnen Lijst van Andel Steenwijkerland. Je bewaakt de
              verenigingsdemocratie (ALV), de bestuurlijke 1-jaarcyclus, alle wettelijke compliance (KvK, WBTR, UBO,
              AVG), het partijarchief en de correspondentie met inwoners en leden.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Button
              onClick={() => setIsMeetingDialogOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Vergadering Plannen
            </Button>
            <Button
              onClick={() => setIsActionDialogOpen(true)}
              variant="outline"
              className="border-indigo-400/30 text-white hover:bg-indigo-900/40 text-sm"
            >
              <ListTodo className="w-4 h-4 mr-2 text-indigo-400" />
              Nieuw Actiepunt
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Overzichtskaarten */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Openstaande berichten */}
        <div
          onClick={() => setActiveSubTab("berichten")}
          className="cursor-pointer bg-card border border-border p-4 rounded-2xl shadow-sm hover:border-indigo-500/50 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Correspondentie</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.pendingMessages ?? 0}
            <span className="text-xs font-normal text-muted-foreground ml-1">/ {stats.totalMessages ?? 0}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Openstaande contactberichten</p>
        </div>

        {/* Belafspraken */}
        <div
          onClick={() => setActiveSubTab("belafspraken")}
          className="cursor-pointer bg-card border border-border p-4 rounded-2xl shadow-sm hover:border-indigo-500/50 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Belafspraken</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
              <Phone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.openAppointments ?? 0}
            <span className="text-xs font-normal text-muted-foreground ml-1">/ {stats.totalAppointments ?? 0}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Inwoners terugbelverzoeken</p>
        </div>

        {/* Actiepunten */}
        <div
          onClick={() => setActiveSubTab("actielijst")}
          className="cursor-pointer bg-card border border-border p-4 rounded-2xl shadow-sm hover:border-indigo-500/50 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Actielijst</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.openActions ?? 0}
            <span className="text-xs font-normal text-muted-foreground ml-1">open</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Lopende vergaderbesluiten</p>
        </div>

        {/* ALV & Vergaderingen */}
        <div
          onClick={() => setActiveSubTab("vergaderingen")}
          className="cursor-pointer bg-card border border-border p-4 rounded-2xl shadow-sm hover:border-indigo-500/50 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Vergaderingen</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{meetings.length}</div>
          <p className="text-xs text-muted-foreground mt-1">ALV's & Bestuursberaad</p>
        </div>

        {/* Compliance */}
        <div
          onClick={() => setActiveSubTab("compliance")}
          className="cursor-pointer bg-card border border-border p-4 rounded-2xl shadow-sm hover:border-indigo-500/50 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Governance</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">100%</div>
          <p className="text-xs text-muted-foreground mt-1">KvK / WBTR / UBO / AVG</p>
        </div>
      </div>

      {/* Subnavigatie balk Secretaris */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {[
          { id: "overview", label: "Secretariaat & Jaarcyclus", icon: Sparkles },
          { id: "vergaderingen", label: "ALV & Vergaderingen", icon: Calendar, badge: meetings.length },
          { id: "actielijst", label: "Actielijst & Opvolging", icon: ListTodo, badge: stats.openActions },
          { id: "compliance", label: "Wettelijke Compliance", icon: Scale },
          { id: "berichten", label: "Correspondentie (Inbox)", icon: Mail, badge: stats.pendingMessages },
          { id: "belafspraken", label: "Belafspraken", icon: Phone, badge: stats.openAppointments },
          { id: "archief", label: "Partijarchief & Kluis", icon: FolderKanban, badge: stats.totalDocuments },
          { id: "verkiezingen", label: "Verkiezingen & Commissies", icon: Briefcase },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-muted-foreground"}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: OVERVIEW & 1-JAARCYCLUS */}
      {activeSubTab === "overview" && (
        <div className="space-y-8">
          {/* Kennispunt Gids Kaart */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mt-1">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-lg font-bold text-foreground">
                  De Bestuurlijke Spilfunctie (Kennispunt Lokale Politieke Partijen)
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  De secretaris is het formele gezicht naar buiten en de organisatorische motor van de vereniging. Jouw
                  hoofdtaken volgens de handreiking zijn:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-3.5 rounded-xl bg-muted/50 border border-border/70 space-y-1">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      1. Vergaderingen & Besluiten
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Uitschrijven van de Algemene Ledenvergadering (ALV), bestuursvergaderingen, tijdige verzending van
                      stukken, notuleren en bewaken van de actielijst.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-muted/50 border border-border/70 space-y-1">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      2. Aanspreekpunt & Inbox
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Alle correspondentie via e-mail, website en telefoon verloopt via de secretaris. Zorg voor snelle,
                      correcte opvolging of overdracht naar de fractie.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-muted/50 border border-border/70 space-y-1">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      3. Wettelijke Eisen & Archief
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Borgen van de KvK-inschrijving, WBTR, UBO-register, AVG privacy in de ledenadministratie, openbaar
                      giftenreglement en het ordentelijk digitaal partijarchief.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1-Jaarcyclus Interactieve Tijdlijn */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  De Bestuurlijke 1-Jaarcyclus (Wettelijke & Statutaire Deadlines)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vaste kwartaalindeling voor verantwoording aan de leden, begroting en partijdemocratie.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                Huidig Kwartaal: Q3 (Voorbereiding & Scouting)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {(yearcycle || []).map((q) => {
                const isCurrent = q.quarter === "Q3";
                const isDone = q.status === "afgerond";
                return (
                  <div
                    key={q.quarter}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isCurrent
                        ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-400 dark:border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                        : isDone
                        ? "bg-muted/30 border-border opacity-85"
                        : "bg-card border-border"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 tracking-wider">
                          {q.quarter} • {q.period}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            isDone
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              : isCurrent
                              ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {q.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-foreground leading-snug">{q.title}</h4>
                      <ul className="space-y-1.5 pt-1">
                        {q.items.map((item, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-indigo-500 mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recente Berichten & Actiepunten Twee-koloms Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recente Contactberichten */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  Ingekomen Correspondentie
                </h3>
                <Button
                  onClick={() => setActiveSubTab("berichten")}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-indigo-600"
                >
                  Naar Inbox <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
              <div className="space-y-2.5">
                {messages.slice(0, 4).map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMessage(msg);
                      setMessageNotes(msg.notes || "");
                      setActiveSubTab("berichten");
                    }}
                    className="p-3 rounded-xl border border-border/70 hover:bg-muted/40 cursor-pointer transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground truncate">{msg.name}</span>
                        {msg.wijkNaam && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                            {msg.wijkNaam}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{msg.subject || msg.message}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        msg.status === "afgehandeld"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {msg.status === "afgehandeld" ? "Afgehandeld" : "Open"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lopende Actiepunten */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-purple-600" />
                  Belangrijkste Actiepunten
                </h3>
                <Button
                  onClick={() => setActiveSubTab("actielijst")}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-purple-600"
                >
                  Volledige lijst <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
              <div className="space-y-2.5">
                {actions.slice(0, 4).map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl border border-border/70 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold ${
                          act.status === "voltooid" ? "line-through text-muted-foreground" : "text-foreground"
                        } truncate`}
                      >
                        {act.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {act.assignedTo} • Deadline: {act.dueDate}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleToggleActionStatus(act)}
                      variant="ghost"
                      size="sm"
                      className={`h-7 px-2.5 text-xs ${
                        act.status === "voltooid"
                          ? "text-emerald-600 bg-emerald-500/10"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {act.status === "voltooid" ? <CheckCircle className="w-3.5 h-3.5 mr-1" /> : null}
                      {act.status === "voltooid" ? "Voltooid" : "Afvinken"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: VERGADERINGEN & ALV */}
      {activeSubTab === "vergaderingen" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-foreground">ALV & Bestuursvergaderingen</h3>
              <p className="text-xs text-muted-foreground">
                Voorbereiding, agendabeheer, uitnodigingen en formele verslaglegging conform Kennispunt-standaarden.
              </p>
            </div>
            <Button
              onClick={() => setIsMeetingDialogOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Vergadering Plannen
            </Button>
          </div>

          <div className="space-y-4">
            {meetings.map((m) => (
              <div
                key={m.id}
                className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4 hover:border-indigo-500/30 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/80 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          m.type === "ALV"
                            ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
                            : "bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                        }`}
                      >
                        {m.type}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          m.status === "afgerond"
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                            : m.status === "geagendeerd"
                            ? "bg-blue-500/20 text-blue-700 dark:text-blue-400"
                            : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-foreground">{m.title}</h4>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        {m.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        {m.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        {m.location}
                      </span>
                      {m.attendeesCount !== undefined && m.attendeesCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          {m.attendeesCount} aanwezigen
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => {
                        setSelectedMeetingForMinutes(m);
                        setMinutesText(m.minutes || "");
                        setDecisionsText((m.decisions || []).join("\n"));
                        setMeetingStatus(m.status);
                        setIsMinutesDialogOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Notulen & Besluiten
                    </Button>
                  </div>
                </div>

                {/* Agenda Items */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Vastgestelde Agenda
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(m.agenda || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-xl bg-muted/40 border border-border/60 text-xs text-foreground flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notulen weergave indien ingevuld */}
                {m.minutes && (
                  <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Vastgesteld Verslag / Notulen
                    </h5>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {m.minutes}
                    </p>
                  </div>
                )}

                {/* Besluitenlijst */}
                {m.decisions && m.decisions.length > 0 && (
                  <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Formele Besluitenlijst (Bekrachtigd)
                    </h5>
                    <ul className="space-y-1">
                      {m.decisions.map((dec, didx) => (
                        <li
                          key={didx}
                          className="text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {dec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ACTIELIJST & OPVOLGING */}
      {activeSubTab === "actielijst" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-foreground">Actielijst & Besluitenopvolging</h3>
              <p className="text-xs text-muted-foreground">
                Bewaak dat besluiten en acties na elke bestuurs- of ledenvergadering tijdig worden uitgevoerd.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/api/secretary/export/actions"
                download
                className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export CSV
              </a>
              <Button
                onClick={() => setIsActionDialogOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nieuw Actiepunt
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2">
            {(["all", "open", "voltooid"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActionFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  actionFilter === filter
                    ? "bg-purple-600 text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {filter === "all" ? "Alle Acties" : filter === "open" ? "Openstaand" : "Voltooid"}
              </button>
            ))}
          </div>

          {/* Actiepunten Tabel / Cards */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-border">
              {filteredActions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Geen actiepunten gevonden.</div>
              ) : (
                filteredActions.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            act.priority === "hoog"
                              ? "bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                              : act.priority === "normaal"
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          Prioriteit: {act.priority}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          Vergadering: {act.meetingTitle}
                        </span>
                      </div>
                      <h4
                        className={`text-sm sm:text-base font-bold ${
                          act.status === "voltooid" ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {act.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-purple-500" />
                          Verantwoordelijke: <strong className="text-foreground">{act.assignedTo}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-purple-500" />
                          Deadline: {act.dueDate}
                        </span>
                        {act.completedAt && (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Afgerond op: {act.completedAt}
                          </span>
                        )}
                      </div>
                      {act.notes && (
                        <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/60">
                          {act.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        onClick={() => handleToggleActionStatus(act)}
                        variant={act.status === "voltooid" ? "outline" : "default"}
                        size="sm"
                        className={
                          act.status === "voltooid"
                            ? "border-emerald-500/40 text-emerald-600 hover:bg-emerald-50"
                            : "bg-purple-600 hover:bg-purple-700 text-white"
                        }
                      >
                        {act.status === "voltooid" ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            Heropenen
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            Afronden
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleDeleteAction(act.id)}
                        variant="ghost"
                        size="sm"
                        className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: WETTELIJKE VERPLICHTINGEN & COMPLIANCE */}
      {activeSubTab === "compliance" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-foreground">Wettelijke Verplichtingen & Governance Dossier</h3>
            <p className="text-xs text-muted-foreground">
              Toetsing van de 5 wettelijke verplichtingen voor politieke partijen conform de Kennispunt-richtlijn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. KvK-inschrijving */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">1. Inschrijving Kamer van Koophandel</h4>
                    <span className="text-xs text-muted-foreground">Wettelijke registratie handelsregister</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Actueel
                </span>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span>KvK Nummer:</span>
                  <strong className="text-foreground">{compliance.kvk?.kvkNumber || "08194821"}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span>Statutaire zetel:</span>
                  <strong className="text-foreground">{compliance.kvk?.statutorySeat || "Steenwijkerland"}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span>Laatste mutatie bestuur:</span>
                  <strong className="text-foreground">{compliance.kvk?.lastMutationDate || "2026-04-10"}</strong>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Geregistreerde bevoegde bestuurders:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {(compliance.kvk?.boardMembersRegistered || []).map((bm, i) => (
                    <li key={i}>{bm}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 2. WBTR */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">2. WBTR Compliance (sinds 2021)</h4>
                    <span className="text-xs text-muted-foreground">Wet bestuur en toezicht rechtspersonen</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Conform
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Tegenstrijdig belang regeling statutair vastgelegd</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Belet- en ontstentenisregeling in statuten opgenomen</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Meervoudig stemrecht begrensd conform wettelijke eis</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Bestuursaansprakelijkheidsverzekering actief</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border/60">
                {compliance.wbtr?.notes || "Statuten en reglementen voldoen volledig aan de WBTR eisen."}
              </p>
            </div>

            {/* 3. UBO-register */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">3. UBO-Register (sinds maart 2022)</h4>
                    <span className="text-xs text-muted-foreground">Uiteindelijke belanghebbenden registratie</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Gevalideerd
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Verenigingen zijn wettelijk verplicht om hun UBO's (hoger leidinggevend personeel / bestuurders) in te
                schrijven in het UBO-register van de Kamer van Koophandel.
              </p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span>Eerste registratiedatum:</span>
                  <strong className="text-foreground">{compliance.ubo?.registrationDate || "2022-03-24"}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span>Laatste verificatie:</span>
                  <strong className="text-foreground">{compliance.ubo?.lastVerificationDate || "2026-03-10"}</strong>
                </div>
              </div>
            </div>

            {/* 4. AVG / Privacy & 5. Giftenreglement */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">4. AVG & 5. Openbaar Giftenreglement</h4>
                    <span className="text-xs text-muted-foreground">Ledenprivacy & integriteit</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Geborgd
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Privacyverklaring gepubliceerd conform AVG</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Register van verwerkingsactiviteiten ledenadministratie</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Openbaar giftenreglement vastgesteld door de ALV (wettelijke eis raadsfractie)</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border/60">
                Ledenadministratie is afgeschermd met strikte bewaartermijnen en toegangscontrole.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: INKOMENDE CONTACTBERICHTEN (VERHUISD) */}
      {activeSubTab === "berichten" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-foreground">Correspondentie & Inkomende Berichten</h3>
              <p className="text-xs text-muted-foreground">
                Centraal aanspreekpunt voor inwoners en leden. Berichten beantwoorden of doorzetten naar de fractie.
              </p>
            </div>
            {/* Filter buttons */}
            <div className="flex items-center gap-2">
              {(["all", "open", "handled"] as const).map((fil) => (
                <button
                  key={fil}
                  onClick={() => setMessageFilter(fil)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    messageFilter === fil
                      ? "bg-indigo-600 text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {fil === "all" ? "Alle Berichten" : fil === "open" ? "Moet nog beantwoord" : "Afgehandeld"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Linker kolom: Lijst */}
            <div className="lg:col-span-5 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  placeholder="Zoek op naam, e-mail of onderwerp..."
                  className="pl-9 h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredMessages.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-xs bg-card border rounded-xl">
                    Geen berichten gevonden.
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const isSelected = selectedMessage?.id === msg.id;
                    const isOpen = msg.status === "moet nog beantwoord worden";
                    return (
                      <div
                        key={msg.id}
                        onClick={() => {
                          setSelectedMessage(msg);
                          setMessageNotes(msg.notes || "");
                        }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-sm"
                            : "bg-card border-border hover:border-indigo-400/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-xs text-foreground truncate">{msg.name}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOpen
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                            }`}
                          >
                            {isOpen ? "Open" : "Afgehandeld"}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-foreground truncate">
                          {msg.subject || "Geen onderwerp"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.message}</p>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                          <span>{msg.wijkNaam || "Steenwijkerland"}</span>
                          <span>{new Date(msg.createdAt).toLocaleDateString("nl-NL")}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Rechter kolom: Detailweergave */}
            <div className="lg:col-span-7">
              {selectedMessage ? (
                <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 pb-4">
                    <div>
                      <span className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">
                        {selectedMessage.wijkNaam ? `Wijk: ${selectedMessage.wijkNaam}` : "Inwonerbericht"}
                      </span>
                      <h4 className="text-xl font-bold text-foreground mt-0.5">
                        {selectedMessage.subject || "Contactbericht"}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ontvangen op: {new Date(selectedMessage.createdAt).toLocaleString("nl-NL")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleToggleMessageStatus(selectedMessage)}
                        disabled={isUpdatingMessage}
                        size="sm"
                        className={
                          selectedMessage.status === "afgehandeld"
                            ? "bg-amber-600 hover:bg-amber-700 text-white text-xs"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        }
                      >
                        {selectedMessage.status === "afgehandeld" ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            Markeer als Onbeantwoord
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            Markeer als Afgehandeld
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleDeleteMessage(selectedMessage.id)}
                        variant="ghost"
                        size="sm"
                        className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Contactgegevens afzender */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-muted/40 border border-border/60 text-xs">
                    <div>
                      <span className="text-muted-foreground">Naam afzender:</span>
                      <p className="font-bold text-foreground">{selectedMessage.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">E-mailadres:</span>
                      <p className="font-bold text-foreground">
                        <a
                          href={`mailto:${selectedMessage.email}?subject=Reactie Lijst van Andel: ${encodeURIComponent(
                            selectedMessage.subject || ""
                          )}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          {selectedMessage.email} <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    </div>
                    {selectedMessage.phone && (
                      <div>
                        <span className="text-muted-foreground">Telefoonnummer:</span>
                        <p className="font-bold text-foreground">
                          <a href={`tel:${selectedMessage.phone}`} className="text-indigo-600 hover:underline">
                            {selectedMessage.phone}
                          </a>
                        </p>
                      </div>
                    )}
                    {selectedMessage.handledBy && (
                      <div>
                        <span className="text-muted-foreground">Afgehandeld door:</span>
                        <p className="font-bold text-emerald-600">{selectedMessage.handledBy}</p>
                      </div>
                    )}
                  </div>

                  {/* Berichtinhoud */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Bericht van inwoner
                    </h5>
                    <div className="p-4 rounded-xl bg-card border border-border text-sm text-foreground leading-relaxed whitespace-pre-line">
                      {selectedMessage.message}
                    </div>
                  </div>

                  {/* Interne secretaris notities */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                        Interne Notities & Afstemming Fractie
                      </h5>
                      <Button
                        onClick={handleSaveMessageNotes}
                        disabled={isUpdatingMessage}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                      >
                        Notitie Opslaan
                      </Button>
                    </div>
                    <Textarea
                      value={messageNotes}
                      onChange={(e) => setMessageNotes(e.target.value)}
                      placeholder="Bijv. Doorgezet naar fractielid Stef Mars voor raadsvragen over het buitengebied..."
                      className="text-xs min-h-[90px] rounded-xl"
                    />
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/80">
                    <a
                      href={`mailto:${selectedMessage.email}?subject=Reactie Lijst van Andel: ${encodeURIComponent(
                        selectedMessage.subject || "Uw bericht"
                      )}`}
                      className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Direct Beantwoorden per E-mail
                    </a>
                    {selectedMessage.phone && (
                      <a
                        href={`tel:${selectedMessage.phone}`}
                        className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
                      >
                        <Phone className="w-3.5 h-3.5 mr-1.5" />
                        Bellen
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border p-12 rounded-2xl text-center text-muted-foreground text-sm">
                  Selecteer een bericht uit de lijst om de details te bekijken en te beantwoorden.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: BELAFSPRAKEN (VERHUISD) */}
      {activeSubTab === "belafspraken" && (
        <div className="space-y-6">
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 p-4 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h4 className="font-bold text-sm text-foreground">Inwoners Belafspraken & Terugbelverzoeken</h4>
                <p className="text-xs text-muted-foreground">
                  Beheer van telefonische afspraken tussen kiezers/leden en raads- of bestuursleden.
                </p>
              </div>
            </div>
          </div>
          <BelafsprakenManager token={token} headers={headers} />
        </div>
      )}

      {/* SUB-TAB 7: PARTIJARCHIEF & DOCUMENTEN (VERHUISD) */}
      {activeSubTab === "archief" && (
        <div className="space-y-6">
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 p-4 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FolderKanban className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h4 className="font-bold text-sm text-foreground">Digitaal Partijarchief & Documentenkluis</h4>
                <p className="text-xs text-muted-foreground">
                  Statuten, huishoudelijk reglement, ALV-stukken, bestuursnotulen en vertrouwelijke partijdocumenten
                  (Kennispunt Lokale Politieke Partijen p. 3).
                </p>
              </div>
            </div>
          </div>
          <DocumentManager token={token} currentUser={currentUser} />
        </div>
      )}

      {/* SUB-TAB 8: VERKIEZINGSVOORBEREIDING, COMMISSIES & VACATURES (VERHUISD) */}
      {activeSubTab === "verkiezingen" && (
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold text-foreground">Verkiezingsvoorbereiding, Commissies & Scouting</h3>
            <p className="text-xs text-muted-foreground">
              Evaluatie eerdere campagnes, programmacommissie, kandidaatstellingscommissie en werving van vrijwilligers.
            </p>
          </div>

          {/* Drie Kennispunt Verkiezingszuilen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Campagne Evaluatie */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                1. Campagne-evaluatie & Leerpunten
              </div>
              <p className="text-xs text-muted-foreground">
                Vastgelegde leerpunten van de gemeenteraadsverkiezingen:
              </p>
              <ul className="space-y-1.5 text-xs text-foreground">
                {(elections.campaignEvaluation?.keyLearnings || []).map((kl, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                    <span className="text-indigo-500 font-bold">•</span>
                    <span>{kl}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-border text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                Focus komende periode: {elections.campaignEvaluation?.focusAreasNextElection}
              </div>
            </div>

            {/* 2. Programmacommissie */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
                <BookOpen className="w-4 h-4" />
                2. Programmacommissie
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-bold text-purple-600">{elections.programCommittee?.status}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-border/60 pb-1">
                <span className="text-muted-foreground">Commissievoorzitter:</span>
                <strong className="text-foreground">{elections.programCommittee?.lead}</strong>
              </div>
              <div className="flex justify-between text-xs border-b border-border/60 pb-1">
                <span className="text-muted-foreground">Deadline concept:</span>
                <strong className="text-foreground">{elections.programCommittee?.deadlineDraft}</strong>
              </div>
              <div className="flex justify-between text-xs border-b border-border/60 pb-1">
                <span className="text-muted-foreground">Vaststelling ALV:</span>
                <strong className="text-foreground">{elections.programCommittee?.alvAdoptionDate}</strong>
              </div>
              <p className="text-xs text-muted-foreground">{elections.programCommittee?.notes}</p>
            </div>

            {/* 3. Kandidaatstellingscommissie */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <Users className="w-4 h-4" />
                3. Kandidaatstelling & Kiesraad
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-bold text-emerald-600">{elections.candidateCommittee?.status}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-border/60 pb-1">
                <span className="text-muted-foreground">Voorzitter scouting:</span>
                <strong className="text-foreground">{elections.candidateCommittee?.lead}</strong>
              </div>
              <div className="flex justify-between text-xs border-b border-border/60 pb-1">
                <span className="text-muted-foreground">Gespreksperiode:</span>
                <strong className="text-foreground">{elections.candidateCommittee?.interviewPeriod}</strong>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-600 pt-1">
                <CheckCircle className="w-4 h-4" />
                <span>Kiesraad formaliteiten (model H1/Y) geborgd</span>
              </div>
            </div>
          </div>

          {/* Vrijwilligers & Vacaturebeheer */}
          <div className="space-y-4">
            <div className="border-t border-border pt-6">
              <h4 className="font-bold text-lg text-foreground mb-1">
                Werving Vrijwilligers, Commissieleden & Vacatures
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                Beheer van partijfuncties en binnengekomen aanmeldingen van enthousiaste leden en vrijwilligers.
              </p>
            </div>
            <VacancyManager />
          </div>
        </div>
      )}

      {/* DIALOG 1: NIEUWE VERGADERING PLANNEN */}
      <Dialog open={isMeetingDialogOpen} onOpenChange={setIsMeetingDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Vergadering Uitschrijven</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Plan een Algemene Ledenvergadering (ALV) of maandelijkse bestuursvergadering conform de partijstatuten.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMeeting} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-foreground">Vergaderingstype</label>
              <select
                value={meetingForm.type}
                onChange={(e) => setMeetingForm({ ...meetingForm, type: e.target.value as any })}
                className="w-full mt-1 p-2 rounded-xl border bg-background text-foreground text-xs"
              >
                <option value="ALV">Algemene Ledenvergadering (ALV)</option>
                <option value="Bestuursvergadering">Bestuursvergadering</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground">Titel van de bijeenkomst</label>
              <Input
                value={meetingForm.title}
                onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                placeholder="Bijv. Algemene Ledenvergadering Najaar 2026"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-foreground">Datum</label>
                <Input
                  type="date"
                  value={meetingForm.date}
                  onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground">Tijdstip</label>
                <Input
                  value={meetingForm.time}
                  onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })}
                  placeholder="19:30 - 22:00"
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground">Locatie</label>
              <Input
                value={meetingForm.location}
                onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                placeholder="Dorpshuis of zaal in Steenwijkerland"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground">Concept Agendapunten (één per regel)</label>
              <Textarea
                value={meetingForm.agendaText}
                onChange={(e) => setMeetingForm({ ...meetingForm, agendaText: e.target.value })}
                rows={5}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsMeetingDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Vergadering Inplannen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: NOTULEN EN BESLUITENLIJST BEWERKEN */}
      <Dialog open={isMinutesDialogOpen} onOpenChange={setIsMinutesDialogOpen}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Notulen & Besluiten Vastleggen</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tip uit Kennispunt-handreiking: werk de notulen zo snel mogelijk na afloop uit zodat alles vers in het
              geheugen ligt en stuur ze door naar de aanwezigen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-foreground">Status van de vergadering</label>
              <select
                value={meetingStatus}
                onChange={(e) => setMeetingStatus(e.target.value as any)}
                className="w-full mt-1 p-2 rounded-xl border bg-background text-foreground text-xs"
              >
                <option value="voorbereiding">In voorbereiding</option>
                <option value="geagendeerd">Geagendeerd / Stukken verzonden</option>
                <option value="afgerond">Afgerond / Notulen bekrachtigd</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground">Uitgewerkte Notulen / Verslag</label>
              <Textarea
                value={minutesText}
                onChange={(e) => setMinutesText(e.target.value)}
                placeholder="Verslaglegging van de besprekingen, opkomst en stemmingen..."
                rows={6}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground">Formele Besluitenlijst (één besluit per regel)</label>
              <Textarea
                value={decisionsText}
                onChange={(e) => setDecisionsText(e.target.value)}
                placeholder="Bijv. Notulen ALV 2025 vastgesteld&#10;Decharge verleend aan het bestuur&#10;Contributie vastgesteld op € 12,-"
                rows={4}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsMinutesDialogOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleSaveMinutes} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Notulen Opslaan
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: NIEUW ACTIEPUNT TOEVOEGEN */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Nieuw Actiepunt Vastleggen</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Voeg een actiepunt toe aan de actielijst en wijs een verantwoordelijke toe met een concrete deadline.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAction} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-foreground">Omschrijving actiepunt</label>
              <Input
                value={actionForm.title}
                onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
                placeholder="Bijv. UBO-register verificatie indienen bij KvK"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-foreground">Verantwoordelijke</label>
                <Input
                  value={actionForm.assignedTo}
                  onChange={(e) => setActionForm({ ...actionForm, assignedTo: e.target.value })}
                  placeholder="Naam bestuurs- of raadslid"
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground">Deadline</label>
                <Input
                  type="date"
                  value={actionForm.dueDate}
                  onChange={(e) => setActionForm({ ...actionForm, dueDate: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-foreground">Gekoppeld aan vergadering</label>
                <Input
                  value={actionForm.meetingTitle}
                  onChange={(e) => setActionForm({ ...actionForm, meetingTitle: e.target.value })}
                  placeholder="Bijv. ALV Voorjaar 2026"
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground">Prioriteit</label>
                <select
                  value={actionForm.priority}
                  onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value as any })}
                  className="w-full mt-1 p-2 rounded-xl border bg-background text-foreground text-xs"
                >
                  <option value="hoog">Hoog</option>
                  <option value="normaal">Normaal</option>
                  <option value="laag">Laag</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground">Extra toelichting of instructies</label>
              <Textarea
                value={actionForm.notes}
                onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
                placeholder="Achtergrondinformatie of benodigde documenten..."
                rows={3}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsActionDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                Actiepunt Toevoegen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
