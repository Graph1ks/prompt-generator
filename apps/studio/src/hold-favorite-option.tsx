import {
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Icon } from "./icons.js";
import { useI18n } from "./i18n.js";

const ADD_HOLD_MS = 800;
const REMOVE_HOLD_MS = 1000;

export interface HoldFavoriteOptionProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children"> {
  readonly favorite: boolean;
  readonly usageCount?: number;
  readonly onFavorite: () => void;
  readonly onUnfavorite: () => void;
  readonly onActivate: () => void;
  readonly children: ReactNode;
}

export function HoldFavoriteOption({
  favorite,
  usageCount = 0,
  onFavorite,
  onUnfavorite,
  onActivate,
  children,
  className = "",
  title,
  ...props
}: HoldFavoriteOptionProps) {
  const { t } = useI18n();
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHolding(false);
  }

  function startHold(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || props.disabled) return;
    suppressClickRef.current = false;
    setHolding(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const duration = favorite ? REMOVE_HOLD_MS : ADD_HOLD_MS;
    timerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true;
      setHolding(false);
      timerRef.current = null;
      if (favorite) onUnfavorite();
      else onFavorite();
      navigator.vibrate?.(favorite ? [30, 30, 30] : 35);
    }, duration);
  }

  function activate() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onActivate();
  }

  return (
    <button
      type="button"
      {...props}
      className={"hold-favorite-option " + className}
      data-favorite={favorite || undefined}
      data-holding={holding || undefined}
      data-hold-action={favorite ? "remove" : "add"}
      style={{
        ...props.style,
        "--favorite-hold-ms": (favorite ? REMOVE_HOLD_MS : ADD_HOLD_MS) + "ms",
        "--favorite-check-delay-ms": Math.round(ADD_HOLD_MS * 0.55) + "ms",
        "--favorite-check-ms": Math.round(ADD_HOLD_MS * 0.45) + "ms",
        "--favorite-remove-outline-ms": Math.round(REMOVE_HOLD_MS * 0.7) + "ms",
        "--favorite-remove-x-delay-ms": Math.round(REMOVE_HOLD_MS * 0.7) + "ms",
        "--favorite-remove-x-ms": Math.round(REMOVE_HOLD_MS * 0.3) + "ms",
      } as CSSProperties}
      title={title ?? (favorite ? t("favorite.removeTitle") : t("favorite.addTitle"))}
      onPointerDown={startHold}
      onPointerUp={stopTimer}
      onPointerCancel={stopTimer}
      onPointerLeave={stopTimer}
      onContextMenu={(event) => event.preventDefault()}
      onClick={activate}
    >
      {children}
      {favorite && (
        <span
          className="favorite-mark"
          aria-label={t("favorite.aria", { count: usageCount })}
        >
          <Icon name="star" />
          {usageCount > 0 && <small>{usageCount}</small>}
        </span>
      )}
      {holding && (
        <span className="favorite-hold-progress" aria-hidden="true">
          {favorite ? (
            <svg className="hold-remove" viewBox="0 0 48 48">
              <rect x="7" y="7" width="34" height="34" rx="7" pathLength="1" />
              <path d="M16 16 32 32M32 16 16 32" pathLength="1" />
            </svg>
          ) : (
            <svg className="hold-add" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="18" pathLength="1" />
              <path className="hold-add-check" d="m15 24 6 6 12-13" pathLength="1" />
            </svg>
          )}
        </span>
      )}
    </button>
  );
}
