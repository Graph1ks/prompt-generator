import { useEffect, useMemo, useState } from "react";
import type { FacetKey } from "@vgine/music-spec";
import {
  Button,
  Cluster,
  Stack,
  Surface,
  Text,
  isVgineTheme,
  type VgineTheme,
} from "@vgine/ui";

import { FACET_LABELS, STUDIO_CHAPTERS } from "./studio-config.js";

const THEME_KEY = "vgine.theme";

function initialTheme(): VgineTheme {
  const stored = globalThis.localStorage?.getItem(THEME_KEY);
  return stored && isVgineTheme(stored) ? stored : "paradise";
}

export function App() {
  const [theme, setTheme] = useState<VgineTheme>(initialTheme);
  const [chapterId, setChapterId] = useState(STUDIO_CHAPTERS[0].id);
  const [activeFacet, setActiveFacet] = useState<FacetKey>("genre");

  const chapter =
    STUDIO_CHAPTERS.find((candidate) => candidate.id === chapterId) ??
    STUDIO_CHAPTERS[0];

  const chapterProgress = useMemo(
    () => chapter.facets.filter((facet) => facet === activeFacet).length,
    [activeFacet, chapter.facets],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  function chooseChapter(nextId: (typeof STUDIO_CHAPTERS)[number]["id"]) {
    const next = STUDIO_CHAPTERS.find((candidate) => candidate.id === nextId);
    if (!next) return;
    setChapterId(next.id);
    setActiveFacet(next.facets[0]);
  }

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <Cluster gap="4">
          <div className="brand-mark" aria-hidden="true">V</div>
          <div>
            <div className="brand-title">Prompt V&apos;gine</div>
            <Text as="small" tone="muted" size="xs">
              Studio foundation
            </Text>
          </div>
        </Cluster>

        <Cluster gap="2">
          <Text as="small" tone="muted" size="xs" className="desktop-only">
            Semantic state · deterministic compiler
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
          <Button size="sm" tone="accent" disabled>
            Export
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

            <div className="chapter-status" aria-label="Chapter activity">
              <span>{chapterProgress ? "Editing" : "Ready"}</span>
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
                  <span className="facet-value">
                    {facet === "genre" ? "Choose Foundation" : "Not set"}
                  </span>
                </span>
                <span className="facet-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>

          <Surface elevation="raised" className="inspector">
            <Stack gap="3">
              <Cluster gap="2">
                <span className="status-dot" aria-hidden="true" />
                <Text as="small" tone="muted" size="xs">
                  ACTIVE FACET
                </Text>
              </Cluster>
              <h2>{FACET_LABELS[activeFacet]}</h2>
              <Text as="p" tone="muted" size="sm">
                {activeFacet === "genre"
                  ? "Start with one Foundation genre. Fusion and Accent remain optional; the production picker will use the reviewed Runtime Pack taxonomy."
                  : "This shell deliberately contains no fabricated option data. The production control will bind to Runtime Pack knowledge and the shared MusicSpec."}
              </Text>
              <Cluster gap="2">
                <Button tone="accent" disabled>
                  Open picker
                </Button>
                <Button tone="ghost" disabled>
                  Advanced
                </Button>
              </Cluster>
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
            <div className="budget-pill" aria-label="Prompt budget">
              <span>0</span>
              <span>/ 1000</span>
            </div>
          </div>

          <Surface elevation="raised" className="prompt-empty">
            <Stack gap="3">
              <div className="prompt-cursor" aria-hidden="true" />
              <Text as="p" tone="muted" size="sm">
                Choose a Foundation genre to create the first semantic project state.
                Rendered prompt text is output only; it will never become hidden editor state.
              </Text>
            </Stack>
          </Surface>

          <div className="preview-footer">
            <Text as="small" tone="muted" size="xs">
              Exclude is a separate output channel.
            </Text>
            <Button size="sm" disabled>
              Copy
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
