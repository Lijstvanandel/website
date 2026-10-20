import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Headphones,
  Plus,
  Pencil,
  Trash2,
  Play,
  Pause,
  Upload,
  Clock,
  MapPin,
  Calendar,
  ExternalLink,
  Eye,
  Search,
  Filter,
  Check,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  AlertCircle,
  FileAudio,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PodcastItem } from "@/types/podcast";
import { WIJKEN_EN_KERNEN } from "@/data/wijken";
import { DEFAULT_FRACTIELEDEN } from "@/data/fractieleden";
import { useAuth } from "@/context/AuthContext";

export function PodcastManager() {
  const { token } = useAuth();
  const [podcasts, setPodcasts] = useState<PodcastItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Fractie Gesprek");
  const [customCategory, setCustomCategory] = useState("");
  const [wijkSlug, setWijkSlug] = useState("");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState("");
  const [author, setAuthor] = useState("Sammy van Andel");
  const [authorId, setAuthorId] = useState("1");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [appleUrl, setAppleUrl] = useState("");

  // Media
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailPreview, setThumbnailPreview] = useState("");

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [views, setViews] = useState(0);

  // Filtering & search
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Audio player preview in dashboard
  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const wijkenInSteenwijk = WIJKEN_EN_KERNEN.filter((w) => w.type === "Wijk");
  const kernenInSteenwijkerland = WIJKEN_EN_KERNEN.filter((w) => w.type === "Kern");

  const defaultCategories = [
    "Fractie Gesprek",
    "Interview",
    "Gemeenteraad",
    "Woningbouw & Samenleving",
    "Lokale Economie",
    "Wijken & Kernen",
    "Jongeren & Toekomst",
    "Cultuur & Sport",
    "Algemeen",
  ];

  const fetchPodcasts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/podcasts", {
        headers: { Accept: "application/json" }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const text = await res.text();
          if (text && !text.trim().startsWith("<")) {
            const data: PodcastItem[] = JSON.parse(text);
            if (Array.isArray(data)) {
              setPodcasts(data);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Fout bij laden podcasts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setCategory("Fractie Gesprek");
    setCustomCategory("");
    setWijkSlug("");
    setDuration("");
    setDate(new Date().toISOString().split("T")[0]);
    setAuthor("Sammy van Andel");
    setAuthorId("1");
    setSpotifyUrl("");
    setAppleUrl("");
    setThumbnailFile(null);
    setThumbnailUrl("");
    setThumbnailPreview("");
    setAudioFile(null);
    setAudioUrl("");
    setViews(0);
  };

  const startEdit = (item: PodcastItem) => {
    setEditingId(item.id);
    setTitle(item.title || "");
    setDescription(item.description || "");

    if (defaultCategories.includes(item.category)) {
      setCategory(item.category);
      setCustomCategory("");
    } else {
      setCategory("other");
      setCustomCategory(item.category || "");
    }

    setWijkSlug(item.wijkSlug || "");
    setDuration(item.duration || "");
    setDate(item.date || new Date().toISOString().split("T")[0]);
    setAuthor(item.author || "Sammy van Andel");
    setAuthorId(item.authorId || "");
    setSpotifyUrl(item.spotifyUrl || "");
    setAppleUrl(item.appleUrl || "");
    setThumbnailUrl(item.thumbnailUrl || "");
    setThumbnailPreview(item.thumbnailUrl || "");
    setThumbnailFile(null);
    setAudioUrl(item.audioUrl || "");
    setAudioFile(null);
    setViews(item.views || 0);

    toast.info(`Aflevering '${item.title}' geladen in bewerker`);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleThumbnailChange = (file: File | null) => {
    setThumbnailFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setThumbnailPreview(url);
    } else {
      setThumbnailPreview(thumbnailUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Voer een titel in voor de podcast aflevering");
      return;
    }
    if (!description.trim()) {
      toast.error("Voer een korte beschrijving in");
      return;
    }

    const finalCategory = category === "other" ? (customCategory.trim() || "Algemeen") : category;
    const selectedWijk = WIJKEN_EN_KERNEN.find((w) => w.slug === wijkSlug);

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("category", finalCategory);
    formData.append("wijkSlug", wijkSlug);
    formData.append("wijkNaam", selectedWijk ? selectedWijk.naam : "");
    formData.append("duration", duration.trim());
    formData.append("date", date || new Date().toISOString().split("T")[0]);
    formData.append("author", author.trim());
    formData.append("authorId", authorId);
    formData.append("spotifyUrl", spotifyUrl.trim());
    formData.append("appleUrl", appleUrl.trim());
    formData.append("thumbnailUrl", thumbnailUrl.trim());
    formData.append("audioUrl", audioUrl.trim());

    if (thumbnailFile) formData.append("thumbnail", thumbnailFile);
    if (audioFile) formData.append("audio", audioFile);

    setIsSubmitting(true);
    try {
      let res;
      if (editingId) {
        res = await fetch(`/api/admin/podcasts/${editingId}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else {
        res = await fetch("/api/admin/podcasts", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Fout bij opslaan van podcast aflevering");
      }

      toast.success(editingId ? "Podcast aflevering succesvol bijgewerkt!" : "Nieuwe podcast aflevering gepubliceerd!");
      resetForm();
      fetchPodcasts();
    } catch (err: any) {
      toast.error(err.message || "Er is een fout opgetreden");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    if (!window.confirm(`Weet u zeker dat u podcast '${itemTitle}' definitief wilt verwijderen?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/podcasts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Verwijderen mislukt");

      toast.success("Podcast aflevering verwijderd");
      if (editingId === id) resetForm();
      fetchPodcasts();
    } catch (err: any) {
      toast.error(err.message || "Fout bij verwijderen");
    }
  };

  const togglePreviewAudio = (p: PodcastItem) => {
    if (!p.audioUrl) {
      toast.error("Geen audiobestand of stream-URL aanwezig voor deze aflevering");
      return;
    }

    if (previewPlayingId === p.id) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setPreviewPlayingId(null);
    } else {
      setPreviewPlayingId(p.id);
      if (audioPreviewRef.current) {
        audioPreviewRef.current.src = p.audioUrl;
        audioPreviewRef.current.play().catch(console.error);
      }
    }
  };

  const filteredList = podcasts.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.wijkNaam && p.wijkNaam.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      categoryFilter === "all" ||
      (p.category && p.category.toLowerCase() === categoryFilter.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  const totalViews = podcasts.reduce((sum, p) => sum + (p.views || 0), 0);

  return (
    <div className="space-y-8">
      {/* Hidden audio element for preview */}
      <audio
        ref={audioPreviewRef}
        onEnded={() => setPreviewPlayingId(null)}
      />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-card border border-purple-500/30 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-semibold uppercase tracking-wider mb-2">
              <Headphones className="w-3.5 h-3.5" />
              Podcast Beheer
            </div>
            <h2 className="text-2xl md:text-3xl font-display text-foreground">
              Podcasts van Lijst van Andel
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-2xl">
              Beheer hier zelfstandige podcastafleveringen. Afleveringen worden overzichtelijk gepresenteerd op{" "}
              <strong className="text-foreground">/nieuws</strong> in het specifieke podcastvak onder 'Lijst van Andel in het nieuws'.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-card border border-border/80 text-center shadow-xs">
              <span className="text-[11px] text-muted-foreground block font-medium">Afleveringen</span>
              <span className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400">
                {podcasts.length}
              </span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-card border border-border/80 text-center shadow-xs">
              <span className="text-[11px] text-muted-foreground block font-medium">Totale Weergaven</span>
              <span className="text-lg font-bold font-mono text-foreground flex items-center justify-center gap-1">
                <Eye className="w-3.5 h-3.5 text-accent" /> {totalViews}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* FORMULIER: Aflevering Aanmaken of Bewerken */}
        <div className="lg:col-span-5 bg-card rounded-2xl border border-border p-6 shadow-sm self-start space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div>
              <h3 className="text-lg font-display flex items-center gap-2 text-foreground">
                <Headphones className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                {editingId ? "Aflevering Bewerken" : "Nieuwe Aflevering Toevoegen"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editingId
                  ? "Pas de aflevering aan en sla wijzigingen op."
                  : "Vul titel, beschrijving, categorie en audio in."}
              </p>
            </div>
            {editingId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetForm}
                className="text-xs h-8"
              >
                Annuleren
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Titel */}
            <div>
              <label className="text-xs font-semibold block mb-1 text-foreground">
                Titel van de aflevering *
              </label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bijv. Stem van Steenwijkerland: Wonen en Starters"
                className="text-xs"
              />
            </div>

            {/* Korte beschrijving */}
            <div>
              <label className="text-xs font-semibold block mb-1 text-foreground">
                Korte beschrijving *
              </label>
              <Textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Geef een korte samenvatting van het gesprek en de onderwerpen die worden besproken..."
                className="text-xs resize-y"
              />
            </div>

            {/* Categorie */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground">
                  Categorie *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                >
                  {defaultCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="other">-- Aangepaste categorie --</option>
                </select>
              </div>

              {category === "other" && (
                <div>
                  <label className="text-xs font-semibold block mb-1 text-foreground">
                    Aangepaste Categorie *
                  </label>
                  <Input
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Voer categorienaam in"
                    className="text-xs"
                  />
                </div>
              )}

              {/* Wijk of kern (optioneel) */}
              <div className={category === "other" ? "sm:col-span-2" : ""}>
                <label className="text-xs font-semibold block mb-1 text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-accent" /> Wijk of Kern (optioneel)
                  </span>
                </label>
                <select
                  value={wijkSlug}
                  onChange={(e) => setWijkSlug(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                >
                  <option value="">Geen wijk / Algemeen Steenwijkerland</option>
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
              </div>
            </div>

            {/* Handmatige Thumbnail uploaden of URL */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <ImageIcon className="w-3.5 h-3.5 text-accent" /> Thumbnail afbeelding (Handmatig)
              </label>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Upload afbeelding
                  </span>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleThumbnailChange(e.target.files?.[0] || null)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Of afbeelding URL
                  </span>
                  <Input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => {
                      setThumbnailUrl(e.target.value);
                      if (!thumbnailFile) setThumbnailPreview(e.target.value);
                    }}
                    placeholder="https://... of /assets/..."
                    className="text-xs"
                  />
                </div>
              </div>

              {thumbnailPreview && (
                <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-14 h-14 rounded-lg object-cover border border-border/80"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="text-[11px] text-muted-foreground">
                    <span className="text-foreground font-medium block">Voorbeeld thumbnail</span>
                    Zichtbaar op de podcastkaart en in de mediaspeler.
                  </div>
                </div>
              )}
            </div>

            {/* Audiobestand uploaden of URL */}
            <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20 space-y-3">
              <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <FileAudio className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Audiobestand (.mp3, .m4a, .wav) of stream-URL
              </label>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Upload audio (.mp3, .m4a, .wav)
                  </span>
                  <Input
                    type="file"
                    accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                    className="text-xs"
                  />
                  {audioFile && (
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium block mt-1">
                      ✓ Bestand gekozen: {audioFile.name}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Of directe audio stream-URL
                  </span>
                  <Input
                    type="url"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    placeholder="https://.../podcast.mp3 of /uploads/podcasts/..."
                    className="text-xs"
                  />
                </div>
              </div>

              {(audioUrl || audioFile) && (
                <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">Directe luistertest:</span>
                  <audio
                    controls
                    className="h-8 max-w-[200px]"
                    src={audioFile ? URL.createObjectURL(audioFile) : audioUrl}
                  />
                </div>
              )}
            </div>

            {/* Speelduur & Datum */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" /> Speelduur (optioneel)
                </label>
                <Input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="bijv. 24 min of 28:15"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" /> Publicatiedatum
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Spreker / Auteur */}
            <div>
              <label className="text-xs font-semibold block mb-1 text-foreground">
                Spreker / Raadslid (optioneel)
              </label>
              <select
                value={authorId}
                onChange={(e) => {
                  const val = e.target.value;
                  setAuthorId(val);
                  const member = DEFAULT_FRACTIELEDEN.find((m) => String(m.id) === val);
                  if (member) setAuthor(member.name);
                  else if (!val) setAuthor("Lijst van Andel");
                }}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs mb-1.5"
              >
                <option value="">Lijst van Andel (Algemeen)</option>
                {DEFAULT_FRACTIELEDEN.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.name} ({m.role || "Fractielid"})
                  </option>
                ))}
              </select>
            </div>

            {/* Spotify & Apple links */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground">
                  Spotify aflevering URL (optioneel)
                </label>
                <Input
                  type="url"
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  placeholder="https://open.spotify.com/..."
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1 text-foreground">
                  Apple Podcasts URL (optioneel)
                </label>
                <Input
                  type="url"
                  value={appleUrl}
                  onChange={(e) => setAppleUrl(e.target.value)}
                  placeholder="https://podcasts.apple.com/..."
                  className="text-xs"
                />
              </div>
            </div>

            {/* Views counter if editing */}
            {editingId && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-accent" /> Geregistreerde weergaven:
                </span>
                <span className="font-mono font-bold text-foreground">{views}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-10 rounded-xl"
            >
              {isSubmitting ? (
                "Opslaan..."
              ) : editingId ? (
                "Wijzigingen Opslaan"
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1.5" /> Podcast Aflevering Publiceren
                </>
              )}
            </Button>
          </form>
        </div>

        {/* OVERZICHT: Alle Afleveringen & Beheer */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Zoek in podcasts op titel, beschrijving of kern..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs sm:w-48"
            >
              <option value="all">Alle Categorieën</option>
              {defaultCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* List of podcasts */}
          {loading ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Podcasts laden...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border/80 p-8">
              <Headphones className="w-10 h-10 mx-auto mb-2 text-purple-600/30" />
              <h4 className="font-display text-sm text-foreground mb-1">
                Geen podcasts gevonden
              </h4>
              <p className="text-xs text-muted-foreground">
                Er zijn momenteel geen podcastafleveringen die aan de zoekcriteria voldoen.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredList.map((item) => {
                const isPreviewing = previewPlayingId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`bg-card rounded-xl border p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-purple-500/40 shadow-xs ${
                      editingId === item.id ? "ring-2 ring-purple-600 border-transparent bg-purple-500/5" : "border-border/80"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/80">
                        <img
                          src={item.thumbnailUrl || "/assets/news-kopwijzer.jpg"}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/assets/steenwijk-aerial.webp";
                          }}
                        />
                        {item.audioUrl && (
                          <button
                            type="button"
                            onClick={() => togglePreviewAudio(item)}
                            title={isPreviewing ? "Pauzeren" : "Beluisteren"}
                            className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-black/75 hover:bg-purple-600 text-white flex items-center justify-center transition-all"
                          >
                            {isPreviewing ? (
                              <Pause className="w-3.5 h-3.5 fill-white" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                            )}
                          </button>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                            {item.category}
                          </span>
                          {item.wijkNaam && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-accent" />
                              {item.wijkNaam}
                            </span>
                          )}
                          {item.duration && (
                            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {item.duration}
                            </span>
                          )}
                        </div>

                        <h4 className="font-display text-sm text-foreground font-semibold leading-snug line-clamp-1">
                          {item.title}
                        </h4>

                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {item.description}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1.5">
                          <span>
                            {new Date(item.date || item.createdAt || 0).toLocaleDateString("nl-NL", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span>•</span>
                          <span>{item.author || "Lijst van Andel"}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono font-medium text-foreground">
                            <Eye className="w-3 h-3 text-accent" />
                            {item.views || 0} views
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {item.audioUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePreviewAudio(item)}
                          className="h-8 px-2 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                          title="Preview afspelen"
                        >
                          {isPreviewing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(item)}
                        className="h-8 px-2.5 text-xs gap-1 border-border/80 hover:border-purple-500/60"
                      >
                        <Pencil className="w-3 h-3" /> Bewerken
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id, item.title)}
                        className="h-8 px-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
