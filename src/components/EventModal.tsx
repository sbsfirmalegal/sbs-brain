import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import { useStore } from "../store/store";
import type { CalEvent, EventCategory, EventKind, UserId, Visibility } from "../data/types";
import { ALL_USERS, USER_LIST } from "../data/users";
import { CATEGORIES } from "../lib/eventCategories";
import { datesInRangeByWeekday } from "../lib/dates";

const WEEKDAYS: { label: string; value: number }[] = [
  { label: "L", value: 1 },
  { label: "M", value: 2 },
  { label: "X", value: 3 },
  { label: "J", value: 4 },
  { label: "V", value: 5 },
  { label: "S", value: 6 },
  { label: "D", value: 0 },
];

interface Props {
  /** Fecha ISO pre-cargada al crear */
  initialDate?: string;
  /** Hora pre-cargada al crear (HH:mm) */
  initialTime?: string;
  /** Evento a editar. Si está presente, es modo edición */
  event?: CalEvent;
  onClose: () => void;
}

export function EventModal({ initialDate, initialTime, event, onClose }: Props) {
  const { currentUser, addEvent, updateEvent, deleteEvent } = useStore();

  const [title, setTitle] = useState(event?.title ?? "");
  const [kind, setKind] = useState<EventKind>(event?.kind ?? "evento");
  const [category, setCategory] = useState<EventCategory | undefined>(event?.category);
  const [date, setDate] = useState(event?.date ?? initialDate ?? "");
  const [start, setStart] = useState(event?.start ?? initialTime ?? "09:00");
  const [end, setEnd] = useState(event?.end ?? "");
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [location, setLocation] = useState(event?.location ?? "");
  const [reminderMinutes, setReminderMinutes] = useState<number | "">(
    event?.reminderMinutes ?? ""
  );
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [vis, setVis] = useState<Visibility>(
    event?.visibleTo ?? [currentUser ?? "nelson"]
  );
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [repeatUntil, setRepeatUntil] = useState("");

  const isEdit = !!event;
  const isOwner = !event || event.owner === currentUser;

  function toggleRepeatDay(v: number) {
    setRepeatDays((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleVis(u: UserId) {
    setVis((v) => (v.includes(u) ? v.filter((x) => x !== u) : [...v, u]));
  }

  async function save() {
    if (!title.trim() || !date) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      kind,
      category,
      date,
      start: allDay ? "00:00" : start,
      end: allDay ? undefined : (end || undefined),
      allDay,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      reminderMinutes: allDay || reminderMinutes === "" ? undefined : reminderMinutes,
      visibleTo: vis.length ? vis : [currentUser ?? "nelson"],
    };
    if (isEdit) {
      await updateEvent(event.id, payload);
    } else {
      const dates =
        repeatDays.length > 0 && repeatUntil
          ? datesInRangeByWeekday(date, repeatUntil, repeatDays)
          : [date];
      await Promise.all(
        dates.map((d) =>
          addEvent({ ...payload, date: d, owner: currentUser ?? "nelson" })
        )
      );
    }
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await deleteEvent(event.id);
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ background: "rgba(5,12,24,0.65)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 16, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 16, opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", damping: 28, stiffness: 340 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 shadow-2xl"
        >
          {/* Encabezado */}
          <div className="flex items-center justify-between mb-5">
            <span className="uppercase-label text-[var(--text-faint)]">
              {isEdit ? "Editar evento" : "Nuevo evento"}
            </span>
            <button onClick={onClose} className="text-[var(--text-faint)] hover:text-[var(--text)]">
              <X size={18} />
            </button>
          </div>

          {/* Título */}
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) save(); }}
            placeholder="Título del evento"
            className="w-full bg-transparent text-xl font-serif outline-none placeholder:text-[var(--text-faint)] pb-3 border-b border-[var(--border)] mb-5"
          />

          {/* Tipo */}
          <div className="flex gap-2 mb-4">
            {(["evento", "reunion"] as EventKind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`uppercase-label px-4 py-2 rounded-xl border transition-all ${
                  kind === k
                    ? "border-[var(--color-dorado)] bg-[var(--color-dorado)]/10 text-[var(--color-dorado)]"
                    : "border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-strong)]"
                }`}
              >
                {k === "evento" ? "Evento" : "Reunión"}
              </button>
            ))}
          </div>

          {/* Categoría */}
          <div className="mb-4">
            <div className="uppercase-label text-[var(--text-faint)] mb-2">Categoría</div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(active ? undefined : c.id)}
                    className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all"
                    style={{
                      borderColor: active ? c.color : "var(--border)",
                      background: active ? `${c.color}22` : "transparent",
                      color: active ? c.color : "var(--text-dim)",
                    }}
                  >
                    <Icon size={12} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggle todo el día */}
          <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="accent-[var(--color-dorado)] w-4 h-4"
            />
            <span className="text-sm text-[var(--text-dim)]">Todo el día</span>
          </label>

          {/* Fecha y horas */}
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm flex-1 min-w-[140px]"
            />
            {!allDay && (
              <>
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm tnum w-[110px]"
                />
                <span className="self-center text-[var(--text-faint)] text-sm">→</span>
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  placeholder="fin"
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm tnum w-[110px] placeholder:text-[var(--text-faint)]"
                />
              </>
            )}
          </div>

          {/* Repetir en varios días (solo al crear) */}
          {!isEdit && (
            <div className="mb-4">
              <div className="uppercase-label text-[var(--text-faint)] mb-2">
                Repetir (opcional)
              </div>
              <div className="flex gap-1 mb-2">
                {WEEKDAYS.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => toggleRepeatDay(w.value)}
                    className={`w-8 h-8 rounded-lg border text-xs font-semibold transition-all ${
                      repeatDays.includes(w.value)
                        ? "border-[var(--color-dorado)] bg-[var(--color-dorado)]/10 text-[var(--color-dorado)]"
                        : "border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
              {repeatDays.length > 0 && (
                <input
                  type="date"
                  value={repeatUntil}
                  onChange={(e) => setRepeatUntil(e.target.value)}
                  min={date}
                  placeholder="Repetir hasta…"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                />
              )}
              {repeatDays.length > 0 && repeatUntil && date && (
                <p className="text-xs text-[var(--text-faint)] mt-1.5">
                  Se crearán {datesInRangeByWeekday(date, repeatUntil, repeatDays).length} eventos, uno por cada día marcado.
                </p>
              )}
            </div>
          )}

          {/* Ubicación */}
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ubicación (opcional)"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm mb-3 placeholder:text-[var(--text-faint)]"
          />

          {/* Recordatorio */}
          {!allDay && (
            <div className="mb-3">
              <div className="uppercase-label text-[var(--text-faint)] mb-2">Recordatorio</div>
              <select
                value={reminderMinutes}
                onChange={(e) =>
                  setReminderMinutes(e.target.value === "" ? "" : parseInt(e.target.value))
                }
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              >
                <option value="">Al llegar el día (sin anticipación)</option>
                <option value={10}>10 minutos antes</option>
                <option value={30}>30 minutos antes</option>
                <option value={60}>1 hora antes</option>
                <option value={1440}>1 día antes</option>
              </select>
            </div>
          )}

          {/* Notas */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas (opcional)"
            rows={2}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm mb-4 placeholder:text-[var(--text-faint)] resize-none"
          />

          {/* Visibilidad */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="uppercase-label text-[var(--text-faint)] w-20">¿Quién lo ve?</span>
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
                      width: 12,
                      height: 12,
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

          {/* Acciones */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--border)]">
            {isEdit && isOwner ? (
              <button
                onClick={handleDelete}
                className={`flex items-center gap-1.5 text-sm rounded-xl px-3 py-2 transition-all ${
                  confirmDelete
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : "text-[var(--text-faint)] hover:text-red-400"
                }`}
              >
                <Trash2 size={15} />
                {confirmDelete ? "¿Confirmar eliminación?" : "Eliminar"}
              </button>
            ) : (
              <span className="text-xs text-[var(--text-faint)]">
                {isEdit && !isOwner ? "Solo el creador puede editar" : "Enter para guardar"}
              </span>
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-dim)] hover:border-[var(--border-strong)]"
              >
                {isEdit && !isOwner ? "Cerrar" : "Cancelar"}
              </button>
              {(!isEdit || isOwner) && (
                <button
                  onClick={save}
                  disabled={!title.trim() || !date || saving}
                  className="rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-40 transition-opacity"
                  style={{ background: "var(--color-dorado)", color: "#0A1828" }}
                >
                  {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear evento"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
