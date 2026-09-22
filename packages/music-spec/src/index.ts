export const MUSIC_SPEC_SCHEMA_VERSION = "music-spec-v1" as const;

export const FACET_KEYS = [
  "genre",
  "era",
  "bpm",
  "key_mode",
  "groove",
  "melody",
  "harmony",
  "drums",
  "bass",
  "instruments",
  "exciters",
  "texture",
  "vocal",
  "dynamics",
  "space_mix",
  "production",
  "structure",
] as const;

export type FacetKey = (typeof FACET_KEYS)[number];

export const GENRE_INFLUENCE_ROLES = ["foundation", "fusion", "accent"] as const;
export type GenreInfluenceRole = (typeof GENRE_INFLUENCE_ROLES)[number];

export const SELECTION_KINDS = ["statement", "option", "concept", "freeform"] as const;
export type SelectionKind = (typeof SELECTION_KINDS)[number];

export const ORIGINS = [
  "user",
  "statement",
  "genre_suggestion",
  "derived",
  "imported",
  "freeform",
] as const;
export type Origin = (typeof ORIGINS)[number];

export interface GenreInfluence {
  readonly role: GenreInfluenceRole;
  readonly genre_id: string;
  readonly routing: readonly FacetKey[];
  readonly locked: boolean;
}

export interface Selection {
  readonly id?: string | null;
  readonly kind: SelectionKind;
  readonly value: string;
  readonly origin: Origin;
  readonly locked: boolean;
}

export interface FacetState {
  readonly locked: boolean;
  readonly selections: readonly Selection[];
  readonly custom_text: string | null;
}

export interface ExcludeItem {
  readonly id?: string | null;
  readonly text: string;
  readonly origin: Origin;
  readonly locked: boolean;
}

export interface MusicSpec {
  readonly schema_version: typeof MUSIC_SPEC_SCHEMA_VERSION;
  readonly genre_influences: readonly GenreInfluence[];
  readonly facets: Readonly<Partial<Record<FacetKey, FacetState>>>;
  readonly exclude: readonly ExcludeItem[];
}

export interface ValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export interface MusicSpecValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

const FACET_KEY_SET = new Set<string>(FACET_KEYS);
const ROLE_SET = new Set<string>(GENRE_INFLUENCE_ROLES);
const KIND_SET = new Set<string>(SELECTION_KINDS);
const ORIGIN_SET = new Set<string>(ORIGINS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedSet = new Set(allowed);
  return Object.keys(value).every((key) => allowedSet.has(key));
}

function issue(issues: ValidationIssue[], path: string, code: string, message: string): void {
  issues.push({ path, code, message });
}

function validateOrigin(value: unknown, path: string, issues: ValidationIssue[]): value is Origin {
  if (typeof value !== "string" || !ORIGIN_SET.has(value)) {
    issue(issues, path, "invalid_origin", "origin must be a supported MusicSpec v1 origin");
    return false;
  }
  return true;
}

function validateSelection(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issue(issues, path, "invalid_selection", "selection must be an object");
    return;
  }
  if (!hasOnlyKeys(value, ["id", "kind", "value", "origin", "locked"])) {
    issue(issues, path, "unknown_selection_property", "selection contains an unsupported property");
  }
  if (value.id !== undefined && value.id !== null && typeof value.id !== "string") {
    issue(issues, `${path}.id`, "invalid_selection_id", "selection id must be a string or null");
  }
  if (typeof value.kind !== "string" || !KIND_SET.has(value.kind)) {
    issue(issues, `${path}.kind`, "invalid_selection_kind", "selection kind is not supported");
  }
  if (typeof value.value !== "string") {
    issue(issues, `${path}.value`, "invalid_selection_value", "selection value must be a string");
  }
  validateOrigin(value.origin, `${path}.origin`, issues);
  if (typeof value.locked !== "boolean") {
    issue(issues, `${path}.locked`, "invalid_lock", "selection locked must be boolean");
  }
}

function validateFacetState(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issue(issues, path, "invalid_facet", "facet state must be an object");
    return;
  }
  if (!hasOnlyKeys(value, ["locked", "selections", "custom_text"])) {
    issue(issues, path, "unknown_facet_property", "facet state contains an unsupported property");
  }
  if (typeof value.locked !== "boolean") {
    issue(issues, `${path}.locked`, "invalid_lock", "facet locked must be boolean");
  }
  if (!Array.isArray(value.selections)) {
    issue(issues, `${path}.selections`, "invalid_selections", "facet selections must be an array");
  } else {
    value.selections.forEach((selection, index) =>
      validateSelection(selection, `${path}.selections[${index}]`, issues),
    );
  }
  if (value.custom_text !== null && typeof value.custom_text !== "string") {
    issue(issues, `${path}.custom_text`, "invalid_custom_text", "custom_text must be a string or null");
  }
}

export function isFacetKey(value: string): value is FacetKey {
  return FACET_KEY_SET.has(value);
}

export function validateMusicSpec(value: unknown): MusicSpecValidationResult {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ path: "$", code: "invalid_root", message: "MusicSpec must be an object" }],
    };
  }

  if (!hasOnlyKeys(value, ["schema_version", "genre_influences", "facets", "exclude"])) {
    issue(issues, "$", "unknown_root_property", "MusicSpec contains an unsupported top-level property");
  }
  if (value.schema_version !== MUSIC_SPEC_SCHEMA_VERSION) {
    issue(
      issues,
      "$.schema_version",
      "unsupported_schema_version",
      `schema_version must be ${MUSIC_SPEC_SCHEMA_VERSION}`,
    );
  }

  if (!Array.isArray(value.genre_influences)) {
    issue(issues, "$.genre_influences", "invalid_genre_influences", "genre_influences must be an array");
  } else {
    if (value.genre_influences.length > 3) {
      issue(
        issues,
        "$.genre_influences",
        "invalid_genre_influence_count",
        "MusicSpec v1 allows zero to three genre influences",
      );
    }
    const seenRoles = new Set<string>();
    value.genre_influences.forEach((influence, index) => {
      const path = `$.genre_influences[${index}]`;
      if (!isRecord(influence)) {
        issue(issues, path, "invalid_genre_influence", "genre influence must be an object");
        return;
      }
      if (!hasOnlyKeys(influence, ["role", "genre_id", "routing", "locked"])) {
        issue(
          issues,
          path,
          "unknown_genre_influence_property",
          "genre influence contains an unsupported property",
        );
      }
      if (typeof influence.role !== "string" || !ROLE_SET.has(influence.role)) {
        issue(issues, `${path}.role`, "invalid_genre_role", "genre influence role is not supported");
      } else if (seenRoles.has(influence.role)) {
        issue(
          issues,
          `${path}.role`,
          "duplicate_genre_role",
          "genre influence roles must be unique",
        );
      } else {
        seenRoles.add(influence.role);
      }
      if (typeof influence.genre_id !== "string" || influence.genre_id.length === 0) {
        issue(issues, `${path}.genre_id`, "invalid_genre_id", "genre_id must be a non-empty string");
      }
      if (!Array.isArray(influence.routing)) {
        issue(issues, `${path}.routing`, "invalid_routing", "routing must be an array");
      } else {
        const seenRouting = new Set<string>();
        influence.routing.forEach((route, routeIndex) => {
          if (typeof route !== "string" || !FACET_KEY_SET.has(route)) {
            issue(
              issues,
              `${path}.routing[${routeIndex}]`,
              "invalid_routing_facet",
              "routing contains an unsupported facet",
            );
          } else if (seenRouting.has(route)) {
            issue(
              issues,
              `${path}.routing[${routeIndex}]`,
              "duplicate_routing_facet",
              "routing facets must be unique",
            );
          } else {
            seenRouting.add(route);
          }
        });
      }
      if (typeof influence.locked !== "boolean") {
        issue(issues, `${path}.locked`, "invalid_lock", "genre influence locked must be boolean");
      }
    });
  }

  if (!isRecord(value.facets)) {
    issue(issues, "$.facets", "invalid_facets", "facets must be an object");
  } else {
    for (const [key, facet] of Object.entries(value.facets)) {
      if (!FACET_KEY_SET.has(key)) {
        issue(issues, `$.facets.${key}`, "unknown_facet", `unsupported MusicSpec v1 facet: ${key}`);
        continue;
      }
      validateFacetState(facet, `$.facets.${key}`, issues);
    }
  }

  if (!Array.isArray(value.exclude)) {
    issue(issues, "$.exclude", "invalid_exclude", "exclude must be an array");
  } else {
    value.exclude.forEach((excludeItem, index) => {
      const path = `$.exclude[${index}]`;
      if (!isRecord(excludeItem)) {
        issue(issues, path, "invalid_exclude_item", "exclude item must be an object");
        return;
      }
      if (!hasOnlyKeys(excludeItem, ["id", "text", "origin", "locked"])) {
        issue(issues, path, "unknown_exclude_property", "exclude item contains an unsupported property");
      }
      if (
        excludeItem.id !== undefined &&
        excludeItem.id !== null &&
        typeof excludeItem.id !== "string"
      ) {
        issue(issues, `${path}.id`, "invalid_exclude_id", "exclude id must be a string or null");
      }
      if (typeof excludeItem.text !== "string" || excludeItem.text.length === 0) {
        issue(issues, `${path}.text`, "invalid_exclude_text", "exclude text must be a non-empty string");
      }
      validateOrigin(excludeItem.origin, `${path}.origin`, issues);
      if (typeof excludeItem.locked !== "boolean") {
        issue(issues, `${path}.locked`, "invalid_lock", "exclude locked must be boolean");
      }
    });
  }

  return { valid: issues.length === 0, issues };
}

export class MusicSpecValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super(`Invalid MusicSpec (${issues.length} issue${issues.length === 1 ? "" : "s"})`);
    this.name = "MusicSpecValidationError";
    this.issues = issues;
  }
}

export function parseMusicSpec(value: unknown): MusicSpec {
  const result = validateMusicSpec(value);
  if (!result.valid) {
    throw new MusicSpecValidationError(result.issues);
  }
  return value as MusicSpec;
}


const GENRE_ROLE_ORDER: Readonly<Record<GenreInfluenceRole, number>> = {
  foundation: 0,
  fusion: 1,
  accent: 2,
};

export function createMusicSpec(foundationGenreId?: string): MusicSpec {
  if (foundationGenreId !== undefined && !foundationGenreId) {
    throw new Error("foundation genre ID must be non-empty when provided");
  }
  return {
    schema_version: MUSIC_SPEC_SCHEMA_VERSION,
    genre_influences: foundationGenreId
      ? [
          {
            role: "foundation",
            genre_id: foundationGenreId,
            routing: [],
            locked: false,
          },
        ]
      : [],
    facets: {},
    exclude: [],
  };
}

export function resetMusicSpec(): MusicSpec {
  return createMusicSpec();
}

export function setGenreInfluence(
  spec: MusicSpec,
  role: GenreInfluenceRole,
  genreId: string,
): MusicSpec {
  if (!genreId) throw new Error("genre ID must be non-empty");

  const existing = spec.genre_influences.find((entry) => entry.role === role);
  const next: GenreInfluence = existing
    ? { ...existing, genre_id: genreId }
    : { role, genre_id: genreId, routing: [], locked: false };

  const influences = spec.genre_influences
    .filter((entry) => entry.role !== role)
    .concat(next)
    .sort((a, b) => GENRE_ROLE_ORDER[a.role] - GENRE_ROLE_ORDER[b.role]);

  return { ...spec, genre_influences: influences };
}

export function removeGenreInfluence(
  spec: MusicSpec,
  role: GenreInfluenceRole,
): MusicSpec {
  return {
    ...spec,
    genre_influences: spec.genre_influences.filter((entry) => entry.role !== role),
  };
}


export function resetMusicSpecFacets(
  spec: MusicSpec,
  facetKeys: readonly FacetKey[],
  options: { readonly clearExclude?: boolean } = {},
): MusicSpec {
  const facets = { ...spec.facets };
  for (const key of facetKeys) {
    delete facets[key];
  }

  return {
    ...spec,
    genre_influences: facetKeys.includes("genre") ? [] : spec.genre_influences,
    facets,
    exclude: options.clearExclude ? [] : spec.exclude,
  };
}


export function setFacetSelection(
  spec: MusicSpec,
  facetKey: FacetKey,
  selection: Selection,
): MusicSpec {
  const current = spec.facets[facetKey] ?? {
    locked: false,
    selections: [],
    custom_text: null,
  };
  const nextSelections = selection.id
    ? [
        ...current.selections.filter((entry) => entry.id !== selection.id),
        selection,
      ]
    : [
        ...current.selections.filter(
          (entry) =>
            !(
              entry.id == null &&
              entry.kind === selection.kind &&
              entry.value === selection.value
            ),
        ),
        selection,
      ];

  return {
    ...spec,
    facets: {
      ...spec.facets,
      [facetKey]: {
        ...current,
        selections: nextSelections,
      },
    },
  };
}

export function removeFacetSelection(
  spec: MusicSpec,
  facetKey: FacetKey,
  selectionId: string,
): MusicSpec {
  const current = spec.facets[facetKey];
  if (!current) return spec;
  return {
    ...spec,
    facets: {
      ...spec.facets,
      [facetKey]: {
        ...current,
        selections: current.selections.filter(
          (entry) => entry.id !== selectionId,
        ),
      },
    },
  };
}

export function hasFacetSelection(
  spec: MusicSpec,
  facetKey: FacetKey,
  selectionId: string,
): boolean {
  return (
    spec.facets[facetKey]?.selections.some(
      (entry) => entry.id === selectionId,
    ) ?? false
  );
}


export function setFacetCustomText(
  spec: MusicSpec,
  facetKey: FacetKey,
  customText: string | null,
): MusicSpec {
  const current = spec.facets[facetKey] ?? {
    locked: false,
    selections: [],
    custom_text: null,
  };
  return {
    ...spec,
    facets: {
      ...spec.facets,
      [facetKey]: {
        ...current,
        custom_text: customText,
      },
    },
  };
}
