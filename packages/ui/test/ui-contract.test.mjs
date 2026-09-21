import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SEMANTIC_COLOR_TOKENS,
  SEMANTIC_LAYOUT_TOKENS,
  VGINE_THEMES,
  isVgineTheme,
} from "../dist/index.js";

test("theme identity is a small explicit contract", () => {
  assert.deepEqual(VGINE_THEMES, ["paradise", "ash"]);
  assert.equal(isVgineTheme("paradise"), true);
  assert.equal(isVgineTheme("ash"), true);
  assert.equal(isVgineTheme("random"), false);
});

test("both themes implement every semantic color token", async () => {
  const css = await readFile(
    new URL("../styles/themes.css", import.meta.url),
    "utf8",
  );
  const ashStart = css.indexOf('[data-theme="ash"]');
  assert.ok(ashStart > 0);
  const paradise = css.slice(0, ashStart);
  const ash = css.slice(ashStart);

  for (const token of SEMANTIC_COLOR_TOKENS) {
    assert.match(paradise, new RegExp(token.replaceAll("-", "\\-")));
    assert.match(ash, new RegExp(token.replaceAll("-", "\\-")));
  }
});

test("layout token contract stays present in base tokens CSS", async () => {
  const css = await readFile(
    new URL("../styles/tokens.css", import.meta.url),
    "utf8",
  );
  for (const token of SEMANTIC_LAYOUT_TOKENS) {
    assert.ok(css.includes(token), `missing ${token}`);
  }
  assert.doesNotMatch(css, /Inter,/);
});
