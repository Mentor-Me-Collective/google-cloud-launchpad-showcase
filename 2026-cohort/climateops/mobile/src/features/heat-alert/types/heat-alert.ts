export interface HeatAlert {
  id: string;
  event: string;
  headline: string;
  area: string;
  onset: string | null;
  ends: string | null;
  source: string;
  /** Short line for the header badge; only set when the alert itself states it. */
  summary?: string;
}

export interface HeatAlertResponse {
  alerts: HeatAlert[];
  checked_at: string;
}
