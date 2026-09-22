import { useCallback, useEffect, useMemo, useState } from "react";

import { userDataStorage } from "./user-data-storage.js";

const LEGACY_STORAGE_KEY = "vgine.pool-preferences.v1";
const USER_DATA_PREFIX = "pool-preferences:";

interface PoolItemPreference {
  readonly favorite: boolean;
  readonly useCount: number;
  readonly lastUsedAt: number;
}

interface StoredPoolPreferences {
  readonly version: 1;
  readonly pools: Readonly<Record<string, Readonly<Record<string, PoolItemPreference>>>>;
}

function legacyPool(poolId: string): Readonly<Record<string, PoolItemPreference>> {
  try {
    const raw = globalThis.localStorage?.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<StoredPoolPreferences>;
    if (parsed.version !== 1 || typeof parsed.pools !== "object" || !parsed.pools) {
      return {};
    }
    return parsed.pools[poolId] ?? {};
  } catch {
    return {};
  }
}

function removeLegacyPool(poolId: string): void {
  try {
    const raw = globalThis.localStorage?.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<StoredPoolPreferences>;
    if (parsed.version !== 1 || typeof parsed.pools !== "object" || !parsed.pools) {
      return;
    }
    const pools = { ...parsed.pools };
    delete pools[poolId];
    if (Object.keys(pools).length === 0) {
      globalThis.localStorage?.removeItem(LEGACY_STORAGE_KEY);
    } else {
      globalThis.localStorage?.setItem(
        LEGACY_STORAGE_KEY,
        JSON.stringify({ version: 1, pools }),
      );
    }
  } catch {
    // Migration cleanup must never block editing.
  }
}

export interface PoolPreferences {
  readonly isFavorite: (id: string) => boolean;
  readonly usageCount: (id: string) => number;
  readonly setFavorite: (id: string, favorite: boolean) => void;
  readonly recordUse: (id: string) => void;
  readonly sortFavoriteFirst: <T>(
    items: readonly T[],
    idOf: (item: T) => string,
  ) => T[];
}

export function usePoolPreferences(poolId: string): PoolPreferences {
  const storageKey = USER_DATA_PREFIX + poolId;
  const [items, setItems] = useState<Readonly<Record<string, PoolItemPreference>>>(
    {},
  );

  useEffect(() => {
    let live = true;
    void userDataStorage
      .get<Readonly<Record<string, PoolItemPreference>>>(storageKey)
      .then(async (stored) => {
        if (!live) return;
        if (stored) {
          setItems(stored);
          return;
        }

        const migrated = legacyPool(poolId);
        if (Object.keys(migrated).length > 0) {
          setItems(migrated);
          await userDataStorage.set(storageKey, migrated);
          removeLegacyPool(poolId);
        }
      })
      .catch(() => {
        // Favorites are an enhancement; storage failure must not block editing.
      });

    return () => {
      live = false;
    };
  }, [poolId, storageKey]);

  const mutate = useCallback(
    (id: string, update: (current: PoolItemPreference) => PoolItemPreference) => {
      setItems((currentItems) => {
        const current =
          currentItems[id] ?? { favorite: false, useCount: 0, lastUsedAt: 0 };
        const nextItems = { ...currentItems, [id]: update(current) };
        void userDataStorage.set(storageKey, nextItems).catch(() => {
          // Keep the current editing session functional even if persistence fails.
        });
        return nextItems;
      });
    },
    [storageKey],
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
            const recentDiff =
              (bPref?.lastUsedAt ?? 0) - (aPref?.lastUsedAt ?? 0);
            if (recentDiff !== 0) return recentDiff;
          }
          return a.sourceIndex - b.sourceIndex;
        })
        .map(({ item }) => item);
    },
    [items],
  );

  return useMemo(
    () => ({
      isFavorite,
      usageCount,
      setFavorite,
      recordUse,
      sortFavoriteFirst,
    }),
    [isFavorite, recordUse, setFavorite, sortFavoriteFirst, usageCount],
  );
}
