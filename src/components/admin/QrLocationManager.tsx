import React, { useState, useEffect } from "react";
import {
  QrCode,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Download,
  Copy,
  MapPin,
  FileText,
  Printer,
  Sparkles,
  Users,
  Search,
  RefreshCw,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import { QrLocation } from "@/types/stelling";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface QrLocationManagerProps {
  token: string | null;
}

export function QrLocationManager({ token }: QrLocationManagerProps) {
  const [locations, setLocations] = useState<Array<QrLocation & { submissionCount?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formStickerText, setFormStickerText] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sticker Print Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedLocationForPrint, setSelectedLocationForPrint] = useState<QrLocation | null>(null);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/admin/qr-locations");
      const data = await res.json();
      if (res.ok) {
        setLocations(Array.isArray(data) ? data : []);
      } else {
        toast.error(data.error || "Kon QR-locaties niet ophalen.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Fout bij het laden van QR-locaties.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormName("");
    setFormSlug("");
    setFormStickerText("Scan en geef direct je mening!");
    setFormAddress("");
    setFormDescription("");
    setIsModalOpen(true);
  };

  const openEditModal = (loc: QrLocation) => {
    setEditingId(loc.id);
    setFormName(loc.name);
    setFormSlug(loc.slug);
    setFormStickerText(loc.stickerText || "Scan en geef direct je mening!");
    setFormAddress(loc.address || "");
    setFormDescription(loc.description || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Locatienaam is verplicht.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        customSlug: formSlug.trim() || undefined,
        stickerText: formStickerText.trim(),
        address: formAddress.trim(),
        description: formDescription.trim(),
      };

      const url = editingId ? `/api/admin/qr-locations/${editingId}` : "/api/admin/qr-locations";
      const method = editingId ? "PUT" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kon locatie niet opslaan.");
      }

      toast.success(editingId ? "QR-locatie bijgewerkt!" : "Nieuwe QR-locatie aangemaakt!");
      setIsModalOpen(false);
      fetchLocations();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Fout bij opslaan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (loc: QrLocation) => {
    if (!confirm(`Weet u zeker dat u de QR-locatie '${loc.name}' wilt verwijderen?`)) return;

    try {
      const res = await fetchWithAuth(`/api/admin/qr-locations/${loc.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("QR-locatie verwijderd.");
        fetchLocations();
      } else {
        toast.error("Kon locatie niet verwijderen.");
      }
    } catch {
      toast.error("Fout bij verwijderen.");
    }
  };

  const getQrUrl = (slug: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/peilingen?location=${encodeURIComponent(slug)}`;
  };

  const getQrImageUrl = (url: string, size = 300) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&margin=10`;
  };

  const copyQrLink = (slug: string) => {
    const url = getQrUrl(slug);
    navigator.clipboard.writeText(url);
    toast.success("QR-peiling link gekopieerd naar klembord!");
  };

  const openPrintSticker = (loc: QrLocation) => {
    setSelectedLocationForPrint(loc);
    setPrintModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (loc.stickerText && loc.stickerText.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (loc.address && loc.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
    loc.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
              <QrCode className="w-5 h-5 text-accent" />
              QR-Locaties & Sticker Campagnes
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/20 text-accent border border-accent/30">
              Anonieme Peilingen
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Maak unieke QR-codes en stickers aan voor fysieke locaties in Steenwijkerland (bijv. skateparken, horeca toiletten, sportkantines, dorpshuizen). Bezoekers die de QR-code scannen kunnen direct <strong>anoniem</strong> hun mening geven op specifieke stellingen.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLocations}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Vernieuwen
          </Button>
          <Button
            onClick={openCreateModal}
            className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nieuwe QR-Locatie Aanmaken
          </Button>
        </div>
      </div>

      {/* Search & Counter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op locatie, stickertekst of adres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filteredLocations.length} van {locations.length} locaties
        </span>
      </div>

      {/* Grid of Locations */}
      {filteredLocations.length === 0 ? (
        <div className="p-12 text-center bg-muted/20 rounded-2xl border border-dashed border-border space-y-3">
          <QrCode className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <div className="text-sm font-semibold text-foreground">Nog geen QR-locaties aangemaakt</div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Maak uw eerste QR-campagne aan om stickers te kunnen printen voor specifieke locaties in de gemeente.
          </p>
          <Button onClick={openCreateModal} size="sm" className="bg-accent text-accent-foreground text-xs mt-2">
            <Plus className="w-4 h-4 mr-1" /> Eerste Locatie Aanmaken
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLocations.map((loc) => {
            const qrUrl = getQrUrl(loc.slug);
            const qrImg = getQrImageUrl(qrUrl, 250);

            return (
              <div
                key={loc.id}
                className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col justify-between hover:border-accent/40 transition-all group"
              >
                <div className="p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-accent border border-accent/30 inline-block mb-1">
                        /{loc.slug}
                      </span>
                      <h4 className="font-display font-bold text-base text-foreground leading-snug">
                        {loc.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 bg-muted/60 px-2 py-1 rounded-lg text-xs font-semibold text-foreground border border-border/50">
                      <Users className="w-3.5 h-3.5 text-accent" />
                      <span>{loc.submissionCount || 0}</span>
                    </div>
                  </div>

                  {/* Sticker slogan badge */}
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium italic flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span>"{loc.stickerText || "Geef direct je mening"}"</span>
                  </div>

                  {/* QR Preview & Address */}
                  <div className="flex items-center gap-4 pt-1">
                    <div className="w-20 h-20 bg-white p-1 rounded-xl border border-border shadow-xs shrink-0 flex items-center justify-center">
                      <img
                        src={qrImg}
                        alt={`QR Code voor ${loc.name}`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground flex-1 min-w-0">
                      {loc.address && (
                        <div className="flex items-center gap-1.5 text-foreground truncate">
                          <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="truncate">{loc.address}</span>
                        </div>
                      )}
                      {loc.description && (
                        <p className="line-clamp-2 text-[11px] leading-relaxed">
                          {loc.description}
                        </p>
                      )}
                      <div className="text-[10px] text-muted-foreground/80">
                        Aangemaakt: {new Date(loc.createdAt).toLocaleDateString("nl-NL")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-3.5 bg-muted/30 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyQrLink(loc.slug)}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      title="Kopieer link"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Link
                    </Button>
                    <a
                      href={qrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-8 px-2 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted font-medium"
                      title="Test live in browser"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Test
                    </a>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openPrintSticker(loc)}
                      className="h-8 px-2.5 text-xs bg-accent text-accent-foreground font-semibold shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1.5" />
                      Sticker Printen
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(loc)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title="Bewerken"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(loc)}
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-display text-foreground flex items-center gap-2">
              <QrCode className="w-5 h-5 text-accent" />
              {editingId ? "QR-Locatie Bewerken" : "Nieuwe QR-Locatie Aanmaken"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Koppel stickers met een eigen slogan aan fysieke plekken in Steenwijkerland.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                Locatienaam *
              </label>
              <Input
                required
                placeholder="Bijv. Skatebaan Steenwijk of WC Café De Markt"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                Sticker Pakkende Tekst / Slogan
              </label>
              <Input
                placeholder="Bijv. Geef je mening tijdens het skaten of Geef je mening tijdens de natuurlijke behoefte"
                value={formStickerText}
                onChange={(e) => setFormStickerText(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Deze tekst wordt groot op de sticker geprint en nodigt voorbijgangers uit tot scannen.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                Adres / Vindplaats (Optioneel)
              </label>
              <Input
                placeholder="Bijv. Gagelsweg, Steenwijk"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                Aangepaste URL Slug (Optioneel)
              </label>
              <Input
                placeholder="Bijv. skatebaan-steenwijk (wordt automatisch gegenereerd indien leeg)"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                Interne Notitie / Beschrijving
              </label>
              <Textarea
                rows={2}
                placeholder="Bijv. 5 stickers geplakt op de quarterpipe en bankjes..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-accent text-accent-foreground font-semibold">
                {isSaving ? "Opslaan..." : (editingId ? "Wijzigingen Opslaan" : "Locatie Aanmaken")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* PRINT STICKER MODAL */}
      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-display text-foreground flex items-center gap-2">
              <Printer className="w-5 h-5 text-accent" />
              Sticker Printvoorbeeld & Download
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Printklaar ontwerp voor ronde of vierkante stickers voor <strong>{selectedLocationForPrint?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedLocationForPrint && (
            <div className="space-y-6 pt-2">
              {/* STICKER VISUAL PREVIEW CONTAINER */}
              <div
                id="printable-sticker"
                className="bg-white text-slate-900 p-8 rounded-3xl border-4 border-accent shadow-xl flex flex-col items-center text-center space-y-4 max-w-sm mx-auto select-none"
                style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-black text-xs">
                    LVA
                  </div>
                  <span className="font-display font-black text-sm tracking-wider uppercase text-slate-900">
                    Lijst van Andel
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-display font-black text-xl text-slate-900 leading-tight">
                    {selectedLocationForPrint.stickerText || "Geef direct je mening!"}
                  </h3>
                  <p className="text-xs font-semibold text-slate-600">
                    Scan de QR-code met je camera
                  </p>
                </div>

                <div className="bg-white p-3 rounded-2xl border-2 border-slate-300 shadow-sm">
                  <img
                    src={getQrImageUrl(getQrUrl(selectedLocationForPrint.slug), 320)}
                    alt="QR Code"
                    className="w-44 h-44 object-contain"
                  />
                </div>

                <div className="space-y-1 pt-1">
                  <div className="inline-block bg-accent/15 text-accent px-3 py-0.5 rounded-full text-[11px] font-bold">
                    📍 {selectedLocationForPrint.name}
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    100% Anoniem • Jouw stem telt mee in de gemeenteraad
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyQrLink(selectedLocationForPrint.slug)}
                  className="text-xs"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Kopieer URL
                </Button>

                <div className="flex items-center gap-2">
                  <a
                    href={getQrImageUrl(getQrUrl(selectedLocationForPrint.slug), 600)}
                    download={`sticker-qr-${selectedLocationForPrint.slug}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-9 px-3 text-xs border border-input bg-background hover:bg-muted font-medium rounded-md"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download QR (HD)
                  </a>
                  <Button
                    onClick={handlePrint}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-bold"
                  >
                    <Printer className="w-4 h-4 mr-1.5" />
                    Print Sticker
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
