-- JENI Informa — campos dinâmicos por tipo de conteúdo.
-- Mantém a tabela oficial content_items e guarda dados específicos em JSONB.

alter table public.content_items
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists gallery jsonb default '[]'::jsonb;
