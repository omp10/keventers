/**
 * CLIENT ROUTE AUDIT — every internal path the app sends users to, checked
 * against the routes it actually registers.
 *
 * This is the class that made /admin show "Page not found": three separate
 * places redirected to /403, and no <Route path="/403"> existed, so the guard
 * dropped people on the 404 catch-all. The app told a customer the admin area
 * did not exist, when it does and they simply could not see it.
 *
 * Nothing catches this — TypeScript is happy with any string, and the catch-all
 * route means it never errors. It just silently lies to the user.
 *
 *   node scripts/audit-client-routes.mjs [frontendSrcDir]
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const FRONTEND = path.resolve(process.argv[2] ?? '../frontend/src');

/** navigate('/x') · <Navigate to="/x"> · redirectTo="/x" · forbiddenTo="/x" */
const TARGET_RE = /(?:navigate\(|\bto=|redirectTo=|forbiddenTo=|href=)\s*["'`](\/[a-zA-Z0-9\-_/]*)["'`]/g;
/** <Route path="/x"> and route-config objects: { path: '/x' } */
const ROUTE_RE = /(?:<Route[^>]*\bpath=|(?:^|[\s{,])path:\s*)["'`](\/?[a-zA-Z0-9\-_/:*]*)["'`]/g;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', 'dist', '.vite'].includes(e.name)) yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) yield full;
  }
}

/** `/r/:slug/menu` → a matcher that accepts `/r/anything/menu`. */
function toMatcher(routePath) {
  if (routePath === '*' || routePath.endsWith('/*')) return null; // catch-all proves nothing
  const rx = routePath
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:[a-zA-Z0-9_]+/g, '[^/]+');
  return new RegExp(`^${rx}$`);
}

const targets = new Map(); // path → Set(files)
const routes = new Set();

for await (const file of walk(FRONTEND)) {
  const src = await readFile(file, 'utf8');
  const rel = path.relative(FRONTEND, file);
  for (const m of src.matchAll(ROUTE_RE)) if (m[1]) routes.add(m[1].startsWith('/') ? m[1] : `/${m[1]}`);
  for (const m of src.matchAll(TARGET_RE)) {
    const p = m[1];
    // Ignore bare "/" and anything with a runtime-built segment.
    if (!p || p === '/') continue;
    if (!targets.has(p)) targets.set(p, new Set());
    targets.get(p).add(rel);
  }
}

const matchers = [...routes].map(toMatcher).filter(Boolean);
const unrouted = [];
for (const [p, files] of [...targets].sort()) {
  if (!matchers.some((rx) => rx.test(p))) unrouted.push({ path: p, files: [...files] });
}

console.log(`Checked ${targets.size} navigation target(s) against ${routes.size} registered route(s)\n`);
if (unrouted.length) {
  console.log(`UNROUTED TARGETS (${unrouted.length}) — the app sends users here, no route renders it:\n`);
  for (const u of unrouted) {
    console.log(`  ${u.path}`);
    for (const f of u.files) console.log(`      from ${f}`);
  }
  console.log('\n(Each of these silently renders the 404 catch-all instead.)');
} else {
  console.log('Every navigation target has a matching route.');
}
process.exit(unrouted.length ? 1 : 0);
