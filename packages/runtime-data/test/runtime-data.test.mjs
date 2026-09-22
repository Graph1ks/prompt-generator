import assert from "node:assert/strict";
import test from "node:test";

import {
  RuntimeDataError,
  buildCompilerKnowledge,
  loadRuntimeBootstrap,
  loadRuntimeInstrumentLibrary,
  loadRuntimeEditor,
  loadRuntimeKnowledge,
  parseRuntimeManifest,
} from "../dist/index.js";

const hash = "a".repeat(64);

function manifest() {
  return {
    schema: "vgine-runtime-pack-v1",
    schema_version: 1,
    runtime_build_id: "b".repeat(64),
    knowledge_db_sha256: "c".repeat(64),
    editor_foundation_sha256: "d".repeat(64),
    product_knowledge_foundation_sha256: "e".repeat(64),
    knowledge_build_meta: { build_revision: "test" },
    files: {
      "core.json": { sha256: hash, bytes: 1, counts: { major_genres: 1, sections: 1, renderer_profiles: 1 } },
      "genres.json": { sha256: hash, bytes: 1, counts: { genres: 1 } },
      "instruments.json": { sha256: hash, bytes: 1, counts: { families: 1, instruments: 1 } },
      "instrument-expressions.json": { sha256: hash, bytes: 1, counts: { expressions: 1 } },
      "editor.json": { sha256: hash, bytes: 1, counts: { parameters: 1, parameter_options: 1, statements: 1, exclude: 1 } },
      "knowledge.json": { sha256: hash, bytes: 1, counts: { entries: 2 } },
      "search.json": { sha256: hash, bytes: 1, counts: { documents: 2 } },
    },
  };
}

function payloads() {
  return {
    "manifest.json": manifest(),
    "core.json": {
      schema: "vgine-runtime-core-v1",
      major_genres: [{ id: "major:hip-hop", label: "Hip-Hop", source_ordinal: 1, knowledge_entry_id: null }],
      sections: [
        {
          key: "genre",
          label: "Genre",
          output_order: 1,
          optional: false,
          easy_visible: true,
          advanced_visible: true,
          knowledge_entry_id: null,
          notes: null,
        },
      ],
      renderer_profiles: [
        {
          id: "suno-structured-v1",
          label: "Suno",
          version: 1,
          active: true,
          max_characters: 1000,
          overflow_policy: "semantic-budget",
          notes: null,
          sections: [
            {
              section_key: "genre",
              output_label_override: null,
              output_order: 1,
              emit_when_empty: false,
              soft_max_characters: 56,
              source_sample_count: 100,
            },
          ],
        },
      ],
    },
    "genres.json": {
      schema: "vgine-runtime-genres-v1",
      genres: [
        {
          id: "genre:boom-bap",
          label: "Boom Bap",
          normalized: "boom bap",
          knowledge_entry_id: null,
          major_genre_ids: ["major:hip-hop"],
          aliases: [],
          traits: [],
        },
      ],
    },
    "instruments.json": {
      schema: "vgine-runtime-instruments-v1",
      families: [
        {
          id: "instrument-family:keys",
          label: "Keys",
          knowledge_entry_id: null,
        },
      ],
      instruments: [
        {
          id: "instrument:rhodes",
          label: "Rhodes electric piano",
          normalized: "rhodes electric piano",
          family_id: "instrument-family:keys",
          knowledge_entry_id: null,
          aliases: ["Rhodes"],
          traits: [],
        },
      ],
    },
    "instrument-expressions.json": {
      schema: "vgine-runtime-instrument-expressions-v1",
      expressions: [
        {
          id: "instrument-expression:warm-rhodes",
          label: "warm Rhodes electric piano",
          normalized: "warm rhodes electric piano",
          output_text: "warm Rhodes electric piano",
          source_kind: "factory",
          status: "approved",
          selectable: true,
          base_instrument_id: "instrument:rhodes",
          occurrence_count: 12,
          track_count: 9,
          decomposition_state: "identity",
          semantic_coverage: 1,
          residual_terms: [],
          instruments: [
            {
              instrument_id: "instrument:rhodes",
              role: "identity",
              ordinal: 0,
            },
          ],
          concepts: [],
        },
      ],
    },
    "editor.json": {
      schema: "vgine-runtime-editor-v1",
      foundation_schema: "vgine-editor-foundation-v1",
      foundation_version: 1,
      parameters: [
        {
          id: "parameter:bpm:tempo",
          section_key: "bpm",
          label: "Tempo",
          canonical_slug: "tempo",
          value_type: "number",
          easy_visible: true,
          advanced_visible: true,
          allow_custom_text: true,
          knowledge_entry_id: null,
          sort_order: 10,
          ui: {
            control: "number",
            min: 40,
            max: 220,
            step: 1,
            unit: "BPM",
            recommended_values: [84, 96, 120],
          },
        },
      ],
      parameter_options: [
        {
          id: "option:groove:swing:laid-back",
          parameter_id: "parameter:bpm:tempo",
          label: "Laid-back",
          canonical_slug: "laid-back",
          output_fragment: "laid-back swing",
          easy_visible: true,
          advanced_visible: true,
          knowledge_entry_id: null,
          sort_order: 10,
          recommended: true,
        },
      ],
      statements: [
        {
          id: "statement:groove:laid-back",
          section_key: "groove",
          label: "Laid-back pocket",
          output_text: "laid-back swung pocket",
          mode_scope: "easy",
          statement_kind: "combination",
          source_frequency: null,
          concepts: [],
          options: [
            {
              option_id: "option:groove:swing:laid-back",
              ordinal: 0,
            },
          ],
        },
      ],
      exclude: [
        {
          id: "exclude:glossy-pop-synths",
          label: "Glossy pop synths",
          output_text: "bright glossy pop synths",
          knowledge_entry_id: null,
        },
      ],
    },
    "knowledge.json": {
      schema: "vgine-runtime-knowledge-v1",
      entries: [
        {
          id: "knowledge:groove:swing",
          entry_type: "concept",
          canonical_label: "Swing",
          canonical_slug: "swing",
          difficulty: "beginner",
          replaces_entry_id: null,
          variants: [
            {
              surface: "swing",
              normalized: "swing",
              locale: "en",
              match_kind: "exact",
              match_priority: 100,
              is_primary: true,
            },
          ],
          definitions: [
            {
              locale: "en",
              kind: "plain",
              text: "A rhythmic feel that delays alternating subdivisions.",
              revision: 1,
            },
          ],
          context_definitions: [
            {
              locale: "en",
              context_type: "section",
              context_key: "groove",
              text: "Controls how straight or lilted the groove feels.",
              revision: 1,
            },
          ],
          relations: [
            {
              relation_type: "related",
              target_entry_id: "knowledge:groove:shuffle",
              strength: 0.8,
            },
          ],
        },
        {
          id: "knowledge:groove:shuffle",
          entry_type: "concept",
          canonical_label: "Shuffle",
          canonical_slug: "shuffle",
          difficulty: "intermediate",
          replaces_entry_id: null,
          variants: [],
          definitions: [],
          context_definitions: [],
          relations: [],
        },
      ],
    },
    "search.json": {
      schema: "vgine-runtime-search-documents-v1",
      documents: [
        { id: "genre:boom-bap", kind: "genre", label: "Boom Bap", terms: ["Hip-Hop"] },
        {
          id: "instrument-expression:warm-rhodes",
          kind: "instrument_expression",
          label: "warm Rhodes electric piano",
          terms: ["Rhodes", "Keys"],
        },
      ],
    },
  };
}

function reader(data) {
  return {
    async readText(name) {
      if (!(name in data)) throw new Error(`missing test payload: ${name}`);
      return JSON.stringify(data[name]);
    },
  };
}

test("loads bootstrap payloads and builds compiler knowledge", async () => {
  const data = payloads();
  const bootstrap = await loadRuntimeBootstrap(reader(data));
  const compilerKnowledge = buildCompilerKnowledge(bootstrap);

  assert.equal(bootstrap.search.documents.length, 2);
  assert.equal(compilerKnowledge.runtimeBuildId, "b".repeat(64));
  assert.equal(
    bootstrap.manifest.product_knowledge_foundation_sha256,
    "e".repeat(64),
  );
  assert.equal(compilerKnowledge.genreLabels["major:hip-hop"], "Hip-Hop");
  assert.equal(compilerKnowledge.genreLabels["genre:boom-bap"], "Boom Bap");
  assert.equal(
    compilerKnowledge.rendererProfiles["suno-structured-v1"].sections[0].label,
    "Genre",
  );
  assert.equal(
    compilerKnowledge.rendererProfiles["suno-structured-v1"].maxCharacters,
    1000,
  );
});

test("rejects unsupported Runtime Pack versions", () => {
  const value = manifest();
  value.schema_version = 2;
  assert.throws(
    () => parseRuntimeManifest(value),
    (error) => error instanceof RuntimeDataError && error.code === "unsupported_runtime_pack",
  );
});

test("rejects manifest count drift", async () => {
  const data = payloads();
  data["manifest.json"].files["genres.json"].counts.genres = 2;
  await assert.rejects(
    () => loadRuntimeBootstrap(reader(data)),
    (error) => error instanceof RuntimeDataError && error.code === "manifest_count_mismatch",
  );
});

test("verifies payload hashes when a hash function is supplied", async () => {
  const data = payloads();
  await assert.rejects(
    () =>
      loadRuntimeBootstrap(reader(data), {
        sha256Hex: async () => "d".repeat(64),
      }),
    (error) => error instanceof RuntimeDataError && error.code === "payload_hash_mismatch",
  );
});

test("rejects renderer sections outside MusicSpec v1", async () => {
  const data = payloads();
  data["core.json"].renderer_profiles[0].sections[0].section_key = "future_magic";
  const bootstrap = await loadRuntimeBootstrap(reader(data));
  assert.throws(
    () => buildCompilerKnowledge(bootstrap),
    (error) => error instanceof RuntimeDataError && error.code === "unsupported_renderer_section",
  );
});


test("lazy-loads and validates the Instrument Library", async () => {
  const data = payloads();
  const bootstrap = await loadRuntimeBootstrap(reader(data));
  const library = await loadRuntimeInstrumentLibrary(
    reader(data),
    bootstrap.manifest,
  );

  assert.equal(library.instruments.families[0].label, "Keys");
  assert.equal(library.instruments.instruments[0].id, "instrument:rhodes");
  assert.equal(
    library.expressions.expressions[0].output_text,
    "warm Rhodes electric piano",
  );
  assert.equal(library.expressions.expressions[0].semantic_coverage, 1);
});


test("lazy-loads and validates the editor payload", async () => {
  const data = payloads();
  const bootstrap = await loadRuntimeBootstrap(reader(data));
  const editor = await loadRuntimeEditor(reader(data), bootstrap.manifest);

  assert.equal(editor.foundation_schema, "vgine-editor-foundation-v1");
  assert.equal(editor.foundation_version, 1);
  assert.equal(editor.parameters[0].section_key, "bpm");
  assert.equal(editor.parameters[0].ui.control, "number");
  assert.deepEqual(editor.parameters[0].ui.recommended_values, [84, 96, 120]);
  assert.equal(editor.parameter_options[0].output_fragment, "laid-back swing");
  assert.equal(editor.parameter_options[0].recommended, true);
  assert.equal(editor.statements[0].output_text, "laid-back swung pocket");
  assert.equal(editor.statements[0].source_frequency, null);
  assert.equal(editor.exclude[0].output_text, "bright glossy pop synths");
});


test("lazy-loads and validates knowledge entries", async () => {
  const data = payloads();
  const bootstrap = await loadRuntimeBootstrap(reader(data));
  const knowledge = await loadRuntimeKnowledge(reader(data), bootstrap.manifest);

  assert.equal(knowledge.entries.length, 2);
  assert.equal(knowledge.entries[0].canonical_label, "Swing");
  assert.equal(
    knowledge.entries[0].definitions[0].text,
    "A rhythmic feel that delays alternating subdivisions.",
  );
  assert.equal(
    knowledge.entries[0].context_definitions[0].context_key,
    "groove",
  );
  assert.equal(knowledge.entries[0].relations[0].strength, 0.8);
});
