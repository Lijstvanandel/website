import { useState, useEffect } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { 
  LogOut, 
  Calendar, 
  Download, 
  FileText, 
  ArrowRight, 
  XCircle, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Mail, 
  Bell, 
  CheckCircle2, 
  Loader2, 
  Edit3, 
  Check,
  Briefcase,
  UserCog,
  Send,
  Search,
  Sparkles,
  Lock,
  Eye,
  ShieldAlert,
  Trash2,
  AlertTriangle,
  CalendarX,
  CreditCard,
  ExternalLink,
  QrCode,
  Smartphone,
  ThumbsUp,
  Vote,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SecureDocumentViewer } from "@/components/SecureDocumentViewer";
import { RaadslidBelafsprakenWidget } from "@/components/RaadslidBelafsprakenWidget";
import { TicketScannerModal } from "@/components/TicketScannerModal";
import { MemberDocument } from "@/types/document";
import { fetchWithAuth } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface EventItem {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  address: string;
}

export interface PositionItem {
  id: string;
  type: string;
  title: string;
  wijkNaam: string;
  wijkSlug?: string | null;
  gemeente?: string;
  category: string;
  description: string;
  isOpen: boolean;
  isWijk: boolean;
}

export default function Dashboard() {
  const { user, logout, token, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [attendingEvents, setAttendingEvents] = useState<EventItem[]>([]);
  const [cancelledEvents, setCancelledEvents] = useState<EventItem[]>([]);
  
  // Newsletter toggle and email edit state
  const isNewsletterActive = user?.newsletterSubscribed !== false;
  const [isTogglingNewsletter, setIsTogglingNewsletter] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(user?.email || (user?.username?.includes("@") ? user?.username : ""));

  // Openstaande Posities State
  const [allPositions, setAllPositions] = useState<PositionItem[]>([]);
  const [randomThreePositions, setRandomThreePositions] = useState<PositionItem[]>([]);
  const [isPositionsModalOpen, setIsPositionsModalOpen] = useState(false);
  const [positionsSearch, setPositionsSearch] = useState("");
  const [positionsCategoryFilter, setPositionsCategoryFilter] = useState("all");

  // Sollicitatie / Aanmeld Form Modal State
  const [selectedVacancy, setSelectedVacancy] = useState<PositionItem | null>(null);
  const [motivationText, setMotivationText] = useState("");
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  // Edit Profile / Registration Data Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSalutation, setProfileSalutation] = useState(user?.salutation || "Dhr.");
  const [profileFullName, setProfileFullName] = useState(user?.fullName || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || (user?.username?.includes("@") ? user?.username : ""));
  const [profileAddress, setProfileAddress] = useState(user?.address || "");
  const [profileCity, setProfileCity] = useState(user?.city || "");
  const [profileUsername, setProfileUsername] = useState(user?.username || "");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileRemarks, setProfileRemarks] = useState(user?.remarks || "");
  const [profileDirectDebit, setProfileDirectDebit] = useState(user?.directDebit || false);

  // Account Verwijderen State
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Afmelden voor Evenement State
  const [unattendEvent, setUnattendEvent] = useState<EventItem | null>(null);
  const [isUnattending, setIsUnattending] = useState(false);

  // Exclusieve Ledendocumenten State
  const [memberDocuments, setMemberDocuments] = useState<MemberDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<MemberDocument | null>(null);

  // Ticket Scanner Modal State voor Vrijwilligers en Admins
  const [isTicketScannerOpen, setIsTicketScannerOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    async function loadDocuments() {
      setDocumentsLoading(true);
      try {
        const res = await fetch("/api/member-documents", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json().catch(() => []);
          setMemberDocuments(Array.isArray(data) ? data : []);
        } else if (res.status === 401 || res.status === 403) {
          console.warn("Niet geautoriseerd voor ledendocumenten.");
        }
      } catch (err) {
        console.error("Fout bij ophalen van ledendocumenten:", err);
      } finally {
        setDocumentsLoading(false);
      }
    }
    loadDocuments();
  }, [token]);

  useEffect(() => {
    if (user && !isEditProfileOpen) {
      setProfileSalutation(user.salutation || "Dhr.");
      setProfileFullName(user.fullName || "");
      setProfileEmail(user.email || (user.username?.includes("@") ? user.username : ""));
      setProfileAddress(user.address || "");
      setProfileCity(user.city || "");
      setProfileUsername(user.username || "");
      setProfileRemarks(user.remarks || "");
      setProfileDirectDebit(user.directDebit || false);
      setEmailInput(user.email || (user.username?.includes("@") ? user.username : ""));
    }
  }, [user, isEditProfileOpen]);

  // Haal evenementen op voor de ingelogde gebruiker
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    fetch("/api/me/events", { headers: { "Authorization": `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json().catch(() => ({ attending: [], cancelled: [] })) : { attending: [], cancelled: [] }))
      .then(data => {
        if (!isMounted) return;
        setAttendingEvents(data?.attending || []);
        setCancelledEvents(data?.cancelled || []);
      })
      .catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Haal openstaande posities 1x stabiel op en kies 3 willekeurige functies
  useEffect(() => {
    let isMounted = true;
    fetch("/api/vacancies")
      .then((res) => (res.ok ? res.json().catch(() => []) : []))
      .then((positions: PositionItem[]) => {
        if (!isMounted) return;
        const list = Array.isArray(positions) ? positions : [];
        setAllPositions(list);
        if (list.length > 0) {
          // Kies eenmalig 3 willekeurige posities
          const shuffled = [...list].sort(() => 0.5 - Math.random());
          setRandomThreePositions(shuffled.slice(0, 3));
        }
      })
      .catch(console.error);

    return () => {
      isMounted = false;
    };
  }, []);

  // Open direct de sollicitatiemodal als er via 'Ik wil helpen' of directe link naar een wijk of vacature wordt verwezen
  useEffect(() => {
    const applyWijk = searchParams.get("applyWijk");
    const applyVacancy = searchParams.get("applyVacancy");
    if (!applyWijk && !applyVacancy) return;

    if (allPositions.length > 0) {
      const match = allPositions.find((p) =>
        (applyVacancy && p.id === applyVacancy) ||
        (applyWijk && (
          p.wijkSlug === applyWijk ||
          p.id === `wijk-${applyWijk}` ||
          p.wijkNaam.toLowerCase() === applyWijk.toLowerCase() ||
          p.wijkNaam.toLowerCase().includes(applyWijk.toLowerCase())
        ))
      );

      if (match) {
        setSelectedVacancy(match);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("applyWijk");
        nextParams.delete("applyVacancy");
        setSearchParams(nextParams, { replace: true });
        return;
      }

      // Fallback als de wijk nog niet in allPositions staat
      if (applyWijk) {
        const formattedWijk = applyWijk
          .split("-")
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" ");

        setSelectedVacancy({
          id: `wijk-${applyWijk}`,
          type: "wijkvertegenwoordiger",
          title: `Vertegenwoordiger ${formattedWijk}`,
          wijkNaam: formattedWijk,
          wijkSlug: applyWijk,
          gemeente: "Steenwijkerland",
          category: "Wijkvertegenwoordiger",
          description: `Als vertegenwoordiger voor ${formattedWijk} bent u het centrale aanspreekpunt voor signalen en wensen uit de buurt. U brengt deze rechtstreeks in bij de fractie van Lijst van Andel.`,
          tasks: [
            "Aanspreekpunt zijn voor inwoners uit de buurt",
            "Signalen, kansen en knelpunten bespreken met de fractie",
            "Meedenken over dossiers in Steenwijkerland",
          ],
          isOpen: true,
          isWijk: true,
        });

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("applyWijk");
        nextParams.delete("applyVacancy");
        setSearchParams(nextParams, { replace: true });
      }
    }
  }, [allPositions, searchParams, setSearchParams]);

  // Stripe checkout dues payment & session return verification
  const [isPayingDues, setIsPayingDues] = useState(false);
  const [stripePaymentModal, setStripePaymentModal] = useState<{
    open: boolean;
    checkoutUrl: string;
    sessionId: string;
  } | null>(null);
  const [isCheckingPaymentStatus, setIsCheckingPaymentStatus] = useState(false);

  // Auto-polling verification while Stripe checkout modal is open
  useEffect(() => {
    if (!stripePaymentModal?.open || !stripePaymentModal.sessionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/verify-session?sessionId=${encodeURIComponent(stripePaymentModal.sessionId)}`);
        const data = await res.json();
        if (data.success && data.user) {
          updateUser(data.user, data.token);
          setStripePaymentModal(null);
          toast.success("Contributie succesvol ontvangen!", {
            description: "Uw lidmaatschapsstatus is bijgewerkt en staat nu op 'Voldaan'.",
          });
        }
      } catch {
        // Polling in background
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [stripePaymentModal, updateUser]);

  useEffect(() => {
    const paymentSuccess = searchParams.get("payment_success");
    const sessionId = searchParams.get("session_id");

    if (paymentSuccess === "true" && sessionId) {
      fetch(`/api/checkout/verify-session?sessionId=${encodeURIComponent(sessionId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            updateUser(data.user, data.token);
            toast.success("Contributie succesvol ontvangen!", {
              description: "Uw lidmaatschapsstatus is bijgewerkt en staat nu op 'Voldaan'.",
            });
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("payment_success");
            newParams.delete("session_id");
            newParams.delete("simulated");
            setSearchParams(newParams, { replace: true });
          }
        })
        .catch(console.error);
    } else if (searchParams.get("payment_cancelled") === "true") {
      toast.info("De betaling via Stripe is geannuleerd.", {
        description: "U kunt de contributie op elk gewenst moment alsnog voldoen via uw dashboard.",
      });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("payment_cancelled");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, updateUser]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Handle Profile Update Submission
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!profileFullName.trim()) {
      toast.error("Volledige naam is verplicht");
      return;
    }
    if (!profileEmail.trim() || !profileEmail.includes("@")) {
      toast.error("Voer een geldig e-mailadres in");
      return;
    }
    if (!profileUsername.trim() || profileUsername.trim().length < 3) {
      toast.error("Gebruikersnaam moet minimaal 3 tekens bevatten");
      return;
    }
    if (profilePassword && profilePassword.trim().length < 6) {
      toast.error("Wachtwoord moet minimaal 6 tekens zijn");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          salutation: profileSalutation,
          fullName: profileFullName.trim(),
          email: profileEmail.trim(),
          address: profileAddress.trim(),
          city: profileCity.trim(),
          username: profileUsername.trim(),
          password: profilePassword.trim() || undefined,
          remarks: profileRemarks.trim(),
          directDebit: profileDirectDebit,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kon gegevens niet opslaan");
      }

      updateUser(data.user, data.token);
      setProfilePassword("");
      setIsEditProfileOpen(false);
      toast.success("Uw registratiegegevens zijn succesvol bijgewerkt!");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Er is een fout opgetreden bij het bijwerken van uw gegevens");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccount = async () => {
    if (!token) return;
    setIsDeletingAccount(true);
    try {
      const res = await fetch("/api/me/account", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Kon account niet verwijderen");
      }
      toast.success(data.message || "Uw account is definitief verwijderd.");
      setIsDeleteAccountOpen(false);
      setIsEditProfileOpen(false);
      logout();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Er is een fout opgetreden bij het verwijderen van uw account");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Handle Event Un-attend / Afmelden
  const handleConfirmUnattend = async () => {
    if (!token || !unattendEvent) return;
    setIsUnattending(true);
    try {
      const res = await fetch(`/api/events/${unattendEvent.id}/attend`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Kon niet afmelden voor dit evenement");
      }
      setAttendingEvents((prev) => prev.filter((e) => e.id !== unattendEvent.id));
      toast.success(`U bent succesvol afgemeld voor "${unattendEvent.title}".`);
      setUnattendEvent(null);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Er is een fout opgetreden bij het afmelden");
    } finally {
      setIsUnattending(false);
    }
  };

  // Handle Vacancy Application Submission
  const handleOpenApplicationModal = (position: PositionItem) => {
    setSelectedVacancy(position);
    setMotivationText("");
    // Close the full overview dialog if it was open
    setIsPositionsModalOpen(false);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedVacancy) return;

    if (!motivationText.trim() || motivationText.trim().length < 10) {
      toast.error("Schrijf alstublieft een motiverende beschrijving van minimaal 10 tekens.");
      return;
    }

    setIsSubmittingApp(true);
    try {
      const res = await fetch("/api/vacancies/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          vacancyId: selectedVacancy.id,
          vacancyTitle: selectedVacancy.title,
          wijkNaam: selectedVacancy.wijkNaam,
          applicantName: user.fullName,
          applicantEmail: user.email || (user.username?.includes("@") ? user.username : `${user.username}@leden.lijstvanandel.nl`),
          motivation: motivationText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kon aanmelding niet versturen");
      }

      toast.success("Aanmelding succesvol verzonden!", {
        description: `Uw motivatie voor '${selectedVacancy.title}' is goed ontvangen. Het bestuur neemt spoedig contact met u op.`,
      });
      setSelectedVacancy(null);
      setMotivationText("");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Er is een fout opgetreden bij het versturen");
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Newsletter Preferences Toggle
  const handleToggleNewsletter = async () => {
    const newStatus = !isNewsletterActive;
    setIsTogglingNewsletter(true);

    try {
      const res = await fetchWithAuth("/api/me/newsletter", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newsletterSubscribed: newStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) return;
        throw new Error(data.error || "Kon nieuwsbriefvoorkeur niet wijzigen");
      }

      updateUser({ newsletterSubscribed: newStatus });
      toast.success(
        newStatus 
          ? "Nieuwsbrief ingeschakeld! U ontvangt voortaan onze nieuwsbrief." 
          : "Nieuwsbrief uitgeschakeld. U ontvangt geen nieuwsbrieven meer."
      );
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Er is een fout opgetreden");
    } finally {
      setIsTogglingNewsletter(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!emailInput || !emailInput.includes("@")) {
      toast.error("Voer een geldig e-mailadres in");
      return;
    }

    try {
      const res = await fetchWithAuth("/api/me/newsletter", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailInput.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) return;
        throw new Error(data.error || "Kon e-mailadres niet opslaan");
      }

      updateUser({ email: emailInput.trim() });
      setIsEditingEmail(false);
      toast.success("E-mailadres voor de nieuwsbrief succesvol bijgewerkt!");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Er is een fout opgetreden");
    }
  };

  // Stripe checkout payment handler

  const handlePayDues = async () => {
    if (!token) return;
    setIsPayingDues(true);
    try {
      const res = await fetch("/api/membership/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon betaalsessie niet starten");

      if (data.checkoutUrl) {
        // Detect if app is running in an iframe (e.g. inside Google AI Studio preview)
        const isInIframe = typeof window !== "undefined" && window.self !== window.top;

        // Open our modal dialog so the user has a 100% reliable link and auto-verification
        setStripePaymentModal({
          open: true,
          checkoutUrl: data.checkoutUrl,
          sessionId: data.sessionId,
        });

        // Always try to open Stripe in a new window/tab to prevent iframe blocking
        const openedTab = window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");

        // If not in iframe and window.open was blocked by popup blocker, navigate top-level window
        if (!isInIframe && !openedTab) {
          window.location.href = data.checkoutUrl;
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Fout bij starten van Stripe betaling");
    } finally {
      setIsPayingDues(false);
    }
  };

  const handleManualCheckPayment = async () => {
    if (!stripePaymentModal?.sessionId) return;
    setIsCheckingPaymentStatus(true);
    try {
      const res = await fetch(`/api/checkout/verify-session?sessionId=${encodeURIComponent(stripePaymentModal.sessionId)}`);
      const data = await res.json();
      if (data.success && data.user) {
        updateUser(data.user, data.token);
        setStripePaymentModal(null);
        toast.success("Contributie succesvol geverifieerd!", {
          description: "Uw lidmaatschapsstatus is bijgewerkt en staat nu op 'Voldaan'.",
        });
      } else {
        toast.info("Betaling nog niet afgerond", {
          description: "Stripe meldt dat de betaling nog niet is voltooid. Heeft u de betaling in het Stripe-tabblad al afgerond?",
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Kon betaling niet verifiëren");
    } finally {
      setIsCheckingPaymentStatus(false);
    }
  };

  const currentEmail = user.email || (user.username.includes("@") ? user.username : `${user.username.toLowerCase()}@leden.lijstvanandel.nl`);

  // Filtered positions for full overview modal
  const filteredPositions = allPositions.filter((pos) => {
    const matchesSearch =
      pos.title.toLowerCase().includes(positionsSearch.toLowerCase()) ||
      pos.wijkNaam.toLowerCase().includes(positionsSearch.toLowerCase()) ||
      pos.category.toLowerCase().includes(positionsSearch.toLowerCase()) ||
      pos.description.toLowerCase().includes(positionsSearch.toLowerCase());

    const matchesCategory =
      positionsCategoryFilter === "all" ||
      (positionsCategoryFilter === "wijk" && pos.isWijk && pos.category.includes("Wijk")) ||
      (positionsCategoryFilter === "kern" && pos.isWijk && pos.category.includes("Kern")) ||
      (positionsCategoryFilter === "custom" && !pos.isWijk);

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        {/* Header section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 animate-fade-up">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-display text-primary">
                Welkom, {user.fullName}
              </h1>
              {user.role === "raadslid" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-accent/20 text-accent border border-accent/40 uppercase tracking-wider">
                  Raadslid / Fractielid
                </span>
              )}
              {user.role === "vrijwilliger" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 uppercase tracking-wider">
                  Vrijwilliger
                </span>
              )}
              {user.role === "admin" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/40 uppercase tracking-wider">
                  Beheerder
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              Ledendashboard • {user.city || "Steenwijkerland"} • Lidnummer #{user.id.slice(-5)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Ticket Scannen Knop voor Vrijwilligers en Admins */}
            {(user.role === "admin" || user.role === "vrijwilliger") && (
              <Button
                onClick={() => setIsTicketScannerOpen(true)}
                variant="outline"
                className="px-4 py-2.5 rounded-full font-semibold flex items-center text-sm shadow-sm bg-accent/10 border-accent/40 text-accent hover:bg-accent/20 hover:border-accent hover:text-accent transition-all"
              >
                <QrCode className="w-4 h-4 mr-2 text-accent" />
                Ticket scannen
              </Button>
            )}

            {/* Gegevens Wijzigen Knop */}
            <Button
              onClick={() => setIsEditProfileOpen(true)}
              variant="outline"
              className="px-4 py-2.5 rounded-full font-semibold flex items-center text-sm shadow-sm hover:border-accent hover:text-accent transition-all"
            >
              <UserCog className="w-4 h-4 mr-2 text-accent" />
              Gegevens wijzigen
            </Button>

            {user.role === "admin" && (
              <Link
                to="/admin"
                className="px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-semibold hover:bg-accent/90 transition-all flex items-center text-sm shadow-sm"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Beheerderspaneel
              </Link>
            )}
            <button
              onClick={logout}
              className="flex items-center px-5 py-2.5 bg-card text-card-foreground border border-border rounded-full hover:bg-muted transition-colors font-semibold text-sm shadow-sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Uitloggen
            </button>
          </div>
        </div>

        {!user.isActive && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-xl mb-10 animate-fade-up">
            <h2 className="text-xl font-display mb-2 flex items-center">
              <XCircle className="w-5 h-5 mr-2" /> 
              Uw account is inactief
            </h2>
            <p className="text-sm">
              Uw lidmaatschap is op dit moment inactief. U heeft geen toegang tot exclusieve documenten of aankomende ledenactiviteiten. 
              Neem contact op met het bestuur als u denkt dat dit een fout is.
            </p>
          </div>
        )}

        {user.isActive && (
          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Content (2 Columns) */}
            <div className="md:col-span-2 space-y-8">
              
              {/* AANKOMENDE BELAFSPRAKEN WIDGET (Zichtbaar voor raadsleden en beheerders) */}
              {(user.role === "raadslid" || user.role === "admin") && (
                <RaadslidBelafsprakenWidget token={token} currentUser={user} />
              )}

              {/* FRACTIE PEILINGEN & STELLINGEN (PWA TINDER-STYLE POLLING) */}
              <section className="bg-gradient-to-br from-card via-card to-accent/5 rounded-2xl p-6 sm:p-8 border border-accent/30 shadow-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center shrink-0 shadow-lg shadow-accent/20">
                      <Vote className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-accent/20 text-accent border border-accent/40">
                          PWA Fractie Peiling
                        </span>
                        {user.billingStatus === "paid" || user.role === "admin" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                            Toegang Actief
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                            Contributie Vereist
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground">
                        Laat uw stem horen in onze fractie
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
                        Swipe door actuele stellingen over Steenwijkerland (eens / oneens of schaal 1-10) en geef uw mening mee voor de fractievergadering.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 w-full sm:w-auto">
                    {user.billingStatus === "paid" || user.role === "admin" ? (
                      <Link to="/peilingen" className="block w-full sm:w-auto">
                        <Button className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-6 py-3 rounded-full shadow-md flex items-center justify-center gap-2">
                          <Smartphone className="w-4 h-4" />
                          <span>Start Peiling</span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        onClick={() => {
                          toast.error("Voldoe eerst uw contributie om deel te nemen aan fractiepeilingen.");
                        }}
                        variant="outline"
                        className="w-full sm:w-auto border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 rounded-full font-semibold"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Contributie vereist
                      </Button>
                    )}
                  </div>
                </div>
              </section>

              {/* LIDMAATSCHAP & CONTRIBUTIE CARD */}
              <section className="bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-display text-foreground flex items-center gap-2.5">
                        <span>Lidmaatschap & Contributie</span>
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Uw jaarlijkse partijcontributie voor Lijst van Andel ter ondersteuning van lokale politiek.
                      </p>
                    </div>
                  </div>

                  {/* Facturatiestatus Badge */}
                  <div className="shrink-0">
                    {user.billingStatus === "paid" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Contributie Voldaan
                      </span>
                    ) : user.billingStatus === "exempt" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <ShieldCheck className="w-3.5 h-3.5" /> Vrijgesteld
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" /> Contributie Openstaand
                      </span>
                    )}
                  </div>
                </div>

                <div className="py-6 space-y-4">
                  {user.billingStatus === "paid" ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Actief jaarlidmaatschap ({user.paidAmount ? `€${user.paidAmount.toFixed(2)}` : "€12,00"})
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {user.paidAt ? `Betaald op: ${new Date(user.paidAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}` : "Betaling via Stripe geregistreerd"}
                            {user.paidUntil && ` • Geldig tot: ${new Date(user.paidUntil).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-md self-start sm:self-center">
                          Volledig toegang
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Hartelijk dank voor uw steun. Uw contributie wordt direct ingezet voor fractiewerk en lokale burgerinitiatieven in Steenwijkerland.
                      </p>
                    </div>
                  ) : user.billingStatus === "exempt" ? (
                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                      <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        Vrijgesteld van contributie
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Als bestuurs- of fractielid van Lijst van Andel bent u vrijgesteld van de jaarlijkse ledencontributie.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-amber-600" />
                            Jaarlijkse contributie: €12,00 per jaar
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 max-w-md">
                            Uw lidmaatschap is geregistreerd, maar de contributie is nog niet voldaan. U kunt deze veilig en snel voldoen via Stripe (o.a. iDEAL, Bancontact en creditcard).
                          </p>
                        </div>
                        <Button
                          onClick={handlePayDues}
                          disabled={isPayingDues}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 shrink-0 flex items-center gap-2"
                        >
                          {isPayingDues ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Laden...
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4" />
                              Nu betalen (€12,00)
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        Beveiligde SSL-transactie afgehandeld door Stripe Payments.
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* NIEUWSBRIEF VOORKEUREN CARD */}
              <section className="bg-card rounded-2xl p-6 sm:p-8 border border-accent/30 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0 mt-0.5">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-display text-foreground flex items-center gap-2.5">
                        <span>Nieuwsbrief van Lijst van Andel</span>
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Blijf direct op de hoogte van moties, besluiten in de gemeenteraad en acties in uw wijk.
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {isNewsletterActive ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aangemeld
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                        Afgemeld
                      </span>
                    )}
                  </div>
                </div>

                <div className="py-6 space-y-5">
                  {/* Interactive Toggle Row */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/60">
                    <div className="pr-4">
                      <div className="font-semibold text-sm sm:text-base text-foreground">
                        Nieuwsbrief ontvangen per e-mail
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {isNewsletterActive 
                          ? "U staat ingeschreven en ontvangt onze periodieke partij- en fractie-updates."
                          : "U ontvangt momenteel geen digitale nieuwsbrieven van ons."
                        }
                      </div>
                    </div>

                    {/* Switch Toggle Button */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isNewsletterActive}
                      onClick={handleToggleNewsletter}
                      disabled={isTogglingNewsletter}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                        isNewsletterActive ? "bg-accent" : "bg-muted-foreground/30"
                      } ${isTogglingNewsletter ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <span className="sr-only">Toggle nieuwsbrief</span>
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                          isNewsletterActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      >
                        {isTogglingNewsletter && (
                          <Loader2 className="w-3 h-3 text-accent animate-spin" />
                        )}
                      </span>
                    </button>
                  </div>

                  {/* Email recipient section */}
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground block mb-0.5">
                          Ontvangstadres
                        </span>
                        {!isEditingEmail ? (
                          <div className="font-medium text-sm text-foreground flex items-center gap-2">
                            <span>{currentEmail}</span>
                            <button
                              onClick={() => {
                                setEmailInput(currentEmail);
                                setIsEditingEmail(true);
                              }}
                              className="text-accent hover:text-accent/80 text-xs inline-flex items-center gap-1 font-semibold ml-2 hover:underline"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Wijzigen</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              type="email"
                              value={emailInput}
                              onChange={(e) => setEmailInput(e.target.value)}
                              placeholder="uw.email@voorbeeld.nl"
                              className="h-9 text-xs sm:text-sm max-w-xs"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={handleSaveEmail}
                              className="h-9 px-3 text-xs bg-accent text-accent-foreground font-semibold"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" /> Opslaan
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setIsEditingEmail(false)}
                              className="h-9 px-3 text-xs"
                            >
                              Annuleren
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground sm:text-right">
                        <span>Frequentie: 1 à 2 keer per maand</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-2 pt-2 border-t border-border/40">
                  <Bell className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>
                    U kunt de nieuwsbrief op ieder moment eenvoudig aan- of uitzetten via deze schakelaar.
                  </span>
                </div>
              </section>

              {cancelledEvents.length > 0 && (
                <section className="bg-red-500/10 border border-red-500/20 p-6 sm:p-8 rounded-2xl">
                  <h2 className="text-2xl font-display mb-6 text-red-500">Belangrijke Mededeling: Gecancelde Evenementen</h2>
                  <div className="space-y-4">
                    {cancelledEvents.map(ce => (
                      <div key={ce.id} className="bg-background/80 p-4 rounded-xl border border-red-500/20">
                        <div className="font-semibold text-lg">{ce.title} (Gecanceld)</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Calendar className="w-3.5 h-3.5" /> {ce.date} | {ce.startTime} - {ce.endTime}
                        </div>
                        <p className="text-sm mt-2 text-muted-foreground">Dit evenement is helaas geannuleerd.</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4 text-accent" />
                      <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                        Beveiligd Ledendossier
                      </span>
                    </div>
                    <h2 className="text-2xl font-display text-foreground">Exclusief voor Leden</h2>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                      Vertrouwelijke stukken worden op de site geopend in de beveiligde lezersmodus: downloaden en printen zijn vergrendeld, en de inhoud wordt automatisch gemaskeerd bij het gebruik van een knipprogramma of schermopname.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-semibold uppercase tracking-widest rounded-full shrink-0 border border-accent/20 self-start sm:self-center">
                    {memberDocuments.length} Vertrouwelijk{memberDocuments.length === 1 ? "" : "e"} Document{memberDocuments.length === 1 ? "" : "en"}
                  </span>
                </div>

                {documentsLoading ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
                    <p className="text-xs text-muted-foreground">Documenten veilig ophalen...</p>
                  </div>
                ) : memberDocuments.length === 0 ? (
                  <div className="p-8 text-center bg-muted/20 rounded-xl border border-border/60">
                    <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground">Momenteel geen documenten beschikbaar</p>
                    <p className="text-xs text-muted-foreground mt-1">Zodra de fractie nieuwe stukken publiceert, verschijnen deze hier voor u.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-6">
                    {memberDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setViewingDocument(doc)}
                        className="group p-6 bg-muted/30 hover:bg-accent/5 rounded-xl border border-border/60 hover:border-accent/30 transition-all cursor-pointer flex flex-col justify-between shadow-sm relative overflow-hidden"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="w-10 h-10 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0 group-hover:scale-105 transition-transform">
                              <FileText className="w-5 h-5" />
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/25">
                              {doc.confidentiality || "Vertrouwelijk"}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                              {doc.category}
                            </span>
                            <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-1 text-base">
                              {doc.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                              {doc.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-muted-foreground">
                            {doc.fileSize || "1.0 MB"} • {doc.pageCount || 1} pag.
                          </span>
                          <div className="flex items-center gap-1.5 font-semibold text-accent group-hover:translate-x-0.5 transition-transform">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Beveiligd Inzien</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar (1 Column) */}
            <div className="space-y-8">
              {/* MIJN AGENDA */}
              <section className="bg-accent/5 rounded-2xl p-6 sm:p-8 border border-accent/10">
                <h2 className="text-xl font-display mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  <span>Mijn Agenda</span>
                </h2>
                <div className="space-y-4">
                  {attendingEvents.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4 bg-background/50 rounded-lg border border-border">
                      U heeft zich nog niet aangemeld voor komende evenementen.
                    </div>
                  ) : (
                    attendingEvents.map(ev => (
                      <div key={ev.id} className="p-4 bg-background rounded-xl border border-border/50 shadow-sm">
                        <div className="font-semibold mb-1">{ev.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                          <Calendar className="w-3.5 h-3.5 text-accent"/> {ev.date}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                          <Clock className="w-3.5 h-3.5 text-accent"/> {ev.startTime} - {ev.endTime}
                        </div>
                        <div className="text-xs flex items-start gap-1.5 bg-accent/10 p-2.5 rounded-lg text-accent border border-accent/20">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0"/>
                          <div>
                            <span className="font-semibold text-foreground block">Volledig adres: {ev.fullAddress || ev.address}</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
                              Aangemeld via ledenportaal
                            </span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">Kunt u toch niet komen?</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setUnattendEvent(ev)}
                            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 h-7.5 px-2.5 flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Afmelden</span>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <Link to="/agenda" className="inline-flex items-center mt-6 text-sm font-semibold text-primary hover:text-accent transition-colors">
                  Bekijk volledige agenda <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </section>

              {/* NIEUW BLOKJE: OPENSTAANDE FUNCTIES ONDER 'MIJN AGENDA' */}
              <section className="bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div>
                    <h2 className="text-xl font-display text-foreground flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-accent" />
                      <span>Openstaande functies</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Help mee in uw eigen wijk of kern
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-accent/15 text-accent border border-accent/25">
                    {allPositions.length} posities
                  </span>
                </div>

                {/* 3 Willekeurige beschikbare posities */}
                <div className="space-y-3">
                  {randomThreePositions.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-4 bg-muted/20 rounded-xl border border-border text-center">
                      Momenteel geen openstaande posities gevonden.
                    </div>
                  ) : (
                    randomThreePositions.map((pos) => (
                      <div
                        key={pos.id}
                        className="p-3.5 rounded-xl border border-border/70 bg-muted/15 hover:bg-muted/30 transition-colors flex flex-col justify-between gap-2.5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                              {pos.category}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-accent" /> {pos.wijkNaam}
                            </span>
                          </div>
                          <h4 className="font-semibold text-sm text-foreground leading-snug">
                            {pos.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {pos.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">Vrijwillig</span>
                          <Button
                            size="sm"
                            onClick={() => handleOpenApplicationModal(pos)}
                            className="h-7 px-3 text-xs bg-accent text-accent-foreground font-semibold hover:bg-accent/90"
                          >
                            Meld aan
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Knop 'Bekijk alle posities' */}
                <Button
                  variant="outline"
                  onClick={() => setIsPositionsModalOpen(true)}
                  className="w-full text-xs font-semibold flex items-center justify-center gap-1.5 border-accent/30 hover:border-accent hover:text-accent hover:bg-accent/5 h-9"
                >
                  <span>Bekijk alle {allPositions.length} posities</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </section>

              {/* LIDMAATSCHAP CARD MET WIJZIG KNOP */}
              <section className="bg-card rounded-2xl p-6 sm:p-8 border border-border">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h2 className="text-xl font-display">Lidmaatschap</h2>
                  <div className="flex items-center gap-2">
                    {(user.role === "admin" || user.role === "vrijwilliger") && (
                      <button
                        onClick={() => setIsTicketScannerOpen(true)}
                        className="text-xs text-accent hover:underline font-semibold flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30"
                      >
                        <QrCode className="w-3 h-3" /> Ticket scannen
                      </button>
                    )}
                    <button
                      onClick={() => setIsEditProfileOpen(true)}
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Gegevens wijzigen
                    </button>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-semibold text-green-500">Actief</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Woonplaats</span>
                    <span className="font-semibold">{user.city || "Steenwijkerland"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Nieuwsbrief</span>
                    <span className={`font-semibold ${isNewsletterActive ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {isNewsletterActive ? "Aangemeld" : "Afgemeld"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Lid sinds</span>
                    <span className="font-semibold">
                      {user.createdAt ? new Date(user.createdAt).getFullYear() : "2024"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Bijdrage</span>
                    <span className="font-semibold">
                      {user.directDebit !== false ? "Automatische incasso" : "Handmatige overboeking"}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="w-full mt-5 text-xs font-semibold h-9"
                >
                  <UserCog className="w-3.5 h-3.5 mr-1.5 text-accent" />
                  Mijn Registratiegegevens Bewerken
                </Button>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* DIALOG 1: REGISTRATIEGEGEVENS WIJZIGEN */}
      {/* ============================================================ */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display flex items-center gap-2.5">
              <UserCog className="w-6 h-6 text-accent" />
              <span>Registratiegegevens Wijzigen</span>
            </DialogTitle>
            <DialogDescription>
              Pas hier uw persoonsgegevens, woonplaats, e-mailadres en wachtwoord aan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Aanhef
                </label>
                <Select value={profileSalutation} onValueChange={setProfileSalutation}>
                  <SelectTrigger className="h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Aanhef" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dhr.">Dhr.</SelectItem>
                    <SelectItem value="Mevr.">Mevr.</SelectItem>
                    <SelectItem value="Anders">Anders</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Volledige naam *
                </label>
                <Input
                  value={profileFullName}
                  onChange={(e) => setProfileFullName(e.target.value)}
                  placeholder="Voor- en achternaam"
                  className="h-9 text-xs sm:text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                E-mailadres *
              </label>
              <Input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="uw.email@voorbeeld.nl"
                className="h-9 text-xs sm:text-sm"
                required
              />
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Hierop ontvangt u belangrijke ledencorrespondentie.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Adres (Straat & nr)
                </label>
                <Input
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  placeholder="Kerkstraat 12"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Woonplaats
                </label>
                <Input
                  value={profileCity}
                  onChange={(e) => setProfileCity(e.target.value)}
                  placeholder="Steenwijk, Oldemarkt..."
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Gebruikersnaam *
                </label>
                <Input
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  placeholder="Gebruikersnaam"
                  className="h-9 text-xs sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Nieuw Wachtwoord
                </label>
                <Input
                  type="password"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  placeholder="Alleen bij wijziging"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Opmerkingen / Interessegebieden (optioneel)
              </label>
              <Textarea
                value={profileRemarks}
                onChange={(e) => setProfileRemarks(e.target.value)}
                placeholder="Bijv. interesse in woningbouw, buitengebied, cultuur..."
                rows={2}
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-xl border border-border bg-muted/20">
              <Checkbox
                id="directDebitCheck"
                checked={profileDirectDebit}
                onCheckedChange={(c) => setProfileDirectDebit(Boolean(c))}
              />
              <div className="space-y-0.5 leading-none">
                <label
                  htmlFor="directDebitCheck"
                  className="text-xs font-semibold text-foreground cursor-pointer"
                >
                  Automatische incasso (contributie)
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Toestemming voor automatische incasso van de jaarlijkse partijbijdrage.
                </p>
              </div>
            </div>

            {/* Account Verwijderen Optie */}
            <div className="pt-3 border-t border-border/70">
              <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/5 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Account Verwijderen
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Wilt u uw account definitief opheffen? Al uw gegevens en agenda-aanmeldingen worden gewist.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleteAccountOpen(true)}
                    className="text-xs text-destructive hover:text-destructive-foreground hover:bg-destructive border-destructive/40 shrink-0 h-8 px-3"
                  >
                    Account verwijderen
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditProfileOpen(false)}
                className="text-xs h-9"
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                disabled={isSavingProfile}
                className="bg-accent text-accent-foreground font-semibold text-xs h-9"
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Gegevens Opslaan
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* DIALOG 2: OVERZICHT VAN ALLE OPENSTAANDE POSITIES */}
      {/* ============================================================ */}
      <Dialog open={isPositionsModalOpen} onOpenChange={setIsPositionsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display flex items-center gap-2.5">
              <Briefcase className="w-6 h-6 text-accent" />
              <span>Alle Beschikbare Posities in Steenwijkerland</span>
            </DialogTitle>
            <DialogDescription>
              Overzicht van alle wijken en kernen die nog een vertegenwoordiger zoeken, plus openstaande vrijwilligersfuncties.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Zoek op wijk, kern of functienaam..."
                  value={positionsSearch}
                  onChange={(e) => setPositionsSearch(e.target.value)}
                  className="pl-9 h-9 text-xs sm:text-sm"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setPositionsCategoryFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    positionsCategoryFilter === "all"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Alles ({allPositions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPositionsCategoryFilter("wijk")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    positionsCategoryFilter === "wijk"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Wijken
                </button>
                <button
                  type="button"
                  onClick={() => setPositionsCategoryFilter("kern")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    positionsCategoryFilter === "kern"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Kernen / Dorpen
                </button>
                <button
                  type="button"
                  onClick={() => setPositionsCategoryFilter("custom")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    positionsCategoryFilter === "custom"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Fractie & Campagne
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {filteredPositions.length === 0 ? (
                <div className="p-8 text-center bg-muted/20 rounded-xl border border-border text-sm text-muted-foreground">
                  Geen openstaande posities gevonden die voldoen aan uw zoekopdracht.
                </div>
              ) : (
                filteredPositions.map((pos) => (
                  <div
                    key={pos.id}
                    className="p-4 rounded-xl border border-border bg-card hover:bg-muted/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                          {pos.category}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3 text-accent" /> {pos.wijkNaam}
                        </span>
                      </div>
                      <h4 className="font-semibold text-base text-foreground">{pos.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 max-w-xl">
                        {pos.description}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <Button
                        onClick={() => handleOpenApplicationModal(pos)}
                        className="bg-accent text-accent-foreground font-semibold text-xs h-8 px-4 hover:bg-accent/90"
                      >
                        Meld aan
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* DIALOG 3: SOLLICITATIE / AANMELDFORMULIER MET VOORINGEVULDE DATA */}
      {/* ============================================================ */}
      {selectedVacancy && (
        <Dialog open={!!selectedVacancy} onOpenChange={() => setSelectedVacancy(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display flex items-center gap-2.5">
                <Sparkles className="w-6 h-6 text-accent" />
                <span>Meld u aan voor deze positie</span>
              </DialogTitle>
              <DialogDescription>
                Uw naam, e-mailadres en de betreffende wijk/kern zijn reeds voor u ingevuld. Voeg alleen nog uw motivatie toe.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitApplication} className="space-y-4 py-2">
              {/* Pre-filled info box */}
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1 mb-0.5">
                      <Lock className="w-3 h-3 text-accent" /> Uw naam
                    </span>
                    <span className="font-semibold text-foreground text-sm">
                      {user.fullName}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1 mb-0.5">
                      <Lock className="w-3 h-3 text-accent" /> Uw e-mailadres
                    </span>
                    <span className="font-semibold text-foreground text-sm truncate block">
                      {currentEmail}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-accent/15">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                    <MapPin className="w-3 h-3 text-accent" /> Betreffende wijk of functie
                  </span>
                  <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <span>{selectedVacancy.title}</span>
                    <span className="text-xs text-accent">({selectedVacancy.wijkNaam})</span>
                  </div>
                </div>
              </div>

              {/* MOTIVERENDE BESCHRIJVING VELD */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1 flex items-center justify-between">
                  <span>Motiverende beschrijving *</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Minimaal 10 tekens
                  </span>
                </label>
                <Textarea
                  value={motivationText}
                  onChange={(e) => setMotivationText(e.target.value)}
                  placeholder="Vertel ons waarom u deze wijk of functie wilt vertegenwoordigen, wat uw binding is met de buurt en welke thema's u belangrijk vindt..."
                  rows={5}
                  className="text-xs sm:text-sm leading-relaxed"
                  required
                  autoFocus
                />
                <span className="text-[11px] text-muted-foreground block mt-1">
                  Uw motiverende beschrijving wordt rechtstreeks gedeeld met het partijbestuur en de fractievoorzitter in het beheerderspaneel.
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedVacancy(null)}
                  className="text-xs h-9"
                >
                  Annuleren
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingApp || !motivationText.trim()}
                  className="bg-accent text-accent-foreground font-semibold text-xs h-9"
                >
                  {isSubmittingApp ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Versturen...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Aanmelding Versturen
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* SECURE DOCUMENT VIEWER FOR EXCLUSIVE MEMBER FILES */}
      <SecureDocumentViewer
        document={viewingDocument}
        isOpen={Boolean(viewingDocument)}
        onClose={() => setViewingDocument(null)}
        user={user}
      />

      {/* ============================================================ */}
      {/* DIALOG: ACCOUNT DEFINITIEF VERWIJDEREN BEVESTIGING */}
      {/* ============================================================ */}
      <Dialog open={isDeleteAccountOpen} onOpenChange={setIsDeleteAccountOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <span>Account definitief verwijderen?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Weet u zeker dat u uw account bij Lijst van Andel wilt opzeggen en verwijderen?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" /> Let op: deze actie kan niet ongedaan worden gemaakt.
              </p>
              <p className="text-[11px] text-foreground/80 leading-relaxed">
                Al uw persoonsgegevens, ingestelde voorkeuren en aanmeldingen voor bijeenkomsten worden permanent gewist uit onze ledendatabase.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              U wordt na het verwijderen onmiddellijk uitgelogd en heeft niet langer toegang tot het besloten ledenportaal en exclusieve documenten.
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteAccountOpen(false)}
              className="text-xs h-9"
              disabled={isDeletingAccount}
            >
              Annuleren
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="text-xs h-9 flex items-center gap-1.5"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Verwijderen...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Ja, account verwijderen
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* DIALOG: AFMEDELEN VOOR EVENEMENT BEVESTIGING */}
      {/* ============================================================ */}
      <Dialog open={Boolean(unattendEvent)} onOpenChange={(open) => !open && setUnattendEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <CalendarX className="w-5 h-5 text-accent shrink-0" />
              <span>Afmelden voor bijeenkomst</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Wilt u zich afmelden voor <strong>{unattendEvent?.title}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-2 text-xs text-foreground/90">
            {unattendEvent && (
              <div className="p-3 bg-secondary/50 rounded-lg border border-border space-y-1">
                <div className="font-semibold text-foreground">{unattendEvent.title}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-accent" /> {unattendEvent.date} ({unattendEvent.startTime} - {unattendEvent.endTime})
                </div>
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              Uw aanmelding wordt ingetrokken en het evenement wordt verwijderd uit &lsquo;Mijn Agenda&rsquo;. U kunt zich later altijd opnieuw aanmelden via de openbare agenda.
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUnattendEvent(null)}
              className="text-xs h-9"
              disabled={isUnattending}
            >
              Annuleren
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmUnattend}
              disabled={isUnattending}
              className="text-xs h-9 flex items-center gap-1.5"
            >
              {isUnattending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Afmelden...
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  Bevestig afmelding
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* DIALOG: STRIPE VEILIGE BETALING (IFRAME-PROOF & POPUP LINK) */}
      {/* ============================================================ */}
      <Dialog
        open={Boolean(stripePaymentModal?.open)}
        onOpenChange={(open) => {
          if (!open) setStripePaymentModal(null);
        }}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2 ring-8 ring-primary/5">
              <CreditCard className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-display font-bold text-foreground">
              Veilige Stripe Betaalomgeving
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Jaarlijkse lidmaatschapscontributie Lijst van Andel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                Waarom in een apart tabblad?
              </div>
              <p className="leading-relaxed">
                Stripe beveiligt betaalgegevens volgens de strengste banknormen. Om u te beschermen tegen fraude en clickjacking mag een Stripe-afrekenpagina <strong>nooit</strong> in een ingesloten venster of iframe draaien (waardoor het scherm anders blijft laden en draaien).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/50 border border-border text-xs space-y-2">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Omschrijving:</span>
                <span className="font-medium text-foreground">Lidmaatschap (1 jaar)</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-border/60">
                <span className="font-medium text-foreground">Totaalbedrag:</span>
                <span className="text-lg font-bold font-display text-primary">€12,00</span>
              </div>
              <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/60 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Ondersteunt o.a. iDEAL, Bancontact, Creditcard en Apple/Google Pay
              </div>
            </div>

            {stripePaymentModal?.checkoutUrl && (
              <a
                href={stripePaymentModal.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow transition-colors"
              >
                <span>Naar officiële Stripe betaalpagina</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="outline"
                type="button"
                onClick={handleManualCheckPayment}
                disabled={isCheckingPaymentStatus}
                className="w-full text-xs h-10 flex items-center justify-center gap-2"
              >
                {isCheckingPaymentStatus ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Status controleren...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Ik heb betaald / Status nu controleren
                  </>
                )}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                Zodra u de betaling bij Stripe afrondt, detecteert het systeem dit automatisch.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Scanner Modal voor Vrijwilligers & Admins */}
      <TicketScannerModal
        open={isTicketScannerOpen}
        onOpenChange={setIsTicketScannerOpen}
        token={token}
      />
    </div>
  );
}
