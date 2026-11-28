import type { Assignment, Classroom, TeacherModule } from '@/features/teacher/types';

export type ActivityResult = {
  activityId: string;
  correct: boolean;
  xp: number;
  completedAt: string;
};

/** What the server answers after checking one activity. */
export type AnswerResult = {
  correct: boolean;
  earnedXp: number;
  explanation: string;
  hearts: { current: number; max: number };
  canContinue: boolean;
  /** The last heart of this lesson run is gone: the lesson starts again from the beginning. */
  lessonFailed?: boolean;
};

export type LessonSummary = {
  completed: boolean;
  score: { correct: number; total: number };
  earnedXp: number;
  moduleCompleted: boolean;
};

/** A lesson played without internet, waiting to be sent to the server (which grades it again). */
export type PendingRun = {
  clientRunId: string;
  moduleId: string;
  lessonId: string;
  answers: { blockId: string; answer: Record<string, unknown>; wrongAttempts: number }[];
};

export type StudentState = {
  // Loaded from the server (read-only copy)
  classrooms: Classroom[];
  assignments: Assignment[];
  modules: TeacherModule[];
  loading: boolean;
  loaded: boolean;
  syncError: string | null;

  // Derived from the server, kept under the names the screens already use
  joinedClassroomIds: string[];
  completedLessonIds: string[];
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  hearts: number;
  maxHearts: number;

  // Kept on the device
  downloadedModules: TeacherModule[];
  activityResults: Record<string, ActivityResult>;
  /** Lessons finished offline that the server has not received yet. */
  pendingRuns: PendingRun[];
  /** Modules being downloaded right now. */
  downloading: string[];

  /** Load everything (shows the loading state). */
  loadAll: () => Promise<void>;
  /** Reload quietly in the background; failures are ignored. */
  refresh: () => Promise<void>;
  reset: () => void;
  /** Opens a module that is not assigned (a Community one) so it can be played. False if it is unavailable. */
  fetchModule: (moduleId: string) => Promise<boolean>;
  clearSyncError: () => void;
  /** Join with a classroom code. Resolves with the classroom name, or null if it failed. */
  joinByCode: (code: string) => Promise<{ name: string } | { error: string }>;
  leaveClassroom: (classroomId: string) => void;
  /** Saves the module on the phone, solutions included, so it can be studied offline. */
  downloadModule: (moduleId: string, options?: { quiet?: boolean }) => Promise<boolean>;
  /** Sends the lessons finished offline; safe to call any time, it does nothing without internet. */
  syncOfflineRuns: () => Promise<void>;
  removeModule: (moduleId: string) => void;

  /** Lesson run on the server. */
  /** `onlyNew` plays just the blocks added since the student finished the lesson. */
  startLesson: (
    moduleId: string,
    lessonId: string,
    options?: { onlyNew?: boolean; /** pick up the run in progress instead of starting over */ resume?: boolean },
  ) => Promise<{ attemptId: string; blockIds: string[]; currentPosition: number } | null>;
  /** Resolves 'resync' when the screen and the server disagree about where the student is. */
  answerBlock: (
    attemptId: string,
    blockId: string,
    answer: Record<string, unknown>,
    xp: number,
  ) => Promise<AnswerResult | 'resync' | null>;
  /** Resolves false when the server did not accept the step. */
  continueLesson: (attemptId: string) => Promise<boolean>;
  finishLesson: (attemptId: string, moduleId: string, lessonId: string) => Promise<LessonSummary | null>;

  completeLesson: (moduleId: string, lessonId: string) => void;
  recordActivity: (input: { activityId: string; correct: boolean; xp: number }) => void;
  restoreHearts: () => void;
  resetStudentData: () => void;
};
