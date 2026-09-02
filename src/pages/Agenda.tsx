import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { events } from "@/data/events";
import { Ticket, MapPin, Clock, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

import markerImg from "@/assets/map-marker.png";

// Custom brand marker
const markerIcon = L.icon({
  iconUrl: markerImg,
  iconSize: [40, 52],
  iconAnchor: [20, 52],
  popupAnchor: [0, -48],
});

const FlyTo = ({ coords }: { coords: [number, number] | null }) => {
  const map = useMap();
  if (coords) map.flyTo(coords, 14, { duration: 1 });
  return null;
};

const Agenda = () => {
  const [openId, setOpenId] = useState<string | null>(events[0]?.id ?? null);
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);

  const eventDates = events.map(e => parseISO(e.date));

  const handleSelect = (id: string, coords: [number, number]) => {
    setOpenId(prev => (prev === id ? null : id));
    setFocusCoords(coords);
  };

  return (
    <div className="container py-16 md:py-24">
      <div className="max-w-3xl mb-12">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Wat staat er op de planning</div>
        <h1 className="font-display text-6xl md:text-7xl mb-6 border-gold-line pb-5">Agenda</h1>
        <p className="text-lg text-muted-foreground">
          Bijeenkomsten, lezingen en momenten waarop u Lijst van Andel kunt ontmoeten in Steenwijkerland.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-8">
        {/* CARROUSEL LINKS */}
        <div className="space-y-4 max-h-[760px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-accent/40">
          {events.map(ev => {
            const isOpen = openId === ev.id;
            return (
              <article
                key={ev.id}
                className={`bg-card border transition-all ${
                  isOpen ? "border-accent shadow-[var(--shadow-gold)]" : "border-border hover:border-accent/60"
                }`}
              >
                <button
                  onClick={() => handleSelect(ev.id, ev.coords)}
                  className="w-full text-left p-5 flex items-start gap-4"
                >
                  <div className="shrink-0 w-16 text-center bg-primary text-primary-foreground py-2 border border-accent/40">
                    <div className="font-display text-3xl leading-none">
                      {format(parseISO(ev.date), "dd")}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest mt-1">
                      {format(parseISO(ev.date), "MMM", { locale: nl })}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-accent mb-1">{ev.time}</div>
                    <h3 className="font-display text-xl leading-tight mb-1">{ev.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 text-accent" /> {ev.location}
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-accent shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-accent/20 animate-fade-up">
                    <img src={ev.image} alt={ev.title} className="w-full h-56 object-cover" />
                    <div className="p-5 space-y-4">
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-accent" /> {ev.time}</span>
                        <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-accent" /> {ev.location}</span>
                      </div>
                      <p className="text-sm text-foreground/85 leading-relaxed">{ev.longDescription}</p>
                      <Button asChild className="bg-primary hover:bg-primary/90 uppercase tracking-wider text-xs font-semibold">
                        <a href={ev.ticketUrl}><Ticket className="w-4 h-4" /> Haal ticket</a>
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* MAP + CALENDAR RECHTS */}
        <div className="space-y-6">
          <div className="bg-card border border-accent/30 overflow-hidden">
            <div className="h-[420px]">
              <MapContainer
                center={[52.7873, 6.1196]}
                zoom={11}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FlyTo coords={focusCoords} />
                {events.map(ev => (
                  <Marker
                    key={ev.id}
                    position={ev.coords}
                    icon={markerIcon}
                    eventHandlers={{ click: () => handleSelect(ev.id, ev.coords) }}
                  >
                    <Popup>
                      <strong>{ev.title}</strong>
                      <br />
                      {format(parseISO(ev.date), "d MMM yyyy", { locale: nl })} · {ev.time}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          <div className="bg-card border border-accent/30 p-4 flex justify-center">
            <Calendar
              mode="single"
              locale={nl}
              modifiers={{ event: eventDates }}
              modifiersClassNames={{ event: "bg-primary text-primary-foreground font-bold" }}
              onDayClick={(d) => {
                const ev = events.find(e => format(parseISO(e.date), "yyyy-MM-dd") === format(d, "yyyy-MM-dd"));
                if (ev) handleSelect(ev.id, ev.coords);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agenda;
