# Tetracube

Play it at **[tetracube.fun](https://tetracube.fun)** · high scores at [tetracube.fun/scores](https://tetracube.fun/scores)

Four games of Tetris wrapped around one isometric cube. Each face's edge column is its
neighbour's edge column, so a clear on one face drops the shared corners and can complete
rows on the faces beside it: cascades.

## How to play

| | keyboard | touch |
|---|---|---|
| pick a face | A S D F | the coloured buttons |
| move | ← → | swipe |
| rotate | ↑ or X (Z rotates back) | tap (swipe up rotates back) |
| soft / hard drop | ↓ / space | drag down / flick down |
| live mode | L, before your first piece lands | LIVE button |
| pause, controls | Esc | II |

In **focus** mode only the face you're on falls. In **live** mode all four fall, the ones you aren't watching at half speed, and your score goes on the separate Live board.

## What's in here

- `public/index.html`: the game (Three.js, synthesized sound, keyboard + touch)
- `public/scores.html`: the live leaderboard (`/scores`)
- `functions/api/scores.js`: `GET`/`POST /api/scores` (Cloudflare Pages Function)
- `schema.sql`: the D1 table

## Run locally

    npm install
    npm run db:local      # once: create the local D1 table
    npm run dev           # http://127.0.0.1:8788

## Deploy

    npm run deploy        # Cloudflare Pages project "tetracube", D1 database "tetracube"

`IP_SALT` is a Pages secret (`wrangler pages secret put IP_SALT --project-name tetracube`).
The API stores a salted hash of the client address for rate limiting, never the address.

## Moderation

A three-letter filter can't catch everything. To remove a score from the live board:

    npx wrangler d1 execute tetracube --remote --command "DELETE FROM scores WHERE initials='XXX'"

To see what's there first: `--command "SELECT id, initials, score, mode, created_at FROM scores ORDER BY id DESC LIMIT 20"`.

## License

MIT, see [LICENSE](LICENSE). Fork it, mod it, make a five-sided one.

Three.js (`public/vendor/three.module.min.js`) is MIT, © three.js authors. The font is
[Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) (SIL Open Font License), loaded from Google Fonts.
