import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  hasFacetSelection,
  removeFacetSelection,
  resetMusicSpecFacets,
  setFacetSelection,
  type MusicSpec,
} from "@vgine/music-spec";
import type {
  RuntimeInstrumentExpression,
  RuntimeInstrumentLibrary,
} from "@vgine/runtime-data";

import { HoldFavoriteOption } from "./hold-favorite-option.js";
import { Icon } from "./icons.js";
import { KnowledgeTerm } from "./knowledge-term.js";
import { useI18n } from "./i18n.js";
import { PoolQuickView, type PoolQuickViewMode } from "./pool-quick-view.js";
import { usePoolPreferences } from "./pool-preferences.js";
import type { StudioRuntime } from "./runtime-client.js";
import { useExpandedPoolSegment } from "./use-expanded-pool-segment.js";
import { useSlashSearchShortcut } from "./use-slash-search-shortcut.js";

const COMPACT_RESULT_COUNT = 12;
const EXPANDED_CHUNK = 144;

type LibraryState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly value: RuntimeInstrumentLibrary }
  | { readonly status: "error"; readonly message: string };

export interface InstrumentPickerProps {
  readonly runtime: StudioRuntime;
  readonly spec: MusicSpec;
  readonly onSpecChange: (spec: MusicSpec) => void;
  readonly assistOn: boolean;
}

function defaultExpressionOrder(
  expressions: readonly RuntimeInstrumentExpression[],
): RuntimeInstrumentExpression[] {
  return [...expressions].sort(
    (a, b) =>
      b.track_count - a.track_count ||
      b.occurrence_count - a.occurrence_count ||
      a.label.localeCompare(b.label),
  );
}

export function InstrumentPicker({
  runtime,
  spec,
  onSpecChange,
  assistOn,
}: InstrumentPickerProps) {
  const { locale, t } = useI18n();
  const [library, setLibrary] = useState<LibraryState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [quickView, setQuickView] = useState<PoolQuickViewMode>("all");
  const [showAllResults, setShowAllResults] = useState(false);
  const [renderLimit, setRenderLimit] = useState(EXPANDED_CHUNK);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useSlashSearchShortcut();
  const preferences = usePoolPreferences("instrument-expressions");
  const {
    segmentRef,
    showReturnToStart,
    scrollToStart,
  } = useExpandedPoolSegment(showAllResults);

  useEffect(() => {
    let live = true;
    void runtime
      .loadInstrumentLibrary()
      .then((value) => {
        if (live) setLibrary({ status: "ready", value });
      })
      .catch((error: unknown) => {
        if (!live) return;
        setLibrary({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
    return () => {
      live = false;
    };
  }, [runtime]);

  useEffect(() => {
    setShowAllResults(false);
    setRenderLimit(EXPANDED_CHUNK);
  }, [query, familyId, quickView]);

  const data = library.status === "ready" ? library.value : null;
  const sectionKnowledgeEntryId =
    runtime.bootstrap.core.sections.find(
      (section) => section.key === "instruments",
    )?.knowledge_entry_id ?? null;

  const instrumentById = useMemo(
    () =>
      new Map(
        data?.instruments.instruments.map((instrument) => [
          instrument.id,
          instrument,
        ]) ?? [],
      ),
    [data],
  );

  const expressionById = useMemo(
    () =>
      new Map(
        data?.expressions.expressions.map((expression) => [
          expression.id,
          expression,
        ]) ?? [],
      ),
    [data],
  );

  const familyById = useMemo(
    () =>
      new Map(
        data?.instruments.families.map((family) => [family.id, family]) ?? [],
      ),
    [data],
  );

  const selectedExpressions = useMemo(
    () =>
      (spec.facets.instruments?.selections ?? [])
        .map((selection) =>
          selection.id ? expressionById.get(selection.id) : undefined,
        )
        .filter(
          (expression): expression is RuntimeInstrumentExpression =>
            expression !== undefined,
        ),
    [expressionById, spec.facets.instruments?.selections],
  );

  function familyIdsForExpression(
    expression: RuntimeInstrumentExpression,
  ): readonly string[] {
    const ids = new Set<string>();
    for (const link of expression.instruments) {
      const instrument = instrumentById.get(link.instrument_id);
      if (instrument?.family_id) ids.add(instrument.family_id);
    }
    return [...ids];
  }

  function familyLabelsForExpression(
    expression: RuntimeInstrumentExpression,
  ): string {
    const labels = familyIdsForExpression(expression)
      .map((id) => familyById.get(id)?.label)
      .filter((label): label is string => Boolean(label));
    return labels.length > 0
      ? labels.join(" / ")
      : t("instrument.familyOther");
  }

  function identityLabelsForExpression(
    expression: RuntimeInstrumentExpression,
  ): string {
    const labels = expression.instruments
      .map((link) => instrumentById.get(link.instrument_id)?.label)
      .filter((label): label is string => Boolean(label));
    return [...new Set(labels)].join(" · ");
  }

  const matchingExpressions = useMemo(() => {
    if (!data) return [];

    const searchQuery = deferredQuery.trim();
    let matches: RuntimeInstrumentExpression[];

    if (searchQuery) {
      matches = runtime.searchIndex
        .search({
          query: searchQuery,
          kinds: ["instrument_expression"],
          limit: data.expressions.expressions.length,
        })
        .map((result) => expressionById.get(result.id))
        .filter(
          (expression): expression is RuntimeInstrumentExpression =>
            expression !== undefined,
        );
    } else {
      matches = defaultExpressionOrder(data.expressions.expressions);
    }

    if (familyId) {
      matches = matches.filter((expression) =>
        familyIdsForExpression(expression).includes(familyId),
      );
    }

    return preferences.sortFavoriteFirst(matches, (expression) => expression.id);
  }, [
    data,
    deferredQuery,
    expressionById,
    familyId,
    instrumentById,
    preferences,
    runtime.searchIndex,
  ]);

  const favoriteCount = useMemo(
    () =>
      matchingExpressions.reduce(
        (count, expression) =>
          count + (preferences.isFavorite(expression.id) ? 1 : 0),
        0,
      ),
    [matchingExpressions, preferences],
  );

  const recentCount = useMemo(
    () =>
      matchingExpressions.reduce(
        (count, expression) =>
          count + (preferences.lastUsedAt(expression.id) > 0 ? 1 : 0),
        0,
      ),
    [matchingExpressions, preferences],
  );

  const poolExpressions = useMemo(() => {
    if (quickView === "favorites") {
      return matchingExpressions.filter((expression) =>
        preferences.isFavorite(expression.id),
      );
    }
    if (quickView === "recent") {
      return matchingExpressions
        .filter((expression) => preferences.lastUsedAt(expression.id) > 0)
        .sort(
          (a, b) =>
            preferences.lastUsedAt(b.id) -
              preferences.lastUsedAt(a.id) ||
            a.label.localeCompare(b.label),
        );
    }
    return matchingExpressions;
  }, [matchingExpressions, preferences, quickView]);

  const visibleExpressions = showAllResults
    ? poolExpressions.slice(0, renderLimit)
    : poolExpressions.slice(0, COMPACT_RESULT_COUNT);

  useEffect(() => {
    if (!showAllResults) return;
    if (renderLimit >= poolExpressions.length) return;

    const target = sentinelRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      setRenderLimit(poolExpressions.length);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setRenderLimit((current) =>
          Math.min(current + EXPANDED_CHUNK, poolExpressions.length),
        );
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [poolExpressions.length, renderLimit, showAllResults]);

  function toggleExpression(expression: RuntimeInstrumentExpression) {
    if (hasFacetSelection(spec, "instruments", expression.id)) {
      onSpecChange(removeFacetSelection(spec, "instruments", expression.id));
      return;
    }

    preferences.recordUse(expression.id);
    onSpecChange(
      setFacetSelection(spec, "instruments", {
        id: expression.id,
        kind: "option",
        value: expression.output_text,
        origin: "user",
        locked: false,
      }),
    );
  }

  if (library.status === "loading") {
    return (
      <section className="instrument-panel field-card" data-facet="instruments">
        <div className="instrument-loading">
          <span className="runtime-spinner" aria-hidden="true" />
          <strong>{t("instrument.loading")}</strong>
        </div>
      </section>
    );
  }

  if (library.status === "error") {
    return (
      <section className="instrument-panel field-card" data-facet="instruments">
        <div className="runtime-card error">
          <Icon name="info" />
          <div>
            <strong>{t("instrument.error")}</strong>
            <small>{library.message}</small>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={segmentRef}
      className="instrument-panel field-card"
      data-facet="instruments"
    >
      <div className="instrument-panel-head">
        <div>
          <div className="field-label">
            <span>
              <KnowledgeTerm
                entryId={sectionKnowledgeEntryId}
                label={t("instrument.title")}
                enabled={assistOn}
                loadKnowledge={runtime.loadKnowledge}
                contextType="section"
                contextKey="instruments"
              />
            </span>
            <span className="badge">
              {library.value.expressions.expressions.length.toLocaleString(locale)}
            </span>
          </div>
          <p>{t("instrument.subtitle")}</p>
        </div>
        <span className="instrument-selected-count">
          {t("instrument.selected", {
            count: selectedExpressions.length.toLocaleString(locale),
          })}
        </span>
      </div>

      {selectedExpressions.length > 0 && (
        <div className="selected-pool">
          <div className="selected-pool-head">
            <div>
              <strong>{t("instrument.current")}</strong>
              <small>
                {t("instrument.selected", {
                  count: selectedExpressions.length.toLocaleString(locale),
                })}
              </small>
            </div>
            <button
              type="button"
              className="text-btn selected-pool-clear"
              onClick={() =>
                onSpecChange(resetMusicSpecFacets(spec, ["instruments"]))
              }
            >
              {t("instrument.clearAll")}
            </button>
          </div>
          <div className="instrument-selected-list">
            {selectedExpressions.map((expression) => (
              <button
                key={expression.id}
                type="button"
                className="instrument-selected-chip"
                title={t("instrument.remove", { label: expression.label })}
                onClick={() =>
                  onSpecChange(
                    removeFacetSelection(spec, "instruments", expression.id),
                  )
                }
              >
                <span>{expression.label}</span>
                <Icon name="close" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pool-control-stack instrument-pool-controls">
        <label className="searchbox instrument-search">
          <Icon name="search" />
          <span className="sr-only">{t("instrument.searchAria")}</span>
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            autoComplete="off"
            placeholder={t("instrument.searchPlaceholder", {
              count:
                library.value.expressions.expressions.length.toLocaleString(locale),
            })}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          {query ? (
            <button
              type="button"
              className="search-clear"
              aria-label={t("instrument.clearSearch")}
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

        <div className="family-chips instrument-family-chips">
          <button
            type="button"
            className={familyId === null ? "chip selected" : "chip"}
            onClick={() => setFamilyId(null)}
          >
            {t("instrument.allFamilies")}
          </button>
          {library.value.instruments.families.map((family) => (
            <button
              key={family.id}
              type="button"
              className={familyId === family.id ? "chip selected" : "chip"}
              onClick={() => setFamilyId(family.id)}
            >
              {family.label}
            </button>
          ))}
        </div>

        <div className="result-meta">
          <span>
            {t("instrument.results", {
              count: poolExpressions.length.toLocaleString(locale),
            })}
          </span>
        </div>
      </div>

      <div
        className={
          showAllResults
            ? "instrument-results expanded"
            : "instrument-results"
        }
      >
        {visibleExpressions.map((expression) => {
          const selected = hasFacetSelection(
            spec,
            "instruments",
            expression.id,
          );
          const identities = identityLabelsForExpression(expression);
          const linkedInstrument = expression.instruments
            .map((link) => instrumentById.get(link.instrument_id))
            .find((instrument) => instrument?.knowledge_entry_id);
          const knowledgeEntryId =
            linkedInstrument?.knowledge_entry_id ??
            expression.concepts.find((concept) => concept.entry_id)?.entry_id ??
            null;
          return (
            <HoldFavoriteOption
              key={expression.id}
              className={[
                "instrument-result",
                selected ? "picked" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              favorite={preferences.isFavorite(expression.id)}
              usageCount={preferences.usageCount(expression.id)}
              activationLabel={expression.label}
              onFavorite={() => preferences.setFavorite(expression.id, true)}
              onUnfavorite={() => preferences.setFavorite(expression.id, false)}
              onActivate={() => toggleExpression(expression)}
            >
              <span className="instrument-result-title">
                <KnowledgeTerm
                  entryId={knowledgeEntryId}
                  label={expression.label}
                  enabled={assistOn}
                  loadKnowledge={runtime.loadKnowledge}
                  contextType="instrument_expression"
                  contextKey={expression.id}
                  onActivate={() => toggleExpression(expression)}
                />
              </span>
              <small>{familyLabelsForExpression(expression)}</small>
              <small className="instrument-result-detail">
                {identities
                  ? t("instrument.identity") + ": " + identities
                  : t("instrument.semantic")}
              </small>
              {selected && <span className="instrument-picked">✓</span>}
            </HoldFavoriteOption>
          );
        })}
      </div>

      {visibleExpressions.length === 0 && (
        <p className="empty-state">{t("instrument.noResults")}</p>
      )}

      {poolExpressions.length > COMPACT_RESULT_COUNT && !showAllResults && (
        <button
          type="button"
          className="show-all-btn"
          onClick={() => {
            setRenderLimit(EXPANDED_CHUNK);
            setShowAllResults(true);
          }}
        >
          {t("instrument.showAll", {
            count: poolExpressions.length.toLocaleString(locale),
          })}
          <Icon name="arrow" />
        </button>
      )}

      {showAllResults && poolExpressions.length > COMPACT_RESULT_COUNT && (
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            setShowAllResults(false);
            setRenderLimit(EXPANDED_CHUNK);
            scrollToStart();
          }}
        >
          {t("instrument.compact")}
          <Icon name="up" />
        </button>
      )}

      {showAllResults && renderLimit < poolExpressions.length && (
        <div ref={sentinelRef} className="instrument-load-sentinel" aria-hidden="true" />
      )}

      {showReturnToStart && (
        <button
          type="button"
          className="picker-back-to-top"
          aria-label={t("instrument.backTop")}
          title={t("instrument.backTop")}
          onClick={scrollToStart}
        >
          <Icon name="up" />
        </button>
      )}

      <div className="guide-card instrument-guide">
        <Icon name="spark" />
        <div>
          <strong>{t("instrument.guideTitle")}</strong>
          <p>{t("instrument.guideBody")}</p>
        </div>
      </div>
    </section>
  );
}
