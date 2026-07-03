import { supabase } from "./supabase";
import type { AttachmentKind, NoteAttachment, UserId } from "../data/types";

const BUCKET = "note-media";

export async function uploadNoteAttachment(
  ownerSlug: UserId,
  noteId: string,
  file: Blob,
  kind: AttachmentKind,
  ext: string,
  name?: string
): Promise<NoteAttachment | null> {
  const path = `${ownerSlug}/${noteId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined });
  if (error) {
    console.error("[attachments] upload:", error.message);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return {
    id: "a-" + Math.random().toString(36).slice(2, 10),
    kind,
    url: data.publicUrl,
    name,
    createdAt: new Date().toISOString(),
  };
}

/** Borrado best-effort del objeto en Storage; nunca bloquea el borrado local del adjunto. */
export async function deleteNoteAttachment(url: string) {
  try {
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = url.slice(idx + marker.length);
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // ignorar: el adjunto ya se quitó de la nota
  }
}

/** Elige el primer mimeType de audio soportado por MediaRecorder en este navegador. */
export function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return "";
}
