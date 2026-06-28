import { format } from "date-fns";
import { todayISO } from "./dates";
import type { Goal, Habit, Task } from "../data/types";

const localISO = (d: Date) => format(d, "yyyy-MM-dd");

export function currentStreak(completions: string[]): number {
  if (!completions.length) return 0;
  const set = new Set(completions);
  let streak = 0;
  const d = new Date();
  while (true) {
    const iso = localISO(d);
    if (set.has(iso)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      // si hoy no está marcado pero sí ayer, la racha empieza ayer
      if (streak === 0 && iso === todayISO()) {
        d.setDate(d.getDate() - 1);
        continue;
      }
      break;
    }
  }
  return streak;
}

/** Racha más larga registrada en el historial completo del hábito. */
export function bestStreak(completions: string[]): number {
  if (!completions.length) return 0;
  const sorted = [...new Set(completions)].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    run = diffDays === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

export function completionsThisWeek(completions: string[]): number {
  const start = new Date();
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // lunes
  const startIso = localISO(start);
  return completions.filter((c) => c >= startIso).length;
}

export function last7Days(): string[] {
  return lastNDays(7);
}

export function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return localISO(d);
  });
}

/** Días desde la última vez completado. null si nunca se completó. */
export function daysSinceLastCompletion(completions: string[]): number | null {
  if (!completions.length) return null;
  const sorted = [...completions].sort();
  const last = sorted[sorted.length - 1];
  const diff = Math.round(
    (new Date(todayISO()).getTime() - new Date(last).getTime()) / 86400000
  );
  return diff;
}

export type RiskLevel = "ok" | "atencion" | "riesgo";

export interface HabitRisk {
  level: RiskLevel;
  message?: string;
}

/** Evalúa objetivamente si un hábito está en riesgo de romper su consistencia. Sin mensajes motivacionales. */
export function evaluateRisk(habit: Habit): HabitRisk {
  const today = todayISO();
  const doneToday = habit.completions.includes(today);
  const since = daysSinceLastCompletion(habit.completions);

  if (habit.frequency === "diario") {
    if (doneToday) return { level: "ok" };
    if (since === null) return { level: "atencion", message: "Sin registro todavía" };
    if (since >= 2) {
      return {
        level: "riesgo",
        message: `${since} días sin cumplir`,
      };
    }
    if (currentStreakAsOfYesterday(habit.completions) > 0) {
      return { level: "atencion", message: "Riesgo de romper racha" };
    }
    return { level: "atencion" };
  }

  // semanal
  const target = habit.weeklyTarget ?? 7;
  const done = completionsThisWeek(habit.completions);
  const dow = new Date().getDay(); // 0=domingo
  const daysElapsedThisWeek = dow === 0 ? 7 : dow; // lunes=1..domingo=7
  const daysLeft = 7 - daysElapsedThisWeek;
  const missing = target - done;
  if (missing <= 0) return { level: "ok" };
  if (missing > daysLeft) {
    return { level: "riesgo", message: `${missing} pendientes, ${daysLeft} días restantes` };
  }
  if (missing === daysLeft && daysLeft <= 2) {
    return { level: "atencion", message: "Meta semanal en riesgo" };
  }
  return { level: "ok" };
}

function currentStreakAsOfYesterday(completions: string[]): number {
  const set = new Set(completions);
  let streak = 0;
  const d = new Date();
  d.setDate(d.getDate() - 1);
  while (set.has(localISO(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Cuántas ejecuciones se esperaban de un hábito en los últimos N días. */
function expectedInWindow(habit: Habit, days: number): number {
  if (habit.frequency === "diario") return days;
  const target = habit.weeklyTarget ?? 7;
  return Math.round((target / 7) * days);
}

/** % de cumplimiento de un hábito en los últimos N días contra lo esperado. */
export function consistency(habit: Habit, days = 7): number {
  const window = lastNDays(days);
  const done = habit.completions.filter((c) => window.includes(c)).length;
  const expected = expectedInWindow(habit, days);
  if (expected <= 0) return 100;
  return Math.min(100, Math.round((done / expected) * 100));
}

/** Consistencia global (todos los hábitos) en los últimos N días. */
export function globalConsistency(habits: Habit[], days = 7): number {
  if (!habits.length) return 0;
  const window = lastNDays(days);
  let done = 0;
  let expected = 0;
  habits.forEach((h) => {
    done += h.completions.filter((c) => window.includes(c)).length;
    expected += expectedInWindow(h, days);
  });
  if (expected <= 0) return 0;
  return Math.min(100, Math.round((done / expected) * 100));
}

/** % de hábitos con racha activa (no rota) sobre el total de hábitos activos. */
export function activeStreaksRate(habits: Habit[]): number {
  if (!habits.length) return 0;
  const withStreak = habits.filter((h) => currentStreak(h.completions) > 0).length;
  return Math.round((withStreak / habits.length) * 100);
}

export interface DisciplineInputs {
  habits: Habit[];
  tasks: Task[];
  goals: Goal[];
}

export interface DisciplineResult {
  score: number;
  level: "excelente" | "solido" | "irregular" | "riesgo";
  breakdown: {
    ejecucionHoy: number;
    consistenciaSemanal: number;
    rachasActivas: number;
    tareasYMetas: number;
  };
}

/**
 * Índice de Disciplina SBS (0-100).
 * 35% ejecución de hoy + 30% consistencia semanal + 20% rachas activas + 15% tareas críticas y metas en curso.
 */
export function disciplineIndex({ habits, tasks, goals }: DisciplineInputs): DisciplineResult {
  const today = todayISO();
  const activeHabits = habits.filter((h) => !h.archived);

  const ejecucionHoy = activeHabits.length
    ? Math.round(
        (activeHabits.filter((h) => h.completions.includes(today)).length /
          activeHabits.length) *
          100
      )
    : 0;

  const consistenciaSemanal = globalConsistency(activeHabits, 7);
  const rachasActivas = activeStreaksRate(activeHabits);

  const criticalTasks = tasks.filter((t) => t.priority === "alta");
  const criticalOnTrack = criticalTasks.length
    ? criticalTasks.filter((t) => t.done || !t.due || t.due >= today).length /
      criticalTasks.length
    : 1;

  const activeGoals = goals.filter((g) => g.status === "activa");
  const window = lastNDays(7);
  const goalsProgressing = activeGoals.length
    ? activeGoals.filter((g) =>
        g.linkedHabitIds.some((id) => {
          const h = habits.find((x) => x.id === id);
          return h?.completions.some((c) => window.includes(c));
        })
      ).length / activeGoals.length
    : 1;

  const dueLast7 = tasks.filter((t) => t.due && window.includes(t.due));
  const completionRate7d = dueLast7.length
    ? dueLast7.filter((t) => t.done).length / dueLast7.length
    : 1;

  const tareasYMetas = Math.round(
    ((criticalOnTrack + goalsProgressing + completionRate7d) / 3) * 100
  );

  const score = Math.round(
    0.35 * ejecucionHoy + 0.3 * consistenciaSemanal + 0.2 * rachasActivas + 0.15 * tareasYMetas
  );

  const level =
    score >= 90 ? "excelente" : score >= 70 ? "solido" : score >= 50 ? "irregular" : "riesgo";

  return {
    score,
    level,
    breakdown: { ejecucionHoy, consistenciaSemanal, rachasActivas, tareasYMetas },
  };
}

export const LEVEL_LABEL: Record<DisciplineResult["level"], string> = {
  excelente: "Excelente",
  solido: "Sólido",
  irregular: "Irregular",
  riesgo: "En riesgo",
};
