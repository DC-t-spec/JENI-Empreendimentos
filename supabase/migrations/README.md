# Supabase migrations

As migrações deste directório são aplicadas manualmente no projecto Supabase, por ordem cronológica.

## Homepage Control completo

A migração `20260606_homepage_cms_complete.sql`:

- mantém a tabela existente `homepage_sections`;
- acrescenta apenas as colunas de compatibilidade `payload`, `display_order`, `status` e `is_enabled`, caso ainda não existam;
- normaliza chaves históricas da Home sem apagar conteúdo;
- cria as oito secções oficiais em estado `draft`, sem publicação automática;
- não altera Supabase Auth, RLS, `content_items`, o CMS editorial ou as políticas do Storage.

O Media Library usa o bucket público existente `jeni-informa`, na pasta `admin/`. Nenhuma tabela adicional é necessária.
