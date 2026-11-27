import { useState } from 'react';

import { useFacilitiesStore } from '@/features/facilities/store/facilities-store';
import { acWorking, isDemo, sortFacilities } from '@/features/facilities/utils/facility-derive';
import { useHeatScores } from '@/features/priorities/hooks/use-heat-scores';

export type RecordScope = 'all' | 'real' | 'demo';
const SCOPE_LABEL: Record<RecordScope, string> = { all: 'All buildings', real: 'Real only', demo: 'Demo only' };
const NEXT_SCOPE: Record<RecordScope, RecordScope> = { all: 'real', real: 'demo', demo: 'all' };
const ZOOMS = [1, 1.6, 2.4];

export function useMapScreen() {
  const facilities = useFacilitiesStore((s) => s.facilities);
  const [heatLayer, setHeatLayer] = useState(true);
  const [acOnly, setAcOnly] = useState(false);
  const [scope, setScope] = useState<RecordScope>('all');
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(0);

  const { scoreFor } = useHeatScores();
  const visible = sortFacilities(
    facilities
      .filter((f) => (acOnly ? acWorking(f) : true))
      .filter((f) => (scope === 'all' ? true : scope === 'demo' ? isDemo(f) : !isDemo(f))),
    'risk',
    (id) => scoreFor(id)?.rank ?? null,
  );
  const selected = visible.find((f) => f.facility_id === selectedID) ?? null;

  return {
    visible,
    selected,
    select: (id: string | null) => setSelectedID((cur) => (cur === id ? null : id)),
    heatLayer,
    toggleHeatLayer: () => setHeatLayer((v) => !v),
    acOnly,
    toggleAcOnly: () => setAcOnly((v) => !v),
    scope,
    scopeLabel: SCOPE_LABEL[scope],
    cycleScope: () => setScope((s) => NEXT_SCOPE[s]),
    zoom: ZOOMS[zoomIndex],
    canZoomIn: zoomIndex < ZOOMS.length - 1,
    canZoomOut: zoomIndex > 0,
    zoomIn: () => setZoomIndex((i) => Math.min(ZOOMS.length - 1, i + 1)),
    zoomOut: () => setZoomIndex((i) => Math.max(0, i - 1)),
  };
}
