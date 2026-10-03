# Tetracube

Four games of Tetris wrapped around one isometric cube. Each face's edge column is its
neighbour's edge column, so a clear on one face drops the shared corners and can complete
rows on the faces beside it: cascades.

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
