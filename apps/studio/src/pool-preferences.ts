import { useCallback, useMemo, useState } from "react";

const STORAGE_KEY = "vgine.pool-preferences.v1";

interface PoolItemPreference {
  readonly favorite: boolean;
  readonly useCount: number;
  readonly lastUsedAt: number;
}

interface StoredPoolPreferences {
  readonly version: 1;
  readonly pools: Readonly<Record<string, Readonly<Record<string, PoolItemPreference>>>>;
}

const EMPTY_STORE: StoredPoolPreferences = { version: 1, pools: {} };

function readStore(): StoredPoolPreferences {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as Partial<StoredPoolPreferences>;
    if (parsed.version !== 1 || typeof parsed.pools !== "object" || parsed.pools === null) {
      return EMPTY_STORE;
    }
    return parsed as StoredPoolPreferences;
  } catch {
    return EMPTY_STORE;
  }
}

function writeStore(store: StoredPoolPreferences): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Preferences are an enhancement. Storage failure must never block editing.
  }
}

export interface PoolPreferences {
  readonly isFavorite: (id: string) => boolean;
  readonly usageCount: (id: string) => number;
  readonly setFavorite: (id: string, favorite: boolean) => void;
  readonly recordUse: (id: string) => void;
  readonly sortFavoriteFirst: <T>(items: readonly T[], idOf: (item: T) => string) => T[];
}

export function usePoolPreferences(poolId: string): PoolPreferences {
  const [items, setItems] = useState<Readonly<Record<string, PoolItemPreference>>>(
    () => readStore().pools[poolId] ?? {},
  );

  const mutate = useCallback(
    (id: string, update: (current: PoolItemPreference) => PoolItemPreference) => {
      setItems((currentItems) => {
        const current =
          currentItems[id] ?? { favorite: false, useCount: 0, lastUsedAt: 0 };
        const nextItems = { ...currentItems, [id]: update(current) };
        const store = readStore();
        writeStore({
          version: 1,
          pools: {
            ...store.pools,
            [poolId]: nextItems,
          },
        });
        return nextItems;
      });
    },
    [poolId],
  );

  const isFavorite = useCallback(
    (id: string) => items[id]?.favorite === true,
    [items],
  );

  const usageCount = useCallback(
    (id: string) => items[id]?.useCount ?? 0,
    [items],
  );

  const setFavorite = useCallback(
    (id: string, favorite: boolean) => {
      mutate(id, (current) => ({ ...current, favorite }));
    },
    [mutate],
  );

  const recordUse = useCallback(
    (id: string) => {
      mutate(id, (current) => ({
        ...current,
        useCount: current.useCount + 1,
        lastUsedAt: Date.now(),
      }));
    },
    [mutate],
  );

  const sortFavoriteFirst = useCallback(
    <T,>(source: readonly T[], idOf: (item: T) => string): T[] => {
      return source
        .map((item, sourceIndex) => ({ item, sourceIndex, id: idOf(item) }))
        .sort((a, b) => {
          const aPref = items[a.id];
          const bPref = items[b.id];
          const aFavorite = aPref?.favorite === true;
          const bFavorite = bPref?.favorite === true;
          if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;
          if (aFavorite && bFavorite) {
            const useDiff = (bPref?.useCount ?? 0) - (aPref?.useCount ?? 0);
            if (useDiff !== 0) return useDiff;
            const recentDiff = (bPref?.lastUsedAt ?? 0) - (aPref?.lastUsedAt ?? 0);
            if (recentDiff !== 0) return recentDiff;
          }
          return a.sourceIndex - b.sourceIndex;
        })
        .map(({ item }) => item);
    },
    [items],
  );

  return useMemo(
    () => ({ isFavorite, usageCount, setFavorite, recordUse, sortFavoriteFirst }),
    [isFavorite, recordUse, setFavorite, sortFavoriteFirst, usageCount],
  );
}
