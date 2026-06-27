import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppData,
  CalEvent,
  ChatMessage,
  Goal,
  Habit,
  Meeting,
  Note,
  Notification,
  NotifKind,
  Task,
  UserId,
} from "../data/types";
import { todayISO } from "../lib/dates";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { loadProfileMap, type ProfileMap } from "../lib/profiles";
import {
  eventToRow,
  goalToRow,
  habitToRow,
  meetingToRow,
  messageToRow,
  noteToRow,
  notifToRow,
  rowToEvent,
  rowToGoal,
  rowToHabit,
  rowToMeeting,
  rowToMessage,
  rowToNote,
  rowToNotif,
  rowToTask,
  taskToRow,
} from "../lib/mappers";

export type Theme = "claro" | "medio" | "oscuro";
const THEMES: Theme[] = ["claro", "medio", "oscuro"];

const THEME_KEY = "sbs-theme-v1";
const SIDEBAR_KEY = "sbs-sidebar-v1";
const ALL_USERS: UserId[] = ["nelson", "estela", "fatima"];

const emptyData: AppData = {
  events: [],
  tasks: [],
  meetings: [],
  notes: [],
  messages: [],
  habits: [],
  goals: [],
  notifications: [],
  pins: {},
};

interface Ctx {
  data: AppData;
  currentUser: UserId | null;
  theme: Theme;
  sidebarCollapsed: boolean;
  syncing: boolean;
  logout: () => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  // tasks
  addTask: (t: Partial<Task> & { title: string; owner: UserId }) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  // events
  addEvent: (e: Partial<CalEvent> & { title: string; owner: UserId }) => Promise<CalEvent | null>;
  updateEvent: (id: string, patch: Partial<CalEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  // meetings
  addMeeting: (m: Partial<Meeting> & { title: string }) => Promise<Meeting | null>;
  updateMeeting: (id: string, patch: Partial<Meeting>) => Promise<void>;
  // notes
  addNote: (n: Partial<Note> & { title: string; owner: UserId }) => Promise<void>;
  updateNote: (id: string, patch: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  // chat
  sendMessage: (text: string) => Promise<void>;
  reactMessage: (id: string, emoji: string) => Promise<void>;
  // notificaciones
  pushNotif: (n: Omit<Notification, "id" | "createdAt" | "read">) => Promise<void>;
  markNotifRead: (id: string) => Promise<void>;
  markAllNotifsRead: () => Promise<void>;
  clearNotifs: () => Promise<void>;
  // hábitos
  addHabit: (h: Partial<Habit> & { name: string; owner: UserId }) => Promise<void>;
  toggleHabitToday: (id: string, isoDay?: string) => Promise<void>;
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  // metas
  addGoal: (g: Partial<Goal> & { title: string; owner: UserId }) => Promise<void>;
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  // visibility helper
  visible: <T extends { visibleTo: UserId[] }>(items: T[]) => T[];
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const currentUser = (profile?.slug ?? null) as UserId | null;

  const [data, setData] = useState<AppData>(emptyData);
  const [syncing, setSyncing] = useState(false);
  const profileMapRef = useRef<ProfileMap | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const v = localStorage.getItem(THEME_KEY);
    return v && THEMES.includes(v as Theme) ? (v as Theme) : "medio";
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem(SIDEBAR_KEY) === "1"
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  /* ─────────── Carga inicial + Realtime ─────────── */
  useEffect(() => {
    if (!profile) {
      setData(emptyData);
      profileMapRef.current = null;
      return;
    }

    let cancelled = false;
    setSyncing(true);

    (async () => {
      try {
        const map = await loadProfileMap();
        profileMapRef.current = map;

        const [
          tasksRes,
          eventsRes,
          meetingsRes,
          notesRes,
          habitsRes,
          goalsRes,
          messagesRes,
          notifsRes,
        ] = await Promise.all([
          supabase.from("tasks").select("*"),
          supabase.from("events").select("*"),
          supabase.from("meetings").select("*"),
          supabase.from("notes").select("*"),
          supabase.from("habits").select("*"),
          supabase.from("goals").select("*"),
          supabase.from("messages").select("*").order("created_at"),
          supabase.from("notifications").select("*").order("created_at", { ascending: false }),
        ]);

        if (cancelled) return;
        setData({
          tasks: (tasksRes.data ?? []).map((r) => rowToTask(r, map)),
          events: (eventsRes.data ?? []).map((r) => rowToEvent(r, map)),
          meetings: (meetingsRes.data ?? []).map((r) => rowToMeeting(r, map)),
          notes: (notesRes.data ?? []).map((r) => rowToNote(r, map)),
          habits: (habitsRes.data ?? []).map((r) => rowToHabit(r, map)),
          goals: (goalsRes.data ?? []).map((r) => rowToGoal(r, map)),
          messages: (messagesRes.data ?? []).map((r) => rowToMessage(r, map)),
          notifications: (notifsRes.data ?? []).map((r) => rowToNotif(r, map)),
          pins: {},
        });
      } catch (e) {
        console.error("Error cargando datos:", e);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    /* ───── Realtime: una suscripción global ───── */
    const channel = supabase.channel("sbs-realtime");

    const subscribe = <K extends keyof AppData>(
      table: string,
      key: K,
      toItem: (r: any, m: ProfileMap) => any,
      sortDesc?: keyof any
    ) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          const map = profileMapRef.current;
          if (!map) return;
          setData((d) => {
            const list = [...(d[key] as any[])];
            if (payload.eventType === "INSERT") {
              const item = toItem(payload.new, map);
              if (list.find((x) => x.id === item.id)) return d;
              const next = sortDesc ? [item, ...list] : [...list, item];
              return { ...d, [key]: next };
            }
            if (payload.eventType === "UPDATE") {
              const item = toItem(payload.new, map);
              return {
                ...d,
                [key]: list.map((x) => (x.id === item.id ? item : x)),
              };
            }
            if (payload.eventType === "DELETE") {
              const id = (payload.old as any).id;
              return { ...d, [key]: list.filter((x) => x.id !== id) };
            }
            return d;
          });
        }
      );
    };

    subscribe("tasks", "tasks", rowToTask);
    subscribe("events", "events", rowToEvent);
    subscribe("meetings", "meetings", rowToMeeting);
    subscribe("notes", "notes", rowToNote);
    subscribe("habits", "habits", rowToHabit);
    subscribe("goals", "goals", rowToGoal);
    subscribe("messages", "messages", rowToMessage);
    subscribe("notifications", "notifications", rowToNotif, "createdAt");

    channel.subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [profile]);

  /* ─────────── Notificaciones derivadas (locales por usuario) ─────────── */
  useEffect(() => {
    if (!currentUser || !profileMapRef.current) return;
    const map = profileMapRef.current;
    const me = currentUser;
    const meUuid = map.uuidOf[me];

    const generate = async () => {
      const todayKey = todayISO();
      const existing = new Set(
        data.notifications
          .filter((n) => n.recipient === me)
          .map((n) => `${n.kind}:${n.refId ?? ""}:${n.createdAt.slice(0, 10)}`)
      );
      const inserts: any[] = [];
      const push = (kind: NotifKind, title: string, opts: Partial<Notification>) => {
        const key = `${kind}:${opts.refId ?? ""}:${todayKey}`;
        if (existing.has(key)) return;
        inserts.push({
          kind,
          recipient: meUuid,
          title,
          body: opts.body ?? null,
          link: opts.link ?? null,
          ref_id: opts.refId ?? null,
          read: false,
        });
        existing.add(key);
      };
      data.tasks.forEach((t) => {
        if (t.done || !t.visibleTo.includes(me)) return;
        if (t.due === todayKey)
          push("tarea-vence-hoy", `Vence hoy: ${t.title}`, { refId: t.id, link: "/tareas" });
        else if (t.due && t.due < todayKey)
          push("tarea-atrasada", `Atrasada: ${t.title}`, { refId: t.id, link: "/tareas" });
      });
      data.events.forEach((e) => {
        if (e.kind !== "reunion") return;
        if (e.date !== todayKey || !e.visibleTo.includes(me)) return;
        push("reunion-proxima", `Reunión hoy: ${e.title}`, {
          refId: e.id,
          link: "/reuniones",
          body: `${e.start}${e.location ? ` · ${e.location}` : ""}`,
        });
      });
      if (inserts.length) {
        await supabase.from("notifications").insert(inserts);
      }
    };
    generate();
    const i = setInterval(generate, 5 * 60 * 1000);
    return () => clearInterval(i);
  }, [currentUser, data.tasks, data.events]);

  /* ─────────── Mutaciones ─────────── */
  const value = useMemo<Ctx>(() => {
    const requireMap = () => {
      const m = profileMapRef.current;
      if (!m) throw new Error("ProfileMap no cargado");
      return m;
    };
    const u = () => currentUser as UserId;

    return {
      data,
      currentUser,
      theme,
      sidebarCollapsed,
      syncing,
      logout: () => { signOut(); },
      toggleTheme: () =>
        setTheme((t) => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]),
      toggleSidebar: () => setSidebarCollapsed((s) => !s),

      /* ─── TASKS ─── */
      addTask: async (t) => {
        const m = requireMap();
        const visibleTo = t.visibleTo ?? [t.owner];
        const row = taskToRow(
          {
            ...t,
            done: false,
            visibleTo,
            due: t.due ?? null,
            priority: t.priority ?? "media",
          },
          m
        );
        const { data: ins } = await supabase
          .from("tasks")
          .insert(row)
          .select()
          .single();
        const me = currentUser;
        if (ins && me && t.owner !== me) {
          await supabase.from("notifications").insert({
            kind: "tarea-asignada",
            recipient: m.uuidOf[t.owner],
            from_user: m.uuidOf[me],
            title: `Nueva tarea: ${t.title}`,
            body: t.due ? `Vence: ${t.due}` : null,
            link: "/tareas",
            ref_id: ins.id,
            read: false,
          });
        }
      },
      toggleTask: async (id) => {
        const t = data.tasks.find((x) => x.id === id);
        if (!t) return;
        const done = !t.done;
        await supabase
          .from("tasks")
          .update({ done, completed_at: done ? todayISO() : null })
          .eq("id", id);
      },
      updateTask: async (id, patch) => {
        const m = requireMap();
        await supabase.from("tasks").update(taskToRow(patch, m)).eq("id", id);
      },
      deleteTask: async (id) => {
        await supabase.from("tasks").delete().eq("id", id);
      },

      /* ─── EVENTS ─── */
      addEvent: async (e) => {
        const m = requireMap();
        const row = eventToRow(
          {
            ...e,
            kind: e.kind ?? "evento",
            date: e.date ?? todayISO(),
            start: e.start ?? "09:00",
            visibleTo: e.visibleTo ?? [e.owner],
          },
          m
        );
        const { data: ins } = await supabase
          .from("events")
          .insert(row)
          .select()
          .single();
        return ins ? rowToEvent(ins, m) : null;
      },
      updateEvent: async (id, patch) => {
        const m = requireMap();
        await supabase.from("events").update(eventToRow(patch, m)).eq("id", id);
      },
      deleteEvent: async (id) => {
        await supabase.from("events").delete().eq("id", id);
      },

      /* ─── MEETINGS ─── */
      addMeeting: async (mt) => {
        const m = requireMap();
        const attendees = mt.attendees ?? [u()];
        const row = meetingToRow(
          {
            type: mt.type ?? "ordinaria",
            date: mt.date ?? todayISO(),
            start: mt.start ?? "09:00",
            attendees,
            visibleTo: mt.visibleTo ?? attendees,
            minute: "",
            agreements: [],
            closed: false,
            ...mt,
          },
          m
        );
        const { data: ins } = await supabase
          .from("meetings")
          .insert(row)
          .select()
          .single();
        return ins ? rowToMeeting(ins, m) : null;
      },
      updateMeeting: async (id, patch) => {
        const m = requireMap();
        await supabase.from("meetings").update(meetingToRow(patch, m)).eq("id", id);
      },

      /* ─── NOTES ─── */
      addNote: async (n) => {
        const m = requireMap();
        const row = noteToRow(
          {
            body: "",
            visibleTo: n.visibleTo ?? [n.owner],
            tags: n.tags ?? [],
            type: n.type ?? "idea",
            sources: [],
            ...n,
          },
          m
        );
        await supabase.from("notes").insert(row);
      },
      updateNote: async (id, patch) => {
        const m = requireMap();
        const row = noteToRow(patch, m);
        row.updated_at = new Date().toISOString();
        await supabase.from("notes").update(row).eq("id", id);
      },
      deleteNote: async (id) => {
        await supabase.from("notes").delete().eq("id", id);
      },

      /* ─── CHAT ─── */
      sendMessage: async (text) => {
        const m = requireMap();
        const me = u();
        const { data: ins } = await supabase
          .from("messages")
          .insert(messageToRow({ author: me, text, kind: "text", reactions: {} }, m))
          .select()
          .single();
        if (ins) {
          const others = ALL_USERS.filter((id) => id !== me);
          const notifs = others.map((r) => ({
            kind: "mensaje",
            recipient: m.uuidOf[r],
            from_user: m.uuidOf[me],
            title: `Nuevo mensaje en el canal`,
            body: text.length > 80 ? text.slice(0, 80) + "…" : text,
            link: "/chat",
            ref_id: ins.id,
            read: false,
          }));
          await supabase.from("notifications").insert(notifs);
        }
      },
      reactMessage: async (id, emoji) => {
        const me = u();
        const msg = data.messages.find((x) => x.id === id);
        if (!msg) return;
        const cur = msg.reactions ?? {};
        const next = { ...cur };
        if (next[me] === emoji) delete next[me];
        else next[me] = emoji;
        await supabase.from("messages").update({ reactions: next }).eq("id", id);
      },

      /* ─── NOTIFICATIONS ─── */
      pushNotif: async (n) => {
        const m = requireMap();
        await supabase.from("notifications").insert(notifToRow({ ...n, read: false }, m));
      },
      markNotifRead: async (id) => {
        await supabase.from("notifications").update({ read: true }).eq("id", id);
      },
      markAllNotifsRead: async () => {
        const m = requireMap();
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("recipient", m.uuidOf[u()])
          .eq("read", false);
      },
      clearNotifs: async () => {
        const m = requireMap();
        await supabase
          .from("notifications")
          .delete()
          .eq("recipient", m.uuidOf[u()]);
      },

      /* ─── HABITS ─── */
      addHabit: async (h) => {
        const m = requireMap();
        const row = habitToRow(
          {
            frequency: h.frequency ?? "diario",
            completions: [],
            ...h,
          },
          m
        );
        await supabase.from("habits").insert(row);
      },
      toggleHabitToday: async (id, isoDay) => {
        const h = data.habits.find((x) => x.id === id);
        if (!h) return;
        const day = isoDay ?? todayISO();
        const completions = h.completions.includes(day)
          ? h.completions.filter((x) => x !== day)
          : [...h.completions, day];
        await supabase.from("habits").update({ completions }).eq("id", id);
      },
      updateHabit: async (id, patch) => {
        const m = requireMap();
        await supabase.from("habits").update(habitToRow(patch, m)).eq("id", id);
      },
      deleteHabit: async (id) => {
        await supabase.from("habits").delete().eq("id", id);
      },

      /* ─── GOALS ─── */
      addGoal: async (g) => {
        const m = requireMap();
        const row = goalToRow(
          {
            scope: g.scope ?? "personal",
            visibleTo: g.visibleTo ?? [g.owner],
            due: g.due ?? null,
            status: g.status ?? "activa",
            linkedTaskIds: g.linkedTaskIds ?? [],
            linkedHabitIds: g.linkedHabitIds ?? [],
            ...g,
          },
          m
        );
        await supabase.from("goals").insert(row);
      },
      updateGoal: async (id, patch) => {
        const m = requireMap();
        await supabase.from("goals").update(goalToRow(patch, m)).eq("id", id);
      },
      deleteGoal: async (id) => {
        await supabase.from("goals").delete().eq("id", id);
      },

      /* ─── VISIBILITY ─── */
      visible: (items) =>
        items.filter((it) => !currentUser || it.visibleTo.includes(u())),
    };
  }, [data, currentUser, theme, sidebarCollapsed, syncing, signOut]);

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore fuera de StoreProvider");
  return ctx;
}
