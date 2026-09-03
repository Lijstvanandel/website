import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Clock, ArrowRight, BookOpen, Share2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { AgendaMap, AgendaEventLocation } from "@/components/AgendaMap";
import { EventItem } from "@/data/events";

export default function Agenda() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch("/api/events", { headers })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setEvents(data);
        }
      })
      .catch((err) => console.error("Error fetching agenda:", err));
  }, [token]);

  const handleAttend = async (eventId: string, isCancelled: boolean) => {
    if (isCancelled) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`/api/events/${eventId}/attend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Goed dat u komt, op uw ledendashboard staat het adres, tot dan!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Aanmelden mislukt");
      }
    } catch (e) {
      toast.error("Fout bij aanmelden");
    }
  };

  const handleShareEvent = async (eventId: string) => {
    const url = `${window.location.origin}/agenda/${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link naar evenement gekopieerd naar klembord!");
    } catch {
      toast.error("Kon link niet kopiëren");
    }
  };

  // Convert events to map format
  const mapEvents: AgendaEventLocation[] = events
    .filter((ev) => isAuthenticated || ev.isPublic)
    .map((ev) => ({
      id: ev.id,
      title: ev.title,
      date: ev.date,
      startTime: ev.startTime,
      endTime: ev.endTime,
      address: ev.address || "",
      lat: ev.lat,
      lng: ev.lng,
      isPublic: ev.isPublic,
      isCancelled: ev.isCancelled,
    }));

  return (
    <div className="pt-32 pb-24">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-12 animate-fade-up">
          <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Activiteiten & Bijeenkomsten</div>
          <h1 className="text-5xl md:text-6xl font-display text-primary mb-6">Onze Agenda</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Blijf op de hoogte van onze activiteiten, raadsvergaderingen en bijeenkomsten in Steenwijkerland.
          </p>
        </div>

        {/* Interactive Leaflet Map with Address Input */}
        <div className="mb-14">
          <AgendaMap
            events={mapEvents}
            selectedEventId={selectedEventId}
            onSelectEvent={(id) => setSelectedEventId(id)}
          />
        </div>

        {/* Events Heading */}
        <div className="flex items-center justify-between mb-8 max-w-4xl mx-auto">
          <div>
            <h2 className="text-3xl font-display">Geplande Bijeenkomsten</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Klik op &quot;Bekijk op kaart&quot; om de locatie op de interactieve kaart hierboven te bekijken, of &quot;Lees meer&quot; voor alle details.
            </p>
          </div>
          <div className="text-xs text-muted-foreground bg-secondary/80 px-3 py-1.5 rounded border border-border">
            {events.length} {events.length === 1 ? "evenement" : "evenementen"}
          </div>
        </div>

        {/* Events List */}
        <div className="grid gap-8 max-w-4xl mx-auto">
          {events.length === 0 && (
            <div className="text-center py-16 bg-card border border-border rounded-xl text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-25" />
              <p className="text-base">Geen geplande evenementen gevonden.</p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                Kom binnenkort terug voor nieuwe data en bijeenkomsten.
              </p>
            </div>
          )}

          {events.map((item, index) => {
            const isSelected = selectedEventId === item.id;
            const previewText = item.shortDescription || (item.description ? item.description.replace(/<[^>]*>/g, '') : '');
            return (
              <div
                key={item.id}
                id={`event-${item.id}`}
                className={`bg-card rounded-xl border ${
                  item.isCancelled
                    ? "border-red-500/50 opacity-80"
                    : isSelected
                    ? "border-accent ring-1 ring-accent"
                    : "border-border"
                } overflow-hidden flex flex-col md:flex-row hover-lift animate-fade-up transition-all duration-300`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="md:w-1/3 aspect-video md:aspect-auto bg-muted relative min-h-[200px]">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/40">
                      <Calendar className="w-12 h-12 opacity-20 text-accent" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg text-center shadow-lg border border-border/50">
                    <div className="text-sm font-semibold text-accent leading-none">
                      {item.date
                        ? new Date(item.date).toLocaleDateString("nl-NL", { month: "short" }).toUpperCase()
                        : "DATUM"}
                    </div>
                    <div className="text-2xl font-display text-primary leading-none mt-1">
                      {item.date ? new Date(item.date).getDate() : "—"}
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 md:w-2/3 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-accent/10 text-accent text-xs font-semibold uppercase tracking-wider rounded-full">
                      {item.isPublic ? "Publiek" : "Alleen voor leden"}
                    </span>
                    {item.isCancelled && (
                      <span className="px-2.5 py-1 bg-red-500/10 text-red-500 text-xs font-semibold uppercase tracking-wider rounded-full">
                        Gecanceld
                      </span>
                    )}
                  </div>

                  <Link to={`/agenda/${item.id}`} className="hover:text-accent transition-colors">
                    <h3 className="text-2xl font-display mb-3 leading-tight">{item.title}</h3>
                  </Link>

                  <div className="space-y-2 mb-4 text-sm">
                    {item.startTime && (
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="w-4 h-4 mr-3 text-accent shrink-0" />
                        {item.startTime} {item.endTime ? `- ${item.endTime}` : ""}
                      </div>
                    )}

                    {!item.isPublic && !isAuthenticated ? (
                      <div className="flex items-center text-muted-foreground italic">
                        <MapPin className="w-4 h-4 mr-3 text-accent shrink-0" /> Locatie zichtbaar voor leden
                      </div>
                    ) : (
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-3 text-accent shrink-0" />
                        <span className="text-foreground/90 font-medium">
                          {isAuthenticated ? item.address : item.address || "Steenwijk"}
                        </span>
                      </div>
                    )}
                  </div>

                  {previewText && (
                    <p className="text-muted-foreground mb-6 text-sm leading-relaxed line-clamp-3">{previewText}</p>
                  )}

                  <div className="mt-auto pt-2 flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => handleAttend(item.id, item.isCancelled)}
                      disabled={item.isCancelled}
                      className={`inline-flex items-center justify-center px-5 py-2.5 rounded-full font-semibold text-xs transition-all duration-300 ${
                        item.isCancelled
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                      }`}
                    >
                      {item.isCancelled ? "Evenement Gecanceld" : "Meld u aan"}
                      {!item.isCancelled && <ArrowRight className="ml-1.5 w-3.5 h-3.5" />}
                    </button>

                    <Link
                      to={`/agenda/${item.id}`}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-secondary text-foreground hover:bg-secondary/80 border border-border text-xs font-semibold transition-colors shadow-sm"
                    >
                      <BookOpen className="w-3.5 h-3.5 mr-1.5 text-accent" /> Lees meer
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleShareEvent(item.id)}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-semibold transition-colors"
                      title="Kopieer link naar dit evenement"
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1.5 text-accent" /> Deel dit evenement
                    </button>

                    {item.address && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEventId(item.id);
                          window.scrollTo({ top: 300, behavior: "smooth" });
                        }}
                        className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-full border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground text-xs font-semibold transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5 mr-1.5" /> Bekijk op kaart
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
