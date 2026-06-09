-- Adiciona Projectos JENI ao Homepage Control usando a tabela existente.
-- Não altera Auth, RLS, content_items nem o CMS editorial.

insert into public.homepage_sections (section_key, title, payload, display_order, status, is_enabled)
values (
  'jeni_projects',
  'Projectos JENI',
  '{"title":"Projectos concebidos e desenvolvidos pela JENI","subtitle":"Iniciativas próprias com identidade, continuidade e impacto.","items":[{"image":"foto1.jpg.jpeg","title":"FITI 2026","year":"2026","description":"Projecto concebido e desenvolvido pela JENI.","url":"","status":"em curso"},{"image":"foto4.jpg.jpeg","title":"Estrelas do Meu Bairro 2025","year":"2025","description":"Projecto concebido e desenvolvido pela JENI.","url":"","status":"realizado"},{"image":"logo-jeni.png","title":"JENI Empreendimentos","year":"","description":"Projecto institucional concebido e desenvolvido pela JENI.","url":"","status":"desenvolvido"}]}'::jsonb,
  45,
  'draft',
  true
)
on conflict (section_key) do nothing;
