import {
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";

type Direction = "up" | "down" | "left" | "right";

function resultButtons(container: HTMLElement | null): HTMLButtonElement[] {
  if (!container) return [];
  return [
    ...container.querySelectorAll<HTMLButtonElement>(
      'button[data-pool-result]:not(:disabled)',
    ),
  ];
}

function center(button: HTMLButtonElement) {
  const rect = button.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function directionalTarget(
  buttons: readonly HTMLButtonElement[],
  current: HTMLButtonElement,
  direction: Direction,
): HTMLButtonElement | null {
  const origin = center(current);
  let best: { button: HTMLButtonElement; score: number } | null = null;

  for (const button of buttons) {
    if (button === current) continue;
    const point = center(button);
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;

    const valid =
      direction === "up"
        ? dy < -2
        : direction === "down"
          ? dy > 2
          : direction === "left"
            ? dx < -2
            : dx > 2;
    if (!valid) continue;

    const primary =
      direction === "up" || direction === "down" ? Math.abs(dy) : Math.abs(dx);
    const secondary =
      direction === "up" || direction === "down" ? Math.abs(dx) : Math.abs(dy);
    const score = primary * 4 + secondary;

    if (!best || score < best.score) {
      best = { button, score };
    }
  }

  return best?.button ?? null;
}

export interface PoolKeyboardNavigation {
  readonly resultsRef: RefObject<HTMLDivElement | null>;
  readonly onSearchKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  readonly onResultsKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
}

export function usePoolKeyboardNavigation(
  searchInputRef: RefObject<HTMLInputElement | null>,
): PoolKeyboardNavigation {
  const resultsRef = useRef<HTMLDivElement | null>(null);

  function onSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowDown") return;
    const first = resultButtons(resultsRef.current)[0];
    if (!first) return;
    event.preventDefault();
    first.focus();
  }

  function onResultsKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const target =
      event.target instanceof HTMLElement
        ? event.target.closest<HTMLButtonElement>("button[data-pool-result]")
        : null;
    if (!target) return;

    const buttons = resultButtons(resultsRef.current);
    if (buttons.length === 0) return;

    let next: HTMLButtonElement | null = null;
    if (event.key === "ArrowUp") {
      next = directionalTarget(buttons, target, "up");
      if (!next) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
    } else if (event.key === "ArrowDown") {
      next = directionalTarget(buttons, target, "down");
    } else if (event.key === "ArrowLeft") {
      next = directionalTarget(buttons, target, "left");
    } else if (event.key === "ArrowRight") {
      next = directionalTarget(buttons, target, "right");
    } else if (event.key === "Home") {
      next = buttons[0] ?? null;
    } else if (event.key === "End") {
      next = buttons[buttons.length - 1] ?? null;
    } else if (event.key === "Escape") {
      event.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
      return;
    } else {
      return;
    }

    if (!next) return;
    event.preventDefault();
    next.focus();
  }

  return {
    resultsRef,
    onSearchKeyDown,
    onResultsKeyDown,
  };
}
