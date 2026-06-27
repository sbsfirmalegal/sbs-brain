import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  X,
  Plus,
  Scale,
  CheckSquare,
  Lock,
  Landmark,
  Trash2,
} from "lucide-react";
import { useStore } from "../store/store";
import { SectionTitle, AvatarStack, VisibilityBadge } from "../components/ui";
import { fmtDay, fmtWeekday, todayISO } from "../lib/dates";
import { visibilityLevel } from "../components/ui";
import type { Meeting, AgreementKind, Priority, UserId } from "../data/types";
import { USERS } from "../data/users";

export function Reuniones() {
  const { data, visible } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const meetings = visible(data.meetings).sort((a, b) =>
    (b.date + b.start).localeCompare(a.date + a.start)
  );
  const open = meetings.find((m) => m.id === openId) || null;

  return (
    <div>
      <SectionTitle kicker="Reuniones" count={`${meetings.length} totales`}>
        Bitácora de <span className="italic text-[var(--color-dorado)]">sesiones</span>
      </SectionTitle>

      <div className="space-y-1">
        {meetings.map((m) => {
          const isToday = m.date === todayISO();
          const status = m.closed
            ? { label: "Cerrada", color: "var(--text-faint)" }
            : isToday
            ? { label: "Próxima", color: "var(--color-dorado)" }
            : { label: "Abierta", color: "var(--color-verde)" };
          return (
            <button
              key={m.id}
              onClick={() => setOpenId(m.id)}
              className="w-full flex items-center gap-4 py-4 border-b border-[var(--border)] text-left hover:bg-[var(--surface)] rounded-lg px-2 transition-colors"
            >
              <div className="w-12 shrink-0 text-center">
                {isToday ? (
                  <span className="uppercase-label text-[var(--color-dorado)]">
                    Hoy
                  </span>
                ) : (
                  <>
                    <div className="font-serif text-2xl tnum leading-none">
                      {fmtDay(m.date).split(" ")[0]}
                    </div>
                    <div className="uppercase-label text-[var(--text-faint)]">
                      {fmtWeekday(m.date)}
                    </div>
                  </>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-lg truncate">{m.title}</span>
                  {visibilityLevel(m.visibleTo) === "todos" ? (
                    <Landmark size={13} className="text-[var(--text-faint)]" />
                  ) : (
                    <Lock size={12} className="text-[var(--text-faint)]" />
                  )}
                </div>
                <div className="uppercase-label text-[var(--text-faint)] tnum mt-0.5">
                  {fmtDay(m.date)} · {m.start}
                </div>
              </div>
              <AvatarStack ids={m.attendees} size={26} />
              <span
                className="uppercase-label rounded-md border px-2 py-1 hidden sm:block"
                style={{ color: status.color, borderColor: status.color + "55" }}
              >
                {status.label}
              </span>
              <ChevronRight size={18} className="text-[var(--text-faint)]" />
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {open && <MeetingDetail meeting={open} onClose={() => setOpenId(null)} />}
      </AnimatePresence>
    </div>
  );
}

function MeetingDetail({
  meeting,
  onClose,
}: {
  meeting: Meeting;
  onClose: () => void;
}) {
  const { data, updateMeeting, deleteMeeting, addTask, currentUser } = useStore();
  const linkedTasks = data.tasks.filter((t) => t.meetingId === meeting.id);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newAgreement, setNewAgreement] = useState("");
  const [agreementKind, setAgreementKind] = useState<AgreementKind>("acuerdo");
  const [newTask, setNewTask] = useState("");
  const [taskOwner, setTaskOwner] = useState<UserId>(currentUser ?? "nelson");
  const [taskPriority, setTaskPriority] = useState<Priority>("media");

  function addAgreement() {
    if (!newAgreement.trim()) return;
    updateMeeting(meeting.id, {
      agreements: [
        ...meeting.agreements,
        {
          id: "ag-" + Math.random().toString(36).slice(2, 7),
          text: newAgreement.trim(),
          kind: agreementKind,
        },
      ],
    });
    setNewAgreement("");
  }

  function addMeetingTask() {
    if (!newTask.trim()) return;
    addTask({
      title: newTask.trim(),
      owner: taskOwner,
      visibleTo: meeting.visibleTo,
      due: null,
      priority: taskPriority,
      meetingId: meeting.id,
    });
    setNewTask("");
  }

  const canClose = meeting.minute.trim().length > 0 &&
    (meeting.agreements.length > 0 || linkedTasks.length > 0);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: "rgba(5,12,24,0.6)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl h-full overflow-y-auto bg-[var(--bg)] border-l border-[var(--border-strong)] p-6"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <VisibilityBadge v={meeting.visibleTo} />
            <span className="uppercase-label text-[var(--text-faint)]">
              {meeting.type}
            </span>
          </div>
          <button onClick={onClose} className="text-[var(--text-faint)] hover:text-[var(--text)]">
            <X size={20} />
          </button>
        </div>

        <h2 className="font-serif text-3xl leading-tight">{meeting.title}</h2>
        <div className="flex items-center gap-3 mt-2 text-[var(--text-dim)]">
          <span className="tnum">
            {fmtDay(meeting.date)} · {meeting.start}
            {meeting.end && ` – ${meeting.end}`}
          </span>
          <AvatarStack ids={meeting.attendees} size={24} />
        </div>
        <div className="gold-rule my-5" />

        {/* Minuta */}
        <Section icon={<Scale size={15} />} title="Minuta">
          <textarea
            value={meeting.minute}
            onChange={(e) => updateMeeting(meeting.id, { minute: e.target.value })}
            placeholder="Resumen de lo conversado…"
            rows={4}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm outline-none focus:border-[var(--border-strong)] resize-none"
          />
        </Section>

        {/* Acuerdos */}
        <Section icon={<Scale size={15} />} title="Acuerdos y decisiones">
          <div className="space-y-2 mb-3">
            {meeting.agreements.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <span
                  className="uppercase-label rounded px-1.5 py-0.5 shrink-0"
                  style={{
                    color: a.kind === "acuerdo" ? "var(--color-dorado)" : "var(--color-verde)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {a.kind}
                </span>
                <div>
                  <p className="text-sm">{a.text}</p>
                  {a.legalBasis && (
                    <p className="uppercase-label text-[var(--text-faint)] mt-1">
                      {a.legalBasis}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {meeting.agreements.length === 0 && (
              <p className="text-sm text-[var(--text-faint)] italic">
                Sin acuerdos registrados.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={agreementKind}
              onChange={(e) => setAgreementKind(e.target.value as AgreementKind)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 text-sm"
            >
              <option value="acuerdo">Acuerdo</option>
              <option value="decision">Decisión</option>
            </select>
            <input
              value={newAgreement}
              onChange={(e) => setNewAgreement(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAgreement()}
              placeholder="Nuevo acuerdo o decisión…"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={addAgreement}
              className="rounded-lg px-3"
              style={{ background: "var(--color-dorado)", color: "#0A1828" }}
            >
              <Plus size={16} />
            </button>
          </div>
        </Section>

        {/* Tareas */}
        <Section icon={<CheckSquare size={15} />} title="Tareas asignadas">
          <div className="space-y-2 mb-3">
            {linkedTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
              >
                <span
                  className="grid place-items-center rounded-full font-semibold shrink-0"
                  style={{
                    width: 24, height: 24,
                    background: USERS[t.owner].color, color: "#0A1828", fontSize: 10,
                  }}
                >
                  {USERS[t.owner].initials}
                </span>
                <span className={t.done ? "line-through text-[var(--text-faint)]" : ""}>
                  {t.title}
                </span>
              </div>
            ))}
            {linkedTasks.length === 0 && (
              <p className="text-sm text-[var(--text-faint)] italic">
                Ninguna tarea derivada aún.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMeetingTask()}
              placeholder="Nueva tarea de esta reunión…"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none"
            />
            <select
              value={taskOwner}
              onChange={(e) => setTaskOwner(e.target.value as UserId)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 text-sm"
            >
              {meeting.attendees.map((id) => (
                <option key={id} value={id}>{USERS[id].name}</option>
              ))}
            </select>
            <button
              onClick={addMeetingTask}
              className="rounded-lg px-3"
              style={{ background: "var(--color-dorado)", color: "#0A1828" }}
            >
              <Plus size={16} />
            </button>
          </div>
        </Section>

        {/* Cerrar / Eliminar */}
        <div className="mt-8 pt-5 border-t border-[var(--border)] space-y-3">
          {meeting.closed ? (
            <button
              onClick={() => updateMeeting(meeting.id, { closed: false })}
              className="uppercase-label text-[var(--text-dim)] hover:text-[var(--color-dorado)]"
            >
              Reabrir reunión
            </button>
          ) : (
            <>
              <button
                disabled={!canClose}
                onClick={() => {
                  updateMeeting(meeting.id, { closed: true });
                  onClose();
                }}
                className="w-full rounded-xl py-3 font-semibold disabled:opacity-40"
                style={{ background: "var(--color-dorado)", color: "#0A1828" }}
              >
                Cerrar reunión
              </button>
              {!canClose && (
                <p className="text-xs text-[var(--text-faint)] text-center mt-2">
                  Requiere minuta + al menos un acuerdo o tarea (Art. 53 Estatutos).
                </p>
              )}
            </>
          )}

          {/* Eliminar reunión */}
          <button
            onClick={async () => {
              if (!confirmDelete) { setConfirmDelete(true); return; }
              await deleteMeeting(meeting.id);
              onClose();
            }}
            className={`flex items-center gap-1.5 text-sm rounded-xl px-3 py-2 transition-all ${
              confirmDelete
                ? "bg-red-500/20 text-red-400 border border-red-500/40 w-full justify-center"
                : "text-[var(--text-faint)] hover:text-red-400"
            }`}
          >
            <Trash2 size={15} />
            {confirmDelete ? "¿Confirmar eliminación de la reunión?" : "Eliminar reunión"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 uppercase-label text-[var(--text-dim)] mb-3">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}
