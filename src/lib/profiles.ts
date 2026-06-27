import { supabase, type DbProfile } from "./supabase";
import type { UserId } from "../data/types";

export interface ProfileMap {
  /** slug → uuid */
  uuidOf: Record<UserId, string>;
  /** uuid → slug */
  slugOf: Record<string, UserId>;
  /** lista de profiles tal cual vienen */
  all: DbProfile[];
}

/** Carga los 3 profiles desde Supabase y arma los mapas uuid ↔ slug. */
export async function loadProfileMap(): Promise<ProfileMap> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*");
  if (error) throw error;
  const all = (data ?? []) as DbProfile[];

  const uuidOf = {} as Record<UserId, string>;
  const slugOf: Record<string, UserId> = {};
  for (const p of all) {
    uuidOf[p.slug] = p.id;
    slugOf[p.id] = p.slug;
  }
  return { uuidOf, slugOf, all };
}

/** Convierte un array de slugs a array de uuids (omite los que no existan). */
export function slugsToUuids(slugs: UserId[], map: ProfileMap): string[] {
  return slugs.map((s) => map.uuidOf[s]).filter(Boolean);
}

/** Convierte un array de uuids a array de slugs (omite los desconocidos). */
export function uuidsToSlugs(uuids: string[] | null | undefined, map: ProfileMap): UserId[] {
  if (!uuids) return [];
  return uuids.map((u) => map.slugOf[u]).filter(Boolean) as UserId[];
}
