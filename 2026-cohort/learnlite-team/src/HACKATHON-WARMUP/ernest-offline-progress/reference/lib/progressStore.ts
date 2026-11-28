// Offline progress store for LearnLite (reference). Everything lives on the
// phone in AsyncStorage: no login, no backend.
//
// Answers are stored as an object keyed by questionId, so a learner can never
// have two records for one question: answering again overwrites the record
// and adds 1 to attempts.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LEARNER_ID } from './learners';

export type AnswerRecord = {
  id: string; // learnerId:questionId
  learnerId: string;
  lessonId: string;
  questionId: string;
  answer: string;
  correct: boolean;
  attempts: number;
  offline: boolean;
  savedAt: string; // ISO time
};

export type ResumePoint = { lessonId: string; questionId: string };

/** Lessons in order, with their question ids, as the app defines them. */
export type LessonOutline = { lessonId: string; title: string; questionIds: string[] };

export type LessonStatus =
  | { lessonId: string; title: string; state: 'not_started' }
  | { lessonId: string; title: string; state: 'in_progress'; answered: number; total: number }
  | { lessonId: string; title: string; state: 'completed'; score: number; total: number };

const CURRENT_LEARNER_KEY = 'currentLearner';
const progressKey = (learnerId: string) => `progress:${learnerId}`;
const resumeKey = (learnerId: string) => `resume:${learnerId}`;

// Run writes one at a time, so two quick taps can't overwrite each other.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

export async function getCurrentLearner(): Promise<string> {
  return (await AsyncStorage.getItem(CURRENT_LEARNER_KEY)) ?? DEFAULT_LEARNER_ID;
}

export async function hasChosenLearner(): Promise<boolean> {
  return (await AsyncStorage.getItem(CURRENT_LEARNER_KEY)) !== null;
}

export async function setCurrentLearner(learnerId: string): Promise<void> {
  await AsyncStorage.setItem(CURRENT_LEARNER_KEY, learnerId);
}

export async function loadProgress(learnerId: string): Promise<Record<string, AnswerRecord>> {
  const raw = await AsyncStorage.getItem(progressKey(learnerId));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, AnswerRecord>;
  } catch {
    return {};
  }
}

/** Call the moment the learner taps an answer, and await it before moving on. */
export function saveAnswer(input: {
  learnerId: string;
  lessonId: string;
  questionId: string;
  answer: string;
  correct: boolean;
  offline: boolean;
}): Promise<AnswerRecord> {
  return serial(async () => {
    const all = await loadProgress(input.learnerId);
    const previous = all[input.questionId];
    const record: AnswerRecord = {
      ...input,
      id: `${input.learnerId}:${input.questionId}`,
      attempts: (previous?.attempts ?? 0) + 1,
      savedAt: new Date().toISOString(),
    };
    all[input.questionId] = record;
    await AsyncStorage.setItem(progressKey(input.learnerId), JSON.stringify(all));
    return record;
  });
}

export async function setResumePoint(learnerId: string, point: ResumePoint): Promise<void> {
  await serial(() => AsyncStorage.setItem(resumeKey(learnerId), JSON.stringify(point)));
}

export async function getResumePoint(learnerId: string): Promise<ResumePoint | null> {
  const raw = await AsyncStorage.getItem(resumeKey(learnerId));
  return raw ? (JSON.parse(raw) as ResumePoint) : null;
}

export async function resetLearner(learnerId: string): Promise<void> {
  await serial(() => AsyncStorage.multiRemove([progressKey(learnerId), resumeKey(learnerId)]));
}

/** First question in lesson order that has no saved answer. */
export function firstUnanswered(
  progress: Record<string, AnswerRecord>,
  lessons: LessonOutline[],
): ResumePoint | null {
  for (const lesson of lessons) {
    for (const questionId of lesson.questionIds) {
      if (!progress[questionId]) return { lessonId: lesson.lessonId, questionId };
    }
  }
  return null;
}

export function lessonStatuses(progress: Record<string, AnswerRecord>, lessons: LessonOutline[]): LessonStatus[] {
  return lessons.map((lesson) => {
    const done = lesson.questionIds.filter((q) => progress[q]);
    const total = lesson.questionIds.length;
    if (done.length === 0) return { lessonId: lesson.lessonId, title: lesson.title, state: 'not_started' };
    if (done.length < total) {
      return { lessonId: lesson.lessonId, title: lesson.title, state: 'in_progress', answered: done.length, total };
    }
    const score = done.filter((q) => progress[q].correct).length;
    return { lessonId: lesson.lessonId, title: lesson.title, state: 'completed', score, total };
  });
}

/** Numbers for the "Progress check" card on the Progress tab. */
export async function progressCheck(learnerId: string, lessons: LessonOutline[]) {
  const progress = await loadProgress(learnerId);
  const records = Object.values(progress);
  const seen = new Map<string, number>();
  for (const r of records) {
    const key = `${r.learnerId}:${r.questionId}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const duplicates = [...seen.values()].reduce((sum, n) => sum + (n - 1), 0);
  const resumePoint = await getResumePoint(learnerId);
  const expected = firstUnanswered(progress, lessons);
  const resumeOk =
    expected === null || (resumePoint?.lessonId === expected.lessonId && resumePoint?.questionId === expected.questionId);
  return {
    answersSaved: records.length,
    answeredOffline: records.filter((r) => r.offline).length,
    duplicates,
    resumePoint,
    intact: duplicates === 0 && resumeOk,
  };
}

export async function recentActivity(learnerId: string, limit = 15): Promise<AnswerRecord[]> {
  const records = Object.values(await loadProgress(learnerId));
  return records.sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, limit);
}

/** AI Smart badge: Final challenge passed with 4 or more correct. */
export function hasAiSmartBadge(statuses: LessonStatus[], finalLessonId: string): boolean {
  const final = statuses.find((s) => s.lessonId === finalLessonId);
  return !!final && final.state === 'completed' && final.score >= 4;
}
