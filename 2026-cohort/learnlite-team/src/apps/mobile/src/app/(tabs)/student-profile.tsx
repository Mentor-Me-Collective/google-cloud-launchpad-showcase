import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { AppButton } from '@/components/app-button';
import { Card } from '@/components/card';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CapIcon, ClassroomIcon, FlameIcon, GemIcon, IceIcon, LessonBadgeIcon, LockIcon, StarIcon, TargetIcon, TrophyIcon } from '@/components/game/game-icons';
import { Appear } from '@/components/game/game-ui';
import { PlayfulIcon } from '@/components/icon';
import { Pressable } from '@/components/pressable';
import { AvatarBadge, HeroCard, HeroProgress, ProfileHero, StatTile } from '@/components/profile-ui';
import { authErrorMessage, useAuthStore } from '@/features/auth/store/auth-store';
import { initialsOf, moduleProgress } from '@/features/student/progress';
import { useStudentStore } from '@/features/student/store/student-store';
import { FormField } from '@/features/teacher/components/form-field';
import { useCopy } from '@/lib/i18n';

/** XP needed for each level shown in the profile header. */
const LEVEL_XP = 100;

export default function StudentProfileScreen() {
  const name = useAuthStore((state) => state.name) || 'Learner';
  const email = useAuthStore((state) => state.email);
  const school = useAuthStore((state) => state.school) || '';
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const signOut = useAuthStore((state) => state.signOut);
  const xp = useStudentStore((state) => state.xp);
  const streak = useStudentStore((state) => state.streak);
  const classrooms = useStudentStore((state) => state.classrooms.length);
  const completedLessons = useStudentStore((state) => state.completedLessonIds.length);
  const modules = useStudentStore((state) => state.modules);
  const results = useStudentStore((state) => state.activityResults);
  const downloaded = useStudentStore((state) => state.downloadedModules.length);
  const copy = useCopy();
  const [editing, setEditing] = useState(false);
  const [formName, setFormName] = useState(name);
  const [formSchool, setFormSchool] = useState(school);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const moduleDone = useMemo(() => modules.some((m) => moduleProgress(m, results) === 100), [modules, results]);
  const achievements = [
    { key: 'first', icon: <LessonBadgeIcon size={34} />, color: '#58CC02', title: copy.t('First steps'), detail: copy.t('Finish your first lesson'), unlocked: completedLessons >= 1 },
    { key: 'streak', icon: <FlameIcon size={34} />, color: '#FF9600', title: copy.t('On fire'), detail: copy.t('Reach a 3-day streak'), unlocked: streak >= 3 },
    { key: 'xp', icon: <GemIcon size={34} />, color: '#FFC800', title: copy.t('XP collector'), detail: copy.t('Earn 100 XP'), unlocked: xp >= 100 },
    { key: 'class', icon: <CapIcon size={34} />, color: '#2F6BFF', title: copy.t('Team player'), detail: copy.t('Join a classroom'), unlocked: classrooms >= 1 },
    { key: 'module', icon: <TrophyIcon size={34} />, color: '#7C5CFF', title: copy.t('Champion'), detail: copy.t('Complete a whole module'), unlocked: moduleDone },
    { key: 'five', icon: <TargetIcon size={34} />, color: '#1CB0A8', title: copy.t('Unstoppable'), detail: copy.t('Finish 5 lessons'), unlocked: completedLessons >= 5 },
  ];
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const level = Math.floor(xp / LEVEL_XP) + 1;
  const intoLevel = xp % LEVEL_XP;

  const saveProfile = async () => {
    setSaveError('');
    try {
      await updateProfile({ name: formName, school: formSchool });
      setEditing(false);
      setSaved(true);
    } catch (failure) {
      setSaveError(authErrorMessage(failure));
    }
  };

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-5 pb-safe-offset-24"
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}>
      {/* Header */}
      <Appear index={0}>
        <ProfileHero
          title={copy.profile}
          name={name}
          initials={initialsOf(name)}
          badge={
            <AvatarBadge color="#FF9600">
              <ClassroomIcon size={20} />
            </AvatarBadge>
          }
          chips={[copy.t('Student'), school]}
          footer={
            <HeroCard>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <StarIcon size={22} />
                  <Text className="font-rounded text-lg font-black text-white">{copy.t('Level {n}', { n: level })}</Text>
                </View>
                <Text className="text-xs font-black text-white/85">
                  {copy.t('{xp} XP to level {n}', { xp: LEVEL_XP - intoLevel, n: level + 1 })}
                </Text>
              </View>
              <HeroProgress percent={(intoLevel / LEVEL_XP) * 100} />
            </HeroCard>
          }
        />
      </Appear>

      <View className="gap-5 px-5">
        {/* Stats */}
        <Appear index={1} className="gap-3">
          <View className="flex-row gap-3">
            <StatTile
              icon={streak > 0 ? <FlameIcon size={44} /> : <IceIcon size={44} />}
              value={streak}
              label={copy.t('day streak')}
              color={streak > 0 ? '#E8871E' : '#4AA8F0'}
            />
            <StatTile icon={<GemIcon size={44} />} value={xp} label={copy.t('Total XP')} color="#E04848" />
          </View>
          <View className="flex-row gap-3">
            <StatTile icon={<LessonBadgeIcon size={44} />} value={completedLessons} label={copy.t('lessons')} color="#4FA82E" />
            <StatTile icon={<CapIcon size={44} />} value={classrooms} label={copy.classrooms} color="#2F6BFF" />
          </View>
        </Appear>

        {/* Achievements */}
        <Appear index={2} className="gap-3">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-sm font-black uppercase tracking-widest text-muted">{copy.t('Achievements')}</Text>
            <Text className="text-sm font-black text-muted">{unlocked}/{achievements.length}</Text>
          </View>
          <View className="gap-3">
            {pairsOf(achievements).map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row gap-3">
                {row.map((a) => (
                  <View
                    key={a.key}
                    accessible
                    accessibilityLabel={`${a.title}. ${a.detail}. ${a.unlocked ? copy.t('Unlocked') : copy.t('Locked')}`}
                    className={`flex-1 items-center gap-2 rounded-3xl border-2 px-3 py-4 ${a.unlocked ? 'border-border' : 'border-border bg-surface'}`}
                    style={{ borderBottomWidth: 5 }}>
                    <View
                      className={`size-16 items-center justify-center rounded-full ${a.unlocked ? '' : 'bg-surface-secondary'}`}
                      style={a.unlocked ? { backgroundColor: `${a.color}22` } : undefined}>
                      {a.unlocked ? a.icon : <LockIcon size={26} />}
                    </View>
                    <Text className={`text-center font-rounded text-base font-black leading-5 ${a.unlocked ? 'text-foreground' : 'text-muted'}`} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>{a.title}</Text>
                    <Text className="text-center text-xs font-semibold leading-4 text-muted" numberOfLines={3}>{a.detail}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </Appear>

        {/* Personal data */}
        <Appear index={3} className="gap-2">
          <Text className="px-1 text-sm font-black uppercase tracking-widest text-muted">{copy.personalData}</Text>
          {editing ? (
            <Card>
              <FormField label={copy.name} value={formName} onChangeText={setFormName} placeholder={copy.t('Your name')} />
              <FormField
                label={copy.email}
                value={email}
                placeholder="you@example.com"
                editable={false}
                hint={copy.t('Your email is your sign-in and cannot be changed here.')}
              />
              <FormField label={copy.school} value={formSchool} onChangeText={setFormSchool} placeholder={copy.t('School name')} />
              {saveError ? <Text className="text-sm font-semibold text-warning">{copy.t(saveError)}</Text> : null}
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <AppButton label={copy.t('Cancel')} size="md" variant="secondary" onPress={() => setEditing(false)} />
                </View>
                <View className="flex-1">
                  <AppButton label={copy.save} size="md" onPress={saveProfile} />
                </View>
              </View>
            </Card>
          ) : (
            <View className="overflow-hidden rounded-3xl border-2 border-border">
              <Row icon="account-school-outline" title={name} subtitle={email} onPress={() => setEditing(true)} action={copy.t('Edit')} />
              <Row icon="home-heart" title={copy.school} subtitle={school || copy.t('Not set yet')} onPress={() => setEditing(true)} last />
            </View>
          )}
        </Appear>

        {/* Settings */}
        <Appear index={4} className="overflow-hidden rounded-3xl border-2 border-border">
          <Row icon="palette-outline" title={copy.settings} subtitle={copy.settingsSubtitle} onPress={() => router.push('/settings')} />
          <Row
            icon="bookshelf"
            title={copy.t('Offline modules')}
            subtitle={`${downloaded} ${copy.t('saved on this phone')}`}
            onPress={() => router.push('/student-downloads')}
            last
          />
        </Appear>

        <Appear index={5}>
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
  const content = (
    <View className={`flex-row items-center gap-3 px-4 py-4 ${last ? '' : 'border-b-2 border-border'}`}>
      <View className="size-10 items-center justify-center rounded-2xl bg-surface">
        <PlayfulIcon name={icon} size={20} color="#56648A" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-black text-foreground" numberOfLines={1}>{title}</Text>
        {subtitle ? <Text className="text-sm text-muted" numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {action ? <Text className="text-sm font-black text-accent">{action}</Text> : onPress ? <PlayfulIcon name="arrow-right" size={18} color="#56648A" /> : null}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

/** Splits a list into rows of two, so a grid always has exactly two cards per row. */
function pairsOf<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}
