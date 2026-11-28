import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Runtime configuration. Expo inlines `process.env.EXPO_PUBLIC_*` at build time, so each
 * variable must be written out literally. Values live in `apps/mobile/.env` (not committed);
 * see `.env.example`.
 *
 * EXPO_PUBLIC_API_URL may be a full URL, or `dev:<port>` for the local dev server: the host is
 * then found at runtime (the page's host on web, the Expo dev server's host on a phone), so a
 * new Wi-Fi address never needs an edit.
 */
function resolveApiUrl(raw: string): string {
  const value = raw.trim().replace(/\/+$/, '');
  const dev = value.match(/^dev:(\d+)$/);
  if (!dev) return value;
  const port = dev[1];
  let host = 'localhost';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    host = window.location.hostname || host;
  } else {
    const hostUri = Constants.expoConfig?.hostUri ?? '';
    host = hostUri.split(':')[0] || host;
  }
  return `http://${host}:${port}`;
}

export const config = {
  apiUrl: resolveApiUrl(process.env.EXPO_PUBLIC_API_URL ?? ''),
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  },
};

export const isConfigured = Boolean(config.apiUrl && config.firebase.apiKey && config.firebase.projectId);
