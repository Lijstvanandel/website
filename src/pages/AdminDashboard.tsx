import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchWithAuth } from "@/lib/api";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users,
  Video,
  ShieldCheck,
  Check,
  X,
  Upload,
  Newspaper,
  CalendarDays,
  MapPin,
  Tag,
  Pencil,
  ExternalLink,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Search,
  Trash2,
  Send,
  Inbox,
  HelpCircle,
  Download,
  Copy,
  FileSpreadsheet,
  Briefcase,
  FileText,
  BookOpen,
  Vote,
  Server,
  User,
  CreditCard,
  Coins,
  Receipt,
  QrCode,
  Ticket,
  BarChart3,
  UserCheck,
  UserX,
  TrendingDown,
  ThumbsUp,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoPlayer } from "@/components/VideoPlayer";
import { NewsContentEditor } from "@/components/NewsContentEditor";
import { CategoryManager, NewsCategory } from "@/components/CategoryManager";
import { FaqManager } from "@/components/FaqManager";
import { WijkManager } from "@/components/WijkManager";
import { VacancyManager } from "@/components/VacancyManager";
import { DocumentManager } from "@/components/DocumentManager";
import { TicketScannerModal } from "@/components/TicketScannerModal";
import { BelafsprakenManager } from "@/components/BelafsprakenManager";
import { StemgedragManager } from "@/components/StemgedragManager";
import { SystemManager } from "@/components/SystemManager";
import NewsletterManager from "@/components/admin/NewsletterManager";
import { StellingenManager } from "@/components/admin/StellingenManager";
import { WIJKEN_EN_KERNEN } from "@/data/wijken";
import { NewsItem } from "@/data/news";
import { hoofdstukken } from "@/data/partijprogramma";

interface UserItem {
  id: string;
  salutation?: string;
  fullName: string;
  username: string;
  email?: string;
  city?: string;
  role: string;
  isActive: boolean;
  newsletterSubscribed?: boolean;
  billingStatus?: "paid" | "pending" | "exempt" | "failed" | "cancelled";
  paidAmount?: number;
  paidAt?: string;
  paidUntil?: string;
  stripeCustomerId?: string;
  billingNotes?: string;
  createdAt?: string;
}

interface FractielidItem {
  id: string;
  name: string;
  firstName?: string;
  role: string;
  type: string;
  bio?: string;
  speerpunten?: string[];
  email?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  imageUrl?: string;
}

interface VideoItem {
  id: string;
  title: string;
  burgerraadslidTitle?: string;
  category: string;
  date: string;
  description?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  wijkSlug?: string;
  fractieledenIds?: string[];
  hoofdstukNr?: number | null;
  standpuntNr?: number | null;
  standpuntTitel?: string | null;
}

interface EventAttendee {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  ticketCode?: string;
  isMember?: boolean;
  price?: number;
  paid?: boolean;
  status?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
  checkInStatus?: "accepted" | "rejected" | "pending";
  scannedBy?: {
    id: string;
    name: string;
    role: string;
  };
  rejectionReason?: string;
  registeredAt?: string;
}

interface EventCancellationItem {
  id: string;
  eventId: string;
  ticketId?: string;
  ticketCode?: string;
  fullName?: string;
  email?: string;
  isMember?: boolean;
  cancelledAt: string;
  reason: string;
  hoursBeforeEvent?: number;
}

interface EventItem {
  id: string;
  title: string;
  date: string;
  address: string;
  startTime: string;
  endTime: string;
  shortDescription?: string;
  description: string;
  isPublic: boolean;
  isPublished: boolean;
  isCancelled?: boolean;
  thumbnailUrl?: string;
  nonMemberPrice?: number;
  ticketNotes?: string;
  locationHiddenUntil12h?: boolean;
  attendees?: EventAttendee[];
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: "moet nog beantwoord worden" | "afgehandeld";
  createdAt: string;
  handledAt?: string | null;
  handledBy?: string | null;
  notes?: string;
}

export default function AdminDashboard() {
  const { user, token, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

  const [users, setUsers] = useState<UserItem[]>([]);
  const [fractieleden, setFractieleden] = useState<FractielidItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [attendeesMap, setAttendeesMap] = useState<Record<string, EventAttendee[]>>({});
  const [isTicketScannerOpen, setIsTicketScannerOpen] = useState(false);

  // -- State for Contact Messages --
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [messageFilter, setMessageFilter] = useState<"all" | "moet nog beantwoord worden" | "afgehandeld">("all");
  const [messageSearch, setMessageSearch] = useState("");
  const [adminNoteInput, setAdminNoteInput] = useState("");

  // -- State for new Fractielid --
  const [newFNaam, setNewFNaam] = useState("");
  const [newFVoornaam, setNewFVoornaam] = useState("");
  const [newFRol, setNewFRol] = useState("");
  const [newFType, setNewFType] = useState("Raadslid");
  const [newFBio, setNewFBio] = useState("");
  const [newFSpeerpunten, setNewFSpeerpunten] = useState("");
  const [newFEmail, setNewFEmail] = useState("");
  const [newFFacebook, setNewFFacebook] = useState("");
  const [newFInstagram, setNewFInstagram] = useState("");
  const [newFLinkedin, setNewFLinkedin] = useState("");
  const [newFFile, setNewFFile] = useState<File | null>(null);

  // -- State for new Video --
  const [newVTitle, setNewVTitle] = useState("");
  const [newVBurgerTitle, setNewVBurgerTitle] = useState("");
  const [newVDescription, setNewVDescription] = useState("");
  const [newVCategory, setNewVCategory] = useState("");
  const [newVDate, setNewVDate] = useState("");
  const [newVUrl, setNewVUrl] = useState("");
  const [newVFile, setNewVFile] = useState<File | null>(null);
  const [newVThumbnail, setNewVThumbnail] = useState<File | null>(null);
  const [selectedFleden, setSelectedFleden] = useState<string[]>([]);
  const [newVWijk, setNewVWijk] = useState("");
  const [newVHoofdstuk, setNewVHoofdstuk] = useState<number | "">("");
  const [newVStandpunt, setNewVStandpunt] = useState<number | "">("");

  // -- State for new News --
  const [nTitle, setNTitle] = useState("");
  const [nCategory, setNCategory] = useState("");
  const [nWijkSlug, setNWijkSlug] = useState("");
  const [nAuthorId, setNAuthorId] = useState("");
  const [nDesc, setNDesc] = useState("");
  const [nContent, setNContent] = useState("");
  const [nThumb, setNThumb] = useState<File | null>(null);
  const [nHeader, setNHeader] = useState<File | null>(null);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);

  // -- State for Event --
  const [eTitle, setETitle] = useState("");
  const [eDate, setEDate] = useState("");
  const [eAddress, setEAddress] = useState("");
  const [eStart, setEStart] = useState("");
  const [eEnd, setEEnd] = useState("");
  const [eShortDesc, setEShortDesc] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [ePublic, setEPublic] = useState(true);
  const [ePublish, setEPublish] = useState(true);
  const [eThumb, setEThumb] = useState<File | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eNonMemberPrice, setENonMemberPrice] = useState("0");
  const [eTicketNotes, setETicketNotes] = useState("");
  const [eLocationHiddenUntil12h, setELocationHiddenUntil12h] = useState(true);

  // Cancellation and ticket management states
  const [cancellationsMap, setCancellationsMap] = useState<Record<string, EventCancellationItem[]>>({});
  const [activeAttendeeTab, setActiveAttendeeTab] = useState<Record<string, "attendees" | "cancellations">>({});
  const [eventAnalytics, setEventAnalytics] = useState<{
    summary: {
      totalRegistrations: number;
      activeRegistrations: number;
      totalCancellations: number;
      cancellationRate: number;
      avgHoursBeforeEvent: number;
    };
    reasonsBreakdown: Array<{ reason: string; count: number }>;
    allCancellations: any[];
  } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [showFullAnalyticsLog, setShowFullAnalyticsLog] = useState(false);

  const effectiveToken = token || (typeof window !== "undefined" ? localStorage.getItem("auth_token") : "") || "";
  const headers = useMemo(() => ({ Authorization: `Bearer ${effectiveToken}` }), [effectiveToken]);

  // Membership & Stripe settings state
  const [membershipData, setMembershipData] = useState<{
    settings: {
      enabled: boolean;
      amount: number;
      currency: string;
      interval: string;
      productName: string;
      description: string;
      requirePaymentAtRegistration: boolean;
    };
    stripe: {
      isConfigured: boolean;
      hasWebhookSecret: boolean;
      maskedSecretKey: string;
      publishableKey: string;
      webhookUrl: string;
    };
    stats: {
      totalMembers: number;
      paidMembers: number;
      pendingMembers: number;
      exemptMembers: number;
      totalRevenue: number;
      expectedAnnualRevenue: number;
    };
  } | null>(null);

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsAmount, setSettingsAmount] = useState("12.00");
  const [settingsEnabled, setSettingsEnabled] = useState(true);
  const [settingsRequirePayment, setSettingsRequirePayment] = useState(true);
  const [settingsProductName, setSettingsProductName] = useState("Lidmaatschap Lijst van Andel (1 jaar)");
  const [settingsDescription, setSettingsDescription] = useState("Jaarlijkse contributie voor partijleden");

  const fetchMembershipSettings = useCallback(() => {
    fetch("/api/admin/membership/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setMembershipData(data);
          if (data.settings) {
            setSettingsAmount(String(data.settings.amount ?? 12.00));
            setSettingsEnabled(data.settings.enabled !== false);
            setSettingsRequirePayment(data.settings.requirePaymentAtRegistration !== false);
            setSettingsProductName(data.settings.productName || "Lidmaatschap Lijst van Andel (1 jaar)");
            setSettingsDescription(data.settings.description || "Jaarlijkse contributie voor partijleden");
          }
        }
      })
      .catch(console.error);
  }, [token]);

  const handleSaveMembershipSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/membership/settings", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: settingsEnabled,
          amount: parseFloat(settingsAmount) || 12.00,
          requirePaymentAtRegistration: settingsRequirePayment,
          productName: settingsProductName,
          description: settingsDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon instellingen niet opslaan");
      toast.success("Contributie-instellingen succesvol opgeslagen!");
      fetchMembershipSettings();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Fout bij opslaan van instellingen");
    } finally {
      setSavingSettings(false);
    }
  };

  const changeUserBillingStatus = async (id: string, newBillingStatus: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/billing`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ billingStatus: newBillingStatus }),
      });
      if (res.ok) {
        toast.success("Facturatiestatus bijgewerkt");
        fetchUsers();
        fetchMembershipSettings();
      } else {
        toast.error("Kon facturatiestatus niet bijwerken");
      }
    } catch {
      toast.error("Fout bij bijwerken facturatiestatus");
    }
  };

  const fetchUsers = useCallback(() => {
    fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json().catch(() => []) : []))
      .then((data: UserItem[]) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(console.error);
  }, [token]);

  const fetchFractieleden = useCallback(() => {
    fetch("/api/fractieleden")
      .then((r) => (r.ok ? r.json().catch(() => []) : []))
      .then((data: FractielidItem[]) => {
        if (Array.isArray(data)) setFractieleden(data);
      })
      .catch(console.error);
  }, []);

  const fetchVideos = useCallback(() => {
    fetch("/api/videos")
      .then((r) => (r.ok ? r.json().catch(() => []) : []))
      .then((data: VideoItem[]) => {
        if (Array.isArray(data)) setVideos(data);
      })
      .catch(console.error);
  }, []);

  const fetchNews = useCallback(() => {
    fetch("/api/news")
      .then((r) => (r.ok ? r.json().catch(() => []) : []))
      .then((data: NewsItem[]) => {
        if (Array.isArray(data)) setNews(data);
      })
      .catch(console.error);
  }, []);

  const fetchEvents = useCallback(() => {
    fetch("/api/admin/events", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json().catch(() => []) : []))
      .then((data: EventItem[]) => {
        if (Array.isArray(data)) setEvents(data);
      })
      .catch(console.error);
  }, [token]);

  const fetchCategories = useCallback(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json().catch(() => []) : []))
      .then((data: NewsCategory[]) => {
        if (Array.isArray(data)) {
          setCategories(data);
          if (!nCategory && data.length > 0) {
            setNCategory(data[0].name);
          }
        }
      })
      .catch(console.error);
  }, [nCategory]);

  const fetchMessages = useCallback(() => {
    fetch("/api/admin/contact-messages", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json().catch(() => []) : []))
      .then((data: ContactMessage[]) => {
        if (Array.isArray(data)) {
          setMessages(data);
          setSelectedMessageId((prev) => {
            if (!prev && data.length > 0) return data[0].id;
            return prev;
          });
        }
      })
      .catch(console.error);
  }, [token]);

  const fetchCancellationAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch("/api/admin/events/cancellations/analytics", { headers });
      if (res.ok) {
        const data = await res.json();
        setEventAnalytics(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [headers]);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchUsers();
      fetchMembershipSettings();
      fetchFractieleden();
      fetchVideos();
      fetchNews();
      fetchEvents();
      fetchCancellationAnalytics();
      fetchCategories();
      fetchMessages();
    }
  }, [user, fetchUsers, fetchMembershipSettings, fetchFractieleden, fetchVideos, fetchNews, fetchEvents, fetchCancellationAnalytics, fetchCategories, fetchMessages]);

  useEffect(() => {
    if (selectedMessageId) {
      const msg = messages.find((m) => m.id === selectedMessageId);
      if (msg) {
        setAdminNoteInput(msg.notes || "");
      }
    }
  }, [selectedMessageId, messages]);

  const updateMessageStatus = async (id: string, newStatus: "afgehandeld" | "moet nog beantwoord worden") => {
    try {
      const res = await fetch(`/api/admin/contact-messages/${id}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(
          newStatus === "afgehandeld"
            ? "Bericht gemarkeerd als 'Afgehandeld'"
            : "Status teruggezet naar 'Moet nog beantwoord worden'"
        );
        fetchMessages();
      } else {
        toast.error("Fout bij bijwerken status");
      }
    } catch {
      toast.error("Fout bij bijwerken status");
    }
  };

  const saveAdminNote = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/contact-messages/${id}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ notes: adminNoteInput }),
      });
      if (res.ok) {
        toast.success("Interne notitie opgeslagen");
        fetchMessages();
      } else {
        toast.error("Fout bij opslaan notitie");
      }
    } catch {
      toast.error("Fout bij opslaan notitie");
    }
  };

  const deleteContactMessage = async (id: string) => {
    if (confirm("Weet u zeker dat u dit contactbericht wilt verwijderen?")) {
      try {
        const res = await fetch(`/api/admin/contact-messages/${id}`, {
          method: "DELETE",
          headers,
        });
        if (res.ok) {
          toast.success("Bericht verwijderd");
          setSelectedMessageId((prev) => (prev === id ? null : prev));
          fetchMessages();
        } else {
          toast.error("Fout bij verwijderen");
        }
      } catch {
        toast.error("Fout bij verwijderen");
      }
    }
  };

  const fetchAttendees = async (eventId: string) => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/attendees`, { headers });
      const data: EventAttendee[] = await res.json();
      setAttendeesMap((prev) => ({ ...prev, [eventId]: data }));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCancellations = async (eventId: string) => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/cancellations`, { headers });
      const data = await res.json();
      setCancellationsMap((prev) => ({ ...prev, [eventId]: Array.isArray(data) ? data : [] }));
    } catch (e) {
      console.error(e);
    }
  };

  const checkInTicket = async (
    ticketCode: string,
    eventId: string,
    decision: "accepted" | "rejected" | "reset" = "accepted",
    reason?: string
  ) => {
    try {
      const res = await fetch(`/api/admin/events/tickets/${encodeURIComponent(ticketCode)}/checkin`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(
          data.message ||
            (decision === "rejected"
              ? `Ticket #${ticketCode} gemarkeerd als geweigerd.`
              : decision === "reset"
              ? `Ticket #${ticketCode} status gereset.`
              : `Ticket #${ticketCode} succesvol geaccepteerd!`)
        );
        fetchAttendees(eventId);
      } else {
        toast.error(data.error || "Bijwerken mislukt.");
      }
    } catch {
      toast.error("Fout bij bijwerken status.");
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/status`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok) {
        toast.success("Gebruikersstatus bijgewerkt");
        fetchUsers();
      }
    } catch (error) {
      toast.error("Fout bij bijwerken");
    }
  };

  const changeUserRole = async (id: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast.success("Rol bijgewerkt");
        fetchUsers();
      }
    } catch (error) {
      toast.error("Fout bij bijwerken");
    }
  };

  const toggleUserNewsletter = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/newsletter`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ newsletterSubscribed: !currentStatus }),
      });
      if (res.ok) {
        toast.success("Nieuwsbriefvoorkeur bijgewerkt");
        fetchUsers();
      }
    } catch (error) {
      toast.error("Fout bij bijwerken nieuwsbriefvoorkeur");
    }
  };

  const exportNewsletterCsv = () => {
    const subscribers = users.filter((u) => u.newsletterSubscribed !== false && u.isActive !== false);
    if (subscribers.length === 0) {
      toast.error("Geen actieve leden gevonden die de nieuwsbrief willen ontvangen.");
      return;
    }

    const csvHeader = "Volledige Naam,Aanhef,Gebruikersnaam,E-mailadres,Woonplaats,Rol,Status,Nieuwsbrief,Registratiedatum\r\n";
    const escapeCsv = (str: string | undefined | null) => `"${String(str || "").replace(/"/g, '""')}"`;
    
    const csvRows = subscribers.map((u) => {
      const email = (u.email && u.email.trim()) || (u.username?.includes("@") ? u.username : `${u.username}@leden.lijstvanandel.nl`);
      return [
        escapeCsv(u.fullName || ""),
        escapeCsv(u.salutation || ""),
        escapeCsv(u.username || ""),
        escapeCsv(email),
        escapeCsv(u.city || ""),
        escapeCsv(u.role || "member"),
        escapeCsv(u.isActive ? "Actief" : "Inactief"),
        escapeCsv("Aangemeld"),
        escapeCsv(u.createdAt || "")
      ].join(",");
    }).join("\r\n");

    const blob = new Blob(["\uFEFF" + csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `nieuwsbrief-leden-steenwijkerland-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Export voltooid: ${subscribers.length} e-mailadressen geëxporteerd naar CSV!`);
  };

  const copyNewsletterEmails = async () => {
    const subscribers = users.filter((u) => u.newsletterSubscribed !== false && u.isActive !== false);
    const emails = subscribers
      .map((u) => (u.email && u.email.trim()) || (u.username?.includes("@") ? u.username : `${u.username}@leden.lijstvanandel.nl`))
      .filter(Boolean);

    if (emails.length === 0) {
      toast.error("Geen e-mailadressen gevonden.");
      return;
    }

    try {
      await navigator.clipboard.writeText(emails.join(", "));
      toast.success(`${emails.length} e-mailadressen gekopieerd naar het klembord!`);
    } catch {
      toast.error("Kon e-mailadressen niet naar het klembord kopiëren.");
    }
  };

  const submitFractielid = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", newFNaam);
    formData.append("firstName", newFVoornaam);
    formData.append("role", newFRol);
    formData.append("type", newFType);
    formData.append("bio", newFBio);
    formData.append(
      "speerpunten",
      JSON.stringify(newFSpeerpunten.split("\n").filter((s) => s.trim()))
    );
    formData.append("email", newFEmail);
    formData.append("facebook", newFFacebook);
    formData.append("instagram", newFInstagram);
    formData.append("linkedin", newFLinkedin);
    if (newFFile) formData.append("img", newFFile);

    try {
      const res = await fetch("/api/admin/fractieleden", {
        method: "POST",
        headers,
        body: formData,
      });
      if (res.ok) {
        toast.success("Lid toegevoegd!");
        fetchFractieleden();
      }
    } catch (error) {
      toast.error("Fout bij opslaan");
    }
  };

  const deleteFractielid = async (id: string) => {
    if (confirm("Lid verwijderen?")) {
      await fetch(`/api/admin/fractieleden/${id}`, { method: "DELETE", headers });
      toast.success("Lid verwijderd");
      fetchFractieleden();
    }
  };

  const handleFledSelect = (id: string) => {
    setSelectedFleden((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submitVideo = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedBurgerraadsleden = fractieleden.filter(
      (f) =>
        selectedFleden.includes(f.id) &&
        (f.type?.toLowerCase() === "burgerraadslid" || f.role?.toLowerCase().includes("burgerraadslid"))
    );
    const hasBurgerraadslid = selectedBurgerraadsleden.length > 0;

    const effectiveTitle = (newVBurgerTitle || newVTitle).trim();
    if (hasBurgerraadslid && !effectiveTitle) {
      toast.error("Als de video aan een burgerraadslid is gekoppeld, is een titel verplicht!");
      return;
    }

    const formData = new FormData();
    formData.append("title", effectiveTitle || newVTitle);
    if (newVBurgerTitle) formData.append("burgerraadslidTitle", newVBurgerTitle);
    if (newVDescription) formData.append("description", newVDescription);
    formData.append("category", newVCategory);
    formData.append("date", newVDate);
    formData.append("wijkSlug", newVWijk);
    formData.append("fractieledenIds", JSON.stringify(selectedFleden));
    if (newVUrl) formData.append("videoUrl", newVUrl);
    if (newVFile) formData.append("video", newVFile);
    if (newVThumbnail) formData.append("thumbnail", newVThumbnail);

    // Optionele koppeling met hoofdstuk & standpunt
    if (newVHoofdstuk !== "") {
      formData.append("hoofdstukNr", String(newVHoofdstuk));
    }
    if (newVStandpunt !== "") {
      formData.append("standpuntNr", String(newVStandpunt));
      const selH = hoofdstukken.find((h) => h.nr === Number(newVHoofdstuk));
      const selS = selH?.standpunten.find((s) => s.nr === Number(newVStandpunt));
      if (selS?.titel) {
        formData.append("standpuntTitel", selS.titel);
      }
    }

    try {
      const res = await fetch("/api/admin/videos", {
        method: "POST",
        headers,
        body: formData,
      });
      if (res.ok) {
        toast.success("Video toegevoegd!");
        fetchVideos();
        setNewVFile(null);
        setNewVThumbnail(null);
        setNewVUrl("");
        setNewVTitle("");
        setNewVBurgerTitle("");
        setNewVDescription("");
        setNewVCategory("");
        setNewVDate("");
        setSelectedFleden([]);
        setNewVWijk("");
        setNewVHoofdstuk("");
        setNewVStandpunt("");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Fout bij opslaan");
      }
    } catch (error) {
      toast.error("Fout bij opslaan");
    }
  };

  const deleteVideo = async (id: string) => {
    if (confirm("Video verwijderen?")) {
      await fetch(`/api/admin/videos/${id}`, { method: "DELETE", headers });
      toast.success("Verwijderd");
      fetchVideos();
    }
  };

  const startEditNews = (item: NewsItem) => {
    setEditingNewsId(item.id);
    setNTitle(item.title);
    setNCategory(item.category || "Algemeen");
    setNWijkSlug(item.wijkSlug || "");
    setNAuthorId(item.authorId || "");
    setNDesc(item.description || item.excerpt || "");
    setNContent(item.content || "");
    setNThumb(null);
    setNHeader(null);
    toast.info(`Bericht '${item.title}' geladen in editor`);
  };

  const cancelEditNews = () => {
    setEditingNewsId(null);
    setNTitle("");
    setNCategory("");
    setNWijkSlug("");
    setNAuthorId("");
    setNDesc("");
    setNContent("");
    setNThumb(null);
    setNHeader(null);
  };

  const submitNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nTitle.trim()) {
      toast.error("Voer een titel in");
      return;
    }
    if (!nContent.trim()) {
      toast.error("Voer tekst of HTML-inhoud in");
      return;
    }

    const selectedWijkObj = WIJKEN_EN_KERNEN.find((w) => w.slug === nWijkSlug);
    const selectedAuthor = fractieleden.find((f) => String(f.id) === String(nAuthorId));

    const formData = new FormData();
    formData.append("title", nTitle);
    formData.append("category", nCategory || "Algemeen");
    formData.append("wijkSlug", nWijkSlug);
    formData.append("wijkNaam", selectedWijkObj ? selectedWijkObj.naam : "");
    formData.append("authorId", nAuthorId);
    formData.append("authorName", selectedAuthor ? selectedAuthor.name : "");
    formData.append("authorRole", selectedAuthor ? (selectedAuthor.role || selectedAuthor.type || "") : "");
    formData.append("authorAvatar", selectedAuthor ? (selectedAuthor.imageUrl || selectedAuthor.imgUrl || "") : "");
    formData.append("description", nDesc);
    formData.append("content", nContent);
    if (nThumb) formData.append("thumbnail", nThumb);
    if (nHeader) formData.append("header", nHeader);

    try {
      let res;
      if (editingNewsId) {
        res = await fetch(`/api/admin/news/${editingNewsId}`, {
          method: "PUT",
          headers,
          body: formData,
        });
      } else {
        res = await fetch("/api/admin/news", {
          method: "POST",
          headers,
          body: formData,
        });
      }

      if (res.ok) {
        toast.success(editingNewsId ? "Nieuwsbericht succesvol bijgewerkt!" : "Nieuwsbericht gepubliceerd!");
        fetchNews();
        cancelEditNews();
      } else {
        toast.error("Fout bij opslaan van nieuwsbericht");
      }
    } catch (error) {
      toast.error("Fout bij opslaan");
    }
  };

  const deleteNews = async (id: string) => {
    if (confirm("Nieuwsbericht verwijderen?")) {
      await fetch(`/api/admin/news/${id}`, { method: "DELETE", headers });
      toast.success("Nieuwsbericht verwijderd");
      fetchNews();
    }
  };

  const startEditEvent = (ev: EventItem) => {
    setEditingEventId(ev.id);
    setETitle(ev.title || "");
    setEDate(ev.date || "");
    setEAddress(ev.address || "");
    setEStart(ev.startTime || "");
    setEEnd(ev.endTime || "");
    setEShortDesc(ev.shortDescription || "");
    setEDesc(ev.description || "");
    setEPublic(ev.isPublic !== false);
    setEPublish(ev.isPublished !== false);
    setENonMemberPrice(ev.nonMemberPrice !== undefined ? String(ev.nonMemberPrice) : "0");
    setETicketNotes(ev.ticketNotes || "");
    setELocationHiddenUntil12h(ev.locationHiddenUntil12h !== false);
    setEThumb(null);
    window.scrollTo({ top: 350, behavior: "smooth" });
  };

  const cancelEditEvent = () => {
    setEditingEventId(null);
    setETitle("");
    setEDate("");
    setEAddress("");
    setEStart("");
    setEEnd("");
    setEShortDesc("");
    setEDesc("");
    setEPublic(true);
    setEPublish(true);
    setENonMemberPrice("0");
    setETicketNotes("");
    setELocationHiddenUntil12h(true);
    setEThumb(null);
  };

  const submitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("title", eTitle);
    formData.append("date", eDate);
    formData.append("address", eAddress);
    formData.append("startTime", eStart);
    formData.append("endTime", eEnd);
    formData.append("shortDescription", eShortDesc);
    formData.append("description", eDesc);
    formData.append("isPublic", String(ePublic));
    formData.append("isPublished", String(ePublish));
    formData.append("nonMemberPrice", eNonMemberPrice || "0");
    formData.append("ticketNotes", eTicketNotes);
    formData.append("locationHiddenUntil12h", String(eLocationHiddenUntil12h));
    if (eThumb) formData.append("thumbnail", eThumb);

    try {
      const url = editingEventId ? `/api/admin/events/${editingEventId}` : "/api/admin/events";
      const method = editingEventId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body: formData });
      if (res.ok) {
        toast.success(editingEventId ? "Evenement succesvol bijgewerkt!" : "Evenement toegevoegd!");
        fetchEvents();
        fetchCancellationAnalytics();
        cancelEditEvent();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Fout bij opslaan");
      }
    } catch (error) {
      toast.error("Fout bij opslaan");
    }
  };

  const toggleEventField = async (id: string, field: string, value: boolean) => {
    await fetch(`/api/admin/events/${id}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    if (confirm("Evenement verwijderen?")) {
      await fetch(`/api/admin/events/${id}`, { method: "DELETE", headers });
      toast.success("Verwijderd");
      fetchEvents();
    }
  };

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role !== "admin") return <Navigate to="/dashboard" />;

  const wijkenInSteenwijk = WIJKEN_EN_KERNEN.filter((w) => w.type === "Wijk");
  const kernenInSteenwijkerland = WIJKEN_EN_KERNEN.filter((w) => w.type === "Kern");

  const formatMessageDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (messageFilter !== "all" && m.status !== messageFilter) {
      return false;
    }
    if (messageSearch.trim()) {
      const q = messageSearch.toLowerCase();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchEmail = m.email?.toLowerCase().includes(q);
      const matchSubject = m.subject?.toLowerCase().includes(q);
      const matchMessage = m.message?.toLowerCase().includes(q);
      const matchPhone = m.phone?.toLowerCase().includes(q);
      return Boolean(matchName || matchEmail || matchSubject || matchMessage || matchPhone);
    }
    return true;
  });

  const selectedMsg = messages.find((m) => m.id === selectedMessageId);
  const unansweredCount = messages.filter((m) => m.status === "moet nog beantwoord worden").length;

  return (
    <div className="min-h-screen pt-32 pb-24 container mx-auto px-6 max-w-6xl">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-accent font-semibold mb-2">
            Beheerdersportaal
          </div>
          <h1 className="text-4xl md:text-5xl font-display mb-3">Beheerderspaneel</h1>
          <p className="text-muted-foreground text-sm">
            Beheer leden, fractieleden, video's, nieuwsberichten, categorieën, agenda-evenementen, stemgedrag en server-updates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => setIsTicketScannerOpen(true)}
            variant="outline"
            className="shrink-0 text-xs font-semibold uppercase tracking-wider gap-2 h-10 px-4 cursor-pointer border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 hover:border-accent"
          >
            <QrCode className="w-4 h-4 text-accent" />
            <span>Ticket Scanner</span>
          </Button>
          <Button
            type="button"
            onClick={() => setActiveTab("system")}
            variant={activeTab === "system" ? "default" : "outline"}
            className={`shrink-0 text-xs font-semibold uppercase tracking-wider gap-2 h-10 px-4 cursor-pointer ${
              activeTab === "system" ? "bg-accent text-accent-foreground" : "border-border hover:border-accent"
            }`}
          >
            <Server className="w-4 h-4 text-accent" />
            <span>Systeem & Updates</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 flex flex-wrap gap-2 h-auto bg-muted/40 p-1.5 rounded-xl border border-border">
          <TabsTrigger value="users" className="gap-2 text-xs">
            <Users className="w-4 h-4" /> Ledenbeheer
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2 text-xs">
            <CreditCard className="w-4 h-4 text-emerald-600" /> Contributie & Stripe
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2 text-xs relative">
            <Inbox className="w-4 h-4" /> Berichten
            {messages.filter((m) => m.status === "moet nog beantwoord worden").length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                {messages.filter((m) => m.status === "moet nog beantwoord worden").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="fractie" className="gap-2 text-xs">
            <ShieldCheck className="w-4 h-4" /> Fractieleden
          </TabsTrigger>
          <TabsTrigger value="stemgedrag" className="gap-2 text-xs">
            <Vote className="w-4 h-4 text-accent" /> Stemgedrag
          </TabsTrigger>
          <TabsTrigger value="stellingen" className="gap-2 text-xs">
            <ThumbsUp className="w-4 h-4 text-accent" /> Fractie Peilingen
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-2 text-xs">
            <Video className="w-4 h-4" /> Video's
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-2 text-xs">
            <Newspaper className="w-4 h-4" /> Nieuws
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 text-xs">
            <Tag className="w-4 h-4 text-accent" /> Categoriebeheer
          </TabsTrigger>
          <TabsTrigger value="agenda" className="gap-2 text-xs">
            <CalendarDays className="w-4 h-4" /> Agenda
          </TabsTrigger>
          <TabsTrigger value="faqs" className="gap-2 text-xs">
            <HelpCircle className="w-4 h-4 text-accent" /> FAQ Beheer
          </TabsTrigger>
          <TabsTrigger value="wijken" className="gap-2 text-xs">
            <MapPin className="w-4 h-4 text-accent" /> Wijken & Kernen
          </TabsTrigger>
          <TabsTrigger value="vacatures" className="gap-2 text-xs">
            <Briefcase className="w-4 h-4 text-accent" /> Vacatures & Aanmeldingen
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2 text-xs">
            <FileText className="w-4 h-4 text-accent" /> Exclusieve Documenten
          </TabsTrigger>
          <TabsTrigger value="belafspraken" className="gap-2 text-xs">
            <Phone className="w-4 h-4 text-accent" /> Belafspraken
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="gap-2 text-xs text-accent">
            <Mail className="w-4 h-4 text-accent" /> Nieuwsbrief & Mailings
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2 text-xs text-accent">
            <Server className="w-4 h-4" /> Systeem & Updates
          </TabsTrigger>
        </TabsList>

        {/* LEDENBEHEER */}
        <TabsContent value="users">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div>
                <h2 className="text-2xl font-display text-foreground">Geregistreerde Leden</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                  <span className="px-2.5 py-0.5 rounded-full bg-muted border border-border font-medium">
                    {users.length} leden totaal
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {users.filter((u) => u.newsletterSubscribed !== false && u.isActive !== false).length} nieuwsbrief
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-semibold flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    {users.filter((u) => u.billingStatus === "paid").length} voldaan (€{users.filter((u) => u.billingStatus === "paid").reduce((sum, u) => sum + (u.paidAmount || 12), 0).toFixed(0)})
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {users.filter((u) => !u.billingStatus || u.billingStatus === "pending").length} openstaand
                  </span>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  onClick={copyNewsletterEmails}
                  variant="outline"
                  size="sm"
                  className="h-9 px-3.5 text-xs font-semibold border-border bg-background hover:bg-muted"
                  title="Kopieer alle e-mailadressen van nieuwsbriefontvangers naar klembord"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Kopieer E-mails
                </Button>

                <Button
                  onClick={exportNewsletterCsv}
                  size="sm"
                  className="h-9 px-4 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
                  title="Download een CSV bestand met alle nieuwsbriefleden voor Excel of Mailchimp"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Exporteer Nieuwsbrief (CSV)
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Naam</th>
                    <th className="px-4 py-3">Gebruikersnaam</th>
                    <th className="px-4 py-3">E-mailadres</th>
                    <th className="px-4 py-3">Woonplaats</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Contributie</th>
                    <th className="px-4 py-3">Nieuwsbrief</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const resolvedEmail = (u.email && u.email.trim()) || (u.username.includes("@") ? u.username : `${u.username.toLowerCase()}@leden.lijstvanandel.nl`);
                    const isSubscribed = u.newsletterSubscribed !== false;

                    return (
                      <tr key={u.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {u.salutation} {u.fullName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{u.username}</td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground/90">
                          {resolvedEmail}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{u.city || "-"}</td>
                        <td className="px-4 py-3">
                          {u.id !== user?.id ? (
                            <select
                              className={`text-xs px-2 py-1 rounded border outline-none cursor-pointer ${
                                u.role === "admin"
                                  ? "bg-accent/20 text-accent border-accent/20"
                                  : u.role === "vrijwilliger"
                                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                  : u.role === "raadslid"
                                  ? "bg-primary/20 text-primary border-primary/30"
                                  : "bg-secondary text-secondary-foreground border-border"
                              }`}
                              value={u.role}
                              onChange={(e) => changeUserRole(u.id, e.target.value)}
                            >
                              <option value="admin">admin (beheerder)</option>
                              <option value="vrijwilliger">vrijwilliger</option>
                              <option value="raadslid">raadslid</option>
                              <option value="member">member (lid)</option>
                            </select>
                          ) : (
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                u.role === "admin"
                                  ? "bg-accent/20 text-accent"
                                  : u.role === "vrijwilliger"
                                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                  : u.role === "raadslid"
                                  ? "bg-primary/20 text-primary"
                                  : "bg-secondary text-secondary-foreground"
                              }`}
                            >
                              {u.role}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className={`text-xs px-2 py-1 rounded border outline-none cursor-pointer font-medium ${
                              u.billingStatus === "paid"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                : u.billingStatus === "exempt"
                                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            }`}
                            value={u.billingStatus || "pending"}
                            onChange={(e) => changeUserBillingStatus(u.id, e.target.value)}
                            title="Klik om de facturatiestatus voor dit lid handmatig aan te passen"
                          >
                            <option value="paid">✓ Voldaan (€12,-)</option>
                            <option value="pending">⏳ Openstaand</option>
                            <option value="exempt">🛡️ Vrijgesteld</option>
                            <option value="failed">✕ Mislukt</option>
                          </select>
                          {u.paidAt && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(u.paidAt).toLocaleDateString("nl-NL")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleUserNewsletter(u.id, isSubscribed)}
                            className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80 cursor-pointer"
                            title={`Klik om nieuwsbrief voor ${u.fullName} ${isSubscribed ? "uit" : "aan"} te zetten`}
                          >
                            {isSubscribed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <Check className="w-3 h-3" /> Ontvangt
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                                <X className="w-3 h-3" /> Afgemeld
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {u.isActive ? (
                            <span className="flex items-center text-green-500 text-xs">
                              <Check className="w-3 h-3 mr-1" /> Actief
                            </span>
                          ) : (
                            <span className="flex items-center text-red-500 text-xs">
                              <X className="w-3 h-3 mr-1" /> Inactief
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {u.id !== user?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8"
                              onClick={() => toggleUserStatus(u.id, u.isActive)}
                            >
                              {u.isActive ? "Deactiveer" : "Activeer"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* CONTRIBUTIE & STRIPE BEHEER */}
        <TabsContent value="billing">
          <div className="space-y-8">
            {/* KPI STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Totale Opbrengst</span>
                  <Coins className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold font-display text-foreground">
                  €{(membershipData?.stats?.totalRevenue ?? 0).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Ontvangen via Stripe & handmatige contributies
                </div>
              </div>

              <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Betaalde Leden</span>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold font-display text-emerald-600">
                  {membershipData?.stats?.paidMembers ?? users.filter(u => u.billingStatus === "paid").length} / {users.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {users.length > 0 
                    ? `${Math.round(((membershipData?.stats?.paidMembers ?? users.filter(u => u.billingStatus === "paid").length) / users.length) * 100)}% voldaan`
                    : "0%"}
                </div>
              </div>

              <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Openstaande Contributie</span>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold font-display text-amber-600">
                  {membershipData?.stats?.pendingMembers ?? users.filter(u => !u.billingStatus || u.billingStatus === "pending").length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Leden met status openstaand
                </div>
              </div>

              <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Verwachte Jaaropbrengst</span>
                  <Receipt className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold font-display text-foreground">
                  €{(membershipData?.stats?.expectedAnnualRevenue ?? (users.length * parseFloat(settingsAmount || "12"))).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Op basis van huidig ledenaantal
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* SETTINGS FORM (2 cols) */}
              <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="flex items-center gap-3 pb-4 mb-6 border-b border-border">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display text-foreground">Contributie Instellingen</h2>
                    <p className="text-xs text-muted-foreground">
                      Beheer het jaarlijkse contributiebedrag en de registratie-flow voor nieuwe leden.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveMembershipSettings} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1.5">
                        Contributiebedrag (€ per jaar)
                      </label>
                      <Input
                        type="number"
                        step="0.50"
                        min="0"
                        value={settingsAmount}
                        onChange={(e) => setSettingsAmount(e.target.value)}
                        placeholder="12.00"
                        required
                        className="font-semibold text-base"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Standaard €12,00 per jaar voor partijleden.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1.5">
                        Productnaam op afrekenpagina
                      </label>
                      <Input
                        type="text"
                        value={settingsProductName}
                        onChange={(e) => setSettingsProductName(e.target.value)}
                        placeholder="Lidmaatschap Lijst van Andel (1 jaar)"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1.5">
                      Omschrijving voor de koper
                    </label>
                    <Input
                      type="text"
                      value={settingsDescription}
                      onChange={(e) => setSettingsDescription(e.target.value)}
                      placeholder="Jaarlijkse contributie voor partijleden"
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={settingsRequirePayment}
                        onChange={(e) => setSettingsRequirePayment(e.target.checked)}
                        className="rounded border-border w-4 h-4 text-primary focus:ring-primary"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-foreground block">
                          Direct doorsturen naar Stripe na registratie
                        </span>
                        <span className="text-muted-foreground">
                          Nieuwe leden worden na het invullen van het registratieformulier direct doorgestuurd naar de Stripe checkout.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={settingsEnabled}
                        onChange={(e) => setSettingsEnabled(e.target.checked)}
                        className="rounded border-border w-4 h-4 text-primary focus:ring-primary"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-foreground block">
                          Contributie-integratie actief
                        </span>
                        <span className="text-muted-foreground">
                          Indien uitgeschakeld wordt de Stripe checkout overgeslagen bij registratie.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={savingSettings}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    >
                      {savingSettings ? "Bezig met opslaan..." : "Contributie-instellingen Opslaan"}
                    </Button>
                  </div>
                </form>
              </div>

              {/* STRIPE STATUS & WEBHOOK CARD (1 col) */}
              <div className="space-y-6">
                <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-bold font-display text-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Stripe Integratiestatus
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
                      <span className="text-muted-foreground">API Status:</span>
                      {membershipData?.stripe?.isConfigured ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5" /> Geconfigureerd
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-3.5 h-3.5" /> Test/Simulatie modus
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
                      <span className="text-muted-foreground">Webhook Geheim:</span>
                      {membershipData?.stripe?.hasWebhookSecret ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5" /> Actief
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
                          Optioneel / Test
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <div className="text-muted-foreground font-medium">Stripe Webhook URL:</div>
                      <div className="p-2 rounded bg-muted font-mono text-[11px] break-all border border-border select-all">
                        {membershipData?.stripe?.webhookUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/api/stripe/webhook`}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Vul deze URL in het Stripe Dashboard in bij <em>Developers &gt; Webhooks</em> en selecteer het evenement <code>checkout.session.completed</code>.
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <div className="text-muted-foreground font-medium">Omgeving (.env):</div>
                      <div className="p-2 rounded bg-secondary text-secondary-foreground font-mono text-[10px] space-y-0.5">
                        <div>STRIPE_SECRET_KEY=sk_...</div>
                        <div>STRIPE_WEBHOOK_SECRET=whsec_...</div>
                        <div>VITE_STRIPE_PUBLISHABLE_KEY=pk_...</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SNEL ACTIES KAART */}
                <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold font-display text-foreground">Facturatie Samenvatting</h3>
                  <div className="text-xs text-muted-foreground space-y-2">
                    <p>
                      In het tabblad <strong>Ledenbeheer</strong> kunt u per lid de facturatiestatus handmatig aanpassen (bijvoorbeeld als iemand contant of per bank heeft voldaan).
                    </p>
                    <p>
                      Wanneer leden via Stripe afrekenen wordt hun status automatisch bijgewerkt naar <em>Voldaan</em> voor 1 jaar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* FRACTIELEDEN */}
        <TabsContent value="fractie">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-2xl font-display mb-6">Nieuw Fractielid</h2>
              <form onSubmit={submitFractielid} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Volledige Naam</label>
                    <Input
                      required
                      value={newFNaam}
                      onChange={(e) => setNewFNaam(e.target.value)}
                      placeholder="Sammy van Andel"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Voornaam (kort)</label>
                    <Input
                      required
                      value={newFVoornaam}
                      onChange={(e) => setNewFVoornaam(e.target.value)}
                      placeholder="sammy"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Type</label>
                    <select
                      className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                      value={newFType}
                      onChange={(e) => setNewFType(e.target.value)}
                    >
                      <option>Raadslid</option>
                      <option>Burgerraadslid</option>
                      <option>Ondersteuner</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Rol / Functie</label>
                    <Input
                      required
                      value={newFRol}
                      onChange={(e) => setNewFRol(e.target.value)}
                      placeholder="Fractievoorzitter"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Biografie</label>
                  <Textarea
                    required
                    value={newFBio}
                    onChange={(e) => setNewFBio(e.target.value)}
                    className="h-20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Speerpunten (1 per regel)
                  </label>
                  <Textarea
                    value={newFSpeerpunten}
                    onChange={(e) => setNewFSpeerpunten(e.target.value)}
                    className="h-20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">E-mailadres</label>
                  <Input
                    type="email"
                    required
                    value={newFEmail}
                    onChange={(e) => setNewFEmail(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Facebook URL</label>
                    <Input
                      value={newFFacebook}
                      onChange={(e) => setNewFFacebook(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Instagram URL</label>
                    <Input
                      value={newFInstagram}
                      onChange={(e) => setNewFInstagram(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">LinkedIn URL</label>
                    <Input
                      value={newFLinkedin}
                      onChange={(e) => setNewFLinkedin(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Profielfoto</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewFFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button type="submit" className="w-full mt-4">
                  <Upload className="w-4 h-4 mr-2" /> Opslaan
                </Button>
              </form>
            </div>
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-2xl font-display mb-6">Bestaande Fractieleden</h2>
              <div className="space-y-4">
                {fractieleden.map((f) => (
                  <div
                    key={f.id}
                    className="flex justify-between items-center p-4 border border-border/50 rounded bg-background/50"
                  >
                    <div>
                      <div className="font-semibold">{f.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.role} ({f.type})
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteFractielid(f.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* VIDEOS */}
        <TabsContent value="videos">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-2xl font-display mb-6">Nieuwe Video Uploaden</h2>
              <form onSubmit={submitVideo} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Titel</label>
                  <Input
                    required
                    value={newVTitle}
                    onChange={(e) => setNewVTitle(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Categorie</label>
                    <Input
                      required
                      value={newVCategory}
                      onChange={(e) => setNewVCategory(e.target.value)}
                      placeholder="Raadsdebat, Interview..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Datum</label>
                    <Input
                      type="date"
                      required
                      value={newVDate}
                      onChange={(e) => setNewVDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Gekoppelde Wijk / Kern (optioneel)
                  </label>
                  <select
                    className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                    value={newVWijk}
                    onChange={(e) => setNewVWijk(e.target.value)}
                  >
                    <option value="">Geen wijk / kern koppeling</option>
                    {WIJKEN_EN_KERNEN.map((w) => (
                      <option key={w.slug} value={w.slug}>
                        {w.naam} ({w.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Externe Video URL (YouTube, Vimeo, directe MP4...)
                  </label>
                  <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... of https://vimeo.com/..."
                    value={newVUrl}
                    onChange={(e) => setNewVUrl(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    YouTube links en Vimeo video's worden automatisch als werkende speler getoond.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Of lokaal videobestand uploaden
                  </label>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setNewVFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Thumbnail / Voorbeeldweergave (optioneel)
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewVThumbnail(e.target.files?.[0] || null)}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Upload een omslagafbeelding voor de videospeler en voor social media previews (WhatsApp, Facebook, Twitter). Bij YouTube wordt er automatisch een thumbnail gegenereerd als u dit leeg laat.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Beschrijving van de video (optioneel)
                  </label>
                  <textarea
                    className="w-full min-h-[80px] p-2.5 rounded-md border border-input bg-background text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="Korte toelichting over de tussenkomst, het agendapunt of raadsdebat. Wordt meegenomen bij het delen op social media en getoond bij de video."
                    value={newVDescription}
                    onChange={(e) => setNewVDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Gekoppelde Fractieleden
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-border p-2 rounded">
                    {fractieleden.map((f) => {
                      const isBurger =
                        f.type?.toLowerCase() === "burgerraadslid" ||
                        f.role?.toLowerCase().includes("burgerraadslid");
                      return (
                        <label
                          key={f.id}
                          className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFleden.includes(f.id)}
                            onChange={() => handleFledSelect(f.id)}
                          />
                          <span className="font-medium">{f.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              isBurger
                                ? "bg-accent/20 text-accent font-semibold"
                                : "text-muted-foreground bg-muted"
                            }`}
                          >
                            {f.role || f.type}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Banner & titel veld als Burgerraadslid is geselecteerd */}
                {(() => {
                  const selectedBurgerraadsleden = fractieleden.filter(
                    (f) =>
                      selectedFleden.includes(f.id) &&
                      (f.type?.toLowerCase() === "burgerraadslid" ||
                        f.role?.toLowerCase().includes("burgerraadslid"))
                  );
                  if (selectedBurgerraadsleden.length === 0) return null;
                  return (
                    <div className="p-3 bg-accent/10 border border-accent/40 rounded text-xs space-y-2">
                      <div className="font-semibold text-accent flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-accent" />
                        Gekoppeld aan burgerraadslid ({selectedBurgerraadsleden.map((b) => b.name).join(", ")})
                      </div>
                      <p className="text-muted-foreground">
                        Als de video aan een burgerraadslid is gekoppeld, moet er ook een titel worden meegegeven.
                      </p>
                      <div>
                        <label className="text-[11px] font-semibold block mb-1 text-foreground">
                          Specifieke titel voor Burgerraadslid (optioneel, overschrijft algemene titel):
                        </label>
                        <Input
                          placeholder="Bijv. Tussenkomst Nathan ten Wolde over bereikbaarheid"
                          value={newVBurgerTitle}
                          onChange={(e) => setNewVBurgerTitle(e.target.value)}
                          className="text-xs h-8 bg-background"
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Standpunt & Hoofdstuk Koppeling (Optioneel) */}
                {(() => {
                  const selHoofdstuk = hoofdstukken.find((h) => h.nr === Number(newVHoofdstuk));
                  const selStandpunt = selHoofdstuk?.standpunten.find((s) => s.nr === Number(newVStandpunt));

                  return (
                    <div className="p-3.5 bg-muted/20 border border-border/80 rounded space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-accent" />
                          Koppelen aan Partijprogramma / Standpunt (optioneel)
                        </label>
                        {(newVHoofdstuk !== "" || newVStandpunt !== "") && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewVHoofdstuk("");
                              setNewVStandpunt("");
                            }}
                            className="text-[10px] text-muted-foreground hover:text-destructive underline"
                          >
                            Koppeling wissen
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Koppel deze video optioneel aan een hoofdstuk en standpunt. De video wordt dan automatisch getoond onder het tabblad <em>'Bijdragen'</em> op de pagina Onze Standpunten.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-medium block mb-1 text-muted-foreground">
                            1. Hoofdstuk
                          </label>
                          <select
                            value={newVHoofdstuk}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : "";
                              setNewVHoofdstuk(val);
                              setNewVStandpunt("");
                            }}
                            className="w-full text-xs h-9 bg-background border border-border rounded px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                          >
                            <option value="">-- Geen hoofdstuk (optioneel) --</option>
                            {hoofdstukken.map((h) => (
                              <option key={h.nr} value={h.nr}>
                                Hoofdstuk {h.nr}: {h.titel}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-medium block mb-1 text-muted-foreground">
                            2. Standpunt
                          </label>
                          <select
                            value={newVStandpunt}
                            disabled={newVHoofdstuk === ""}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : "";
                              setNewVStandpunt(val);
                            }}
                            className="w-full text-xs h-9 bg-background border border-border rounded px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                          >
                            <option value="">-- Kies een standpunt --</option>
                            {selHoofdstuk?.standpunten.map((s) => (
                              <option key={s.nr} value={s.nr}>
                                Standpunt {s.nr}: {s.titel}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Tekst van het standpunt tonen zodat de beheerder precies weet waaraan gekoppeld wordt */}
                      {selStandpunt && (
                        <div className="p-3 bg-card border border-accent/40 rounded space-y-1.5 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-accent/20 text-accent">
                              Hoofdstuk {selHoofdstuk?.nr} • Standpunt {selStandpunt.nr}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">Gekoppeld standpunt</span>
                          </div>
                          <div className="font-semibold text-xs text-foreground pt-0.5">
                            {selStandpunt.titel}
                          </div>
                          <div className="text-[11px] text-foreground/90 bg-muted/60 p-2.5 rounded border border-border/60 leading-relaxed">
                            <span className="font-semibold text-accent block text-[10px] uppercase tracking-wider mb-1">
                              Tekst van het standpunt:
                            </span>
                            "{selStandpunt.standpunt}"
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <Button type="submit" className="w-full mt-4">
                  <Upload className="w-4 h-4 mr-2" /> Opslaan
                </Button>
              </form>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-2xl font-display mb-6">Geüploade Video's ({videos.length})</h2>
              <div className="space-y-4">
                {videos.length === 0 && (
                  <div className="text-sm text-muted-foreground italic py-6 text-center">
                    Nog geen video's geüpload.
                  </div>
                )}
                {videos.map((v) => {
                  const displayTitle = v.burgerraadslidTitle || v.title;
                  return (
                    <div
                      key={v.id}
                      className="p-4 border border-border/50 rounded bg-background/50 flex flex-col sm:flex-row gap-4 items-start"
                    >
                      <div className="w-full sm:w-44 aspect-video bg-black rounded overflow-hidden shrink-0 border border-border">
                        <VideoPlayer url={v.videoUrl} title={displayTitle} poster={v.thumbnailUrl} className="w-full h-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm leading-snug">{displayTitle}</div>
                        {v.burgerraadslidTitle && v.burgerraadslidTitle !== v.title && (
                          <div className="text-[11px] text-muted-foreground italic mt-0.5">
                            Algemene titel: {v.title}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {v.category} • {v.date}
                          {v.wijkSlug && ` • Wijk: ${v.wijkSlug}`}
                          {v.thumbnailUrl && " • Met thumbnail"}
                        </div>
                        {v.description && (
                          <p className="text-xs text-foreground/85 line-clamp-2 mt-1.5 leading-relaxed bg-muted/40 p-1.5 rounded border border-border/50">
                            {v.description}
                          </p>
                        )}
                        {v.videoUrl && (
                          <div className="text-[11px] text-accent mt-1 truncate font-mono">
                            {v.videoUrl}
                          </div>
                        )}

                        {/* Gekoppeld standpunt tag */}
                        {v.hoofdstukNr && v.standpuntNr && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-muted-foreground font-medium">Standpunt:</span>
                            <Link
                              to="/standpunten"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary-foreground border border-primary/30 font-semibold hover:border-accent inline-flex items-center gap-1 transition-colors"
                            >
                              <BookOpen className="w-3 h-3 text-accent" />
                              <span>
                                H{v.hoofdstukNr}, S{v.standpuntNr}: {v.standpuntTitel || `Standpunt ${v.standpuntNr}`} ↗
                              </span>
                            </Link>
                          </div>
                        )}

                        {/* Gekoppelde fractieleden tags met links naar hun videopagina */}
                        {v.fractieledenIds && v.fractieledenIds.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                            <span className="text-[10px] text-muted-foreground font-medium">Gekoppeld:</span>
                            {v.fractieledenIds.map((fid) => {
                              const flid = fractieleden.find((f) => String(f.id) === String(fid));
                              if (!flid) return null;
                              const isBurger =
                                flid.type?.toLowerCase() === "burgerraadslid" ||
                                flid.role?.toLowerCase().includes("burgerraadslid");
                              return (
                                <Link
                                  key={fid}
                                  to={`/fractie/${flid.id}/videos`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors inline-flex items-center gap-1 ${
                                    isBurger
                                      ? "bg-accent/20 border-accent/40 text-accent font-semibold hover:bg-accent hover:text-accent-foreground"
                                      : "bg-secondary text-secondary-foreground border-border hover:border-accent"
                                  }`}
                                >
                                  {flid.name} {isBurger ? "(Burgerraadslid)" : ""} ↗
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteVideo(v.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* NIEUWS */}
        <TabsContent value="news">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Formulier */}
            <div className="lg:col-span-7 bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-display flex items-center gap-2">
                    {editingNewsId ? "Nieuwsbericht Bewerken" : "Nieuws Aanmaken"}
                    {editingNewsId && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/20 text-accent font-sans font-semibold">
                        Bewerken actief
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {editingNewsId
                      ? "Pas de titel, categorie, inhoud of afbeeldingen van dit bericht aan."
                      : "Publiceer actuele nieuwsberichten voor inwoners van Steenwijkerland."}
                  </p>
                </div>
                {editingNewsId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelEditNews}
                    className="text-xs h-8"
                  >
                    Bewerken annuleren
                  </Button>
                )}
              </div>

              <form onSubmit={submitNews} className="space-y-5">
                <div>
                  <label className="text-sm font-medium mb-1 block">Titel *</label>
                  <Input
                    required
                    value={nTitle}
                    onChange={(e) => setNTitle(e.target.value)}
                    placeholder="Bijv. Lijst van Andel pleit voor nieuwe impulsen..."
                  />
                </div>

                {/* Categorie met snelle link naar Categoriebeheer */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium">Categorie *</label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("categories")}
                      className="text-xs text-accent hover:text-accent/80 h-6 px-2"
                    >
                      <Tag className="w-3 h-3 mr-1" /> Categorieën beheren
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                      value={nCategory}
                      onChange={(e) => setNCategory(e.target.value)}
                      required
                    >
                      <option value="">-- Kies een categorie --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      {categories.length === 0 && (
                        <>
                          <option value="Politiek">Politiek</option>
                          <option value="Media">Media</option>
                          <option value="Wijken & Kernen">Wijken & Kernen</option>
                          <option value="Woningbouw">Woningbouw</option>
                          <option value="Evenementen">Evenementen</option>
                          <option value="Algemeen">Algemeen</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Optioneel: Wijk of Kern selecteren */}
                <div>
                  <label className="text-sm font-medium mb-1 block flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-accent" /> Wijk of Kern (optioneel)
                    </span>
                    <span className="text-[11px] text-muted-foreground">Koppel direct aan gebied</span>
                  </label>
                  <select
                    className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                    value={nWijkSlug}
                    onChange={(e) => setNWijkSlug(e.target.value)}
                  >
                    <option value="">Geen specifieke wijk of kern (Algemeen Steenwijkerland)</option>
                    <optgroup label="Wijken in Steenwijk">
                      {wijkenInSteenwijk.map((w) => (
                        <option key={w.slug} value={w.slug}>
                          {w.naam}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Kernen in Steenwijkerland">
                      {kernenInSteenwijkerland.map((w) => (
                        <option key={w.slug} value={w.slug}>
                          {w.naam}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Als u een wijk of kern kiest, wordt dit bericht ook automatisch getoond op de betreffende wijkpagina.
                  </p>
                </div>

                {/* Optioneel: Auteur / (Burger)raadslid selecteren */}
                <div>
                  <label className="text-sm font-medium mb-1 block flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-accent" /> Auteur / (Burger)raadslid (optioneel)
                    </span>
                    <span className="text-[11px] text-muted-foreground">Koppel een fractielid</span>
                  </label>
                  <select
                    className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                    value={nAuthorId}
                    onChange={(e) => setNAuthorId(e.target.value)}
                  >
                    <option value="">Geen specifieke auteur (Lijst van Andel)</option>
                    <optgroup label="(Burger)raadsleden & Fractieleden">
                      {fractieleden.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.role || f.type || "Fractielid"})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  {nAuthorId && (
                    <div className="mt-2 p-2.5 rounded-lg bg-secondary/50 border border-border/60 flex items-center gap-2.5 text-xs">
                      {(() => {
                        const sel = fractieleden.find((f) => String(f.id) === String(nAuthorId));
                        if (!sel) return null;
                        const avatar = sel.imageUrl || sel.imgUrl;
                        return (
                          <>
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-muted border border-accent/40 shrink-0">
                              {avatar ? (
                                <img src={avatar} alt={sel.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-accent">
                                  {sel.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-foreground block truncate">{sel.name}</span>
                              <span className="text-muted-foreground text-[11px] block truncate">{sel.role || sel.type || "Fractielid"}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Kies welk (burger)raadslid als auteur gekoppeld wordt. Deze verschijnt met profielfoto bij het nieuwsbericht.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Korte Beschrijving (intro / excerpt) *
                  </label>
                  <Textarea
                    required
                    value={nDesc}
                    onChange={(e) => setNDesc(e.target.value)}
                    placeholder="Een korte inleidende samenvatting die op het nieuwsoverzicht en in de lead wordt getoond..."
                    className="h-20 text-sm"
                  />
                </div>

                {/* Inhoud met .html invoegen en opmaak wijzigen */}
                <div>
                  <label className="text-sm font-medium mb-1 block flex items-center justify-between">
                    <span>Inhoud & Opmaak (Afbeeldingen, Dataproducten & Kaarten) *</span>
                    <span className="text-xs text-accent font-normal">
                      .html kaarten, Python grafieken & afbeeldingen ondersteund
                    </span>
                  </label>
                  <NewsContentEditor
                    value={nContent}
                    onChange={setNContent}
                    required
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      Thumbnail afbeelding (overzicht)
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNThumb(e.target.files?.[0] || null)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      Header banner (bovenaan artikel)
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNHeader(e.target.files?.[0] || null)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold uppercase tracking-wider text-xs h-11"
                  >
                    {editingNewsId ? (
                      <>
                        <Check className="w-4 h-4 mr-2" /> Wijzigingen Opslaan
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" /> Nieuwsbericht Publiceren
                      </>
                    )}
                  </Button>
                  {editingNewsId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEditNews}
                      className="h-11 px-5 text-xs font-semibold uppercase tracking-wider"
                    >
                      Annuleren
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* Overzicht van nieuwsberichten */}
            <div className="lg:col-span-5 bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-2xl font-display mb-2">Gepubliceerd Nieuws ({news.length})</h2>
              <p className="text-xs text-muted-foreground mb-6">
                Overzicht van alle geplaatste artikelen.
              </p>

              <div className="space-y-3">
                {news.length === 0 && (
                  <div className="text-sm text-muted-foreground italic py-8 text-center">
                    Nog geen nieuwsberichten geplaatst.
                  </div>
                )}
                {news.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 border rounded-lg transition-colors flex gap-3 items-start justify-between ${
                      editingNewsId === n.id
                        ? "border-accent bg-accent/5 ring-1 ring-accent"
                        : "border-border/60 bg-background/60 hover:bg-background"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm leading-snug truncate">
                        {n.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
                          {n.category || "Algemeen"}
                        </span>
                        {n.wijkNaam && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground font-medium flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-accent" /> {n.wijkNaam}
                          </span>
                        )}
                        {n.authorName && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium flex items-center gap-1 border border-accent/20">
                            <User className="w-2.5 h-2.5" /> {n.authorName}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {n.createdAt ? new Date(n.createdAt).toLocaleDateString("nl-NL") : ""}
                        </span>
                      </div>
                      {n.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                          {n.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`/nieuws/${n.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Bekijk artikel in nieuw tabblad"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <Button
                        type="button"
                        variant={editingNewsId === n.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => startEditNews(n)}
                        className="h-8 w-8 p-0"
                        title="Nieuwsbericht bewerken"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteNews(n.id)}
                        className="h-8 w-8 p-0"
                        title="Nieuwsbericht verwijderen"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* CATEGORIEBEHEER */}
        <TabsContent value="categories">
          <CategoryManager
            token={token}
            initialCategories={categories}
            onCategoriesChange={setCategories}
          />
        </TabsContent>

        {/* AGENDA */}
        <TabsContent value="agenda">
          {/* AFMELDINGEN & TICKETING ANALYSE BANNER */}
          <div className="mb-8 bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-display">Bijeenkomsten, Aanmeldingen & Afmeldingsanalyse</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Realtime monitoring van aanmeldingen, opkomst, annuleringen en redenen van afwezigheid.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchCancellationAnalytics()}
                  disabled={loadingAnalytics}
                  className="text-xs h-8"
                >
                  <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loadingAnalytics ? "animate-spin" : ""}`} />
                  Analyse Verversen
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowFullAnalyticsLog((prev) => !prev)}
                  className="text-xs h-8"
                >
                  <Ticket className="w-3.5 h-3.5 mr-1.5" />
                  {showFullAnalyticsLog ? "Verberg Afmeldingslog" : "Toon Afmeldingslogboek"}
                </Button>
              </div>
            </div>

            {/* Metric KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-xs text-muted-foreground font-medium block mb-1">Totaal Aanmeldingen</span>
                <div className="text-2xl font-bold text-foreground">
                  {eventAnalytics?.summary?.totalRegistrations ?? 0}
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">
                  {eventAnalytics?.summary?.activeRegistrations ?? 0} actieve tickets
                </span>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-xs text-muted-foreground font-medium block mb-1">Totaal Afgemeld</span>
                <div className="text-2xl font-bold text-amber-600">
                  {eventAnalytics?.summary?.totalCancellations ?? 0}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Geregistreerd voor analyse
                </span>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-xs text-muted-foreground font-medium block mb-1">Uitvalpercentage</span>
                <div className="text-2xl font-bold text-foreground flex items-center gap-1.5">
                  <span>{eventAnalytics?.summary?.cancellationRate ?? 0}%</span>
                  <TrendingDown className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Percentage geannuleerd
                </span>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-xs text-muted-foreground font-medium block mb-1">Gem. Tijd voor Aanvang</span>
                <div className="text-2xl font-bold text-foreground">
                  {eventAnalytics?.summary?.avgHoursBeforeEvent ?? 0}u
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Vooraf tijdig gemeld
                </span>
              </div>
            </div>

            {/* Redenen breakdown */}
            {eventAnalytics?.reasonsBreakdown && eventAnalytics.reasonsBreakdown.length > 0 && (
              <div className="p-4 rounded-xl bg-background border border-border/70 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Top Opgegeven Redenen van Afmelding
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {eventAnalytics.reasonsBreakdown.map((r, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs"
                    >
                      <span className="font-medium text-foreground">{r.reason}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-bold text-[10px]">
                        {r.count}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Cancellation Log Table */}
            {showFullAnalyticsLog && (
              <div className="border border-border rounded-xl overflow-hidden bg-background">
                <div className="p-3 bg-muted/50 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-semibold">
                    Afmeldingslogboek ({eventAnalytics?.allCancellations?.length || 0} registraties)
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Inclusief tijdsbestek en motivatie
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {(!eventAnalytics?.allCancellations || eventAnalytics.allCancellations.length === 0) ? (
                    <div className="p-6 text-center text-xs text-muted-foreground italic">
                      Nog geen afmeldingen geregistreerd in het systeem.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/30 text-muted-foreground border-b border-border text-[11px]">
                        <tr>
                          <th className="p-2.5">Datum Afmelding</th>
                          <th className="p-2.5">Naam / Ticket</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Vooraf gemeld</th>
                          <th className="p-2.5">Opgegeven Reden</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {eventAnalytics.allCancellations.map((c: any) => (
                          <tr key={c.id} className="hover:bg-muted/20">
                            <td className="p-2.5 whitespace-nowrap text-muted-foreground">
                              {new Date(c.cancelledAt).toLocaleString("nl-NL", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </td>
                            <td className="p-2.5 font-medium">
                              {c.fullName || "Deelnemer"}
                              {c.ticketCode && (
                                <span className="block text-[10px] text-muted-foreground font-mono">
                                  #{c.ticketCode}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5">
                              {c.isMember ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-semibold text-[10px]">
                                  Partijlid
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 font-semibold text-[10px]">
                                  Gast / Niet-lid
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 whitespace-nowrap text-muted-foreground">
                              {c.hoursBeforeEvent !== undefined
                                ? `${c.hoursBeforeEvent} uur voor aanvang`
                                : "-"}
                            </td>
                            <td className="p-2.5 text-foreground max-w-xs truncate" title={c.reason}>
                              {c.reason || "Geen toelichting"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-display">
                    {editingEventId ? "Evenement Bewerken" : "Evenement Aanmaken"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {editingEventId
                      ? "Pas de gegevens van het geselecteerde evenement aan."
                      : "Plaats een nieuwe bijeenkomst of activiteit in de agenda."}
                  </p>
                </div>
                {editingEventId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelEditEvent}
                    className="text-xs border-accent/40 text-accent"
                  >
                    Bewerken annuleren
                  </Button>
                )}
              </div>

              {editingEventId && (
                <div className="mb-5 p-3 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    U bewerkt momenteel een bestaand evenement.
                  </span>
                  <button
                    type="button"
                    onClick={cancelEditEvent}
                    className="text-accent underline font-semibold hover:text-accent/80"
                  >
                    Annuleren
                  </button>
                </div>
              )}

              <form onSubmit={submitEvent} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Titel *</label>
                  <Input
                    required
                    value={eTitle}
                    onChange={(e) => setETitle(e.target.value)}
                    placeholder="Bijv. Inloopavond Steenwijkerland — Tijd voor verbetering"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Datum *</label>
                    <Input
                      type="date"
                      required
                      value={eDate}
                      onChange={(e) => setEDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Adres *</label>
                    <Input
                      required
                      value={eAddress}
                      onChange={(e) => setEAddress(e.target.value)}
                      placeholder="Bijv. Markt 1, Steenwijk"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Starttijd *</label>
                    <Input
                      type="time"
                      required
                      value={eStart}
                      onChange={(e) => setEStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Eindtijd *</label>
                    <Input
                      type="time"
                      required
                      value={eEnd}
                      onChange={(e) => setEEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Korte beschrijving (samenvatting op de /Agenda overzichtspagina) *
                  </label>
                  <Textarea
                    required
                    value={eShortDesc}
                    onChange={(e) => setEShortDesc(e.target.value)}
                    placeholder="Korte samenvatting van 1 à 2 zinnen die bezoekers direct zien op de agendapagina..."
                    className="h-20"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Deze tekst verschijnt in het overzicht op /Agenda.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Volledige beschrijving / Inhoud (evenement detailpagina) *
                  </label>
                  <NewsContentEditor
                    value={eDesc}
                    onChange={(content) => setEDesc(content)}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Net zoals bij nieuwsberichten kunt u hier HTML, koppen, alinea's of een compleet .html bestand invoegen.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Thumbnail / Achtergrondfoto
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEThumb(e.target.files?.[0] || null)}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {editingEventId
                      ? "Laat leeg om de huidige afbeelding te behouden. Wordt getoond als thumbnail en als achtergrondfoto op de detailpagina."
                      : "Wordt getoond als thumbnail op /Agenda en als achtergrondfoto bovenaan de evenementpagina."}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 p-3 bg-muted/40 rounded-xl border border-border">
                  <div>
                    <label className="text-xs font-semibold mb-1 block text-foreground">
                      Toegangsprijs Niet-leden (€)
                    </label>
                    <Input
                      type="number"
                      step="0.50"
                      min="0"
                      value={eNonMemberPrice}
                      onChange={(e) => setENonMemberPrice(e.target.value)}
                      placeholder="0.00 (gratis)"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      0.00 = gratis. &gt; 0 = betaling via Stripe Checkout (geen cashback voor niet-leden).
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold mb-1 block text-foreground">
                      Locatie Vrijgave
                    </label>
                    <label className="flex items-start text-xs gap-2 cursor-pointer mt-2 text-foreground/90">
                      <input
                        type="checkbox"
                        checked={eLocationHiddenUntil12h}
                        onChange={(e) => setELocationHiddenUntil12h(e.target.checked)}
                        className="rounded border-border text-accent focus:ring-accent mt-0.5"
                      />
                      <span>
                        Houd adres geheim tot 12 uur na aanmelding of uiterlijk 12 uur voor aanvang
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1 block text-foreground">
                    Ticket instructies / Notities
                  </label>
                  <Input
                    value={eTicketNotes}
                    onChange={(e) => setETicketNotes(e.target.value)}
                    placeholder="Bijv. Zaal open om 19:00. Toon uw QR-code bij de balie."
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Wordt vermeld in de e-mail met het QR-ticket.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-6 py-2">
                  <label className="flex items-center text-sm gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ePublic}
                      onChange={(e) => setEPublic(e.target.checked)}
                      className="rounded border-border text-accent focus:ring-accent"
                    />{" "}
                    Publiek toegankelijk (voor iedereen zichtbaar)
                  </label>
                  <label className="flex items-center text-sm gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ePublish}
                      onChange={(e) => setEPublish(e.target.checked)}
                      className="rounded border-border text-accent focus:ring-accent"
                    />{" "}
                    Direct publiceren
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="flex-1">
                    <Upload className="w-4 h-4 mr-2" />
                    {editingEventId ? "Wijzigingen Opslaan" : "Evenement Opslaan"}
                  </Button>
                  {editingEventId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEditEvent}
                    >
                      Annuleren
                    </Button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-5 bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-2xl font-display mb-2">Evenementen Beheer ({events.length})</h2>
              <p className="text-xs text-muted-foreground mb-6">
                Overzicht van alle geplande bijeenkomsten en activiteiten.
              </p>

              <div className="space-y-4">
                {events.length === 0 && (
                  <div className="text-sm text-muted-foreground italic py-8 text-center">
                    Nog geen evenementen aangemaakt.
                  </div>
                )}
                {events.map((e) => (
                  <div
                    key={e.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      editingEventId === e.id
                        ? "border-accent bg-accent/5 ring-1 ring-accent"
                        : "border-border/60 bg-background/60 hover:bg-background"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm leading-snug">{e.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {e.date} | {e.startTime} - {e.endTime}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Locatie: {e.address || "Steenwijk"}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
                            {e.isPublic ? "Publiek" : "Alleen leden"}
                          </span>
                          {e.nonMemberPrice && Number(e.nonMemberPrice) > 0 ? (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-semibold">
                              Niet-leden: €{Number(e.nonMemberPrice).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                              Gratis
                            </span>
                          )}
                          {e.locationHiddenUntil12h !== false && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 font-semibold" title="Locatie wordt 12u na aanmelden of 12u voor aanvang vrijgegeven">
                              12u Privacy
                            </span>
                          )}
                          {e.isCancelled && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 font-semibold">
                              Gecanceld
                            </span>
                          )}
                          {!e.isPublished && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                              Concept
                            </span>
                          )}
                        </div>
                        {e.shortDescription && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                            {e.shortDescription}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`/agenda/${e.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Bekijk evenementpagina"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <Button
                          variant={editingEventId === e.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => startEditEvent(e)}
                          className="h-8 w-8 p-0"
                          title="Evenement bewerken"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleEventField(e.id, "isPublished", !e.isPublished)}
                          className="text-xs h-8 px-2"
                          title={e.isPublished ? "Depubliceer" : "Publiceer"}
                        >
                          {e.isPublished ? "Depubliceer" : "Publiceer"}
                        </Button>
                        <Button
                          variant={e.isCancelled ? "secondary" : "destructive"}
                          size="sm"
                          onClick={() => toggleEventField(e.id, "isCancelled", !e.isCancelled)}
                          className="text-xs h-8 px-2"
                          title={e.isCancelled ? "Herstel" : "Cancel"}
                        >
                          {e.isCancelled ? "Herstel" : "Cancel"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteEvent(e.id)}
                          className="h-8 w-8 p-0"
                          title="Verwijderen"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border/60">
                      <div className="flex items-center gap-2 mb-2">
                        <Button
                          variant={(!activeAttendeeTab[e.id] || activeAttendeeTab[e.id] === "attendees") ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => {
                            setActiveAttendeeTab((prev) => ({ ...prev, [e.id]: "attendees" }));
                            fetchAttendees(e.id);
                          }}
                          className="flex-1 text-xs h-7"
                        >
                          <Ticket className="w-3 h-3 mr-1.5" />
                          Aanmeldingen ({e.attendees?.length || 0})
                        </Button>
                        <Button
                          variant={activeAttendeeTab[e.id] === "cancellations" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => {
                            setActiveAttendeeTab((prev) => ({ ...prev, [e.id]: "cancellations" }));
                            fetchCancellations(e.id);
                          }}
                          className="flex-1 text-xs h-7 text-amber-600 hover:text-amber-700"
                        >
                          <UserX className="w-3 h-3 mr-1.5" />
                          Afmeldingen
                        </Button>
                      </div>

                      {/* Weergave actieve tickets/aanmeldingen */}
                      {(!activeAttendeeTab[e.id] || activeAttendeeTab[e.id] === "attendees") && attendeesMap[e.id] && (
                        <div className="mt-2 space-y-2 text-xs">
                          {attendeesMap[e.id].length === 0 && (
                            <p className="text-muted-foreground italic py-1">Nog geen actieve aanmeldingen voor deze bijeenkomst.</p>
                          )}
                          {attendeesMap[e.id].map((a: EventAttendee) => {
                            const isAccepted = a.checkInStatus === "accepted" || a.checkedIn;
                            const isRejected = a.checkInStatus === "rejected";

                            return (
                              <div
                                key={a.id}
                                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                                  isAccepted
                                    ? "bg-emerald-500/10 border-emerald-500/30"
                                    : isRejected
                                    ? "bg-destructive/10 border-destructive/30"
                                    : "bg-muted/40 border-border/60"
                                }`}
                              >
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-foreground text-sm">{a.fullName}</span>
                                    {a.isMember ? (
                                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 font-semibold text-[10px]">
                                        Lid
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-600 font-semibold text-[10px]">
                                        Gast
                                      </span>
                                    )}
                                    {a.paid && (
                                      <span className="px-1.5 py-0.2 rounded bg-accent/15 text-accent font-semibold text-[10px]">
                                        Betaald (€{a.price || 0})
                                      </span>
                                    )}

                                    {/* STATUS BADGE */}
                                    {isAccepted ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[10px]">
                                        <Check className="w-3 h-3" />
                                        Geaccepteerd
                                      </span>
                                    ) : isRejected ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-white font-bold text-[10px]">
                                        <X className="w-3 h-3" />
                                        Geweigerd
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold text-[10px] border border-border">
                                        Nog niet gecheckt
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                                    <span>{a.email}</span>
                                    {a.phone && <span>Tel: {a.phone}</span>}
                                    {a.ticketCode && (
                                      <span className="font-mono text-foreground font-semibold flex items-center gap-1">
                                        <QrCode className="w-3 h-3 text-accent" />
                                        #{a.ticketCode}
                                      </span>
                                    )}
                                  </div>

                                  {/* SCAN / CONTROLE DETAILS */}
                                  {(isAccepted || isRejected) && (
                                    <div className="text-[10px] pt-1 border-t border-border/40 text-muted-foreground flex flex-wrap items-center gap-x-2">
                                      {a.checkedInAt && (
                                        <span>
                                          Tijd: {new Date(a.checkedInAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} ({new Date(a.checkedInAt).toLocaleDateString("nl-NL")})
                                        </span>
                                      )}
                                      {a.scannedBy?.name && (
                                        <span>
                                          • Door: <strong className="text-foreground">{a.scannedBy.name}</strong> ({a.scannedBy.role})
                                        </span>
                                      )}
                                      {isRejected && a.rejectionReason && (
                                        <span className="text-destructive font-semibold">
                                          • Reden: {a.rejectionReason}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="shrink-0 flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                                  {a.ticketCode && (
                                    <>
                                      {!isAccepted && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => checkInTicket(a.ticketCode!, e.id, "accepted")}
                                          className="h-7 text-[11px] px-2.5 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/15 font-semibold"
                                        >
                                          <Check className="w-3 h-3 mr-1" />
                                          {isRejected ? "Alsnog Toelaten" : "Accepteren"}
                                        </Button>
                                      )}

                                      {!isRejected && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            const reason = prompt("Optionele reden van weigering:", "Niet voldaan aan voorwaarden");
                                            if (reason !== null) {
                                              checkInTicket(a.ticketCode!, e.id, "rejected", reason || undefined);
                                            }
                                          }}
                                          className="h-7 text-[11px] px-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                                        >
                                          <X className="w-3 h-3 mr-1" />
                                          Weigeren
                                        </Button>
                                      )}

                                      {(isAccepted || isRejected) && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => checkInTicket(a.ticketCode!, e.id, "reset")}
                                          className="h-7 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                                          title="Reset status naar onbeslist"
                                        >
                                          <RotateCcw className="w-3 h-3 mr-1" />
                                          Reset
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

                      {/* Weergave afmeldingen & redenen */}
                      {activeAttendeeTab[e.id] === "cancellations" && (
                        <div className="mt-2 space-y-2 text-xs">
                          {(!cancellationsMap[e.id] || cancellationsMap[e.id].length === 0) ? (
                            <p className="text-muted-foreground italic py-1">Geen afmeldingen geregistreerd voor dit evenement.</p>
                          ) : (
                            cancellationsMap[e.id].map((c) => (
                              <div
                                key={c.id}
                                className="p-2.5 bg-amber-500/5 rounded-lg border border-amber-500/20 space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 font-medium text-foreground">
                                    <span>{c.fullName || "Deelnemer"}</span>
                                    {c.ticketCode && (
                                      <span className="font-mono text-[10px] text-muted-foreground">
                                        #{c.ticketCode}
                                      </span>
                                    )}
                                    {c.isMember ? (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 font-semibold">
                                        Lid
                                      </span>
                                    ) : (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 font-semibold">
                                        Gast
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {c.hoursBeforeEvent !== undefined ? `${c.hoursBeforeEvent}u vooraf` : ""}
                                  </span>
                                </div>
                                <div className="p-1.5 rounded bg-background/80 border border-border/50 text-[11px] text-foreground">
                                  <span className="text-muted-foreground font-medium mr-1">Reden:</span>
                                  {c.reason || "Geen toelichting opgegeven"}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* CONTACTBERICHTEN BEHEER */}
        <TabsContent value="messages">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Linker kolom: Detailweergave van het aangeklikte bericht */}
            <div className="lg:col-span-7 space-y-6">
              {selectedMsg ? (
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
                  {/* Top Bar: Subject & Status */}
                  <div className="border-b border-border/80 pb-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <span className="text-xs uppercase tracking-wider text-accent font-semibold flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Contactbericht
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Ontvangen: {formatMessageDate(selectedMsg.createdAt)}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-display text-foreground leading-tight">
                      {selectedMsg.subject || "Geen onderwerp opgegeven"}
                    </h2>
                  </div>

                  {/* Status Banner met toggle knop */}
                  <div
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      selectedMsg.status === "moet nog beantwoord worden"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        {selectedMsg.status === "moet nog beantwoord worden" ? (
                          <>
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                            </span>
                            <span>Status: Moet nog beantwoord worden</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Status: Afgehandeld</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs opacity-80 mt-1">
                        {selectedMsg.status === "moet nog beantwoord worden"
                          ? "Dit bericht wacht nog op een reactie of actie vanuit de fractie."
                          : `Afgehandeld${
                              selectedMsg.handledAt ? ` op ${formatMessageDate(selectedMsg.handledAt)}` : ""
                            }${selectedMsg.handledBy ? ` door ${selectedMsg.handledBy}` : ""}.`}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {selectedMsg.status === "moet nog beantwoord worden" ? (
                        <Button
                          onClick={() => updateMessageStatus(selectedMsg.id, "afgehandeld")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-sm w-full sm:w-auto"
                        >
                          <Check className="w-4 h-4 mr-1.5" />
                          Zet op Afgehandeld
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => updateMessageStatus(selectedMsg.id, "moet nog beantwoord worden")}
                          className="border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 font-medium text-xs h-9 px-3.5 rounded-lg w-full sm:w-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                          Terug naar 'Moet nog beantwoord worden'
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Afzender gegevens kaart */}
                  <div className="grid sm:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/40 border border-border/80">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                        Afzender
                      </div>
                      <div className="text-sm font-semibold text-foreground truncate">
                        {selectedMsg.name}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                        E-mailadres
                      </div>
                      <a
                        href={`mailto:${selectedMsg.email}?subject=${encodeURIComponent(
                          `Re: ${selectedMsg.subject || "Uw bericht aan Lijst van Andel"}`
                        )}`}
                        className="text-sm text-accent hover:underline flex items-center gap-1 font-medium truncate"
                        title="Klik om e-mail te sturen"
                      >
                        <Mail className="w-3.5 h-3.5 shrink-0 text-accent" />
                        <span className="truncate">{selectedMsg.email}</span>
                      </a>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                        Telefoonnummer
                      </div>
                      {selectedMsg.phone ? (
                        <a
                          href={`tel:${selectedMsg.phone}`}
                          className="text-sm text-foreground hover:text-accent hover:underline flex items-center gap-1 font-medium truncate"
                          title="Klik om te bellen"
                        >
                          <Phone className="w-3.5 h-3.5 shrink-0 text-accent" />
                          <span className="truncate">{selectedMsg.phone}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Niet opgegeven</span>
                      )}
                    </div>
                  </div>

                  {/* Bericht inhoud */}
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      Bericht van inwoner
                    </div>
                    <div className="bg-muted/20 border border-border/70 rounded-xl p-5 text-sm md:text-base leading-relaxed whitespace-pre-wrap text-foreground selection:bg-accent/20">
                      {selectedMsg.message}
                    </div>
                  </div>

                  {/* Actieknoppen */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/70">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        asChild
                        className="bg-primary hover:bg-primary/90 text-xs h-9 px-4 rounded-lg"
                      >
                        <a
                          href={`mailto:${selectedMsg.email}?subject=${encodeURIComponent(
                            `Re: ${selectedMsg.subject || "Uw bericht aan Lijst van Andel"}`
                          )}`}
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Beantwoord via e-mail
                        </a>
                      </Button>

                      {selectedMsg.phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="text-xs h-9 px-3.5 rounded-lg border-border"
                        >
                          <a href={`tel:${selectedMsg.phone}`}>
                            <Phone className="w-3.5 h-3.5 mr-1.5 text-accent" />
                            Bellen ({selectedMsg.phone})
                          </a>
                        </Button>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteContactMessage(selectedMsg.id)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs h-9 px-3 rounded-lg"
                      title="Verwijder dit bericht permanent"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Verwijder bericht
                    </Button>
                  </div>

                  {/* Interne Notities */}
                  <div className="pt-4 border-t border-border/70">
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="adminNote" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Interne notities (voor beheerder / fractie)
                      </label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveAdminNote(selectedMsg.id)}
                        className="h-7 text-xs px-3 border-accent/40 text-accent hover:bg-accent/10"
                      >
                        Notitie opslaan
                      </Button>
                    </div>
                    <Textarea
                      id="adminNote"
                      rows={3}
                      value={adminNoteInput}
                      onChange={(e) => setAdminNoteInput(e.target.value)}
                      placeholder="Bijv. 02-09 telefonisch gesproken met indiener. Vraag doorgestuurd naar fractie."
                      className="text-xs bg-muted/20"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Deze notities zijn alleen zichtbaar voor beheerders en niet voor de indiener.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-4">
                    <Inbox className="w-7 h-7" />
                  </div>
                  <h3 className="font-display text-xl mb-1 text-foreground">Geen bericht geselecteerd</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Klik in de lijst aan de rechterkant op een bericht om de inhoud te lezen en de status aan te passen.
                  </p>
                </div>
              )}
            </div>

            {/* Rechter kolom: De lijst met berichten met status erbij */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
                {/* Header lijst */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-xl text-foreground flex items-center gap-2">
                      <span>Ingekomen berichten</span>
                      <span className="text-xs font-sans font-normal text-muted-foreground">
                        ({filteredMessages.length})
                      </span>
                    </h2>
                  </div>

                  {unansweredCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {unansweredCount} onbeantwoord
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                      <Check className="w-3 h-3" />
                      Alles afgehandeld
                    </span>
                  )}
                </div>

                {/* Zoekveld */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={messageSearch}
                    onChange={(e) => setMessageSearch(e.target.value)}
                    placeholder="Zoek op naam, e-mail of tekst..."
                    className="pl-9 pr-8 text-xs h-9 rounded-lg"
                  />
                  {messageSearch && (
                    <button
                      onClick={() => setMessageSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setMessageFilter("all")}
                    className={`flex-1 py-1 px-2 rounded-md font-medium transition-all ${
                      messageFilter === "all"
                        ? "bg-card text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Alle ({messages.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageFilter("moet nog beantwoord worden")}
                    className={`flex-1 py-1 px-2 rounded-md font-medium transition-all ${
                      messageFilter === "moet nog beantwoord worden"
                        ? "bg-card text-amber-700 dark:text-amber-400 shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Open ({unansweredCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageFilter("afgehandeld")}
                    className={`flex-1 py-1 px-2 rounded-md font-medium transition-all ${
                      messageFilter === "afgehandeld"
                        ? "bg-card text-emerald-700 dark:text-emerald-400 shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Afgehandeld ({messages.length - unansweredCount})
                  </button>
                </div>

                {/* Lijst weergave */}
                <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                  {filteredMessages.length === 0 ? (
                    <div className="text-center py-10 px-4 text-xs text-muted-foreground border border-dashed border-border/80 rounded-xl">
                      {messageSearch || messageFilter !== "all"
                        ? "Geen berichten gevonden voor de huidige selectie."
                        : "Er zijn nog geen contactberichten binnengekomen."}
                    </div>
                  ) : (
                    filteredMessages.map((m) => {
                      const isSelected = selectedMessageId === m.id;
                      const isPending = m.status === "moet nog beantwoord worden";

                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMessageId(m.id)}
                          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 relative ${
                            isSelected
                              ? "bg-accent/10 border-accent shadow-sm ring-1 ring-accent"
                              : "bg-background/60 hover:bg-muted/40 border-border/70"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="font-semibold text-xs text-foreground truncate">
                              {m.name}
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatMessageDate(m.createdAt).split(",")[0]}
                            </span>
                          </div>

                          <div className="text-xs font-medium text-foreground/90 truncate mb-1">
                            {m.subject || "Contactbericht"}
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2 leading-snug mb-2.5">
                            {m.message}
                          </p>

                          {/* Status Badge */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Moet nog beantwoord worden
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                Afgehandeld
                              </span>
                            )}

                            <span className="text-[10px] text-accent font-medium hover:underline">
                              {isSelected ? "Geopend" : "Bekijk →"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* FAQ BEHEER */}
        <TabsContent value="faqs">
          <FaqManager token={token} />
        </TabsContent>

        {/* WIJKEN & KERNEN BEHEER */}
        <TabsContent value="wijken">
          <WijkManager token={token} />
        </TabsContent>

        {/* VACATURES & AANMELDINGEN */}
        <TabsContent value="vacatures">
          <VacancyManager />
        </TabsContent>

        {/* EXCLUSIEVE DOCUMENTEN VOOR LEDEN */}
        <TabsContent value="documents">
          <DocumentManager token={token} currentUser={user} />
        </TabsContent>

        {/* BELAFSPRAKEN OVERZICHT & RAADSLEDEN KOPPELING */}
        <TabsContent value="belafspraken">
          <BelafsprakenManager token={token} headers={headers} />
        </TabsContent>

        {/* STEMGEDRAG & MOTIES BEHEER */}
        <TabsContent value="stemgedrag">
          <StemgedragManager token={token} />
        </TabsContent>

        {/* FRACTIE PEILINGEN & STELLINGEN (PWA TINDER-STYLE) */}
        <TabsContent value="stellingen">
          <StellingenManager token={token} />
        </TabsContent>

        {/* NIEUWSBRIEF & MAILINGS */}
        <TabsContent value="newsletter">
          <NewsletterManager token={token || effectiveToken} />
        </TabsContent>

        {/* SYSTEEM, CACHE & GITHUB UPDATES */}
        <TabsContent value="system">
          <SystemManager token={token} />
        </TabsContent>
      </Tabs>

      {/* Ticket Scanner Modal */}
      <TicketScannerModal
        open={isTicketScannerOpen}
        onOpenChange={setIsTicketScannerOpen}
        token={token}
      />
    </div>
  );
}
