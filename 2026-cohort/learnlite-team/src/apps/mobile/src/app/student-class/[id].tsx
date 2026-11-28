import { DownloadButton } from '@/features/student/components/download-button';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { CalendarIcon, LessonBadgeIcon, MissionIcon, PlayIcon, TrophyIcon } from '@/components/game/game-icons';
import { Appear, GameProgress, SpeechBubble } from '@/components/game/game-ui';
import { PlayfulIcon } from '@/components/icon';
import { Lumi } from '@/components/lumi/lumi';
import { Pressable } from '@/components/pressable';
import { RaisedTile, tint } from '@/components/raised';
import { edgeOf, moduleProgress, nextLesson } from '@/features/student/progress';
import { useEnsureStudentData, useStudentStore } from '@/features/student/store/student-store';
import { dueLabel } from '@/features/teacher/utils';
import { useCopy } from '@/lib/i18n';

type MissionState = 'new' | 'progress' | 'done';

const STATE_TONE: Record<MissionState, { bg: string; ink: string }> = {
  new: { bg: '#E8F0FF', ink: '#2F6BFF' },
  progress: { bg: '#FFF4D6', ink: '#C98A00' },
  done: { bg: '#DDF7C9', ink: '#3E8E00' },
};

export default function StudentClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classroom = useStudentStore((state) => state.classrooms.find((item) => item.id === id));
  // Keep the Zustand snapshot stable: filter in a memo, never in the selector.
  const allAssignments = useStudentStore((state) => state.assignments);
  const modules = useStudentStore((state) => state.modules);
  const results = useStudentStore((state) => state.activityResults);
  const completedLessonIds = useStudentStore((state) => state.completedLessonIds);
  const loaded = useStudentStore((state) => state.loaded);
  const copy = useCopy();
  useEnsureStudentData();

  const missions = useMemo(
    () =>
      allAssignments
        .filter((a) => a.classroomId === id)
        .map((assignment) => {
          const module = modules.find((m) => m.id === assignment.moduleId);
          if (!module) return null;
          const progress = moduleProgress(module, results);
          const state: MissionState = progress === 100 ? 'done' : progress > 0 ? 'progress' : 'new';
          return { assignment, module, progress, state, next: nextLesson(module, completedLessonIds) };
        })
        .filter((m) => m !== null),
    [allAssignments, completedLessonIds, id, modules, results],
  );

  if (!classroom) {
    if (!loaded) {
      return (
        <View className="flex-1 items-center justify-center gap-4 bg-background">
          <Lumi size={140} mood="thinking" />
          <Text className="font-rounded text-lg font-black text-muted">{copy.t('Getting your lessons ready...')}</Text>
        </View>
      );
    }
    return <Redirect href="/student-classes" />;
  }

  const done = missions.filter((m) => m.state === 'done').length;
  const pending = missions.length - done;
  const lumiLine =
    missions.length === 0
      ? copy.t('Your teacher has not assigned anything yet. Check back soon!')
      : pending === 0
        ? copy.t('You finished every mission in this class. Amazing!')
        : pending === 1
          ? copy.t('One mission to go. You can do it!')
          : copy.t('{count} missions to go. Let us start with the first one!', { count: pending });
  const edge = edgeOf(classroom.color, 0.7);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-5 pb-safe-offset-10">
      {/* Classroom banner */}
      <Appear index={0}>
        <LinearGradient
          colors={[classroom.color, edge]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
          <View className="pt-safe-offset-3">
            <AppButton
              label={copy.t('Back')}
              iconOnly
              flat
              size="sm"
              variant="secondary"
              icon={<PlayfulIcon name="arrow-left" size={22} color="#56648A" />}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/student-classes'))}
            />
          </View>
          <View className="mt-3 flex-row items-end gap-2">
            <View className="min-w-0 flex-1 gap-1 pb-2">
              <Text className="font-rounded text-3xl font-black leading-9 text-white" numberOfLines={2}>
                {classroom.name}
              </Text>
              <Text className="text-base font-bold text-white/85">
                {classroom.grade} · {copy.t(classroom.subject)}
              </Text>
              <View className="mt-2 flex-row gap-2">
                <View className="rounded-full bg-white/20 px-3 py-1">
                  <Text className="text-xs font-black uppercase tracking-wide text-white">
                    {missions.length === 1 ? copy.t('1 mission') : copy.t('{count} missions', { count: missions.length })}
                  </Text>
                </View>
                <View className="rounded-full bg-white/20 px-3 py-1">
                  <Text className="text-xs font-black uppercase tracking-wide text-white">
                    {copy.t('{count} completed', { count: done })}
                  </Text>
                </View>
              </View>
            </View>
            <Lumi size={104} mood={pending === 0 && missions.length > 0 ? 'cheer' : 'wave'} />
          </View>
        </LinearGradient>
      </Appear>

      <View className="gap-5 px-5">
        <Appear index={1}>
          <SpeechBubble text={lumiLine} tail="bottom" />
        </Appear>

        <Appear index={1}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.t('League')}
            onPress={() => router.push({ pathname: '/student-league/[id]', params: { id: classroom.id } })}
            className="flex-row items-center gap-3 rounded-3xl border-2 border-border px-4 py-3"
            style={{ borderBottomWidth: 5 }}>
            <TrophyIcon size={34} />
            <View className="min-w-0 flex-1">
              <Text className="font-rounded text-lg font-black text-foreground">{copy.t('League')}</Text>
              <Text className="text-sm font-semibold text-muted">{copy.t('Who earns the most XP in your class?')}</Text>
            </View>
            <PlayfulIcon name="arrow-right" size={22} color="#56648A" />
          </Pressable>
        </Appear>

        {missions.length > 0 ? (
          <Text className="px-1 text-sm font-black uppercase tracking-widest text-muted">{copy.t('Class missions')}</Text>
        ) : null}

        {missions.map(({ assignment, module, progress, state, next }, index) => {
          const tone = STATE_TONE[state];
          const due = dueLabel(assignment.dueDate);
          return (
            <Appear key={assignment.id} index={2 + index}>
              <View className="gap-4 rounded-[28px] border-2 border-border bg-background p-4" style={{ borderBottomWidth: 6 }}>
                <View className="flex-row items-start gap-3">
                  <RaisedTile
                    face={state === 'done' ? '#E8F8DC' : tint(classroom.color, 0.86)}
                    edge={state === 'done' ? '#BFE8A3' : tint(classroom.color, 0.62)}
                    size={56}>
                    {state === 'done' ? <LessonBadgeIcon size={38} /> : <MissionIcon size={38} />}
                  </RaisedTile>
                  <View className="min-w-0 flex-1 gap-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: tone.bg }}>
                        <Text className="text-[11px] font-black uppercase tracking-wide" style={{ color: tone.ink }}>
                          {copy.t(state === 'done' ? 'Completed' : state === 'progress' ? 'In progress' : 'New')}
                        </Text>
                      </View>
                      {due ? (
                        <View className="flex-row items-center gap-1">
                          <CalendarIcon size={14} />
                          <Text className="text-xs font-bold text-muted">{copy.t('Due')} {due}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="font-rounded text-xl font-black leading-6 text-foreground" numberOfLines={2}>
                      {module.title}
                    </Text>
                    <Text className="text-sm font-semibold text-muted" numberOfLines={1}>
                      {next ? next.title : copy.t('All lessons completed')}
                    </Text>
                  </View>
                </View>

                {assignment.message ? (
                  <View className="rounded-2xl bg-surface px-4 py-3">
                    <Text className="text-[11px] font-black uppercase tracking-widest text-muted">{copy.t('From your teacher')}</Text>
                    <Text className="mt-1 text-base font-semibold text-foreground">“{assignment.message}”</Text>
                  </View>
                ) : null}

                <View className="flex-row items-center gap-3">
                  <View className="flex-1">
                    <GameProgress percent={progress} color={state === 'done' ? '#58CC02' : classroom.color} height={12} />
                  </View>
                  <Text className="text-sm font-black text-foreground">{progress}%</Text>
                </View>

                <View className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <AppButton
                      label={copy.t(state === 'done' ? 'Review' : state === 'progress' ? 'Continue' : 'Start')}
                      size="md"
                      uppercase
                      icon={<PlayIcon size={16} />}
                      onPress={() =>
                        router.push({ pathname: '/student-module/[id]', params: { id: module.id, from: 'class', classroomId: id } })
                      }
                    />
                  </View>
                  <DownloadButton moduleId={module.id} title={module.title} color="#56648A" />
                </View>
              </View>
            </Appear>
          );
        })}
      </View>
    </ScrollView>
  );
}
