// GET  /api/scores?mode=focus|live&limit=10  → { mode, scores: [{ initials, score, lines, level, created_at }] }
// POST /api/scores { initials, score, lines, level, mode, durationMs } → 201 { rank }
//
// Scores come from the browser, so they can be forged: see lib/api.js for what the checks do and don't stop.
import { json, goodInitials, runProblem, readJson, ipHash, RATE_WINDOW, RATE_MAX } from '../../lib/api.js';

const MODES = new Set(['focus', 'live']);

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
  const [b, err] = await readJson(request);
  if (err) return err;
  const initials = String(b?.initials ?? '').toUpperCase();
  const { score, lines, level, durationMs, mode } = b ?? {};
  if (!goodInitials(initials)) return json({ error: 'initials' }, 400);
  if (!MODES.has(mode)) return json({ error: 'mode' }, 400);
  const problem = runProblem({ score, lines, level, durationMs });
  if (problem) return json({ error: problem }, 400);

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
