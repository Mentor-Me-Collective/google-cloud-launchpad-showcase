import { useHeatAlertStore } from '@/features/heat-alert/store/heat-alert-store';
import { usePrioritiesStore } from '@/features/priorities/store/priorities-store';
import type { FacilityPriority } from '@/features/priorities/types/priority';

/** The server's heat-risk scores for the current alert. Empty when no heat alert is active. */
export function useHeatScores() {
  const useSample = useHeatAlertStore((s) => s.useSample);
  const result = usePrioritiesStore((s) => s.result);
  const current = result && result.sample === useSample && result.active ? result : null;
  const byID: Record<string, FacilityPriority> = {};
  for (const p of current?.priorities ?? []) byID[p.facility_id] = p;
  return {
    active: current !== null,
    total: current?.priorities.length ?? 0,
    scoreFor: (id: string): FacilityPriority | null => byID[id] ?? null,
  };
}
