import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { Platform } from 'react-native';

import { config, isConfigured } from '@/lib/config';
import { storage } from '@/lib/storage';

let auth: Auth | null = null;

/**
 * Firebase Auth, created once. On native the session is kept in the app's MMKV storage so the
 * user stays signed in between launches; on web Firebase uses the browser's own storage.
 */
export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  if (!isConfigured) throw new Error('Firebase is not configured. Copy .env.example to .env.');

  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(config.firebase);

  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    // `getReactNativePersistence` only exists in Firebase's React Native build, so it is not in
    // the browser typings. It accepts any object with async getItem/setItem/removeItem.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getReactNativePersistence } = require('firebase/auth') as {
      getReactNativePersistence: (store: unknown) => never;
    };
    const mmkvAsAsyncStorage = {
      getItem: async (key: string) => storage.getString(key) ?? null,
      setItem: async (key: string, value: string) => void storage.set(key, value),
      removeItem: async (key: string) => void storage.remove(key),
    };
    try {
      auth = initializeAuth(app, { persistence: getReactNativePersistence(mmkvAsAsyncStorage) });
    } catch {
      auth = getAuth(app); // already initialized (fast refresh)
    }
  }
  return auth;
}
