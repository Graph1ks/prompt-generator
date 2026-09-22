import assert from "node:assert/strict";
import test from "node:test";

import {
  MUSIC_SPEC_SCHEMA_VERSION,
  createMusicSpec,
  parseMusicSpec,
  removeGenreInfluence,
  resetMusicSpec,
  resetMusicSpecFacets,
  setGenreInfluence,
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


test("creates and updates ordered genre influence state", () => {
  let spec = createMusicSpec("genre:boom-bap");
  spec = setGenreInfluence(spec, "accent", "genre:ambient");
  spec = setGenreInfluence(spec, "fusion", "genre:jazz");
  assert.deepEqual(
    spec.genre_influences.map((entry) => [entry.role, entry.genre_id]),
    [
      ["foundation", "genre:boom-bap"],
      ["fusion", "genre:jazz"],
      ["accent", "genre:ambient"],
    ],
  );

  spec = setGenreInfluence(spec, "fusion", "genre:soul");
  assert.equal(spec.genre_influences[1].genre_id, "genre:soul");

  spec = removeGenreInfluence(spec, "accent");
  assert.deepEqual(
    spec.genre_influences.map((entry) => entry.role),
    ["foundation", "fusion"],
  );
  assert.equal(validateMusicSpec(spec).valid, true);
});


test("accepts genre-free MusicSpec projects", () => {
  const spec = createMusicSpec();
  assert.deepEqual(spec.genre_influences, []);
  assert.equal(validateMusicSpec(spec).valid, true);
});

test("can clear Foundation and reset a chapter without invalidating the project", () => {
  let spec = createMusicSpec("genre:boom-bap");
  spec = {
    ...spec,
    facets: {
      era: {
        locked: false,
        selections: [
          { kind: "freeform", value: "1990s", origin: "user", locked: false },
        ],
        custom_text: null,
      },
      drums: {
        locked: false,
        selections: [
          { kind: "freeform", value: "dry drums", origin: "user", locked: false },
        ],
        custom_text: null,
      },
    },
  };

  spec = removeGenreInfluence(spec, "foundation");
  assert.deepEqual(spec.genre_influences, []);
  assert.equal(validateMusicSpec(spec).valid, true);

  spec = resetMusicSpecFacets(spec, ["genre", "era"]);
  assert.equal(spec.facets.era, undefined);
  assert.ok(spec.facets.drums);
  assert.equal(validateMusicSpec(spec).valid, true);

  assert.deepEqual(resetMusicSpec(), createMusicSpec());
});
