import assert from "node:assert/strict";
import test from "node:test";

import {
  MUSIC_SPEC_SCHEMA_VERSION,
  createMusicSpec,
  parseMusicSpec,
  removeGenreInfluence,
  resetMusicSpec,
  resetMusicSpecFacets,
  setFacetSelection,
  setFacetCustomText,
  removeFacetSelection,
  hasFacetSelection,
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


test("adds, replaces and removes stable facet selections", () => {
  let spec = createMusicSpec();
  spec = setFacetSelection(spec, "instruments", {
    id: "instrument-expression:warm-rhodes",
    kind: "option",
    value: "warm Rhodes electric piano",
    origin: "user",
    locked: false,
  });
  assert.equal(
    hasFacetSelection(spec, "instruments", "instrument-expression:warm-rhodes"),
    true,
  );
  assert.equal(spec.facets.instruments.selections.length, 1);

  spec = setFacetSelection(spec, "instruments", {
    id: "instrument-expression:warm-rhodes",
    kind: "option",
    value: "warm saturated Rhodes electric piano",
    origin: "user",
    locked: false,
  });
  assert.equal(spec.facets.instruments.selections.length, 1);
  assert.equal(
    spec.facets.instruments.selections[0].value,
    "warm saturated Rhodes electric piano",
  );

  spec = removeFacetSelection(
    spec,
    "instruments",
    "instrument-expression:warm-rhodes",
  );
  assert.equal(spec.facets.instruments.selections.length, 0);
  assert.equal(validateMusicSpec(spec).valid, true);
});


test("sets and clears facet custom text without disturbing selections", () => {
  let spec = createMusicSpec();
  spec = setFacetSelection(spec, "texture", {
    id: "statement:texture:test",
    kind: "statement",
    value: "grainy analog texture",
    origin: "user",
    locked: false,
  });
  spec = setFacetCustomText(spec, "texture", "subtle tape flutter");
  assert.equal(spec.facets.texture.custom_text, "subtle tape flutter");
  assert.equal(spec.facets.texture.selections.length, 1);

  spec = setFacetCustomText(spec, "texture", null);
  assert.equal(spec.facets.texture.custom_text, null);
  assert.equal(spec.facets.texture.selections.length, 1);
  assert.equal(validateMusicSpec(spec).valid, true);
});
