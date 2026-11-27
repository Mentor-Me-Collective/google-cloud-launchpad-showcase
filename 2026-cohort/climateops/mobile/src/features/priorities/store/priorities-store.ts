import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { PrioritiesResponse } from '@/features/priorities/types/priority';
import { fetchPriorities } from '@/features/priorities/utils/priorities-api';
import { zustandStorage } from '@/lib/storage';

interface PrioritiesState {
  result: PrioritiesResponse | null;
  loading: boolean;
  error: string | null;
  load: (useSample: boolean) => Promise<void>;
}

export const usePrioritiesStore = create<PrioritiesState>()(
  persist(
    (set) => ({
      result: null,
      loading: false,
      error: null,
      load: async (useSample) => {
        set({ loading: true, error: null });
        try {
          const result = await fetchPriorities(useSample);
          set({ result, loading: false });
        } catch {
          set({ loading: false, error: "Couldn't reach the ClimateOps server. Showing the last ranking." });
        }
      },
    }),
    {
      name: 'climateops-priorities',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ result: s.result }),
    },
  ),
);
