import type { HeatAlert, HeatAlertResponse } from '@/features/heat-alert/types/heat-alert';
import { API_URL, AUTH_TOKEN } from '@/features/facilities/utils/api';

export async function fetchHeatAlerts(): Promise<HeatAlertResponse> {
  try {
    const response = await fetch(`${API_URL}/weather/status`, {
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const records = data.records || [];
      const alerts: HeatAlert[] = records.map((r: any) => ({
        id: r.id || 'nws-alert-replay',
        event: r.event || 'Extreme Heat Warning',
        headline: r.headline || `${r.event || 'Hazard Warning'}: Dangerous temperatures in Bronx County`,
        area: r.areaDesc || 'Bronx County, NY (Zone NYZ073)',
        onset: r.onset || data.fetched_at || null,
        ends: r.expires || null,
        source: data.badge || data.source || 'National Weather Service',
        summary: r.event ? `${r.event} · Zone NYZ073` : undefined,
      }));

      return {
        alerts: alerts.length > 0 ? alerts : [sampleHeatAlert()],
        checked_at: data.fetched_at || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('[ClimateOps Mobile] Weather status request failed, using local sample:', err);
  }

  return {
    alerts: [sampleHeatAlert()],
    checked_at: new Date().toISOString(),
  };
}

function atLocal(daysAhead: number, hour: number, now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead, hour, 0, 0);
  return d.toISOString();
}

/** The sample alert: tomorrow 11:00 AM to the day after tomorrow 8:00 PM, phone time. */
export function sampleHeatAlert(now = new Date()): HeatAlert {
  return {
    id: 'sample-heat-advisory',
    event: 'Heat Advisory',
    headline: 'Heat Advisory: heat index values up to 105°F expected',
    area: 'Bronx County, NY',
    onset: atLocal(1, 11, now),
    ends: atLocal(2, 20, now),
    source: 'National Weather Service (sample)',
    summary: 'Heat index up to 105°F',
  };
}

export function formatAlertTime(iso: string | null): string {
  if (!iso) return 'Not given';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}
