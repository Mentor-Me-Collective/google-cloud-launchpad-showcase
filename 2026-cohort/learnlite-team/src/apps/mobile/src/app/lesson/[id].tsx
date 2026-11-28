import { useThemeColor } from 'heroui-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Pressable } from '@/components/pressable';
import { Icon } from '@/components/icon';
import { CompletionCard } from '@/features/learn/components/completion-card';
import { ConfettiBurst } from '@/features/student/components/confetti-burst';
import { LivesIndicator } from '@/features/student/components/lives-indicator';
import { useStudentStore } from '@/features/student/store/student-store';
import { ProgressBar } from '@/features/learn/components/progress-bar';
import { QuestionStep } from '@/features/learn/components/question-step';
import { ReadStep } from '@/features/learn/components/read-step';
import { SyncChip } from '@/features/learn/components/sync-chip';
import { useLessonScreen } from '@/features/learn/hooks/use-lesson-screen';
import { fadeIn } from '@/lib/motion';
import { ChunkyButton } from '@/features/teacher/components/chunky-button';
import { useCopy } from '@/lib/i18n';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useLessonScreen(id);
  const foreground = useThemeColor('foreground');
  const scrollRef = useRef<ScrollView>(null);
  const [revealFeedback, setRevealFeedback] = useState(false);
  const [heartBreak, setHeartBreak] = useState(false);
  const copy = useCopy();
  const hearts = useStudentStore((state) => state.hearts ?? state.maxHearts);
  const maxHearts = useStudentStore((state) => state.maxHearts ?? 5);

  useEffect(() => {
    if (!heartBreak) return;
    const timeout = setTimeout(() => setHeartBreak(false), 700);
    return () => clearTimeout(timeout);
  }, [heartBreak]);

  if (!s.lesson || !s.item) return <Redirect href="/module" />;

  const percent = s.finished ? 100 : Math.round(((s.step + 1) / s.total) * 100);

  return (
    <View className="flex-1 gap-4 bg-background px-5 pt-safe-offset-2 pb-safe-offset-4">
      <ConfettiBurst visible={s.celebrate} />
      <SyncChip />
      <View className="flex-row items-center gap-3">
        <Pressable onPress={s.leave} accessibilityRole="button" accessibilityLabel={copy.t('Back')}>
          <View className="size-12 items-center justify-center rounded-full bg-surface">
            <Icon sf="chevron.left" md="chevron-back" size={20} color={foreground} />
          </View>
        </Pressable>
        <View className="flex-1 gap-2">
          <Text className="text-base font-bold tabular-nums text-foreground">
            {copy.t('Lesson')} {s.lesson.number} · {s.step + 1} {copy.t('of')} {s.total}
          </Text>
          <ProgressBar percent={percent} tone={s.finished ? 'success' : 'accent'} />
        </View>
        <LivesIndicator hearts={hearts} maxHearts={maxHearts} broken={heartBreak} />
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="gap-5 pb-6"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (!revealFeedback) return;
          setRevealFeedback(false);
          scrollRef.current?.scrollToEnd({ animated: true });
        }}>
        {s.finished ? (
          <CompletionCard
            lessonNumber={s.lesson.number}
            lessonTitle={s.lesson.title}
            score={s.score}
            total={s.questionCount}
            moduleComplete={s.finished.moduleComplete}
          />
        ) : (
          <Animated.View key={s.item.item_id} entering={fadeIn} className="gap-5">
            {s.step === 0 ? (
              <View className="gap-1 border-l-4 border-accent pl-4">
                <Text className="text-sm font-bold uppercase tracking-wide text-accent">{copy.t('Today you will')}</Text>
                <Text className="text-lg text-foreground">{s.lesson.objective}</Text>
              </View>
            ) : null}
            {s.item.type === 'read' ? (
              <ReadStep item={s.item} sourceTitle={s.sourceTitle} />
            ) : (
              <QuestionStep
                item={s.item}
                record={s.record}
                onAnswer={(answer, correct) => {
                  setRevealFeedback(true);
                  if (!correct) setHeartBreak(true);
                  s.answer(answer, correct);
                }}
              />
            )}
          </Animated.View>
        )}
      </ScrollView>

      {s.finished ? (
        <ChunkyButton label={copy.t('Back to Module 1')} onPress={s.leave} />
      ) : (
        <View className="flex-row gap-3">
          <ChunkyButton
            variant="secondary"
            className="flex-1"
            disabled={s.step === 0}
            label={copy.t('Previous')}
            onPress={s.previous}
          />
          <ChunkyButton
            className="flex-1"
            disabled={s.needsAnswer}
            label={s.isLast ? copy.t('Mark as complete') : s.needsAnswer ? copy.t('Answer to continue') : copy.t('Next')}
            onPress={() => {
              if (s.isLast) s.markComplete();
              else s.next();
            }}
          />
        </View>
      )}
    </View>
  );
}
