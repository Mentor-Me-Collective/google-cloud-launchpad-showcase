import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Presets } from 'react-native-pulsar';

import type { HeatAlert } from '@/features/heat-alert/types/heat-alert';
import type { ReadinessBrief } from '@/features/readiness/types/brief';
import { requestBrief } from '@/features/readiness/utils/brief-api';
import { zustandStorage } from '@/lib/storage';

interface BriefState {
  brief: ReadinessBrief | null;
  loading: boolean;
  error: string | null;
  generate: (sample: HeatAlert | null) => Promise<void>;
}

export const useBriefStore = create<BriefState>()(
  persist(
    (set) => ({
      brief: null,
      loading: false,
      error: null,
      generate: async (sample) => {
        set({ loading: true, error: null });
        try {
          const brief = await requestBrief(sample);
          set({ brief, loading: false });
          Presets.System.notificationSuccess();
        } catch (err) {
          Presets.System.notificationError();
          set({ loading: false, error: err instanceof Error ? err.message : 'The brief couldn’t be generated.' });
        }
      },
    }),
    {
      name: 'climateops-readiness-brief',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ brief: s.brief }),
    },
  ),
);
