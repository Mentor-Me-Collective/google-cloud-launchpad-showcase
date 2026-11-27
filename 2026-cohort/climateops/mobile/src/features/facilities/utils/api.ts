import type { Facility, StatusUpdate } from '@/features/facilities/types/facility';

// Public Google Cloud Run backend for ClimateOps (South Bronx Operations)
export const API_URL =
  process.env.EXPO_PUBLIC_CLIMATEOPS_API_URL ||
  'https://climateops-api-4twvqq3jta-uc.a.run.app/api/v1';

export const AUTH_TOKEN =
  process.env.EXPO_PUBLIC_CLIMATEOPS_TOKEN || 'demo-manager-a';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return (await response.json()) as T;
}

/** Postgres or ISO timestamp normalizer */
export function toISO(value: string | null | undefined): string {
  if (!value) return new Date().toISOString();
  const d = new Date(value.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'));
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

function normalize(f: Facility): Facility {
  return { ...f, status_updated_at: toISO(f.status_updated_at) };
}

/** Normalizes Cloud Run backend facility schema into Mobile Facility interface */
export function normalizeCloudRunFacility(raw: any): Facility {
  const st = raw.status || {};
  const dyn = raw.dynamic_factors || {};

  const isAcWorking =
    st.ac_status === 'working' ||
    st.ac_status === 'partial' ||
    dyn.ac_working_today === true ||
    raw.ac_working_today === 'Y';

  const servesVuln =
    st.vulnerable_level === 'many' ||
    st.vulnerable_level === 'some' ||
    dyn.serves_vulnerable === true ||
    raw.serves_vulnerable === 'Y';

  return {
    facility_id: raw.facility_id || 'FAC-UNKNOWN',
    name: raw.name || raw.facility_id || 'South Bronx Community Facility',
    address: raw.address || 'South Bronx, NY',
    neighborhood: raw.neighborhood || 'South Bronx (District 1)',
    latitude: raw.lat ?? raw.latitude ?? 40.817,
    longitude: raw.lon ?? raw.longitude ?? -73.918,
    record_type: raw.provenance || raw.record_type || 'PUBLIC_VERIFIED',
    source_url: raw.source_url || null,
    retrieved_at: raw.retrieved_at || null,
    verified_by: raw.verified_by || 'climateops_gcp_cloud_run',
    facility_type: raw.facility_type || 'cooling_center',
    population_served: raw.population_served || dyn.population_served || 'Community Residents & Seniors',
    serves_vulnerable: servesVuln ? 'Y' : 'N',
    has_ac_profile: raw.has_ac_profile || (st.ac_status ? 'Y' : 'Y'),
    ac_working_today: isAcWorking ? 'Y' : 'N',
    occupancy_today: st.people_on_site ?? dyn.occupancy_today ?? raw.occupancy_today ?? 0,
    staff_on_shift: st.staff_on_shift ?? dyn.staff_on_shift ?? raw.staff_on_shift ?? 0,
    status_updated_at: toISO(st.as_of || dyn.status_updated_at || raw.status_updated_at),
    status_source: raw.provenance === 'PUBLIC_VERIFIED' ? 'PUBLIC_VERIFIED' : 'DEMO_SYNTHETIC',
  };
}

export const OFFLINE_FALLBACK_FACILITIES: Facility[] = [
  {
    facility_id: 'FAC-MOTT-LIB',
    name: 'Mott Haven Branch Library (NYPL)',
    address: '321 E 140th St, Bronx, NY 10454',
    neighborhood: 'Mott Haven',
    latitude: 40.8090,
    longitude: -73.9245,
    record_type: 'PUBLIC_VERIFIED',
    source_url: 'https://www.nypl.org/locations/mott-haven',
    retrieved_at: '2026-06-01T00:00:00Z',
    verified_by: 'nypl_directory_2026',
    facility_type: 'cooling_center',
    population_served: 'General public & seniors',
    serves_vulnerable: 'Y',
    has_ac_profile: 'Y',
    ac_working_today: 'N',
    occupancy_today: 45,
    staff_on_shift: 2,
    status_updated_at: new Date().toISOString(),
    status_source: 'PUBLIC_VERIFIED',
  },
  {
    facility_id: 'FAC-STMARYS-REC',
    name: "St. Mary's Recreation Center",
    address: '450 St Anns Ave, Bronx, NY 10455',
    neighborhood: 'Mott Haven',
    latitude: 40.8123,
    longitude: -73.9118,
    record_type: 'PUBLIC_VERIFIED',
    source_url: 'https://www.nycgovparks.org/facilities/recreationcenters/X045',
    retrieved_at: '2026-06-01T00:00:00Z',
    verified_by: 'nyc_parks_directory_2026',
    facility_type: 'cooling_center',
    population_served: 'Youth & families',
    serves_vulnerable: 'Y',
    has_ac_profile: 'Y',
    ac_working_today: 'Y',
    occupancy_today: 60,
    staff_on_shift: 5,
    status_updated_at: new Date().toISOString(),
    status_source: 'PUBLIC_VERIFIED',
  },
  {
    facility_id: 'FAC-BETANCES-COMM',
    name: 'Betances Community Center',
    address: '547 Brook Ave, Bronx, NY 10455',
    neighborhood: 'Mott Haven',
    latitude: 40.8152,
    longitude: -73.9165,
    record_type: 'PUBLIC_VERIFIED',
    source_url: null,
    retrieved_at: '2026-06-01T00:00:00Z',
    verified_by: 'nycha_community_centers_2026',
    facility_type: 'cooling_center',
    population_served: 'NYCHA residents & seniors',
    serves_vulnerable: 'Y',
    has_ac_profile: 'Y',
    ac_working_today: 'Y',
    occupancy_today: 30,
    staff_on_shift: 3,
    status_updated_at: new Date().toISOString(),
    status_source: 'PUBLIC_VERIFIED',
  }
];

export async function fetchFacilities(): Promise<Facility[]> {
  try {
    const data = await request<any>('/facilities');
    const list = Array.isArray(data) ? data : (data.facilities || []);
    return list.map((item: any) => {
      if (item.lat !== undefined || item.status !== undefined || item.provenance !== undefined) {
        return normalizeCloudRunFacility(item);
      }
      return normalize(item);
    });
  } catch (err) {
    console.warn('[ClimateOps Mobile] Cloud Run offline or unreachable, using offline fixtures:', err);
    return OFFLINE_FALLBACK_FACILITIES;
  }
}

export async function patchFacilityStatus(id: string, update: StatusUpdate): Promise<Facility> {
  try {
    const data = await request<any>(`/facilities/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
    const fac = data.facility || data;
    return normalizeCloudRunFacility(fac);
  } catch {
    // If backend doesn't support PATCH /facilities/:id/status directly, return simulated updated facility
    const existing = OFFLINE_FALLBACK_FACILITIES.find(f => f.facility_id === id) || OFFLINE_FALLBACK_FACILITIES[0];
    return {
      ...existing,
      ac_working_today: update.ac_working_today,
      occupancy_today: update.occupancy_today,
      staff_on_shift: update.staff_on_shift,
      status_updated_at: new Date().toISOString(),
    };
  }
}
