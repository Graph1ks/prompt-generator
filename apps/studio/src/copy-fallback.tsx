import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

import { Icon } from "./icons.js";
import { useI18n } from "./i18n.js";

export interface CopyFallbackProps {
  readonly text: string | null;
  readonly onClose: () => void;
}

export function CopyFallback({ text, onClose }: CopyFallbackProps) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (text === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, text]);

  if (text === null) return null;

  function selectAll() {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }

  function closeFromBackdrop(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return createPortal(
    <div
      className="copy-fallback-backdrop"
      role="presentation"
      onPointerDown={closeFromBackdrop}
    >
      <section
        className="copy-fallback"
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-fallback-title"
      >
        <header className="copy-fallback-head">
          <div>
            <span className="eyebrow">{t("copyFallback.eyebrow")}</span>
            <h2 id="copy-fallback-title">{t("copyFallback.title")}</h2>
            <p>{t("copyFallback.body")}</p>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label={t("copyFallback.close")}
            title={t("copyFallback.close")}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="copy-fallback-content">
          <textarea
            ref={textareaRef}
            readOnly
            spellCheck={false}
            value={text}
            aria-label={t("copyFallback.outputAria")}
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="copy-fallback-actions">
            <span>{t("copyFallback.hint")}</span>
            <div>
              <button type="button" className="btn" onClick={selectAll}>
                {t("copyFallback.selectAll")}
              </button>
              <button type="button" className="btn primary" onClick={onClose}>
                {t("copyFallback.done")}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
