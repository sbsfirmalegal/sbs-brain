import type { Task } from "../data/types";
import { useStore } from "../store/store";
import { Avatar, PriorityBadge, SemaphoreDot, VisibilityBadge } from "./ui";
import { dueBucket, dueLabel } from "../lib/dates";
import { Link2 } from "lucide-react";

const toneFor = (t: Task) => {
  const b = dueBucket(t.due);
  if (b === "atrasada") return "rojo" as const;
  if (b === "hoy") return "ambar" as const;
  return "verde" as const;
};

export function TaskRow({ task }: { task: Task }) {
  const { toggleTask, data } = useStore();
  const meeting = task.meetingId
    ? data.meetings.find((m) => m.id === task.meetingId)
    : null;

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
        </div>
        <div className="flex items-center gap-2 mt-1 uppercase-label text-[var(--text-faint)]">
          <span>{dueLabel(task.due)}</span>
          {meeting && (
            <span className="flex items-center gap-1">
              <Link2 size={11} />
              {meeting.title.slice(0, 22)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity">
          <VisibilityBadge v={task.visibleTo} />
        </span>
        <PriorityBadge p={task.priority} />
        <Avatar id={task.owner} size={26} />
      </div>
    </div>
  );
}
