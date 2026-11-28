import { useTabStore } from '@/lib/tab-store';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BookIcon, CapIcon, FlameIcon, GemIcon, IceIcon, LessonBadgeIcon, MissionIcon, PlayIcon, TrophyIcon } from '@/components/game/game-icons';
import { Appear, GameProgress, SpeechBubble, StatPill } from '@/components/game/game-ui';
import { Lumi, type LumiMood } from '@/components/lumi/lumi';
import { Pressable, pressHaptic } from '@/components/pressable';
import { RaisedTile, tint } from '@/components/raised';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useLearnStore } from '@/features/learn/store/learn-store';
import { useStudentStore } from '@/features/student/store/student-store';
import type { ActivityResult } from '@/features/student/types/student';
import type { TeacherModule } from '@/features/teacher/types';
import { useCopy } from '@/lib/i18n';

/** Card colours for modules, in order. Each pair is [face, edge]. */
const MODULE_TONES: [string, string][] = [
  ['#2F6BFF', '#214FC9'],
  ['#7C5CFF', '#5B3FD6'],
  ['#FF8A1F', '#D96A00'],
  ['#1CB0A8', '#11857F'],
  ['#E0559A', '#B53A76'],
];

export default function LearnScreen() {
  const onboarded = useLearnStore((s) => s.onboarded);
  const fullName = useAuthStore((s) => s.name);
  const role = useAuthStore((s) => s.role);
  const xp = useStudentStore((s) => s.xp);
  const streak = useStudentStore((s) => s.streak);
  const joinedClassroomIds = useStudentStore((s) => s.joinedClassroomIds);
  const downloadedModules = useStudentStore((s) => s.downloadedModules);
  const activityResults = useStudentStore((s) => s.activityResults);
  const completedLessonIds = useStudentStore((s) => s.completedLessonIds);
  const modules = useStudentStore((s) => s.modules);
  const assignments = useStudentStore((s) => s.assignments);
  const loaded = useStudentStore((s) => s.loaded);
  const copy = useCopy();
  const [mood, setMood] = useState<LumiMood>('wave');
  const [replay, setReplay] = useState(0);

  // After saying hello (or a happy hop when tapped), Lumi goes back to looking around.
  useEffect(() => {
    if (mood === 'idle') return;
    const timer = setTimeout(() => setMood('idle'), 2600);
    return () => clearTimeout(timer);
  }, [mood, replay]);

  const moduleCards = useMemo(() => {
    const assignedIds = new Set(
      assignments.filter((a) => joinedClassroomIds.includes(a.classroomId)).map((a) => a.moduleId),
    );
    const unique = new Map([...modules, ...downloadedModules].map((m) => [m.id, m]));
    return [...unique.values()]
      .filter((m) => assignedIds.has(m.id) || downloadedModules.some((d) => d.id === m.id))
      .map((module) => ({
        module,
        progress: moduleProgress(module, activityResults),
        next: nextLesson(module, completedLessonIds),
      }));
  }, [activityResults, assignments, completedLessonIds, downloadedModules, joinedClassroomIds, modules]);

  if (role === 'teacher') return <Redirect href="/panel" />;
  if (!onboarded) return <Redirect href="/welcome" />;

  const active =
    moduleCards.find((c) => c.progress > 0 && c.progress < 100) ??
    moduleCards.find((c) => c.progress === 0) ??
    moduleCards[0];
  const name = firstName(fullName) || copy.t('Student');
  const greeting = !loaded
    ? copy.t('Hi {name}! Getting your lessons ready...', { name })
    : moduleCards.length === 0
      ? copy.t('Hi {name}! Ask your teacher for the classroom code and we start together.', { name })
      : active && active.progress === 100
        ? copy.t('You finished every lesson, {name}! I am so proud of you.', { name })
        : streak > 1
          ? copy.t('{count} days in a row, {name}! Let us keep the streak alive.', { count: streak, name })
          : copy.t('Hi {name}! Ready for today’s mission?', { name });

  const openModule = (id: string) => router.push({ pathname: '/student-module/[id]', params: { id } });

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-5 px-5 pb-safe-offset-24 pt-safe-offset-2">
      {/* Game stats */}
      <Appear index={0} className="flex-row items-center justify-between">
        <StatPill
          icon={streak > 0 ? <FlameIcon size={28} /> : <IceIcon size={28} />}
          value={streak}
          label={copy.t('day streak')}
          tone={streak > 0 ? 'warm' : 'ice'}
        />
        <StatPill icon={<GemIcon size={28} />} value={xp} label="XP" tone="rose" />
        <StatPill icon={<TrophyIcon size={28} dim={completedLessonIds.length === 0} />} value={completedLessonIds.length} label={copy.t('lessons completed')} tone="gold" />
      </Appear>

      {/* Lumi says hello */}
      <Appear index={1} className="flex-row items-center gap-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lumi"
          onPress={() => {
            pressHaptic();
            setMood('happy');
            setReplay((n) => n + 1);
          }}>
          <Lumi size={128} mood={mood} replay={replay} />
        </Pressable>
        <View className="flex-1 pl-2">
          <SpeechBubble text={greeting} />
        </View>
      </Appear>

      {/* Today's mission */}
      {active ? (
        <Appear index={2}>
          <View>
            <View className="overflow-hidden rounded-[30px]" style={{ backgroundColor: '#1E4FD8', paddingBottom: 6 }}>
              <LinearGradient colors={['#4A86FF', '#2F6BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 30, padding: 20, gap: 16 }}>
                <View className="absolute -right-10 -top-12 size-44 rounded-full bg-white/10" />
                <View className="absolute -bottom-16 right-16 size-32 rounded-full bg-white/10" />
                <View className="flex-row items-center justify-between gap-2">
                  <View className="rounded-full bg-white/20 px-3 py-1">
                    <Text className="text-xs font-black uppercase tracking-widest text-white">{copy.t('Today’s mission')}</Text>
                  </View>
                  {active.next ? (
                    <Text className="text-sm font-black text-white/85">
                      {copy.t('Lesson')} {active.next.index + 1}/{active.module.lessons.length}
                    </Text>
                  ) : null}
                </View>
                <View className="flex-row items-center gap-3">
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="font-rounded text-3xl font-black leading-9 text-white" numberOfLines={2}>
                      {active.module.title}
                    </Text>
                    <Text className="text-base font-bold text-white/85" numberOfLines={2}>
                      {active.next ? active.next.title : copy.t('All lessons completed')}
                    </Text>
                  </View>
                  <RaisedTile face="#FFFFFF" edge="#BFD2FF" size={68} radius={22} depth={5}>
                    {active.progress === 100 ? <TrophyIcon size={44} /> : <MissionIcon size={44} />}
                  </RaisedTile>
                </View>
                <View className="flex-row items-center gap-3">
                  <View className="flex-1">
                    <GameProgress percent={active.progress} color="#FFC800" track="rgba(255,255,255,0.25)" height={14} />
                  </View>
                  <Text className="text-base font-black text-white">{active.progress}%</Text>
                </View>
                <AppButton
                  label={active.progress > 0 ? copy.t('Continue') : copy.t('Start')}
                  variant="secondary"
                  size="lg"
                  uppercase
                  icon={<PlayIcon size={18} color="#2F6BFF" />}
                  onPress={() => openModule(active.module.id)}
                />
              </LinearGradient>
            </View>
          </View>
        </Appear>
      ) : null}

      {/* All modules */}
      {moduleCards.length > 0 ? (
        <Appear index={3} className="gap-3">
          <Text className="px-1 text-sm font-black uppercase tracking-widest text-muted">{copy.t('Your modules')}</Text>
          {moduleCards.map((card, index) => {
            const [face, edge] = MODULE_TONES[index % MODULE_TONES.length];
            const done = card.progress === 100;
            return (
              <Pressable
                key={card.module.id}
                accessibilityRole="button"
                accessibilityLabel={card.module.title}
                onPress={() => openModule(card.module.id)}>
                <View className="flex-row items-center gap-4 rounded-3xl border-2 border-border bg-background p-4" style={{ borderBottomWidth: 5 }}>
                  <RaisedTile face={done ? '#E8F8DC' : tint(face, 0.86)} edge={done ? '#BFE8A3' : tint(face, 0.6)} size={56}>
                    {done ? <LessonBadgeIcon size={38} /> : <BookIcon size={38} />}
                  </RaisedTile>
                  <View className="min-w-0 flex-1 gap-1.5">
                    <Text className="font-rounded text-lg font-black leading-6 text-foreground" numberOfLines={2}>
                      {card.module.title}
                    </Text>
                    <GameProgress percent={card.progress} color={done ? '#58CC02' : face} height={10} />
                    <Text className="text-xs font-bold text-muted">
                      {done ? copy.t('Completed') : `${card.progress}% · ${card.module.lessons.length} ${copy.t('lessons')}`}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </Appear>
      ) : null}

      {/* Join a classroom */}
      <Appear index={4}>
        <View className="flex-row items-center gap-3 rounded-3xl border-2 border-dashed border-border bg-surface-secondary/50 p-4">
          <CapIcon size={44} />
          <View className="flex-1 gap-1">
            <Text className="font-rounded text-lg font-black text-foreground">{copy.t('Have a classroom code?')}</Text>
            <Text className="text-sm text-muted">{copy.t('Join a classroom and see your assignments.')}</Text>
          </View>
          <AppButton label={copy.t('Join')} size="sm" onPress={() => useTabStore.getState().open('student-classes')} />
        </View>
      </Appear>
    </ScrollView>
  );
}

function firstName(name: string): string {
  const clean = name.includes('@') ? name.split('@')[0].split(/[.+_-]/)[0] : name;
  const first = clean.trim().split(/\s+/)[0] ?? '';
  return first ? first[0].toUpperCase() + first.slice(1) : '';
}

function moduleProgress(module: TeacherModule, results: Record<string, ActivityResult>): number {
  const activities = module.lessons.flatMap((l) => l.blocks.filter((b) => b.kind === 'activity'));
  if (activities.length === 0) return 0;
  const done = activities.filter((a) => results[a.id]?.correct).length;
  return Math.round((done / activities.length) * 100);
}

function nextLesson(module: TeacherModule, completed: string[]) {
  const index = module.lessons.findIndex((l) => !completed.includes(`${module.id}:${l.id}`));
  return index >= 0 ? { index, title: module.lessons[index].title } : null;
}
