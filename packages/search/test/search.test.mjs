import assert from "node:assert/strict";
import test from "node:test";

import {
  createSearchIndex,
  handleSearchRequest,
  normalizeSearchText,
} from "../dist/index.js";

const documents = [
  {
    id: "genre:boom-bap",
    kind: "genre",
    label: "Boom Bap",
    terms: ["Hip-Hop", "Boom-Bap"],
  },
  {
    id: "expr:clean-guitar",
    kind: "instrument_expression",
    label: "clean electric guitar",
    terms: ["Electric Guitar", "clean"],
  },
  {
    id: "knowledge:transient",
    kind: "knowledge",
    label: "Transient",
    terms: ["Attack Transient"],
    definition: "The initial burst of a sound.",
  },
  {
    id: "knowledge:transient-shaping",
    kind: "knowledge",
    label: "Transient Shaping",
    terms: ["Transient Designer"],
    definition: "Envelope-focused dynamics processing.",
  },
];

test("normalizes punctuation and diacritics deterministically", () => {
  assert.equal(normalizeSearchText("  Déjà-Vu / FX  "), "deja vu fx");
});

test("ranks exact labels before aliases/prefixes", () => {
  const index = createSearchIndex(documents);
  const result = index.search({ query: "transient" });
  assert.equal(result[0].id, "knowledge:transient");
  assert.equal(result[0].score, 1000);
  assert.equal(result[1].id, "knowledge:transient-shaping");
});

test("finds alias/category terms without duplicating documents", () => {
  const index = createSearchIndex(documents);
  const result = index.search({ query: "hip hop" });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "genre:boom-bap");
  assert.equal(result[0].matchedTerm, "Hip-Hop");
});

test("supports token-prefix matching across multiword expressions", () => {
  const index = createSearchIndex(documents);
  const result = index.search({ query: "elec guit" });
  assert.equal(result[0].id, "expr:clean-guitar");
});

test("filters by document kind and enforces result limits", () => {
  const index = createSearchIndex(documents);
  const result = index.search({
    query: "transient",
    kinds: ["knowledge"],
    limit: 1,
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].kind, "knowledge");
});

test("uses a worker-ready request/response envelope", () => {
  const index = createSearchIndex(documents);
  const response = handleSearchRequest(index, {
    type: "search",
    requestId: "req-1",
    query: { query: "clean" },
  });
  assert.equal(response.type, "search_result");
  assert.equal(response.requestId, "req-1");
  assert.equal(response.results[0].id, "expr:clean-guitar");
});
