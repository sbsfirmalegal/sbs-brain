import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { useStore } from "../store/store";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function NotifBell() {
  const { data, currentUser, markNotifRead, markAllNotifsRead } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  const items = data.notifications
    .filter((n) => n.recipient === currentUser)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);
  const unread = data.notifications.filter(
    (n) => n.recipient === currentUser && !n.read
  ).length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
        title="Bandeja de entrada"
      >
        <Bell size={18} />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 grid place-items-center rounded-full text-[10px] font-bold tnum"
            style={{
              minWidth: 18,
              height: 18,
              padding: "0 5px",
              background: "var(--color-dorado)",
              color: "#0A1828",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[360px] max-w-[95vw] rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl z-50 overflow-hidden"
            style={{ maxHeight: "80vh" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div>
                <div className="uppercase-label text-[var(--text-faint)]">
                  Bandeja de entrada
                </div>
                <div className="text-sm">
                  {unread > 0
                    ? `${unread} sin leer`
                    : "Estás al día"}
                </div>
              </div>
              {unread > 0 && (
                <button
                  onClick={markAllNotifsRead}
                  title="Marcar todo como leído"
                  className="text-[var(--text-faint)] hover:text-[var(--color-dorado)] p-1"
                >
                  <CheckCheck size={15} />
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 && (
                <p className="text-center text-[var(--text-faint)] italic py-8 text-sm">
                  Sin notificaciones todavía.
                </p>
              )}
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    markNotifRead(n.id);
                    if (n.link) nav(n.link);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors ${
                    n.read ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span
                        className="mt-1.5 rounded-full shrink-0"
                        style={{
                          width: 7,
                          height: 7,
                          background: "var(--color-dorado)",
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="text-xs text-[var(--text-dim)] italic truncate mt-0.5">
                          {n.body}
                        </div>
                      )}
                      <div className="uppercase-label text-[var(--text-faint)] mt-1">
                        hace{" "}
                        {formatDistanceToNowStrict(parseISO(n.createdAt), {
                          locale: es,
                        })}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t border-[var(--border)] p-2">
              <Link
                to="/bandeja"
                onClick={() => setOpen(false)}
                className="block text-center text-sm py-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--color-dorado)]"
              >
                Ver toda la bandeja →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
