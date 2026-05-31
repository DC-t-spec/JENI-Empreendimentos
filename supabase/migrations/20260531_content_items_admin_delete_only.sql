-- Garante que a eliminação definitiva de content_items fica reservada a administradores.
-- O estado archived continua a ser arquivo editorial: não remove linhas e permanece recuperável.

alter table if exists public.content_items enable row level security;

drop policy if exists "content owners manage own" on public.content_items;
drop policy if exists "content owners select own" on public.content_items;
drop policy if exists "content owners insert own" on public.content_items;
drop policy if exists "content owners update own" on public.content_items;

create policy "content owners select own"
on public.content_items
for select
to authenticated
using (auth.uid() = author_id);

create policy "content owners insert own"
on public.content_items
for insert
to authenticated
with check (auth.uid() = author_id);

create policy "content owners update own"
on public.content_items
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);
