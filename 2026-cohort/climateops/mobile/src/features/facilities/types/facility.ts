export type YesNo = 'Y' | 'N';

export interface Facility {
  facility_id: string;
  name: string;
  address: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  record_type: string;
  source_url: string | null;
  retrieved_at: string | null;
  verified_by: string;
  facility_type: string;
  population_served: string;
  serves_vulnerable: string;
  has_ac_profile: string;
  ac_working_today: string;
  occupancy_today: number;
  staff_on_shift: number;
  status_updated_at: string;
  status_source: string;
}

export interface StatusUpdate {
  ac_working_today: YesNo;
  occupancy_today: number;
  staff_on_shift: number;
}

export type FacilityFilter = 'all' | 'ac-on' | 'ac-down' | 'real' | 'demo';

export type FacilitySort = 'risk' | 'name' | 'occupancy';
