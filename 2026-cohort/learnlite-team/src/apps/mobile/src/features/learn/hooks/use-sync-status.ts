import { useConnection } from '@/features/learn/hooks/use-connection';
import { useLearnStore } from '@/features/learn/store/learn-store';

export type SaveLabel = 'Saved on this device' | 'Nothing saved yet';

/**
 * No server is connected, so nothing is ever uploaded and "Synced" is never shown.
 * Records keep `synced: false` so a later upload step knows what to send.
 */
export function useSyncStatus() {
  const { online, simulateOffline } = useConnection();
  const answers = useLearnStore((s) => s.answers);
  const completed = useLearnStore((s) => s.completed);
  const lastActivity = useLearnStore((s) => s.lastActivity);
  const downloadedAt = useLearnStore((s) => s.downloadedAt);
  const unsent =
    Object.values(answers).filter((a) => !a.synced).length + Object.keys(completed).length;
  const lastSavedAt = [lastActivity?.at, downloadedAt].filter((d): d is string => !!d).sort().pop() ?? null;
  const label: SaveLabel = lastSavedAt ? 'Saved on this device' : 'Nothing saved yet';
  return { label, online, simulateOffline, unsent, lastSavedAt };
}
