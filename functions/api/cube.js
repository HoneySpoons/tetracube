// GET  /api/cube → { entries: [{ initials, created_at }] }, oldest first: the order people did it in.
// POST /api/cube { initials, score, lines, level, durationMs } → 201 { place }
//
// Four TETRAs back to back, one on each face. The run's numbers get the same checks as a score
// (lib/api.js), plus the least a TETRACUBE can take: 16 lines, and four TETRAs plus the bonus at
// level 1 (4 × 800 + 3200). Like the scores, it comes from the browser and can be forged; this keeps
// out the lazy fake, not a determined one.
import { json, goodInitials, runProblem, readJson, ipHash, RATE_WINDOW, RATE_MAX } from '../../lib/api.js';

const MIN_LINES = 16, MIN_SCORE = 4 * 800 + 3200;

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare('SELECT initials, created_at FROM cube_hof ORDER BY id ASC LIMIT 100').all();
  return json({ entries: results }, 200, { 'cache-control': 'no-store' });
}

export async function onRequestHead(ctx) {
  const r = await onRequestGet(ctx);
  return new Response(null, { status: r.status, headers: r.headers });
}

export async function onRequestPost({ request, env }) {
  const [b, err] = await readJson(request);
  if (err) return err;
  const initials = String(b?.initials ?? '').toUpperCase();
  const { score, lines, level, durationMs } = b ?? {};
  if (!goodInitials(initials)) return json({ error: 'initials' }, 400);
  const problem = runProblem({ score, lines, level, durationMs });
  if (problem) return json({ error: problem }, 400);
  if (lines < MIN_LINES || score < MIN_SCORE) return json({ error: 'implausible' }, 400);

  const hash = await ipHash(request, env);
  // One statement, so a burst can't all read the count before any of them inserts.
  const ins = await env.DB
    .prepare(`INSERT INTO cube_hof (initials, score, lines, duration_ms, ip_hash)
              SELECT ?, ?, ?, ?, ?
              WHERE (SELECT COUNT(*) FROM cube_hof WHERE ip_hash = ? AND created_at > datetime('now', ?)) < ?`)
    .bind(initials, score, lines, durationMs, hash, hash, RATE_WINDOW, RATE_MAX).run();
  if (!ins.meta.changes) return json({ error: 'rate' }, 429);
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM cube_hof WHERE id <= ?').bind(ins.meta.last_row_id).first();
  return json({ place: n }, 201);
}
