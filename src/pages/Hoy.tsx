import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Clock, ArrowRight, MapPin, Flame, Check } from "lucide-react";
import { useStore } from "../store/store";
import { USERS } from "../data/users";
import { TaskRow } from "../components/TaskRow";
import { AvatarStack, VisibilityBadge, Card } from "../components/ui";
import {
  greeting,
  fmtLong,
  todayISO,
  countdownTo,
  dueBucket,
} from "../lib/dates";
import type { CalEvent, Habit } from "../data/types";
import { currentStreak } from "../lib/habits";

const currentStreakOf = (h: Habit) => currentStreak(h.completions);

function useTick(ms = 30000) {
  const [, set] = useState(0);
  useEffect(() => {
    const i = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(i);
  }, [ms]);
}

export function Hoy() {
  useTick();
  const { data, currentUser, visible, toggleHabitToday } = useStore();
  const u = currentUser ? USERS[currentUser] : null;
  const today = todayISO();
  const myHabits = data.habits.filter(
    (h) => h.owner === currentUser && !h.archived
  );

  const myTasks = visible(data.tasks).filter((t) => !t.done);
  const todayEvents = visible(data.events)
    .filter((e) => e.date === today)
    .sort((a, b) => a.start.localeCompare(b.start));

  const nextMeeting = visible(data.events)
    .filter((e) => e.kind === "reunion" && e.date >= today)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];
  const meeting = nextMeeting?.meetingId
    ? data.meetings.find((m) => m.id === nextMeeting.meetingId)
    : null;

  const overdue = myTasks.filter((t) => dueBucket(t.due) === "atrasada");
  const dueToday = myTasks.filter((t) => dueBucket(t.due) === "hoy");
  const thisWeek = myTasks.filter((t) => dueBucket(t.due) === "semana");

  const now = new Date();
  const nowHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-8">
      <div>
        {/* Header */}
        <div className="uppercase-label text-[var(--text-faint)] mb-3">
          {fmtLong(today)}
        </div>
        <h1 className="font-serif text-5xl md:text-6xl leading-none">
          {greeting()},{" "}
          <span className="italic text-[var(--color-dorado)]">{u?.name}</span>
        </h1>
        <p className="text-[var(--text-dim)] mt-3">
          {myTasks.length} tarea{myTasks.length !== 1 && "s"} pendiente
          {myTasks.length !== 1 && "s"}
          {nextMeeting && (
            <> · Próxima reunión a las {nextMeeting.start}.</>
          )}
        </p>
        <div className="gold-rule mt-5 max-w-xs" />

        {/* Próxima reunión */}
        {nextMeeting && (
          <section className="mt-8">
            <div className="uppercase-label text-[var(--text-faint)] mb-3">
              Próxima reunión
            </div>
            <Card className="p-6 relative overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <VisibilityBadge v={nextMeeting.visibleTo} />
                <span className="flex items-center gap-1 uppercase-label text-[var(--text-dim)]">
                  <Clock size={12} />
                  {nextMeeting.start}
                  {nextMeeting.end && ` — ${nextMeeting.end}`}
                </span>
                <span
                  className="uppercase-label rounded-md px-2 py-0.5"
                  style={{
                    background: "var(--color-dorado)",
                    color: "#0A1828",
                  }}
                >
                  {countdownTo(nextMeeting.date, nextMeeting.start)}
                </span>
              </div>
              <h2 className="font-serif text-3xl leading-tight">
                {nextMeeting.title}
              </h2>
              {nextMeeting.location && (
                <p className="flex items-center gap-1.5 text-[var(--text-dim)] italic mt-2">
                  <MapPin size={14} /> {nextMeeting.location}
                </p>
              )}
              <div className="flex items-center gap-2 mt-5">
                <AvatarStack ids={nextMeeting.visibleTo} size={32} />
                <span className="text-sm text-[var(--text-dim)] ml-2">
                  {nextMeeting.visibleTo.map((id) => USERS[id].name).join(", ")}
                </span>
              </div>
              {meeting && (
                <div className="flex gap-3 mt-6">
                  <Link
                    to="/reuniones"
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-sm"
                    style={{ background: "var(--color-dorado)", color: "#0A1828" }}
                  >
                    <FileText size={16} /> Abrir minuta <ArrowRight size={15} />
                  </Link>
                </div>
              )}
            </Card>
          </section>
        )}

        {/* Hábitos del día */}
        {myHabits.length > 0 && (
          <section className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-3xl">Hábitos de hoy</h2>
              <Link
                to="/habitos"
                className="uppercase-label text-[var(--text-faint)] hover:text-[var(--color-dorado)]"
              >
                Ver todos →
              </Link>
            </div>
            <div className="gold-rule mt-3 mb-5 max-w-[180px]" />
            <div className="flex flex-wrap gap-2">
              {myHabits.map((h) => {
                const done = h.completions.includes(today);
                return (
                  <button
                    key={h.id}
                    onClick={() => toggleHabitToday(h.id)}
                    className="flex items-center gap-2 rounded-xl border px-3 py-2 transition-all"
                    style={{
                      background: done ? (h.color ?? "var(--color-dorado)") : "var(--surface)",
                      color: done ? "#0A1828" : "inherit",
                      borderColor: done ? "transparent" : "var(--border)",
                    }}
                  >
                    <span className="text-base">
                      {done ? <Check size={16} /> : h.icon ?? "•"}
                    </span>
                    <span className="text-sm font-medium">{h.name}</span>
                    {!done && currentStreakOf(h) > 0 && (
                      <span className="flex items-center gap-1 text-xs text-[var(--color-dorado)]">
                        <Flame size={11} /> {currentStreakOf(h)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Tareas del día */}
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-3xl">Tareas del día</h2>
            <span className="uppercase-label text-[var(--text-faint)] tnum">
              {myTasks.length} abiertas
            </span>
          </div>
          <div className="gold-rule mt-3 mb-5 max-w-[180px]" />

          <Bucket title="Atrasadas" tone="var(--color-rojo)" tasks={overdue}>
            <Empty>Nada atrasado. Vas al día.</Empty>
          </Bucket>
          <Bucket title="Hoy" tone="var(--color-ambar)" tasks={dueToday}>
            <Empty>Nada vence hoy. Disfrutá el día.</Empty>
          </Bucket>
          <Bucket title="Esta semana" tone="var(--color-verde)" tasks={thisWeek}>
            <Empty>Sin pendientes esta semana.</Empty>
          </Bucket>
        </section>
      </div>

      {/* Timeline lateral */}
      <aside className="hidden lg:block">
        <div className="uppercase-label text-[var(--text-faint)] mb-4">
          Agenda de hoy
        </div>
        {todayEvents.length === 0 && (
          <p className="text-sm text-[var(--text-faint)] italic">
            Sin eventos hoy.
          </p>
        )}
        <div className="relative pl-5">
          <div
            className="absolute left-1 top-1 bottom-1 w-px"
            style={{ background: "var(--border)" }}
          />
          {todayEvents.map((ev) => {
            const isNow = ev.start <= nowHM && (ev.end ?? "23:59") >= nowHM;
            return <TimelineItem key={ev.id} ev={ev} isNow={isNow} />;
          })}
        </div>
      </aside>
    </div>
  );
}

function TimelineItem({ ev, isNow }: { ev: CalEvent; isNow: boolean }) {
  return (
    <div className="relative pb-6">
      <span
        className="absolute -left-[18px] top-1.5 rounded-full"
        style={{
          width: 9,
          height: 9,
          background: isNow ? "var(--color-dorado)" : "var(--text-faint)",
          boxShadow: isNow ? "0 0 0 4px rgba(201,168,76,0.2)" : undefined,
        }}
      />
      <div className="uppercase-label text-[var(--text-faint)] tnum">
        {isNow && (
          <span className="text-[var(--color-dorado)]">Ahora · </span>
        )}
        {ev.start}
      </div>
      <div className="font-medium mt-0.5">{ev.title}</div>
      {ev.location && (
        <div className="text-xs text-[var(--text-dim)] italic">{ev.location}</div>
      )}
      <div className="mt-1.5">
        <VisibilityBadge v={ev.visibleTo} />
      </div>
    </div>
  );
}

function Bucket({
  title,
  tone,
  tasks,
  children,
}: {
  title: string;
  tone: string;
  tasks: import("../data/types").Task[];
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="rounded-full"
          style={{ width: 7, height: 7, background: tone }}
        />
        <span className="uppercase-label" style={{ color: tone }}>
          {title}
        </span>
        <span className="uppercase-label text-[var(--text-faint)] tnum">
          {tasks.length}
        </span>
      </div>
      {tasks.length ? (
        tasks.map((t) => <TaskRow key={t.id} task={t} />)
      ) : (
        children
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-[var(--text-faint)] italic py-2">{children}</p>
  );
}
