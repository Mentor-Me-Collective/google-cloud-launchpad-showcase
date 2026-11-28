import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Pressable, pressHaptic } from '@/components/pressable';
import { AuthField } from '@/features/auth/components/auth-field';
import { SpeechBubble } from '@/components/game/game-ui';
import { Lumi } from '@/components/lumi/lumi';
import { FloatingBlob } from '@/features/auth/components/floating-blob';
import { AppleButton, GoogleButton } from '@/features/auth/components/social-buttons';
import { authErrorMessage, useAuthStore } from '@/features/auth/store/auth-store';
import { ChunkyButton } from '@/features/teacher/components/chunky-button';
import { useCopy } from '@/lib/i18n';

export default function LoginScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const copy = useCopy();

  const top = useThemeColor('surface-secondary');
  const bottom = useThemeColor('background');

  const enter = async () => {
    if (busy) return;
    pressHaptic();
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signIn({ email, password });
      // The role comes from the server, so read it after the profile has loaded.
      router.replace(useAuthStore.getState().role === 'teacher' ? '/panel' : '/');
    } catch (failure) {
      setError(authErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const social = () => {
    pressHaptic();
    setError('Google and Apple sign-in are coming soon. Use your email for now.');
  };

  return (
    <View className="flex-1 bg-background">
      <LinearGradient
        colors={[top, bottom]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName="flex-grow px-5 pt-safe-offset-6 pb-safe-offset-6"
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}>
        <View className="w-full">
          <View className="items-center">
            <Text className="text-5xl font-black tracking-tighter text-foreground">LearnLite</Text>
            <Text className="mt-2 text-xs font-bold uppercase tracking-[0.28em] text-muted">
              {copy.t('Learn without barriers')}
            </Text>
          </View>

          <View className="mt-2 h-[250px] items-center justify-center overflow-hidden">
            <FloatingBlob size={84} tone="bg-accent/20" top={12} left={-6} delay={0} distance={10} />
            <FloatingBlob size={56} tone="bg-success/20" top={58} right={-2} delay={400} distance={7} />
            <FloatingBlob size={44} tone="bg-warning/20" bottom={12} left={22} delay={800} distance={6} />
            <FloatingBlob size={32} tone="bg-accent/10" top={6} right={46} delay={200} distance={5} />

            <Lumi size={180} mood="wave" />

            <View className="absolute right-0 top-4">
              <SpeechBubble text={copy.t('Hi! I am Lumi')} tail="bottom" />
            </View>
          </View>

          <View className="mt-2 gap-3 rounded-[28px] border border-border bg-background p-4">
            <Text className="text-center text-lg font-bold text-foreground">{copy.t('Sign in to get started')}</Text>

            <View className="gap-3">
              <GoogleButton label={copy.t('Sign in with Google')} onPress={social} />
              <AppleButton label={copy.t('Sign in with Apple')} onPress={social} />
            </View>

            <View className="flex-row items-center gap-3">
              <View className="h-px flex-1 bg-border" />
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted">{copy.t('or with email')}</Text>
              <View className="h-px flex-1 bg-border" />
            </View>

            <View className="gap-3">
              <AuthField
                label={copy.t('Email')}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
              />
              <AuthField
                label={copy.t('Password')}
                value={password}
                onChangeText={setPassword}
                placeholder={copy.t('Enter your password')}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
              />
            </View>

            {error ? (
              <Text className="text-center text-sm font-semibold text-warning">{copy.t(error)}</Text>
            ) : null}

            <ChunkyButton
              label={busy ? copy.t('Signing in...') : copy.t('Sign in')}
              disabled={busy}
              onPress={enter}
            />

            <View className="flex-row items-center justify-center gap-1">
              <Text className="text-sm text-muted">{copy.t('New here?')}</Text>
              <Pressable
                onPress={() => {
                  pressHaptic();
                  router.push('/register');
                }}>
                <Text className="text-sm font-bold text-accent">{copy.t('Create an account')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
