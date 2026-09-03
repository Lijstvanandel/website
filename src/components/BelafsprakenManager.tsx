import { useState, useEffect, useCallback } from "react";
import { 
  Phone, 
  Calendar, 
  Clock, 
  Mail, 
  CheckCircle2, 
  PhoneOff, 
  XCircle, 
  RotateCcw, 
  Search, 
  Trash2, 
  Copy, 
  Check, 
  UserCheck, 
  ShieldCheck, 
  AlertTriangle, 
  Edit3,
  Filter,
  Save,
  User,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export interface Belafspraak {
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

export interface Fractielid {
  id: string;
  name: string;
  role: string;
  type: string;
  imgUrl?: string;
  linkedUserId?: string | null;
  linkedUsername?: string | null;
}

export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  role: string;
  isActive: boolean;
}

interface Props {
  token: string | null;
  headers: Record<string, string>;
}

export function BelafsprakenManager({ token, headers }: Props) {
  const [appointments, setAppointments] = useState<Belafspraak[]>([]);
  const [fractieleden, setFractieleden] = useState<Fractielid[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFractielid, setFilterFractielid] = useState<string>("all");
  
  // Note edit state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Link user selection state per fractielid
  const [selectedUserPerLid, setSelectedUserPerLid] = useState<Record<string, string>>({});
  const [isLinking, setIsLinking] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const authHeaders = { Authorization: `Bearer ${token}` };
      const [appRes, fracRes, usersRes] = await Promise.all([
        fetch("/api/admin/belafspraken", { headers: authHeaders }),
        fetch("/api/fractieleden"),
        fetch("/api/admin/users", { headers: authHeaders })
      ]);

      if (appRes.ok) {
        const appData = await appRes.json().catch(() => ({ appointments: [] }));
        setAppointments(appData.appointments || []);
      }

      if (fracRes.ok) {
        const fracData = await fracRes.json().catch(() => []);
        setFractieleden(Array.isArray(fracData) ? fracData : []);
        
        // Populate initial select mapping
        const mapping: Record<string, string> = {};
        if (Array.isArray(fracData)) {
          fracData.forEach((f: Fractielid) => {
            mapping[f.id] = f.linkedUserId || "none";
          });
        }
        setSelectedUserPerLid(mapping);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json().catch(() => []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      }
    } catch (err) {
      console.error("Fout bij ophalen belafspraken data:", err);
      toast.error("Kon belafspraken niet laden");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Periodic check (every 20s) to keep vertical lists updated in real-time
  useEffect(() => {
    const timer = setInterval(() => {
      fetchData();
    }, 20000);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Handle linking registered user to fractielid
  const handleSaveUserLink = async (fractielidId: string) => {
    const targetUserId = selectedUserPerLid[fractielidId];
    setIsLinking(fractielidId);

    try {
      const res = await fetch(`/api/admin/fractieleden/${fractielidId}/link-user`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: targetUserId === "none" ? null : targetUserId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon koppeling niet opslaan");

      toast.success("Gebruikerskoppeling succesvol opgeslagen!");
      fetchData();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Fout bij opslaan koppeling");
    } finally {
      setIsLinking(null);
    }
  };

  // Quick set user role to raadslid
  const handleMakeRaadslid = async (userId: string, username: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ role: "raadslid" })
      });

      if (!res.ok) throw new Error("Kon rol niet aanpassen");

      toast.success(`Rol van ${username} succesvol gewijzigd naar 'raadslid'!`);
      fetchData();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Fout bij aanpassen rol");
    }
  };

  // Handle appointment status change
  const handleUpdateStatus = async (
    id: string, 
    newStatus: "ingepland" | "afgehandeld" | "nam niet op" | "niet afgehandeld"
  ) => {
    try {
      const res = await fetch(`/api/admin/belafspraken/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon status niet wijzigen");

      setAppointments(prev => prev.map(a => a.id === id ? {
        ...a,
        status: newStatus,
        handledAt: new Date().toISOString(),
        handledBy: "Beheerder"
      } : a));

      toast.success(`Afspraak verplaatst naar '${newStatus}'`);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Fout bij wijzigen status");
    }
  };

  // Handle note save
  const handleSaveNote = async () => {
    if (!editingNoteId) return;
    setIsSavingNote(true);
    try {
      const res = await fetch(`/api/admin/belafspraken/${editingNoteId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ notitie: noteText.trim() })
      });

      if (!res.ok) throw new Error("Kon notitie niet opslaan");

      setAppointments(prev => prev.map(a => a.id === editingNoteId ? {
        ...a,
        notitie: noteText.trim()
      } : a));

      toast.success("Notitie opgeslagen");
      setEditingNoteId(null);
      setNoteText("");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Fout bij opslaan notitie");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Delete appointment
  const handleDeleteAppointment = async (id: string, name: string) => {
    if (!confirm(`Weet u zeker dat u de belafspraak van '${name}' wilt verwijderen?`)) return;

    try {
      const res = await fetch(`/api/admin/belafspraken/${id}`, {
        method: "DELETE",
        headers
      });

      if (!res.ok) throw new Error("Kon afspraak niet verwijderen");

      setAppointments(prev => prev.filter(a => a.id !== id));
      toast.success("Belafspraak verwijderd");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Fout bij verwijderen");
    }
  };

  const copyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    toast.success("Telefoonnummer gekopieerd");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter appointments
  const filteredAppointments = appointments.filter(a => {
    if (filterFractielid !== "all" && a.fractielidId !== filterFractielid) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.phone.includes(q) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      (a.onderwerp && a.onderwerp.toLowerCase().includes(q)) ||
      a.fractielidNaam.toLowerCase().includes(q) ||
      (a.linkedUsername && a.linkedUsername.toLowerCase().includes(q))
    );
  });

  // Split into 4 vertical columns
  const columnIngepland = filteredAppointments.filter(a => a.status === "ingepland");
  const columnAfgehandeld = filteredAppointments.filter(a => a.status === "afgehandeld");
  const columnNamNietOp = filteredAppointments.filter(a => a.status === "nam niet op");
  const columnNietAfgehandeld = filteredAppointments.filter(a => a.status === "niet afgehandeld");

  return (
    <div className="space-y-10">
      {/* SECTIE 1: KOPPELING RAADSLEDEN AAN GEREGISTREERDE GEBRUIKERS */}
      <div className="bg-card rounded-2xl border-2 border-accent/40 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border/60">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display text-foreground">
                Koppeling Raadsleden aan Gebruikersaccounts
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Koppel aan elk raadslid of burgerraadslid een geregistreerde gebruikersnaam. Belafspraken komen hierdoor automatisch in hun persoonlijke dashboard terecht.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="text-xs self-start sm:self-center"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Vernieuwen
          </Button>
        </div>

        {/* Fractieleden Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          {fractieleden.map(lid => {
            const currentSelected = selectedUserPerLid[lid.id] || "none";
            const linkedUserObj = users.find(u => u.id === lid.linkedUserId);
            const isSaving = isLinking === lid.id;

            return (
              <div
                key={lid.id}
                className="bg-muted/20 rounded-xl border border-border/80 p-4 flex flex-col justify-between space-y-4 hover:border-accent/40 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border shrink-0">
                      {lid.imgUrl ? (
                        <img src={lid.imgUrl} alt={lid.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-semibold text-base text-foreground truncate">
                        {lid.name}
                      </div>
                      <div className="text-[11px] uppercase tracking-wider text-accent font-semibold truncate">
                        {lid.role} ({lid.type})
                      </div>
                    </div>
                  </div>

                  {/* Status van koppeling */}
                  <div className="text-xs mb-3">
                    {linkedUserObj ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Gekoppeld aan: <strong>@{linkedUserObj.username}</strong></span>
                        </div>
                        <div className="text-[11px] text-muted-foreground pl-5">
                          Naam: {linkedUserObj.fullName} • Rol: <span className="font-semibold text-foreground">{linkedUserObj.role}</span>
                        </div>

                        {/* Als rol nog geen 'raadslid' is, toon knop */}
                        {linkedUserObj.role !== "raadslid" && linkedUserObj.role !== "admin" && (
                          <div className="pl-5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleMakeRaadslid(linkedUserObj.id, linkedUserObj.username)}
                              className="text-[10px] uppercase font-bold text-accent hover:underline flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              Rol direct instellen op 'raadslid'
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Nog geen account gekoppeld</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account selector */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Kies gebruikersaccount:
                  </label>
                  <Select
                    value={currentSelected}
                    onValueChange={(val) => setSelectedUserPerLid(prev => ({ ...prev, [lid.id]: val }))}
                  >
                    <SelectTrigger className="text-xs bg-background h-8">
                      <SelectValue placeholder="Selecteer gebruiker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Geen koppeling —</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          @{u.username} ({u.fullName}) [{u.role}]
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    onClick={() => handleSaveUserLink(lid.id)}
                    disabled={isSaving}
                    className="w-full text-xs font-semibold uppercase tracking-wider h-8 bg-primary hover:bg-primary/90"
                  >
                    {isSaving ? "Opslaan..." : "Koppeling opslaan"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTIE 2: DE 4 VERTICALE LIJSTEN VOOR BELAFSPRAKEN */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-display text-foreground">
                Belafsprakenoverzicht
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/20 text-accent border border-accent/40">
                {appointments.length} totaal
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gesprekken worden automatisch verplaatst naar 'niet afgehandeld' wanneer een afspraak een halfuur na eindtijd niet is afgehandeld.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Zoek inwoner, tel of onderwerp..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 w-48 sm:w-64 bg-background"
              />
            </div>

            <Select value={filterFractielid} onValueChange={setFilterFractielid}>
              <SelectTrigger className="text-xs h-9 w-44 bg-background">
                <SelectValue placeholder="Filter raadslid" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle raadsleden</SelectItem>
                {fractieleden.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="text-xs h-9"
              title="Vernieuwen en time-out controle uitvoeren"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* 4 VERTICALE KOLOMMEN (KANBAN OVERZICHT) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          
          {/* KOLOM 1: INGEPLAND */}
          <div className="bg-muted/15 rounded-xl border border-blue-500/30 overflow-hidden flex flex-col min-h-[500px]">
            <div className="bg-blue-500/10 p-3.5 border-b border-blue-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2 font-display text-sm font-semibold text-blue-600 dark:text-blue-400">
                <Clock className="w-4 h-4" />
                <span>1. Ingepland</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300">
                {columnIngepland.length}
              </span>
            </div>
            
            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[750px]">
              {columnIngepland.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground italic">
                  Geen ingeplande afspraken
                </div>
              ) : (
                columnIngepland.map(item => renderAppointmentCard(item))
              )}
            </div>
          </div>

          {/* KOLOM 2: AFGEHANDELD */}
          <div className="bg-muted/15 rounded-xl border border-emerald-500/30 overflow-hidden flex flex-col min-h-[500px]">
            <div className="bg-emerald-500/10 p-3.5 border-b border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2 font-display text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>2. Afgehandeld</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                {columnAfgehandeld.length}
              </span>
            </div>
            
            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[750px]">
              {columnAfgehandeld.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground italic">
                  Nog geen afgehandelde afspraken
                </div>
              ) : (
                columnAfgehandeld.map(item => renderAppointmentCard(item))
              )}
            </div>
          </div>

          {/* KOLOM 3: NAM NIET OP */}
          <div className="bg-muted/15 rounded-xl border border-amber-500/30 overflow-hidden flex flex-col min-h-[500px]">
            <div className="bg-amber-500/10 p-3.5 border-b border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2 font-display text-sm font-semibold text-amber-600 dark:text-amber-400">
                <PhoneOff className="w-4 h-4" />
                <span>3. Nam niet op</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                {columnNamNietOp.length}
              </span>
            </div>
            
            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[750px]">
              {columnNamNietOp.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground italic">
                  Geen afspraken in deze lijst
                </div>
              ) : (
                columnNamNietOp.map(item => renderAppointmentCard(item))
              )}
            </div>
          </div>

          {/* KOLOM 4: NIET AFGEHANDELD (INCL. >30 MIN TIME-OUT) */}
          <div className="bg-muted/15 rounded-xl border border-destructive/40 overflow-hidden flex flex-col min-h-[500px]">
            <div className="bg-destructive/10 p-3.5 border-b border-destructive/20 flex items-center justify-between">
              <div className="flex items-center gap-2 font-display text-sm font-semibold text-destructive">
                <XCircle className="w-4 h-4" />
                <span>4. Niet afgehandeld</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/20 text-destructive">
                {columnNietAfgehandeld.length}
              </span>
            </div>
            
            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[750px]">
              {columnNietAfgehandeld.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground italic">
                  Geen niet-afgehandelde afspraken
                </div>
              ) : (
                columnNietAfgehandeld.map(item => renderAppointmentCard(item))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL: NOTITIE BEWERKEN */}
      <Dialog open={Boolean(editingNoteId)} onOpenChange={(open) => { if (!open) setEditingNoteId(null); }}>
        <DialogContent className="max-w-md bg-card border-accent/30 p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Interne notitie toevoegen</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Voeg gespreksnotities of opvolgacties toe voor het raadslid of de beheerder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <Textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Bijv. Teruggebeld om 19:45, inwoner wil meedoen met werkgroep..."
              rows={4}
              className="text-xs bg-background"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingNoteId(null)}>
                Annuleren
              </Button>
              <Button size="sm" onClick={handleSaveNote} disabled={isSavingNote} className="bg-primary">
                {isSavingNote ? "Opslaan..." : "Notitie opslaan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Helper renderer for each card in the vertical columns
  function renderAppointmentCard(item: Belafspraak) {
    const isAutoExpired = item.status === "niet afgehandeld" && item.handledBy?.includes("automatisch");

    return (
      <div
        key={item.id}
        className="bg-card rounded-xl border border-border/80 p-3.5 shadow-sm hover:border-accent/40 transition-all space-y-2.5 text-xs"
      >
        {/* Caller Header */}
        <div className="flex items-start justify-between gap-1">
          <div>
            <div className="font-semibold text-foreground text-sm font-display leading-snug">
              {item.name}
            </div>
            <div className="text-[11px] text-accent font-medium">
              Met: {item.fractielidNaam.split(" — ")[0]}
              {item.linkedUsername && (
                <span className="text-muted-foreground ml-1">(@{item.linkedUsername})</span>
              )}
            </div>
          </div>

          <button
            onClick={() => handleDeleteAppointment(item.id, item.name)}
            className="text-muted-foreground/60 hover:text-destructive transition-colors p-1"
            title="Verwijder belafspraak"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Date & Time pill */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/30 border border-border/60 text-[11px] font-mono text-foreground/90">
          <Calendar className="w-3 h-3 text-accent shrink-0" />
          <span>{item.datum}</span>
          <span>•</span>
          <Clock className="w-3 h-3 text-accent shrink-0" />
          <span>{item.startTijd} – {item.eindTijd}</span>
        </div>

        {/* Contact Links */}
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <a
              href={`tel:${item.phone}`}
              className="font-mono text-accent font-semibold hover:underline inline-flex items-center gap-1"
            >
              <Phone className="w-3 h-3" />
              {item.phone}
            </a>
            <button
              onClick={() => copyPhone(item.phone, item.id)}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              title="Kopieer nummer"
            >
              {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {item.email && (
            <a
              href={`mailto:${item.email}`}
              className="text-muted-foreground hover:text-foreground hover:underline block truncate"
              title={item.email}
            >
              {item.email}
            </a>
          )}
        </div>

        {/* Topic */}
        {item.onderwerp && (
          <div className="bg-muted/20 p-2 rounded border border-border/40 text-[11px] text-foreground/80 leading-relaxed">
            <span className="font-semibold text-muted-foreground block text-[9px] uppercase tracking-wider">
              Vraag / Onderwerp:
            </span>
            &ldquo;{item.onderwerp}&rdquo;
          </div>
        )}

        {/* Auto-expired Notice */}
        {isAutoExpired && (
          <div className="bg-destructive/15 text-destructive p-2 rounded border border-destructive/30 text-[10px] flex items-start gap-1.5 leading-tight">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Automatisch verplaatst: &gt;30 min na eindtijd niet afgehandeld.</span>
          </div>
        )}

        {/* Notitie display */}
        {item.notitie && (
          <div className="bg-accent/10 border border-accent/20 p-2 rounded text-[11px] text-foreground">
            <span className="text-[9px] font-bold uppercase tracking-wider text-accent block">Notitie:</span>
            {item.notitie}
          </div>
        )}

        {/* Handled metadata */}
        {item.handledAt && !isAutoExpired && (
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/30">
            <Clock className="w-3 h-3" />
            <span>Afgehandeld door {item.handledBy || "Raadslid"} op {new Date(item.handledAt).toLocaleDateString("nl-NL")} {new Date(item.handledAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        )}

        {/* Quick Action Buttons to Move Between Columns */}
        <div className="pt-2 border-t border-border/40 flex flex-wrap gap-1">
          {item.status !== "afgehandeld" && (
            <button
              onClick={() => handleUpdateStatus(item.id, "afgehandeld")}
              className="px-2 py-1 rounded text-[10px] font-semibold bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
            >
              ✓ Afgehandeld
            </button>
          )}

          {item.status !== "nam niet op" && (
            <button
              onClick={() => handleUpdateStatus(item.id, "nam niet op")}
              className="px-2 py-1 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-colors"
            >
              ✆ Nam niet op
            </button>
          )}

          {item.status !== "niet afgehandeld" && (
            <button
              onClick={() => handleUpdateStatus(item.id, "niet afgehandeld")}
              className="px-2 py-1 rounded text-[10px] font-semibold bg-destructive/15 text-destructive hover:bg-destructive hover:text-white transition-colors"
            >
              ✕ Niet afg.
            </button>
          )}

          {item.status !== "ingepland" && (
            <button
              onClick={() => handleUpdateStatus(item.id, "ingepland")}
              className="px-2 py-1 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
            >
              ↩ Heropenen
            </button>
          )}

          <button
            onClick={() => {
              setEditingNoteId(item.id);
              setNoteText(item.notitie || "");
            }}
            className="px-2 py-1 rounded text-[10px] font-semibold bg-muted text-muted-foreground hover:text-foreground transition-colors ml-auto flex items-center gap-1"
            title="Notitie toevoegen"
          >
            <Edit3 className="w-3 h-3" />
            Notitie
          </button>
        </div>
      </div>
    );
  }
}
