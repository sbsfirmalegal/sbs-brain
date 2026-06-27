import { Link } from "react-router-dom";
import {
  Inbox,
  CheckCheck,
  Trash2,
  CheckSquare,
  AlertCircle,
  Users as UsersIcon,
  MessageCircle,
  Trophy,
  Bell,
} from "lucide-react";
import { useStore } from "../store/store";
import { SectionTitle, Card, Avatar } from "../components/ui";
import { USERS } from "../data/users";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { NotifKind } from "../data/types";

const KIND_META: Record<NotifKind, { icon: any; color: string }> = {
  "tarea-asignada": { icon: CheckSquare, color: "var(--color-dorado)" },
  "tarea-vence-hoy": { icon: AlertCircle, color: "var(--color-ambar)" },
  "tarea-atrasada": { icon: AlertCircle, color: "var(--color-rojo)" },
  "reunion-proxima": { icon: UsersIcon, color: "var(--color-dorado)" },
  mensaje: { icon: MessageCircle, color: "var(--color-verde)" },
  "meta-lograda": { icon: Trophy, color: "var(--color-dorado)" },
  sistema: { icon: Bell, color: "var(--text-dim)" },
};

export function Bandeja() {
  const {
    data,
    currentUser,
    markNotifRead,
    markAllNotifsRead,
    clearNotifs,
  } = useStore();

  const items = data.notifications
    .filter((n) => n.recipient === currentUser)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const unread = items.filter((n) => !n.read).length;

  return (
    <div>
      <SectionTitle
        kicker="Bandeja de entrada"
        count={`${items.length} totales`}
      >
        Notificaciones{" "}
        {unread > 0 && (
          <span className="italic text-[var(--color-dorado)]">· {unread} nuevas</span>
        )}
      </SectionTitle>

      <div className="flex gap-2 mb-4">
        <button
          disabled={!unread}
          onClick={markAllNotifsRead}
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--border-strong)] disabled:opacity-40"
        >
          <CheckCheck size={14} /> Marcar todo como leído
        </button>
        <button
          disabled={!items.length}
          onClick={clearNotifs}
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--border-strong)] disabled:opacity-40"
        >
          <Trash2 size={14} /> Limpiar bandeja
        </button>
      </div>

      <div className="space-y-2">
        {items.map((n) => {
          const meta = KIND_META[n.kind];
          const Icon = meta.icon;
          const from = n.fromUser ? USERS[n.fromUser] : null;
          const Wrapper = ({ children }: { children: React.ReactNode }) =>
            n.link ? (
              <Link
                to={n.link}
                onClick={() => markNotifRead(n.id)}
                className="block"
              >
                {children}
              </Link>
            ) : (
              <button
                onClick={() => markNotifRead(n.id)}
                className="w-full text-left"
              >
                {children}
              </button>
            );

          return (
            <Wrapper key={n.id}>
              <Card
                className={`p-4 flex items-start gap-3 transition-all ${
                  n.read ? "opacity-60" : ""
                } hover:border-[var(--border-strong)]`}
              >
                <span
                  className="grid place-items-center rounded-lg shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    background: meta.color + "1a",
                    color: meta.color,
                    border: `1px solid ${meta.color}55`,
                  }}
                >
                  <Icon size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <span
                        className="rounded-full"
                        style={{
                          width: 7,
                          height: 7,
                          background: "var(--color-dorado)",
                        }}
                      />
                    )}
                    <span className="font-medium">{n.title}</span>
                  </div>
                  {n.body && (
                    <p className="text-sm text-[var(--text-dim)] mt-0.5 italic">
                      {n.body}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    {from && <Avatar id={from.id} size={18} />}
                    <span className="uppercase-label text-[var(--text-faint)]">
                      {from ? from.name + " · " : ""}
                      hace{" "}
                      {formatDistanceToNowStrict(parseISO(n.createdAt), {
                        locale: es,
                      })}
                    </span>
                  </div>
                </div>
              </Card>
            </Wrapper>
          );
        })}

        {items.length === 0 && (
          <div className="text-center py-12">
            <Inbox
              size={32}
              className="mx-auto text-[var(--text-faint)] mb-3"
            />
            <p className="text-[var(--text-dim)] italic">
              Tu bandeja está vacía.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
