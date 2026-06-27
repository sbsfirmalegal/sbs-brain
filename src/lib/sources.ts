import type { SourceKind } from "../data/types";

export function detectSourceKind(input: string): SourceKind {
  const s = input.toLowerCase();
  if (/youtube\.com|youtu\.be/.test(s)) return "youtube";
  if (/tiktok\.com/.test(s)) return "tiktok";
  if (/instagram\.com/.test(s)) return "instagram";
  if (/open\.spotify\.com/.test(s)) return "spotify";
  if (/podcast|anchor\.fm|apple\.com\/.*podcast/.test(s)) return "podcast";
  if (/^https?:\/\//.test(s)) return "web";
  // sin URL — texto libre
  if (/\b(libro|cap[ií]tulo|p[áa]gina|editorial)\b/.test(s)) return "libro";
  if (/\b(pel[íi]cula|film|serie|temporada)\b/.test(s)) return "pelicula";
  if (/\b(ley|c[óo]digo|art\.|decreto|sentencia)\b/.test(s)) return "ley";
  return "articulo";
}

export const SOURCE_META: Record<
  SourceKind,
  { label: string; color: string; icon: string }
> = {
  youtube: { label: "YouTube", color: "#ff4d4f", icon: "▶" },
  tiktok: { label: "TikTok", color: "#69e8d2", icon: "♪" },
  instagram: { label: "Instagram", color: "#e1306c", icon: "◉" },
  spotify: { label: "Spotify", color: "#1db954", icon: "♫" },
  podcast: { label: "Podcast", color: "#9b6dff", icon: "🎙" },
  libro: { label: "Libro", color: "#c9a84c", icon: "📖" },
  pelicula: { label: "Película", color: "#d05a55", icon: "🎬" },
  articulo: { label: "Artículo", color: "#8fa0bd", icon: "✍" },
  ley: { label: "Norma legal", color: "#5a9d72", icon: "§" },
  web: { label: "Web", color: "#5a9d72", icon: "↗" },
};

export function youtubeId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/
  );
  return m ? m[1] : null;
}

export function hostname(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
