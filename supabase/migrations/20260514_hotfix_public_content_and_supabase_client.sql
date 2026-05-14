-- HOTFIX — leitura pública content_items/homepage_sections e alinhamento de policies

-- content_items: leitura pública somente publicado
alter table if exists public.content_items enable row level security;

drop policy if exists "content_items_public_read_published" on public.content_items;
create policy "content_items_public_read_published"
on public.content_items
for select
to anon, authenticated
using (status = 'published');

-- homepage_sections: garantir colunas esperadas para policy pública
alter table if exists public.homepage_sections
  add column if not exists status text not null default 'draft',
  add column if not exists is_enabled boolean not null default true;

alter table if exists public.homepage_sections enable row level security;

drop policy if exists "homepage_sections_public_read_published_enabled" on public.homepage_sections;
create policy "homepage_sections_public_read_published_enabled"
on public.homepage_sections
for select
to anon, authenticated
using (status = 'published' and is_enabled = true);
