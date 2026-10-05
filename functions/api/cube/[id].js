// DELETE /api/cube/:id → { voided: 1 }: voids one hall-of-fame row. Admin only, behind the ADMIN_TOKEN Pages secret
// (`wrangler pages secret put ADMIN_TOKEN --project-name tetracube`; locally, a line in .dev.vars):
//   curl -X DELETE https://tetracube.fun/api/cube/7 -H "Authorization: Bearer $ADMIN_TOKEN"
// With no secret set the route answers 404 like any unknown path; a wrong or missing token is 401.
import { json } from '../../../lib/api.js';

const same = (a, b) => {                       // constant-time for equal lengths; the length leaks, the token doesn't
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

export async function onRequestDelete({ request, env, params }) {
  if (!env.ADMIN_TOKEN) return json({ error: 'not found' }, 404);
  const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!given || !same(given, env.ADMIN_TOKEN)) return json({ error: 'auth' }, 401, { 'www-authenticate': 'Bearer' });
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return json({ error: 'id' }, 400);
  const r = await env.DB.prepare('DELETE FROM cube_hof WHERE id = ?').bind(id).run();
  return json({ voided: r.meta.changes }, r.meta.changes ? 200 : 404);
}
export const onRequestGet = () => json({ error: 'method' }, 405, { allow: 'DELETE' });
export const onRequestPost = onRequestGet;
