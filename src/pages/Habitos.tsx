import { useMemo, useState } from "react";
import {
  Plus,
  Flame,
  Trash2,
  Check,
  AlertTriangle,
  Trophy,
  Target,
  Clock,
} from "lucide-react";
import { useStore } from "../store/store";
import { SectionTitle, Card, PriorityBadge } from "../components/ui";
import { todayISO, fmtWeekday } from "../lib/dates";
import {
  currentStreak,
  bestStreak,
  completionsThisWeek,
  last7Days,
  lastNDays,
  evaluateRisk,
  disciplineIndex,
  LEVEL_LABEL,
} from "../lib/habits";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Habit, HabitFrequency, HabitCategory, Priority } from "../data/types";

const ICONS = ["📖", "💪", "🧘", "🏃", "💧", "🍎", "✍️", "⚖️", "🎯", "💤", "☀️", "🙏"];
const COLORS = ["#c9a84c", "#5a9d72", "#2a4a82", "#d05a55", "#d6a849", "#9b6dff"];

const CATEGORIES: { id: HabitCategory; label: string; emoji: string }[] = [
  { id: "profesional", label: "Profesional", emoji: "⚖️" },
  { id: "intelectual", label: "Intelectual", emoji: "🧠" },
  { id: "salud", label: "Salud", emoji: "💪" },
  { id: "personal", label: "Personal", emoji: "👨‍👩‍👧" },
];

const RISK_COLOR: Record<string, string> = {
  ok: "var(--color-verde)",
  atencion: "var(--color-ambar)",
  riesgo: "var(--color-rojo)",
};

export function Habitos() {
  const { data, currentUser, addHabit, toggleHabitToday, deleteHabit } = useStore();
  const [creating, setCreating] = useState(false);
  const today = todayISO();
  const days = last7Days();

  const habits = data.habits.filter((h) => h.owner === currentUser && !h.archived);
  const tasks = data.tasks.filter((t) => t.owner === currentUser);
  const goals = data.goals.filter((g) => g.owner === currentUser && g.status === "activa");

  const doneToday = habits.filter((h) => h.completions.includes(today)).length;
  const percent = habits.length ? Math.round((doneToday / habits.length) * 100) : 0;
  const globalStreak = habits.length ? Math.max(0, ...habits.map((h) => currentStreak(h.completions))) : 0;

  const discipline = useMemo(
    () => disciplineIndex({ habits, tasks, goals }),
    [habits, tasks, goals]
  );

  const pending = habits
    .filter((h) => !h.completions.includes(today))
    .sort((a, b) => {
      const pr = { alta: 0, media: 1, baja: 2 };
      const pa = pr[a.priority ?? "media"];
      const pb = pr[b.priority ?? "media"];
      if (pa !== pb) return pa - pb;
      return (a.recommendedTime ?? "99:99").localeCompare(b.recommendedTime ?? "99:99");
    });

  const risky = habits
    .map((h) => ({ habit: h, risk: evaluateRisk(h) }))
    .filter((x) => x.risk.level !== "ok");

  const estadoGeneral =
    percent === 100 ? "Excelente" : percent >= 70 ? "Bien" : percent >= 40 ? "Irregular" : "Crítico";

  return (
    <div>
      <SectionTitle kicker="Hábitos">
        <span className="italic text-[var(--color-dorado)]">Disciplina</span> de hoy
      </SectionTitle>

      {/* ─── Header: disciplina de hoy ─── */}
      {habits.length > 0 && (
        <Card className="p-5 mb-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="font-serif text-4xl tnum">
                {percent}%
              </div>
              <p className="text-sm text-[var(--text-dim)] mt-1">
                {doneToday} de {habits.length} hábitos completados · Racha global:{" "}
                <span className="tnum text-[var(--color-dorado)]">{globalStreak} días</span> · Estado:{" "}
                <span className="font-medium">{estadoGeneral}</span>
              </p>
              <div className="h-2 rounded-full bg-[var(--surface-2)] mt-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${percent}%`, background: "var(--color-dorado)" }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Índice de Disciplina SBS ─── */}
      {habits.length > 0 && (
        <Card className="p-5 mb-6 flex items-center justify-between">
          <div>
            <div className="uppercase-label text-[var(--text-faint)] mb-1">Disciplina SBS</div>
            <div className="font-serif text-3xl tnum">
              {discipline.score}
              <span className="text-[var(--text-faint)]"> / 100</span>
            </div>
            <p className="text-sm text-[var(--text-dim)] mt-1">
              Nivel: <span className="font-medium">{LEVEL_LABEL[discipline.level]}</span>
            </p>
          </div>
          <div className="hidden sm:grid grid-cols-4 gap-4 text-center">
            <Metric label="Hoy" value={discipline.breakdown.ejecucionHoy} />
            <Metric label="Semana" value={discipline.breakdown.consistenciaSemanal} />
            <Metric label="Rachas" value={discipline.breakdown.rachasActivas} />
            <Metric label="Tareas/Metas" value={discipline.breakdown.tareasYMetas} />
          </div>
        </Card>
      )}

      {/* ─── Alertas de riesgo ─── */}
      {risky.length > 0 && (
        <Card className="p-4 mb-6 border-[var(--color-rojo)]/30">
          <div className="uppercase-label text-[var(--color-rojo)] mb-2 flex items-center gap-1.5">
            <AlertTriangle size={13} /> Riesgo de consistencia
          </div>
          <div className="space-y-1.5">
            {risky.map(({ habit, risk }) => (
              <div key={habit.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: RISK_COLOR[risk.level] }}
                  />
                  {habit.name}
                </span>
                <span className="text-[var(--text-dim)] text-xs">{risk.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ─── Panel de acción inmediata ─── */}
      {pending.length > 0 && (
        <div className="mb-6">
          <div className="uppercase-label text-[var(--text-faint)] mb-2">Pendiente ahora</div>
          <div className="space-y-2">
            {pending.map((h) => (
              <Card key={h.id} className="p-3.5 flex items-center gap-3">
                <button
                  onClick={() => toggleHabitToday(h.id)}
                  className="grid place-items-center rounded-xl shrink-0 transition-transform active:scale-90 border border-[var(--border)]"
                  style={{ width: 40, height: 40, background: "var(--surface-2)", fontSize: 18 }}
                >
                  {h.icon ?? "•"}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{h.name}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--text-faint)]">
                    {h.recommendedTime && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {h.recommendedTime}
                      </span>
                    )}
                    {h.estimatedMinutes && <span>{h.estimatedMinutes} min</span>}
                  </div>
                </div>
                {h.priority && <PriorityBadge p={h.priority} />}
                <button
                  onClick={() => toggleHabitToday(h.id)}
                  className="uppercase-label rounded-lg border border-[var(--border)] px-3 py-1.5 hover:border-[var(--color-dorado)] hover:text-[var(--color-dorado)]"
                >
                  Completar
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── Categorías ─── */}
      {habits.length > 0 && (
        <div className="mb-6">
          <div className="uppercase-label text-[var(--text-faint)] mb-2">Categorías</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => {
              const inCat = habits.filter((h) => (h.category ?? "personal") === cat.id);
              if (!inCat.length) return null;
              const done = inCat.filter((h) => h.completions.includes(today)).length;
              const pct = Math.round((done / inCat.length) * 100);
              return (
                <Card key={cat.id} className="p-3">
                  <div className="text-lg mb-1">{cat.emoji}</div>
                  <div className="uppercase-label text-[var(--text-faint)]">{cat.label}</div>
                  <div className="font-serif text-xl tnum mt-1">{pct}%</div>
                  <div className="text-xs text-[var(--text-dim)]">
                    {done}/{inCat.length}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Lista de hábitos ─── */}
      <div className="space-y-2">
        {habits.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            days={days}
            onToggle={(d) => toggleHabitToday(h.id, d)}
            onDelete={() => deleteHabit(h.id)}
          />
        ))}

        {habits.length === 0 && !creating && (
          <p className="text-center text-[var(--text-faint)] italic py-8">
            Sin hábitos todavía. Empezá con uno solo.
          </p>
        )}
      </div>

      {/* ─── Metas vinculadas ─── */}
      {goals.some((g) => g.linkedHabitIds.length > 0) && (
        <div className="mt-6">
          <div className="uppercase-label text-[var(--text-faint)] mb-2 flex items-center gap-1.5">
            <Target size={13} /> Metas vinculadas
          </div>
          <div className="space-y-2">
            {goals
              .filter((g) => g.linkedHabitIds.length > 0)
              .map((g) => {
                const linked = habits.filter((h) => g.linkedHabitIds.includes(h.id));
                return (
                  <Card key={g.id} className="p-3.5">
                    <div className="font-medium text-sm">{g.title}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {linked.map((h) => (
                        <span
                          key={h.id}
                          className="uppercase-label rounded-md border border-[var(--border)] px-1.5 py-0.5 flex items-center gap-1"
                        >
                          {h.icon} {h.name}
                          {h.completions.includes(today) && (
                            <Check size={10} className="text-[var(--color-verde)]" />
                          )}
                        </span>
                      ))}
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* ─── Calendario de consistencia ─── */}
      {habits.length > 0 && <ConsistencyCalendar habits={habits} />}

      {/* ─── Modo operativo ─── */}
      {habits.length > 0 && (
        <Card className="p-5 mt-6">
          <div className="uppercase-label text-[var(--text-faint)] mb-3">Estado operativo</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
            <Metric label="Disciplina de hoy" value={percent} suffix="%" />
            <Metric
              label="Tareas críticas pendientes"
              value={tasks.filter((t) => !t.done && t.priority === "alta").length}
            />
            <Metric label="Hábitos pendientes" value={pending.length} />
            <Metric label="Racha global" value={globalStreak} suffix=" días" />
          </div>
          {pending[0] && (
            <p className="text-sm text-[var(--text-dim)]">
              Próxima acción recomendada:{" "}
              <span className="font-medium text-[var(--text)]">
                {pending[0].icon} {pending[0].name}
                {pending[0].recommendedTime ? ` (${pending[0].recommendedTime})` : ""}
              </span>
            </p>
          )}
        </Card>
      )}

      {/* ─── Crear ─── */}
      {creating ? (
        <NewHabitForm
          onSave={(name, freq, icon, color, weeklyTarget, category, priority, recommendedTime, estimatedMinutes) => {
            if (!currentUser) return;
            addHabit({
              name,
              owner: currentUser,
              frequency: freq,
              icon,
              color,
              weeklyTarget,
              category,
              priority,
              recommendedTime,
              estimatedMinutes,
            });
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] py-3 text-sm text-[var(--text-dim)] hover:text-[var(--color-dorado)] hover:border-[var(--color-dorado)]"
        >
          <Plus size={16} /> Nuevo hábito
        </button>
      )}
    </div>
  );
}

function Metric({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div>
      <div className="font-serif text-xl tnum">
        {value}
        {suffix}
      </div>
      <div className="uppercase-label text-[var(--text-faint)] mt-0.5">{label}</div>
    </div>
  );
}

function ConsistencyCalendar({ habits }: { habits: Habit[] }) {
  const window = lastNDays(91);
  const cells = window.map((d) => {
    const expected = habits.filter((h) => h.frequency === "diario" || true).length;
    const done = habits.filter((h) => h.completions.includes(d)).length;
    const pct = expected ? done / expected : 0;
    return { date: d, pct };
  });

  const colorFor = (pct: number) => {
    if (pct >= 0.8) return "var(--color-dorado)";
    if (pct >= 0.4) return "color-mix(in srgb, var(--color-dorado) 45%, var(--surface-2))";
    if (pct > 0) return "color-mix(in srgb, var(--color-dorado) 20%, var(--surface-2))";
    return "var(--surface-2)";
  };

  return (
    <div className="mt-6">
      <div className="uppercase-label text-[var(--text-faint)] mb-2">Consistencia · últimos 91 días</div>
      <Card className="p-4">
        <div className="grid grid-flow-col gap-1" style={{ gridTemplateRows: "repeat(7, 1fr)" }}>
          {cells.map((c) => (
            <div
              key={c.date}
              title={`${format(parseISO(c.date), "d MMM", { locale: es })} · ${Math.round(c.pct * 100)}%`}
              className="rounded-sm"
              style={{ width: 10, height: 10, background: colorFor(c.pct) }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

function HabitCard({
  habit,
  days,
  onToggle,
  onDelete,
}: {
  habit: Habit;
  days: string[];
  onToggle: (iso: string) => void;
  onDelete: () => void;
}) {
  const streak = currentStreak(habit.completions);
  const best = bestStreak(habit.completions);
  const weekDone = completionsThisWeek(habit.completions);
  const today = todayISO();
  const doneToday = habit.completions.includes(today);
  const toRecord = Math.max(0, best - streak);

  return (
    <Card className="p-4 group">
      <div className="flex items-center gap-4">
        <button
          onClick={() => onToggle(today)}
          className="grid place-items-center rounded-xl shrink-0 transition-transform active:scale-90"
          style={{
            width: 48,
            height: 48,
            background: doneToday ? habit.color ?? "var(--color-dorado)" : "var(--surface-2)",
            border: `1px solid ${doneToday ? "transparent" : "var(--border)"}`,
            color: doneToday ? "#0A1828" : "inherit",
            fontSize: 22,
          }}
        >
          {doneToday ? <Check size={22} /> : habit.icon ?? "•"}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{habit.name}</span>
            {streak > 0 && (
              <span className="flex items-center gap-1 text-xs text-[var(--color-dorado)] tnum">
                <Flame size={12} /> {streak}
              </span>
            )}
            {best > 0 && (
              <span className="flex items-center gap-1 text-xs text-[var(--text-faint)] tnum">
                <Trophy size={11} /> {best}
              </span>
            )}
          </div>
          <div className="uppercase-label text-[var(--text-faint)] mt-0.5">
            {habit.frequency === "diario"
              ? "Diario"
              : `Semanal · ${weekDone}/${habit.weeklyTarget ?? 7}`}
            {toRecord > 0 && streak > 0 && ` · faltan ${toRecord}d para el récord`}
          </div>
        </div>

        {/* Mini-heatmap 7 días */}
        <div className="hidden sm:flex gap-1">
          {days.map((d) => {
            const done = habit.completions.includes(d);
            const isToday = d === today;
            return (
              <button
                key={d}
                onClick={() => onToggle(d)}
                title={format(parseISO(d), "EEE d", { locale: es })}
                className="rounded-md transition-transform hover:scale-110"
                style={{
                  width: 18,
                  height: 24,
                  background: done
                    ? habit.color ?? "var(--color-dorado)"
                    : "var(--surface-2)",
                  border: `1px solid ${
                    isToday ? "var(--color-dorado)" : "var(--border)"
                  }`,
                  opacity: done ? 1 : 0.5,
                }}
              />
            );
          })}
        </div>

        <button
          onClick={onDelete}
          className="text-[var(--text-faint)] hover:text-[var(--color-rojo)] opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </Card>
  );
}

function NewHabitForm({
  onSave,
  onCancel,
}: {
  onSave: (
    name: string,
    freq: HabitFrequency,
    icon: string,
    color: string,
    weeklyTarget: number | undefined,
    category: HabitCategory,
    priority: Priority,
    recommendedTime: string | undefined,
    estimatedMinutes: number | undefined
  ) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [freq, setFreq] = useState<HabitFrequency>("diario");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [weekly, setWeekly] = useState(3);
  const [category, setCategory] = useState<HabitCategory>("profesional");
  const [priority, setPriority] = useState<Priority>("media");
  const [recommendedTime, setRecommendedTime] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | "">("");

  return (
    <Card className="p-4 mt-4 animate-fadein">
      <div className="flex gap-3 items-center mb-3">
        <span
          className="grid place-items-center rounded-xl shrink-0"
          style={{ width: 48, height: 48, background: color, color: "#0A1828", fontSize: 22 }}
        >
          {icon}
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del hábito"
          className="flex-1 bg-transparent font-serif text-lg outline-none border-b border-[var(--border)] pb-1"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {ICONS.map((i) => (
          <button
            key={i}
            onClick={() => setIcon(i)}
            className={`text-lg w-8 h-8 rounded-lg grid place-items-center ${
              icon === i ? "bg-[var(--surface-2)] ring-1 ring-[var(--color-dorado)]" : "hover:bg-[var(--surface-2)]"
            }`}
          >
            {i}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className="rounded-full"
            style={{
              width: 24,
              height: 24,
              background: c,
              boxShadow: color === c ? "0 0 0 2px var(--bg), 0 0 0 4px var(--color-dorado)" : undefined,
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select
          value={freq}
          onChange={(e) => setFreq(e.target.value as HabitFrequency)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
        >
          <option value="diario">Diario</option>
          <option value="semanal">Semanal</option>
        </select>
        {freq === "semanal" && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
            <span>Meta:</span>
            <input
              type="number"
              min={1}
              max={7}
              value={weekly}
              onChange={(e) => setWeekly(parseInt(e.target.value) || 1)}
              className="w-14 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-center tnum"
            />
            <span>veces por semana</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as HabitCategory)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
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
          type="time"
          value={recommendedTime}
          onChange={(e) => setRecommendedTime(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={1}
          placeholder="min"
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value ? parseInt(e.target.value) : "")}
          className="w-20 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="uppercase-label text-[var(--text-faint)] px-3">
          Cancelar
        </button>
        <button
          onClick={() =>
            name.trim() &&
            onSave(
              name.trim(),
              freq,
              icon,
              color,
              freq === "semanal" ? weekly : undefined,
              category,
              priority,
              recommendedTime || undefined,
              estimatedMinutes === "" ? undefined : estimatedMinutes
            )
          }
          disabled={!name.trim()}
          className="rounded-lg px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
          style={{ background: "var(--color-dorado)", color: "#0A1828" }}
        >
          Guardar
        </button>
      </div>
    </Card>
  );
}
