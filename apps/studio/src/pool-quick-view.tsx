import { useI18n } from "./i18n.js";

export type PoolQuickViewMode = "all" | "favorites" | "recent";

export interface PoolQuickViewProps {
  readonly value: PoolQuickViewMode;
  readonly favoriteCount: number;
  readonly recentCount: number;
  readonly onChange: (value: PoolQuickViewMode) => void;
}

export function PoolQuickView({
  value,
  favoriteCount,
  recentCount,
  onChange,
}: PoolQuickViewProps) {
  const { t } = useI18n();

  return (
    <div
      className="pool-quickviews"
      role="group"
      aria-label={t("poolView.aria")}
    >
      <button
        type="button"
        className={value === "all" ? "active" : ""}
        aria-pressed={value === "all"}
        onClick={() => onChange("all")}
      >
        <span>{t("poolView.all")}</span>
      </button>
      <button
        type="button"
        className={value === "favorites" ? "active" : ""}
        aria-pressed={value === "favorites"}
        disabled={favoriteCount === 0}
        onClick={() => onChange("favorites")}
      >
        <span>{t("poolView.favorites")}</span>
        <small>{favoriteCount}</small>
      </button>
      <button
        type="button"
        className={value === "recent" ? "active" : ""}
        aria-pressed={value === "recent"}
        disabled={recentCount === 0}
        onClick={() => onChange("recent")}
      >
        <span>{t("poolView.recent")}</span>
        <small>{recentCount}</small>
      </button>
    </div>
  );
}
