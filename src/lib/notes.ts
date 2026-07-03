import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Note, NoteType } from "../data/types";

/** Quita etiquetas HTML del cuerpo enriquecido para búsqueda/preview en texto plano. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export interface NoteFilters {
  text?: string;
  tag?: string | null;
  type?: NoteType | null;
  goalId?: string | null;
  from?: string | null;
  to?: string | null;
}

export function filterNotes(notes: Note[], f: NoteFilters): Note[] {
  return notes.filter((n) => {
    if (f.text) {
      const q = f.text.toLowerCase();
      const hit =
        n.title.toLowerCase().includes(q) ||
        stripHtml(n.body).toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q));
      if (!hit) return false;
    }
    if (f.tag && !n.tags.includes(f.tag)) return false;
    if (f.type && n.type !== f.type) return false;
    if (f.goalId && n.goalId !== f.goalId) return false;
    if (f.from && n.createdAt < f.from) return false;
    if (f.to && n.createdAt > f.to) return false;
    return true;
  });
}

export interface MonthStats {
  monthKey: string;
  label: string;
  reflexiones: number;
  aprendizajes: number;
  decisiones: number;
  ideas: number;
  convertidas: number;
  total: number;
}

export function monthlyStats(notes: Note[], monthsBack = 1): MonthStats[] {
  const now = new Date();
  const months: MonthStats[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = format(d, "yyyy-MM");
    const inMonth = notes.filter((n) => n.createdAt.slice(0, 7) === monthKey);
    months.push({
      monthKey,
      label: format(d, "MMMM yyyy", { locale: es }),
      reflexiones: inMonth.filter((n) => n.type === "reflexion").length,
      aprendizajes: inMonth.filter((n) => n.type === "aprendizaje").length,
      decisiones: inMonth.filter((n) => n.type === "decision").length,
      ideas: inMonth.filter((n) => n.type === "idea").length,
      convertidas: inMonth.filter((n) => n.convertedTo).length,
      total: inMonth.length,
    });
  }
  return months;
}

export function unprocessedIdeas(notes: Note[]): Note[] {
  return notes.filter((n) => n.type === "idea" && !n.convertedTo);
}

export function allTags(notes: Note[]): string[] {
  const set = new Set<string>();
  notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
  return [...set].sort();
}

export function fmtNoteDate(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy", { locale: es });
}
