import { performance } from "node:perf_hooks";
import { readFile } from "node:fs/promises";
import process from "node:process";

import { createSearchIndex } from "../dist/index.js";

const path = process.argv[2] ?? ".local-data/current/runtime-v1/search.json";
const raw = JSON.parse(await readFile(path, "utf8"));
if (raw.schema !== "vgine-runtime-search-documents-v1" || !Array.isArray(raw.documents)) {
  throw new Error("input is not Runtime Pack v1 search.json");
}

const queries =
  process.argv.length > 3
    ? process.argv.slice(3)
    : [
        "boom bap",
        "guitar",
        "electric guit",
        "transient",
        "warm",
        "drum",
        "vocal",
        "ambient",
        "bass",
        "clean",
      ];

const buildStart = performance.now();
const index = createSearchIndex(raw.documents);
const buildMs = performance.now() - buildStart;

const warmups = 20;
for (let i = 0; i < warmups; i += 1) {
  index.search({ query: queries[i % queries.length], limit: 50 });
}

const samples = [];
for (let round = 0; round < 100; round += 1) {
  const query = queries[round % queries.length];
  const start = performance.now();
  const result = index.search({ query, limit: 50 });
  samples.push({
    query,
    ms: performance.now() - start,
    count: result.length,
  });
}

const times = samples.map((sample) => sample.ms).sort((a, b) => a - b);
const percentile = (p) => times[Math.min(times.length - 1, Math.floor(times.length * p))];

const report = {
  schema: "vgine-search-benchmark-v1",
  documents: index.size,
  build_ms: Number(buildMs.toFixed(3)),
  query_samples: samples.length,
  query_ms: {
    min: Number(times[0].toFixed(3)),
    median: Number(percentile(0.5).toFixed(3)),
    p90: Number(percentile(0.9).toFixed(3)),
    p95: Number(percentile(0.95).toFixed(3)),
    p99: Number(percentile(0.99).toFixed(3)),
    max: Number(times.at(-1).toFixed(3)),
  },
  query_counts: Object.fromEntries(
    queries.map((query) => [
      query,
      index.search({ query, limit: 50 }).length,
    ]),
  ),
};

console.log(JSON.stringify(report, null, 2));
