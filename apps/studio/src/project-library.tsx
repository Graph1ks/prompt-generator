import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import type { ProjectSummary } from "@vgine/project-storage";

import { Icon } from "./icons.js";
import { useI18n } from "./i18n.js";

export interface ProjectLibraryProps {
  readonly open: boolean;
  readonly currentProjectId: string | null;
  readonly currentProjectTitle: string | null;
  readonly projects: readonly ProjectSummary[];
  readonly busy: boolean;
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onCreate: () => Promise<void>;
  readonly onOpen: (id: string) => Promise<void>;
  readonly onRename: (id: string, title: string | null) => Promise<void>;
  readonly onDuplicate: (id: string) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
  readonly onExport: (id: string) => Promise<void>;
  readonly onImport: (text: string) => Promise<void>;
}

function displayDate(value: string, locale: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function ProjectLibrary({
  open,
  currentProjectId,
  currentProjectTitle,
  projects,
  busy,
  error,
  onClose,
  onCreate,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onExport,
  onImport,
}: ProjectLibraryProps) {
  const { locale, t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingRenameRef = useRef(new Map<string, Promise<void>>());
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);

  const projectIds = useMemo(() => new Set(projects.map((project) => project.id)), [projects]);

  useEffect(() => {
    setTitleDrafts((current) => {
      const next: Record<string, string> = {};
      for (const project of projects) {
        next[project.id] =
          current[project.id] ??
          project.title ??
          (project.id === currentProjectId ? currentProjectTitle ?? "" : "");
      }
      return next;
    });
    if (armedDeleteId && !projectIds.has(armedDeleteId)) {
      setArmedDeleteId(null);
    }
  }, [armedDeleteId, currentProjectId, currentProjectTitle, projectIds, projects]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  async function commitTitle(project: ProjectSummary) {
    const pending = pendingRenameRef.current.get(project.id);
    if (pending) {
      await pending;
      return;
    }

    const draft = titleDrafts[project.id] ?? "";
    const normalized = draft.trim().replace(/\s+/gu, " ");
    const nextTitle = normalized.length > 0 ? normalized : null;
    if (nextTitle === project.title) return;

    const rename = onRename(project.id, nextTitle).finally(() => {
      pendingRenameRef.current.delete(project.id);
    });
    pendingRenameRef.current.set(project.id, rename);
    await rename;
  }

  async function afterTitleCommit(
    project: ProjectSummary,
    action: () => Promise<void>,
  ) {
    await commitTitle(project);
    await action();
  }

  function onTitleKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>,
    project: ProjectSummary,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setTitleDrafts((current) => ({
        ...current,
        [project.id]: project.title ?? "",
      }));
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    await onImport(await file.text());
  }

  return createPortal(
    <div
      className="project-library-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="project-library"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-library-title"
      >
        <header className="project-library-head">
          <div>
            <span className="eyebrow">{t("project.libraryEyebrow")}</span>
            <h2 id="project-library-title">{t("project.libraryTitle")}</h2>
            <p>{t("project.libraryBody")}</p>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label={t("project.closeLibrary")}
            title={t("project.closeLibrary")}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="project-library-toolbar">
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() => void onCreate()}
          >
            <Icon name="plus" />
            {t("project.new")}
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="upload" />
            {t("project.import")}
          </button>
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept=".json,.vgine.json,application/json"
            onChange={(event) => void importFile(event)}
          />
          <span className="project-library-count">
            {t("project.count", { count: projects.length })}
          </span>
        </div>

        {error && (
          <div className="project-library-error" role="alert">
            <Icon name="warning" />
            <span>{error}</span>
          </div>
        )}

        <div className="project-library-list">
          {projects.length === 0 ? (
            <div className="project-library-empty">
              <Icon name="folder" />
              <strong>{t("project.emptyTitle")}</strong>
              <span>{t("project.emptyBody")}</span>
            </div>
          ) : (
            projects.map((project) => {
              const active = project.id === currentProjectId;
              const armed = armedDeleteId === project.id;
              return (
                <article
                  key={project.id}
                  className={active ? "project-row active" : "project-row"}
                  data-active={active || undefined}
                >
                  <button
                    type="button"
                    className="project-row-open"
                    disabled={busy || active}
                    onClick={() =>
                      void afterTitleCommit(project, () => onOpen(project.id))
                    }
                    aria-label={t("project.openNamed", {
                      title: project.title ?? t("project.untitled"),
                    })}
                  >
                    <span className="project-row-icon" aria-hidden="true">
                      <Icon name="folder" />
                    </span>
                    <span className="project-row-meta">
                      <strong>
                        {active ? t("project.current") : t("project.open")}
                      </strong>
                      <small>
                        {t("project.updated", {
                          date: displayDate(project.updated_at, locale),
                        })}
                      </small>
                    </span>
                  </button>

                  <label className="project-title-field">
                    <span className="sr-only">{t("project.rename")}</span>
                    <input
                      value={titleDrafts[project.id] ?? project.title ?? ""}
                      placeholder={t("project.untitled")}
                      disabled={busy}
                      maxLength={96}
                      onChange={(event) =>
                        setTitleDrafts((current) => ({
                          ...current,
                          [project.id]: event.currentTarget.value,
                        }))
                      }
                      onBlur={() => void commitTitle(project)}
                      onKeyDown={(event) => onTitleKeyDown(event, project)}
                    />
                  </label>

                  <div className="project-row-actions">
                    <button
                      type="button"
                      className="project-action"
                      disabled={busy}
                      title={t("project.duplicate")}
                      aria-label={t("project.duplicate")}
                      onClick={() =>
                        void afterTitleCommit(project, () =>
                          onDuplicate(project.id),
                        )
                      }
                    >
                      <Icon name="duplicate" />
                    </button>
                    <button
                      type="button"
                      className="project-action"
                      disabled={busy}
                      title={t("project.export")}
                      aria-label={t("project.export")}
                      onClick={() =>
                        void afterTitleCommit(project, () => onExport(project.id))
                      }
                    >
                      <Icon name="download" />
                    </button>
                    <button
                      type="button"
                      className={armed ? "project-action danger armed" : "project-action danger"}
                      disabled={busy}
                      title={armed ? t("project.deleteConfirm") : t("project.delete")}
                      aria-label={armed ? t("project.deleteConfirm") : t("project.delete")}
                      onClick={() => {
                        void afterTitleCommit(project, async () => {
                          if (armed) {
                            setArmedDeleteId(null);
                            await onDelete(project.id);
                          } else {
                            setArmedDeleteId(project.id);
                          }
                        });
                      }}
                    >
                      <Icon name={armed ? "warning" : "trash"} />
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <footer className="project-library-foot">
          <span>{t("project.localOnly")}</span>
          <button type="button" className="text-btn" onClick={onClose}>
            {t("project.done")}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
