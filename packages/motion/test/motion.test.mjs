import assert from "node:assert/strict";
import test from "node:test";

import {
  MOTION_DURATIONS_MS,
  MOTION_RECIPES,
  motionRecipe,
} from "../dist/index.js";

test("exports one centralized recipe for every accepted causal motion", () => {
  assert.deepEqual(Object.keys(MOTION_RECIPES).sort(), [
    "expand",
    "insert",
    "layoutMorph",
    "press",
    "promptDiff",
    "remove",
    "select",
    "sheet",
    "swap",
  ]);
});

test("reduced motion never returns a spring", () => {
  for (const name of Object.keys(MOTION_RECIPES)) {
    const recipe = motionRecipe(name, true);
    assert.equal(recipe.kind, "tween");
    assert.ok(recipe.durationMs <= 80);
  }
});

test("duration scale remains intentionally compact", () => {
  assert.deepEqual(MOTION_DURATIONS_MS, {
    instant: 0,
    fast: 120,
    normal: 220,
    slow: 360,
  });
});
