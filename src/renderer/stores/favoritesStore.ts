/**
 * Favorites Store
 * 
 * Manages favorite symbols and recently viewed symbols.
 * Persists to localStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// =============================================================================
// Types
// =============================================================================

interface FavoritesState {
  favorites: string[];
  recentSymbols: string[];
}

interface FavoritesActions {
  addFavorite: (symbol: string) => void;
  removeFavorite: (symbol: string) => void;
  toggleFavorite: (symbol: string) => void;
  isFavorite: (symbol: string) => boolean;
  addRecent: (symbol: string) => void;
  clearRecent: () => void;
}

export type FavoritesStore = FavoritesState & FavoritesActions;

// =============================================================================
// Constants
// =============================================================================

const MAX_RECENT_SYMBOLS = 10;

// =============================================================================
// Store Definition
// =============================================================================

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'],
      recentSymbols: [],

      addFavorite: (symbol: string) => {
        set((state) => {
          if (state.favorites.includes(symbol)) return state;
          return { favorites: [...state.favorites, symbol] };
        });
      },

      removeFavorite: (symbol: string) => {
        set((state) => ({
          favorites: state.favorites.filter((s) => s !== symbol),
        }));
      },

      toggleFavorite: (symbol: string) => {
        const { favorites } = get();
        if (favorites.includes(symbol)) {
          get().removeFavorite(symbol);
        } else {
          get().addFavorite(symbol);
        }
      },

      isFavorite: (symbol: string) => {
        return get().favorites.includes(symbol);
      },

      addRecent: (symbol: string) => {
        set((state) => {
          // Remove if exists to move to top
          const filtered = state.recentSymbols.filter((s) => s !== symbol);
          // Add to front, limit size
          return {
            recentSymbols: [symbol, ...filtered].slice(0, MAX_RECENT_SYMBOLS),
          };
        });
      },

      clearRecent: () => {
        set({ recentSymbols: [] });
      },
    }),
    {
      name: 'bitunix-favorites',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useFavoritesStore;
