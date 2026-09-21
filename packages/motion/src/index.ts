export const MOTION_DURATIONS_MS = {
  instant: 0,
  fast: 120,
  normal: 220,
  slow: 360,
} as const;

export const MOTION_EASINGS = {
  standard: [0.2, 0, 0, 1],
  enter: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
  emphasized: [0.2, 0.8, 0.2, 1],
} as const;

export const MOTION_SPRINGS = {
  responsive: { stiffness: 460, damping: 34, mass: 0.72 },
  layout: { stiffness: 360, damping: 32, mass: 0.86 },
  sheet: { stiffness: 320, damping: 34, mass: 0.92 },
  reorder: { stiffness: 420, damping: 31, mass: 0.78 },
} as const;

export type MotionRecipeName =
  | "press"
  | "select"
  | "insert"
  | "remove"
  | "swap"
  | "expand"
  | "sheet"
  | "promptDiff"
  | "layoutMorph";

export type TweenRecipe = {
  readonly kind: "tween";
  readonly durationMs: number;
  readonly easing: readonly [number, number, number, number];
  readonly reducedDurationMs: number;
};

export type SpringRecipe = {
  readonly kind: "spring";
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
  readonly reducedDurationMs: number;
};

export type MotionRecipe = TweenRecipe | SpringRecipe;

const tween = (
  durationMs: number,
  easing: readonly [number, number, number, number],
  reducedDurationMs = 0,
): TweenRecipe => ({ kind: "tween", durationMs, easing, reducedDurationMs });

const spring = (
  recipe: { readonly stiffness: number; readonly damping: number; readonly mass: number },
  reducedDurationMs = 0,
): SpringRecipe => ({ kind: "spring", ...recipe, reducedDurationMs });

export const MOTION_RECIPES: Readonly<Record<MotionRecipeName, MotionRecipe>> = {
  press: tween(90, MOTION_EASINGS.standard),
  select: spring(MOTION_SPRINGS.responsive),
  insert: spring(MOTION_SPRINGS.responsive),
  remove: tween(160, MOTION_EASINGS.exit),
  swap: spring(MOTION_SPRINGS.reorder),
  expand: spring(MOTION_SPRINGS.layout),
  sheet: spring(MOTION_SPRINGS.sheet),
  promptDiff: tween(520, MOTION_EASINGS.emphasized, 80),
  layoutMorph: spring(MOTION_SPRINGS.layout),
};

export function motionRecipe(name: MotionRecipeName, reducedMotion = false): MotionRecipe {
  const recipe = MOTION_RECIPES[name];
  if (!reducedMotion) return recipe;
  return {
    kind: "tween",
    durationMs: recipe.reducedDurationMs,
    easing: MOTION_EASINGS.standard,
    reducedDurationMs: recipe.reducedDurationMs,
  };
}
