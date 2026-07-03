-- Purga server-side de ítems en papelera (> 15 días).
-- Corre diariamente a las 3am UTC (= 9pm hora El Salvador).
-- Complementa la purga del cliente; si ambas corren no hay daño (DELETE es idempotente).
--
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run

create or replace function public.purge_expired_items()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - interval '15 days';
begin
  delete from public.tasks    where deleted_at is not null and deleted_at < cutoff;
  delete from public.events   where deleted_at is not null and deleted_at < cutoff;
  delete from public.meetings where deleted_at is not null and deleted_at < cutoff;
  delete from public.notes    where deleted_at is not null and deleted_at < cutoff;
  delete from public.habits   where deleted_at is not null and deleted_at < cutoff;
  delete from public.goals    where deleted_at is not null and deleted_at < cutoff;
end;
$$;

-- Programar el job (idempotente: elimina el existente primero)
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'purge-expired-items-daily';
exception when others then null;
end $$;

select cron.schedule('purge-expired-items-daily', '0 3 * * *', 'select public.purge_expired_items();');
