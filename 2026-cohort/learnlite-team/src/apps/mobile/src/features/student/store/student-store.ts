import { useEffect } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { toAssignment, toModule, type ServerAssignment, type ServerLesson, type ServerModule } from '@/features/teacher/mappers';
import type { Classroom } from '@/features/teacher/types';
import * as Network from 'expo-network';

import { api, ApiError, errorMessage } from '@/lib/api';
import { zustandStorage } from '@/lib/storage';
import { gradeLocally } from '../offline-grader';
import type { AnswerResult, LessonSummary, PendingRun, StudentState } from '../types/student';

type ServerClassroom = {
  id: string;
  name: string;
  grade: string;
  subject: string;
  color: string;
  createdAt: string;
};

type Gamification = {
  xp: number;
  hearts: { current: number; max: number };
  streak: number;
  lastActiveDate: string | null;
};

type StudentModule = Omit<ServerModule, 'lessons' | 'status' | 'createdAt'> & {
  lessons?: (ServerLesson & { progress?: { status?: string } })[];
  /** Activities this student already answered correctly, remembered by the server. */
  activityResults?: Record<string, { xp: number; completedAt?: string | null }>;
};

const emptyServerData = {
  classrooms: [] as StudentState['classrooms'],
  assignments: [] as StudentState['assignments'],
  modules: [] as StudentState['modules'],
  loading: false,
  loaded: false,
  syncError: null as string | null,
  joinedClassroomIds: [] as string[],
  completedLessonIds: [] as string[],
};

const initialState = {
  ...emptyServerData,
  downloadedModules: [] as StudentState['downloadedModules'],
  activityResults: {} as StudentState['activityResults'],
  pendingRuns: [] as PendingRun[],
  downloading: [] as string[],
  xp: 0,
  streak: 0,
  lastActiveDate: null as string | null,
  hearts: 5,
  maxHearts: 5,
};

/**
 * While a lesson is open, background refreshes pause: replacing the data (or the hearts) in the
 * middle of a lesson could leave the screen out of step with the server's lesson run.
 */
let openLessons = 0;
/** What the last load returned, to skip re-rendering every screen when nothing changed. */
let lastSignature = '';
/** Community modules the student opened: they are not assigned, so they are loaded by id. */
const communityModuleIds = new Set<string>();

/** A lesson being played from a saved module, without the server. Lives only while it is open. */
type LocalRun = {
  id: string;
  moduleId: string;
  lessonId: string;
  blockIds: string[];
  activityIds: string[];
  position: number;
  hearts: number;
  status: 'in_progress' | 'failed' | 'completed';
  earned: number;
  wrong: Record<string, number>;
  answers: Record<string, { answer: Record<string, unknown>; wrongAttempts: number }>;
};
const localRuns = new Map<string, LocalRun>();
const LOCAL_HEARTS = 5;
let syncingOffline = false;

const isNetworkError = (error: unknown) => error instanceof ApiError && (error.code === 'NETWORK' || error.code === 'TIMEOUT');

async function deviceOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return true; // cannot tell: let the request itself decide
  }
}

export function setLessonOpen(open: boolean) {
  openLessons = Math.max(0, openLessons + (open ? 1 : -1));
}

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function toStudentClassroom(c: ServerClassroom): Classroom {
  return { id: c.id, name: c.name, grade: c.grade, subject: c.subject, color: c.color, allowCommunity: false, code: '', studentIds: [], createdAt: c.createdAt };
}

export const useStudentStore = create<StudentState>()(
  persist(
    (set, get) => {
      const applyGamification = (g: Gamification) =>
        set({ xp: g.xp, streak: g.streak, lastActiveDate: g.lastActiveDate, hearts: g.hearts.current, maxHearts: g.hearts.max });

      /**
       * Read everything the student can see from the server. `silent` is for background
       * refreshes: no loading state, and a failure leaves what is on screen untouched.
       */
      const load = async (silent: boolean) => {
        if (silent && openLessons > 0) return;
        if (!silent) set({ loading: true });
        try {
          // Lessons finished offline go first, so the numbers loaded next already include them.
          await get().syncOfflineRuns();
          const [classrooms, assignments, modules, gamification] = await Promise.all([
            api<{ items: ServerClassroom[] }>('/me/classrooms'),
            api<{ items: ServerAssignment[] }>('/me/assignments'),
            api<{ items: { id: string }[] }>('/me/modules'),
            api<Gamification>('/me/gamification'),
          ]);
          const assignedIds = modules.items.map((m) => m.id);
          const extraIds = [...communityModuleIds].filter((id) => !assignedIds.includes(id));
          const trees = (
            await Promise.all(
              [...assignedIds, ...extraIds].map((id) =>
                api<StudentModule>(`/me/modules/${id}`).catch((error) => {
                  // A shared module its author stopped sharing disappears quietly.
                  if (communityModuleIds.has(id) && error instanceof ApiError && error.status === 404) {
                    communityModuleIds.delete(id);
                    return null;
                  }
                  throw error;
                }),
              ),
            )
          ).filter((tree): tree is StudentModule => tree !== null);
          const signature = JSON.stringify([classrooms.items, assignments.items, trees, gamification]);
          if (silent && signature === lastSignature && get().loaded) return;
          lastSignature = signature;
          const completed = trees.flatMap((tree) =>
            (tree.lessons ?? []).filter((l) => l.progress?.status === 'completed').map((l) => `${tree.id}:${l.id}`),
          );
          // The server remembers which activities were answered, so progress survives signing out.
          const remembered: StudentState['activityResults'] = {};
          for (const tree of trees) {
            for (const [blockId, result] of Object.entries(tree.activityResults ?? {})) {
              remembered[blockId] = {
                activityId: blockId,
                correct: true,
                xp: result.xp,
                completedAt: result.completedAt ?? '',
              };
            }
          }
          set((state) => ({
            classrooms: classrooms.items.map(toStudentClassroom),
            joinedClassroomIds: classrooms.items.map((c) => c.id),
            assignments: assignments.items.map((a) => toAssignment(a, [])),
            modules: trees.map((tree) => toModule({ ...tree, status: 'published', createdAt: '' })),
            completedLessonIds: completed,
            activityResults: { ...state.activityResults, ...remembered },
            loading: false,
            loaded: true,
            syncError: silent ? state.syncError : null,
          }));
          applyGamification(gamification);
          // A teacher changed a module the student saved: keep the saved copy current.
          for (const tree of trees) {
            const saved = get().downloadedModules.find((m) => m.id === tree.id);
            if (saved && tree.version !== undefined && (saved.version ?? 0) < tree.version) {
              void get().downloadModule(tree.id, { quiet: true });
            }
          }
        } catch (error) {
          if (silent) return;
          // No internet is not an error to shout about: the saved modules still work.
          if (isNetworkError(error)) set({ loading: false, loaded: true });
          else set({ loading: false, syncError: errorMessage(error) });
        }
      };

      // ---- lessons played from a saved module, with no server -------------------------
      const isLocalRun = (id: string) => id.startsWith('local-');
      const findBlock = (run: LocalRun, blockId: string) =>
        get()
          .downloadedModules.find((module) => module.id === run.moduleId)
          ?.lessons.find((lesson) => lesson.id === run.lessonId)
          ?.blocks.find((block) => block.id === blockId);

      const startLocalRun = (module: StudentState['downloadedModules'][number], lessonId: string, resume: boolean) => {
        const lesson = module.lessons.find((item) => item.id === lessonId);
        if (!lesson || lesson.blocks.length === 0) return null;
        const running = [...localRuns.values()].find(
          (run) => run.moduleId === module.id && run.lessonId === lessonId && run.status === 'in_progress',
        );
        if (running && resume) return { attemptId: running.id, blockIds: running.blockIds, currentPosition: running.position };
        if (running) localRuns.delete(running.id);
        const run: LocalRun = {
          id: `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
          moduleId: module.id,
          lessonId,
          blockIds: lesson.blocks.map((block) => block.id),
          activityIds: lesson.blocks.filter((block) => block.kind === 'activity').map((block) => block.id),
          position: 0,
          hearts: LOCAL_HEARTS,
          status: 'in_progress',
          earned: 0,
          wrong: {},
          answers: {},
        };
        localRuns.set(run.id, run);
        set({ hearts: LOCAL_HEARTS, maxHearts: LOCAL_HEARTS });
        return { attemptId: run.id, blockIds: run.blockIds, currentPosition: 0 };
      };

      const answerLocally = (runId: string, blockId: string, answer: Record<string, unknown>): AnswerResult | 'resync' | null => {
        const run = localRuns.get(runId);
        const block = run ? findBlock(run, blockId) : undefined;
        if (!run || !block || run.status !== 'in_progress' || run.blockIds.indexOf(blockId) !== run.position) return 'resync';
        const verdict = gradeLocally(block, answer);
        if (verdict === null) {
          set({ syncError: 'Some data is not valid. Check the fields and try again.' });
          return null;
        }
        const explanation = block.explanation ?? '';
        if (verdict) {
          const xp = block.xp ?? 10;
          const earned = get().activityResults[blockId]?.correct ? 0 : xp;
          get().recordActivity({ activityId: blockId, correct: true, xp });
          run.answers[blockId] = { answer, wrongAttempts: run.wrong[blockId] ?? 0 };
          run.position += 1;
          run.earned += earned;
          return { correct: true, earnedXp: earned, explanation, hearts: { current: run.hearts, max: LOCAL_HEARTS }, canContinue: true };
        }
        run.wrong[blockId] = (run.wrong[blockId] ?? 0) + 1;
        run.hearts = Math.max(0, run.hearts - 1);
        const failed = run.hearts === 0;
        if (failed) run.status = 'failed';
        set({ hearts: run.hearts });
        return { correct: false, earnedXp: 0, explanation, hearts: { current: run.hearts, max: LOCAL_HEARTS }, canContinue: false, lessonFailed: failed };
      };

      const continueLocally = (runId: string) => {
        const run = localRuns.get(runId);
        if (!run || run.status !== 'in_progress') return false;
        if (run.position >= run.blockIds.length - 1 || run.activityIds.includes(run.blockIds[run.position])) return false;
        run.position += 1;
        return true;
      };

      const finishLocally = (runId: string): LessonSummary | null => {
        const run = localRuns.get(runId);
        if (!run || run.status !== 'in_progress') return null;
        if (run.position < run.blockIds.length - 1 || run.activityIds.some((id) => !run.answers[id])) return null;
        run.status = 'completed';
        get().completeLesson(run.moduleId, run.lessonId);
        set((state) => ({
          pendingRuns: [
            ...state.pendingRuns,
            {
              clientRunId: run.id,
              moduleId: run.moduleId,
              lessonId: run.lessonId,
              answers: run.activityIds.map((blockId) => ({ blockId, ...run.answers[blockId] })),
            },
          ],
        }));
        const module = get().downloadedModules.find((item) => item.id === run.moduleId);
        const done = get().completedLessonIds;
        void get().syncOfflineRuns(); // goes through at once when the connection is back
        return {
          completed: true,
          score: { correct: run.activityIds.filter((id) => run.answers[id].wrongAttempts === 0).length, total: run.activityIds.length },
          earnedXp: run.earned,
          moduleCompleted: Boolean(module) && module!.lessons.every((lesson) => done.includes(`${module!.id}:${lesson.id}`)),
        };
      };

      return {
        ...initialState,

        loadAll: () => load(false),
        refresh: () => load(true),

        fetchModule: async (moduleId) => {
          try {
            const tree = await api<StudentModule>(`/me/modules/${moduleId}`);
            communityModuleIds.add(moduleId);
            const module = toModule({ ...tree, status: 'published', createdAt: '' });
            set((state) => ({
              modules: [module, ...state.modules.filter((item) => item.id !== moduleId)],
              completedLessonIds: [
                ...state.completedLessonIds.filter((key) => !key.startsWith(`${moduleId}:`)),
                ...(tree.lessons ?? []).filter((l) => l.progress?.status === 'completed').map((l) => `${moduleId}:${l.id}`),
              ],
            }));
            return true;
          } catch {
            return false;
          }
        },

        reset: () => {
          localRuns.clear();
          lastSignature = '';
          communityModuleIds.clear();
          set({ ...initialState });
        },
        clearSyncError: () => set({ syncError: null }),

        joinByCode: async (code) => {
          try {
            const result = await api<{ classroom: { name: string } }>('/me/classrooms/join', {
              method: 'POST',
              body: { code: code.trim() },
            });
            await get().loadAll();
            return { name: result.classroom.name };
          } catch (error) {
            if (error instanceof ApiError && error.status === 404) return { error: 'That classroom code was not found.' };
            if (error instanceof ApiError && error.status === 403) return { error: 'This classroom is closed for joining.' };
            return { error: errorMessage(error) };
          }
        },

        leaveClassroom: (classroomId) => {
          set((state) => ({
            classrooms: state.classrooms.filter((c) => c.id !== classroomId),
            joinedClassroomIds: state.joinedClassroomIds.filter((id) => id !== classroomId),
          }));
          void api(`/me/classrooms/${classroomId}`, { method: 'DELETE' })
            .catch((error) => set({ syncError: errorMessage(error) }))
            .finally(() => void get().loadAll());
        },

        downloadModule: async (moduleId, options = {}) => {
          if (get().downloading.includes(moduleId)) return false;
          set((state) => ({ downloading: [...state.downloading, moduleId] }));
          try {
            const tree = await api<StudentModule>(`/me/modules/${moduleId}/download`);
            const module = toModule({ ...tree, status: 'published', createdAt: '' });
            set((state) => ({
              downloadedModules: [module, ...state.downloadedModules.filter((item) => item.id !== moduleId)],
            }));
            return true;
          } catch (error) {
            if (!options.quiet) set({ syncError: errorMessage(error) });
            return false;
          } finally {
            set((state) => ({ downloading: state.downloading.filter((id) => id !== moduleId) }));
          }
        },

        removeModule: (moduleId) =>
          set((state) => ({
            downloadedModules: state.downloadedModules.filter((module) => module.id !== moduleId),
          })),

        syncOfflineRuns: async () => {
          const runs = get().pendingRuns.slice(0, 20);
          if (syncingOffline || runs.length === 0) return;
          syncingOffline = true;
          let sent = false;
          try {
            const result = await api<{ items: { clientRunId: string }[]; gamification: Gamification }>('/me/offline/sync', {
              method: 'POST',
              body: { runs },
            });
            const done = new Set(result.items.map((item) => item.clientRunId));
            set((state) => ({ pendingRuns: state.pendingRuns.filter((run) => !done.has(run.clientRunId)) }));
            applyGamification(result.gamification);
            lastSignature = ''; // the next load must show what the server now knows
            sent = true;
          } catch (error) {
            // No internet: keep them for later. A refusal of the batch itself would block the queue forever.
            if (error instanceof ApiError && error.status >= 400 && error.status < 500 && ![401, 408, 429].includes(error.status)) {
              set((state) => ({ pendingRuns: state.pendingRuns.filter((run) => !runs.includes(run)) }));
            }
          } finally {
            syncingOffline = false;
          }
          if (sent && get().pendingRuns.length > 0) void get().syncOfflineRuns(); // more than one batch
        },

        // ---- a lesson run (the server grades, counts XP, hearts and streak) -----
        startLesson: async (moduleId, lessonId, options = {}) => {
          const saved = get().downloadedModules.find((module) => module.id === moduleId);
          const local = () => (saved ? startLocalRun(saved, lessonId, options.resume ?? false) : null);
          // A saved module plays from the phone when there is no internet (or the server cannot be reached).
          if (saved && !(await deviceOnline())) {
            const run = local();
            if (run) return run;
          }
          if (options.resume) {
            const running = [...localRuns.values()].find(
              (run) => run.moduleId === moduleId && run.lessonId === lessonId && run.status === 'in_progress',
            );
            if (running) return { attemptId: running.id, blockIds: running.blockIds, currentPosition: running.position };
          }
          try {
            const attempt = await api<{
              attemptId: string;
              currentPosition: number;
              hearts: { current: number; max: number };
              blocks: { id: string }[];
            }>(`/me/modules/${moduleId}/lessons/${lessonId}/attempts`, {
              method: 'POST',
              body: { restart: !options.resume, onlyNew: options.onlyNew ?? false },
            });
            set({ hearts: attempt.hearts.current, maxHearts: attempt.hearts.max });
            return {
              attemptId: attempt.attemptId,
              blockIds: attempt.blocks.map((b) => b.id),
              currentPosition: attempt.currentPosition,
            };
          } catch (error) {
            if (isNetworkError(error)) {
              const run = local();
              if (run) return run;
            }
            set({ syncError: errorMessage(error) });
            return null;
          }
        },

        answerBlock: async (attemptId, blockId, answer, xp) => {
          if (isLocalRun(attemptId)) return answerLocally(attemptId, blockId, answer);
          try {
            const result = await api<AnswerResult>(`/me/attempts/${attemptId}/blocks/${blockId}/answer`, {
              method: 'POST',
              body: { answer, clientEventId: `${attemptId}:${blockId}:${Date.now()}`, source: 'online' },
            });
            set((state) => ({
              hearts: result.hearts.current,
              maxHearts: result.hearts.max,
              xp: state.xp + result.earnedXp,
              activityResults:
                result.correct && !state.activityResults[blockId]?.correct
                  ? {
                      ...state.activityResults,
                      [blockId]: { activityId: blockId, correct: true, xp: result.earnedXp || xp, completedAt: new Date().toISOString() },
                    }
                  : state.activityResults,
            }));
            return result;
          } catch (error) {
            if (error instanceof ApiError && (error.code === 'NOT_CURRENT_BLOCK' || error.code === 'ATTEMPT_CLOSED' || error.code === 'HEARTS_EXHAUSTED')) {
              return 'resync'; // not the student's fault: the screen quietly catches up with the server
            } else set({ syncError: errorMessage(error) });
            return null;
          }
        },

        continueLesson: async (attemptId) => {
          if (isLocalRun(attemptId)) return continueLocally(attemptId);
          try {
            await api(`/me/attempts/${attemptId}/continue`, { method: 'POST' });
            return true;
          } catch (error) {
            // A refused step usually means the screen is out of step: the caller re-syncs quietly.
            if (!(error instanceof ApiError && error.status === 409)) set({ syncError: errorMessage(error) });
            return false;
          }
        },

        finishLesson: async (attemptId, moduleId, lessonId) => {
          if (isLocalRun(attemptId)) return finishLocally(attemptId);
          try {
            const summary = await api<LessonSummary & { gamification: Gamification }>(`/me/attempts/${attemptId}/complete`, {
              method: 'POST',
            });
            applyGamification(summary.gamification);
            get().completeLesson(moduleId, lessonId);
            void get().refresh(); // module progress and the classroom list
            return summary;
          } catch (error) {
            // A 409 means the screen was out of step; the lesson screen re-syncs without a red banner.
            if (!(error instanceof ApiError && error.status === 409)) set({ syncError: errorMessage(error) });
            return null;
          }
        },

        // ---- local helpers (also used by the on-device Module 1 flow) --------------
        completeLesson: (moduleId, lessonId) =>
          set((state) => {
            const key = `${moduleId}:${lessonId}`;
            return state.completedLessonIds.includes(key)
              ? state
              : { completedLessonIds: [...state.completedLessonIds, key] };
          }),

        recordActivity: ({ activityId, correct, xp }) =>
          set((state) => {
            const previous = state.activityResults[activityId];
            if (previous?.correct) return state;
            const maxHearts = state.maxHearts ?? 5;
            const currentHearts = typeof state.hearts === 'number' ? state.hearts : maxHearts;
            const today = dateKey();
            const yesterday = dateKey(new Date(Date.now() - 86_400_000));
            const nextStreak =
              state.lastActiveDate === yesterday ? state.streak + 1 : state.lastActiveDate === today ? state.streak : 1;
            return {
              activityResults: {
                ...state.activityResults,
                [activityId]: { activityId, correct, xp: correct ? xp : 0, completedAt: new Date().toISOString() },
              },
              xp: state.xp + (correct ? xp : 0),
              streak: correct ? nextStreak : state.streak,
              lastActiveDate: correct ? today : state.lastActiveDate,
              hearts: correct ? currentHearts : Math.max(0, currentHearts - 1),
            };
          }),

        restoreHearts: () => {
          set((state) => ({ hearts: state.maxHearts }));
          void api('/me/hearts/restore', { method: 'POST' }).catch(() => undefined);
        },

        resetStudentData: () => set({ ...initialState }),
      };
    },
    {
      name: 'learnlite-student',
      storage: createJSONStorage(() => zustandStorage),
      // Only what lives on the device. Everything else is loaded from the server each time.
      partialize: (s) => ({
        downloadedModules: s.downloadedModules,
        activityResults: s.activityResults,
        pendingRuns: s.pendingRuns,
      }),
    },
  ),
);

/**
 * For screens that can be opened directly (a reload, a link) outside the tabs, where the data
 * is normally loaded: load it if nobody has yet.
 */
export function useEnsureStudentData() {
  const loaded = useStudentStore((state) => state.loaded);
  const loading = useStudentStore((state) => state.loading);
  useEffect(() => {
    if (!loaded && !loading) void useStudentStore.getState().loadAll();
  }, [loaded, loading]);
}
