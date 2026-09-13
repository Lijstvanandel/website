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
  const [dailyBoard, setDailyBoard] = useState<any>(null);
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

  // Daily Board Edit Dialog
  const [isDailyBoardDialogOpen, setIsDailyBoardDialogOpen] = useState(false);
  const [dailyBoardForm, setDailyBoardForm] = useState<any>(null);

  // Yearcycle Edit Dialog
  const [isYearcycleDialogOpen, setIsYearcycleDialogOpen] = useState(false);
  const [yearcycleForm, setYearcycleForm] = useState<{
    quarter: string;
    title: string;
    period: string;
    status: "afgerond" | "actief" | "gepland";
    items: string[];
    newItemText: string;
  }>({
    quarter: "Q1",
    title: "",
    period: "",
    status: "gepland",
    items: [],
    newItemText: ""
  });

  // Compliance Edit Dialog
  const [isComplianceDialogOpen, setIsComplianceDialogOpen] = useState(false);
  const [complianceForm, setComplianceForm] = useState<SecretaryCompliance>({});
  const [newBoardMemberInput, setNewBoardMemberInput] = useState("");

  // Elections Edit Dialog
  const [isElectionsDialogOpen, setIsElectionsDialogOpen] = useState(false);
  const [electionsForm, setElectionsForm] = useState<SecretaryElections>({});
  const [newLearningInput, setNewLearningInput] = useState("");

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
        if (data.dailyBoard) setDailyBoard(data.dailyBoard);
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

  // Handle Daily Board
  const handleOpenEditDailyBoard = () => {
    setDailyBoardForm(dailyBoard || {
      partyName: "Lijst van Andel",
      boardTitle: "Bestuur",
      boardSubtitle: "Statutaire taakverdeling en wisselwerking binnen het dagelijks bestuur conform verenigingsrecht en de WBTR.",
      status: "Bestuur Compleet & Operationeel",
      chairman: {
        title: "Partijvoorzitter",
        name: "Sammy van Andel",
        description: "Leidt ALV en bestuursvergaderingen, bewaakt fractierelatie via 5 instrumenten, stuurt commissies aan en is het gezicht naar buiten.",
        badge: "Voorzitterspaneel"
      },
      secretary: {
        title: "Secretaris",
        name: "Anja ter Horst",
        description: "Verantwoordelijk voor correspondentie, notulering ALV, ledenadministratie, KvK/WBTR-formaliteiten en het partijarchief.",
        badge: "Eigen beveiligd Secretarispaneel"
      },
      treasurer: {
        title: "Penningmeester",
        name: "Stef Mars",
        description: "Beheert begroting, kasboek, contributie-inning via Stripe/SEPA, giftenregister en verantwoording naar de kascommissie.",
        badge: "Eigen beveiligd Penningmeesterpaneel"
      }
    });
    setIsDailyBoardDialogOpen(true);
  };

  const handleSaveDailyBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth("/api/chairman/daily-board", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(dailyBoardForm)
      });
      if (res.ok) {
        const resp = await res.json();
        setDailyBoard(resp.dailyBoard || dailyBoardForm);
        setIsDailyBoardDialogOpen(false);
        toast.success("Bestuurssamenstelling succesvol bijgewerkt");
      } else {
        toast.error("Fout bij opslaan bestuur");
      }
    } catch {
      toast.error("Verbindingsfout bij opslaan bestuur");
    }
  };

  // Handle Yearcycle Quarter Edit
  const handleOpenEditQuarter = (q: SecretaryYearcycleItem) => {
    setYearcycleForm({
      quarter: q.quarter,
      title: q.title,
      period: q.period,
      status: q.status,
      items: [...q.items],
      newItemText: ""
    });
    setIsYearcycleDialogOpen(true);
  };

  const handleSaveYearcycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearcycleForm.quarter) return;
    try {
      const res = await fetchWithAuth(`/api/secretary/yearcycle/${yearcycleForm.quarter}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          status: yearcycleForm.status,
          title: yearcycleForm.title,
          items: yearcycleForm.items
        })
      });
      if (res.ok) {
        const resp = await res.json();
        setYearcycle(resp.yearcycle || yearcycle.map(y => y.quarter === yearcycleForm.quarter ? { ...y, ...yearcycleForm } : y));
        setIsYearcycleDialogOpen(false);
        toast.success(`Jaarcyclus ${yearcycleForm.quarter} succesvol bijgewerkt`);
      } else {
        toast.error("Fout bij opslaan jaarcyclus");
      }
    } catch {
      toast.error("Verbindingsfout bij bijwerken jaarcyclus");
    }
  };

  // Handle Compliance Dossier Edit
  const handleOpenEditCompliance = () => {
    setComplianceForm({
      kvk: {
        kvkNumber: compliance.kvk?.kvkNumber || "08194821",
        associationName: compliance.kvk?.associationName || "Lijst van Andel",
        statutorySeat: compliance.kvk?.statutorySeat || "Steenwijkerland",
        lastMutationDate: compliance.kvk?.lastMutationDate || "2026-04-10",
        status: compliance.kvk?.status || "Actueel",
        boardMembersRegistered: [...(compliance.kvk?.boardMembersRegistered || ["Sammy van Andel (Voorzitter)", "Anja ter Horst (Secretaris)", "Stef Mars (Penningmeester)"])]
      },
      wbtr: {
        compliant: compliance.wbtr?.compliant !== false,
        tegenstrijdigBelangRegeling: compliance.wbtr?.tegenstrijdigBelangRegeling !== false,
        beletEnOntstentenisRegeling: compliance.wbtr?.beletEnOntstentenisRegeling !== false,
        meervoudigStemrechtBeperkt: compliance.wbtr?.meervoudigStemrechtBeperkt !== false,
        aansprakelijkheidsverzekeringBestuur: compliance.wbtr?.aansprakelijkheidsverzekeringBestuur !== false,
        notes: compliance.wbtr?.notes || "Statuten en reglementen voldoen volledig aan de WBTR eisen conform model Kennispunt."
      },
      ubo: {
        registered: compliance.ubo?.registered !== false,
        registrationDate: compliance.ubo?.registrationDate || "2022-03-24",
        lastVerificationDate: compliance.ubo?.lastVerificationDate || "2026-03-10",
        status: compliance.ubo?.status || "Gevalideerd"
      },
      avg: {
        compliant: compliance.avg?.compliant !== false,
        privacyStatementPublished: compliance.avg?.privacyStatementPublished !== false,
        processingRegisterActive: compliance.avg?.processingRegisterActive !== false,
        notes: compliance.avg?.notes || "Ledenadministratie is afgeschermd met strikte bewaartermijnen en toegangscontrole."
      },
      giftenreglement: {
        publishedOnWebsite: compliance.giftenreglement?.publishedOnWebsite !== false,
        adoptedByAlv: compliance.giftenreglement?.adoptedByAlv !== false,
        publicationUrl: compliance.giftenreglement?.publicationUrl || "/documenten/giftenreglement",
        notes: compliance.giftenreglement?.notes || "Openbaar giftenreglement conform wetgeving politieke partijen en gemeenteraad."
      }
    });
    setIsComplianceDialogOpen(true);
  };

  const handleSaveCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth("/api/secretary/compliance", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(complianceForm)
      });
      if (res.ok) {
        const resp = await res.json();
        setCompliance(resp.compliance || complianceForm);
        setIsComplianceDialogOpen(false);
        toast.success("Wettelijk compliance dossier succesvol bijgewerkt");
      } else {
        toast.error("Fout bij opslaan compliance dossier");
      }
    } catch {
      toast.error("Verbindingsfout bij opslaan compliance dossier");
    }
  };

  // Handle Elections Edit
  const handleOpenEditElections = () => {
    setElectionsForm({
      campaignEvaluation: {
        previousResult: elections.campaignEvaluation?.previousResult || "3 zetels in de gemeenteraad Steenwijkerland",
        keyLearnings: [...(elections.campaignEvaluation?.keyLearnings || [
          "Vroegtijdige start van de wijkbezoeken en kernengesprekken",
          "Sterk lokaal sociaal en groen profiel met duidelijke actiepunten",
          "Transparante communicatie via digitaal ledenportaal"
        ])],
        focusAreasNextElection: elections.campaignEvaluation?.focusAreasNextElection || "Zichtbaarheid in buitengebieden, jongerenparticipatie en versterking ledenbasis"
      },
      programCommittee: {
        status: elections.programCommittee?.status || "Actief",
        lead: elections.programCommittee?.lead || "Commissievoorzitter Sammy van Andel",
        deadlineDraft: elections.programCommittee?.deadlineDraft || "15 november 2025",
        alvAdoptionDate: elections.programCommittee?.alvAdoptionDate || "12 januari 2026",
        notes: elections.programCommittee?.notes || "Thematische werkgroepen voor wonen, duurzaamheid en lokale voorzieningen geformeerd."
      },
      candidateCommittee: {
        status: elections.candidateCommittee?.status || "Gesprekken gaande",
        lead: elections.candidateCommittee?.lead || "Anja ter Horst (Secretaris)",
        interviewPeriod: elections.candidateCommittee?.interviewPeriod || "September - December 2025",
        kiesraadDeadlinesChecked: elections.candidateCommittee?.kiesraadDeadlinesChecked !== false,
        notes: elections.candidateCommittee?.notes || "Scoutingprofielen opgesteld conform statuten; formele Kiesraad formulieren gereed."
      }
    });
    setIsElectionsDialogOpen(true);
  };

  const handleSaveElections = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth("/api/secretary/elections", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(electionsForm)
      });
      if (res.ok) {
        const resp = await res.json();
        setElections(resp.elections || electionsForm);
        setIsElectionsDialogOpen(false);
        toast.success("Verkiezingsvoorbereiding en commissies succesvol bijgewerkt");
      } else {
        toast.error("Fout bij opslaan verkiezingen");
      }
    } catch {
      toast.error("Verbindingsfout bij bijwerken verkiezingen");
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
          {/* Statutair Dagelijks Bestuur & Rolbeheer */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {dailyBoard?.boardTitle || "Bestuur"}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {dailyBoard?.status || "Bestuur Compleet & Operationeel"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dailyBoard?.boardSubtitle || "Statutaire taakverdeling en wisselwerking binnen het dagelijks bestuur conform verenigingsrecht en de WBTR."}
                </p>
              </div>
              <Button
                onClick={handleOpenEditDailyBoard}
                variant="outline"
                size="sm"
                className="gap-1.5 border-indigo-200 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Pencil className="w-3.5 h-3.5" />
                Bestuurssamenstelling Wijzigen
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Voorzitter */}
              <div className="p-4 rounded-xl border border-border bg-muted/30 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {dailyBoard?.chairman?.title || "Partijvoorzitter"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                      {dailyBoard?.chairman?.badge || "Voorzitterspaneel"}
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-foreground mt-1">
                    {dailyBoard?.chairman?.name || "Sammy van Andel"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {dailyBoard?.chairman?.description || "Leidt ALV en bestuursvergaderingen, bewaakt fractierelatie via 5 instrumenten, stuurt commissies aan en is het gezicht naar buiten."}
                  </p>
                </div>
              </div>

              {/* Secretaris */}
              <div className="p-4 rounded-xl border-2 border-indigo-500/40 bg-indigo-50/30 dark:bg-indigo-950/20 flex flex-col justify-between space-y-3 shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {dailyBoard?.secretary?.title || "Secretaris"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                      U bevindt zich hier
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-foreground mt-1">
                    {dailyBoard?.secretary?.name || "Anja ter Horst"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {dailyBoard?.secretary?.description || "Verantwoordelijk voor correspondentie, notulering ALV, ledenadministratie, KvK/WBTR-formaliteiten en het partijarchief."}
                  </p>
                </div>
              </div>

              {/* Penningmeester */}
              <div className="p-4 rounded-xl border border-border bg-muted/30 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {dailyBoard?.treasurer?.title || "Penningmeester"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      {dailyBoard?.treasurer?.badge || "Eigen Penningmeesterpaneel"}
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-foreground mt-1">
                    {dailyBoard?.treasurer?.name || "Stef Mars"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {dailyBoard?.treasurer?.description || "Beheert begroting, kasboek, contributie-inning via Stripe/SEPA, giftenregister en verantwoording naar de kascommissie."}
                  </p>
                </div>
              </div>
            </div>
          </div>

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
                  Vaste kwartaalindeling voor verantwoording aan de leden, begroting en partijdemocratie. Klik op een kwartaal om te bewerken.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                  Huidig Kwartaal: Q3 (Voorbereiding & Scouting)
                </span>
                <Button
                  onClick={() => handleOpenEditQuarter(yearcycle[0] || { quarter: "Q1", title: "", period: "", status: "gepland", items: [] })}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-indigo-200 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Kwartaal Aanpassen
                </Button>
              </div>
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

                    <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleOpenEditQuarter(q)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        Kwartaal Bewerken
                      </button>
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-foreground">Wettelijke Verplichtingen & Governance Dossier</h3>
              <p className="text-xs text-muted-foreground">
                Toetsing van de 5 wettelijke verplichtingen voor politieke partijen conform de Kennispunt-richtlijn.
              </p>
            </div>
            <Button
              onClick={handleOpenEditCompliance}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Pencil className="w-4 h-4" />
              Compliance Dossier Bewerken
            </Button>
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {compliance.kvk?.status || "Actueel"}
                  </span>
                  <button
                    onClick={handleOpenEditCompliance}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="KvK dossier bewerken"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    Conform
                  </span>
                  <button
                    onClick={handleOpenEditCompliance}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="WBTR dossier bewerken"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {compliance.ubo?.status || "Gevalideerd"}
                  </span>
                  <button
                    onClick={handleOpenEditCompliance}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="UBO registratie bewerken"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    Geborgd
                  </span>
                  <button
                    onClick={handleOpenEditCompliance}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="AVG & Giftenreglement bewerken"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                {compliance.avg?.notes || "Ledenadministratie is afgeschermd met strikte bewaartermijnen en toegangscontrole."}
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-foreground">Verkiezingsvoorbereiding, Commissies & Scouting</h3>
              <p className="text-xs text-muted-foreground">
                Evaluatie eerdere campagnes, programmacommissie, kandidaatstellingscommissie en werving van vrijwilligers.
              </p>
            </div>
            <Button
              onClick={handleOpenEditElections}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Pencil className="w-4 h-4" />
              Verkiezingspijlers & Commissies Bewerken
            </Button>
          </div>

          {/* Drie Kennispunt Verkiezingszuilen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Campagne Evaluatie */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    1. Campagne-evaluatie & Leerpunten
                  </div>
                  <button
                    onClick={handleOpenEditElections}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Campagne evaluatie bewerken"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
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
              </div>
              <div className="pt-2 border-t border-border text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                Focus komende periode: {elections.campaignEvaluation?.focusAreasNextElection}
              </div>
            </div>

            {/* 2. Programmacommissie */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
                    <BookOpen className="w-4 h-4" />
                    2. Programmacommissie
                  </div>
                  <button
                    onClick={handleOpenEditElections}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Programmacommissie bewerken"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
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
              </div>
              <p className="text-xs text-muted-foreground pt-1 border-t border-border/60">{elections.programCommittee?.notes}</p>
            </div>

            {/* 3. Kandidaatstellingscommissie */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <Users className="w-4 h-4" />
                    3. Kandidaatstelling & Kiesraad
                  </div>
                  <button
                    onClick={handleOpenEditElections}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Kandidaatstellingscommissie bewerken"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
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
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-600 pt-2 border-t border-border/60">
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

      {/* DIALOG 4: DAGELIJKS BESTUUR & TAAKVERDELING BEWERKEN */}
      <Dialog open={isDailyBoardDialogOpen} onOpenChange={setIsDailyBoardDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Dagelijks Bestuur & Rolbeheer</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Beheer de statutaire taakverdeling, functies en profielen binnen het dagelijks bestuur conform verenigingsrecht en de WBTR.
            </DialogDescription>
          </DialogHeader>
          {dailyBoardForm && (
            <form onSubmit={handleSaveDailyBoard} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-muted/40 rounded-xl border border-border/70">
                <div>
                  <label className="font-semibold text-foreground">Bestuurstitel</label>
                  <Input
                    value={dailyBoardForm.boardTitle || ""}
                    onChange={(e) => setDailyBoardForm({ ...dailyBoardForm, boardTitle: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Bestuursstatus</label>
                  <Input
                    value={dailyBoardForm.status || ""}
                    onChange={(e) => setDailyBoardForm({ ...dailyBoardForm, status: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="font-semibold text-foreground">Subtitel / Wettelijk Kader</label>
                  <Input
                    value={dailyBoardForm.boardSubtitle || ""}
                    onChange={(e) => setDailyBoardForm({ ...dailyBoardForm, boardSubtitle: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              {/* Voorzitter */}
              <div className="p-3.5 border border-border rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">1. Partijvoorzitter</span>
                  <span className="text-[11px] text-muted-foreground">Leiding & fractierelatie</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-medium">Naam</label>
                    <Input
                      value={dailyBoardForm.chairman?.name || ""}
                      onChange={(e) => setDailyBoardForm({
                        ...dailyBoardForm,
                        chairman: { ...dailyBoardForm.chairman, name: e.target.value }
                      })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-medium">Functiebadge</label>
                    <Input
                      value={dailyBoardForm.chairman?.badge || ""}
                      onChange={(e) => setDailyBoardForm({
                        ...dailyBoardForm,
                        chairman: { ...dailyBoardForm.chairman, badge: e.target.value }
                      })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-medium">Taakomschrijving</label>
                  <Textarea
                    value={dailyBoardForm.chairman?.description || ""}
                    onChange={(e) => setDailyBoardForm({
                      ...dailyBoardForm,
                      chairman: { ...dailyBoardForm.chairman, description: e.target.value }
                    })}
                    rows={2}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              {/* Secretaris */}
              <div className="p-3.5 border border-border rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">2. Secretaris</span>
                  <span className="text-[11px] text-muted-foreground">Organisatorische spil</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-medium">Naam</label>
                    <Input
                      value={dailyBoardForm.secretary?.name || ""}
                      onChange={(e) => setDailyBoardForm({
                        ...dailyBoardForm,
                        secretary: { ...dailyBoardForm.secretary, name: e.target.value }
                      })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-medium">Functiebadge</label>
                    <Input
                      value={dailyBoardForm.secretary?.badge || ""}
                      onChange={(e) => setDailyBoardForm({
                        ...dailyBoardForm,
                        secretary: { ...dailyBoardForm.secretary, badge: e.target.value }
                      })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-medium">Taakomschrijving</label>
                  <Textarea
                    value={dailyBoardForm.secretary?.description || ""}
                    onChange={(e) => setDailyBoardForm({
                      ...dailyBoardForm,
                      secretary: { ...dailyBoardForm.secretary, description: e.target.value }
                    })}
                    rows={2}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              {/* Penningmeester */}
              <div className="p-3.5 border border-border rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">3. Penningmeester</span>
                  <span className="text-[11px] text-muted-foreground">Financiën & kasbeheer</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-medium">Naam</label>
                    <Input
                      value={dailyBoardForm.treasurer?.name || ""}
                      onChange={(e) => setDailyBoardForm({
                        ...dailyBoardForm,
                        treasurer: { ...dailyBoardForm.treasurer, name: e.target.value }
                      })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-medium">Functiebadge</label>
                    <Input
                      value={dailyBoardForm.treasurer?.badge || ""}
                      onChange={(e) => setDailyBoardForm({
                        ...dailyBoardForm,
                        treasurer: { ...dailyBoardForm.treasurer, badge: e.target.value }
                      })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-medium">Taakomschrijving</label>
                  <Textarea
                    value={dailyBoardForm.treasurer?.description || ""}
                    onChange={(e) => setDailyBoardForm({
                      ...dailyBoardForm,
                      treasurer: { ...dailyBoardForm.treasurer, description: e.target.value }
                    })}
                    rows={2}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsDailyBoardDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Bestuurssamenstelling Opslaan
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: 1-JAARCYCLUS KWARTAAL BEWERKEN */}
      <Dialog open={isYearcycleDialogOpen} onOpenChange={setIsYearcycleDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Jaarcyclus Kwartaal Beheren</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pas de deadlines, status en de wettelijke checklist van het kwartaal aan conform de partijagenda.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveYearcycle} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground">Kwartaal Selecteren</label>
                <select
                  value={yearcycleForm.quarter}
                  onChange={(e) => {
                    const sel = yearcycle.find(y => y.quarter === e.target.value);
                    if (sel) {
                      setYearcycleForm({
                        quarter: sel.quarter,
                        title: sel.title,
                        period: sel.period,
                        status: sel.status,
                        items: [...sel.items],
                        newItemText: ""
                      });
                    } else {
                      setYearcycleForm({ ...yearcycleForm, quarter: e.target.value });
                    }
                  }}
                  className="w-full mt-1 p-2 rounded-xl border bg-background text-foreground text-xs"
                >
                  <option value="Q1">Q1: Jaarverantwoording & ALV (Jan - Mrt)</option>
                  <option value="Q2">Q2: Ledenraadpleging & Thema's (Apr - Jun)</option>
                  <option value="Q3">Q3: Voorbereiding & Scouting (Jul - Sep)</option>
                  <option value="Q4">Q4: Begroting & Najaars-ALV (Okt - Dec)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-foreground">Status</label>
                <select
                  value={yearcycleForm.status}
                  onChange={(e) => setYearcycleForm({ ...yearcycleForm, status: e.target.value as any })}
                  className="w-full mt-1 p-2 rounded-xl border bg-background text-foreground text-xs"
                >
                  <option value="gepland">Gepland</option>
                  <option value="actief">Actief (Lopend)</option>
                  <option value="afgerond">Afgerond</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground">Kwartaaltitel</label>
                <Input
                  value={yearcycleForm.title}
                  onChange={(e) => setYearcycleForm({ ...yearcycleForm, title: e.target.value })}
                  placeholder="Bijv. Q3: Voorbereiding & Scouting"
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground">Periode</label>
                <Input
                  value={yearcycleForm.period}
                  onChange={(e) => setYearcycleForm({ ...yearcycleForm, period: e.target.value })}
                  placeholder="Bijv. Jul - Sep"
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-2">
              <label className="font-semibold text-foreground">Checklist & Deadlines</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 bg-muted/30 rounded-xl border border-border">
                {yearcycleForm.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between gap-2 p-1.5 bg-card rounded-lg border border-border/60">
                    <span className="text-xs text-foreground flex-1">{item}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...yearcycleForm.items];
                        next.splice(index, 1);
                        setYearcycleForm({ ...yearcycleForm, items: next });
                      }}
                      className="text-rose-500 hover:text-rose-700 p-1"
                      title="Item verwijderen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {yearcycleForm.items.length === 0 && (
                  <p className="text-muted-foreground text-center py-2 text-xs">Geen acties in dit kwartaal</p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Input
                  value={yearcycleForm.newItemText}
                  onChange={(e) => setYearcycleForm({ ...yearcycleForm, newItemText: e.target.value })}
                  placeholder="Nieuwe deadline of statutaire taak..."
                  className="h-8 text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (yearcycleForm.newItemText.trim()) {
                        setYearcycleForm({
                          ...yearcycleForm,
                          items: [...yearcycleForm.items, yearcycleForm.newItemText.trim()],
                          newItemText: ""
                        });
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    if (yearcycleForm.newItemText.trim()) {
                      setYearcycleForm({
                        ...yearcycleForm,
                        items: [...yearcycleForm.items, yearcycleForm.newItemText.trim()],
                        newItemText: ""
                      });
                    }
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Toevoegen
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsYearcycleDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Kwartaal Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 6: COMPLIANCE DOSSIER BEWERKEN */}
      <Dialog open={isComplianceDialogOpen} onOpenChange={setIsComplianceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Wettelijk Compliance & Governance Dossier</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Werk de gegevens bij van KvK, WBTR, UBO-register, AVG privacy en het openbare giftenreglement conform Kennispunt.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCompliance} className="space-y-4 text-xs">
            {/* 1. KvK */}
            <div className="p-3.5 border border-border rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-600">
                <Building2 className="w-4 h-4" /> 1. Kamer van Koophandel (Handelsregister)
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>
                  <label className="font-medium">KvK Nummer</label>
                  <Input
                    value={complianceForm.kvk?.kvkNumber || ""}
                    onChange={(e) => setComplianceForm({
                      ...complianceForm,
                      kvk: { ...complianceForm.kvk, kvkNumber: e.target.value } as any
                    })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium">Statutaire Zetel</label>
                  <Input
                    value={complianceForm.kvk?.statutorySeat || ""}
                    onChange={(e) => setComplianceForm({
                      ...complianceForm,
                      kvk: { ...complianceForm.kvk, statutorySeat: e.target.value } as any
                    })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium">Laatste Bestuursmutatie</label>
                  <Input
                    type="date"
                    value={complianceForm.kvk?.lastMutationDate || ""}
                    onChange={(e) => setComplianceForm({
                      ...complianceForm,
                      kvk: { ...complianceForm.kvk, lastMutationDate: e.target.value } as any
                    })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium">Geregistreerde Bestuurders (Uittreksel)</label>
                <div className="space-y-1 mt-1">
                  {(complianceForm.kvk?.boardMembersRegistered || []).map((bm, i) => (
                    <div key={i} className="flex items-center justify-between p-1 px-2 rounded bg-muted text-xs">
                      <span>{bm}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const list = [...(complianceForm.kvk?.boardMembersRegistered || [])];
                          list.splice(i, 1);
                          setComplianceForm({
                            ...complianceForm,
                            kvk: { ...complianceForm.kvk, boardMembersRegistered: list } as any
                          });
                        }}
                        className="text-rose-500 hover:text-rose-700 p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <Input
                      value={newBoardMemberInput}
                      onChange={(e) => setNewBoardMemberInput(e.target.value)}
                      placeholder="Naam & functie (bijv. Jan Jansen (Bestuurslid))"
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => {
                        if (newBoardMemberInput.trim()) {
                          setComplianceForm({
                            ...complianceForm,
                            kvk: {
                              ...complianceForm.kvk,
                              boardMembersRegistered: [
                                ...(complianceForm.kvk?.boardMembersRegistered || []),
                                newBoardMemberInput.trim()
                              ]
                            } as any
                          });
                          setNewBoardMemberInput("");
                        }
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Bestuurder Toevoegen
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. WBTR */}
            <div className="p-3.5 border border-border rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm text-purple-600">
                <Scale className="w-4 h-4" /> 2. WBTR Compliance (Bestuur & Toezicht)
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={complianceForm.wbtr?.tegenstrijdigBelangRegeling !== false}
                    onChange={(e) => setComplianceForm({
                      ...complianceForm,
                      wbtr: { ...complianceForm.wbtr, tegenstrijdigBelangRegeling: e.target.checked } as any
                    })}
                    className="rounded text-purple-600"
                  />
                  <span>Tegenstrijdig belang regeling statutair vastgelegd</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={complianceForm.wbtr?.beletEnOntstentenisRegeling !== false}
                    onChange={(e) => setComplianceForm({
                      ...complianceForm,
                      wbtr: { ...complianceForm.wbtr, beletEnOntstentenisRegeling: e.target.checked } as any
                    })}
                    className="rounded text-purple-600"
                  />
                  <span>Belet- en ontstentenisregeling in statuten opgenomen</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={complianceForm.wbtr?.meervoudigStemrechtBeperkt !== false}
                    onChange={(e) => setComplianceForm({
                      ...complianceForm,
                      wbtr: { ...complianceForm.wbtr, meervoudigStemrechtBeperkt: e.target.checked } as any
                    })}
                    className="rounded text-purple-600"
                  />
                  <span>Meervoudig stemrecht begrensd conform wettelijke eis</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={complianceForm.wbtr?.aansprakelijkheidsverzekeringBestuur !== false}
                    onChange={(e) => setComplianceForm({
                      ...complianceForm,
                      wbtr: { ...complianceForm.wbtr, aansprakelijkheidsverzekeringBestuur: e.target.checked } as any
                    })}
                    className="rounded text-purple-600"
                  />
                  <span>Bestuursaansprakelijkheidsverzekering actief</span>
                </label>
              </div>
              <div>
                <label className="font-medium">WBTR Toelichting</label>
                <Input
                  value={complianceForm.wbtr?.notes || ""}
                  onChange={(e) => setComplianceForm({
                    ...complianceForm,
                    wbtr: { ...complianceForm.wbtr, notes: e.target.value } as any
                  })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            {/* 3. UBO & 4. AVG & Giften */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* UBO */}
              <div className="p-3.5 border border-border rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-600">
                  <Users className="w-4 h-4" /> 3. UBO-Register
                </div>
                <div>
                  <label className="font-medium">Registratiedatum</label>
                  <Input
                    type="date"
                    value={complianceForm.ubo?.registrationDate || ""}
                    onChange={(e) => setComplianceForm({
                      ...complianceForm,
                      ubo: { ...complianceForm.ubo, registrationDate: e.target.value } as any
                    })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium">Laatste Verificatiedatum</label>
                  <Input
                    type="date"
                    value={complianceForm.ubo?.lastVerificationDate || ""}
                    onChange={(e) => setComplianceForm({
                      ...complianceForm,
                      ubo: { ...complianceForm.ubo, lastVerificationDate: e.target.value } as any
                    })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              {/* AVG & Giften */}
              <div className="p-3.5 border border-border rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-teal-600">
                  <ShieldCheck className="w-4 h-4" /> 4. AVG & 5. Giftenreglement
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={complianceForm.avg?.privacyStatementPublished !== false}
                    onChange={(e) => setComplianceForm({
                      ...complianceForm,
                      avg: { ...complianceForm.avg, privacyStatementPublished: e.target.checked } as any
                    })}
                    className="rounded text-teal-600"
                  />
                  <span>Privacyverklaring gepubliceerd conform AVG</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={complianceForm.giftenreglement?.adoptedByAlv !== false}
                    onChange={(e) => setComplianceForm({
                      ...complianceForm,
                      giftenreglement: { ...complianceForm.giftenreglement, adoptedByAlv: e.target.checked } as any
                    })}
                    className="rounded text-teal-600"
                  />
                  <span>Openbaar giftenreglement vastgesteld door ALV</span>
                </label>
                <div>
                  <label className="font-medium">AVG Toelichting</label>
                  <Input
                    value={complianceForm.avg?.notes || ""}
                    onChange={(e) => setComplianceForm({
                      ...complianceForm,
                      avg: { ...complianceForm.avg, notes: e.target.value } as any
                    })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsComplianceDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Compliance Dossier Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 7: VERKIEZINGSVOORBEREIDING & COMMISSIES BEWERKEN */}
      <Dialog open={isElectionsDialogOpen} onOpenChange={setIsElectionsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Verkiezingsvoorbereiding & Commissies</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Beheer de campagne-evaluatie, programmacommissie en de kandidaatstellingscommissie conform Kennispunt.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveElections} className="space-y-4 text-xs">
            {/* 1. Campagne Evaluatie */}
            <div className="p-3.5 border border-border rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-600">
                <Sparkles className="w-4 h-4" /> 1. Campagne-evaluatie & Leerpunten
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium">Vorig Resultaat</label>
                  <Input
                    value={electionsForm.campaignEvaluation?.previousResult || ""}
                    onChange={(e) => setElectionsForm({
                      ...electionsForm,
                      campaignEvaluation: { ...electionsForm.campaignEvaluation, previousResult: e.target.value } as any
                    })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium">Focus Komende Periode</label>
                  <Input
                    value={electionsForm.campaignEvaluation?.focusAreasNextElection || ""}
                    onChange={(e) => setElectionsForm({
                      ...electionsForm,
                      campaignEvaluation: { ...electionsForm.campaignEvaluation, focusAreasNextElection: e.target.value } as any
                    })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium">Vastgelegde Leerpunten</label>
                <div className="space-y-1 mt-1">
                  {(electionsForm.campaignEvaluation?.keyLearnings || []).map((kl, i) => (
                    <div key={i} className="flex items-center justify-between p-1 px-2 rounded bg-muted text-xs">
                      <span>{kl}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const list = [...(electionsForm.campaignEvaluation?.keyLearnings || [])];
                          list.splice(i, 1);
                          setElectionsForm({
                            ...electionsForm,
                            campaignEvaluation: { ...electionsForm.campaignEvaluation, keyLearnings: list } as any
                          });
                        }}
                        className="text-rose-500 hover:text-rose-700 p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <Input
                      value={newLearningInput}
                      onChange={(e) => setNewLearningInput(e.target.value)}
                      placeholder="Nieuw leerpunt campagne..."
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => {
                        if (newLearningInput.trim()) {
                          setElectionsForm({
                            ...electionsForm,
                            campaignEvaluation: {
                              ...electionsForm.campaignEvaluation,
                              keyLearnings: [
                                ...(electionsForm.campaignEvaluation?.keyLearnings || []),
                                newLearningInput.trim()
                              ]
                            } as any
                          });
                          setNewLearningInput("");
                        }
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Leerpunt Toevoegen
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Programmacommissie */}
            <div className="p-3.5 border border-border rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm text-purple-600">
                <BookOpen className="w-4 h-4" /> 2. Programmacommissie
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="font-medium">Status</label>
                  <Input
                    value={electionsForm.programCommittee?.status || ""}
                    onChange={(e) => setElectionsForm({
                      ...electionsForm,
                      programCommittee: { ...electionsForm.programCommittee, status: e.target.value } as any
                    })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium">Commissievoorzitter</label>
                  <Input
                    value={electionsForm.programCommittee?.lead || ""}
                    onChange={(e) => setElectionsForm({
                      ...electionsForm,
                      programCommittee: { ...electionsForm.programCommittee, lead: e.target.value } as any
                    })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium">Deadline Concept</label>
                  <Input
                    value={electionsForm.programCommittee?.deadlineDraft || ""}
                    onChange={(e) => setElectionsForm({
                      ...electionsForm,
                      programCommittee: { ...electionsForm.programCommittee, deadlineDraft: e.target.value } as any
                    })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium">Vaststelling ALV</label>
                  <Input
                    value={electionsForm.programCommittee?.alvAdoptionDate || ""}
                    onChange={(e) => setElectionsForm({
                      ...electionsForm,
                      programCommittee: { ...electionsForm.programCommittee, alvAdoptionDate: e.target.value } as any
                    })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="font-medium">Toelichting / Voortgang</label>
                <Input
                  value={electionsForm.programCommittee?.notes || ""}
                  onChange={(e) => setElectionsForm({
                    ...electionsForm,
                    programCommittee: { ...electionsForm.programCommittee, notes: e.target.value } as any
                  })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            {/* 3. Kandidaatstellingscommissie */}
            <div className="p-3.5 border border-border rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-600">
                <Users className="w-4 h-4" /> 3. Kandidaatstelling & Kiesraad
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>
                  <label className="font-medium">Status</label>
                  <Input
                    value={electionsForm.candidateCommittee?.status || ""}
                    onChange={(e) => setElectionsForm({
                      ...electionsForm,
                      candidateCommittee: { ...electionsForm.candidateCommittee, status: e.target.value } as any
                    })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium">Voorzitter Scouting</label>
                  <Input
                    value={electionsForm.candidateCommittee?.lead || ""}
                    onChange={(e) => setElectionsForm({
                      ...electionsForm,
                      candidateCommittee: { ...electionsForm.candidateCommittee, lead: e.target.value } as any
                    })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium">Gespreksperiode</label>
                  <Input
                    value={electionsForm.candidateCommittee?.interviewPeriod || ""}
                    onChange={(e) => setElectionsForm({
                      ...electionsForm,
                      candidateCommittee: { ...electionsForm.candidateCommittee, interviewPeriod: e.target.value } as any
                    })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={electionsForm.candidateCommittee?.kiesraadDeadlinesChecked !== false}
                  onChange={(e) => setElectionsForm({
                    ...electionsForm,
                    candidateCommittee: { ...electionsForm.candidateCommittee, kiesraadDeadlinesChecked: e.target.checked } as any
                  })}
                  className="rounded text-emerald-600"
                />
                <span>Kiesraad formaliteiten (model H1/Y) geborgd</span>
              </label>
              <div>
                <label className="font-medium">Toelichting Scouting</label>
                <Input
                  value={electionsForm.candidateCommittee?.notes || ""}
                  onChange={(e) => setElectionsForm({
                    ...electionsForm,
                    candidateCommittee: { ...electionsForm.candidateCommittee, notes: e.target.value } as any
                  })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsElectionsDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Commissies Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
