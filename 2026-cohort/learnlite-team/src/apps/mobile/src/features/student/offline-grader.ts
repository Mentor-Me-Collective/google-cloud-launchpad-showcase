import type { Block } from '@/features/teacher/types';

/**
 * Grades one answer on the phone, with the same rules the server uses
 * (`content_models.grade_answer`). The server still grades every answer again when the
 * lesson is synced, so this only decides what the student sees while offline.
 * Returns null when the answer is not in the shape the activity expects.
 */
const text = (value: unknown): string | null =>
  typeof value === 'string' ? value.split(/\s+/).filter(Boolean).join(' ').toLowerCase() : null;

const stripAccents = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '');

const sameMap = (a: Map<string, string>, b: Map<string, string>) =>
  a.size === b.size && [...a].every(([key, value]) => b.get(key) === value);

export function gradeLocally(block: Block, answer: Record<string, unknown>): boolean | null {
  switch (block.activityType) {
    case 'multiple-choice': {
      const index = answer.selectedIndex;
      if (typeof index !== 'number' || !Number.isInteger(index)) return null;
      if (index < 0 || index >= (block.options?.length ?? 0)) return null;
      return index === block.correctIndex;
    }
    case 'true-false':
      return typeof answer.value === 'boolean' ? answer.value === block.correctBool : null;
    case 'match-pairs': {
      if (!Array.isArray(answer.matches)) return null;
      const expected = new Map<string, string>();
      for (const pair of block.pairs ?? []) expected.set(text(pair.left) ?? '', text(pair.right) ?? '');
      const given = new Map<string, string>();
      for (const match of answer.matches as { left?: unknown; right?: unknown }[]) {
        const left = text(match?.left);
        const right = text(match?.right);
        if (left === null || right === null || !expected.has(left) || given.has(left)) return null;
        given.set(left, right);
      }
      return given.size === expected.size ? sameMap(given, expected) : null;
    }
    case 'order-steps': {
      if (!Array.isArray(answer.order)) return null;
      const given = (answer.order as unknown[]).map(text);
      const expected = (block.steps ?? []).map((step) => text(step) ?? '');
      if (given.some((step) => step === null)) return null;
      const sorted = (list: (string | null)[]) => [...list].sort().join('\u0000');
      if (sorted(given) !== sorted(expected)) return null;
      return given.every((step, index) => step === expected[index]);
    }
    case 'fill-blanks': {
      const raw = answer.values ?? answer.value;
      const value = Array.isArray(raw) && raw.length === 1 ? raw[0] : raw;
      const given = text(value);
      if (given === null) return null;
      return (block.answers ?? []).some((accepted) => stripAccents(text(accepted) ?? '') === stripAccents(given));
    }
    case 'classify': {
      if (!Array.isArray(answer.assignments)) return null;
      const expected = new Map<string, string>();
      for (const category of block.categories ?? []) {
        for (const item of category.items) expected.set(text(item) ?? '', text(category.name) ?? '');
      }
      const given = new Map<string, string>();
      for (const entry of answer.assignments as { item?: unknown; category?: unknown }[]) {
        const item = text(entry?.item);
        const category = text(entry?.category);
        if (item === null || category === null || !expected.has(item) || given.has(item)) return null;
        given.set(item, category);
      }
      return given.size === expected.size ? sameMap(given, expected) : null;
    }
    default:
      return null;
  }
}
