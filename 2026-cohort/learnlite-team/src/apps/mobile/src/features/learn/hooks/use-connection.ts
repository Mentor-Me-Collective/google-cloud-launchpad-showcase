import { useNetworkState } from 'expo-network';

import { useLearnStore } from '@/features/learn/store/learn-store';

/** Online only when the phone reports internet AND the in-app "Test offline mode" switch is off. */
export function useConnection() {
  const network = useNetworkState();
  const simulateOffline = useLearnStore((s) => s.simulateOffline);
  const deviceOnline = network.isConnected === true && network.isInternetReachable !== false;
  return { online: deviceOnline && !simulateOffline, simulateOffline };
}
