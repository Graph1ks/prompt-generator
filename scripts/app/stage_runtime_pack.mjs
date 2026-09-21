#!/usr/bin/env node
import { cp, mkdir, readFile, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const root = process.cwd();
const source = resolve(root, process.env.VGINE_RUNTIME_PACK ?? ".local-data/current/runtime-v1");
const destination = resolve(root, "apps/studio/public/runtime-v1");
const work = resolve(root, "apps/studio/public/runtime-v1.work");

const manifestPath = resolve(source, "manifest.json");

try {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.schema !== "vgine-runtime-pack-v1" || manifest.schema_version !== 1) {
    throw new Error("source manifest is not Runtime Pack v1");
  }

  const fileNames = ["manifest.json", ...Object.keys(manifest.files ?? {})];
  if (fileNames.length !== 8) {
    throw new Error(`expected manifest plus 7 Runtime Pack payloads, got ${fileNames.length}`);
  }

  await rm(work, { recursive: true, force: true });
  await mkdir(work, { recursive: true });

  for (const fileName of fileNames) {
    await cp(resolve(source, fileName), resolve(work, fileName));
  }

  await rm(destination, { recursive: true, force: true });
  await rename(work, destination);

  console.log(JSON.stringify({
    status: "ok",
    schema: manifest.schema,
    runtime_build_id: manifest.runtime_build_id,
    source,
    destination,
    files: fileNames.length,
  }, null, 2));
} catch (error) {
  await rm(work, { recursive: true, force: true });
  console.error(
    `Runtime Pack staging failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 2;
}
