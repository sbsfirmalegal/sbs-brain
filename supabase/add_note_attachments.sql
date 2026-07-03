-- Adjuntos de notas: imágenes y notas de voz.
-- CÓMO APLICAR: pegar en Supabase → SQL Editor → Run.
--
-- 1) Columna `attachments` en `notes` (ya está en schema.sql, se repite acá
--    por si esta pieza se corre suelta contra una base que no la tiene):
alter table public.notes add column if not exists attachments jsonb not null default '[]'::jsonb;

-- 2) Bucket de Storage. Público para lectura (URLs directas, sin firmar) —
--    la privacidad real de cada nota la sigue dando la RLS de la tabla `notes`:
--    si el socio no puede ver la fila, nunca recibe la URL del adjunto.
insert into storage.buckets (id, name, public)
values ('note-media', 'note-media', true)
on conflict (id) do update set public = true;

drop policy if exists "note-media public read" on storage.objects;
create policy "note-media public read" on storage.objects
  for select to public using (bucket_id = 'note-media');

drop policy if exists "note-media insert" on storage.objects;
create policy "note-media insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'note-media');

drop policy if exists "note-media delete" on storage.objects;
create policy "note-media delete" on storage.objects
  for delete to authenticated using (bucket_id = 'note-media');
