import { useEffect, useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  addWeeks,
  addDays,
  format,
  isSameMonth,
  isToday,
  parseISO,
  isSameDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, MapPin, Clock, Plus } from "lucide-react";
import { useStore } from "../store/store";
import { iso } from "../lib/dates";
import { visibilityLevel, VisibilityBadge, AvatarStack } from "../components/ui";
import { EventModal } from "../components/EventModal";
import type { CalEvent } from "../data/types";

type View = "dia" | "semana" | "mes";

interface ModalState {
  initialDate?: string;
  initialTime?: string;
  event?: CalEvent;
}

const visColor = (e: CalEvent) => {
  const lvl = visibilityLevel(e.visibleTo);
  if (lvl === "privado") return "var(--color-marino-500)";
  if (lvl === "compartido") return "var(--color-dorado)";
  return "var(--color-verde)";
};

export function Agenda() {
  const { data, visible } = useStore();
  const [view, setView] = useState<View>("mes");
  const [cursor, setCursor] = useState(new Date());
  const [modal, setModal] = useState<ModalState | null>(null);

  const events = visible(data.events);
  const byDay = useMemo(() => {
    const m: Record<string, CalEvent[]> = {};
    events.forEach((e) => (m[e.date] = [...(m[e.date] || []), e]));
    Object.values(m).forEach((arr) =>
      arr.sort((a, b) => a.start.localeCompare(b.start))
    );
    return m;
  }, [events]);

  const headerLabel = useMemo(() => {
    if (view === "dia")
      return format(cursor, "EEEE, d 'de' MMMM", { locale: es });
    if (view === "semana") {
      const s = startOfWeek(cursor, { weekStartsOn: 1 });
      const e = endOfWeek(cursor, { weekStartsOn: 1 });
      return `${format(s, "d MMM", { locale: es })} – ${format(e, "d MMM yyyy", {
        locale: es,
      })}`;
    }
    return format(cursor, "MMMM yyyy", { locale: es });
  }, [view, cursor]);

  function step(dir: -1 | 1) {
    if (view === "dia") setCursor(addDays(cursor, dir));
    if (view === "semana") setCursor(addWeeks(cursor, dir));
    if (view === "mes") setCursor(addMonths(cursor, dir));
  }

  function openCreate(date: string, time?: string) {
    setModal({ initialDate: date, initialTime: time });
  }

  function openEdit(event: CalEvent) {
    setModal({ event });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
        <div>
          <div className="uppercase-label text-[var(--text-faint)] mb-1">
            Agenda
          </div>
          <h1 className="font-serif text-4xl md:text-5xl capitalize">
            {view === "mes" ? (
              <>
                {format(cursor, "MMMM", { locale: es })}{" "}
                <span className="italic text-[var(--color-dorado)]">
                  {format(cursor, "yyyy")}
                </span>
              </>
            ) : (
              <span className="capitalize-first">{headerLabel}</span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón nuevo evento */}
          <button
            onClick={() => openCreate(iso(cursor))}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--color-dorado)", color: "#0A1828" }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Nuevo evento
          </button>

          {/* Selector de vista */}
          <div className="flex rounded-xl border border-[var(--border)] p-1 bg-[var(--surface)]">
            {(["dia", "semana", "mes"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`uppercase-label px-3 py-1.5 rounded-lg transition-colors ${
                  view === v
                    ? "bg-[var(--color-dorado)] text-[#0A1828]"
                    : "text-[var(--text-dim)] hover:text-[var(--text)]"
                }`}
              >
                {v === "dia" ? "Día" : v === "semana" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
          <button
            onClick={() => step(-1)}
            className="rounded-lg border border-[var(--border)] p-2 hover:border-[var(--border-strong)]"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="uppercase-label rounded-lg border border-[var(--border)] px-3 py-2 hover:border-[var(--border-strong)]"
          >
            Hoy
          </button>
          <button
            onClick={() => step(1)}
            className="rounded-lg border border-[var(--border)] p-2 hover:border-[var(--border-strong)]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 my-5">
        <Legend color="var(--color-marino-500)" label="Privado" />
        <Legend color="var(--color-dorado)" label="Compartido con socia" />
        <Legend color="var(--color-verde)" label="Los 3 socios" />
      </div>

      {view === "mes" && (
        <MonthView
          cursor={cursor}
          byDay={byDay}
          onCreateEvent={openCreate}
          onEditEvent={openEdit}
        />
      )}
      {view === "semana" && (
        <WeekView
          cursor={cursor}
          byDay={byDay}
          onCreateEvent={openCreate}
          onEditEvent={openEdit}
        />
      )}
      {view === "dia" && (
        <DayView
          cursor={cursor}
          byDay={byDay}
          onCreateEvent={openCreate}
          onEditEvent={openEdit}
        />
      )}

      {modal && (
        <EventModal
          initialDate={modal.initialDate}
          initialTime={modal.initialTime}
          event={modal.event}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* --------------- VISTA MES --------------- */
function MonthView({
  cursor,
  byDay,
  onCreateEvent,
  onEditEvent,
}: {
  cursor: Date;
  byDay: Record<string, CalEvent[]>;
  onCreateEvent: (date: string, time?: string) => void;
  onEditEvent: (e: CalEvent) => void;
}) {
  const [selected, setSelected] = useState<string | null>(iso(new Date()));
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);
  const selEvents = selected ? byDay[selected] || [] : [];

  return (
    <>
      <div className="grid grid-cols-7 gap-px rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--border)]">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <div
            key={d}
            className="bg-[var(--surface)] py-2 text-center uppercase-label text-[var(--text-faint)]"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = iso(day);
          const evs = byDay[key] || [];
          const inMonth = isSameMonth(day, cursor);
          const isSelected = selected === key;
          return (
            <div
              key={key}
              onClick={() => setSelected(key)}
              className={`group relative min-h-[92px] bg-[var(--bg)] p-2 text-left align-top transition-colors cursor-pointer hover:bg-[var(--surface)] ${
                !inMonth ? "opacity-35" : ""
              } ${isSelected ? "ring-1 ring-inset ring-[var(--color-dorado)]" : ""}`}
            >
              {/* Número del día + botón "+" */}
              <div className="flex items-center justify-between mb-1">
                <div
                  className={`text-sm tnum ${
                    isToday(day)
                      ? "grid place-items-center rounded-full w-6 h-6 font-semibold"
                      : "text-[var(--text-dim)]"
                  }`}
                  style={
                    isToday(day)
                      ? { background: "var(--color-dorado)", color: "#0A1828" }
                      : {}
                  }
                >
                  {format(day, "d")}
                </div>
                {/* "+" aparece en hover */}
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onCreateEvent(key);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-0.5 hover:bg-[var(--color-dorado)]/20 text-[var(--text-faint)] hover:text-[var(--color-dorado)]"
                >
                  <Plus size={13} strokeWidth={2.5} />
                </button>
              </div>
              <div className="space-y-1">
                {evs.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEditEvent(e);
                    }}
                    className="flex items-center gap-1 text-[11px] truncate w-full text-left hover:opacity-75 transition-opacity"
                  >
                    <span
                      className="rounded-full shrink-0"
                      style={{ width: 6, height: 6, background: visColor(e) }}
                    />
                    <span className="truncate text-[var(--text-dim)]">
                      {e.title}
                    </span>
                  </button>
                ))}
                {evs.length > 3 && (
                  <div className="text-[10px] text-[var(--text-faint)]">
                    +{evs.length - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selected && (
        <div className="mt-6 animate-fadein">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-2xl capitalize">
              {format(parseISO(selected), "EEEE d 'de' MMMM", { locale: es })}
            </h3>
            <button
              onClick={() => onCreateEvent(selected)}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-dim)] hover:border-[var(--color-dorado)] hover:text-[var(--color-dorado)] transition-colors"
            >
              <Plus size={14} />
              Agregar evento
            </button>
          </div>
          {selEvents.length === 0 ? (
            <p className="text-[var(--text-faint)] italic">
              Sin eventos este día.
            </p>
          ) : (
            <EventList events={selEvents} onEdit={onEditEvent} />
          )}
        </div>
      )}
    </>
  );
}

/* --------------- VISTA SEMANA --------------- */
function WeekView({
  cursor,
  byDay,
  onCreateEvent,
  onEditEvent,
}: {
  cursor: Date;
  byDay: Record<string, CalEvent[]>;
  onCreateEvent: (date: string, time?: string) => void;
  onEditEvent: (e: CalEvent) => void;
}) {
  const days = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const hours = Array.from({ length: 14 }, (_, i) => 7 + i); // 7am – 8pm
  const HOUR_HEIGHT = 56; // px por hora

  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(i);
  }, []);

  const now = new Date();
  const minsSince7 = (now.getHours() - 7) * 60 + now.getMinutes();
  const nowPosition = (minsSince7 / 60) * HOUR_HEIGHT;
  const showNow = minsSince7 >= 0 && minsSince7 <= 14 * 60;

  const evPosition = (start: string, end?: string) => {
    const [h, m] = start.split(":").map(Number);
    const top = ((h - 7) * 60 + m) * (HOUR_HEIGHT / 60);
    let height = HOUR_HEIGHT * 0.85;
    if (end) {
      const [eh, em] = end.split(":").map(Number);
      const mins = (eh - h) * 60 + (em - m);
      height = Math.max(HOUR_HEIGHT * 0.5, (mins / 60) * HOUR_HEIGHT);
    }
    return { top, height };
  };

  function timeFromY(y: number): string {
    const hourFloat = y / HOUR_HEIGHT;
    const totalMins = Math.round(hourFloat * 2) * 30; // snap a 30 min
    const h = Math.floor(totalMins / 60) + 7;
    const m = totalMins % 60;
    return `${String(Math.min(h, 20)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--surface)]">
      {/* Encabezado de días */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-[var(--border)]">
        <div className="border-r border-[var(--border)]" />
        {days.map((day) => {
          const today = isToday(day);
          return (
            <button
              key={iso(day)}
              onClick={() => onCreateEvent(iso(day))}
              className={`group px-2 py-3 text-left border-r border-[var(--border)] last:border-r-0 transition-colors hover:bg-[var(--surface-2)] ${
                today ? "bg-[var(--surface-2)]" : ""
              }`}
            >
              <div className="uppercase-label text-[var(--text-faint)]">
                {format(day, "EEE", { locale: es })}
              </div>
              <div className="flex items-center justify-between">
                <div
                  className={`font-serif text-2xl tnum ${
                    today ? "text-[var(--color-dorado)]" : ""
                  }`}
                >
                  {format(day, "d")}
                </div>
                <Plus
                  size={13}
                  className="opacity-0 group-hover:opacity-60 transition-opacity text-[var(--text-faint)]"
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Grid de horas */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] relative">
        {/* Columna de horas */}
        <div className="border-r border-[var(--border)]">
          {hours.map((h) => (
            <div
              key={h}
              style={{ height: HOUR_HEIGHT }}
              className="flex items-start justify-end pr-2 pt-1 text-[10px] tnum text-[var(--text-faint)]"
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* 7 columnas de días */}
        {days.map((day) => {
          const key = iso(day);
          const evs = byDay[key] || [];
          const today = isToday(day);
          return (
            <div
              key={key}
              className="relative border-r border-[var(--border)] last:border-r-0 cursor-pointer"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const relY = e.clientY - rect.top;
                onCreateEvent(key, timeFromY(relY));
              }}
            >
              {hours.map((h) => (
                <div
                  key={h}
                  style={{ height: HOUR_HEIGHT }}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
                />
              ))}

              {/* Línea "ahora" en la columna del día actual */}
              {today && showNow && (
                <div
                  className="absolute left-0 right-0 flex items-center pointer-events-none z-20"
                  style={{ top: nowPosition }}
                >
                  <span
                    className="rounded-full"
                    style={{
                      width: 8,
                      height: 8,
                      background: "var(--color-dorado)",
                      marginLeft: -3,
                      boxShadow: "0 0 0 3px rgba(201,168,76,0.18)",
                    }}
                  />
                  <div
                    className="flex-1 h-px"
                    style={{ background: "var(--color-dorado)" }}
                  />
                </div>
              )}

              {/* Eventos del día */}
              {evs.map((e) => {
                const { top, height } = evPosition(e.start, e.end);
                return (
                  <button
                    key={e.id}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEditEvent(e);
                    }}
                    className="absolute left-1 right-1 rounded-md border-l-[3px] bg-[var(--surface-2)] p-1.5 shadow-sm overflow-hidden text-left hover:brightness-110 transition-all z-10"
                    style={{
                      top,
                      height,
                      borderLeftColor: visColor(e),
                    }}
                  >
                    <div className="uppercase-label tnum text-[var(--text-faint)] text-[9px] leading-none">
                      {e.start}
                      {e.end && `–${e.end}`}
                    </div>
                    <div className="font-medium text-[11px] leading-tight mt-0.5 line-clamp-2">
                      {e.title}
                    </div>
                    {e.location && height > HOUR_HEIGHT && (
                      <div className="italic text-[9px] text-[var(--text-dim)] mt-0.5 truncate">
                        {e.location}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------- VISTA DÍA --------------- */
function DayView({
  cursor,
  byDay,
  onCreateEvent,
  onEditEvent,
}: {
  cursor: Date;
  byDay: Record<string, CalEvent[]>;
  onCreateEvent: (date: string, time?: string) => void;
  onEditEvent: (e: CalEvent) => void;
}) {
  const key = iso(cursor);
  const evs = byDay[key] || [];
  const hours = Array.from({ length: 14 }, (_, i) => 7 + i); // 7am – 8pm

  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(i);
  }, []);

  const isCurrentDay = isSameDay(cursor, new Date());
  const now = new Date();
  const minsSince7 = (now.getHours() - 7) * 60 + now.getMinutes();

  const evPosition = (start: string, end?: string) => {
    const [h, m] = start.split(":").map(Number);
    const top = ((h - 7) * 60 + m) * (60 / 60);
    let height = 50;
    if (end) {
      const [eh, em] = end.split(":").map(Number);
      height = Math.max(40, (eh - h) * 60 + (em - m));
    }
    return { top, height };
  };

  function timeFromY(y: number): string {
    const totalMins = Math.round(y / 60) * 60 + 7 * 60;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${String(Math.min(h, 20)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--surface)]">
      <div className="relative grid grid-cols-[64px_1fr]">
        {/* Columna horas */}
        <div className="border-r border-[var(--border)]">
          {hours.map((h) => (
            <div
              key={h}
              className="h-[60px] flex items-start justify-end pr-2 pt-1 text-xs tnum text-[var(--text-faint)]"
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Columna eventos — click en franja vacía abre modal */}
        <div
          className="relative cursor-pointer"
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const relY = e.clientY - rect.top;
            const time = timeFromY(relY);
            onCreateEvent(key, time);
          }}
        >
          {hours.map((h) => (
            <div
              key={h}
              className="h-[60px] border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
            />
          ))}

          {/* Línea "ahora" */}
          {isCurrentDay && minsSince7 >= 0 && minsSince7 <= 14 * 60 && (
            <div
              className="absolute left-0 right-0 flex items-center pointer-events-none z-20"
              style={{ top: minsSince7 }}
            >
              <span
                className="rounded-full"
                style={{
                  width: 9,
                  height: 9,
                  background: "var(--color-dorado)",
                  marginLeft: -4,
                  boxShadow: "0 0 0 4px rgba(201,168,76,0.18)",
                }}
              />
              <div
                className="flex-1 h-px"
                style={{ background: "var(--color-dorado)" }}
              />
            </div>
          )}

          {/* Eventos */}
          {evs.map((e) => {
            const { top, height } = evPosition(e.start, e.end);
            return (
              <button
                key={e.id}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onEditEvent(e);
                }}
                className="absolute left-2 right-2 rounded-lg border-l-[3px] bg-[var(--surface-2)] p-2 shadow-sm overflow-hidden text-left hover:brightness-110 transition-all z-10"
                style={{
                  top,
                  height,
                  borderLeftColor: visColor(e),
                }}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="uppercase-label tnum text-[var(--text-faint)]">
                    {e.start}
                    {e.end && ` – ${e.end}`}
                  </span>
                </div>
                <div className="font-medium text-sm leading-tight">
                  {e.title}
                </div>
                {e.location && (
                  <div className="italic text-xs text-[var(--text-dim)] mt-0.5 flex items-center gap-1">
                    <MapPin size={11} /> {e.location}
                  </div>
                )}
              </button>
            );
          })}

          {evs.length === 0 && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <p className="text-[var(--text-faint)] italic">
                Click en cualquier franja para agregar un evento.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventList({
  events,
  onEdit,
}: {
  events: CalEvent[];
  onEdit: (e: CalEvent) => void;
}) {
  return (
    <div className="space-y-2">
      {events.map((e) => (
        <button
          key={e.id}
          onClick={() => onEdit(e)}
          className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 w-full text-left hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <span
            className="mt-1 rounded-full shrink-0"
            style={{ width: 10, height: 10, background: visColor(e) }}
          />
          <div className="flex-1">
            <div className="font-medium">{e.title}</div>
            <div className="flex items-center gap-3 text-xs text-[var(--text-dim)] mt-1">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {e.start}
                {e.end && `–${e.end}`}
              </span>
              {e.location && (
                <span className="flex items-center gap-1 italic">
                  <MapPin size={12} />
                  {e.location}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <VisibilityBadge v={e.visibleTo} />
            <AvatarStack ids={e.visibleTo} size={22} />
          </div>
        </button>
      ))}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
      <span
        className="rounded-full"
        style={{ width: 10, height: 10, background: color }}
      />
      {label}
    </span>
  );
}
