/**
 * Translations between the API (server) and the shapes the screens use (`types.ts`).
 *
 * The main difference: the screens keep an activity's fields flat (`activityType`,
 * `correctIndex`, ...) while the API nests them under `activity`, and the API rejects empty
 * options, pairs, steps or categories, so only the fields that matter for the type are sent.
 */
import type {
  ActivityType,
  Assignment,
  Block,
  Category,
  Classroom,
  Lesson,
  Pair,
  Student,
  StudentStatus,
  TeacherModule,
} from './types';
import { useSettingsStore } from '@/features/settings/store/settings-store';
import { translate } from '@/lib/i18n';

import { ACTIVITY_META, BLOCK_KIND_LABEL } from './types';

// ---- server shapes -----------------------------------------------------------
export type ServerActivity = {
  type: ActivityType;
  instruction?: string | null;
  prompt: string;
  options?: string[] | null;
  correctIndex?: number | null;
  correctBool?: boolean | null;
  answers?: string[] | null;
  pairs?: Pair[] | null;
  steps?: string[] | null;
  categories?: Category[] | null;
  explanation?: string;
  hint?: string | null;
  xp: number;
};

export type ServerBlock = {
  id: string;
  kind: Block['kind'];
  title: string;
  body?: string | null;
  imageDescription?: string | null;
  lumiComment?: string | null;
  attachAsSupport?: boolean | null;
  fileName?: string | null;
  fileSize?: string | null;
  url?: string | null;
  activity?: ServerActivity | null;
};

export type ServerLesson = {
  id: string;
  title: string;
  position: number;
  blocks?: ServerBlock[];
  progress?: { status?: string; newBlockCount?: number };
};

export type ServerModule = {
  id: string;
  title: string;
  subject: string;
  status: 'draft' | 'published';
  visibility?: 'private' | 'public';
  createdAt: string;
  version?: number;
  downloadedAt?: string;
  lessons?: ServerLesson[];
};

export type ServerClassroom = {
  id: string;
  name: string;
  grade: string;
  subject: string;
  color: string;
  allowJoinByCode: boolean;
  code: string;
  createdAt: string;
};

export type ServerMember = {
  studentId: string;
  name: string;
  xp: number;
  accuracy: number;
  streak: number;
  activeToday: boolean;
  lastActive: string | null;
  status: StudentStatus;
};

export type ServerAssignment = {
  id: string;
  moduleId: string;
  classroomId: string;
  studentIds?: string[];
  dueAt?: string | null;
  message?: string;
  instructions?: string;
  notify?: boolean;
  status?: string;
  createdAt: string;
};

// ---- server -> screens ---------------------------------------------------------
export function toBlock(block: ServerBlock): Block {
  const out: Block = {
    id: block.id,
    kind: block.kind,
    title: block.title,
    body: block.body ?? undefined,
    imageDescription: block.imageDescription ?? undefined,
    lumiComment: block.lumiComment ?? undefined,
    attachAsSupport: block.attachAsSupport ?? undefined,
    fileName: block.fileName ?? undefined,
    fileSize: block.fileSize ?? undefined,
    url: block.url ?? undefined,
  };
  const a = block.activity;
  if (a) {
    out.activityType = a.type;
    out.instruction = a.instruction ?? undefined;
    out.prompt = a.prompt;
    out.options = a.options ?? undefined;
    out.answers = a.answers ?? undefined;
    out.correctIndex = a.correctIndex ?? undefined;
    out.correctBool = a.correctBool ?? undefined;
    out.explanation = a.explanation || undefined;
    out.pairs = a.pairs ?? undefined;
    out.steps = a.steps ?? undefined;
    out.categories = a.categories ?? undefined;
    out.xp = a.xp;
    out.hint = a.hint ?? undefined;
  }
  return out;
}

export function toLesson(lesson: ServerLesson): Lesson {
  return {
    id: lesson.id,
    title: lesson.title,
    blocks: (lesson.blocks ?? []).map(toBlock),
    newBlockCount: lesson.progress?.newBlockCount || undefined,
  };
}

export function toModule(module: ServerModule): TeacherModule {
  return {
    id: module.id,
    title: module.title,
    subject: module.subject,
    status: module.status === 'published' ? 'published' : 'draft',
    visibility: module.visibility === 'public' ? 'public' : 'private',
    lessons: (module.lessons ?? []).map(toLesson),
    createdAt: module.createdAt,
    version: module.version,
    downloadedAt: module.downloadedAt,
  };
}

export function toClassroom(classroom: ServerClassroom, studentIds: string[]): Classroom {
  return {
    id: classroom.id,
    name: classroom.name,
    grade: classroom.grade,
    subject: classroom.subject,
    color: classroom.color,
    // "Join with code: students can join by themselves" in the app is allowJoinByCode in the API.
    allowCommunity: classroom.allowJoinByCode,
    code: classroom.code,
    studentIds,
    createdAt: classroom.createdAt,
  };
}

/** "Hoy", "Ayer", "Hace 3 días", "Nunca" from a YYYY-MM-DD date. */
export function friendlyDate(date: string | null | undefined, now = new Date()): string {
  const t = (key: string, values?: Record<string, string | number>) => translate(useSettingsStore.getState().locale, key, values);
  if (!date) return t('Never');
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const [y, m, d] = date.split('-').map(Number);
  const days = Math.round((today - Date.UTC(y, m - 1, d)) / 86_400_000);
  if (days <= 0) return t('Today');
  if (days === 1) return t('Yesterday');
  return t('{count} days ago', { count: days });
}

export function toStudent(member: ServerMember, classroomId: string): Student {
  return {
    id: member.studentId,
    name: member.name,
    classroomId,
    xp: member.xp,
    accuracy: member.accuracy,
    streak: member.streak,
    activeToday: member.activeToday,
    status: member.status,
    lastActive: friendlyDate(member.lastActive),
  };
}

export function toAssignment(a: ServerAssignment, classroomStudentIds: string[]): Assignment {
  return {
    id: a.id,
    moduleId: a.moduleId,
    classroomId: a.classroomId,
    // An empty list on the server means "the whole classroom".
    studentIds: a.studentIds && a.studentIds.length > 0 ? a.studentIds : classroomStudentIds,
    dueDate: a.dueAt ?? '',
    message: a.message ?? a.instructions ?? '',
    notify: Boolean(a.notify),
    createdAt: a.createdAt,
  };
}

// ---- screens -> server ---------------------------------------------------------
const filled = (value?: string | null) => (value ?? '').trim();
const nonEmpty = (values?: string[]) => (values ?? []).map((v) => v.trim()).filter(Boolean);

/** The activity body for the API: only the fields that belong to the type, with blanks removed. */
export function toServerActivity(block: Block): ServerActivity {
  const type = block.activityType ?? 'multiple-choice';
  const activity: ServerActivity = {
    type,
    prompt: filled(block.prompt) || filled(block.title) || ACTIVITY_META[type].label,
    instruction: filled(block.instruction),
    explanation: filled(block.explanation),
    hint: filled(block.hint),
    xp: Math.max(0, Math.round(block.xp ?? 10)),
  };
  if (type === 'multiple-choice') {
    activity.options = nonEmpty(block.options);
    activity.correctIndex = block.correctIndex ?? 0;
  } else if (type === 'true-false') {
    activity.correctBool = block.correctBool ?? true;
  } else if (type === 'match-pairs') {
    activity.pairs = (block.pairs ?? [])
      .map((p) => ({ left: p.left.trim(), right: p.right.trim() }))
      .filter((p) => p.left && p.right);
  } else if (type === 'order-steps') {
    activity.steps = nonEmpty(block.steps);
  } else if (type === 'fill-blanks') {
    activity.answers = nonEmpty(block.answers);
  } else if (type === 'classify') {
    activity.categories = (block.categories ?? [])
      .map((c) => ({ name: c.name.trim(), items: nonEmpty(c.items) }))
      .filter((c) => c.name);
  }
  return activity;
}

/** A block as the API wants it (for both create and update). */
export function toServerBlock(block: Block): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    kind: block.kind,
    title: filled(block.title) || (block.kind === 'activity' && block.activityType ? ACTIVITY_META[block.activityType].label : BLOCK_KIND_LABEL[block.kind]),
  };
  if (block.kind === 'theory') {
    payload.body = block.body ?? '';
    payload.imageDescription = block.imageDescription ?? '';
    payload.lumiComment = block.lumiComment ?? '';
    payload.attachAsSupport = Boolean(block.attachAsSupport);
  } else if (block.kind === 'material') {
    payload.fileName = block.fileName ?? '';
    payload.fileSize = block.fileSize ?? '';
  } else if (block.kind === 'link') {
    payload.url = filled(block.url);
  } else {
    payload.activity = toServerActivity(block);
  }
  return payload;
}
