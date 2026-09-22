import { parseMusicSpec, type MusicSpec } from "@vgine/music-spec";

export const PROJECT_DOCUMENT_SCHEMA = "vgine-project-v1" as const;
export const ACTIVE_PROJECT_ID = "active" as const;

export interface ProjectOutputState {
  readonly manual_style_override: string | null;
}

export interface ProjectWorkspaceState {
  readonly active_chapter: string | null;
  readonly genre_skip_acknowledged: boolean;
}

export interface ProjectDocument {
  readonly schema: typeof PROJECT_DOCUMENT_SCHEMA;
  readonly id: string;
  readonly title: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly music_spec: MusicSpec;
  readonly output: ProjectOutputState;
  readonly workspace: ProjectWorkspaceState;
}

export interface ProjectSummary {
  readonly id: string;
  readonly title: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CreateProjectDocumentOptions {
  readonly title?: string | null;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly manualStyleOverride?: string | null;
  readonly activeChapter?: string | null;
  readonly genreSkipAcknowledged?: boolean;
}

export interface ProjectStorage {
  load(id: string): Promise<ProjectDocument | null>;
  save(project: ProjectDocument): Promise<void>;
  delete(id: string): Promise<void>;
  list(): Promise<readonly ProjectSummary[]>;
}


export interface DuplicateProjectDocumentOptions {
  readonly title?: string | null;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export function normalizeProjectTitle(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = value.trim().replace(/\s+/gu, " ");
  return normalized.length > 0 ? normalized : null;
}

export function serializeProjectDocument(project: ProjectDocument): string {
  return JSON.stringify(parseProjectDocument(project), null, 2) + "\n";
}

export function parseProjectDocumentJson(text: string): ProjectDocument {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new ProjectStorageError(
      "invalid_project_json",
      error instanceof Error ? error.message : "Project JSON is invalid",
    );
  }
  return parseProjectDocument(value);
}

export function duplicateProjectDocument(
  source: ProjectDocument,
  id: string,
  options: DuplicateProjectDocumentOptions = {},
): ProjectDocument {
  const parsed = parseProjectDocument(source);
  const now = new Date().toISOString();
  return createProjectDocument(id, parsed.music_spec, {
    title: options.title === undefined
      ? parsed.title
      : normalizeProjectTitle(options.title),
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
    manualStyleOverride: parsed.output.manual_style_override,
    activeChapter: parsed.workspace.active_chapter,
    genreSkipAcknowledged: parsed.workspace.genre_skip_acknowledged,
  });
}

export class ProjectStorageError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ProjectStorageError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ProjectStorageError(
      "invalid_project_document",
      path + " must be a non-empty string",
    );
  }
  return value;
}

function nullableString(value: unknown, path: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new ProjectStorageError(
      "invalid_project_document",
      path + " must be a string or null",
    );
  }
  return value;
}

function validTimestamp(value: unknown, path: string): string {
  const text = requireString(value, path);
  if (!Number.isFinite(Date.parse(text))) {
    throw new ProjectStorageError(
      "invalid_project_document",
      path + " must be an ISO-compatible timestamp",
    );
  }
  return text;
}

export function createProjectDocument(
  id: string,
  musicSpec: MusicSpec,
  options: CreateProjectDocumentOptions = {},
): ProjectDocument {
  const now = new Date().toISOString();
  const createdAt = options.createdAt ?? now;
  const updatedAt = options.updatedAt ?? now;

  return {
    schema: PROJECT_DOCUMENT_SCHEMA,
    id: requireString(id, "id"),
    title: normalizeProjectTitle(options.title),
    created_at: validTimestamp(createdAt, "created_at"),
    updated_at: validTimestamp(updatedAt, "updated_at"),
    music_spec: parseMusicSpec(musicSpec),
    output: {
      manual_style_override: options.manualStyleOverride ?? null,
    },
    workspace: {
      active_chapter: options.activeChapter ?? null,
      genre_skip_acknowledged: options.genreSkipAcknowledged ?? false,
    },
  };
}

export function parseProjectDocument(value: unknown): ProjectDocument {
  if (!isRecord(value) || value.schema !== PROJECT_DOCUMENT_SCHEMA) {
    throw new ProjectStorageError(
      "unsupported_project_document",
      "Project document must use " + PROJECT_DOCUMENT_SCHEMA,
    );
  }

  const output = value.output;
  if (!isRecord(output)) {
    throw new ProjectStorageError(
      "invalid_project_document",
      "output must be an object",
    );
  }

  const workspace = value.workspace;
  if (!isRecord(workspace)) {
    throw new ProjectStorageError(
      "invalid_project_document",
      "workspace must be an object",
    );
  }

  if (typeof workspace.genre_skip_acknowledged !== "boolean") {
    throw new ProjectStorageError(
      "invalid_project_document",
      "workspace.genre_skip_acknowledged must be boolean",
    );
  }

  return {
    schema: PROJECT_DOCUMENT_SCHEMA,
    id: requireString(value.id, "id"),
    title: normalizeProjectTitle(nullableString(value.title, "title")),
    created_at: validTimestamp(value.created_at, "created_at"),
    updated_at: validTimestamp(value.updated_at, "updated_at"),
    music_spec: parseMusicSpec(value.music_spec),
    output: {
      manual_style_override: nullableString(
        output.manual_style_override,
        "output.manual_style_override",
      ),
    },
    workspace: {
      active_chapter: nullableString(
        workspace.active_chapter,
        "workspace.active_chapter",
      ),
      genre_skip_acknowledged: workspace.genre_skip_acknowledged,
    },
  };
}

export function createMemoryProjectStorage(
  initial: readonly ProjectDocument[] = [],
): ProjectStorage {
  const records = new Map(
    initial.map((project) => {
      const parsed = parseProjectDocument(project);
      return [parsed.id, parsed] as const;
    }),
  );

  return {
    async load(id) {
      return records.get(id) ?? null;
    },
    async save(project) {
      const parsed = parseProjectDocument(project);
      records.set(parsed.id, parsed);
    },
    async delete(id) {
      records.delete(id);
    },
    async list() {
      return [...records.values()]
        .map(({ id, title, created_at, updated_at }) => ({
          id,
          title,
          created_at,
          updated_at,
        }))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    },
  };
}

const DEFAULT_DB_NAME = "vgine-projects";
const DEFAULT_STORE_NAME = "projects";

export interface IndexedDbProjectStorageOptions {
  readonly databaseName?: string;
  readonly storeName?: string;
  readonly indexedDb?: IDBFactory;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new ProjectStorageError(
          "indexeddb_request_failed",
          request.error?.message ?? "IndexedDB request failed",
        ),
      );
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        new ProjectStorageError(
          "indexeddb_transaction_failed",
          transaction.error?.message ?? "IndexedDB transaction failed",
        ),
      );
    transaction.onabort = () =>
      reject(
        new ProjectStorageError(
          "indexeddb_transaction_aborted",
          transaction.error?.message ?? "IndexedDB transaction aborted",
        ),
      );
  });
}

export function createIndexedDbProjectStorage(
  options: IndexedDbProjectStorageOptions = {},
): ProjectStorage {
  const databaseName = options.databaseName ?? DEFAULT_DB_NAME;
  const storeName = options.storeName ?? DEFAULT_STORE_NAME;
  const factory = options.indexedDb ?? globalThis.indexedDB;

  let databasePromise: Promise<IDBDatabase> | null = null;

  function openDatabase(): Promise<IDBDatabase> {
    if (!factory) {
      return Promise.reject(
        new ProjectStorageError(
          "indexeddb_unavailable",
          "IndexedDB is unavailable in this environment",
        ),
      );
    }
    if (databasePromise) return databasePromise;

    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(databaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        databasePromise = null;
        reject(
          new ProjectStorageError(
            "indexeddb_open_failed",
            request.error?.message ?? "Unable to open IndexedDB",
          ),
        );
      };
      request.onblocked = () => {
        databasePromise = null;
        reject(
          new ProjectStorageError(
            "indexeddb_open_blocked",
            "IndexedDB upgrade is blocked by another open Studio instance",
          ),
        );
      };
    });

    return databasePromise;
  }

  return {
    async load(id) {
      const database = await openDatabase();
      const transaction = database.transaction(storeName, "readonly");
      const done = transactionDone(transaction);
      const result = await requestResult(
        transaction.objectStore(storeName).get(id),
      );
      await done;
      return result === undefined ? null : parseProjectDocument(result);
    },

    async save(project) {
      const parsed = parseProjectDocument(project);
      const database = await openDatabase();
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(parsed);
      await transactionDone(transaction);
    },

    async delete(id) {
      const database = await openDatabase();
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).delete(id);
      await transactionDone(transaction);
    },

    async list() {
      const database = await openDatabase();
      const transaction = database.transaction(storeName, "readonly");
      const done = transactionDone(transaction);
      const values = await requestResult(
        transaction.objectStore(storeName).getAll(),
      );
      await done;
      return values
        .map((value) => parseProjectDocument(value))
        .map(({ id, title, created_at, updated_at }) => ({
          id,
          title,
          created_at,
          updated_at,
        }))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    },
  };
}


export interface UserDataStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export function createMemoryUserDataStorage(
  initial: Readonly<Record<string, unknown>> = {},
): UserDataStorage {
  const records = new Map<string, unknown>(Object.entries(initial));
  return {
    async get<T>(key: string) {
      return (records.has(key) ? records.get(key) : null) as T | null;
    },
    async set<T>(key: string, value: T) {
      records.set(key, value);
    },
    async delete(key: string) {
      records.delete(key);
    },
  };
}

export interface IndexedDbUserDataStorageOptions {
  readonly databaseName?: string;
  readonly storeName?: string;
  readonly indexedDb?: IDBFactory;
}

export function createIndexedDbUserDataStorage(
  options: IndexedDbUserDataStorageOptions = {},
): UserDataStorage {
  const databaseName = options.databaseName ?? "vgine-user-data";
  const storeName = options.storeName ?? "entries";
  const factory = options.indexedDb ?? globalThis.indexedDB;

  let databasePromise: Promise<IDBDatabase> | null = null;

  function openDatabase(): Promise<IDBDatabase> {
    if (!factory) {
      return Promise.reject(
        new ProjectStorageError(
          "indexeddb_unavailable",
          "IndexedDB is unavailable in this environment",
        ),
      );
    }
    if (databasePromise) return databasePromise;

    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(databaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        databasePromise = null;
        reject(
          new ProjectStorageError(
            "indexeddb_open_failed",
            request.error?.message ?? "Unable to open IndexedDB user data",
          ),
        );
      };
      request.onblocked = () => {
        databasePromise = null;
        reject(
          new ProjectStorageError(
            "indexeddb_open_blocked",
            "IndexedDB user-data upgrade is blocked by another Studio instance",
          ),
        );
      };
    });

    return databasePromise;
  }

  return {
    async get<T>(key: string) {
      const database = await openDatabase();
      const transaction = database.transaction(storeName, "readonly");
      const done = transactionDone(transaction);
      const record = await requestResult<{ key: string; value: T } | undefined>(
        transaction.objectStore(storeName).get(key),
      );
      await done;
      return record?.value ?? null;
    },

    async set<T>(key: string, value: T) {
      const database = await openDatabase();
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put({ key, value });
      await transactionDone(transaction);
    },

    async delete(key: string) {
      const database = await openDatabase();
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).delete(key);
      await transactionDone(transaction);
    },
  };
}
