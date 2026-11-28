import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { AppButton } from '@/components/app-button';
import { Card } from '@/components/card';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { BookIcon, CapIcon, GemIcon, StudentsIcon } from '@/components/game/game-icons';
import { Appear } from '@/components/game/game-ui';
import { PlayfulIcon } from '@/components/icon';
import { Pressable } from '@/components/pressable';
import { AvatarBadge, HeroCard, ProfileHero, StatTile } from '@/components/profile-ui';
import { authErrorMessage, useAuthStore } from '@/features/auth/store/auth-store';
import { useSettingsStore } from '@/features/settings/store/settings-store';
import { initialsOf } from '@/features/student/progress';
import { FormField } from '@/features/teacher/components/form-field';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import { useCopy } from '@/lib/i18n';

export default function TeacherProfileScreen() {
  const name = useAuthStore((state) => state.name);
  const email = useAuthStore((state) => state.email);
  const updateAuthProfile = useAuthStore((state) => state.updateProfile);
  const signOut = useAuthStore((state) => state.signOut);
  const profile = useTeacherStore((state) => state.profile);
  const updateProfile = useTeacherStore((state) => state.updateProfile);
  const classrooms = useTeacherStore((state) => state.classrooms);
  const students = useTeacherStore((state) => state.students);
  const modules = useTeacherStore((state) => state.modules);
  const locale = useSettingsStore((state) => state.locale);
  const copy = useCopy();

  const [editing, setEditing] = useState(false);
  const [formName, setFormName] = useState(name);
  const [school, setSchool] = useState(profile.school);
  const [subject, setSubject] = useState(profile.subject);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const studentCount = new Set(students.map((s) => s.id)).size;
  const classXp = [...new Map(students.map((s) => [s.id, s.xp])).values()].reduce((a, b) => a + b, 0);

  const save = async () => {
    setSaveError('');
    try {
      await updateAuthProfile({ name: formName, school, subject });
      updateProfile({ school, subject });
      setEditing(false);
      setSaved(true);
    } catch (failure) {
      setSaveError(authErrorMessage(failure));
    }
  };

  return (
    <KeyboardAwareScrollView className="flex-1 bg-background" contentContainerClassName="gap-5 pb-safe-offset-24" keyboardShouldPersistTaps="handled" bottomOffset={24}>
      <Appear index={0}>
        <ProfileHero
          title={copy.profile}
          name={name || email || copy.t('Teacher')}
          initials={initialsOf(name || email)}
          colors={['#7C5CFF', '#4F3BD6']}
          badge={
            <AvatarBadge color="#1CB0A8">
              <PlayfulIcon name="bookshelf" size={18} color="#FFFFFF" />
            </AvatarBadge>
          }
          chips={[copy.t('Teacher'), profile.school, profile.subject]}
          footer={
            <HeroCard>
              <View className="flex-row items-center gap-3">
                <PlayfulIcon name="account-group" size={24} color="#FFFFFF" />
                <Text className="flex-1 text-sm font-bold leading-5 text-white">
                  {studentCount > 0
                    ? copy.t('{count} students are learning with you. Keep it up!', { count: studentCount })
                    : copy.t('Create a classroom and share its code to start teaching.')}
                </Text>
              </View>
            </HeroCard>
          }
        />
      </Appear>

      <View className="gap-5 px-5">
        <Appear index={1} className="gap-3">
          <View className="flex-row gap-3">
            <StatTile value={classrooms.length} label={copy.t('Classrooms')} icon={<CapIcon size={44} />} color="#2F6BFF" />
            <StatTile value={studentCount} label={copy.t('Students')} icon={<StudentsIcon size={44} />} color="#6A4BEF" />
          </View>
          <View className="flex-row gap-3">
            <StatTile value={modules.length} label={copy.t('Modules')} icon={<BookIcon size={44} />} color="#E8761A" />
            <StatTile value={classXp} label={copy.t('Total XP')} icon={<GemIcon size={44} />} color="#E04848" />
          </View>
        </Appear>

        <Appear index={2} className="gap-2">
          <Text className="px-1 text-sm font-black uppercase tracking-widest text-muted">{copy.personalData}</Text>
          {editing ? (
            <Card>
              <FormField label={copy.name} value={formName} onChangeText={setFormName} placeholder={copy.t('Your name')} />
              <FormField label={copy.email} value={email} editable={false} hint={copy.t('Your email is your sign-in and cannot be changed here.')} />
              <FormField label={copy.school} value={school} onChangeText={setSchool} placeholder={copy.t('School name')} />
              <FormField label={copy.subject} value={subject} onChangeText={setSubject} placeholder={copy.t('Subject you teach')} />
              {saveError ? <Text className="text-sm font-semibold text-warning">{copy.t(saveError)}</Text> : null}
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <AppButton label={copy.t('Cancel')} variant="secondary" size="md" onPress={() => setEditing(false)} />
                </View>
                <View className="flex-1">
                  <AppButton label={copy.save} size="md" onPress={save} />
                </View>
              </View>
            </Card>
          ) : (
            <View className="overflow-hidden rounded-3xl border-2 border-border" style={{ borderBottomWidth: 5 }}>
              <Row icon="account-school-outline" title={name || email} subtitle={email} action={copy.t('Edit')} onPress={() => setEditing(true)} />
              <Row icon="home-heart" title={copy.school} subtitle={profile.school || copy.t('Not set yet')} onPress={() => setEditing(true)} />
              <Row icon="book-plus-outline" title={copy.subject} subtitle={profile.subject || copy.t('Not set yet')} onPress={() => setEditing(true)} last />
            </View>
          )}
        </Appear>

        <Appear index={3} className="gap-2">
          <Text className="px-1 text-sm font-black uppercase tracking-widest text-muted">{copy.t('Preferences')}</Text>
          <View className="overflow-hidden rounded-3xl border-2 border-border" style={{ borderBottomWidth: 5 }}>
            <Row icon="palette-outline" title={copy.settings} subtitle={copy.settingsSubtitle} onPress={() => router.push('/settings')} />
            <Row icon="translate" title={copy.t('Language')} subtitle={locale === 'es' ? copy.spanish : copy.english} onPress={() => router.push('/settings')} last />
          </View>
        </Appear>

        <Appear index={4}>
          <AppButton
            label={copy.signOut}
            variant="secondary"
            icon={<PlayfulIcon name="arrow-right" size={20} color="#E58A32" />}
            onPress={() => {
              void signOut();
              router.replace('/login');
            }}
          />
        </Appear>
      </View>

      <ConfirmDialog
        visible={saved}
        title={copy.profile}
        message={copy.settingsSaved}
        confirmLabel={copy.done}
        cancelLabel={copy.done}
        onConfirm={() => setSaved(false)}
        onCancel={() => setSaved(false)}
      />
    </KeyboardAwareScrollView>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
  action,
  last,
}: {
  icon: Parameters<typeof PlayfulIcon>[0]['name'];
  title: string;
  subtitle?: string;
  onPress?: () => void;
  action?: string;
  last?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      <View className={`flex-row items-center gap-3 px-4 py-4 ${last ? '' : 'border-b-2 border-border'}`}>
        <View className="size-10 items-center justify-center rounded-2xl bg-surface">
          <PlayfulIcon name={icon} size={20} color="#56648A" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-black text-foreground" numberOfLines={1}>{title}</Text>
          {subtitle ? <Text className="text-sm text-muted" numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {action ? <Text className="text-sm font-black text-accent">{action}</Text> : <PlayfulIcon name="arrow-right" size={18} color="#56648A" />}
      </View>
    </Pressable>
  );
}
