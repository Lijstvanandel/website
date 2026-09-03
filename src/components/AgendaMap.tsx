import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Navigation, Calendar, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Custom Leaflet DivIcon for searched address
const searchedAddressIcon = L.divIcon({
  className: "custom-searched-marker",
  html: `
    <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
      <div style="background: linear-gradient(135deg, #e6c875, #c6a858); width: 38px; height: 38px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;">
        <div style="transform: rotate(45deg); color: #0c1c14; font-size: 16px; font-weight: 800; line-height: 1;">📍</div>
      </div>
      <div style="width: 12px; height: 5px; background: rgba(0,0,0,0.45); border-radius: 50%; margin-top: 3px; filter: blur(1px);"></div>
    </div>
  `,
  iconSize: [38, 46],
  iconAnchor: [0, 0],
  popupAnchor: [0, -46],
});

// Custom Leaflet DivIcon for agenda events
const eventMarkerIcon = L.divIcon({
  className: "custom-event-marker",
  html: `
    <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
      <div style="background: linear-gradient(135deg, #2d6a4f, #1e4533); width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #c6a858; box-shadow: 0 4px 12px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;">
        <div style="transform: rotate(45deg); color: #e6c875; font-size: 14px; font-weight: bold; line-height: 1;">📅</div>
      </div>
      <div style="width: 10px; height: 4px; background: rgba(0,0,0,0.4); border-radius: 50%; margin-top: 2px; filter: blur(1px);"></div>
    </div>
  `,
  iconSize: [34, 40],
  iconAnchor: [0, 0],
  popupAnchor: [0, -40],
});

// Helper component to smoothly move map
function ChangeMapView({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, zoom || 14, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Invalidate size on initial mount to prevent grey tiles
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Click handler to drop a marker anywhere by clicking on the map
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export interface AgendaEventLocation {
  id: string;
  title: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  address: string;
  lat?: number;
  lng?: number;
  isPublic?: boolean;
  isCancelled?: boolean;
}

interface AgendaMapProps {
  events?: AgendaEventLocation[];
  selectedEventId?: string;
  onSelectEvent?: (eventId: string) => void;
  defaultAddress?: string;
}

// Steenwijk centrum defaults
const STEENWIJK_CENTER: [number, number] = [52.7885, 6.1172];

export const AgendaMap: React.FC<AgendaMapProps> = ({
  events = [],
  selectedEventId,
  onSelectEvent,
  defaultAddress = "",
}) => {
  const [addressInput, setAddressInput] = useState(defaultAddress);
  const [activeMarker, setActiveMarker] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(STEENWIJK_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [loading, setLoading] = useState<boolean>(false);
  const [resolvedEvents, setResolvedEvents] = useState<AgendaEventLocation[]>([]);

  // Geocode an address string using server endpoint or OSM fallback
  const geocodeAddress = async (query: string): Promise<{ lat: number; lng: number; displayName: string } | null> => {
    if (!query.trim()) return null;
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.lat === "number" && typeof data.lng === "number") {
          return {
            lat: data.lat,
            lng: data.lng,
            displayName: data.displayName || query,
          };
        }
      }
    } catch (e) {
      console.warn("Geocode error via server proxy, trying direct lookup", e);
    }

    // Direct Nominatim fallback
    try {
      let q = query.trim();
      if (!q.toLowerCase().includes("steenwijk") && !q.toLowerCase().includes("steenwijkerland")) {
        q += ", Steenwijkerland";
      }
      const directRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`
      );
      if (directRes.ok) {
        const directData = await directRes.json();
        if (Array.isArray(directData) && directData.length > 0) {
          return {
            lat: parseFloat(directData[0].lat),
            lng: parseFloat(directData[0].lon),
            displayName: directData[0].display_name,
          };
        }
      }
    } catch (e) {
      console.error("Direct geocoding error:", e);
    }

    return null;
  };

  // Search user-input address
  const handleSearchAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!addressInput.trim()) return;

    setLoading(true);
    const result = await geocodeAddress(addressInput);
    setLoading(false);

    if (result) {
      setActiveMarker({
        lat: result.lat,
        lng: result.lng,
        label: result.displayName || addressInput,
      });
      setMapCenter([result.lat, result.lng]);
      setMapZoom(15);
    } else {
      // Default to Steenwijk with label if not found
      setActiveMarker({
        lat: STEENWIJK_CENTER[0],
        lng: STEENWIJK_CENTER[1],
        label: `${addressInput} (Centrum Steenwijkerland)`,
      });
      setMapCenter(STEENWIJK_CENTER);
      setMapZoom(13);
    }
  };

  // Handle map click to drop marker
  const handleMapClick = async (lat: number, lng: number) => {
    setActiveMarker({
      lat,
      lng,
      label: `Geprikt adres: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    });
    setMapCenter([lat, lng]);

    // Reverse lookup displayName
    try {
      const revRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      if (revRes.ok) {
        const revData = await revRes.json();
        if (revData && revData.display_name) {
          const shortAddress = revData.display_name.split(",").slice(0, 3).join(",");
          setAddressInput(shortAddress);
          setActiveMarker({
            lat,
            lng,
            label: shortAddress,
          });
        }
      }
    } catch (e) {
      console.debug("Reverse lookup note:", e);
    }
  };

  // Pre-resolve coordinates for events that have an address
  useEffect(() => {
    let isMounted = true;

    async function resolveAllEvents() {
      const updated: AgendaEventLocation[] = [];
      for (const ev of events) {
        if (!ev.address) {
          updated.push(ev);
          continue;
        }

        // If event already has lat/lng, keep it
        if (ev.lat && ev.lng) {
          updated.push(ev);
          continue;
        }

        // Try quick geocode
        const res = await geocodeAddress(ev.address);
        if (res && isMounted) {
          updated.push({
            ...ev,
            lat: res.lat,
            lng: res.lng,
          });
        } else {
          updated.push(ev);
        }
      }
      if (isMounted) {
        setResolvedEvents(updated);
      }
    }

    if (events.length > 0) {
      resolveAllEvents();
    } else {
      setResolvedEvents([]);
    }

    return () => {
      isMounted = false;
    };
  }, [events]);

  // When selectedEventId changes, center map on that event
  useEffect(() => {
    if (selectedEventId) {
      const ev = resolvedEvents.find((e) => e.id === selectedEventId);
      if (ev) {
        if (ev.lat && ev.lng) {
          setMapCenter([ev.lat, ev.lng]);
          setMapZoom(16);
          setActiveMarker({
            lat: ev.lat,
            lng: ev.lng,
            label: `${ev.title} — ${ev.address}`,
          });
        } else if (ev.address) {
          geocodeAddress(ev.address).then((res) => {
            if (res) {
              setMapCenter([res.lat, res.lng]);
              setMapZoom(16);
              setActiveMarker({
                lat: res.lat,
                lng: res.lng,
                label: `${ev.title} — ${ev.address}`,
              });
            }
          });
        }
      }
    }
  }, [selectedEventId, resolvedEvents]);

  // Reset to Steenwijk center
  const resetToCenter = () => {
    setMapCenter(STEENWIJK_CENTER);
    setMapZoom(12);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg mb-12">
      {/* Top Search & Controls Bar */}
      <div className="p-4 md:p-6 bg-secondary/50 border-b border-border">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5" /> Interactieve Kaart
            </div>
            <h3 className="font-display text-2xl text-foreground">Locatie & Adres Zoeken</h3>
            <p className="text-xs text-muted-foreground">
              Voer een adres in of klik direct op de kaart om een marker te plaatsen en de locatie te bekijken.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={resetToCenter}
            className="text-xs border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground"
          >
            <Navigation className="w-3.5 h-3.5 mr-1.5" /> Centrum Steenwijk
          </Button>
        </div>

        <form onSubmit={handleSearchAddress} className="flex flex-col sm:flex-row gap-2 mt-2">
          <div className="relative flex-1">
            <MapPin className="w-4 h-4 text-accent absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Voer een adres in (bijv. Markt 1, Steenwijk of De Meenthe)..."
              className="pl-9 pr-9 bg-background/80 border-border text-sm h-11"
            />
            {addressInput && (
              <button
                type="button"
                onClick={() => setAddressInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold uppercase tracking-wider text-xs h-11 px-6 whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Zoeken...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" /> Toon op kaart
              </>
            )}
          </Button>
        </form>

        {activeMarker && (
          <div className="mt-3 text-xs flex items-center gap-2 text-accent bg-accent/10 py-1.5 px-3 rounded border border-accent/20">
            <span className="font-semibold">Geselecteerde marker:</span>
            <span className="truncate text-foreground/90">{activeMarker.label}</span>
          </div>
        )}
      </div>

      {/* Leaflet Map Canvas */}
      <div className="relative w-full h-[380px] sm:h-[440px] md:h-[500px] z-0">
        <MapContainer
          center={STEENWIJK_CENTER}
          zoom={12}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ minHeight: "100%", zIndex: 0 }}
        >
          <InvalidateSize />
          <ChangeMapView center={mapCenter} zoom={mapZoom} />
          <MapClickHandler onMapClick={handleMapClick} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Searched / Clicked Address Marker */}
          {activeMarker && (
            <Marker
              position={[activeMarker.lat, activeMarker.lng]}
              icon={searchedAddressIcon}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-1 text-xs">
                  <div className="font-semibold text-accent mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Gekozen Locatie
                  </div>
                  <div className="text-foreground leading-snug">{activeMarker.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {activeMarker.lat.toFixed(5)}, {activeMarker.lng.toFixed(5)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Markers for Agenda Events */}
          {resolvedEvents.map((ev) => {
            if (!ev.lat || !ev.lng) return null;
            return (
              <Marker
                key={ev.id}
                position={[ev.lat, ev.lng]}
                icon={eventMarkerIcon}
                eventHandlers={{
                  click: () => {
                    if (onSelectEvent) onSelectEvent(ev.id);
                  },
                }}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-1.5 text-xs min-w-[200px]">
                    <div className="font-display text-base text-accent mb-1 leading-tight">{ev.title}</div>
                    {ev.date && (
                      <div className="text-muted-foreground flex items-center gap-1 mb-1">
                        <Calendar className="w-3 h-3 text-accent" /> {ev.date}
                        {ev.startTime && ` • ${ev.startTime}`}
                      </div>
                    )}
                    {ev.address && (
                      <div className="text-foreground flex items-start gap-1 font-medium mt-1.5 border-t border-border/50 pt-1.5">
                        <MapPin className="w-3 h-3 text-accent shrink-0 mt-0.5" />
                        <span>{ev.address}</span>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Footer Info Strip */}
      <div className="px-6 py-3 bg-secondary/30 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-accent inline-block" /> Ingevoerd adres / marker
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#2d6a4f] inline-block border border-accent" /> Agenda evenement
          </span>
        </div>
        <div>Gemeente Steenwijkerland • OpenStreetMap</div>
      </div>
    </div>
  );
};

export default AgendaMap;
