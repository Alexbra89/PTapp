-- Fullfør økt i én transaksjon, uten duplikater.
--
-- Før: økta, settene og rekordene ble lagret i 3–5 separate kall. Feilet ett av dem,
-- var økta likevel markert som fullført og settene tapt. Samme økt fullført i to faner
-- (eller et nytt forsøk etter tidsavbrudd) ga dobbelt opp av alt.
--
-- Nå: én funksjon som lagrer alt eller ingenting. Hver økt har en nøkkel; kommer samme
-- nøkkel igjen, returneres den allerede lagrede økta uten å lagre noe på nytt.
--
-- Sikkerhet: SECURITY INVOKER – funksjonen kjører med brukerens egne rettigheter, så alle
-- eksisterende RLS-regler gjelder. Eier settes alltid fra innloggingen (auth.uid()),
-- aldri fra data klienten sender.
--
-- Kan kjøres flere ganger. Endrer ingen eksisterende regler eller data.

alter table public.okter add column if not exists fullfort_nokkel uuid;

create unique index if not exists okter_bruker_fullfort_nokkel_key
  on public.okter (bruker_id, fullfort_nokkel);

create or replace function public.fullfor_okt(
  p_nokkel   uuid,    -- unik per økt (lages i appen og følger utkastet)
  p_okt_id   uuid,    -- eksisterende rad (fra kalenderen/utkast) eller null
  p_okt      jsonb,   -- { dato, tittel, type, varighet_min, ovelser }
  p_logger   jsonb,   -- [{ ovelse_navn, muskelgruppe, sett }]
  p_rekorder jsonb    -- [{ ovelse_id, kg, reps }]
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_bruker uuid := auth.uid();
  v_id     uuid;
  v_dato   date;
begin
  if v_bruker is null then
    raise exception 'Ikke innlogget' using errcode = '28000';
  end if;
  if p_nokkel is null then
    raise exception 'Mangler nøkkel' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_logger, '[]')) <> 'array' or jsonb_array_length(coalesce(p_logger, '[]')) > 60
     or jsonb_typeof(coalesce(p_rekorder, '[]')) <> 'array' or jsonb_array_length(coalesce(p_rekorder, '[]')) > 60 then
    raise exception 'Ugyldige data' using errcode = '22023';
  end if;

  -- Samme økt sendt samtidig fra to faner: den andre venter til den første er ferdig
  perform pg_advisory_xact_lock(hashtextextended(v_bruker::text || p_nokkel::text, 0));

  -- Allerede lagret med denne nøkkelen → ferdig (nytt forsøk, to faner, dobbelttrykk)
  select id into v_id from okter where bruker_id = v_bruker and fullfort_nokkel = p_nokkel;
  if found then
    return v_id;
  end if;

  v_dato := coalesce(nullif(p_okt ->> 'dato', '')::date, current_date);

  if p_okt_id is not null then
    -- Eksisterende økt som allerede er fullført (med en annen nøkkel) skal ikke logges på nytt
    select id into v_id from okter
      where id = p_okt_id and bruker_id = v_bruker and fullfort_nokkel is not null;
    if found then
      return v_id;
    end if;

    update okter set
      dato            = v_dato,
      tittel          = left(p_okt ->> 'tittel', 200),
      type            = coalesce(p_okt ->> 'type', type),
      varighet_min    = least(greatest(coalesce((p_okt ->> 'varighet_min')::int, 1), 1), 1440),
      ovelser         = coalesce(p_okt -> 'ovelser', ovelser),
      fullfort        = true,
      fullfort_nokkel = p_nokkel
    where id = p_okt_id and bruker_id = v_bruker
    returning id into v_id;
  end if;

  if v_id is null then
    insert into okter (bruker_id, dato, tittel, type, varighet_min, ovelser, fullfort, fullfort_nokkel)
    values (
      v_bruker, v_dato, left(p_okt ->> 'tittel', 200), coalesce(p_okt ->> 'type', 'styrke'),
      least(greatest(coalesce((p_okt ->> 'varighet_min')::int, 1), 1), 1440),
      coalesce(p_okt -> 'ovelser', '[]'::jsonb), true, p_nokkel
    )
    returning id into v_id;
  end if;

  insert into treningslogger (bruker_id, dato, ovelse_navn, muskelgruppe, sett)
  select v_bruker, v_dato, left(l ->> 'ovelse_navn', 200), left(l ->> 'muskelgruppe', 200), coalesce(l -> 'sett', '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_logger, '[]')) as l
  where coalesce(l ->> 'ovelse_navn', '') <> '';

  -- Rekorder: bare høyere vekt overskriver (pr_rekorder har unik (bruker_id, ovelse_id))
  insert into pr_rekorder (bruker_id, ovelse_id, kg, reps, dato)
  select v_bruker, r ->> 'ovelse_id', (r ->> 'kg')::numeric, coalesce((r ->> 'reps')::int, 1), v_dato
  from jsonb_array_elements(coalesce(p_rekorder, '[]')) as r
  where coalesce(r ->> 'ovelse_id', '') <> '' and (r ->> 'kg')::numeric > 0
  on conflict (bruker_id, ovelse_id) do update
    set kg = excluded.kg, reps = excluded.reps, dato = excluded.dato
    where excluded.kg > pr_rekorder.kg;

  return v_id;
end;
$$;

revoke all on function public.fullfor_okt(uuid, uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.fullfor_okt(uuid, uuid, jsonb, jsonb, jsonb) to authenticated;

-- Be PostgREST lese inn den nye funksjonen med en gang
notify pgrst, 'reload schema';
