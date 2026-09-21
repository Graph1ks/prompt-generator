import assert from "node:assert/strict";
import test from "node:test";

import {
  MUSIC_SPEC_SCHEMA_VERSION,
  parseMusicSpec,
  validateMusicSpec,
} from "../dist/index.js";

function baseSpec() {
  return {
    schema_version: MUSIC_SPEC_SCHEMA_VERSION,
    genre_influences: [
      {
        role: "foundation",
        genre_id: "genre:boom-bap",
        routing: ["groove", "drums", "bass"],
        locked: false,
      },
    ],
    facets: {},
    exclude: [],
  };
}

test("accepts a minimal valid MusicSpec v1", () => {
  const spec = baseSpec();
  const result = validateMusicSpec(spec);
  assert.equal(result.valid, true);
  assert.equal(parseMusicSpec(spec), spec);
});

test("rejects unknown v1 facets instead of silently reinterpreting them", () => {
  const spec = baseSpec();
  spec.facets.future_magic = { locked: false, selections: [], custom_text: null };
  const result = validateMusicSpec(spec);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((entry) => entry.code === "unknown_facet"));
});

test("rejects duplicate genre roles and duplicate routing facets", () => {
  const spec = baseSpec();
  spec.genre_influences.push({
    role: "foundation",
    genre_id: "genre:jazz",
    routing: ["groove", "groove"],
    locked: false,
  });
  const result = validateMusicSpec(spec);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((entry) => entry.code === "duplicate_genre_role"));
  assert.ok(result.issues.some((entry) => entry.code === "duplicate_routing_facet"));
});
