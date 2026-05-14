-- Fase 3.1 (sugerida): newsletter subscribers
-- Não executada automaticamente pelo frontend.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text default 'jeni-informa',
  status text not null default 'active',
  subscribed_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

create policy if not exists "newsletter public insert" on public.newsletter_subscribers
for insert with check (true);

create policy if not exists "newsletter admin read" on public.newsletter_subscribers
for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
