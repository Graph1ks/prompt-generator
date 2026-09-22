import assert from "node:assert/strict";
import test from "node:test";

import { compileMusicSpec, countCharacters } from "../dist/index.js";

const sections = [
  ["genre", "Genre"],
  ["era", "Era"],
  ["bpm", "BPM"],
  ["key_mode", "Key/Mode"],
  ["groove", "Groove"],
  ["melody", "Melody"],
  ["harmony", "Harmony"],
  ["drums", "Drums"],
  ["bass", "Bass"],
  ["instruments", "Instruments"],
  ["exciters", "Exciters"],
  ["texture", "Texture"],
  ["vocal", "Vocal"],
  ["dynamics", "Dynamics"],
  ["space_mix", "Space/Mix"],
  ["production", "Production"],
  ["structure", "Structure"],
].map(([sectionKey, label], index) => ({ sectionKey, label, order: index + 1 }));

function knowledge(maxCharacters = 1000) {
  return {
    runtimeBuildId: "runtime:test",
    genreLabels: {
      "genre:boom-bap": "Boom Bap",
      "genre:jazz": "Jazz",
    },
    rendererProfiles: {
      "suno-structured-v1": {
        id: "suno-structured-v1",
        maxCharacters,
        overflowPolicy: "semantic-budget",
        sections,
      },
    },
  };
}

function baseSpec() {
  return {
    schema_version: "music-spec-v1",
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

function selection(value, origin, locked = false) {
  return { kind: "freeform", value, origin, locked };
}

test("renders canonical section order and keeps Exclude separate", () => {
  const spec = baseSpec();
  spec.genre_influences.push({
    role: "fusion",
    genre_id: "genre:jazz",
    routing: ["harmony"],
    locked: false,
  });
  spec.facets.bpm = {
    locked: false,
    selections: [selection("92 BPM", "user")],
    custom_text: null,
  };
  spec.facets.groove = {
    locked: false,
    selections: [selection("laid-back swung pocket", "user")],
    custom_text: null,
  };
  spec.exclude = [
    { text: "glossy pop synths", origin: "user", locked: false },
    { text: "cavernous drum reverb", origin: "user", locked: false },
  ];

  const result = compileMusicSpec(spec, knowledge());
  assert.equal(result.budget.valid, true);
  assert.equal(
    result.styleText,
    "[Genre: Foundation: Boom Bap, Fusion: Jazz]\n[BPM: 92 BPM]\n[Groove: laid-back swung pocket]",
  );
  assert.equal(result.excludeText, "glossy pop synths, cavernous drum reverb");
  assert.equal(result.styleText.includes("Exclude"), false);
});

test("drops derived material before explicit user intent when over budget", () => {
  const spec = baseSpec();
  spec.facets.groove = {
    locked: false,
    selections: [
      selection("human pocket", "user"),
      selection("long deterministic derived embellishment that is expendable", "derived"),
    ],
    custom_text: null,
  };

  const full = compileMusicSpec(spec, knowledge(1000));
  const reducedBudget = full.budget.used - 20;
  const result = compileMusicSpec(spec, knowledge(reducedBudget));

  assert.equal(result.budget.valid, true);
  assert.match(result.styleText, /human pocket/);
  assert.doesNotMatch(result.styleText, /derived embellishment/);
  assert.ok(
    result.compactions.some(
      (entry) => entry.kind === "omit" && entry.origin === "derived",
    ),
  );
});

test("never truncates protected custom text and reports a budget conflict", () => {
  const spec = baseSpec();
  spec.facets.production = {
    locked: false,
    selections: [],
    custom_text:
      "preserve this explicit custom production direction exactly as a complete semantic item",
  };

  const result = compileMusicSpec(spec, knowledge(45));
  assert.equal(result.budget.valid, false);
  assert.match(
    result.styleText,
    /preserve this explicit custom production direction/,
  );
  assert.ok(result.diagnostics.some((entry) => entry.code === "budget_conflict"));
  assert.equal(result.styleText.endsWith("]"), true);
});

test("counts Unicode code points instead of UTF-16 code units", () => {
  assert.equal(countCharacters("A🎛️B"), 4);
});

test("is deterministic for the same MusicSpec and runtime knowledge", () => {
  const spec = baseSpec();
  spec.facets.texture = {
    locked: false,
    selections: [
      selection("dusty", "user"),
      selection("dusty", "derived"),
    ],
    custom_text: null,
  };
  const first = compileMusicSpec(spec, knowledge());
  const second = compileMusicSpec(spec, knowledge());
  assert.deepEqual(second, first);
});


test("compiles a valid genre-free MusicSpec without fabricating a Genre section", () => {
  const spec = {
    schema_version: "music-spec-v1",
    genre_influences: [],
    facets: {
      groove: {
        locked: false,
        selections: [
          { kind: "freeform", value: "laid-back pocket", origin: "user", locked: false },
        ],
        custom_text: null,
      },
    },
    exclude: [],
  };

  const result = compileMusicSpec(spec, knowledge());
  assert.equal(result.budget.valid, true);
  assert.equal(result.sections.some((section) => section.sectionKey === "genre"), false);
  assert.match(result.styleText, /\[Groove: laid-back pocket\]/u);
});
