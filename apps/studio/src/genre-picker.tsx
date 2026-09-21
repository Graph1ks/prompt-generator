import { useDeferredValue, useEffect, useMemo, useState } from "react";
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
import type { SearchIndex } from "@vgine/search";

import { Icon } from "./icons.js";

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

const PAGE_SIZE = 12;
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
  readonly spec: MusicSpec | null;
  readonly activeRole: GenreInfluenceRole;
  readonly onRoleChange: (role: GenreInfluenceRole) => void;
  readonly onSpecChange: (spec: MusicSpec) => void;
}

function genreIdForRole(
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
  searchIndex,
  spec,
  activeRole,
  onRoleChange,
  onSpecChange,
}: GenrePickerProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [majorId, setMajorId] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [showAllFamilies, setShowAllFamilies] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(spec === null);

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

  const allMatches = useMemo(() => {
    const normalizedQuery = deferredQuery.trim();
    if (normalizedQuery) {
      return searchIndex
        .search({ query: normalizedQuery, kinds: ["genre"], limit: 500 })
        .map((result) => genreById.get(result.id))
        .filter((genre): genre is RuntimeGenre => genre !== undefined);
    }

    if (majorId) {
      return sortGenres(
        runtime.genres.genres.filter((genre) =>
          genre.major_genre_ids.includes(majorId),
        ),
      );
    }

    return FEATURED_GENRES.map((label) => genreByLabel.get(label)).filter(
      (genre): genre is RuntimeGenre => genre !== undefined,
    );
  }, [
    deferredQuery,
    genreById,
    genreByLabel,
    majorId,
    runtime.genres.genres,
    searchIndex,
  ]);

  const visibleGenres = allMatches.slice(0, limit);
  const resultCountLabel =
    deferredQuery.trim() && allMatches.length === 500
      ? "500+"
      : allMatches.length.toLocaleString();

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [query, majorId]);

  function openRole(role: GenreInfluenceRole) {
    if (spec === null && role !== "foundation") return;
    onRoleChange(role);
    setPickerOpen(true);
  }

  function selectGenre(genre: RuntimeGenre) {
    if (spec === null) {
      onSpecChange(createMusicSpec(genre.id));
      onRoleChange("foundation");
    } else {
      onSpecChange(setGenreInfluence(spec, activeRole, genre.id));
    }
    setPickerOpen(false);
    setQuery("");
    setMajorId(null);
  }

  function clearOptionalRole(role: "fusion" | "accent") {
    if (spec === null) return;
    onSpecChange(removeGenreInfluence(spec, role));
    onRoleChange(role);
    setPickerOpen(true);
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
          const disabled = spec === null && role !== "foundation";

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
                    ? "Der Ausgangspunkt für deinen Sound."
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
                {role !== "foundation" && (
                  <button
                    type="button"
                    className="genre-remove"
                    aria-label={meta.label + " entfernen"}
                    onClick={() => clearOptionalRole(role)}
                  >
                    <Icon name="close" />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="role-info">
        <Icon name="info" />
        <span>
          Foundation führt. Fusion ergänzt. Accent färbt. Keine Prozentregler —
          jede Rolle bleibt semantisch nachvollziehbar.
        </span>
      </div>

      {pickerOpen && (
        <section className="genre-picker-panel" aria-label="Genre auswählen">
          <div className="picker-top">
            <div>
              <h3>{ROLE_META[activeRole].label} wählen</h3>
              <p>Major Genre oder Subgenre — beides funktioniert.</p>
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label="Genre-Auswahl schließen"
              onClick={() => setPickerOpen(false)}
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
            {resultCountLabel} Treffer
            {majorId ? " · " + (majorById.get(majorId)?.label ?? "") : ""}
            {!query.trim() && !majorId ? " · kuratierter Einstieg" : ""}
          </div>

          <div className="genre-results">
            {visibleGenres.map((genre) => {
              const selectedRole = spec?.genre_influences.find(
                (entry) => entry.genre_id === genre.id,
              )?.role;
              return (
                <button
                  key={genre.id}
                  type="button"
                  className={selectedRole ? "genre-result picked" : "genre-result"}
                  disabled={Boolean(selectedRole)}
                  onClick={() => selectGenre(genre)}
                >
                  <span>{genre.label}</span>
                  <small>{familyLabel(genre)}</small>
                  {selectedRole && (
                    <small className="picked-label">
                      {ROLE_META[selectedRole].label} ✓
                    </small>
                  )}
                </button>
              );
            })}
          </div>

          {visibleGenres.length === 0 && (
            <p className="empty-state">
              Kein Treffer. Versuch einen anderen Begriff oder eine andere
              Genre-Familie.
            </p>
          )}

          {allMatches.length > limit && (
            <button
              type="button"
              className="text-btn"
              onClick={() => setLimit((current) => current + PAGE_SIZE)}
            >
              Weitere {Math.min(PAGE_SIZE, allMatches.length - limit)} anzeigen
              <Icon name="arrow" />
            </button>
          )}
        </section>
      )}

      <div className="guide-card">
        <Icon name="spark" />
        <div>
          <strong>Echte Taxonomie statt Demo-Regeln.</strong>
          <p>
            Auswahl, Suche und Compiler laufen jetzt über Runtime Pack,
            MusicSpec und den Produktionscompiler.
          </p>
        </div>
        <span className="badge">
          {runtime.genres.genres.length.toLocaleString()} reviewed
        </span>
      </div>
    </>
  );
}
