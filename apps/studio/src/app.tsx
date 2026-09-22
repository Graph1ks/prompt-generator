import { useEffect, useMemo, useRef, useState } from "react";
import { compileMusicSpec, countCharacters } from "@vgine/compiler";
import {
  FACET_KEYS,
  createMusicSpec,
  resetMusicSpec,
  resetMusicSpecFacets,
  type FacetKey,
  type GenreInfluenceRole,
  type MusicSpec,
} from "@vgine/music-spec";
import { isVgineTheme, type VgineTheme } from "@vgine/ui";
import {
  ACTIVE_PROJECT_ID,
  ProjectStorageError,
  createIndexedDbProjectStorage,
  createProjectDocument,
  duplicateProjectDocument,
  normalizeProjectTitle,
  parseProjectDocumentJson,
  serializeProjectDocument,
  type ProjectDocument,
  type ProjectSummary,
} from "@vgine/project-storage";

import { CopyFallback } from "./copy-fallback.js";
import { ExcludePicker } from "./exclude-picker.js";
import { FacetEditor } from "./facet-editor.js";
import { GenrePicker } from "./genre-picker.js";
import { InstrumentPicker } from "./instrument-picker.js";
import { Icon } from "./icons.js";
import { SUPPORTED_LOCALES, useI18n, type MessageKey } from "./i18n.js";
import { ProjectLibrary } from "./project-library.js";
import { loadStudioRuntime, type StudioRuntime } from "./runtime-client.js";
import {
  STUDIO_CHAPTERS,
  type StudioEditorMode,
} from "./studio-config.js";
import { userDataStorage } from "./user-data-storage.js";

const LEGACY_THEME_KEY = "vgine.theme";
const THEME_PREFERENCE_KEY = "preference:theme";
const EDITOR_MODE_PREFERENCE_KEY = "preference:editor-mode";
const FACET_MODE_PREFERENCE_KEY = "preference:facet-modes";
const ACTIVE_PROJECT_POINTER_KEY = "project:active-id";
const projectStorage = createIndexedDbProjectStorage();
const PROJECT_AUTOSAVE_DELAY_MS = 320;
const SPEC_HISTORY_LIMIT = 80;
const SPEC_HISTORY_COALESCE_MS = 650;

type RuntimeState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly value: StudioRuntime }
  | { readonly status: "error"; readonly message: string };

type OutputTab = "style" | "exclude";
type StudioSourceTarget = FacetKey | "exclude";
type ProjectSaveState =
  | "loading"
  | "restored"
  | "saving"
  | "saved"
  | "error"
  | "unavailable";

function initialTheme(): VgineTheme {
  const legacy = globalThis.localStorage?.getItem(LEGACY_THEME_KEY);
  return legacy && isVgineTheme(legacy) ? legacy : "paradise";
}

function isStudioEditorMode(value: unknown): value is StudioEditorMode {
  return value === "easy" || value === "advanced";
}

async function copyText(text: string): Promise<"copied" | "manual"> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      // Continue to the legacy fallback when clipboard permission/API fails.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.insetInlineStart = "-9999px";
  textarea.style.opacity = "0";
  document.body.append(textarea);

  try {
    textarea.focus();
    textarea.select();
    if (
      typeof document.execCommand === "function" &&
      document.execCommand("copy")
    ) {
      return "copied";
    }
  } catch {
    // The final manual surface below is the guaranteed user-visible fallback.
  } finally {
    textarea.remove();
  }

  return "manual";
}

function coverLines(label: string): readonly [string, string] {
  const words = label.split(/\s+/u).filter(Boolean);
  if (words.length <= 1) return [label || "Build", "your sound."];
  const split = Math.ceil(words.length / 2);
  return [words.slice(0, split).join(" "), words.slice(split).join(" ")];
}

function isChapterId(
  value: string | null,
): value is (typeof STUDIO_CHAPTERS)[number]["id"] {
  return STUDIO_CHAPTERS.some((chapter) => chapter.id === value);
}

function isStudioSourceTarget(value: string): value is StudioSourceTarget {
  if (value === "exclude") return true;
  return STUDIO_CHAPTERS.some((chapter) =>
    chapter.facets.includes(value as FacetKey),
  );
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]',
    ),
  );
}

function facetActiveItemCount(spec: MusicSpec, facet: FacetKey): number {
  if (facet === "genre") return spec.genre_influences.length;
  const state = spec.facets[facet];
  return (
    (state?.selections.length ?? 0) +
    (state?.custom_text?.trim() ? 1 : 0)
  );
}

function specHistoryGroup(current: MusicSpec, next: MusicSpec): string | null {
  if (
    current.genre_influences !== next.genre_influences ||
    current.exclude !== next.exclude
  ) {
    return null;
  }

  const changedFacets = FACET_KEYS.filter(
    (facet) => current.facets[facet] !== next.facets[facet],
  );
  if (changedFacets.length !== 1) return null;

  const facet = changedFacets[0];
  const before = current.facets[facet];
  const after = next.facets[facet];
  if (!before || !after) return null;

  if (
    before.custom_text !== after.custom_text &&
    before.selections === after.selections
  ) {
    return after.custom_text === null ? null : "facet:" + facet + ":custom";
  }

  if (before.custom_text !== after.custom_text) return null;

  const beforeById = new Map(
    before.selections
      .filter((selection) => Boolean(selection.id))
      .map((selection) => [selection.id as string, selection] as const),
  );
  const afterById = new Map(
    after.selections
      .filter((selection) => Boolean(selection.id))
      .map((selection) => [selection.id as string, selection] as const),
  );
  const changedIds = new Set<string>();

  for (const id of new Set([...beforeById.keys(), ...afterById.keys()])) {
    const previous = beforeById.get(id);
    const upcoming = afterById.get(id);
    if (
      previous?.value !== upcoming?.value ||
      previous?.kind !== upcoming?.kind ||
      previous?.origin !== upcoming?.origin ||
      previous?.locked !== upcoming?.locked
    ) {
      changedIds.add(id);
    }
  }

  if (changedIds.size !== 1) return null;
  const changedId = [...changedIds][0];
  if (!beforeById.has(changedId) || !afterById.has(changedId)) return null;
  return "facet:" + facet + ":selection:" + changedId;
}

function chapterActiveItemCount(
  spec: MusicSpec,
  chapter: (typeof STUDIO_CHAPTERS)[number],
): number {
  let count = chapter.facets.reduce(
    (total, facet) => total + facetActiveItemCount(spec, facet),
    0,
  );

  if (chapter.id === "finish") count += spec.exclude.length;
  return count;
}


function createLocalProjectId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return "project:" + uuid;
  return "project:" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

function safeProjectFileName(title: string | null, fallback: string): string {
  const stem = (title ?? fallback)
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 72);
  return (stem || "vgine-project") + ".vgine.json";
}

function downloadProjectDocument(project: ProjectDocument, fallback: string) {
  const blob = new Blob([serializeProjectDocument(project)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeProjectFileName(project.title, fallback);
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function App() {
  const { locale, setLocale, t } = useI18n();
  const [theme, setTheme] = useState<VgineTheme>(initialTheme);
  const [themeReady, setThemeReady] = useState(false);
  const [globalEditorMode, setGlobalEditorModeState] =
    useState<StudioEditorMode>("easy");
  const [facetModes, setFacetModesState] = useState<
    Partial<Record<FacetKey, StudioEditorMode>>
  >({});
  const [chapterId, setChapterId] = useState(STUDIO_CHAPTERS[0].id);
  const [activeGenreRole, setActiveGenreRole] =
    useState<GenreInfluenceRole>("foundation");
  const [spec, setSpec] = useState<MusicSpec>(() => createMusicSpec());
  const undoSpecRef = useRef<MusicSpec[]>([]);
  const redoSpecRef = useRef<MusicSpec[]>([]);
  const lastSpecCommitRef = useRef<{ group: string | null; at: number } | null>(
    null,
  );
  const [specHistoryState, setSpecHistoryState] = useState({
    undo: 0,
    redo: 0,
  });
  const [runtime, setRuntime] = useState<RuntimeState>({ status: "loading" });
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [copyFallbackText, setCopyFallbackText] = useState<string | null>(null);
  const [outputTab, setOutputTab] = useState<OutputTab>("style");
  const [assistOn, setAssistOn] = useState(true);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [previewPulse, setPreviewPulse] = useState(false);
  const [sourceJumpTarget, setSourceJumpTarget] =
    useState<StudioSourceTarget | null>(null);
  const [activeFacetTarget, setActiveFacetTarget] =
    useState<StudioSourceTarget | null>(null);
  const [genreSkipAcknowledged, setGenreSkipAcknowledged] = useState(false);
  const [manualStyleText, setManualStyleText] = useState<string | null>(null);
  const [promptUnlocked, setPromptUnlocked] = useState(false);
  const [projectReady, setProjectReady] = useState(false);
  const [projectSaveState, setProjectSaveState] =
    useState<ProjectSaveState>("loading");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  const [projectSummaries, setProjectSummaries] = useState<readonly ProjectSummary[]>([]);
  const [projectLibraryOpen, setProjectLibraryOpen] = useState(false);
  const [projectLibraryBusy, setProjectLibraryBusy] = useState(false);
  const [projectLibraryError, setProjectLibraryError] = useState<string | null>(null);
  const projectCreatedAtRef = useRef(new Date().toISOString());
  const saveRevisionRef = useRef(0);
  const autosaveTimerRef = useRef<number | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);

  const chapter =
    STUDIO_CHAPTERS.find((candidate) => candidate.id === chapterId) ??
    STUDIO_CHAPTERS[0];
  const chapterCopy = {
    title: t(("chapter." + chapter.id + ".title") as MessageKey),
    description: t(("chapter." + chapter.id + ".description") as MessageKey),
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let live = true;
    const legacy = globalThis.localStorage?.getItem(LEGACY_THEME_KEY);

    void userDataStorage
      .get<unknown>(THEME_PREFERENCE_KEY)
      .then(async (stored) => {
        if (!live) return;
        const next =
          typeof stored === "string" && isVgineTheme(stored)
            ? stored
            : legacy && isVgineTheme(legacy)
              ? legacy
              : "paradise";
        setTheme(next);
        if (!(typeof stored === "string" && isVgineTheme(stored))) {
          await userDataStorage.set(THEME_PREFERENCE_KEY, next);
        }
        try {
          globalThis.localStorage?.removeItem(LEGACY_THEME_KEY);
        } catch {
          // Legacy cleanup is best effort only.
        }
        setThemeReady(true);
      })
      .catch(() => {
        setThemeReady(true);
      });

    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    void userDataStorage.set(THEME_PREFERENCE_KEY, theme).catch(() => {
      // Theme remains usable for this session if local persistence fails.
    });
  }, [theme, themeReady]);

  useEffect(() => {
    let live = true;
    void Promise.all([
      userDataStorage.get<unknown>(EDITOR_MODE_PREFERENCE_KEY),
      userDataStorage.get<unknown>(FACET_MODE_PREFERENCE_KEY),
    ])
      .then(([storedMode, storedFacetModes]) => {
        if (!live) return;
        if (isStudioEditorMode(storedMode)) {
          setGlobalEditorModeState(storedMode);
        }
        if (
          storedFacetModes &&
          typeof storedFacetModes === "object" &&
          !Array.isArray(storedFacetModes)
        ) {
          const next: Partial<Record<FacetKey, StudioEditorMode>> = {};
          for (const [key, value] of Object.entries(storedFacetModes)) {
            if (
              isStudioEditorMode(value) &&
              [
                "era",
                "bpm",
                "key_mode",
                "groove",
                "melody",
                "harmony",
                "drums",
                "bass",
                "exciters",
                "texture",
                "vocal",
                "dynamics",
                "space_mix",
                "production",
                "structure",
              ].includes(key)
            ) {
              next[key as FacetKey] = value;
            }
          }
          setFacetModesState(next);
        }
      })
      .catch(() => {
        // Editor depth is a local preference enhancement.
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    void loadStudioRuntime()
      .then((value) => {
        if (live) setRuntime({ status: "ready", value });
      })
      .catch((error: unknown) => {
        if (!live) return;
        setRuntime({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;

    void (async () => {
      try {
        const storedActive = await userDataStorage.get<unknown>(
          ACTIVE_PROJECT_POINTER_KEY,
        );
        let project =
          typeof storedActive === "string"
            ? await projectStorage.load(storedActive)
            : null;

        if (!project) {
          const legacy = await projectStorage.load(ACTIVE_PROJECT_ID);
          if (legacy) {
            const migratedId = createLocalProjectId();
            project = duplicateProjectDocument(legacy, migratedId, {
              title: legacy.title,
              createdAt: legacy.created_at,
              updatedAt: legacy.updated_at,
            });
            await projectStorage.save(project);
            await userDataStorage.set(ACTIVE_PROJECT_POINTER_KEY, migratedId);
            await projectStorage.delete(ACTIVE_PROJECT_ID);
          }
        }

        if (!project) {
          const summaries = await projectStorage.list();
          const fallback = summaries.find(
            (candidate) => candidate.id !== ACTIVE_PROJECT_ID,
          );
          if (fallback) {
            project = await projectStorage.load(fallback.id);
          }
        }

        if (!project) {
          const now = new Date().toISOString();
          project = createProjectDocument(
            createLocalProjectId(),
            createMusicSpec(),
            { createdAt: now, updatedAt: now },
          );
          await projectStorage.save(project);
        }

        await userDataStorage.set(ACTIVE_PROJECT_POINTER_KEY, project.id);
        const summaries = await projectStorage.list();

        if (!live) return;
        applyProject(project);
        setProjectSummaries(summaries);
        setProjectSaveState("restored");
        setProjectReady(true);
      } catch (error: unknown) {
        if (!live) return;
        if (
          error instanceof ProjectStorageError &&
          error.code === "indexeddb_unavailable"
        ) {
          setProjectSaveState("unavailable");
        } else {
          setProjectSaveState("error");
        }
      }
    })();

    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!projectReady || !currentProjectId) return;

    const revision = ++saveRevisionRef.current;
    setProjectSaveState("saving");

    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      const updatedAt = new Date().toISOString();
      const project = createProjectDocument(currentProjectId, spec, {
        title: projectTitle,
        createdAt: projectCreatedAtRef.current,
        updatedAt,
        manualStyleOverride: manualStyleText,
        activeChapter: chapterId,
        genreSkipAcknowledged,
      });

      void projectStorage
        .save(project)
        .then(() => {
          if (saveRevisionRef.current === revision) {
            setProjectSaveState("saved");
            setProjectSummaries((current) => upsertSummary(current, project));
          }
        })
        .catch((error: unknown) => {
          if (saveRevisionRef.current !== revision) return;
          if (
            error instanceof ProjectStorageError &&
            error.code === "indexeddb_unavailable"
          ) {
            setProjectSaveState("unavailable");
          } else {
            setProjectSaveState("error");
          }
        });
    }, PROJECT_AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    chapterId,
    currentProjectId,
    genreSkipAcknowledged,
    manualStyleText,
    projectReady,
    projectTitle,
    spec,
  ]);

  const genreLabels = useMemo(() => {
    if (runtime.status !== "ready") return new Map<string, string>();
    return new Map([
      ...runtime.value.bootstrap.core.major_genres.map(
        (major) => [major.id, major.label] as const,
      ),
      ...runtime.value.bootstrap.genres.genres.map(
        (genre) => [genre.id, genre.label] as const,
      ),
    ]);
  }, [runtime]);

  const studioRuntime = runtime.status === "ready" ? runtime.value : null;
  const compilation = useMemo(() => {
    if (!studioRuntime) return null;
    return compileMusicSpec(spec, studioRuntime.compilerKnowledge);
  }, [studioRuntime, spec]);

  useEffect(() => {
    if (!compilation?.styleText) return;
    setPreviewPulse(true);
    const timer = window.setTimeout(() => setPreviewPulse(false), 900);
    return () => window.clearTimeout(timer);
  }, [compilation?.styleText]);

  const selectedGenreLabels = useMemo(
    () =>
      spec.genre_influences.map(
        (entry) => genreLabels.get(entry.genre_id) ?? entry.genre_id,
      ),
    [genreLabels, spec],
  );

  const [coverLineOne, coverLineTwo] = selectedGenreLabels[0]
    ? coverLines(selectedGenreLabels[0])
    : [t("preview.coverEmptyA"), t("preview.coverEmptyB")];
  const compiledStyleText = compilation?.styleText ?? "";
  const effectiveStyleText = manualStyleText ?? compiledStyleText;
  const budgetMax = compilation?.budget.max || 1000;
  const budgetUsed =
    manualStyleText === null
      ? compilation?.budget.used ?? 0
      : countCharacters(manualStyleText);
  const manualBudgetValid = budgetUsed <= budgetMax;
  const budgetPercent = Math.min(100, Math.max(0, (budgetUsed / budgetMax) * 100));
  const activeCopyText =
    outputTab === "exclude" ? compilation?.excludeText ?? "" : effectiveStyleText;
  const canCopyActiveOutput =
    activeCopyText.length > 0 && (outputTab !== "style" || manualBudgetValid);
  const hasGenre = spec.genre_influences.length > 0;

  function setAllEditorMode(next: StudioEditorMode) {
    setGlobalEditorModeState(next);
    setFacetModesState({});
    void Promise.all([
      userDataStorage.set(EDITOR_MODE_PREFERENCE_KEY, next),
      userDataStorage.set(FACET_MODE_PREFERENCE_KEY, {}),
    ]).catch(() => {
      // The current session still follows the selected mode.
    });
  }

  function setFacetEditorMode(facet: FacetKey, next: StudioEditorMode) {
    setFacetModesState((current) => {
      const updated = { ...current, [facet]: next };
      void userDataStorage
        .set(FACET_MODE_PREFERENCE_KEY, updated)
        .catch(() => {
          // Per-facet mode remains available for the current session.
        });
      return updated;
    });
  }

  function chooseChapter(nextId: (typeof STUDIO_CHAPTERS)[number]["id"]) {
    setChapterId(nextId);
    setMobilePreviewOpen(false);
  }

  function jumpToPromptSource(sectionKey: string) {
    if (!isStudioSourceTarget(sectionKey)) return;

    const targetChapter =
      sectionKey === "exclude"
        ? STUDIO_CHAPTERS.find((entry) => entry.id === "finish")
        : STUDIO_CHAPTERS.find((entry) =>
            entry.facets.includes(sectionKey as FacetKey),
          );
    if (!targetChapter) return;

    setSourceJumpTarget(sectionKey);
    setChapterId(targetChapter.id);
    setMobilePreviewOpen(false);
  }

  function requestChapter(nextId: (typeof STUDIO_CHAPTERS)[number]["id"]) {
    const targetIndex = STUDIO_CHAPTERS.findIndex((entry) => entry.id === nextId);
    const currentIndex = STUDIO_CHAPTERS.findIndex(
      (entry) => entry.id === chapter.id,
    );
    const leavingDnaForward =
      chapter.id === "dna" && targetIndex > currentIndex;
    if (leavingDnaForward && !hasGenre && !genreSkipAcknowledged) {
      setGenreSkipAcknowledged(true);
      return;
    }
    chooseChapter(nextId);
  }

  useEffect(() => {
    function onChapterShortcut(event: KeyboardEvent) {
      if (
        projectLibraryOpen ||
        copyFallbackText !== null ||
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isTextEntryTarget(event.target)
      ) {
        return;
      }

      const index = Number(event.key) - 1;
      const target = STUDIO_CHAPTERS[index];
      if (!target || index < 0 || index > 3) return;

      event.preventDefault();
      requestChapter(target.id);
    }

    window.addEventListener("keydown", onChapterShortcut);
    return () => window.removeEventListener("keydown", onChapterShortcut);
  }, [
    chapter.id,
    copyFallbackText,
    genreSkipAcknowledged,
    hasGenre,
    projectLibraryOpen,
  ]);

  useEffect(() => {
    if (!sourceJumpTarget) return;

    const targetChapterId =
      sourceJumpTarget === "exclude"
        ? "finish"
        : STUDIO_CHAPTERS.find((entry) =>
            entry.facets.includes(sourceJumpTarget as FacetKey),
          )?.id;
    if (!targetChapterId || targetChapterId !== chapterId) return;

    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        '[data-facet="' + sourceJumpTarget + '"]',
      );
      if (!target) return;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
      });
      target.dataset.sourceJump = "true";
      window.setTimeout(() => {
        delete target.dataset.sourceJump;
      }, reducedMotion ? 120 : 1100);
      setSourceJumpTarget(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [chapterId, sourceJumpTarget]);

  useEffect(() => {
    if (runtime.status !== "ready" || mobilePreviewOpen) {
      setActiveFacetTarget(null);
      return;
    }

    const targets: StudioSourceTarget[] = [
      ...chapter.facets,
      ...(chapter.id === "finish" ? (["exclude"] as const) : []),
    ];
    if (targets.length === 0) {
      setActiveFacetTarget(null);
      return;
    }

    let frame = 0;

    function updateActiveFacet() {
      frame = 0;
      const threshold =
        window.innerWidth <= 760
          ? 136
          : window.innerWidth <= 980
            ? 206
            : 218;
      let next: StudioSourceTarget | null = targets[0] ?? null;

      for (const targetId of targets) {
        const element = document.querySelector<HTMLElement>(
          '[data-facet="' + targetId + '"]',
        );
        if (!element) continue;
        if (element.getBoundingClientRect().top <= threshold) {
          next = targetId;
          continue;
        }
        break;
      }

      setActiveFacetTarget((current) => (current === next ? current : next));
    }

    function scheduleUpdate() {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(updateActiveFacet);
    }

    updateActiveFacet();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [chapter, mobilePreviewOpen, runtime.status]);

  function syncSpecHistoryState() {
    setSpecHistoryState({
      undo: undoSpecRef.current.length,
      redo: redoSpecRef.current.length,
    });
  }

  function clearSpecHistory() {
    undoSpecRef.current = [];
    redoSpecRef.current = [];
    lastSpecCommitRef.current = null;
    syncSpecHistoryState();
  }

  function commitSpec(next: MusicSpec) {
    if (next === spec) return;

    const now = performance.now();
    const group = specHistoryGroup(spec, next);
    const last = lastSpecCommitRef.current;
    const canCoalesce =
      group !== null &&
      last?.group === group &&
      now - last.at <= SPEC_HISTORY_COALESCE_MS &&
      undoSpecRef.current.length > 0;

    if (!canCoalesce) {
      undoSpecRef.current = [
        ...undoSpecRef.current.slice(-(SPEC_HISTORY_LIMIT - 1)),
        spec,
      ];
    }
    redoSpecRef.current = [];
    lastSpecCommitRef.current = { group, at: now };
    setSpec(next);
    syncSpecHistoryState();
  }

  function undoSpec() {
    const previous =
      undoSpecRef.current[undoSpecRef.current.length - 1];
    if (!previous) return;

    undoSpecRef.current = undoSpecRef.current.slice(0, -1);
    redoSpecRef.current = [
      ...redoSpecRef.current.slice(-(SPEC_HISTORY_LIMIT - 1)),
      spec,
    ];
    lastSpecCommitRef.current = null;
    setSpec(previous);
    syncSpecHistoryState();
  }

  function redoSpec() {
    const next = redoSpecRef.current[redoSpecRef.current.length - 1];
    if (!next) return;

    redoSpecRef.current = redoSpecRef.current.slice(0, -1);
    undoSpecRef.current = [
      ...undoSpecRef.current.slice(-(SPEC_HISTORY_LIMIT - 1)),
      spec,
    ];
    lastSpecCommitRef.current = null;
    setSpec(next);
    syncSpecHistoryState();
  }

  function resetCurrentChapter() {
    commitSpec(
      resetMusicSpecFacets(spec, chapter.facets, {
        clearExclude: chapter.id === "finish",
      }),
    );
  }

  function applyProject(project: ProjectDocument) {
    clearSpecHistory();
    setCurrentProjectId(project.id);
    setProjectTitle(project.title);
    setSpec(project.music_spec);
    setManualStyleText(project.output.manual_style_override);
    setChapterId(
      isChapterId(project.workspace.active_chapter)
        ? project.workspace.active_chapter
        : STUDIO_CHAPTERS[0].id,
    );
    setGenreSkipAcknowledged(project.workspace.genre_skip_acknowledged);
    projectCreatedAtRef.current = project.created_at;
    setActiveGenreRole("foundation");
    setPromptUnlocked(false);
    setOutputTab("style");
    setMobilePreviewOpen(false);
  }

  function upsertSummary(
    current: readonly ProjectSummary[],
    project: ProjectDocument,
  ): readonly ProjectSummary[] {
    const summary: ProjectSummary = {
      id: project.id,
      title: project.title,
      created_at: project.created_at,
      updated_at: project.updated_at,
    };
    return [
      summary,
      ...current.filter((candidate) => candidate.id !== project.id),
    ].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  async function persistCurrentProjectNow(): Promise<ProjectDocument | null> {
    if (!projectReady || !currentProjectId) return null;
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const revision = ++saveRevisionRef.current;
    const project = createProjectDocument(currentProjectId, spec, {
      title: projectTitle,
      createdAt: projectCreatedAtRef.current,
      updatedAt: new Date().toISOString(),
      manualStyleOverride: manualStyleText,
      activeChapter: chapterId,
      genreSkipAcknowledged,
    });
    setProjectSaveState("saving");
    await projectStorage.save(project);
    if (saveRevisionRef.current === revision) {
      setProjectSaveState("saved");
      setProjectSummaries((current) => upsertSummary(current, project));
    }
    return project;
  }

  async function refreshProjectLibrary() {
    setProjectSummaries(await projectStorage.list());
  }

  async function runProjectAction(action: () => Promise<void>) {
    setProjectLibraryBusy(true);
    setProjectLibraryError(null);
    try {
      await action();
    } catch (error: unknown) {
      setProjectLibraryError(
        error instanceof ProjectStorageError &&
          (error.code === "invalid_project_json" ||
            error.code === "invalid_project_document" ||
            error.code === "unsupported_project_document")
          ? t("project.importError")
          : t("project.operationError"),
      );
    } finally {
      setProjectLibraryBusy(false);
    }
  }

  async function createNewProject() {
    await runProjectAction(async () => {
      await persistCurrentProjectNow();
      const now = new Date().toISOString();
      const project = createProjectDocument(
        createLocalProjectId(),
        resetMusicSpec(),
        { createdAt: now, updatedAt: now },
      );
      await projectStorage.save(project);
      await userDataStorage.set(ACTIVE_PROJECT_POINTER_KEY, project.id);
      applyProject(project);
      setProjectSaveState("saved");
      await refreshProjectLibrary();
      setProjectLibraryOpen(false);
    });
  }

  async function openProject(id: string) {
    if (id === currentProjectId) {
      setProjectLibraryOpen(false);
      return;
    }
    await runProjectAction(async () => {
      await persistCurrentProjectNow();
      const project = await projectStorage.load(id);
      if (!project) {
        throw new ProjectStorageError(
          "project_not_found",
          "Project no longer exists",
        );
      }
      await userDataStorage.set(ACTIVE_PROJECT_POINTER_KEY, project.id);
      applyProject(project);
      setProjectSaveState("restored");
      await refreshProjectLibrary();
      setProjectLibraryOpen(false);
    });
  }

  async function renameProject(id: string, title: string | null) {
    await runProjectAction(async () => {
      if (id === currentProjectId) await persistCurrentProjectNow();
      const source = await projectStorage.load(id);
      if (!source) return;
      const project = createProjectDocument(id, source.music_spec, {
        title: normalizeProjectTitle(title),
        createdAt: source.created_at,
        updatedAt: new Date().toISOString(),
        manualStyleOverride: source.output.manual_style_override,
        activeChapter: source.workspace.active_chapter,
        genreSkipAcknowledged: source.workspace.genre_skip_acknowledged,
      });
      await projectStorage.save(project);
      if (id === currentProjectId) {
        setProjectTitle(project.title);
        projectCreatedAtRef.current = project.created_at;
      }
      await refreshProjectLibrary();
    });
  }

  async function duplicateProject(id: string) {
    await runProjectAction(async () => {
      if (id === currentProjectId) await persistCurrentProjectNow();
      const source = await projectStorage.load(id);
      if (!source) return;
      const now = new Date().toISOString();
      const title = source.title
        ? t("project.copyTitle", { title: source.title })
        : t("project.untitledCopy");
      const project = duplicateProjectDocument(
        source,
        createLocalProjectId(),
        { title, createdAt: now, updatedAt: now },
      );
      await projectStorage.save(project);
      await userDataStorage.set(ACTIVE_PROJECT_POINTER_KEY, project.id);
      applyProject(project);
      setProjectSaveState("saved");
      await refreshProjectLibrary();
      setProjectLibraryOpen(false);
    });
  }

  async function deleteProject(id: string) {
    await runProjectAction(async () => {
      await projectStorage.delete(id);
      const remaining = await projectStorage.list();

      if (id === currentProjectId) {
        const nextSummary = remaining[0];
        if (nextSummary) {
          const next = await projectStorage.load(nextSummary.id);
          if (next) {
            await userDataStorage.set(ACTIVE_PROJECT_POINTER_KEY, next.id);
            applyProject(next);
            setProjectSaveState("restored");
          }
        } else {
          const now = new Date().toISOString();
          const next = createProjectDocument(
            createLocalProjectId(),
            resetMusicSpec(),
            { createdAt: now, updatedAt: now },
          );
          await projectStorage.save(next);
          await userDataStorage.set(ACTIVE_PROJECT_POINTER_KEY, next.id);
          applyProject(next);
          setProjectSaveState("saved");
        }
      }

      await refreshProjectLibrary();
    });
  }

  async function exportProject(id: string) {
    await runProjectAction(async () => {
      if (id === currentProjectId) await persistCurrentProjectNow();
      const project = await projectStorage.load(id);
      if (!project) return;
      downloadProjectDocument(project, t("project.untitled"));
    });
  }

  async function importProject(text: string) {
    await runProjectAction(async () => {
      await persistCurrentProjectNow();
      const source = parseProjectDocumentJson(text);
      const now = new Date().toISOString();
      const project = duplicateProjectDocument(
        source,
        createLocalProjectId(),
        {
          title: source.title ?? t("project.importedUntitled"),
          createdAt: now,
          updatedAt: now,
        },
      );
      await projectStorage.save(project);
      await userDataStorage.set(ACTIVE_PROJECT_POINTER_KEY, project.id);
      applyProject(project);
      setProjectSaveState("saved");
      await refreshProjectLibrary();
      setProjectLibraryOpen(false);
    });
  }

  function startNewPrompt() {
    void createNewProject();
  }

  function reviewPrompt() {
    if (!effectiveStyleText && compilation?.excludeText) {
      setOutputTab("exclude");
    } else {
      setOutputTab("style");
    }

    if (window.matchMedia("(max-width: 760px)").matches) {
      setMobilePreviewOpen(true);
    }

    window.requestAnimationFrame(() => {
      const preview = previewRef.current;
      if (!preview) return;
      preview.focus({ preventScroll: true });
      preview.dataset.reviewFocus = "true";
      window.setTimeout(() => {
        delete preview.dataset.reviewFocus;
      }, 900);
    });
  }

  function togglePromptUnlock() {
    if (!promptUnlocked && manualStyleText === null) {
      setManualStyleText(compiledStyleText);
    }
    setPromptUnlocked((current) => !current);
  }

  function resetManualPrompt() {
    setManualStyleText(null);
    setPromptUnlocked(false);
  }

  async function copyPrompt() {
    if (!canCopyActiveOutput) return;

    const result = await copyText(activeCopyText);
    if (result === "copied") {
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1200);
      return;
    }

    setCopyState("idle");
    setCopyFallbackText(activeCopyText);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        projectLibraryOpen ||
        copyFallbackText !== null ||
        event.key !== "Enter" ||
        (!event.ctrlKey && !event.metaKey) ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      if (!canCopyActiveOutput) return;

      event.preventDefault();
      void copyPrompt();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeCopyText,
    canCopyActiveOutput,
    copyFallbackText,
    outputTab,
    projectLibraryOpen,
  ]);


  useEffect(() => {
    function onHistoryKeyDown(event: KeyboardEvent) {
      if (
        projectLibraryOpen ||
        copyFallbackText !== null ||
        isTextEntryTarget(event.target) ||
        event.altKey
      ) {
        return;
      }

      const command = event.ctrlKey || event.metaKey;
      if (!command) return;

      const key = event.key.toLowerCase();
      const redo =
        (key === "z" && event.shiftKey) ||
        (key === "y" && event.ctrlKey && !event.metaKey && !event.shiftKey);
      const undo = key === "z" && !event.shiftKey;

      if (redo && redoSpecRef.current.length > 0) {
        event.preventDefault();
        redoSpec();
      } else if (undo && undoSpecRef.current.length > 0) {
        event.preventDefault();
        undoSpec();
      }
    }

    window.addEventListener("keydown", onHistoryKeyDown);
    return () => window.removeEventListener("keydown", onHistoryKeyDown);
  }, [copyFallbackText, projectLibraryOpen, spec]);

  const runtimeLabel =
    runtime.status === "ready"
      ? t("app.runtimeReady", {
          count: runtime.value.bootstrap.genres.genres.length.toLocaleString(locale),
        })
      : runtime.status === "loading"
        ? t("app.runtimeLoading")
        : t("app.runtimeError");

  const projectSaveLabel =
    projectSaveState === "loading"
      ? t("project.loading")
      : projectSaveState === "restored"
        ? t("project.restored")
        : projectSaveState === "saving"
          ? t("project.saving")
          : projectSaveState === "saved"
            ? t("project.saved")
            : projectSaveState === "unavailable"
              ? t("project.unavailable")
              : t("project.error");

  const currentChapterIndex = STUDIO_CHAPTERS.findIndex(
    (entry) => entry.id === chapter.id,
  );
  const nextChapter =
    STUDIO_CHAPTERS.find((_, index) => index === currentChapterIndex + 1) ??
    chapter;

  function chapterLabel(id: (typeof STUDIO_CHAPTERS)[number]["id"]): string {
    return t(("chapter." + id) as MessageKey);
  }

  function facetLabel(facet: FacetKey): string {
    return t(("facet." + facet) as MessageKey);
  }

  function diagnosticMessage(code: string, fallback: string): string {
    if (code === "missing_genre_label") return t("diagnostic.missingGenre");
    if (code === "budget_conflict") return t("diagnostic.budgetConflict");
    if (code === "budget_compacted") return t("diagnostic.budgetCompacted");
    return fallback;
  }

  return (
    <div className="studio-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brandmark">v</div>
          <div>
            <div className="brand-name">V&apos;GINE</div>
            <div className="brand-sub">BY GRAPH1KS</div>
          </div>
        </div>

        <div className="top-divider" />
        <span className="top-label">{t("app.soundStudio")}</span>

        <div className="top-actions">
          <button
            type="button"
            className="project-switcher"
            aria-label={t("project.switcherAria")}
            title={t("project.switcherAria")}
            onClick={() => {
              setProjectLibraryError(null);
              setProjectLibraryOpen(true);
              void refreshProjectLibrary().catch(() => {
                setProjectLibraryError(t("project.operationError"));
              });
            }}
          >
            <Icon name="folder" />
            <span>
              <strong>{projectTitle ?? t("project.untitled")}</strong>
              <small>{projectSaveLabel}</small>
            </span>
          </button>
          <span
            className="save-status"
            data-state={projectSaveState}
            title={runtimeLabel}
          >
            {runtime.status === "ready" ? projectSaveLabel : runtimeLabel}
          </span>
          <div className="history-actions" role="group" aria-label={t("history.label")}>
            <button
              type="button"
              className="icon-btn"
              disabled={specHistoryState.undo === 0}
              aria-label={t("history.undo")}
              aria-keyshortcuts="Control+Z Meta+Z"
              title={t("history.undoTitle")}
              onClick={undoSpec}
            >
              <Icon name="undo" />
            </button>
            <button
              type="button"
              className="icon-btn"
              disabled={specHistoryState.redo === 0}
              aria-label={t("history.redo")}
              aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
              title={t("history.redoTitle")}
              onClick={redoSpec}
            >
              <Icon name="redo" />
            </button>
          </div>
          <button
            type="button"
            className="icon-btn new-project-action"
            aria-label={t("project.new")}
            title={t("project.new")}
            onClick={startNewPrompt}
          >
            <Icon name="plus" />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={t("app.theme")}
            title={t("app.theme")}
            onClick={() =>
              setTheme((current) => (current === "paradise" ? "ash" : "paradise"))
            }
          >
            <Icon name="theme" />
          </button>
          <div className="language-switch" role="group" aria-label={t("language.label")}>
            {SUPPORTED_LOCALES.map((candidate) => (
              <button
                key={candidate}
                type="button"
                className={locale === candidate ? "active" : ""}
                aria-pressed={locale === candidate}
                onClick={() => setLocale(candidate)}
              >
                {candidate.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={assistOn ? "icon-btn assist-toggle active" : "icon-btn assist-toggle"}
            aria-pressed={assistOn}
            aria-label={assistOn ? t("app.explainOn") : t("app.explainOff")}
            title={t("app.explain")}
            onClick={() => setAssistOn((current) => !current)}
          >
            <Icon name="help" />
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!canCopyActiveOutput}
            aria-keyshortcuts="Control+Enter Meta+Enter"
            onClick={copyPrompt}
          >
            <Icon name="copy" />
            {copyState === "copied" ? t("app.copied") : t("app.copyPrompt")}
          </button>
        </div>
      </header>

      <div className="app">
        <section className="intro">
          <div>
            <div className="eyebrow">{t("intro.eyebrow")}</div>
            <h1>
              {t("intro.titleA")} <em>{t("intro.titleB")}</em>
            </h1>
            <p>{t("intro.body")}</p>
          </div>
          <div className="intro-right">
            <div className="preset-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div className="intro-note">
              {t("intro.noteA")}
              <br />
              {t("intro.noteB")}
            </div>
          </div>
        </section>

        <div className="layout">
          <main
            className={mobilePreviewOpen ? "editor mobile-hidden" : "editor"}
            id="editor"
          >
            <nav className="steps" aria-label={t("app.soundStudio")}>
              {STUDIO_CHAPTERS.map((item, index) => {
                const active = item.id === chapter.id;
                const activeItems = chapterActiveItemCount(spec, item);
                const label = chapterLabel(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={[
                      "step",
                      active ? "active" : "",
                      activeItems > 0 ? "filled" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-current={active ? "step" : undefined}
                    aria-keyshortcuts={"Alt+" + (index + 1)}
                    title={t("chapter.shortcut", {
                      chapter: label,
                      shortcut: "Alt+" + (index + 1),
                    })}
                    aria-label={
                      activeItems > 0
                        ? t("chapter.navWithCount", {
                            chapter: label,
                            count: activeItems,
                          })
                        : label
                    }
                    onClick={() => requestChapter(item.id)}
                  >
                    <span className="num">0{index + 1}</span>
                    <span className="step-label">{label}</span>
                    <kbd className="step-shortcut" aria-hidden="true">
                      Alt {index + 1}
                    </kbd>
                    {activeItems > 0 && (
                      <span className="step-count" aria-hidden="true">
                        {activeItems}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <section className="stage" key={chapter.id}>
              <div className="section-head">
                <div>
                  <h2>{chapterCopy.title}</h2>
                  <p>{chapterCopy.description}</p>
                </div>
                <div className="section-head-actions">
                  <div
                    className="global-editor-mode"
                    role="group"
                    aria-label={t("editorMode.label")}
                  >
                    <button
                      type="button"
                      className={globalEditorMode === "easy" ? "active" : ""}
                      aria-pressed={globalEditorMode === "easy"}
                      title={t("editorMode.easyTitle")}
                      onClick={() => setAllEditorMode("easy")}
                    >
                      {t("editorMode.allEasy")}
                    </button>
                    <button
                      type="button"
                      className={globalEditorMode === "advanced" ? "active" : ""}
                      aria-pressed={globalEditorMode === "advanced"}
                      title={t("editorMode.advancedTitle")}
                      onClick={() => setAllEditorMode("advanced")}
                    >
                      {t("editorMode.allAdvanced")}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="section-reset"
                    onClick={resetCurrentChapter}
                    title={t("chapter.reset")}
                  >
                    <Icon name="reset" />
                    {t("chapter.reset")}
                  </button>
                  <span className="section-index">
                  0
                  {STUDIO_CHAPTERS.findIndex((item) => item.id === chapter.id) + 1}
                  {" / 04"}
                  </span>
                </div>
              </div>

              {runtime.status === "ready" && (
                <nav
                  className="facet-jump-rail"
                  aria-label={t("chapter.facetsAria", {
                    chapter: chapterLabel(chapter.id),
                  })}
                >
                  {chapter.facets.map((facet) => {
                    const count = facetActiveItemCount(spec, facet);
                    const label = facetLabel(facet);
                    return (
                      <button
                        key={facet}
                        type="button"
                        className={[
                          "facet-jump-item",
                          count > 0 ? "filled" : "",
                          activeFacetTarget === facet ? "active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        aria-current={
                          activeFacetTarget === facet ? "location" : undefined
                        }
                        aria-label={
                          count > 0
                            ? t("chapter.facetWithCount", {
                                facet: label,
                                count,
                              })
                            : label
                        }
                        onClick={() => jumpToPromptSource(facet)}
                      >
                        <span>{label}</span>
                        {count > 0 && (
                          <small aria-hidden="true">{count}</small>
                        )}
                      </button>
                    );
                  })}
                  {chapter.id === "finish" && (
                    <button
                      type="button"
                      className={[
                        "facet-jump-item",
                        spec.exclude.length > 0 ? "filled" : "",
                        activeFacetTarget === "exclude" ? "active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-current={
                        activeFacetTarget === "exclude" ? "location" : undefined
                      }
                      aria-label={
                        spec.exclude.length > 0
                          ? t("chapter.facetWithCount", {
                              facet: t("exclude.title"),
                              count: spec.exclude.length,
                            })
                          : t("exclude.title")
                      }
                      onClick={() => jumpToPromptSource("exclude")}
                    >
                      <span>{t("exclude.title")}</span>
                      {spec.exclude.length > 0 && (
                        <small aria-hidden="true">{spec.exclude.length}</small>
                      )}
                    </button>
                  )}
                </nav>
              )}

              {runtime.status === "loading" && (
                <div className="field-card runtime-card">
                  <span className="runtime-spinner" aria-hidden="true" />
                  <div>
                    <strong>{t("runtime.validating")}</strong>
                    <p>
                      {t("runtime.validatingBody")}
                    </p>
                  </div>
                </div>
              )}

              {runtime.status === "error" && (
                <div className="field-card runtime-card error">
                  <Icon name="info" />
                  <div>
                    <strong>{t("runtime.unavailable")}</strong>
                    <p>
                      {t("runtime.unavailableBody")}
                    </p>
                    <small>{runtime.message}</small>
                  </div>
                </div>
              )}

              {runtime.status === "ready" && (
                <div className="studio-fields">
                  {chapter.facets.map((facet) =>
                    facet === "genre" ? (
                      <GenrePicker
                        key={facet}
                        runtime={runtime.value.bootstrap}
                        searchIndex={runtime.value.searchIndex}
                        spec={spec}
                        activeRole={activeGenreRole}
                        onRoleChange={setActiveGenreRole}
                        onSpecChange={commitSpec}
                        assistOn={assistOn}
                        loadKnowledge={runtime.value.loadKnowledge}
                      />
                    ) : facet === "instruments" ? (
                      <InstrumentPicker
                        key={facet}
                        runtime={runtime.value}
                        spec={spec}
                        onSpecChange={commitSpec}
                        assistOn={assistOn}
                      />
                    ) : (
                      <FacetEditor
                        key={facet}
                        facet={facet}
                        label={facetLabel(facet)}
                        runtime={runtime.value}
                        spec={spec}
                        onSpecChange={commitSpec}
                        assistOn={assistOn}
                        mode={facetModes[facet] ?? globalEditorMode}
                        onModeChange={(next) =>
                          setFacetEditorMode(facet, next)
                        }
                      />
                    ),
                  )}
                  {chapter.id === "finish" && (
                    <ExcludePicker
                      runtime={runtime.value}
                      spec={spec}
                      onSpecChange={commitSpec}
                      assistOn={assistOn}
                    />
                  )}
                </div>
              )}

              <div className="stage-footer">
                <p>
                  {chapter.id === "dna"
                    ? genreSkipAcknowledged && !hasGenre
                      ? t("footer.genreSkipConfirm")
                      : t("footer.genreOptional")
                    : t("footer.sharedState")}
                </p>
                <button
                  type="button"
                  className={
                    chapter.id === "dna" && genreSkipAcknowledged && !hasGenre
                      ? "btn warning-next"
                      : "btn primary"
                  }
                  onClick={() =>
                    chapter.id === "finish"
                      ? reviewPrompt()
                      : requestChapter(nextChapter.id)
                  }
                >
                  {chapter.id === "dna" && genreSkipAcknowledged && !hasGenre ? (
                    <>
                      <Icon name="warning" />
                      {t("footer.continueNoGenre")}
                    </>
                  ) : (
                    <>
                      {chapter.id === "finish"
                        ? t("footer.reviewPrompt")
                        : chapterLabel(nextChapter.id)}
                      <Icon name="arrow" />
                    </>
                  )}
                </button>
              </div>
            </section>
          </main>

          <aside
            ref={previewRef}
            tabIndex={-1}
            className={
              mobilePreviewOpen
                ? previewPulse
                  ? "preview mobile-open changed"
                  : "preview mobile-open"
                : previewPulse
                  ? "preview changed"
                  : "preview"
            }
            aria-label={t("preview.aria")}
          >
            <div className="preview-top">
              <span className="eyebrow">{t("preview.eyebrow")}</span>
              <span className="live">
                <i className="dot" /> {t("preview.live")}
              </span>
            </div>

            <div className="cover">
              <div className="eyebrow">V&apos;GINE / SOUND STUDY 001</div>
              <h2>
                {coverLineOne}
                <br />
                {coverLineTwo}
              </h2>
              <div className="cover-code">
                {selectedGenreLabels.length
                  ? selectedGenreLabels.slice(0, 3).join(" × ").toUpperCase()
                  : t("preview.genreFree")}
              </div>
              <div className="record" aria-hidden="true" />
              <div className="cover-barcode" aria-hidden="true" />
            </div>

            <div className="prompt-edit-controls">
              <button
                type="button"
                className={promptUnlocked ? "prompt-edit active" : "prompt-edit"}
                disabled={!compiledStyleText && manualStyleText === null}
                onClick={togglePromptUnlock}
              >
                <Icon name={promptUnlocked ? "lock" : "unlock"} />
                {promptUnlocked ? t("preview.lock") : t("preview.unlock")}
              </button>
              {(manualStyleText !== null || promptUnlocked) && (
                <button
                  type="button"
                  className="prompt-edit"
                  onClick={resetManualPrompt}
                >
                  <Icon name="reset" />
                  {t("preview.restore")}
                </button>
              )}
            </div>

            <div className="preview-tabs">
              <button
                type="button"
                className={outputTab === "style" ? "preview-tab active" : "preview-tab"}
                aria-pressed={outputTab === "style"}
                onClick={() => setOutputTab("style")}
              >
                Style
                <span className="n">{compilation?.sections.length ?? 0}</span>
              </button>
              <button
                type="button"
                className={outputTab === "exclude" ? "preview-tab active" : "preview-tab"}
                aria-pressed={outputTab === "exclude"}
                onClick={() => setOutputTab("exclude")}
              >
                Exclude
                <span className="n">{compilation?.excludeText ? 1 : 0}</span>
              </button>
            </div>

            <div className="prompt-area">
              {outputTab === "style" ? (
                promptUnlocked ? (
                  <label className="manual-prompt-editor">
                    <span className="sr-only">{t("preview.manualAria")}</span>
                    <textarea
                      value={manualStyleText ?? compiledStyleText}
                      spellCheck={false}
                      onChange={(event) => setManualStyleText(event.currentTarget.value)}
                    />
                    <small>
                      {t("preview.manualHint")}
                    </small>
                  </label>
                ) : manualStyleText !== null ? (
                  <pre className="manual-prompt-output">{manualStyleText}</pre>
                ) : compilation?.sections.length ? (
                  compilation.sections.map((section) => (
                    <div className="prompt-line-group" key={section.sectionKey}>
                      <button
                        type="button"
                        className="prompt-line changed-line prompt-line-source"
                        aria-label={t("preview.editSection", {
                          section: section.label,
                        })}
                        title={t("preview.editSection", {
                          section: section.label,
                        })}
                        onClick={() => jumpToPromptSource(section.sectionKey)}
                      >
                        <span className="bracket">[</span>
                        <span className="prompt-key">{section.label}</span>
                        <span className="bracket">: </span>
                        <span className="prompt-value">{section.content}</span>
                        <span className="bracket">]</span>
                        <span className="prompt-source-cue" aria-hidden="true">
                          <Icon name="edit" />
                        </span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="preview-empty">
                    <Icon name="spark" />
                    <p>
                      {t("preview.empty")}
                    </p>
                  </div>
                )
              ) : compilation?.excludeText ? (
                <button
                  type="button"
                  className="exclude-text exclude-source"
                  aria-label={t("preview.editExclude")}
                  title={t("preview.editExclude")}
                  onClick={() => jumpToPromptSource("exclude")}
                >
                  <span>{compilation.excludeText}</span>
                  <span className="prompt-source-cue" aria-hidden="true">
                    <Icon name="edit" />
                  </span>
                </button>
              ) : (
                <div className="preview-empty">
                  <p>{t("preview.noExclude")}</p>
                </div>
              )}

              {!manualBudgetValid && outputTab === "style" && (
                <div className="diagnostic error">
                  {t("preview.manualOver", { count: budgetUsed - budgetMax })}
                </div>
              )}

              {compilation?.diagnostics.map((diagnostic, index) => (
                <div
                  key={diagnostic.code + String(index)}
                  className={"diagnostic " + diagnostic.severity}
                >
                  {diagnosticMessage(diagnostic.code, diagnostic.message)}
                </div>
              ))}
            </div>

            <div className="preview-footer">
              <div className="budget-row">
                <span>{t("preview.sunoStyle")}</span>
                <b>
                  {budgetUsed} / {budgetMax}
                </b>
              </div>
              <div className="budget-track">
                <i style={{ width: budgetPercent + "%" }} />
              </div>
              <button
                type="button"
                className="btn acid"
                disabled={!canCopyActiveOutput}
                aria-keyshortcuts="Control+Enter Meta+Enter"
                onClick={copyPrompt}
              >
                <Icon name="copy" />
                {copyState === "copied"
                  ? t("app.copied")
                  : outputTab === "style"
                    ? t("preview.copyStyle")
                    : t("preview.copyExclude")}
                <span className="copy-shortcut">Ctrl / ⌘ ↵</span>
              </button>
              <div className="preview-note">
                {manualStyleText !== null
                  ? t("preview.manualActive")
                  : t("preview.deterministic")}
              </div>
            </div>
          </aside>
        </div>

        <footer className="bottom-note">
          <span>GRAPH1KS / V&apos;GINE — PRODUCTION STUDIO</span>
          <span>Runtime Pack · MusicSpec v1 · Compiler v1</span>
        </footer>
      </div>

      <CopyFallback
        text={copyFallbackText}
        onClose={() => setCopyFallbackText(null)}
      />

      <ProjectLibrary
        open={projectLibraryOpen}
        currentProjectId={currentProjectId}
        currentProjectTitle={projectTitle}
        projects={projectSummaries}
        busy={projectLibraryBusy}
        error={projectLibraryError}
        onClose={() => setProjectLibraryOpen(false)}
        onCreate={createNewProject}
        onOpen={openProject}
        onRename={renameProject}
        onDuplicate={duplicateProject}
        onDelete={deleteProject}
        onExport={exportProject}
        onImport={importProject}
      />

      <div className="mobile-dock">
        <button
          type="button"
          className="btn mobile-preview-button"
          onClick={() => setMobilePreviewOpen((current) => !current)}
        >
          <span>
            {mobilePreviewOpen ? t("mobile.backStudio") : t("mobile.livePrompt")}
            <small>
              {mobilePreviewOpen
                ? t("mobile.preserved")
                : t("mobile.characters", { used: budgetUsed, max: budgetMax })}
            </small>
          </span>
          <Icon name={mobilePreviewOpen ? "back" : "arrow"} />
        </button>
        <button
          type="button"
          className={
            assistOn
              ? "icon-btn mobile-explain-button active"
              : "icon-btn mobile-explain-button"
          }
          aria-pressed={assistOn}
          aria-label={assistOn ? t("app.explainOn") : t("app.explainOff")}
          title={t("app.explain")}
          onClick={() => setAssistOn((current) => !current)}
        >
          <Icon name="help" />
        </button>
        <button
          type="button"
          className="btn acid"
          disabled={!canCopyActiveOutput}
          onClick={copyPrompt}
        >
          <Icon name="copy" />
          {t("mobile.copy")}
        </button>
      </div>
    </div>
  );
}
