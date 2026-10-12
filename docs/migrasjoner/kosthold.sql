-- Kostholdsmodulen: matvarer, dagbok (matlogg), måltidsmaler og personlige ernæringsmål.
--
-- • Bare tillegg: nye tabeller, regler, indekser og triggere. Endrer ingen eksisterende tabeller eller
--   data. Kan kjøres flere ganger.
-- • Hver rad eies av bruker_id. RLS gir hver bruker tilgang til bare sine egne rader – samme mønster
--   som vektlogg/treningsprogrammer. Ingen deling: kosthold vises ikke for de du deler trening med.
-- • Kontroller i databasen stopper negative mengder, urimelige næringsverdier og makromål som
--   ikke henger sammen med energimålet – også om noen går utenom appen.
-- • Doble registreringer: appen lager id-en (uuid) før lagring og sender samme id ved nye forsøk.
--   Innsetting skjer med «on conflict (id) do update», så et nytt forsøk lager aldri en kopi, og det
--   som sendes sist (f.eks. en rettet mengde etter et tapt svar) er det som lagres.
-- • Sletting av kontoen: alle tabellene har fremmednøkkel til auth.users med «on delete cascade».
--
-- • Transaksjon: alt eller ingenting. Feiler noe, rulles alt tilbake og databasen er som før.
-- • Forhåndskontroll: finnes en tabell med samme navn fra før, men med andre kolonner/typer, en annen
--   primærnøkkel eller RLS-regler denne filen ikke eier (f.eks. fra et tidligere eksperiment), stopper
--   migrasjonen med en tydelig feil før noe endres – den legger aldri regler eller rettigheter på en
--   fremmed tabell, og lar aldri en ukjent regel stå åpen ved siden av sine egne.
--
-- Testet mot PostgreSQL 16 med Supabase-lignende roller: scripts/test-rls.mjs (npm run test:rls).
--
-- Kontroller gjerne først (skal gi 0 rader i en database som ikke har kjørt denne migrasjonen):
--   select tablename from pg_tables where schemaname = 'public'
--     and tablename in ('matvarer', 'matlogg', 'maltidsmaler', 'ernaeringsmal');

begin;

-- Vent ikke i det uendelige på låser hvis databasen er opptatt – feil heller, så kan den kjøres igjen
set local lock_timeout = '10s';

-- ── Forhåndskontroll ────────────────────────────────────────────────────────
-- Finnes en av tabellene fra før, må den se ut som den denne migrasjonen lager: samme kolonner med
-- samme typer, primærnøkkel på riktig kolonne, og ingen andre RLS-regler enn de fire denne filen
-- eier. En ekstra regel (f.eks. «alle kan lese») ville ellers stått igjen ved siden av de nye og
-- åpnet tabellen, siden permissive regler kombineres med «eller».
do $$
declare
  forventet constant jsonb := '{
    "matvarer": {"id": "uuid", "bruker_id": "uuid", "navn": "text", "merke": "text", "strekkode": "text", "kilde": "text", "basis": "text", "kcal": "numeric", "kj": "numeric", "protein": "numeric", "karbohydrater": "numeric", "fett": "numeric", "sukker": "numeric", "mettet_fett": "numeric", "fiber": "numeric", "salt": "numeric", "porsjon_navn": "text", "porsjon_mengde": "numeric", "porsjon_enhet": "text", "stk_vekt": "numeric", "tetthet": "numeric", "favoritt": "bool", "antall_bruk": "int4", "sist_brukt": "timestamptz", "sist_mengde": "numeric", "sist_enhet": "text", "opprettet": "timestamptz", "oppdatert": "timestamptz"},
    "matlogg": {"id": "uuid", "bruker_id": "uuid", "dato": "date", "maltid": "text", "matvare_id": "uuid", "navn": "text", "merke": "text", "basis": "text", "mengde": "numeric", "enhet": "text", "basis_mengde": "numeric", "kcal_100": "numeric", "protein_100": "numeric", "karbohydrater_100": "numeric", "fett_100": "numeric", "sukker_100": "numeric", "mettet_fett_100": "numeric", "fiber_100": "numeric", "salt_100": "numeric", "opprettet": "timestamptz", "oppdatert": "timestamptz"},
    "maltidsmaler": {"id": "uuid", "bruker_id": "uuid", "navn": "text", "maltid": "text", "linjer": "jsonb", "sist_brukt": "timestamptz", "opprettet": "timestamptz", "oppdatert": "timestamptz"},
    "ernaeringsmal": {"bruker_id": "uuid", "beregningsgrunnlag": "text", "aktivitetsniva": "text", "retning": "text", "tempo": "numeric", "vedlikehold_kcal": "int4", "kcal": "int4", "protein": "int4", "karbohydrater": "int4", "fett": "int4", "overstyrt": "bool", "opprettet": "timestamptz", "oppdatert": "timestamptz"}
  }';
  primar constant jsonb := '{"matvarer": "id", "matlogg": "id", "maltidsmaler": "id", "ernaeringsmal": "bruker_id"}';
  t text;
  avvik text[];
begin
  if to_regclass('auth.users') is null or to_regprocedure('auth.uid()') is null then
    raise exception 'Fant ikke Supabase-innloggingen (auth.users / auth.uid()). Avbryter – ingenting er endret.';
  end if;
  for t in select jsonb_object_keys(forventet) loop
    if to_regclass('public.' || t) is not null then
      -- Kolonner som mangler eller har en annen type (udt_name, f.eks. uuid, numeric, text)
      select array_agg(f.key || ' (' || coalesce(c.udt_name, 'mangler') || ', ventet ' || f.value || ')' order by f.key) into avvik
        from jsonb_each_text(forventet -> t) as f
        left join information_schema.columns c
          on c.table_schema = 'public' and c.table_name = t and c.column_name = f.key
       where c.udt_name is distinct from f.value;
      if avvik is not null then
        raise exception 'Tabellen public.% finnes allerede, men har en annen struktur: %. Den er trolig ikke laget av denne migrasjonen. Avbryter – ingenting er endret.', t, avvik;
      end if;
      -- Primærnøkkelen brukes av «on conflict» ved nye forsøk
      if not exists (
        select 1 from pg_constraint k
         where k.conrelid = ('public.' || t)::regclass and k.contype = 'p'
           and k.conkey = array[(select a.attnum from pg_attribute a
                                  where a.attrelid = ('public.' || t)::regclass and a.attname = primar ->> t)]::int2[]
      ) then
        raise exception 'Tabellen public.% finnes allerede, men primærnøkkelen er ikke (%). Avbryter – ingenting er endret.', t, primar ->> t;
      end if;
      -- RLS-regler denne migrasjonen ikke eier
      select array_agg(p.policyname::text order by p.policyname) into avvik
        from pg_policies p
       where p.schemaname = 'public' and p.tablename = t
         and p.policyname not in (t || ': les egne', t || ': ny', t || ': endre egne', t || ': slett egne');
      if avvik is not null then
        raise exception 'Tabellen public.% har RLS-regler som ikke kommer fra denne migrasjonen: %. Fjern dem eller kontroller dem først. Avbryter – ingenting er endret.', t, avvik;
      end if;
    end if;
  end loop;
end $$;

-- ── Felles: oppdatert-tidsstempel ───────────────────────────────────────────
create or replace function public.kost_sett_oppdatert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.oppdatert := now();
  return new;
end;
$$;

-- ── Matvarer (brukerens lagrede matvarer og favoritter) ─────────────────────
create table if not exists public.matvarer (
  id             uuid primary key default gen_random_uuid(),
  bruker_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  navn           text not null check (length(btrim(navn)) between 1 and 200),
  merke          text check (merke is null or length(merke) <= 200),
  strekkode      text check (strekkode is null or strekkode ~ '^[0-9]{8,14}$'),
  kilde          text not null default 'manuell' check (kilde in ('manuell', 'openfoodfacts', 'etikett')),
  basis          text not null default '100g' check (basis in ('100g', '100ml')),
  -- Verdier per 100 g eller per 100 ml (basis). null = ukjent, ikke 0.
  kcal           numeric(7, 2) not null check (kcal >= 0 and kcal <= 950),
  kj             numeric(7, 1) check (kj >= 0 and kj <= 4000),
  protein        numeric(6, 2) check (protein >= 0),
  karbohydrater  numeric(6, 2) check (karbohydrater >= 0),
  fett           numeric(6, 2) check (fett >= 0),
  sukker         numeric(6, 2) check (sukker >= 0),
  mettet_fett    numeric(6, 2) check (mettet_fett >= 0),
  fiber          numeric(6, 2) check (fiber >= 0),
  salt           numeric(6, 2) check (salt >= 0),
  porsjon_navn   text check (porsjon_navn is null or length(porsjon_navn) <= 60),
  porsjon_mengde numeric(7, 2) check (porsjon_mengde > 0 and porsjon_mengde <= 5000),
  porsjon_enhet  text check (porsjon_enhet in ('g', 'ml')),
  stk_vekt       numeric(7, 2) check (stk_vekt > 0 and stk_vekt <= 5000),       -- gram per stykk
  tetthet        numeric(5, 3) check (tetthet >= 0.2 and tetthet <= 3),        -- gram per milliliter
  favoritt       boolean not null default false,
  antall_bruk    integer not null default 0 check (antall_bruk >= 0),
  sist_brukt     timestamptz,
  -- Sist brukte mengde – for «legg til igjen» med ett trykk
  sist_mengde    numeric(9, 3) check (sist_mengde > 0 and sist_mengde <= 10000),
  sist_enhet     text check (sist_enhet in ('g', 'ml', 'porsjon', 'stk')),
  opprettet      timestamptz not null default now(),
  oppdatert      timestamptz not null default now(),
  -- Per 100 g kan ingen makro være over 100 g; per 100 ml tillates mer (sirup, honning)
  constraint matvarer_makro_grense check (
    greatest(coalesce(protein, 0), coalesce(karbohydrater, 0), coalesce(fett, 0), coalesce(sukker, 0),
             coalesce(mettet_fett, 0), coalesce(fiber, 0), coalesce(salt, 0))
      <= case basis when '100g' then 100 else 200 end
  ),
  constraint matvarer_makro_sum check (
    basis <> '100g' or coalesce(protein, 0) + coalesce(karbohydrater, 0) + coalesce(fett, 0) <= 105
  ),
  constraint matvarer_sukker_karbo check (sukker is null or karbohydrater is null or sukker <= karbohydrater + 0.5),
  constraint matvarer_mettet_fett check (mettet_fett is null or fett is null or mettet_fett <= fett + 0.5),
  constraint matvarer_porsjon_komplett check ((porsjon_mengde is null) = (porsjon_enhet is null)),
  -- Samme strekkode lagres bare én gang per bruker (NULL-verdier teller ikke som like)
  constraint matvarer_bruker_strekkode_key unique (bruker_id, strekkode)
);

create index if not exists matvarer_bruker_sist_brukt_idx on public.matvarer (bruker_id, sist_brukt desc nulls last);

drop trigger if exists matvarer_oppdatert on public.matvarer;
create trigger matvarer_oppdatert before update on public.matvarer
  for each row execute function public.kost_sett_oppdatert();

-- ── Dagbok: hva som er spist ────────────────────────────────────────────────
-- Hver linje har et øyeblikksbilde av matvarens verdier per 100 (navn og næring), slik at
-- historikken ikke endres om matvaren senere rettes eller slettes. Mengden kan endres;
-- næringen regnes da ut på nytt fra øyeblikksbildet.
create table if not exists public.matlogg (
  id                uuid primary key default gen_random_uuid(),
  bruker_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dato              date not null check (dato between date '2000-01-01' and date '2100-01-01'),
  maltid            text not null check (maltid in ('frokost', 'lunsj', 'middag', 'kveldsmat', 'mellommaltid')),
  matvare_id        uuid references public.matvarer (id) on delete set null,
  navn              text not null check (length(btrim(navn)) between 1 and 200),
  merke             text check (merke is null or length(merke) <= 200),
  basis             text not null check (basis in ('100g', '100ml')),
  mengde            numeric(9, 3) not null check (mengde > 0 and mengde <= 10000),
  enhet             text not null check (enhet in ('g', 'ml', 'porsjon', 'stk')),
  basis_mengde      numeric(10, 3) not null check (basis_mengde > 0 and basis_mengde <= 10000),
  kcal_100          numeric(7, 2) not null check (kcal_100 >= 0 and kcal_100 <= 950),
  protein_100       numeric(6, 2) check (protein_100 >= 0 and protein_100 <= 200),
  karbohydrater_100 numeric(6, 2) check (karbohydrater_100 >= 0 and karbohydrater_100 <= 200),
  fett_100          numeric(6, 2) check (fett_100 >= 0 and fett_100 <= 200),
  sukker_100        numeric(6, 2) check (sukker_100 >= 0 and sukker_100 <= 200),
  mettet_fett_100   numeric(6, 2) check (mettet_fett_100 >= 0 and mettet_fett_100 <= 200),
  fiber_100         numeric(6, 2) check (fiber_100 >= 0 and fiber_100 <= 200),
  salt_100          numeric(6, 2) check (salt_100 >= 0 and salt_100 <= 200),
  opprettet         timestamptz not null default now(),
  oppdatert         timestamptz not null default now()
);

create index if not exists matlogg_bruker_dato_idx on public.matlogg (bruker_id, dato);
-- Sletting av en matvare setter matvare_id til null i dagboken; uten indeks måtte hele tabellen leses
create index if not exists matlogg_matvare_idx on public.matlogg (matvare_id) where matvare_id is not null;

drop trigger if exists matlogg_oppdatert on public.matlogg;
create trigger matlogg_oppdatert before update on public.matlogg
  for each row execute function public.kost_sett_oppdatert();

-- «Nylig brukt», antall og sist brukte mengde oppdateres her, i samme transaksjon som registreringen.
-- Atomisk (ingen tapte tellinger fra flere enheter), og bare for rader som faktisk settes inn – et nytt
-- forsøk med samme id («on conflict … do update» oppdaterer i stedet for å sette inn) teller ikke dobbelt. Kjøres med brukerens egne
-- rettigheter (RLS gjelder), og bare på brukerens egen matvare.
create or replace function public.kost_registrer_bruk()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.matvare_id is not null then
    update public.matvarer
       set antall_bruk = antall_bruk + 1, sist_brukt = now(), sist_mengde = new.mengde, sist_enhet = new.enhet
     where id = new.matvare_id and bruker_id = new.bruker_id;
  end if;
  return null;
end;
$$;

drop trigger if exists matlogg_bruk on public.matlogg;
create trigger matlogg_bruk after insert on public.matlogg
  for each row execute function public.kost_registrer_bruk();

-- ── Måltidsmaler («Min faste frokost») ──────────────────────────────────────
-- Linjene lagres i samme rad (jsonb), så en mal alltid lagres helt eller ikke i det hele tatt.
-- Format: [{ "matvare_id": uuid, "mengde": tall > 0, "enhet": "g"|"ml"|"porsjon"|"stk" }]
create or replace function public.kost_gyldige_linjer(p jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(p) = 'array'
    and jsonb_array_length(p) between 1 and 40
    and not exists (
      select 1 from jsonb_array_elements(p) as l
      where jsonb_typeof(l) <> 'object'
         or coalesce(l ->> 'matvare_id', '') !~ '^[0-9a-fA-F-]{36}$'
         or case when jsonb_typeof(l -> 'mengde') = 'number'
                 then (l ->> 'mengde')::numeric <= 0 or (l ->> 'mengde')::numeric > 10000
                 else true end
         or coalesce(l ->> 'enhet', '') not in ('g', 'ml', 'porsjon', 'stk')
    );
$$;

create table if not exists public.maltidsmaler (
  id         uuid primary key default gen_random_uuid(),
  bruker_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  navn       text not null check (length(btrim(navn)) between 1 and 120),
  maltid     text check (maltid in ('frokost', 'lunsj', 'middag', 'kveldsmat', 'mellommaltid')),
  linjer     jsonb not null check (public.kost_gyldige_linjer(linjer)),
  sist_brukt timestamptz,
  opprettet  timestamptz not null default now(),
  oppdatert  timestamptz not null default now()
);

create index if not exists maltidsmaler_bruker_idx on public.maltidsmaler (bruker_id);

drop trigger if exists maltidsmaler_oppdatert on public.maltidsmaler;
create trigger maltidsmaler_oppdatert before update on public.maltidsmaler
  for each row execute function public.kost_sett_oppdatert();

-- ── Personlige ernæringsmål ─────────────────────────────────────────────────
-- Vekt, høyde, fødselsår og målvekt ligger i profiler. Her lagres resten av grunnlaget
-- og selve målene (beregnet eller overstyrt av brukeren).
create table if not exists public.ernaeringsmal (
  bruker_id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  beregningsgrunnlag text check (beregningsgrunnlag in ('mann', 'kvinne')),
  aktivitetsniva     text check (aktivitetsniva in ('stillesittende', 'lett', 'moderat', 'hoy', 'svart_hoy')),
  retning            text check (retning in ('ned', 'vedlikehold', 'opp')),
  tempo              numeric(3, 2) check (tempo >= 0 and tempo <= 1),           -- kg per uke
  vedlikehold_kcal   integer check (vedlikehold_kcal between 800 and 8000),
  kcal               integer not null check (kcal between 800 and 8000),
  protein            integer not null check (protein between 0 and 500),
  karbohydrater      integer not null check (karbohydrater between 0 and 1500),
  fett               integer not null check (fett between 0 and 500),
  overstyrt          boolean not null default false,
  opprettet          timestamptz not null default now(),
  oppdatert          timestamptz not null default now(),
  -- Protein × 4 + karbohydrater × 4 + fett × 9 skal stemme med energimålet (hele gram ⇒ små avrundingsavvik)
  constraint ernaeringsmal_konsistent check (abs(protein * 4 + karbohydrater * 4 + fett * 9 - kcal) <= 15)
);

drop trigger if exists ernaeringsmal_oppdatert on public.ernaeringsmal;
create trigger ernaeringsmal_oppdatert before update on public.ernaeringsmal
  for each row execute function public.kost_sett_oppdatert();

-- ── Tilgangsregler ──────────────────────────────────────────────────────────
alter table public.matvarer      enable row level security;
alter table public.matlogg       enable row level security;
alter table public.maltidsmaler  enable row level security;
alter table public.ernaeringsmal enable row level security;

-- Bare innloggede brukere; anonyme får ingen tilgang i det hele tatt
revoke all on public.matvarer, public.matlogg, public.maltidsmaler, public.ernaeringsmal from anon;
grant select, insert, update, delete on public.matvarer, public.matlogg, public.maltidsmaler, public.ernaeringsmal to authenticated;
-- Samme opprydding som docs/migrasjoner/opprydding.sql: TRUNCATE går utenom RLS
revoke truncate, trigger, references on public.matvarer, public.matlogg, public.maltidsmaler, public.ernaeringsmal from authenticated;

-- Hjelpefunksjonene skal ikke kunne kalles direkte. Triggerfunksjonene trenger ingen rettighet for å
-- kjøre som trigger; valideringsfunksjonen brukes i en kontroll og må kunne kjøres av innloggede.
revoke all on function public.kost_sett_oppdatert() from public, anon, authenticated;
revoke all on function public.kost_registrer_bruk() from public, anon, authenticated;
revoke all on function public.kost_gyldige_linjer(jsonb) from public, anon;
grant execute on function public.kost_gyldige_linjer(jsonb) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['matvarer', 'matlogg', 'maltidsmaler', 'ernaeringsmal'] loop
    execute format('drop policy if exists "%1$s: les egne" on public.%1$I', t);
    execute format('drop policy if exists "%1$s: ny" on public.%1$I', t);
    execute format('drop policy if exists "%1$s: endre egne" on public.%1$I', t);
    execute format('drop policy if exists "%1$s: slett egne" on public.%1$I', t);
    execute format('create policy "%1$s: les egne" on public.%1$I for select to authenticated using ((select auth.uid()) = bruker_id)', t);
    execute format('create policy "%1$s: slett egne" on public.%1$I for delete to authenticated using ((select auth.uid()) = bruker_id)', t);
  end loop;
end $$;

-- Ny og endre: egne rader, og en dagbokslinje kan bare peke på en av dine egne matvarer
-- (en fremmednøkkel alene sjekker ikke eier).
create policy "matvarer: ny" on public.matvarer for insert to authenticated
  with check ((select auth.uid()) = bruker_id);
create policy "matvarer: endre egne" on public.matvarer for update to authenticated
  using ((select auth.uid()) = bruker_id) with check ((select auth.uid()) = bruker_id);

create policy "matlogg: ny" on public.matlogg for insert to authenticated
  with check (
    (select auth.uid()) = bruker_id
    and (matvare_id is null or exists (select 1 from public.matvarer m where m.id = matvare_id and m.bruker_id = (select auth.uid())))
  );
create policy "matlogg: endre egne" on public.matlogg for update to authenticated
  using ((select auth.uid()) = bruker_id)
  with check (
    (select auth.uid()) = bruker_id
    and (matvare_id is null or exists (select 1 from public.matvarer m where m.id = matvare_id and m.bruker_id = (select auth.uid())))
  );

create policy "maltidsmaler: ny" on public.maltidsmaler for insert to authenticated
  with check ((select auth.uid()) = bruker_id);
create policy "maltidsmaler: endre egne" on public.maltidsmaler for update to authenticated
  using ((select auth.uid()) = bruker_id) with check ((select auth.uid()) = bruker_id);

create policy "ernaeringsmal: ny" on public.ernaeringsmal for insert to authenticated
  with check ((select auth.uid()) = bruker_id);
create policy "ernaeringsmal: endre egne" on public.ernaeringsmal for update to authenticated
  using ((select auth.uid()) = bruker_id) with check ((select auth.uid()) = bruker_id);

notify pgrst, 'reload schema';

commit;
