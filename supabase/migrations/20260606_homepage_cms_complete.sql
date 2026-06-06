-- Homepage Control completo — estrutura JSON visual e oito secções oficiais.
-- Não altera Auth, RLS, content_items nem o CMS editorial.

alter table if exists public.homepage_sections
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists display_order integer not null default 0,
  add column if not exists status text not null default 'draft',
  add column if not exists is_enabled boolean not null default true;

-- Migra chaves históricas somente quando a chave oficial ainda não existe.
update public.homepage_sections source
set section_key = 'services'
where source.section_key = 'categories'
  and not exists (select 1 from public.homepage_sections target where target.section_key = 'services');

update public.homepage_sections source
set section_key = 'cta'
where source.section_key = 'ctas'
  and not exists (select 1 from public.homepage_sections target where target.section_key = 'cta');

update public.homepage_sections source
set section_key = 'highlights'
where source.section_key = 'portfolio'
  and not exists (select 1 from public.homepage_sections target where target.section_key = 'highlights');

-- A antiga chave newsletter representava a área JENI Informa na Home.
update public.homepage_sections source
set section_key = 'informa'
where source.section_key = 'newsletter'
  and not exists (select 1 from public.homepage_sections target where target.section_key = 'informa');

insert into public.homepage_sections (section_key, title, payload, display_order, status, is_enabled)
values
  ('hero', 'Hero', '{"title":"Estratégia, cultura e produção com presença institucional.","subtitle":"JENI Empreendimentos · Maputo","text":"Soluções formais, modernas e com impacto.","button_1_label":"Conhecer Serviços","button_1_url":"servicos.html","button_2_label":"Falar com a JENI","button_2_url":"contacto.html"}'::jsonb, 10, 'draft', true),
  ('presentation', 'Apresentação', '{"title":"Uma marca institucional para cultura, projectos e desenvolvimento.","text":"Actuamos com visão integrada, combinando inteligência estratégica, gestão responsável e sensibilidade criativa."}'::jsonb, 20, 'draft', true),
  ('services', 'Serviços', '{"title":"Capacidades organizadas para diferentes frentes de actuação.","subtitle":"Serviços claros para facilitar leitura, decisão e contacto.","items":[]}'::jsonb, 30, 'draft', true),
  ('highlights', 'Destaques / Portfólio', '{"title":"Projectos com identidade, execução e presença institucional.","subtitle":"Uma selecção do trabalho da JENI.","items":[]}'::jsonb, 40, 'draft', true),
  ('partners', 'Parceiros', '{"title":"Parceiros","subtitle":"Instituições e marcas que caminham connosco.","items":[]}'::jsonb, 50, 'draft', true),
  ('informa', 'JENI Informa', '{"title":"Informação, cultura e oportunidades.","subtitle":"Os conteúdos mais recentes publicados pela equipa editorial da JENI.","article_count":4}'::jsonb, 60, 'draft', true),
  ('newsletter', 'Newsletter', '{"title":"Receba novidades da JENI","text":"Subscreva para acompanhar conteúdos, oportunidades e projectos."}'::jsonb, 70, 'draft', true),
  ('cta', 'CTA Final', '{"title":"Vamos transformar uma oportunidade em projecto estruturado?","text":"Entre em contacto para propostas, parcerias, consultoria, eventos, cultura ou produção criativa.","button_label":"Iniciar conversa estratégica","button_url":"contacto.html"}'::jsonb, 80, 'draft', true)
on conflict (section_key) do nothing;
