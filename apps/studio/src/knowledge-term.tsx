import { useMemo, useState, type ReactNode } from "react";
import type {
  RuntimeContextDefinition,
  RuntimeDefinition,
  RuntimeKnowledgeEntry,
  RuntimeKnowledgePayload,
} from "@vgine/runtime-data";

import { useI18n } from "./i18n.js";

type KnowledgeState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly entry: RuntimeKnowledgeEntry | null;
      readonly payload: RuntimeKnowledgePayload;
    }
  | { readonly status: "error" };

const DEFINITION_PRIORITY = [
  "one_liner",
  "plain",
  "why_it_matters",
  "hear_it_as",
  "expert_note",
  "misconception",
] as const;

export interface KnowledgeTermProps {
  readonly entryId: string | null | undefined;
  readonly label: string;
  readonly enabled: boolean;
  readonly loadKnowledge: () => Promise<RuntimeKnowledgePayload>;
  readonly contextType?: string;
  readonly contextKey?: string;
  readonly children?: ReactNode;
}

function localeRank(candidate: string, locale: string): number {
  if (candidate === locale) return 0;
  if (candidate === "en") return 1;
  return 2;
}

function bestDefinition(
  definitions: readonly RuntimeDefinition[],
  locale: string,
): RuntimeDefinition | null {
  const priority = new Map(
    DEFINITION_PRIORITY.map((kind, index) => [kind, index] as const),
  );
  return (
    [...definitions].sort(
      (a, b) =>
        localeRank(a.locale, locale) - localeRank(b.locale, locale) ||
        (priority.get(a.kind as (typeof DEFINITION_PRIORITY)[number]) ?? 99) -
          (priority.get(b.kind as (typeof DEFINITION_PRIORITY)[number]) ?? 99) ||
        b.revision - a.revision,
    )[0] ?? null
  );
}

function bestContextDefinition(
  definitions: readonly RuntimeContextDefinition[],
  locale: string,
  contextType?: string,
  contextKey?: string,
): RuntimeContextDefinition | null {
  const candidates = definitions.filter((entry) => {
    if (!contextType || !contextKey) return false;
    return entry.context_type === contextType && entry.context_key === contextKey;
  });
  return (
    [...candidates].sort(
      (a, b) =>
        localeRank(a.locale, locale) - localeRank(b.locale, locale) ||
        b.revision - a.revision,
    )[0] ?? null
  );
}

export function KnowledgeTerm({
  entryId,
  label,
  enabled,
  loadKnowledge,
  contextType,
  contextKey,
  children,
}: KnowledgeTermProps) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<KnowledgeState>({ status: "idle" });

  const entry =
    state.status === "ready" ? state.entry : null;

  const definition = useMemo(
    () => (entry ? bestDefinition(entry.definitions, locale) : null),
    [entry, locale],
  );
  const contextDefinition = useMemo(
    () =>
      entry
        ? bestContextDefinition(
            entry.context_definitions,
            locale,
            contextType,
            contextKey,
          )
        : null,
    [contextKey, contextType, entry, locale],
  );

  const related = useMemo(() => {
    if (state.status !== "ready" || !entry) return [];
    const byId = new Map(
      state.payload.entries.map((candidate) => [candidate.id, candidate] as const),
    );
    return entry.relations
      .map((relation) => byId.get(relation.target_entry_id))
      .filter(
        (candidate): candidate is RuntimeKnowledgeEntry =>
          candidate !== undefined,
      )
      .slice(0, 4);
  }, [entry, state]);

  if (!enabled || !entryId) {
    return <>{children ?? label}</>;
  }

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    if (state.status !== "idle") return;

    setState({ status: "loading" });
    try {
      const payload = await loadKnowledge();
      setState({
        status: "ready",
        payload,
        entry: payload.entries.find((candidate) => candidate.id === entryId) ?? null,
      });
    } catch {
      setState({ status: "error" });
    }
  }

  const difficultyLabel =
    entry?.difficulty === "beginner"
      ? t("knowledge.beginner")
      : entry?.difficulty === "intermediate"
        ? t("knowledge.intermediate")
        : entry?.difficulty === "advanced"
          ? t("knowledge.advanced")
          : null;

  return (
    <span className="knowledge-term-wrap">
      <button
        type="button"
        className="knowledge-term"
        aria-expanded={open}
        aria-label={t("knowledge.toggle", { label })}
        onClick={toggle}
      >
        {children ?? label}
      </button>

      {open && (
        <span className="knowledge-inline-card" role="note">
          {state.status === "loading" && (
            <span className="knowledge-state">{t("knowledge.loading")}</span>
          )}

          {state.status === "error" && (
            <span className="knowledge-state">{t("knowledge.error")}</span>
          )}

          {state.status === "ready" && (
            <>
              <span className="knowledge-inline-head">
                <strong>{entry?.canonical_label ?? label}</strong>
                {difficultyLabel && (
                  <small>
                    {t("knowledge.difficulty", { level: difficultyLabel })}
                  </small>
                )}
              </span>

              <span className="knowledge-definition">
                {definition?.text ?? t("knowledge.noDefinition")}
              </span>

              {contextDefinition && (
                <span className="knowledge-context">
                  <small>{t("knowledge.context")}</small>
                  <span>{contextDefinition.text}</span>
                </span>
              )}

              {related.length > 0 && (
                <span className="knowledge-related">
                  <small>{t("knowledge.related")}</small>
                  <span>
                    {related.map((candidate) => candidate.canonical_label).join(" · ")}
                  </span>
                </span>
              )}
            </>
          )}
        </span>
      )}
    </span>
  );
}
