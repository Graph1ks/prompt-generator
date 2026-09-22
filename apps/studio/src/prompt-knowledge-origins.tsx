import { useEffect, useMemo, useState } from "react";
import type { FacetKey, MusicSpec } from "@vgine/music-spec";
import type {
  RuntimeEditorPayload,
  RuntimeInstrumentLibrary,
} from "@vgine/runtime-data";

import { KnowledgeTerm } from "./knowledge-term.js";
import { useI18n } from "./i18n.js";
import type { StudioRuntime } from "./runtime-client.js";

interface KnowledgeOrigin {
  readonly key: string;
  readonly label: string;
  readonly entryId: string;
}

type EditorState =
  | { readonly status: "idle" }
  | { readonly status: "ready"; readonly value: RuntimeEditorPayload }
  | { readonly status: "error" };

type InstrumentState =
  | { readonly status: "idle" }
  | { readonly status: "ready"; readonly value: RuntimeInstrumentLibrary }
  | { readonly status: "error" };

export interface PromptKnowledgeOriginsProps {
  readonly enabled: boolean;
  readonly runtime: StudioRuntime;
  readonly spec: MusicSpec;
  readonly sectionKey: FacetKey;
  readonly sectionContent: string;
}

function contentContains(content: string, value: string): boolean {
  const needle = value.trim().toLocaleLowerCase();
  if (!needle) return false;
  return content.toLocaleLowerCase().includes(needle);
}

export function PromptKnowledgeOrigins({
  enabled,
  runtime,
  spec,
  sectionKey,
  sectionContent,
}: PromptKnowledgeOriginsProps) {
  const { t } = useI18n();
  const [editor, setEditor] = useState<EditorState>({ status: "idle" });
  const [instruments, setInstruments] = useState<InstrumentState>({
    status: "idle",
  });

  useEffect(() => {
    if (!enabled || sectionKey === "genre" || sectionKey === "instruments") {
      return;
    }
    let live = true;
    void runtime
      .loadEditor()
      .then((value) => {
        if (live) setEditor({ status: "ready", value });
      })
      .catch(() => {
        if (live) setEditor({ status: "error" });
      });
    return () => {
      live = false;
    };
  }, [enabled, runtime, sectionKey]);

  useEffect(() => {
    if (!enabled || sectionKey !== "instruments") return;
    if ((spec.facets.instruments?.selections.length ?? 0) === 0) return;
    let live = true;
    void runtime
      .loadInstrumentLibrary()
      .then((value) => {
        if (live) setInstruments({ status: "ready", value });
      })
      .catch(() => {
        if (live) setInstruments({ status: "error" });
      });
    return () => {
      live = false;
    };
  }, [enabled, runtime, sectionKey, spec.facets.instruments?.selections.length]);

  const origins = useMemo<readonly KnowledgeOrigin[]>(() => {
    if (!enabled) return [];

    if (sectionKey === "genre") {
      const majorById = new Map(
        runtime.bootstrap.core.major_genres.map((entry) => [entry.id, entry] as const),
      );
      const genreById = new Map(
        runtime.bootstrap.genres.genres.map((entry) => [entry.id, entry] as const),
      );
      return spec.genre_influences
        .map((influence) => {
          const entry =
            genreById.get(influence.genre_id) ?? majorById.get(influence.genre_id);
          if (!entry?.knowledge_entry_id) return null;
          if (!contentContains(sectionContent, entry.label)) return null;
          return {
            key: influence.role + ":" + entry.id,
            label: entry.label,
            entryId: entry.knowledge_entry_id,
          };
        })
        .filter((entry): entry is KnowledgeOrigin => entry !== null);
    }

    if (sectionKey === "instruments") {
      if (instruments.status !== "ready") return [];
      const expressionById = new Map(
        instruments.value.expressions.expressions.map(
          (entry) => [entry.id, entry] as const,
        ),
      );
      const instrumentById = new Map(
        instruments.value.instruments.instruments.map(
          (entry) => [entry.id, entry] as const,
        ),
      );
      const result: KnowledgeOrigin[] = [];
      for (const selection of spec.facets.instruments?.selections ?? []) {
        if (!selection.id || !contentContains(sectionContent, selection.value)) {
          continue;
        }
        const expression = expressionById.get(selection.id);
        if (!expression) continue;
        const linkedInstrument = expression.instruments
          .map((link) => instrumentById.get(link.instrument_id))
          .find((entry) => entry?.knowledge_entry_id);
        const entryId =
          linkedInstrument?.knowledge_entry_id ??
          expression.concepts[0]?.entry_id ??
          null;
        if (!entryId) continue;
        result.push({
          key: selection.id,
          label: expression.label,
          entryId,
        });
      }
      return result;
    }

    if (editor.status !== "ready") return [];

    const statements = new Map(
      editor.value.statements.map((entry) => [entry.id, entry] as const),
    );
    const options = new Map(
      editor.value.parameter_options.map((entry) => [entry.id, entry] as const),
    );
    const parameters = new Map(
      editor.value.parameters.map((entry) => [entry.id, entry] as const),
    );

    const result: KnowledgeOrigin[] = [];
    for (const selection of spec.facets[sectionKey]?.selections ?? []) {
      if (!selection.id || !contentContains(sectionContent, selection.value)) {
        continue;
      }

      if (selection.kind === "statement") {
        const statement = statements.get(selection.id);
        const entryId = statement?.concepts[0]?.entry_id;
        if (entryId) {
          result.push({
            key: selection.id,
            label: statement?.label ?? selection.value,
            entryId,
          });
        }
        continue;
      }

      if (selection.kind === "option") {
        const option = options.get(selection.id);
        if (option?.knowledge_entry_id) {
          result.push({
            key: selection.id,
            label: option.label,
            entryId: option.knowledge_entry_id,
          });
        }
        continue;
      }

      if (selection.kind === "freeform" && selection.id.endsWith(":value")) {
        const parameterId = selection.id.slice(0, -":value".length);
        const parameter = parameters.get(parameterId);
        if (parameter?.knowledge_entry_id) {
          result.push({
            key: selection.id,
            label:
              selection.value +
              (parameter.ui?.unit ? " " + parameter.ui.unit : ""),
            entryId: parameter.knowledge_entry_id,
          });
        }
      }
    }

    const seen = new Set<string>();
    return result.filter((entry) => {
      if (seen.has(entry.entryId + "\u0000" + entry.label)) return false;
      seen.add(entry.entryId + "\u0000" + entry.label);
      return true;
    });
  }, [
    editor,
    enabled,
    instruments,
    runtime.bootstrap,
    sectionContent,
    sectionKey,
    spec,
  ]);

  if (!enabled || origins.length === 0) return null;

  return (
    <div className="prompt-knowledge-origins">
      <span className="prompt-knowledge-label">{t("knowledge.promptTerms")}</span>
      <div className="prompt-knowledge-chips">
        {origins.map((origin) => (
          <KnowledgeTerm
            key={origin.key}
            entryId={origin.entryId}
            label={origin.label}
            enabled
            loadKnowledge={runtime.loadKnowledge}
            contextType="section"
            contextKey={sectionKey}
          >
            <span className="prompt-knowledge-chip">{origin.label}</span>
          </KnowledgeTerm>
        ))}
      </div>
    </div>
  );
}
