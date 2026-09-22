import { useEffect, useMemo, useState } from "react";
import { compileMusicSpec, countCharacters } from "@vgine/compiler";
import {
  createMusicSpec,
  resetMusicSpec,
  resetMusicSpecFacets,
  type FacetKey,
  type GenreInfluenceRole,
  type MusicSpec,
} from "@vgine/music-spec";
import { isVgineTheme, type VgineTheme } from "@vgine/ui";

import { FacetEditor } from "./facet-editor.js";
import { GenrePicker } from "./genre-picker.js";
import { InstrumentPicker } from "./instrument-picker.js";
import { Icon } from "./icons.js";
import { SUPPORTED_LOCALES, useI18n, type MessageKey } from "./i18n.js";
import { loadStudioRuntime, type StudioRuntime } from "./runtime-client.js";
import { STUDIO_CHAPTERS } from "./studio-config.js";

const THEME_KEY = "vgine.theme";

type RuntimeState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly value: StudioRuntime }
  | { readonly status: "error"; readonly message: string };

type OutputTab = "style" | "exclude";

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

function coverLines(label: string): readonly [string, string] {
  const words = label.split(/\s+/u).filter(Boolean);
  if (words.length <= 1) return [label || "Build", "your sound."];
  const split = Math.ceil(words.length / 2);
  return [words.slice(0, split).join(" "), words.slice(split).join(" ")];
}

export function App() {
  const { locale, setLocale, t } = useI18n();
  const [theme, setTheme] = useState<VgineTheme>(initialTheme);
  const [chapterId, setChapterId] = useState(STUDIO_CHAPTERS[0].id);
  const [activeGenreRole, setActiveGenreRole] =
    useState<GenreInfluenceRole>("foundation");
  const [spec, setSpec] = useState<MusicSpec>(() => createMusicSpec());
  const [runtime, setRuntime] = useState<RuntimeState>({ status: "loading" });
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [outputTab, setOutputTab] = useState<OutputTab>("style");
  const [assistOn, setAssistOn] = useState(true);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [previewPulse, setPreviewPulse] = useState(false);
  const [genreSkipAcknowledged, setGenreSkipAcknowledged] = useState(false);
  const [manualStyleText, setManualStyleText] = useState<string | null>(null);
  const [promptUnlocked, setPromptUnlocked] = useState(false);

  const chapter =
    STUDIO_CHAPTERS.find((candidate) => candidate.id === chapterId) ??
    STUDIO_CHAPTERS[0];
  const chapterCopy = {
    title: t(("chapter." + chapter.id + ".title") as MessageKey),
    description: t(("chapter." + chapter.id + ".description") as MessageKey),
  };

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
    return new Map([
      ...runtime.value.bootstrap.core.major_genres.map(
        (major) => [major.id, major.label] as const,
      ),
      ...runtime.value.bootstrap.genres.genres.map(
        (genre) => [genre.id, genre.label] as const,
      ),
    ]);
  }, [runtime]);

  const compilation = useMemo(() => {
    if (runtime.status !== "ready") return null;
    return compileMusicSpec(spec, runtime.value.compilerKnowledge);
  }, [runtime, spec]);

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
  const hasGenre = spec.genre_influences.length > 0;

  function chooseChapter(nextId: (typeof STUDIO_CHAPTERS)[number]["id"]) {
    setChapterId(nextId);
    setMobilePreviewOpen(false);
  }

  function requestChapter(nextId: (typeof STUDIO_CHAPTERS)[number]["id"]) {
    const targetIndex = STUDIO_CHAPTERS.findIndex((entry) => entry.id === nextId);
    const leavingDnaForward = chapter.id === "dna" && targetIndex > currentChapterIndex;
    if (leavingDnaForward && !hasGenre && !genreSkipAcknowledged) {
      setGenreSkipAcknowledged(true);
      return;
    }
    chooseChapter(nextId);
  }

  function resetCurrentChapter() {
    setSpec(
      resetMusicSpecFacets(spec, chapter.facets, {
        clearExclude: chapter.id === "finish",
      }),
    );
  }

  function startNewPrompt() {
    setSpec(resetMusicSpec());
    setChapterId(STUDIO_CHAPTERS[0].id);
    setActiveGenreRole("foundation");
    setGenreSkipAcknowledged(false);
    setManualStyleText(null);
    setPromptUnlocked(false);
    setOutputTab("style");
    setMobilePreviewOpen(false);
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
    const value =
      outputTab === "exclude" ? compilation?.excludeText : effectiveStyleText;
    if (!value) return;
    if (outputTab === "style" && !manualBudgetValid) return;
    try {
      await copyText(value);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1600);
    }
  }

  const runtimeLabel =
    runtime.status === "ready"
      ? t("app.runtimeReady", {
          count: runtime.value.bootstrap.genres.genres.length.toLocaleString(locale),
        })
      : runtime.status === "loading"
        ? t("app.runtimeLoading")
        : t("app.runtimeError");

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
          <span className="save-status">{runtimeLabel}</span>
          <button
            type="button"
            className="icon-btn"
            aria-label={t("app.newPrompt")}
            title={t("app.newPrompt")}
            onClick={startNewPrompt}
          >
            <Icon name="reset" />
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
            disabled={!effectiveStyleText || !manualBudgetValid}
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
                const currentIndex = STUDIO_CHAPTERS.findIndex(
                  (candidate) => candidate.id === chapter.id,
                );
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      active
                        ? "step active"
                        : index < currentIndex
                          ? "step done"
                          : "step"
                    }
                    aria-current={active ? "step" : undefined}
                    onClick={() => requestChapter(item.id)}
                  >
                    <span className="num">0{index + 1}</span>
                    {chapterLabel(item.id)}
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

              {runtime.status === "ready" && chapter.id === "dna" && (
                <GenrePicker
                  runtime={runtime.value.bootstrap}
                  searchIndex={runtime.value.searchIndex}
                  spec={spec}
                  activeRole={activeGenreRole}
                  onRoleChange={setActiveGenreRole}
                  onSpecChange={setSpec}
                />
              )}

              {runtime.status === "ready" && chapter.id !== "dna" && (
                <div className="placeholder-fields">
                  {chapter.facets.map((facet) =>
                    facet === "instruments" ? (
                      <InstrumentPicker
                        key={facet}
                        runtime={runtime.value}
                        spec={spec}
                        onSpecChange={setSpec}
                      />
                    ) : facet === "genre" ? null : (
                      <FacetEditor
                        key={facet}
                        facet={facet}
                        label={facetLabel(facet)}
                        runtime={runtime.value}
                        spec={spec}
                        onSpecChange={setSpec}
                      />
                    ),
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
                  onClick={() => requestChapter(nextChapter.id)}
                >
                  {chapter.id === "dna" && genreSkipAcknowledged && !hasGenre ? (
                    <>
                      <Icon name="warning" />
                      {t("footer.continueNoGenre")}
                    </>
                  ) : (
                    <>
                      {chapter.id === "finish" ? t("footer.done") : chapterLabel(nextChapter.id)}
                      <Icon name="arrow" />
                    </>
                  )}
                </button>
              </div>
            </section>
          </main>

          <aside
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
                    <div className="prompt-line changed-line" key={section.sectionKey}>
                      <span className="bracket">[</span>
                      <span className="prompt-key">{section.label}</span>
                      <span className="bracket">: </span>
                      <span className="prompt-value">{section.content}</span>
                      <span className="bracket">]</span>
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
                <p className="exclude-text">{compilation.excludeText}</p>
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
                disabled={
                  outputTab === "style"
                    ? !effectiveStyleText || !manualBudgetValid
                    : !compilation?.excludeText
                }
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
          className="btn acid"
          disabled={!effectiveStyleText || !manualBudgetValid}
          onClick={copyPrompt}
        >
          <Icon name="copy" />
          {t("mobile.copy")}
        </button>
      </div>
    </div>
  );
}
