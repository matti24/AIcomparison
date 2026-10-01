"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createBrowserStore } from "@/lib/browser-store";
import type { ModelSummary, ProviderSummary } from "@/lib/catalog";
import { track } from "@/lib/analytics";

export const MAX_COMPARE = 4;

export interface FavoriteEntry {
  slug: string;
  addedAt: string;
}

export type WatchAlert = "pricing" | "release" | "deprecation" | "update";

export interface WatchEntry {
  type: "model" | "provider";
  id: string;
  alerts: WatchAlert[];
  addedAt: string;
  seenAt: string;
}

const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const isFavorites = (value: unknown): value is FavoriteEntry[] =>
  Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.slug === "string" && typeof item.addedAt === "string");

const isWatchlist = (value: unknown): value is WatchEntry[] =>
  Array.isArray(value) && value.every((item) => isRecord(item) &&
    (item.type === "model" || item.type === "provider") && typeof item.id === "string" &&
    isStringList(item.alerts) && typeof item.addedAt === "string" && typeof item.seenAt === "string");

const useFavoritesStore = createBrowserStore<FavoriteEntry[]>("ai-compare:favorites:v1", [], isFavorites);
const useWatchStore = createBrowserStore<WatchEntry[]>("ai-compare:watchlist:v2", [], isWatchlist);
const useRecentModels = createBrowserStore<string[]>("ai-compare:recent:v1", [], isStringList);
const useRecentSearches = createBrowserStore<string[]>("ai-compare:recent-searches:v1", [], isStringList);
const useSelection = createBrowserStore<string[]>(
  "ai-compare:selection:v1",
  [],
  (value): value is string[] => isStringList(value) && value.length <= MAX_COMPARE && new Set(value).size === value.length,
);

interface AppContextValue {
  models: ModelSummary[];
  providers: ProviderSummary[];
  modelBySlug: Map<string, ModelSummary>;
  providerById: Map<string, ProviderSummary>;
  referenceDate: string;
  catalogUpdatedAt: string;
  favorites: FavoriteEntry[];
  isFavorite: (slug: string) => boolean;
  toggleFavorite: (slug: string) => void;
  watchlist: WatchEntry[];
  isWatching: (type: WatchEntry["type"], id: string) => boolean;
  toggleWatch: (type: WatchEntry["type"], id: string, alerts?: WatchAlert[]) => void;
  markWatchSeen: () => void;
  recent: string[];
  markViewed: (slug: string) => void;
  recentSearches: string[];
  rememberSearch: (query: string) => void;
  clearRecentSearches: () => void;
  selected: string[];
  toggleSelected: (slug: string) => void;
  setSelected: (slugs: string[]) => void;
  clearSelected: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  paletteMode: "search" | "add-to-compare";
  openPalette: (mode?: "search" | "add-to-compare") => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function storageError(error: unknown, message: string) {
  console.error(message, error);
  toast.error(message, { description: "Check that browser storage is enabled for this site." });
}

interface CatalogProps {
  models: ModelSummary[];
  providers: ProviderSummary[];
  referenceDate: string;
  catalogUpdatedAt: string;
}

function AppState({ models, providers, referenceDate, catalogUpdatedAt, children }: CatalogProps & { children: React.ReactNode }) {
  const [favorites, setFavorites] = useFavoritesStore();
  const [watchlist, setWatchlist] = useWatchStore();
  const [recent, setRecent] = useRecentModels();
  const [recentSearches, setRecentSearches] = useRecentSearches();
  const [savedSelection, setSavedSelection] = useSelection();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<"search" | "add-to-compare">("search");

  const modelBySlug = useMemo(() => new Map(models.map((model) => [model.slug, model])), [models]);
  const providerById = useMemo(() => new Map(providers.map((provider) => [provider.id, provider])), [providers]);
  const selected = useMemo(() => savedSelection.filter((slug) => modelBySlug.has(slug)), [savedSelection, modelBySlug]);

  const isFavorite = useCallback((slug: string) => favorites.some((entry) => entry.slug === slug), [favorites]);
  const toggleFavorite = useCallback((slug: string) => {
    const saved = favorites.some((entry) => entry.slug === slug);
    try {
      setFavorites((previous) => saved ? previous.filter((entry) => entry.slug !== slug) : [...previous, { slug, addedAt: new Date().toISOString() }]);
      const name = modelBySlug.get(slug)?.name ?? "Model";
      toast.success(saved ? `${name} removed from favorites` : `${name} added to favorites`, {
        description: saved ? undefined : "Saved in this browser. Accounts will sync favorites across devices.",
      });
    } catch (error) {
      storageError(error, "Could not update your favorites.");
    }
  }, [favorites, setFavorites, modelBySlug]);

  const isWatching = useCallback((type: WatchEntry["type"], id: string) => watchlist.some((entry) => entry.type === type && entry.id === id), [watchlist]);
  const toggleWatch = useCallback((type: WatchEntry["type"], id: string, alerts: WatchAlert[] = ["pricing", "release", "deprecation", "update"]) => {
    const watching = watchlist.some((entry) => entry.type === type && entry.id === id);
    try {
      const now = new Date().toISOString();
      setWatchlist((previous) => watching
        ? previous.filter((entry) => !(entry.type === type && entry.id === id))
        : [...previous, { type, id, alerts, addedAt: now, seenAt: now }]);
      toast.success(watching ? "Stopped following" : "Following", {
        description: watching ? undefined : "Changes appear in your watchlist. Email alerts arrive with accounts.",
      });
    } catch (error) {
      storageError(error, "Could not update your watchlist.");
    }
  }, [watchlist, setWatchlist]);

  const markWatchSeen = useCallback(() => {
    try {
      const now = new Date().toISOString();
      setWatchlist((previous) => previous.map((entry) => ({ ...entry, seenAt: now })));
    } catch (error) {
      storageError(error, "Could not update your watchlist.");
    }
  }, [setWatchlist]);

  const markViewed = useCallback((slug: string) => {
    try {
      setRecent((previous) => [slug, ...previous.filter((item) => item !== slug)].slice(0, 8));
    } catch {
      // Recently viewed is a convenience; failing silently is acceptable.
    }
  }, [setRecent]);

  const rememberSearch = useCallback((query: string) => {
    const value = query.trim().slice(0, 80);
    if (value.length < 2) return;
    try {
      setRecentSearches((previous) => [value, ...previous.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 6));
    } catch {
      // Ignore storage failures for search history.
    }
  }, [setRecentSearches]);

  const setSelected = useCallback((slugs: string[]) => {
    if (slugs.length > MAX_COMPARE || new Set(slugs).size !== slugs.length) {
      toast.error(`Choose up to ${MAX_COMPARE} different models.`);
      return;
    }
    try {
      setSavedSelection(slugs);
    } catch (error) {
      storageError(error, "Could not save your comparison selection.");
    }
  }, [setSavedSelection]);

  const toggleSelected = useCallback((slug: string) => {
    if (selected.includes(slug)) {
      setSelected(selected.filter((item) => item !== slug));
    } else if (selected.length >= MAX_COMPARE) {
      toast.error("Comparison is full", { description: `Remove a model to add another. You can compare up to ${MAX_COMPARE}.` });
    } else {
      setSelected([...selected, slug]);
      if (selected.length === 1) track("comparison_created", { models: [...selected, slug].join(",") });
    }
  }, [selected, setSelected]);

  const openPalette = useCallback((mode: "search" | "add-to-compare" = "search") => {
    setPaletteMode(mode);
    setPaletteOpen(true);
  }, []);

  const value: AppContextValue = {
    models, providers, modelBySlug, providerById, referenceDate, catalogUpdatedAt,
    favorites, isFavorite, toggleFavorite,
    watchlist, isWatching, toggleWatch, markWatchSeen,
    recent, markViewed, recentSearches, rememberSearch,
    clearRecentSearches: () => { try { setRecentSearches([]); } catch { /* ignore */ } },
    selected, toggleSelected, setSelected, clearSelected: () => setSelected([]),
    paletteOpen, setPaletteOpen, paletteMode, openPalette,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function AppProvider({ children, ...props }: CatalogProps & { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider delayDuration={200}>
        <AppState {...props}>{children}</AppState>
        <Toaster position="bottom-right" closeButton toastOptions={{ className: "!rounded-[10px] !text-[13.5px]" }} />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider.");
  return context;
}
