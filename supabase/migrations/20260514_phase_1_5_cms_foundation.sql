-- JENI PLATFORM — Fase 1.5 (fundação CMS)
-- Execução manual recomendada em ambiente de staging antes de produção.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  type text not null,
  status text not null default 'draft',
  title text not null,
  slug text unique not null,
  excerpt text,
  body text,
  featured boolean not null default false,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text unique not null,
  title text,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  storage_path text not null,
  alt_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items(id) on delete cascade,
  editor_id uuid references public.profiles(id) on delete set null,
  revision_note text,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists role text default 'producer';

alter table public.content_items enable row level security;
alter table public.media_assets enable row level security;
alter table public.homepage_sections enable row level security;

-- leitura pública apenas publicado
create policy if not exists "content public read published" on public.content_items
for select using (status = 'published');

-- produtores editam apenas próprios conteúdos
create policy if not exists "content owners manage own" on public.content_items
for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- admins controlo total (dependente de profiles.role)
create policy if not exists "content admin full" on public.content_items
for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "media owner read/write" on public.media_assets
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy if not exists "media admin full" on public.media_assets
for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "homepage public read" on public.homepage_sections
for select using (is_active = true);

create policy if not exists "homepage admin write" on public.homepage_sections
for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
