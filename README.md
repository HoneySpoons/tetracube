# Tetracube

Play it at **[tetracube.fun](https://tetracube.fun)** · high scores at [tetracube.fun/scores](https://tetracube.fun/scores)

A falling-block puzzle wrapped around one isometric cube: four boards, one per face. Each face's edge column is its
neighbour's edge column, so a clear on one face drops the shared corners and can complete
rows on the faces beside it: cascades.

## How to play

| | keyboard | touch |
|---|---|---|
| pick a face | A S D F | tap a board in the map at the bottom |
| move | ← → | swipe |
| rotate | ↑ or X (Z rotates back) | tap (swipe up rotates back) |
| soft / hard drop | ↓ / space | drag down / flick down |
| live mode | L, before your first piece lands | LIVE button |
| pause, controls | Esc | II |
| menus | ↑ ↓ pick, Enter presses, Esc goes back | tap |
| sound | M mutes everything; AUDIO in the pause menu sets SFX and music | AUDIO in the pause menu |

In **focus** mode only the face you're on falls. In **live** mode all four fall, the ones you aren't watching at half speed, and your score goes on the separate Live board.

## What's in here

- `public/index.html`: the game (Three.js, synthesised sound and music, keyboard + touch)
- `public/scores.html`: the live leaderboard (`/scores`)
- `functions/api/scores.js`: `GET`/`POST /api/scores` (Cloudflare Pages Function)
- `lib/api.js`: the request guards the API functions share (JSON only, same-site, size cap, initials filter, plausibility, rate-limit hash)
- `schema.sql`: the D1 tables; `migrations/`: changes to run once on production

## Run locally

    npm install
    npm run db:local      # once: create the local D1 table
    npm run dev           # http://127.0.0.1:8788

## Deploy

    npm run deploy        # Cloudflare Pages project "tetracube", D1 database "tetracube"

Each file in `migrations/` runs once against production, before the deploy that needs it:

    npx wrangler d1 execute tetracube --remote --file=migrations/0001-cube-hof.sql
    npx wrangler d1 execute tetracube --remote --file=migrations/0002-cube-hof-name10.sql

`schema.sql` holds every table, for a fresh database (`npm run db:local`).

`IP_SALT` is a Pages secret (`wrangler pages secret put IP_SALT --project-name tetracube`).
The API stores a salted hash of the client address for rate limiting, never the address.
`ADMIN_TOKEN` is the second secret; it gates `DELETE /api/cube/:id` (below). Locally both live in `.dev.vars`.

## Moderation

A three-letter filter can't catch everything. To remove a score from the live board:

    npx wrangler d1 execute tetracube --remote --command "DELETE FROM scores WHERE initials='XXX'"

To see what's there first: `--command "SELECT id, initials, score, mode, created_at FROM scores ORDER BY id DESC LIMIT 20"`.

The TETRACUBE hall of fame takes a name of up to 10 characters, so its filter is longer (`lib/api.js`), and a row
can be voided two ways:

    npx wrangler d1 execute tetracube --remote --command "SELECT id, initials, created_at FROM cube_hof ORDER BY id"
    npx wrangler d1 execute tetracube --remote --command "DELETE FROM cube_hof WHERE id=7"
    curl -X DELETE https://tetracube.fun/api/cube/7 -H "Authorization: Bearer $ADMIN_TOKEN"

The ids keep their order, so voiding #7 leaves everyone else's place as it was.

## License

MIT, see [LICENSE](LICENSE). Fork it, mod it, make a five-sided one.

Three.js (`public/vendor/three.module.min.js`) is MIT, © three.js authors. The font is
[Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) (SIL Open Font License), loaded from Google Fonts.
