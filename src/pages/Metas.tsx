import { useState } from "react";
import {
  Plus,
  Target,
  Building2,
  Heart,
  Trash2,
  Pause,
  Play,
  Trophy,
  Minus,
} from "lucide-react";
import { useStore } from "../store/store";
import { SectionTitle, Card, AvatarStack, VisibilityBadge, Chip } from "../components/ui";
import type { Goal, GoalScope, UserId, Visibility } from "../data/types";
import { ALL_USERS, USER_LIST } from "../data/users";
import { parseISO, differenceInCalendarDays, format } from "date-fns";
import { es } from "date-fns/locale";

type Filter = "todas" | "firma" | "personal" | "logradas";

export function Metas() {
  const { data, currentUser, visible, addGoal, updateGoal, deleteGoal } =
    useStore();
  const [filter, setFilter] = useState<Filter>("todas");
  const [creating, setCreating] = useState(false);

  const goals = visible(data.goals)
    .filter((g) => {
      if (filter === "firma") return g.scope === "firma" && g.status !== "lograda";
      if (filter === "personal")
        return g.scope === "personal" && g.status !== "lograda";
      if (filter === "logradas") return g.status === "lograda";
      return g.status !== "lograda";
    })
    .sort((a, b) =>
      (a.due ?? "9999").localeCompare(b.due ?? "9999")
    );

  return (
    <div>
      <SectionTitle kicker="Metas">
        Lo que <span className="italic text-[var(--color-dorado)]">quiero lograr</span>
      </SectionTitle>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {(["todas", "firma", "personal", "logradas"] as Filter[]).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {goals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            onUpdate={(p) => updateGoal(g.id, p)}
            onDelete={() => deleteGoal(g.id)}
          />
        ))}
      </div>

      {goals.length === 0 && !creating && (
        <p className="text-center text-[var(--text-faint)] italic py-8">
          Sin metas en esta vista.
        </p>
      )}

      {creating ? (
        <NewGoalForm
          onSave={(g) => {
            if (!currentUser) return;
            addGoal({ ...g, title: g.title!, owner: currentUser });
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] py-3 text-sm text-[var(--text-dim)] hover:text-[var(--color-dorado)] hover:border-[var(--color-dorado)]"
        >
          <Plus size={16} /> Nueva meta
        </button>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  onUpdate,
  onDelete,
}: {
  goal: Goal;
  onUpdate: (p: Partial<Goal>) => void;
  onDelete: () => void;
}) {
  const pct = goal.target
    ? Math.min(100, Math.round(((goal.current ?? 0) / goal.target) * 100))
    : 0;
  const daysLeft = goal.due
    ? differenceInCalendarDays(parseISO(goal.due), new Date())
    : null;

  const ScopeIcon = goal.scope === "firma" ? Building2 : Heart;
  const scopeColor =
    goal.scope === "firma" ? "var(--color-dorado)" : "var(--color-verde)";

  return (
    <Card className="p-5 group flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 uppercase-label" style={{ color: scopeColor }}>
          <ScopeIcon size={13} />
          {goal.scope}
        </div>
        <VisibilityBadge v={goal.visibleTo} />
      </div>

      <h3 className="font-serif text-xl leading-tight mb-2">{goal.title}</h3>
      {goal.description && (
        <p className="text-sm text-[var(--text-dim)] italic mb-3">
          {goal.description}
        </p>
      )}

      {/* Progreso */}
      {goal.target && (
        <div className="mt-2">
          <div className="flex items-baseline justify-between mb-1">
            <span className="tnum text-sm">
              <span className="font-serif text-2xl text-[var(--color-dorado)]">
                {goal.current ?? 0}
              </span>
              <span className="text-[var(--text-faint)]"> / {goal.target}</span>
              {goal.unit && (
                <span className="uppercase-label text-[var(--text-faint)] ml-1">
                  {goal.unit}
                </span>
              )}
            </span>
            <span className="uppercase-label text-[var(--text-faint)] tnum">
              {pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${pct}%`,
                background: pct >= 100 ? "var(--color-verde)" : scopeColor,
              }}
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() =>
                onUpdate({ current: Math.max(0, (goal.current ?? 0) - 1) })
              }
              className="rounded-lg border border-[var(--border)] p-1 hover:border-[var(--border-strong)]"
            >
              <Minus size={13} />
            </button>
            <button
              onClick={() => onUpdate({ current: (goal.current ?? 0) + 1 })}
              className="rounded-lg border border-[var(--border)] p-1 hover:border-[var(--border-strong)]"
            >
              <Plus size={13} />
            </button>
            <span className="text-xs text-[var(--text-faint)]">avance</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-[var(--border)] mt-4">
        <div className="flex items-center gap-3 text-xs text-[var(--text-dim)]">
          {goal.due && (
            <span className="tnum">
              {daysLeft !== null && daysLeft < 0
                ? `${Math.abs(daysLeft)}d vencida`
                : daysLeft !== null && daysLeft <= 30
                ? `${daysLeft}d restantes`
                : format(parseISO(goal.due), "MMM yyyy", { locale: es })}
            </span>
          )}
          <AvatarStack ids={goal.visibleTo} size={20} />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {goal.status !== "lograda" && pct >= 100 && (
            <button
              onClick={() => onUpdate({ status: "lograda" })}
              className="rounded-lg p-1.5 hover:bg-[var(--surface-2)]"
              title="Marcar como lograda"
            >
              <Trophy size={14} className="text-[var(--color-dorado)]" />
            </button>
          )}
          {goal.status === "activa" ? (
            <button
              onClick={() => onUpdate({ status: "pausada" })}
              className="rounded-lg p-1.5 hover:bg-[var(--surface-2)]"
              title="Pausar"
            >
              <Pause size={14} />
            </button>
          ) : goal.status === "pausada" ? (
            <button
              onClick={() => onUpdate({ status: "activa" })}
              className="rounded-lg p-1.5 hover:bg-[var(--surface-2)]"
              title="Reanudar"
            >
              <Play size={14} />
            </button>
          ) : null}
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--color-rojo)]"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {goal.status === "lograda" && (
        <div className="mt-2 flex items-center gap-1 text-xs text-[var(--color-verde)]">
          <Trophy size={12} /> Lograda
        </div>
      )}
    </Card>
  );
}

function NewGoalForm({
  onSave,
  onCancel,
}: {
  onSave: (g: Partial<Goal>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<GoalScope>("personal");
  const [due, setDue] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const { currentUser } = useStore();
  const [vis, setVis] = useState<Visibility>(
    currentUser ? [currentUser] : ["nelson"]
  );

  function toggleVis(u: UserId) {
    setVis((v) => (v.includes(u) ? v.filter((x) => x !== u) : [...v, u]));
  }

  return (
    <Card className="p-5 mt-6 animate-fadein space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => setScope("firma")}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${
            scope === "firma"
              ? "border-[var(--color-dorado)] bg-[var(--color-dorado)]/10 text-[var(--color-dorado)]"
              : "border-[var(--border)] text-[var(--text-dim)]"
          }`}
        >
          <Building2 size={14} /> Firma
        </button>
        <button
          onClick={() => setScope("personal")}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${
            scope === "personal"
              ? "border-[var(--color-verde)] bg-[var(--color-verde)]/10 text-[var(--color-verde)]"
              : "border-[var(--border)] text-[var(--text-dim)]"
          }`}
        >
          <Heart size={14} /> Personal
        </button>
      </div>

      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="¿Qué querés lograr?"
        className="w-full bg-transparent font-serif text-xl outline-none border-b border-[var(--border)] pb-2"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción (opcional)"
        rows={2}
        className="w-full bg-transparent text-sm outline-none border border-[var(--border)] rounded-lg p-2 resize-none"
      />

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-[var(--text-faint)]" />
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Meta"
            className="w-20 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm tnum"
          />
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="unidad (ej: libros)"
            className="flex-1 min-w-[120px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm"
          />
        </div>
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm"
        />
      </div>

      {/* Visibilidad — solo si es de la firma */}
      {scope === "firma" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="uppercase-label text-[var(--text-faint)]">¿Quién la ve?</span>
          {USER_LIST.map((u) => (
            <button
              key={u.id}
              onClick={() => toggleVis(u.id)}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                vis.includes(u.id)
                  ? "border-[var(--color-dorado)] text-[var(--text)]"
                  : "border-[var(--border)] text-[var(--text-faint)]"
              }`}
            >
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
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="uppercase-label text-[var(--text-faint)] px-3">
          Cancelar
        </button>
        <button
          onClick={() =>
            title.trim() &&
            onSave({
              title: title.trim(),
              description: description.trim() || undefined,
              scope,
              due: due || null,
              target: target ? parseInt(target) : undefined,
              unit: unit.trim() || undefined,
              current: 0,
              visibleTo: scope === "firma" ? vis : undefined,
            })
          }
          disabled={!title.trim()}
          className="rounded-lg px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
          style={{ background: "var(--color-dorado)", color: "#0A1828" }}
        >
          Guardar meta
        </button>
      </div>
    </Card>
  );
}
