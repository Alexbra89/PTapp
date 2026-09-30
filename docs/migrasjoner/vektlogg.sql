-- Vektlogg i Supabase i stedet for nettleserens lagring.
-- Kjør i Supabase → SQL Editor. Appen fungerer også uten tabellen (faller tilbake til
-- lokal lagring), og laster automatisk opp gamle lokale målinger når tabellen finnes.

create table if not exists public.vektlogg (
  id         uuid primary key default gen_random_uuid(),
  bruker_id  uuid not null references auth.users (id) on delete cascade,
  dato       date not null,
  vekt       numeric(5, 1) not null check (vekt > 0 and vekt < 500),
  opprettet  timestamptz not null default now(),
  unique (bruker_id, dato)
);

alter table public.vektlogg enable row level security;

create policy "vektlogg: les egne"   on public.vektlogg for select using (auth.uid() = bruker_id);
create policy "vektlogg: ny"         on public.vektlogg for insert with check (auth.uid() = bruker_id);
create policy "vektlogg: endre egne" on public.vektlogg for update using (auth.uid() = bruker_id) with check (auth.uid() = bruker_id);
create policy "vektlogg: slett egne" on public.vektlogg for delete using (auth.uid() = bruker_id);
