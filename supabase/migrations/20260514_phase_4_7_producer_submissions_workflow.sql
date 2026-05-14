-- FASE 4.7 — Producer submissions workflow

alter table if exists public.submissions enable row level security;

-- produtores: só criam e veem conteúdo próprio
create policy if not exists "submissions producer own select" on public.submissions
for select using (auth.uid() = user_id);

create policy if not exists "submissions producer own insert" on public.submissions
for insert with check (auth.uid() = user_id);

create policy if not exists "submissions producer own update" on public.submissions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- equipa editorial: admin/editor veem e gerem tudo
create policy if not exists "submissions editorial full" on public.submissions
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'editor')
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'editor')
  )
);

-- homepage apenas admin/editor
drop policy if exists "homepage admin write" on public.homepage_sections;
create policy if not exists "homepage editorial write" on public.homepage_sections
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'editor')
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'editor')
  )
);
