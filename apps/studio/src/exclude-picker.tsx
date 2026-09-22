import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  hasExcludeItem,
  removeExcludeItem,
  setExcludeItem,
  type MusicSpec,
} from "@vgine/music-spec";
import type {
  RuntimeEditorPayload,
  RuntimeExcludeEntry,
} from "@vgine/runtime-data";

import { HoldFavoriteOption } from "./hold-favorite-option.js";
import { Icon } from "./icons.js";
import { useI18n } from "./i18n.js";
import { usePoolPreferences } from "./pool-preferences.js";
import type { StudioRuntime } from "./runtime-client.js";
import { useExpandedPoolSegment } from "./use-expanded-pool-segment.js";

const COMPACT_RESULT_COUNT = 12;

type EditorState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly value: RuntimeEditorPayload }
  | { readonly status: "error"; readonly message: string };

export interface ExcludePickerProps {
  readonly runtime: StudioRuntime;
  readonly spec: MusicSpec;
  readonly onSpecChange: (spec: MusicSpec) => void;
}

export function ExcludePicker({
  runtime,
  spec,
  onSpecChange,
}: ExcludePickerProps) {
  const { locale, t } = useI18n();
  const [editor, setEditor] = useState<EditorState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [showAllResults, setShowAllResults] = useState(false);
  const preferences = usePoolPreferences("exclude");
  const {
    segmentRef,
    showReturnToStart,
    scrollToStart,
  } = useExpandedPoolSegment(showAllResults);

  useEffect(() => {
    let live = true;
    void runtime
      .loadEditor()
      .then((value) => {
        if (live) setEditor({ status: "ready", value });
      })
      .catch((error: unknown) => {
        if (!live) return;
        setEditor({
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
  }, [query]);

  const data = editor.status === "ready" ? editor.value : null;

  const excludeById = useMemo(
    () =>
      new Map(
        (data?.exclude ?? []).map((entry) => [entry.id, entry] as const),
      ),
    [data],
  );

  const matchingEntries = useMemo(() => {
    if (!data) return [];
    const normalized = deferredQuery.trim().toLocaleLowerCase();
    const source = normalized
      ? data.exclude.filter((entry) =>
          (entry.label + " " + entry.output_text)
            .toLocaleLowerCase()
            .includes(normalized),
        )
      : [...data.exclude];

    return preferences.sortFavoriteFirst(source, (entry) => entry.id);
  }, [data, deferredQuery, preferences]);

  const visibleEntries = showAllResults
    ? matchingEntries
    : matchingEntries.slice(0, COMPACT_RESULT_COUNT);

  function toggleEntry(entry: RuntimeExcludeEntry) {
    if (hasExcludeItem(spec, entry.id)) {
      onSpecChange(removeExcludeItem(spec, entry.id));
      return;
    }

    preferences.recordUse(entry.id);
    onSpecChange(
      setExcludeItem(spec, {
        id: entry.id,
        text: entry.output_text,
        origin: "user",
        locked: false,
      }),
    );
  }

  if (editor.status === "loading") {
    return (
      <section className="exclude-panel field-card">
        <div className="instrument-loading">
          <span className="runtime-spinner" aria-hidden="true" />
          <strong>{t("facetEditor.loading")}</strong>
        </div>
      </section>
    );
  }

  if (editor.status === "error") {
    return (
      <section className="exclude-panel field-card">
        <div className="facet-editor-state error">
          <Icon name="info" />
          <span>{t("facetEditor.error")}</span>
          <small>{editor.message}</small>
        </div>
      </section>
    );
  }

  return (
    <section ref={segmentRef} className="exclude-panel field-card">
      <div className="exclude-panel-head">
        <div>
          <div className="field-label">
            <span>{t("exclude.title")}</span>
            <span className="badge">
              {editor.value.exclude.length.toLocaleString(locale)}
            </span>
          </div>
          <p>{t("exclude.subtitle")}</p>
        </div>
        <span className="facet-selected-count">
          {t("exclude.selected", {
            count: spec.exclude.length.toLocaleString(locale),
          })}
        </span>
      </div>

      {spec.exclude.length > 0 && (
        <div className="instrument-selected-list">
          {spec.exclude.map((item, index) => {
            const runtimeEntry = item.id ? excludeById.get(item.id) : undefined;
            const label = runtimeEntry?.label ?? item.text;
            return (
              <button
                key={item.id ?? item.text + index}
                type="button"
                className="instrument-selected-chip exclude-selected-chip"
                title={t("exclude.remove", { label })}
                onClick={() => {
                  if (!item.id) return;
                  onSpecChange(removeExcludeItem(spec, item.id));
                }}
              >
                <span>{label}</span>
                {item.id && <Icon name="close" />}
              </button>
            );
          })}
        </div>
      )}

      <label className="searchbox exclude-search">
        <Icon name="search" />
        <span className="sr-only">{t("exclude.searchAria")}</span>
        <input
          type="search"
          value={query}
          autoComplete="off"
          placeholder={t("exclude.searchPlaceholder", {
            count: editor.value.exclude.length.toLocaleString(locale),
          })}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        {query ? (
          <button
            type="button"
            className="search-clear"
            aria-label={t("exclude.clearSearch")}
            onClick={() => setQuery("")}
          >
            <Icon name="close" />
          </button>
        ) : (
          <kbd>/</kbd>
        )}
      </label>

      <div className="result-meta">
        <span>
          {t("exclude.results", {
            count: matchingEntries.length.toLocaleString(locale),
          })}
        </span>
      </div>

      <div
        className={showAllResults ? "exclude-results expanded" : "exclude-results"}
      >
        {visibleEntries.map((entry) => {
          const selected = hasExcludeItem(spec, entry.id);
          return (
            <HoldFavoriteOption
              key={entry.id}
              className={selected ? "exclude-result picked" : "exclude-result"}
              favorite={preferences.isFavorite(entry.id)}
              usageCount={preferences.usageCount(entry.id)}
              onFavorite={() => preferences.setFavorite(entry.id, true)}
              onUnfavorite={() => preferences.setFavorite(entry.id, false)}
              onActivate={() => toggleEntry(entry)}
            >
              <span>{entry.label}</span>
              <small>{entry.output_text}</small>
              {selected && (
                <span className="instrument-picked" aria-hidden="true">
                  ✓
                </span>
              )}
            </HoldFavoriteOption>
          );
        })}
      </div>

      {visibleEntries.length === 0 && (
        <p className="empty-state">{t("exclude.noResults")}</p>
      )}

      {matchingEntries.length > COMPACT_RESULT_COUNT && !showAllResults && (
        <button
          type="button"
          className="show-all-btn"
          onClick={() => setShowAllResults(true)}
        >
          {t("exclude.showAll", {
            count: matchingEntries.length.toLocaleString(locale),
          })}
          <Icon name="arrow" />
        </button>
      )}

      {showAllResults && matchingEntries.length > COMPACT_RESULT_COUNT && (
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            setShowAllResults(false);
            scrollToStart();
          }}
        >
          {t("exclude.compact")}
          <Icon name="up" />
        </button>
      )}

      {showReturnToStart && (
        <button
          type="button"
          className="picker-back-to-top"
          aria-label={t("exclude.backTop")}
          title={t("exclude.backTop")}
          onClick={scrollToStart}
        >
          <Icon name="up" />
        </button>
      )}

      <div className="guide-card exclude-guide">
        <Icon name="info" />
        <div>
          <strong>{t("exclude.guideTitle")}</strong>
          <p>{t("exclude.guideBody")}</p>
        </div>
      </div>
    </section>
  );
}
