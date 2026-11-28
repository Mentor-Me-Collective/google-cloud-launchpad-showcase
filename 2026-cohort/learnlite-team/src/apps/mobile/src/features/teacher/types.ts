import type Ionicons from '@expo/vector-icons/Ionicons';
import type { SFSymbol } from 'expo-symbols';
import type { ComponentProps } from 'react';

export type StudentStatus = 'on-track' | 'needs-help' | 'broken-streak' | 'at-risk';

export type Classroom = {
  id: string;
  name: string;
  grade: string;
  subject: string;
  color: string;
  allowCommunity: boolean;
  code: string;
  studentIds: string[];
  createdAt: string;
};

export type Student = {
  id: string;
  name: string;
  classroomId: string;
  xp: number;
  accuracy: number;
  streak: number;
  activeToday: boolean;
  status: StudentStatus;
  lastActive: string;
};

export type BlockKind = 'theory' | 'material' | 'link' | 'activity';

export type ActivityType =
  | 'multiple-choice'
  | 'true-false'
  | 'match-pairs'
  | 'order-steps'
  | 'fill-blanks'
  | 'classify';

export type Pair = { left: string; right: string };

export type Category = { name: string; items: string[] };

export type Block = {
  id: string;
  kind: BlockKind;
  title: string;
  body?: string;
  imageDescription?: string;
  lumiComment?: string;
  attachAsSupport?: boolean;
  fileName?: string;
  fileSize?: string;
  url?: string;
  activityType?: ActivityType;
  instruction?: string;
  prompt?: string;
  options?: string[];
  answers?: string[];
  correctIndex?: number;
  correctBool?: boolean;
  explanation?: string;
  pairs?: Pair[];
  steps?: string[];
  categories?: Category[];
  xp?: number;
  hint?: string;
};

export type Lesson = {
  id: string;
  title: string;
  blocks: Block[];
  /** Student view: blocks the teacher added after this student finished the lesson. */
  newBlockCount?: number;
};

export type TeacherModule = {
  id: string;
  title: string;
  subject: string;
  status: 'draft' | 'published';
  /** Public modules appear in Community for every student. */
  visibility?: 'private' | 'public';
  lessons: Lesson[];
  createdAt: string;
  /** Set on a copy saved for offline study: when it was saved and which version of the module it is. */
  downloadedAt?: string;
  version?: number;
};

export type Assignment = {
  id: string;
  moduleId: string;
  classroomId: string;
  studentIds: string[];
  dueDate: string;
  message: string;
  notify: boolean;
  createdAt: string;
};

export type TeacherProfile = {
  school: string;
  subject: string;
};

export const CLASS_COLORS = [
  { id: 'sun', value: '#F5B301', soft: 'rgba(245,179,1,0.16)' },
  { id: 'blue', value: '#2F6BFF', soft: 'rgba(47,107,255,0.14)' },
  { id: 'pink', value: '#F06AA6', soft: 'rgba(240,106,166,0.16)' },
  { id: 'sky', value: '#3FB6E8', soft: 'rgba(63,182,232,0.16)' },
  { id: 'orange', value: '#F08A24', soft: 'rgba(240,138,36,0.16)' },
  { id: 'green', value: '#2ECC71', soft: 'rgba(46,204,113,0.16)' },
] as const;

export const ACTIVITY_META: Record<
  ActivityType,
  { label: string; short: string; icon: SFSymbol; md: ComponentProps<typeof Ionicons>['name']; tint: string }
> = {
  'multiple-choice': {
    label: 'Opción múltiple',
    short: 'Elige una respuesta',
    icon: 'list.bullet.circle.fill',
    md: 'list-circle',
    tint: '#2F6BFF',
  },
  'true-false': {
    label: 'Verdadero o falso',
    short: 'Dos opciones rápidas',
    icon: 'checkmark.circle.fill',
    md: 'checkmark-circle',
    tint: '#2ECC71',
  },
  'match-pairs': {
    label: 'Unir pares',
    short: 'Conecta conceptos',
    icon: 'link.circle.fill',
    md: 'link',
    tint: '#F06AA6',
  },
  'order-steps': {
    label: 'Ordenar pasos',
    short: 'Pon la secuencia en orden',
    icon: 'arrow.up.arrow.down.circle.fill',
    md: 'swap-vertical',
    tint: '#F08A24',
  },
  'fill-blanks': {
    label: 'Completar espacios',
    short: 'Escribe la palabra que falta',
    icon: 'text.cursor',
    md: 'create',
    tint: '#3FB6E8',
  },
  classify: {
    label: 'Clasificar',
    short: 'Agrupa por categorías',
    icon: 'square.grid.2x2.fill',
    md: 'grid',
    tint: '#14B8A6',
  },
};

export const BLOCK_KIND_LABEL: Record<BlockKind, string> = {
  theory: 'Teoría',
  material: 'Archivo',
  link: 'Enlace',
  activity: 'Actividad',
};
