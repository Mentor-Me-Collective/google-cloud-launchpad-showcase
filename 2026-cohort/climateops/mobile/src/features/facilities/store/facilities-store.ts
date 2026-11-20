import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Facility, StatusUpdate } from '@/features/facilities/types/facility';
import { fetchFacilities, patchFacilityStatus } from '@/features/facilities/utils/api';
import { zustandStorage } from '@/lib/storage';

interface FacilitiesState {
  facilities: Facility[];
  loading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  load: () => Promise<void>;
  saveStatus: (id: string, update: StatusUpdate) => Promise<Facility>;
}

export const useFacilitiesStore = create<FacilitiesState>()(
  persist(
    (set, get) => ({
      facilities: [],
      loading: false,
      error: null,
      lastSyncedAt: null,
      load: async () => {
        if (get().loading) return;
        set({ loading: true, error: null });
        try {
          const facilities = await fetchFacilities();
          set({ facilities, loading: false, lastSyncedAt: new Date().toISOString() });
        } catch {
          set({ loading: false, error: "Couldn't reach the ClimateOps server. Showing the last saved copy." });
        }
      },
      saveStatus: async (id, update) => {
        const saved = await patchFacilityStatus(id, update);
        set({ facilities: get().facilities.map((f) => (f.facility_id === id ? saved : f)) });
        return saved;
      },
    }),
    {
      name: 'facilities-cache',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ facilities: s.facilities, lastSyncedAt: s.lastSyncedAt }),
    },
  ),
);
