import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BookIcon, CapIcon, ClassroomIcon, FlameIcon, GemIcon, MedalIcon, MissionIcon, PlayIcon, StudentsIcon } from '@/components/game/game-icons';
import { Appear, GameProgress, SpeechBubble } from '@/components/game/game-ui';
import { PlayfulIcon } from '@/components/icon';
import { Lumi, type LumiMood } from '@/components/lumi/lumi';
import { Pressable } from '@/components/pressable';
import { RaisedTile, tint } from '@/components/raised';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { edgeOf, firstName } from '@/features/student/progress';
import { Avatar, StatCard, StatGrid, StatusBadge } from '@/features/teacher/components/teacher-ui';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import type { StudentStatus } from '@/features/teacher/types';
import { missionsLabel, studentsLabel, useCopy } from '@/lib/i18n';

export default function TeacherPanelScreen() {
  const name = useAuthStore((state) => state.name) || 'Docente';
  const classrooms = useTeacherStore((state) => state.classrooms);
  const students = useTeacherStore((state) => state.students);
  const modules = useTeacherStore((state) => state.modules);
  const assignments = useTeacherStore((state) => state.assignments);
  const copy = useCopy();
  const [mood, setMood] = useState<LumiMood>('wave');

  useEffect(() => {
    const timer = setTimeout(() => setMood('idle'), 2600);
    return () => clearTimeout(timer);
  }, []);

  const statusMeta: Record<StudentStatus, { label: string; tone: 'success' | 'warning' | 'muted' }> = {
    'on-track': { label: copy.onTrack, tone: 'success' },
    'needs-help': { label: copy.needsHelp, tone: 'warning' },
    'broken-streak': { label: copy.streakBroken, tone: 'warning' },
    'at-risk': { label: copy.atRisk, tone: 'muted' },
  };

  // A student in two classrooms appears twice in `students`; count people once.
  const people = [...new Map(students.map((s) => [s.id, s])).values()];
  const activeToday = people.filter((s) => s.activeToday).length;
  const attention = people.filter((s) => s.status === 'needs-help' || s.status === 'at-risk' || s.status === 'broken-streak').slice(0, 4);
  const top = [...people].sort((a, b) => b.xp - a.xp).filter((s) => s.xp > 0).slice(0, 3);
  const classXp = people.reduce((sum, s) => sum + s.xp, 0);
  const published = modules.filter((m) => m.status === 'published');
  const firstPublished = published[0];

  const lumiLine =
    classrooms.length === 0
      ? copy.t('Hi {name}! Let us create your first classroom.', { name: firstName(name) })
      : people.length === 0
        ? copy.t('Share your classroom code so students can join.')
        : attention.length > 0
          ? attention.length === 1
            ? copy.t('1 student needs a little help today.')
            : copy.t('{count} students need a little help today.', { count: attention.length })
          : copy.t('Your students are doing great! Keep it up.');

  const assign = () =>
    firstPublished
      ? router.push({ pathname: '/teacher/module/[id]/assign', params: { id: firstPublished.id } })
      : router.push('/teacher-modules');

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-5 px-5 pb-safe-offset-24 pt-safe-offset-3">
      {/* Greeting */}
      <Appear index={0}>
        <Text className="text-sm font-bold text-muted">{copy.goodMorning}</Text>
        <Text className="font-rounded text-3xl font-black leading-9 text-foreground" numberOfLines={1}>
          {firstName(name) || name}
        </Text>
      </Appear>
      <Appear index={1} className="flex-row items-center gap-1">
        <Lumi size={104} mood={mood} />
        <View className="flex-1 pl-2">
          <SpeechBubble text={lumiLine} />
        </View>
      </Appear>

      {/* Today */}
      <Appear index={2}>
        <View className="overflow-hidden rounded-[30px]" style={{ backgroundColor: '#1E4FD8', paddingBottom: 6 }}>
          <LinearGradient colors={['#4A86FF', '#2F6BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 30, padding: 20, gap: 14 }}>
            <View className="absolute -right-10 -top-12 size-44 rounded-full bg-white/10" />
            <View className="self-start rounded-full bg-white/20 px-3 py-1">
              <Text className="text-xs font-black uppercase tracking-widest text-white">{copy.todaySummary}</Text>
            </View>
            <Text className="font-rounded text-2xl font-black leading-8 text-white">
              {copy.t('{active} of {total} students practised today', { active: activeToday, total: people.length })}
            </Text>
            <GameProgress
              percent={people.length ? (activeToday / people.length) * 100 : 0}
              color="#FFC800"
              track="rgba(255,255,255,0.25)"
              height={14}
            />
            <AppButton
              label={copy.t('Assign a module')}
              variant="secondary"
              size="md"
              uppercase
              icon={<PlayIcon size={16} color="#2F6BFF" />}
              onPress={assign}
            />
          </LinearGradient>
        </View>
      </Appear>

      {/* Numbers */}
      <Appear index={3}>
        <StatGrid>
        <StatCard value={`${classrooms.length}`} label={copy.t('Classrooms')} icon={<CapIcon size={40} />} color="#2F6BFF" />
        <StatCard value={`${people.length}`} label={copy.t('Students')} icon={<StudentsIcon size={40} />} color="#6A4BEF" />
        <StatCard value={`${published.length}/${modules.length}`} label={copy.t('Published')} icon={<BookIcon size={40} />} color="#E8761A" />
        <StatCard value={`${classXp}`} label={copy.t('Total XP')} icon={<GemIcon size={40} />} color="#E04848" />
        </StatGrid>
      </Appear>

      {/* Quick actions */}
      <Appear index={4} className="gap-3">
        <Text className="px-1 text-sm font-black uppercase tracking-widest text-muted">{copy.t('Quick actions')}</Text>
        <View className="flex-row gap-3">
          <QuickAction color="#2F6BFF" label={copy.t('New classroom')} icon={<CapIcon size={38} />} onPress={() => router.push('/teacher/class/new')} />
          <QuickAction color="#FF8A1F" label={copy.t('New module')} icon={<BookIcon size={38} />} onPress={() => router.push('/teacher/module/new')} />
          <QuickAction color="#58CC02" label={copy.assign} icon={<MissionIcon size={38} />} onPress={assign} />
        </View>
      </Appear>

      {/* Needs attention */}
      {attention.length > 0 ? (
        <Appear index={5} className="gap-3">
          <Text className="px-1 text-sm font-black uppercase tracking-widest text-muted">{copy.attention}</Text>
          <View className="overflow-hidden rounded-3xl border-2 border-border" style={{ borderBottomWidth: 5 }}>
            {attention.map((student, index) => (
              <Pressable
                key={`${student.id}-${student.classroomId}`}
                accessibilityRole="button"
                accessibilityLabel={student.name}
                onPress={() => router.push({ pathname: '/teacher/class/[id]', params: { id: student.classroomId } })}>
                <View className={`flex-row items-center gap-3 px-4 py-3 ${index < attention.length - 1 ? 'border-b-2 border-border' : ''}`}>
                  <Avatar name={student.name} size={42} />
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-base font-black text-foreground" numberOfLines={1}>{student.name}</Text>
                    <Text className="text-xs font-semibold text-muted" numberOfLines={1}>
                      {classrooms.find((c) => c.id === student.classroomId)?.name ?? ''} · {student.lastActive}
                    </Text>
                    <View className="flex-row">
                      <StatusBadge label={statusMeta[student.status].label} tone={statusMeta[student.status].tone} />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </Appear>
      ) : null}

      {/* Top students */}
      {top.length > 0 ? (
        <Appear index={6} className="gap-3">
          <Text className="px-1 text-sm font-black uppercase tracking-widest text-muted">{copy.t('Top students')}</Text>
          <View className="flex-row gap-3">
            {top.map((student, index) => (
              <View key={student.id} className="flex-1 items-center gap-2 rounded-3xl border-2 border-border px-2 py-4" style={{ borderBottomWidth: 5 }}>
                <View>
                  <Avatar name={student.name} size={52} />
                  <View className="absolute -bottom-2 -right-2">
                    <MedalIcon size={24} place={(index + 1) as 1 | 2 | 3} />
                  </View>
                </View>
                <Text className="text-center text-sm font-black text-foreground" numberOfLines={1}>{firstName(student.name) || student.name}</Text>
                <View className="flex-row items-center gap-1">
                  <GemIcon size={15} />
                  <Text className="text-xs font-black text-muted">{student.xp}</Text>
                  {student.streak > 0 ? (
                    <>
                      <FlameIcon size={13} />
                      <Text className="text-xs font-black text-muted">{student.streak}</Text>
                    </>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </Appear>
      ) : null}

      {/* Classrooms */}
      {classrooms.length > 0 ? (
        <Appear index={7} className="gap-3">
          <Text className="px-1 text-sm font-black uppercase tracking-widest text-muted">{copy.t('Your classrooms')}</Text>
          {classrooms.map((classroom) => {
            const missions = assignments.filter((a) => a.classroomId === classroom.id).length;
            return (
              <Pressable
                key={classroom.id}
                accessibilityRole="button"
                accessibilityLabel={classroom.name}
                onPress={() => router.push({ pathname: '/teacher/class/[id]', params: { id: classroom.id } })}>
                <View className="flex-row items-center gap-3 rounded-3xl px-4 py-4" style={{ backgroundColor: classroom.color, borderBottomWidth: 6, borderBottomColor: edgeOf(classroom.color, 0.65) }}>
                  <View className="size-12 items-center justify-center rounded-2xl bg-white/20">
                    <ClassroomIcon size={26} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="font-rounded text-lg font-black text-white" numberOfLines={1}>{classroom.name}</Text>
                    <Text className="text-xs font-bold text-white/85" numberOfLines={1}>
                      {studentsLabel(copy, classroom.studentIds.length)} · {missionsLabel(copy, missions)}
                    </Text>
                  </View>
                  <PlayfulIcon name="arrow-right" size={22} color="#FFFFFF" />
                </View>
              </Pressable>
            );
          })}
        </Appear>
      ) : null}
    </ScrollView>
  );
}

function QuickAction({ color, label, icon, onPress }: { color: string; label: string; icon: ReactNode; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="flex-1">
      <View className="items-center gap-2 rounded-3xl border-2 border-border px-2 py-4" style={{ borderBottomWidth: 5 }}>
        <RaisedTile face={tint(color, 0.86)} edge={tint(color, 0.6)} size={56}>
          {icon}
        </RaisedTile>
        {/* Room for two lines on every card, so all three cards are the same height. */}
        <View className="h-10 justify-center">
          <Text className="text-center text-sm font-black leading-5 text-foreground" numberOfLines={2}>{label}</Text>
        </View>
      </View>
    </Pressable>
  );
}
