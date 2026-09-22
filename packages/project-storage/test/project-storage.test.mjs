import assert from "node:assert/strict";
import test from "node:test";

import { createMusicSpec, setFacetSelection } from "@vgine/music-spec";
import {
  ACTIVE_PROJECT_ID,
  PROJECT_DOCUMENT_SCHEMA,
  ProjectStorageError,
  createMemoryProjectStorage,
  createProjectDocument,
  parseProjectDocument,
} from "../dist/index.js";

test("creates and parses a v1 project document", () => {
  const spec = setFacetSelection(createMusicSpec("genre:boom-bap"), "groove", {
    id: "statement:groove:laid-back",
    kind: "statement",
    value: "laid-back swung pocket",
    origin: "statement",
    locked: false,
  });
  const project = createProjectDocument(ACTIVE_PROJECT_ID, spec, {
    createdAt: "2026-09-22T07:00:00.000Z",
    updatedAt: "2026-09-22T07:01:00.000Z",
    manualStyleOverride: "[Genre: Boom Bap]",
    activeChapter: "pulse",
    genreSkipAcknowledged: true,
  });

  assert.equal(project.schema, PROJECT_DOCUMENT_SCHEMA);
  assert.equal(project.music_spec.facets.groove.selections.length, 1);
  assert.equal(project.output.manual_style_override, "[Genre: Boom Bap]");
  assert.equal(project.workspace.active_chapter, "pulse");
  assert.deepEqual(parseProjectDocument(project), project);
});

test("rejects unsupported project schemas and invalid MusicSpec state", () => {
  assert.throws(
    () =>
      parseProjectDocument({
        schema: "future-project",
      }),
    (error) =>
      error instanceof ProjectStorageError &&
      error.code === "unsupported_project_document",
  );

  assert.throws(
    () =>
      parseProjectDocument({
        schema: PROJECT_DOCUMENT_SCHEMA,
        id: ACTIVE_PROJECT_ID,
        title: null,
        created_at: "2026-09-22T07:00:00.000Z",
        updated_at: "2026-09-22T07:01:00.000Z",
        music_spec: {
          schema_version: "music-spec-v1",
          genre_influences: [],
          facets: { future_magic: {} },
          exclude: [],
        },
        output: { manual_style_override: null },
        workspace: {
          active_chapter: "dna",
          genre_skip_acknowledged: false,
        },
      }),
    /Invalid MusicSpec/u,
  );
});

test("memory adapter implements load/save/list/delete contract", async () => {
  const storage = createMemoryProjectStorage();
  const older = createProjectDocument("older", createMusicSpec(), {
    createdAt: "2026-09-22T06:00:00.000Z",
    updatedAt: "2026-09-22T06:01:00.000Z",
  });
  const newer = createProjectDocument("newer", createMusicSpec(), {
    createdAt: "2026-09-22T07:00:00.000Z",
    updatedAt: "2026-09-22T07:01:00.000Z",
  });

  await storage.save(older);
  await storage.save(newer);

  assert.equal((await storage.load("older"))?.id, "older");
  assert.deepEqual(
    (await storage.list()).map((entry) => entry.id),
    ["newer", "older"],
  );

  await storage.delete("older");
  assert.equal(await storage.load("older"), null);
});
