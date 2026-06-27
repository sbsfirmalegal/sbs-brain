export type UserId = "nelson" | "estela" | "fatima";

export interface User {
  id: UserId;
  name: string;
  lastName: string;
  initials: string;
  color: string;
}

/** Visibilidad: lista de socios que pueden ver el ítem.
 *  [owner] = privado · [owner, X] = compartido con una socia · los 3 = compartido total */
export type Visibility = UserId[];

export type Priority = "alta" | "media" | "baja";

export interface Task {
  id: string;
  title: string;
  done: boolean;
  owner: UserId; // responsable
  visibleTo: Visibility;
  due: string | null; // ISO date
  priority: Priority;
  area?: string;
  meetingId?: string; // origen
  folio?: string;
  createdAt: string;
  completedAt?: string;
}

export type EventKind = "reunion" | "evento";

export interface CalEvent {
  id: string;
  title: string;
  kind: EventKind;
  date: string; // ISO date
  start: string; // HH:mm
  end?: string;
  location?: string;
  owner: UserId;
  visibleTo: Visibility;
  notes?: string;
  meetingId?: string;
}

export type AgreementKind = "acuerdo" | "decision";

export interface Agreement {
  id: string;
  text: string;
  kind: AgreementKind;
  legalBasis?: string;
}

export type MeetingType = "ordinaria" | "extraordinaria" | "informal";

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  date: string;
  start: string;
  attendees: UserId[];
  visibleTo: Visibility;
  minute: string;
  agreements: Agreement[];
  closed: boolean;
}

export type NoteType = "idea" | "reflexion" | "minuta" | "aprendizaje";

export type SourceKind =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "spotify"
  | "podcast"
  | "libro"
  | "pelicula"
  | "articulo"
  | "ley"
  | "web";

export interface Source {
  id: string;
  kind: SourceKind;
  title: string;
  url?: string;
  author?: string;
  note?: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  owner: UserId;
  visibleTo: Visibility;
  tags: string[];
  type: NoteType;
  sources?: Source[];
  createdAt: string;
  updatedAt: string;
}

export type MessageKind = "text" | "task" | "event" | "note";

export interface ChatMessage {
  id: string;
  author: UserId;
  text: string;
  kind: MessageKind;
  refId?: string;
  createdAt: string; // ISO datetime
  reactions?: Partial<Record<UserId, string>>; // emoji por socio
}

export type HabitFrequency = "diario" | "semanal";

export interface Habit {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  owner: UserId;
  visibleTo: UserId[];
  frequency: HabitFrequency;
  weeklyTarget?: number;
  completions: string[];
  createdAt: string;
  archived?: boolean;
}

export type GoalScope = "firma" | "personal";
export type GoalStatus = "activa" | "lograda" | "pausada";

export interface Goal {
  id: string;
  title: string;
  description?: string;
  scope: GoalScope;
  owner: UserId;
  visibleTo: UserId[];
  due: string | null;
  target?: number;
  current?: number;
  unit?: string;
  status: GoalStatus;
  linkedTaskIds: string[];
  linkedHabitIds: string[];
  createdAt: string;
}

export type NotifKind =
  | "tarea-asignada"
  | "tarea-vence-hoy"
  | "tarea-atrasada"
  | "reunion-proxima"
  | "mensaje"
  | "meta-lograda"
  | "sistema";

export interface Notification {
  id: string;
  kind: NotifKind;
  recipient: UserId;
  fromUser?: UserId;
  title: string;
  body?: string;
  link?: string;
  refId?: string;
  createdAt: string;
  read: boolean;
}

export interface AppData {
  events: CalEvent[];
  tasks: Task[];
  meetings: Meeting[];
  notes: Note[];
  messages: ChatMessage[];
  habits: Habit[];
  goals: Goal[];
  notifications: Notification[];
  /** PIN por socio (hash SHA-256 de 4 dígitos). Vacío = sin PIN. */
  pins: Partial<Record<UserId, string>>;
}
