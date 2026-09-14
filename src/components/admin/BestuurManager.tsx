import React, { useState, useEffect, useCallback } from "react";
import { 
  Users, 
  ShieldCheck, 
  FileText, 
  Upload, 
  Trash2, 
  Pencil, 
  Plus, 
  Download, 
  ExternalLink, 
  Eye, 
  Save, 
  RefreshCw, 
  FileCheck2, 
  Calendar, 
  HardDrive, 
  Mail, 
  Phone, 
  Instagram, 
  Facebook, 
  Linkedin, 
  Gavel, 
  FolderKanban, 
  Scale, 
  CheckCircle2, 
  Image as ImageIcon,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fetchWithAuth, safeJson } from "@/lib/api";
import placeholder from "@/assets/silhouette.png";
import { getSafeDocumentUrl } from "@/lib/documentUrl";
import sammyImg from "@/assets/sammy.png";
import stefImg from "@/assets/stef-mars.jpg";

export interface OrganisatieDocItem {
  id: string;
  titel: string;
  beschrijving?: string;
  category?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  datum?: string;
  href?: string;
}

export interface BoardMemberFormItem {
  id?: string;
  roleTitle: string;
  name: string;
  description: string;
  bio?: string;
  email?: string;
  phone?: string;
  img?: string;
  socials?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  panelNote?: string;
}

export interface BestuurFormData {
  partyName: string;
  boardTitle: string;
  boardSubtitle: string;
  pageIntro: string;
  status: string;
  chairman: BoardMemberFormItem;
  secretary: BoardMemberFormItem;
  treasurer: BoardMemberFormItem;
  additionalMembers: BoardMemberFormItem[];
  organisatieDocs: OrganisatieDocItem[];
}

interface BestuurManagerProps {
  token?: string | null;
  headers?: Record<string, string>;
  onUpdated?: () => void;
}

export const BestuurManager: React.FC<BestuurManagerProps> = ({ headers = {}, onUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<BestuurFormData>({
    partyName: "Lijst van Andel",
    boardTitle: "Bestuur",
    boardSubtitle: "Het bestuur bewaakt de koers van Lijst van Andel, zorgt voor een gezonde organisatie en vormt de schakel tussen leden, fractie en samenleving.",
    pageIntro: "Het bestuur bewaakt de koers van Lijst van Andel, zorgt voor een gezonde organisatie en vormt de schakel tussen leden, fractie en samenleving.",
    status: "Bestuur Compleet & Operationeel",
    chairman: {
      roleTitle: "Partijvoorzitter",
      name: "Sammy van Andel",
      description: "Leidt ALV en bestuursvergaderingen, bewaakt fractierelatie via 5 instrumenten, stuurt commissies aan en is het gezicht naar buiten.",
      bio: "Voorzitter van het bestuur van Lijst van Andel. Bewaakt koers, samenhang en verbinding tussen bestuur en fractie.",
      email: "voorzitter@lijstvanandel.nl",
      phone: "",
      img: "",
      socials: { instagram: "", facebook: "", linkedin: "" },
      panelNote: "U bevindt zich in het Voorzitterpaneel"
    },
    secretary: {
      roleTitle: "Secretaris",
      name: "Anja ter Horst",
      description: "Verantwoordelijk voor correspondentie, notulering ALV, ledenadministratie, KvK/WBTR-formaliteiten en het partijarchief.",
      bio: "Bestuurslid van Lijst van Andel. Betrokken bij organisatie, leden en lokale verankering van de partij.",
      email: "secretariaat@lijstvanandel.nl",
      phone: "",
      img: "",
      socials: { instagram: "", facebook: "", linkedin: "" },
      panelNote: "Eigen beveiligd Secretarispaneel"
    },
    treasurer: {
      roleTitle: "Penningmeester",
      name: "Stef Mars",
      description: "Beheert begroting, kasboek, contributie-inning via Stripe/SEPA, giftenregister en verantwoording naar de kascommissie.",
      bio: "Bestuurslid van Lijst van Andel. Met een nuchtere blik en oog voor detail draagt hij bij aan een gezonde partijorganisatie.",
      email: "penningmeester@lijstvanandel.nl",
      phone: "",
      img: "",
      socials: { instagram: "", facebook: "", linkedin: "" },
      panelNote: "Eigen beveiligd Penningmeesterpaneel"
    },
    additionalMembers: [],
    organisatieDocs: []
  });

  // Document Modal state
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDocIndex, setEditingDocIndex] = useState<number | null>(null);
  const [docForm, setDocForm] = useState<OrganisatieDocItem>({
    id: "",
    titel: "",
    beschrijving: "",
    category: "Statutair",
    fileUrl: "",
    fileName: "",
    fileSize: "",
    datum: new Date().toISOString().split("T")[0],
    href: ""
  });
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Load current bestuur data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/public/bestuur");
      if (res.ok) {
        const data = await safeJson(res, null);
        if (data) {
          setFormData({
            partyName: data.partyName || "Lijst van Andel",
            boardTitle: data.boardTitle || "Bestuur",
            boardSubtitle: data.boardSubtitle || "Het bestuur bewaakt de koers van Lijst van Andel, zorgt voor een gezonde organisatie en vormt de schakel tussen leden, fractie en samenleving.",
            pageIntro: data.pageIntro || data.boardSubtitle || "Het bestuur bewaakt de koers van Lijst van Andel, zorgt voor een gezonde organisatie en vormt de schakel tussen leden, fractie en samenleving.",
            status: data.status || "Bestuur Compleet & Operationeel",
            chairman: {
              roleTitle: data.chairman?.roleTitle || "Partijvoorzitter",
              name: data.chairman?.name || "Sammy van Andel",
              description: data.chairman?.description || "Leidt ALV en bestuursvergaderingen, bewaakt fractierelatie via 5 instrumenten, stuurt commissies aan en is het gezicht naar buiten.",
              bio: data.chairman?.bio || data.chairman?.description || "Voorzitter van het bestuur van Lijst van Andel. Bewaakt koers, samenhang en verbinding tussen bestuur en fractie.",
              email: data.chairman?.email || "voorzitter@lijstvanandel.nl",
              phone: data.chairman?.phone || "",
              img: data.chairman?.img || "",
              socials: data.chairman?.socials || { instagram: "", facebook: "", linkedin: "" },
              panelNote: data.chairman?.panelNote || "U bevindt zich in het Voorzitterpaneel"
            },
            secretary: {
              roleTitle: data.secretary?.roleTitle || "Secretaris",
              name: data.secretary?.name || "Anja ter Horst",
              description: data.secretary?.description || "Verantwoordelijk voor correspondentie, notulering ALV, ledenadministratie, KvK/WBTR-formaliteiten en het partijarchief.",
              bio: data.secretary?.bio || data.secretary?.description || "Bestuurslid van Lijst van Andel. Betrokken bij organisatie, leden en lokale verankering van de partij.",
              email: data.secretary?.email || "secretariaat@lijstvanandel.nl",
              phone: data.secretary?.phone || "",
              img: data.secretary?.img || "",
              socials: data.secretary?.socials || { instagram: "", facebook: "", linkedin: "" },
              panelNote: data.secretary?.panelNote || "Eigen beveiligd Secretarispaneel"
            },
            treasurer: {
              roleTitle: data.treasurer?.roleTitle || "Penningmeester",
              name: data.treasurer?.name || "Stef Mars",
              description: data.treasurer?.description || "Beheert begroting, kasboek, contributie-inning via Stripe/SEPA, giftenregister en verantwoording naar de kascommissie.",
              bio: data.treasurer?.bio || data.treasurer?.description || "Bestuurslid van Lijst van Andel. Met een nuchtere blik en oog voor detail draagt hij bij aan een gezonde partijorganisatie.",
              email: data.treasurer?.email || "penningmeester@lijstvanandel.nl",
              phone: data.treasurer?.phone || "",
              img: data.treasurer?.img || "",
              socials: data.treasurer?.socials || { instagram: "", facebook: "", linkedin: "" },
              panelNote: data.treasurer?.panelNote || "Eigen beveiligd Penningmeesterpaneel"
            },
            additionalMembers: Array.isArray(data.additionalMembers) ? data.additionalMembers : [],
            organisatieDocs: Array.isArray(data.organisatieDocs) ? data.organisatieDocs : []
          });
        }
      }
    } catch (err) {
      console.error("Fout bij ophalen bestuursdata:", err);
      toast.error("Kon bestuursgegevens niet ophalen");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save all bestuur settings & documents
  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchWithAuth("/api/chairman/daily-board", {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success("Bestuurspagina & organisatie-documenten succesvol opgeslagen!");
        if (onUpdated) onUpdated();
        loadData();
      } else {
        toast.error("Fout bij opslaan van bestuursgegevens");
      }
    } catch (err) {
      console.error("Fout bij opslaan:", err);
      toast.error("Netwerkfout bij opslaan");
    } finally {
      setSaving(false);
    }
  };

  // Image Upload for Member
  const handleImageUpload = async (target: "chairman" | "secretary" | "treasurer" | number, file: File) => {
    const uploadFormData = new FormData();
    uploadFormData.append("image", file);
    setUploadingImageFor(typeof target === "number" ? `member-${target}` : target);

    try {
      const res = await fetchWithAuth("/api/chairman/board-member/upload-image", {
        method: "POST",
        headers: {
          Authorization: headers.Authorization || `Bearer ${localStorage.getItem("token")}`
        },
        body: uploadFormData
      });

      if (res.ok) {
        const data = await safeJson(res, {});
        const imageUrl = data.imageUrl;

        if (target === "chairman") {
          setFormData((prev) => ({
            ...prev,
            chairman: { ...prev.chairman, img: imageUrl }
          }));
        } else if (target === "secretary") {
          setFormData((prev) => ({
            ...prev,
            secretary: { ...prev.secretary, img: imageUrl }
          }));
        } else if (target === "treasurer") {
          setFormData((prev) => ({
            ...prev,
            treasurer: { ...prev.treasurer, img: imageUrl }
          }));
        } else if (typeof target === "number") {
          setFormData((prev) => {
            const updated = [...prev.additionalMembers];
            if (updated[target]) {
              updated[target] = { ...updated[target], img: imageUrl };
            }
            return { ...prev, additionalMembers: updated };
          });
        }
        toast.success("Foto succesvol geüpload en gekoppeld!");
      } else {
        toast.error("Fout bij uploaden van afbeelding");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout bij uploaden afbeelding");
    } finally {
      setUploadingImageFor(null);
    }
  };

  // Additional Member Handlers
  const handleAddAdditionalMember = () => {
    const newMember: BoardMemberFormItem = {
      id: `member-${Date.now()}`,
      roleTitle: "Algemeen Bestuurslid",
      name: "",
      description: "Ondersteunt verenigingsprojecten, wijkcontacten en organisatie.",
      bio: "Betrokken bij lokale initiatieven en versterking van de dorpskernen in Steenwijkerland.",
      email: "bestuur@lijstvanandel.nl",
      phone: "",
      img: "",
      socials: { instagram: "", facebook: "", linkedin: "" }
    };

    setFormData((prev) => ({
      ...prev,
      additionalMembers: [...prev.additionalMembers, newMember]
    }));
  };

  const handleRemoveAdditionalMember = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      additionalMembers: prev.additionalMembers.filter((_, i) => i !== index)
    }));
  };

  // Document Management Handlers
  const handleOpenNewDoc = () => {
    setEditingDocIndex(null);
    setDocForm({
      id: `doc-${Date.now()}`,
      titel: "",
      beschrijving: "",
      category: "Statutair",
      fileUrl: "",
      fileName: "",
      fileSize: "",
      datum: new Date().toISOString().split("T")[0],
      href: ""
    });
    setIsDocModalOpen(true);
  };

  const handleOpenEditDoc = (index: number) => {
    setEditingDocIndex(index);
    setDocForm({ ...formData.organisatieDocs[index] });
    setIsDocModalOpen(true);
  };

  const handleDocFileUpload = async (file: File) => {
    setIsUploadingDoc(true);
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      const res = await fetchWithAuth("/api/organization-docs/upload", {
        method: "POST",
        headers: {
          Authorization: headers.Authorization || `Bearer ${localStorage.getItem("token")}`
        },
        body: uploadFormData
      });

      if (res.ok) {
        const data = await safeJson(res, {});
        const safeUrl = data.viewUrl || data.fileUrl;
        setDocForm((prev) => ({
          ...prev,
          fileUrl: safeUrl,
          fileName: data.fileName,
          fileSize: data.fileSize
        }));
        toast.success(`Bestand '${data.fileName}' succesvol geüpload en gekoppeld!`);
      } else {
        toast.error("Fout bij uploaden van document");
      }
    } catch (err) {
      console.error(err);
      toast.error("Netwerkfout bij uploaden document");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.titel.trim()) {
      toast.error("Documenttitel is verplicht");
      return;
    }

    const sanitizedDoc: OrganisatieDocItem = {
      ...docForm,
      fileUrl: getSafeDocumentUrl(docForm.fileUrl, docForm.fileName, docForm.href) || docForm.fileUrl
    };

    const updatedDocs = [...formData.organisatieDocs];
    if (editingDocIndex !== null && editingDocIndex >= 0) {
      updatedDocs[editingDocIndex] = sanitizedDoc;
    } else {
      updatedDocs.push(sanitizedDoc);
    }

    setFormData((prev) => ({ ...prev, organisatieDocs: updatedDocs }));
    setIsDocModalOpen(false);

    try {
      await fetchWithAuth("/api/chairman/daily-board", {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ...formData, organisatieDocs: updatedDocs })
      });
      toast.success(editingDocIndex !== null ? "Document bijgewerkt en direct opgeslagen!" : "Document toegevoegd en direct opgeslagen!");
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error(err);
      toast.info("Document toegevoegd aan lijst. Klik op 'Wijzigingen Opslaan' om definitief vast te leggen.");
    }
  };

  const handleDeleteDoc = async (index: number) => {
    const updatedDocs = formData.organisatieDocs.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      organisatieDocs: updatedDocs
    }));
    try {
      await fetchWithAuth("/api/chairman/daily-board", {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ...formData, organisatieDocs: updatedDocs })
      });
      toast.success("Document verwijderd en direct opgeslagen");
      if (onUpdated) onUpdated();
    } catch (err) {
      toast.success("Document verwijderd");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-accent" />
        <span className="text-sm">Bestuursgegevens en documenten laden...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent font-semibold text-xs uppercase tracking-widest mb-1">
            <Users className="w-4 h-4" />
            <span>Partijorganisatie & Bestuur</span>
          </div>
          <h2 className="text-2xl font-display text-foreground">
            Bestuursbeheer & Organisatie-informatie
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Beheer direct de openbare pagina <strong>/bestuur</strong>: de bestuursleden (Voorzitter, Secretaris, Penningmeester, Algemene bestuursleden), hun biografieën, foto's, contactgegevens en alle officiële verenigingsdocumenten.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <a
            href="/bestuur"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-4 h-4 text-accent" />
            <span>Live /bestuur Bekijken</span>
            <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
          </a>

          <Button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5 h-9 px-4 cursor-pointer shadow-sm"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Wijzigingen Opslaan</span>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-8">
        {/* SECTIE 1: Pagina Kaders & Introductietekst */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border/60">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-semibold text-base font-display text-foreground">
                Pagina Instellingen & Introductie
              </h3>
              <p className="text-xs text-muted-foreground">
                De teksten die bovenaan de pagina /bestuur worden getoond aan bezoekers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium block mb-1">Partijnaam</label>
              <Input
                value={formData.partyName}
                onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                placeholder="Lijst van Andel"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium block mb-1">Paginatitel</label>
              <Input
                value={formData.boardTitle}
                onChange={(e) => setFormData({ ...formData, boardTitle: e.target.value })}
                placeholder="Bestuur"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium block mb-1">Bestuursstatus</label>
              <Input
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                placeholder="Bestuur Compleet & Operationeel"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">
              Introductietekst / Ondertitel (/bestuur)
            </label>
            <Textarea
              rows={2}
              value={formData.pageIntro}
              onChange={(e) => setFormData({ ...formData, pageIntro: e.target.value, boardSubtitle: e.target.value })}
              placeholder="Het bestuur bewaakt de koers van Lijst van Andel, zorgt voor een gezonde organisatie en vormt de schakel tussen leden, fractie en samenleving."
              required
            />
          </div>
        </div>

        {/* SECTIE 2: Dagelijks Bestuur Trio */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="font-semibold text-lg font-display text-foreground">
                  Statutair Dagelijks Bestuur (Trio)
                </h3>
                <p className="text-xs text-muted-foreground">
                  De drie statutaire hoofdfuncties conform verenigingsrecht en WBTR.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. VOORZITTER */}
            <div className="p-5 rounded-xl border border-amber-500/30 bg-card hover:border-amber-500/50 transition-all space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Gavel className="w-4 h-4 text-amber-600" />
                    <span>Voorzitter</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
                    Voorzitterpaneel
                  </span>
                </div>

                {/* Foto Preview & Upload */}
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border border-border overflow-hidden bg-muted relative shrink-0">
                    <img
                      src={formData.chairman.img || sammyImg}
                      alt={formData.chairman.name}
                      onError={(e) => { (e.target as HTMLImageElement).src = placeholder; }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-medium block text-muted-foreground mb-1">
                      Profielfoto Voorzitter
                    </label>
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-medium cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingImageFor === "chairman" ? "Uploaden..." : "Foto Wijzigen"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleImageUpload("chairman", e.target.files[0]);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1">Functietitel</label>
                    <Input
                      value={formData.chairman.roleTitle}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          chairman: { ...formData.chairman, roleTitle: e.target.value }
                        })
                      }
                      placeholder="Partijvoorzitter"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Volledige Naam</label>
                    <Input
                      value={formData.chairman.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          chairman: { ...formData.chairman, name: e.target.value }
                        })
                      }
                      placeholder="Sammy van Andel"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1">E-mailadres</label>
                    <Input
                      type="email"
                      value={formData.chairman.email || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          chairman: { ...formData.chairman, email: e.target.value }
                        })
                      }
                      placeholder="voorzitter@lijstvanandel.nl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Telefoon (optioneel)</label>
                    <Input
                      value={formData.chairman.phone || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          chairman: { ...formData.chairman, phone: e.target.value }
                        })
                      }
                      placeholder="06 - ..."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1">Publieke Biografie (/bestuur)</label>
                  <Textarea
                    rows={2}
                    value={formData.chairman.bio || formData.chairman.description || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        chairman: {
                          ...formData.chairman,
                          bio: e.target.value,
                          description: e.target.value
                        }
                      })
                    }
                    placeholder="Biografie en achtergrond van de voorzitter..."
                  />
                </div>

                {/* Socials */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Social Media Links (Optioneel)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Instagram URL"
                      value={formData.chairman.socials?.instagram || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          chairman: {
                            ...formData.chairman,
                            socials: { ...(formData.chairman.socials || {}), instagram: e.target.value }
                          }
                        })
                      }
                      className="text-xs"
                    />
                    <Input
                      placeholder="Facebook URL"
                      value={formData.chairman.socials?.facebook || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          chairman: {
                            ...formData.chairman,
                            socials: { ...(formData.chairman.socials || {}), facebook: e.target.value }
                          }
                        })
                      }
                      className="text-xs"
                    />
                    <Input
                      placeholder="LinkedIn URL"
                      value={formData.chairman.socials?.linkedin || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          chairman: {
                            ...formData.chairman,
                            socials: { ...(formData.chairman.socials || {}), linkedin: e.target.value }
                          }
                        })
                      }
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. SECRETARIS */}
            <div className="p-5 rounded-xl border border-indigo-500/30 bg-card hover:border-indigo-500/50 transition-all space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                    <FolderKanban className="w-4 h-4 text-indigo-600" />
                    <span>Secretaris</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium">
                    Secretarispaneel
                  </span>
                </div>

                {/* Foto Preview & Upload */}
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border border-border overflow-hidden bg-muted relative shrink-0">
                    <img
                      src={formData.secretary.img || placeholder}
                      alt={formData.secretary.name}
                      onError={(e) => { (e.target as HTMLImageElement).src = placeholder; }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-medium block text-muted-foreground mb-1">
                      Profielfoto Secretaris
                    </label>
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-xs font-medium cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingImageFor === "secretary" ? "Uploaden..." : "Foto Wijzigen"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleImageUpload("secretary", e.target.files[0]);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1">Functietitel</label>
                    <Input
                      value={formData.secretary.roleTitle}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          secretary: { ...formData.secretary, roleTitle: e.target.value }
                        })
                      }
                      placeholder="Secretaris"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Volledige Naam</label>
                    <Input
                      value={formData.secretary.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          secretary: { ...formData.secretary, name: e.target.value }
                        })
                      }
                      placeholder="Anja ter Horst"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1">E-mailadres</label>
                    <Input
                      type="email"
                      value={formData.secretary.email || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          secretary: { ...formData.secretary, email: e.target.value }
                        })
                      }
                      placeholder="secretariaat@lijstvanandel.nl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Telefoon (optioneel)</label>
                    <Input
                      value={formData.secretary.phone || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          secretary: { ...formData.secretary, phone: e.target.value }
                        })
                      }
                      placeholder="06 - ..."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1">Publieke Biografie (/bestuur)</label>
                  <Textarea
                    rows={2}
                    value={formData.secretary.bio || formData.secretary.description || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        secretary: {
                          ...formData.secretary,
                          bio: e.target.value,
                          description: e.target.value
                        }
                      })
                    }
                    placeholder="Biografie en verantwoordelijkheden van de secretaris..."
                  />
                </div>

                {/* Socials */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Social Media Links (Optioneel)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Instagram URL"
                      value={formData.secretary.socials?.instagram || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          secretary: {
                            ...formData.secretary,
                            socials: { ...(formData.secretary.socials || {}), instagram: e.target.value }
                          }
                        })
                      }
                      className="text-xs"
                    />
                    <Input
                      placeholder="Facebook URL"
                      value={formData.secretary.socials?.facebook || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          secretary: {
                            ...formData.secretary,
                            socials: { ...(formData.secretary.socials || {}), facebook: e.target.value }
                          }
                        })
                      }
                      className="text-xs"
                    />
                    <Input
                      placeholder="LinkedIn URL"
                      value={formData.secretary.socials?.linkedin || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          secretary: {
                            ...formData.secretary,
                            socials: { ...(formData.secretary.socials || {}), linkedin: e.target.value }
                          }
                        })
                      }
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. PENNINGMEESTER */}
            <div className="p-5 rounded-xl border border-emerald-500/30 bg-card hover:border-emerald-500/50 transition-all space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    <span>Penningmeester</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium">
                    Penningmeesterpaneel
                  </span>
                </div>

                {/* Foto Preview & Upload */}
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border border-border overflow-hidden bg-muted relative shrink-0">
                    <img
                      src={formData.treasurer.img || stefImg}
                      alt={formData.treasurer.name}
                      onError={(e) => { (e.target as HTMLImageElement).src = placeholder; }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-medium block text-muted-foreground mb-1">
                      Profielfoto Penningmeester
                    </label>
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-medium cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingImageFor === "treasurer" ? "Uploaden..." : "Foto Wijzigen"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleImageUpload("treasurer", e.target.files[0]);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1">Functietitel</label>
                    <Input
                      value={formData.treasurer.roleTitle}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          treasurer: { ...formData.treasurer, roleTitle: e.target.value }
                        })
                      }
                      placeholder="Penningmeester"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Volledige Naam</label>
                    <Input
                      value={formData.treasurer.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          treasurer: { ...formData.treasurer, name: e.target.value }
                        })
                      }
                      placeholder="Stef Mars"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1">E-mailadres</label>
                    <Input
                      type="email"
                      value={formData.treasurer.email || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          treasurer: { ...formData.treasurer, email: e.target.value }
                        })
                      }
                      placeholder="penningmeester@lijstvanandel.nl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Telefoon (optioneel)</label>
                    <Input
                      value={formData.treasurer.phone || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          treasurer: { ...formData.treasurer, phone: e.target.value }
                        })
                      }
                      placeholder="06 - ..."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1">Publieke Biografie (/bestuur)</label>
                  <Textarea
                    rows={2}
                    value={formData.treasurer.bio || formData.treasurer.description || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        treasurer: {
                          ...formData.treasurer,
                          bio: e.target.value,
                          description: e.target.value
                        }
                      })
                    }
                    placeholder="Biografie en financiële verantwoording van de penningmeester..."
                  />
                </div>

                {/* Socials */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Social Media Links (Optioneel)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Instagram URL"
                      value={formData.treasurer.socials?.instagram || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          treasurer: {
                            ...formData.treasurer,
                            socials: { ...(formData.treasurer.socials || {}), instagram: e.target.value }
                          }
                        })
                      }
                      className="text-xs"
                    />
                    <Input
                      placeholder="Facebook URL"
                      value={formData.treasurer.socials?.facebook || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          treasurer: {
                            ...formData.treasurer,
                            socials: { ...(formData.treasurer.socials || {}), facebook: e.target.value }
                          }
                        })
                      }
                      className="text-xs"
                    />
                    <Input
                      placeholder="LinkedIn URL"
                      value={formData.treasurer.socials?.linkedin || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          treasurer: {
                            ...formData.treasurer,
                            socials: { ...(formData.treasurer.socials || {}), linkedin: e.target.value }
                          }
                        })
                      }
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTIE 3: Aanvullende Bestuursleden */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div>
              <h3 className="font-semibold text-lg font-display text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                <span>Aanvullende Bestuursleden & Portefeuillehouders</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Voeg eventuele algemene bestuursleden, campagneleiders of vicevoorzitters toe aan de bestuurspagina.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleAddAdditionalMember}
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 h-8 border-accent/40 text-accent hover:bg-accent/10 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Extra Bestuurslid Toevoegen</span>
            </Button>
          </div>

          {formData.additionalMembers.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground text-xs space-y-2">
              <p>Geen aanvullende bestuursleden geconfigureerd.</p>
              <p className="text-[11px] text-muted-foreground/80">
                Klik op "+ Extra Bestuurslid Toevoegen" om algemene bestuursleden toe te voegen aan /bestuur.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formData.additionalMembers.map((member, index) => (
                <div
                  key={member.id || index}
                  className="p-5 rounded-xl border border-border bg-background relative space-y-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-accent">
                      Aanvullend Bestuurslid #{index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAdditionalMember(index)}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 cursor-pointer"
                      title="Bestuurslid verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Foto Preview & Upload */}
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl border border-border overflow-hidden bg-muted relative shrink-0">
                      <img
                        src={member.img || placeholder}
                        alt={member.name}
                        onError={(e) => { (e.target as HTMLImageElement).src = placeholder; }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] font-medium block text-muted-foreground mb-1">
                        Profielfoto
                      </label>
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 border border-border text-xs font-medium cursor-pointer transition-colors">
                        <Upload className="w-3 h-3" />
                        <span>{uploadingImageFor === `member-${index}` ? "Uploaden..." : "Foto Wijzigen"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleImageUpload(index, e.target.files[0]);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1">Functietitel / Rol</label>
                      <Input
                        value={member.roleTitle}
                        onChange={(e) => {
                          const updated = [...formData.additionalMembers];
                          updated[index].roleTitle = e.target.value;
                          setFormData({ ...formData, additionalMembers: updated });
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
                          const updated = [...formData.additionalMembers];
                          updated[index].name = e.target.value;
                          setFormData({ ...formData, additionalMembers: updated });
                        }}
                        placeholder="Volledige naam"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1">E-mailadres</label>
                      <Input
                        type="email"
                        value={member.email || ""}
                        onChange={(e) => {
                          const updated = [...formData.additionalMembers];
                          updated[index].email = e.target.value;
                          setFormData({ ...formData, additionalMembers: updated });
                        }}
                        placeholder="bestuur@lijstvanandel.nl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">Telefoon (optioneel)</label>
                      <Input
                        value={member.phone || ""}
                        onChange={(e) => {
                          const updated = [...formData.additionalMembers];
                          updated[index].phone = e.target.value;
                          setFormData({ ...formData, additionalMembers: updated });
                        }}
                        placeholder="06 - ..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1">Publieke Biografie (/bestuur)</label>
                    <Textarea
                      rows={2}
                      value={member.bio || member.description || ""}
                      onChange={(e) => {
                        const updated = [...formData.additionalMembers];
                        updated[index].bio = e.target.value;
                        updated[index].description = e.target.value;
                        setFormData({ ...formData, additionalMembers: updated });
                      }}
                      placeholder="Biografie en verantwoordelijkheden..."
                    />
                  </div>

                  {/* Socials */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40">
                    <Input
                      placeholder="Instagram URL"
                      value={member.socials?.instagram || ""}
                      onChange={(e) => {
                        const updated = [...formData.additionalMembers];
                        updated[index].socials = { ...(updated[index].socials || {}), instagram: e.target.value };
                        setFormData({ ...formData, additionalMembers: updated });
                      }}
                      className="text-xs"
                    />
                    <Input
                      placeholder="Facebook URL"
                      value={member.socials?.facebook || ""}
                      onChange={(e) => {
                        const updated = [...formData.additionalMembers];
                        updated[index].socials = { ...(updated[index].socials || {}), facebook: e.target.value };
                        setFormData({ ...formData, additionalMembers: updated });
                      }}
                      className="text-xs"
                    />
                    <Input
                      placeholder="LinkedIn URL"
                      value={member.socials?.linkedin || ""}
                      onChange={(e) => {
                        const updated = [...formData.additionalMembers];
                        updated[index].socials = { ...(updated[index].socials || {}), linkedin: e.target.value };
                        setFormData({ ...formData, additionalMembers: updated });
                      }}
                      className="text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTIE 4: Organisatie-informatie Documenten (/bestuur) */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div>
              <h3 className="font-semibold text-lg font-display text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                <span>Organisatie-informatie & Statutaire Documenten (/bestuur)</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Beheer de documenten (zoals Statuten, Huishoudelijk Reglement, Integriteitscode) die in de zijbalk van /bestuur worden getoond.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleOpenNewDoc}
              className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold gap-1.5 h-8 px-3.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nieuw Document Toevoegen</span>
            </Button>
          </div>

          {formData.organisatieDocs.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground text-xs space-y-2">
              <p>Geen documenten geconfigureerd voor de organisatie-informatie.</p>
              <Button
                type="button"
                onClick={handleOpenNewDoc}
                variant="outline"
                size="sm"
                className="mt-2 text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Eerste document toevoegen</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.organisatieDocs.map((doc, index) => {
                const hasFile = !!doc.fileUrl;
                const hasLink = !hasFile && !!doc.href && doc.href !== "#";

                return (
                  <div
                    key={doc.id || index}
                    className="p-4 rounded-xl border border-border bg-background hover:border-accent/40 transition-all flex flex-col justify-between gap-3 relative group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center text-accent shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-foreground group-hover:text-accent transition-colors">
                              {doc.titel}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                              {doc.category && (
                                <span className="px-1.5 py-0.2 rounded bg-muted font-medium border border-border/60">
                                  {doc.category}
                                </span>
                              )}
                              {doc.datum && (
                                <span className="flex items-center gap-0.5">
                                  <Calendar className="w-2.5 h-2.5" /> {doc.datum}
                                </span>
                              )}
                              {doc.fileSize && (
                                <span className="flex items-center gap-0.5">
                                  <HardDrive className="w-2.5 h-2.5 text-accent" /> {doc.fileSize}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditDoc(index)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Bewerken"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDoc(index)}
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {doc.beschrijving && (
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          {doc.beschrijving}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                      <div className="text-[11px] truncate">
                        {hasFile ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Bestand gekoppeld: {doc.fileName || "PDF"}</span>
                          </span>
                        ) : hasLink ? (
                          <span className="text-accent flex items-center gap-1 truncate">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{doc.href}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Geen bestand gekoppeld ("Binnenkort")</span>
                        )}
                      </div>

                      {(hasFile || hasLink) && (
                        <a
                          href={getSafeDocumentUrl(doc.fileUrl, doc.fileName, doc.href)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded bg-accent/10 hover:bg-accent hover:text-accent-foreground text-accent text-[11px] font-semibold flex items-center gap-1 transition-colors shrink-0"
                        >
                          {hasFile ? <Download className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                          <span>Test</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Save Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="submit"
            disabled={saving}
            size="lg"
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm gap-2 px-6 cursor-pointer shadow-md"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Alle Bestuurswijzigingen & Documenten Opslaan</span>
          </Button>
        </div>
      </form>

      {/* DOCUMENT ADD/EDIT MODAL */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-semibold font-display">
                  {editingDocIndex !== null ? "Organisatie Document Bewerken" : "Nieuw Organisatie Document"}
                </h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsDocModalOpen(false)}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleSaveDoc} className="space-y-4">
              <div>
                <label className="text-xs font-medium block mb-1">Documenttitel *</label>
                <Input
                  value={docForm.titel}
                  onChange={(e) => setDocForm({ ...docForm, titel: e.target.value })}
                  placeholder="Bijv. Statuten, Huishoudelijk Reglement..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">Categorie</label>
                  <select
                    value={docForm.category || "Statutair"}
                    onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-background border border-border text-sm"
                  >
                    <option value="Statutair">Statutair</option>
                    <option value="Reglement">Reglement</option>
                    <option value="Integriteit">Integriteit</option>
                    <option value="Bestuurlijk">Bestuurlijk</option>
                    <option value="Verkiezingen">Verkiezingen</option>
                    <option value="Financieel">Financieel</option>
                    <option value="Algemeen">Algemeen</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1">Datum</label>
                  <Input
                    type="date"
                    value={docForm.datum || ""}
                    onChange={(e) => setDocForm({ ...docForm, datum: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">Korte Beschrijving / Toelichting</label>
                <Textarea
                  rows={2}
                  value={docForm.beschrijving || ""}
                  onChange={(e) => setDocForm({ ...docForm, beschrijving: e.target.value })}
                  placeholder="Korte samenvatting van dit verenigingsdocument..."
                />
              </div>

              {/* Bestands-upload of Externe Link */}
              <div className="p-4 rounded-xl border border-accent/30 bg-accent/5 space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-accent block">
                  PDF / Document Koppelen
                </label>

                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-accent/40 rounded-xl bg-background/60 hover:bg-accent/10 cursor-pointer transition-colors text-center">
                    <Upload className="w-5 h-5 text-accent mb-1" />
                    <span className="text-xs font-semibold text-foreground">
                      {isUploadingDoc ? "Uploaden..." : "Klik om PDF of Word-bestand te uploaden"}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      PDF, DOCX tot 25MB
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleDocFileUpload(e.target.files[0]);
                      }}
                    />
                  </label>

                  {docForm.fileUrl && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span className="truncate">{docForm.fileName || "Gekoppeld bestand"} ({docForm.fileSize || "PDF"})</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDocForm({ ...docForm, fileUrl: "", fileName: "", fileSize: "" })}
                        className="h-6 text-[10px] text-destructive hover:bg-destructive/10"
                      >
                        Verwijderen
                      </Button>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/40">
                  <label className="text-[11px] font-medium block text-muted-foreground mb-1">
                    Of externe URL / link:
                  </label>
                  <Input
                    value={docForm.href || ""}
                    onChange={(e) => setDocForm({ ...docForm, href: e.target.value })}
                    placeholder="https://..."
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDocModalOpen(false)}
                >
                  Annuleren
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Document Bewaren
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default BestuurManager;
