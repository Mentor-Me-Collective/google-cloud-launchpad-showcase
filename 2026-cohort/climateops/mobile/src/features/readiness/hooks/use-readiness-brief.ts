import { useEffect } from 'react';

import { useCurrentHeatAlert } from '@/features/heat-alert/hooks/use-current-heat-alert';
import { useBriefStore } from '@/features/readiness/store/brief-store';

/** Drives the Readiness brief screen; `autostart` generates a fresh brief when the screen opens. */
export function useReadinessBrief(autostart: boolean) {
  const { alert, isSample } = useCurrentHeatAlert();
  const brief = useBriefStore((s) => s.brief);
  const loading = useBriefStore((s) => s.loading);
  const error = useBriefStore((s) => s.error);
  const generate = useBriefStore((s) => s.generate);

  const regenerate = () => {
    if (loading) return;
    generate(isSample ? alert : null);
  };

  useEffect(() => {
    if (autostart) regenerate();
    // Only on open: later runs come from the Regenerate button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { brief, loading, error, regenerate, hasAlert: alert !== null };
}
