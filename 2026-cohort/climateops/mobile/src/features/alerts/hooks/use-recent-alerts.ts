import { useFacilitiesStore } from '@/features/facilities/store/facilities-store';
import { acWorking, formatUpdated, updatedToday } from '@/features/facilities/utils/facility-derive';
import { useCurrentHeatAlert } from '@/features/heat-alert/hooks/use-current-heat-alert';
import { formatAlertTime } from '@/features/heat-alert/utils/heat-alert-api';

export interface RecentAlert {
  key: string;
  kind: 'ac-down' | 'stale' | 'advisory' | 'all-clear';
  title: string;
  body: string;
  when: string;
  facilityID: string | null;
}

/** Alerts derived from the buildings' live status, plus the current heat alert. */
export function useRecentAlerts(): RecentAlert[] {
  const facilities = useFacilitiesStore((s) => s.facilities);
  const { alert: heat, isSample } = useCurrentHeatAlert();
  const down = facilities.filter((f) => !acWorking(f));
  const stale = facilities.filter((f) => acWorking(f) && !updatedToday(f));

  const alerts: RecentAlert[] = [
    ...down.map((f) => ({
      key: `down-${f.facility_id}`,
      kind: 'ac-down' as const,
      title: `AC down at ${f.name}`,
      body: `${f.occupancy_today} people inside · ${f.staff_on_shift} staff on shift`,
      when: formatUpdated(f.status_updated_at),
      facilityID: f.facility_id,
    })),
    ...stale.map((f) => ({
      key: `stale-${f.facility_id}`,
      kind: 'stale' as const,
      title: `No check-in today at ${f.name}`,
      body: 'Status is from an earlier day. Confirm the AC is still working.',
      when: `Last update ${formatUpdated(f.status_updated_at)}`,
      facilityID: f.facility_id,
    })),
  ];
  if (heat) {
    alerts.push({
      key: `heat-${heat.id}`,
      kind: 'advisory',
      title: isSample ? `${heat.event} (sample)` : heat.event,
      body: heat.headline,
      when: `Starts ${formatAlertTime(heat.onset)}`,
      facilityID: null,
    });
  }
  if (facilities.length > 0 && down.length === 0) {
    alerts.unshift({ key: 'clear', kind: 'all-clear', title: 'AC working everywhere', body: `All ${facilities.length} buildings report working AC.`, when: 'Now', facilityID: null });
  }
  return alerts;
}
