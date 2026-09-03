import { useState, useEffect, useCallback } from "react";
import { 
  Phone, 
  Calendar, 
  Clock, 
  Mail, 
  CheckCircle2, 
  PhoneOff, 
  XCircle, 
  ExternalLink, 
  AlertCircle, 
  Copy, 
  Check, 
  Search, 
  FileText,
  User,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface BelafspraakItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  fractielidId: string;
  fractielidNaam: string;
  linkedUserId?: string | null;
  linkedUsername?: string | null;
  datum: string;
  startTijd: string;
  eindTijd: string;
  startDateTime?: string;
  endDateTime?: string;
  onderwerp?: string;
  status: "ingepland" | "afgehandeld" | "nam niet op" | "niet afgehandeld";
  notitie?: string;
  handledAt?: string | null;
  handledBy?: string | null;
  createdAt: string;
}

interface Props {
  token: string | null;
  currentUser: {
    id: string;
    username: string;
    fullName?: string;
    role?: string;
  };
}

export function RaadslidBelafsprakenWidget({ token, currentUser }: Props) {
  const [appointments, setAppointments] = useState<BelafspraakItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAllModalOpen, setIsAllModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"alle" | "ingepland" | "afgehandeld" | "nam niet op" | "niet afgehandeld">("alle");
  const [modalSearch, setModalSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Keep a live clock to auto-refresh button states as soon as start times arrive
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const fetchAppointments = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/belafspraken", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json().catch(() => []);
        setAppointments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Fout bij ophalen belafspraken:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleUpdateStatus = async (id: string, newStatus: "afgehandeld" | "nam niet op" | "niet afgehandeld", callerName: string) => {
    if (!token) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/belafspraken/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kon status niet wijzigen");
      }

      // Optimistically update
      setAppointments(prev => prev.map(a => a.id === id ? {
        ...a,
        status: newStatus,
        handledAt: new Date().toISOString(),
        handledBy: currentUser.fullName || currentUser.username
      } : a));

      if (newStatus === "afgehandeld") {
        toast.success(`Belafspraak met ${callerName} gemarkeerd als 'Afgehandeld'!`);
      } else if (newStatus === "nam niet op") {
        toast.info(`Belafspraak met ${callerName} gemarkeerd als 'Nam niet op'`);
      } else {
        toast.warning(`Belafspraak met ${callerName} gemarkeerd als 'Niet afgehandeld'`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Er is een fout opgetreden");
    } finally {
      setUpdatingId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(id);
    toast.success("Telefoonnummer gekopieerd naar klembord");
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Filter upcoming appointments (status === 'ingepland')
  const upcomingList = appointments
    .filter(a => a.status === "ingepland")
    .sort((a, b) => {
      const timeA = new Date(a.startDateTime || `${a.datum}T${a.startTijd}:00`).getTime();
      const timeB = new Date(b.startDateTime || `${b.datum}T${b.startTijd}:00`).getTime();
      return timeA - timeB;
    });

  // Limit widget to first 5 upcoming appointments
  const displayedUpcoming = upcomingList.slice(0, 5);

  const getStartDateMs = (item: BelafspraakItem) => {
    if (item.startDateTime) return new Date(item.startDateTime).getTime();
    return new Date(`${item.datum}T${item.startTijd}:00`).getTime();
  };

  const formatDatumNL = (datumStr: string) => {
    try {
      const d = new Date(datumStr);
      if (isNaN(d.getTime())) return datumStr;
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      if (datumStr === today) return "Vandaag";
      if (datumStr === tomorrow) return "Morgen";

      return d.toLocaleDateString("nl-NL", {
        weekday: "short",
        day: "numeric",
        month: "short"
      });
    } catch {
      return datumStr;
    }
  };

  // Filter for 'Zie allen' modal
  const modalFilteredAppointments = appointments.filter(a => {
    if (activeTab !== "alle" && a.status !== activeTab) return false;
    if (!modalSearch.trim()) return true;
    const q = modalSearch.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.phone.includes(q) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      (a.onderwerp && a.onderwerp.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <section className="bg-card rounded-2xl p-6 sm:p-8 border-2 border-accent/40 shadow-md relative overflow-hidden">
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent via-twente-gold to-accent" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0 mt-0.5 shadow-sm">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-display text-foreground">
                  Aankomende belafspraken
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/20 text-accent border border-accent/40">
                  {upcomingList.length} gepland
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Telefonische spreekuren met inwoners van Steenwijkerland die aan u zijn gekoppeld.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAppointments}
              className="text-xs border-border hover:border-accent text-muted-foreground hover:text-foreground"
              title="Vernieuw afspraken"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Vernieuwen
            </Button>
            <Button
              onClick={() => setIsAllModalOpen(true)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground uppercase tracking-wider text-xs font-semibold px-4 py-2 h-auto shadow-sm"
            >
              Zie allen ({appointments.length})
            </Button>
          </div>
        </div>

        {/* List of upcoming appointments */}
        <div className="pt-6">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Clock className="w-6 h-6 animate-spin mx-auto text-accent" />
              <p className="text-xs">Belafspraken laden...</p>
            </div>
          ) : displayedUpcoming.length === 0 ? (
            <div className="py-10 text-center rounded-xl bg-muted/20 border border-dashed border-border/60 p-6">
              <CheckCircle2 className="w-10 h-10 mx-auto text-muted-foreground/60 mb-2" />
              <h3 className="font-display text-lg text-foreground mb-1">Geen openstaande belafspraken</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                U heeft momenteel geen ingeplande belafspraken die nog moeten plaatsvinden. Zodra een inwoner een gesprek inplant via de website, verschijnt deze hier direct.
              </p>
              {appointments.length > 0 && (
                <Button
                  variant="link"
                  onClick={() => setIsAllModalOpen(true)}
                  className="text-xs text-accent mt-2 font-semibold"
                >
                  Bekijk eerdere afspraken ({appointments.length})
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {displayedUpcoming.map((item) => {
                const startMs = getStartDateMs(item);
                const isStarted = currentTime >= startMs;
                const isUpdating = updatingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 rounded-xl border transition-all ${
                      isStarted 
                        ? "bg-accent/5 border-accent shadow-sm" 
                        : "bg-muted/20 border-border/80 hover:border-border"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Caller details & timing */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-lg text-foreground font-semibold">
                            {item.name}
                          </span>

                          {/* Time / Active Status Badge */}
                          {isStarted ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              Starttijd ingegaan — Nu bellen
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                              <Clock className="w-3 h-3 text-accent" />
                              Gepland
                            </span>
                          )}

                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-card border border-border/80 text-foreground flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-accent" />
                            {formatDatumNL(item.datum)}: {item.startTijd} – {item.eindTijd}
                          </span>
                        </div>

                        {/* Contact info row */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
                          <a
                            href={`tel:${item.phone}`}
                            className="inline-flex items-center gap-1.5 font-mono font-bold text-accent hover:underline py-1 px-2 rounded bg-card border border-border/80"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {item.phone}
                          </a>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.phone, item.id)}
                            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                            title="Kopieer telefoonnummer"
                          >
                            {copiedPhone === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {item.email && (
                            <a
                              href={`mailto:${item.email}`}
                              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 hover:underline"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              {item.email}
                            </a>
                          )}
                        </div>

                        {/* Topic / Question */}
                        {item.onderwerp && (
                          <div className="text-xs text-foreground/85 bg-card p-2.5 rounded-lg border border-border/60 mt-2">
                            <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block mb-0.5">
                              Onderwerp / Vraag inwoner:
                            </span>
                            &ldquo;{item.onderwerp}&rdquo;
                          </div>
                        )}
                      </div>

                      {/* Right: Action Buttons when start time arrived */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40">
                        {isStarted ? (
                          <>
                            {/* Afgehandeld */}
                            <Button
                              onClick={() => handleUpdateStatus(item.id, "afgehandeld", item.name)}
                              disabled={isUpdating}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold uppercase tracking-wider py-2 px-3 h-9 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              Afgehandeld
                            </Button>

                            {/* Nam niet op */}
                            <Button
                              variant="outline"
                              onClick={() => handleUpdateStatus(item.id, "nam niet op", item.name)}
                              disabled={isUpdating}
                              className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-semibold uppercase tracking-wider py-2 px-3 h-9"
                            >
                              <PhoneOff className="w-3.5 h-3.5 mr-1.5" />
                              Nam niet op
                            </Button>

                            {/* Niet afgehandeld */}
                            <Button
                              variant="destructive"
                              onClick={() => handleUpdateStatus(item.id, "niet afgehandeld", item.name)}
                              disabled={isUpdating}
                              className="text-xs font-semibold uppercase tracking-wider py-2 px-3 h-9"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />
                              Niet afgehandeld
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg border border-border">
                            <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
                            <span>Knoppen actief vanaf {item.startTijd}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {upcomingList.length > 5 && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAllModalOpen(true)}
                className="text-xs text-accent border-accent/40 hover:bg-accent/10"
              >
                Er zijn nog {upcomingList.length - 5} andere belafspraken gepland. Klik hier om ze allemaal te bekijken.
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* DIALOG: ZIE ALLEN */}
      <Dialog open={isAllModalOpen} onOpenChange={setIsAllModalOpen}>
        <DialogContent className="max-w-3xl bg-card border-accent/30 p-6 max-h-[85vh] flex flex-col">
          <DialogHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="font-display text-2xl">Alle belafspraken</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Totaaloverzicht van al uw ingeplande, afgehandelde en gearchiveerde belafspraken.
                </DialogDescription>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 pt-3">
              {(
                [
                  { id: "alle", label: "Alle", count: appointments.length },
                  { id: "ingepland", label: "Ingepland", count: appointments.filter(a => a.status === "ingepland").length },
                  { id: "afgehandeld", label: "Afgehandeld", count: appointments.filter(a => a.status === "afgehandeld").length },
                  { id: "nam niet op", label: "Nam niet op", count: appointments.filter(a => a.status === "nam niet op").length },
                  { id: "niet afgehandeld", label: "Niet afgehandeld", count: appointments.filter(a => a.status === "niet afgehandeld").length },
                ] as const
              ).map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === t.id
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{t.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === t.id ? "bg-black/20 text-accent-foreground" : "bg-border text-muted-foreground"
                  }`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative pt-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-5 text-muted-foreground" />
              <Input
                placeholder="Zoek op naam inwoner, telefoonnummer of onderwerp..."
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
                className="pl-9 text-xs h-9 bg-background"
              />
            </div>
          </DialogHeader>

          {/* Appointments scrollable list */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
            {modalFilteredAppointments.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                Geen belafspraken gevonden voor dit filter.
              </div>
            ) : (
              modalFilteredAppointments.map(item => {
                const isStarted = currentTime >= getStartDateMs(item);
                const isUpdating = updatingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-border/70 bg-card hover:border-accent/40 transition-colors space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-base">{item.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                            item.status === "afgehandeld"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : item.status === "nam niet op"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : item.status === "niet afgehandeld"
                              ? "bg-destructive/15 text-destructive border border-destructive/30"
                              : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-accent" />
                            {item.datum} ({item.startTijd} – {item.eindTijd})
                          </span>
                          <a href={`tel:${item.phone}`} className="text-accent hover:underline font-mono">
                            {item.phone}
                          </a>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0">
                        <Button
                          size="sm"
                          variant={item.status === "afgehandeld" ? "default" : "outline"}
                          onClick={() => handleUpdateStatus(item.id, "afgehandeld", item.name)}
                          disabled={isUpdating}
                          className="text-[11px] h-7 px-2"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Afgehandeld
                        </Button>
                        <Button
                          size="sm"
                          variant={item.status === "nam niet op" ? "default" : "outline"}
                          onClick={() => handleUpdateStatus(item.id, "nam niet op", item.name)}
                          disabled={isUpdating}
                          className="text-[11px] h-7 px-2"
                        >
                          <PhoneOff className="w-3 h-3 mr-1" />
                          Nam niet op
                        </Button>
                        <Button
                          size="sm"
                          variant={item.status === "niet afgehandeld" ? "destructive" : "outline"}
                          onClick={() => handleUpdateStatus(item.id, "niet afgehandeld", item.name)}
                          disabled={isUpdating}
                          className="text-[11px] h-7 px-2"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Niet afgehandeld
                        </Button>
                      </div>
                    </div>

                    {item.onderwerp && (
                      <p className="text-xs text-foreground/80 bg-muted/30 p-2 rounded border border-border/40">
                        {item.onderwerp}
                      </p>
                    )}

                    {item.handledAt && (
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2 pt-1 border-t border-border/30">
                        <Clock className="w-3 h-3" />
                        Status bijgewerkt op: {new Date(item.handledAt).toLocaleString("nl-NL")}
                        {item.handledBy && ` door ${item.handledBy}`}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
