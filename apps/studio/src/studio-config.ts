import type { FacetKey } from "@vgine/music-spec";

export interface StudioChapter {
  readonly id: "dna" | "pulse" | "palette" | "finish";
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly facets: readonly [FacetKey, ...FacetKey[]];
}

export const STUDIO_CHAPTERS: readonly [StudioChapter, ...StudioChapter[]] = [
  {
    id: "dna",
    label: "Sound DNA",
    shortLabel: "DNA",
    description: "Genre grammar, era and tonal center.",
    facets: ["genre", "era", "key_mode"],
  },
  {
    id: "pulse",
    label: "Pulse",
    shortLabel: "Pulse",
    description: "Tempo, pocket, rhythm section and dynamics.",
    facets: ["bpm", "groove", "drums", "bass", "dynamics"],
  },
  {
    id: "palette",
    label: "Palette",
    shortLabel: "Palette",
    description: "Melodic, harmonic, instrumental and vocal color.",
    facets: ["melody", "harmony", "instruments", "exciters", "texture", "vocal"],
  },
  {
    id: "finish",
    label: "Finish",
    shortLabel: "Finish",
    description: "Space, mix, production, structure and exclusion intent.",
    facets: ["space_mix", "production", "structure"],
  },
] as const;

export const FACET_LABELS: Readonly<Record<FacetKey, string>> = {
  genre: "Genre",
  era: "Era",
  bpm: "BPM",
  key_mode: "Key / Mode",
  groove: "Groove",
  melody: "Melody",
  harmony: "Harmony",
  drums: "Drums",
  bass: "Bass",
  instruments: "Instruments",
  exciters: "Exciters",
  texture: "Texture",
  vocal: "Vocal",
  dynamics: "Dynamics",
  space_mix: "Space / Mix",
  production: "Production",
  structure: "Structure",
};
