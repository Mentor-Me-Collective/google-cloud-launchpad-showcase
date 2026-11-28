// Online / offline state for the status pill. Never used to block learning.
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

const online = (s: NetInfoState) => s.isConnected === true && s.isInternetReachable !== false;

export function useOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    NetInfo.fetch().then((s) => setIsOnline(online(s)));
    return NetInfo.addEventListener((s) => setIsOnline(online(s)));
  }, []);
  return isOnline;
}

/** One-off check, e.g. to tag an answer as offline when saving it. */
export async function isOnlineNow(): Promise<boolean> {
  return online(await NetInfo.fetch());
}
