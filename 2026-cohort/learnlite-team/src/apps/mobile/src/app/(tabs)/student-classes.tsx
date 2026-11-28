import { router } from 'expo-router';
import { Input } from 'heroui-native';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ClassroomIcon } from '@/components/game/game-icons';
import { Appear, GameProgress, SpeechBubble } from '@/components/game/game-ui';
import { PlayfulIcon } from '@/components/icon';
import { Lumi, type LumiMood } from '@/components/lumi/lumi';
import { Pressable } from '@/components/pressable';
import { RaisedTile, tint } from '@/components/raised';
import { edgeOf, moduleProgress } from '@/features/student/progress';
import { useStudentStore } from '@/features/student/store/student-store';
import { useCopy } from '@/lib/i18n';

export default function StudentClassesScreen() {
  const classrooms = useStudentStore((state) => state.classrooms);
  const assignments = useStudentStore((state) => state.assignments);
  const modules = useStudentStore((state) => state.modules);
  const results = useStudentStore((state) => state.activityResults);
  const loaded = useStudentStore((state) => state.loaded);
  const joinByCode = useStudentStore((state) => state.joinByCode);
  const copy = useCopy();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [mood, setMood] = useState<LumiMood>('idle');

  // Lumi calms down a moment after reacting.
  useEffect(() => {
    if (mood === 'idle') return;
    const timer = setTimeout(() => setMood('idle'), 2800);
    return () => clearTimeout(timer);
  }, [mood]);

  // Per classroom: how many missions, and the average progress across them.
  const cards = useMemo(
    () =>
      classrooms.map((classroom) => {
        const own = assignments.filter((a) => a.classroomId === classroom.id);
        const ownModules = own.map((a) => modules.find((m) => m.id === a.moduleId)).filter((m) => m !== undefined);
        const progress = ownModules.length
          ? Math.round(ownModules.reduce((sum, m) => sum + moduleProgress(m, results), 0) / ownModules.length)
          : 0;
        return { classroom, missions: own.length, progress };
      }),
    [assignments, classrooms, modules, results],
  );

  const submitCode = async () => {
    if (joining || !code.trim()) return;
    setJoining(true);
    const result = await joinByCode(code);
    setJoining(false);
    if ('error' in result) {
      setMood('sad');
      setFeedback({ text: copy.t(result.error), ok: false });
      return;
    }
    setCode('');
    setMood('cheer');
    setFeedback({ text: copy.t('You joined {classroom}! 🎉', { classroom: result.name }), ok: true });
  };

  const bubble =
    feedback?.text ??
    (classrooms.length === 0
      ? copy.t('Ask your teacher for the classroom code and type it here.')
      : copy.t('Here are your classrooms. Pick one to see its missions!'));

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-5 px-5 pb-safe-offset-24 pt-safe-offset-3" keyboardShouldPersistTaps="handled">
      <Appear index={0}>
        <Text className="font-rounded text-4xl font-black text-foreground">{copy.t('My classrooms')}</Text>
      </Appear>

      {/* Join with a code, with Lumi reacting */}
      <Appear index={1}>
        <View className="gap-4 rounded-[28px] border-2 border-border bg-background p-4" style={{ borderBottomWidth: 6 }}>
          <View className="flex-row items-center gap-1">
            <Lumi size={88} mood={mood} />
            <View className="flex-1 pl-2">
              <SpeechBubble text={bubble} />
            </View>
          </View>
          <View className="gap-2">
            <Text className="px-1 text-xs font-black uppercase tracking-widest text-muted">{copy.t('Classroom code')}</Text>
            <Input
              value={code}
              onChangeText={(value) => {
                setCode(value.toUpperCase());
                setFeedback(null);
              }}
              placeholder="LL-XXXXXXXXXXXX"
              autoCapitalize="characters"
              autoCorrect={false}
              onSubmitEditing={submitCode}
              className="h-14 rounded-[18px] border-2 border-border bg-surface px-4 text-center font-mono text-lg font-black tracking-widest text-foreground placeholder:text-muted"
              accessibilityLabel={copy.t('Classroom code')}
            />
            <AppButton
              label={joining ? copy.t('Joining...') : copy.t('Join classroom')}
              size="md"
              uppercase
              disabled={joining || !code.trim()}
              onPress={submitCode}
            />
          </View>
        </View>
      </Appear>

      {/* Classrooms */}
      {cards.length > 0 ? (
        <View className="gap-4">
          {cards.map(({ classroom, missions, progress }, index) => (
            <Appear key={classroom.id} index={2 + index}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={classroom.name}
                onPress={() => router.push({ pathname: '/student-class/[id]', params: { id: classroom.id } })}>
                <View
                  className="overflow-hidden rounded-[28px] border-2 border-border bg-background"
                  style={{ borderBottomWidth: 6 }}>
                  <View className="flex-row items-center gap-3 px-4 py-4" style={{ backgroundColor: classroom.color }}>
                    <RaisedTile face={tint(classroom.color, 0.22)} edge={edgeOf(classroom.color, 0.6)} size={56}>
                      <ClassroomIcon size={30} />
                    </RaisedTile>
                    <View className="min-w-0 flex-1">
                      <Text className="font-rounded text-2xl font-black leading-7 text-white" numberOfLines={2}>
                        {classroom.name}
                      </Text>
                      <Text className="text-sm font-bold text-white/85" numberOfLines={1}>
                        {classroom.grade} · {copy.t(classroom.subject)}
                      </Text>
                    </View>
                    <PlayfulIcon name="arrow-right" size={24} color="#FFFFFF" />
                  </View>
                  <View className="gap-2 px-4 py-4">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-black text-foreground">
                        {missions === 0
                          ? copy.t('No missions yet')
                          : missions === 1
                            ? copy.t('1 mission')
                            : copy.t('{count} missions', { count: missions })}
                      </Text>
                      {missions > 0 ? <Text className="text-sm font-black text-muted">{progress}%</Text> : null}
                    </View>
                    {missions > 0 ? (
                      <GameProgress percent={progress} color={progress === 100 ? '#58CC02' : classroom.color} height={12} />
                    ) : null}
                  </View>
                </View>
              </Pressable>
            </Appear>
          ))}
        </View>
      ) : loaded ? null : (
        <Text className="text-center font-rounded text-base font-black text-muted">{copy.t('Getting your lessons ready...')}</Text>
      )}
    </ScrollView>
  );
}
