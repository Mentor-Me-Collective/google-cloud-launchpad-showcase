import { useEffect } from 'react';

import { useFacilitiesStore } from '@/features/facilities/store/facilities-store';

/** Fetch fresh rows from the server once per mount; the cached copy shows meanwhile. */
export function useFacilitiesSync() {
  const load = useFacilitiesStore((s) => s.load);
  useEffect(() => {
    load();
  }, [load]);
}
