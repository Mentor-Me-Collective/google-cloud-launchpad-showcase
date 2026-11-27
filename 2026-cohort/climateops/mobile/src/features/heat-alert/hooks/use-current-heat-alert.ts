import { useHeatAlertStore } from '@/features/heat-alert/store/heat-alert-store';
import { sampleHeatAlert } from '@/features/heat-alert/utils/heat-alert-api';

/** The one heat alert every screen shows: the sample when the switch is on, else the latest live NWS heat alert. */
export function useCurrentHeatAlert() {
  const useSample = useHeatAlertStore((s) => s.useSample);
  const liveAlerts = useHeatAlertStore((s) => s.liveAlerts);
  const alert = useSample ? sampleHeatAlert() : (liveAlerts[0] ?? null);
  return { alert, isSample: useSample, liveCount: liveAlerts.length };
}
