import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isPast,
  isThisWeek,
  differenceInCalendarDays,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";

export const todayISO = () => format(new Date(), "yyyy-MM-dd");

export const iso = (d: Date) => format(d, "yyyy-MM-dd");

export const relativeDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};

export const fmtLong = (isoDate: string) =>
  format(parseISO(isoDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

export const fmtDay = (isoDate: string) =>
  format(parseISO(isoDate), "d MMM", { locale: es });

export const fmtWeekday = (isoDate: string) =>
  format(parseISO(isoDate), "EEE", { locale: es });

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
};

export type DueBucket = "atrasada" | "hoy" | "semana" | "futuro" | "sin-fecha";

export function dueBucket(due: string | null): DueBucket {
  if (!due) return "sin-fecha";
  const d = parseISO(due);
  if (isToday(d)) return "hoy";
  if (isPast(d)) return "atrasada";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "semana";
  return "futuro";
}

export function daysOverdue(due: string | null): number {
  if (!due) return 0;
  return Math.max(0, -differenceInCalendarDays(parseISO(due), new Date()));
}

export function daysRemaining(due: string | null): number {
  if (!due) return 0;
  return differenceInCalendarDays(parseISO(due), new Date());
}

export function dueLabel(due: string | null): string {
  if (!due) return "Sin fecha";
  const rem = daysRemaining(due);
  if (rem === 0) return "Vence hoy";
  if (rem < 0) return `${Math.abs(rem)}d de atraso`;
  if (rem === 1) return "Mañana";
  return `${rem}d restantes`;
}

export function countdownTo(isoDate: string, time: string): string {
  const target = parseISO(`${isoDate}T${time}:00`);
  if (target.getTime() < Date.now()) return "en curso";
  return "en " + formatDistanceToNowStrict(target, { locale: es });
}
