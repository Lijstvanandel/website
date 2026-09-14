import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/api";
import {
  Gavel,
  Users,
  ShieldCheck,
  Award,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Pencil,
  Search,
  Filter,
  Download,
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
  BookOpen,
  Coffee,
  HeartHandshake,
  Compass,
  Radio,
  FileText,
  UserCheck,
  Layers,
  Scale,
  Smile,
  Shield,
  PhoneCall,
  User,
  Quote,
  Target
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
import { BestuurManager } from "@/components/admin/BestuurManager";

export interface ChairmanMeeting {
  id: string;
  title: string;
  type: "ALV" | "Bestuursvergadering";
  date: string;
  time: string;
  location: string;
  status: "gepland" | "afgerond" | "geannuleerd";
  agendaItems?: string[];
  documents?: { name: string; url: string; category?: string }[];
  chairmanOpeningNotes?: string;
  orderNotes?: string;
  speakingTimeLimits?: string;
  votingProcedureNotes?: string;
}

export interface FractieInterview {
  id: string;
  politicianName: string;
  roleTitle: string;
  interviewDate: string;
  status: "gepland" | "afgerond";
  competencies: string;
  supportNeeded: string;
  expectations: string;
  notes: string;
  nextReviewDate?: string;
}

export interface FractieStart {
  completed: boolean;
  conductedAt: string;
  lastReviewedAt: string;
  ambitions: string;
  memberInvolvementAgreements: string;
  communicationRules: string;
  status: string;
}

export interface Tussenbalans {
  completedDate: string;
  term: string;
  programRealizationScore: number;
  summary: string;
  cooperationAssessment: string;
  inhabitantCommunication: string;
  actionPoints: string[];
  status: string;
}

export interface CoffeeChat {
  id: string;
  date: string;
  location: string;
  topics: string;
  conclusions: string;
  actionAgreed: string;
}

export interface FractieAttendance {
  id: string;
  date: string;
  attendee: string;
  keyTopics: string;
  alignmentNotes: string;
  nextDate: string;
}

export interface ChairmanCommittee {
  id: string;
  name: string;
  purpose: string;
  lead: string;
  members: string[];
  status: "actief" | "voorbereiding" | "inactief";
  mandate: string;
  progressNotes: string;
}

export interface YearCycleMilestone {
  text: string;
  done: boolean;
}

export interface ChairmanYearCycle {
  year: number;
  label: string;
  focus: string;
  status: "afgerond" | "actief" | "gepland";
  milestones: YearCycleMilestone[];
}

export interface IntegrityReport {
  id: string;
  date: string;
  subject: string;
  status: string;
  resolution: string;
}

export interface ChairmanIntegrity {
  codeOfConductAdopted: boolean;
  codeOfConductAdoptedDate: string;
  whistleblowerContact: string;
  integrityPrinciples: string[];
  reports: IntegrityReport[];
}

export interface ColleagueChair {
  party: string;
  contactPerson: string;
  lastContact: string;
  notes: string;
}

export interface CommunitySignal {
  id: string;
  location: string;
  topic: string;
  source: string;
  receivedDate: string;
  status: string;
  followUp: string;
}

export interface ChairmanNetwork {
  colleagueChairs: ColleagueChair[];
  communitySignals: CommunitySignal[];
}

export interface ChairmanStats {
  totalMeetings: number;
  upcomingMeetings: number;
  completedInterviews: number;
  pendingInterviews: number;
  activeCommittees: number;
  coffeeChatsCount: number;
  attendancesCount: number;
  communitySignalsCount: number;
  unresolvedSignals: number;
  integrityReportsCount: number;
  belafsprakenCount: number;
  currentYearInCycle: number;
}

export interface BoardMemberInfo {
  roleTitle: string;
  name: string;
  description: string;
  email?: string;
  phone?: string;
  panelNote?: string;
}

export interface ChairmanDailyBoard {
  partyName?: string;
  boardTitle?: string;
  boardSubtitle?: string;
  status?: string;
  chairman?: BoardMemberInfo;
  secretary?: BoardMemberInfo;
  treasurer?: BoardMemberInfo;
  additionalMembers?: {
    id: string;
    roleTitle: string;
    name: string;
    description: string;
    email?: string;
  }[];
}

interface Props {
  token: string | null;
  currentUser: any;
  headers: Record<string, string>;
}

export function ChairmanManager({ token, currentUser, headers }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<
    "overzicht" | "vergaderingen" | "fractie" | "commissies" | "jaarcyclus" | "integriteit" | "netwerk" | "bestuur"
  >("overzicht");

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Data states
  const [meetings, setMeetings] = useState<ChairmanMeeting[]>([]);
  const [dailyBoard, setDailyBoard] = useState<ChairmanDailyBoard | null>(null);
  const [fractieInterviews, setFractieInterviews] = useState<FractieInterview[]>([]);
  const [fractieStart, setFractieStart] = useState<FractieStart | null>(null);
  const [tussenbalans, setTussenbalans] = useState<Tussenbalans | null>(null);
  const [coffeeChats, setCoffeeChats] = useState<CoffeeChat[]>([]);
  const [fractieAttendances, setFractieAttendances] = useState<FractieAttendance[]>([]);
  const [committees, setCommittees] = useState<ChairmanCommittee[]>([]);
  const [fourYearCycle, setFourYearCycle] = useState<ChairmanYearCycle[]>([]);
  const [integrity, setIntegrity] = useState<ChairmanIntegrity | null>(null);
  const [network, setNetwork] = useState<ChairmanNetwork | null>(null);
  const [stats, setStats] = useState<ChairmanStats | null>(null);
  const [fractieleden, setFractieleden] = useState<any[]>([]);

  // Dialog states
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState<FractieInterview | null>(null);
  const [interviewForm, setInterviewForm] = useState<Partial<FractieInterview>>({
    politicianName: "",
    roleTitle: "Raadslid",
    interviewDate: new Date().toISOString().split("T")[0],
    status: "gepland",
    competencies: "",
    supportNeeded: "",
    expectations: "",
    notes: "",
    nextReviewDate: ""
  });

  const [isMeetingNotesModalOpen, setIsMeetingNotesModalOpen] = useState(false);
  const [selectedMeetingForNotes, setSelectedMeetingForNotes] = useState<ChairmanMeeting | null>(null);
  const [meetingNotesForm, setMeetingNotesForm] = useState({
    chairmanOpeningNotes: "",
    orderNotes: "",
    speakingTimeLimits: "",
    votingProcedureNotes: ""
  });

  const [isCoffeeModalOpen, setIsCoffeeModalOpen] = useState(false);
  const [coffeeForm, setCoffeeForm] = useState<Partial<CoffeeChat>>({
    date: new Date().toISOString().split("T")[0],
    location: "Fractiekamer / Steenwijk",
    topics: "",
    conclusions: "",
    actionAgreed: ""
  });

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState<Partial<FractieAttendance>>({
    date: new Date().toISOString().split("T")[0],
    attendee: "Sammy van Andel (Partijvoorzitter)",
    keyTopics: "",
    alignmentNotes: "",
    nextDate: ""
  });

  const [isSignalModalOpen, setIsSignalModalOpen] = useState(false);
  const [signalForm, setSignalForm] = useState<Partial<CommunitySignal>>({
    location: "Steenwijk",
    topic: "",
    source: "Inwonergesprek",
    status: "nieuw",
    followUp: ""
  });

  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState<ChairmanCommittee | null>(null);
  const [committeeForm, setCommitteeForm] = useState<Partial<ChairmanCommittee>>({
    name: "",
    purpose: "",
    lead: "",
    members: [],
    status: "actief",
    mandate: "",
    progressNotes: ""
  });

  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [selectedCycleYear, setSelectedCycleYear] = useState<ChairmanYearCycle | null>(null);
  const [cycleYearForm, setCycleYearForm] = useState<{
    focus: string;
    status: "gepland" | "actief" | "afgerond";
    milestones: { text: string; done: boolean }[];
    newMilestoneText: string;
  }>({
    focus: "",
    status: "actief",
    milestones: [],
    newMilestoneText: ""
  });

  const [isStartgesprekModalOpen, setIsStartgesprekModalOpen] = useState(false);
  const [startgesprekForm, setStartgesprekForm] = useState<Partial<FractieStart>>({
    ambitions: "",
    memberInvolvementAgreements: "",
    communicationRules: "",
    status: "Actueel"
  });

  const [isTussenbalansModalOpen, setIsTussenbalansModalOpen] = useState(false);
  const [tussenbalansForm, setTussenbalansForm] = useState<Partial<Tussenbalans>>({
    programRealizationScore: 80,
    summary: "",
    cooperationAssessment: "",
    inhabitantCommunication: "",
    actionPoints: []
  });

  const [isDailyBoardModalOpen, setIsDailyBoardModalOpen] = useState(false);
  const [dailyBoardForm, setDailyBoardForm] = useState<ChairmanDailyBoard>({
    partyName: "Lijst van Andel",
    boardTitle: "Bestuur",
    boardSubtitle: "Statutaire taakverdeling en wisselwerking binnen het dagelijks bestuur conform verenigingsrecht en de WBTR.",
    status: "Bestuur Compleet & Operationeel",
    chairman: {
      roleTitle: "Partijvoorzitter",
      name: "Sammy van Andel",
      description: "Leidt ALV en bestuursvergaderingen, bewaakt fractierelatie via 5 instrumenten, stuurt commissies aan en is het gezicht naar buiten.",
      email: "voorzitter@lijstvanandel.nl",
      panelNote: "U bevindt zich in het Voorzitterpaneel"
    },
    secretary: {
      roleTitle: "Secretaris",
      name: "Anja ter Horst",
      description: "Verantwoordelijk voor correspondentie, notulering ALV, ledenadministratie, KvK/WBTR-formaliteiten en het partijarchief.",
      email: "secretariaat@lijstvanandel.nl",
      panelNote: "Eigen beveiligd Secretarispaneel"
    },
    treasurer: {
      roleTitle: "Penningmeester",
      name: "Stef Mars",
      description: "Beheert begroting, kasboek, contributie-inning via Stripe/SEPA, giftenregister en verantwoording naar de kascommissie.",
      email: "penningmeester@lijstvanandel.nl",
      panelNote: "Eigen beveiligd Penningmeesterpaneel"
    },
    additionalMembers: []
  });

  const [isColleagueChairModalOpen, setIsColleagueChairModalOpen] = useState(false);
  const [editingColleagueChair, setEditingColleagueChair] = useState<ColleagueChair | null>(null);
  const [colleagueChairForm, setColleagueChairForm] = useState<ColleagueChair>({
    party: "",
    contactPerson: "",
    lastContact: new Date().toISOString().split("T")[0],
    notes: ""
  });

  // Load consolidated Chairman data
  const loadChairmanData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/chairman/data", {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
        setDailyBoard(data.dailyBoard || null);
        setFractieInterviews(data.fractieInterviews || []);
        setFractieStart(data.fractieStart || null);
        setTussenbalans(data.tussenbalans || null);
        setCoffeeChats(data.coffeeChats || []);
        setFractieAttendances(data.fractieAttendances || []);
        setCommittees(data.committees || []);
        setFourYearCycle(data.fourYearCycle || []);
        setIntegrity(data.integrity || null);
        setNetwork(data.network || null);
        setStats(data.stats || null);
        setFractieleden(data.fractieleden || []);
      } else {
        toast.error("Kon voorzittersgegevens niet ophalen");
      }
    } catch (err) {
      console.error("Error loading chairman data:", err);
      toast.error("Netwerkfout bij ophalen voorzittersgegevens");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    loadChairmanData();
  }, [loadChairmanData, refreshKey]);

  // Handlers for Fractie Interviews
  const handleOpenNewInterview = () => {
    setEditingInterview(null);
    setInterviewForm({
      politicianName: fractieleden[0]?.name || "",
      roleTitle: "Raadslid",
      interviewDate: new Date().toISOString().split("T")[0],
      status: "gepland",
      competencies: "",
      supportNeeded: "",
      expectations: "",
      notes: "",
      nextReviewDate: ""
    });
    setIsInterviewModalOpen(true);
  };

  const handleOpenEditInterview = (item: FractieInterview) => {
    setEditingInterview(item);
    setInterviewForm({ ...item });
    setIsInterviewModalOpen(true);
  };

  const handleSaveInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewForm.politicianName || !interviewForm.interviewDate) {
      toast.error("Vul fractielid en gespreksdatum in");
      return;
    }

    try {
      if (editingInterview) {
        const res = await fetchWithAuth(`/api/chairman/fractie-interviews/${editingInterview.id}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(interviewForm),
        });
        if (res.ok) {
          toast.success("Voortgangsgesprek bijgewerkt");
          setIsInterviewModalOpen(false);
          loadChairmanData();
        } else {
          toast.error("Fout bij bijwerken gesprek");
        }
      } else {
        const res = await fetchWithAuth("/api/chairman/fractie-interviews", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(interviewForm),
        });
        if (res.ok) {
          toast.success("Voortgangsgesprek geregistreerd");
          setIsInterviewModalOpen(false);
          loadChairmanData();
        } else {
          toast.error("Fout bij opslaan gesprek");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout bij opslaan voortgangsgesprek");
    }
  };

  const handleDeleteInterview = async (id: string) => {
    if (!confirm("Weet u zeker dat u dit voortgangsgesprek wilt verwijderen?")) return;
    try {
      const res = await fetchWithAuth(`/api/chairman/fractie-interviews/${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("Voortgangsgesprek verwijderd");
        loadChairmanData();
      } else {
        toast.error("Kon gesprek niet verwijderen");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout");
    }
  };

  // Handlers for Meeting Chairman Notes
  const handleOpenMeetingNotes = (meeting: ChairmanMeeting) => {
    setSelectedMeetingForNotes(meeting);
    setMeetingNotesForm({
      chairmanOpeningNotes: meeting.chairmanOpeningNotes || "",
      orderNotes: meeting.orderNotes || "",
      speakingTimeLimits: meeting.speakingTimeLimits || "",
      votingProcedureNotes: meeting.votingProcedureNotes || ""
    });
    setIsMeetingNotesModalOpen(true);
  };

  const handleSaveMeetingNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeetingForNotes) return;

    try {
      const res = await fetchWithAuth(`/api/chairman/meetings/${selectedMeetingForNotes.id}/notes`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(meetingNotesForm),
      });
      if (res.ok) {
        toast.success("Voorzittersprocedure en notities opgeslagen");
        setIsMeetingNotesModalOpen(false);
        loadChairmanData();
      } else {
        toast.error("Fout bij opslaan voorzittersnotities");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout");
    }
  };

  // Handlers for Bilateral Coffee Chats
  const handleSaveCoffee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coffeeForm.date) {
      toast.error("Datum is verplicht");
      return;
    }
    try {
      const res = await fetchWithAuth("/api/chairman/coffee-chats", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(coffeeForm),
      });
      if (res.ok) {
        toast.success("Koffieoverleg vastgelegd");
        setIsCoffeeModalOpen(false);
        setCoffeeForm({
          date: new Date().toISOString().split("T")[0],
          location: "Fractiekamer / Steenwijk",
          topics: "",
          conclusions: "",
          actionAgreed: ""
        });
        loadChairmanData();
      } else {
        toast.error("Fout bij opslaan overleg");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout");
    }
  };

  const handleDeleteCoffee = async (id: string) => {
    if (!confirm("Weet u zeker dat u dit overleg wilt verwijderen?")) return;
    try {
      const res = await fetchWithAuth(`/api/chairman/coffee-chats/${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("Overleg verwijderd");
        loadChairmanData();
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout");
    }
  };

  // Handlers for Fractie Attendances
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceForm.date) {
      toast.error("Datum is verplicht");
      return;
    }
    try {
      const res = await fetchWithAuth("/api/chairman/fractie-attendances", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(attendanceForm),
      });
      if (res.ok) {
        toast.success("Fractiebezoek geregistreerd");
        setIsAttendanceModalOpen(false);
        setAttendanceForm({
          date: new Date().toISOString().split("T")[0],
          attendee: "Sammy van Andel (Partijvoorzitter)",
          keyTopics: "",
          alignmentNotes: "",
          nextDate: ""
        });
        loadChairmanData();
      } else {
        toast.error("Fout bij opslaan fractiebezoek");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout");
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    if (!confirm("Weet u zeker dat u dit bezoek wilt verwijderen?")) return;
    try {
      const res = await fetchWithAuth(`/api/chairman/fractie-attendances/${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("Fractiebezoek verwijderd");
        loadChairmanData();
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout");
    }
  };

  // Handlers for Inwonerssignalen
  const handleSaveSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signalForm.location || !signalForm.topic) {
      toast.error("Locatie en onderwerp zijn verplicht");
      return;
    }
    try {
      const res = await fetchWithAuth("/api/chairman/signals", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(signalForm),
      });
      if (res.ok) {
        toast.success("Inwonerssignaal geregistreerd");
        setIsSignalModalOpen(false);
        setSignalForm({
          location: "Steenwijk",
          topic: "",
          source: "Inwonergesprek",
          status: "nieuw",
          followUp: ""
        });
        loadChairmanData();
      } else {
        toast.error("Fout bij opslaan signaal");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout");
    }
  };

  const handleUpdateSignalStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetchWithAuth(`/api/chairman/signals/${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success("Status bijgewerkt");
        loadChairmanData();
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout");
    }
  };

  const handleDeleteSignal = async (id: string) => {
    if (!confirm("Weet u zeker dat u dit inwonerssignaal wilt verwijderen?")) return;
    try {
      const res = await fetchWithAuth(`/api/chairman/signals/${id}`, {
        method: "DELETE",
        headers
      });
      if (res.ok) {
        toast.success("Inwonerssignaal verwijderd");
        loadChairmanData();
      } else {
        toast.error("Fout bij verwijderen signaal");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout bij verwijderen");
    }
  };

  // Colleague Chairs Handlers
  const handleOpenNewColleagueChair = () => {
    setEditingColleagueChair(null);
    setColleagueChairForm({
      party: "",
      contactPerson: "",
      lastContact: new Date().toISOString().split("T")[0],
      notes: ""
    });
    setIsColleagueChairModalOpen(true);
  };

  const handleOpenEditColleagueChair = (chair: ColleagueChair) => {
    setEditingColleagueChair(chair);
    setColleagueChairForm({
      id: chair.id,
      party: chair.party,
      contactPerson: chair.contactPerson,
      lastContact: chair.lastContact || new Date().toISOString().split("T")[0],
      notes: chair.notes || ""
    });
    setIsColleagueChairModalOpen(true);
  };

  const handleSaveColleagueChair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colleagueChairForm.party || !colleagueChairForm.contactPerson) {
      toast.error("Partij en contactpersoon zijn verplicht");
      return;
    }
    try {
      const url = editingColleagueChair?.id
        ? `/api/chairman/colleague-chairs/${editingColleagueChair.id}`
        : "/api/chairman/colleague-chairs";
      const method = editingColleagueChair?.id ? "PATCH" : "POST";
      const res = await fetchWithAuth(url, {
        method,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(colleagueChairForm)
      });
      if (res.ok) {
        toast.success(editingColleagueChair ? "Collega-voorzitter bijgewerkt" : "Collega-voorzitter toegevoegd");
        setIsColleagueChairModalOpen(false);
        loadChairmanData();
      } else {
        toast.error("Fout bij opslaan collega-voorzitter");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout bij opslaan collega-voorzitter");
    }
  };

  const handleDeleteColleagueChair = async (id?: string, party?: string) => {
    if (!id) return;
    if (!confirm(`Weet u zeker dat u contactpersoon voor ${party || "deze partij"} wilt verwijderen?`)) return;
    try {
      const res = await fetchWithAuth(`/api/chairman/colleague-chairs/${id}`, {
        method: "DELETE",
        headers
      });
      if (res.ok) {
        toast.success("Collega-voorzitter verwijderd");
        loadChairmanData();
      } else {
        toast.error("Fout bij verwijderen");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout bij verwijderen");
    }
  };

  // 4-Jaarcyclus Milestone Toggle
  const handleToggleCycleMilestone = async (year: number, milestoneIdx: number) => {
    const cycleItem = fourYearCycle.find((y) => y.year === year);
    if (!cycleItem) return;

    const updatedMilestones = [...cycleItem.milestones];
    updatedMilestones[milestoneIdx] = {
      ...updatedMilestones[milestoneIdx],
      done: !updatedMilestones[milestoneIdx].done,
    };

    try {
      const res = await fetchWithAuth(`/api/chairman/four-year-cycle/${year}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ milestones: updatedMilestones }),
      });
      if (res.ok) {
        toast.success("Mijlpaal bijgewerkt");
        loadChairmanData();
      } else {
        toast.error("Kon mijlpaal niet bijwerken");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout");
    }
  };

  // Startgesprek update
  const handleSaveStartgesprek = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth("/api/chairman/fractie-start", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(startgesprekForm),
      });
      if (res.ok) {
        toast.success("Startgesprek kaders bijgewerkt");
        setIsStartgesprekModalOpen(false);
        loadChairmanData();
      } else {
        toast.error("Fout bij opslaan");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout");
    }
  };

  // Tussenbalans update
  const handleSaveTussenbalans = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth("/api/chairman/tussenbalans", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(tussenbalansForm),
      });
      if (res.ok) {
        toast.success("Tussenbalans geactualiseerd");
        setIsTussenbalansModalOpen(false);
        loadChairmanData();
      } else {
        toast.error("Fout bij opslaan");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout");
    }
  };

  // Handlers for Committees (Organisatie & Commissies)
  const handleOpenNewCommittee = () => {
    setEditingCommittee(null);
    setCommitteeForm({
      name: "",
      purpose: "",
      lead: "",
      members: [],
      status: "actief",
      mandate: "",
      progressNotes: ""
    });
    setIsCommitteeModalOpen(true);
  };

  const handleOpenEditCommittee = (com: ChairmanCommittee) => {
    setEditingCommittee(com);
    setCommitteeForm({
      name: com.name,
      purpose: com.purpose,
      lead: com.lead,
      members: Array.isArray(com.members) ? com.members : [],
      status: com.status,
      mandate: com.mandate,
      progressNotes: com.progressNotes
    });
    setIsCommitteeModalOpen(true);
  };

  const handleSaveCommittee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!committeeForm.name) {
      toast.error("Commissienaam is verplicht");
      return;
    }
    try {
      if (editingCommittee) {
        const res = await fetchWithAuth(`/api/chairman/committees/${editingCommittee.id}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(committeeForm),
        });
        if (res.ok) {
          toast.success("Commissie bijgewerkt");
          setIsCommitteeModalOpen(false);
          loadChairmanData();
        } else {
          toast.error("Fout bij bijwerken van commissie");
        }
      } else {
        const res = await fetchWithAuth("/api/chairman/committees", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(committeeForm),
        });
        if (res.ok) {
          toast.success("Nieuwe commissie succesvol aangemaakt");
          setIsCommitteeModalOpen(false);
          loadChairmanData();
        } else {
          toast.error("Fout bij aanmaken van commissie");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout bij opslaan commissie");
    }
  };

  const handleDeleteCommittee = async (id: string) => {
    if (!confirm("Weet u zeker dat u deze commissie wilt verwijderen?")) return;
    try {
      const res = await fetchWithAuth(`/api/chairman/committees/${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("Commissie verwijderd");
        loadChairmanData();
      } else {
        toast.error("Fout bij verwijderen van commissie");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout");
    }
  };

  // Handlers for 4-Jaarcyclus Management
  const handleOpenEditCycleYear = (cyc: ChairmanYearCycle) => {
    setSelectedCycleYear(cyc);
    setCycleYearForm({
      focus: cyc.focus || "",
      status: cyc.status,
      milestones: cyc.milestones ? [...cyc.milestones] : [],
      newMilestoneText: ""
    });
    setIsCycleModalOpen(true);
  };

  const handleAddMilestoneToCycleYear = () => {
    if (!cycleYearForm.newMilestoneText.trim()) return;
    setCycleYearForm((prev) => ({
      ...prev,
      milestones: [...prev.milestones, { text: prev.newMilestoneText.trim(), done: false }],
      newMilestoneText: ""
    }));
  };

  const handleRemoveMilestoneFromCycleYear = (index: number) => {
    setCycleYearForm((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const handleToggleFormMilestone = (index: number) => {
    setCycleYearForm((prev) => {
      const updated = [...prev.milestones];
      updated[index] = { ...updated[index], done: !updated[index].done };
      return { ...prev, milestones: updated };
    });
  };

  const handleSaveCycleYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCycleYear) return;
    try {
      const res = await fetchWithAuth(`/api/chairman/four-year-cycle/${selectedCycleYear.year}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          focus: cycleYearForm.focus,
          status: cycleYearForm.status,
          milestones: cycleYearForm.milestones
        }),
      });
      if (res.ok) {
        toast.success(`Jaar ${selectedCycleYear.year} (${selectedCycleYear.label}) succesvol bijgewerkt`);
        setIsCycleModalOpen(false);
        loadChairmanData();
      } else {
        toast.error("Fout bij bijwerken van het cyclusjaar");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout bij opslaan jaarcyclus");
    }
  };

  // Handlers for Daily Board (Dagelijks Bestuur) Management
  const handleOpenEditDailyBoard = () => {
    if (dailyBoard) {
      setDailyBoardForm({
        partyName: dailyBoard.partyName || "Lijst van Andel",
        boardTitle: dailyBoard.boardTitle || "Bestuur",
        boardSubtitle: dailyBoard.boardSubtitle || "Statutaire taakverdeling en wisselwerking binnen het dagelijks bestuur conform verenigingsrecht en de WBTR.",
        status: dailyBoard.status || "Bestuur Compleet & Operationeel",
        chairman: {
          roleTitle: dailyBoard.chairman?.roleTitle || "Partijvoorzitter",
          name: dailyBoard.chairman?.name || "Sammy van Andel",
          description: dailyBoard.chairman?.description || "Leidt ALV en bestuursvergaderingen, bewaakt fractierelatie via 5 instrumenten, stuurt commissies aan en is het gezicht naar buiten.",
          email: dailyBoard.chairman?.email || "voorzitter@lijstvanandel.nl",
          phone: dailyBoard.chairman?.phone || "",
          panelNote: dailyBoard.chairman?.panelNote || "U bevindt zich in het Voorzitterpaneel"
        },
        secretary: {
          roleTitle: dailyBoard.secretary?.roleTitle || "Secretaris",
          name: dailyBoard.secretary?.name || "Anja ter Horst",
          description: dailyBoard.secretary?.description || "Verantwoordelijk voor correspondentie, notulering ALV, ledenadministratie, KvK/WBTR-formaliteiten en het partijarchief.",
          email: dailyBoard.secretary?.email || "secretariaat@lijstvanandel.nl",
          phone: dailyBoard.secretary?.phone || "",
          panelNote: dailyBoard.secretary?.panelNote || "Eigen beveiligd Secretarispaneel"
        },
        treasurer: {
          roleTitle: dailyBoard.treasurer?.roleTitle || "Penningmeester",
          name: dailyBoard.treasurer?.name || "Stef Mars",
          description: dailyBoard.treasurer?.description || "Beheert begroting, kasboek, contributie-inning via Stripe/SEPA, giftenregister en verantwoording naar de kascommissie.",
          email: dailyBoard.treasurer?.email || "penningmeester@lijstvanandel.nl",
          phone: dailyBoard.treasurer?.phone || "",
          panelNote: dailyBoard.treasurer?.panelNote || "Eigen beveiligd Penningmeesterpaneel"
        },
        additionalMembers: dailyBoard.additionalMembers ? [...dailyBoard.additionalMembers] : []
      });
    }
    setIsDailyBoardModalOpen(true);
  };

  const handleAddAdditionalMember = () => {
    const newMember = {
      id: `member-${Date.now()}`,
      roleTitle: "Algemeen Bestuurslid",
      name: "",
      description: "Ondersteunt het dagelijks bestuur en behartigt specifieke verenigingsprojecten.",
      email: ""
    };
    setDailyBoardForm((prev) => ({
      ...prev,
      additionalMembers: [...(prev.additionalMembers || []), newMember]
    }));
  };

  const handleRemoveAdditionalMember = (id: string) => {
    setDailyBoardForm((prev) => ({
      ...prev,
      additionalMembers: (prev.additionalMembers || []).filter((m) => m.id !== id)
    }));
  };

  const handleSaveDailyBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth("/api/chairman/daily-board", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(dailyBoardForm),
      });
      if (res.ok) {
        toast.success("Bestuurssamenstelling & rollen succesvol bijgewerkt");
        setIsDailyBoardModalOpen(false);
        loadChairmanData();
      } else {
        toast.error("Fout bij opslaan bestuurssamenstelling");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout bij opslaan dagelijks bestuur");
    }
  };

  // Export Dossier
  const handleExportDossier = () => {
    window.open("/api/chairman/export/dossier", "_blank");
  };

  return (
    <div className="space-y-8">
      {/* Chairman Cockpit Summary Banner */}
      <div className="bg-gradient-to-r from-amber-600/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-600/20">
              <Gavel className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  Partijvoorzitter & Bestuursleiding
                </span>
                <span className="text-xs text-muted-foreground">• Steenwijkerland</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">
                Voorzitterscockpit
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Leidend orgaan voor vergaderingen, de 5 fractie-instrumenten, organisatie van het bestuur & commissies, 4-jaarcyclus, integriteitsborging en verbinding met de inwoners van Steenwijkerland.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleExportDossier}
              variant="outline"
              className="text-xs font-semibold uppercase tracking-wider gap-2 h-10 px-4 border-amber-500/30 bg-background hover:bg-amber-500/10 text-foreground"
            >
              <Download className="w-4 h-4 text-amber-600" />
              <span>Export Fractiegesprekken (CSV)</span>
            </Button>
            <Button
              onClick={handleOpenNewInterview}
              className="text-xs font-semibold uppercase tracking-wider gap-2 h-10 px-4 bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Nieuw Voortgangsgesprek</span>
            </Button>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-amber-500/20">
          <div className="bg-background/80 backdrop-blur-sm p-3.5 rounded-xl border border-border">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
              <FolderKanban className="w-3.5 h-3.5 text-amber-600" />
              <span>Vergaderingen</span>
            </div>
            <div className="text-xl font-bold font-display">
              {stats?.totalMeetings || 0}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {stats?.upcomingMeetings || 0} gepland
            </div>
          </div>

          <div className="bg-background/80 backdrop-blur-sm p-3.5 rounded-xl border border-border">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Voortgangsgesprekken</span>
            </div>
            <div className="text-xl font-bold font-display">
              {stats?.completedInterviews || 0}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {stats?.pendingInterviews || 0} in voorbereiding
            </div>
          </div>

          <div className="bg-background/80 backdrop-blur-sm p-3.5 rounded-xl border border-border">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Commissies</span>
            </div>
            <div className="text-xl font-bold font-display">
              {stats?.activeCommittees || 0}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Scouting & communicatie
            </div>
          </div>

          <div className="bg-background/80 backdrop-blur-sm p-3.5 rounded-xl border border-border">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              <span>Fractie-overleg</span>
            </div>
            <div className="text-xl font-bold font-display">
              {(stats?.coffeeChatsCount || 0) + (stats?.attendancesCount || 0)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {stats?.coffeeChatsCount || 0} bilateraal / {stats?.attendancesCount || 0} fractie
            </div>
          </div>

          <div className="bg-background/80 backdrop-blur-sm p-3.5 rounded-xl border border-border">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span>4-Jaarcyclus</span>
            </div>
            <div className="text-xl font-bold font-display text-amber-600 dark:text-amber-400">
              Jaar 3
            </div>
            <div className="text-[11px] text-muted-foreground">
              Tussenbalans & Talent
            </div>
          </div>

          <div className="bg-background/80 backdrop-blur-sm p-3.5 rounded-xl border border-border">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
              <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
              <span>Inwonerssignalen</span>
            </div>
            <div className="text-xl font-bold font-display">
              {stats?.communitySignalsCount || 0}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {stats?.unresolvedSignals || 0} in behandeling
            </div>
          </div>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border">
        <button
          onClick={() => setActiveSubTab("overzicht")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === "overzicht"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Overzicht & Regie</span>
        </button>

        <button
          onClick={() => setActiveSubTab("vergaderingen")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === "vergaderingen"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Gavel className="w-3.5 h-3.5" />
          <span>Vergaderingen (ALV & Bestuur)</span>
          {meetings.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeSubTab === "vergaderingen" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            }`}>
              {meetings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("fractie")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === "fractie"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>De 5 Fractie-Instrumenten</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeSubTab === "fractie" ? "bg-white/20 text-white" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
          }`}>
            5
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("commissies")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === "commissies"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Organisatie & Commissies</span>
          {committees.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeSubTab === "commissies" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            }`}>
              {committees.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("jaarcyclus")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === "jaarcyclus"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>4-Jaarcyclus</span>
        </button>

        <button
          onClick={() => setActiveSubTab("integriteit")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === "integriteit"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Integriteit & Bemiddeling</span>
        </button>

        <button
          onClick={() => setActiveSubTab("netwerk")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === "netwerk"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>Inwoners & Netwerk</span>
        </button>

        <button
          onClick={() => setActiveSubTab("bestuur")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === "bestuur"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Bestuursbeheer</span>
        </button>
      </div>

      {/* SUBTAB 1: OVERZICHT & REGIE */}
      {activeSubTab === "overzicht" && (
        <div className="space-y-6">
          {/* Trio Dagelijks Bestuur Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold font-display flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  {dailyBoard?.boardTitle || "Bestuur"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {dailyBoard?.boardSubtitle || "Statutaire taakverdeling en wisselwerking binnen het dagelijks bestuur conform verenigingsrecht en de WBTR."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href="/bestuur"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3 h-3 text-accent" />
                  <span>Live Pagina</span>
                </a>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  {dailyBoard?.status || "Bestuur Compleet & Operationeel"}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveSubTab("bestuur")}
                  className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-600" />
                  <span>Bestuursbeheer Openen</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Voorzitter */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      {dailyBoard?.chairman?.roleTitle || "Partijvoorzitter"}
                    </span>
                    <Gavel className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="font-semibold text-base">{dailyBoard?.chairman?.name || "Sammy van Andel"}</div>
                  {dailyBoard?.chairman?.email && (
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{dailyBoard.chairman.email}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {dailyBoard?.chairman?.description || "Leidt ALV en bestuursvergaderingen, bewaakt fractierelatie via 5 instrumenten, stuurt commissies aan en is het gezicht naar buiten."}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                  {dailyBoard?.chairman?.panelNote || "U bevindt zich in het Voorzitterpaneel"}
                </div>
              </div>

              {/* Secretaris */}
              <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                      {dailyBoard?.secretary?.roleTitle || "Secretaris"}
                    </span>
                    <FolderKanban className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="font-semibold text-base">{dailyBoard?.secretary?.name || "Anja ter Horst"}</div>
                  {dailyBoard?.secretary?.email && (
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{dailyBoard.secretary.email}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {dailyBoard?.secretary?.description || "Verantwoordelijk voor correspondentie, notulering ALV, ledenadministratie, KvK/WBTR-formaliteiten en het partijarchief."}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-indigo-500/20 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                  {dailyBoard?.secretary?.panelNote || "Eigen beveiligd Secretarispaneel"}
                </div>
              </div>

              {/* Penningmeester */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      {dailyBoard?.treasurer?.roleTitle || "Penningmeester"}
                    </span>
                    <Scale className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="font-semibold text-base">{dailyBoard?.treasurer?.name || "Stef Mars"}</div>
                  {dailyBoard?.treasurer?.email && (
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{dailyBoard.treasurer.email}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {dailyBoard?.treasurer?.description || "Beheert begroting, kasboek, contributie-inning via Stripe/SEPA, giftenregister en verantwoording naar de kascommissie."}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                  {dailyBoard?.treasurer?.panelNote || "Eigen beveiligd Penningmeesterpaneel"}
                </div>
              </div>
            </div>

            {/* Extra Algemene Bestuursleden indien aanwezig */}
            {dailyBoard?.additionalMembers && dailyBoard.additionalMembers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Algemene Bestuursleden & Extra Portefeuilles:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {dailyBoard.additionalMembers.map((member) => (
                    <div key={member.id} className="p-3.5 rounded-xl border border-border bg-background">
                      <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                        {member.roleTitle}
                      </div>
                      <div className="font-semibold text-sm">{member.name}</div>
                      {member.email && (
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{member.email}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {member.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fractie-instrumenten status grid */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold font-display flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  De 5 Fractie-Instrumenten van de Voorzitter
                </h3>
                <p className="text-xs text-muted-foreground">
                  Gefundeerd op het Kennispunt Lokale Politieke Partijen handboek 'Voorzitter politieke partij'.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveSubTab("fractie")}
                variant="outline"
                className="text-xs gap-1.5 h-8 border-amber-500/30 text-amber-700 dark:text-amber-300"
              >
                <span>Alle Instrumenten Beheren</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Instrument 1 */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">
                    Instrument 1
                  </div>
                  <div className="font-semibold text-sm mb-1.5">Het Startgesprek</div>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {fractieStart?.ambitions || "Afspraken na verkiezingen over partijprogramma, communicatie en rolverdeling."}
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Vastgelegd
                  </span>
                  <button
                    onClick={() => {
                      setStartgesprekForm(fractieStart || {});
                      setIsStartgesprekModalOpen(true);
                    }}
                    className="text-amber-600 hover:underline font-semibold"
                  >
                    Inzien
                  </button>
                </div>
              </div>

              {/* Instrument 2 */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">
                    Instrument 2
                  </div>
                  <div className="font-semibold text-sm mb-1.5">Voortgangsgesprekken</div>
                  <p className="text-xs text-muted-foreground">
                    Jaarlijkse functionerings- en ontwikkelgesprekken met alle raadsleden.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                  <span className="font-medium text-foreground">
                    {fractieInterviews.length} gesprekken
                  </span>
                  <button
                    onClick={() => setActiveSubTab("fractie")}
                    className="text-amber-600 hover:underline font-semibold"
                  >
                    Beheren
                  </button>
                </div>
              </div>

              {/* Instrument 3 */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">
                    Instrument 3
                  </div>
                  <div className="font-semibold text-sm mb-1.5">De Tussenbalans</div>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    Halverwege de raadsperiode: {tussenbalans?.programRealizationScore || 82}% partijspeerpunten gerealiseerd.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Evaluatie gereed
                  </span>
                  <button
                    onClick={() => {
                      setTussenbalansForm(tussenbalans || {});
                      setIsTussenbalansModalOpen(true);
                    }}
                    className="text-amber-600 hover:underline font-semibold"
                  >
                    Details
                  </button>
                </div>
              </div>

              {/* Instrument 4 */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">
                    Instrument 4
                  </div>
                  <div className="font-semibold text-sm mb-1.5">Fractiebijwoningen</div>
                  <p className="text-xs text-muted-foreground">
                    Periodieke bestuursafvaardiging bij fractievergaderingen voor inhoudelijke afstemming.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                  <span className="font-medium text-foreground">
                    {fractieAttendances.length} gelogd
                  </span>
                  <button
                    onClick={() => setIsAttendanceModalOpen(true)}
                    className="text-amber-600 hover:underline font-semibold"
                  >
                    + Log
                  </button>
                </div>
              </div>

              {/* Instrument 5 */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">
                    Instrument 5
                  </div>
                  <div className="font-semibold text-sm mb-1.5">Koffiegesprek</div>
                  <p className="text-xs text-muted-foreground">
                    Bilateraal overleg partijvoorzitter en fractievoorzitter ter continue rolbewaking.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                  <span className="font-medium text-foreground">
                    {coffeeChats.length} sessies
                  </span>
                  <button
                    onClick={() => setIsCoffeeModalOpen(true)}
                    className="text-amber-600 hover:underline font-semibold"
                  >
                    + Overleg
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Meetings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold font-display flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-amber-600" />
                  Eerstvolgende Vergaderingen & Voorzittersorde
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveSubTab("vergaderingen")}
                  className="text-xs text-amber-600"
                >
                  Alle vergaderingen
                </Button>
              </div>

              <div className="space-y-3">
                {meetings.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          m.type === "ALV" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                        }`}>
                          {m.type}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {m.date}
                        </span>
                      </div>
                      <div className="font-medium text-sm truncate">{m.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {m.location}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenMeetingNotes(m)}
                      className="text-xs gap-1 shrink-0 h-8 border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    >
                      <Gavel className="w-3 h-3" />
                      <span>Voorzittersregie</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold font-display flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-amber-600" />
                  Recente Inwonerssignalen uit Steenwijkerland
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveSubTab("netwerk")}
                  className="text-xs text-amber-600"
                >
                  Alle signalen
                </Button>
              </div>

              <div className="space-y-3">
                {(network?.communitySignals || []).slice(0, 3).map((sig) => (
                  <div
                    key={sig.id}
                    className="p-3.5 rounded-xl border border-border bg-muted/20"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {sig.location}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{sig.receivedDate}</span>
                    </div>
                    <div className="text-sm font-medium text-foreground">{sig.topic}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                      <span>Bron: {sig.source}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300">
                        {sig.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: VERGADERINGLEIDING (ALV & BESTUUR) */}
      {activeSubTab === "vergaderingen" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold font-display flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-amber-600" />
                  Vergaderingleiding door de Voorzitter
                </h3>
                <p className="text-xs text-muted-foreground">
                  De voorzitter leidt zowel de Algemene Ledenvergadering (ALV) als de Bestuursvergaderingen conform statuten en het huishoudelijk reglement.
                </p>
              </div>
            </div>

            {/* Chairman Guidelines Callout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-border bg-muted/20">
                <div className="font-semibold text-sm mb-1 flex items-center gap-2">
                  <Quote className="w-4 h-4 text-amber-600" />
                  1. Opening & Sfeerzetting
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Start met een bondig openingswoord, schets de politieke context in Steenwijkerland, noem successen van de fractie en heet nieuwe leden expliciet welkom.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/20">
                <div className="font-semibold text-sm mb-1 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  2. Spreektijden & Orde
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bewaak de orde streng doch rechtvaardig. Hanteer maximale spreektijd per fractielid of spreker (bijv. 3 minuten) en zorg dat alle leden gelijke kansen krijgen.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/20">
                <div className="font-semibold text-sm mb-1 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-amber-600" />
                  3. Stemprocedures
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Stemming over zaken gebeurt bij acclamatie of handopsteken. Stemming over personen (bestuursleden, kandidatenlijst) gebeurt statutair schriftelijk met een stembureau.
                </p>
              </div>
            </div>

            {/* Meetings Table */}
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-3.5">Type & Titel</th>
                    <th className="p-3.5">Datum & Tijd</th>
                    <th className="p-3.5">Locatie</th>
                    <th className="p-3.5">Voorzittersprocedure & Notities</th>
                    <th className="p-3.5 text-right">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {meetings.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.type === "ALV" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                          }`}>
                            {m.type}
                          </span>
                          <span className="font-semibold text-foreground">{m.title}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Status: <span className="font-medium text-foreground">{m.status}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">{m.date}</div>
                        <div>{m.time}</div>
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 font-medium text-foreground">
                          <MapPin className="w-3.5 h-3.5 text-amber-600" />
                          {m.location}
                        </div>
                      </td>
                      <td className="p-3.5 text-xs">
                        {m.chairmanOpeningNotes || m.orderNotes ? (
                          <div className="text-xs text-foreground bg-amber-500/5 border border-amber-500/20 p-2 rounded-lg max-w-xs truncate">
                            <span className="font-semibold text-amber-700 dark:text-amber-300">Regie:</span> {m.chairmanOpeningNotes || m.orderNotes}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Nog geen specifieke regie genoteerd</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleOpenMeetingNotes(m)}
                          className="text-xs gap-1.5 h-8 bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <Gavel className="w-3 h-3" />
                          <span>Leiding & Regie</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: DE 5 FRACTIE-INSTRUMENTEN */}
      {activeSubTab === "fractie" && (
        <div className="space-y-8">
          {/* Header intro */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-xl font-bold font-display flex items-center gap-2 mb-2">
              <Award className="w-6 h-6 text-amber-600" />
              De 5 Instrumenten voor de Fractierelatie
            </h3>
            <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Het handboek van het Kennispunt Lokale Politieke Partijen beschrijft vijf concrete instrumenten waarmee de partijvoorzitter de fractie ondersteunt, stimuleert en de statutaire partijlijnen borgt zonder op de stoel van de fractievoorzitter te gaan zitten.
            </p>
          </div>

          {/* Instrument 1: Startgesprek */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-border">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
                  Instrument 1
                </div>
                <h4 className="text-lg font-semibold font-display">
                  Het Startgesprek na de Verkiezingen
                </h4>
                <p className="text-xs text-muted-foreground">
                  Afspraken over realisatie van het verkiezingsprogramma, communicatieregels en ledenraadpleging.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setStartgesprekForm(fractieStart || {});
                  setIsStartgesprekModalOpen(true);
                }}
                className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Kaders Bewerken</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border bg-muted/20">
                <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Ambities & Verkiezingsprogramma
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  {fractieStart?.ambitions || "Nog niet vastgelegd."}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/20">
                <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Ledenbetrokkenheid & Raadpleging
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  {fractieStart?.memberInvolvementAgreements || "Nog niet vastgelegd."}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/20">
                <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Communicatie & Rolbewaking
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  {fractieStart?.communicationRules || "Nog niet vastgelegd."}
                </p>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground text-right">
              Laatst geëvalueerd op: {fractieStart?.lastReviewedAt || "Onbekend"}
            </div>
          </div>

          {/* Instrument 2: Voortgangsgesprekken */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-border">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
                  Instrument 2
                </div>
                <h4 className="text-lg font-semibold font-display">
                  Jaarlijkse Voortgangs- & Functioneringsgesprekken
                </h4>
                <p className="text-xs text-muted-foreground">
                  Persoonlijke ontwikkelgesprekken met raadsleden over competenties, scholing en ondersteuningsbehoefte.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleOpenNewInterview}
                className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nieuw Gesprek Registreren</span>
              </Button>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-3.5">Fractielid & Functie</th>
                    <th className="p-3.5">Gespreksdatum</th>
                    <th className="p-3.5">Competenties & Ontwikkeling</th>
                    <th className="p-3.5">Ondersteuning Partij</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fractieInterviews.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5">
                        <div className="font-semibold text-foreground">{item.politicianName}</div>
                        <div className="text-xs text-muted-foreground">{item.roleTitle}</div>
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">{item.interviewDate}</div>
                        {item.nextReviewDate && (
                          <div className="text-[11px] text-amber-600">Volgende: {item.nextReviewDate}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-xs max-w-xs">
                        <div className="line-clamp-2 text-foreground">{item.competencies || "-"}</div>
                      </td>
                      <td className="p-3.5 text-xs max-w-xs">
                        <div className="line-clamp-2 text-foreground">{item.supportNeeded || "-"}</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === "afgerond"
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEditInterview(item)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteInterview(item.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {fractieInterviews.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-xs text-muted-foreground italic">
                        Nog geen voortgangsgesprekken geregistreerd.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Instrument 3: De Tussenbalans */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-border">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
                  Instrument 3
                </div>
                <h4 className="text-lg font-semibold font-display">
                  De Tussenbalans (Halverwege de Raadsperiode)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Evaluatie na twee jaar over kiezersbeloften, fractie-eenheid en inwonerscontact.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setTussenbalansForm(tussenbalans || {});
                  setIsTussenbalansModalOpen(true);
                }}
                className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Tussenbalans Actualiseren</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col justify-center items-center text-center">
                <div className="text-3xl font-bold font-display text-amber-600">
                  {tussenbalans?.programRealizationScore || 82}%
                </div>
                <div className="text-xs font-semibold text-foreground mt-1">
                  Programmarealisatie
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Speerpunten ingebracht in raad
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/20 md:col-span-3">
                <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Samenvatting & Conclusies
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  {tussenbalans?.summary || "Nog geen samenvatting ingevoerd."}
                </p>
                <div className="mt-3 pt-3 border-t border-border">
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    Belangrijkste Actiepunten:
                  </span>
                  <ul className="mt-1 space-y-1">
                    {(tussenbalans?.actionPoints || []).map((pt, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Instrument 4 & 5 Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Instrument 4: Fractiebijwoningen */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-0.5">
                    Instrument 4
                  </div>
                  <h4 className="font-semibold text-base">Bijwonen Fractievergaderingen</h4>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsAttendanceModalOpen(true)}
                  className="text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white h-8"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Bezoek</span>
                </Button>
              </div>

              <div className="space-y-3">
                {fractieAttendances.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-xl border border-border bg-muted/20 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {att.date}
                      </span>
                      <span className="text-muted-foreground text-[11px]">{att.attendee}</span>
                    </div>
                    <div className="text-xs text-foreground font-medium">{att.keyTopics}</div>
                    {att.alignmentNotes && (
                      <div className="text-[11px] text-muted-foreground bg-background p-2 rounded border border-border">
                        {att.alignmentNotes}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                      <span>Volgende bijeenkomst: {att.nextDate || "Niet gepland"}</span>
                      <button
                        onClick={() => handleDeleteAttendance(att.id)}
                        className="text-red-500 hover:underline"
                      >
                        Verwijderen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instrument 5: Bilateraal Koffiegesprek */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-0.5">
                    Instrument 5
                  </div>
                  <h4 className="font-semibold text-base">Bilateraal Koffieoverleg</h4>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsCoffeeModalOpen(true)}
                  className="text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white h-8"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Koffieoverleg</span>
                </Button>
              </div>

              <div className="space-y-3">
                {coffeeChats.map((chat) => (
                  <div
                    key={chat.id}
                    className="p-3 rounded-xl border border-border bg-muted/20 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <Coffee className="w-3.5 h-3.5" /> {chat.date}
                      </span>
                      <span className="text-muted-foreground text-[11px]">{chat.location}</span>
                    </div>
                    <div className="text-xs text-foreground font-medium">{chat.topics}</div>
                    {chat.conclusions && (
                      <div className="text-[11px] text-muted-foreground bg-background p-2 rounded border border-border">
                        <span className="font-semibold text-foreground">Afspraak:</span> {chat.actionAgreed || chat.conclusions}
                      </div>
                    )}
                    <div className="flex items-center justify-end text-[10px] pt-1 border-t border-border/50">
                      <button
                        onClick={() => handleDeleteCoffee(chat.id)}
                        className="text-red-500 hover:underline"
                      >
                        Verwijderen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: ORGANISATIE VAN HET BESTUUR & COMMISSIES */}
      {activeSubTab === "commissies" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold font-display flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-600" />
                  Organisatie van het Bestuur & Commissies
                </h3>
                <p className="text-xs text-muted-foreground">
                  De voorzitter waarborgt de samenstelling van het bestuur en stuurt sleutelcommissies aan conform het handboek.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleOpenNewCommittee}
                className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nieuwe Commissie Toevoegen</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {committees.map((com) => (
                <div
                  key={com.id}
                  className="p-5 rounded-xl border border-border bg-muted/20 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-base text-foreground flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-600" />
                        {com.name}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        com.status === "actief" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      }`}>
                        {com.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                      {com.purpose}
                    </p>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between bg-background p-2 rounded border border-border">
                        <span className="text-muted-foreground">Coördinator / Lead:</span>
                        <span className="font-semibold text-foreground">{com.lead}</span>
                      </div>
                      <div className="flex items-center justify-between bg-background p-2 rounded border border-border">
                        <span className="text-muted-foreground">Leden commissie:</span>
                        <span className="font-medium text-foreground">{Array.isArray(com.members) ? com.members.join(", ") : com.members}</span>
                      </div>
                      <div className="bg-background p-2.5 rounded border border-border">
                        <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 mb-1">
                          Mandaat & Voortgang:
                        </div>
                        <div className="text-muted-foreground">{com.progressNotes}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground text-[11px]">
                      {(Array.isArray(com.members) ? com.members.length : 0)} lid/leden
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditCommittee(com)}
                        className="h-7 text-[11px] gap-1 px-2.5 border-border hover:border-amber-500/50 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3 text-amber-600" />
                        <span>Bewerken</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCommittee(com.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10 cursor-pointer"
                        title="Commissie verwijderen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {committees.length === 0 && (
                <div className="col-span-2 text-center py-10 text-muted-foreground text-xs italic">
                  Er zijn momenteel geen actieve of geregistreerde commissies. Klik op 'Nieuwe Commissie Toevoegen'.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: DE 4-JAARCYCLUS */}
      {activeSubTab === "jaarcyclus" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold font-display flex items-center gap-2">
                  <Compass className="w-5 h-5 text-amber-600" />
                  De 4-Jaarcyclus van de Lokale Partij
                </h3>
                <p className="text-xs text-muted-foreground">
                  Stapsgewijze sturing door de voorzittersrol van de 4-jarige gemeenteraadsperiode (conform Kennispunt Lokale Politieke Partijen).
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Huidige Fase: Jaar 3 (Tussenbalans & Talent)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {fourYearCycle.map((cyc) => (
                <div
                  key={cyc.year}
                  className={`p-5 rounded-xl border flex flex-col justify-between ${
                    cyc.year === 3
                      ? "border-amber-500/40 bg-amber-500/5 shadow-md shadow-amber-500/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                        {cyc.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        cyc.status === "afgerond"
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : cyc.status === "actief"
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {cyc.status}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                      {cyc.focus}
                    </p>

                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
                        <span>Mijlpalen & Taken:</span>
                        <span className="text-[10px] text-muted-foreground">
                          {cyc.milestones.filter((m) => m.done).length}/{cyc.milestones.length}
                        </span>
                      </div>
                      {cyc.milestones.map((ms, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleToggleCycleMilestone(cyc.year, idx)}
                          className="flex items-start gap-2 p-2 rounded-lg bg-background border border-border cursor-pointer hover:border-amber-500/40 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={ms.done}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <span className={`text-xs ${ms.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {ms.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditCycleYear(cyc)}
                      className="w-full text-[11px] gap-1.5 h-8 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3 text-amber-600" />
                      <span>Jaar {cyc.year} Beheren & Taken Toevoegen</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 6: INTEGRITEIT & BEMIDDELING */}
      {activeSubTab === "integriteit" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold font-display flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-600" />
                  Integriteit, Gedragscode & Bemiddeling
                </h3>
                <p className="text-xs text-muted-foreground">
                  Het handboek benadrukt: de voorzitter heeft een cruciale voorbeeldfunctie, bewaakt de integriteitskaders en fungeert als neutrale verbinder en bemiddelaar bij interne meningsverschillen.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="p-5 rounded-xl border border-border bg-muted/20">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Gedragscode & Kernbeginselen
                </h4>
                <div className="space-y-2.5">
                  {(integrity?.integrityPrinciples || []).map((prin, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{prin}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                  Vastgesteld op ALV: {integrity?.codeOfConductAdoptedDate || "2023-11-15"}
                </div>
              </div>

              <div className="p-5 rounded-xl border border-border bg-muted/20">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-foreground">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Rol van de Voorzitter bij Conflicten & Crises
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Bij conflicten binnen het bestuur of de fractie kiest de voorzitter geen partij, maar voert neutrale 'hoor en wederhoor'-gesprekken en herinnert partijen aan de statutaire doelstellingen.
                </p>
                <div className="bg-background p-3 rounded-lg border border-border space-y-1.5 text-xs">
                  <div className="font-semibold text-foreground">Crisisprotocol:</div>
                  <div className="text-muted-foreground">1. Eén woordvoerder naar de pers (uitsluitend partijvoorzitter).</div>
                  <div className="text-muted-foreground">2. Geen verklaringen op sociale media door individuele bestuurs- of fractieleden.</div>
                  <div className="text-muted-foreground">3. Spoedberaad van het voltallige dagelijks bestuur binnen 24 uur.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 7: INWONERSVERBINDING & NETWERK */}
      {activeSubTab === "netwerk" && (
        <div className="space-y-8">
          {/* Section 1: Inwonerssignalen & Dorpsgesprekken */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold font-display flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-amber-600" />
                  De Voorzitter als Verbinder met Inwoners
                </h3>
                <p className="text-xs text-muted-foreground">
                  Signalen ophalen uit de kernen (Oldemarkt, Blokzijl, Giethoorn, Steenwijk) en doorspelen naar de fractie.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsSignalModalOpen(true)}
                className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nieuw Signaal Noteren</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {(network?.communitySignals || []).map((sig) => (
                <div key={sig.id} className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {sig.location}
                      </span>
                      <span className="text-muted-foreground text-[11px]">{sig.receivedDate}</span>
                    </div>
                    <h5 className="font-semibold text-sm text-foreground mb-1">{sig.topic}</h5>
                    <p className="text-xs text-muted-foreground mb-2">Bron: {sig.source}</p>
                    {sig.followUp && (
                      <div className="bg-background p-2 rounded border border-border text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Opvolging:</span> {sig.followUp}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Status: {sig.status}</span>
                    <div className="flex items-center gap-1.5">
                      {sig.status !== "afgehandeld door fractie" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateSignalStatus(sig.id, "afgehandeld door fractie")}
                          className="text-[11px] text-emerald-600 hover:bg-emerald-500/10 h-7 px-2"
                        >
                          Markeer Afgehandeld
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSignal(sig.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10 cursor-pointer"
                        title="Signaal verwijderen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Colleague chairs */}
            <div className="pt-4 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  Contacten met Collega-Voorzitters in Steenwijkerland
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenNewColleagueChair}
                  className="text-xs gap-1.5 h-8 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  <span>Collega-voorzitter Toevoegen</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(network?.colleagueChairs || []).map((c, idx) => (
                  <div key={c.id || idx} className="p-3.5 rounded-lg border border-border bg-background text-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="font-bold text-foreground text-sm">{c.party}</div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditColleagueChair(c)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Bewerken"
                          >
                            <Pencil className="w-3 h-3 text-amber-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteColleagueChair(c.id, c.party)}
                            className="p-1 rounded hover:bg-rose-500/10 text-red-500"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-muted-foreground font-medium">{c.contactPerson}</div>
                      {c.lastContact && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Laatste contact: {c.lastContact}
                        </div>
                      )}
                      {c.notes && (
                        <div className="text-[11px] text-muted-foreground mt-2 bg-muted/30 p-2 rounded border border-border/40">
                          {c.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Inwoners-belafspraken uit het ledenportaal */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold font-display flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-amber-600" />
                Inwoners Belafspraken & Spreekuren
              </h3>
              <p className="text-xs text-muted-foreground">
                Inzage en beheer van alle inwonersaanvragen voor een belafspraak of spreekuur met de fractieleden.
              </p>
            </div>
            <BelafsprakenManager token={token} headers={headers} />
          </div>
        </div>
      )}

      {/* SUBTAB 8: BESTUUR & DOCUMENTEN BEHEER (/bestuur) */}
      {activeSubTab === "bestuur" && (
        <BestuurManager
          token={token}
          headers={headers}
          onUpdated={loadChairmanData}
        />
      )}

      {/* MODAL: Voortgangsgesprek (Toevoegen of Bewerken) */}
      <Dialog open={isInterviewModalOpen} onOpenChange={setIsInterviewModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingInterview ? "Voortgangsgesprek Bewerken" : "Nieuw Voortgangsgesprek Voeren"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registreer het functioneringsgesprek met het fractielid conform Kennispunt Lokale Politieke Partijen.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveInterview} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Fractielid</label>
                <Input
                  value={interviewForm.politicianName || ""}
                  onChange={(e) => setInterviewForm({ ...interviewForm, politicianName: e.target.value })}
                  placeholder="bijv. Sammy van Andel, Lisa Mars"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Functie in Raad</label>
                <Input
                  value={interviewForm.roleTitle || ""}
                  onChange={(e) => setInterviewForm({ ...interviewForm, roleTitle: e.target.value })}
                  placeholder="Fractievoorzitter, Raadslid"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Gespreksdatum</label>
                <Input
                  type="date"
                  value={interviewForm.interviewDate || ""}
                  onChange={(e) => setInterviewForm({ ...interviewForm, interviewDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Status</label>
                <select
                  value={interviewForm.status || "gepland"}
                  onChange={(e) => setInterviewForm({ ...interviewForm, status: e.target.value as any })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="gepland">Gepland</option>
                  <option value="afgerond">Afgerond</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Competenties & Sterke Punten</label>
              <Textarea
                rows={2}
                value={interviewForm.competencies || ""}
                onChange={(e) => setInterviewForm({ ...interviewForm, competencies: e.target.value })}
                placeholder="Dossierkennis, debatteren, contact met dorpen, onderhandelen..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Ondersteuning & Scholing Partij</label>
              <Textarea
                rows={2}
                value={interviewForm.supportNeeded || ""}
                onChange={(e) => setInterviewForm({ ...interviewForm, supportNeeded: e.target.value })}
                placeholder="Opleidingsbehoefte, communicatiehulp, zaalruimte..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Verwachtingen & Afspraken Partijbestuur</label>
              <Textarea
                rows={2}
                value={interviewForm.expectations || ""}
                onChange={(e) => setInterviewForm({ ...interviewForm, expectations: e.target.value })}
                placeholder="Wederzijdse verwachtingen, fractie-overleg..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Notities & Conclusies</label>
              <Textarea
                rows={3}
                value={interviewForm.notes || ""}
                onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                placeholder="Samenvatting en concrete afspraken..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Datum Volgend Evaluatiegesprek</label>
              <Input
                type="date"
                value={interviewForm.nextReviewDate || ""}
                onChange={(e) => setInterviewForm({ ...interviewForm, nextReviewDate: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsInterviewModalOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Vergaderingleiding & Regie */}
      <Dialog open={isMeetingNotesModalOpen} onOpenChange={setIsMeetingNotesModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Voorzittersregie: {selectedMeetingForNotes?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Leg uw openingswoord, spreektijdregeling en steminstructies vast voor deze vergadering.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMeetingNotes} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Openingswoord & Welkom</label>
              <Textarea
                rows={3}
                value={meetingNotesForm.chairmanOpeningNotes}
                onChange={(e) => setMeetingNotesForm({ ...meetingNotesForm, chairmanOpeningNotes: e.target.value })}
                placeholder="Welkomstwoord voor leden, schetsen van politieke highlights Steenwijkerland..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Orde der Vergadering & Interventies</label>
              <Textarea
                rows={2}
                value={meetingNotesForm.orderNotes}
                onChange={(e) => setMeetingNotesForm({ ...meetingNotesForm, orderNotes: e.target.value })}
                placeholder="Agendapunten van orde, eventuele moties van wantrouwen of schorsingen..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Spreektijdbeperkingen</label>
              <Input
                value={meetingNotesForm.speakingTimeLimits}
                onChange={(e) => setMeetingNotesForm({ ...meetingNotesForm, speakingTimeLimits: e.target.value })}
                placeholder="bijv. 3 minuten per fractielid / 2 minuten per lid"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Stemprocedure & Stembureau</label>
              <Textarea
                rows={2}
                value={meetingNotesForm.votingProcedureNotes}
                onChange={(e) => setMeetingNotesForm({ ...meetingNotesForm, votingProcedureNotes: e.target.value })}
                placeholder="Zaken: bij acclamatie. Personen: schriftelijk via stembureau (2 leden)..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsMeetingNotesModalOpen(false)}>
                Sluiten
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                Regie Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Bilateraal Koffiegesprek */}
      <Dialog open={isCoffeeModalOpen} onOpenChange={setIsCoffeeModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Bilateraal Koffieoverleg Vastleggen</DialogTitle>
            <DialogDescription className="text-xs">
              Overleg tussen partijvoorzitter en fractievoorzitter (rolbewaking politiek leider vs. partijorganisatie).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCoffee} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Datum</label>
                <Input
                  type="date"
                  value={coffeeForm.date || ""}
                  onChange={(e) => setCoffeeForm({ ...coffeeForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Locatie</label>
                <Input
                  value={coffeeForm.location || ""}
                  onChange={(e) => setCoffeeForm({ ...coffeeForm, location: e.target.value })}
                  placeholder="Café De Rechter / Fractiekamer"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Besproken Onderwerpen</label>
              <Textarea
                rows={3}
                value={coffeeForm.topics || ""}
                onChange={(e) => setCoffeeForm({ ...coffeeForm, topics: e.target.value })}
                placeholder="Campagnevoorbereiding, coalitiedynamiek, ALV..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Conclusies & Afspraken</label>
              <Textarea
                rows={3}
                value={coffeeForm.conclusions || ""}
                onChange={(e) => setCoffeeForm({ ...coffeeForm, conclusions: e.target.value })}
                placeholder="Wat is er concreet afgesproken..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCoffeeModalOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                Vastleggen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Fractiebezoek */}
      <Dialog open={isAttendanceModalOpen} onOpenChange={setIsAttendanceModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Bijwonen Fractievergadering</DialogTitle>
            <DialogDescription className="text-xs">
              Logboek bestuursafvaardiging bij de fractie voor de gemeenteraad van Steenwijkerland.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAttendance} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Datum</label>
                <Input
                  type="date"
                  value={attendanceForm.date || ""}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Aanwezige Bestuurder</label>
                <Input
                  value={attendanceForm.attendee || ""}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, attendee: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Agendapunten Fractie</label>
              <Textarea
                rows={2}
                value={attendanceForm.keyTopics || ""}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, keyTopics: e.target.value })}
                placeholder="Voorbereiding raadsvergadering, dorpsvisies..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Afstemming met Partijbeginselen</label>
              <Textarea
                rows={2}
                value={attendanceForm.alignmentNotes || ""}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, alignmentNotes: e.target.value })}
                placeholder="Bestuur heeft aandacht gevraagd voor kaders verkiezingsprogramma..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAttendanceModalOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                Vastleggen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Inwonerssignaal */}
      <Dialog open={isSignalModalOpen} onOpenChange={setIsSignalModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Inwonerssignaal Registreren</DialogTitle>
            <DialogDescription className="text-xs">
              Noteer een signaal of klacht uit een van de kernen om door te spelen naar de fractie.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSignal} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Dorp of Wijk</label>
                <Input
                  value={signalForm.location || ""}
                  onChange={(e) => setSignalForm({ ...signalForm, location: e.target.value })}
                  placeholder="Oldemarkt, Blokzijl, Giethoorn..."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Bron</label>
                <Input
                  value={signalForm.source || ""}
                  onChange={(e) => setSignalForm({ ...signalForm, source: e.target.value })}
                  placeholder="Inwonergesprek, jaarmarkt, mail..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Onderwerp & Toelichting</label>
              <Textarea
                rows={3}
                value={signalForm.topic || ""}
                onChange={(e) => setSignalForm({ ...signalForm, topic: e.target.value })}
                placeholder="Verkeerssituatie, dorpshuis, woningbouwlocatie..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Gewenste Opvolging Fractie</label>
              <Textarea
                rows={2}
                value={signalForm.followUp || ""}
                onChange={(e) => setSignalForm({ ...signalForm, followUp: e.target.value })}
                placeholder="Schriftelijke raadsvragen voorbereiden, werkbezoek..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsSignalModalOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                Signaal Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Startgesprek Kaders */}
      <Dialog open={isStartgesprekModalOpen} onOpenChange={setIsStartgesprekModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Startgesprek Kaders Bewerken</DialogTitle>
            <DialogDescription className="text-xs">
              Instrument 1: De basisafspraken tussen partijbestuur en raadsfractie.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveStartgesprek} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Ambities & Verkiezingsprogramma</label>
              <Textarea
                rows={3}
                value={startgesprekForm.ambitions || ""}
                onChange={(e) => setStartgesprekForm({ ...startgesprekForm, ambitions: e.target.value })}
                placeholder="Belangrijkste programmapunten, coalitiedoelen..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Ledenbetrokkenheid & Raadpleging</label>
              <Textarea
                rows={3}
                value={startgesprekForm.memberInvolvementAgreements || ""}
                onChange={(e) => setStartgesprekForm({ ...startgesprekForm, memberInvolvementAgreements: e.target.value })}
                placeholder="Frequentie van ledenraadplegingen, thematische werkgroepen..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Communicatie & Rolbewaking</label>
              <Textarea
                rows={3}
                value={startgesprekForm.communicationRules || ""}
                onChange={(e) => setStartgesprekForm({ ...startgesprekForm, communicationRules: e.target.value })}
                placeholder="Rolverdeling partij vs fractie, overlegfrequentie..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsStartgesprekModalOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                Kaders Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Tussenbalans Actualiseren */}
      <Dialog open={isTussenbalansModalOpen} onOpenChange={setIsTussenbalansModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">De Tussenbalans Actualiseren</DialogTitle>
            <DialogDescription className="text-xs">
              Instrument 3: Evaluatie halverwege de 4-jarige raadsperiode.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTussenbalans} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Programmarealisatie Score (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={tussenbalansForm.programRealizationScore || 80}
                onChange={(e) => setTussenbalansForm({ ...tussenbalansForm, programRealizationScore: parseInt(e.target.value, 10) })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Samenvatting & Beoordeling Samenwerking</label>
              <Textarea
                rows={4}
                value={tussenbalansForm.summary || ""}
                onChange={(e) => setTussenbalansForm({ ...tussenbalansForm, summary: e.target.value })}
                placeholder="Hoe functioneert de fractie in Steenwijkerland? Wat zijn de sterke punten..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsTussenbalansModalOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                Tussenbalans Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Commissie Aanmaken / Bewerken */}
      <Dialog open={isCommitteeModalOpen} onOpenChange={setIsCommitteeModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingCommittee ? "Commissie Bewerken" : "Nieuwe Commissie Oprichten"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Stuur sleutelcommissies en werkgroepen van de partij aan volgens de statuten en het voorzittersmandaat.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCommittee} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Naam van de Commissie *</label>
              <Input
                value={committeeForm.name || ""}
                onChange={(e) => setCommitteeForm({ ...committeeForm, name: e.target.value })}
                placeholder="Bijv. Permanente Scoutingscommissie, Campagneteam..."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Coördinator / Lead</label>
                <Input
                  value={committeeForm.lead || ""}
                  onChange={(e) => setCommitteeForm({ ...committeeForm, lead: e.target.value })}
                  placeholder="Naam commissieleider..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Status</label>
                <select
                  value={committeeForm.status || "actief"}
                  onChange={(e) => setCommitteeForm({ ...committeeForm, status: e.target.value as any })}
                  className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="actief">Actief</option>
                  <option value="voorbereiding">In oprichting / Voorbereiding</option>
                  <option value="inactief">Inactief / Afgerond project</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Leden (kommagescheiden)</label>
              <Input
                value={Array.isArray(committeeForm.members) ? committeeForm.members.join(", ") : committeeForm.members || ""}
                onChange={(e) => setCommitteeForm({
                  ...committeeForm,
                  members: e.target.value.split(",").map((m) => m.trim()).filter(Boolean)
                })}
                placeholder="Jan Jansen, Marieke de Vries, Sammy van Andel..."
              />
              <span className="text-[10px] text-muted-foreground">Voer namen gescheiden door een komma in.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Doel / Taakstelling</label>
              <Textarea
                rows={2}
                value={committeeForm.purpose || ""}
                onChange={(e) => setCommitteeForm({ ...committeeForm, purpose: e.target.value })}
                placeholder="Wat is het hoofddoel en het resultaat van deze commissie?"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Formeel Mandaat & Beslissingsbevoegdheid</label>
              <Textarea
                rows={2}
                value={committeeForm.mandate || ""}
                onChange={(e) => setCommitteeForm({ ...committeeForm, mandate: e.target.value })}
                placeholder="Welke bevoegdheid heeft de commissie namens het bestuur/ALV?"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Voortgangsnotities & Werkwijze</label>
              <Textarea
                rows={2}
                value={committeeForm.progressNotes || ""}
                onChange={(e) => setCommitteeForm({ ...committeeForm, progressNotes: e.target.value })}
                placeholder="Huidige stand van zaken, geplande bijeenkomsten..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCommitteeModalOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                {editingCommittee ? "Wijzigingen Opslaan" : "Commissie Oprichten"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: 4-Jaarcyclus Beheren */}
      <Dialog open={isCycleModalOpen} onOpenChange={setIsCycleModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {selectedCycleYear ? `${selectedCycleYear.label} Beheren` : "Jaarcyclus Beheren"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pas de strategische focus aan, wijzig de status en beheer de mijlpalen en taken van dit jaar in de 4-jaarcyclus.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCycleYear} className="space-y-5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Status van dit Cyclusjaar</label>
                <select
                  value={cycleYearForm.status}
                  onChange={(e) => setCycleYearForm({ ...cycleYearForm, status: e.target.value as any })}
                  className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="gepland">Gepland</option>
                  <option value="actief">Actief (Huidige fase)</option>
                  <option value="afgerond">Voltooid / Afgerond</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Totaal Taken</label>
                <div className="h-9 flex items-center px-3 bg-muted/40 rounded border border-border text-xs text-muted-foreground">
                  {cycleYearForm.milestones.filter((m) => m.done).length} van de {cycleYearForm.milestones.length} voltooid
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Strategische Focus / Kernopgave</label>
              <Textarea
                rows={2}
                value={cycleYearForm.focus}
                onChange={(e) => setCycleYearForm({ ...cycleYearForm, focus: e.target.value })}
                placeholder="Kernopgave van dit jaar in de 4-jarige raadsperiode..."
              />
            </div>

            {/* Mijlpalen & Taken List */}
            <div className="space-y-2">
              <label className="text-xs font-semibold flex items-center justify-between">
                <span>Mijlpalen & Actiepunten van dit jaar</span>
                <span className="text-[11px] font-normal text-muted-foreground">Klik checkbox om status te wijzigen</span>
              </label>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {cycleYearForm.milestones.map((ms, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-background border border-border hover:border-amber-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 flex-1 mr-2">
                      <input
                        type="checkbox"
                        checked={ms.done}
                        onChange={() => handleToggleFormMilestone(index)}
                        className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className={`text-xs leading-tight ${ms.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {ms.text}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMilestoneFromCycleYear(index)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      title="Taak verwijderen"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                {cycleYearForm.milestones.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-2 text-center">
                    Nog geen taken toegevoegd aan dit jaar.
                  </p>
                )}
              </div>

              {/* Add New Milestone Row */}
              <div className="flex items-center gap-2 pt-2">
                <Input
                  value={cycleYearForm.newMilestoneText}
                  onChange={(e) => setCycleYearForm({ ...cycleYearForm, newMilestoneText: e.target.value })}
                  placeholder="Nieuwe taak of mijlpaal toevoegen..."
                  className="text-xs h-8"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMilestoneToCycleYear();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddMilestoneToCycleYear}
                  className="h-8 text-xs gap-1 shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Taak Toevoegen</span>
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCycleModalOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">
                Cyclusjaar Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Dagelijks Bestuur & Rollen Bewerken */}
      <Dialog open={isDailyBoardModalOpen} onOpenChange={setIsDailyBoardModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <span>Dagelijks Bestuur & Statutaire Rollen Beheren</span>
            </DialogTitle>
            <DialogDescription>
              Beheer de bestuurssamenstelling, taakverdeling conform de statuten en verenigingsrecht (WBTR) en de actuele operationele status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDailyBoard} className="space-y-6 pt-2">
            {/* Algemene Bestuursgegevens */}
            <div className="bg-muted/40 p-4 rounded-xl space-y-4 border border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-amber-600" />
                <span>Algemene Bestuurskaders & Status</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium block mb-1">Titel Bestuursorgaan</label>
                  <Input
                    value={dailyBoardForm.boardTitle || ""}
                    onChange={(e) => setDailyBoardForm({ ...dailyBoardForm, boardTitle: e.target.value })}
                    placeholder="Bijv. Bestuur"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Operationele Status</label>
                  <Input
                    value={dailyBoardForm.status || ""}
                    onChange={(e) => setDailyBoardForm({ ...dailyBoardForm, status: e.target.value })}
                    placeholder="Bijv. Bestuur Compleet & Operationeel"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">Statutaire Ondertitel / WBTR-grondslag</label>
                <Input
                  value={dailyBoardForm.boardSubtitle || ""}
                  onChange={(e) => setDailyBoardForm({ ...dailyBoardForm, boardSubtitle: e.target.value })}
                  placeholder="Statutaire taakverdeling en wisselwerking..."
                  required
                />
              </div>
            </div>

            {/* Partijvoorzitter */}
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Gavel className="w-3.5 h-3.5 text-amber-600" />
                  <span>Partijvoorzitter</span>
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">Voorzitterspaneel</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">Naam Voorzitter</label>
                  <Input
                    value={dailyBoardForm.chairman?.name || ""}
                    onChange={(e) =>
                      setDailyBoardForm({
                        ...dailyBoardForm,
                        chairman: { ...(dailyBoardForm.chairman || { roleTitle: "Partijvoorzitter", name: "", description: "" }), name: e.target.value }
                      })
                    }
                    placeholder="Naam partijvoorzitter"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">E-mailadres (optioneel)</label>
                  <Input
                    type="email"
                    value={dailyBoardForm.chairman?.email || ""}
                    onChange={(e) =>
                      setDailyBoardForm({
                        ...dailyBoardForm,
                        chairman: { ...(dailyBoardForm.chairman || { roleTitle: "Partijvoorzitter", name: "", description: "" }), email: e.target.value }
                      })
                    }
                    placeholder="voorzitter@partij.nl"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Taakverdeling & Verantwoordelijkheden</label>
                <Textarea
                  rows={2}
                  value={dailyBoardForm.chairman?.description || ""}
                  onChange={(e) =>
                    setDailyBoardForm({
                      ...dailyBoardForm,
                      chairman: { ...(dailyBoardForm.chairman || { roleTitle: "Partijvoorzitter", name: "", description: "" }), description: e.target.value }
                    })
                  }
                  placeholder="Taken en bevoegdheden van de voorzitter..."
                  required
                />
              </div>
            </div>

            {/* Secretaris */}
            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Secretaris</span>
                </span>
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">Secretarispaneel</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">Naam Secretaris</label>
                  <Input
                    value={dailyBoardForm.secretary?.name || ""}
                    onChange={(e) =>
                      setDailyBoardForm({
                        ...dailyBoardForm,
                        secretary: { ...(dailyBoardForm.secretary || { roleTitle: "Secretaris", name: "", description: "" }), name: e.target.value }
                      })
                    }
                    placeholder="Naam secretaris"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">E-mailadres (optioneel)</label>
                  <Input
                    type="email"
                    value={dailyBoardForm.secretary?.email || ""}
                    onChange={(e) =>
                      setDailyBoardForm({
                        ...dailyBoardForm,
                        secretary: { ...(dailyBoardForm.secretary || { roleTitle: "Secretaris", name: "", description: "" }), email: e.target.value }
                      })
                    }
                    placeholder="secretariaat@partij.nl"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Taakverdeling & Verantwoordelijkheden</label>
                <Textarea
                  rows={2}
                  value={dailyBoardForm.secretary?.description || ""}
                  onChange={(e) =>
                    setDailyBoardForm({
                      ...dailyBoardForm,
                      secretary: { ...(dailyBoardForm.secretary || { roleTitle: "Secretaris", name: "", description: "" }), description: e.target.value }
                    })
                  }
                  placeholder="Taken en bevoegdheden van de secretaris..."
                  required
                />
              </div>
            </div>

            {/* Penningmeester */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Penningmeester</span>
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">Penningmeesterpaneel</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">Naam Penningmeester</label>
                  <Input
                    value={dailyBoardForm.treasurer?.name || ""}
                    onChange={(e) =>
                      setDailyBoardForm({
                        ...dailyBoardForm,
                        treasurer: { ...(dailyBoardForm.treasurer || { roleTitle: "Penningmeester", name: "", description: "" }), name: e.target.value }
                      })
                    }
                    placeholder="Naam penningmeester"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">E-mailadres (optioneel)</label>
                  <Input
                    type="email"
                    value={dailyBoardForm.treasurer?.email || ""}
                    onChange={(e) =>
                      setDailyBoardForm({
                        ...dailyBoardForm,
                        treasurer: { ...(dailyBoardForm.treasurer || { roleTitle: "Penningmeester", name: "", description: "" }), email: e.target.value }
                      })
                    }
                    placeholder="penningmeester@partij.nl"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Taakverdeling & Verantwoordelijkheden</label>
                <Textarea
                  rows={2}
                  value={dailyBoardForm.treasurer?.description || ""}
                  onChange={(e) =>
                    setDailyBoardForm({
                      ...dailyBoardForm,
                      treasurer: { ...(dailyBoardForm.treasurer || { roleTitle: "Penningmeester", name: "", description: "" }), description: e.target.value }
                    })
                  }
                  placeholder="Taken en bevoegdheden van de penningmeester..."
                  required
                />
              </div>
            </div>

            {/* Extra Bestuursleden */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Aanvullende Bestuursleden (Optioneel)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Bijvoorbeeld Algemeen Bestuurslid, Campagnecoördinator of Vicevoorzitter.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddAdditionalMember}
                  className="text-xs gap-1.5 h-8 border-primary/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Lid Toevoegen</span>
                </Button>
              </div>

              {dailyBoardForm.additionalMembers && dailyBoardForm.additionalMembers.length > 0 && (
                <div className="space-y-3">
                  {dailyBoardForm.additionalMembers.map((member, index) => (
                    <div key={member.id} className="p-3.5 rounded-xl border border-border bg-card space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Lid #{index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAdditionalMember(member.id)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium block mb-1">Functietitel / Rol</label>
                          <Input
                            value={member.roleTitle}
                            onChange={(e) => {
                              const updated = [...(dailyBoardForm.additionalMembers || [])];
                              updated[index].roleTitle = e.target.value;
                              setDailyBoardForm({ ...dailyBoardForm, additionalMembers: updated });
                            }}
                            placeholder="Bijv. Algemeen Bestuurslid"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">Naam</label>
                          <Input
                            value={member.name}
                            onChange={(e) => {
                              const updated = [...(dailyBoardForm.additionalMembers || [])];
                              updated[index].name = e.target.value;
                              setDailyBoardForm({ ...dailyBoardForm, additionalMembers: updated });
                            }}
                            placeholder="Volledige naam"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium block mb-1">Taakomschrijving / Portefeuille</label>
                        <Input
                          value={member.description}
                          onChange={(e) => {
                            const updated = [...(dailyBoardForm.additionalMembers || [])];
                            updated[index].description = e.target.value;
                            setDailyBoardForm({ ...dailyBoardForm, additionalMembers: updated });
                          }}
                          placeholder="Bijv. Verantwoordelijk voor vrijwilligers en campagne-evenementen"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDailyBoardModalOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">
                Bestuurssamenstelling Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Collega-voorzitter Toevoegen / Bewerken */}
      <Dialog open={isColleagueChairModalOpen} onOpenChange={setIsColleagueChairModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600" />
              <span>{editingColleagueChair ? "Collega-voorzitter Bewerken" : "Collega-voorzitter Toevoegen"}</span>
            </DialogTitle>
            <DialogDescription>
              Onderhoud contacten met voorzitters van andere politieke partijen in Steenwijkerland.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveColleagueChair} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Partij of Fractie *</label>
              <Input
                required
                placeholder="Bijv. BGL, VVD Steenwijkerland, CDA, CPB"
                value={colleagueChairForm.party}
                onChange={(e) => setColleagueChairForm({ ...colleagueChairForm, party: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Contactpersoon / Partijvoorzitter *</label>
              <Input
                required
                placeholder="Bijv. Jan de Vries"
                value={colleagueChairForm.contactPerson}
                onChange={(e) => setColleagueChairForm({ ...colleagueChairForm, contactPerson: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Datum Laatste Contact</label>
              <Input
                type="date"
                value={colleagueChairForm.lastContact}
                onChange={(e) => setColleagueChairForm({ ...colleagueChairForm, lastContact: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Notities / Relatie / Overlegpunten</label>
              <Textarea
                placeholder="Bijv. Kwartaaloverleg gehad over lokale democratie, afspraak voor voorjaar..."
                value={colleagueChairForm.notes}
                onChange={(e) => setColleagueChairForm({ ...colleagueChairForm, notes: e.target.value })}
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsColleagueChairModalOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">
                {editingColleagueChair ? "Wijzigingen Opslaan" : "Collega-voorzitter Opslaan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
