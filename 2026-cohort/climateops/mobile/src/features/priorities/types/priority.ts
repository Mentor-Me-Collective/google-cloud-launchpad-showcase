export type FactorKey = 'heat' | 'vulnerable' | 'no_ac' | 'people' | 'staffing';

export interface PriorityFactor {
  key: FactorKey;
  label: string;
  /** 0.3 = 30% */
  weight: number;
  /** 1–5 */
  score: number;
  detail: string;
}

export interface FacilityPriority {
  rank: number;
  facility_id: string;
  name: string;
  record_type: string;
  facility_type: string;
  /** Out of 100. */
  score: number;
  reason: string;
  no_one_on_site: boolean;
  unconfirmed: boolean;
  status_updated_at: string;
  people_per_staff: number | null;
  factors: PriorityFactor[];
}

export interface PrioritiesResponse {
  active: boolean;
  event: string | null;
  sample: boolean;
  computed_at: string;
  priorities: FacilityPriority[];
}
