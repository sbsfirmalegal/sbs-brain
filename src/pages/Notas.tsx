import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Tag,
  Link2,
  ExternalLink,
  X,
  Star,
  Search,
  Lightbulb,
  Sparkles,
  BookOpen,
  Scale,
  BookMarked,
  Briefcase,
  Users as UsersIcon,
  Sun,
  Cpu,
  FileText,
  CheckSquare,
  Flame,
  Target,
  CalendarDays,
  ArrowRight,
  Image as ImageIcon,
  Mic,
  Square as SquareIcon,
  Paperclip,
} from "lucide-react";
import { useStore } from "../store/store";
import { SectionTitle, VisibilityBadge, Chip } from "../components/ui";
import { RichTextEditor } from "../components/RichTextEditor";
import { USER_LIST } from "../data/users";
import type { UserId } from "../data/types";
import { fmtDay } from "../lib/dates";
import { filterNotes, monthlyStats, unprocessedIdeas, allTags, stripHtml } from "../lib/notes";
import type { ConvertibleKind, DecisionMeta, Note, NoteAttachment, NoteType, Source, SourceKind } from "../data/types";
import { REFLEXION_TEMPLATE } from "../data/types";
import {
  detectSourceKind,
  SOURCE_META,
  hostname,
  youtubeId,
} from "../lib/sources";
import { uploadNoteAttachment, deleteNoteAttachment, pickAudioMime } from "../lib/attachments";
import { useDebouncedSave } from "../lib/useDebouncedSave";

const TYPE_META: Record<NoteType, { label: string; icon: typeof Lightbulb; color: string }> = {
  idea: { label: "Idea", icon: Lightbulb, color: "#c9a84c" },
  reflexion: { label: "Reflexión", icon: Sparkles, color: "#9b6dff" },
  minuta: { label: "Minuta", icon: FileText, color: "#5a9d72" },
  aprendizaje: { label: "Aprendizaje", icon: BookOpen, color: "#2a4a82" },
  decision: { label: "Decisión", icon: Scale, color: "#d05a55" },
  lectura: { label: "Lectura", icon: BookMarked, color: "#d6a849" },
  proyecto_personal: { label: "Proyecto personal", icon: Briefcase, color: "#4a8fc9" },
  reunion_interna: { label: "Reunión interna", icon: UsersIcon, color: "#6d9b8f" },
  diario: { label: "Diario", icon: Sun, color: "#e0a458" },
  ia_tecnologia: { label: "IA y tecnología", icon: Cpu, color: "#7c6dd6" },
};

const CONVERT_META: Record<ConvertibleKind, { label: string; icon: typeof CheckSquare }> = {
  task: { label: "Tarea", icon: CheckSquare },
  habit: { label: "Hábito", icon: Flame },
  goal: { label: "Meta", icon: Target },
  event: { label: "Evento", icon: CalendarDays },
};

export function Notas() {
  const {
    data,
    currentUser,
    visible,
    addNote,
    updateNote,
    deleteNote,
    addTask,
    addHabit,
    addGoal,
    addEvent,
  } = useStore();

  const allNotes = visible(data.notes);
  const goals = visible(data.goals).filter((g) => g.status === "activa");

  const [quickCapture, setQuickCapture] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<NoteType | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [view, setView] = useState<"todas" | "pendientes" | "destacadas">("todas");
  const [selId, setSelId] = useState<string | null>(null);

  const tags = useMemo(() => allTags(allNotes), [allNotes]);
  const pending = useMemo(() => unprocessedIdeas(allNotes), [allNotes]);
  const pinned = allNotes.filter((n) => n.pinned);
  const stats = useMemo(() => monthlyStats(allNotes, 1)[0], [allNotes]);

  const filtered = useMemo(() => {
    let base = allNotes;
    if (view === "pendientes") base = pending;
    if (view === "destacadas") base = pinned;
    return filterNotes(base, { text: search, type: typeFilter, tag: tagFilter }).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  }, [allNotes, view, pending, pinned, search, typeFilter, tagFilter]);

  const sel = allNotes.find((n) => n.id === selId) || null;

  async function capture() {
    const text = quickCapture.trim();
    if (!text || !currentUser) return;
    const firstLine = text.split("\n")[0].slice(0, 60);
    const created = await addNote({
      title: firstLine || "Sin título",
      body: text,
      owner: currentUser,
      type: "idea",
    });
    setQuickCapture("");
    if (created) setSelId(created.id);
  }

  function create() {
    if (!currentUser) return;
    addNote({ title: "Nueva nota", owner: currentUser, body: "", type: "idea" }).then(
      (created) => created && setSelId(created.id)
    );
  }

  return (
    <div>
      <SectionTitle kicker="Notas" count={`${allNotes.length}`}>
        Notas
      </SectionTitle>

      {/* Captura rápida universal */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 mb-6">
        <textarea
          value={quickCapture}
          onChange={(e) => setQuickCapture(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              capture();
            }
          }}
          placeholder="¿Qué estás pensando?"
          rows={2}
          className="w-full bg-transparent font-serif text-xl outline-none resize-none placeholder:text-[var(--text-faint)]"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="uppercase-label text-[var(--text-faint)]">
            Enter para capturar · luego clasificás
          </span>
          <button
            onClick={capture}
            disabled={!quickCapture.trim()}
            className="rounded-lg px-4 py-1.5 text-sm font-semibold disabled:opacity-30"
            style={{ background: "var(--color-dorado)", color: "#0A1828" }}
          >
            Capturar
          </button>
        </div>
      </div>

      {/* Calendario de conocimiento */}
      {stats && stats.total > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 mb-6 overflow-x-auto overflow-y-hidden">
          <div className="flex items-center justify-between gap-3 min-w-max">
            <div className="uppercase-label text-[var(--text-faint)] capitalize whitespace-nowrap">{stats.label}</div>
            <div className="flex gap-5 text-sm">
              <Stat label="Reflexiones" value={stats.reflexiones} />
              <Stat label="Aprendizajes" value={stats.aprendizajes} />
              <Stat label="Decisiones" value={stats.decisiones} />
              <Stat label="Ideas" value={stats.ideas} />
              <Stat label="Convertidas" value={stats.convertidas} />
            </div>
          </div>
        </div>
      )}

      {/* Tabs de vista */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Chip active={view === "todas"} onClick={() => setView("todas")}>
          Todas
        </Chip>
        <Chip active={view === "pendientes"} onClick={() => setView("pendientes")}>
          Ideas sin procesar {pending.length > 0 && `· ${pending.length}`}
        </Chip>
        <Chip active={view === "destacadas"} onClick={() => setView("destacadas")}>
          Conocimiento destacado {pinned.length > 0 && `· ${pinned.length}`}
        </Chip>
      </div>

      {/* Búsqueda y filtros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 flex-1 min-w-[200px]">
          <Search size={14} className="text-[var(--text-faint)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por texto o etiqueta…"
            className="bg-transparent outline-none text-sm flex-1"
          />
        </div>
        <select
          value={typeFilter ?? ""}
          onChange={(e) => setTypeFilter((e.target.value || null) as NoteType | null)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TYPE_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        {tags.length > 0 && (
          <select
            value={tagFilter ?? ""}
            onChange={(e) => setTagFilter(e.target.value || null)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-sm"
          >
            <option value="">Todas las etiquetas</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        {/* lista */}
        <div>
          <button
            onClick={create}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] py-3 mb-3 text-sm text-[var(--text-dim)] hover:text-[var(--color-dorado)] hover:border-[var(--color-dorado)]"
          >
            <Plus size={16} /> Nueva nota
          </button>
          <div className="space-y-1">
            {filtered.map((n) => {
              const meta = TYPE_META[n.type];
              const Icon = meta.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => setSelId(n.id)}
                  className={`w-full text-left rounded-xl p-3 border transition-colors ${
                    selId === n.id
                      ? "border-[var(--color-dorado)] bg-[var(--surface)]"
                      : "border-transparent hover:bg-[var(--surface)]"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon size={13} style={{ color: meta.color }} className="shrink-0" />
                    <span className="font-medium truncate flex-1">{n.title}</span>
                    {n.pinned && <Star size={12} className="text-[var(--color-dorado)] shrink-0" fill="currentColor" />}
                  </div>
                  <div className="text-xs text-[var(--text-faint)] truncate mt-0.5">
                    {stripHtml(n.body) || "Sin contenido"}
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
                    {n.convertedTo && (
                      <span className="uppercase-label flex items-center gap-1 text-[var(--color-verde)]">
                        <ArrowRight size={10} />
                        {CONVERT_META[n.convertedTo.kind].label}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-[var(--text-faint)] italic px-3 py-6">
                Sin notas en esta vista.
              </p>
            )}
          </div>
        </div>

        {/* editor */}
        {sel ? (
          <NoteEditor
            key={sel.id}
            note={sel}
            goals={goals}
            onChange={(p) => updateNote(sel.id, p)}
            onDelete={() => {
              deleteNote(sel.id);
              setSelId(null);
            }}
            onConvert={async (kind) => {
              if (!currentUser) return;
              let id: string | undefined;
              if (kind === "task") {
                const t = await addTask({ title: sel.title, owner: currentUser, priority: "media" });
                id = t?.id;
              } else if (kind === "habit") {
                const h = await addHabit({ name: sel.title, owner: currentUser, frequency: "diario" });
                id = h?.id;
              } else if (kind === "goal") {
                const g = await addGoal({ title: sel.title, owner: currentUser, scope: "personal" });
                id = g?.id;
              } else if (kind === "event") {
                const ev = await addEvent({ title: sel.title, owner: currentUser });
                id = ev?.id;
              }
              if (id) updateNote(sel.id, { convertedTo: { kind, id } });
            }}
          />
        ) : (
          <div className="grid place-items-center text-[var(--text-faint)] italic min-h-[300px]">
            Elegí o creá una nota.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="font-serif text-lg tnum">{value}</div>
      <div className="uppercase-label text-[var(--text-faint)]">{label}</div>
    </div>
  );
}

function NoteEditor({
  note,
  goals,
  onChange,
  onDelete,
  onConvert,
}: {
  note: Note;
  goals: { id: string; title: string }[];
  onChange: (p: Partial<Note>) => void;
  onDelete: () => void;
  onConvert: (kind: ConvertibleKind) => void;
}) {
  const { currentUser } = useStore();
  const isOwner = note.owner === currentUser;
  const [tagInput, setTagInput] = useState("");
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);

  useDebouncedSave(title, note.title, (v) => isOwner && onChange({ title: v }));
  useDebouncedSave(body, note.body, (v) => isOwner && onChange({ body: v }));

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between mb-3">
        {isOwner ? (
          <select
            value={note.type}
            onChange={(e) => onChange({ type: e.target.value as NoteType })}
            className="uppercase-label bg-transparent text-[var(--color-dorado)] outline-none"
          >
            {Object.entries(TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="uppercase-label text-[var(--color-dorado)]">
            {TYPE_META[note.type].label}
          </span>
        )}
        <div className="flex items-center gap-3">
          {isOwner && (
            <button
              onClick={() => onChange({ pinned: !note.pinned })}
              title={note.pinned ? "Quitar de destacadas" : "Marcar como destacada"}
              className={note.pinned ? "text-[var(--color-dorado)]" : "text-[var(--text-faint)] hover:text-[var(--color-dorado)]"}
            >
              <Star size={16} fill={note.pinned ? "currentColor" : "none"} />
            </button>
          )}
          {!isOwner && note.pinned && (
            <Star size={16} className="text-[var(--color-dorado)]" fill="currentColor" />
          )}
          {isOwner ? (
            <div className="flex items-center gap-1" title="¿Quién puede ver esta nota?">
              {USER_LIST.map((u) => {
                const visible = note.visibleTo.includes(u.id as UserId);
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      const next = visible
                        ? note.visibleTo.filter((x) => x !== u.id)
                        : [...note.visibleTo, u.id as UserId];
                      if (next.length > 0) onChange({ visibleTo: next });
                    }}
                    title={u.name}
                    className={`rounded-full transition-opacity ${visible ? "opacity-100" : "opacity-25 hover:opacity-60"}`}
                  >
                    <span
                      className="grid place-items-center rounded-full font-semibold"
                      style={{ width: 20, height: 20, background: u.color, color: "#0A1828", fontSize: 8 }}
                    >
                      {u.initials}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <VisibilityBadge v={note.visibleTo} />
          )}
          {isOwner && (
            <button onClick={onDelete} className="text-[var(--text-faint)] hover:text-[var(--color-rojo)]">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => isOwner && setTitle(e.target.value)}
        readOnly={!isOwner}
        className="w-full bg-transparent font-serif text-2xl outline-none mb-3"
        placeholder="Título…"
      />
      {note.type === "reflexion" && !stripHtml(body) && (
        <button
          onClick={() => setBody("<p>" + REFLEXION_TEMPLATE.replace(/\n/g, "<br>") + "</p>")}
          className="uppercase-label mb-2 rounded-md border border-[var(--border)] px-2 py-1 text-[var(--text-dim)] hover:border-[var(--color-dorado)] hover:text-[var(--color-dorado)]"
        >
          Usar plantilla de reflexión diaria
        </button>
      )}
      <RichTextEditor
        value={body}
        onChange={(html) => isOwner && setBody(html)}
        readOnly={!isOwner}
        placeholder={isOwner ? "Escribí tu idea o reflexión…" : ""}
      />

      {note.type === "decision" && (
        <DecisionFields meta={note.decisionMeta} onChange={(m) => onChange({ decisionMeta: m })} />
      )}

      {note.type === "aprendizaje" && (
        <ApplicationField value={note.application} onChange={(v) => onChange({ application: v })} />
      )}

      {/* Conversión instantánea */}
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
        <span className="uppercase-label text-[var(--text-faint)] mr-1">Convertir en</span>
        {note.convertedTo ? (
          <span className="uppercase-label flex items-center gap-1.5 text-[var(--color-verde)] rounded-md border border-[var(--color-verde)]/30 px-2 py-1">
            <ArrowRight size={11} />
            Ya convertida en {CONVERT_META[note.convertedTo.kind].label}
          </span>
        ) : (
          (Object.entries(CONVERT_META) as [ConvertibleKind, typeof CONVERT_META.task][]).map(
            ([kind, meta]) => {
              const Icon = meta.icon;
              return (
                <button
                  key={kind}
                  onClick={() => onConvert(kind)}
                  className="uppercase-label flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2 py-1 hover:border-[var(--color-dorado)] hover:text-[var(--color-dorado)]"
                >
                  <Icon size={12} />
                  {meta.label}
                </button>
              );
            }
          )
        )}
      </div>

      {/* Vinculación con metas */}
      {goals.length > 0 && (
        <div className="flex items-center gap-2 mt-3">
          <Target size={13} className="text-[var(--text-faint)] shrink-0" />
          <select
            value={note.goalId ?? ""}
            onChange={(e) => onChange({ goalId: e.target.value || undefined })}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm"
          >
            <option value="">Sin meta vinculada</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
        <Tag size={14} className="text-[var(--text-faint)]" />
        {note.tags.map((t) => (
          isOwner ? (
            <span
              key={t}
              onClick={() => onChange({ tags: note.tags.filter((x) => x !== t) })}
              className="uppercase-label rounded-md border border-[var(--border)] px-2 py-0.5 cursor-pointer hover:border-[var(--color-rojo)] text-[var(--text-dim)]"
            >
              {t} ×
            </span>
          ) : (
            <span
              key={t}
              className="uppercase-label rounded-md border border-[var(--border)] px-2 py-0.5 text-[var(--text-dim)]"
            >
              {t}
            </span>
          )
        ))}
        {isOwner && (
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagInput.trim()) {
                const trimmed = tagInput.trim();
                if (!note.tags.includes(trimmed)) {
                  onChange({ tags: [...note.tags, trimmed] });
                }
                setTagInput("");
              }
            }}
            placeholder="+ etiqueta"
            className="bg-transparent text-sm outline-none w-24"
          />
        )}
      </div>

      {/* Adjuntos: imágenes y notas de voz */}
      <AttachmentsSection note={note} onChange={onChange} />

      {/* Fuentes */}
      <SourcesSection note={note} onChange={onChange} />
    </div>
  );
}

function DecisionFields({
  meta,
  onChange,
}: {
  meta?: DecisionMeta;
  onChange: (m: DecisionMeta) => void;
}) {
  const [local, setLocal] = useState<DecisionMeta>(meta ?? {});
  const lastSaved = useRef(meta ?? {});
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (local === lastSaved.current) return;
    const t = setTimeout(() => {
      lastSaved.current = local;
      onChangeRef.current(local);
    }, 600);
    return () => clearTimeout(t);
  }, [local]);

  const set = (patch: Partial<DecisionMeta>) =>
    setLocal((l) => ({ ...l, ...patch }));

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
      <div className="uppercase-label text-[var(--text-faint)]">Bitácora de la decisión</div>
      <div>
        <label className="uppercase-label text-[var(--text-faint)] block mb-1">Motivo</label>
        <textarea
          value={local.motivo ?? ""}
          onChange={(e) => set({ motivo: e.target.value })}
          placeholder="¿Por qué se tomó esta decisión?"
          rows={2}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none resize-none"
        />
      </div>
      <div>
        <label className="uppercase-label text-[var(--text-faint)] block mb-1">Resultado esperado</label>
        <textarea
          value={local.resultadoEsperado ?? ""}
          onChange={(e) => set({ resultadoEsperado: e.target.value })}
          placeholder="¿Qué se espera que pase?"
          rows={2}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none resize-none"
        />
      </div>
      <div>
        <label className="uppercase-label text-[var(--text-faint)] block mb-1">Resultado real</label>
        <textarea
          value={local.resultadoReal ?? ""}
          onChange={(e) => set({ resultadoReal: e.target.value })}
          placeholder="¿Qué pasó realmente? (completar después)"
          rows={2}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none resize-none"
        />
      </div>
    </div>
  );
}

function ApplicationField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  const [application, setApplication] = useState(value ?? "");
  useDebouncedSave(application, value ?? "", onChange);

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border)]">
      <label className="uppercase-label text-[var(--text-faint)] block mb-1">
        Aplicación práctica
      </label>
      <textarea
        value={application}
        onChange={(e) => setApplication(e.target.value)}
        placeholder="¿Cómo vas a usar esto en la firma o en tu día a día?"
        rows={2}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none resize-none"
      />
    </div>
  );
}

function AttachmentsSection({
  note,
  onChange,
}: {
  note: Note;
  onChange: (p: Partial<Note>) => void;
}) {
  const attachments = note.attachments ?? [];
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function add(att: NoteAttachment) {
    onChange({ attachments: [...attachments, att] });
  }

  async function remove(att: NoteAttachment) {
    onChange({ attachments: attachments.filter((a) => a.id !== att.id) });
    deleteNoteAttachment(att.url);
  }

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const att = await uploadNoteAttachment(note.owner, note.id, file, "image", ext, file.name);
    setUploading(false);
    if (att) add(att);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickAudioMime();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const ext = blob.type.includes("mp4") ? "m4a" : "webm";
        setUploading(true);
        const att = await uploadNoteAttachment(note.owner, note.id, blob, "audio", ext);
        setUploading(false);
        if (att) add(att);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (err) {
      console.error("[attachments] no se pudo grabar audio:", err);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  const images = attachments.filter((a) => a.kind === "image");
  const audios = attachments.filter((a) => a.kind === "audio");

  return (
    <div className="mt-5 pt-5 border-t border-[var(--border)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 uppercase-label text-[var(--text-dim)]">
          <Paperclip size={14} />
          Adjuntos
          {attachments.length > 0 && (
            <span className="text-[var(--text-faint)] tnum">· {attachments.length}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {uploading && (
            <span className="uppercase-label text-[var(--text-faint)]">Subiendo…</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePickImage}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || recording}
            className="uppercase-label flex items-center gap-1 text-[var(--text-faint)] hover:text-[var(--color-dorado)] disabled:opacity-40"
          >
            <ImageIcon size={13} />
            Imagen
          </button>
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={uploading}
            className={`uppercase-label flex items-center gap-1 disabled:opacity-40 ${
              recording ? "text-[var(--color-rojo)]" : "text-[var(--text-faint)] hover:text-[var(--color-dorado)]"
            }`}
          >
            {recording ? <SquareIcon size={13} /> : <Mic size={13} />}
            {recording ? "Detener" : "Voz"}
          </button>
        </div>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {images.map((a) => (
            <div key={a.id} className="group relative rounded-lg overflow-hidden border border-[var(--border)]">
              <a href={a.url} target="_blank" rel="noreferrer">
                <img src={a.url} alt={a.name ?? ""} className="w-full aspect-square object-cover" />
              </a>
              <button
                onClick={() => remove(a)}
                className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {audios.length > 0 && (
        <div className="space-y-2">
          {audios.map((a) => (
            <div key={a.id} className="group flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2">
              <audio controls src={a.url} className="flex-1 h-9" />
              <button
                onClick={() => remove(a)}
                className="text-[var(--text-faint)] hover:text-[var(--color-rojo)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
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
