"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { HttpError } from "@/lib/queries/fetcher";
import {
  useClearFavorites,
  useMergeLocalFavorites,
  useToggleFavorite,
  useWatchedOverview,
} from "@/lib/queries/watched";

import { MAX_COMPARE } from "@/lib/constants/compare";

const STORAGE_KEY = "homeatlas.favorites";
const COMPARE_KEY = "homeatlas.compare";
const COMPARE_LABELS_KEY = "homeatlas.compare.labels";

// Re-exported for existing client-side importers. Server Components must import
// from "@/lib/constants/compare" directly — see the note there.
export { MAX_COMPARE };

interface WatchedContextValue {
  favorites: string[];
  isFavorite: (listingKey: string) => boolean;
  /** Resolves to null on success, or a message explaining why it failed. */
  toggleFavorite: (listingKey: string) => Promise<string | null>;
  /** Empties saved homes (account + this device). Null on success, else a message. */
  clearFavorites: () => Promise<string | null>;

  compare: string[];
  isComparing: (listingKey: string) => boolean;
  toggleCompare: (listingKey: string, address?: string) => void;
  /** Addresses captured at selection time, for instant pill labels. */
  compareLabels: Record<string, string>;
  addManyToCompare: (listingKeys: string[]) => void;
  clearCompare: () => void;
  compareFull: boolean;
}

const WatchedContext = createContext<WatchedContextValue | null>(null);

function readStorage(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    // Private mode or blocked storage — degrade to in-memory only.
    return [];
  }
}

function readLabels(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(COMPARE_LABELS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => typeof v === "string"),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeLabels(value: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMPARE_LABELS_KEY, JSON.stringify(value));
  } catch {
    // Ignore quota / privacy errors.
  }
}

function writeStorage(key: string, value: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / privacy errors; state still works for this session.
  }
}

/**
 * Favourites and compare state.
 *
 * Signed in  → persisted through /api/watched to mls-v2's `watched/*` routes.
 * Signed out → kept in localStorage so the UI still works, and merged on sign-in.
 * Compare is always local; it is ephemeral selection state, not saved data.
 */
export function WatchedProvider({
  initialFavorites = [],
  children,
}: {
  initialFavorites?: string[];
  children: ReactNode;
}) {
  const { user } = useAuth();
  // Stable across renders, so they can sit in callback / effect deps.
  const { mutateAsync: toggleFavoriteRequest } = useToggleFavorite();
  const { mutateAsync: clearFavoritesRequest } = useClearFavorites();
  const { mutateAsync: mergeLocalFavorites } = useMergeLocalFavorites();
  const [favorites, setFavorites] = useState<string[]>(initialFavorites);
  const [compare, setCompare] = useState<string[]>([]);
  /*
   * Addresses remembered when a home is ticked. The card already knows its
   * address, so carrying it here lets the compare strip label a new pill
   * instantly instead of showing a placeholder while a lookup resolves.
   */
  const [compareLabels, setCompareLabels] = useState<Record<string, string>>({});

  /*
   * Hydrate from localStorage after mount. Storage is unavailable during SSR, so
   * reading it in an effect (rather than in the initial useState) is what keeps
   * the server and client markup identical on first paint.
   *
   * Both setState calls are wrapped in a transition so React treats the
   * hydration update as non-urgent instead of a cascading synchronous render.
   */
  const [, startHydration] = useTransition();
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    // Slice on read: lists saved when the limit was higher (4) would otherwise
    // hydrate over the cap. Write the trimmed list back so the overflow doesn't
    // resurface on the next visit.
    const persistedCompare = readStorage(COMPARE_KEY);
    const storedCompare = persistedCompare.slice(0, MAX_COMPARE);
    if (persistedCompare.length > storedCompare.length) {
      writeStorage(COMPARE_KEY, storedCompare);
    }
    const storedLabels = readLabels();
    const storedFavorites = user ? null : readStorage(STORAGE_KEY);

    startHydration(() => {
      if (storedCompare.length > 0) setCompare(storedCompare);
      if (Object.keys(storedLabels).length > 0) setCompareLabels(storedLabels);
      if (storedFavorites && storedFavorites.length > 0) setFavorites(storedFavorites);
    });
  }, [user]);

  /*
   * Account favourites.
   *
   * useQuery owns the request: it dedupes with the watched page (same key),
   * caches across navigations, and has a real pending state from the first
   * render. The previous hand-rolled effect needed a guard ref to avoid
   * duplicate fetches, and that ref broke under Strict Mode's double mount —
   * the remount skipped the fetch while the first response was discarded as
   * cancelled, so favourites loaded and were then dropped.
   */
  const overview = useWatchedOverview(Boolean(user));
  const remoteFavorites = useMemo(
    () =>
      (overview.data?.favorites ?? [])
        .map((entry) => entry.propertyKey)
        .filter(Boolean),
    [overview.data],
  );

  // Adopt the account list once it arrives. Local-only saves made before
  // sign-in are preserved by the union until the merge below clears them.
  const adopted = useRef<string | null>(null);

  useEffect(() => {
    if (!user || remoteFavorites.length === 0) return;
    const signature = `${user.id}:${remoteFavorites.join(",")}`;
    if (adopted.current === signature) return;
    adopted.current = signature;
    setFavorites((current) => Array.from(new Set([...remoteFavorites, ...current])));
  }, [user, remoteFavorites]);

  // On sign-in, push anything saved on this device up to the account.
  const mergedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!user) {
      mergedFor.current = null;
      adopted.current = null;
      return;
    }
    // Wait for the account list so we do not re-upload what it already has.
    if (!overview.isSuccess || mergedFor.current === user.id) return;
    mergedFor.current = user.id;

    const local = readStorage(STORAGE_KEY).filter((key) => !remoteFavorites.includes(key));
    if (local.length === 0) {
      writeStorage(STORAGE_KEY, []);
      return;
    }

    let cancelled = false;

    // The mutation invalidates the overview once it finishes (the account
    // list changed). Keys that failed stay in local storage for next sign-in.
    void mergeLocalFavorites(local).then((uploadedKeys) => {
      if (cancelled) return;
      const uploaded = new Set(uploadedKeys);
      setFavorites((current) => Array.from(new Set([...current, ...uploaded])));
      writeStorage(
        STORAGE_KEY,
        local.filter((key) => !uploaded.has(key)),
      );
    });

    return () => {
      cancelled = true;
      // Allow a retry if this run never finished (e.g. Strict Mode remount).
      if (mergedFor.current === user.id) mergedFor.current = null;
    };
  }, [user, overview.isSuccess, remoteFavorites, mergeLocalFavorites]);

  const isFavorite = useCallback(
    (listingKey: string) => favorites.includes(listingKey),
    [favorites],
  );

  const toggleFavorite = useCallback(
    async (listingKey: string): Promise<string | null> => {
      const next = favorites.includes(listingKey)
        ? favorites.filter((key) => key !== listingKey)
        : [...favorites, listingKey];

      setFavorites(next); // optimistic

      if (!user) {
        writeStorage(STORAGE_KEY, next);
        return null;
      }

      try {
        // On success the hook reconciles the shared overview cache in place
        // (no refetch — see useToggleFavorite for why).
        await toggleFavoriteRequest({
          listingKey,
          removing: !next.includes(listingKey),
        });
        return null;
      } catch (error) {
        setFavorites(favorites); // roll back
        // A 401 here means the session expired mid-visit. Previously this
        // rolled back in silence, so the heart filled and then quietly
        // emptied with no explanation — the "saves don't save" symptom.
        return error instanceof HttpError && error.isAuth
          ? "Your session expired. Sign in again to save homes."
          : "Could not save that home. Please try again.";
      }
    },
    [favorites, user, toggleFavoriteRequest],
  );

  /*
   * One request instead of a toggle per home. Local state and the shared
   * overview cache are emptied together — this provider only ever unions the
   * server list in, so clearing just the server would leave hearts filled.
   */
  const clearFavorites = useCallback(async (): Promise<string | null> => {
    const previous = favorites;
    setFavorites([]);
    writeStorage(STORAGE_KEY, []);
    if (!user) return null;

    try {
      // Empties the overview cache's favourites on success.
      await clearFavoritesRequest();
      return null;
    } catch {
      setFavorites(previous);
      return "Could not clear your saved homes. Please try again.";
    }
  }, [favorites, user, clearFavoritesRequest]);

  const isComparing = useCallback(
    (listingKey: string) => compare.includes(listingKey),
    [compare],
  );

  const toggleCompare = useCallback((listingKey: string, address?: string) => {
    if (address) {
      setCompareLabels((prev) => {
        if (prev[listingKey] === address) return prev;
        const next = { ...prev, [listingKey]: address };
        writeLabels(next);
        return next;
      });
    }
    setCompare((prev) => {
      const next = prev.includes(listingKey)
        ? prev.filter((key) => key !== listingKey)
        : prev.length >= MAX_COMPARE
          ? prev
          : [...prev, listingKey];
      writeStorage(COMPARE_KEY, next);
      return next;
    });
  }, []);

  /** Bulk add, used by the "Add from saved homes" picker. Respects the cap. */
  const addManyToCompare = useCallback((listingKeys: string[]) => {
    setCompare((prev) => {
      const next = [...prev];
      for (const key of listingKeys) {
        if (next.length >= MAX_COMPARE) break;
        if (!next.includes(key)) next.push(key);
      }
      writeStorage(COMPARE_KEY, next);
      return next;
    });
  }, []);

  const clearCompare = useCallback(() => {
    setCompare([]);
    setCompareLabels({});
    writeStorage(COMPARE_KEY, []);
    writeLabels({});
  }, []);

  const value = useMemo<WatchedContextValue>(
    () => ({
      favorites,
      isFavorite,
      toggleFavorite,
      clearFavorites,
      compare,
      compareLabels,
      isComparing,
      toggleCompare,
      addManyToCompare,
      clearCompare,
      compareFull: compare.length >= MAX_COMPARE,
    }),
    [
      favorites,
      isFavorite,
      toggleFavorite,
      clearFavorites,
      compare,
      compareLabels,
      isComparing,
      toggleCompare,
      addManyToCompare,
      clearCompare,
    ],
  );

  return <WatchedContext.Provider value={value}>{children}</WatchedContext.Provider>;
}

export function useWatched(): WatchedContextValue {
  const context = useContext(WatchedContext);
  if (!context) throw new Error("useWatched must be used within <WatchedProvider>");
  return context;
}
