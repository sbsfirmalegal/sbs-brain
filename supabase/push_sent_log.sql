-- Registro de envios de push nativas para idempotencia.
-- send-push-fcm consulta esta tabla antes de enviar; si ya hay un registro
-- para (sent_date, kind, dedupe_key), omite el envio.
--
-- Correr a mano en el SQL Editor de Supabase.

create table if not exists public.push_sent_log (
  id bigserial primary key,
  sent_date date not null,
  kind text not null,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  unique (sent_date, kind, dedupe_key)
);

create index if not exists push_sent_log_sent_date_idx
  on public.push_sent_log (sent_date);

-- Retention: borrar registros mayores a 30 dias (opcional; ahorra espacio)
-- Correr esto como un cron aparte una vez al mes:
--   delete from public.push_sent_log where sent_date < current_date - interval '30 days';

alter table public.push_sent_log enable row level security;

-- Solo la service_role puede leer/escribir esta tabla (no expuesta al cliente)
drop policy if exists "service_role_all" on public.push_sent_log;
create policy "service_role_all" on public.push_sent_log
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
