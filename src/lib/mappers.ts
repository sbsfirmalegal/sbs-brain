// Convierte filas de Supabase (snake_case + uuid) a tipos de la app (camelCase + slug)
// y viceversa. Centralizado acá para que ningún componente toque la forma DB.

import type {
  Agreement,
  CalEvent,
  ChatMessage,
  Goal,
  Habit,
  Meeting,
  Note,
  Notification,
  Source,
  Task,
  UserId,
} from "../data/types";
import { slugsToUuids, uuidsToSlugs, type ProfileMap } from "./profiles";

/* ─── TASKS ─── */
export function rowToTask(r: any, m: ProfileMap): Task {
  return {
    id: r.id,
    title: r.title,
    done: r.done,
    owner: m.slugOf[r.owner],
    visibleTo: uuidsToSlugs(r.visible_to, m),
    due: r.due,
    priority: r.priority,
    area: r.area ?? undefined,
    meetingId: r.meeting_id ?? undefined,
    folio: r.folio ?? undefined,
    createdAt: r.created_at,
    completedAt: r.completed_at ?? undefined,
  };
}
export function taskToRow(t: Partial<Task>, m: ProfileMap) {
  const row: any = {};
  if (t.id !== undefined) row.id = t.id;
  if (t.title !== undefined) row.title = t.title;
  if (t.done !== undefined) row.done = t.done;
  if (t.owner !== undefined) row.owner = m.uuidOf[t.owner];
  if (t.visibleTo !== undefined) row.visible_to = slugsToUuids(t.visibleTo, m);
  if (t.due !== undefined) row.due = t.due;
  if (t.priority !== undefined) row.priority = t.priority;
  if (t.area !== undefined) row.area = t.area ?? null;
  if (t.meetingId !== undefined) row.meeting_id = t.meetingId ?? null;
  if (t.folio !== undefined) row.folio = t.folio ?? null;
  if (t.completedAt !== undefined) row.completed_at = t.completedAt ?? null;
  return row;
}

/* ─── EVENTS ─── */
export function rowToEvent(r: any, m: ProfileMap): CalEvent {
  return {
    id: r.id,
    title: r.title,
    kind: r.kind,
    date: r.date,
    start: r.start_time,
    end: r.end_time ?? undefined,
    allDay: r.all_day ?? false,
    location: r.location ?? undefined,
    owner: m.slugOf[r.owner],
    visibleTo: uuidsToSlugs(r.visible_to, m),
    notes: r.notes ?? undefined,
    meetingId: r.meeting_id ?? undefined,
  };
}
export function eventToRow(e: Partial<CalEvent>, m: ProfileMap) {
  const row: any = {};
  if (e.id !== undefined) row.id = e.id;
  if (e.title !== undefined) row.title = e.title;
  if (e.kind !== undefined) row.kind = e.kind;
  if (e.date !== undefined) row.date = e.date;
  if (e.start !== undefined) row.start_time = e.start;
  if (e.end !== undefined) row.end_time = e.end ?? null;
  if (e.allDay !== undefined) row.all_day = e.allDay;
  if (e.location !== undefined) row.location = e.location ?? null;
  if (e.owner !== undefined) row.owner = m.uuidOf[e.owner];
  if (e.visibleTo !== undefined) row.visible_to = slugsToUuids(e.visibleTo, m);
  if (e.notes !== undefined) row.notes = e.notes ?? null;
  if (e.meetingId !== undefined) row.meeting_id = e.meetingId ?? null;
  return row;
}

/* ─── MEETINGS ─── */
export function rowToMeeting(r: any, m: ProfileMap): Meeting {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    date: r.date,
    start: r.start_time,
    end: r.end_time ?? undefined,
    attendees: uuidsToSlugs(r.attendees, m),
    visibleTo: uuidsToSlugs(r.visible_to, m),
    minute: r.minute ?? "",
    agreements: (r.agreements ?? []) as Agreement[],
    closed: r.closed ?? false,
  };
}
export function meetingToRow(mt: Partial<Meeting>, m: ProfileMap) {
  const row: any = {};
  if (mt.id !== undefined) row.id = mt.id;
  if (mt.title !== undefined) row.title = mt.title;
  if (mt.type !== undefined) row.type = mt.type;
  if (mt.date !== undefined) row.date = mt.date;
  if (mt.start !== undefined) row.start_time = mt.start;
  if (mt.end !== undefined) row.end_time = mt.end ?? null;
  if (mt.attendees !== undefined) row.attendees = slugsToUuids(mt.attendees, m);
  if (mt.visibleTo !== undefined) row.visible_to = slugsToUuids(mt.visibleTo, m);
  if (mt.minute !== undefined) row.minute = mt.minute;
  if (mt.agreements !== undefined) row.agreements = mt.agreements;
  if (mt.closed !== undefined) row.closed = mt.closed;
  return row;
}

/* ─── NOTES ─── */
export function rowToNote(r: any, m: ProfileMap): Note {
  return {
    id: r.id,
    title: r.title,
    body: r.body ?? "",
    owner: m.slugOf[r.owner],
    visibleTo: uuidsToSlugs(r.visible_to, m),
    tags: r.tags ?? [],
    type: r.type,
    sources: (r.sources ?? []) as Source[],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
export function noteToRow(n: Partial<Note>, m: ProfileMap) {
  const row: any = {};
  if (n.id !== undefined) row.id = n.id;
  if (n.title !== undefined) row.title = n.title;
  if (n.body !== undefined) row.body = n.body;
  if (n.owner !== undefined) row.owner = m.uuidOf[n.owner];
  if (n.visibleTo !== undefined) row.visible_to = slugsToUuids(n.visibleTo, m);
  if (n.tags !== undefined) row.tags = n.tags;
  if (n.type !== undefined) row.type = n.type;
  if (n.sources !== undefined) row.sources = n.sources;
  return row;
}

/* ─── HABITS ─── */
export function rowToHabit(r: any, m: ProfileMap): Habit {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon ?? undefined,
    color: r.color ?? undefined,
    owner: m.slugOf[r.owner],
    visibleTo: [m.slugOf[r.owner]], // hábitos siempre privados al dueño
    frequency: r.frequency,
    weeklyTarget: r.weekly_target ?? undefined,
    completions: r.completions ?? [],
    createdAt: r.created_at,
    archived: r.archived ?? false,
  };
}
export function habitToRow(h: Partial<Habit>, m: ProfileMap) {
  const row: any = {};
  if (h.id !== undefined) row.id = h.id;
  if (h.name !== undefined) row.name = h.name;
  if (h.icon !== undefined) row.icon = h.icon ?? null;
  if (h.color !== undefined) row.color = h.color ?? null;
  if (h.owner !== undefined) row.owner = m.uuidOf[h.owner];
  if (h.frequency !== undefined) row.frequency = h.frequency;
  if (h.weeklyTarget !== undefined) row.weekly_target = h.weeklyTarget ?? null;
  if (h.completions !== undefined) row.completions = h.completions;
  if (h.archived !== undefined) row.archived = h.archived;
  return row;
}

/* ─── GOALS ─── */
export function rowToGoal(r: any, m: ProfileMap): Goal {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    scope: r.scope,
    owner: m.slugOf[r.owner],
    visibleTo: uuidsToSlugs(r.visible_to, m),
    due: r.due,
    target: r.target ?? undefined,
    current: r.current_value ?? undefined,
    unit: r.unit ?? undefined,
    status: r.status,
    linkedTaskIds: r.linked_task_ids ?? [],
    linkedHabitIds: r.linked_habit_ids ?? [],
    createdAt: r.created_at,
  };
}
export function goalToRow(g: Partial<Goal>, m: ProfileMap) {
  const row: any = {};
  if (g.id !== undefined) row.id = g.id;
  if (g.title !== undefined) row.title = g.title;
  if (g.description !== undefined) row.description = g.description ?? null;
  if (g.scope !== undefined) row.scope = g.scope;
  if (g.owner !== undefined) row.owner = m.uuidOf[g.owner];
  if (g.visibleTo !== undefined) row.visible_to = slugsToUuids(g.visibleTo, m);
  if (g.due !== undefined) row.due = g.due;
  if (g.target !== undefined) row.target = g.target ?? null;
  if (g.current !== undefined) row.current_value = g.current ?? null;
  if (g.unit !== undefined) row.unit = g.unit ?? null;
  if (g.status !== undefined) row.status = g.status;
  if (g.linkedTaskIds !== undefined) row.linked_task_ids = g.linkedTaskIds;
  if (g.linkedHabitIds !== undefined) row.linked_habit_ids = g.linkedHabitIds;
  return row;
}

/* ─── MESSAGES ─── */
export function rowToMessage(r: any, m: ProfileMap): ChatMessage {
  return {
    id: r.id,
    author: m.slugOf[r.author],
    text: r.text,
    kind: r.kind,
    refId: r.ref_id ?? undefined,
    createdAt: r.created_at,
    reactions: r.reactions ?? {},
  };
}
export function messageToRow(msg: Partial<ChatMessage>, m: ProfileMap) {
  const row: any = {};
  if (msg.id !== undefined) row.id = msg.id;
  if (msg.author !== undefined) row.author = m.uuidOf[msg.author];
  if (msg.text !== undefined) row.text = msg.text;
  if (msg.kind !== undefined) row.kind = msg.kind;
  if (msg.refId !== undefined) row.ref_id = msg.refId ?? null;
  if (msg.reactions !== undefined) row.reactions = msg.reactions;
  return row;
}

/* ─── NOTIFICATIONS ─── */
export function rowToNotif(r: any, m: ProfileMap): Notification {
  return {
    id: r.id,
    kind: r.kind,
    recipient: m.slugOf[r.recipient],
    fromUser: r.from_user ? m.slugOf[r.from_user] : undefined,
    title: r.title,
    body: r.body ?? undefined,
    link: r.link ?? undefined,
    refId: r.ref_id ?? undefined,
    read: r.read,
    createdAt: r.created_at,
  };
}
export function notifToRow(n: Partial<Notification>, m: ProfileMap) {
  const row: any = {};
  if (n.id !== undefined) row.id = n.id;
  if (n.kind !== undefined) row.kind = n.kind;
  if (n.recipient !== undefined) row.recipient = m.uuidOf[n.recipient];
  if (n.fromUser !== undefined)
    row.from_user = n.fromUser ? m.uuidOf[n.fromUser] : null;
  if (n.title !== undefined) row.title = n.title;
  if (n.body !== undefined) row.body = n.body ?? null;
  if (n.link !== undefined) row.link = n.link ?? null;
  if (n.refId !== undefined) row.ref_id = n.refId ?? null;
  if (n.read !== undefined) row.read = n.read;
  return row;
}

/* ─── Helper: filtra slugs nulos cuando un uuid no está en el mapa ─── */
export function isValidUser(x: UserId | undefined): x is UserId {
  return x === "nelson" || x === "estela" || x === "fatima";
}
