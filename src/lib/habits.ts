import { todayISO } from "./dates";

export function currentStreak(completions: string[]): number {
  if (!completions.length) return 0;
  const set = new Set(completions);
  let streak = 0;
  const d = new Date();
  while (true) {
    const iso = d.toISOString().slice(0, 10);
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

export function completionsThisWeek(completions: string[]): number {
  const start = new Date();
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // lunes
  const startIso = start.toISOString().slice(0, 10);
  return completions.filter((c) => c >= startIso).length;
}

export function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}
