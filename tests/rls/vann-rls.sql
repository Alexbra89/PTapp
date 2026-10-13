-- Tester tilgangsreglene og versjonsregelen i docs/migrasjoner/vann.sql mot en ekte PostgreSQL.
-- Kjøres av scripts/test-rls.mjs etter supabase-stub.sql og migrasjonene. Stopper ved første feil.
-- Egne brukere (C og D), så testen ikke avhenger av hva kosthold-rls.sql har slettet.

\set ON_ERROR_STOP on
\set C '00000000-0000-4000-8000-00000000000c'
\set D '00000000-0000-4000-8000-00000000000d'

reset role;
insert into auth.users (id, email) values (:'C', 'c@test.no'), (:'D', 'd@test.no');

create or replace function public.vforvent(betingelse boolean, beskrivelse text) returns void
language plpgsql as $$
begin
  if betingelse is not true then raise exception 'TEST FEILET: %', beskrivelse; end if;
end $$;
create or replace function public.vforvent_feil(sql text, kode text, beskrivelse text) returns void
language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    if sqlstate = kode then return; end if;
    raise exception 'TEST FEILET (%): forventet %, fikk % – %', beskrivelse, kode, sqlstate, sqlerrm;
  end;
  raise exception 'TEST FEILET (%): setningen skulle feilet med %', beskrivelse, kode;
end $$;
grant execute on function public.vforvent(boolean, text), public.vforvent_feil(text, text, text) to authenticated, anon;

-- ── Bruker C lagrer ────────────────────────────────────────────────────────
set role authenticated;
select set_config('request.jwt.claim.sub', :'C', false);

select vforvent(vann_sett('2026-10-12', 1, 100) = '{"glass": 1, "versjon": 100}', 'første lagring');
select vforvent(vann_sett('2026-10-12', 2, 200) = '{"glass": 2, "versjon": 200}', 'nyere versjon erstatter');
-- Det forsinkede forsøket med 1 glass (versjon 100) kommer fram etter 2: ignoreres
select vforvent(vann_sett('2026-10-12', 1, 100) = '{"glass": 2, "versjon": 200}', 'eldre versjon ignoreres og lagret antall returneres');
select vforvent(vann_sett('2026-10-12', 9, 200) = '{"glass": 2, "versjon": 200}', 'samme versjon ignoreres');
select vforvent((select glass from vanninntak where bruker_id = :'C' and dato = '2026-10-12') = 2, 'lagret antall er 2');

-- Datoer holdes adskilt
select vforvent(vann_sett('2026-10-13', 5, 50) = '{"glass": 5, "versjon": 50}', 'annen dato lagres for seg, selv med lavere versjon');
select vforvent((select glass from vanninntak where bruker_id = :'C' and dato = '2026-10-12') = 2, 'første dato urørt');

-- Kontroller
select vforvent_feil($$select vann_sett('2026-10-14', -1, 1)$$, '23514', 'negativt antall');
select vforvent_feil($$select vann_sett('2026-10-14', 41, 1)$$, '23514', 'urimelig mange glass');
select vforvent_feil($$select vann_sett('2026-10-14', 1, -5)$$, '23514', 'negativ versjon');

-- ── Bruker D ser og endrer ikke C sine data ────────────────────────────────
select set_config('request.jwt.claim.sub', :'D', false);
select vforvent((select count(*) from vanninntak) = 0, 'D ser ingen rader fra C');
select vforvent(vann_sett('2026-10-12', 7, 999999) = '{"glass": 7, "versjon": 999999}', 'D får sin egen rad for samme dato');
update vanninntak set glass = 40 where bruker_id = :'C';
delete from vanninntak where bruker_id = :'C';
select vforvent_feil(format($$insert into vanninntak (bruker_id, dato, glass) values (%L, '2026-10-20', 3)$$, :'C'), '42501', 'D kan ikke lage rad for C');
select vforvent_feil(format($$update vanninntak set bruker_id = %L$$, :'C'), '42501', 'D kan ikke flytte rad til C');

select set_config('request.jwt.claim.sub', :'C', false);
select vforvent((select glass from vanninntak where dato = '2026-10-12') = 2, 'C sine data er urørt av D');
select vforvent((select count(*) from vanninntak) = 2, 'C ser bare sine egne to rader');

-- ── Anon har ingen tilgang ─────────────────────────────────────────────────
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select vforvent_feil('select * from vanninntak', '42501', 'anon kan ikke lese');
select vforvent_feil($$select vann_sett('2026-10-12', 1, 1)$$, '42501', 'anon kan ikke kalle vann_sett');

-- Innlogget uten bruker-id i token
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '', false);
select vforvent_feil($$select vann_sett('2026-10-12', 1, 1)$$, '42501', 'vann_sett krever innlogget bruker');

-- ── Struktur og sletting av konto ──────────────────────────────────────────
reset role;
select vforvent((select relrowsecurity from pg_class where oid = 'public.vanninntak'::regclass), 'RLS er på');
select vforvent((select count(*) from pg_policies where tablename = 'vanninntak') = 4, 'fire regler');
select vforvent(not exists (select 1 from pg_policies where tablename = 'vanninntak' and 'anon' = any (roles)), 'ingen regler for anon');
select vforvent((select not prosecdef from pg_proc where proname = 'vann_sett'), 'vann_sett kjører med brukerens rettigheter (RLS gjelder)');
delete from auth.users where id = :'C';
select vforvent((select count(*) from vanninntak where bruker_id = :'C') = 0, 'vann slettes med kontoen');
select vforvent((select count(*) from vanninntak where bruker_id = :'D') = 1, 'D sine data er urørt');

\echo 'Alle RLS- og valideringstester for vann besto.'
