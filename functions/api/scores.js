// GET  /api/scores?mode=focus|live&limit=10  → { mode, scores: [{ initials, score, lines, level, created_at }] }
// POST /api/scores { initials, score, lines, level, mode, durationMs } → 201 { rank }
//
// Scores come from the browser, so they can be forged. These checks stop casual
// forgery (a 999999 with no lines, a flood from one address), not a determined
// cheater; the real fix is server-side replay of a seeded run.

const MODES = new Set(['focus', 'live']);
// Checked after folding look-alike digits (A55 → ASS, N1G → NIG). A three-letter
// filter can't be complete; the README has the one-line delete for anything that slips.
const BLOCKED = new Set([
  'ASS', 'FUK', 'FUC', 'FCK', 'FKU', 'FVK', 'FUQ', 'CUM', 'DIK', 'DIC', 'DCK', 'COK', 'KKK', 'NIG', 'NGR',
  'NGA', 'FAG', 'FGT', 'TIT', 'NAZ', 'CNT', 'CUN', 'KYS', 'HOE', 'SHT', 'JIZ', 'SEX', 'VAG', 'PUS',
  'GAY', 'JEW', 'FAP', 'RAP', 'ANL', 'WTF', 'PIS', 'TWT',
]);
const FOLD = { 0: 'O', 1: 'I', 3: 'E', 4: 'A', 5: 'S', 6: 'G', 7: 'T', 8: 'B', 9: 'G' };
const blocked = s => BLOCKED.has(s) || BLOCKED.has(s.replace(/[0-9]/g, d => FOLD[d] ?? d)) || BLOCKED.has(s.replace(/V/g, 'U'));
const RATE_WINDOW = '-10 minutes', RATE_MAX = 10;

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

// The most a run could plausibly score: every row cleared in a big batch, at its
// level, through a generous cascade multiplier, plus hard-drop points over time.
const maxScore = (lines, level, durationMs) => lines * 400 * level * 8 + Math.ceil(durationMs / 1000) * 400;
// Nobody clears more than two rows a second, cascades included.
const linesPossible = (lines, durationMs) => lines * 500 <= durationMs;

async function ipHash(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  const local = ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname);
  if (!env.IP_SALT && !local) throw new Error('IP_SALT is not set');   // never ship a guessable hash
  const data = new TextEncoder().encode(`${env.IP_SALT ?? 'dev-salt'}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');
  if (!MODES.has(mode)) return json({ error: 'mode' }, 400);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 10));
  const { results } = await env.DB
    .prepare('SELECT initials, score, lines, level, created_at FROM scores WHERE mode = ? ORDER BY score DESC, created_at ASC LIMIT ?')
    .bind(mode, limit).all();
  return json({ mode, scores: results }, 200, { 'cache-control': 'no-store' });
}

// HEAD answers like GET (uptime checkers use it), headers only
export async function onRequestHead(ctx) {
  const r = await onRequestGet(ctx);
  return new Response(null, { status: r.status, headers: r.headers });
}

export async function onRequestPost({ request, env }) {
  // JSON only: an HTML form can't send it without a CORS preflight, so other sites can't post for their visitors
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json')) return json({ error: 'json' }, 415);
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'origin' }, 403);
  if (+(request.headers.get('content-length') ?? 0) > 1024) return json({ error: 'size' }, 413);
  let b;
  try {
    const text = await request.text();
    if (text.length > 1024) return json({ error: 'size' }, 413);
    b = JSON.parse(text);
  } catch { return json({ error: 'json' }, 400); }

  const initials = String(b?.initials ?? '').toUpperCase();
  const { score, lines, level, durationMs, mode } = b ?? {};
  if (!/^[A-Z0-9]{3}$/.test(initials) || blocked(initials)) return json({ error: 'initials' }, 400);
  if (!MODES.has(mode)) return json({ error: 'mode' }, 400);
  if (!isInt(score, 1, 50_000_000) || !isInt(lines, 0, 100_000) || !isInt(durationMs, 1_000, 86_400_000))
    return json({ error: 'range' }, 400);
  if (level !== 1 + Math.floor(lines / 10)) return json({ error: 'level' }, 400);
  if (score > maxScore(lines, level, durationMs) || !linesPossible(lines, durationMs)) return json({ error: 'implausible' }, 400);

  const hash = await ipHash(request, env);
  // One statement, so a burst can't all read the count before any of them inserts.
  const ins = await env.DB
    .prepare(`INSERT INTO scores (initials, score, lines, level, mode, duration_ms, ip_hash)
              SELECT ?, ?, ?, ?, ?, ?, ?
              WHERE (SELECT COUNT(*) FROM scores WHERE ip_hash = ? AND created_at > datetime('now', ?)) < ?`)
    .bind(initials, score, lines, level, mode, durationMs, hash, hash, RATE_WINDOW, RATE_MAX).run();
  if (!ins.meta.changes) return json({ error: 'rate' }, 429);
  const above = await env.DB
    .prepare('SELECT COUNT(*) AS n FROM scores WHERE mode = ? AND score > ?')
    .bind(mode, score).first();
  return json({ rank: above.n + 1 }, 201);
}
