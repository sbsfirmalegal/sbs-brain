import { useState } from "react";
import { Plus, Flame, Trash2, Check } from "lucide-react";
import { useStore } from "../store/store";
import { SectionTitle, Card } from "../components/ui";
import { todayISO } from "../lib/dates";
import {
  currentStreak,
  completionsThisWeek,
  last7Days,
} from "../lib/habits";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Habit, HabitFrequency } from "../data/types";

const ICONS = ["📖", "💪", "🧘", "🏃", "💧", "🍎", "✍️", "⚖️", "🎯", "💤", "☀️", "🙏"];
const COLORS = ["#c9a84c", "#5a9d72", "#2a4a82", "#d05a55", "#d6a849", "#9b6dff"];

export function Habitos() {
  const { data, currentUser, addHabit, toggleHabitToday, deleteHabit } =
    useStore();
  const habits = data.habits.filter(
    (h) => h.owner === currentUser && !h.archived
  );
  const [creating, setCreating] = useState(false);
  const today = todayISO();
  const days = last7Days();

  const doneToday = habits.filter((h) => h.completions.includes(today)).length;
  const percent = habits.length ? Math.round((doneToday / habits.length) * 100) : 0;

  return (
    <div>
      <SectionTitle kicker="Hábitos">
        Tu <span className="italic text-[var(--color-dorado)]">disciplina diaria</span>
      </SectionTitle>

      {habits.length > 0 && (
        <Card className="p-5 mb-6 flex items-center justify-between">
          <div>
            <div className="uppercase-label text-[var(--text-faint)] mb-1">Hoy</div>
            <div className="font-serif text-3xl tnum">
              {doneToday}
              <span className="text-[var(--text-faint)]"> / {habits.length}</span>
            </div>
            <p className="text-sm text-[var(--text-dim)] mt-1">
              {percent === 100
                ? "Día completo. Bien hecho."
                : percent === 0
                ? "Empezá por el más fácil."
                : `${percent}% del día cubierto.`}
            </p>
          </div>
          <div
            className="relative grid place-items-center rounded-full"
            style={{
              width: 72,
              height: 72,
              background: `conic-gradient(var(--color-dorado) ${percent}%, var(--surface-2) ${percent}% 100%)`,
            }}
          >
            <div
              className="grid place-items-center rounded-full bg-[var(--bg)] font-serif text-xl tnum"
              style={{ width: 58, height: 58 }}
            >
              {percent}%
            </div>
          </div>
        </Card>
      )}

      {/* Lista de hábitos */}
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

      {/* Crear */}
      {creating ? (
        <NewHabitForm
          onSave={(name, freq, icon, color, weeklyTarget) => {
            if (!currentUser) return;
            addHabit({
              name,
              owner: currentUser,
              frequency: freq,
              icon,
              color,
              weeklyTarget,
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
  const weekDone = completionsThisWeek(habit.completions);
  const today = todayISO();
  const doneToday = habit.completions.includes(today);

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
          </div>
          <div className="uppercase-label text-[var(--text-faint)] mt-0.5">
            {habit.frequency === "diario"
              ? "Diario"
              : `Semanal · ${weekDone}/${habit.weeklyTarget ?? 7}`}
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
    weeklyTarget?: number
  ) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [freq, setFreq] = useState<HabitFrequency>("diario");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [weekly, setWeekly] = useState(3);

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

      <div className="flex items-center gap-2 mb-3">
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

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="uppercase-label text-[var(--text-faint)] px-3">
          Cancelar
        </button>
        <button
          onClick={() =>
            name.trim() &&
            onSave(name.trim(), freq, icon, color, freq === "semanal" ? weekly : undefined)
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
