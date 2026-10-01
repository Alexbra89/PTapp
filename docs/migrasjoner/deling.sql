-- Deling uten å eksponere andres profiler.
--
-- RLS på profiler gir bare tilgang til egen rad (verifisert og testet), så delingssiden
-- kunne ikke vise andre brukere. Å åpne profiler for alle ville eksponert e-post, vekt,
-- høyde og fødselsår. I stedet: to smale funksjoner som bare gir ut id og navn.
--
-- SECURITY DEFINER er nødvendig for å kunne se navnet til andre brukere, men funksjonene
-- returnerer KUN id og navn, og bare for:
--   • deling_oversikt():       personer du deler med eller som deler med deg (ikke alle brukere)
--   • finn_bruker_for_deling(): én bestemt e-postadresse, eksakt treff (ingen søk/listing)
-- Bare innloggede brukere kan kalle dem. RLS-reglene på profiler endres ikke.
--
-- Selve delingen (hvem DU deler med) lagres som før i din egen profil (can_share_with),
-- som du allerede har lov til å endre. Kan kjøres flere ganger.

create or replace function public.deling_oversikt()
returns table (id uuid, navn text, jeg_deler boolean, deler_med_meg boolean)
language sql
stable
security definer
set search_path = public
as $$
  with meg as (
    select coalesce(can_share_with::text[], '{}') as mine from profiler where profiler.id = auth.uid()
  )
  select
    p.id,
    coalesce(nullif(trim(p.navn), ''), 'Uten navn') as navn,
    p.id::text = any (coalesce((select mine from meg), '{}')) as jeg_deler,
    auth.uid()::text = any (coalesce(p.can_share_with::text[], '{}')) as deler_med_meg
  from profiler p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and (
      p.id::text = any (coalesce((select mine from meg), '{}'))
      or auth.uid()::text = any (coalesce(p.can_share_with::text[], '{}'))
    )
  order by 2;
$$;

create or replace function public.finn_bruker_for_deling(p_epost text)
returns table (id uuid, navn text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, coalesce(nullif(trim(p.navn), ''), 'Uten navn')
  from profiler p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and length(trim(coalesce(p_epost, ''))) between 3 and 320
    and lower(p.epost) = lower(trim(p_epost))
  limit 1;
$$;

revoke all on function public.deling_oversikt() from public, anon;
revoke all on function public.finn_bruker_for_deling(text) from public, anon;
grant execute on function public.deling_oversikt() to authenticated;
grant execute on function public.finn_bruker_for_deling(text) to authenticated;

notify pgrst, 'reload schema';
