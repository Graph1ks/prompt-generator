import { useEffect, useMemo, useState } from "react";
import {
  hasFacetSelection,
  removeFacetSelection,
  setFacetCustomText,
  setFacetSelection,
  type FacetKey,
  type MusicSpec,
} from "@vgine/music-spec";
import type {
  RuntimeEditorPayload,
  RuntimeParameter,
  RuntimeParameterOption,
} from "@vgine/runtime-data";

import { Icon } from "./icons.js";
import { KnowledgeTerm } from "./knowledge-term.js";
import { useI18n } from "./i18n.js";
import type { StudioRuntime } from "./runtime-client.js";

type FacetEditorMode = "easy" | "advanced";

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
}

export function FacetEditor({
  facet,
  label,
  runtime,
  spec,
  onSpecChange,
  assistOn,
}: FacetEditorProps) {
  const { t } = useI18n();
  const [editor, setEditor] = useState<EditorState>({ status: "loading" });
  const [mode, setMode] = useState<FacetEditorMode>("easy");
  const [expandedParameters, setExpandedParameters] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

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

  useEffect(() => {
    if (editor.status !== "ready") return;
    if (statements.length === 0 && parameters.length > 0) {
      setMode("advanced");
    }
  }, [editor.status, parameters.length, statements.length]);

  const facetState = spec.facets[facet];
  const selectedCount =
    (facetState?.selections.length ?? 0) +
    (facetState?.custom_text?.trim() ? 1 : 0);

  function toggleStatement(
    id: string,
    outputText: string,
  ) {
    if (hasFacetSelection(spec, facet, id)) {
      onSpecChange(removeFacetSelection(spec, facet, id));
      return;
    }
    onSpecChange(
      setFacetSelection(spec, facet, {
        id,
        kind: "statement",
        value: outputText,
        origin: "statement",
        locked: false,
      }),
    );
  }

  function toggleOption(
    option: RuntimeParameterOption,
    parameter: RuntimeParameter,
  ) {
    if (hasFacetSelection(spec, facet, option.id)) {
      onSpecChange(removeFacetSelection(spec, facet, option.id));
      return;
    }

    let next = spec;
    if (parameter.value_type !== "multi") {
      for (const sibling of optionsByParameter.get(parameter.id) ?? []) {
        if (
          sibling.id !== option.id &&
          hasFacetSelection(next, facet, sibling.id)
        ) {
          next = removeFacetSelection(next, facet, sibling.id);
        }
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

  function toggleParameterExpansion(parameter: RuntimeParameter) {
    setExpandedParameters((current) => {
      const next = new Set(current);
      if (next.has(parameter.id)) next.delete(parameter.id);
      else next.add(parameter.id);
      return next;
    });
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
          onClick={() => setMode("easy")}
        >
          {t("facetEditor.easy")}
        </button>
        <button
          type="button"
          className={mode === "advanced" ? "active" : ""}
          aria-pressed={mode === "advanced"}
          onClick={() => setMode("advanced")}
        >
          {t("facetEditor.advanced")}
        </button>
      </div>

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
                  <button
                    key={statement.id}
                    type="button"
                    className={selected ? "statement-card selected" : "statement-card"}
                    aria-pressed={selected}
                    onClick={() =>
                      toggleStatement(statement.id, statement.output_text)
                    }
                  >
                    <span>{statement.label}</span>
                    <small>{statement.output_text}</small>
                    {selected && (
                      <span className="selection-check" aria-hidden="true">
                        <Icon name="check" />
                      </span>
                    )}
                  </button>
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

                  {visible.length > 0 ? (
                    <div className="parameter-options">
                      {visible.map((option) => {
                        const selected = hasFacetSelection(spec, facet, option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={selected ? "parameter-option selected" : "parameter-option"}
                            aria-pressed={selected}
                            onClick={() => toggleOption(option, parameter)}
                          >
                            {selected && <Icon name="check" />}
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="parameter-empty">
                      {t("facetEditor.noParameters")}
                    </p>
                  )}

                  {options.length > COMPACT_OPTIONS_PER_PARAMETER && (
                    <button
                      type="button"
                      className="text-btn parameter-expand"
                      onClick={() => toggleParameterExpansion(parameter)}
                    >
                      {expanded
                        ? t("facetEditor.compact")
                        : t("facetEditor.showAll", { count: options.length })}
                      <Icon name={expanded ? "up" : "arrow"} />
                    </button>
                  )}
                </section>
              );
            })
          ) : (
            <p className="facet-empty">{t("facetEditor.noParameters")}</p>
          )}

          <label className="facet-custom-text">
            <span>{t("facetEditor.custom")}</span>
            <textarea
              value={facetState?.custom_text ?? ""}
              spellCheck={false}
              placeholder={t("facetEditor.customPlaceholder")}
              onChange={(event) => {
                const value = event.currentTarget.value;
                onSpecChange(
                  setFacetCustomText(
                    spec,
                    facet,
                    value.trim().length > 0 ? value : null,
                  ),
                );
              }}
            />
          </label>
        </div>
      )}
    </section>
  );
}
