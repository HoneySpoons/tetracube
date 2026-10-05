-- 2026-10-05: the hall of fame takes a name of 1–10 characters (was exactly 3). SQLite can't alter a CHECK, so the
-- table is rebuilt: rows are copied by id into the wider table, the old one dropped, the new one renamed. Running it
-- again copies the already-wide table into a fresh one and renames back: no rows lost, same shape.
CREATE TABLE IF NOT EXISTS cube_hof_v2 (
  id          INTEGER PRIMARY KEY,                 -- order of achievement: being first is the prize
  initials    TEXT    NOT NULL CHECK (length(initials) BETWEEN 1 AND 10),   -- the name on the wall; 3-letter rows stay as they are
  score       INTEGER NOT NULL CHECK (score > 0),
  lines       INTEGER NOT NULL CHECK (lines >= 16),
  duration_ms INTEGER NOT NULL,
  ip_hash     TEXT    NOT NULL,                    -- salted hash, for rate limiting only; never the address
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO cube_hof_v2 (id, initials, score, lines, duration_ms, ip_hash, created_at)
  SELECT id, initials, score, lines, duration_ms, ip_hash, created_at FROM cube_hof
  WHERE id NOT IN (SELECT id FROM cube_hof_v2);
DROP TABLE cube_hof;
ALTER TABLE cube_hof_v2 RENAME TO cube_hof;
CREATE INDEX IF NOT EXISTS cube_hof_rate ON cube_hof (ip_hash, created_at);
