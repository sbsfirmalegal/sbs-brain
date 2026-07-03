-- Fix bug de timezone en generate_reminders():
-- today_sv::timestamp era interpretado como medianoche UTC (= 6pm SV del día anterior),
-- haciendo que recordatorios enviados después de las 6pm supriman el del día siguiente.
-- La corrección convierte la fecha SV a un timestamptz correcto usando 'America/El_Salvador'.
--
-- CÓMO APLICAR: copiar y pegar en Supabase → SQL Editor → Run

create or replace function public.generate_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  now_sv timestamp := (now() at time zone 'America/El_Salvador');
  today_sv date := now_sv::date;
  -- Medianoche en El Salvador como timestamptz (= 06:00 UTC). Corrige el dedup.
  today_sv_tz timestamptz := (today_sv::timestamp at time zone 'America/El_Salvador');
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
        and n.created_at >= today_sv_tz
    );
  end loop;

  -- EVENTOS Y REUNIONES: hoy, respetando anticipación (reminder_minutes).
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
        and n.created_at >= today_sv_tz
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
        and n.created_at >= today_sv_tz
    );
  end loop;
end;
$$;
