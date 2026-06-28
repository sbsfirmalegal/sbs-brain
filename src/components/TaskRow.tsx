import type { Task } from "../data/types";
import { useStore } from "../store/store";
import { Avatar, PriorityBadge, SemaphoreDot, VisibilityBadge } from "./ui";
import { dueBucket, dueLabel, relativeDays } from "../lib/dates";
import { Link2, Trash2, Repeat, Sparkles, Clock3, Flame, ListChecks } from "lucide-react";

const toneFor = (t: Task) => {
  const b = dueBucket(t.due);
  if (b === "atrasada") return "rojo" as const;
  if (b === "hoy") return "ambar" as const;
  return "verde" as const;
};

export function TaskRow({ task }: { task: Task }) {
  const { toggleTask, deleteTask, postponeTask, convertTaskToHabit, data } = useStore();
  const meeting = task.meetingId
    ? data.meetings.find((m) => m.id === task.meetingId)
    : null;
  const linkedHabit = task.linkedHabitId
    ? data.habits.find((h) => h.id === task.linkedHabitId)
    : null;
  const subtasks = task.subtasks ?? [];
  const subtasksDone = subtasks.filter((s) => s.done).length;

  return (
    <div className="group flex items-start gap-3 py-3.5 border-b border-[var(--border)]">
      <button
        onClick={() => toggleTask(task.id)}
        className={`mt-0.5 grid place-items-center rounded-md border shrink-0 transition-colors ${
          task.done
            ? "bg-[var(--color-verde)] border-[var(--color-verde)]"
            : "border-[var(--border-strong)] hover:border-[var(--color-dorado)]"
        }`}
        style={{ width: 22, height: 22 }}
      >
        {task.done && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#0A1828" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`${task.done ? "line-through text-[var(--text-faint)]" : ""}`}>
            {task.title}
          </span>
          {!task.done && <SemaphoreDot tone={toneFor(task)} />}
          {task.recurrence && (
            <span title={task.recurrence === "semanal" ? "Se repite cada semana" : "Se repite diario"}>
              <Repeat size={12} className="text-[var(--text-faint)]" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 uppercase-label text-[var(--text-faint)]">
          <span>{dueLabel(task.due)}</span>
          {task.area && <span>· {task.area}</span>}
          {subtasks.length > 0 && (
            <span className="flex items-center gap-1">
              <ListChecks size={11} />
              {subtasksDone}/{subtasks.length}
            </span>
          )}
          {linkedHabit && (
            <span className="flex items-center gap-1 text-[var(--color-dorado)]">
              <Flame size={11} />
              {linkedHabit.name.slice(0, 18)}
            </span>
          )}
          {meeting && (
            <span className="flex items-center gap-1">
              <Link2 size={11} />
              {meeting.title.slice(0, 22)}
            </span>
          )}
          {(task.postponeCount ?? 0) > 0 && (
            <span className="text-[var(--color-rojo)]">
              pospuesta {task.postponeCount}×
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!task.done && (
          <button
            onClick={() => postponeTask(task.id, relativeDays(1))}
            title="Posponer 1 día"
            className="text-[var(--text-faint)] hover:text-[var(--color-ambar)] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Clock3 size={15} />
          </button>
        )}
        {!task.done && !task.convertedToHabitId && (
          <button
            onClick={() => convertTaskToHabit(task.id)}
            title="Convertir en hábito"
            className="text-[var(--text-faint)] hover:text-[var(--color-dorado)] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Sparkles size={15} />
          </button>
        )}
        <span className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity">
          <VisibilityBadge v={task.visibleTo} />
        </span>
        <PriorityBadge p={task.priority} />
        <Avatar id={task.owner} size={26} />
        <button
          onClick={() => deleteTask(task.id)}
          className="text-[var(--text-faint)] hover:text-[var(--color-rojo)] opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
