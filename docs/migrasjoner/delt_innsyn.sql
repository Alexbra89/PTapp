-- Delt innsyn: personer du deler med kan SE dine økter, treningslogger og rekorder.
--
-- • Bare lesing. Endre/slette er fortsatt kun eieren (eksisterende regler er urørt).
-- • Du bestemmer selv: tilgang gis og fjernes med bryteren på delingssiden (can_share_with
--   i din egen profil – ingen andre kan endre den). Fjernes du, forsvinner tilgangen med en gang.
-- • Vekt (vektlogg) og profil (vekt, høyde, fødselsår, e-post) deles IKKE.
--
-- Hjelpefunksjonen må være SECURITY DEFINER fordi regelen må lese eierens can_share_with,
-- og profiler er bare lesbar for eieren selv. Den svarer bare ja/nei på «deler denne
-- personen med meg?» og gir ikke ut noe annet. Kan kjøres flere ganger.

create or replace function public.deler_med_meg(p_eier uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiler
    where id = p_eier
      and auth.uid() is not null
      and auth.uid()::text = any (coalesce(can_share_with::text[], '{}'))
  );
$$;

revoke all on function public.deler_med_meg(uuid) from public, anon;
grant execute on function public.deler_med_meg(uuid) to authenticated;

drop policy if exists "delt med meg: les" on public.okter;
drop policy if exists "delt med meg: les" on public.treningslogger;
drop policy if exists "delt med meg: les" on public.pr_rekorder;

create policy "delt med meg: les" on public.okter
  for select to authenticated using (public.deler_med_meg(bruker_id));
create policy "delt med meg: les" on public.treningslogger
  for select to authenticated using (public.deler_med_meg(bruker_id));
create policy "delt med meg: les" on public.pr_rekorder
  for select to authenticated using (public.deler_med_meg(bruker_id));
