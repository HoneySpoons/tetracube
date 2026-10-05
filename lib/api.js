// Shared by functions/api/*.js: responses, the request guards, the initials filter, plausibility, the address hash.
// Runs from the browser, so everything a client sends can be forged. These checks stop casual forgery
// (a 999999 with no lines, a flood from one address), not a determined cheater; the real fix is
// server-side replay of a seeded run.

// Checked after folding look-alike digits (A55 → ASS, N1G → NIG). A three-letter
// filter can't be complete; the README has the one-line delete for anything that slips.
const BLOCKED = new Set([
  'ASS', 'FUK', 'FUC', 'FCK', 'FKU', 'FVK', 'FUQ', 'CUM', 'DIK', 'DIC', 'DCK', 'COK', 'KKK', 'NIG', 'NGR',
  'NGA', 'FAG', 'FGT', 'TIT', 'NAZ', 'CNT', 'CUN', 'KYS', 'HOE', 'SHT', 'JIZ', 'SEX', 'VAG', 'PUS',
  'GAY', 'JEW', 'FAP', 'RAP', 'ANL', 'WTF', 'PIS', 'TWT',
]);
const FOLD = { 0: 'O', 1: 'I', 3: 'E', 4: 'A', 5: 'S', 6: 'G', 7: 'T', 8: 'B', 9: 'G' };
const blocked = s => BLOCKED.has(s) || BLOCKED.has(s.replace(/[0-9]/g, d => FOLD[d] ?? d)) || BLOCKED.has(s.replace(/V/g, 'U'));
export const goodInitials = s => /^[A-Z0-9]{3}$/.test(s) && !blocked(s);

// The TETRACUBE hall of fame takes a name: 1–10 of [A-Z0-9 ], uppercased, single-spaced, trimmed. Ten characters
// can spell anything, so the list is longer than the initials one and is checked after folding look-alike digits:
// the words below anywhere in the name with the spaces removed (F U C K), and the short ones (the initials set plus
// a few) only as a whole word, so CASSIE, ESSEX and HANCOCK pass and ASS MAN does not. It is a filter for the
// obvious, not a judge; anything that slips has the README's one-liner and DELETE /api/cube/:id.
const NAME_SUBSTR = [
  'FUCK', 'SHIT', 'CUNT', 'NIGG', 'NIGR', 'NEGRO', 'FAGG', 'FAGOT', 'WHORE', 'BITCH', 'RAPIST', 'WETBACK', 'TRANNY', 'RETARD',
  'HITLER', 'PEDO', 'PENIS', 'VAGIN', 'SEMEN', 'JIZZ', 'PORN', 'MOLEST', 'SLUT', 'PUSSY', 'TWAT', 'WANK', 'DILDO', 'CHINK',
  'GOOK', 'RAGHEAD', 'TOWELHEAD', 'BEANER', 'KILLYOU', 'SUICIDE',
];
const NAME_WORDS = new Set([...BLOCKED, 'COCK', 'DICK', 'ANAL', 'ANUS', 'NAZI', 'SPIC', 'KIKE', 'DYKE', 'TITS', 'BOOB', 'BOOBS',
  'RAPE', 'DAGO', 'PAKI', 'HOMO', 'TARD', 'COON', 'KYS']);
export const cleanName = s => String(s ?? '').toUpperCase().replace(/\s+/g, ' ').trim();
const foldDigits = s => s.replace(/[0-9]/g, d => FOLD[d] ?? d);
// null when the name is fine; otherwise 'initials', the error the client already knows how to show
export function nameProblem(raw) {
  const name = cleanName(raw);
  if (!/^[A-Z0-9 ]{1,10}$/.test(name)) return 'initials';
  for (const v of [foldDigits(name), foldDigits(name).replace(/V/g, 'U')]) {
    const flat = v.replace(/ /g, '');
    if (NAME_SUBSTR.some(w => flat.includes(w))) return 'initials';
    if (NAME_WORDS.has(flat) || v.split(' ').some(t => NAME_WORDS.has(t))) return 'initials';
  }
  return null;
}

// Per address, per table: at most RATE_MAX rows in RATE_WINDOW, enforced inside the INSERT itself.
export const RATE_WINDOW = '-10 minutes', RATE_MAX = 10;

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

export const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

// The most a run could plausibly score: every row cleared in a big batch, at its
// level, through a generous cascade multiplier, plus hard-drop points over time.
export const maxScore = (lines, level, durationMs) => lines * 400 * level * 8 + Math.ceil(durationMs / 1000) * 400;
// Nobody clears more than two rows a second, cascades included.
export const linesPossible = (lines, durationMs) => lines * 500 <= durationMs;

// The run's numbers, as both POSTs send them: a reason string if they don't hold together, else null.
export function runProblem({ score, lines, level, durationMs }) {
  if (!isInt(score, 1, 50_000_000) || !isInt(lines, 0, 100_000) || !isInt(durationMs, 1_000, 86_400_000)) return 'range';
  if (level !== 1 + Math.floor(lines / 10)) return 'level';
  if (score > maxScore(lines, level, durationMs) || !linesPossible(lines, durationMs)) return 'implausible';
  return null;
}

// JSON only: an HTML form can't send it without a CORS preflight, so other sites can't post for
// their visitors. Returns [body, null] or [null, errorResponse].
export async function readJson(request) {
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json')) return [null, json({ error: 'json' }, 415)];
  if (request.headers.get('sec-fetch-site') === 'cross-site') return [null, json({ error: 'origin' }, 403)];
  if (+(request.headers.get('content-length') ?? 0) > 1024) return [null, json({ error: 'size' }, 413)];
  try {
    const text = await request.text();
    if (text.length > 1024) return [null, json({ error: 'size' }, 413)];
    return [JSON.parse(text), null];
  } catch { return [null, json({ error: 'json' }, 400)]; }
}

export async function ipHash(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  const local = ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname);
  if (!env.IP_SALT && !local) throw new Error('IP_SALT is not set');   // never ship a guessable hash
  const data = new TextEncoder().encode(`${env.IP_SALT ?? 'dev-salt'}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}
