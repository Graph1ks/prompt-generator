import type { RuntimeSearchDocument, RuntimeSearchKind } from "@vgine/runtime-data";

export interface SearchQuery {
  readonly query: string;
  readonly kinds?: readonly RuntimeSearchKind[];
  readonly limit?: number;
}

export interface SearchResult {
  readonly id: string;
  readonly kind: RuntimeSearchKind;
  readonly label: string;
  readonly score: number;
  readonly matchedTerm: string;
  readonly definition?: string | null;
}

export interface SearchRequest {
  readonly type: "search";
  readonly requestId: string;
  readonly query: SearchQuery;
}

export interface SearchResponse {
  readonly type: "search_result";
  readonly requestId: string;
  readonly results: readonly SearchResult[];
}

interface IndexedSurface {
  readonly raw: string;
  readonly normalized: string;
  readonly tokens: readonly string[];
  readonly isLabel: boolean;
}

interface IndexedDocument {
  readonly document: RuntimeSearchDocument;
  readonly normalizedLabel: string;
  readonly surfaces: readonly IndexedSurface[];
}

export interface SearchIndex {
  readonly size: number;
  readonly search: (query: SearchQuery) => readonly SearchResult[];
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function tokenize(normalized: string): readonly string[] {
  return normalized ? normalized.split(" ") : [];
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function uniqueSurfaces(document: RuntimeSearchDocument): readonly IndexedSurface[] {
  const seen = new Set<string>();
  const surfaces: IndexedSurface[] = [];
  const raw = [document.label, ...document.terms];
  raw.forEach((value, index) => {
    const normalized = normalizeSearchText(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    surfaces.push({
      raw: value,
      normalized,
      tokens: tokenize(normalized),
      isLabel: index === 0,
    });
  });
  return surfaces;
}

function allQueryTokensPrefixMatch(
  queryTokens: readonly string[],
  surfaceTokens: readonly string[],
): boolean {
  return queryTokens.every((queryToken) =>
    surfaceTokens.some((surfaceToken) => surfaceToken.startsWith(queryToken)),
  );
}

function allQueryTokensContained(
  queryTokens: readonly string[],
  normalizedSurface: string,
): boolean {
  return queryTokens.every((token) => normalizedSurface.includes(token));
}

function scoreSurface(
  query: string,
  queryTokens: readonly string[],
  surface: IndexedSurface,
): number | null {
  if (surface.normalized === query) return surface.isLabel ? 1000 : 940;
  if (surface.normalized.startsWith(query)) return surface.isLabel ? 880 : 820;

  if (
    queryTokens.length > 0 &&
    allQueryTokensPrefixMatch(queryTokens, surface.tokens)
  ) {
    return surface.isLabel ? 760 : 700;
  }

  if (surface.normalized.includes(query)) return surface.isLabel ? 640 : 600;

  if (
    queryTokens.length > 1 &&
    allQueryTokensContained(queryTokens, surface.normalized)
  ) {
    return surface.isLabel ? 540 : 500;
  }

  return null;
}

function indexDocument(document: RuntimeSearchDocument): IndexedDocument {
  return {
    document,
    normalizedLabel: normalizeSearchText(document.label),
    surfaces: uniqueSurfaces(document),
  };
}

function resultFor(indexed: IndexedDocument, query: string): SearchResult | null {
  const queryTokens = tokenize(query);
  let bestScore: number | null = null;
  let matchedTerm = "";

  for (const surface of indexed.surfaces) {
    const score = scoreSurface(query, queryTokens, surface);
    if (score === null) continue;
    if (bestScore === null || score > bestScore) {
      bestScore = score;
      matchedTerm = surface.raw;
    }
  }

  if (bestScore === null) return null;
  return {
    id: indexed.document.id,
    kind: indexed.document.kind,
    label: indexed.document.label,
    score: bestScore,
    matchedTerm,
    ...(indexed.document.definition === undefined
      ? {}
      : { definition: indexed.document.definition }),
  };
}

export function createSearchIndex(
  documents: readonly RuntimeSearchDocument[],
): SearchIndex {
  const indexed = documents.map(indexDocument);

  return {
    size: indexed.length,
    search(queryInput: SearchQuery): readonly SearchResult[] {
      const query = normalizeSearchText(queryInput.query);
      if (!query) return [];

      const limit = Math.max(1, Math.min(queryInput.limit ?? 50, 500));
      const kindSet =
        queryInput.kinds === undefined
          ? null
          : new Set<RuntimeSearchKind>(queryInput.kinds);

      const results: SearchResult[] = [];
      for (const document of indexed) {
        if (kindSet !== null && !kindSet.has(document.document.kind)) continue;
        const result = resultFor(document, query);
        if (result !== null) results.push(result);
      }

      results.sort((a, b) => {
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;
        const labelDiff = compareText(
          normalizeSearchText(a.label),
          normalizeSearchText(b.label),
        );
        if (labelDiff !== 0) return labelDiff;
        const kindDiff = compareText(a.kind, b.kind);
        if (kindDiff !== 0) return kindDiff;
        return compareText(a.id, b.id);
      });

      return results.slice(0, limit);
    },
  };
}

export function handleSearchRequest(
  index: SearchIndex,
  request: SearchRequest,
): SearchResponse {
  return {
    type: "search_result",
    requestId: request.requestId,
    results: index.search(request.query),
  };
}
