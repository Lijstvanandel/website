import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CreditCard,
  Coins,
  Receipt,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  DollarSign,
  PieChart,
  Scale,
  FileCheck2,
  FileText,
  AlertTriangle,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  Trash2,
  ExternalLink
} from "lucide-react";

interface Account {
  id: string;
  name: string;
  iban: string;
  type: "lopend" | "spaar" | "fractie" | "kas";
  balance: number;
  currency: string;
  description: string;
  institution: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  description: string;
  creditor: string;
  amount: number;
  date: string;
  category: string;
  accountId: string;
  receiptName: string;
  receiptUrl?: string;
  requiresFourEyes: boolean;
  status: "pending_approval" | "approved" | "paid" | "rejected";
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  notes?: string;
}

interface PoliticianAfdracht {
  id: string;
  politicianName: string;
  roleTitle: string;
  mandateTerm: string;
  percentageOrAmount: string;
  quarterDues: Record<string, { status: "paid" | "pending"; amount: number; paidAt: string | null }>;
  remarks?: string;
}

interface BudgetItem {
  id: string;
  type: "income" | "expense";
  category: string;
  budgeted: number;
  realized: number;
  notes?: string;
}

interface KascommissieInfo {
  commissieLeden: Array<{ name: string; role: string; appointedUntil: string }>;
  lastAuditDate: string;
  nextAuditDate: string;
  dechargeStatus: string;
  dechargeAdvice: string;
  reportFileName?: string;
}

interface TreasurerSettings {
  fourEyesThreshold: number;
  wbtrCompliant: boolean;
  anbiStatusActive: boolean;
  anbiRsin?: string;
  kvkNumber?: string;
  bankName?: string;
  lastReviewedAt?: string;
}

interface TreasurerData {
  accounts: Account[];
  invoices: Invoice[];
  afdrachten: PoliticianAfdracht[];
  budget: BudgetItem[];
  kascommissie: KascommissieInfo;
  settings: TreasurerSettings;
  membershipSettings: any;
  donations: any[];
  members: any[];
  stats: {
    totalLiquidity: number;
    lopendBalance: number;
    spaarBalance: number;
    fractieBalance: number;
    kasBalance: number;
    pendingInvoicesCount: number;
    pendingInvoicesAmount: number;
    fourEyesWaitingCount: number;
    totalMembersCount: number;
    paidMembersCount: number;
    pendingMembersCount: number;
    exemptMembersCount: number;
    totalContributieRevenue: number;
    totalDonationsAmount: number;
  };
}

interface TreasurerManagerProps {
  token?: string | null;
  currentUser?: any;
  headers?: Record<string, string>;
}

export function TreasurerManager(props?: TreasurerManagerProps) {
  const { token: ctxToken, user: ctxUser } = useAuth();
  const rawToken = props?.token || ctxToken;
  const token = (rawToken && rawToken !== "null" && rawToken !== "undefined") ? rawToken : getAuthToken();
  const user = props?.currentUser || ctxUser;
  const [data, setData] = useState<TreasurerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "accounts" | "invoices" | "contributie" | "donations" | "afdrachten" | "planning" | "settings"
  >("overview");

  // New Invoice form state
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [newInvoiceCreditor, setNewInvoiceCreditor] = useState("");
  const [newInvoiceDesc, setNewInvoiceDesc] = useState("");
  const [newInvoiceAmount, setNewInvoiceAmount] = useState("");
  const [newInvoiceCategory, setNewInvoiceCategory] = useState("Algemeen");
  const [newInvoiceAccount, setNewInvoiceAccount] = useState("acc_lopend");
  const [newInvoiceReceipt, setNewInvoiceReceipt] = useState("declaratie_bewijs.pdf");
  const [newInvoiceNotes, setNewInvoiceNotes] = useState("");
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  // New Transaction form state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDesc, setTransactionDesc] = useState("");
  const [transactionType, setTransactionType] = useState<"deposit" | "withdrawal">("deposit");

  // Manual donation state
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationDonor, setDonationDonor] = useState("");
  const [donationAmount, setDonationAmount] = useState("");
  const [donationEmail, setDonationEmail] = useState("");
  const [donationMsg, setDonationMsg] = useState("");

  // Search in contributie members
  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState<string>("all");

  // Fetch all treasurer data
  const fetchData = useCallback(async () => {
    const activeToken = (token && token !== "null" && token !== "undefined") ? token : getAuthToken();
    if (!activeToken) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/treasurer/data", {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || "Kon penningmeestersgegevens niet ophalen");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Fout bij ophalen financiële gegevens");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Invoice Actions
  const handleApproveInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/treasurer/invoices/${invoiceId}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Kon niet accorderen");
      toast.success("Factuur succesvol geaccordeerd volgens het vierogenprincipe");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/treasurer/invoices/${invoiceId}/pay`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Kon niet als betaald markeren");
      toast.success("Factuur gemarkeerd als betaald en rekeningafschrift bijgewerkt");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm("Weet u zeker dat u deze factuur/declaratie wilt verwijderen?")) return;
    try {
      const res = await fetch(`/api/treasurer/invoices/${invoiceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Kon niet verwijderen");
      toast.success("Factuur verwijderd");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoiceCreditor || !newInvoiceDesc || !newInvoiceAmount) {
      toast.error("Vul alle verplichte velden in");
      return;
    }

    try {
      setIsSubmittingInvoice(true);
      const res = await fetch("/api/treasurer/invoices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          creditor: newInvoiceCreditor,
          description: newInvoiceDesc,
          amount: parseFloat(newInvoiceAmount),
          category: newInvoiceCategory,
          accountId: newInvoiceAccount,
          receiptName: newInvoiceReceipt,
          notes: newInvoiceNotes
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Fout bij indienen");
      toast.success("Factuur succesvol ingediend ter controle");
      setShowNewInvoiceModal(false);
      setNewInvoiceCreditor("");
      setNewInvoiceDesc("");
      setNewInvoiceAmount("");
      setNewInvoiceNotes("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // Transaction on account
  const handleAccountTransaction = async (accountId: string) => {
    if (!transactionAmount || parseFloat(transactionAmount) <= 0) {
      toast.error("Voer een geldig bedrag in");
      return;
    }
    try {
      const res = await fetch(`/api/treasurer/accounts/${accountId}/transaction`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: parseFloat(transactionAmount),
          description: transactionDesc || "Handmatige mutatie",
          type: transactionType
        })
      });
      if (!res.ok) throw new Error("Kon transactie niet verwerken");
      toast.success("Rekeningmutatie succesvol opgeslagen");
      setSelectedAccountId(null);
      setTransactionAmount("");
      setTransactionDesc("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Member billing status change
  const handleMemberBillingChange = async (userId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/billing`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ billingStatus: status })
      });
      if (!res.ok) throw new Error("Kon status niet bijwerken");
      toast.success("Contributiestatus bijgewerkt");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Manual donation registration
  const handleSaveDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      toast.error("Voer een geldig bedrag in");
      return;
    }
    try {
      const res = await fetch("/api/treasurer/donations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          donorName: donationDonor,
          donorEmail: donationEmail,
          amount: parseFloat(donationAmount),
          message: donationMsg
        })
      });
      if (!res.ok) throw new Error("Kon gift niet registreren");
      toast.success("Gift geregistreerd in het giftenregister en lopende rekening geactualiseerd");
      setShowDonationModal(false);
      setDonationDonor("");
      setDonationAmount("");
      setDonationEmail("");
      setDonationMsg("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Politician afdracht status toggle
  const handleToggleAfdrachtQuarter = async (
    afdrachtId: string,
    quarterKey: string,
    currentStatus: string,
    amount: number
  ) => {
    const newStatus = currentStatus === "paid" ? "pending" : "paid";
    try {
      const res = await fetch(`/api/treasurer/afdrachten/${afdrachtId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          quarterKey,
          status: newStatus,
          amount
        })
      });
      if (!res.ok) throw new Error("Kon afdracht niet bijwerken");
      toast.success(`Kwartaal ${quarterKey} gemarkeerd als ${newStatus === "paid" ? "voldaan" : "openstaand"}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Update Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.settings) return;
    try {
      const res = await fetch("/api/treasurer/settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data.settings)
      });
      if (!res.ok) throw new Error("Kon instellingen niet opslaan");
      toast.success("Penningmeester-instellingen en vierogendrempel opgeslagen");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Filtered members list
  const filteredMembers = (data?.members || []).filter((m: any) => {
    const matchSearch =
      (m.fullName || "").toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.email || "").toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.username || "").toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.city || "").toLowerCase().includes(memberSearch.toLowerCase());

    if (!matchSearch) return false;
    if (memberFilter === "all") return true;
    if (memberFilter === "paid") return m.billingStatus === "paid";
    if (memberFilter === "pending") return m.billingStatus === "pending" || !m.billingStatus;
    if (memberFilter === "exempt") return m.billingStatus === "exempt" || m.role === "admin" || m.role === "penningmeester";
    return true;
  });

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center space-x-3 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
        <span>Financieel kasboek & penningmeesterpaneel laden...</span>
      </div>
    );
  }

  const stats = data?.stats || {
    totalLiquidity: 0,
    lopendBalance: 0,
    spaarBalance: 0,
    fractieBalance: 0,
    kasBalance: 0,
    pendingInvoicesCount: 0,
    pendingInvoicesAmount: 0,
    fourEyesWaitingCount: 0,
    totalMembersCount: 0,
    paidMembersCount: 0,
    pendingMembersCount: 0,
    exemptMembersCount: 0,
    totalContributieRevenue: 0,
    totalDonationsAmount: 0
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Penningmeester Header */}
      <div className="bg-gradient-to-r from-emerald-900/30 via-emerald-800/15 to-transparent border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-600 border border-emerald-500/30">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">
                    Penningmeesterpaneel
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    Art. 33 • WBTR & ANBI Conform
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Integraal financieel beheer van Lijst van Andel: rekeningen, vierogenprincipe, contributies, giften en kascommissie.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => setShowNewInvoiceModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium text-xs rounded-xl"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Factuur / Declaratie Indienen
            </Button>
            <Button
              onClick={() => setShowDonationModal(true)}
              variant="outline"
              className="border-emerald-500/30 hover:bg-emerald-500/10 text-xs rounded-xl"
            >
              <Coins className="w-4 h-4 mr-1.5 text-emerald-600" />
              Gift Registreren
            </Button>
            <Button
              onClick={fetchData}
              variant="outline"
              size="icon"
              className="rounded-xl"
              title="Vernieuwen"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Vierogenprincipe alert badge if pending items require second approval */}
        {stats.fourEyesWaitingCount > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Vierogenprincipe Waarschuwing:</strong> Er {stats.fourEyesWaitingCount === 1 ? "staat 1 uitgave" : `staan ${stats.fourEyesWaitingCount} uitgaven`} boven de drempel van €{data?.settings?.fourEyesThreshold || 250},- te wachten op accordering door een tweede bestuurslid.
              </span>
            </div>
            <Button
              onClick={() => setActiveSubTab("invoices")}
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
            >
              Direct Beoordelen &rarr;
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Totale Liquiditeit */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm relative overflow-hidden">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Totale Partijkas</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-display text-foreground">
            €{stats.totalLiquidity.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
            <span>Lopend: €{stats.lopendBalance.toFixed(0)}</span>
            <span>Spaar: €{stats.spaarBalance.toFixed(0)}</span>
          </div>
        </div>

        {/* Fractierekening (Art. 33) */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Fractie (Art. 33)</span>
            <Scale className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-display text-blue-600 dark:text-blue-400">
            €{stats.fractieBalance.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Wettelijk gescheiden fractiebudget
          </div>
        </div>

        {/* Ledencontributies */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Contributie-Opbrengst</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-display text-foreground">
            €{stats.totalContributieRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
            <span className="text-emerald-600 font-medium">{stats.paidMembersCount} voldaan</span>
            <span>•</span>
            <span className="text-amber-600 font-medium">{stats.pendingMembersCount} open</span>
          </div>
        </div>

        {/* Te Accorderen / Facturen */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Openstaande Facturen</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-display text-amber-600">
            €{stats.pendingInvoicesAmount.toFixed(2)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {stats.pendingInvoicesCount} post(en) in behandeling
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-muted/40 rounded-xl border border-border text-xs font-medium">
        <button
          onClick={() => setActiveSubTab("overview")}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeSubTab === "overview"
              ? "bg-background text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Overzicht & Cockpit
        </button>
        <button
          onClick={() => setActiveSubTab("accounts")}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeSubTab === "accounts"
              ? "bg-background text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Rekeningen & Kasboek ({data?.accounts?.length || 4})
        </button>
        <button
          onClick={() => setActiveSubTab("invoices")}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeSubTab === "invoices"
              ? "bg-background text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Facturen & Vierogenprincipe</span>
          {stats.fourEyesWaitingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
              {stats.fourEyesWaitingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab("contributie")}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeSubTab === "contributie"
              ? "bg-background text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Ledencontributie & Stripe ({stats.totalMembersCount})
        </button>
        <button
          onClick={() => setActiveSubTab("donations")}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeSubTab === "donations"
              ? "bg-background text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Giftenregister & Wpp ({data?.donations?.length || 0})
        </button>
        <button
          onClick={() => setActiveSubTab("afdrachten")}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeSubTab === "afdrachten"
              ? "bg-background text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Ambtsdragers Afdrachten
        </button>
        <button
          onClick={() => setActiveSubTab("planning")}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeSubTab === "planning"
              ? "bg-background text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Begroting & Kascommissie
        </button>
        <button
          onClick={() => setActiveSubTab("settings")}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeSubTab === "settings"
              ? "bg-background text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Instellingen & Compliance
        </button>
      </div>

      {/* SUBTAB 1: OVERZICHT & COCKPIT */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rekeningen Samenvatting */}
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold font-display text-foreground">
                    Bankrekeningen & Kaspositie
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    RegioBank Steenwijkerland • Gescheiden beheer conform gemeentelijke richtlijnen
                  </p>
                </div>
                <Button
                  onClick={() => setActiveSubTab("accounts")}
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-xl"
                >
                  Kasboek openen &rarr;
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {(data?.accounts || []).map((acc) => (
                  <div
                    key={acc.id}
                    className="p-4 rounded-xl border border-border/80 bg-muted/20 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          {acc.type === "fractie" ? (
                            <Scale className="w-3.5 h-3.5 text-blue-600" />
                          ) : acc.type === "spaar" ? (
                            <Building2 className="w-3.5 h-3.5 text-purple-600" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>{acc.name}</span>
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                          {acc.iban}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-foreground font-mono">
                        €{acc.balance.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
                      {acc.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance & Kascommissie Widget */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold font-display text-foreground">
                  Governance & Controle
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                  <div className="text-muted-foreground font-medium">Vierogenprincipe Drempel</div>
                  <div className="text-sm font-bold text-foreground mt-0.5">
                    €{data?.settings?.fourEyesThreshold || 250},- per uitgave
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Conform advies Kennispunt Lokale Politieke Partijen
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                  <div className="text-muted-foreground font-medium">Kascommissie Decharge</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>{data?.kascommissie?.dechargeStatus || "Goedgekeurd door Kascommissie"}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Laatste controle: {data?.kascommissie?.lastAuditDate || "24 maart 2026"}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                  <div className="text-muted-foreground font-medium">WBTR & ANBI Status</div>
                  <div className="text-sm font-bold text-foreground mt-0.5">
                    Actief • RSIN: {data?.settings?.anbiRsin || "854912034"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Giften zijn onder voorwaarden fiscaal aftrekbaar voor donateurs
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recente Facturen & Declaraties Te Behandelen */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-display text-foreground">
                  Openstaande Facturen & Vierogen-Accordering
                </h3>
                <p className="text-xs text-muted-foreground">
                  Facturen en declaraties die wachten op betaling of 2e bestuursakkoord
                </p>
              </div>
              <Button
                onClick={() => setActiveSubTab("invoices")}
                variant="outline"
                size="sm"
                className="text-xs rounded-xl"
              >
                Alle facturen bekijken &rarr;
              </Button>
            </div>

            <div className="divide-y divide-border">
              {(data?.invoices || [])
                .slice(0, 5)
                .map((inv) => (
                  <div key={inv.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-xs text-muted-foreground">• {inv.creditor}</span>
                        {inv.requiresFourEyes && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                            Vierogenprincipe (&ge; €{data?.settings?.fourEyesThreshold || 250})
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            inv.status === "paid"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : inv.status === "approved"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {inv.status === "paid"
                            ? "Betaald"
                            : inv.status === "approved"
                            ? "Geaccordeerd (Te betalen)"
                            : "Wachten op accordering"}
                        </span>
                      </div>
                      <div className="text-xs text-foreground font-medium">{inv.description}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Ingediend op {inv.date} door {inv.submittedBy}
                        {inv.approvedBy && ` • Akkoord door: ${inv.approvedBy}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-base font-bold font-mono text-foreground">
                          €{inv.amount.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{inv.category}</div>
                      </div>

                      {inv.status === "pending_approval" && (
                        <Button
                          onClick={() => handleApproveInvoice(inv.id)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 rounded-xl"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Accorderen
                        </Button>
                      )}

                      {inv.status === "approved" && (
                        <Button
                          onClick={() => handlePayInvoice(inv.id)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 rounded-xl"
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1" />
                          Uitbetalen
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: REKENINGEN & KASBOEK */}
      {activeSubTab === "accounts" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(data?.accounts || []).map((acc) => (
              <div
                key={acc.id}
                className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4 relative"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                      {acc.type === "fractie"
                        ? "Gemeentewet Art. 33"
                        : acc.type === "spaar"
                        ? "Bestuursreserve & Campagne"
                        : acc.type === "kas"
                        ? "Contant Kasboek"
                        : "Operationele Rekening"}
                    </span>
                    <h3 className="text-lg font-bold font-display text-foreground mt-2">
                      {acc.name}
                    </h3>
                    <div className="text-xs font-mono text-muted-foreground">{acc.iban}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold font-mono text-foreground">
                      €{acc.balance.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{acc.institution}</div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/50">
                  {acc.description}
                </p>

                {selectedAccountId === acc.id ? (
                  <div className="p-4 rounded-xl bg-muted/60 border border-emerald-500/30 space-y-3">
                    <div className="text-xs font-bold text-foreground">
                      Nieuwe Mutatie Toevoegen op {acc.name}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={transactionType}
                        onChange={(e: any) => setTransactionType(e.target.value)}
                        className="text-xs p-2 rounded-lg border border-border bg-background"
                      >
                        <option value="deposit">+ Bijschrijving / Ontvangst</option>
                        <option value="withdrawal">- Afschrijving / Uitgave</option>
                      </select>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Bedrag (€)"
                        value={transactionAmount}
                        onChange={(e) => setTransactionAmount(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>
                    <Input
                      placeholder="Omschrijving van transactie / boeking"
                      value={transactionDesc}
                      onChange={(e) => setTransactionDesc(e.target.value)}
                      className="text-xs h-9"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        onClick={() => setSelectedAccountId(null)}
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8"
                      >
                        Annuleren
                      </Button>
                      <Button
                        onClick={() => handleAccountTransaction(acc.id)}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                      >
                        Mutatie Boeken
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setTransactionAmount("");
                      setTransactionDesc("");
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs rounded-xl"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Mutatie / Boeking Invoeren
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Richtlijn Fractiegelden (Art. 33 Gemeentewet):</strong>
              <p className="mt-0.5">
                De fractiebijdrage wordt verstrekt door de Gemeente Steenwijkerland en mag uitsluitend worden aangewend voor de ondersteuning van de fractiewerkzaamheden. Deze gelden mogen onder geen beding worden gebruikt voor de verkiezingscampagne of partijpolitieke activiteiten van de vereniging. Jaarlijks dient een separate financiële verantwoording te worden ingediend bij de gemeenteraad.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: FACTUREN & VIEROGENPRINCIPE */}
      {activeSubTab === "invoices" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold font-display text-foreground">
                Facturen-, Kwitantie- & Declaratiebeheer
              </h3>
              <p className="text-xs text-muted-foreground">
                Elke uitgave &ge; €{data?.settings?.fourEyesThreshold || 250},- vereist conform het vierogenprincipe akkoord van een 2e bestuurder
              </p>
            </div>
            <Button
              onClick={() => setShowNewInvoiceModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Nieuwe Factuur / Declaratie
            </Button>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <th className="px-4 py-3">Nummer & Datum</th>
                    <th className="px-4 py-3">Crediteur / Indiener</th>
                    <th className="px-4 py-3">Omschrijving & Categorie</th>
                    <th className="px-4 py-3">Rekening</th>
                    <th className="px-4 py-3">Bedrag</th>
                    <th className="px-4 py-3">Vierogenprincipe</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.invoices || []).map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-foreground">{inv.invoiceNumber}</div>
                        <div className="text-[11px] text-muted-foreground">{inv.date}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-foreground">{inv.creditor}</div>
                        <div className="text-[11px] text-muted-foreground">Door: {inv.submittedBy}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-foreground">{inv.description}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span>{inv.category}</span>
                          {inv.receiptName && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-emerald-600 flex items-center gap-0.5">
                                <FileText className="w-3 h-3" /> {inv.receiptName}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                        {inv.accountId === "acc_fractie" ? "Fractiegelden" : "Lopende rek."}
                      </td>
                      <td className="px-4 py-3.5 font-bold font-mono text-sm text-foreground">
                        €{inv.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5">
                        {inv.requiresFourEyes ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                            Vereist (&ge; €{data?.settings?.fourEyesThreshold || 250})
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Vrijgesteld (&lt; drempel)</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            inv.status === "paid"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : inv.status === "approved"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {inv.status === "paid"
                            ? "✓ Betaald"
                            : inv.status === "approved"
                            ? "✓ Geaccordeerd"
                            : "⏳ Ter Accordering"}
                        </span>
                        {inv.approvedBy && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            Akkoord: {inv.approvedBy}
                          </div>
                        )}
                        {inv.paidAt && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Betaald op: {inv.paidAt.split("T")[0]}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        {inv.status === "pending_approval" && (
                          <Button
                            onClick={() => handleApproveInvoice(inv.id)}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 rounded-lg"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Accordeer (Vierogen)
                          </Button>
                        )}
                        {inv.status === "approved" && (
                          <Button
                            onClick={() => handlePayInvoice(inv.id)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] h-7 rounded-lg"
                          >
                            <CreditCard className="w-3 h-3 mr-1" /> Uitbetalen
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDeleteInvoice(inv.id)}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Verwijderen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* SUBTAB 4: CONTRIBUTIE & STRIPE */}
      {activeSubTab === "contributie" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold font-display text-foreground">
                Ledencontributie & Betaalstatus
              </h3>
              <p className="text-xs text-muted-foreground">
                Partijcontributie (€12,- per jaar) via Stripe iDEAL of handmatig voldaan (kas / bank)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/api/treasurer/export/contributie"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border hover:bg-muted text-xs font-semibold text-foreground shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" /> Export Contributielijst (CSV)
              </a>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-2xl border border-border shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Zoek lid op naam, e-mail, gebruikersnaam of woonplaats..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-border bg-background"
            >
              <option value="all">Alle leden tonen ({data?.members?.length || 0})</option>
              <option value="paid">Alleen Voldaan ({stats.paidMembersCount})</option>
              <option value="pending">Alleen Openstaand ({stats.pendingMembersCount})</option>
              <option value="exempt">Alleen Vrijgesteld ({stats.exemptMembersCount})</option>
            </select>
          </div>

          {/* Members Table */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <th className="px-4 py-3">Naam & Contact</th>
                    <th className="px-4 py-3">Woonplaats</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Contributiestatus</th>
                    <th className="px-4 py-3">Bedrag</th>
                    <th className="px-4 py-3">Betaaldatum</th>
                    <th className="px-4 py-3 text-right">Handmatige Statuswijziging</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMembers.map((m: any) => (
                    <tr key={m.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground">{m.fullName || m.username}</div>
                        <div className="text-[11px] text-muted-foreground">{m.email || m.username}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {m.city || "Steenwijkerland"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.role === "admin"
                              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                              : m.role === "penningmeester"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : m.role === "raadslid"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            m.billingStatus === "paid"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : m.billingStatus === "exempt"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {m.billingStatus === "paid"
                            ? "✓ Voldaan"
                            : m.billingStatus === "exempt"
                            ? "🛡️ Vrijgesteld"
                            : "⏳ Openstaand"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        €{(m.paidAmount !== undefined ? m.paidAmount : (m.billingStatus === "paid" ? 12 : 0)).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-[11px]">
                        {m.paidAt ? m.paidAt.split("T")[0] : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={m.billingStatus || "pending"}
                          onChange={(e) => handleMemberBillingChange(m.id, e.target.value)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-border bg-background outline-none cursor-pointer"
                        >
                          <option value="paid">✓ Markeer Voldaan (€12,-)</option>
                          <option value="pending">⏳ Openstaand</option>
                          <option value="exempt">🛡️ Vrijgesteld</option>
                          <option value="failed">✕ Mislukt / Gestorneerd</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: GIFTENREGISTER & WPP */}
      {activeSubTab === "donations" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold font-display text-foreground">
                Giftenregister (Wet Financiering Politieke Partijen)
              </h3>
              <p className="text-xs text-muted-foreground">
                Transparantieregister conform Wpp & ANBI • Donaties &ge; €1.000 worden gepubliceerd in het financieel jaarverslag
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowDonationModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Gift Handmatig Registreren
              </Button>
              <a
                href="/api/treasurer/export/donations"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border hover:bg-muted text-xs font-semibold text-foreground shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" /> Export Giftenregister (CSV)
              </a>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <th className="px-4 py-3">Datum</th>
                    <th className="px-4 py-3">Donateur / Gever</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Bedrag</th>
                    <th className="px-4 py-3">Betaalwijze</th>
                    <th className="px-4 py-3">Wpp Toetsing</th>
                    <th className="px-4 py-3">Notitie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.donations || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Geen donaties geregistreerd. Registreer donaties handmatig of via de publieke doneerpagina.
                      </td>
                    </tr>
                  ) : (
                    (data?.donations || []).map((d: any) => (
                      <tr key={d.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 text-muted-foreground font-mono">
                          {d.createdAt ? d.createdAt.split("T")[0] : "-"}
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          {d.donorName || "Anonieme gever"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {d.donorEmail || "-"}
                        </td>
                        <td className="px-4 py-3 font-bold font-mono text-emerald-600 text-sm">
                          €{(Number(d.amount) || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground uppercase text-[10px]">
                          {d.paymentMethod || "iDEAL / Stripe"}
                        </td>
                        <td className="px-4 py-3">
                          {Number(d.amount) >= 1000 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              Publicatieplicht Jaarverslag
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Regulier (&lt; €1.000)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-[11px]">
                          {d.message || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 6: AMBTSDRAGERS AFDRACHTEN */}
      {activeSubTab === "afdrachten" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold font-display text-foreground">
              Afdrachtenregeling Politieke Ambtsdragers
            </h3>
            <p className="text-xs text-muted-foreground">
              Conform het partijstatuut van Lijst van Andel dragen gekozen volksvertegenwoordigers een periodieke bijdrage af aan de partijkas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(data?.afdrachten || []).map((afd) => (
              <div key={afd.id} className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold font-display text-foreground">
                      {afd.politicianName}
                    </h4>
                    <div className="text-xs text-muted-foreground">{afd.roleTitle} • Periode {afd.mandateTerm}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    {afd.percentageOrAmount}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl">
                  {afd.remarks}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-foreground">Status Kwartaalafdrachten 2026:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(afd.quarterDues || {}).map(([qKey, qVal]: any) => (
                      <div
                        key={qKey}
                        onClick={() => handleToggleAfdrachtQuarter(afd.id, qKey, qVal.status, qVal.amount)}
                        className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                          qVal.status === "paid"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted/40 border-border text-muted-foreground hover:border-amber-500/30"
                        }`}
                        title="Klik om te wisselen tussen voldaan en openstaand"
                      >
                        <div className="text-[11px] font-bold">{qKey}</div>
                        <div className="text-xs font-mono font-bold mt-1">€{qVal.amount},-</div>
                        <div className="text-[10px] mt-1 font-semibold">
                          {qVal.status === "paid" ? "✓ Voldaan" : "⏳ Open"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 7: PLANNING & KASCOMMISSIE */}
      {activeSubTab === "planning" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Begroting 2026 vs Realisatie */}
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold font-display text-foreground">
                    Jaarbegroting & Realisatie 2026
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Financiële Planning & Control • Vergelijking begrote vs. werkelijke baten en lasten
                  </p>
                </div>
              </div>

              <div className="divide-y divide-border text-xs">
                <div className="py-2 grid grid-cols-12 text-muted-foreground font-semibold">
                  <span className="col-span-5">Begrotingspost</span>
                  <span className="col-span-2">Type</span>
                  <span className="col-span-2 text-right">Begroot</span>
                  <span className="col-span-3 text-right">Gerealiseerd</span>
                </div>

                {(data?.budget || []).map((b) => (
                  <div key={b.id} className="py-2.5 grid grid-cols-12 items-center">
                    <div className="col-span-5 font-medium text-foreground">
                      {b.category}
                      {b.notes && <span className="block text-[10px] text-muted-foreground">{b.notes}</span>}
                    </div>
                    <div className="col-span-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          b.type === "income"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-red-500/15 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {b.type === "income" ? "Baten" : "Lasten"}
                      </span>
                    </div>
                    <div className="col-span-2 text-right font-mono text-muted-foreground">
                      €{b.budgeted.toLocaleString("nl-NL")}
                    </div>
                    <div className="col-span-3 text-right font-mono font-bold text-foreground">
                      €{b.realized.toLocaleString("nl-NL")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kascommissie & Decharge Panel */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold font-display text-foreground">
                  Kascommissie & Decharge
                </h3>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-950 dark:text-emerald-200 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{data?.kascommissie?.dechargeStatus}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  "{data?.kascommissie?.dechargeAdvice}"
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="font-semibold text-foreground">Benoemde Kascommissieleden:</div>
                {(data?.kascommissie?.commissieLeden || []).map((lid, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                    <div>
                      <div className="font-bold text-foreground">{lid.name}</div>
                      <div className="text-[11px] text-muted-foreground">{lid.role}</div>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Tot: {lid.appointedUntil}
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-muted-foreground border-t border-border pt-3">
                Volgende formele audit: {data?.kascommissie?.nextAuditDate || "20 maart 2027"} (ALV)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 8: INSTELLINGEN & COMPLIANCE */}
      {activeSubTab === "settings" && data?.settings && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6 max-w-2xl">
            <div>
              <h3 className="text-base font-bold font-display text-foreground">
                Financiële Compliance & Vierogenregeling
              </h3>
              <p className="text-xs text-muted-foreground">
                Instellingen conform wet- en regelgeving voor lokale politieke verenigingen
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Drempelbedrag Vierogenprincipe (€)
                </label>
                <Input
                  type="number"
                  value={data.settings.fourEyesThreshold}
                  onChange={(e) =>
                    setData({
                      ...data,
                      settings: { ...data.settings, fourEyesThreshold: parseFloat(e.target.value) || 250 }
                    })
                  }
                  className="text-xs h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  Facturen en declaraties vanaf dit bedrag vereisen accordering van een tweede bestuurslid (standaard € 250,- conform advies Kennispunt).
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">ANBI RSIN Nummer</label>
                <Input
                  value={data.settings.anbiRsin || ""}
                  onChange={(e) =>
                    setData({
                      ...data,
                      settings: { ...data.settings, anbiRsin: e.target.value }
                    })
                  }
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Kamer van Koophandel (KvK) Nummer</label>
                <Input
                  value={data.settings.kvkNumber || ""}
                  onChange={(e) =>
                    setData({
                      ...data,
                      settings: { ...data.settings, kvkNumber: e.target.value }
                    })
                  }
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Huisbank van de partij</label>
                <Input
                  value={data.settings.bankName || ""}
                  onChange={(e) =>
                    setData({
                      ...data,
                      settings: { ...data.settings, bankName: e.target.value }
                    })
                  }
                  className="text-xs h-9"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl">
                  Instellingen Opslaan
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* MODAL: NIEUWE FACTUUR / DECLARATIE INDIENEN */}
      {showNewInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-display text-foreground">
                  Nieuwe Factuur of Declaratie Indienen
                </h3>
                <p className="text-xs text-muted-foreground">
                  Voer de gegevens in van de crediteur of declaratiebon
                </p>
              </div>
              <button
                onClick={() => setShowNewInvoiceModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitInvoice} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Crediteur / Leverancier / Declarerende *</label>
                <Input
                  placeholder="Bijv. Dorpshuis De Burght of Sammy van Andel"
                  value={newInvoiceCreditor}
                  onChange={(e) => setNewInvoiceCreditor(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Omschrijving van de uitgave *</label>
                <Input
                  placeholder="Bijv. Zaalhuur ALV Steenwijk of Drukwerk flyers kernen"
                  value={newInvoiceDesc}
                  onChange={(e) => setNewInvoiceDesc(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Bedrag (€) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newInvoiceAmount}
                    onChange={(e) => setNewInvoiceAmount(e.target.value)}
                    className="text-xs h-9 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Categorie</label>
                  <select
                    value={newInvoiceCategory}
                    onChange={(e) => setNewInvoiceCategory(e.target.value)}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-border bg-background"
                  >
                    <option value="Campagne & Communicatie">Campagne & Communicatie</option>
                    <option value="Zaalhuur & Bijeenkomsten">Zaalhuur & Bijeenkomsten</option>
                    <option value="ICT & Website">ICT & Website</option>
                    <option value="Fractieondersteuning">Fractieondersteuning (Art. 33)</option>
                    <option value="Algemeen & Bankkosten">Algemeen & Bankkosten</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Betaalrekening</label>
                <select
                  value={newInvoiceAccount}
                  onChange={(e) => setNewInvoiceAccount(e.target.value)}
                  className="w-full text-xs h-9 px-3 rounded-lg border border-border bg-background"
                >
                  <option value="acc_lopend">Lopende Rekening (RegioBank)</option>
                  <option value="acc_fractie">Fractierekening (Art. 33 Steenwijkerland)</option>
                  <option value="acc_kas">Contant Kasgeld</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Bestandsnaam Bewijsstuk (PDF/Factuur)</label>
                <Input
                  placeholder="Bijv. factuur_zaalhuur_2026.pdf"
                  value={newInvoiceReceipt}
                  onChange={(e) => setNewInvoiceReceipt(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Toelichting / Notities</label>
                <Textarea
                  placeholder="Eventuele opmerkingen voor de tweede controleur"
                  value={newInvoiceNotes}
                  onChange={(e) => setNewInvoiceNotes(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  onClick={() => setShowNewInvoiceModal(false)}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  Annuleren
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingInvoice}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  {isSubmittingInvoice ? "Indienen..." : "Factuur Indienen"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GIFT HANDMATIG REGISTREREN */}
      {showDonationModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-display text-foreground">
                  Gift Registreren in Giftenregister
                </h3>
                <p className="text-xs text-muted-foreground">
                  Conform Wet financiering politieke partijen (Wpp)
                </p>
              </div>
              <button
                onClick={() => setShowDonationModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDonation} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Naam Gever / Donateur</label>
                <Input
                  placeholder="Laat leeg voor anonieme gift"
                  value={donationDonor}
                  onChange={(e) => setDonationDonor(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Bedrag (€) *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Bijv. 50.00"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="text-xs h-9 font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">E-mailadres donateur (optioneel)</label>
                <Input
                  type="email"
                  placeholder="donateur@voorbeeld.nl"
                  value={donationEmail}
                  onChange={(e) => setDonationEmail(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Opmerking / Bericht</label>
                <Input
                  placeholder="Bijv. Campagnesteun flyeractie Steenwijk"
                  value={donationMsg}
                  onChange={(e) => setDonationMsg(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  onClick={() => setShowDonationModal(false)}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  Annuleren
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                  Gift Opslaan in Register
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
