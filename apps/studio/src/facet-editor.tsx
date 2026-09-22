import { useEffect, useMemo, useRef, useState } from "react";
import {
  hasFacetSelection,
  removeFacetSelection,
  setFacetCustomText,
  setFacetSelection,
  type FacetKey,
  type MusicSpec,
  type Selection,
} from "@vgine/music-spec";
import type {
  RuntimeEditorPayload,
  RuntimeParameter,
  RuntimeParameterOption,
} from "@vgine/runtime-data";

import { HoldFavoriteOption } from "./hold-favorite-option.js";
import { Icon } from "./icons.js";
import { KnowledgeTerm } from "./knowledge-term.js";
import { useI18n } from "./i18n.js";
import type { StudioRuntime } from "./runtime-client.js";
import type { StudioEditorMode } from "./studio-config.js";
import { useAdvancedPresets } from "./use-advanced-presets.js";

type EditorState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly value: RuntimeEditorPayload }
  | { readonly status: "error"; readonly message: string };

const COMPACT_OPTIONS_PER_PARAMETER = 10;

export interface FacetEditorProps {
  readonly facet: Exclude<FacetKey, "genre" | "instruments">;
  readonly label: string;
  readonly runtime: StudioRuntime;
  readonly spec: MusicSpec;
  readonly onSpecChange: (spec: MusicSpec) => void;
  readonly assistOn: boolean;
  readonly mode: StudioEditorMode;
  readonly onModeChange: (mode: StudioEditorMode) => void;
}

export function FacetEditor({
  facet,
  label,
  runtime,
  spec,
  onSpecChange,
  assistOn,
  mode,
  onModeChange,
}: FacetEditorProps) {
  const { t } = useI18n();
  const [editor, setEditor] = useState<EditorState>({ status: "loading" });
  const [expandedParameters, setExpandedParameters] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [clearPresetsArmed, setClearPresetsArmed] = useState(false);
  const clearPresetsTimerRef = useRef<number | null>(null);
  const advancedPresets = useAdvancedPresets(facet);

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

  useEffect(
    () => () => {
      if (clearPresetsTimerRef.current !== null) {
        window.clearTimeout(clearPresetsTimerRef.current);
      }
    },
    [],
  );

  const data = editor.status === "ready" ? editor.value : null;
  const sectionKnowledgeEntryId =
    runtime.bootstrap.core.sections.find((section) => section.key === facet)
      ?.knowledge_entry_id ?? null;

  const statements = useMemo(
    () =>
      (data?.statements ?? [])
        .filter(
          (statement) =>
            statement.section_key === facet &&
            statement.mode_scope !== "advanced",
        )
        .sort(
          (a, b) =>
            (a.sort_order ?? Number.MAX_SAFE_INTEGER) -
              (b.sort_order ?? Number.MAX_SAFE_INTEGER) ||
            (b.source_frequency ?? 0) - (a.source_frequency ?? 0) ||
            a.label.localeCompare(b.label),
        ),
    [data, facet],
  );

  const parameters = useMemo(
    () =>
      (data?.parameters ?? [])
        .filter(
          (parameter) =>
            parameter.section_key === facet && parameter.advanced_visible,
        )
        .sort(
          (a, b) =>
            a.sort_order - b.sort_order || a.label.localeCompare(b.label),
        ),
    [data, facet],
  );

  const optionsByParameter = useMemo(() => {
    const map = new Map<string, RuntimeParameterOption[]>();
    for (const option of data?.parameter_options ?? []) {
      const entries = map.get(option.parameter_id) ?? [];
      entries.push(option);
      map.set(option.parameter_id, entries);
    }
    for (const entries of map.values()) {
      entries.sort(
        (a, b) =>
          a.sort_order - b.sort_order || a.label.localeCompare(b.label),
      );
    }
    return map;
  }, [data]);

  const statementById = useMemo(
    () => new Map(statements.map((statement) => [statement.id, statement] as const)),
    [statements],
  );
  const optionById = useMemo(() => {
    const map = new Map<string, RuntimeParameterOption>();
    for (const options of optionsByParameter.values()) {
      for (const option of options) map.set(option.id, option);
    }
    return map;
  }, [optionsByParameter]);
  const numberParameterByValueId = useMemo(
    () =>
      new Map(
        parameters
          .filter((parameter) => parameter.ui?.control === "number")
          .map((parameter) => [parameter.id + ":value", parameter] as const),
      ),
    [parameters],
  );

  const facetState = spec.facets[facet];
  const customText = facetState?.custom_text ?? "";
  const matchingPreset = advancedPresets.findByText(customText);
  const selectedCount =
    (facetState?.selections.length ?? 0) +
    (customText.trim() ? 1 : 0);

  const currentSelections = useMemo(
    () =>
      (facetState?.selections ?? []).map((selection) => {
        const statement = statementById.get(selection.id);
        if (statement) {
          return {
            id: selection.id,
            label: statement.label,
            detail: statement.output_text,
          };
        }

        const option = optionById.get(selection.id);
        if (option) {
          return {
            id: selection.id,
            label: option.label,
            detail: option.output_fragment,
          };
        }

        const numberParameter = numberParameterByValueId.get(selection.id);
        if (numberParameter) {
          const unit = numberParameter.ui?.unit
            ? " " + numberParameter.ui.unit
            : "";
          return {
            id: selection.id,
            label: selection.value + unit,
            detail: numberParameter.label,
          };
        }

        return {
          id: selection.id,
          label: selection.value,
          detail: selection.value,
        };
      }),
    [
      facetState?.selections,
      numberParameterByValueId,
      optionById,
      statementById,
    ],
  );

  function replaceFacetState(
    source: MusicSpec,
    selections: readonly Selection[],
    customTextValue: string | null,
  ): MusicSpec {
    const current = source.facets[facet] ?? {
      locked: false,
      selections: [],
      custom_text: null,
    };
    return {
      ...source,
      facets: {
        ...source.facets,
        [facet]: {
          ...current,
          selections,
          custom_text: customTextValue,
        },
      },
    };
  }

  function withoutEasySelections(source: MusicSpec): MusicSpec {
    const current = source.facets[facet];
    if (!current) return source;
    const nextSelections = current.selections.filter(
      (selection) => selection.kind !== "statement",
    );
    if (nextSelections.length === current.selections.length) return source;
    return replaceFacetState(source, nextSelections, current.custom_text);
  }

  function emptyFacetForEasy(source: MusicSpec): MusicSpec {
    return replaceFacetState(source, [], null);
  }

  function toggleStatement(id: string, outputText: string) {
    const selected = hasFacetSelection(spec, facet, id);
    const clean = emptyFacetForEasy(spec);
    if (selected) {
      onSpecChange(clean);
      return;
    }

    onSpecChange(
      setFacetSelection(clean, facet, {
        id,
        kind: "statement",
        value: outputText,
        origin: "statement",
        locked: false,
      }),
    );
  }

  function setNumberParameter(
    parameter: RuntimeParameter,
    value: number,
  ) {
    if (!parameter.ui || parameter.ui.control !== "number") return;

    const normalized = Math.min(
      parameter.ui.max,
      Math.max(parameter.ui.min, value),
    );
    const snapped =
      Math.round((normalized - parameter.ui.min) / parameter.ui.step) *
        parameter.ui.step +
      parameter.ui.min;
    const displayValue = Number(snapped.toFixed(6));
    let next = withoutEasySelections(spec);

    for (const sibling of optionsByParameter.get(parameter.id) ?? []) {
      if (hasFacetSelection(next, facet, sibling.id)) {
        next = removeFacetSelection(next, facet, sibling.id);
      }
    }

    const valueId = parameter.id + ":value";
    if (hasFacetSelection(next, facet, valueId)) {
      next = removeFacetSelection(next, facet, valueId);
    }

    onSpecChange(
      setFacetSelection(next, facet, {
        id: valueId,
        kind: "freeform",
        value: String(displayValue),
        origin: "user",
        locked: false,
      }),
    );
  }

  function selectedNumberValue(parameter: RuntimeParameter): number | null {
    if (!parameter.ui || parameter.ui.control !== "number") return null;
    const selection = facetState?.selections.find(
      (entry) => entry.id === parameter.id + ":value",
    );
    if (!selection) return null;
    const value = Number(selection.value);
    return Number.isFinite(value) ? value : null;
  }

  function clearNumberParameter(parameter: RuntimeParameter) {
    const valueId = parameter.id + ":value";
    const clean = withoutEasySelections(spec);
    if (!hasFacetSelection(clean, facet, valueId)) {
      if (clean !== spec) onSpecChange(clean);
      return;
    }
    onSpecChange(removeFacetSelection(clean, facet, valueId));
  }

  function toggleOption(
    option: RuntimeParameterOption,
    parameter: RuntimeParameter,
  ) {
    let next = withoutEasySelections(spec);

    if (hasFacetSelection(next, facet, option.id)) {
      onSpecChange(removeFacetSelection(next, facet, option.id));
      return;
    }

    if (parameter.value_type !== "multi") {
      for (const sibling of optionsByParameter.get(parameter.id) ?? []) {
        if (
          sibling.id !== option.id &&
          hasFacetSelection(next, facet, sibling.id)
        ) {
          next = removeFacetSelection(next, facet, sibling.id);
        }
      }
      const numberValueId = parameter.id + ":value";
      if (hasFacetSelection(next, facet, numberValueId)) {
        next = removeFacetSelection(next, facet, numberValueId);
      }
    }

    onSpecChange(
      setFacetSelection(next, facet, {
        id: option.id,
        kind: "option",
        value: option.output_fragment,
        origin: "user",
        locked: false,
      }),
    );
  }

  function removeCurrentSelection(id: string) {
    onSpecChange(removeFacetSelection(spec, facet, id));
  }

  function clearCurrentCustomText() {
    onSpecChange(setFacetCustomText(spec, facet, null));
  }

  function clearFacetState() {
    onSpecChange(replaceFacetState(spec, [], null));
  }

  function updateCustomText(value: string) {
    const clean = value.trim().length > 0 ? withoutEasySelections(spec) : spec;
    onSpecChange(
      setFacetCustomText(
        clean,
        facet,
        value.trim().length > 0 ? value : null,
      ),
    );
  }

  function applyPreset(id: string, text: string) {
    const clean = withoutEasySelections(spec);
    advancedPresets.recordUse(id);
    onSpecChange(setFacetCustomText(clean, facet, text));
  }

  function toggleParameterExpansion(parameter: RuntimeParameter) {
    setExpandedParameters((current) => {
      const next = new Set(current);
      if (next.has(parameter.id)) next.delete(parameter.id);
      else next.add(parameter.id);
      return next;
    });
  }

  function requestClearAllPresets() {
    if (clearPresetsArmed) {
      if (clearPresetsTimerRef.current !== null) {
        window.clearTimeout(clearPresetsTimerRef.current);
        clearPresetsTimerRef.current = null;
      }
      advancedPresets.clearAll();
      setClearPresetsArmed(false);
      return;
    }

    setClearPresetsArmed(true);
    if (clearPresetsTimerRef.current !== null) {
      window.clearTimeout(clearPresetsTimerRef.current);
    }
    clearPresetsTimerRef.current = window.setTimeout(() => {
      setClearPresetsArmed(false);
      clearPresetsTimerRef.current = null;
    }, 2600);
  }

  return (
    <section className="facet-editor field-card" data-facet={facet}>
      <div className="facet-editor-head">
        <div>
          <div className="field-label">
            <span>
              <KnowledgeTerm
                entryId={sectionKnowledgeEntryId}
                label={label}
                enabled={assistOn}
                loadKnowledge={runtime.loadKnowledge}
                contextType="section"
                contextKey={facet}
              />
            </span>
            <span className="badge">MusicSpec</span>
          </div>
          <p>
            {mode === "easy"
              ? t("facetEditor.easyHint")
              : t("facetEditor.advancedHint")}
          </p>
        </div>

        {selectedCount > 0 && (
          <span className="facet-selected-count">
            {t("facetEditor.selected")} · {selectedCount}
          </span>
        )}
      </div>

      <div className="facet-mode-switch" role="group" aria-label={label}>
        <button
          type="button"
          className={mode === "easy" ? "active" : ""}
          aria-pressed={mode === "easy"}
          onClick={() => onModeChange("easy")}
        >
          {t("facetEditor.easy")}
        </button>
        <button
          type="button"
          className={mode === "advanced" ? "active" : ""}
          aria-pressed={mode === "advanced"}
          onClick={() => onModeChange("advanced")}
        >
          {t("facetEditor.advanced")}
        </button>
      </div>

      {selectedCount > 0 && (
        <div className="facet-current-state">
          <div className="facet-current-head">
            <div>
              <strong>{t("facetEditor.current")}</strong>
              <small>
                {t("facetEditor.currentCount", { count: selectedCount })}
              </small>
            </div>
            <button
              type="button"
              className="text-btn facet-current-clear"
              onClick={clearFacetState}
            >
              {t("facetEditor.clearFacet")}
            </button>
          </div>

          <div className="facet-current-items">
            {currentSelections.map((selection) => (
              <button
                key={selection.id}
                type="button"
                className="facet-current-chip"
                title={selection.detail}
                aria-label={t("facetEditor.removeCurrent", {
                  label: selection.label,
                })}
                onClick={() => removeCurrentSelection(selection.id)}
              >
                <span>{selection.label}</span>
                <Icon name="close" />
              </button>
            ))}

            {customText.trim().length > 0 && (
              <button
                type="button"
                className="facet-current-chip custom"
                title={customText}
                aria-label={t("facetEditor.removeCustom")}
                onClick={clearCurrentCustomText}
              >
                <small>{t("facetEditor.customShort")}</small>
                <span>{customText}</span>
                <Icon name="close" />
              </button>
            )}
          </div>
        </div>
      )}

      {editor.status === "loading" && (
        <div className="facet-editor-state">
          <span className="runtime-spinner" aria-hidden="true" />
          <span>{t("facetEditor.loading")}</span>
        </div>
      )}

      {editor.status === "error" && (
        <div className="facet-editor-state error">
          <Icon name="info" />
          <span>{t("facetEditor.error")}</span>
          <small>{editor.message}</small>
        </div>
      )}

      {editor.status === "ready" && mode === "easy" && (
        <>
          {statements.length > 0 ? (
            <div className="statement-grid">
              {statements.map((statement) => {
                const selected = hasFacetSelection(spec, facet, statement.id);
                return (
                  <div
                    key={statement.id}
                    className={
                      selected ? "statement-card selected" : "statement-card"
                    }
                  >
                    <span>
                      <KnowledgeTerm
                        entryId={statement.concepts[0]?.entry_id}
                        label={statement.label}
                        enabled={assistOn}
                        loadKnowledge={runtime.loadKnowledge}
                        contextType="section"
                        contextKey={facet}
                      />
                    </span>
                    <small>{statement.output_text}</small>
                    {selected && (
                      <span className="selection-check" aria-hidden="true">
                        <Icon name="check" />
                      </span>
                    )}
                    <button
                      type="button"
                      className="choice-hitarea"
                      aria-label={statement.label}
                      aria-pressed={selected}
                      onClick={() =>
                        toggleStatement(statement.id, statement.output_text)
                      }
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="facet-empty">{t("facetEditor.noStatements")}</p>
          )}
        </>
      )}

      {editor.status === "ready" && mode === "advanced" && (
        <div className="advanced-facet-content">
          {parameters.length > 0 ? (
            parameters.map((parameter) => {
              const options = (optionsByParameter.get(parameter.id) ?? []).filter(
                (option) => option.advanced_visible,
              );
              const expanded = expandedParameters.has(parameter.id);
              const visible = expanded
                ? options
                : options.slice(0, COMPACT_OPTIONS_PER_PARAMETER);

              return (
                <section key={parameter.id} className="parameter-group">
                  <div className="parameter-head">
                    <strong>
                      <KnowledgeTerm
                        entryId={parameter.knowledge_entry_id}
                        label={parameter.label}
                        enabled={assistOn}
                        loadKnowledge={runtime.loadKnowledge}
                        contextType="parameter"
                        contextKey={parameter.id}
                      />
                    </strong>
                    <small>{parameter.value_type}</small>
                  </div>

                  {parameter.ui?.control === "number" ? (
                    <div className="number-parameter-control">
                      {(() => {
                        const selectedValue = selectedNumberValue(parameter);
                        const rangeValue =
                          selectedValue ??
                          parameter.ui.recommended_values[0] ??
                          parameter.ui.min;
                        return (
                          <>
                            <div
                              className="number-parameter-readout"
                              data-selected={selectedValue !== null}
                            >
                              <strong>
                                {selectedValue === null
                                  ? t("facetEditor.notSet")
                                  : t("facetEditor.numberValue", {
                                      label: parameter.label,
                                      value: selectedValue,
                                      unit: parameter.ui.unit
                                        ? " " + parameter.ui.unit
                                        : "",
                                    })}
                              </strong>
                              <div className="number-parameter-inputs">
                                <input
                                  type="number"
                                  min={parameter.ui.min}
                                  max={parameter.ui.max}
                                  step={parameter.ui.step}
                                  value={selectedValue ?? ""}
                                  placeholder={String(rangeValue)}
                                  aria-label={parameter.label}
                                  onChange={(event) => {
                                    const raw = event.currentTarget.value;
                                    if (!raw) {
                                      clearNumberParameter(parameter);
                                      return;
                                    }
                                    setNumberParameter(
                                      parameter,
                                      Number(raw),
                                    );
                                  }}
                                />
                                {selectedValue !== null && (
                                  <button
                                    type="button"
                                    className="text-btn number-parameter-clear"
                                    onClick={() =>
                                      clearNumberParameter(parameter)
                                    }
                                  >
                                    {t("facetEditor.clear")}
                                  </button>
                                )}
                              </div>
                            </div>
                            <input
                              className="number-parameter-range"
                              data-selected={selectedValue !== null}
                              type="range"
                              min={parameter.ui.min}
                              max={parameter.ui.max}
                              step={parameter.ui.step}
                              value={rangeValue}
                              aria-label={parameter.label}
                              onChange={(event) =>
                                setNumberParameter(
                                  parameter,
                                  Number(event.currentTarget.value),
                                )
                              }
                            />
                            {parameter.ui.recommended_values.length > 0 && (
                              <div className="parameter-recommended">
                                <small>{t("facetEditor.recommended")}</small>
                                <div className="parameter-options">
                                  {parameter.ui.recommended_values.map(
                                    (value) => {
                                      const valueLabel =
                                        String(value) +
                                        (parameter.ui?.unit
                                          ? " " + parameter.ui.unit
                                          : "");
                                      const valueKnowledgeEntryId =
                                        options.find(
                                          (option) =>
                                            Number(option.output_fragment) === value,
                                        )?.knowledge_entry_id ??
                                        parameter.knowledge_entry_id;
                                      return (
                                        <div
                                          key={value}
                                          className={
                                            selectedValue === value
                                              ? "parameter-option selected"
                                              : "parameter-option recommended"
                                          }
                                        >
                                          <span>
                                            <KnowledgeTerm
                                              entryId={valueKnowledgeEntryId}
                                              label={valueLabel}
                                              enabled={assistOn}
                                              loadKnowledge={runtime.loadKnowledge}
                                              contextType="parameter"
                                              contextKey={parameter.id}
                                            />
                                          </span>
                                          <button
                                            type="button"
                                            className="choice-hitarea"
                                            aria-label={valueLabel}
                                            aria-pressed={selectedValue === value}
                                            onClick={() =>
                                              setNumberParameter(parameter, value)
                                            }
                                          />
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : visible.length > 0 ? (
                    <div className="parameter-options">
                      {visible.map((option) => {
                        const selected = hasFacetSelection(
                          spec,
                          facet,
                          option.id,
                        );
                        return (
                          <div
                            key={option.id}
                            className={[
                              "parameter-option",
                              selected ? "selected" : "",
                              option.recommended ? "recommended" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            title={
                              option.recommended
                                ? t("facetEditor.recommended")
                                : undefined
                            }
                          >
                            {selected && <Icon name="check" />}
                            <span>
                              <KnowledgeTerm
                                entryId={option.knowledge_entry_id}
                                label={option.label}
                                enabled={assistOn}
                                loadKnowledge={runtime.loadKnowledge}
                                contextType="parameter"
                                contextKey={parameter.id}
                              />
                            </span>
                            <button
                              type="button"
                              className="choice-hitarea"
                              aria-label={option.label}
                              aria-pressed={selected}
                              onClick={() => toggleOption(option, parameter)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="parameter-empty">
                      {t("facetEditor.noParameters")}
                    </p>
                  )}

                  {parameter.ui?.control !== "number" &&
                    options.length > COMPACT_OPTIONS_PER_PARAMETER && (
                      <button
                        type="button"
                        className="text-btn parameter-expand"
                        onClick={() => toggleParameterExpansion(parameter)}
                      >
                        {expanded
                          ? t("facetEditor.compact")
                          : t("facetEditor.showAll", {
                              count: options.length,
                            })}
                        <Icon name={expanded ? "up" : "arrow"} />
                      </button>
                    )}
                </section>
              );
            })
          ) : (
            <p className="facet-empty">{t("facetEditor.noParameters")}</p>
          )}

          <div className="facet-custom-text">
            <div className="facet-custom-head">
              <span>{t("facetEditor.custom")}</span>
              <button
                type="button"
                className={
                  presetsOpen
                    ? "text-btn advanced-presets-toggle active"
                    : "text-btn advanced-presets-toggle"
                }
                aria-expanded={presetsOpen}
                onClick={() => setPresetsOpen((current) => !current)}
              >
                {t("facetEditor.presets")} · {advancedPresets.presets.length}
                <Icon name={presetsOpen ? "up" : "arrow"} />
              </button>
            </div>

            <div className="facet-custom-input-shell">
              <textarea
                value={customText}
                spellCheck={false}
                placeholder={t("facetEditor.customPlaceholder")}
                onChange={(event) =>
                  updateCustomText(event.currentTarget.value)
                }
              />
              {customText.trim().length > 0 && (
                <HoldFavoriteOption
                  className="custom-preset-hold"
                  favorite={matchingPreset !== null}
                  usageCount={matchingPreset?.useCount ?? 0}
                  title={
                    matchingPreset
                      ? t("facetEditor.presetSaved")
                      : t("facetEditor.presetSave")
                  }
                  onFavorite={() => advancedPresets.add(customText)}
                  onUnfavorite={() => {
                    if (matchingPreset) {
                      advancedPresets.remove(matchingPreset.id);
                    }
                  }}
                  onActivate={() => setPresetsOpen(true)}
                  aria-label={
                    matchingPreset
                      ? t("facetEditor.presetSaved")
                      : t("facetEditor.presetSave")
                  }
                >
                  <Icon name="star" />
                </HoldFavoriteOption>
              )}
            </div>

            {presetsOpen && (
              <div className="advanced-presets-menu">
                <div className="advanced-presets-menu-head">
                  <div>
                    <strong>{t("facetEditor.presets")}</strong>
                    <small>{t("facetEditor.presetsLocal")}</small>
                  </div>
                  {advancedPresets.presets.length > 0 && (
                    <button
                      type="button"
                      className={
                        clearPresetsArmed
                          ? "text-btn danger armed"
                          : "text-btn danger"
                      }
                      onClick={requestClearAllPresets}
                    >
                      {clearPresetsArmed
                        ? t("facetEditor.confirmDeleteAllPresets")
                        : t("facetEditor.deleteAllPresets")}
                    </button>
                  )}
                </div>

                {advancedPresets.presets.length > 0 ? (
                  <div className="advanced-presets-list">
                    {advancedPresets.presets.map((preset) => (
                      <HoldFavoriteOption
                        key={preset.id}
                        className="advanced-preset-option"
                        favorite
                        usageCount={preset.useCount}
                        activationLabel={preset.text}
                        title={t("facetEditor.presetApply")}
                        onFavorite={() => undefined}
                        onUnfavorite={() =>
                          advancedPresets.remove(preset.id)
                        }
                        onActivate={() =>
                          applyPreset(preset.id, preset.text)
                        }
                      >
                        <span>{preset.text}</span>
                      </HoldFavoriteOption>
                    ))}
                  </div>
                ) : (
                  <p className="facet-empty">
                    {t("facetEditor.presetEmpty")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
