import { DownloadButton } from '@/features/student/components/download-button';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable as RNPressable, ScrollView, Text, View } from 'react-native';
import { useThemeColor } from 'heroui-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppButton } from '@/components/app-button';
import { CheckIcon, LockIcon, PlayIcon, SparkIcon, StarIcon, TrophyIcon } from '@/components/game/game-icons';
import { RaisedTile } from '@/components/raised';
import { Appear, GameProgress, SpeechBubble } from '@/components/game/game-ui';
import { PlayfulIcon } from '@/components/icon';
import { Lumi, type LumiMood } from '@/components/lumi/lumi';
import { pressHaptic, useSinglePress } from '@/components/pressable';
import { useEnsureStudentData, useStudentStore } from '@/features/student/store/student-store';
import { useCopy } from '@/lib/i18n';
import { playful } from '@/lib/motion';

type NodeState = 'done' | 'new' | 'current' | 'locked';

/** The winding path: how far each node sits from the centre line, in points. */
const ZIGZAG = [0, 46, 70, 46, 0, -46, -70, -46];

const NODE_COLORS: Record<NodeState, { face: string; edge: string }> = {
  done: { face: '#58CC02', edge: '#46A302' },
  new: { face: '#FF9600', edge: '#D97F00' },
  current: { face: '#2F6BFF', edge: '#214FC9' },
  locked: { face: '#E5E9F2', edge: '#C9D0DE' },
};

export default function StudentModuleDetailScreen() {
  const { id, from, classroomId } = useLocalSearchParams<{ id: string; from?: string; classroomId?: string }>();
  const onlineModule = useStudentStore((state) => state.modules.find((item) => item.id === id));
  const cachedModule = useStudentStore((state) => state.downloadedModules.find((item) => item.id === id));
  // The server copy is the freshest (a teacher may have added blocks); the saved copy is for offline.
  const module = onlineModule ?? cachedModule;
  const loaded = useStudentStore((state) => state.loaded);
  const completedLessonIds = useStudentStore((state) => state.completedLessonIds);
  const activityResults = useStudentStore((state) => state.activityResults);
  const copy = useCopy();
  const lockedColors = useLockedColors();
  useEnsureStudentData();
  const [lumiMood, setLumiMood] = useState<LumiMood>('idle');
  const [hint, setHint] = useState<string | null>(null);
  // A shared (Community) module is not in the student's own list: ask the server for it once.
  const fetchModule = useStudentStore((state) => state.fetchModule);
  const [fetched, setFetched] = useState(false);
  useEffect(() => {
    if (module || !loaded || fetched || !id) return;
    void fetchModule(id).finally(() => setFetched(true));
  }, [module, loaded, fetched, id, fetchModule]);

  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => {
      setHint(null);
      setLumiMood('idle');
    }, 2400);
    return () => clearTimeout(timer);
  }, [hint]);

  // Go back to the screen that opened the module. Replacing with a fresh copy of that screen
  // stacked duplicates, so "back" had to be pressed several times to leave.
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else if (from === 'community') router.replace('/community');
    else if (from === 'class' && classroomId) router.replace({ pathname: '/student-class/[id]', params: { id: classroomId } });
    else router.replace('/');
  };

  if (!module) {
    // Opened directly (a reload or a link) before the data arrived: wait instead of bouncing away.
    if (!loaded || !fetched) return <LoadingLumi label={copy.t('Getting your lessons ready...')} />;
    return <Redirect href="/" />;
  }

  const states: NodeState[] = [];
  let currentIndex = -1;
  module.lessons.forEach((lesson, index) => {
    const done = completedLessonIds.includes(`${module.id}:${lesson.id}`);
    if (done) states.push((lesson.newBlockCount ?? 0) > 0 ? 'new' : 'done');
    else if (currentIndex === -1) {
      currentIndex = index;
      states.push('current');
    } else states.push('locked');
  });
  const allDone = currentIndex === -1 && module.lessons.length > 0;
  const activities = module.lessons.flatMap((lesson) => lesson.blocks.filter((block) => block.kind === 'activity'));
  const percent = activities.length
    ? Math.round((activities.filter((a) => activityResults[a.id]?.correct).length / activities.length) * 100)
    : 0;
  const completedCount = states.filter((s) => s === 'done' || s === 'new').length;
  const finishFace = allDone ? '#F9CB45' : lockedColors.face;
  const finishEdge = allDone ? '#E0A21E' : lockedColors.edge;

  const open = (lessonId: string, onlyNew = false) =>
    router.push({
      pathname: '/student-lesson/[id]',
      params: { id: lessonId, moduleId: module.id, ...(onlyNew ? { onlyNew: '1' } : {}) },
    });

  const tapNode = (index: number) => {
    const lesson = module.lessons[index];
    const state = states[index];
    if (state === 'locked') {
      setLumiMood('thinking');
      setHint(copy.t('Finish “{title}” first to unlock this one.', { title: module.lessons[currentIndex]?.title ?? '' }));
      return;
    }
    open(lesson.id, state === 'new');
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 px-5 pb-safe-offset-12 pt-safe-offset-3">
      {/* Header */}
      <Appear index={0} className="flex-row items-center gap-3">
        <AppButton
          label={copy.t('Back')}
          iconOnly
          flat
          size="sm"
          variant="secondary"
          icon={<PlayfulIcon name="arrow-left" size={22} color="#56648A" />}
          onPress={goBack}
        />
        <View className="min-w-0 flex-1">
          <Text className="font-rounded text-2xl font-black leading-7 text-foreground" numberOfLines={2}>{module.title}</Text>
          <Text className="text-sm font-bold text-muted">
            {completedCount}/{module.lessons.length} {copy.t('lessons')} · {copy.t(module.subject)}
          </Text>
        </View>
        <DownloadButton moduleId={module.id} title={module.title} />
      </Appear>

      <Appear index={1} className="flex-row items-center gap-3">
        <View className="flex-1">
          <GameProgress percent={percent} color={percent === 100 ? '#58CC02' : '#2F6BFF'} height={16} />
        </View>
        <Text className="text-base font-black text-foreground">{percent}%</Text>
      </Appear>

      {/* The path */}
      <View className="items-center gap-2 pt-2">
        {module.lessons.map((lesson, index) => {
          const state = states[index];
          const offset = ZIGZAG[index % ZIGZAG.length];
          const isCurrent = state === 'current';
          return (
            <Appear key={lesson.id} index={2 + index} className="w-full items-center">
              <View style={{ transform: [{ translateX: offset }] }} className="items-center">
                {isCurrent ? <StartHere label={completedCount > 0 ? copy.t('Continue') : copy.t('Start here')} /> : null}
                {state === 'new' ? <StartHere label={copy.t('New content')} tone="orange" /> : null}
                <PathNode state={state} onPress={() => tapNode(index)} label={lesson.title} />
                <Text
                  style={{ maxWidth: 160 }}
                  className={`mt-1 text-center text-sm font-bold leading-5 ${state === 'locked' ? 'text-muted' : 'text-foreground'}`}
                  numberOfLines={2}>
                  {lesson.title}
                </Text>
              </View>
              {isCurrent || (allDone && index === module.lessons.length - 1) ? (
                <View
                  pointerEvents="box-none"
                  style={{ position: 'absolute', top: isCurrent ? 34 : 0, [offset >= 0 ? 'left' : 'right']: 0 }}>
                  <Lumi size={96} mood={allDone ? 'cheer' : lumiMood} />
                </View>
              ) : null}
            </Appear>
          );
        })}

        {/* The finish line */}
        <Appear index={2 + module.lessons.length} className="items-center pt-2">
          <View className="items-center justify-center" style={{ width: 150, height: 110 }}>
            {allDone ? (
              <>
                <View pointerEvents="none" style={{ position: 'absolute', left: 6, top: 18 }}><StarIcon size={22} /></View>
                <View pointerEvents="none" style={{ position: 'absolute', right: 4, top: 4 }}><StarIcon size={28} /></View>
                <View pointerEvents="none" style={{ position: 'absolute', right: 14, bottom: 14 }}><StarIcon size={16} /></View>
              </>
            ) : null}
            {/* A medal: a raised gold coin with a white centre, so the trophy always stands out. */}
            <RaisedTile face={finishFace} edge={finishEdge} size={100} radius={50} depth={7}>
              <View className="items-center justify-center rounded-full bg-white" style={{ width: 74, height: 74 }}>
                <TrophyIcon size={50} dim={!allDone} />
              </View>
            </RaisedTile>
          </View>
          <Text className="mt-2 text-center font-rounded text-base font-black text-foreground">
            {allDone ? copy.t('Module completed!') : copy.t('Finish line')}
          </Text>
        </Appear>
      </View>

      {hint ? (
        <View pointerEvents="none" className="absolute inset-x-5 bottom-safe-offset-8">
          <SpeechBubble text={hint} tail="bottom" />
        </View>
      ) : null}
    </ScrollView>
  );
}

/** Locked nodes and the finish line follow the light/dark theme; the game colours do not. */
function useLockedColors() {
  const light = useThemeColor('background').toLowerCase() === '#ffffff';
  return light ? NODE_COLORS.locked : { face: '#1C3670', edge: '#102148' };
}

function PathNode({ state, onPress, label }: { state: NodeState; onPress: () => void; label: string }) {
  const locked = useLockedColors();
  const { face, edge } = state === 'locked' ? locked : NODE_COLORS[state];
  const [pressed, setPressed] = useState(false);
  const firstTap = useSinglePress();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  const size = state === 'current' ? 84 : 72;

  useEffect(() => {
    if (state !== 'current' || reduced) return;
    pulse.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false));
  }, [state, reduced, pulse]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - pulse.get()),
    transform: [{ scale: 1 + pulse.get() * 0.35 }],
  }));

  return (
    <RNPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: state === 'locked' }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={(event) => {
        if (!firstTap(event)) return;
        pressHaptic();
        onPress();
      }}>
      <View style={{ width: size, height: size + 8 }} className="items-center">
        {state === 'current' ? (
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', width: size, height: size, borderRadius: size, borderWidth: 5, borderColor: face }, ring]}
          />
        ) : null}
        {/* Like a game button: the face sinks into its edge while pressed. */}
        <View style={{ position: 'absolute', top: 8, width: size, height: size, borderRadius: size, backgroundColor: edge }} />
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size,
            backgroundColor: face,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateY: pressed ? 6 : 0 }],
          }}>
          <View style={{ position: 'absolute', top: 8, left: size * 0.22, width: size * 0.32, height: 7, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.35)' }} />
          {state === 'done' ? <CheckIcon size={36} /> : null}
          {state === 'new' ? <SparkIcon size={34} /> : null}
          {state === 'current' ? <PlayIcon size={36} /> : null}
          {state === 'locked' ? <LockIcon size={30} /> : null}
        </View>
      </View>
    </RNPressable>
  );
}

/** The little bouncing label above the node you should tap next. */
function StartHere({ label, tone = 'blue' }: { label: string; tone?: 'blue' | 'orange' }) {
  const reduced = useReducedMotion();
  const bob = useSharedValue(0);
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.set(withSpring(1, playful.pop));
    if (reduced) return;
    bob.set(withRepeat(withSequence(withTiming(-5, { duration: 600 }), withTiming(0, { duration: 600 })), -1, false));
  }, [reduced, bob, enter]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: bob.get() }, { scale: enter.get() }] }));
  const color = tone === 'orange' ? '#FF9600' : '#2F6BFF';
  return (
    <Animated.View style={[{ marginBottom: 8, alignItems: 'center' }, style]}>
      <View className="rounded-2xl border-2 bg-background px-4 py-2" style={{ borderColor: '#E4E8F0' }}>
        <Text className="text-sm font-black uppercase tracking-wide" style={{ color }}>{label}</Text>
      </View>
      <View className="-mt-[7px] size-3 rotate-45 border-b-2 border-r-2 bg-background" style={{ borderColor: '#E4E8F0' }} />
    </Animated.View>
  );
}

function LoadingLumi({ label }: { label: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
      <Lumi size={140} mood="thinking" />
      <Text className="text-center font-rounded text-lg font-black text-muted">{label}</Text>
    </View>
  );
}
