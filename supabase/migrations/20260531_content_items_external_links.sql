-- Produção editorial — remover dependência de dados fictícios e suportar links externos.
-- Esta migração alinha a tabela pública usada pelas notícias (content_items)
-- com os campos gravados pelo painel admin e renderizados nas páginas públicas.

alter table if exists public.content_items
  add column if not exists category text,
  add column if not exists summary text,
  add column if not exists description text,
  add column if not exists image_url text,
  add column if not exists external_url text,
  add column if not exists external_links jsonb not null default '[]'::jsonb;

-- Backfill leve para instalações que já tinham conteúdos com os nomes originais.
update public.content_items
set
  summary = coalesce(summary, excerpt),
  description = coalesce(description, body),
  updated_at = now()
where summary is null or description is null;

-- Garante leitura pública apenas de conteúdos realmente publicados.
alter table if exists public.content_items enable row level security;

drop policy if exists "content_items_public_read_published" on public.content_items;
create policy "content_items_public_read_published"
on public.content_items
for select
to anon, authenticated
using (status = 'published');
