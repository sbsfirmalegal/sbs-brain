import { useMemo, useState } from "react";
import { useStore, TRASH_RETENTION_DAYS } from "../store/store";
import { Card, SectionTitle, Chip, Avatar } from "../components/ui";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { fmtDay } from "../lib/dates";
import {
  CheckSquare,
  Calendar,
  Users,
  StickyNote,
  Flame,
  Target,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { TrashKind, UserId } from "../data/types";

type Filter = "todas" | TrashKind;

const KIND_META: Record<TrashKind, { label: string; icon: typeof CheckSquare }> = {
  task: { label: "Tarea", icon: CheckSquare },
  event: { label: "Evento", icon: Calendar },
  meeting: { label: "Reunión", icon: Users },
  note: { label: "Nota", icon: StickyNote },
  habit: { label: "Hábito", icon: Flame },
  goal: { label: "Meta", icon: Target },
};

interface TrashItem {
  kind: TrashKind;
  id: string;
  title: string;
  owner: UserId;
  deletedAt: string;
}

export function Papelera() {
  const { data, trashed, restoreItem, purgeItem } = useStore();
  const [filter, setFilter] = useState<Filter>("todas");
  const [confirming, setConfirming] = useState<string | null>(null);

  const items = useMemo<TrashItem[]>(() => {
    const all: TrashItem[] = [
      ...trashed(data.tasks).map((t) => ({
        kind: "task" as const,
        id: t.id,
        title: t.title,
        owner: t.owner,
        deletedAt: t.deletedAt!,
      })),
      ...trashed(data.events).map((e) => ({
        kind: "event" as const,
        id: e.id,
        title: e.title,
        owner: e.owner,
        deletedAt: e.deletedAt!,
      })),
      ...trashed(data.meetings).map((m) => ({
        kind: "meeting" as const,
        id: m.id,
        title: m.title,
        owner: m.attendees[0],
        deletedAt: m.deletedAt!,
      })),
      ...trashed(data.notes).map((n) => ({
        kind: "note" as const,
        id: n.id,
        title: n.title,
        owner: n.owner,
        deletedAt: n.deletedAt!,
      })),
      ...trashed(data.habits).map((h) => ({
        kind: "habit" as const,
        id: h.id,
        title: h.name,
        owner: h.owner,
        deletedAt: h.deletedAt!,
      })),
      ...trashed(data.goals).map((g) => ({
        kind: "goal" as const,
        id: g.id,
        title: g.title,
        owner: g.owner,
        deletedAt: g.deletedAt!,
      })),
    ];
    return all
      .filter((it) => filter === "todas" || it.kind === filter)
      .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  }, [data, trashed, filter]);

  return (
    <div>
      <SectionTitle kicker="Papelera" count={items.length}>
        Lo que <span className="italic text-[var(--color-dorado)]">se borró</span>
      </SectionTitle>

      <p className="text-sm text-[var(--text-dim)] mb-6">
        Lo eliminado se guarda acá durante {TRASH_RETENTION_DAYS} días antes de borrarse para siempre.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-8">
        <Chip active={filter === "todas"} onClick={() => setFilter("todas")}>
          Todas
        </Chip>
        {(Object.keys(KIND_META) as TrashKind[]).map((k) => (
          <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
            {KIND_META[k].label}
          </Chip>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-[var(--text-faint)] italic py-8 text-center">
          La papelera está vacía.
        </p>
      )}

      <div className="space-y-2">
        {items.map((it) => {
          const Icon = KIND_META[it.kind].icon;
          const daysLeft = Math.max(
            0,
            TRASH_RETENTION_DAYS - differenceInCalendarDays(new Date(), parseISO(it.deletedAt))
          );
          return (
            <Card key={`${it.kind}-${it.id}`} className="p-4 flex items-center gap-3">
              <Icon size={16} className="text-[var(--text-faint)] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{it.title}</div>
                <div className="uppercase-label text-[var(--text-faint)] mt-0.5">
                  {KIND_META[it.kind].label} · borrado {fmtDay(it.deletedAt.slice(0, 10))} ·{" "}
                  {daysLeft === 0 ? "se borra hoy" : `${daysLeft}d para borrarse`}
                </div>
              </div>
              <Avatar id={it.owner} size={24} />
              <button
                onClick={() => restoreItem(it.kind, it.id)}
                title="Restaurar"
                className="text-[var(--text-faint)] hover:text-[var(--color-verde)] p-1.5"
              >
                <RotateCcw size={16} />
              </button>
              {confirming === it.id ? (
                <button
                  onClick={() => {
                    purgeItem(it.kind, it.id);
                    setConfirming(null);
                  }}
                  className="uppercase-label text-[var(--color-rojo)] px-2 py-1.5 border border-[var(--color-rojo)] rounded-lg"
                >
                  Confirmar
                </button>
              ) : (
                <button
                  onClick={() => setConfirming(it.id)}
                  title="Eliminar para siempre"
                  className="text-[var(--text-faint)] hover:text-[var(--color-rojo)] p-1.5"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
