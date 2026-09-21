export const VGINE_THEMES = ["paradise", "ash"] as const;
export type VgineTheme = (typeof VGINE_THEMES)[number];

export const SEMANTIC_COLOR_TOKENS = [
  "--vg-color-bg",
  "--vg-color-surface",
  "--vg-color-surface-raised",
  "--vg-color-surface-floating",
  "--vg-color-surface-inverse",
  "--vg-color-text",
  "--vg-color-text-muted",
  "--vg-color-text-inverse",
  "--vg-color-border",
  "--vg-color-border-strong",
  "--vg-color-accent",
  "--vg-color-accent-strong",
  "--vg-color-accent-contrast",
  "--vg-color-selection",
  "--vg-color-focus",
  "--vg-color-success",
  "--vg-color-warning",
  "--vg-color-danger",
] as const;

export const SEMANTIC_LAYOUT_TOKENS = [
  "--vg-space-1",
  "--vg-space-2",
  "--vg-space-3",
  "--vg-space-4",
  "--vg-space-5",
  "--vg-space-6",
  "--vg-space-8",
  "--vg-space-10",
  "--vg-space-12",
  "--vg-radius-sm",
  "--vg-radius-md",
  "--vg-radius-lg",
  "--vg-radius-xl",
  "--vg-radius-pill",
  "--vg-touch-target",
  "--vg-content-max",
] as const;

export function isVgineTheme(value: string): value is VgineTheme {
  return (VGINE_THEMES as readonly string[]).includes(value);
}
