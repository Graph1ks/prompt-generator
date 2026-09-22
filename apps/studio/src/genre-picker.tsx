import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  removeGenreInfluence,
  resetMusicSpecFacets,
  setGenreInfluence,
  type GenreInfluenceRole,
  type MusicSpec,
} from "@vgine/music-spec";
import type {
  RuntimeBootstrap,
  RuntimeGenre,
  RuntimeMajorGenre,
} from "@vgine/runtime-data";
import type { SearchIndex } from "@vgine/search";

import { HoldFavoriteOption } from "./hold-favorite-option.js";
import { Icon } from "./icons.js";
import { usePoolPreferences } from "./pool-preferences.js";

const ROLE_META: Readonly<
  Record<
    GenreInfluenceRole,
    { readonly label: string; readonly purpose: string; readonly number: string }
  >
> = {
  foundation: {
    label: "Foundation",
    purpose: "Führt die musikalische Sprache.",
    number: "01",
  },
  fusion: {
    label: "Fusion",
    purpose: "Bringt eine zweite Perspektive hinein.",
    number: "02",
  },
  accent: {
    label: "Accent",
    purpose: "Färbt den Sound, ohne ihn zu übernehmen.",
    number: "03",
  },
};

const COMPACT_RESULT_COUNT = 12;
const FEATURED_MAJOR_LABELS = new Set([
  "Hip-Hop / Rap",
  "Soul",
  "Jazz",
  "Electronic",
  "Rock",
  "Pop",
  "Ambient / New Age",
]);

const FEATURED_GENRES = [
  "Trip-Hop",
  "Neo-Soul",
  "Boom Bap",
  "Lo-Fi Hip-Hop",
  "Deep House",
  "Dream Pop",
  "Downtempo",
  "Alternative R&B",
  "Ambient",
  "Synthpop",
] as const;

export interface GenrePickerProps {
  readonly runtime: RuntimeBootstrap;
  readonly searchIndex: SearchIndex;
  readonly spec: MusicSpec;
  readonly activeRole: GenreInfluenceRole;
  readonly onRoleChange: (role: GenreInfluenceRole) => void;
  readonly onSpecChange: (spec: MusicSpec) => void;
}

function genreIdForRole(
  spec: MusicSpec,
  role: GenreInfluenceRole,
): string | null {
  return spec.genre_influences.find((entry) => entry.role === role)?.genre_id ?? null;
}

function sortGenres(genres: readonly RuntimeGenre[]): RuntimeGenre[] {
  return [...genres].sort((a, b) => a.label.localeCompare(b.label));
}

export function GenrePicker({
  runtime,
  searchIndex,
  spec,
  activeRole,
  onRoleChange,
  onSpecChange,
}: GenrePickerProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [majorId, setMajorId] = useState<string | null>(null);
  const [showAllFamilies, setShowAllFamilies] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLElement | null>(null);
  const genrePreferences = usePoolPreferences("genres");

  const genreById = useMemo(
    () => new Map(runtime.genres.genres.map((genre) => [genre.id, genre])),
    [runtime.genres.genres],
  );
  const genreByLabel = useMemo(
    () => new Map(runtime.genres.genres.map((genre) => [genre.label, genre])),
    [runtime.genres.genres],
  );
  const majorById = useMemo(
    () => new Map(runtime.core.major_genres.map((major) => [major.id, major])),
    [runtime.core.major_genres],
  );

  const orderedMajors = useMemo(
    () =>
      [...runtime.core.major_genres].sort(
        (a, b) =>
          a.source_ordinal - b.source_ordinal || a.label.localeCompare(b.label),
      ),
    [runtime.core.major_genres],
  );

  const visibleMajors = useMemo(
    () =>
      showAllFamilies
        ? orderedMajors
        : orderedMajors.filter((major) => FEATURED_MAJOR_LABELS.has(major.label)),
    [orderedMajors, showAllFamilies],
  );

  const browseGenres = useMemo(() => {
    const featured = FEATURED_GENRES.map((label) => genreByLabel.get(label)).filter(
      (genre): genre is RuntimeGenre => genre !== undefined,
    );
    const featuredIds = new Set(featured.map((genre) => genre.id));
    return [
      ...featured,
      ...sortGenres(
        runtime.genres.genres.filter((genre) => !featuredIds.has(genre.id)),
      ),
    ];
  }, [genreByLabel, runtime.genres.genres]);

  const matchingGenres = useMemo(() => {
    const normalizedQuery = deferredQuery.trim();
    let matches: RuntimeGenre[];

    if (normalizedQuery) {
      matches = searchIndex
        .search({
          query: normalizedQuery,
          kinds: ["genre"],
          limit: runtime.genres.genres.length,
        })
        .map((result) => genreById.get(result.id))
        .filter((genre): genre is RuntimeGenre => genre !== undefined);
    } else if (majorId) {
      matches = sortGenres(
        runtime.genres.genres.filter((genre) =>
          genre.major_genre_ids.includes(majorId),
        ),
      );
    } else {
      matches = browseGenres;
    }

    return genrePreferences.sortFavoriteFirst(matches, (genre) => genre.id);
  }, [
    browseGenres,
    deferredQuery,
    genreById,
    genrePreferences,
    majorId,
    runtime.genres.genres,
    searchIndex,
  ]);

  const visibleGenres = showAllResults
    ? matchingGenres
    : matchingGenres.slice(0, COMPACT_RESULT_COUNT);

  const favoriteCount = useMemo(
    () =>
      runtime.genres.genres.reduce(
        (count, genre) => count + (genrePreferences.isFavorite(genre.id) ? 1 : 0),
        0,
      ),
    [genrePreferences, runtime.genres.genres],
  );

  useEffect(() => {
    setShowAllResults(false);
  }, [query, majorId]);

  function openRole(role: GenreInfluenceRole) {
    const hasFoundation = genreIdForRole(spec, "foundation") !== null;
    if (!hasFoundation && role !== "foundation") return;
    onRoleChange(role);
    setPickerOpen(true);
    setShowAllResults(false);
  }

  function selectGenre(genre: RuntimeGenre) {
    genrePreferences.recordUse(genre.id);
    onSpecChange(setGenreInfluence(spec, activeRole, genre.id));
    setPickerOpen(false);
    setShowAllResults(false);
    setQuery("");
    setMajorId(null);
  }

  function clearRole(role: GenreInfluenceRole) {
    const next =
      role === "foundation"
        ? resetMusicSpecFacets(spec, ["genre"])
        : removeGenreInfluence(spec, role);
    onSpecChange(next);
    onRoleChange("foundation");
    setPickerOpen(false);
    setShowAllResults(false);
    setQuery("");
    setMajorId(null);
  }

  function familyLabel(genre: RuntimeGenre): string {
    return genre.major_genre_ids
      .map((id) => majorById.get(id)?.label)
      .filter((value): value is string => Boolean(value))
      .slice(0, 2)
      .join(" / ");
  }

  return (
    <>
      <div className="genre-slots" aria-label="Genre influences">
        {(["foundation", "fusion", "accent"] as const).map((role) => {
          const genreId = genreIdForRole(spec, role);
          const genre = genreId ? genreById.get(genreId) : undefined;
          const meta = ROLE_META[role];
          const disabled =
            role !== "foundation" && genreIdForRole(spec, "foundation") === null;

          if (!genre) {
            return (
              <button
                key={role}
                type="button"
                className="add-genre"
                data-role={role}
                disabled={disabled}
                onClick={() => openRole(role)}
              >
                <span className="plus">
                  <Icon name="plus" />
                </span>
                <strong>
                  {role === "foundation"
                    ? "Foundation wählen"
                    : role === "fusion"
                      ? "Fusion hinzufügen"
                      : "Accent hinzufügen"}
                </strong>
                <span>
                  {role === "foundation"
                    ? "Optional — dein Prompt funktioniert auch ohne Genre."
                    : role === "fusion"
                      ? "Eine neue Perspektive."
                      : "Ein kleines bisschen anders."}
                </span>
              </button>
            );
          }

          return (
            <article
              key={role}
              className="genre-card"
              data-role={role}
              data-selected={pickerOpen && activeRole === role ? "" : undefined}
            >
              <div className="genre-card-role">
                <span>
                  {meta.number} / {meta.label}
                </span>
                <span className="genre-card-status">LIVE</span>
              </div>
              <div className="genre-art" aria-hidden="true" />
              <h3>{genre.label}</h3>
              <div className="genre-family">{familyLabel(genre)}</div>
              <div className="genre-purpose">{meta.purpose}</div>
              <div className="genre-actions">
                <button type="button" onClick={() => openRole(role)}>
                  Ändern <Icon name="arrow" />
                </button>
                <button
                  type="button"
                  className="genre-remove"
                  aria-label={meta.label + " entfernen"}
                  onClick={() => clearRole(role)}
                >
                  <Icon name="close" />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="role-info">
        <Icon name="info" />
        <span>
          Genres sind optional. Wenn du welche setzt: Foundation führt, Fusion
          ergänzt, Accent färbt. Keine Prozentregler.
        </span>
      </div>

      {pickerOpen && (
        <section
          ref={pickerRef}
          className="genre-picker-panel"
          aria-label="Genre auswählen"
        >
          <div className="picker-top">
            <div>
              <h3>{ROLE_META[activeRole].label} wählen</h3>
              <p>Major Genre oder Subgenre — beides funktioniert.</p>
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label="Genre-Auswahl schließen"
              onClick={() => {
                setPickerOpen(false);
                setShowAllResults(false);
              }}
            >
              <Icon name="close" />
            </button>
          </div>

          <label className="searchbox">
            <Icon name="search" />
            <span className="sr-only">Genres durchsuchen</span>
            <input
              type="search"
              value={query}
              autoComplete="off"
              placeholder={
                runtime.genres.genres.length.toLocaleString() +
                " Genres & Subgenres durchsuchen …"
              }
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
            {query ? (
              <button
                type="button"
                className="search-clear"
                aria-label="Suche leeren"
                onClick={() => setQuery("")}
              >
                <Icon name="close" />
              </button>
            ) : (
              <kbd>/</kbd>
            )}
          </label>

          <div className="family-chips">
            <button
              type="button"
              className={!majorId ? "chip selected" : "chip"}
              onClick={() => setMajorId(null)}
            >
              Alle
            </button>
            {visibleMajors.map((major: RuntimeMajorGenre) => (
              <button
                key={major.id}
                type="button"
                className={majorId === major.id ? "chip selected" : "chip"}
                onClick={() => setMajorId(major.id)}
              >
                {major.label}
              </button>
            ))}
            <button
              type="button"
              className="chip"
              onClick={() => setShowAllFamilies((current) => !current)}
            >
              {showAllFamilies ? "Weniger" : "Alle 24 Familien"}
              <Icon name={showAllFamilies ? "back" : "plus"} />
            </button>
          </div>

          <div className="result-meta">
            <span>
              {matchingGenres.length.toLocaleString()} Treffer
              {majorId ? " · " + (majorById.get(majorId)?.label ?? "") : ""}
              {favoriteCount > 0
                ? " · " + favoriteCount.toLocaleString() + " Favoriten"
                : ""}
            </span>
            <span className="favorite-hint">
              <Icon name="star" />
              1,5 s halten = Favorit · 2 s = entfernen
            </span>
          </div>

          <div
            className={showAllResults ? "genre-results expanded" : "genre-results"}
          >
            {visibleGenres.map((genre) => {
              const selectedRole = spec.genre_influences.find(
                (entry) => entry.genre_id === genre.id,
              )?.role;
              const favorite = genrePreferences.isFavorite(genre.id);
              return (
                <HoldFavoriteOption
                  key={genre.id}
                  className={selectedRole ? "genre-result picked" : "genre-result"}
                  favorite={favorite}
                  usageCount={genrePreferences.usageCount(genre.id)}
                  onFavorite={() => genrePreferences.setFavorite(genre.id, true)}
                  onUnfavorite={() => genrePreferences.setFavorite(genre.id, false)}
                  onActivate={() => {
                    if (!selectedRole) selectGenre(genre);
                  }}
                >
                  <span>{genre.label}</span>
                  <small>{familyLabel(genre)}</small>
                  {selectedRole && (
                    <small className="picked-label">
                      {ROLE_META[selectedRole].label} ✓
                    </small>
                  )}
                </HoldFavoriteOption>
              );
            })}
          </div>

          {visibleGenres.length === 0 && (
            <p className="empty-state">
              Kein Treffer. Versuch einen anderen Begriff oder eine andere
              Genre-Familie.
            </p>
          )}

          {matchingGenres.length > COMPACT_RESULT_COUNT && !showAllResults && (
            <button
              type="button"
              className="show-all-btn"
              onClick={() => setShowAllResults(true)}
            >
              Alle {matchingGenres.length.toLocaleString()} anzeigen
              <Icon name="arrow" />
            </button>
          )}

          {showAllResults && matchingGenres.length > COMPACT_RESULT_COUNT && (
            <>
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  setShowAllResults(false);
                  pickerRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                Kompakt anzeigen
                <Icon name="up" />
              </button>
              <button
                type="button"
                className="picker-back-to-top"
                aria-label="Zurück zum Anfang der Genre-Liste"
                title="Zurück zum Anfang"
                onClick={() =>
                  pickerRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
              >
                <Icon name="up" />
              </button>
            </>
          )}
        </section>
      )}

      <div className="guide-card">
        <Icon name="spark" />
        <div>
          <strong>Dein Pool lernt mit.</strong>
          <p>
            Favoriten stehen zuerst und werden dort nach tatsächlicher Nutzung
            sortiert. Die Präferenz gilt unabhängig vom aktuellen Prompt.
          </p>
        </div>
        <span className="badge">
          {runtime.genres.genres.length.toLocaleString()} reviewed
        </span>
      </div>
    </>
  );
}
