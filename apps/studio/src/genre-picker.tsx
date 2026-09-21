import { useEffect, useMemo, useState } from "react";
import {
  createMusicSpec,
  removeGenreInfluence,
  setGenreInfluence,
  type GenreInfluenceRole,
  type MusicSpec,
} from "@vgine/music-spec";
import type {
  RuntimeBootstrap,
  RuntimeGenre,
  RuntimeMajorGenre,
} from "@vgine/runtime-data";
import { createSearchIndex } from "@vgine/search";
import { Button, Cluster, Stack, Text } from "@vgine/ui";

const ROLE_LABELS: Readonly<Record<GenreInfluenceRole, string>> = {
  foundation: "Foundation",
  fusion: "Fusion",
  accent: "Accent",
};

const PAGE_SIZE = 48;

export interface GenrePickerProps {
  readonly runtime: RuntimeBootstrap;
  readonly spec: MusicSpec | null;
  readonly activeRole: GenreInfluenceRole;
  readonly onRoleChange: (role: GenreInfluenceRole) => void;
  readonly onSpecChange: (spec: MusicSpec) => void;
}

function genreForRole(
  spec: MusicSpec | null,
  role: GenreInfluenceRole,
): string | null {
  return spec?.genre_influences.find((entry) => entry.role === role)?.genre_id ?? null;
}

function sortGenres(genres: readonly RuntimeGenre[]): RuntimeGenre[] {
  return [...genres].sort((a, b) => a.label.localeCompare(b.label));
}

export function GenrePicker({
  runtime,
  spec,
  activeRole,
  onRoleChange,
  onSpecChange,
}: GenrePickerProps) {
  const [query, setQuery] = useState("");
  const [majorId, setMajorId] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const genreById = useMemo(
    () => new Map(runtime.genres.genres.map((genre) => [genre.id, genre])),
    [runtime.genres.genres],
  );
  const majorById = useMemo(
    () => new Map(runtime.core.major_genres.map((major) => [major.id, major])),
    [runtime.core.major_genres],
  );
  const index = useMemo(
    () => createSearchIndex(runtime.search.documents),
    [runtime.search.documents],
  );

  const majorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const genre of runtime.genres.genres) {
      for (const id of genre.major_genre_ids) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return counts;
  }, [runtime.genres.genres]);

  const orderedMajors = useMemo(
    () =>
      [...runtime.core.major_genres].sort(
        (a, b) => a.source_ordinal - b.source_ordinal || a.label.localeCompare(b.label),
      ),
    [runtime.core.major_genres],
  );

  const matchingGenres = useMemo(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery) {
      return index
        .search({ query: normalizedQuery, kinds: ["genre"], limit: Math.min(limit, 500) })
        .map((result) => genreById.get(result.id))
        .filter((genre): genre is RuntimeGenre => genre !== undefined);
    }
    if (majorId) {
      return sortGenres(
        runtime.genres.genres.filter((genre) =>
          genre.major_genre_ids.includes(majorId),
        ),
      ).slice(0, limit);
    }
    return [];
  }, [genreById, index, limit, majorId, query, runtime.genres.genres]);

  const totalForMajor =
    majorId === null
      ? 0
      : runtime.genres.genres.filter((genre) =>
          genre.major_genre_ids.includes(majorId),
        ).length;

  const canShowMore =
    query.trim().length > 0
      ? matchingGenres.length === limit && limit < 500
      : majorId !== null && matchingGenres.length < totalForMajor;

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [query, majorId]);

  function selectGenre(genre: RuntimeGenre) {
    if (spec === null) {
      onSpecChange(createMusicSpec(genre.id));
      onRoleChange("foundation");
      return;
    }
    onSpecChange(setGenreInfluence(spec, activeRole, genre.id));
  }

  function clearOptionalRole(role: "fusion" | "accent") {
    if (spec === null) return;
    onSpecChange(removeGenreInfluence(spec, role));
  }

  return (
    <div className="genre-picker">
      <div className="genre-role-grid" aria-label="Genre influence roles">
        {(["foundation", "fusion", "accent"] as const).map((role) => {
          const genreId = genreForRole(spec, role);
          const selectedGenre = genreId ? genreById.get(genreId) : undefined;
          const disabled = spec === null && role !== "foundation";
          return (
            <div key={role} className="genre-role-slot" data-active={role === activeRole || undefined}>
              <button
                type="button"
                className="genre-role-button"
                disabled={disabled}
                aria-pressed={role === activeRole}
                onClick={() => onRoleChange(role)}
              >
                <span>{ROLE_LABELS[role]}</span>
                <strong>{selectedGenre?.label ?? (role === "foundation" ? "Required" : "Optional")}</strong>
              </button>
              {role !== "foundation" && genreId && (
                <button
                  type="button"
                  className="genre-role-clear"
                  aria-label={"Clear " + ROLE_LABELS[role] + " genre"}
                  onClick={() => clearOptionalRole(role)}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      <label className="genre-search">
        <span className="sr-only">Search genres</span>
        <input
          type="search"
          value={query}
          placeholder={"Search " + runtime.genres.genres.length.toLocaleString() + " genres for " + ROLE_LABELS[activeRole] + "…"}
          autoComplete="off"
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear genre search"
            onClick={() => setQuery("")}
          >
            ×
          </button>
        )}
      </label>

      {!query.trim() && majorId === null ? (
        <div className="major-genre-grid" aria-label="Major genres">
          {orderedMajors.map((major: RuntimeMajorGenre) => (
            <button
              key={major.id}
              type="button"
              className="major-genre-card"
              onClick={() => setMajorId(major.id)}
            >
              <span>{major.label}</span>
              <small>{majorCounts.get(major.id) ?? 0}</small>
            </button>
          ))}
        </div>
      ) : (
        <Stack gap="3">
          <Cluster gap="2" className="genre-result-heading">
            {majorId && !query.trim() && (
              <>
                <Button size="sm" tone="ghost" onClick={() => setMajorId(null)}>
                  ← Majors
                </Button>
                <Text as="strong" size="sm">
                  {majorById.get(majorId)?.label ?? "Genre"}
                </Text>
              </>
            )}
            {query.trim() && (
              <Text as="small" tone="muted" size="xs">
                SEARCH RESULTS
              </Text>
            )}
            <Text as="small" tone="muted" size="xs">
              {matchingGenres.length} shown
            </Text>
          </Cluster>

          <div className="genre-results">
            {matchingGenres.map((genre) => {
              const selectedRole = spec?.genre_influences.find(
                (entry) => entry.genre_id === genre.id,
              )?.role;
              return (
                <button
                  key={genre.id}
                  type="button"
                  className="genre-result"
                  data-selected={selectedRole || undefined}
                  onClick={() => selectGenre(genre)}
                >
                  <span className="genre-result-copy">
                    <strong>{genre.label}</strong>
                    <small>
                      {genre.major_genre_ids
                        .map((id) => majorById.get(id)?.label)
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </span>
                  <span className="genre-result-action">
                    {selectedRole ? ROLE_LABELS[selectedRole] : "Set " + ROLE_LABELS[activeRole]}
                  </span>
                </button>
              );
            })}
          </div>

          {matchingGenres.length === 0 && (
            <div className="genre-empty">
              <Text as="p" tone="muted" size="sm">
                No reviewed genre matches this search.
              </Text>
            </div>
          )}

          {canShowMore && (
            <Button tone="ghost" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
              Show more
            </Button>
          )}
        </Stack>
      )}
    </div>
  );
}
