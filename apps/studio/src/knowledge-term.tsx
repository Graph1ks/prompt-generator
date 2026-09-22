import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type {
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

interface ActiveKnowledgeState {
  readonly instanceId: string;
  readonly pinned: boolean;
}

interface KnowledgePosition {
  readonly mobile: boolean;
  readonly left?: number;
  readonly top?: number;
}

const DEFINITION_PRIORITY = [
  "one_liner",
  "plain",
  "why_it_matters",
  "hear_it_as",
  "expert_note",
  "misconception",
] as const;

const HOVER_OPEN_DELAY_MS = 180;
const HOVER_CLOSE_DELAY_MS = 140;
const MOBILE_BREAKPOINT_PX = 760;
const VIEWPORT_GUTTER_PX = 12;
const POPOVER_GAP_PX = 10;
const POPOVER_MAX_WIDTH_PX = 372;

let activeKnowledge: ActiveKnowledgeState | null = null;
const activeKnowledgeListeners = new Set<() => void>();

function emitActiveKnowledge() {
  for (const listener of activeKnowledgeListeners) listener();
}

function setActiveKnowledge(next: ActiveKnowledgeState | null) {
  if (
    activeKnowledge?.instanceId === next?.instanceId &&
    activeKnowledge?.pinned === next?.pinned
  ) {
    return;
  }
  activeKnowledge = next;
  emitActiveKnowledge();
}

function subscribeActiveKnowledge(listener: () => void) {
  activeKnowledgeListeners.add(listener);
  return () => activeKnowledgeListeners.delete(listener);
}

function getActiveKnowledge() {
  return activeKnowledge;
}

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
  const instanceId = useId();
  const cardId = useId();
  const active = useSyncExternalStore(
    subscribeActiveKnowledge,
    getActiveKnowledge,
    () => null,
  );
  const open = active?.instanceId === instanceId;
  const pinned = open && active.pinned;

  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [state, setState] = useState<KnowledgeState>({ status: "idle" });
  const [position, setPosition] = useState<KnowledgePosition>({ mobile: false });

  const entry = state.status === "ready" ? state.entry : null;

  const definition = useMemo(
    () => (entry ? bestDefinition(entry.definitions, locale) : null),
    [entry, locale],
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

  function clearOpenTimer() {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }

  function clearCloseTimer() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openTransient(delay = 0) {
    clearCloseTimer();
    clearOpenTimer();
    if (pinned) return;
    if (delay === 0) {
      setActiveKnowledge({ instanceId, pinned: false });
      return;
    }
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      setActiveKnowledge({ instanceId, pinned: false });
    }, delay);
  }

  function closeTransient(delay = 0) {
    clearOpenTimer();
    if (!open || pinned) return;
    clearCloseTimer();
    if (delay === 0) {
      setActiveKnowledge(null);
      return;
    }
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      if (
        activeKnowledge?.instanceId === instanceId &&
        !activeKnowledge.pinned
      ) {
        setActiveKnowledge(null);
      }
    }, delay);
  }

  function togglePinned() {
    clearOpenTimer();
    clearCloseTimer();
    if (open && pinned) {
      setActiveKnowledge(null);
      return;
    }
    setActiveKnowledge({ instanceId, pinned: true });
  }

  useEffect(() => {
    setState({ status: "idle" });
  }, [entryId]);

  useEffect(() => {
    if (!open || state.status !== "idle") return;
    let live = true;
    setState({ status: "loading" });
    void loadKnowledge()
      .then((payload) => {
        if (!live) return;
        setState({
          status: "ready",
          payload,
          entry: payload.entries.find((candidate) => candidate.id === entryId) ?? null,
        });
      })
      .catch(() => {
        if (live) setState({ status: "error" });
      });
    return () => {
      live = false;
    };
  }, [entryId, loadKnowledge, open, state.status]);

  useEffect(
    () => () => {
      clearOpenTimer();
      clearCloseTimer();
      if (activeKnowledge?.instanceId === instanceId) {
        setActiveKnowledge(null);
      }
    },
    [instanceId],
  );

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;

      if (window.innerWidth <= MOBILE_BREAKPOINT_PX) {
        setPosition({ mobile: true });
        return;
      }

      const card = cardRef.current;
      const rect = trigger.getBoundingClientRect();
      const cardWidth = Math.min(
        POPOVER_MAX_WIDTH_PX,
        window.innerWidth - VIEWPORT_GUTTER_PX * 2,
      );
      const cardHeight = card?.getBoundingClientRect().height ?? 180;
      const left = Math.min(
        Math.max(VIEWPORT_GUTTER_PX, rect.left),
        Math.max(
          VIEWPORT_GUTTER_PX,
          window.innerWidth - cardWidth - VIEWPORT_GUTTER_PX,
        ),
      );
      const fitsBelow =
        rect.bottom + POPOVER_GAP_PX + cardHeight <=
        window.innerHeight - VIEWPORT_GUTTER_PX;
      const top = fitsBelow
        ? rect.bottom + POPOVER_GAP_PX
        : Math.max(
            VIEWPORT_GUTTER_PX,
            rect.top - POPOVER_GAP_PX - cardHeight,
          );

      setPosition({ mobile: false, left, top });
    }

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, state.status]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveKnowledge(null);
        triggerRef.current?.focus();
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (!pinned) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target) || cardRef.current?.contains(target)) {
        return;
      }
      setActiveKnowledge(null);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, pinned]);

  if (!enabled || !entryId) {
    return <>{children ?? label}</>;
  }

  const difficultyLabel =
    entry?.difficulty === "beginner"
      ? t("knowledge.beginner")
      : entry?.difficulty === "intermediate"
        ? t("knowledge.intermediate")
        : entry?.difficulty === "advanced"
          ? t("knowledge.advanced")
          : null;

  const cardStyle: CSSProperties = position.mobile
    ? {}
    : {
        left: position.left,
        top: position.top,
      };

  return (
    <span className="knowledge-term-wrap">
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        className="knowledge-term"
        aria-expanded={open}
        aria-describedby={open ? cardId : undefined}
        aria-label={t("knowledge.toggle", { label })}
        data-pinned={pinned || undefined}
        data-context-type={contextType}
        data-context-key={contextKey}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") {
            openTransient(HOVER_OPEN_DELAY_MS);
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") {
            closeTransient(HOVER_CLOSE_DELAY_MS);
          }
        }}
        onFocus={() => openTransient()}
        onBlur={() => closeTransient(HOVER_CLOSE_DELAY_MS)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          togglePinned();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            togglePinned();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setActiveKnowledge(null);
          }
        }}
      >
        {children ?? label}
      </span>

      {open &&
        createPortal(
          <div
            ref={cardRef}
            id={cardId}
            className="knowledge-popover"
            role="tooltip"
            data-pinned={pinned || undefined}
            data-mobile={position.mobile || undefined}
            style={cardStyle}
            onPointerEnter={() => clearCloseTimer()}
            onPointerLeave={(event) => {
              if (event.pointerType !== "touch") {
                closeTransient(HOVER_CLOSE_DELAY_MS);
              }
            }}
          >
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
          </div>,
          document.body,
        )}
    </span>
  );
}
