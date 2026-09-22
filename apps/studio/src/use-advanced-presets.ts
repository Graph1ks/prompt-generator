import { useCallback, useEffect, useMemo, useState } from "react";
import type { FacetKey } from "@vgine/music-spec";

import { userDataStorage } from "./user-data-storage.js";

export interface AdvancedPreset {
  readonly id: string;
  readonly facet: FacetKey;
  readonly text: string;
  readonly useCount: number;
  readonly createdAt: number;
  readonly lastUsedAt: number;
}

export interface AdvancedPresets {
  readonly presets: readonly AdvancedPreset[];
  readonly findByText: (text: string) => AdvancedPreset | null;
  readonly add: (text: string) => void;
  readonly remove: (id: string) => void;
  readonly clearAll: () => void;
  readonly recordUse: (id: string) => void;
}

function normalizePresetText(text: string): string {
  return text.trim().replace(/\s+/gu, " ").toLocaleLowerCase();
}

function createPresetId(facet: FacetKey): string {
  const suffix =
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36);
  return "advanced-preset:" + facet + ":" + suffix;
}

export function useAdvancedPresets(facet: FacetKey): AdvancedPresets {
  const storageKey = "advanced-presets:" + facet;
  const [presets, setPresets] = useState<readonly AdvancedPreset[]>([]);

  useEffect(() => {
    let live = true;
    void userDataStorage
      .get<readonly AdvancedPreset[]>(storageKey)
      .then((stored) => {
        if (!live || !stored) return;
        setPresets(
          stored
            .filter(
              (entry) =>
                entry &&
                entry.facet === facet &&
                typeof entry.id === "string" &&
                typeof entry.text === "string" &&
                entry.text.trim().length > 0,
            )
            .sort(
              (a, b) =>
                b.useCount - a.useCount ||
                b.lastUsedAt - a.lastUsedAt ||
                b.createdAt - a.createdAt,
            ),
        );
      })
      .catch(() => {
        // User presets remain session-usable even if persistence is unavailable.
      });

    return () => {
      live = false;
    };
  }, [facet, storageKey]);

  const persist = useCallback(
    (next: readonly AdvancedPreset[]) => {
      setPresets(next);
      void userDataStorage.set(storageKey, next).catch(() => {
        // Local persistence failure must not block the editor.
      });
    },
    [storageKey],
  );

  const findByText = useCallback(
    (text: string): AdvancedPreset | null => {
      const normalized = normalizePresetText(text);
      if (!normalized) return null;
      return (
        presets.find(
          (entry) => normalizePresetText(entry.text) === normalized,
        ) ?? null
      );
    },
    [presets],
  );

  const add = useCallback(
    (text: string) => {
      const clean = text.trim().replace(/\s+/gu, " ");
      if (!clean) return;
      const existing = findByText(clean);
      if (existing) return;
      const now = Date.now();
      persist([
        {
          id: createPresetId(facet),
          facet,
          text: clean,
          useCount: 0,
          createdAt: now,
          lastUsedAt: now,
        },
        ...presets,
      ]);
    },
    [facet, findByText, persist, presets],
  );

  const remove = useCallback(
    (id: string) => {
      persist(presets.filter((entry) => entry.id !== id));
    },
    [persist, presets],
  );

  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);

  const recordUse = useCallback(
    (id: string) => {
      const now = Date.now();
      persist(
        presets
          .map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  useCount: entry.useCount + 1,
                  lastUsedAt: now,
                }
              : entry,
          )
          .sort(
            (a, b) =>
              b.useCount - a.useCount ||
              b.lastUsedAt - a.lastUsedAt ||
              b.createdAt - a.createdAt,
          ),
      );
    },
    [persist, presets],
  );

  return useMemo(
    () => ({ presets, findByText, add, remove, clearAll, recordUse }),
    [add, clearAll, findByText, presets, recordUse, remove],
  );
}
