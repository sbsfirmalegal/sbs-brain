import { useState } from "react";
import { Plus, Trash2, Tag, Link2, ExternalLink, X } from "lucide-react";
import { useStore } from "../store/store";
import { SectionTitle, VisibilityBadge } from "../components/ui";
import { fmtDay } from "../lib/dates";
import type { Note, NoteType, Source, SourceKind } from "../data/types";
import {
  detectSourceKind,
  SOURCE_META,
  hostname,
  youtubeId,
} from "../lib/sources";

const TYPE_LABEL: Record<NoteType, string> = {
  idea: "Idea",
  reflexion: "Reflexión",
  minuta: "Minuta",
  aprendizaje: "Aprendizaje",
};

export function Notas() {
  const { data, currentUser, visible, addNote, updateNote, deleteNote } =
    useStore();
  const notes = visible(data.notes).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
  const [selId, setSelId] = useState<string | null>(notes[0]?.id ?? null);
  const sel = notes.find((n) => n.id === selId) || null;

  function create() {
    if (!currentUser) return;
    addNote({ title: "Nueva nota", owner: currentUser, body: "", type: "idea" });
  }

  return (
    <div>
      <SectionTitle kicker="Notas" count={`${notes.length}`}>
        Ideas y <span className="italic text-[var(--color-dorado)]">reflexiones</span>
      </SectionTitle>

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        {/* lista */}
        <div>
          <button
            onClick={create}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] py-3 mb-3 text-sm text-[var(--text-dim)] hover:text-[var(--color-dorado)] hover:border-[var(--color-dorado)]"
          >
            <Plus size={16} /> Nueva nota
          </button>
          <div className="space-y-1">
            {notes.map((n) => (
              <button
                key={n.id}
                onClick={() => setSelId(n.id)}
                className={`w-full text-left rounded-xl p-3 border transition-colors ${
                  selId === n.id
                    ? "border-[var(--color-dorado)] bg-[var(--surface)]"
                    : "border-transparent hover:bg-[var(--surface)]"
                }`}
              >
                <div className="font-medium truncate">{n.title}</div>
                <div className="text-xs text-[var(--text-faint)] truncate mt-0.5">
                  {n.body || "Sin contenido"}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="uppercase-label text-[var(--text-faint)]">
                    {fmtDay(n.updatedAt)}
                  </span>
                  {n.sources && n.sources.length > 0 && (
                    <span className="uppercase-label flex items-center gap-1 text-[var(--color-dorado)]">
                      <Link2 size={10} />
                      {n.sources.length}
                    </span>
                  )}
                </div>
              </button>
            ))}
            {notes.length === 0 && (
              <p className="text-sm text-[var(--text-faint)] italic px-3 py-6">
                Sin notas todavía.
              </p>
            )}
          </div>
        </div>

        {/* editor */}
        {sel ? (
          <NoteEditor key={sel.id} note={sel} onChange={(p) => updateNote(sel.id, p)} onDelete={() => { deleteNote(sel.id); setSelId(null); }} />
        ) : (
          <div className="grid place-items-center text-[var(--text-faint)] italic min-h-[300px]">
            Elegí o creá una nota.
          </div>
        )}
      </div>
    </div>
  );
}

function NoteEditor({
  note,
  onChange,
  onDelete,
}: {
  note: Note;
  onChange: (p: Partial<Note>) => void;
  onDelete: () => void;
}) {
  const [tagInput, setTagInput] = useState("");

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between mb-3">
        <select
          value={note.type}
          onChange={(e) => onChange({ type: e.target.value as NoteType })}
          className="uppercase-label bg-transparent text-[var(--color-dorado)] outline-none"
        >
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <VisibilityBadge v={note.visibleTo} />
          <button onClick={onDelete} className="text-[var(--text-faint)] hover:text-[var(--color-rojo)]">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <input
        value={note.title}
        onChange={(e) => onChange({ title: e.target.value })}
        className="w-full bg-transparent font-serif text-2xl outline-none mb-3"
        placeholder="Título…"
      />
      <textarea
        value={note.body}
        onChange={(e) => onChange({ body: e.target.value })}
        placeholder="Escribí tu idea o reflexión…"
        rows={10}
        className="w-full bg-transparent outline-none resize-none leading-relaxed text-[var(--text-dim)]"
      />

      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
        <Tag size={14} className="text-[var(--text-faint)]" />
        {note.tags.map((t) => (
          <span
            key={t}
            onClick={() => onChange({ tags: note.tags.filter((x) => x !== t) })}
            className="uppercase-label rounded-md border border-[var(--border)] px-2 py-0.5 cursor-pointer hover:border-[var(--color-rojo)] text-[var(--text-dim)]"
          >
            {t} ×
          </span>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && tagInput.trim()) {
              onChange({ tags: [...note.tags, tagInput.trim()] });
              setTagInput("");
            }
          }}
          placeholder="+ etiqueta"
          className="bg-transparent text-sm outline-none w-24"
        />
      </div>

      {/* Fuentes */}
      <SourcesSection note={note} onChange={onChange} />
    </div>
  );
}

function SourcesSection({
  note,
  onChange,
}: {
  note: Note;
  onChange: (p: Partial<Note>) => void;
}) {
  const sources = note.sources ?? [];
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<Source>>({});

  function quickAdd() {
    const v = input.trim();
    if (!v) return;
    const kind = detectSourceKind(v);
    const isUrl = /^https?:\/\//i.test(v);
    const src: Source = {
      id: "s-" + Math.random().toString(36).slice(2, 8),
      kind,
      title: isUrl ? hostname(v) : v,
      url: isUrl ? v : undefined,
    };
    onChange({ sources: [...sources, src] });
    setInput("");
  }

  function addDetailed() {
    if (!draft.title?.trim()) return;
    const kind = draft.kind ?? detectSourceKind(draft.url ?? draft.title);
    onChange({
      sources: [
        ...sources,
        {
          id: "s-" + Math.random().toString(36).slice(2, 8),
          kind,
          title: draft.title.trim(),
          url: draft.url?.trim(),
          author: draft.author?.trim(),
          note: draft.note?.trim(),
        },
      ],
    });
    setDraft({});
    setAdding(false);
  }

  function remove(id: string) {
    onChange({ sources: sources.filter((s) => s.id !== id) });
  }

  return (
    <div className="mt-5 pt-5 border-t border-[var(--border)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 uppercase-label text-[var(--text-dim)]">
          <Link2 size={14} />
          Fuentes
          {sources.length > 0 && (
            <span className="text-[var(--text-faint)] tnum">
              · {sources.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setAdding((a) => !a)}
          className="uppercase-label text-[var(--text-faint)] hover:text-[var(--color-dorado)]"
        >
          {adding ? "Cancelar" : "+ Detallado"}
        </button>
      </div>

      {/* Lista de fuentes */}
      <div className="space-y-2 mb-3">
        {sources.map((s) => (
          <SourceItem key={s.id} src={s} onRemove={() => remove(s.id)} />
        ))}
      </div>

      {/* Captura rápida */}
      {!adding && (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && quickAdd()}
            placeholder="Pegá un link o escribí: ej. «Libro: El cerebro lector»"
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
          />
          <button
            onClick={quickAdd}
            className="rounded-lg px-3"
            style={{ background: "var(--color-dorado)", color: "#0A1828" }}
          >
            <Plus size={16} />
          </button>
        </div>
      )}

      {/* Formulario detallado */}
      {adding && (
        <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 animate-fadein">
          <div className="flex gap-2">
            <select
              value={draft.kind ?? "web"}
              onChange={(e) =>
                setDraft({ ...draft, kind: e.target.value as SourceKind })
              }
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
            >
              {(Object.keys(SOURCE_META) as SourceKind[]).map((k) => (
                <option key={k} value={k}>
                  {SOURCE_META[k].label}
                </option>
              ))}
            </select>
            <input
              value={draft.title ?? ""}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Título"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none"
            />
          </div>
          <input
            value={draft.url ?? ""}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            placeholder="URL (opcional)"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none"
          />
          <input
            value={draft.author ?? ""}
            onChange={(e) => setDraft({ ...draft, author: e.target.value })}
            placeholder="Autor / canal (opcional)"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none"
          />
          <textarea
            value={draft.note ?? ""}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            placeholder="¿Por qué la guardás? (opcional)"
            rows={2}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setAdding(false);
                setDraft({});
              }}
              className="uppercase-label text-[var(--text-faint)] px-3"
            >
              Cancelar
            </button>
            <button
              onClick={addDetailed}
              disabled={!draft.title?.trim()}
              className="rounded-lg px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
              style={{ background: "var(--color-dorado)", color: "#0A1828" }}
            >
              Guardar fuente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceItem({ src, onRemove }: { src: Source; onRemove: () => void }) {
  const meta = SOURCE_META[src.kind];
  const ytId = src.url ? youtubeId(src.url) : null;

  return (
    <div className="group rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden">
      {ytId && (
        <a
          href={src.url}
          target="_blank"
          rel="noreferrer"
          className="block relative bg-black"
        >
          <img
            src={`https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`}
            alt=""
            className="w-full aspect-video object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span
              className="grid place-items-center rounded-full"
              style={{
                width: 44,
                height: 44,
                background: "rgba(0,0,0,0.65)",
                color: "#fff",
              }}
            >
              ▶
            </span>
          </span>
        </a>
      )}
      <div className="flex items-start gap-3 p-3">
        <span
          className="grid place-items-center rounded-md shrink-0 text-xs font-semibold"
          style={{
            width: 28,
            height: 28,
            background: meta.color + "22",
            color: meta.color,
            border: `1px solid ${meta.color}55`,
          }}
        >
          {meta.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="uppercase-label" style={{ color: meta.color }}>
              {meta.label}
            </span>
            {src.author && (
              <span className="uppercase-label text-[var(--text-faint)]">
                · {src.author}
              </span>
            )}
          </div>
          {src.url ? (
            <a
              href={src.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium hover:text-[var(--color-dorado)] truncate"
            >
              {src.title}
              <ExternalLink size={12} className="shrink-0" />
            </a>
          ) : (
            <div className="text-sm font-medium truncate">{src.title}</div>
          )}
          {src.note && (
            <p className="text-xs text-[var(--text-dim)] italic mt-1">
              {src.note}
            </p>
          )}
        </div>
        <button
          onClick={onRemove}
          className="text-[var(--text-faint)] hover:text-[var(--color-rojo)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
