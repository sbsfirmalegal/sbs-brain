import { useMemo, useState } from "react";
import { useStore } from "../store/store";
import { TaskRow } from "../components/TaskRow";
import { Chip, SectionTitle } from "../components/ui";
import { dueBucket } from "../lib/dates";
import type { Task } from "../data/types";

type Filter = "mias" | "firma" | "atrasadas" | "semana" | "todas";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "mias", label: "Mías" },
  { id: "firma", label: "De la firma" },
  { id: "atrasadas", label: "Atrasadas" },
  { id: "semana", label: "Esta semana" },
  { id: "todas", label: "Todas" },
];

export function Tareas() {
  const { data, currentUser, visible } = useStore();
  const [filter, setFilter] = useState<Filter>("mias");

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

  return (
    <div>
      <SectionTitle kicker="Tareas">
        Lo que <span className="italic text-[var(--color-dorado)]">debe ocurrir</span>
      </SectionTitle>

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

      {tasks.length === 0 && (
        <p className="text-[var(--text-faint)] italic py-8 text-center">
          Nada por aquí. Capturá algo con el botón dorado.
        </p>
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
