import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckSquare, Calendar, Users, StickyNote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/store";

interface Result {
  id: string;
  label: string;
  group: string;
  icon: typeof Search;
  to: string;
}

export function CommandSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data, visible } = useStore();
  const [q, setQ] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        open ? onClose() : null;
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const out: Result[] = [];
    visible(data.tasks)
      .filter((t) => t.title.toLowerCase().includes(term))
      .forEach((t) =>
        out.push({ id: t.id, label: t.title, group: "Tareas", icon: CheckSquare, to: "/tareas" })
      );
    visible(data.events)
      .filter((e) => e.title.toLowerCase().includes(term))
      .forEach((e) =>
        out.push({ id: e.id, label: e.title, group: "Agenda", icon: Calendar, to: "/agenda" })
      );
    visible(data.meetings)
      .filter((m) => m.title.toLowerCase().includes(term))
      .forEach((m) =>
        out.push({ id: m.id, label: m.title, group: "Reuniones", icon: Users, to: "/reuniones" })
      );
    visible(data.notes)
      .filter(
        (n) =>
          n.title.toLowerCase().includes(term) ||
          n.body.toLowerCase().includes(term)
      )
      .forEach((n) =>
        out.push({ id: n.id, label: n.title, group: "Notas", icon: StickyNote, to: "/notas" })
      );
    return out;
  }, [q, data, visible]);

  const groups = useMemo(() => {
    const g: Record<string, Result[]> = {};
    results.forEach((r) => (g[r.group] = [...(g[r.group] || []), r]));
    return g;
  }, [results]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ background: "rgba(5,12,24,0.6)", backdropFilter: "blur(4px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 14, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
              <Search size={18} className="text-[var(--text-faint)]" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar en todo el cronograma…"
                className="flex-1 bg-transparent outline-none text-base"
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {q && results.length === 0 && (
                <div className="px-3 py-6 text-center text-[var(--text-faint)] text-sm">
                  Sin resultados para «{q}»
                </div>
              )}
              {Object.entries(groups).map(([group, items]) => (
                <div key={group} className="mb-2">
                  <div className="uppercase-label text-[var(--text-faint)] px-3 py-1.5">
                    {group}
                  </div>
                  {items.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        nav(r.to);
                        onClose();
                      }}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[var(--surface-2)]"
                    >
                      <r.icon size={16} className="text-[var(--text-dim)] shrink-0" />
                      <span className="truncate">{r.label}</span>
                    </button>
                  ))}
                </div>
              ))}
              {!q && (
                <div className="px-3 py-6 text-center text-[var(--text-faint)] text-sm">
                  Escribí para buscar tareas, eventos, reuniones y notas.
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
