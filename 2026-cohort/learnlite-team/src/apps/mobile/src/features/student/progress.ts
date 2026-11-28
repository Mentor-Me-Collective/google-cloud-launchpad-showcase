import type { ActivityResult } from '@/features/student/types/student';
import type { TeacherModule } from '@/features/teacher/types';

/** Percentage of a module's activities answered correctly. */
export function moduleProgress(module: TeacherModule, results: Record<string, ActivityResult>): number {
  const activities = module.lessons.flatMap((l) => l.blocks.filter((b) => b.kind === 'activity'));
  if (activities.length === 0) return 0;
  const done = activities.filter((a) => results[a.id]?.correct).length;
  return Math.round((done / activities.length) * 100);
}

/** The first lesson not completed yet, or null when the module is finished. */
export function nextLesson(module: TeacherModule, completed: string[]) {
  const index = module.lessons.findIndex((l) => !completed.includes(`${module.id}:${l.id}`));
  return index >= 0 ? { index, title: module.lessons[index].title } : null;
}

/** "Ana" from "Ana Gomez", or from "ana.gomez@school.edu". */
export function firstName(name: string): string {
  const clean = name.includes('@') ? name.split('@')[0].split(/[.+_-]/)[0] : name;
  const first = clean.trim().split(/\s+/)[0] ?? '';
  return first ? first[0].toUpperCase() + first.slice(1) : '';
}

/** Up to two initials for an avatar. */
export function initialsOf(name: string): string {
  const base = name.includes('@') ? name.split('@')[0].replace(/[._-]+/g, ' ') : name;
  const parts = base.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** A darker version of a #rrggbb colour, for the chunky "edge" under a coloured surface. */
export function edgeOf(color: string, amount = 0.75): string {
  const match = color.match(/^#([\da-f]{6})$/i);
  if (!match) return color;
  const value = Number.parseInt(match[1], 16);
  const part = (shift: number) => Math.round(((value >> shift) & 0xff) * amount).toString(16).padStart(2, '0');
  return `#${part(16)}${part(8)}${part(0)}`;
}
