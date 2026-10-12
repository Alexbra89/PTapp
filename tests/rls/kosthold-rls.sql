-- Tester tilgangsreglene og kontrollene i docs/migrasjoner/kosthold.sql mot en ekte PostgreSQL.
-- Kjøres av scripts/test-rls.mjs etter supabase-stub.sql og migrasjonen. Stopper ved første feil.
--
-- Bruker A og B. Alt kjøres som rollen «authenticated» med JWT-claim sub = brukerens id,
-- akkurat slik PostgREST gjør i Supabase.

\set ON_ERROR_STOP on
\set A '00000000-0000-4000-8000-00000000000a'
\set B '00000000-0000-4000-8000-00000000000b'

-- Hjelper: forventer at en setning feiler med en bestemt SQLSTATE
create function public.forvent_feil(sql text, kode text, beskrivelse text) returns void
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
grant execute on function public.forvent_feil(text, text, text) to authenticated, anon;

create function public.forvent(betingelse boolean, beskrivelse text) returns void
language plpgsql as $$
begin
  if betingelse is not true then raise exception 'TEST FEILET: %', beskrivelse; end if;
end $$;
grant execute on function public.forvent(boolean, text) to authenticated, anon;

-- ── Bruker A lager data ────────────────────────────────────────────────────
set role authenticated;
select set_config('request.jwt.claim.sub', :'A', false);

insert into matvarer (id, bruker_id, navn, basis, kcal, protein, karbohydrater, fett, strekkode)
values ('aaaaaaaa-0000-4000-8000-000000000001', :'A', 'Havregryn', '100g', 370, 13, 60, 7, '7038010009457');
insert into matlogg (id, bruker_id, dato, maltid, matvare_id, navn, basis, mengde, enhet, basis_mengde, kcal_100, protein_100)
values ('aaaaaaaa-0000-4000-8000-000000000002', :'A', '2026-10-12', 'frokost', 'aaaaaaaa-0000-4000-8000-000000000001', 'Havregryn', '100g', 60, 'g', 60, 370, 13);
insert into maltidsmaler (id, bruker_id, navn, linjer)
values ('aaaaaaaa-0000-4000-8000-000000000003', :'A', 'Min faste frokost', '[{"matvare_id":"aaaaaaaa-0000-4000-8000-000000000001","mengde":60,"enhet":"g"}]');
insert into ernaeringsmal (bruker_id, kcal, protein, karbohydrater, fett) values (:'A', 2500, 160, 278, 83);

select forvent((select count(*) from matvarer) = 1, 'A ser sin egen matvare');
select forvent((select count(*) from matlogg) = 1, 'A ser sin egen dagbok');

-- bruker_id fylles inn fra innloggingen når den ikke sendes
insert into matvarer (id, navn, kcal) values ('aaaaaaaa-0000-4000-8000-000000000004', 'Uten eier oppgitt', 100);
select forvent((select bruker_id from matvarer where id = 'aaaaaaaa-0000-4000-8000-000000000004') = :'A', 'standard eier er innlogget bruker');

-- ── Doble registreringer: samme id to ganger gir én rad ────────────────────
insert into matlogg (id, bruker_id, dato, maltid, navn, basis, mengde, enhet, basis_mengde, kcal_100)
values ('aaaaaaaa-0000-4000-8000-000000000005', :'A', '2026-10-12', 'lunsj', 'Eple', '100g', 150, 'g', 150, 52)
on conflict (id) do nothing;
insert into matlogg (id, bruker_id, dato, maltid, navn, basis, mengde, enhet, basis_mengde, kcal_100)
values ('aaaaaaaa-0000-4000-8000-000000000005', :'A', '2026-10-12', 'lunsj', 'Eple', '100g', 150, 'g', 150, 52)
on conflict (id) do nothing;
select forvent((select count(*) from matlogg where id = 'aaaaaaaa-0000-4000-8000-000000000005') = 1, 'nytt forsøk med samme id lager ikke kopi');
-- Flere linjer i én setning (en hel måltidsmal) er alt-eller-ingenting
select forvent_feil($$insert into matlogg (id, dato, maltid, navn, basis, mengde, enhet, basis_mengde, kcal_100) values
  ('aaaaaaaa-0000-4000-8000-000000000006', '2026-10-12', 'middag', 'OK', '100g', 100, 'g', 100, 100),
  ('aaaaaaaa-0000-4000-8000-000000000007', '2026-10-12', 'middag', 'Feil', '100g', -5, 'g', 100, 100)$$, '23514', 'én ugyldig linje stopper hele innsettingen');
select forvent((select count(*) from matlogg where id = 'aaaaaaaa-0000-4000-8000-000000000006') = 0, 'ingen halvveis lagret mal');

-- ── Validering ─────────────────────────────────────────────────────────────
select forvent_feil($$insert into matlogg (dato, maltid, navn, basis, mengde, enhet, basis_mengde, kcal_100) values ('2026-10-12','lunsj','X','100g',-1,'g',100,100)$$, '23514', 'negativ mengde');
select forvent_feil($$insert into matlogg (dato, maltid, navn, basis, mengde, enhet, basis_mengde, kcal_100) values ('2026-10-12','lunsj','X','100g',0,'g',0,100)$$, '23514', 'null mengde');
select forvent_feil($$insert into matlogg (dato, maltid, navn, basis, mengde, enhet, basis_mengde, kcal_100) values ('2026-10-12','lunsj','X','100g',100000,'g',100000,100)$$, '23514', 'urimelig mengde');
select forvent_feil($$insert into matlogg (dato, maltid, navn, basis, mengde, enhet, basis_mengde, kcal_100) values ('2026-10-12','brunsj','X','100g',1,'g',1,100)$$, '23514', 'ukjent måltid');
select forvent_feil($$insert into matlogg (dato, maltid, navn, basis, mengde, enhet, basis_mengde, kcal_100) values ('2026-10-12','lunsj','X','100g',1,'kopp',1,100)$$, '23514', 'ukjent enhet');
select forvent_feil($$insert into matlogg (dato, maltid, navn, basis, mengde, enhet, basis_mengde, kcal_100) values ('2026-10-12','lunsj','X','100g','NaN','g',1,100)$$, '23514', 'NaN som mengde');
select forvent_feil($$insert into matvarer (navn, kcal) values ('X', -1)$$, '23514', 'negativ energi');
select forvent_feil($$insert into matvarer (navn, kcal) values ('X', 2000)$$, '23514', 'urimelig energi');
select forvent_feil($$insert into matvarer (navn, kcal, karbohydrater) values ('X', 100, 120)$$, '23514', 'over 100 g per 100 g');
select forvent_feil($$insert into matvarer (navn, kcal, protein, karbohydrater, fett) values ('X', 500, 50, 50, 50)$$, '23514', 'makroer over 100 g til sammen');
select forvent_feil($$insert into matvarer (navn, kcal, karbohydrater, sukker) values ('X', 100, 10, 20)$$, '23514', 'mer sukker enn karbo');
select forvent_feil($$insert into matvarer (navn, kcal, fett, mettet_fett) values ('X', 100, 1, 5)$$, '23514', 'mer mettet fett enn fett');
select forvent_feil($$insert into matvarer (navn, kcal, strekkode) values ('X', 100, '12ab')$$, '23514', 'ugyldig strekkode');
select forvent_feil($$insert into matvarer (navn, kcal, porsjon_mengde) values ('X', 100, 30)$$, '23514', 'porsjon uten enhet');
select forvent_feil($$insert into matvarer (navn, kcal, strekkode) values ('Kopi', 100, '7038010009457')$$, '23505', 'samme strekkode to ganger for samme bruker');
select forvent_feil($$insert into matvarer (navn, kcal) values ('   ', 100)$$, '23514', 'tomt navn');
-- Sirup per 100 ml kan ha mer enn 100 g karbohydrat
insert into matvarer (navn, kcal, basis, karbohydrater, sukker) values ('Sirup', 400, '100ml', 110, 100);
select forvent_feil($$insert into maltidsmaler (navn, linjer) values ('X', '[]')$$, '23514', 'tom mal');
select forvent_feil($$insert into maltidsmaler (navn, linjer) values ('X', '[{"matvare_id":"aaaaaaaa-0000-4000-8000-000000000001","mengde":-1,"enhet":"g"}]')$$, '23514', 'negativ mengde i mal');
select forvent_feil($$insert into maltidsmaler (navn, linjer) values ('X', '[{"matvare_id":"aaaaaaaa-0000-4000-8000-000000000001","mengde":"mye","enhet":"g"}]')$$, '23514', 'tekst som mengde i mal');
select forvent_feil($$insert into maltidsmaler (navn, linjer) values ('X', '{"a":1}')$$, '23514', 'mal som ikke er liste');
select forvent_feil($$update ernaeringsmal set kcal = 3000$$, '23514', 'makroer som ikke stemmer med energimålet');
update ernaeringsmal set kcal = 2508; -- innenfor avrundingsavvik
select forvent_feil($$update ernaeringsmal set protein = -1, karbohydrater = 279$$, '23514', 'negativt proteinmål');

-- ── Bruker B ser og endrer ingenting av A sitt ─────────────────────────────
select set_config('request.jwt.claim.sub', :'B', false);

select forvent((select count(*) from matvarer) = 0, 'B ser ikke A sine matvarer');
select forvent((select count(*) from matlogg) = 0, 'B ser ikke A sin dagbok');
select forvent((select count(*) from maltidsmaler) = 0, 'B ser ikke A sine maler');
select forvent((select count(*) from ernaeringsmal) = 0, 'B ser ikke A sine mål');

-- Oppdatering og sletting treffer ingen rader (RLS skjuler dem)
with u as (update matvarer set kcal = 1 where id = 'aaaaaaaa-0000-4000-8000-000000000001' returning 1) select forvent((select count(*) from u) = 0, 'B kan ikke endre A sin matvare');
with u as (update matlogg set mengde = 1 where id = 'aaaaaaaa-0000-4000-8000-000000000002' returning 1) select forvent((select count(*) from u) = 0, 'B kan ikke endre A sin dagbok');
with u as (update ernaeringsmal set overstyrt = true returning 1) select forvent((select count(*) from u) = 0, 'B kan ikke endre A sine mål');
with d as (delete from matlogg returning 1) select forvent((select count(*) from d) = 0, 'B kan ikke slette A sin dagbok');
with d as (delete from matvarer returning 1) select forvent((select count(*) from d) = 0, 'B kan ikke slette A sine matvarer');
with d as (delete from maltidsmaler returning 1) select forvent((select count(*) from d) = 0, 'B kan ikke slette A sine maler');

-- B kan ikke lage rader i A sitt navn
select forvent_feil(format($$insert into matvarer (bruker_id, navn, kcal) values (%L, 'Falsk', 100)$$, :'A'), '42501', 'B setter inn matvare som A');
select forvent_feil(format($$insert into matlogg (bruker_id, dato, maltid, navn, basis, mengde, enhet, basis_mengde, kcal_100) values (%L, '2026-10-12', 'lunsj', 'Falsk', '100g', 1, 'g', 1, 1)$$, :'A'), '42501', 'B setter inn dagbok som A');
select forvent_feil(format($$insert into ernaeringsmal (bruker_id, kcal, protein, karbohydrater, fett) values (%L, 2000, 100, 300, 67)$$, :'A'), '42501', 'B setter mål for A');
-- … eller peke dagboken sin på A sin matvare
select forvent_feil($$insert into matlogg (dato, maltid, matvare_id, navn, basis, mengde, enhet, basis_mengde, kcal_100) values ('2026-10-12', 'lunsj', 'aaaaaaaa-0000-4000-8000-000000000001', 'Lånt', '100g', 1, 'g', 1, 1)$$, '42501', 'B refererer A sin matvare');
-- Samme strekkode som A er greit for B (egne rader)
insert into matvarer (id, navn, kcal, strekkode) values ('bbbbbbbb-0000-4000-8000-000000000001', 'B sin havregryn', 370, '7038010009457');
-- B prøver å «overta» A sin rad ved å gjenbruke id-en: ingen effekt
insert into matlogg (id, dato, maltid, navn, basis, mengde, enhet, basis_mengde, kcal_100)
values ('aaaaaaaa-0000-4000-8000-000000000002', '2026-10-12', 'lunsj', 'Kapring', '100g', 1, 'g', 1, 1)
on conflict (id) do nothing;
select forvent((select count(*) from matlogg) = 0, 'gjenbrukt id fra A gir ingen rad for B');
-- B kan ikke flytte sin egen rad over til A
select forvent_feil(format($$update matvarer set bruker_id = %L where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$, :'A'), '42501', 'B gir bort rad til A');

-- ── Anonym (ikke innlogget) får ingenting ──────────────────────────────────
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
select forvent_feil('select * from matvarer', '42501', 'anonym leser matvarer');
select forvent_feil('select * from matlogg', '42501', 'anonym leser dagbok');
select forvent_feil($$insert into matlogg (dato, maltid, navn, basis, mengde, enhet, basis_mengde, kcal_100) values ('2026-10-12','lunsj','X','100g',1,'g',1,1)$$, '42501', 'anonym skriver dagbok');

-- ── A sine data er urørt ───────────────────────────────────────────────────
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', :'A', false);
select forvent((select kcal from matvarer where id = 'aaaaaaaa-0000-4000-8000-000000000001') = 370, 'A sin matvare er urørt');
select forvent((select mengde from matlogg where id = 'aaaaaaaa-0000-4000-8000-000000000002') = 60, 'A sin dagbok er urørt');
select forvent((select count(*) from maltidsmaler) = 1, 'A sin mal er urørt');
select forvent((select overstyrt from ernaeringsmal) = false, 'A sine mål er urørt');
-- A kan endre og slette sine egne
update matlogg set mengde = 80, basis_mengde = 80 where id = 'aaaaaaaa-0000-4000-8000-000000000002';
select forvent((select mengde from matlogg where id = 'aaaaaaaa-0000-4000-8000-000000000002') = 80, 'A endrer egen mengde');
select forvent((select oppdatert > opprettet from matlogg where id = 'aaaaaaaa-0000-4000-8000-000000000002') is not null, 'oppdatert settes');
-- Slettet matvare: dagboken beholdes med øyeblikksbildet
delete from matvarer where id = 'aaaaaaaa-0000-4000-8000-000000000001';
select forvent((select matvare_id is null and navn = 'Havregryn' and kcal_100 = 370 from matlogg where id = 'aaaaaaaa-0000-4000-8000-000000000002'), 'dagbok overlever sletting av matvare');

-- ── Kontosletting fjerner alt (on delete cascade) ──────────────────────────
reset role;
delete from auth.users where id = :'A';
select forvent((select count(*) from matlogg where bruker_id = :'A') = 0, 'dagbok slettes med kontoen');
select forvent((select count(*) from matvarer where bruker_id = :'A') = 0, 'matvarer slettes med kontoen');
select forvent((select count(*) from maltidsmaler where bruker_id = :'A') = 0, 'maler slettes med kontoen');
select forvent((select count(*) from ernaeringsmal where bruker_id = :'A') = 0, 'mål slettes med kontoen');
select forvent((select count(*) from matvarer where bruker_id = :'B') = 1, 'B sine data er urørt');

-- ── Alle fire tabeller har RLS og ingen regel for anon ─────────────────────
select forvent((select bool_and(relrowsecurity) from pg_class where relname in ('matvarer', 'matlogg', 'maltidsmaler', 'ernaeringsmal') and relnamespace = 'public'::regnamespace), 'RLS er på');
select forvent(not exists (select 1 from pg_policies where tablename in ('matvarer', 'matlogg', 'maltidsmaler', 'ernaeringsmal') and 'anon' = any (roles)), 'ingen regler for anon');
select forvent((select count(*) from pg_policies where tablename in ('matvarer', 'matlogg', 'maltidsmaler', 'ernaeringsmal')) = 16, 'fire regler per tabell');

\echo 'Alle RLS- og valideringstester for kosthold besto.'
