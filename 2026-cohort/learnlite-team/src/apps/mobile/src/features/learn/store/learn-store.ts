import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { bundledPack, LEARNER_ID } from '@/features/learn/data/module1';
import type { LearnState } from '@/features/learn/types/learn';
import { zustandStorage } from '@/lib/storage';

const initialProgress = {
  positions: {},
  completed: {},
  answers: {},
  lastActivity: null,
  openLessonID: null,
  moduleCelebrated: false,
};

export const useLearnStore = create<LearnState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      pack: null,
      downloadedAt: null,
      simulateOffline: false,
      ...initialProgress,

      finishOnboarding: () => set({ onboarded: true }),

      // Copies the whole pack into persistent on-device storage (MMKV) as its own object.
      downloadModule: () =>
        set({ pack: JSON.parse(JSON.stringify(bundledPack)), downloadedAt: new Date().toISOString() }),

      removeDownload: () => set({ pack: null, downloadedAt: null, openLessonID: null }),

      openLesson: (lessonID) => set({ openLessonID: lessonID }),

      closeLesson: () => set({ openLessonID: null }),

      goToStep: (lessonID, step) => {
        const lesson = get().pack?.lessons.find((l) => l.lesson_id === lessonID);
        if (!lesson) return;
        set((s) => ({
          positions: { ...s.positions, [lessonID]: step },
          lastActivity: {
            lessonID,
            step,
            at: new Date().toISOString(),
            label: `Lesson ${lesson.number} · step ${step + 1} of ${lesson.items.length}`,
          },
        }));
      },

      saveAnswer: ({ lessonID, questionID, answer, correct, offline }) => {
        const id = `${LEARNER_ID}:${questionID}`;
        set((s) => {
          const previous = s.answers[id];
          return {
            answers: {
              ...s.answers,
              [id]: {
                id,
                learnerID: LEARNER_ID,
                lessonID,
                questionID,
                answer,
                correct,
                attempts: (previous?.attempts ?? 0) + 1,
                offline,
                savedAt: new Date().toISOString(),
                synced: false,
              },
            },
          };
        });
      },

      completeLesson: (lessonID) => {
        const state = get();
        const lesson = state.pack?.lessons.find((l) => l.lesson_id === lessonID);
        if (!lesson) return { moduleJustCompleted: false };
        const questions = lesson.items.filter((i) => i.type !== 'read');
        const score = questions.filter((q) => state.answers[`${LEARNER_ID}:${q.item_id}`]?.correct).length;
        const completed = {
          ...state.completed,
          [lessonID]: { completedAt: new Date().toISOString(), score, total: questions.length },
        };
        const allDone = (state.pack?.lessons ?? []).every((l) => completed[l.lesson_id]);
        const moduleJustCompleted = allDone && !state.moduleCelebrated;
        set({
          completed,
          moduleCelebrated: state.moduleCelebrated || allDone,
          lastActivity: {
            lessonID,
            step: lesson.items.length - 1,
            at: new Date().toISOString(),
            label: `Completed Lesson ${lesson.number}`,
          },
        });
        return { moduleJustCompleted };
      },

      setSimulateOffline: (value) => set({ simulateOffline: value }),

      resetProgress: () => set({ ...initialProgress }),
    }),
    {
      name: 'learnlite',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        onboarded: s.onboarded,
        pack: s.pack,
        downloadedAt: s.downloadedAt,
        positions: s.positions,
        completed: s.completed,
        answers: s.answers,
        lastActivity: s.lastActivity,
        openLessonID: s.openLessonID,
        simulateOffline: s.simulateOffline,
        moduleCelebrated: s.moduleCelebrated,
      }),
    },
  ),
);
