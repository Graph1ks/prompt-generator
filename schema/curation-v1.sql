PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;

-- Durable LOCAL authoring state.
-- This file is not generated from the Vault and must never be deleted by a normal rebuild.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS curation_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- A patch can enrich an imported stable entry (for example a taxonomy genre)
-- or introduce a new curated concept. entry_id is the stable knowledge ID.
CREATE TABLE IF NOT EXISTS entry_patch (
  entry_id TEXT PRIMARY KEY,
  entry_type TEXT NOT NULL,
  canonical_label TEXT NOT NULL,
  canonical_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  difficulty TEXT NOT NULL DEFAULT 'beginner'
    CHECK (difficulty IN ('beginner','intermediate','advanced')),
  revision INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS term_variant_patch (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  surface TEXT NOT NULL,
  surface_norm TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  match_kind TEXT NOT NULL DEFAULT 'exact'
    CHECK (match_kind IN ('exact','word','phrase','prefix','manual')),
  match_priority INTEGER NOT NULL DEFAULT 100,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  revision INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(entry_id, locale, surface_norm)
);
CREATE INDEX IF NOT EXISTS idx_term_variant_patch_entry
  ON term_variant_patch(entry_id, locale, status);

CREATE TABLE IF NOT EXISTS definition_patch (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  definition_kind TEXT NOT NULL
    CHECK (definition_kind IN ('one_liner','plain','why_it_matters','hear_it_as','misconception','expert_note')),
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','reviewed','approved','deprecated')),
  revision INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(entry_id, locale, definition_kind, revision)
);
CREATE INDEX IF NOT EXISTS idx_definition_patch_entry
  ON definition_patch(entry_id, locale, status);

CREATE TABLE IF NOT EXISTS context_definition_patch (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  context_type TEXT NOT NULL
    CHECK (context_type IN ('section','parameter','option','genre','instrument','role','global')),
  context_key TEXT NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','reviewed','approved','deprecated')),
  revision INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(entry_id, locale, context_type, context_key, revision)
);
CREATE INDEX IF NOT EXISTS idx_context_definition_patch_entry
  ON context_definition_patch(entry_id, locale, context_type, context_key, status);

CREATE TABLE IF NOT EXISTS relation_patch (
  id TEXT PRIMARY KEY,
  source_entry_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  target_entry_id TEXT NOT NULL,
  strength REAL,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  revision INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(source_entry_id, relation_type, target_entry_id)
);

-- Explicit human decision for a Vault label that does not cleanly equal one taxonomy label.
-- Multiple rows per alias are permitted when the decision is a composite/multi-influence mapping.
CREATE TABLE IF NOT EXISTS genre_crosswalk_decision (
  id TEXT PRIMARY KEY,
  source_surface TEXT NOT NULL,
  source_norm TEXT NOT NULL,
  target_genre_id TEXT,
  target_role_hint TEXT,
  decision_kind TEXT NOT NULL
    CHECK (decision_kind IN ('alias','composite','taxonomy-gap','ignore','defer')),
  ordinal INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  rationale TEXT,
  source_factory_hash TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  UNIQUE(source_norm, ordinal, revision)
);
CREATE INDEX IF NOT EXISTS idx_genre_crosswalk_decision_surface
  ON genre_crosswalk_decision(source_norm, status);

-- Instrument identity is curated separately from descriptors/behavior.
CREATE TABLE IF NOT EXISTS instrument_family_patch (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  knowledge_entry_id TEXT,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS instrument_patch (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  label_norm TEXT NOT NULL,
  family_id TEXT,
  knowledge_entry_id TEXT,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  revision INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_instrument_patch_label ON instrument_patch(label_norm, status);

CREATE TABLE IF NOT EXISTS instrument_alias_patch (
  id TEXT PRIMARY KEY,
  instrument_id TEXT NOT NULL,
  alias_surface TEXT NOT NULL,
  alias_norm TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  UNIQUE(instrument_id, alias_norm, revision)
);

CREATE TABLE IF NOT EXISTS parameter_patch (
  id TEXT PRIMARY KEY,
  section_key TEXT NOT NULL,
  label TEXT NOT NULL,
  canonical_slug TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('enum','multi','number','text','boolean','relation')),
  easy_visible INTEGER NOT NULL DEFAULT 0 CHECK (easy_visible IN (0,1)),
  advanced_visible INTEGER NOT NULL DEFAULT 1 CHECK (advanced_visible IN (0,1)),
  allow_custom_text INTEGER NOT NULL DEFAULT 0 CHECK (allow_custom_text IN (0,1)),
  knowledge_entry_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parameter_option_patch (
  id TEXT PRIMARY KEY,
  parameter_id TEXT NOT NULL,
  label TEXT NOT NULL,
  canonical_slug TEXT NOT NULL,
  output_fragment TEXT NOT NULL,
  knowledge_entry_id TEXT,
  easy_visible INTEGER NOT NULL DEFAULT 0 CHECK (easy_visible IN (0,1)),
  advanced_visible INTEGER NOT NULL DEFAULT 1 CHECK (advanced_visible IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  UNIQUE(parameter_id, canonical_slug, revision)
);

CREATE TABLE IF NOT EXISTS statement_patch (
  id TEXT PRIMARY KEY,
  section_key TEXT NOT NULL,
  label TEXT NOT NULL,
  output_text TEXT NOT NULL,
  mode_scope TEXT NOT NULL DEFAULT 'both'
    CHECK (mode_scope IN ('easy','advanced','both')),
  statement_kind TEXT NOT NULL DEFAULT 'combo'
    CHECK (statement_kind IN ('word','phrase','combo','template')),
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  revision INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS statement_concept_patch (
  statement_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  role TEXT,
  ordinal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(statement_id, entry_id, ordinal)
);

CREATE TABLE IF NOT EXISTS statement_option_patch (
  statement_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(statement_id, option_id, ordinal)
);

-- Candidate review queue: mining can propose items here without promoting them
-- directly into approved knowledge.
CREATE TABLE IF NOT EXISTS candidate_review (
  candidate_key TEXT PRIMARY KEY,
  candidate_type TEXT NOT NULL,
  section_key TEXT,
  surface TEXT NOT NULL,
  normalized_surface TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  proposed_payload_json TEXT,
  review_status TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (review_status IN ('unreviewed','accepted','rejected','deferred')),
  reviewed_at TEXT,
  reviewer_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_candidate_review_queue
  ON candidate_review(review_status, candidate_type, section_key);

INSERT OR IGNORE INTO schema_migrations(version, name, applied_at)
VALUES (1, 'curation-v1', strftime('%Y-%m-%dT%H:%M:%fZ','now'));

INSERT OR IGNORE INTO curation_meta(key, value)
VALUES ('schema_version', 'curation-v1');
