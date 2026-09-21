PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS build_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_file (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('prompt_vault','genre_map','other')),
  basename TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  schema_name TEXT,
  schema_version TEXT,
  source_timestamp TEXT,
  imported_at TEXT NOT NULL,
  UNIQUE(kind, sha256)
);

CREATE TABLE IF NOT EXISTS track (
  track_id TEXT PRIMARY KEY,
  source_file_id INTEGER NOT NULL REFERENCES source_file(id) ON DELETE RESTRICT,
  source_ordinal INTEGER NOT NULL,
  title TEXT,
  genre_raw TEXT,
  genre_norm TEXT,
  bpm INTEGER,
  emotion_raw TEXT,
  style_raw TEXT,
  year INTEGER,
  key_raw TEXT,
  reference_artist TEXT,
  reference_song TEXT,
  structured_prompt TEXT NOT NULL,
  negative_prompt TEXT,
  instrumental_arrangement TEXT,
  used INTEGER NOT NULL DEFAULT 0 CHECK (used IN (0,1)),
  favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0,1)),
  UNIQUE(source_file_id, source_ordinal)
);
CREATE INDEX IF NOT EXISTS idx_track_genre_raw ON track(genre_raw);
CREATE INDEX IF NOT EXISTS idx_track_genre_norm ON track(genre_norm);
CREATE INDEX IF NOT EXISTS idx_track_style_raw ON track(style_raw);
CREATE INDEX IF NOT EXISTS idx_track_year ON track(year);
CREATE INDEX IF NOT EXISTS idx_track_bpm ON track(bpm);

CREATE TABLE IF NOT EXISTS section_label_map (
  raw_label TEXT PRIMARY KEY,
  canonical_key TEXT NOT NULL,
  canonical_output_label TEXT NOT NULL,
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('canonical','alias','compound','legacy','unknown')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS prompt_section (
  id INTEGER PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES track(track_id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  raw_label TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  canonical_output_label TEXT NOT NULL,
  content_raw TEXT NOT NULL,
  content_norm TEXT NOT NULL,
  source_line_raw TEXT NOT NULL,
  UNIQUE(track_id, ordinal)
);
CREATE INDEX IF NOT EXISTS idx_prompt_section_track ON prompt_section(track_id, ordinal);
CREATE INDEX IF NOT EXISTS idx_prompt_section_key ON prompt_section(canonical_key);
CREATE INDEX IF NOT EXISTS idx_prompt_section_raw_label ON prompt_section(raw_label);

CREATE TABLE IF NOT EXISTS prompt_clause (
  id INTEGER PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES prompt_section(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  content_raw TEXT NOT NULL,
  content_norm TEXT NOT NULL,
  delimiter_after TEXT,
  start_char INTEGER NOT NULL,
  end_char INTEGER NOT NULL,
  UNIQUE(section_id, ordinal)
);
CREATE INDEX IF NOT EXISTS idx_prompt_clause_section ON prompt_clause(section_id, ordinal);

CREATE VIRTUAL TABLE IF NOT EXISTS prompt_section_fts USING fts5(
  section_id UNINDEXED,
  track_id UNINDEXED,
  canonical_key UNINDEXED,
  raw_label,
  content,
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TABLE IF NOT EXISTS token_occurrence (
  id INTEGER PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES prompt_section(id) ON DELETE CASCADE,
  clause_id INTEGER REFERENCES prompt_clause(id) ON DELETE CASCADE,
  ordinal_section INTEGER NOT NULL,
  ordinal_clause INTEGER,
  token_raw TEXT NOT NULL,
  token_norm TEXT NOT NULL,
  start_char INTEGER NOT NULL,
  end_char INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_token_norm ON token_occurrence(token_norm);
CREATE INDEX IF NOT EXISTS idx_token_section ON token_occurrence(section_id, ordinal_section);
CREATE INDEX IF NOT EXISTS idx_token_clause ON token_occurrence(clause_id, ordinal_clause);

CREATE TABLE IF NOT EXISTS token_section_stat (
  token_norm TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL,
  track_count INTEGER NOT NULL,
  PRIMARY KEY(token_norm, canonical_key)
);
CREATE INDEX IF NOT EXISTS idx_token_section_stat_key_count
  ON token_section_stat(canonical_key, occurrence_count DESC);

CREATE TABLE IF NOT EXISTS phrase_candidate (
  canonical_key TEXT NOT NULL,
  n INTEGER NOT NULL CHECK (n BETWEEN 2 AND 6),
  phrase_norm TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL,
  track_count INTEGER NOT NULL,
  first_section_id INTEGER REFERENCES prompt_section(id) ON DELETE SET NULL,
  PRIMARY KEY(canonical_key, n, phrase_norm)
);
CREATE INDEX IF NOT EXISTS idx_phrase_candidate_rank
  ON phrase_candidate(canonical_key, n, occurrence_count DESC);

CREATE TABLE IF NOT EXISTS section_value_stat (
  canonical_key TEXT NOT NULL,
  content_norm TEXT NOT NULL,
  content_raw_example TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL,
  track_count INTEGER NOT NULL,
  PRIMARY KEY(canonical_key, content_norm)
);
CREATE INDEX IF NOT EXISTS idx_section_value_stat_rank
  ON section_value_stat(canonical_key, occurrence_count DESC);

CREATE TABLE IF NOT EXISTS genre_section_token_stat (
  vault_genre_norm TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  token_norm TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL,
  track_count INTEGER NOT NULL,
  PRIMARY KEY(vault_genre_norm, canonical_key, token_norm)
);
CREATE INDEX IF NOT EXISTS idx_genre_section_token_rank
  ON genre_section_token_stat(vault_genre_norm, canonical_key, occurrence_count DESC);

CREATE TABLE IF NOT EXISTS negative_item (
  id INTEGER PRIMARY KEY,
  item_raw_example TEXT NOT NULL,
  item_norm TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS track_negative_item (
  track_id TEXT NOT NULL REFERENCES track(track_id) ON DELETE CASCADE,
  negative_item_id INTEGER NOT NULL REFERENCES negative_item(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  item_raw TEXT NOT NULL,
  PRIMARY KEY(track_id, ordinal),
  UNIQUE(track_id, negative_item_id, ordinal)
);
CREATE INDEX IF NOT EXISTS idx_track_negative_item_item ON track_negative_item(negative_item_id);

CREATE TABLE IF NOT EXISTS negative_item_stat (
  negative_item_id INTEGER PRIMARY KEY REFERENCES negative_item(id) ON DELETE CASCADE,
  occurrence_count INTEGER NOT NULL,
  track_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS major_genre_raw (
  major_key TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  source_ordinal INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS genre_raw (
  genre_key TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  label_norm TEXT NOT NULL,
  source_ordinal INTEGER NOT NULL,
  track_count_declared INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_genre_raw_norm ON genre_raw(label_norm);

CREATE TABLE IF NOT EXISTS genre_major_raw (
  genre_key TEXT NOT NULL REFERENCES genre_raw(genre_key) ON DELETE CASCADE,
  major_key TEXT NOT NULL REFERENCES major_genre_raw(major_key) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  PRIMARY KEY(genre_key, major_key)
);
CREATE INDEX IF NOT EXISTS idx_genre_major_raw_major ON genre_major_raw(major_key, genre_key);

CREATE TABLE IF NOT EXISTS genre_crosswalk_candidate (
  vault_genre_raw TEXT PRIMARY KEY,
  vault_genre_norm TEXT NOT NULL,
  vault_track_count INTEGER NOT NULL,
  match_status TEXT NOT NULL CHECK (match_status IN ('exact','normalized','heuristic','unmatched')),
  matched_genre_key TEXT REFERENCES genre_raw(genre_key) ON DELETE SET NULL,
  suggestion_json TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_genre_crosswalk_status ON genre_crosswalk_candidate(match_status);

CREATE TABLE IF NOT EXISTS section_sequence_stat (
  sequence_key TEXT PRIMARY KEY,
  sequence_json TEXT NOT NULL,
  track_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS corpus_profile (
  metric_key TEXT PRIMARY KEY,
  metric_value TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations(version, name, applied_at)
VALUES (1, 'corpus-v1-base', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
INSERT OR IGNORE INTO schema_migrations(version, name, applied_at)
VALUES (2, 'corpus-v2-resumable', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
