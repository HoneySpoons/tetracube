-- 2026-10-03: the TETRACUBE hall of fame. Safe to run twice.
CREATE TABLE IF NOT EXISTS cube_hof (
  id          INTEGER PRIMARY KEY,                 -- order of achievement: being first is the prize
  initials    TEXT    NOT NULL CHECK (length(initials) = 3),
  score       INTEGER NOT NULL CHECK (score > 0),
  lines       INTEGER NOT NULL CHECK (lines >= 16),
  duration_ms INTEGER NOT NULL,
  ip_hash     TEXT    NOT NULL,                    -- salted hash, for rate limiting only; never the address
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS cube_hof_rate ON cube_hof (ip_hash, created_at);
