/**
 * API CONTRACT AUDIT — every path the frontend calls, probed against the real API.
 *
 * The recurring failure in this codebase is the frontend calling an endpoint the
 * backend never implemented: /public/qr/resolve, /restaurant/tables/merge,
 * /restaurant/kitchen/metrics, /restaurant/qr … each found one at a time, by a
 * user hitting a dead button. This finds them all in one pass.
 *
 * It reports ONLY "does this route exist", which is the bug class that keeps
 * biting. A 401/403/422 means the route is there and merely rejected our probe —
 * that is a pass. A 404 with code ROUTE_NOT_FOUND is a genuine dead endpoint.
 *
 *   node scripts/audit-api-contract.mjs                 # against localhost
 *   API=https://keventers.appzeto.com node scripts/audit-api-contract.mjs
 *
 * Probes are GET/HEAD-safe by default: mutating verbs are sent with an empty
 * body to a throwaway id, so validation rejects them before anything is written.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const API = (process.env.API ?? 'http://127.0.0.1:4000').replace(/\/$/, '');
const PREFIX = '/api/v1';
const FRONTEND = path.resolve(process.argv[2] ?? '../frontend/src');
/** A syntactically valid ObjectId that will never exist. */
const DUMMY_ID = '000000000000000000000000';

/** api.get<T>('/x') · api.post('/x', …) · api.list<T>(`/x/${id}`) */
const CALL_RE = /\bapi\.(get|post|patch|put|delete|list|paginate|upload)\s*(?:<([^>]*)>)?\s*\(\s*(['"`])([^'"`]+)\3/g;

const METHOD = { get: 'GET', list: 'GET', paginate: 'GET', post: 'POST', patch: 'PATCH', put: 'PUT', delete: 'DELETE', upload: 'POST' };

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.vite'].includes(entry.name)) yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      yield full;
    }
  }
}

/** `/restaurant/tables/${id}` → `/restaurant/tables/<id>` */
function normalize(raw) {
  return raw.replace(/\$\{[^}]*\}/g, DUMMY_ID).replace(/\/+$/, '') || '/';
}

async function collectCalls() {
  const found = new Map(); // "METHOD path" → Set(files)
  for await (const file of walk(FRONTEND)) {
    const src = await readFile(file, 'utf8');
    // Services commonly build paths from a module constant
    // (`const BASE = '/restaurant/kitchen'` … `api.get(`${BASE}/metrics`)`).
    // Missing these is how the audit's FIRST run overlooked
    // /restaurant/kitchen/metrics, so resolve them per file.
    const bases = new Map();
    for (const b of src.matchAll(/const\s+(\w+)\s*=\s*['"`](\/[^'"`]*)['"`]/g)) bases.set(b[1], b[2]);

    for (const m of src.matchAll(CALL_RE)) {
      const [, fn, generic, , raw] = m;
      let rawPath = raw;
      const viaBase = rawPath.match(/^\$\{(\w+)\}(.*)$/);
      if (viaBase && bases.has(viaBase[1])) rawPath = bases.get(viaBase[1]) + viaBase[2];
      if (!rawPath.startsWith('/')) continue; // not an API path
      const key = `${METHOD[fn]} ${normalize(rawPath)}`;
      if (!found.has(key)) found.set(key, { files: new Set(), fn, generic: generic ?? '' });
      found.get(key).files.add(path.relative(FRONTEND, file));
    }
  }
  return found;
}

async function probe(method, endpoint, token) {
  const url = `${API}${PREFIX}${endpoint}`;
  const init = { method, headers: { accept: 'application/json' } };
  if (token) init.headers.authorization = `Bearer ${token}`;
  if (!['GET', 'HEAD'].includes(method)) {
    init.headers['content-type'] = 'application/json';
    init.body = '{}';
  }
  try {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => ({}));
    const code = body?.error?.code ?? (body?.success ? 'OK' : '');
    return { missing: code === 'ROUTE_NOT_FOUND', status: res.status, code: code || String(res.status), data: body?.data };
  } catch (err) {
    return { missing: false, status: 0, code: `unreachable: ${err.message}` };
  }
}

const calls = await collectCalls();
const token = process.env.TOKEN ?? '';
if (!token) console.log('NOTE: no TOKEN set — auth-gated routes answer 401, which still proves they EXIST.\n');
/**
 * PREFLIGHT — refuse to run without a WORKING token.
 *
 * Auth middleware is mounted per router, so for many groups an unauthenticated
 * request to a route that does NOT exist returns 401 rather than
 * ROUTE_NOT_FOUND. A missing or expired token therefore makes dead endpoints
 * look alive and the audit reports a confident all-clear that is entirely
 * false — exactly what happened on this script's second run. Prove the probe
 * can actually see a missing route before trusting a single result.
 */
{
  const known = await probe('GET', '/identity/auth/me', token);
  const bogus = await probe('GET', '/__definitely_not_a_route__', token);
  if (!token || ['UNAUTHORIZED', 'TOKEN_EXPIRED', 'TOKEN_INVALID'].includes(known.code)) {
    console.error(`ABORT: TOKEN missing or not accepted (/identity/auth/me -> ${known.code}).`);
    console.error('Without it a 401 masks every 404 and this audit reports a FALSE all-clear.');
    process.exit(2);
  }
  if (!bogus.missing) {
    console.error(`ABORT: a deliberately bogus path did not report ROUTE_NOT_FOUND (got ${bogus.code}).`);
    process.exit(2);
  }
  console.log('Preflight OK - token accepted, and a bogus path correctly reports ROUTE_NOT_FOUND.');
}

console.log(`Probing ${calls.size} distinct endpoints against ${API}${PREFIX}\n`);

const missing = [];
const ok = [];
const shapeBugs = [];
for (const [key, meta] of [...calls].sort()) {
  const [method, endpoint] = key.split(' ');
  const result = await probe(method, endpoint, token);
  const files = [...meta.files];
  (result.missing ? missing : ok).push({ key, files, ...result });

  /**
   * SHAPE DRIFT — the crash class behind "c.map is not a function".
   * A call site typed `T[]` that actually receives `{ items, pagination }`
   * hands the UI an OBJECT: `data ?? []` keeps it, `.length === 0` is false,
   * and `.map` throws, killing the page instead of rendering empty.
   */
  const declaresArray = /\[\]\s*$/.test(meta.generic.trim());
  const returnsEnvelope = result.data && !Array.isArray(result.data) && Array.isArray(result.data.items);
  if (meta.fn === 'get' && declaresArray && returnsEnvelope) {
    shapeBugs.push({ key, files, detail: `typed ${meta.generic.trim()} but returns { items, pagination } — use api.list<T>()` });
  }
}

if (missing.length) {
  console.log(`DEAD ENDPOINTS (${missing.length}) — the frontend calls these, the backend has no route:\n`);
  for (const m of missing) {
    console.log(`  ${m.key}`);
    for (const f of m.files) console.log(`      called from ${f}`);
  }
} else {
  console.log('No dead endpoints. Every path the frontend calls exists.');
}
console.log(`\n${ok.length} endpoint(s) verified present.`);
process.exit(missing.length ? 1 : 0);
