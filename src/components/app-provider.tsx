"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createBrowserStore } from "@/lib/browser-store";
import type { Catalog } from "@/lib/types";

export interface WatchlistEntry {
  slug: string;
  addedAt: string;
  seenAt: string;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isWatchlist(value: unknown): value is WatchlistEntry[] {
  return Array.isArray(value) && value.every((item: unknown) => (
    typeof item === "object" && item !== null &&
    "slug" in item && typeof item.slug === "string" &&
    "addedAt" in item && typeof item.addedAt === "string" &&
    "seenAt" in item && typeof item.seenAt === "string"
  ));
}

const useWatchlist = createBrowserStore<WatchlistEntry[]>("ai-compare:watchlist:v1", [], isWatchlist);
const useRecent = createBrowserStore<string[]>("ai-compare:recent:v1", [], isStringList);
const useSelection = createBrowserStore<string[]>("ai-compare:selection:v1", [], (value): value is string[] => isStringList(value) && value.length <= 4 && new Set(value).size === value.length);

interface AppContextValue {
  catalog: Catalog;
  referenceDate: string;
  favorites: WatchlistEntry[];
  recent: string[];
  selected: string[];
  toggleFavorite: (slug: string) => void;
  markViewed: (slug: string) => void;
  toggleSelected: (slug: string) => void;
  clearSelected: () => void;
  setSelected: (slugs: string[]) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function AppState({ catalog, referenceDate, children }: { catalog: Catalog; referenceDate: string; children: React.ReactNode }) {
  const [favorites, setFavorites] = useWatchlist();
  const [recent, setRecent] = useRecent();
  const [savedSelection, setSavedSelection] = useSelection();
  const [searchOpen, setSearchOpen] = useState(false);
  const selected = savedSelection.filter((slug) => catalog.models.some((model) => model.slug === slug));

  const toggleFavorite = useCallback((slug: string) => {
    const isSaved = favorites.some((entry) => entry.slug === slug);
    try {
      const now = new Date().toISOString();
      setFavorites((previous) => isSaved
        ? previous.filter((entry) => entry.slug !== slug)
        : [...previous, { slug, addedAt: now, seenAt: now }]);
      toast.success(isSaved ? "Removed from your watchlist" : "Added to your watchlist", {
        description: isSaved ? undefined : "Saved on this browser. No account needed.",
      });
    } catch (error) {
      console.error("Watchlist storage failed:", error);
      toast.error("Could not save your watchlist. Please enable browser storage.");
    }
  }, [favorites, setFavorites]);

  const markViewed = useCallback((slug: string) => {
    try {
      setRecent((previous) => [slug, ...previous.filter((item) => item !== slug)].slice(0, 8));
      setFavorites((previous) => previous.map((entry) => entry.slug === slug
        ? { ...entry, seenAt: new Date().toISOString() } : entry));
    } catch (error) {
      console.error("Recently viewed storage failed:", error);
      toast.error("Recently viewed models could not be saved in this browser.");
    }
  }, [setFavorites, setRecent]);

  const setSelected = useCallback((slugs: string[]) => {
    if (slugs.length > 4 || new Set(slugs).size !== slugs.length) {
      toast.error("Choose up to four different models.");
      return;
    }
    try {
      setSavedSelection(slugs);
    } catch (error) {
      console.error("Comparison selection storage failed:", error);
      toast.error("Could not save your selection. Please enable browser storage.");
    }
  }, [setSavedSelection]);

  function toggleSelected(slug: string) {
    if (selected.includes(slug)) {
      setSelected(selected.filter((item) => item !== slug));
    } else if (selected.length === 4) {
      toast.error("Your comparison is full", { description: "Remove a model to add another. You can compare up to four." });
    } else {
      setSelected([...selected, slug]);
    }
  }

  return (
    <AppContext.Provider value={{
      catalog, referenceDate, favorites, recent, selected, toggleFavorite, markViewed, toggleSelected,
      clearSelected: () => setSelected([]), setSelected, searchOpen, setSearchOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function AppProvider({ catalog, referenceDate, children }: { catalog: Catalog; referenceDate: string; children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>
        <AppState catalog={catalog} referenceDate={referenceDate}>{children}</AppState>
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider.");
  return context;
}
