-- Opprydding etter sikkerhetsrevisjonen. Endrer ingen data og ingen tilgang for brukerne.
-- Kan kjøres flere ganger.
--
-- 1. favoritt_ovelser har to identiske unike regler på (bruker_id, ovelse_navn).
--    Den ene fjernes – bare hvis den andre finnes, så unikheten alltid beholdes.
-- 2. profiler har to par regler med nøyaktig samme uttrykk. Duplikatene fjernes –
--    bare hvis tvillingen finnes, så tilgangen er uendret.
-- 3. Rollene anon og authenticated har TRUNCATE, TRIGGER og REFERENCES på alle tabeller
--    (Supabase-standard). Appen bruker dem aldri, og TRUNCATE går utenom RLS.
--    De fjernes. SELECT/INSERT/UPDATE/DELETE (som RLS styrer) er urørt.

do $$
begin
  -- 1. Dobbel unik regel
  if exists (select 1 from pg_constraint where conname = 'favoritt_ovelser_bruker_id_ovelse_navn_key'
               and conrelid = 'public.favoritt_ovelser'::regclass)
     and exists (select 1 from pg_constraint where conname = 'unique_bruker_ovelse'
               and conrelid = 'public.favoritt_ovelser'::regclass) then
    alter table public.favoritt_ovelser drop constraint unique_bruker_ovelse;
    raise notice 'Fjernet dobbel unik regel unique_bruker_ovelse';
  end if;

  -- 2. Doble profilregler (beholder «Brukere kan …»-variantene)
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiler'
               and policyname = 'Brukere kan oppdatere egen profil') then
    drop policy if exists "Bruker kan oppdatere egen profil" on public.profiler;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiler'
               and policyname = 'Brukere kan sette inn egen profil') then
    drop policy if exists "Bruker kan sette inn egen profil" on public.profiler;
  end if;
end $$;

-- 3. Rettigheter appen aldri bruker
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
