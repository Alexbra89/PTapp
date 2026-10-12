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
} catch (e) {
  console.error('\nRLS-testene feilet.')
  process.exitCode = 1
} finally {
  if (startet) { try { kjor('pg_ctl', ['-D', data, '-m', 'immediate', 'stop'], { stille: true }) } catch {} }
  rmSync(dir, { recursive: true, force: true })
}
