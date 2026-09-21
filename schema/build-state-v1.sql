PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;

CREATE TABLE IF NOT EXISTS build_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS build_stage (
  name TEXT PRIMARY KEY,
  ordinal INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','paused','complete','error')),
  processed INTEGER NOT NULL DEFAULT 0,
  total INTEGER,
  started_at TEXT,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  elapsed_seconds REAL NOT NULL DEFAULT 0,
  detail_json TEXT
);

CREATE TABLE IF NOT EXISTS build_event (
  id INTEGER PRIMARY KEY,
  ts TEXT NOT NULL,
  level TEXT NOT NULL,
  stage TEXT,
  message TEXT NOT NULL,
  detail_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_build_event_ts ON build_event(ts);
