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

-- Stable, domain-level dictionary/concept record. A knowledge entry can be a
-- genre, instrument, production term, rhythmic concept, descriptor, technique,
-- vocal concept, mix concept, etc. Runtime highlighting is driven from here.
CREATE TABLE IF NOT EXISTS knowledge_entry (
  id TEXT PRIMARY KEY,
  entry_type TEXT NOT NULL,
  canonical_label TEXT NOT NULL,
  canonical_slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  difficulty TEXT NOT NULL DEFAULT 'beginner'
    CHECK (difficulty IN ('beginner','intermediate','advanced')),
  created_from TEXT NOT NULL DEFAULT 'curated',
  replaces_entry_id TEXT REFERENCES knowledge_entry(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_knowledge_entry_type_status
  ON knowledge_entry(entry_type, status, canonical_label);

CREATE TABLE IF NOT EXISTS term_variant (
  id INTEGER PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES knowledge_entry(id) ON DELETE CASCADE,
  surface TEXT NOT NULL,
  surface_norm TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  match_kind TEXT NOT NULL DEFAULT 'exact'
    CHECK (match_kind IN ('exact','word','phrase','prefix','manual')),
  match_priority INTEGER NOT NULL DEFAULT 100,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
  UNIQUE(entry_id, locale, surface_norm)
);
CREATE INDEX IF NOT EXISTS idx_term_variant_lookup
  ON term_variant(locale, surface_norm, match_priority DESC);

-- Layered explanation model:
-- 1) what does the term mean in plain language?
-- 2) what does it mean in a specific musical context?
-- 3) what does it mean in the user's current prompt? (runtime-derived).
CREATE TABLE IF NOT EXISTS definition (
  id INTEGER PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES knowledge_entry(id) ON DELETE CASCADE,
  locale TEXT NOT NULL DEFAULT 'en',
  definition_kind TEXT NOT NULL
    CHECK (definition_kind IN ('one_liner','plain','why_it_matters','hear_it_as','misconception','expert_note')),
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','reviewed','approved','deprecated')),
  revision INTEGER NOT NULL DEFAULT 1,
  UNIQUE(entry_id, locale, definition_kind, revision)
);
CREATE INDEX IF NOT EXISTS idx_definition_entry_locale
  ON definition(entry_id, locale, definition_kind, status);

CREATE TABLE IF NOT EXISTS context_definition (
  id INTEGER PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES knowledge_entry(id) ON DELETE CASCADE,
  locale TEXT NOT NULL DEFAULT 'en',
  context_type TEXT NOT NULL
    CHECK (context_type IN ('section','parameter','option','genre','instrument','role','global')),
  context_key TEXT NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','reviewed','approved','deprecated')),
  revision INTEGER NOT NULL DEFAULT 1,
  UNIQUE(entry_id, locale, context_type, context_key, revision)
);
CREATE INDEX IF NOT EXISTS idx_context_definition_lookup
  ON context_definition(entry_id, locale, context_type, context_key, status);

CREATE TABLE IF NOT EXISTS knowledge_relation (
  source_entry_id TEXT NOT NULL REFERENCES knowledge_entry(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  target_entry_id TEXT NOT NULL REFERENCES knowledge_entry(id) ON DELETE CASCADE,
  strength REAL,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  provenance_key TEXT,
  PRIMARY KEY(source_entry_id, relation_type, target_entry_id)
);
CREATE INDEX IF NOT EXISTS idx_knowledge_relation_target
  ON knowledge_relation(target_entry_id, relation_type);

CREATE TABLE IF NOT EXISTS provenance (
  provenance_key TEXT PRIMARY KEY,
  source_kind TEXT NOT NULL,
  source_ref TEXT,
  source_version TEXT,
  source_hash TEXT,
  extraction_rule_version TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS major_genre (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  source_ordinal INTEGER NOT NULL,
  knowledge_entry_id TEXT REFERENCES knowledge_entry(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS genre (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  label_norm TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  knowledge_entry_id TEXT REFERENCES knowledge_entry(id) ON DELETE SET NULL,
  provenance_key TEXT REFERENCES provenance(provenance_key) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_genre_label_norm ON genre(label_norm);

CREATE TABLE IF NOT EXISTS genre_major (
  genre_id TEXT NOT NULL REFERENCES genre(id) ON DELETE CASCADE,
  major_genre_id TEXT NOT NULL REFERENCES major_genre(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  PRIMARY KEY(genre_id, major_genre_id)
);
CREATE INDEX IF NOT EXISTS idx_genre_major_major ON genre_major(major_genre_id, genre_id);

CREATE TABLE IF NOT EXISTS genre_alias (
  alias_norm TEXT PRIMARY KEY,
  alias_surface TEXT NOT NULL,
  genre_id TEXT NOT NULL REFERENCES genre(id) ON DELETE CASCADE,
  alias_kind TEXT NOT NULL CHECK (alias_kind IN ('exact','normalized','historical','spelling','vault-crosswalk','manual')),
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  provenance_key TEXT REFERENCES provenance(provenance_key) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_genre_alias_genre ON genre_alias(genre_id, status);

-- Explicit source-label mapping. Unlike genre_alias this permits a single
-- source surface to map to multiple genre influences (composite labels).
CREATE TABLE IF NOT EXISTS genre_source_mapping (
  source_norm TEXT NOT NULL,
  source_surface TEXT NOT NULL,
  mapping_kind TEXT NOT NULL CHECK (mapping_kind IN ('alias','composite','taxonomy-gap')),
  target_genre_id TEXT REFERENCES genre(id) ON DELETE CASCADE,
  target_role_hint TEXT,
  ordinal INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  provenance_key TEXT REFERENCES provenance(provenance_key) ON DELETE SET NULL,
  PRIMARY KEY(source_norm, ordinal)
);
CREATE INDEX IF NOT EXISTS idx_genre_source_mapping_target
  ON genre_source_mapping(target_genre_id, status);

CREATE TABLE IF NOT EXISTS instrument_family (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  knowledge_entry_id TEXT REFERENCES knowledge_entry(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS instrument (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  label_norm TEXT NOT NULL,
  family_id TEXT REFERENCES instrument_family(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  knowledge_entry_id TEXT REFERENCES knowledge_entry(id) ON DELETE SET NULL,
  provenance_key TEXT REFERENCES provenance(provenance_key) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_instrument_label_norm ON instrument(label_norm);

CREATE TABLE IF NOT EXISTS instrument_alias (
  alias_norm TEXT PRIMARY KEY,
  alias_surface TEXT NOT NULL,
  instrument_id TEXT NOT NULL REFERENCES instrument(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated'))
);

-- Every source Instruments segment is preserved as a first-class selectable
-- expression. Canonical instrument identity and reusable semantic concepts are
-- linked underneath it; the original source wording/output is never discarded.
CREATE TABLE IF NOT EXISTS instrument_expression (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  label_norm TEXT NOT NULL UNIQUE,
  output_text TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'factory'
    CHECK (source_kind IN ('factory','curated')),
  status TEXT NOT NULL DEFAULT 'source'
    CHECK (status IN ('source','reviewed','approved','deprecated')),
  selectable INTEGER NOT NULL DEFAULT 1 CHECK (selectable IN (0,1)),
  base_instrument_id TEXT REFERENCES instrument(id) ON DELETE SET NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 0,
  track_count INTEGER NOT NULL DEFAULT 0,
  decomposition_state TEXT NOT NULL DEFAULT 'unresolved'
    CHECK (decomposition_state IN ('identity','semantic','partial','unresolved')),
  semantic_coverage REAL NOT NULL DEFAULT 0.0
    CHECK (semantic_coverage >= 0.0 AND semantic_coverage <= 1.0),
  residual_json TEXT NOT NULL DEFAULT '[]',
  provenance_key TEXT REFERENCES provenance(provenance_key) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_instrument_expression_rank
  ON instrument_expression(status, selectable, track_count DESC, occurrence_count DESC);
CREATE INDEX IF NOT EXISTS idx_instrument_expression_base
  ON instrument_expression(base_instrument_id, decomposition_state);
CREATE INDEX IF NOT EXISTS idx_instrument_expression_norm
  ON instrument_expression(label_norm);

CREATE TABLE IF NOT EXISTS instrument_expression_instrument (
  expression_id TEXT NOT NULL REFERENCES instrument_expression(id) ON DELETE CASCADE,
  instrument_id TEXT NOT NULL REFERENCES instrument(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'identity',
  ordinal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(expression_id, instrument_id, role, ordinal)
);
CREATE INDEX IF NOT EXISTS idx_instrument_expression_instrument_lookup
  ON instrument_expression_instrument(instrument_id, expression_id);

CREATE TABLE IF NOT EXISTS instrument_expression_concept (
  expression_id TEXT NOT NULL REFERENCES instrument_expression(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL REFERENCES knowledge_entry(id) ON DELETE CASCADE,
  role TEXT,
  ordinal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(expression_id, entry_id, ordinal)
);
CREATE INDEX IF NOT EXISTS idx_instrument_expression_concept_lookup
  ON instrument_expression_concept(entry_id, expression_id);

CREATE VIRTUAL TABLE IF NOT EXISTS instrument_expression_search USING fts5(
  expression_id UNINDEXED,
  label,
  semantic_terms,
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TABLE IF NOT EXISTS prompt_section_definition (
  section_key TEXT PRIMARY KEY,
  output_label TEXT NOT NULL,
  output_order INTEGER NOT NULL UNIQUE,
  optional INTEGER NOT NULL DEFAULT 1 CHECK (optional IN (0,1)),
  easy_visible INTEGER NOT NULL DEFAULT 1 CHECK (easy_visible IN (0,1)),
  advanced_visible INTEGER NOT NULL DEFAULT 1 CHECK (advanced_visible IN (0,1)),
  knowledge_entry_id TEXT REFERENCES knowledge_entry(id) ON DELETE SET NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS parameter (
  id TEXT PRIMARY KEY,
  section_key TEXT NOT NULL REFERENCES prompt_section_definition(section_key) ON DELETE CASCADE,
  label TEXT NOT NULL,
  canonical_slug TEXT NOT NULL UNIQUE,
  value_type TEXT NOT NULL CHECK (value_type IN ('enum','multi','number','text','boolean','relation')),
  easy_visible INTEGER NOT NULL DEFAULT 0 CHECK (easy_visible IN (0,1)),
  advanced_visible INTEGER NOT NULL DEFAULT 1 CHECK (advanced_visible IN (0,1)),
  allow_custom_text INTEGER NOT NULL DEFAULT 0 CHECK (allow_custom_text IN (0,1)),
  knowledge_entry_id TEXT REFERENCES knowledge_entry(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_parameter_section ON parameter(section_key, sort_order);

CREATE TABLE IF NOT EXISTS parameter_option (
  id TEXT PRIMARY KEY,
  parameter_id TEXT NOT NULL REFERENCES parameter(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  canonical_slug TEXT NOT NULL,
  output_fragment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  easy_visible INTEGER NOT NULL DEFAULT 0 CHECK (easy_visible IN (0,1)),
  advanced_visible INTEGER NOT NULL DEFAULT 1 CHECK (advanced_visible IN (0,1)),
  knowledge_entry_id TEXT REFERENCES knowledge_entry(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(parameter_id, canonical_slug)
);
CREATE INDEX IF NOT EXISTS idx_parameter_option_parameter
  ON parameter_option(parameter_id, status, sort_order);

-- Easy mode uses curated statements/combinations; Advanced mode can use the
-- same statements but also exposes the atomized parameter/options and custom text.
CREATE TABLE IF NOT EXISTS statement (
  id TEXT PRIMARY KEY,
  section_key TEXT NOT NULL REFERENCES prompt_section_definition(section_key) ON DELETE CASCADE,
  label TEXT NOT NULL,
  output_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  mode_scope TEXT NOT NULL DEFAULT 'both'
    CHECK (mode_scope IN ('easy','advanced','both')),
  statement_kind TEXT NOT NULL DEFAULT 'combo'
    CHECK (statement_kind IN ('word','phrase','combo','template')),
  source_frequency INTEGER,
  provenance_key TEXT REFERENCES provenance(provenance_key) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_statement_section_mode
  ON statement(section_key, mode_scope, status);

CREATE TABLE IF NOT EXISTS statement_concept (
  statement_id TEXT NOT NULL REFERENCES statement(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL REFERENCES knowledge_entry(id) ON DELETE CASCADE,
  role TEXT,
  ordinal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(statement_id, entry_id, ordinal)
);

CREATE TABLE IF NOT EXISTS statement_option (
  statement_id TEXT NOT NULL REFERENCES statement(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL REFERENCES parameter_option(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(statement_id, option_id, ordinal)
);

CREATE TABLE IF NOT EXISTS genre_trait (
  genre_id TEXT NOT NULL REFERENCES genre(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL REFERENCES prompt_section_definition(section_key) ON DELETE CASCADE,
  entry_id TEXT NOT NULL REFERENCES knowledge_entry(id) ON DELETE CASCADE,
  role TEXT,
  evidence_count INTEGER,
  confidence REAL,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  provenance_key TEXT REFERENCES provenance(provenance_key) ON DELETE SET NULL,
  PRIMARY KEY(genre_id, section_key, entry_id, role)
);
CREATE INDEX IF NOT EXISTS idx_genre_trait_section ON genre_trait(genre_id, section_key, status);

CREATE TABLE IF NOT EXISTS instrument_trait (
  instrument_id TEXT NOT NULL REFERENCES instrument(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL REFERENCES knowledge_entry(id) ON DELETE CASCADE,
  trait_type TEXT NOT NULL,
  confidence REAL,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  provenance_key TEXT REFERENCES provenance(provenance_key) ON DELETE SET NULL,
  PRIMARY KEY(instrument_id, entry_id, trait_type)
);

CREATE TABLE IF NOT EXISTS renderer_profile (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  version INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0,1)),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS renderer_section (
  renderer_profile_id TEXT NOT NULL REFERENCES renderer_profile(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL REFERENCES prompt_section_definition(section_key) ON DELETE CASCADE,
  output_label_override TEXT,
  output_order INTEGER NOT NULL,
  emit_when_empty INTEGER NOT NULL DEFAULT 0 CHECK (emit_when_empty IN (0,1)),
  PRIMARY KEY(renderer_profile_id, section_key)
);

CREATE TABLE IF NOT EXISTS exclude_entry (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  output_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','reviewed','approved','deprecated')),
  knowledge_entry_id TEXT REFERENCES knowledge_entry(id) ON DELETE SET NULL,
  provenance_key TEXT REFERENCES provenance(provenance_key) ON DELETE SET NULL
);

-- Search support for local/native runtime. Web builds may compile equivalent
-- search shards instead of shipping SQLite directly.
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_search USING fts5(
  entry_id UNINDEXED,
  label,
  terms,
  definition,
  tokenize='unicode61 remove_diacritics 2'
);

INSERT OR IGNORE INTO schema_migrations(version, name, applied_at)
VALUES (1, 'knowledge-v1', strftime('%Y-%m-%dT%H:%M:%fZ','now'));

INSERT OR IGNORE INTO schema_migrations(version, name, applied_at)
VALUES (2, 'instrument-expression-layer', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
