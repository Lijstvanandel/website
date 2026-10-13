import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  ArrowRight,
  BookOpen,
  CalendarCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventItem } from "@/data/events";
import { cn, extractCity } from "@/lib/utils";

interface AgendaCalendarProps {
  events?: EventItem[];
  selectedEventId?: string;
  onSelectEvent?: (eventId: string) => void;
  className?: string;
}

const MONTH_NAMES_NL = [
  "Januari",
  "Februari",
  "Maart",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Augustus",
  "September",
  "Oktober",
  "November",
  "December",
];

const WEEKDAY_NAMES_NL = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export const AgendaCalendar: React.FC<AgendaCalendarProps> = ({
  events = [],
  selectedEventId,
  onSelectEvent,
  className,
}) => {
  // Determine initial month: if an event is selected or if there are upcoming events, center on first event or today
  const today = useMemo(() => new Date(), []);
  const todayDateStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [today]);

  const [currentYear, setCurrentYear] = useState<number>(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Group events by date string "YYYY-MM-DD"
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    events.forEach((ev) => {
      if (!ev.date) return;
      const key = ev.date.split("T")[0];
      const arr = map.get(key) || [];
      arr.push(ev);
      map.set(key, arr);
    });
    return map;
  }, [events]);

  // Synchronize when selectedEventId changes externally (from map or list)
  useEffect(() => {
    if (!selectedEventId) return;
    const matched = events.find((e) => e.id === selectedEventId);
    if (matched && matched.date) {
      const datePart = matched.date.split("T")[0];
      setSelectedDate(datePart);
      const [y, m] = datePart.split("-").map(Number);
      if (y && m) {
        setCurrentYear(y);
        setCurrentMonth(m - 1);
      }
    }
  }, [selectedEventId, events]);

  // If initial load has upcoming events in a future month, automatically show that month if current month has no events
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      const thisMonthHasEvents = events.some((e) => {
        if (!e.date) return false;
        const [y, m] = e.date.split("T")[0].split("-").map(Number);
        return y === currentYear && m - 1 === currentMonth;
      });
      if (!thisMonthHasEvents) {
        // Pick the nearest event
        const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const first = sorted[0];
        if (first && first.date) {
          const [fy, fm, fd] = first.date.split("T")[0].split("-").map(Number);
          if (fy && fm) {
            setCurrentYear(fy);
            setCurrentMonth(fm - 1);
            setSelectedDate(`${fy}-${String(fm).padStart(2, "0")}-${String(fd).padStart(2, "0")}`);
          }
        }
      }
    }
  }, [events]);

  // Calendar navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleResetToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(todayDateStr);
  };

  // Build grid days
  const calendarCells = useMemo(() => {
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayWeekday = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // 0 = Ma, 6 = Zo

    const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();

    interface CellData {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isPast: boolean;
      events: EventItem[];
    }

    const cells: CellData[] = [];

    // 1. Previous month trailing days
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevM = currentMonth === 0 ? 12 : currentMonth;
      const dateStr = `${prevY}-${String(prevM).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const cellEvents = eventsByDate.get(dateStr) || [];
      const cellDate = new Date(prevY, prevM - 1, dayNum, 23, 59, 59);

      cells.push({
        dayNumber: dayNum,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        isSelected: dateStr === selectedDate,
        isPast: cellDate.getTime() < today.getTime(),
        events: cellEvents,
      });
    }

    // 2. Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const cellEvents = eventsByDate.get(dateStr) || [];
      const cellDate = new Date(currentYear, currentMonth, d, 23, 59, 59);

      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayDateStr,
        isSelected: dateStr === selectedDate,
        isPast: cellDate.getTime() < today.getTime(),
        events: cellEvents,
      });
    }

    // 3. Next month leading days (fill up to full 35 or 42 grid cells)
    const totalNeeded = cells.length > 35 ? 42 : 35;
    const remaining = totalNeeded - cells.length;
    for (let n = 1; n <= remaining; n++) {
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const nextM = currentMonth === 11 ? 1 : currentMonth + 2;
      const dateStr = `${nextY}-${String(nextM).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
      const cellEvents = eventsByDate.get(dateStr) || [];

      cells.push({
        dayNumber: n,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        isSelected: dateStr === selectedDate,
        isPast: false,
        events: cellEvents,
      });
    }

    return cells;
  }, [currentYear, currentMonth, eventsByDate, todayDateStr, selectedDate, today]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate.get(selectedDate) || [];
  }, [selectedDate, eventsByDate]);

  // Events in the active month
  const currentMonthEvents = useMemo(() => {
    return events.filter((ev) => {
      if (!ev.date) return false;
      const [y, m] = ev.date.split("T")[0].split("-").map(Number);
      return y === currentYear && m - 1 === currentMonth;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, currentYear, currentMonth]);

  const handleCellClick = (cellDateStr: string, cellEvents: EventItem[]) => {
    setSelectedDate(cellDateStr);
    if (cellEvents.length > 0 && onSelectEvent) {
      onSelectEvent(cellEvents[0].id);
    }
  };

  // Formatted selected date string in Dutch (e.g. "Donderdag 12 november 2026")
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return null;
    try {
      const [y, m, d] = selectedDate.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className={cn("bg-card border border-border rounded-xl overflow-hidden shadow-lg flex flex-col", className)}>
      {/* Top Header Bar */}
      <div className="p-4 md:p-6 bg-secondary/50 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold flex items-center gap-1.5 mb-1">
              <CalendarIcon className="w-3.5 h-3.5" /> Kalenderoverzicht
            </div>
            <h3 className="font-display text-2xl text-foreground capitalize">
              {MONTH_NAMES_NL[currentMonth]} {currentYear}
            </h3>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToday}
              className="text-xs h-8 px-2.5 border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground"
            >
              Vandaag
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              aria-label="Vorige maand"
              className="h-8 w-8 hover:bg-accent/15"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              aria-label="Volgende maand"
              className="h-8 w-8 hover:bg-accent/15"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="p-4 md:p-6 flex-1 flex flex-col">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2 text-center">
          {WEEKDAY_NAMES_NL.map((day) => (
            <div
              key={day}
              className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarCells.map((cell) => {
            const hasEvents = cell.events.length > 0;
            const isClickable = cell.isCurrentMonth || hasEvents;

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => handleCellClick(cell.dateStr, cell.events)}
                disabled={!isClickable}
                className={cn(
                  "relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all duration-200 group",
                  cell.isCurrentMonth ? "text-foreground" : "text-muted-foreground/35 opacity-40",
                  cell.isSelected
                    ? "bg-primary text-primary-foreground font-bold shadow-md ring-2 ring-primary ring-offset-2 ring-offset-card"
                    : cell.isToday
                    ? "border border-accent text-accent font-semibold hover:bg-accent/10"
                    : hasEvents
                    ? "bg-accent/15 hover:bg-accent/25 font-semibold text-foreground border border-accent/40"
                    : "hover:bg-secondary/70",
                  hasEvents && !cell.isSelected && "shadow-xs"
                )}
                title={
                  hasEvents
                    ? `${cell.dayNumber} ${MONTH_NAMES_NL[currentMonth]}: ${cell.events.map((e) => e.title).join(", ")}`
                    : `${cell.dayNumber} ${MONTH_NAMES_NL[currentMonth]}`
                }
              >
                <span className="leading-none">{cell.dayNumber}</span>

                {/* Event Indicator Dot / Count */}
                {hasEvents && (
                  <span
                    className={cn(
                      "absolute bottom-1 w-1.5 h-1.5 rounded-full transition-transform",
                      cell.isSelected ? "bg-accent scale-125" : "bg-emerald-600 dark:bg-emerald-400 group-hover:scale-125"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Date Details / Month Overview Section */}
        <div className="mt-6 pt-5 border-t border-border flex-1 flex flex-col">
          {selectedDate && selectedDateEvents.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-accent capitalize flex items-center gap-1.5">
                  <CalendarCheck2 className="w-3.5 h-3.5" />
                  {formattedSelectedDate}
                </div>
                <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border">
                  {selectedDateEvents.length} {selectedDateEvents.length === 1 ? "bijeenkomst" : "bijeenkomsten"}
                </span>
              </div>

              {selectedDateEvents.map((ev) => {
                const isSelectedEv = selectedEventId === ev.id;
                const eventCity = ev.city || extractCity(ev.address);

                return (
                  <div
                    key={ev.id}
                    className={cn(
                      "p-3.5 rounded-lg border transition-all text-xs bg-card/60",
                      isSelectedEv
                        ? "border-accent ring-1 ring-accent bg-accent/5"
                        : "border-border hover:border-accent/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">
                        {ev.title}
                      </h4>
                      <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-semibold uppercase tracking-wider rounded shrink-0">
                        {ev.isPublic ? "Publiek" : "Leden"}
                      </span>
                    </div>

                    <div className="space-y-1 text-muted-foreground mb-3">
                      {ev.startTime && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-accent shrink-0" />
                          <span>
                            {ev.startTime} {ev.endTime ? `– ${ev.endTime}` : ""}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-accent shrink-0" />
                        <span className="truncate">
                          {ev.isAttending ? ev.fullAddress || ev.address : `Plaats: ${eventCity}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                      {onSelectEvent && (
                        <button
                          type="button"
                          onClick={() => onSelectEvent(ev.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:text-accent/80 transition-colors"
                        >
                          <MapPin className="w-3 h-3" /> Toon op kaart
                        </button>
                      )}
                      <Link
                        to={`/agenda/${ev.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/80 hover:text-primary transition-colors ml-auto"
                      >
                        <BookOpen className="w-3 h-3 text-accent" /> Bekijk details
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : selectedDate && selectedDateEvents.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground space-y-2">
              <p>Geen bijeenkomsten gepland op <strong className="text-foreground">{formattedSelectedDate}</strong>.</p>
              {currentMonthEvents.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedDate(currentMonthEvents[0].date?.split("T")[0] || null)}
                  className="text-accent hover:underline font-semibold text-[11px]"
                >
                  Toon eerste bijeenkomst in {MONTH_NAMES_NL[currentMonth]} →
                </button>
              ) : (
                <p className="text-[11px] text-muted-foreground/75">
                  Blader naar de volgende maand om geplande data te bekijken.
                </p>
              )}
            </div>
          ) : (
            /* Default Month Overview when no specific date is clicked */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground/90">
                  Bijeenkomsten in {MONTH_NAMES_NL[currentMonth]}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {currentMonthEvents.length} gepland
                </span>
              </div>

              {currentMonthEvents.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  <p>Geen geplande bijeenkomsten in deze maand.</p>
                  <p className="text-[11px] text-muted-foreground/75 mt-1">
                    Gebruik de pijltjes om andere maanden te bekijken.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                  {currentMonthEvents.map((ev) => {
                    const dateFormatted = ev.date
                      ? new Date(ev.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
                      : "";
                    const isSelectedEv = selectedEventId === ev.id;

                    return (
                      <div
                        key={ev.id}
                        onClick={() => {
                          if (ev.date) setSelectedDate(ev.date.split("T")[0]);
                          if (onSelectEvent) onSelectEvent(ev.id);
                        }}
                        className={cn(
                          "p-2.5 rounded-lg border text-xs cursor-pointer transition-colors flex items-center justify-between gap-3",
                          isSelectedEv
                            ? "bg-accent/15 border-accent text-foreground"
                            : "border-border/70 hover:border-accent/40 bg-card/60"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-foreground truncate">{ev.title}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>{dateFormatted}</span>
                            {ev.startTime && <span>• {ev.startTime}</span>}
                            <span>• {ev.city || extractCity(ev.address)}</span>
                          </div>
                        </div>

                        <span className="text-accent text-[11px] font-semibold shrink-0">
                          Bekijk →
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info Strip */}
      <div className="px-6 py-3 bg-secondary/30 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 inline-block" />
            Datum met bijeenkomst
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border border-accent inline-block" />
            Vandaag
          </span>
        </div>
        <div className="font-medium text-foreground/80">
          {events.length} {events.length === 1 ? "gepland evenement" : "geplande evenementen"}
        </div>
      </div>
    </div>
  );
};

export default AgendaCalendar;
