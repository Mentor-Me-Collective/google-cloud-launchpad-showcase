import { Redirect, router } from 'expo-router';
import { useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Pressable } from '@/components/pressable';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { AppButton } from '@/components/app-button';
import { CheckIcon } from '@/components/game/game-icons';
import { PlayfulIcon } from '@/components/icon';
import { useThemeSwitch } from '@/components/theme-switch-host';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { ChunkyButton } from '@/features/teacher/components/chunky-button';
import { useSettingsStore } from '@/features/settings/store/settings-store';
import type { Locale, ThemeChoice } from '@/features/settings/types/settings-state';
import { useCopy } from '@/lib/i18n';

export default function SettingsScreen() {
  const authenticated = useAuthStore((state) => state.authenticated);
  const theme = useSettingsStore((state) => state.theme);
  const locale = useSettingsStore((state) => state.locale);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setLocale = useSettingsStore((state) => state.setLocale);
  const copy = useCopy();
  const switchTheme = useThemeSwitch();
  const accent = useThemeColor('accent');
  const success = useThemeColor('success');
  const [saved, setSaved] = useState(false);

  if (!authenticated) return <Redirect href="/login" />;

  const chooseTheme = (next: ThemeChoice) => {
    setTheme(next);
    switchTheme(next);
  };

  const chooseLocale = (next: Locale) => {
    setLocale(next);
  };

  return (
    <View className="flex-1 bg-background px-5 pt-safe-offset-3">
      <View className="flex-row items-center gap-3 pb-5">
        <AppButton
          label={copy.t('Back')}
          iconOnly
          size="sm"
          variant="secondary"
          icon={<PlayfulIcon name="arrow-left" size={22} color={accent} />}
          onPress={() => router.back()}
        />
        <View className="flex-1">
          <Text className="text-3xl font-black text-foreground">{copy.settings}</Text>
          <Text className="text-sm text-muted">{copy.settingsSubtitle}</Text>
        </View>
      </View>

      <View className="gap-3">
        <Text className="px-1 text-xs font-black uppercase tracking-wide text-muted">
          {copy.appearance}
        </Text>
        <View className="flex-row gap-3 pt-1">
          <ThemeTile label={copy.light} mode="light" selected={theme === 'light'} onPress={() => chooseTheme('light')} />
          <ThemeTile label={copy.dark} mode="dark" selected={theme === 'dark'} onPress={() => chooseTheme('dark')} />
          <ThemeTile label={copy.system} mode="system" selected={theme === 'system'} onPress={() => chooseTheme('system')} />
        </View>

        <Text className="mt-3 px-1 text-xs font-black uppercase tracking-wide text-muted">
          {copy.language}
        </Text>
        <View className="gap-3 rounded-3xl border-2 border-border bg-surface p-4">
          <View className="flex-row items-center gap-3">
            <View className="size-11 items-center justify-center rounded-2xl bg-success/15">
              <PlayfulIcon name="translate" size={25} color={success} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-black text-foreground">{copy.language}</Text>
              <Text className="text-sm text-muted">{copy.languageHint}</Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <LanguageButton label={copy.spanish} selected={locale === 'es'} onPress={() => chooseLocale('es')} />
            <LanguageButton label={copy.english} selected={locale === 'en'} onPress={() => chooseLocale('en')} />
          </View>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.t('Watch the introduction again')}
        onPress={() => router.push('/welcome')}
        className="mt-5 flex-row items-center gap-3 rounded-2xl border-2 border-border px-4 py-3">
        <PlayfulIcon name="lightbulb-on-outline" size={22} color="#2F6BFF" />
        <Text className="flex-1 text-base font-black text-foreground">{copy.t('Watch the introduction again')}</Text>
        <PlayfulIcon name="arrow-right" size={18} color="#56648A" />
      </Pressable>

      <View className="mt-auto pb-safe-offset-4 pt-5">
        <ChunkyButton label={copy.done} onPress={() => setSaved(true)} />
      </View>

      <ConfirmDialog
        visible={saved}
        title={copy.settings}
        message={copy.settingsSaved}
        confirmLabel={copy.done}
        cancelLabel={copy.done}
        onCancel={() => setSaved(false)}
        onConfirm={() => setSaved(false)}
        icon="check-circle-outline"
      />
    </View>
  );
}

const PREVIEW = {
  light: { outer: '#F2F2F2', inner: '#FFFFFF', text: '#111111', line: '#E3E3E3' },
  dark: { outer: '#4D4D4D', inner: '#171717', text: '#FFFFFF', line: '#666666' },
} as const;

/** A miniature of the app in one theme: a sheet with "Aa" laid over the background. */
function ThemeMini({ mode, width }: { mode: 'light' | 'dark'; width: number }) {
  const colors = PREVIEW[mode];
  return (
    <View style={{ width, height: '100%', backgroundColor: colors.outer }}>
      <View
        style={{
          position: 'absolute',
          left: width * 0.27,
          top: 30,
          right: -4,
          bottom: -4,
          borderTopLeftRadius: 16,
          backgroundColor: colors.inner,
          borderLeftWidth: 1,
          borderTopWidth: 1,
          borderColor: colors.line,
          paddingLeft: 14,
          paddingTop: 12,
        }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Aa</Text>
      </View>
    </View>
  );
}

function ThemeTile({
  label,
  mode,
  selected,
  onPress,
}: {
  label: string;
  mode: 'light' | 'dark' | 'system';
  selected: boolean;
  onPress: () => void;
}) {
  const foreground = useThemeColor('foreground');
  const border = useThemeColor('border');
  const background = useThemeColor('background');
  const [width, setWidth] = useState(0);
  const inner = Math.max(0, width - 6); // inside the 3px frame

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ flex: 1, gap: 8 }}>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{
          height: 96,
          borderRadius: 20,
          borderWidth: 3,
          borderColor: selected ? foreground : border,
          overflow: 'hidden',
          backgroundColor: background,
        }}>
        {width > 0 ? (
          mode === 'system' ? (
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={{ width: inner / 2, overflow: 'hidden' }}>
                <ThemeMini mode="dark" width={inner} />
              </View>
              <View style={{ width: inner / 2, overflow: 'hidden' }}>
                <View style={{ marginLeft: -inner / 2 }}>
                  <ThemeMini mode="light" width={inner} />
                </View>
              </View>
            </View>
          ) : (
            <ThemeMini mode={mode} width={inner} />
          )
        ) : null}
        {selected ? (
          <View
            style={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              width: 24,
              height: 24,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: foreground,
            }}>
            <CheckIcon size={14} color={background} />
          </View>
        ) : null}
      </View>
      <Text className="px-1 text-base font-bold text-foreground">{label}</Text>
    </Pressable>
  );
}

function LanguageButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const accentForeground = useThemeColor('accent-foreground');
  return (
    <AppButton
      label={label}
      variant={selected ? 'primary' : 'secondary'}
      size="sm"
      className="flex-1"
      icon={selected ? <PlayfulIcon name="check-circle" size={18} color={accentForeground} /> : undefined}
      onPress={onPress}
    />
  );
}
