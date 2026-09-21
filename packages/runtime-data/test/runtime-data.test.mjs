import assert from "node:assert/strict";
import test from "node:test";

import {
  RuntimeDataError,
  buildCompilerKnowledge,
  loadRuntimeBootstrap,
  parseRuntimeManifest,
} from "../dist/index.js";

const hash = "a".repeat(64);

function manifest() {
  return {
    schema: "vgine-runtime-pack-v1",
    schema_version: 1,
    runtime_build_id: "b".repeat(64),
    knowledge_db_sha256: "c".repeat(64),
    knowledge_build_meta: { build_revision: "test" },
    files: {
      "core.json": { sha256: hash, bytes: 1, counts: { major_genres: 1, sections: 1, renderer_profiles: 1 } },
      "genres.json": { sha256: hash, bytes: 1, counts: { genres: 1 } },
      "instruments.json": { sha256: hash, bytes: 1, counts: { families: 0, instruments: 0 } },
      "instrument-expressions.json": { sha256: hash, bytes: 1, counts: { expressions: 0 } },
      "editor.json": { sha256: hash, bytes: 1, counts: { parameters: 0, parameter_options: 0, statements: 0, exclude: 0 } },
      "knowledge.json": { sha256: hash, bytes: 1, counts: { entries: 0 } },
      "search.json": { sha256: hash, bytes: 1, counts: { documents: 1 } },
    },
  };
}

function payloads() {
  return {
    "manifest.json": manifest(),
    "core.json": {
      schema: "vgine-runtime-core-v1",
      major_genres: [{ id: "major:hip-hop", label: "Hip-Hop" }],
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
    "search.json": {
      schema: "vgine-runtime-search-documents-v1",
      documents: [
        { id: "genre:boom-bap", kind: "genre", label: "Boom Bap", terms: ["Hip-Hop"] },
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

  assert.equal(bootstrap.search.documents.length, 1);
  assert.equal(compilerKnowledge.runtimeBuildId, "b".repeat(64));
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
