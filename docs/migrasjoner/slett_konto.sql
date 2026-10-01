-- «Slett kontoen min»: sletter alle data brukeren eier, fjerner brukeren fra andres
-- delingslister og sletter selve innloggingen – i én transaksjon (alt eller ingenting).
--
-- SECURITY DEFINER fordi en bruker ikke selv kan slette fra auth.users. Funksjonen tar
-- ingen parametre og bruker bare auth.uid(), så den kan aldri slette noen andre.
-- Bare innloggede brukere kan kalle den. Kan kjøres flere ganger.

create or replace function public.slett_min_konto()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bruker uuid := auth.uid();
  t text;
begin
  if v_bruker is null then
    raise exception 'Ikke innlogget' using errcode = '28000';
  end if;

  -- Alle tabeller der brukeren eier rader (bruker_id). Hoppes over hvis tabellen ikke finnes.
  foreach t in array array['vektlogg','treningslogger','pr_rekorder','favoritt_ovelser',
                           'treningsprogrammer','bruker_ovelser','ukeplaner','okter'] loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from public.%I where bruker_id = $1', t) using v_bruker;
    end if;
  end loop;

  -- Fjern brukeren fra andres delingslister (virker for både uuid[] og text[])
  update public.profiler
     set can_share_with = (select coalesce(array_agg(x), can_share_with[0:0])
                           from unnest(can_share_with) as x where x::text <> v_bruker::text)
   where v_bruker::text = any (coalesce(can_share_with::text[], '{}'));

  delete from public.profiler where id = v_bruker;

  -- Til slutt selve innloggingen (identiteter og økter slettes av Supabase via fremmednøkler)
  delete from auth.users where id = v_bruker;
end;
$$;

revoke all on function public.slett_min_konto() from public, anon;
grant execute on function public.slett_min_konto() to authenticated;

notify pgrst, 'reload schema';
