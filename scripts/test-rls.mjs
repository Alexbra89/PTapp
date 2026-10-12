// Tester tilgangsregler (RLS) og databasekontroller mot en ekte, midlertidig PostgreSQL.
// Starter en tom database, legger inn en minimal Supabase-etterligning (tests/rls/supabase-stub.sql),
// kjører migrasjonen to ganger (den skal tåle det) og deretter testene i tests/rls/*-rls.sql.
//
// Krever PostgreSQL-programmene (initdb, pg_ctl, psql). Finnes på GitHub Actions (ubuntu-latest).
// Bruk: npm run test:rls     (PG_BIN=/sti/til/bin for en bestemt versjon)
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, chmodSync, existsSync, readdirSync, chownSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function finnBin() {
  if (process.env.PG_BIN) return process.env.PG_BIN
  const base = '/usr/lib/postgresql'
  if (existsSync(base)) {
    const v = readdirSync(base).filter(d => existsSync(path.join(base, d, 'bin', 'initdb'))).sort((a, b) => Number(b) - Number(a))[0]
    if (v) return path.join(base, v, 'bin')
  }
  return '' // fra PATH
}
const bin = finnBin()
const prog = n => (bin ? path.join(bin, n) : n)

// initdb nekter å kjøre som root: bruk postgres-brukeren da (lokale containere)
const somRoot = process.getuid?.() === 0
const kjor = (n, args, opts = {}) => {
  const [cmd, a] = somRoot ? ['runuser', ['-u', 'postgres', '--', prog(n), ...args]] : [prog(n), args]
  return execFileSync(cmd, a, { stdio: opts.stille ? 'pipe' : 'inherit', encoding: 'utf8', env: { ...process.env, PGOPTIONS: '-c client_min_messages=warning' }, ...opts })
}

const dir = mkdtempSync(path.join(tmpdir(), 'rls-'))
chmodSync(dir, 0o777)
if (somRoot) { const pg = spawnSync('id', ['-u', 'postgres'], { encoding: 'utf8' }); chownSync(dir, Number(pg.stdout.trim()), 0) }
const data = path.join(dir, 'data')
const port = String(54000 + Math.floor(Math.random() * 900))
let startet = false

try {
  kjor('initdb', ['-D', data, '-U', 'postgres', '-A', 'trust', '--no-sync'], { stille: true })
  kjor('pg_ctl', ['-D', data, '-o', `-k ${dir} -p ${port} -c listen_addresses=''`, '-w', '-l', path.join(dir, 'log'), 'start'], { stille: true })
  startet = true
  const psql = fil => kjor('psql', ['-h', dir, '-p', port, '-U', 'postgres', '-d', 'postgres', '-q', '-o', '/dev/null', '-v', 'ON_ERROR_STOP=1', '-f', fil])
  psql(path.join(rot, 'tests/rls/supabase-stub.sql'))
  psql(path.join(rot, 'docs/migrasjoner/kosthold.sql'))
  psql(path.join(rot, 'docs/migrasjoner/kosthold.sql')) // kan kjøres flere ganger
  for (const f of readdirSync(path.join(rot, 'tests/rls')).filter(f => f.endsWith('-rls.sql')).sort()) {
    console.log(`▶ ${f}`)
    psql(path.join(rot, 'tests/rls', f))
  }

  // Forhåndskontrollen (F5 + gjennomgang #1): en tabell som ikke ser ut som den migrasjonen lager,
  // skal stoppe migrasjonen før noe endres, og transaksjonen skal rulle tilbake alt.
  const sql = (db, kommando) => kjor('psql', ['-h', dir, '-p', port, '-U', 'postgres', '-d', db, '-q', '-o', '/dev/null', '-v', 'ON_ERROR_STOP=1', '-c', kommando], { stille: true })
  const fil = (db, f) => kjor('psql', ['-h', dir, '-p', port, '-U', 'postgres', '-d', db, '-q', '-o', '/dev/null', '-v', 'ON_ERROR_STOP=1', '-f', f], { stille: true })
  const verdi = (db, kommando) => kjor('psql', ['-h', dir, '-p', port, '-U', 'postgres', '-d', db, '-At', '-c', kommando], { stille: true }).trim()
  const migrasjon = path.join(rot, 'docs/migrasjoner/kosthold.sql')
  // Øyeblikksbilde av alt migrasjonen kunne ha rørt: tabeller, RLS, regler (med uttrykk), rettigheter, triggere
  const tilstand = db => verdi(db, `select concat_ws(' | ',
    (select string_agg(c.relname || ':' || c.relrowsecurity, ',' order by c.relname) from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'),
    (select string_agg(tablename || '/' || policyname || '/' || permissive || '/' || coalesce(qual, '') || '/' || coalesce(with_check, ''), ',' order by tablename, policyname) from pg_policies where schemaname = 'public'),
    (select string_agg(table_name || ':' || grantee || ':' || privilege_type, ',' order by table_name, grantee, privilege_type) from information_schema.role_table_grants where table_schema = 'public'),
    (select string_agg(tgname, ',' order by tgname) from pg_trigger where not tgisinternal))`)
  let nr = 0
  const skalStoppe = (navn, oppsett, melding, ekstra) => {
    console.log(`▶ migrasjon stopper: ${navn}`)
    const db = `kollisjon${++nr}`
    sql('postgres', `create database ${db}`)
    fil(db, path.join(rot, 'tests/rls/supabase-stub.sql'))
    oppsett(db)
    const for_ = tilstand(db)
    let feilet = false, tekst = ''
    try { fil(db, migrasjon) } catch (e) { feilet = true; tekst = String(e.stderr ?? '') }
    if (!feilet) throw new Error(`Migrasjonen skulle stoppet (${navn})`)
    if (!melding.test(tekst)) throw new Error(`Uventet feilmelding (${navn}): ${tekst}`)
    const etter = tilstand(db)
    if (etter !== for_) throw new Error(`Migrasjonen endret noe før den stoppet (${navn}):\nfør:   ${for_}\netter: ${etter}`)
    ekstra?.(db)
    console.log('  stoppet med tydelig feil, ingenting endret (tabeller, RLS, regler, rettigheter og triggere som før)')
  }

  skalStoppe('fremmed tabell med samme navn',
    db => sql(db, "create table public.matlogg (id int primary key, tekst text); insert into public.matlogg values (1, 'eksisterende data')"),
    /matlogg finnes allerede, men har en annen struktur/,
    db => { if (verdi(db, 'select count(*) from public.matlogg') !== '1') throw new Error('Data i den fremmede tabellen ble endret') })

  // Riktige kolonnenavn, men feil typer (f.eks. bruker_id som tekst): RLS-uttrykket auth.uid() = bruker_id
  // ville ikke engang kompilere – eller verre, sammenligne noe annet enn forventet
  skalStoppe('tabell med riktige navn men feil typer', db => {
    fil(db, migrasjon)
    sql(db, 'drop table public.ernaeringsmal')
    sql(db, `create table public.ernaeringsmal (bruker_id text primary key, beregningsgrunnlag text, aktivitetsniva text, retning text, tempo text,
      vedlikehold_kcal text, kcal text, protein text, karbohydrater text, fett text, overstyrt text, opprettet text, oppdatert text)`)
  }, /ernaeringsmal finnes allerede, men har en annen struktur: .*bruker_id \(text, ventet uuid\)/)

  skalStoppe('tabell uten primærnøkkel på id', db => {
    fil(db, migrasjon)
    sql(db, 'alter table public.maltidsmaler drop constraint maltidsmaler_pkey')
  }, /maltidsmaler finnes allerede, men primærnøkkelen er ikke \(id\)/)

  // En permissiv regel som ikke kommer fra migrasjonen ville stått igjen ved siden av de nye og åpnet
  // tabellen for alle innloggede (permissive regler kombineres med «eller»)
  skalStoppe('ekstra permissiv RLS-regel', db => {
    fil(db, migrasjon)
    sql(db, 'create policy "alle kan lese" on public.matvarer for select to authenticated using (true)')
  }, /matvarer har RLS-regler som ikke kommer fra denne migrasjonen: \{"alle kan lese"\}/, db => {
    if (verdi(db, "select count(*) from pg_policies where tablename = 'matvarer' and policyname = 'alle kan lese'") !== '1') throw new Error('Den fremmede regelen ble fjernet')
  })

  // En regel med et av migrasjonens egne navn, men et annet innhold, erstattes (ikke en fremmed regel)
  console.log('▶ migrasjon erstatter endret regel med eget navn')
  sql('postgres', 'create database egen_regel')
  fil('egen_regel', path.join(rot, 'tests/rls/supabase-stub.sql'))
  fil('egen_regel', migrasjon)
  sql('egen_regel', 'drop policy "matlogg: les egne" on public.matlogg; create policy "matlogg: les egne" on public.matlogg for select to authenticated using (true)')
  fil('egen_regel', migrasjon)
  const qual = verdi('egen_regel', "select qual from pg_policies where tablename = 'matlogg' and policyname = 'matlogg: les egne'")
  if (!/auth\.uid\(\)/.test(qual)) throw new Error(`Regelen ble ikke erstattet: ${qual}`)
  console.log('  regelen er tilbake til «bare egne rader»')
} catch (e) {
  console.error(String(e?.stderr || e?.message || e).slice(0, 800))
  console.error('\nRLS-testene feilet.')
  process.exitCode = 1
} finally {
  if (startet) { try { kjor('pg_ctl', ['-D', data, '-m', 'immediate', 'stop'], { stille: true }) } catch {} }
  rmSync(dir, { recursive: true, force: true })
}
