// Runs before `npm run deploy` (npm's pre-script hook). A deploy publishes the working tree, so it
// must be exactly a commit that is already on origin: no uncommitted or untracked files, and HEAD
// pushed. On 2026-10-03 a deploy shipped a half-edited tree; this is the guard.
// (`npx wrangler pages deploy` directly skips it, deliberately: that is the hand-on-the-lever path.)
import { execSync } from 'node:child_process';
const git = cmd => execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();
const stop = why => { console.error(`\n✘ deploy refused: ${why}\n`); process.exit(1); };

const dirty = git('status --porcelain');
if (dirty) stop(`the working tree has changes that aren't committed:\n${dirty}`);
try { git('fetch --quiet origin'); } catch { stop("couldn't reach origin to check that HEAD is pushed"); }
const head = git('rev-parse --short HEAD');
if (!git('branch -r --contains HEAD')) stop(`HEAD ${head} isn't on origin yet: push it first`);
console.log(`✔ deploying ${head}: clean tree, on origin`);
