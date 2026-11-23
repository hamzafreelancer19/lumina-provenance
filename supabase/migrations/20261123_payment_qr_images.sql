create table if not exists public.lumina_payment_qr (
  id text primary key check (id = 'global' or id ~ '^plan:[a-zA-Z0-9-]+$'),
  content_type text not null check (content_type in ('image/png', 'image/jpeg', 'image/webp')),
  image_base64 text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.lumina_payment_qr enable row level security;

revoke all on table public.lumina_payment_qr from anon, authenticated;

grant select, insert, update, delete on table public.lumina_payment_qr to service_role;
