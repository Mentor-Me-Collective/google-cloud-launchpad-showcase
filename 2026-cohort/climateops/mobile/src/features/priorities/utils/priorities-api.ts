import { API_URL, AUTH_TOKEN } from '@/features/facilities/utils/api';
import type { PrioritiesResponse, FacilityPriority, PriorityFactor, FactorKey } from '@/features/priorities/types/priority';

/** The heat-risk ranking, scored on the server against the sample or the live NWS heat alert. */
export async function fetchPriorities(useSample: boolean): Promise<PrioritiesResponse> {
  try {
    const response = await fetch(`${API_URL}/priorities${useSample ? '?sample=1' : ''}`, {
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    const data = await response.json();

    // If already in legacy PrioritiesResponse format
    if (data.priorities && Array.isArray(data.priorities)) {
      return data as PrioritiesResponse;
    }

    // Normalize from Google Cloud Run backend format
    const ranking = data.ranking || [];
    const hazard = data.hazard || {};
    const weather = data.weather || {};

    const priorities: FacilityPriority[] = ranking.map((r: any) => {
      const factorList: PriorityFactor[] = [];
      if (r.factors) {
        const factorMap: Record<string, { label: string; key: FactorKey }> = {
          heat: { label: 'Hazard Severity', key: 'heat' },
          vulnerable_users: { label: 'Vulnerable Population', key: 'vulnerable' },
          no_working_ac: { label: 'HVAC / Cooling Failure', key: 'no_ac' },
          people_on_site: { label: 'Occupancy Load', key: 'people' },
          low_staffing: { label: 'Staffing Shortage', key: 'staffing' },
        };

        for (const [k, v] of Object.entries<any>(r.factors)) {
          const meta = factorMap[k] || { label: k, key: 'heat' as FactorKey };
          factorList.push({
            key: meta.key,
            label: meta.label,
            weight: v.weight ? v.weight / 100 : 0.2,
            score: Math.min(5, Math.max(1, Math.round((v.value || 0) * 5))),
            detail: v.known ? `${((v.value || 0) * 100).toFixed(0)}% (${v.weight}w)` : 'Unknown / Renormalized',
          });
        }
      }

      return {
        rank: r.rank || 1,
        facility_id: r.facility_id,
        name: r.name || r.facility_id,
        record_type: 'PUBLIC_VERIFIED',
        facility_type: 'cooling_center',
        score: r.score ?? 50,
        reason: r.data_quality_flags?.length ? `Flags: ${r.data_quality_flags.join(', ')}` : 'Pure deterministic score (ADR-004)',
        no_one_on_site: false,
        unconfirmed: (r.data_quality_flags || []).includes('stale_status'),
        status_updated_at: new Date().toISOString(),
        people_per_staff: null,
        factors: factorList,
      };
    });

    return {
      active: hazard.status === 'ok' && (hazard.level || 0) > 0,
      event: hazard.event || 'Extreme Heat Warning',
      sample: weather.badge ? weather.badge.includes('SIMULATED') : false,
      computed_at: weather.fetched_at || new Date().toISOString(),
      priorities,
    };
  } catch (err) {
    console.warn('[ClimateOps Mobile] Cloud Run priorities fetch failed, using offline fallback:', err);
    return {
      active: true,
      event: 'Extreme Heat Warning [DEMO/SIMULATED]',
      sample: true,
      computed_at: new Date().toISOString(),
      priorities: [
        {
          rank: 1,
          facility_id: 'FAC-MOTT-LIB',
          name: 'Mott Haven Branch Library (NYPL)',
          record_type: 'PUBLIC_VERIFIED',
          facility_type: 'cooling_center',
          score: 88,
          reason: 'HVAC Failure + High Senior Vulnerability',
          no_one_on_site: false,
          unconfirmed: false,
          status_updated_at: new Date().toISOString(),
          people_per_staff: 22.5,
          factors: [
            { key: 'heat', label: 'Heat Index (104°F)', weight: 0.3, score: 5, detail: '100% (30w)' },
            { key: 'no_ac', label: 'AC Working Today', weight: 0.2, score: 5, detail: '100% (20w)' },
            { key: 'vulnerable', label: 'Vulnerable Population', weight: 0.25, score: 5, detail: '100% (25w)' },
            { key: 'people', label: 'People on Site (45)', weight: 0.15, score: 4, detail: '90% (15w)' },
            { key: 'staffing', label: 'Staffing Shortage', weight: 0.1, score: 3, detail: '50% (10w)' },
          ],
        },
        {
          rank: 2,
          facility_id: 'FAC-STMARYS-REC',
          name: "St. Mary's Recreation Center",
          record_type: 'PUBLIC_VERIFIED',
          facility_type: 'cooling_center',
          score: 64,
          reason: 'High youth occupancy, AC working at partial load',
          no_one_on_site: false,
          unconfirmed: false,
          status_updated_at: new Date().toISOString(),
          people_per_staff: 12.0,
          factors: [
            { key: 'heat', label: 'Heat Index (104°F)', weight: 0.3, score: 5, detail: '100% (30w)' },
            { key: 'no_ac', label: 'AC Working Today', weight: 0.2, score: 1, detail: '0% (20w)' },
            { key: 'vulnerable', label: 'Vulnerable Population', weight: 0.25, score: 3, detail: '50% (25w)' },
            { key: 'people', label: 'People on Site (60)', weight: 0.15, score: 5, detail: '100% (15w)' },
            { key: 'staffing', label: 'Staffing Coverage', weight: 0.1, score: 1, detail: '0% (10w)' },
          ],
        },
      ],
    };
  }
}
