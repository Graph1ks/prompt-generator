import {
  buildCompilerKnowledge,
  loadRuntimeBootstrap,
  loadRuntimeInstrumentLibrary,
  type RuntimeBootstrap,
  type RuntimeInstrumentLibrary,
  type RuntimeCompilerKnowledge,
  type RuntimePackReader,
} from "@vgine/runtime-data";
import { createSearchIndex, type SearchIndex } from "@vgine/search";

export interface StudioRuntime {
  readonly bootstrap: RuntimeBootstrap;
  readonly compilerKnowledge: RuntimeCompilerKnowledge;
  readonly searchIndex: SearchIndex;
  readonly loadInstrumentLibrary: () => Promise<RuntimeInstrumentLibrary>;
}

function createBrowserReader(): RuntimePackReader {
  const base = new URL("runtime-v1/", document.baseURI);
  return {
    async readText(fileName) {
      const response = await fetch(new URL(fileName, base), { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(
          "Runtime Pack request failed for " + fileName + ": HTTP " + response.status,
        );
      }
      return response.text();
    },
  };
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function loadStudioRuntime(): Promise<StudioRuntime> {
  const hashOptions =
    globalThis.crypto?.subtle === undefined ? {} : { sha256Hex };
  const reader = createBrowserReader();
  const bootstrap = await loadRuntimeBootstrap(reader, hashOptions);
  let instrumentLibraryPromise: Promise<RuntimeInstrumentLibrary> | null = null;

  return {
    bootstrap,
    compilerKnowledge: buildCompilerKnowledge(bootstrap),
    searchIndex: createSearchIndex(bootstrap.search.documents),
    loadInstrumentLibrary() {
      instrumentLibraryPromise ??= loadRuntimeInstrumentLibrary(
        reader,
        bootstrap.manifest,
        hashOptions,
      );
      return instrumentLibraryPromise;
    },
  };
}
