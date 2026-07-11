-- Tabla de tokens FCM (un registro por dispositivo nativo Android/iOS).
-- Es INDEPENDIENTE de push_subscriptions (Web Push VAPID) que sigue viva
-- para los navegadores desktop/iOS Safari.
--
-- Correr a mano en el SQL Editor de Supabase (Nelson).
--
-- Idempotente: se puede correr varias veces sin efecto adicional.

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists device_tokens_user_id_idx
  on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

-- Cada socia gestiona solo sus propios tokens
drop policy if exists "own_device_tokens_select" on public.device_tokens;
create policy "own_device_tokens_select" on public.device_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "own_device_tokens_insert" on public.device_tokens;
create policy "own_device_tokens_insert" on public.device_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists "own_device_tokens_update" on public.device_tokens;
create policy "own_device_tokens_update" on public.device_tokens
  for update using (auth.uid() = user_id);

drop policy if exists "own_device_tokens_delete" on public.device_tokens;
create policy "own_device_tokens_delete" on public.device_tokens
  for delete using (auth.uid() = user_id);
