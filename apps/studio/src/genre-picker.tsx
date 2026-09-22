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
  RuntimeKnowledgePayload,
} from "@vgine/runtime-data";
import type { SearchIndex } from "@vgine/search";

import { HoldFavoriteOption } from "./hold-favorite-option.js";
import { Icon } from "./icons.js";
import { KnowledgeTerm } from "./knowledge-term.js";
import { useI18n } from "./i18n.js";
import { PoolQuickView, type PoolQuickViewMode } from "./pool-quick-view.js";
import { usePoolPreferences } from "./pool-preferences.js";
import { useExpandedPoolSegment } from "./use-expanded-pool-segment.js";
import { useSlashSearchShortcut } from "./use-slash-search-shortcut.js";

const COMPACT_RESULT_COUNT = 12;

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

interface GenreOption {
  readonly id: string;
  readonly label: string;
  readonly majorGenreIds: readonly string[];
  readonly isMajor: boolean;
  readonly knowledgeEntryId: string | null;
}

export interface GenrePickerProps {
  readonly runtime: RuntimeBootstrap;
  readonly searchIndex: SearchIndex;
  readonly spec: MusicSpec;
  readonly activeRole: GenreInfluenceRole;
  readonly onRoleChange: (role: GenreInfluenceRole) => void;
  readonly onSpecChange: (spec: MusicSpec) => void;
  readonly assistOn: boolean;
  readonly loadKnowledge: () => Promise<RuntimeKnowledgePayload>;
}

function genreIdForRole(
  spec: MusicSpec,
  role: GenreInfluenceRole,
): string | null {
  return spec.genre_influences.find((entry) => entry.role === role)?.genre_id ?? null;
}

function genreOption(genre: RuntimeGenre): GenreOption {
  return {
    id: genre.id,
    label: genre.label,
    majorGenreIds: genre.major_genre_ids,
    isMajor: false,
    knowledgeEntryId: genre.knowledge_entry_id,
  };
}

function majorOption(major: RuntimeMajorGenre): GenreOption {
  return {
    id: major.id,
    label: major.label,
    majorGenreIds: [major.id],
    isMajor: true,
    knowledgeEntryId: major.knowledge_entry_id,
  };
}

function sortGenres(genres: readonly RuntimeGenre[]): RuntimeGenre[] {
  return [...genres].sort((a, b) => a.label.localeCompare(b.label));
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function GenrePicker({
  runtime,
  searchIndex,
  spec,
  activeRole,
  onRoleChange,
  onSpecChange,
  assistOn,
  loadKnowledge,
}: GenrePickerProps) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [majorId, setMajorId] = useState<string | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [quickView, setQuickView] = useState<PoolQuickViewMode>("all");
  const [pickerOpen, setPickerOpen] = useState(false);
  const roleTriggerRefs = useRef<
    Partial<Record<GenreInfluenceRole, HTMLButtonElement | null>>
  >({});
  const searchInputRef = useSlashSearchShortcut(pickerOpen);
  const {
    segmentRef: pickerRef,
    showReturnToStart: showBackToTop,
    scrollToStart: scrollToPickerStart,
  } = useExpandedPoolSegment(showAllResults);
  const genrePreferences = usePoolPreferences("genres");

  const orderedMajors = useMemo(
    () =>
      [...runtime.core.major_genres].sort(
        (a, b) =>
          a.source_ordinal - b.source_ordinal || a.label.localeCompare(b.label),
      ),
    [runtime.core.major_genres],
  );

  const majorById = useMemo(
    () => new Map(orderedMajors.map((major) => [major.id, major])),
    [orderedMajors],
  );

  const genreById = useMemo(
    () => new Map(runtime.genres.genres.map((genre) => [genre.id, genre])),
    [runtime.genres.genres],
  );

  const genreByLabel = useMemo(
    () => new Map(runtime.genres.genres.map((genre) => [genre.label, genre])),
    [runtime.genres.genres],
  );

  const optionById = useMemo(() => {
    const options = new Map<string, GenreOption>();
    for (const major of orderedMajors) options.set(major.id, majorOption(major));
    for (const genre of runtime.genres.genres) {
      options.set(genre.id, genreOption(genre));
    }
    return options;
  }, [orderedMajors, runtime.genres.genres]);

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
    ].map(genreOption);
  }, [genreByLabel, runtime.genres.genres]);

  const matchingOptions = useMemo(() => {
    const searchQuery = deferredQuery.trim();

    if (searchQuery) {
      const seen = new Set<string>();
      const majorMatches = orderedMajors
        .filter((major) => normalized(major.label).includes(normalized(searchQuery)))
        .map(majorOption);
      const genreMatches = searchIndex
        .search({
          query: searchQuery,
          kinds: ["genre"],
          limit: runtime.genres.genres.length,
        })
        .map((result) => genreById.get(result.id))
        .filter((genre): genre is RuntimeGenre => genre !== undefined)
        .map(genreOption);

      return genrePreferences.sortFavoriteFirst(
        [...majorMatches, ...genreMatches].filter((option) => {
          if (seen.has(option.id)) return false;
          seen.add(option.id);
          return true;
        }),
        (option) => option.id,
      );
    }

    if (majorId) {
      const major = majorById.get(majorId);
      if (!major) return [];
      const first = majorOption(major);
      const subgenres = sortGenres(
        runtime.genres.genres.filter(
          (genre) =>
            genre.major_genre_ids.includes(majorId) &&
            normalized(genre.label) !== normalized(major.label),
        ),
      ).map(genreOption);

      return [
        first,
        ...genrePreferences.sortFavoriteFirst(subgenres, (option) => option.id),
      ];
    }

    return genrePreferences.sortFavoriteFirst(browseGenres, (option) => option.id);
  }, [
    browseGenres,
    deferredQuery,
    genreById,
    genrePreferences,
    majorById,
    majorId,
    orderedMajors,
    runtime.genres.genres,
    searchIndex,
  ]);

  const favoriteCount = useMemo(() => {
    let count = 0;
    for (const major of orderedMajors) {
      if (genrePreferences.isFavorite(major.id)) count += 1;
    }
    for (const genre of runtime.genres.genres) {
      if (genrePreferences.isFavorite(genre.id)) count += 1;
    }
    return count;
  }, [genrePreferences, orderedMajors, runtime.genres.genres]);

  const recentCount = useMemo(() => {
    let count = 0;
    for (const option of optionById.values()) {
      if (genrePreferences.lastUsedAt(option.id) > 0) count += 1;
    }
    return count;
  }, [genrePreferences, optionById]);

  const poolOptions = useMemo(() => {
    if (quickView === "favorites") {
      return matchingOptions.filter((option) =>
        genrePreferences.isFavorite(option.id),
      );
    }
    if (quickView === "recent") {
      return matchingOptions
        .filter((option) => genrePreferences.lastUsedAt(option.id) > 0)
        .sort(
          (a, b) =>
            genrePreferences.lastUsedAt(b.id) -
              genrePreferences.lastUsedAt(a.id) ||
            a.label.localeCompare(b.label),
        );
    }
    return matchingOptions;
  }, [genrePreferences, matchingOptions, quickView]);

  const visibleOptions = showAllResults
    ? poolOptions
    : poolOptions.slice(0, COMPACT_RESULT_COUNT);

  useEffect(() => {
    setShowAllResults(false);
  }, [query, majorId, quickView]);

  useEffect(() => {
    if (!pickerOpen) return;

    const frame = window.requestAnimationFrame(() => {
      const panel = pickerRef.current;
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      panel?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });

      if (
        window.matchMedia("(min-width: 761px) and (pointer: fine)").matches
      ) {
        searchInputRef.current?.focus({ preventScroll: true });
        searchInputRef.current?.select();
      }
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      const role = activeRole;
      setPickerOpen(false);
      setShowAllResults(false);
      window.requestAnimationFrame(() => {
        roleTriggerRefs.current[role]?.focus({ preventScroll: true });
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeRole, pickerOpen, pickerRef, searchInputRef]);

  function roleLabel(role: GenreInfluenceRole): string {
    return t(
      role === "foundation"
        ? "genre.foundation"
        : role === "fusion"
          ? "genre.fusion"
          : "genre.accent",
    );
  }

  function rolePurpose(role: GenreInfluenceRole): string {
    return t(
      role === "foundation"
        ? "genre.foundationPurpose"
        : role === "fusion"
          ? "genre.fusionPurpose"
          : "genre.accentPurpose",
    );
  }

  function restoreRoleFocus(role: GenreInfluenceRole) {
    window.requestAnimationFrame(() => {
      roleTriggerRefs.current[role]?.focus({ preventScroll: true });
    });
  }

  function closePicker(restoreFocus = false) {
    const role = activeRole;
    setPickerOpen(false);
    setShowAllResults(false);
    if (restoreFocus) restoreRoleFocus(role);
  }

  function openRole(role: GenreInfluenceRole) {
    const hasFoundation = genreIdForRole(spec, "foundation") !== null;
    if (!hasFoundation && role !== "foundation") return;
    onRoleChange(role);
    setPickerOpen(true);
    setShowAllResults(false);
  }

  function selectGenre(option: GenreOption) {
    genrePreferences.recordUse(option.id);
    onSpecChange(setGenreInfluence(spec, activeRole, option.id));
    setPickerOpen(false);
    setShowAllResults(false);
    setQuery("");
    setMajorId(null);
    restoreRoleFocus(activeRole);
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
    restoreRoleFocus(role);
  }

  function familyLabel(option: GenreOption): string {
    if (option.isMajor) return t("genre.majorGenre");
    return option.majorGenreIds
      .map((id) => majorById.get(id)?.label)
      .filter((value): value is string => Boolean(value))
      .slice(0, 2)
      .join(" / ");
  }

  return (
    <>
      <div
        className="genre-slots"
        data-facet="genre"
        aria-label={t("genre.influencesAria")}
      >
        {(["foundation", "fusion", "accent"] as const).map((role, index) => {
          const selectedId = genreIdForRole(spec, role);
          const option = selectedId ? optionById.get(selectedId) : undefined;
          const disabled =
            role !== "foundation" && genreIdForRole(spec, "foundation") === null;

          if (!option) {
            return (
              <button
                key={role}
                ref={(element) => {
                  roleTriggerRefs.current[role] = element;
                }}
                type="button"
                className="add-genre"
                data-role={role}
                disabled={disabled}
                aria-expanded={pickerOpen && activeRole === role}
                aria-controls={
                  pickerOpen && activeRole === role
                    ? "genre-picker-panel"
                    : undefined
                }
                onClick={() => openRole(role)}
              >
                <span className="plus">
                  <Icon name="plus" />
                </span>
                <strong>
                  {t(
                    role === "foundation"
                      ? "genre.chooseFoundation"
                      : role === "fusion"
                        ? "genre.addFusion"
                        : "genre.addAccent",
                  )}
                </strong>
                <span>
                  {t(
                    role === "foundation"
                      ? "genre.foundationHint"
                      : role === "fusion"
                        ? "genre.fusionHint"
                        : "genre.accentHint",
                  )}
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
                  0{index + 1} / {roleLabel(role)}
                </span>
                <span className="genre-card-status">LIVE</span>
              </div>
              <div className="genre-art" aria-hidden="true" />
              <h3>
                <KnowledgeTerm
                  entryId={option.knowledgeEntryId}
                  label={option.label}
                  enabled={assistOn}
                  loadKnowledge={loadKnowledge}
                  contextType="genre"
                  contextKey={option.id}
                />
              </h3>
              <div className="genre-family">{familyLabel(option)}</div>
              <div className="genre-purpose">{rolePurpose(role)}</div>
              <div className="genre-actions">
                <button
                  ref={(element) => {
                    roleTriggerRefs.current[role] = element;
                  }}
                  type="button"
                  aria-expanded={pickerOpen && activeRole === role}
                  aria-controls={
                    pickerOpen && activeRole === role
                      ? "genre-picker-panel"
                      : undefined
                  }
                  onClick={() => openRole(role)}
                >
                  {t("genre.change")} <Icon name="arrow" />
                </button>
                <button
                  type="button"
                  className="genre-remove"
                  aria-label={t("genre.remove", { role: roleLabel(role) })}
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
        <span>{t("genre.roleInfo")}</span>
      </div>

      {pickerOpen && (
        <section
          id="genre-picker-panel"
          ref={pickerRef}
          className="genre-picker-panel"
          aria-label={t("genre.chooseRole", { role: roleLabel(activeRole) })}
        >
          <div className="picker-top">
            <div>
              <h3>{t("genre.chooseRole", { role: roleLabel(activeRole) })}</h3>
              <p>{t("genre.pickerSubtitle")}</p>
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label={t("genre.close")}
              onClick={() => closePicker(true)}
            >
              <Icon name="close" />
            </button>
          </div>

          <div className="pool-control-stack genre-pool-controls">
            <label className="searchbox">
              <Icon name="search" />
              <span className="sr-only">{t("genre.searchAria")}</span>
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                autoComplete="off"
                placeholder={t("genre.searchPlaceholder", {
                  count: runtime.genres.genres.length.toLocaleString(locale),
                })}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
              {query ? (
                <button
                  type="button"
                  className="search-clear"
                  aria-label={t("genre.clearSearch")}
                  onClick={() => setQuery("")}
                >
                  <Icon name="close" />
                </button>
              ) : (
                <kbd>/</kbd>
              )}
            </label>

            <PoolQuickView
              value={quickView}
              favoriteCount={favoriteCount}
              recentCount={recentCount}
              onChange={setQuickView}
            />

            <div className="family-chips" aria-label="Major Genres">
              <button
                type="button"
                className={!majorId ? "chip selected" : "chip"}
                onClick={() => setMajorId(null)}
              >
                {t("genre.all")}
              </button>
              {orderedMajors.map((major) => (
                <button
                  key={major.id}
                  type="button"
                  className={majorId === major.id ? "chip selected" : "chip"}
                  onClick={() => setMajorId(major.id)}
                >
                  {major.label}
                </button>
              ))}
            </div>

            <div className="result-meta">
              <span>
                {t("genre.results", {
                  count: poolOptions.length.toLocaleString(locale),
                })}
                {majorId ? " · " + (majorById.get(majorId)?.label ?? "") : ""}
                {favoriteCount > 0
                  ? " · " +
                    t("genre.favorites", {
                      count: favoriteCount.toLocaleString(locale),
                    })
                  : ""}
              </span>
            </div>
          </div>

          <div
            className={showAllResults ? "genre-results expanded" : "genre-results"}
          >
            {visibleOptions.map((option) => {
              const selectedRole = spec.genre_influences.find(
                (entry) => entry.genre_id === option.id,
              )?.role;
              const favorite = genrePreferences.isFavorite(option.id);
              return (
                <HoldFavoriteOption
                  key={option.id}
                  className={[
                    "genre-result",
                    selectedRole ? "picked" : "",
                    option.isMajor ? "major-option" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  favorite={favorite}
                  usageCount={genrePreferences.usageCount(option.id)}
                  activationLabel={option.label}
                  onFavorite={() => genrePreferences.setFavorite(option.id, true)}
                  onUnfavorite={() => genrePreferences.setFavorite(option.id, false)}
                  onActivate={() => {
                    if (!selectedRole) selectGenre(option);
                  }}
                >
                  <span>
                    <KnowledgeTerm
                      entryId={option.knowledgeEntryId}
                      label={option.label}
                      enabled={assistOn}
                      loadKnowledge={loadKnowledge}
                      contextType="genre"
                      contextKey={option.id}
                      onActivate={() => {
                        if (!selectedRole) selectGenre(option);
                      }}
                    />
                  </span>
                  <small>{familyLabel(option)}</small>
                  {selectedRole && (
                    <small className="picked-label">
                      {roleLabel(selectedRole)} ✓
                    </small>
                  )}
                </HoldFavoriteOption>
              );
            })}
          </div>

          {visibleOptions.length === 0 && (
            <p className="empty-state">{t("genre.noResults")}</p>
          )}

          {poolOptions.length > COMPACT_RESULT_COUNT && !showAllResults && (
            <button
              type="button"
              className="show-all-btn"
              onClick={() => setShowAllResults(true)}
            >
              {t("genre.showAll", {
                count: poolOptions.length.toLocaleString(locale),
              })}
              <Icon name="arrow" />
            </button>
          )}

          {showAllResults && poolOptions.length > COMPACT_RESULT_COUNT && (
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                setShowAllResults(false);
                            scrollToPickerStart();
              }}
            >
              {t("genre.compact")}
              <Icon name="up" />
            </button>
          )}

          {showBackToTop && (
            <button
              type="button"
              className="picker-back-to-top"
              aria-label={t("genre.backTop")}
              title={t("genre.backTop")}
              onClick={scrollToPickerStart}
            >
              <Icon name="up" />
            </button>
          )}
        </section>
      )}

      <div className="guide-card">
        <Icon name="spark" />
        <div>
          <strong>{t("genre.guideTitle")}</strong>
          <p>{t("genre.guideBody")}</p>
        </div>
        <span className="badge">
          {t("genre.reviewed", {
            count: runtime.genres.genres.length.toLocaleString(locale),
          })}
        </span>
      </div>
    </>
  );
}
