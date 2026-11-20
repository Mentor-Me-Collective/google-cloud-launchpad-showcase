import { useState } from 'react';

import { useFacilitiesStore } from '@/features/facilities/store/facilities-store';
import type { FacilityFilter, FacilitySort } from '@/features/facilities/types/facility';
import { acWorking, isDemo, matchesFilter, sortFacilities } from '@/features/facilities/utils/facility-derive';
import { useHeatScores } from '@/features/priorities/hooks/use-heat-scores';

const SORTS: FacilitySort[] = ['risk', 'name', 'occupancy'];
export const SORT_LABELS: Record<FacilitySort, string> = { risk: 'Heat risk', name: 'Name', occupancy: 'Occupancy' };

export function useFacilitiesScreen() {
  const facilities = useFacilitiesStore((s) => s.facilities);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FacilityFilter>('all');
  const [sort, setSort] = useState<FacilitySort>('risk');
  const { scoreFor } = useHeatScores();

  const q = query.trim().toLowerCase();
  const visible = sortFacilities(
    facilities.filter(
      (f) =>
        matchesFilter(f, filter) &&
        (q === '' ||
          [f.name, f.address, f.neighborhood, f.facility_type, f.population_served].some((v) => v.toLowerCase().includes(q))),
    ),
    sort,
    (id) => scoreFor(id)?.rank ?? null,
  );

  const counts = {
    all: facilities.length,
    acOn: facilities.filter(acWorking).length,
    acDown: facilities.filter((f) => !acWorking(f)).length,
    real: facilities.filter((f) => !isDemo(f)).length,
    demo: facilities.filter(isDemo).length,
    people: facilities.reduce((sum, f) => sum + f.occupancy_today, 0),
    vulnerable: facilities.filter((f) => f.serves_vulnerable === 'Y').length,
  };

  const cycleSort = () => setSort(SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length]);

  return { visible, counts, query, setQuery, filter, setFilter, sort, cycleSort };
}
