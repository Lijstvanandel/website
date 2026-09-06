import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchWithAuth, getAuthHeaders as apiGetAuthHeaders } from "@/lib/api";
import { getVideoThumbnail } from "@/lib/videoUtils";
import {
  Mail,
  Send,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Eye,
  FileText,
  Video,
  Newspaper,
  Calendar,
  Sparkles,
  Users,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Monitor,
  Search,
  UserX,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export interface NewsletterItem {
  id: string;
  type: "news" | "video" | "event" | "custom";
  sourceId?: string;
  title: string;
  subtitle?: string;
  text: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  buttonColor?: string;
  dateLabel?: string;
}

export interface NewsletterData {
  id?: string;
  subject: string;
  preheader?: string;
  bannerUrl?: string;
  introTitle?: string;
  introText: string;
  ctaButtonText?: string;
  ctaButtonUrl?: string;
  ctaButtonColor?: string;
  items: NewsletterItem[];
  footerNote?: string;
}

const DEFAULT_BANNER = "/assets/hero-banner.jpg";

interface NewsletterManagerProps {
  token?: string | null;
}

export default function NewsletterManager({ token: propToken }: NewsletterManagerProps) {
  const { token: authContextToken } = useAuth();
  const token = propToken || authContextToken || (typeof window !== "undefined" ? localStorage.getItem("auth_token") : "") || "";

  const getAuthHeaders = useCallback(() => {
    return apiGetAuthHeaders({ "Content-Type": "application/json" });
  }, []);

  const [activeTab, setActiveTab] = useState<"compose" | "preview" | "history" | "subscribers">("compose");

  // Newsletter Draft State
  const [newsletter, setNewsletter] = useState<NewsletterData>({
    subject: "Fractie-update Lijst van Andel: Belangrijke besluiten Steenwijkerland",
    preheader: "Lees het laatste nieuws, onze nieuwste video's en komende fractiebijeenkomsten.",
    bannerUrl: DEFAULT_BANNER,
    introTitle: "Beste inwoner van Steenwijkerland,",
    introText: "Hierbij ontvangt u onze nieuwste nieuwsbrief. Als Lijst van Andel blijven we ons onvermoeibaar inzetten voor nuchter lokaal bestuur, betaalbare starterswoningen, en het behoud van onze prachtige dorpskernen en natuur. Hieronder vindt u een overzicht van onze recente activiteiten en standpunten.",
    ctaButtonText: "Steun onze fractie met een donatie",
    ctaButtonUrl: "/doneren",
    ctaButtonColor: "#c6a858",
    items: [],
  });

  // Data sources from the website
  const [newsList, setNewsList] = useState<any[]>([]);
  const [videosList, setVideosList] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [subscribersData, setSubscribersData] = useState<{
    totalActive: number;
    activeRecipients: any[];
    externalSubscribers: any[];
    memberSubscribers: any[];
  }>({ totalActive: 0, activeRecipients: [], externalSubscribers: [], memberSubscribers: [] });

  // Dialogs & UI states
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [isTestEmailOpen, setIsTestEmailOpen] = useState(false);
  const [isAddSubscriberOpen, setIsAddSubscriberOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingLive, setSendingLive] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // SMTP diagnostics
  const [smtpStatus, setSmtpStatus] = useState<{ configured?: boolean; verified?: boolean; host?: string; port?: string; message?: string } | null>(null);
  const [checkingSmtp, setCheckingSmtp] = useState(false);

  const checkSmtp = async () => {
    setCheckingSmtp(true);
    try {
      const res = await fetchWithAuth("/api/admin/system/smtp-status", { headers: getAuthHeaders() });
      const data = await res.json();
      setSmtpStatus(data);
    } catch (e: any) {
      setSmtpStatus({ configured: false, message: e.message || "Kon SMTP-status niet ophalen" });
    } finally {
      setCheckingSmtp(false);
    }
  };

  useEffect(() => {
    if (isTestEmailOpen && !smtpStatus) {
      checkSmtp();
    }
  }, [isTestEmailOpen]);

  // New Subscriber manual form
  const [newSubEmail, setNewSubEmail] = useState("");
  const [newSubName, setNewSubName] = useState("");

  // Search in item picker
  const [itemSearch, setItemSearch] = useState("");
  const [subscribersSearch, setSubscribersSearch] = useState("");

  // Load all initial content
  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [newsRes, videosRes, eventsRes, historyRes, subsRes] = await Promise.all([
        fetch("/api/news").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/videos").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/events").then((r) => (r.ok ? r.json() : [])),
        fetchWithAuth("/api/admin/newsletter/history", { headers }).then((r) => (r.ok ? r.json() : [])),
        fetchWithAuth("/api/admin/newsletter/subscribers", { headers }).then((r) =>
          r.ok ? r.json() : { totalActive: 0, activeRecipients: [], externalSubscribers: [], memberSubscribers: [] }
        ),
      ]);

      setNewsList(newsRes);
      setVideosList(videosRes);
      setEventsList(eventsRes);
      setHistoryList(historyRes);
      setSubscribersData(subsRes);
    } catch (err: any) {
      console.error("Fout bij laden nieuwsbrief content:", err);
      toast.error("Kon niet alle gegevens ophalen.");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Update HTML preview whenever newsletter changes or tab opens
  const fetchPreview = useCallback(async (currentData = newsletter) => {
    try {
      const res = await fetchWithAuth("/api/admin/newsletter/preview", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ newsletter: currentData }),
      });
      const data = await res.json();
      if (res.ok && data.html) {
        setPreviewHtml(data.html);
      }
    } catch (err) {
      console.error("Preview fetch error:", err);
    }
  }, [newsletter, getAuthHeaders]);

  useEffect(() => {
    if (activeTab === "preview") {
      fetchPreview();
    }
  }, [activeTab, fetchPreview]);

  // Content Selection Handlers
  const handleAddNewsItem = (news: any) => {
    const thumb = news.thumbnailUrl || news.headerUrl || news.image || news.imageUrl || "/assets/news-kopwijzer.jpg";
    const newItem: NewsletterItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: "news",
      sourceId: news.id,
      title: news.title || "Nieuwsbericht",
      subtitle: news.date ? `Nieuws • ${new Date(news.date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}` : "Nieuwsbericht",
      text: news.excerpt || (news.description ? news.description.replace(/<[^>]*>/g, "").slice(0, 240) + "..." : ""),
      imageUrl: thumb,
      buttonText: "Lees het hele artikel",
      buttonUrl: `/nieuws/${news.slug || news.id}`,
      buttonColor: "#c6a858",
    };
    setNewsletter((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setIsAddItemOpen(false);
    toast.success(`Nieuwsbericht "${news.title}" toegevoegd!`);
  };

  const handleAddVideoItem = (video: any) => {
    const thumb =
      getVideoThumbnail(video.videoUrl || video.url, video.thumbnailUrl || video.thumbnail) ||
      video.thumbnailUrl ||
      video.thumbnail ||
      "/assets/hero-banner.jpg";

    const newItem: NewsletterItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: "video",
      sourceId: video.id,
      title: video.title || "Video",
      subtitle: "Video • Bekijk opname",
      text: video.description ? video.description.slice(0, 220) + "..." : "Bekijk onze nieuwste video van de fractie.",
      imageUrl: thumb,
      buttonText: "Bekijk video",
      buttonUrl: video.youtubeUrl || `/video/${video.id}`,
      buttonColor: "#1c3826",
    };
    setNewsletter((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setIsAddItemOpen(false);
    toast.success(`Video "${video.title}" toegevoegd!`);
  };

  const handleAddEventItem = (event: any) => {
    const formattedDate = event.date
      ? new Date(event.date).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })
      : "";
    const dateLabel = `Agenda • ${formattedDate} ${event.time || event.startTime ? `om ${event.time || event.startTime}` : ""} ${event.location || event.address || event.city ? `(${[event.location, event.address, event.city].filter(Boolean).join(", ")})` : ""}`.trim();
    const thumb = event.thumbnailUrl || event.image || event.imageUrl || "/assets/markt-steenwijk.jpg";

    const newItem: NewsletterItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: "event",
      sourceId: event.id,
      title: event.title || "Bijeenkomst",
      subtitle: dateLabel,
      dateLabel,
      text: event.shortDescription || (event.description ? event.description.replace(/<[^>]*>/g, "").slice(0, 220) + "..." : "Kom naar onze bijeenkomst van Lijst van Andel."),
      imageUrl: thumb,
      buttonText: "Bekijk evenement & Aanmelden",
      buttonUrl: `/agenda/${event.id}`,
      buttonColor: "#c6a858",
    };
    setNewsletter((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setIsAddItemOpen(false);
    toast.success(`Evenement "${event.title}" toegevoegd!`);
  };

  const handleAddCustomItem = () => {
    const newItem: NewsletterItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: "custom",
      title: "Nieuw fractie-onderwerp",
      subtitle: "Mededeling",
      text: "Voer hier de tekst in voor dit specifieke item. U kunt moties, raadsverslagen of oproepen toevoegen.",
      imageUrl: "/assets/hero-banner.jpg",
      buttonText: "Lees meer",
      buttonUrl: "/",
      buttonColor: "#c6a858",
    };
    setNewsletter((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setIsAddItemOpen(false);
    toast.success("Aangepast item toegevoegd!");
  };

  // Re-ordering & Removing Items
  const moveItem = (index: number, direction: "up" | "down") => {
    const items = [...newsletter.items];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;
    setNewsletter((prev) => ({ ...prev, items }));
  };

  const removeItem = (id: string) => {
    setNewsletter((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
    toast.info("Item verwijderd uit nieuwsbrief.");
  };

  const updateItem = (id: string, updates: Partial<NewsletterItem>) => {
    setNewsletter((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!newsletter.subject) {
      toast.error("Geef een onderwerp op voor het concept.");
      return;
    }
    setSavingDraft(true);
    try {
      const res = await fetchWithAuth("/api/admin/newsletter/save", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(newsletter),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij opslaan");
      setNewsletter((prev) => ({ ...prev, id: data.newsletter.id }));
      toast.success("Nieuwsbrief concept succesvol opgeslagen!");
      loadContent();
    } catch (err: any) {
      toast.error(err.message || "Kon concept niet opslaan.");
    } finally {
      setSavingDraft(false);
    }
  };

  // Load Past or Draft Newsletter
  const handleLoadNewsletter = (item: any) => {
    setNewsletter({
      id: item.id,
      subject: item.subject,
      preheader: item.preheader || "",
      bannerUrl: item.bannerUrl || DEFAULT_BANNER,
      introTitle: item.introTitle || "",
      introText: item.introText || "",
      ctaButtonText: item.ctaButtonText || "",
      ctaButtonUrl: item.ctaButtonUrl || "",
      ctaButtonColor: item.ctaButtonColor || "#c6a858",
      items: Array.isArray(item.items) ? item.items : [],
    });
    setActiveTab("compose");
    toast.success(`Nieuwsbrief "${item.subject}" geladen in bewerker.`);
  };

  // Delete Newsletter from archive
  const handleDeleteNewsletter = async (id: string) => {
    if (!confirm("Weet u zeker dat u deze mailing uit het overzicht wilt verwijderen?")) return;
    try {
      const res = await fetchWithAuth(`/api/admin/newsletter/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      toast.success("Mailing verwijderd.");
      loadContent();
    } catch (err) {
      toast.error("Kon niet verwijderen.");
    }
  };

  // Send Test Email
  const handleSendTest = async () => {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      toast.error("Vul een geldig test e-mailadres in.");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetchWithAuth("/api/admin/newsletter/send", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          newsletter,
          isTest: true,
          testEmail: testEmailAddress.trim(),
          testRecipient: testEmailAddress.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Uw beheerderssessie is verlopen of vernieuwd. Log alstublieft even opnieuw in via het menu.");
        }
        throw new Error(data.error || "Testmail verzenden mislukt");
      }
      toast.success(data.message || `Testmail verzonden naar ${testEmailAddress}!`);
      setIsTestEmailOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Fout bij testmail verzenden.");
    } finally {
      setSendingTest(false);
    }
  };

  // Send Live Email to all Subscribers
  const handleSendLive = async () => {
    setSendingLive(true);
    try {
      const res = await fetchWithAuth("/api/admin/newsletter/send", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          newsletter,
          isTest: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Uw beheerderssessie is verlopen of vernieuwd. Log alstublieft even opnieuw in via het menu.");
        }
        throw new Error(data.error || "Verzenden mislukt");
      }
      toast.success(data.message || "Nieuwsbrief succesvol verzonden!");
      setIsSendConfirmOpen(false);
      loadContent();
      setActiveTab("history");
    } catch (err: any) {
      toast.error(err.message || "Fout bij verzenden van nieuwsbrief.");
    } finally {
      setSendingLive(false);
    }
  };

  // Manual Add Subscriber
  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubEmail || !newSubEmail.includes("@")) {
      toast.error("Vul een geldig e-mailadres in.");
      return;
    }
    try {
      const res = await fetchWithAuth("/api/admin/newsletter/subscribers", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: newSubEmail, name: newSubName }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Uw beheerderssessie is verlopen of vernieuwd. Log alstublieft even opnieuw in via het menu.");
        }
        throw new Error(data.error || "Kon abonnee niet toevoegen");
      }
      toast.success(data.message || "Abonnee toegevoegd!");
      setNewSubEmail("");
      setNewSubName("");
      setIsAddSubscriberOpen(false);
      loadContent();
    } catch (err: any) {
      toast.error(err.message || "Fout bij toevoegen.");
    }
  };

  // Unsubscribe a subscriber manually
  const handleRemoveSubscriber = async (email: string) => {
    if (!confirm(`Weet u zeker dat u ${email} wilt afmelden voor de nieuwsbrief?`)) return;
    try {
      const res = await fetchWithAuth("/api/admin/newsletter/subscribers", {
        method: "DELETE",
        headers: getAuthHeaders(),
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Uw beheerderssessie is verlopen of vernieuwd. Log alstublieft even opnieuw in via het menu.");
        }
        throw new Error(data.error || "Afmelden mislukt");
      }
      toast.success(data.message || "Abonnee afgemeld.");
      loadContent();
    } catch (err: any) {
      toast.error(err.message || "Fout bij afmelden.");
    }
  };

  // Filtered lists for content selection
  const filteredNews = useMemo(() => {
    if (!itemSearch) return newsList;
    return newsList.filter((n) => n.title?.toLowerCase().includes(itemSearch.toLowerCase()));
  }, [newsList, itemSearch]);

  const filteredVideos = useMemo(() => {
    if (!itemSearch) return videosList;
    return videosList.filter((v) => v.title?.toLowerCase().includes(itemSearch.toLowerCase()));
  }, [videosList, itemSearch]);

  const filteredEvents = useMemo(() => {
    if (!itemSearch) return eventsList;
    return eventsList.filter((e) => e.title?.toLowerCase().includes(itemSearch.toLowerCase()));
  }, [eventsList, itemSearch]);

  // Filtered subscribers list
  const filteredSubscribers = useMemo(() => {
    if (!subscribersSearch) return subscribersData.activeRecipients || [];
    return (subscribersData.activeRecipients || []).filter(
      (s) =>
        s.email?.toLowerCase().includes(subscribersSearch.toLowerCase()) ||
        s.name?.toLowerCase().includes(subscribersSearch.toLowerCase())
    );
  }, [subscribersData.activeRecipients, subscribersSearch]);

  return (
    <div className="space-y-6">
      {/* Header bar with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-md bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Nieuwsbrief & Mailing Module</h2>
            <p className="text-xs text-muted-foreground">
              Stel e-mailcampagnes samen met video's, nieuws en evenementen in de stijl van landelijke partijmailings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="px-3 py-1.5 border-accent/40 bg-accent/10 text-accent font-semibold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{subscribersData.totalActive} Actieve Abonnees</span>
          </Badge>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab("subscribers")}
            className="text-xs border-border"
          >
            Abonnees Beheren
          </Button>

          <a href="/api/admin/users/export-newsletter?format=csv" download>
            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
              <Download className="w-3.5 h-3.5 mr-1" /> CSV Export
            </Button>
          </a>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-6">
        <TabsList className="grid grid-cols-4 max-w-xl bg-muted/60 p-1 border border-border/80">
          <TabsTrigger value="compose" className="text-xs flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>Samenstellen</span>
          </TabsTrigger>
          <TabsTrigger value="preview" onClick={() => fetchPreview()} className="text-xs flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>Live Voorbeeld</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Verzonden ({historyList.length})</span>
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="text-xs flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Abonnees ({subscribersData.totalActive})</span>
          </TabsTrigger>
        </TabsList>

        {/* ----------------- TAB 1: COMPOSE / SAMENSTELLEN ----------------- */}
        <TabsContent value="compose" className="space-y-6">
          {/* Action buttons header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-3.5 rounded border border-border">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Nieuwsbriefopbouw: <strong>{newsletter.items.length} contentblokken</strong> toegevoegd</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="text-xs border-border"
              >
                {savingDraft ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null}
                Concept Opslaan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchPreview();
                  setActiveTab("preview");
                }}
                className="text-xs border-accent/40 text-accent hover:bg-accent/10"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                Voorbeeld Bekijken
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTestEmailOpen(true)}
                className="text-xs"
              >
                <Mail className="w-3.5 h-3.5 mr-1" />
                Testmail Sturen
              </Button>
              <Button
                size="sm"
                onClick={() => setIsSendConfirmOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold uppercase tracking-wider"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Versturen Naar Iedereen
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Email Configuration */}
            <div className="lg:col-span-1 space-y-5">
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">1. Basisinstellingen</CardTitle>
                  <CardDescription className="text-xs">Onderwerp en weergave in de inbox van ontvangers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">Onderwerpregel *</label>
                    <Input
                      value={newsletter.subject}
                      onChange={(e) => setNewsletter({ ...newsletter, subject: e.target.value })}
                      placeholder="bijv. Fractie-update Lijst van Andel: Maandoverzicht"
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Preheader (snippet in inbox preview)</label>
                    <Input
                      value={newsletter.preheader || ""}
                      onChange={(e) => setNewsletter({ ...newsletter, preheader: e.target.value })}
                      placeholder="Korte samenvatting die getoond wordt naast het onderwerp..."
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Kopafbeelding (Banner URL)</label>
                    <Input
                      value={newsletter.bannerUrl || ""}
                      onChange={(e) => setNewsletter({ ...newsletter, bannerUrl: e.target.value })}
                      placeholder="/assets/hero-banner.jpg of https://..."
                      className="text-xs"
                    />
                    <div className="mt-1 flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewsletter({ ...newsletter, bannerUrl: DEFAULT_BANNER })}
                        className="text-[10px] h-6 px-1.5 text-muted-foreground"
                      >
                        Standaard partijbanner
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">2. Inleiding & Hoofdactie</CardTitle>
                  <CardDescription className="text-xs">Welkomstwoord en prominente call-to-action knop</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">Aanhef / Titeltje</label>
                    <Input
                      value={newsletter.introTitle || ""}
                      onChange={(e) => setNewsletter({ ...newsletter, introTitle: e.target.value })}
                      placeholder="Beste inwoner van Steenwijkerland,"
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Inleidende Tekst *</label>
                    <Textarea
                      rows={5}
                      value={newsletter.introText}
                      onChange={(e) => setNewsletter({ ...newsletter, introText: e.target.value })}
                      placeholder="Schrijf hier het inleidende voorwoord van de fractie..."
                      className="text-xs leading-relaxed"
                    />
                  </div>

                  <div className="border-t border-border pt-3 space-y-3">
                    <label className="font-semibold block text-[11px] uppercase tracking-wider text-muted-foreground">
                      Prominente Actieknop (optioneel)
                    </label>
                    <div>
                      <span className="block text-[11px] text-muted-foreground mb-1">Knoptekst</span>
                      <Input
                        value={newsletter.ctaButtonText || ""}
                        onChange={(e) => setNewsletter({ ...newsletter, ctaButtonText: e.target.value })}
                        placeholder="bijv. Steun onze fractie / Word lid"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-[11px] text-muted-foreground mb-1">Link URL</span>
                      <Input
                        value={newsletter.ctaButtonUrl || ""}
                        onChange={(e) => setNewsletter({ ...newsletter, ctaButtonUrl: e.target.value })}
                        placeholder="/doneren of /contact"
                        className="text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Dynamic Content Blocks */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">3. Inhoud & Media Blokken</h3>
                  <p className="text-xs text-muted-foreground">
                    Selecteer video's, nieuwsberichten of evenementen direct van de website.
                  </p>
                </div>

                <Button
                  onClick={() => {
                    setItemSearch("");
                    setIsAddItemOpen(true);
                  }}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Item Toevoegen
                </Button>
              </div>

              {newsletter.items.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-lg p-10 text-center space-y-3 bg-muted/10">
                  <div className="w-12 h-12 rounded-full bg-accent/15 mx-auto flex items-center justify-center text-accent">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-sm">Nog geen contentblokken geselecteerd</h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Klik op <strong>Item Toevoegen</strong> om recent gepubliceerde nieuwsberichten, YouTube-video's of
                    fractiebijeenkomsten direct in de nieuwsbrief te plaatsen.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddItemOpen(true)}
                    className="border-accent/40 text-accent text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Voeg eerste item toe
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {newsletter.items.map((item, index) => (
                    <Card key={item.id} className="border-border relative group shadow-sm overflow-hidden">
                      <div className="p-4 flex flex-col md:flex-row gap-4 items-start">
                        {/* Thumbnail */}
                        {item.imageUrl ? (
                          <div className="w-full md:w-36 h-24 shrink-0 rounded overflow-hidden bg-muted border border-border">
                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : null}

                        {/* Content inputs */}
                        <div className="flex-1 space-y-2 w-full">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                            >
                              {item.type === "news" ? (
                                <span className="flex items-center gap-1"><Newspaper className="w-3 h-3 text-blue-500" /> Nieuws</span>
                              ) : item.type === "video" ? (
                                <span className="flex items-center gap-1"><Video className="w-3 h-3 text-red-500" /> Video</span>
                              ) : item.type === "event" ? (
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-amber-500" /> Agenda</span>
                              ) : (
                                "Aangepast"
                              )}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">Blok #{index + 1}</span>
                          </div>

                          <Input
                            value={item.title}
                            onChange={(e) => updateItem(item.id, { title: e.target.value })}
                            className="font-bold text-sm bg-transparent border-border/70"
                            placeholder="Titel van dit blok..."
                          />

                          <Textarea
                            rows={3}
                            value={item.text}
                            onChange={(e) => updateItem(item.id, { text: e.target.value })}
                            className="text-xs text-muted-foreground bg-transparent border-border/70"
                            placeholder="Beschrijving of samenvatting..."
                          />

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                            <Input
                              value={item.imageUrl || ""}
                              onChange={(e) => updateItem(item.id, { imageUrl: e.target.value })}
                              placeholder="Thumbnail URL (bijv. /assets/...)"
                              className="text-xs h-8"
                              title="Thumbnail / Afbeelding URL"
                            />
                            <Input
                              value={item.buttonText || ""}
                              onChange={(e) => updateItem(item.id, { buttonText: e.target.value })}
                              placeholder="Knoptekst (bijv. Lees meer)"
                              className="text-xs h-8"
                            />
                            <Input
                              value={item.buttonUrl || ""}
                              onChange={(e) => updateItem(item.id, { buttonUrl: e.target.value })}
                              placeholder="Knop URL (bijv. /agenda/123)"
                              className="text-xs h-8"
                            />
                          </div>
                        </div>

                        {/* Action controls */}
                        <div className="flex md:flex-col items-center gap-1 shrink-0 self-end md:self-start">
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={index === 0}
                            onClick={() => moveItem(index, "up")}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Omhoog verplaatsen"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={index === newsletter.items.length - 1}
                            onClick={() => moveItem(index, "down")}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Omlaag verplaatsen"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeItem(item.id)}
                            className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ----------------- TAB 2: PREVIEW / LIVE VOORBEELD ----------------- */}
        <TabsContent value="preview" className="space-y-4">
          <div className="flex items-center justify-between bg-muted/40 p-3 rounded border border-border">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={previewMode === "desktop" ? "default" : "outline"}
                onClick={() => setPreviewMode("desktop")}
                className="text-xs h-8"
              >
                <Monitor className="w-3.5 h-3.5 mr-1" /> Desktop (560px)
              </Button>
              <Button
                size="sm"
                variant={previewMode === "mobile" ? "default" : "outline"}
                onClick={() => setPreviewMode("mobile")}
                className="text-xs h-8"
              >
                <Smartphone className="w-3.5 h-3.5 mr-1" /> Mobiel (380px)
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchPreview()}
                className="text-xs h-8"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Verversen
              </Button>
              <Button
                size="sm"
                onClick={() => setIsSendConfirmOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-8"
              >
                <Send className="w-3.5 h-3.5 mr-1" /> Versturen Naar Iedereen
              </Button>
            </div>
          </div>

          <div className="flex justify-center bg-zinc-950/20 py-8 px-2 rounded-lg border border-border overflow-auto min-h-[600px]">
            <div
              style={{
                width: previewMode === "desktop" ? "600px" : "390px",
                transition: "width 0.2s ease-in-out",
              }}
              className="bg-white rounded shadow-2xl overflow-hidden border border-border"
            >
              {previewHtml ? (
                <iframe
                  title="Nieuwsbrief Preview"
                  srcDoc={previewHtml}
                  className="w-full h-[750px] border-0"
                  sandbox="allow-same-origin allow-popups"
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-xs text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Voorbeeld genereren...
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ----------------- TAB 3: HISTORY / VERZONDEN MAILINGS ----------------- */}
        <TabsContent value="history" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Verzonden Nieuwsbrieven & Concepten</CardTitle>
              <CardDescription className="text-xs">
                Overzicht van alle e-mailcampagnes die zijn aangemaakt en verstuurd.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyList.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">
                  Er zijn nog geen eerdere mailings opgeslagen of verzonden.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {historyList.map((item) => (
                    <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{item.subject}</span>
                          {item.status === "sent" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                              Verzonden ({item.recipientCount || 0} abonnees)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                              Concept
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.sentAt
                            ? `Verstuurd op ${new Date(item.sentAt).toLocaleString("nl-NL")}`
                            : `Aangemaakt op ${new Date(item.createdAt).toLocaleDateString("nl-NL")}`}
                          {" • "}
                          {item.items?.length || 0} contentblokken
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLoadNewsletter(item)}
                          className="text-xs h-8 border-border"
                        >
                          Laden in bewerker
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteNewsletter(item.id)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------- TAB 4: SUBSCRIBERS / ABONNEES ----------------- */}
        <TabsContent value="subscribers" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded border border-border">
            <div className="flex items-center gap-3">
              <div className="relative w-72">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                <Input
                  value={subscribersSearch}
                  onChange={(e) => setSubscribersSearch(e.target.value)}
                  placeholder="Zoek op e-mail of naam..."
                  className="pl-8 text-xs h-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsAddSubscriberOpen(true)}
                className="text-xs bg-primary text-primary-foreground font-semibold"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" /> Abonnee Handmatig Toevoegen
              </Button>
              <a href="/api/admin/users/export-newsletter?format=csv" download>
                <Button size="sm" variant="outline" className="text-xs">
                  <Download className="w-3.5 h-3.5 mr-1" /> CSV
                </Button>
              </a>
              <a href="/api/admin/users/export-newsletter?format=txt" download>
                <Button size="sm" variant="outline" className="text-xs">
                  <Download className="w-3.5 h-3.5 mr-1" /> TXT
                </Button>
              </a>
            </div>
          </div>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Actieve Abonneelijst ({filteredSubscribers.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Deze lijst bevat zowel geregistreerde leden die de nieuwsbrief ontvangen als externe inschrijvingen via de website.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSubscribers.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Geen abonnees gevonden die overeenkomen met de zoekopdracht.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredSubscribers.map((sub, idx) => (
                    <div key={sub.email + idx} className="py-3 flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">{sub.email}</span>
                          <Badge
                            variant={sub.type === "member" ? "default" : "secondary"}
                            className="text-[10px] py-0 px-1.5 font-normal"
                          >
                            {sub.type === "member" ? "Lid" : "Externe inschrijver"}
                          </Badge>
                        </div>
                        {sub.name ? <p className="text-[11px] text-muted-foreground">{sub.name}</p> : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveSubscriber(sub.email)}
                          className="h-7 text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                        >
                          <UserX className="w-3 h-3 mr-1" /> Afmelden
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ----------------- DIALOG: CONTENT ITEM PICKER ----------------- */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Kies Content voor Nieuwsbrief</DialogTitle>
            <DialogDescription className="text-xs">
              Selecteer een video, nieuwsartikel of evenement uit de website om direct in de nieuwsbrief te plaatsen.
            </DialogDescription>
          </DialogHeader>

          <div className="relative my-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            <Input
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Zoek op trefwoord..."
              className="pl-8 text-xs h-9"
            />
          </div>

          <Tabs defaultValue="news" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-4 bg-muted/60 p-1">
              <TabsTrigger value="news" className="text-xs">
                Nieuws ({filteredNews.length})
              </TabsTrigger>
              <TabsTrigger value="videos" className="text-xs">
                Video's ({filteredVideos.length})
              </TabsTrigger>
              <TabsTrigger value="events" className="text-xs">
                Evenementen ({filteredEvents.length})
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-xs">
                Aangepast Blok
              </TabsTrigger>
            </TabsList>

            {/* News items list */}
            <TabsContent value="news" className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2 max-h-[400px]">
              {filteredNews.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">Geen nieuwsberichten gevonden.</div>
              ) : (
                filteredNews.map((news) => {
                  const thumb = news.thumbnailUrl || news.headerUrl || news.image || news.imageUrl || "/assets/news-kopwijzer.jpg";
                  return (
                    <div
                      key={news.id}
                      onClick={() => handleAddNewsItem(news)}
                      className="p-3 rounded border border-border hover:border-accent/60 hover:bg-accent/5 cursor-pointer transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <img src={thumb} alt="" className="w-14 h-11 object-cover rounded bg-muted shrink-0 border border-border" />
                        <div>
                          <div className="font-semibold text-xs text-foreground line-clamp-1">{news.title}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {news.excerpt || news.description?.replace(/<[^>]*>/g, "")}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="text-[11px] h-7 shrink-0">
                        Toevoegen
                      </Button>
                    </div>
                  );
                })
              )}
            </TabsContent>

            {/* Videos list */}
            <TabsContent value="videos" className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2 max-h-[400px]">
              {filteredVideos.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">Geen video's gevonden.</div>
              ) : (
                filteredVideos.map((video) => {
                  const thumb =
                    getVideoThumbnail(video.videoUrl || video.url, video.thumbnailUrl || video.thumbnail) ||
                    video.thumbnailUrl ||
                    video.thumbnail ||
                    "/assets/hero-banner.jpg";
                  return (
                    <div
                      key={video.id}
                      onClick={() => handleAddVideoItem(video)}
                      className="p-3 rounded border border-border hover:border-accent/60 hover:bg-accent/5 cursor-pointer transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <img src={thumb} alt="" className="w-14 h-11 object-cover rounded bg-muted shrink-0 border border-border" />
                        <div>
                          <div className="font-semibold text-xs text-foreground line-clamp-1">{video.title}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {video.description || "Video van Lijst van Andel"}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="text-[11px] h-7 shrink-0">
                        Toevoegen
                      </Button>
                    </div>
                  );
                })
              )}
            </TabsContent>

            {/* Events list */}
            <TabsContent value="events" className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2 max-h-[400px]">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">Geen evenementen gevonden.</div>
              ) : (
                filteredEvents.map((ev) => {
                  const thumb = ev.thumbnailUrl || ev.image || ev.imageUrl || "/assets/markt-steenwijk.jpg";
                  return (
                    <div
                      key={ev.id}
                      onClick={() => handleAddEventItem(ev)}
                      className="p-3 rounded border border-border hover:border-accent/60 hover:bg-accent/5 cursor-pointer transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <img src={thumb} alt="" className="w-14 h-11 object-cover rounded bg-muted shrink-0 border border-border" />
                        <div>
                          <div className="font-semibold text-xs text-foreground line-clamp-1">{ev.title}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {ev.date ? new Date(ev.date).toLocaleDateString("nl-NL") : ""} • {ev.location || "Steenwijk"}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="text-[11px] h-7 shrink-0">
                        Toevoegen
                      </Button>
                    </div>
                  );
                })
              )}
            </TabsContent>

            {/* Custom block */}
            <TabsContent value="custom" className="mt-4 p-4 text-center space-y-3">
              <p className="text-xs text-muted-foreground">
                Wilt u een vrij bericht toevoegen, zoals een oproep, speciaal raadsdebat of column?
              </p>
              <Button onClick={handleAddCustomItem} className="bg-primary text-primary-foreground text-xs">
                Aangepast Tekst- & Mediablok Toevoegen
              </Button>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="ghost" size="sm" onClick={() => setIsAddItemOpen(false)} className="text-xs">
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------- DIALOG: SEND TEST EMAIL ----------------- */}
      <Dialog open={isTestEmailOpen} onOpenChange={setIsTestEmailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base">Test e-mail versturen</DialogTitle>
            <DialogDescription className="text-xs">
              Verstuur een proefversie van deze nieuwsbrief naar uzelf om de weergave in uw eigen mailclient te controleren.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs">
            {/* SMTP Status banner */}
            {checkingSmtp ? (
              <div className="p-2.5 rounded bg-muted/40 border border-muted text-muted-foreground flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
                <span>SMTP-verbindingsstatus controleren...</span>
              </div>
            ) : smtpStatus ? (
              <div className={`p-2.5 rounded border text-[11px] ${
                smtpStatus.verified 
                  ? "bg-accent/10 border-accent/30 text-accent" 
                  : smtpStatus.configured
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold">
                    {smtpStatus.verified ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-accent" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    )}
                    <span>
                      {smtpStatus.verified
                        ? `SMTP Server Actief (${smtpStatus.host}:${smtpStatus.port})`
                        : smtpStatus.configured
                        ? "SMTP Geconfigureerd maar verbinding mislukt"
                        : "SMTP Niet Geconfigureerd in .env"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={checkSmtp}
                    disabled={checkingSmtp}
                    className="text-[10px] underline hover:opacity-80"
                  >
                    Opnieuw testen
                  </button>
                </div>
                <p className="mt-1 text-muted-foreground leading-tight">
                  {smtpStatus.message}
                </p>
              </div>
            ) : null}

            <div>
              <label className="font-semibold block mb-1">E-mailadres voor testontvangst</label>
              <Input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="bijv. uw.eigen.mail@domein.nl"
                className="text-xs"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Het onderwerp van de testmail krijgt automatisch de tag <code>[TEST]</code>.
            </p>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsTestEmailOpen(false)} className="text-xs">
              Annuleren
            </Button>
            <Button
              size="sm"
              onClick={handleSendTest}
              disabled={sendingTest}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
            >
              {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
              Testmail Verzenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------- DIALOG: CONFIRM LIVE SEND TO ALL ----------------- */}
      <Dialog open={isSendConfirmOpen} onOpenChange={setIsSendConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent mx-auto mb-2">
              <Send className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center font-display text-lg">
              Nieuwsbrief Definitief Verzenden?
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              U staat op het punt om deze mailing uit te sturen naar alle actieve abonnees.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/40 p-4 rounded-lg border border-border space-y-2 text-xs my-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Onderwerp:</span>
              <strong className="text-foreground max-w-[240px] truncate text-right">{newsletter.subject}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Aantal ontvangers:</span>
              <strong className="text-accent font-bold">{subscribersData.totalActive} abonnees</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contentblokken:</span>
              <span>{newsletter.items.length} items</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Afmeldmechanisme:</span>
              <span className="text-emerald-500 font-medium">Actief (1-klik afmelden onderaan)</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setIsSendConfirmOpen(false)} className="text-xs">
              Annuleren
            </Button>
            <Button
              size="sm"
              onClick={handleSendLive}
              disabled={sendingLive}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold uppercase tracking-wider"
            >
              {sendingLive ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Bezig met verzenden...
                </span>
              ) : (
                `Verstuur naar ${subscribersData.totalActive} abonnees`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------- DIALOG: ADD SUBSCRIBER MANUALLY ----------------- */}
      <Dialog open={isAddSubscriberOpen} onOpenChange={setIsAddSubscriberOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base">Abonnee Handmatig Toevoegen</DialogTitle>
            <DialogDescription className="text-xs">
              Voeg een inwoner of belangstellende toe aan de nieuwsbrief-verzendlijst.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubscriber} className="space-y-3 text-xs my-2">
            <div>
              <label className="font-semibold block mb-1">E-mailadres *</label>
              <Input
                type="email"
                required
                value={newSubEmail}
                onChange={(e) => setNewSubEmail(e.target.value)}
                placeholder="inwoner@domein.nl"
                className="text-xs"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Volledige Naam (optioneel)</label>
              <Input
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                placeholder="bijv. Jan Jansen"
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddSubscriberOpen(false)} className="text-xs">
                Annuleren
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground text-xs font-semibold">
                Toevoegen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
