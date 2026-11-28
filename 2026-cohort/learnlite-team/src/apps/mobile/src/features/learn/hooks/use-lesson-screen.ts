import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { LEARNER_ID } from '@/features/learn/data/module1';
import { useConnection } from '@/features/learn/hooks/use-connection';
import { useLearnStore } from '@/features/learn/store/learn-store';
import { useStudentStore } from '@/features/student/store/student-store';
import { playSound } from '@/lib/sounds';

export function useLessonScreen(lessonID: string) {
  const pack = useLearnStore((s) => s.pack);
  const positions = useLearnStore((s) => s.positions);
  const answers = useLearnStore((s) => s.answers);
  const goToStep = useLearnStore((s) => s.goToStep);
  const saveAnswer = useLearnStore((s) => s.saveAnswer);
  const completeLesson = useLearnStore((s) => s.completeLesson);
  const openLesson = useLearnStore((s) => s.openLesson);
  const closeLesson = useLearnStore((s) => s.closeLesson);
  const recordActivity = useStudentStore((s) => s.recordActivity);
  const { online } = useConnection();
  const [finished, setFinished] = useState<{ moduleComplete: boolean } | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const lesson = pack?.lessons.find((l) => l.lesson_id === lessonID);
  const total = lesson?.items.length ?? 0;
  const step = Math.min(positions[lessonID] ?? 0, Math.max(total - 1, 0));
  const item = lesson?.items[step];
  const record = item ? answers[`${LEARNER_ID}:${item.item_id}`] : undefined;
  const source = pack?.sources.find((s) => s.source_id === item?.source_id);
  const needsAnswer = item !== undefined && item.type !== 'read' && record === undefined;

  useEffect(() => {
    if (!lesson) return;
    openLesson(lessonID);
    if (positions[lessonID] === undefined) goToStep(lessonID, 0);
    // Opening the reader is recorded once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonID, lesson === undefined]);

  const leave = () => {
    closeLesson();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const next = () => goToStep(lessonID, Math.min(step + 1, total - 1));
  const previous = () => goToStep(lessonID, Math.max(step - 1, 0));

  const answer = (value: string, correct: boolean) => {
    if (!item) return;
    saveAnswer({ lessonID, questionID: item.item_id, answer: value, correct, offline: !online });
    recordActivity({ activityId: item.item_id, correct, xp: 10 });
    if (correct) setCelebrate(true);
  };

  const markComplete = () => {
    const { moduleJustCompleted } = completeLesson(lessonID);
    closeLesson();
    Presets.System.notificationSuccess();
    playSound('correctFinal');
    setFinished({ moduleComplete: moduleJustCompleted });
  };

  const questions = lesson?.items.filter((i) => i.type !== 'read') ?? [];
  const score = questions.filter((q) => answers[`${LEARNER_ID}:${q.item_id}`]?.correct).length;

  return {
    lesson,
    item,
    step,
    total,
    record,
    sourceTitle: source ? `${source.title} (${source.publisher})` : undefined,
    isLast: step === total - 1,
    needsAnswer,
    finished,
    score,
    questionCount: questions.length,
    next,
    previous,
    answer,
    markComplete,
    leave,
    celebrate,
  };
}
