import { useEffect, useState } from 'react';

import { useHeatAlertStore } from '@/features/heat-alert/store/heat-alert-store';
import { fetchHeatAlerts, sampleHeatAlert } from '@/features/heat-alert/utils/heat-alert-api';

export function useHeatAlert() {
  const useSample = useHeatAlertStore((s) => s.useSample);
  const setUseSample = useHeatAlertStore((s) => s.setUseSample);
  const liveAlerts = useHeatAlertStore((s) => s.liveAlerts);
  const checkedAt = useHeatAlertStore((s) => s.checkedAt);
  const setLive = useHeatAlertStore((s) => s.setLive);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleStamp, setSampleStamp] = useState(() => new Date().toISOString());

  const refresh = async () => {
    setError(null);
    if (useSample) {
      setSampleStamp(new Date().toISOString());
      return;
    }
    setLoading(true);
    try {
      const data = await fetchHeatAlerts();
      setLive(data.alerts, data.checked_at);
    } catch {
      setError('Couldn’t reach the National Weather Service. Showing the last check.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (useSample) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useSample]);

  const alert = useSample ? sampleHeatAlert(new Date(sampleStamp)) : (liveAlerts[0] ?? null);
  const extraCount = useSample ? 0 : Math.max(0, liveAlerts.length - 1);

  return {
    alert,
    extraCount,
    isSample: useSample,
    setUseSample,
    loading,
    error,
    checkedAt: useSample ? sampleStamp : checkedAt,
    refresh,
  };
}
