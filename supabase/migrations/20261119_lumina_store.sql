create table if not exists public.lumina_store (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.lumina_store enable row level security;

revoke all on table public.lumina_store from anon, authenticated;

grant select, insert, update, delete on table public.lumina_store to service_role;
