import { isFacetKey, type FacetKey } from "@vgine/music-spec";

export const RUNTIME_PACK_SCHEMA = "vgine-runtime-pack-v1" as const;
export const RUNTIME_PACK_SCHEMA_VERSION = 1 as const;

export const RUNTIME_PAYLOAD_FILES = [
  "core.json",
  "genres.json",
  "instruments.json",
  "instrument-expressions.json",
  "editor.json",
  "knowledge.json",
  "search.json",
] as const;

export type RuntimePayloadFileName = (typeof RUNTIME_PAYLOAD_FILES)[number];

export interface RuntimeManifestFile {
  readonly sha256: string;
  readonly bytes: number;
  readonly counts: Readonly<Record<string, number>>;
}

export interface RuntimeManifest {
  readonly schema: typeof RUNTIME_PACK_SCHEMA;
  readonly schema_version: typeof RUNTIME_PACK_SCHEMA_VERSION;
  readonly runtime_build_id: string;
  readonly knowledge_db_sha256: string;
  readonly editor_foundation_sha256?: string;
  readonly product_knowledge_foundation_sha256?: string;
  readonly knowledge_build_meta: Readonly<Record<string, string>>;
  readonly files: Readonly<Record<RuntimePayloadFileName, RuntimeManifestFile>>;
}

export interface RuntimeMajorGenre {
  readonly id: string;
  readonly label: string;
  readonly source_ordinal: number;
  readonly knowledge_entry_id: string | null;
}

export interface RuntimeCoreSection {
  readonly key: string;
  readonly label: string;
  readonly output_order: number;
  readonly optional: boolean;
  readonly easy_visible: boolean;
  readonly advanced_visible: boolean;
  readonly knowledge_entry_id: string | null;
  readonly notes: string | null;
}

export interface RuntimeRendererSection {
  readonly section_key: string;
  readonly output_label_override: string | null;
  readonly output_order: number;
  readonly emit_when_empty: boolean;
  readonly soft_max_characters: number | null;
  readonly source_sample_count: number | null;
}

export interface RuntimeRendererProfile {
  readonly id: string;
  readonly label: string;
  readonly version: number;
  readonly active: boolean;
  readonly max_characters: number;
  readonly overflow_policy: string;
  readonly notes: string | null;
  readonly sections: readonly RuntimeRendererSection[];
}

export interface RuntimeCorePayload {
  readonly schema: "vgine-runtime-core-v1";
  readonly major_genres: readonly RuntimeMajorGenre[];
  readonly sections: readonly RuntimeCoreSection[];
  readonly renderer_profiles: readonly RuntimeRendererProfile[];
}

export interface RuntimeGenreAlias {
  readonly surface: string;
  readonly normalized: string;
  readonly kind: string;
}

export interface RuntimeGenre {
  readonly id: string;
  readonly label: string;
  readonly normalized: string;
  readonly knowledge_entry_id: string | null;
  readonly major_genre_ids: readonly string[];
  readonly aliases: readonly RuntimeGenreAlias[];
  readonly traits: readonly Readonly<Record<string, unknown>>[];
}

export interface RuntimeGenresPayload {
  readonly schema: "vgine-runtime-genres-v1";
  readonly genres: readonly RuntimeGenre[];
}

export interface RuntimeInstrumentFamily {
  readonly id: string;
  readonly label: string;
  readonly knowledge_entry_id: string | null;
}

export interface RuntimeInstrument {
  readonly id: string;
  readonly label: string;
  readonly normalized: string;
  readonly family_id: string | null;
  readonly knowledge_entry_id: string | null;
  readonly aliases: readonly string[];
  readonly traits: readonly Readonly<Record<string, unknown>>[];
}

export interface RuntimeInstrumentsPayload {
  readonly schema: "vgine-runtime-instruments-v1";
  readonly families: readonly RuntimeInstrumentFamily[];
  readonly instruments: readonly RuntimeInstrument[];
}

export interface RuntimeExpressionInstrumentLink {
  readonly instrument_id: string;
  readonly role: string;
  readonly ordinal: number;
}

export interface RuntimeExpressionConceptLink {
  readonly entry_id: string;
  readonly role: string | null;
  readonly ordinal: number;
}

export interface RuntimeInstrumentExpression {
  readonly id: string;
  readonly label: string;
  readonly normalized: string;
  readonly output_text: string;
  readonly source_kind: string;
  readonly status: string;
  readonly selectable: boolean;
  readonly base_instrument_id: string | null;
  readonly occurrence_count: number;
  readonly track_count: number;
  readonly decomposition_state: string;
  readonly semantic_coverage: number;
  readonly residual_terms: readonly unknown[];
  readonly instruments: readonly RuntimeExpressionInstrumentLink[];
  readonly concepts: readonly RuntimeExpressionConceptLink[];
}

export interface RuntimeInstrumentExpressionsPayload {
  readonly schema: "vgine-runtime-instrument-expressions-v1";
  readonly expressions: readonly RuntimeInstrumentExpression[];
}

export interface RuntimeInstrumentLibrary {
  readonly instruments: RuntimeInstrumentsPayload;
  readonly expressions: RuntimeInstrumentExpressionsPayload;
}

export type RuntimeParameterValueType =
  | "enum"
  | "multi"
  | "number"
  | "text"
  | "boolean"
  | "relation";

export interface RuntimeParameterNumberUi {
  readonly control: "number";
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit: string | null;
  readonly recommended_values: readonly number[];
}

export type RuntimeParameterUi = RuntimeParameterNumberUi;

export interface RuntimeParameter {
  readonly id: string;
  readonly section_key: FacetKey;
  readonly label: string;
  readonly canonical_slug: string;
  readonly value_type: RuntimeParameterValueType;
  readonly easy_visible: boolean;
  readonly advanced_visible: boolean;
  readonly allow_custom_text: boolean;
  readonly knowledge_entry_id: string | null;
  readonly sort_order: number;
  readonly ui?: RuntimeParameterUi;
}

export interface RuntimeParameterOption {
  readonly id: string;
  readonly parameter_id: string;
  readonly label: string;
  readonly canonical_slug: string;
  readonly output_fragment: string;
  readonly easy_visible: boolean;
  readonly advanced_visible: boolean;
  readonly knowledge_entry_id: string | null;
  readonly sort_order: number;
  readonly recommended?: boolean;
}

export interface RuntimeStatementConceptLink {
  readonly entry_id: string;
  readonly role: string | null;
  readonly ordinal: number;
}

export interface RuntimeStatementOptionLink {
  readonly option_id: string;
  readonly ordinal: number;
}

export interface RuntimeStatement {
  readonly id: string;
  readonly section_key: FacetKey;
  readonly label: string;
  readonly output_text: string;
  readonly mode_scope: string;
  readonly statement_kind: string;
  readonly source_frequency: number | null;
  readonly sort_order?: number;
  readonly concepts: readonly RuntimeStatementConceptLink[];
  readonly options: readonly RuntimeStatementOptionLink[];
}

export interface RuntimeExcludeEntry {
  readonly id: string;
  readonly label: string;
  readonly output_text: string;
  readonly knowledge_entry_id: string | null;
  readonly sort_order?: number;
}

export interface RuntimeEditorPayload {
  readonly schema: "vgine-runtime-editor-v1";
  readonly foundation_schema?: string;
  readonly foundation_version?: number;
  readonly parameters: readonly RuntimeParameter[];
  readonly parameter_options: readonly RuntimeParameterOption[];
  readonly statements: readonly RuntimeStatement[];
  readonly exclude: readonly RuntimeExcludeEntry[];
}

export type RuntimeKnowledgeDifficulty =
  | "beginner"
  | "intermediate"
  | "advanced";

export interface RuntimeTermVariant {
  readonly surface: string;
  readonly normalized: string;
  readonly locale: string;
  readonly match_kind: string;
  readonly match_priority: number;
  readonly is_primary: boolean;
}

export interface RuntimeDefinition {
  readonly locale: string;
  readonly kind: string;
  readonly text: string;
  readonly revision: number;
}

export interface RuntimeContextDefinition {
  readonly locale: string;
  readonly context_type: string;
  readonly context_key: string;
  readonly text: string;
  readonly revision: number;
}

export interface RuntimeKnowledgeRelation {
  readonly relation_type: string;
  readonly target_entry_id: string;
  readonly strength: number | null;
}

export interface RuntimeKnowledgeEntry {
  readonly id: string;
  readonly entry_type: string;
  readonly canonical_label: string;
  readonly canonical_slug: string;
  readonly difficulty: RuntimeKnowledgeDifficulty;
  readonly replaces_entry_id: string | null;
  readonly variants: readonly RuntimeTermVariant[];
  readonly definitions: readonly RuntimeDefinition[];
  readonly context_definitions: readonly RuntimeContextDefinition[];
  readonly relations: readonly RuntimeKnowledgeRelation[];
}

export interface RuntimeKnowledgePayload {
  readonly schema: "vgine-runtime-knowledge-v1";
  readonly entries: readonly RuntimeKnowledgeEntry[];
}

export type RuntimeSearchKind = "genre" | "instrument_expression" | "knowledge";

export interface RuntimeSearchDocument {
  readonly id: string;
  readonly kind: RuntimeSearchKind;
  readonly label: string;
  readonly terms: readonly string[];
  readonly definition?: string | null;
}

export interface RuntimeSearchPayload {
  readonly schema: "vgine-runtime-search-documents-v1";
  readonly documents: readonly RuntimeSearchDocument[];
}

export interface RuntimeBootstrap {
  readonly manifest: RuntimeManifest;
  readonly core: RuntimeCorePayload;
  readonly genres: RuntimeGenresPayload;
  readonly search: RuntimeSearchPayload;
}

export interface RuntimePackReader {
  readText(fileName: "manifest.json" | RuntimePayloadFileName): Promise<string>;
}

export type RuntimeHashFunction = (text: string) => Promise<string>;

export interface LoadRuntimeBootstrapOptions {
  readonly sha256Hex?: RuntimeHashFunction;
}

export interface CompilerRendererSectionView {
  readonly sectionKey: FacetKey;
  readonly label: string;
  readonly order: number;
  readonly softMaxCharacters: number | null;
}

export interface CompilerRendererProfileView {
  readonly id: string;
  readonly maxCharacters: number;
  readonly overflowPolicy: string;
  readonly sections: readonly CompilerRendererSectionView[];
}

export interface RuntimeCompilerKnowledge {
  readonly runtimeBuildId: string;
  readonly rendererProfiles: Readonly<Record<string, CompilerRendererProfileView>>;
  readonly genreLabels: Readonly<Record<string, string>>;
}

export class RuntimeDataError extends Error {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string, message: string) {
    super(message);
    this.name = "RuntimeDataError";
    this.code = code;
    this.path = path;
  }
}

function fail(code: string, path: string, message: string): never {
  throw new RuntimeDataError(code, path, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail("invalid_object", path, `${path} must be an object`);
  return value;
}

function asArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) fail("invalid_array", path, `${path} must be an array`);
  return value;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== "string") fail("invalid_string", path, `${path} must be a string`);
  return value;
}

function asNullableString(value: unknown, path: string): string | null {
  if (value === null) return null;
  return asString(value, path);
}

function asBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail("invalid_boolean", path, `${path} must be boolean`);
  return value;
}

function asRuntimeParameterValueType(
  value: unknown,
  path: string,
): RuntimeParameterValueType {
  const text = asString(value, path);
  if (
    text !== "enum" &&
    text !== "multi" &&
    text !== "number" &&
    text !== "text" &&
    text !== "boolean" &&
    text !== "relation"
  ) {
    fail("invalid_parameter_value_type", path, `unsupported value_type: ${text}`);
  }
  return text;
}

function asNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail("invalid_number", path, `${path} must be a finite number`);
  }
  return value;
}

function asInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail("invalid_integer", path, `${path} must be an integer`);
  }
  return value;
}

function asNullableInteger(value: unknown, path: string): number | null {
  if (value === null) return null;
  return asInteger(value, path);
}

function asNullableNumber(value: unknown, path: string): number | null {
  if (value === null) return null;
  return asNumber(value, path);
}

function asKnowledgeDifficulty(
  value: unknown,
  path: string,
): RuntimeKnowledgeDifficulty {
  const text = asString(value, path);
  if (
    text !== "beginner" &&
    text !== "intermediate" &&
    text !== "advanced"
  ) {
    fail("invalid_knowledge_difficulty", path, `unsupported difficulty: ${text}`);
  }
  return text;
}

function asStringArray(value: unknown, path: string): readonly string[] {
  return asArray(value, path).map((entry, index) => asString(entry, `${path}[${index}]`));
}

function parseJson(text: string, path: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return fail("invalid_json", path, `${path} is not valid JSON`);
  }
}

function isSha256(value: string): boolean {
  return /^[0-9a-f]{64}$/u.test(value);
}

function assertSha256(value: unknown, path: string): string {
  const text = asString(value, path);
  if (!isSha256(text)) fail("invalid_sha256", path, `${path} must be a lowercase SHA-256 hex digest`);
  return text;
}

function assertSchema(record: Record<string, unknown>, expected: string, path: string): void {
  if (record.schema !== expected) {
    fail("unsupported_schema", `${path}.schema`, `expected ${expected}`);
  }
}

export function parseRuntimeManifest(value: unknown): RuntimeManifest {
  const root = asRecord(value, "manifest");
  if (root.schema !== RUNTIME_PACK_SCHEMA || root.schema_version !== RUNTIME_PACK_SCHEMA_VERSION) {
    fail(
      "unsupported_runtime_pack",
      "manifest",
      `supported runtime contract is ${RUNTIME_PACK_SCHEMA} v${RUNTIME_PACK_SCHEMA_VERSION}`,
    );
  }

  const filesRecord = asRecord(root.files, "manifest.files");
  const files = {} as Record<RuntimePayloadFileName, RuntimeManifestFile>;
  for (const fileName of RUNTIME_PAYLOAD_FILES) {
    const file = asRecord(filesRecord[fileName], `manifest.files.${fileName}`);
    const countsRaw = asRecord(file.counts, `manifest.files.${fileName}.counts`);
    const counts: Record<string, number> = {};
    for (const [key, rawCount] of Object.entries(countsRaw)) {
      const count = asInteger(rawCount, `manifest.files.${fileName}.counts.${key}`);
      if (count < 0) fail("invalid_count", `manifest.files.${fileName}.counts.${key}`, "count cannot be negative");
      counts[key] = count;
    }
    const bytes = asInteger(file.bytes, `manifest.files.${fileName}.bytes`);
    if (bytes < 0) fail("invalid_bytes", `manifest.files.${fileName}.bytes`, "bytes cannot be negative");
    files[fileName] = {
      sha256: assertSha256(file.sha256, `manifest.files.${fileName}.sha256`),
      bytes,
      counts,
    };
  }

  const buildMetaRaw = asRecord(root.knowledge_build_meta, "manifest.knowledge_build_meta");
  const knowledgeBuildMeta: Record<string, string> = {};
  for (const [key, value] of Object.entries(buildMetaRaw)) {
    knowledgeBuildMeta[key] = asString(value, `manifest.knowledge_build_meta.${key}`);
  }

  const editorFoundationSha =
    root.editor_foundation_sha256 === undefined
      ? undefined
      : assertSha256(
          root.editor_foundation_sha256,
          "manifest.editor_foundation_sha256",
        );
  const productKnowledgeFoundationSha =
    root.product_knowledge_foundation_sha256 === undefined
      ? undefined
      : assertSha256(
          root.product_knowledge_foundation_sha256,
          "manifest.product_knowledge_foundation_sha256",
        );

  return {
    schema: RUNTIME_PACK_SCHEMA,
    schema_version: RUNTIME_PACK_SCHEMA_VERSION,
    runtime_build_id: assertSha256(root.runtime_build_id, "manifest.runtime_build_id"),
    knowledge_db_sha256: assertSha256(root.knowledge_db_sha256, "manifest.knowledge_db_sha256"),
    ...(editorFoundationSha === undefined
      ? {}
      : { editor_foundation_sha256: editorFoundationSha }),
    ...(productKnowledgeFoundationSha === undefined
      ? {}
      : {
          product_knowledge_foundation_sha256:
            productKnowledgeFoundationSha,
        }),
    knowledge_build_meta: knowledgeBuildMeta,
    files,
  };
}

export function parseRuntimeCore(value: unknown): RuntimeCorePayload {
  const root = asRecord(value, "core");
  assertSchema(root, "vgine-runtime-core-v1", "core");

  const majorGenres = asArray(root.major_genres, "core.major_genres").map((entry, index) => {
    const path = `core.major_genres[${index}]`;
    const row = asRecord(entry, path);
    return {
      id: asString(row.id, `${path}.id`),
      label: asString(row.label, `${path}.label`),
      source_ordinal: asInteger(row.source_ordinal, `${path}.source_ordinal`),
      knowledge_entry_id: asNullableString(row.knowledge_entry_id, `${path}.knowledge_entry_id`),
    };
  });

  const sections = asArray(root.sections, "core.sections").map((entry, index) => {
    const row = asRecord(entry, `core.sections[${index}]`);
    return {
      key: asString(row.key, `core.sections[${index}].key`),
      label: asString(row.label, `core.sections[${index}].label`),
      output_order: asInteger(row.output_order, `core.sections[${index}].output_order`),
      optional: asBoolean(row.optional, `core.sections[${index}].optional`),
      easy_visible: asBoolean(row.easy_visible, `core.sections[${index}].easy_visible`),
      advanced_visible: asBoolean(row.advanced_visible, `core.sections[${index}].advanced_visible`),
      knowledge_entry_id: asNullableString(
        row.knowledge_entry_id,
        `core.sections[${index}].knowledge_entry_id`,
      ),
      notes: asNullableString(row.notes, `core.sections[${index}].notes`),
    };
  });

  const profiles = asArray(root.renderer_profiles, "core.renderer_profiles").map((entry, index) => {
    const path = `core.renderer_profiles[${index}]`;
    const row = asRecord(entry, path);
    const profileSections = asArray(row.sections, `${path}.sections`).map((sectionEntry, sectionIndex) => {
      const sectionPath = `${path}.sections[${sectionIndex}]`;
      const section = asRecord(sectionEntry, sectionPath);
      return {
        section_key: asString(section.section_key, `${sectionPath}.section_key`),
        output_label_override: asNullableString(
          section.output_label_override,
          `${sectionPath}.output_label_override`,
        ),
        output_order: asInteger(section.output_order, `${sectionPath}.output_order`),
        emit_when_empty: asBoolean(section.emit_when_empty, `${sectionPath}.emit_when_empty`),
        soft_max_characters: asNullableInteger(
          section.soft_max_characters,
          `${sectionPath}.soft_max_characters`,
        ),
        source_sample_count: asNullableInteger(
          section.source_sample_count,
          `${sectionPath}.source_sample_count`,
        ),
      };
    });
    return {
      id: asString(row.id, `${path}.id`),
      label: asString(row.label, `${path}.label`),
      version: asInteger(row.version, `${path}.version`),
      active: asBoolean(row.active, `${path}.active`),
      max_characters: asInteger(row.max_characters, `${path}.max_characters`),
      overflow_policy: asString(row.overflow_policy, `${path}.overflow_policy`),
      notes: asNullableString(row.notes, `${path}.notes`),
      sections: profileSections,
    };
  });

  return {
    schema: "vgine-runtime-core-v1",
    major_genres: majorGenres,
    sections,
    renderer_profiles: profiles,
  };
}

export function parseRuntimeGenres(value: unknown): RuntimeGenresPayload {
  const root = asRecord(value, "genres");
  assertSchema(root, "vgine-runtime-genres-v1", "genres");
  const genres = asArray(root.genres, "genres.genres").map((entry, index) => {
    const path = `genres.genres[${index}]`;
    const row = asRecord(entry, path);
    const aliases = asArray(row.aliases, `${path}.aliases`).map((aliasEntry, aliasIndex) => {
      const aliasPath = `${path}.aliases[${aliasIndex}]`;
      const alias = asRecord(aliasEntry, aliasPath);
      return {
        surface: asString(alias.surface, `${aliasPath}.surface`),
        normalized: asString(alias.normalized, `${aliasPath}.normalized`),
        kind: asString(alias.kind, `${aliasPath}.kind`),
      };
    });
    return {
      id: asString(row.id, `${path}.id`),
      label: asString(row.label, `${path}.label`),
      normalized: asString(row.normalized, `${path}.normalized`),
      knowledge_entry_id: asNullableString(row.knowledge_entry_id, `${path}.knowledge_entry_id`),
      major_genre_ids: asStringArray(row.major_genre_ids, `${path}.major_genre_ids`),
      aliases,
      traits: asArray(row.traits, `${path}.traits`).map((trait, traitIndex) =>
        asRecord(trait, `${path}.traits[${traitIndex}]`),
      ),
    };
  });
  return { schema: "vgine-runtime-genres-v1", genres };
}

export function parseRuntimeInstruments(value: unknown): RuntimeInstrumentsPayload {
  const root = asRecord(value, "instruments");
  assertSchema(root, "vgine-runtime-instruments-v1", "instruments");

  const families = asArray(root.families, "instruments.families").map((entry, index) => {
    const path = `instruments.families[${index}]`;
    const row = asRecord(entry, path);
    return {
      id: asString(row.id, `${path}.id`),
      label: asString(row.label, `${path}.label`),
      knowledge_entry_id: asNullableString(row.knowledge_entry_id, `${path}.knowledge_entry_id`),
    };
  });

  const instruments = asArray(root.instruments, "instruments.instruments").map((entry, index) => {
    const path = `instruments.instruments[${index}]`;
    const row = asRecord(entry, path);
    return {
      id: asString(row.id, `${path}.id`),
      label: asString(row.label, `${path}.label`),
      normalized: asString(row.normalized, `${path}.normalized`),
      family_id: asNullableString(row.family_id, `${path}.family_id`),
      knowledge_entry_id: asNullableString(row.knowledge_entry_id, `${path}.knowledge_entry_id`),
      aliases: asStringArray(row.aliases, `${path}.aliases`),
      traits: asArray(row.traits, `${path}.traits`).map((trait, traitIndex) =>
        asRecord(trait, `${path}.traits[${traitIndex}]`),
      ),
    };
  });

  return { schema: "vgine-runtime-instruments-v1", families, instruments };
}

export function parseRuntimeInstrumentExpressions(
  value: unknown,
): RuntimeInstrumentExpressionsPayload {
  const root = asRecord(value, "instrument-expressions");
  assertSchema(
    root,
    "vgine-runtime-instrument-expressions-v1",
    "instrument-expressions",
  );

  const expressions = asArray(
    root.expressions,
    "instrument-expressions.expressions",
  ).map((entry, index) => {
    const path = `instrument-expressions.expressions[${index}]`;
    const row = asRecord(entry, path);
    const instrumentLinks = asArray(row.instruments, `${path}.instruments`).map(
      (linkEntry, linkIndex) => {
        const linkPath = `${path}.instruments[${linkIndex}]`;
        const link = asRecord(linkEntry, linkPath);
        return {
          instrument_id: asString(link.instrument_id, `${linkPath}.instrument_id`),
          role: asString(link.role, `${linkPath}.role`),
          ordinal: asInteger(link.ordinal, `${linkPath}.ordinal`),
        };
      },
    );
    const conceptLinks = asArray(row.concepts, `${path}.concepts`).map(
      (linkEntry, linkIndex) => {
        const linkPath = `${path}.concepts[${linkIndex}]`;
        const link = asRecord(linkEntry, linkPath);
        return {
          entry_id: asString(link.entry_id, `${linkPath}.entry_id`),
          role: asNullableString(link.role, `${linkPath}.role`),
          ordinal: asInteger(link.ordinal, `${linkPath}.ordinal`),
        };
      },
    );

    return {
      id: asString(row.id, `${path}.id`),
      label: asString(row.label, `${path}.label`),
      normalized: asString(row.normalized, `${path}.normalized`),
      output_text: asString(row.output_text, `${path}.output_text`),
      source_kind: asString(row.source_kind, `${path}.source_kind`),
      status: asString(row.status, `${path}.status`),
      selectable: asBoolean(row.selectable, `${path}.selectable`),
      base_instrument_id: asNullableString(row.base_instrument_id, `${path}.base_instrument_id`),
      occurrence_count: asInteger(row.occurrence_count, `${path}.occurrence_count`),
      track_count: asInteger(row.track_count, `${path}.track_count`),
      decomposition_state: asString(row.decomposition_state, `${path}.decomposition_state`),
      semantic_coverage: asNumber(row.semantic_coverage, `${path}.semantic_coverage`),
      residual_terms: asArray(row.residual_terms, `${path}.residual_terms`),
      instruments: instrumentLinks,
      concepts: conceptLinks,
    };
  });

  return { schema: "vgine-runtime-instrument-expressions-v1", expressions };
}

export function parseRuntimeEditor(value: unknown): RuntimeEditorPayload {
  const root = asRecord(value, "editor");
  assertSchema(root, "vgine-runtime-editor-v1", "editor");

  const foundationSchema =
    root.foundation_schema === undefined
      ? undefined
      : asString(root.foundation_schema, "editor.foundation_schema");
  const foundationVersion =
    root.foundation_version === undefined
      ? undefined
      : asInteger(root.foundation_version, "editor.foundation_version");

  function parseParameterUi(value: unknown, path: string): RuntimeParameterUi {
    const ui = asRecord(value, path);
    const control = asString(ui.control, path + ".control");
    if (control !== "number") {
      fail(
        "invalid_parameter_ui_control",
        path + ".control",
        "unsupported parameter UI control: " + control,
      );
    }
    const min = asNumber(ui.min, path + ".min");
    const max = asNumber(ui.max, path + ".max");
    const step = asNumber(ui.step, path + ".step");
    if (max <= min || step <= 0) {
      fail(
        "invalid_parameter_ui_range",
        path,
        "number UI requires max > min and step > 0",
      );
    }
    const recommendedValues = asArray(
      ui.recommended_values,
      path + ".recommended_values",
    ).map((entry, index) =>
      asNumber(entry, path + ".recommended_values[" + index + "]"),
    );
    return {
      control: "number",
      min,
      max,
      step,
      unit: asNullableString(ui.unit, path + ".unit"),
      recommended_values: recommendedValues,
    };
  }

  const parameters = asArray(root.parameters, "editor.parameters").map(
    (entry, index) => {
      const path = `editor.parameters[${index}]`;
      const row = asRecord(entry, path);
      const sectionKey = asString(row.section_key, `${path}.section_key`);
      if (!isFacetKey(sectionKey)) {
        fail("invalid_editor_facet", `${path}.section_key`, `unsupported facet: ${sectionKey}`);
      }
      return {
        id: asString(row.id, `${path}.id`),
        section_key: sectionKey,
        label: asString(row.label, `${path}.label`),
        canonical_slug: asString(row.canonical_slug, `${path}.canonical_slug`),
        value_type: asRuntimeParameterValueType(
          row.value_type,
          `${path}.value_type`,
        ),
        easy_visible: asBoolean(row.easy_visible, `${path}.easy_visible`),
        advanced_visible: asBoolean(row.advanced_visible, `${path}.advanced_visible`),
        allow_custom_text: asBoolean(row.allow_custom_text, `${path}.allow_custom_text`),
        knowledge_entry_id: asNullableString(
          row.knowledge_entry_id,
          `${path}.knowledge_entry_id`,
        ),
        sort_order: asInteger(row.sort_order, `${path}.sort_order`),
        ...(row.ui === undefined
          ? {}
          : { ui: parseParameterUi(row.ui, `${path}.ui`) }),
      };
    },
  );

  const parameterOptions = asArray(
    root.parameter_options,
    "editor.parameter_options",
  ).map((entry, index) => {
    const path = `editor.parameter_options[${index}]`;
    const row = asRecord(entry, path);
    return {
      id: asString(row.id, `${path}.id`),
      parameter_id: asString(row.parameter_id, `${path}.parameter_id`),
      label: asString(row.label, `${path}.label`),
      canonical_slug: asString(row.canonical_slug, `${path}.canonical_slug`),
      output_fragment: asString(row.output_fragment, `${path}.output_fragment`),
      easy_visible: asBoolean(row.easy_visible, `${path}.easy_visible`),
      advanced_visible: asBoolean(row.advanced_visible, `${path}.advanced_visible`),
      knowledge_entry_id: asNullableString(
        row.knowledge_entry_id,
        `${path}.knowledge_entry_id`,
      ),
      sort_order: asInteger(row.sort_order, `${path}.sort_order`),
      ...(row.recommended === undefined
        ? {}
        : {
            recommended: asBoolean(
              row.recommended,
              `${path}.recommended`,
            ),
          }),
    };
  });

  const statements = asArray(root.statements, "editor.statements").map(
    (entry, index) => {
      const path = `editor.statements[${index}]`;
      const row = asRecord(entry, path);
      const sectionKey = asString(row.section_key, `${path}.section_key`);
      if (!isFacetKey(sectionKey)) {
        fail("invalid_editor_facet", `${path}.section_key`, `unsupported facet: ${sectionKey}`);
      }
      const concepts = asArray(row.concepts, `${path}.concepts`).map(
        (linkEntry, linkIndex) => {
          const linkPath = `${path}.concepts[${linkIndex}]`;
          const link = asRecord(linkEntry, linkPath);
          return {
            entry_id: asString(link.entry_id, `${linkPath}.entry_id`),
            role: asNullableString(link.role, `${linkPath}.role`),
            ordinal: asInteger(link.ordinal, `${linkPath}.ordinal`),
          };
        },
      );
      const optionLinks = asArray(row.options, `${path}.options`).map(
        (linkEntry, linkIndex) => {
          const linkPath = `${path}.options[${linkIndex}]`;
          const link = asRecord(linkEntry, linkPath);
          return {
            option_id: asString(link.option_id, `${linkPath}.option_id`),
            ordinal: asInteger(link.ordinal, `${linkPath}.ordinal`),
          };
        },
      );
      return {
        id: asString(row.id, `${path}.id`),
        section_key: sectionKey,
        label: asString(row.label, `${path}.label`),
        output_text: asString(row.output_text, `${path}.output_text`),
        mode_scope: asString(row.mode_scope, `${path}.mode_scope`),
        statement_kind: asString(row.statement_kind, `${path}.statement_kind`),
        source_frequency: asNullableInteger(
          row.source_frequency,
          `${path}.source_frequency`,
        ),
        ...(row.sort_order === undefined
          ? {}
          : {
              sort_order: asInteger(
                row.sort_order,
                `${path}.sort_order`,
              ),
            }),
        concepts,
        options: optionLinks,
      };
    },
  );

  const exclude = asArray(root.exclude, "editor.exclude").map((entry, index) => {
    const path = `editor.exclude[${index}]`;
    const row = asRecord(entry, path);
    return {
      id: asString(row.id, `${path}.id`),
      label: asString(row.label, `${path}.label`),
      output_text: asString(row.output_text, `${path}.output_text`),
      knowledge_entry_id: asNullableString(
        row.knowledge_entry_id,
        `${path}.knowledge_entry_id`,
      ),
      ...(row.sort_order === undefined
        ? {}
        : {
            sort_order: asInteger(
              row.sort_order,
              `${path}.sort_order`,
            ),
          }),
    };
  });

  return {
    schema: "vgine-runtime-editor-v1",
    ...(foundationSchema === undefined
      ? {}
      : { foundation_schema: foundationSchema }),
    ...(foundationVersion === undefined
      ? {}
      : { foundation_version: foundationVersion }),
    parameters,
    parameter_options: parameterOptions,
    statements,
    exclude,
  };
}

export function parseRuntimeKnowledge(value: unknown): RuntimeKnowledgePayload {
  const root = asRecord(value, "knowledge");
  assertSchema(root, "vgine-runtime-knowledge-v1", "knowledge");

  const entries = asArray(root.entries, "knowledge.entries").map(
    (entry, index) => {
      const path = `knowledge.entries[${index}]`;
      const row = asRecord(entry, path);

      const variants = asArray(row.variants, `${path}.variants`).map(
        (variantEntry, variantIndex) => {
          const variantPath = `${path}.variants[${variantIndex}]`;
          const variant = asRecord(variantEntry, variantPath);
          return {
            surface: asString(variant.surface, `${variantPath}.surface`),
            normalized: asString(
              variant.normalized,
              `${variantPath}.normalized`,
            ),
            locale: asString(variant.locale, `${variantPath}.locale`),
            match_kind: asString(
              variant.match_kind,
              `${variantPath}.match_kind`,
            ),
            match_priority: asInteger(
              variant.match_priority,
              `${variantPath}.match_priority`,
            ),
            is_primary: asBoolean(
              variant.is_primary,
              `${variantPath}.is_primary`,
            ),
          };
        },
      );

      const definitions = asArray(
        row.definitions,
        `${path}.definitions`,
      ).map((definitionEntry, definitionIndex) => {
        const definitionPath = `${path}.definitions[${definitionIndex}]`;
        const definition = asRecord(definitionEntry, definitionPath);
        return {
          locale: asString(
            definition.locale,
            `${definitionPath}.locale`,
          ),
          kind: asString(definition.kind, `${definitionPath}.kind`),
          text: asString(definition.text, `${definitionPath}.text`),
          revision: asInteger(
            definition.revision,
            `${definitionPath}.revision`,
          ),
        };
      });

      const contextDefinitions = asArray(
        row.context_definitions,
        `${path}.context_definitions`,
      ).map((contextEntry, contextIndex) => {
        const contextPath =
          `${path}.context_definitions[${contextIndex}]`;
        const context = asRecord(contextEntry, contextPath);
        return {
          locale: asString(context.locale, `${contextPath}.locale`),
          context_type: asString(
            context.context_type,
            `${contextPath}.context_type`,
          ),
          context_key: asString(
            context.context_key,
            `${contextPath}.context_key`,
          ),
          text: asString(context.text, `${contextPath}.text`),
          revision: asInteger(
            context.revision,
            `${contextPath}.revision`,
          ),
        };
      });

      const relations = asArray(row.relations, `${path}.relations`).map(
        (relationEntry, relationIndex) => {
          const relationPath = `${path}.relations[${relationIndex}]`;
          const relation = asRecord(relationEntry, relationPath);
          return {
            relation_type: asString(
              relation.relation_type,
              `${relationPath}.relation_type`,
            ),
            target_entry_id: asString(
              relation.target_entry_id,
              `${relationPath}.target_entry_id`,
            ),
            strength: asNullableNumber(
              relation.strength,
              `${relationPath}.strength`,
            ),
          };
        },
      );

      return {
        id: asString(row.id, `${path}.id`),
        entry_type: asString(row.entry_type, `${path}.entry_type`),
        canonical_label: asString(
          row.canonical_label,
          `${path}.canonical_label`,
        ),
        canonical_slug: asString(
          row.canonical_slug,
          `${path}.canonical_slug`,
        ),
        difficulty: asKnowledgeDifficulty(
          row.difficulty,
          `${path}.difficulty`,
        ),
        replaces_entry_id: asNullableString(
          row.replaces_entry_id,
          `${path}.replaces_entry_id`,
        ),
        variants,
        definitions,
        context_definitions: contextDefinitions,
        relations,
      };
    },
  );

  return { schema: "vgine-runtime-knowledge-v1", entries };
}

export function parseRuntimeSearch(value: unknown): RuntimeSearchPayload {
  const root = asRecord(value, "search");
  assertSchema(root, "vgine-runtime-search-documents-v1", "search");
  const kinds = new Set<RuntimeSearchKind>(["genre", "instrument_expression", "knowledge"]);
  const documents = asArray(root.documents, "search.documents").map((entry, index) => {
    const path = `search.documents[${index}]`;
    const row = asRecord(entry, path);
    const kind = asString(row.kind, `${path}.kind`);
    if (!kinds.has(kind as RuntimeSearchKind)) {
      fail("invalid_search_kind", `${path}.kind`, `unsupported search document kind: ${kind}`);
    }
    const definition =
      row.definition === undefined
        ? undefined
        : asNullableString(row.definition, `${path}.definition`);
    return {
      id: asString(row.id, `${path}.id`),
      kind: kind as RuntimeSearchKind,
      label: asString(row.label, `${path}.label`),
      terms: asStringArray(row.terms, `${path}.terms`),
      ...(definition === undefined ? {} : { definition }),
    };
  });
  return { schema: "vgine-runtime-search-documents-v1", documents };
}

function assertCount(
  manifest: RuntimeManifest,
  fileName: RuntimePayloadFileName,
  key: string,
  actual: number,
): void {
  const expected = manifest.files[fileName].counts[key];
  if (expected === undefined) {
    fail("missing_manifest_count", `manifest.files.${fileName}.counts.${key}`, "required count is missing");
  }
  if (expected !== actual) {
    fail(
      "manifest_count_mismatch",
      `manifest.files.${fileName}.counts.${key}`,
      `manifest count ${expected} does not match payload count ${actual}`,
    );
  }
}

async function readAndVerify(
  reader: RuntimePackReader,
  manifest: RuntimeManifest,
  fileName: RuntimePayloadFileName,
  sha256Hex?: RuntimeHashFunction,
): Promise<string> {
  const text = await reader.readText(fileName);
  if (sha256Hex !== undefined) {
    const actual = await sha256Hex(text);
    const expected = manifest.files[fileName].sha256;
    if (actual !== expected) {
      fail("payload_hash_mismatch", fileName, `SHA-256 mismatch for ${fileName}`);
    }
  }
  return text;
}

export async function loadRuntimeBootstrap(
  reader: RuntimePackReader,
  options: LoadRuntimeBootstrapOptions = {},
): Promise<RuntimeBootstrap> {
  const manifestText = await reader.readText("manifest.json");
  const manifest = parseRuntimeManifest(parseJson(manifestText, "manifest.json"));

  const [coreText, genresText, searchText] = await Promise.all([
    readAndVerify(reader, manifest, "core.json", options.sha256Hex),
    readAndVerify(reader, manifest, "genres.json", options.sha256Hex),
    readAndVerify(reader, manifest, "search.json", options.sha256Hex),
  ]);

  const core = parseRuntimeCore(parseJson(coreText, "core.json"));
  const genres = parseRuntimeGenres(parseJson(genresText, "genres.json"));
  const search = parseRuntimeSearch(parseJson(searchText, "search.json"));

  assertCount(manifest, "core.json", "major_genres", core.major_genres.length);
  assertCount(manifest, "core.json", "sections", core.sections.length);
  assertCount(manifest, "core.json", "renderer_profiles", core.renderer_profiles.length);
  assertCount(manifest, "genres.json", "genres", genres.genres.length);
  assertCount(manifest, "search.json", "documents", search.documents.length);

  return { manifest, core, genres, search };
}

export async function loadRuntimeInstrumentLibrary(
  reader: RuntimePackReader,
  manifest: RuntimeManifest,
  options: LoadRuntimeBootstrapOptions = {},
): Promise<RuntimeInstrumentLibrary> {
  const [instrumentsText, expressionsText] = await Promise.all([
    readAndVerify(reader, manifest, "instruments.json", options.sha256Hex),
    readAndVerify(reader, manifest, "instrument-expressions.json", options.sha256Hex),
  ]);

  const instruments = parseRuntimeInstruments(
    parseJson(instrumentsText, "instruments.json"),
  );
  const expressions = parseRuntimeInstrumentExpressions(
    parseJson(expressionsText, "instrument-expressions.json"),
  );

  assertCount(
    manifest,
    "instruments.json",
    "families",
    instruments.families.length,
  );
  assertCount(
    manifest,
    "instruments.json",
    "instruments",
    instruments.instruments.length,
  );
  assertCount(
    manifest,
    "instrument-expressions.json",
    "expressions",
    expressions.expressions.length,
  );

  return { instruments, expressions };
}

export async function loadRuntimeEditor(
  reader: RuntimePackReader,
  manifest: RuntimeManifest,
  options: LoadRuntimeBootstrapOptions = {},
): Promise<RuntimeEditorPayload> {
  const editorText = await readAndVerify(
    reader,
    manifest,
    "editor.json",
    options.sha256Hex,
  );
  const editor = parseRuntimeEditor(parseJson(editorText, "editor.json"));

  assertCount(manifest, "editor.json", "parameters", editor.parameters.length);
  assertCount(
    manifest,
    "editor.json",
    "parameter_options",
    editor.parameter_options.length,
  );
  assertCount(manifest, "editor.json", "statements", editor.statements.length);
  assertCount(manifest, "editor.json", "exclude", editor.exclude.length);

  return editor;
}

export async function loadRuntimeKnowledge(
  reader: RuntimePackReader,
  manifest: RuntimeManifest,
  options: LoadRuntimeBootstrapOptions = {},
): Promise<RuntimeKnowledgePayload> {
  const knowledgeText = await readAndVerify(
    reader,
    manifest,
    "knowledge.json",
    options.sha256Hex,
  );
  const knowledge = parseRuntimeKnowledge(
    parseJson(knowledgeText, "knowledge.json"),
  );

  assertCount(
    manifest,
    "knowledge.json",
    "entries",
    knowledge.entries.length,
  );

  return knowledge;
}

export function buildCompilerKnowledge(bootstrap: RuntimeBootstrap): RuntimeCompilerKnowledge {
  const sectionLabels = new Map(bootstrap.core.sections.map((section) => [section.key, section.label]));
  const rendererProfiles: Record<string, CompilerRendererProfileView> = {};

  for (const profile of bootstrap.core.renderer_profiles) {
    const sections: CompilerRendererSectionView[] = profile.sections.map((section, index) => {
      if (!isFacetKey(section.section_key)) {
        fail(
          "unsupported_renderer_section",
          `core.renderer_profiles.${profile.id}.sections[${index}].section_key`,
          `renderer section is not a MusicSpec v1 facet: ${section.section_key}`,
        );
      }
      const label = section.output_label_override ?? sectionLabels.get(section.section_key);
      if (!label) {
        fail(
          "missing_renderer_label",
          `core.renderer_profiles.${profile.id}.sections[${index}]`,
          `no output label exists for renderer section ${section.section_key}`,
        );
      }
      return {
        sectionKey: section.section_key,
        label,
        order: section.output_order,
        softMaxCharacters: section.soft_max_characters,
      };
    });

    rendererProfiles[profile.id] = {
      id: profile.id,
      maxCharacters: profile.max_characters,
      overflowPolicy: profile.overflow_policy,
      sections,
    };
  }

  const genreLabels: Record<string, string> = {};
  for (const major of bootstrap.core.major_genres) genreLabels[major.id] = major.label;
  for (const genre of bootstrap.genres.genres) genreLabels[genre.id] = genre.label;

  return {
    runtimeBuildId: bootstrap.manifest.runtime_build_id,
    rendererProfiles,
    genreLabels,
  };
}
