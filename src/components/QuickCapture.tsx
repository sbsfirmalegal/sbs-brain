import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  StickyNote,
  CheckSquare,
  CalendarPlus,
  Users,
  X,
} from "lucide-react";
import { useStore } from "../store/store";
import type { Priority, UserId, Visibility } from "../data/types";
import { ALL_USERS, USER_LIST, USERS } from "../data/users";
import { relativeDays, todayISO } from "../lib/dates";

type Kind = "tarea" | "nota" | "evento" | "reunion";

/** Detecta la intención a partir del texto libre. */
function detectKind(text: string): Kind {
  const t = text.toLowerCase();
  if (/\b(reuni[oó]n|sesi[oó]n|junta|cita con)\b/.test(t)) return "reunion";
  if (/^(idea|nota|reflexi[oó]n)\s*:/.test(t) || /^idea\b/.test(t)) return "nota";
  if (/\b(\d{1,2}\s?(am|pm)|\d{1,2}:\d{2}|ma[ñn]ana|hoy|el \d+)\b/.test(t))
    return "evento";
  return "tarea";
}

const KIND_META: Record<Kind, { label: string; icon: typeof Plus }> = {
  nota: { label: "Nota", icon: StickyNote },
  tarea: { label: "Tarea", icon: CheckSquare },
  evento: { label: "Evento", icon: CalendarPlus },
  reunion: { label: "Reunión", icon: Users },
};

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Kind | null>(null);
  const { currentUser, addTask, addNote, addEvent, addMeeting } = useStore();

  // campos
  const [owner, setOwner] = useState<UserId>(currentUser ?? "nelson");
  const [vis, setVis] = useState<Visibility>([currentUser ?? "nelson"]);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("09:00");
  const [timeEnd, setTimeEnd] = useState("");
  const [priority, setPriority] = useState<Priority>("media");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") reset();
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (currentUser) {
      setOwner(currentUser);
      setVis([currentUser]);
    }
  }, [currentUser]);

  const detected = text.trim() ? detectKind(text) : null;
  const active = kind ?? detected;

  function reset() {
    setOpen(false);
    setText("");
    setKind(null);
    setDate(todayISO());
    setTime("09:00");
    setTimeEnd("");
    setPriority("media");
    setVis([currentUser ?? "nelson"]);
  }

  function toggleVis(u: UserId) {
    setVis((v) =>
      v.includes(u) ? v.filter((x) => x !== u) : [...v, u]
    );
  }

  async function save() {
    const title = text.trim();
    if (!title || !active) return;
    const visibleTo = vis.length ? vis : [owner];
    if (active === "tarea")
      await addTask({ title, owner, visibleTo, due: date, priority });
    else if (active === "nota")
      await addNote({ title, owner, visibleTo, type: "idea" });
    else if (active === "evento")
      await addEvent({ title, owner, visibleTo, date, start: time });
    else if (active === "reunion") {
      const m = await addMeeting({
        title,
        date,
        start: time,
        end: timeEnd || undefined,
        attendees: visibleTo,
        visibleTo,
      });
      if (m) {
        await addEvent({
          title,
          owner,
          visibleTo,
          date,
          start: time,
          end: timeEnd || undefined,
          kind: "reunion",
          meetingId: m.id,
        });
      }
    }
    reset();
  }

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 grid place-items-center rounded-full shadow-lg"
        style={{
          width: 60,
          height: 60,
          background: "var(--color-dorado)",
          color: "#0A1828",
          boxShadow: "0 8px 30px rgba(201,168,76,0.35)",
        }}
        aria-label="Captura rápida"
      >
        <Plus size={28} strokeWidth={2.5} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: "rgba(5,12,24,0.6)", backdropFilter: "blur(4px)" }}
            onClick={reset}
          >
            <motion.div
              initial={{ y: 18, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 18, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="uppercase-label text-[var(--text-faint)]">
                  Captura rápida
                </span>
                <button onClick={reset} className="text-[var(--text-faint)] hover:text-[var(--text)]">
                  <X size={18} />
                </button>
              </div>

              <input
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) save();
                }}
                placeholder="Escribí algo… ej: «Reunión con Estela mañana 10am»"
                className="w-full bg-transparent text-lg font-serif outline-none placeholder:text-[var(--text-faint)] py-2"
              />

              {/* selector de tipo */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                {(Object.keys(KIND_META) as Kind[]).map((k) => {
                  const M = KIND_META[k];
                  const isActive = active === k;
                  const isDetected = detected === k && !kind;
                  return (
                    <button
                      key={k}
                      onClick={() => setKind(k)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 transition-all ${
                        isActive
                          ? "border-[var(--color-dorado)] bg-[var(--color-dorado)]/10 text-[var(--color-dorado)]"
                          : "border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      <M.icon size={18} />
                      <span className="text-xs font-medium">{M.label}</span>
                      {isDetected && (
                        <span className="text-[9px] uppercase tracking-wider text-[var(--color-dorado)]">
                          auto
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* campos contextuales */}
              {active && (
                <div className="mt-4 space-y-3 animate-fadein">
                  {(active === "evento" || active === "reunion" || active === "tarea") && (
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                      />
                      {(active === "evento" || active === "reunion") && (
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm tnum"
                        />
                      )}
                      {active === "reunion" && (
                        <>
                          <span className="text-[var(--text-faint)] text-sm">→</span>
                          <input
                            type="time"
                            value={timeEnd}
                            onChange={(e) => setTimeEnd(e.target.value)}
                            placeholder="fin"
                            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm tnum w-[110px] placeholder:text-[var(--text-faint)]"
                          />
                        </>
                      )}
                      {active === "tarea" && (
                        <>
                          <button
                            onClick={() => setDate(todayISO())}
                            className="uppercase-label text-[var(--text-dim)] hover:text-[var(--color-dorado)] px-2"
                          >
                            Hoy
                          </button>
                          <button
                            onClick={() => setDate(relativeDays(1))}
                            className="uppercase-label text-[var(--text-dim)] hover:text-[var(--color-dorado)] px-2"
                          >
                            Mañana
                          </button>
                        </>
                      )}
                      {active === "tarea" && (
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as Priority)}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm ml-auto"
                        >
                          <option value="alta">Prioridad alta</option>
                          <option value="media">Prioridad media</option>
                          <option value="baja">Prioridad baja</option>
                        </select>
                      )}
                    </div>
                  )}

                  {active === "tarea" && (
                    <div className="flex items-center gap-2">
                      <span className="uppercase-label text-[var(--text-faint)] w-24">
                        Responsable
                      </span>
                      <div className="flex gap-2">
                        {USER_LIST.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => setOwner(u.id)}
                            className={`rounded-full p-0.5 ${
                              owner === u.id
                                ? "ring-2 ring-[var(--color-dorado)]"
                                : "opacity-50 hover:opacity-100"
                            }`}
                          >
                            <span
                              className="grid place-items-center rounded-full font-semibold"
                              style={{
                                width: 30,
                                height: 30,
                                background: u.color,
                                color: "#0A1828",
                                fontSize: 11,
                              }}
                            >
                              {u.initials}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* visibilidad */}
                  <div className="flex items-center gap-2">
                    <span className="uppercase-label text-[var(--text-faint)] w-24">
                      ¿Quién lo ve?
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {USER_LIST.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => toggleVis(u.id)}
                          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all ${
                            vis.includes(u.id)
                              ? "border-[var(--color-dorado)] text-[var(--text)]"
                              : "border-[var(--border)] text-[var(--text-faint)]"
                          }`}
                        >
                          <span
                            className="rounded-full"
                            style={{
                              width: 14,
                              height: 14,
                              background: vis.includes(u.id) ? u.color : "transparent",
                              border: `1px solid ${u.color}`,
                            }}
                          />
                          {u.name}
                        </button>
                      ))}
                      <button
                        onClick={() => setVis([...ALL_USERS])}
                        className="uppercase-label text-[var(--text-dim)] hover:text-[var(--color-dorado)] px-2"
                      >
                        Los 3
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-5 pt-4 border-t border-[var(--border)]">
                <span className="text-xs text-[var(--text-faint)]">
                  Enter para guardar · Esc para cerrar
                </span>
                <button
                  onClick={save}
                  disabled={!text.trim() || !active}
                  className="rounded-xl px-5 py-2.5 font-semibold text-sm disabled:opacity-40 transition-opacity"
                  style={{ background: "var(--color-dorado)", color: "#0A1828" }}
                >
                  Guardar {active ? KIND_META[active].label.toLowerCase() : ""}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
