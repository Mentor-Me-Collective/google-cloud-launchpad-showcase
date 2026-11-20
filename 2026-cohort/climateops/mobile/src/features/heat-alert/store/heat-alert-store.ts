import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { HeatAlert } from '@/features/heat-alert/types/heat-alert';
import { zustandStorage } from '@/lib/storage';

interface HeatAlertState {
  useSample: boolean;
  liveAlerts: HeatAlert[];
  checkedAt: string | null;
  setUseSample: (on: boolean) => void;
  setLive: (alerts: HeatAlert[], checkedAt: string) => void;
}

export const useHeatAlertStore = create<HeatAlertState>()(
  persist(
    (set) => ({
      useSample: true,
      liveAlerts: [],
      checkedAt: null,
      setUseSample: (on) => set({ useSample: on }),
      setLive: (alerts, checkedAt) => set({ liveAlerts: alerts, checkedAt }),
    }),
    { name: 'climateops-heat-alert', storage: createJSONStorage(() => zustandStorage) },
  ),
);
