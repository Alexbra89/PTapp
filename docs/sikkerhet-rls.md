# Sikkerhet: tilgangsregler (RLS) i Supabase

Appen snakker direkte med databasen fra nettleseren med den offentlige `anon`-nøkkelen.
Det betyr at **Row Level Security (RLS) er det eneste som hindrer en innlogget bruker i å lese
eller endre andres data**. Innloggingssjekken i `middleware.ts` beskytter bare sidene, ikke dataene.

Denne sjekklisten er skrevet ut fra hvordan koden bruker tabellene. Den er **ikke verifisert mot
databasen** – kjør sjekken under i Supabase (SQL Editor) og sammenlign.

## 1. Sjekk at RLS er slått på

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiler','okter','treningslogger','pr_rekorder',
                    'favoritt_ovelser','treningsprogrammer','bruker_ovelser');
```

Alle skal ha `rowsecurity = true`. Se eksisterende regler med:

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies where schemaname = 'public' order by tablename;
```

## 2. Anbefalte regler

Tabeller der hver rad eies av `bruker_id` – brukeren ser og endrer bare sine egne rader:

```sql
-- Gjenta for: okter, treningslogger, pr_rekorder, favoritt_ovelser,
--             treningsprogrammer, bruker_ovelser
alter table public.okter enable row level security;

create policy "egne rader: les"    on public.okter for select using (auth.uid() = bruker_id);
create policy "egne rader: ny"     on public.okter for insert with check (auth.uid() = bruker_id);
create policy "egne rader: endre"  on public.okter for update using (auth.uid() = bruker_id) with check (auth.uid() = bruker_id);
create policy "egne rader: slett"  on public.okter for delete using (auth.uid() = bruker_id);
```

`profiler` (nøkkel er `id` = brukerens id):

```sql
alter table public.profiler enable row level security;

create policy "egen profil: les"   on public.profiler for select using (auth.uid() = id);
create policy "egen profil: ny"    on public.profiler for insert with check (auth.uid() = id);
create policy "egen profil: endre" on public.profiler for update using (auth.uid() = id) with check (auth.uid() = id);
```

## 3. Delingssiden trenger en bevisst avgjørelse

`/deling` henter `id, navn, epost, can_share_with` for **alle** profiler for å vise listen over
personer man kan dele med. Med regelen over (kun egen profil) blir den listen tom.

Velg ett av disse:

- **Enklest:** la innloggede brukere lese navn på andre, men ikke e-post. Lag et view
  (`profiler_offentlig` med `id, navn, can_share_with`) og bruk det på delingssiden.
- **Strengere:** del bare med personer man legger til via e-post (oppslag på én adresse om gangen),
  slik at ingen kan liste opp alle brukere.

Ønskes det, kan appen oppdateres til et av alternativene – det krever en endring i databasen først.

## 4. Deling av økter

`can_share_with` lagres i profilen, men ingen regel gir i dag andre tilgang til øktene dine.
Hvis delte økter skal kunne leses av mottakeren, trengs en ekstra lese-regel på `okter`, f.eks.:

```sql
create policy "delt med meg: les" on public.okter for select using (
  auth.uid() = bruker_id
  or auth.uid() = any (select unnest(p.can_share_with)::uuid from public.profiler p where p.id = okter.bruker_id)
);
```

(Tilpass typen på `can_share_with` – koden behandler den som en liste med bruker-id-er.)
