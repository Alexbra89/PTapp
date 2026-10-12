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

const rot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')

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

  // Forhåndskontrollen (F5): en fremmed tabell med samme navn skal stoppe migrasjonen før noe endres,
  // og transaksjonen skal rulle tilbake alt.
  console.log('▶ migrasjon mot database med kolliderende tabell')
  const sql = (db, kommando) => kjor('psql', ['-h', dir, '-p', port, '-U', 'postgres', '-d', db, '-q', '-o', '/dev/null', '-v', 'ON_ERROR_STOP=1', '-c', kommando], { stille: true })
  sql('postgres', 'create database kollisjon')
  kjor('psql', ['-h', dir, '-p', port, '-U', 'postgres', '-d', 'kollisjon', '-q', '-o', '/dev/null', '-v', 'ON_ERROR_STOP=1', '-f', path.join(rot, 'tests/rls/supabase-stub.sql')], { stille: true })
  sql('kollisjon', "create table public.matlogg (id int primary key, tekst text); insert into public.matlogg values (1, 'eksisterende data')")
  let feilet = false, melding = ''
  try {
    kjor('psql', ['-h', dir, '-p', port, '-U', 'postgres', '-d', 'kollisjon', '-q', '-o', '/dev/null', '-v', 'ON_ERROR_STOP=1', '-f', path.join(rot, 'docs/migrasjoner/kosthold.sql')], { stille: true })
  } catch (e) { feilet = true; melding = String(e.stderr ?? '') }
  if (!feilet) throw new Error('Migrasjonen skulle stoppet på den kolliderende tabellen')
  if (!/finnes allerede, men mangler kolonnene/.test(melding)) throw new Error(`Uventet feilmelding: ${melding}`)
  const rest = kjor('psql', ['-h', dir, '-p', port, '-U', 'postgres', '-d', 'kollisjon', '-At', '-c',
    "select coalesce(to_regclass('public.matvarer')::text, '-') || '|' || (select count(*) from public.matlogg) || '|' || (select relrowsecurity from pg_class where oid = 'public.matlogg'::regclass) || '|' || (select count(*) from pg_policies where tablename = 'matlogg')"], { stille: true }).trim()
  if (rest !== '-|1|false|0') throw new Error(`Migrasjonen endret noe før den stoppet: ${rest}`)
  console.log('  stoppet med tydelig feil, ingenting endret (fremmed tabell, data, RLS og regler urørt)')
} catch (e) {
  console.error(String(e?.stderr || e?.message || e).slice(0, 800))
  console.error('\nRLS-testene feilet.')
  process.exitCode = 1
} finally {
  if (startet) { try { kjor('pg_ctl', ['-D', data, '-m', 'immediate', 'stop'], { stille: true }) } catch {} }
  rmSync(dir, { recursive: true, force: true })
}
