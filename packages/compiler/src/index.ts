import {
  FACET_KEYS,
  type FacetKey,
  type MusicSpec,
  type Origin,
  type Selection,
  validateMusicSpec,
} from "@vgine/music-spec";

export const DEFAULT_RENDERER_PROFILE_ID = "suno-structured-v1" as const;

export interface RendererSection {
  readonly sectionKey: FacetKey;
  readonly label: string;
  readonly order: number;
  readonly softMaxCharacters?: number | null;
}

export interface RendererProfile {
  readonly id: string;
  readonly maxCharacters: number;
  readonly overflowPolicy: string;
  readonly sections: readonly RendererSection[];
}

export interface CompilationKnowledge {
  readonly runtimeBuildId: string;
  readonly rendererProfiles: Readonly<Record<string, RendererProfile>>;
  readonly genreLabels: Readonly<Record<string, string>>;
}

export type DiagnosticSeverity = "info" | "warning" | "error";

export interface CompilationDiagnostic {
  readonly severity: DiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly sectionKey?: FacetKey;
}

export interface CompilationSection {
  readonly sectionKey: FacetKey;
  readonly label: string;
  readonly content: string;
  readonly text: string;
  readonly characters: number;
}

export interface BudgetState {
  readonly used: number;
  readonly max: number;
  readonly remaining: number;
  readonly valid: boolean;
}

export interface CompactionRecord {
  readonly kind: "deduplicate" | "omit";
  readonly sectionKey: FacetKey;
  readonly value: string;
  readonly origin: Origin | "genre_influence" | "custom_text";
  readonly reason: string;
}

export interface CompilationResult {
  readonly rendererProfileId: string;
  readonly runtimeBuildId: string;
  readonly styleText: string;
  readonly excludeText: string;
  readonly sections: readonly CompilationSection[];
  readonly budget: BudgetState;
  readonly diagnostics: readonly CompilationDiagnostic[];
  readonly compactions: readonly CompactionRecord[];
}

export interface CompileOptions {
  readonly rendererProfileId?: string;
}

interface CandidateItem {
  readonly sectionKey: FacetKey;
  readonly text: string;
  readonly origin: Origin | "genre_influence" | "custom_text";
  readonly removableRank: number | null;
  readonly sourceOrder: number;
  active: boolean;
}

const ROLE_LABELS = {
  foundation: "Foundation",
  fusion: "Fusion",
  accent: "Accent",
} as const;

const REMOVABLE_ORIGIN_RANK: Readonly<Partial<Record<Origin, number>>> = {
  derived: 0,
  genre_suggestion: 1,
  statement: 2,
};

function normalizeFragment(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function semanticKey(value: string): string {
  return normalizeFragment(value).toLowerCase();
}

export function countCharacters(value: string): number {
  return Array.from(value).length;
}

function renderSections(
  profile: RendererProfile,
  items: readonly CandidateItem[],
): CompilationSection[] {
  const sections: CompilationSection[] = [];
  const ordered = [...profile.sections].sort(
    (a, b) => a.order - b.order || a.sectionKey.localeCompare(b.sectionKey),
  );
  for (const definition of ordered) {
    const content = items
      .filter((item) => item.active && item.sectionKey === definition.sectionKey)
      .sort((a, b) => a.sourceOrder - b.sourceOrder)
      .map((item) => item.text)
      .filter(Boolean)
      .join(", ");
    if (!content) continue;
    const text = `[${definition.label}: ${content}]`;
    sections.push({
      sectionKey: definition.sectionKey,
      label: definition.label,
      content,
      text,
      characters: countCharacters(text),
    });
  }
  return sections;
}

function styleText(sections: readonly CompilationSection[]): string {
  return sections.map((section) => section.text).join("\n");
}

function deduplicateItems(items: CandidateItem[], compactions: CompactionRecord[]): void {
  const bySection = new Map<FacetKey, Map<string, CandidateItem>>();
  for (const item of items) {
    const sectionMap = bySection.get(item.sectionKey) ?? new Map<string, CandidateItem>();
    bySection.set(item.sectionKey, sectionMap);
    const key = semanticKey(item.text);
    const existing = sectionMap.get(key);
    if (!existing) {
      sectionMap.set(key, item);
      continue;
    }

    const existingProtected = existing.removableRank === null;
    const itemProtected = item.removableRank === null;
    const remove = itemProtected && !existingProtected ? existing : item;
    const keep = remove === item ? existing : item;
    remove.active = false;
    sectionMap.set(key, keep);
    compactions.push({
      kind: "deduplicate",
      sectionKey: remove.sectionKey,
      value: remove.text,
      origin: remove.origin,
      reason: "exact semantic duplicate in the same section",
    });
  }
}

function removalRank(selection: Selection): number | null {
  if (
    selection.origin === "user" ||
    selection.origin === "imported" ||
    selection.origin === "freeform"
  ) {
    return null;
  }
  return REMOVABLE_ORIGIN_RANK[selection.origin] ?? null;
}

function addFacetItems(spec: MusicSpec, items: CandidateItem[]): void {
  let sourceOrder = 10_000;
  for (const facetKey of FACET_KEYS) {
    const facet = spec.facets[facetKey];
    if (!facet) continue;
    for (const selection of facet.selections) {
      const text = normalizeFragment(selection.value);
      if (!text) continue;
      const rank = facet.locked || selection.locked ? null : removalRank(selection);
      items.push({
        sectionKey: facetKey,
        text,
        origin: selection.origin,
        removableRank: rank,
        sourceOrder: sourceOrder++,
        active: true,
      });
    }
    if (facet.custom_text !== null) {
      const text = normalizeFragment(facet.custom_text);
      if (text) {
        items.push({
          sectionKey: facetKey,
          text,
          origin: "custom_text",
          removableRank: null,
          sourceOrder: sourceOrder++,
          active: true,
        });
      }
    }
  }
}

function addGenreInfluenceItems(
  spec: MusicSpec,
  knowledge: CompilationKnowledge,
  items: CandidateItem[],
  diagnostics: CompilationDiagnostic[],
): void {
  spec.genre_influences.forEach((influence, index) => {
    const knownLabel = knowledge.genreLabels[influence.genre_id];
    const label = normalizeFragment(knownLabel ?? influence.genre_id);
    if (!knownLabel) {
      diagnostics.push({
        severity: "warning",
        code: "missing_genre_label",
        message: `No runtime genre label found for ${influence.genre_id}; stable ID used as fallback`,
        path: `$.genre_influences[${index}].genre_id`,
        sectionKey: "genre",
      });
    }
    items.push({
      sectionKey: "genre",
      text: `${ROLE_LABELS[influence.role]}: ${label}`,
      origin: "genre_influence",
      removableRank: null,
      sourceOrder: index,
      active: true,
    });
  });
}

function compileExclude(spec: MusicSpec): string {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const entry of spec.exclude) {
    const text = normalizeFragment(entry.text);
    if (!text) continue;
    const key = semanticKey(text);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(text);
  }
  return output.join(", ");
}

function invalidResult(
  profileId: string,
  runtimeBuildId: string,
  diagnostics: readonly CompilationDiagnostic[],
): CompilationResult {
  return {
    rendererProfileId: profileId,
    runtimeBuildId,
    styleText: "",
    excludeText: "",
    sections: [],
    budget: { used: 0, max: 0, remaining: 0, valid: false },
    diagnostics,
    compactions: [],
  };
}

export function compileMusicSpec(
  spec: MusicSpec,
  knowledge: CompilationKnowledge,
  options: CompileOptions = {},
): CompilationResult {
  const profileId = options.rendererProfileId ?? DEFAULT_RENDERER_PROFILE_ID;
  const validation = validateMusicSpec(spec);
  if (!validation.valid) {
    return invalidResult(
      profileId,
      knowledge.runtimeBuildId,
      validation.issues.map((entry) => ({
        severity: "error" as const,
        code: `music_spec_${entry.code}`,
        message: entry.message,
        path: entry.path,
      })),
    );
  }

  const profile = knowledge.rendererProfiles[profileId];
  if (!profile) {
    return invalidResult(profileId, knowledge.runtimeBuildId, [
      {
        severity: "error",
        code: "renderer_profile_not_found",
        message: `Renderer profile not found: ${profileId}`,
      },
    ]);
  }
  if (profile.maxCharacters <= 0 || !Number.isInteger(profile.maxCharacters)) {
    return invalidResult(profileId, knowledge.runtimeBuildId, [
      {
        severity: "error",
        code: "invalid_renderer_budget",
        message: `Renderer profile ${profileId} has an invalid maxCharacters value`,
      },
    ]);
  }

  const diagnostics: CompilationDiagnostic[] = [];
  const compactions: CompactionRecord[] = [];
  const items: CandidateItem[] = [];
  addGenreInfluenceItems(spec, knowledge, items, diagnostics);
  addFacetItems(spec, items);
  deduplicateItems(items, compactions);

  let sections = renderSections(profile, items);
  let rendered = styleText(sections);
  let used = countCharacters(rendered);

  if (used > profile.maxCharacters) {
    const removable = items
      .filter((item) => item.active && item.removableRank !== null)
      .sort((a, b) => {
        const rankDiff =
          (a.removableRank ?? Number.MAX_SAFE_INTEGER) -
          (b.removableRank ?? Number.MAX_SAFE_INTEGER);
        if (rankDiff !== 0) return rankDiff;
        const lengthDiff = countCharacters(b.text) - countCharacters(a.text);
        if (lengthDiff !== 0) return lengthDiff;
        return b.sourceOrder - a.sourceOrder;
      });

    for (const item of removable) {
      if (used <= profile.maxCharacters) break;
      item.active = false;
      compactions.push({
        kind: "omit",
        sectionKey: item.sectionKey,
        value: item.text,
        origin: item.origin,
        reason: "semantic budget: lower-priority non-explicit material omitted",
      });
      sections = renderSections(profile, items);
      rendered = styleText(sections);
      used = countCharacters(rendered);
    }
  }

  const valid = used <= profile.maxCharacters;
  if (!valid) {
    diagnostics.push({
      severity: "error",
      code: "budget_conflict",
      message: `Protected/explicit content requires ${used} characters but renderer ${profileId} allows ${profile.maxCharacters}; user action is required`,
    });
  } else if (compactions.some((entry) => entry.kind === "omit")) {
    diagnostics.push({
      severity: "info",
      code: "budget_compacted",
      message:
        "Lower-priority derived/suggested material was omitted to satisfy the renderer budget",
    });
  }

  return {
    rendererProfileId: profileId,
    runtimeBuildId: knowledge.runtimeBuildId,
    styleText: rendered,
    excludeText: compileExclude(spec),
    sections,
    budget: {
      used,
      max: profile.maxCharacters,
      remaining: profile.maxCharacters - used,
      valid,
    },
    diagnostics,
    compactions,
  };
}
