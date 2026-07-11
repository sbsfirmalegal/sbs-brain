-- Cron opcional: escanea diariamente pendientes que ameriten push nativo
-- y llama a send-push-fcm.
--
-- IMPORTANTE: la ruta principal (webhook de INSERT en public.notifications)
-- ya dispara push nativas en tiempo real. Este cron es un COMPLEMENTO para
-- disparar avisos programados que NO pasan por notifications (por ejemplo:
-- resumen matutino a las 7am, alerta de tarea sin completar 24h antes, etc.).
--
-- Antes de correr:
--   1. Habilitar extensiones en Supabase → Database → Extensions:
--        - pg_cron
--        - pg_net (para hacer http requests desde postgres)
--   2. Reemplazar los placeholders:
--        - <PROJECT_REF>  -> "tqkujsattjwejeotsqiz"
--        - <WEBHOOK_SECRET> -> el mismo valor del secret de la function
--
-- Se corre 1 vez a las 07:00 UTC (01:00 hora El Salvador, UTC-6) -> ajustar
-- si quieres otro horario.

-- Extensiones (idempotente)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Programar cron: todos los dias a las 13:00 UTC = 07:00 El Salvador
select
  cron.schedule(
    'send-push-fcm-daily',
    '0 13 * * *',
    $$
    select net.http_post(
      url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-push-fcm-scan',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <WEBHOOK_SECRET>'
      ),
      body := jsonb_build_object('trigger', 'daily-scan')
    );
    $$
  );

-- Para verificar / desprogramar:
--   select * from cron.job;
--   select cron.unschedule('send-push-fcm-daily');
