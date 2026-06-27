import { Gavel, ScrollText, AlarmClock, Users, Heart, Tag } from "lucide-react";
import type { EventCategory } from "../data/types";

export interface CategoryMeta {
  id: EventCategory;
  label: string;
  color: string;
  icon: typeof Gavel;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "audiencia",  label: "Audiencia",  color: "#E26D5C", icon: Gavel },
  { id: "diligencia", label: "Diligencia", color: "#C9A84C", icon: ScrollText },
  { id: "plazo",      label: "Plazo",      color: "#E89B3C", icon: AlarmClock },
  { id: "reunion",    label: "Reunión",    color: "#9B7BC4", icon: Users },
  { id: "personal",   label: "Personal",   color: "#5A9D72", icon: Heart },
  { id: "otro",       label: "Otro",       color: "#7A8DA3", icon: Tag },
];

export const CATEGORY_MAP: Record<EventCategory, CategoryMeta> = CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<EventCategory, CategoryMeta>
);

export function getCategory(id?: EventCategory): CategoryMeta | null {
  if (!id) return null;
  return CATEGORY_MAP[id] ?? null;
}
