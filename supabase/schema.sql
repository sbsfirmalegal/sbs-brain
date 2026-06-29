-- ============================================================
-- SBS Cronograma — Esquema completo
-- Pegá TODO este archivo en: Supabase > SQL Editor > New query > Run
-- Se puede ejecutar varias veces; usa DROP IF EXISTS para reidempotencia.
-- ============================================================

-- ───────── EXTENSIONES ─────────
create extension if not exists "pgcrypto";

-- ───────── HELPERS ─────────
create or replace function public.is_me(uid uuid) returns boolean
language sql stable as $$
  select uid = auth.uid();
$$;

create or replace function public.is_visible(visible_to uuid[]) returns boolean
language sql stable as $$
  select auth.uid() = any(visible_to);
$$;

-- ───────── PROFILES ─────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique check (slug in ('nelson','estela','fatima')),
  name text not null,
  last_name text not null,
  initials text not null,
  color text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles read for authenticated" on public.profiles;
create policy "profiles read for authenticated" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ───────── EVENTS ─────────
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'evento' check (kind in ('evento','reunion')),
  date date not null,
  start_time text not null,
  end_time text,
  location text,
  owner uuid not null references public.profiles(id) on delete cascade,
  visible_to uuid[] not null default '{}',
  notes text,
  meeting_id uuid,
  reminder_minutes int,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.events add column if not exists deleted_at timestamptz;
alter table public.events add column if not exists reminder_minutes int;

alter table public.events enable row level security;

drop policy if exists "events read visible" on public.events;
create policy "events read visible" on public.events
  for select to authenticated using (is_visible(visible_to));

drop policy if exists "events insert own" on public.events;
create policy "events insert own" on public.events
  for insert to authenticated with check (owner = auth.uid());

drop policy if exists "events update own" on public.events;
create policy "events update own" on public.events
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "events delete own" on public.events;
create policy "events delete own" on public.events
  for delete to authenticated using (owner = auth.uid());

-- ───────── TASKS ─────────
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  done boolean not null default false,
  owner uuid not null references public.profiles(id) on delete cascade,
  visible_to uuid[] not null default '{}',
  due date,
  priority text not null default 'media' check (priority in ('alta','media','baja')),
  area text,
  meeting_id uuid,
  folio text,
  completed_at date,
  created_at timestamptz not null default now(),
  subtasks jsonb not null default '[]',
  recurrence text check (recurrence in ('diaria','semanal')),
  postpone_count int not null default 0,
  linked_habit_id uuid,
  converted_to_habit_id uuid,
  deleted_at timestamptz
);

-- Migración: agrega columnas nuevas si la tabla ya existía sin ellas
alter table public.tasks add column if not exists subtasks jsonb not null default '[]';
alter table public.tasks add column if not exists recurrence text check (recurrence in ('diaria','semanal'));
alter table public.tasks add column if not exists postpone_count int not null default 0;
alter table public.tasks add column if not exists linked_habit_id uuid;
alter table public.tasks add column if not exists converted_to_habit_id uuid;
alter table public.tasks add column if not exists deleted_at timestamptz;

alter table public.tasks enable row level security;

drop policy if exists "tasks read visible" on public.tasks;
create policy "tasks read visible" on public.tasks
  for select to authenticated using (is_visible(visible_to));

drop policy if exists "tasks insert visible" on public.tasks;
create policy "tasks insert visible" on public.tasks
  for insert to authenticated with check (auth.uid() = any(visible_to));

drop policy if exists "tasks update owner or visible" on public.tasks;
create policy "tasks update owner or visible" on public.tasks
  for update to authenticated using (is_visible(visible_to))
  with check (is_visible(visible_to));

drop policy if exists "tasks delete own" on public.tasks;
create policy "tasks delete own" on public.tasks
  for delete to authenticated using (owner = auth.uid());

-- ───────── MEETINGS ─────────
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'ordinaria' check (type in ('ordinaria','extraordinaria','informal','rutina_estudio')),
  date date not null,
  start_time text not null,
  attendees uuid[] not null default '{}',
  visible_to uuid[] not null default '{}',
  minute text not null default '',
  agreements jsonb not null default '[]'::jsonb,
  closed boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.meetings add column if not exists deleted_at timestamptz;
alter table public.meetings drop constraint if exists meetings_type_check;
alter table public.meetings add constraint meetings_type_check check (type in ('ordinaria','extraordinaria','informal','rutina_estudio'));

alter table public.meetings enable row level security;

drop policy if exists "meetings read visible" on public.meetings;
create policy "meetings read visible" on public.meetings
  for select to authenticated using (is_visible(visible_to));

drop policy if exists "meetings insert attendee" on public.meetings;
create policy "meetings insert attendee" on public.meetings
  for insert to authenticated with check (auth.uid() = any(attendees));

drop policy if exists "meetings update attendee" on public.meetings;
create policy "meetings update attendee" on public.meetings
  for update to authenticated using (auth.uid() = any(attendees))
  with check (auth.uid() = any(attendees));

drop policy if exists "meetings delete attendee" on public.meetings;
create policy "meetings delete attendee" on public.meetings
  for delete to authenticated using (auth.uid() = any(attendees));

-- ───────── NOTES ─────────
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  owner uuid not null references public.profiles(id) on delete cascade,
  visible_to uuid[] not null default '{}',
  tags text[] not null default '{}',
  type text not null default 'idea' check (type in ('idea','reflexion','minuta','aprendizaje','decision','lectura','proyecto_personal','reunion_interna','diario','ia_tecnologia')),
  sources jsonb not null default '[]'::jsonb,
  pinned boolean not null default false,
  converted_to_kind text check (converted_to_kind in ('task','habit','goal','event')),
  converted_to_id uuid,
  goal_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migración: ampliar tipos de nota y agregar columnas nuevas si la tabla ya existía
alter table public.notes drop constraint if exists notes_type_check;
alter table public.notes add constraint notes_type_check check (type in ('idea','reflexion','minuta','aprendizaje','decision','lectura','proyecto_personal','reunion_interna','diario','ia_tecnologia'));
alter table public.notes add column if not exists pinned boolean not null default false;
alter table public.notes add column if not exists converted_to_kind text check (converted_to_kind in ('task','habit','goal','event'));
alter table public.notes add column if not exists converted_to_id uuid;
alter table public.notes add column if not exists goal_id uuid;
alter table public.notes add column if not exists deleted_at timestamptz;
alter table public.notes add column if not exists decision_meta jsonb;
alter table public.notes add column if not exists application text;

alter table public.notes enable row level security;

drop policy if exists "notes read visible" on public.notes;
create policy "notes read visible" on public.notes
  for select to authenticated using (is_visible(visible_to));

drop policy if exists "notes insert own" on public.notes;
create policy "notes insert own" on public.notes
  for insert to authenticated with check (owner = auth.uid());

drop policy if exists "notes update own" on public.notes;
create policy "notes update own" on public.notes
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "notes delete own" on public.notes;
create policy "notes delete own" on public.notes
  for delete to authenticated using (owner = auth.uid());

-- ───────── HABITS ─────────
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  color text,
  owner uuid not null references public.profiles(id) on delete cascade,
  frequency text not null default 'diario' check (frequency in ('diario','semanal')),
  weekly_target int,
  completions date[] not null default '{}',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  category text check (category in ('profesional','intelectual','salud','personal')),
  priority text check (priority in ('alta','media','baja')),
  recommended_time text,
  estimated_minutes int
);

-- Migración: agrega columnas nuevas si la tabla ya existía sin ellas
alter table public.habits add column if not exists category text check (category in ('profesional','intelectual','salud','personal'));
alter table public.habits add column if not exists priority text check (priority in ('alta','media','baja'));
alter table public.habits add column if not exists recommended_time text;
alter table public.habits add column if not exists estimated_minutes int;
alter table public.habits add column if not exists deleted_at timestamptz;

alter table public.habits enable row level security;

-- Hábitos: privados al dueño (sin importar la app, solo el dueño los ve)
drop policy if exists "habits all own" on public.habits;
create policy "habits all own" on public.habits
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- ───────── GOALS ─────────
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  scope text not null default 'personal' check (scope in ('firma','personal')),
  owner uuid not null references public.profiles(id) on delete cascade,
  visible_to uuid[] not null default '{}',
  due date,
  target int,
  current_value int default 0,
  unit text,
  status text not null default 'activa' check (status in ('activa','lograda','pausada')),
  linked_task_ids uuid[] not null default '{}',
  linked_habit_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.goals add column if not exists deleted_at timestamptz;

alter table public.goals enable row level security;

drop policy if exists "goals read visible" on public.goals;
create policy "goals read visible" on public.goals
  for select to authenticated using (is_visible(visible_to));

drop policy if exists "goals insert own" on public.goals;
create policy "goals insert own" on public.goals
  for insert to authenticated with check (owner = auth.uid());

drop policy if exists "goals update own" on public.goals;
create policy "goals update own" on public.goals
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "goals delete own" on public.goals;
create policy "goals delete own" on public.goals
  for delete to authenticated using (owner = auth.uid());

-- ───────── MESSAGES (CHAT) ─────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  author uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  kind text not null default 'text',
  ref_id uuid,
  reactions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Canal compartido entre los 3 socios autenticados
drop policy if exists "messages read all auth" on public.messages;
create policy "messages read all auth" on public.messages
  for select to authenticated using (true);

drop policy if exists "messages insert own" on public.messages;
create policy "messages insert own" on public.messages
  for insert to authenticated with check (author = auth.uid());

drop policy if exists "messages update reactions" on public.messages;
create policy "messages update reactions" on public.messages
  for update to authenticated using (true) with check (true);

-- ───────── NOTIFICATIONS ─────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  recipient uuid not null references public.profiles(id) on delete cascade,
  from_user uuid references public.profiles(id) on delete set null,
  title text not null,
  body text,
  link text,
  ref_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "notifications read self" on public.notifications;
create policy "notifications read self" on public.notifications
  for select to authenticated using (recipient = auth.uid());

drop policy if exists "notifications insert any auth" on public.notifications;
create policy "notifications insert any auth" on public.notifications
  for insert to authenticated with check (true);

drop policy if exists "notifications update self" on public.notifications;
create policy "notifications update self" on public.notifications
  for update to authenticated using (recipient = auth.uid()) with check (recipient = auth.uid());

drop policy if exists "notifications delete self" on public.notifications;
create policy "notifications delete self" on public.notifications
  for delete to authenticated using (recipient = auth.uid());

-- ───────── INDEXES ─────────
create index if not exists idx_events_date on public.events(date);
create index if not exists idx_tasks_owner on public.tasks(owner);
create index if not exists idx_tasks_due on public.tasks(due);
create index if not exists idx_meetings_date on public.meetings(date);
create index if not exists idx_notes_updated on public.notes(updated_at desc);
create index if not exists idx_messages_created on public.messages(created_at desc);
create index if not exists idx_notifications_recipient on public.notifications(recipient, read, created_at desc);

-- ───────── REALTIME ─────────
-- Publica las tablas que queremos sincronizar en vivo
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.meetings;
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.habits;
alter publication supabase_realtime add table public.goals;

-- ───────── TRIGGER: crear profile al registrar usuario ─────────
-- Cuando alguien se registra en auth, intentamos crear su profile.
-- El slug viene del email (parte antes del @) y debe coincidir con uno de los 3 socios.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  email_local text := split_part(new.email, '@', 1);
  derived_slug text;
  derived_name text;
  derived_last text;
  derived_initials text;
  derived_color text;
begin
  -- Solo aceptamos los 3 emails configurados; si no coincide, no creamos profile
  -- (el dueño puede crear profile manualmente luego con otro slug).
  if email_local in ('nelson', 'estela', 'fatima') then
    derived_slug := email_local;
  else
    return new;
  end if;

  if derived_slug = 'nelson' then
    derived_name := 'Nelson'; derived_last := 'Barrera';
    derived_initials := 'NB'; derived_color := '#2a4a82';
  elsif derived_slug = 'estela' then
    derived_name := 'Estela'; derived_last := 'Barrera';
    derived_initials := 'EB'; derived_color := '#c9a84c';
  else
    derived_name := 'Fátima'; derived_last := 'Barrera';
    derived_initials := 'FB'; derived_color := '#5a9d72';
  end if;

  insert into public.profiles (id, slug, name, last_name, initials, color)
  values (new.id, derived_slug, derived_name, derived_last, derived_initials, derived_color)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── RECORDATORIOS AUTOMÁTICOS (server-side, funciona con la app cerrada) ─────────
-- Genera filas en `notifications` para tareas por vencer/atrasadas, eventos/reuniones
-- (respetando reminder_minutes de anticipación) y hábitos pendientes (recommended_time).
-- El INSERT en notifications dispara el Database Webhook → Edge Function send-push.
create or replace function public.generate_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  now_sv timestamp := (now() at time zone 'America/El_Salvador');
  today_sv date := now_sv::date;
  r record;
begin
  -- TAREAS: vencen hoy o atrasadas (una vez por día por destinatario)
  for r in
    select t.id, t.title, t.due, unnest(t.visible_to) as recipient
    from public.tasks t
    where t.done = false and t.deleted_at is null and t.due is not null and t.due <= today_sv
  loop
    insert into public.notifications (kind, recipient, title, body, link, ref_id, read)
    select
      case when r.due = today_sv then 'tarea-vence-hoy' else 'tarea-atrasada' end,
      r.recipient,
      case when r.due = today_sv then 'Vence hoy: ' || r.title else 'Atrasada: ' || r.title end,
      null, '/tareas', r.id, false
    where not exists (
      select 1 from public.notifications n
      where n.recipient = r.recipient and n.ref_id = r.id
        and n.kind = case when r.due = today_sv then 'tarea-vence-hoy' else 'tarea-atrasada' end
        and n.created_at >= today_sv::timestamp
    );
  end loop;

  -- EVENTOS Y REUNIONES: hoy, respetando anticipación (reminder_minutes). Sin reminder_minutes,
  -- avisa apenas llega el día (comportamiento histórico).
  for r in
    select e.id, e.title, e.kind, e.start_time, e.location, unnest(e.visible_to) as recipient
    from public.events e
    where e.deleted_at is null
      and e.date = today_sv
      and (
        e.reminder_minutes is null
        or now_sv >= (today_sv::timestamp + e.start_time::time) - (e.reminder_minutes || ' minutes')::interval
      )
  loop
    insert into public.notifications (kind, recipient, title, body, link, ref_id, read)
    select
      case when r.kind = 'reunion' then 'reunion-proxima' else 'evento-proximo' end,
      r.recipient,
      case when r.kind = 'reunion' then 'Reunión hoy: ' || r.title else 'Evento hoy: ' || r.title end,
      r.start_time || coalesce(' · ' || r.location, ''),
      case when r.kind = 'reunion' then '/reuniones' else '/agenda' end,
      r.id, false
    where not exists (
      select 1 from public.notifications n
      where n.recipient = r.recipient and n.ref_id = r.id
        and n.kind = case when r.kind = 'reunion' then 'reunion-proxima' else 'evento-proximo' end
        and n.created_at >= today_sv::timestamp
    );
  end loop;

  -- HÁBITOS: recordatorio diario a la hora recomendada si todavía no se completó hoy
  for r in
    select h.id, h.name, h.owner
    from public.habits h
    where h.archived = false and h.deleted_at is null
      and h.recommended_time is not null
      and not (today_sv = any(h.completions))
      and now_sv::time >= h.recommended_time::time
  loop
    insert into public.notifications (kind, recipient, title, body, link, ref_id, read)
    select 'habito-pendiente', r.owner, 'Pendiente hoy: ' || r.name, null, '/habitos', r.id, false
    where not exists (
      select 1 from public.notifications n
      where n.recipient = r.owner and n.ref_id = r.id and n.kind = 'habito-pendiente'
        and n.created_at >= today_sv::timestamp
    );
  end loop;
end;
$$;

-- Habilitar pg_cron (en Supabase: Database → Extensions → pg_cron, o desde el SQL Editor si el proyecto lo permite)
create extension if not exists pg_cron;

-- Reprogramar el job de forma idempotente
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'generate-reminders-5min';
exception when others then null;
end $$;

select cron.schedule('generate-reminders-5min', '*/5 * * * *', 'select public.generate_reminders();');

-- ───────── FIN ─────────
-- Si llegaste hasta acá sin errores, el esquema está listo.
-- Próximo paso: registrar las 3 cuentas desde la app con los emails:
--   nelson@... / estela@... / fatima@...
-- El trigger crea el profile automáticamente.
