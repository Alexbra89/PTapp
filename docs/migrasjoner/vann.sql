-- Vannteller: antall glass vann per bruker og dag.
--
-- • Bare tillegg: én ny tabell og én funksjon. Endrer ingen eksisterende tabeller eller data.
--   Kan kjøres flere ganger. Krever ikke kosthold.sql.
-- • Én rad per bruker og dato. RLS gir hver bruker tilgang til bare sine egne rader.
-- • Rekkefølge: appen sender hele antallet (ikke «+1») sammen med et versjonsnummer som øker for hvert
--   trykk. vann_sett() lagrer bare hvis versjonen er nyere enn den som er lagret. Et gammelt forsøk som
--   kommer fram sent (nettverket prøver igjen, svaret ble borte) kan dermed aldri overskrive et nyere
--   antall – heller ikke fra en annen enhet.
-- • Sletting av kontoen: fremmednøkkel til auth.users med «on delete cascade».
--
-- Testet mot PostgreSQL 16 med Supabase-lignende roller: scripts/test-rls.mjs (npm run test:rls).

begin;

set local lock_timeout = '10s';

-- ── Forhåndskontroll ────────────────────────────────────────────────────────
-- Finnes tabellen fra før, må den ha kolonnene og primærnøkkelen denne filen lager, og ingen andre
-- RLS-regler. En fremmed permissiv regel ville ellers stått igjen og åpnet tabellen.
do $$
declare
  forventet constant jsonb := '{"bruker_id": "uuid", "dato": "date", "glass": "int4", "versjon": "int8", "oppdatert": "timestamptz"}';
  avvik text[];
begin
  if to_regclass('auth.users') is null or to_regprocedure('auth.uid()') is null then
    raise exception 'Fant ikke Supabase-innloggingen (auth.users / auth.uid()). Avbryter – ingenting er endret.';
  end if;
  if to_regclass('public.vanninntak') is not null then
    select array_agg(f.key || ' (' || coalesce(c.udt_name, 'mangler') || ', ventet ' || f.value || ')' order by f.key) into avvik
      from jsonb_each_text(forventet) as f
      left join information_schema.columns c
        on c.table_schema = 'public' and c.table_name = 'vanninntak' and c.column_name = f.key
     where c.udt_name is distinct from f.value;
    if avvik is not null then
      raise exception 'Tabellen public.vanninntak finnes allerede, men har en annen struktur: %. Avbryter – ingenting er endret.', avvik;
    end if;
    if not exists (
      select 1 from pg_constraint k
       where k.conrelid = 'public.vanninntak'::regclass and k.contype = 'p'
         and (select array_agg(a.attname::text order by a.attname) from pg_attribute a
               where a.attrelid = k.conrelid and a.attnum = any (k.conkey)) = array['bruker_id', 'dato']
    ) then
      raise exception 'Tabellen public.vanninntak finnes allerede, men primærnøkkelen er ikke (bruker_id, dato). Avbryter – ingenting er endret.';
    end if;
    select array_agg(p.policyname::text order by p.policyname) into avvik
      from pg_policies p
     where p.schemaname = 'public' and p.tablename = 'vanninntak'
       and p.policyname not in ('vanninntak: les egne', 'vanninntak: ny', 'vanninntak: endre egne', 'vanninntak: slett egne');
    if avvik is not null then
      raise exception 'Tabellen public.vanninntak har RLS-regler som ikke kommer fra denne migrasjonen: %. Avbryter – ingenting er endret.', avvik;
    end if;
  end if;
end $$;

-- ── Tabell ──────────────────────────────────────────────────────────────────
create table if not exists public.vanninntak (
  bruker_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dato       date not null,
  glass      integer not null check (glass between 0 and 40),
  -- Øker for hvert trykk i appen (millisekunder). Bare en nyere versjon kan erstatte antallet.
  versjon    bigint not null default 0 check (versjon >= 0),
  oppdatert  timestamptz not null default now(),
  primary key (bruker_id, dato)
);

alter table public.vanninntak enable row level security;

drop policy if exists "vanninntak: les egne"   on public.vanninntak;
drop policy if exists "vanninntak: ny"         on public.vanninntak;
drop policy if exists "vanninntak: endre egne" on public.vanninntak;
drop policy if exists "vanninntak: slett egne" on public.vanninntak;
create policy "vanninntak: les egne"   on public.vanninntak for select to authenticated using (auth.uid() = bruker_id);
create policy "vanninntak: ny"         on public.vanninntak for insert to authenticated with check (auth.uid() = bruker_id);
create policy "vanninntak: endre egne" on public.vanninntak for update to authenticated using (auth.uid() = bruker_id) with check (auth.uid() = bruker_id);
create policy "vanninntak: slett egne" on public.vanninntak for delete to authenticated using (auth.uid() = bruker_id);

revoke all on public.vanninntak from anon;
grant select, insert, update, delete on public.vanninntak to authenticated;
revoke truncate, trigger, references on public.vanninntak from authenticated;

-- ── Lagring med versjon ─────────────────────────────────────────────────────
-- Kjøres med brukerens egne rettigheter (security invoker), så RLS gjelder som ellers.
-- Returnerer det som faktisk er lagret etterpå – også når forespørselen var for gammel og ble ignorert.
create or replace function public.vann_sett(p_dato date, p_glass integer, p_versjon bigint)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  ut jsonb;
begin
  if auth.uid() is null then
    raise exception 'Ikke innlogget' using errcode = '42501';
  end if;
  insert into public.vanninntak as v (bruker_id, dato, glass, versjon)
  values (auth.uid(), p_dato, p_glass, p_versjon)
  on conflict (bruker_id, dato) do update
    set glass = excluded.glass, versjon = excluded.versjon, oppdatert = now()
    where v.versjon < excluded.versjon;
  select jsonb_build_object('glass', v.glass, 'versjon', v.versjon) into ut
    from public.vanninntak v where v.bruker_id = auth.uid() and v.dato = p_dato;
  return ut;
end;
$$;

revoke all on function public.vann_sett(date, integer, bigint) from public, anon;
grant execute on function public.vann_sett(date, integer, bigint) to authenticated;

commit;
