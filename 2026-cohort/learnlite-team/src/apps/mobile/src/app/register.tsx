import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Icon } from '@/components/icon';
import { Pressable, pressHaptic } from '@/components/pressable';
import { AuthField } from '@/features/auth/components/auth-field';
import { authErrorMessage, useAuthStore, type UserRole } from '@/features/auth/store/auth-store';
import { ChunkyButton } from '@/features/teacher/components/chunky-button';
import { useCopy } from '@/lib/i18n';

const ROLES = [
  {
    id: 'student',
    label: 'Student',
    hint: 'Learn at your pace',
    sf: 'graduationcap.fill',
    md: 'school',
  },
  {
    id: 'teacher',
    label: 'Teacher',
    hint: 'Guide a class',
    sf: 'person.2.fill',
    md: 'people',
  },
] as const;

export default function RegisterScreen() {
  const signUp = useAuthStore((s) => s.signUp);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const copy = useCopy();

  const accent = useThemeColor('accent');
  const onAccent = useThemeColor('accent-foreground');
  const top = useThemeColor('surface-secondary');
  const bottom = useThemeColor('background');

  // Every new account starts as a student. Teacher access is granted by LearnLite on the
  // server (a Firebase custom claim), so the role chosen above cannot be set from the app.
  const createAccount = async () => {
    if (busy) return;
    pressHaptic();
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Fill in your name, email and a password of at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signUp({ name, email, password });
      router.replace('/');
    } catch (failure) {
      setError(authErrorMessage(failure));
    } finally {
      setBusy(false);
    }
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
        <View className="w-full gap-4">
          <View className="items-center">
            <Text className="text-4xl font-black tracking-tighter text-foreground">LearnLite</Text>
            <Text className="mt-1 text-xs font-bold uppercase tracking-[0.28em] text-muted">
              {copy.t('Create your account')}
            </Text>
          </View>

          <View className="gap-4 rounded-[28px] border border-border bg-background p-5">
            <Text className="text-lg font-bold text-foreground">{copy.t('I am joining as a')}</Text>

            <View className="flex-row items-stretch gap-3">
              {ROLES.map((option) => {
                const selected = role === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setRole(option.id)}
                    className={`flex-1 gap-2 rounded-2xl border-2 p-4 ${
                      selected ? 'border-accent bg-accent/10' : 'border-border bg-surface'
                    }`}>
                    <View
                      className={`size-11 items-center justify-center rounded-full ${
                        selected ? 'bg-accent' : 'bg-surface-secondary'
                      }`}>
                      <Icon
                        sf={option.sf}
                        md={option.md}
                        size={22}
                        color={selected ? onAccent : accent}
                      />
                    </View>
                    <Text className="text-base font-bold text-foreground">{copy.t(option.label)}</Text>
                    <Text className="text-xs text-muted">{copy.t(option.hint)}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="gap-3">
              <AuthField
                label={copy.t('Full name')}
                value={name}
                onChangeText={setName}
                placeholder={copy.t('e.g. Amara Otieno')}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
              />
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
                placeholder={copy.t('Create a password')}
                hint={copy.t('At least 6 characters')}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <AuthField
                label={copy.t('Repeat password')}
                value={confirm}
                onChangeText={setConfirm}
                placeholder={copy.t('Repeat your password')}
                error={confirm.length > 0 && confirm !== password ? 'Passwords do not match.' : undefined}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
            </View>

            {role === 'teacher' ? (
              <Text className="text-center text-xs text-muted">
                {copy.t('Teacher access is enabled by LearnLite after you sign up. Your account starts as a student.')}
              </Text>
            ) : null}

            {error ? (
              <Text className="text-center text-sm font-semibold text-warning">{copy.t(error)}</Text>
            ) : null}

            <ChunkyButton
              label={busy ? copy.t('Creating account...') : copy.t('Create an account')}
              disabled={busy}
              onPress={createAccount}
            />

            <View className="flex-row items-center justify-center gap-1">
              <Text className="text-sm text-muted">{copy.t('Already have an account?')}</Text>
              <Pressable
                onPress={() => {
                  pressHaptic();
                  router.back();
                }}>
                <Text className="text-sm font-bold text-accent">{copy.t('Sign in')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
