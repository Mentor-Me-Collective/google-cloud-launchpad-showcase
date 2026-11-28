import type { LessonCompletion, PackLesson } from '@/features/learn/types/learn';

export type LessonStatus = 'not-downloaded' | 'offline' | 'in-progress' | 'completed';

export function lessonPercent(
  lesson: PackLesson,
  positions: Record<string, number>,
  completed: Record<string, LessonCompletion>,
): number {
  if (completed[lesson.lesson_id]) return 100;
  const step = positions[lesson.lesson_id];
  if (step === undefined) return 0;
  return Math.round((step / lesson.items.length) * 100);
}

export function modulePercent(
  lessons: PackLesson[],
  positions: Record<string, number>,
  completed: Record<string, LessonCompletion>,
): number {
  if (lessons.length === 0) return 0;
  const total = lessons.reduce((sum, l) => sum + lessonPercent(l, positions, completed), 0);
  return Math.round(total / lessons.length);
}

export function lessonStatus(
  lessonID: string,
  downloaded: boolean,
  positions: Record<string, number>,
  completed: Record<string, LessonCompletion>,
): LessonStatus {
  if (completed[lessonID]) return 'completed';
  if (!downloaded) return 'not-downloaded';
  if (positions[lessonID] !== undefined) return 'in-progress';
  return 'offline';
}

export const STATUS_LABEL: Record<LessonStatus, string> = {
  'not-downloaded': 'Not downloaded',
  offline: 'Available offline',
  'in-progress': 'In progress · available offline',
  completed: 'Completed',
};

export function timeAgo(iso: string, locale: 'es' | 'en' = 'en'): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return locale === 'es' ? 'Ahora mismo' : 'Just now';
  if (minutes < 60) return locale === 'es' ? `hace ${minutes} min` : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return locale === 'es' ? `hace ${hours} h` : `${hours} h ago`;
  return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US');
}
