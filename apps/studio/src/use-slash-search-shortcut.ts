import { useEffect, useRef } from "react";

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]',
    ),
  );
}

export function useSlashSearchShortcut(enabled = true) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.key !== "/" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isTextEntryTarget(event.target)
      ) {
        return;
      }

      const input = inputRef.current;
      if (!input || input.disabled) return;
      event.preventDefault();
      input.focus();
      input.select();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);

  return inputRef;
}
