import { ACTIVITY_META, BLOCK_KIND_LABEL, type ActivityType, type Block, type BlockKind, type StudentStatus, type TeacherModule } from './types';

export const STUDENT_STATUS_META: Record<
  StudentStatus,
  { label: string; tone: 'success' | 'warning' | 'muted' }
> = {
  'on-track': { label: 'Al día', tone: 'success' },
  'needs-help': { label: 'Necesita apoyo', tone: 'warning' },
  'broken-streak': { label: 'Racha rota', tone: 'warning' },
  'at-risk': { label: 'En riesgo', tone: 'muted' },
};

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function moduleBlockCount(module: TeacherModule): number {
  return module.lessons.reduce((sum, lesson) => sum + lesson.blocks.length, 0);
}

export function blockLabel(block: Block): string {
  if (block.kind === 'activity' && block.activityType) return ACTIVITY_META[block.activityType].label;
  return BLOCK_KIND_LABEL[block.kind];
}

export function emptyBlock(kind: BlockKind, activityType?: ActivityType): Block {
  const base: Block = { id: newId('b'), kind, title: '' };

  if (kind === 'theory') {
    return { ...base, body: '', imageDescription: '', lumiComment: '', attachAsSupport: false };
  }
  if (kind === 'material') {
    return { ...base, fileName: '', fileSize: '' };
  }
  if (kind === 'link') {
    return { ...base, url: '' };
  }

  return {
    ...base,
    activityType,
    instruction: '',
    prompt: '',
    options: ['', ''],
    answers: [''],
    correctIndex: 0,
    correctBool: true,
    explanation: '',
    pairs: [
      { left: '', right: '' },
      { left: '', right: '' },
    ],
    steps: ['', ''],
    categories: [
      { name: '', items: [] },
      { name: '', items: [] },
    ],
    xp: 10,
    hint: '',
  };
}

/** "27 nov" from an ISO date, or '' when an assignment has no due date. */
export function dueLabel(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value; // already a readable text such as "27 nov 2026"
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
