import { useEffect } from 'react';

import { useFacilitiesStore } from '@/features/facilities/store/facilities-store';
import { useHeatAlertStore } from '@/features/heat-alert/store/heat-alert-store';
import { usePrioritiesStore } from '@/features/priorities/store/priorities-store';

/** App-wide: re-asks the server for heat scores whenever the alert source or any building's status changes. */
export function usePrioritiesSync() {
  const useSample = useHeatAlertStore((s) => s.useSample);
  const statusKey = useFacilitiesStore((s) =>
    s.facilities.map((f) => `${f.facility_id}:${f.status_updated_at}:${f.ac_working_today}:${f.occupancy_today}:${f.staff_on_shift}`).join('|'),
  );
  const load = usePrioritiesStore((s) => s.load);

  useEffect(() => {
    load(useSample);
  }, [load, useSample, statusKey]);
}
