import { useMemo, useState } from "react";
import { useStore } from "../store/store";
import { TaskRow } from "../components/TaskRow";
import { Chip, SectionTitle, Card } from "../components/ui";
import { dueBucket, todayISO } from "../lib/dates";
import { Plus, Repeat, X } from "lucide-react";
import type { Priority, Task, TaskRecurrence, UserId, Visibility } from "../data/types";
import { ALL_USERS, USER_LIST } from "../data/users";

type Filter = "mias" | "firma" | "atrasadas" | "semana" | "todas";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "mias", label: "Mías" },
  { id: "firma", label: "De la firma" },
  { id: "atrasadas", label: "Atrasadas" },
  { id: "semana", label: "Esta semana" },
  { id: "todas", label: "Todas" },
];

export function Tareas() {
  const { data, currentUser, visible, addTask } = useStore();
  const [filter, setFilter] = useState<Filter>("mias");
  const [creating, setCreating] = useState(false);

  const tasks = useMemo(() => {
    let t = visible(data.tasks);
    if (filter === "mias") t = t.filter((x) => x.owner === currentUser);
    if (filter === "firma") t = t.filter((x) => x.visibleTo.length >= 2);
    if (filter === "atrasadas")
      t = t.filter((x) => !x.done && dueBucket(x.due) === "atrasada");
    if (filter === "semana")
      t = t.filter(
        (x) => !x.done && ["hoy", "semana"].includes(dueBucket(x.due))
      );
    return t;
  }, [data.tasks, filter, currentUser, visible]);

  const groups = useMemo(() => {
    const pend = tasks.filter((t) => !t.done);
    const atrasadas = pend.filter((t) => dueBucket(t.due) === "atrasada");
    const aTiempo = pend.filter((t) => dueBucket(t.due) !== "atrasada");
    const hechas = tasks.filter((t) => t.done);
    return { atrasadas, aTiempo, hechas };
  }, [tasks]);

  const proximaAccion = useMemo(() => {
    const order: Record<Priority, number> = { alta: 0, media: 1, baja: 2 };
    return visible(data.tasks)
      .filter((t) => !t.done && t.owner === currentUser)
      .sort((a, b) => {
        const ba = dueBucket(a.due) === "atrasada" ? 0 : 1;
        const bb = dueBucket(b.due) === "atrasada" ? 0 : 1;
        if (ba !== bb) return ba - bb;
        if (order[a.priority] !== order[b.priority])
          return order[a.priority] - order[b.priority];
        return (a.due ?? "9999").localeCompare(b.due ?? "9999");
      })
      .slice(0, 3);
  }, [data.tasks, currentUser, visible]);

  return (
    <div>
      <SectionTitle kicker="Tareas">
        Lo que <span className="italic text-[var(--color-dorado)]">debe ocurrir</span>
      </SectionTitle>

      {proximaAccion.length > 0 && (
        <Card className="p-4 mb-6">
          <div className="uppercase-label text-[var(--text-faint)] mb-2">
            Próxima acción
          </div>
          <div className="space-y-1.5">
            {proximaAccion.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block rounded-full shrink-0"
                  style={{
                    width: 6,
                    height: 6,
                    background:
                      dueBucket(t.due) === "atrasada"
                        ? "var(--color-rojo)"
                        : t.priority === "alta"
                        ? "var(--color-ambar)"
                        : "var(--color-verde)",
                  }}
                />
                <span className="truncate">{t.title}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-1.5 mb-8">
        {FILTERS.map((f) => (
          <Chip
            key={f.id}
            active={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Chip>
        ))}
      </div>

      <Group title="Atrasadas" tasks={groups.atrasadas} />
      <Group title="A tiempo" tasks={groups.aTiempo} />
      {groups.hechas.length > 0 && (
        <Group title="Completadas" tasks={groups.hechas} muted />
      )}

      {tasks.length === 0 && !creating && (
        <p className="text-[var(--text-faint)] italic py-8 text-center">
          Nada por aquí. Capturá algo con el botón de abajo.
        </p>
      )}

      {creating ? (
        <NewTaskForm
          onSave={(t) => {
            if (!currentUser) return;
            addTask({ ...t, title: t.title!, owner: currentUser });
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] py-3 text-sm text-[var(--text-dim)] hover:text-[var(--color-dorado)] hover:border-[var(--color-dorado)]"
        >
          <Plus size={16} /> Nueva tarea
        </button>
      )}
    </div>
  );
}

function Group({
  title,
  tasks,
  muted,
}: {
  title: string;
  tasks: Task[];
  muted?: boolean;
}) {
  if (!tasks.length) return null;
  return (
    <section className={`mb-8 ${muted ? "opacity-60" : ""}`}>
      <div className="flex items-baseline gap-3 mb-2">
        <h2 className="font-serif text-2xl">{title}</h2>
        <span className="uppercase-label text-[var(--text-faint)] tnum">
          {tasks.length}
        </span>
      </div>
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} />
      ))}
    </section>
  );
}

function NewTaskForm({
  onSave,
  onCancel,
}: {
  onSave: (t: Partial<Task>) => void;
  onCancel: () => void;
}) {
  const { currentUser, data } = useStore();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(todayISO());
  const [priority, setPriority] = useState<Priority>("media");
  const [owner, setOwner] = useState<UserId>(currentUser ?? "nelson");
  const [vis, setVis] = useState<Visibility>([currentUser ?? "nelson"]);
  const [area, setArea] = useState("");
  const [recurrence, setRecurrence] = useState<TaskRecurrence | "">("");
  const [linkedHabitId, setLinkedHabitId] = useState("");

  const myHabits = data.habits.filter((h) => h.owner === owner && !h.archived && !h.deletedAt);

  function toggleVis(u: UserId) {
    setVis((v) => (v.includes(u) ? v.filter((x) => x !== u) : [...v, u]));
  }

  function save() {
    const t = title.trim();
    if (!t) return;
    onSave({
      title: t,
      due: due || null,
      priority,
      owner,
      visibleTo: vis.length ? vis : [owner],
      area: area.trim() || undefined,
      recurrence: recurrence || undefined,
      linkedHabitId: linkedHabitId || undefined,
    });
  }

  return (
    <Card className="p-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <span className="uppercase-label text-[var(--text-faint)]">Nueva tarea</span>
        <button onClick={onCancel} className="text-[var(--text-faint)] hover:text-[var(--text)]">
          <X size={18} />
        </button>
      </div>

      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="¿Qué hay que hacer?"
        className="w-full bg-transparent text-lg font-serif outline-none placeholder:text-[var(--text-faint)] py-2 border-b border-[var(--border)] mb-3"
      />

      <div className="flex flex-wrap gap-2 items-center mb-3">
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
        >
          <option value="alta">Prioridad alta</option>
          <option value="media">Prioridad media</option>
          <option value="baja">Prioridad baja</option>
        </select>
        <input
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="Área / expediente"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] flex-1 min-w-[140px]"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center mb-3">
        <Repeat size={14} className="text-[var(--text-faint)]" />
        <select
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as TaskRecurrence | "")}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
        >
          <option value="">No se repite</option>
          <option value="diaria">Se repite diario</option>
          <option value="semanal">Se repite cada semana</option>
        </select>
        {myHabits.length > 0 && (
          <select
            value={linkedHabitId}
            onChange={(e) => setLinkedHabitId(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          >
            <option value="">Sin vínculo a hábito</option>
            {myHabits.map((h) => (
              <option key={h.id} value={h.id}>
                Vincular a hábito: {h.icon ?? ""} {h.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="uppercase-label text-[var(--text-faint)] w-24">Responsable</span>
        <div className="flex gap-2">
          {USER_LIST.map((u) => (
            <button
              key={u.id}
              onClick={() => setOwner(u.id)}
              className={`rounded-full p-0.5 ${
                owner === u.id ? "ring-2 ring-[var(--color-dorado)]" : "opacity-50 hover:opacity-100"
              }`}
            >
              <span
                className="grid place-items-center rounded-full font-semibold"
                style={{ width: 30, height: 30, background: u.color, color: "#0A1828", fontSize: 11 }}
              >
                {u.initials}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="uppercase-label text-[var(--text-faint)] w-24">¿Quién lo ve?</span>
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

      <div className="flex items-center justify-end pt-3 border-t border-[var(--border)]">
        <button
          onClick={save}
          disabled={!title.trim()}
          className="rounded-xl px-5 py-2.5 font-semibold text-sm disabled:opacity-40 transition-opacity"
          style={{ background: "var(--color-dorado)", color: "#0A1828" }}
        >
          Guardar tarea
        </button>
      </div>
    </Card>
  );
}
