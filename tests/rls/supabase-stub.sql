-- Minimal etterligning av det Supabase har som migrasjonene forutsetter:
-- rollene anon/authenticated, auth.users og auth.uid() som leser JWT-claimet «sub».
-- Brukes bare av scripts/test-rls.mjs mot en midlertidig, lokal PostgreSQL.
-- Roller gjelder hele klyngen; testskriptet bruker flere databaser i samme klynge
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

create schema auth;
create table auth.users (id uuid primary key, email text);

create function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;

grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
-- Supabase gir anon og authenticated alle rettigheter på nye tabeller som standard; RLS styrer resten
alter default privileges in schema public grant all on tables to anon, authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'a@test.no'),
  ('00000000-0000-4000-8000-00000000000b', 'b@test.no');
