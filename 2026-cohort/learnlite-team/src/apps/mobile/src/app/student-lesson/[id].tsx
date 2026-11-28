import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useThemeColor } from 'heroui-native';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, ScrollView, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import Animated, {
  Easing,
  type SharedValue,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppButton } from '@/components/app-button';
import { PlayfulIcon } from '@/components/icon';
import { Pressable, pressHaptic } from '@/components/pressable';
import { CheckIcon, CrossIcon, FlameIcon, GemIcon, HeartIcon, TargetIcon } from '@/components/game/game-icons';
import { GameProgress, SpeechBubble, useCountUp } from '@/components/game/game-ui';
import { Lumi, type LumiMood } from '@/components/lumi/lumi';
import { ConfettiBurst } from '@/features/student/components/confetti-burst';
import { LivesIndicator } from '@/features/student/components/lives-indicator';
import { setLessonOpen, useEnsureStudentData, useStudentStore } from '@/features/student/store/student-store';
import { fadeIn } from '@/lib/motion';
import { useCopy } from '@/lib/i18n';
import { playSound } from '@/lib/sounds';
import type { Block } from '@/features/teacher/types';
import type { LessonSummary } from '@/features/student/types/student';

export default function StudentLessonScreen() {
  const { id, moduleId, lessonId, onlyNew } = useLocalSearchParams<{ id: string; moduleId: string; lessonId?: string; onlyNew?: string }>();
  const onlineModule = useStudentStore((state) => state.modules.find((item) => item.id === moduleId));
  const cachedModule = useStudentStore((state) => state.downloadedModules.find((item) => item.id === moduleId));
  // The server copy is the freshest; the saved copy is for offline use.
  const module = onlineModule ?? cachedModule;
  const loaded = useStudentStore((state) => state.loaded);
  useEnsureStudentData();
  const [blockIndex, setBlockIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [heartBreak, setHeartBreak] = useState(false);
  const [classification, setClassification] = useState<Record<string, string>>({});
  const [selectedClassifyItem, setSelectedClassifyItem] = useState<string | null>(null);
  const [orderedSteps, setOrderedSteps] = useState<string[]>([]);
  const [scrollLocked, setScrollLocked] = useState(false);
  // Which function button (by position in the pairs) each concept is joined to. Two functions
  // can have the same text, so buttons are identified by position, never by their text.
  const [pairMatches, setPairMatches] = useState<Record<string, number>>({});
  const [selectedPairLeft, setSelectedPairLeft] = useState<string | null>(null);
  // The server runs the lesson: it grades each answer and counts XP, hearts and streak.
  const [attemptId, setAttemptId] = useState<string | null>(null);
  // Which blocks this run covers: all of them, or only the ones added since the lesson was finished.
  const [runBlockIds, setRunBlockIds] = useState<string[] | null>(null);
  const [serverExplanation, setServerExplanation] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [earned, setEarned] = useState(0);
  const [cheers, setCheers] = useState(0);
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  // All hearts lost: the lesson starts again from the first block.
  const [failed, setFailed] = useState(false);
  const streak = useStudentStore((state) => state.streak);
  // True while a request for the current step is in flight, so a double tap sends only one.
  const busy = useRef(false);
  const hearts = useStudentStore((state) => state.hearts ?? state.maxHearts);
  const maxHearts = useStudentStore((state) => state.maxHearts ?? 5);
  const startLesson = useStudentStore((state) => state.startLesson);
  const refreshStudent = useStudentStore((state) => state.refresh);
  const answerBlock = useStudentStore((state) => state.answerBlock);
  const continueLesson = useStudentStore((state) => state.continueLesson);
  const finishLesson = useStudentStore((state) => state.finishLesson);
  const copy = useCopy();
  const accent = useThemeColor('accent');
  const muted = useThemeColor('muted');

  const lesson = module?.lessons.find((item) => item.id === lessonId)
    ?? module?.lessons.find((item) => item.id === id)
    ?? module?.lessons.find((item) => item.blocks.some((block) => block.id === id));
  const blocks = runBlockIds && lesson ? lesson.blocks.filter((block) => runBlockIds.includes(block.id)) : (lesson?.blocks ?? []);
  const currentBlock = blocks[blockIndex];
  useEffect(() => {
    if (!lesson) return;
    setBlockIndex(0);
  }, [id, lesson?.id]);

  // Background refreshes pause while a lesson is open, and catch up when it closes.
  useEffect(() => {
    setLessonOpen(true);
    return () => {
      setLessonOpen(false);
      void refreshStudent();
    };
  }, []);

  /** Out of hearts: a brand-new run from the first block, with five fresh hearts. */
  const restartLesson = async () => {
    if (!module || !lesson) return;
    const fresh = await startLesson(module.id, lesson.id, { onlyNew: onlyNew === '1' });
    if (!fresh) return;
    setAttemptId(fresh.attemptId);
    setRunBlockIds(fresh.blockIds);
    setBlockIndex(0);
    setResult(null);
    setServerExplanation(null);
    setAnswer('');
    setFailed(false);
  };

  /** The screen and the server disagree about where the student is: ask the server and follow it. */
  const resync = async () => {
    if (!module || !lesson) return;
    const current = await startLesson(module.id, lesson.id, { onlyNew: onlyNew === '1', resume: true });
    if (!current) return;
    setAttemptId(current.attemptId);
    setRunBlockIds(current.blockIds);
    setBlockIndex(current.currentPosition);
    setResult(null);
    setServerExplanation(null);
  };

  // Start a fresh run on the server each time the lesson opens.
  useEffect(() => {
    if (!module || !lesson) return;
    let active = true;
    setAttemptId(null);
    setRunBlockIds(null);
    setBlockIndex(0);
    void startLesson(module.id, lesson.id, { onlyNew: onlyNew === '1' }).then((started) => {
      if (!active) return;
      setAttemptId(started?.attemptId ?? null);
      setRunBlockIds(started?.blockIds ?? null);
      setBlockIndex(0);
    });
    return () => {
      active = false;
    };
  }, [module?.id, lesson?.id, onlyNew]);

  useEffect(() => {
    setAnswer('');
    // Start each visit as a fresh run. Historical answers remain persisted for
    // XP and progress, but they must not pre-fill the new attempt.
    setResult(null);
    setServerExplanation(null);
    setCelebrate(false);
    setHeartBreak(false);
    setClassification({});
    setSelectedClassifyItem(null);
    setOrderedSteps(shuffleSteps(currentBlock?.steps ?? []));
    setPairMatches({});
    setSelectedPairLeft(null);
  }, [currentBlock?.id]);

  useEffect(() => {
    if (!heartBreak) return;
    const timeout = setTimeout(() => setHeartBreak(false), 1000);
    return () => clearTimeout(timeout);
  }, [heartBreak]);

  if (!module || !lesson || !currentBlock) {
    // Opened directly (a reload or a link) before the data arrived: wait instead of bouncing away.
    if (!loaded) {
      return (
        <View className="flex-1 items-center justify-center gap-4 bg-background">
          <Lumi size={140} mood="thinking" />
          <Text className="font-rounded text-lg font-black text-muted">{copy.t('Getting your lessons ready...')}</Text>
        </View>
      );
    }
    return <Redirect href={moduleId ? `/student-module/${moduleId}` : '/'} />;
  }
  // Playing only the new blocks: wait for the server to say which ones, so the full lesson never flashes.
  if (onlyNew === '1' && !runBlockIds) return <View className="flex-1 bg-background" />;

  const options = currentBlock.activityType === 'true-false'
    ? [copy.t('True'), copy.t('False')]
    : currentBlock.options ?? currentBlock.pairs?.map((pair) => pair.left) ?? currentBlock.steps ?? [];
  const optionValues = currentBlock.activityType === 'true-false'
    ? ['true', 'false']
    : currentBlock.activityType === 'multiple-choice'
      ? options.map((_, index) => `${index}`)
      : options;
  const isActivity = currentBlock.kind === 'activity';
  const classifyItems = currentBlock.activityType === 'classify'
    ? (currentBlock.categories ?? []).flatMap((category) => category.items)
    : [];
  const hasResponse = currentBlock.activityType === 'classify'
    ? classifyItems.length > 0 && classifyItems.every((item) => Boolean(classification[item]))
    : currentBlock.activityType === 'order-steps'
      ? orderedSteps.length === (currentBlock.steps?.length ?? 0) && orderedSteps.length > 0
      : currentBlock.activityType === 'match-pairs'
        ? (currentBlock.pairs?.length ?? 0) > 0 && Object.keys(pairMatches).length === (currentBlock.pairs?.length ?? 0)
    : Boolean(answer);
  const progress = Math.round(((blockIndex + 1) / blocks.length) * 100);

  const lumiMood: LumiMood =
    result === true ? 'cheer' : result === false ? 'sad' : isActivity && hasResponse ? 'thinking' : 'idle';
  const PRAISE = ['Great job!', 'You nailed it!', 'Brilliant!', 'That is it!', 'Amazing!'];
  const lumiLine =
    result === true
      ? copy.t(PRAISE[cheers % PRAISE.length])
      : result === false
        ? copy.t('Almost! Look again, you can do it.')
        : currentBlock.kind === 'theory'
          ? currentBlock.lumiComment || copy.t('Read this with me!')
          : currentBlock.kind === 'material'
            ? copy.t('Here is something useful to keep.')
            : currentBlock.kind === 'link'
              ? copy.t('Take a look at this link.')
              : currentBlock.instruction || copy.t('You can do it! Choose your answer.');

  /** The answer in the shape the API expects for this activity type. */
  const answerPayload = (): Record<string, unknown> | null => {
    switch (currentBlock.activityType) {
      case 'multiple-choice':
        return { selectedIndex: Number(answer) };
      case 'true-false':
        return { value: answer.trim().toLowerCase() === 'true' };
      case 'match-pairs':
        return {
          matches: Object.entries(pairMatches).map(([left, slot]) => ({ left, right: currentBlock.pairs?.[slot]?.right ?? '' })),
        };
      case 'order-steps':
        return { order: orderedSteps };
      case 'fill-blanks':
        return { value: answer };
      case 'classify':
        return { assignments: classifyItems.map((item) => ({ item, category: classification[item] })) };
      default:
        return null;
    }
  };

  const check = async () => {
    if (!isActivity || !hasResponse || checking || busy.current) return;
    const payload = answerPayload();
    if (!attemptId || !payload) return;
    busy.current = true;
    setChecking(true);
    const outcome = await answerBlock(attemptId, currentBlock.id, payload, currentBlock.xp ?? 10);
    setChecking(false);
    busy.current = false;
    if (outcome === 'resync') {
      await resync();
      return;
    }
    if (!outcome) return; // the reason is shown in the banner (or hearts ran out)
    setResult(outcome.correct);
    setServerExplanation(outcome.explanation || null);
    setEarned(outcome.earnedXp);
    if (outcome.lessonFailed) {
      playSound('failFinal');
      setHeartBreak(true);
      setFailed(true);
      return;
    }
    if (outcome.correct) {
      playSound('correct');
      setCheers((n) => n + 1);
      setCelebrate(true);
    } else {
      playSound(outcome.hearts.current <= 0 ? 'failFinal' : 'fail');
      setHeartBreak(true);
    }
  };

  const continueToNext = async () => {
    if (isActivity && result !== true) return;
    if (!attemptId || busy.current) return;
    busy.current = true;
    try {
      const isLast = blockIndex >= blocks.length - 1;
      if (isLast) {
        const finished = await finishLesson(attemptId, module.id, lesson.id);
        if (!finished) {
          await resync(); // out of step, or not everything was answered: follow the server
          return;
        }
        playSound('correctFinal');
        setSummary(finished); // the celebration screen; it leads back to the module
        return;
      }
      // A correct answer already moved the server on; theory blocks need an explicit step.
      if (!isActivity && !(await continueLesson(attemptId))) {
        await resync();
        return;
      }
      setBlockIndex((index) => index + 1);
    } finally {
      busy.current = false;
    }
  };

  const goToModule = () => {
    // The lesson was opened from the module screen: return to it instead of stacking a new one.
    if (router.canGoBack()) {
      router.back();
    } else if (moduleId) {
      router.replace({ pathname: '/student-module/[id]', params: { id: moduleId } });
    } else {
      router.replace('/student-classes');
    }
  };

  const retryActivity = () => {
    setClassification({});
    setSelectedClassifyItem(null);
    setOrderedSteps(shuffleSteps(currentBlock?.steps ?? []));
    setPairMatches({});
    setSelectedPairLeft(null);
    setAnswer('');
    setResult(null);
    setCelebrate(false);
    setHeartBreak(false);
  };

  return (
    <View className="relative flex-1 bg-background">
      <ConfettiBurst visible={celebrate} />
      <ScrollLockContext.Provider value={setScrollLocked}>
      <ScrollView scrollEnabled={!scrollLocked} className="flex-1" contentContainerClassName="gap-4 px-5 pb-safe-offset-8 pt-safe-offset-3">
        <View className="flex-row items-center gap-3">
          <AppButton
            label={copy.t('Back')}
            iconOnly
            flat
            size="sm"
            variant="secondary"
            icon={<PlayfulIcon name="arrow-left" size={22} color={muted} />}
            onPress={goToModule}
          />
          <View className="min-w-0 flex-1">
            <GameProgress percent={progress} height={16} />
          </View>
          <LivesIndicator hearts={hearts} maxHearts={maxHearts} broken={heartBreak} />
        </View>

        {/* Lumi comments on every step */}
        <View className="flex-row items-end gap-1">
          <Lumi size={96} mood={lumiMood} replay={cheers} />
          <View className="flex-1 pb-8 pl-2">
            <SpeechBubble text={lumiLine} />
          </View>
        </View>

        <Animated.View entering={fadeIn} key={currentBlock.id} className="gap-5">
          {currentBlock.kind === 'theory' ? <TheoryBlock block={currentBlock} copy={copy} /> : null}
          {currentBlock.kind === 'material' ? <MaterialBlock block={currentBlock} copy={copy} /> : null}
          {isActivity ? (
            <ActivityBlock
              block={{ ...currentBlock, explanation: serverExplanation ?? currentBlock.explanation }}
              options={options}
              optionValues={optionValues}
              answer={answer}
              result={result}
              accent={accent}
              copy={copy}
              classification={classification}
              orderedSteps={orderedSteps}
              pairMatches={pairMatches}
              selectedPairLeft={selectedPairLeft}
              selectedClassifyItem={selectedClassifyItem}
              onAnswer={(value) => {
                setAnswer(value);
                setResult(null);
                setCelebrate(false);
              }}
              onClassifyItem={(item) => {
                setSelectedClassifyItem(item);
                setResult(null);
                setCelebrate(false);
              }}
              onRemoveClassifyItem={(item) => {
                setClassification((current) => {
                  const next = { ...current };
                  delete next[item];
                  return next;
                });
                setSelectedClassifyItem(null);
                setAnswer('');
                setResult(null);
              }}
              onClassifyCategory={(category, draggedItem) => {
                const item = draggedItem ?? selectedClassifyItem;
                if (!item) return;
                setClassification((current) => ({ ...current, [item]: category }));
                playSound('drop');
                setSelectedClassifyItem(null);
                setAnswer('classification');
                setResult(null);
                setCelebrate(false);
              }}
              onOrderChange={(steps) => {
                setOrderedSteps(steps);
                setAnswer('order-steps');
                setResult(null);
                setCelebrate(false);
              }}
              onPairSelectLeft={(left) => {
                setSelectedPairLeft((current) => current === left ? null : left);
                setResult(null);
                setCelebrate(false);
              }}
              onPairSelectRight={(slot) => {
                if (!selectedPairLeft) return;
                setPairMatches((current) => {
                  // One function button holds one concept, and a concept uses one button.
                  const next = Object.fromEntries(
                    Object.entries(current).filter(([left, taken]) => left !== selectedPairLeft && taken !== slot),
                  );
                  return { ...next, [selectedPairLeft]: slot };
                });
                setSelectedPairLeft(null);
                setAnswer('match-pairs');
                setResult(null);
                setCelebrate(false);
              }}
            />
          ) : null}
        </Animated.View>
      </ScrollView>
      </ScrollLockContext.Provider>

      {isActivity && result !== null && !failed ? (
        <FeedbackPanel
          correct={result}
          earned={earned}
          explanation={serverExplanation ?? undefined}
          copy={copy}
          action={
            result ? (
              <AppButton
                label={blockIndex >= blocks.length - 1 ? copy.t('Finish lesson') : copy.t('Continue')}
                size="lg"
                uppercase
                colors={{ face: '#58CC02', edge: '#46A302', label: '#FFFFFF' }}
                onPress={continueToNext}
              />
            ) : hearts <= 0 ? (
              <AppButton label={copy.t('Start again')} size="lg" uppercase onPress={() => void restartLesson()} />
            ) : (
              <AppButton label={copy.t('Try again')} size="lg" uppercase colors={{ face: '#FF4B4B', edge: '#D93636', label: '#FFFFFF' }} onPress={retryActivity} />
            )
          }
        />
      ) : (
      <View className="border-t border-border bg-background px-5 pb-safe-offset-4 pt-3">
        {isActivity && result !== true && hearts <= 0 ? (
          <View className="items-center gap-2">
            <Text className="text-sm font-bold text-muted">{copy.t('Out of hearts')}</Text>
            <AppButton label={copy.t('Start again')} size="lg" uppercase onPress={() => void restartLesson()} />
          </View>
        ) : isActivity && result === false ? (
          <AppButton label={copy.t('Try again')} size="lg" onPress={retryActivity} />
        ) : isActivity && result !== true ? (
          <AppButton label={checking || !attemptId ? copy.t('Checking...') : copy.t('Check answer')} size="lg" uppercase disabled={!hasResponse || hearts <= 0 || checking || !attemptId} onPress={check} />
        ) : (
          <AppButton
            label={blockIndex >= blocks.length - 1 ? copy.t('Finish lesson') : copy.t('Continue')}
            size="lg"
            uppercase
            onPress={continueToNext}
          />
        )}
      </View>
      )}

      {summary ? (
        <LessonComplete summary={summary} streak={streak} copy={copy} onContinue={goToModule} />
      ) : null}
      {failed ? <OutOfHearts copy={copy} onRestart={() => void restartLesson()} onLeave={goToModule} /> : null}
    </View>
  );
}


function TheoryBlock({ block, copy }: { block: Block; copy: ReturnType<typeof useCopy> }) {
  return (
    <View className="gap-4">
      <Text className="text-sm font-black uppercase tracking-wide text-accent">{copy.t('Theory')}</Text>
      <Text className="font-rounded text-3xl font-black text-foreground">{block.title}</Text>
      <Text className="text-lg leading-8 text-foreground">{block.body ?? copy.t('There is no text in this material yet.')}</Text>
    </View>
  );
}

function MaterialBlock({ block, copy }: { block: Block; copy: ReturnType<typeof useCopy> }) {
  return (
    <View className="items-center gap-4 py-5">
      <Text className="text-sm font-black uppercase tracking-wide text-accent">{copy.t('Material')}</Text>
      <View className="size-20 items-center justify-center rounded-3xl bg-surface"><PlayfulIcon name="bookshelf" size={40} color="#F08A24" /></View>
      <Text className="text-center text-2xl font-black text-foreground">{block.fileName ?? block.title}</Text>
      <Text className="text-center text-base text-muted">{block.fileSize ?? copy.t('Saved inside this module for offline study.')}</Text>
    </View>
  );
}

function ActivityBlock({
  block,
  options,
  optionValues,
  answer,
  result,
  accent,
  copy,
  classification,
  orderedSteps,
  pairMatches,
  selectedPairLeft,
  selectedClassifyItem,
  onAnswer,
  onClassifyItem,
  onRemoveClassifyItem,
  onClassifyCategory,
  onOrderChange,
  onPairSelectLeft,
  onPairSelectRight,
}: {
  block: Block;
  options: string[];
  optionValues: string[];
  answer: string;
  result: boolean | null;
  accent: string;
  copy: ReturnType<typeof useCopy>;
  classification: Record<string, string>;
  orderedSteps: string[];
  pairMatches: Record<string, number>;
  selectedPairLeft: string | null;
  selectedClassifyItem: string | null;
  onAnswer: (value: string) => void;
  onClassifyItem: (item: string) => void;
  onRemoveClassifyItem: (item: string) => void;
  onClassifyCategory: (category: string, item?: string) => void;
  onOrderChange: (steps: string[]) => void;
  onPairSelectLeft: (left: string) => void;
  onPairSelectRight: (slot: number) => void;
}) {
  const activityLabel = block.activityType === 'true-false'
    ? 'True or false'
    : block.activityType === 'order-steps'
      ? 'Order steps'
    : block.activityType === 'match-pairs'
      ? 'Match pairs'
    : block.activityType === 'fill-blanks'
      ? 'Fill in the blanks'
      : block.activityType === 'classify'
        ? 'Classify'
        : 'Choose one answer';

  return (
    <View className="gap-5">
      <View className="gap-2">
        <Text className="text-sm font-black uppercase tracking-wide text-accent">{copy.t(activityLabel)}</Text>
        <Text className="font-rounded text-3xl font-black leading-9 text-foreground">{block.prompt ?? block.title}</Text>
      </View>
      {block.hint ? (
        <View className="flex-row items-center gap-3 rounded-2xl border-2 border-border bg-surface p-4">
          <PlayfulIcon name="creation" size={25} color={accent} />
          <Text className="flex-1 text-base text-muted">{copy.t('Hint')}: {block.hint}</Text>
        </View>
      ) : null}
      {block.activityType === 'classify' ? (
        <ClassifyActivity
          block={block}
          copy={copy}
          result={result}
          classification={classification}
          selectedItem={selectedClassifyItem}
          onSelectItem={onClassifyItem}
          onRemoveItem={onRemoveClassifyItem}
          onSelectCategory={onClassifyCategory}
        />
      ) : block.activityType === 'order-steps' ? (
        <OrderStepsActivity
          copy={copy}
          steps={block.steps ?? []}
          orderedSteps={orderedSteps}
          result={result}
          onChange={onOrderChange}
        />
      ) : block.activityType === 'match-pairs' ? (
        <MatchPairsActivity
          copy={copy}
          pairs={block.pairs ?? []}
          matches={pairMatches}
          selectedLeft={selectedPairLeft}
          result={result}
          onSelectLeft={onPairSelectLeft}
          onSelectRight={onPairSelectRight}
        />
      ) : block.activityType === 'fill-blanks' ? (
        <TextInput
          value={answer}
          onChangeText={(value) => onAnswer(value)}
          placeholder={copy.t('Write your answer')}
          autoCapitalize="none"
          className="h-16 rounded-[18px] border-2 border-border bg-surface px-4 text-lg text-foreground"
        />
      ) : (
        <View className="gap-3">
          {options.map((option, index) => {
            const value = optionValues[index] ?? option;
            const chosen = answer === value;
            const verdict = chosen && result !== null
              ? result
                ? { face: '#D7FFB8', edge: '#58CC02', label: '#3E8E00' }
                : { face: '#FFDFE0', edge: '#FF4B4B', label: '#D62C2C' }
              : undefined;
            return <AppButton key={`${value}-${index}`} label={option} variant={chosen ? 'primary' : 'secondary'} colors={verdict} size="lg" className="w-full" onPress={() => onAnswer(value)} />;
          })}
        </View>
      )}
    </View>
  );
}

/** Positions 0..n-1 in random order, never the original order when there is more than one. */
function shuffledSlots(count: number): number[] {
  const slots = Array.from({ length: count }, (_, i) => i);
  for (let i = slots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  if (count > 1 && slots.every((slot, i) => slot === i)) slots.push(slots.shift() as number);
  return slots;
}

function MatchPairsActivity({
  copy,
  pairs,
  matches,
  selectedLeft,
  result,
  onSelectLeft,
  onSelectRight,
}: {
  copy: ReturnType<typeof useCopy>;
  pairs: NonNullable<Block['pairs']>;
  matches: Record<string, number>;
  selectedLeft: string | null;
  result: boolean | null;
  onSelectLeft: (left: string) => void;
  onSelectRight: (slot: number) => void;
}) {
  // The function column is shuffled once per activity: in the original order each function
  // would sit beside its own concept and the exercise would solve itself.
  const [order] = useState(() => shuffledSlots(pairs.length));
  const leftOf = (slot: number) => Object.entries(matches).find(([, taken]) => taken === slot)?.[0];
  const rightTextOf = (left: string) => pairs.find((pair) => pair.left === left)?.right;

  return (
    <View className="gap-3">
      <Text className="text-base font-bold text-muted">
        {selectedLeft ? copy.t('Now choose its function.') : copy.t('Tap a concept, then its function.')}
      </Text>
      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1 gap-2">
          <Text className="px-1 text-xs font-black uppercase tracking-wide text-muted">{copy.t('Concept')}</Text>
          {pairs.map((pair) => {
            const slot = matches[pair.left];
            const matched = slot !== undefined;
            // Right when the function it is joined to says the same as its own function.
            const isCorrect = result === null ? null : matched && pairs[slot].right === pair.right;
            return (
              <Pressable
                key={`left-${pair.left}`}
                isDisabled={result !== null}
                onPress={() => onSelectLeft(pair.left)}
                accessibilityRole="button"
                accessibilityLabel={pair.left}>
                <View className={`min-h-16 justify-center rounded-2xl border-2 px-3 py-3 ${
                  isCorrect === true
                    ? 'border-success bg-success/10'
                    : isCorrect === false
                      ? 'border-warning bg-warning/10'
                      : selectedLeft === pair.left
                        ? 'border-accent bg-accent/10'
                        : matched
                          ? 'border-accent/40 bg-accent/5'
                          : 'border-border bg-surface'
                }`}>
                  <Text className="text-center text-sm font-black text-foreground">{pair.left}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View className="min-w-0 flex-1 gap-2">
          <Text className="px-1 text-xs font-black uppercase tracking-wide text-muted">{copy.t('Function')}</Text>
          {order.map((slot) => {
            const text = pairs[slot].right;
            const owner = leftOf(slot);
            const taken = owner !== undefined;
            const isCorrect = result === null ? null : taken && rightTextOf(owner) === text;
            return (
              <Pressable
                key={`right-${slot}`}
                isDisabled={result !== null || !selectedLeft}
                onPress={() => onSelectRight(slot)}
                accessibilityRole="button"
                accessibilityLabel={text}>
                <View className={`min-h-16 justify-center rounded-2xl border-2 px-3 py-3 ${
                  isCorrect === true
                    ? 'border-success bg-success/10'
                    : isCorrect === false
                      ? 'border-warning bg-warning/10'
                      : taken
                        ? 'border-accent/40 bg-accent/5'
                        : selectedLeft
                          ? 'border-accent/50 bg-background'
                          : 'border-border bg-surface'
                }`}>
                  <Text className="text-center text-sm font-black text-foreground">{text}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const STEP_GAP = 12;
const STEP_HEIGHT = 64;

/** Top of the slot at `position`, given where every step currently is and how tall it is. */
function slotTop(position: number, slots: number[], heights: number[]) {
  'worklet';
  let top = 0;
  for (let id = 0; id < slots.length; id++) {
    if (slots[id] < position) top += heights[id] + STEP_GAP;
  }
  return top;
}

/** Lets a step being dragged freeze the page scroll underneath it. */
const ScrollLockContext = createContext<(locked: boolean) => void>(() => undefined);

/**
 * Ordering with a live drag: press a step for a moment, then move it. The other steps slide out
 * of the way as it passes them, so it already sits in its new place before it is released, and
 * it stays slightly see-through to show that it is in your hand. There is no exact drop target.
 */
function OrderStepsActivity({
  copy,
  steps,
  orderedSteps,
  result,
  onChange,
}: {
  copy: ReturnType<typeof useCopy>;
  steps: string[];
  orderedSteps: string[];
  result: boolean | null;
  onChange: (steps: string[]) => void;
}) {
  const lockScroll = useContext(ScrollLockContext);
  // Every step keeps an id for as long as the activity is on screen (two steps can share a text).
  const [items, setItems] = useState(orderedSteps);
  const [order, setOrder] = useState(() => orderedSteps.map((_, id) => id)); // step ids, top to bottom
  const slots = useSharedValue(orderedSteps.map((_, id) => id)); // position of each step id
  const heights = useSharedValue(orderedSteps.map(() => STEP_HEIGHT));
  const measured = useRef<number[]>(orderedSteps.map(() => STEP_HEIGHT));
  const dragId = useSharedValue(-1);
  const startSlots = useSharedValue<number[]>([]);
  const dragStartTop = useSharedValue(0);
  const dragY = useSharedValue(0);

  // A fresh shuffle from the screen (a new block, "start again") replaces what is shown.
  const shown = order.map((id) => items[id]);
  const incoming = orderedSteps;
  const outOfSync = shown.length !== incoming.length || shown.some((label, index) => label !== incoming[index]);
  useEffect(() => {
    if (!outOfSync) return;
    const identity = incoming.map((_, id) => id);
    measured.current = incoming.map(() => STEP_HEIGHT);
    heights.set(measured.current);
    slots.set(identity);
    setItems(incoming);
    setOrder(identity);
  }, [outOfSync, incoming, heights, slots]);

  const commit = (nextSlots: number[]) => {
    const next = nextSlots.map((_, position) => nextSlots.indexOf(position));
    setOrder(next);
    onChange(next.map((id) => items[id]));
    lockScroll(false);
  };
  const grabbed = () => {
    lockScroll(true);
    pressHaptic();
  };

  const container = useAnimatedStyle(() => ({
    height: slotTop(slots.get().length, slots.get(), heights.get()) - STEP_GAP,
  }));

  return (
    <View className="gap-3">
      <Text className="text-base font-bold text-muted">{copy.t('Hold a step and move it to its place.')}</Text>
      <Animated.View style={container}>
        {items.map((label, id) => (
          <OrderStep
            key={id}
            id={id}
            label={label}
            position={order.indexOf(id)}
            status={
              result === null ? 'neutral' : items[order[order.indexOf(id)]] === steps[order.indexOf(id)] ? 'correct' : 'incorrect'
            }
            disabled={result !== null}
            slots={slots}
            heights={heights}
            dragId={dragId}
            startSlots={startSlots}
            dragStartTop={dragStartTop}
            dragY={dragY}
            onMeasure={(height) => {
              measured.current[id] = height;
              heights.set([...measured.current]);
            }}
            onGrab={grabbed}
            onRelease={commit}
          />
        ))}
      </Animated.View>
    </View>
  );
}

function OrderStep({
  id,
  label,
  position,
  status,
  disabled,
  slots,
  heights,
  dragId,
  startSlots,
  dragStartTop,
  dragY,
  onMeasure,
  onGrab,
  onRelease,
}: {
  id: number;
  label: string;
  position: number;
  status: 'neutral' | 'correct' | 'incorrect';
  disabled: boolean;
  slots: SharedValue<number[]>;
  heights: SharedValue<number[]>;
  dragId: SharedValue<number>;
  startSlots: SharedValue<number[]>;
  dragStartTop: SharedValue<number>;
  dragY: SharedValue<number>;
  onMeasure: (height: number) => void;
  onGrab: () => void;
  onRelease: (slots: number[]) => void;
}) {
  const lift = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activateAfterLongPress(140)
    .onStart(() => {
      'worklet';
      dragId.set(id);
      startSlots.set([...slots.get()]);
      dragStartTop.set(slotTop(slots.get()[id], slots.get(), heights.get()));
      dragY.set(0);
      lift.set(withTiming(1, { duration: 140 }));
      scheduleOnRN(onGrab);
    })
    .onUpdate((event) => {
      'worklet';
      dragY.set(event.translationY);
      // Where the finger is, measured against the other steps as they were when this one was picked up.
      const before = startSlots.get();
      const all = heights.get();
      const center = dragStartTop.get() + event.translationY + all[id] / 2;
      let target = 0;
      for (let other = 0; other < before.length; other++) {
        if (other === id) continue;
        const middle = slotTop(before[other], before, all) + all[other] / 2;
        if (middle < center) target += 1;
      }
      const next = [...before];
      for (let other = 0; other < before.length; other++) {
        if (other === id) continue;
        const rank = before[other] - (before[other] > before[id] ? 1 : 0); // place among the other steps
        next[other] = rank < target ? rank : rank + 1; // leave a gap where the dragged one will land
      }
      next[id] = target;
      const now = slots.get();
      if (next.some((value, index) => value !== now[index])) slots.set(next);
    })
    .onFinalize(() => {
      'worklet';
      if (dragId.get() !== id) return;
      dragId.set(-1);
      lift.set(withTiming(0, { duration: 160 }));
      scheduleOnRN(onRelease, slots.get());
    });

  const style = useAnimatedStyle(() => {
    const mine = slots.get()[id];
    const dragging = dragId.get() === id;
    const resting = slotTop(mine, slots.get(), heights.get());
    return {
      zIndex: dragging ? 20 : 0,
      opacity: 1 - 0.3 * lift.get(),
      transform: [
        { translateY: dragging ? dragStartTop.get() + dragY.get() : withTiming(resting, { duration: 180 }) },
        { scale: 1 + 0.03 * lift.get() },
      ],
      shadowOpacity: 0.25 * lift.get(),
      elevation: 8 * lift.get(),
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={(event) => onMeasure(event.nativeEvent.layout.height)}
        accessibilityRole="button"
        accessibilityLabel={`${position + 1}. ${label}`}
        style={[{ position: 'absolute', left: 0, right: 0, top: 0, shadowColor: '#000', shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }, style]}
        className={`min-h-16 flex-row items-center gap-3 rounded-2xl border-2 px-4 py-3 ${
          status === 'correct'
            ? 'border-success bg-success/10'
            : status === 'incorrect'
              ? 'border-warning bg-warning/10'
              : 'border-border bg-surface'
        }`}>
        <View className="size-9 items-center justify-center rounded-full bg-background">
          <Text className="text-base font-black text-accent">{position + 1}</Text>
        </View>
        <Text className="flex-1 text-base font-bold text-foreground">{label}</Text>
        <PlayfulIcon name="drag-horizontal" size={22} color="#56648A" />
      </Animated.View>
    </GestureDetector>
  );
}

function ClassifyActivity({
  block,
  copy,
  result,
  classification,
  selectedItem,
  onSelectItem,
  onRemoveItem,
  onSelectCategory,
}: {
  block: Block;
  copy: ReturnType<typeof useCopy>;
  result: boolean | null;
  classification: Record<string, string>;
  selectedItem: string | null;
  onSelectItem: (item: string) => void;
  onRemoveItem: (item: string) => void;
  onSelectCategory: (category: string, item?: string) => void;
}) {
  const categories = block.categories ?? [];
  const items = categories.flatMap((category) => category.items);
  const availableItems = items.filter((item) => !classification[item]);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [itemsContainerY, setItemsContainerY] = useState(0);
  const [categoriesContainerY, setCategoriesContainerY] = useState(0);
  const [itemLayouts, setItemLayouts] = useState<Record<string, { y: number; height: number }>>({});
  const [categoryLayouts, setCategoryLayouts] = useState<Record<string, { y: number; height: number }>>({});
  const [categoryWindowLayouts, setCategoryWindowLayouts] = useState<Record<string, { top: number; height: number }>>({});
  const categoryRefs = useRef<Record<string, View | null>>({});

  const handleDrop = (item: string, moveY: number, translationY: number) => {
    const windowTarget = categories.find((category) => {
      const layout = categoryWindowLayouts[category.name];
      return layout ? moveY >= layout.top && moveY <= layout.top + layout.height : false;
    });
    if (windowTarget) {
      onSelectCategory(windowTarget.name, item);
      return;
    }

    // Fallback for native layouts that do not expose measureInWindow yet.
    const itemLayout = itemLayouts[item];
    if (!itemLayout) return classification[item] ? onRemoveItem(item) : onSelectItem(item);
    const itemCenter = itemsContainerY + itemLayout.y + itemLayout.height / 2 + translationY;
    const target = categories.find((category) => {
      const layout = categoryLayouts[category.name];
      if (!layout) return false;
      const top = categoriesContainerY + layout.y;
      return itemCenter >= top && itemCenter <= top + layout.height;
    });
    if (target) onSelectCategory(target.name, item);
    else if (classification[item]) onRemoveItem(item);
    else onSelectItem(item);
  };

  return (
    <View className="gap-4">
      <Text className="text-base font-bold text-muted">
        {draggingItem ? copy.t('Drop the piece into a category.') : copy.t('Drag each piece into its category.')}
      </Text>
      <View
        className="flex-row flex-wrap gap-2"
        onLayout={({ nativeEvent }) => setItemsContainerY(nativeEvent.layout.y)}>
        {availableItems.map((item, index) => (
          <DraggableClassifyItem
            key={`${item}-${index}`}
            item={item}
            selected={selectedItem === item}
            assigned={Boolean(classification[item])}
            disabled={result !== null}
            onLayout={(layout) => setItemLayouts((current) => ({ ...current, [item]: layout }))}
            onDragStart={() => {
              setDraggingItem(item);
              onSelectItem(item);
            }}
            onDragEnd={() => setDraggingItem(null)}
            onDrop={(drop) => handleDrop(item, drop.moveY, drop.translationY)}
            onTap={() => onSelectItem(item)}
          />
        ))}
        {availableItems.length === 0 ? (
          <Text className="text-sm font-bold text-success">{copy.t('All pieces placed')}</Text>
        ) : null}
      </View>
      <View
        className="gap-3"
        onLayout={({ nativeEvent }) => setCategoriesContainerY(nativeEvent.layout.y)}>
        {categories.map((category, categoryIndex) => {
          const assignedItems = Object.entries(classification)
            .filter(([, assignedCategory]) => normalizeClassificationValue(assignedCategory) === normalizeClassificationValue(category.name))
            .map(([item]) => item);
          return (
            <View
              key={`${category.name}-${categoryIndex}`}
              ref={(node) => {
                categoryRefs.current[category.name] = node;
              }}
              className={`gap-3 rounded-3xl border-2 p-4 ${draggingItem ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}
              onLayout={({ nativeEvent }) => {
                setCategoryLayouts((current) => ({
                  ...current,
                  [category.name]: { y: nativeEvent.layout.y, height: nativeEvent.layout.height },
                }));
                categoryRefs.current[category.name]?.measureInWindow((_x, y, _width, height) => {
                  setCategoryWindowLayouts((current) => ({
                    ...current,
                    [category.name]: { top: y, height },
                  }));
                });
              }}>
              <Pressable onPress={selectedItem && result === null ? () => onSelectCategory(category.name) : undefined} className="gap-3">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="flex-1 font-rounded text-lg font-black text-foreground">{category.name}</Text>
                  {draggingItem ? <Text className="text-sm font-black text-accent">{copy.t('Drop here')}</Text> : null}
                </View>
                {assignedItems.length === 0 ? (
                  <Text className="text-sm text-muted">{copy.t('Nothing here yet.')}</Text>
                ) : null}
              </Pressable>
              {assignedItems.length > 0 ? (
                <View className="flex-row flex-wrap gap-2">
                  {assignedItems.map((item, itemIndex) => {
                    const expectedCategory = categories.find((candidate) => candidate.items.includes(item))?.name;
                    const isCorrect = result === null
                      ? null
                      : normalizeClassificationValue(classification[item]) === normalizeClassificationValue(expectedCategory);
                    return (
                      <DraggableClassifyItem
                        key={`${item}-${itemIndex}`}
                        item={item}
                        selected={selectedItem === item}
                        assigned
                        disabled={result !== null}
                        onLayout={() => undefined}
                        onDragStart={() => {
                          setDraggingItem(item);
                          onSelectItem(item);
                        }}
                        onDragEnd={() => setDraggingItem(null)}
                        onDrop={(drop) => handleDrop(item, drop.moveY, drop.translationY)}
                        onTap={() => onRemoveItem(item)}
                        status={isCorrect === true ? 'correct' : isCorrect === false ? 'incorrect' : 'neutral'}
                      />
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function normalizeClassificationValue(value: string | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase();
}

function shuffleSteps(steps: string[]): string[] {
  const shuffled = [...steps];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  if (shuffled.length > 1 && shuffled.every((step, index) => step === steps[index])) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

function DraggableClassifyItem({
  item,
  selected,
  assigned,
  disabled = false,
  status = 'neutral',
  onLayout,
  onDragStart,
  onDragEnd,
  onDrop,
  onTap,
}: {
  item: string;
  selected: boolean;
  assigned: boolean;
  disabled?: boolean;
  status?: 'neutral' | 'correct' | 'incorrect';
  onLayout: (layout: { y: number; height: number }) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: (drop: { moveY: number; translationY: number }) => void;
  onTap: () => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const callbacks = useRef({ onDragStart, onDragEnd, onDrop, onTap, disabled });
  callbacks.current = { onDragStart, onDragEnd, onDrop, onTap, disabled };
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !callbacks.current.disabled,
    onMoveShouldSetPanResponder: (_, event) => !callbacks.current.disabled && (Math.abs(event.dx) > 2 || Math.abs(event.dy) > 2),
    onPanResponderGrant: () => callbacks.current.onDragStart(),
    onPanResponderMove: (_, event) => {
      translateX.value = event.dx;
      translateY.value = event.dy;
    },
    onPanResponderRelease: (_, event) => {
      if (Math.abs(event.dx) < 8 && Math.abs(event.dy) < 8) callbacks.current.onTap();
      else callbacks.current.onDrop({ moveY: event.moveY, translationY: event.dy });
      translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      callbacks.current.onDragEnd();
    },
    onPanResponderTerminate: () => {
      translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      callbacks.current.onDragEnd();
    },
    onPanResponderTerminationRequest: () => false,
  }), []);
  const animatedStyle = useAnimatedStyle(() => ({
    zIndex: Math.abs(translateY.value) > 1 ? 10 : 0,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: Math.abs(translateY.value) > 1 ? 1.04 : 1 },
    ],
  }));

  return (
    <View onLayout={({ nativeEvent }) => onLayout({ y: nativeEvent.layout.y, height: nativeEvent.layout.height })}>
      <Animated.View
        {...panResponder.panHandlers}
        accessibilityRole="button"
        accessibilityLabel={item}
        style={animatedStyle}
          className={`rounded-full border-2 px-4 py-2 ${selected ? 'border-accent bg-accent' : status === 'correct' ? 'border-success bg-success/15' : status === 'incorrect' ? 'border-warning bg-warning/15' : assigned ? 'border-border bg-surface' : 'border-border bg-surface'}`}>
        <Text className={`text-sm font-black ${selected ? 'text-accent-foreground' : status === 'correct' ? 'text-success' : status === 'incorrect' ? 'text-warning' : 'text-foreground'}`}>{item}</Text>
      </Animated.View>
    </View>
  );
}

/** The answer feedback that slides up from the bottom, green or red. */
function FeedbackPanel({
  correct,
  earned,
  explanation,
  action,
  copy,
}: {
  correct: boolean;
  earned: number;
  explanation?: string;
  action: React.ReactNode;
  copy: ReturnType<typeof useCopy>;
}) {
  const tone = correct
    ? { bg: '#D7FFB8', ink: '#3E8E00', badge: '#58CC02' }
    : { bg: '#FFDFE0', ink: '#D62C2C', badge: '#FF4B4B' };
  // The panel slides up with a plain ease-out: a spring overshoots, and the overshoot lifted the
  // coloured panel above the bottom edge and left a gap under it. Only the badge gets a pop, and
  // its spring is damped enough not to pass its final size by more than a hair.
  const pop = useSharedValue(0.7);
  const shake = useSharedValue(0);
  useEffect(() => {
    pop.set(withSpring(1, { damping: 16, stiffness: 320, mass: 0.6 }));
    if (!correct) {
      shake.set(
        withSequence(
          withTiming(-5, { duration: 60 }),
          withTiming(5, { duration: 90 }),
          withTiming(-3, { duration: 80 }),
          withTiming(0, { duration: 70 }),
        ),
      );
    }
  }, [correct, pop, shake]);
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.get() }, { translateX: shake.get() }],
  }));
  return (
    <Animated.View
      entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))}
      style={{ backgroundColor: tone.bg }}
      className="gap-4 px-5 pb-safe-offset-4 pt-5">
      <View className="flex-row items-start gap-3">
        <Animated.View className="size-12 items-center justify-center rounded-full" style={[{ backgroundColor: tone.badge }, badgeStyle]}>
          {correct ? <CheckIcon size={28} /> : <CrossIcon size={26} />}
        </Animated.View>
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="font-rounded text-2xl font-black" style={{ color: tone.ink }}>
              {correct ? copy.t('Excellent!') : copy.t('Not quite')}
            </Text>
            {correct && earned > 0 ? (
              <View className="flex-row items-center gap-1 rounded-full bg-white/70 px-2.5 py-1">
                <GemIcon size={18} />
                <Text className="text-sm font-black" style={{ color: '#C83C3C' }}>+{earned} XP</Text>
              </View>
            ) : null}
          </View>
          {explanation ? (
            <Text className="text-base font-semibold leading-6" style={{ color: tone.ink }}>
              {explanation}
            </Text>
          ) : null}
        </View>
      </View>
      {action}
    </Animated.View>
  );
}

/** The end-of-lesson celebration: Lumi cheers and the rewards count up. */
function LessonComplete({
  summary,
  streak,
  copy,
  onContinue,
}: {
  summary: LessonSummary;
  streak: number;
  copy: ReturnType<typeof useCopy>;
  onContinue: () => void;
}) {
  const xp = useCountUp(summary.earnedXp, 900);
  const total = summary.score.total;
  const accuracy = total ? Math.round((summary.score.correct / total) * 100) : 100;
  const shownAccuracy = useCountUp(accuracy, 900);
  const [replay, setReplay] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setReplay((n) => n + 1), 2600);
    return () => clearInterval(timer);
  }, []);
  return (
    <Animated.View entering={fadeIn} className="absolute inset-0 z-50 items-center justify-between bg-background px-6 pb-safe-offset-6 pt-safe-offset-10">
      <ConfettiBurst visible key={replay} />
      <View className="items-center gap-4">
        <Lumi size={190} mood="cheer" replay={replay} />
        <Text className="text-center font-rounded text-4xl font-black text-[#FFB020]">
          {summary.moduleCompleted ? copy.t('Module completed!') : copy.t('Lesson complete!')}
        </Text>
        <Text className="text-center text-base font-semibold text-muted">{copy.t('Lumi is proud of you. Keep going!')}</Text>
      </View>
      <View className="w-full flex-row gap-3">
        <RewardCard tone="#FFC800" label={copy.t('Total XP')} icon={<GemIcon size={24} />} value={`${xp}`} />
        <RewardCard tone="#58CC02" label={copy.t('Accuracy')} icon={<TargetIcon size={24} />} value={`${shownAccuracy}%`} />
        <RewardCard tone="#FF9600" label={copy.t('Streak')} icon={<FlameIcon size={22} />} value={`${streak}`} />
      </View>
      <View className="w-full">
        <AppButton label={copy.t('Continue')} size="lg" uppercase colors={{ face: '#58CC02', edge: '#46A302', label: '#FFFFFF' }} onPress={onContinue} />
      </View>
    </Animated.View>
  );
}

function RewardCard({ tone, label, icon, value }: { tone: string; label: string; icon: React.ReactNode; value: string }) {
  return (
    <View className="flex-1 overflow-hidden rounded-2xl border-2" style={{ borderColor: tone, backgroundColor: tone }}>
      <Text className="py-1 text-center text-xs font-black uppercase tracking-wide text-white">{label}</Text>
      <View className="flex-row items-center justify-center gap-1.5 rounded-t-xl bg-background py-3">
        {icon}
        <Text className="text-xl font-black" style={{ color: tone }}>{value}</Text>
      </View>
    </View>
  );
}

/** Shown when the last heart is lost: Lumi is sad, and the lesson starts again from the top. */
function OutOfHearts({ copy, onRestart, onLeave }: { copy: ReturnType<typeof useCopy>; onRestart: () => void; onLeave: () => void }) {
  return (
    <Animated.View entering={fadeIn} className="absolute inset-0 z-50 items-center justify-between bg-background px-6 pb-safe-offset-6 pt-safe-offset-12">
      <View className="items-center gap-5">
        <View className="flex-row gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <HeartIcon key={i} size={30} empty />
          ))}
        </View>
        <Lumi size={180} mood="sad" />
        <Text className="text-center font-rounded text-4xl font-black text-foreground">{copy.t('Out of hearts!')}</Text>
        <Text className="text-center text-base font-semibold leading-6 text-muted">
          {copy.t('Let us start this lesson again from the beginning. This time you have got it!')}
        </Text>
      </View>
      <View className="w-full gap-3">
        <AppButton label={copy.t('Start again')} size="lg" uppercase onPress={onRestart} />
        <AppButton label={copy.t('Back to the path')} size="md" variant="secondary" onPress={onLeave} />
      </View>
    </Animated.View>
  );
}
