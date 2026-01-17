---
globs: ["src/renderer/stores/**/*.ts"]
description: "Zustand store patterns"
---

# Zustand Store Rules

## Store Structure Pattern
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface StoreState { /* state props */ }
interface StoreActions { /* action methods */ }
interface StoreComputed { /* derived getters as functions */ }

export type StoreName = StoreState & StoreActions & StoreComputed;

export const useStoreName = create<StoreName>()(
  persist(
    immer((set, get) => ({
      // state
      // actions using set() with immer draft
      // computed as functions: () => get().something
    })),
    {
      name: 'storage-key',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ /* only persist specific fields */ }),
    }
  )
);
```

## Conventions
- Use immer middleware for immutable updates
- Persist user preferences, NOT computed data
- Clear computed results on rehydration (recalculate fresh)
- Export selectors for optimized re-renders
- Maximum 10 indicators enforced in indicatorStore
