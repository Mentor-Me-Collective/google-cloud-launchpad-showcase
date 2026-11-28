import '@/lib/guard-navigation';
import '@/global.css';

import Constants from 'expo-constants';
import {
  Baloo2_400Regular,
  Baloo2_500Medium,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/baloo-2';
import {
  DarkTheme,
  DefaultTheme,
  type ErrorBoundaryProps,
  Stack,
  ThemeProvider,
} from 'expo-router';
import { HeroUINativeProvider } from 'heroui-native';
import { useEffect, useState } from 'react';
import { ScrollView, Text, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Newly } from '@newly/sdk-react-native';

import { ThemeSwitchHost } from '@/components/theme-switch-host';
import { hideExpoDeveloperUi } from '@/lib/dev-menu';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useSettingsStore } from '@/features/settings/store/settings-store';
import { copyFor } from '@/lib/i18n';
import { preloadSounds } from '@/lib/sounds';
import generatedAnalytics from '@/lib/newly-analytics.json';
import { Uniwind } from 'uniwind';

type NewlyAnalyticsExtra = {
  newlyAnalyticsEnabled?: unknown;
  newlyAnalyticsSamplingRate?: unknown;
  newlyApiUrl?: unknown;
  newlyIngestKey?: unknown;
};

// Newly writes this project's own analytics settings into src/lib/newly-analytics.json,
// which ships empty. They are deliberately NOT in app.json `expo.extra`: everything under
// `extra` is a native input, so a per-project value there gives the project its own
// fingerprint and costs it a full native build instead of the shared pre-built shell.
// Projects scaffolded before the move still carry the four keys in `extra`, so that stays
// the fallback.
const generated = generatedAnalytics as {
  ingestKey?: string;
  apiUrl?: string;
  enabled?: boolean;
  samplingRate?: number | null;
};
const analyticsExtra = (Constants.expoConfig?.extra ?? {}) as NewlyAnalyticsExtra;
const analytics = generated.ingestKey
  ? {
      ingestKey: generated.ingestKey,
      apiUrl: generated.apiUrl,
      enabled: generated.enabled,
      sampling: generated.samplingRate,
    }
  : {
      ingestKey: analyticsExtra.newlyIngestKey,
      apiUrl: analyticsExtra.newlyApiUrl,
      enabled: analyticsExtra.newlyAnalyticsEnabled,
      sampling: analyticsExtra.newlyAnalyticsSamplingRate,
    };

const newlyIngestKey = typeof analytics.ingestKey === 'string' ? analytics.ingestKey : '';
const newlyApiUrl = typeof analytics.apiUrl === 'string' ? analytics.apiUrl : '';
const newlyAnalyticsSampling = typeof analytics.sampling === 'number' ? analytics.sampling : undefined;

// Expo's floating gear and developer menu belong to whoever is debugging Expo, not to
// the person looking at their own app. See src/lib/dev-menu.ts for why this is JS and
// not an app.json plugin option.
hideExpoDeveloperUi();

if (analytics.enabled !== false && newlyIngestKey && newlyApiUrl) {
  Newly.init({
    ingestKey: newlyIngestKey,
    apiUrl: newlyApiUrl,
    sampling: newlyAnalyticsSampling,
  });
}

// Color scheme is driven by app.json `userInterfaceStyle` (automatic / light / dark) —
// set by the design system at lock time. Uniwind follows the system color scheme by
// default (adaptive themes), so the HeroUI/Uniwind design tokens switch light/dark on
// their own; we only mirror it into React Navigation's theme here.
//
// KeyboardProvider (react-native-keyboard-controller) is mounted once at the root so any
// screen can use KeyboardAwareScrollView / keyboard hooks for proper form handling — this
// is the keyboard library the design system mandates over RN's KeyboardAvoidingView. It is
// pre-baked into the scaffold (along with MMKV for persistence and Skia for charts) so the
// native module set is fixed up front and screen work hot-reloads without a native rebuild.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  console.log('[ErrorBoundary]', error.message);
  return (
    <View className="flex-1 justify-center gap-4 bg-background px-6">
      <Text className="text-2xl font-black text-foreground">{copyFor(useSettingsStore.getState().locale).t('Something went wrong')}</Text>
      <ScrollView className="max-h-64">
        <Text className="text-sm text-warning">{error.message}</Text>
        {error.stack ? <Text className="mt-2 text-xs text-muted">{error.stack}</Text> : null}
      </ScrollView>
      <Text className="text-base font-bold text-accent" onPress={retry}>
        {copyFor(useSettingsStore.getState().locale).t('Try again')}
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_400Regular,
    Baloo2_500Medium,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
  });
  const [, refreshWithBaloo] = useState(0);
  const systemColorScheme = useColorScheme();
  const themeChoice = useSettingsStore((state) => state.theme);
  const colorScheme =
    themeChoice === 'dark' ? 'dark' : themeChoice === 'light' ? 'light' : systemColorScheme;

  useEffect(() => {
    if (!fontsLoaded) return;

    // React Native does not cascade a View's font to nested Text nodes. Set
    // Baloo 2 as the app-wide default while preserving any explicit font
    // family a component may provide.
    const RNText = Text as typeof Text & {
      defaultProps?: { style?: unknown };
    };
    RNText.defaultProps = {
      ...RNText.defaultProps,
      style: [{ fontFamily: 'Baloo2_400Regular' }, RNText.defaultProps?.style],
    };
    // Re-render once so text already mounted during the font load picks up the
    // newly registered family immediately instead of waiting for navigation.
    refreshWithBaloo((version) => version + 1);
  }, [fontsLoaded, refreshWithBaloo]);

  // Keep the app in sync with the real Firebase session (sign-in persists between launches,
  // and a revoked or expired session sends the user back to the login screen).
  useEffect(() => useAuthStore.getState().watchSession(), []);
  useEffect(() => preloadSounds(), []);

  useEffect(() => {
    // Apply the persisted choice on startup. ThemeSwitchHost handles animated changes
    // made later from Profile or Settings.
    Uniwind.setTheme(themeChoice);
  }, [themeChoice]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <HeroUINativeProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            {/* ThemeSwitchHost is always mounted (zero cost when unused) so any theme
                toggle switches via useThemeSwitch() and the circular reveal plays. */}
            <ThemeSwitchHost>
              <Stack screenOptions={{ headerShown: false }} />
            </ThemeSwitchHost>
          </ThemeProvider>
        </HeroUINativeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
