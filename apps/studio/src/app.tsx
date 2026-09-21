import { useEffect, useMemo, useState } from "react";
import { compileMusicSpec } from "@vgine/compiler";
import type {
  FacetKey,
  GenreInfluenceRole,
  MusicSpec,
} from "@vgine/music-spec";
import {
  Button,
  Cluster,
  Stack,
  Surface,
  Text,
  isVgineTheme,
  type VgineTheme,
} from "@vgine/ui";

import { GenrePicker } from "./genre-picker.js";
import { loadStudioRuntime, type StudioRuntime } from "./runtime-client.js";
import { FACET_LABELS, STUDIO_CHAPTERS } from "./studio-config.js";

const THEME_KEY = "vgine.theme";

type RuntimeState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly value: StudioRuntime }
  | { readonly status: "error"; readonly message: string };

function initialTheme(): VgineTheme {
  const stored = globalThis.localStorage?.getItem(THEME_KEY);
  return stored && isVgineTheme(stored) ? stored : "paradise";
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard copy failed");
}

export function App() {
  const [theme, setTheme] = useState<VgineTheme>(initialTheme);
  const [chapterId, setChapterId] = useState(STUDIO_CHAPTERS[0].id);
  const [activeFacet, setActiveFacet] = useState<FacetKey>("genre");
  const [activeGenreRole, setActiveGenreRole] =
    useState<GenreInfluenceRole>("foundation");
  const [spec, setSpec] = useState<MusicSpec | null>(null);
  const [runtime, setRuntime] = useState<RuntimeState>({ status: "loading" });
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const chapter =
    STUDIO_CHAPTERS.find((candidate) => candidate.id === chapterId) ??
    STUDIO_CHAPTERS[0];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

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

  const genreLabels = useMemo(() => {
    if (runtime.status !== "ready") return new Map<string, string>();
    return new Map(
      runtime.value.bootstrap.genres.genres.map((genre) => [genre.id, genre.label]),
    );
  }, [runtime]);

  const compilation = useMemo(() => {
    if (runtime.status !== "ready" || spec === null) return null;
    return compileMusicSpec(spec, runtime.value.compilerKnowledge);
  }, [runtime, spec]);

  function chooseChapter(nextId: (typeof STUDIO_CHAPTERS)[number]["id"]) {
    const next = STUDIO_CHAPTERS.find((candidate) => candidate.id === nextId);
    if (!next) return;
    setChapterId(next.id);
    setActiveFacet(next.facets[0]);
  }

  function facetSummary(facet: FacetKey): string {
    if (facet === "genre") {
      if (spec === null) return "Choose Foundation";
      return spec.genre_influences
        .map((entry) => genreLabels.get(entry.genre_id) ?? entry.genre_id)
        .join(" · ");
    }

    const facetState = spec?.facets[facet];
    if (!facetState) return "Not set";
    const count =
      facetState.selections.length + (facetState.custom_text?.trim() ? 1 : 0);
    return count === 0 ? "Not set" : count === 1 ? "1 choice" : String(count) + " choices";
  }

  async function copyPrompt() {
    if (!compilation?.styleText) return;
    try {
      await copyText(compilation.styleText);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1600);
    }
  }

  const runtimeBadge =
    runtime.status === "ready"
      ? runtime.value.bootstrap.genres.genres.length.toLocaleString() + " genres"
      : runtime.status === "loading"
        ? "Loading runtime"
        : "Runtime unavailable";

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <Cluster gap="4">
          <div className="brand-mark" aria-hidden="true">V</div>
          <div>
            <div className="brand-title">Prompt V&apos;gine</div>
            <Text as="small" tone="muted" size="xs">
              {runtimeBadge}
            </Text>
          </div>
        </Cluster>

        <Cluster gap="2">
          <Text as="small" tone="muted" size="xs" className="desktop-only">
            MusicSpec · deterministic compiler
          </Text>
          <Button
            size="sm"
            tone="ghost"
            aria-label="Switch color theme"
            onClick={() =>
              setTheme((current) => (current === "paradise" ? "ash" : "paradise"))
            }
          >
            {theme === "paradise" ? "Ash" : "Paradise"}
          </Button>
          <Button
            size="sm"
            tone="accent"
            disabled={!compilation?.budget.valid}
            onClick={copyPrompt}
          >
            {copyState === "copied" ? "Copied" : "Export"}
          </Button>
        </Cluster>
      </header>

      <main className="studio-main">
        <nav className="chapter-rail" aria-label="Studio chapters">
          {STUDIO_CHAPTERS.map((item, index) => {
            const active = item.id === chapter.id;
            return (
              <button
                key={item.id}
                type="button"
                className="chapter-button"
                data-active={active || undefined}
                aria-current={active ? "step" : undefined}
                onClick={() => chooseChapter(item.id)}
              >
                <span className="chapter-index">0{index + 1}</span>
                <span className="chapter-label">{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>

        <section className="workspace" aria-labelledby="workspace-title">
          <div className="workspace-heading">
            <Stack gap="2">
              <Text as="small" tone="accent" size="xs">
                {chapter.shortLabel.toUpperCase()}
              </Text>
              <h1 id="workspace-title">{chapter.label}</h1>
              <Text as="p" tone="muted" size="sm">
                {chapter.description}
              </Text>
            </Stack>

            <div className="chapter-status" aria-label="Active facet">
              <span>Editing</span>
              <strong>{FACET_LABELS[activeFacet]}</strong>
            </div>
          </div>

          <div className="facet-grid">
            {chapter.facets.map((facet) => (
              <button
                key={facet}
                type="button"
                className="facet-card"
                data-active={facet === activeFacet || undefined}
                onClick={() => setActiveFacet(facet)}
              >
                <span className="facet-card-copy">
                  <span className="facet-label">{FACET_LABELS[facet]}</span>
                  <span className="facet-value">{facetSummary(facet)}</span>
                </span>
                <span className="facet-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>

          <Surface elevation="raised" className="inspector">
            <Stack gap="4">
              <Cluster gap="2">
                <span className="status-dot" aria-hidden="true" />
                <Text as="small" tone="muted" size="xs">
                  ACTIVE FACET
                </Text>
              </Cluster>
              <h2>{FACET_LABELS[activeFacet]}</h2>

              {runtime.status === "loading" && (
                <div className="runtime-state">
                  <Text as="p" tone="muted" size="sm">
                    Loading and validating the local Runtime Pack…
                  </Text>
                </div>
              )}

              {runtime.status === "error" && (
                <div className="runtime-state runtime-state-error">
                  <Text as="strong" size="sm">
                    Runtime Pack unavailable
                  </Text>
                  <Text as="p" tone="muted" size="sm">
                    Run <code>pnpm runtime:stage</code> from the repository root, then reload the Studio.
                  </Text>
                  <Text as="small" tone="muted" size="xs">
                    {runtime.message}
                  </Text>
                </div>
              )}

              {runtime.status === "ready" && activeFacet === "genre" && (
                <GenrePicker
                  runtime={runtime.value.bootstrap}
                  searchIndex={runtime.value.searchIndex}
                  spec={spec}
                  activeRole={activeGenreRole}
                  onRoleChange={setActiveGenreRole}
                  onSpecChange={setSpec}
                />
              )}

              {runtime.status === "ready" && activeFacet !== "genre" && (
                <div className="runtime-state">
                  <Text as="p" tone="muted" size="sm">
                    This facet is structurally live but its production controls are not implemented in this slice.
                    No placeholder option vocabulary is fabricated.
                  </Text>
                </div>
              )}
            </Stack>
          </Surface>
        </section>

        <aside className="preview-panel" aria-label="Live prompt preview">
          <div className="preview-top">
            <div>
              <Text as="small" tone="accent" size="xs">
                LIVE OUTPUT
              </Text>
              <h2>Prompt</h2>
            </div>
            <div
              className="budget-pill"
              data-valid={compilation?.budget.valid || undefined}
              aria-label="Prompt budget"
            >
              <span>{compilation?.budget.used ?? 0}</span>
              <span>/ {compilation?.budget.max ?? 1000}</span>
            </div>
          </div>

          <Surface elevation="raised" className="prompt-empty">
            {compilation?.styleText ? (
              <Stack gap="4">
                <pre className="prompt-output">{compilation.styleText}</pre>
                {compilation.diagnostics.length > 0 && (
                  <div className="prompt-diagnostics">
                    {compilation.diagnostics.map((diagnostic, index) => (
                      <Text
                        key={diagnostic.code + String(index)}
                        as="small"
                        tone={diagnostic.severity === "error" ? "accent" : "muted"}
                        size="xs"
                      >
                        {diagnostic.message}
                      </Text>
                    ))}
                  </div>
                )}
              </Stack>
            ) : (
              <Stack gap="3">
                <div className="prompt-cursor" aria-hidden="true" />
                <Text as="p" tone="muted" size="sm">
                  Choose a Foundation genre to create the first valid MusicSpec.
                  Rendered prompt text remains output only.
                </Text>
              </Stack>
            )}
          </Surface>

          <div className="preview-footer">
            <Text as="small" tone="muted" size="xs">
              {compilation?.excludeText
                ? "Exclude: " + compilation.excludeText
                : "Exclude is a separate output channel."}
            </Text>
            <Button
              size="sm"
              disabled={!compilation?.styleText}
              onClick={copyPrompt}
            >
              {copyState === "copied"
                ? "Copied"
                : copyState === "error"
                  ? "Copy failed"
                  : "Copy"}
            </Button>
          </div>
        </aside>
      </main>

      <nav className="mobile-chapter-dock" aria-label="Studio chapters mobile">
        {STUDIO_CHAPTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-active={item.id === chapter.id || undefined}
            onClick={() => chooseChapter(item.id)}
          >
            {item.shortLabel}
          </button>
        ))}
      </nav>
    </div>
  );
}
