import { createContext, useContext } from 'react';
import { create } from 'zustand';

/** False for a tab page that is mounted next to the visible one, so it can stay still. */
export const PageActiveContext = createContext(true);
export const usePageActive = () => useContext(PageActiveContext);

/** Lets any screen ask the tab pager to show a given tab, without pushing a new route. */
type TabStore = {
  requested: { name: string; n: number } | null;
  open: (name: string) => void;
  /** The tab on screen, so the pager comes back to it if it is ever built again. */
  current: string | null;
  setCurrent: (name: string) => void;
};

export const useTabStore = create<TabStore>((set, get) => ({
  requested: null,
  open: (name) => set({ requested: { name, n: (get().requested?.n ?? 0) + 1 } }),
  current: null,
  setCurrent: (name) => {
    if (get().current !== name) set({ current: name });
  },
}));
