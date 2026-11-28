import { router } from 'expo-router';
import { Presets } from 'react-native-pulsar';
import { useState } from 'react';

import { bundledPack, LEARNER_ID } from '@/features/learn/data/module1';
import { useLearnStore } from '@/features/learn/store/learn-store';
import { lessonPercent, lessonStatus, modulePercent } from '@/features/learn/utils/progress';

export function useLearnOverview() {
  const store = useLearnStore();
  const [confirmAction, setConfirmAction] = useState<'remove' | 'reset' | null>(null);
  const downloaded = store.pack !== null;
  // Before download only titles from the bundle are shown; lessons open only from the device copy.
  const lessons = (store.pack ?? bundledPack).lessons;

  const rows = lessons.map((lesson) => ({
    lesson,
    percent: lessonPercent(lesson, store.positions, store.completed),
    status: lessonStatus(lesson.lesson_id, downloaded, store.positions, store.completed),
    completion: store.completed[lesson.lesson_id],
  }));

  const resumeLesson =
    lessons.find((l) => l.lesson_id === store.lastActivity?.lessonID && !store.completed[l.lesson_id]) ??
    lessons.find((l) => !store.completed[l.lesson_id]);
  const resumeStep = resumeLesson ? (store.positions[resumeLesson.lesson_id] ?? 0) : 0;
  const resumeItem = resumeLesson?.items[resumeStep];

  const answers = Object.values(store.answers).filter((a) => a.learnerID === LEARNER_ID);

  const openLesson = (lessonID: string) => {
    if (!downloaded) return;
    router.push({ pathname: '/lesson/[id]', params: { id: lessonID } });
  };

  const download = () => {
    store.downloadModule();
    Presets.System.notificationSuccess();
  };

  const removeDownload = () => setConfirmAction('remove');

  const resetProgress = () => setConfirmAction('reset');

  const confirmPendingAction = () => {
    if (confirmAction === 'remove') store.removeDownload();
    if (confirmAction === 'reset') store.resetProgress();
    setConfirmAction(null);
  };

  return {
    downloaded,
    downloadedAt: store.downloadedAt,
    rows,
    percent: modulePercent(lessons, store.positions, store.completed),
    completedCount: rows.filter((r) => r.status === 'completed').length,
    inProgressCount: rows.filter((r) => r.status === 'in-progress').length,
    offlineCount: downloaded ? lessons.length : 0,
    lastActivity: store.lastActivity,
    resumeLesson,
    resumeStep,
    resumeItem,
    allComplete: rows.every((r) => r.status === 'completed'),
    answers,
    offlineAnswers: answers.filter((a) => a.offline).length,
    simulateOffline: store.simulateOffline,
    setSimulateOffline: store.setSimulateOffline,
    openLesson,
    download,
    removeDownload,
    resetProgress,
    confirmAction,
    confirmPendingAction,
    cancelConfirm: () => setConfirmAction(null),
  };
}
