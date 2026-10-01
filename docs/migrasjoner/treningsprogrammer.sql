-- Tilgangsregler for treningsprogrammer.
-- Tabellen hadde RLS påslått men ingen regler, så all tilgang ble nektet
-- og «Lagre som program» feilet alltid. Gir hver bruker tilgang til sine egne rader –
-- samme mønster som de andre tabellene. Endrer ingen eksisterende regler.
-- Kan kjøres flere ganger.

drop policy if exists "treningsprogrammer: les egne"   on public.treningsprogrammer;
drop policy if exists "treningsprogrammer: ny"         on public.treningsprogrammer;
drop policy if exists "treningsprogrammer: endre egne" on public.treningsprogrammer;
drop policy if exists "treningsprogrammer: slett egne" on public.treningsprogrammer;

create policy "treningsprogrammer: les egne"   on public.treningsprogrammer for select using (auth.uid() = bruker_id);
create policy "treningsprogrammer: ny"         on public.treningsprogrammer for insert with check (auth.uid() = bruker_id);
create policy "treningsprogrammer: endre egne" on public.treningsprogrammer for update using (auth.uid() = bruker_id) with check (auth.uid() = bruker_id);
create policy "treningsprogrammer: slett egne" on public.treningsprogrammer for delete using (auth.uid() = bruker_id);
