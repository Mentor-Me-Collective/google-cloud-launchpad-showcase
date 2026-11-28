import { create } from 'zustand';

import { api, errorMessage } from '@/lib/api';

import {
  toAssignment,
  toBlock,
  toClassroom,
  toLesson,
  toModule,
  toServerBlock,
  toStudent,
  type ServerAssignment,
  type ServerBlock,
  type ServerClassroom,
  type ServerLesson,
  type ServerMember,
  type ServerModule,
} from '../mappers';
import type {
  Assignment,
  Block,
  Classroom,
  Lesson,
  Student,
  TeacherModule,
  TeacherProfile,
} from '../types';

/**
 * Teacher data, kept in memory and loaded from the API (`loadAll`). Screens read it
 * synchronously; changes show up at once and are sent to the server in the background.
 * If the server refuses a change, `syncError` is set and everything is reloaded so the
 * screen matches the server again.
 */

type CreateClassroomInput = {
  name: string;
  grade: string;
  subject: string;
  color: string;
  allowCommunity: boolean;
};

type AssignModuleInput = {
  moduleId: string;
  classroomIds: string[];
  studentIds: string[];
  dueDate: string;
  message: string;
  notify: boolean;
};

type TeacherState = {
  profile: TeacherProfile;
  classrooms: Classroom[];
  students: Student[];
  modules: TeacherModule[];
  assignments: Assignment[];
  loading: boolean;
  loaded: boolean;
  syncError: string | null;

  loadAll: () => Promise<void>;
  /**
   * Quiet background refresh of classrooms, students and assignments (students join and
   * progress on their own). Modules are not touched, so nothing the teacher is typing is lost.
   */
  refreshPeople: () => Promise<void>;
  reset: () => void;
  clearSyncError: () => void;

  /** Resolves with the new id, or '' if the server refused. */
  createClassroom: (input: CreateClassroomInput) => Promise<string>;
  updateClassroom: (
    classroomId: string,
    patch: Partial<Pick<Classroom, 'name' | 'grade' | 'subject' | 'color' | 'allowCommunity'>>,
  ) => void;
  /** 'active' when the student already had an account, 'pending' when it is an open invitation. */
  addStudentByEmail: (classroomId: string, email: string) => Promise<'active' | 'pending' | ''>;
  addStudents: (classroomId: string, studentIds: string[]) => Promise<void>;
  removeStudent: (classroomId: string, studentId: string) => void;

  createModule: (input: { title: string; subject: string }) => Promise<string>;
  updateModule: (moduleId: string, patch: Partial<Pick<TeacherModule, 'title' | 'subject'>>) => void;
  addLesson: (moduleId: string, title: string) => Promise<string>;
  updateLesson: (moduleId: string, lessonId: string, patch: Partial<Pick<Lesson, 'title'>>) => void;
  addBlock: (moduleId: string, lessonId: string, block: Block) => void;
  updateBlock: (moduleId: string, lessonId: string, blockId: string, patch: Partial<Block>) => void;
  removeBlock: (moduleId: string, lessonId: string, blockId: string) => void;
  /** Send pending edits (title, lesson names, blocks) to the server now. */
  saveModule: (moduleId: string) => Promise<void>;
  /** Resolves true when the module is published. */
  publishModule: (moduleId: string) => Promise<boolean>;
  /** Share the module in Community (public) or stop sharing it (private). */
  setVisibility: (moduleId: string, visibility: 'private' | 'public') => void;

  assignModule: (input: AssignModuleInput) => Promise<boolean>;
  /** Take an assignment away from the students. Their progress is kept. */
  removeAssignment: (assignmentId: string) => void;
  updateProfile: (patch: Partial<TeacherProfile>) => void;
};

const empty = {
  profile: { school: '', subject: '' } as TeacherProfile,
  classrooms: [] as Classroom[],
  students: [] as Student[],
  modules: [] as TeacherModule[],
  assignments: [] as Assignment[],
  loading: false,
  loaded: false,
  syncError: null as string | null,
};

/** Text typed in the module editor is saved a moment after the last keystroke. */
const SAVE_DELAY_MS = 700;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const flushers = new Map<string, () => Promise<void>>();
/** A block created on screen has a temporary id until the server answers. */
const realBlockIds = new Map<string, Promise<string>>();
/** What the last background refresh returned, to skip re-rendering when nothing changed. */
let lastPeopleSignature = '';

function schedule(key: string, task: () => Promise<void>) {
  const previous = timers.get(key);
  if (previous) clearTimeout(previous);
  flushers.set(key, task);
  timers.set(key, setTimeout(() => void flush(key), SAVE_DELAY_MS));
}

async function flush(key: string) {
  const timer = timers.get(key);
  if (timer) clearTimeout(timer);
  timers.delete(key);
  const task = flushers.get(key);
  flushers.delete(key);
  if (task) await task();
}

async function flushModule(moduleId: string) {
  const keys = [...flushers.keys()].filter((key) => key === `m:${moduleId}` || key.startsWith(`l:${moduleId}:`));
  await Promise.all(keys.map((key) => flush(key)));
}

function mapModules(state: TeacherState, moduleId: string, change: (module: TeacherModule) => TeacherModule) {
  return state.modules.map((module) => (module.id === moduleId ? change(module) : module));
}

export const useTeacherStore = create<TeacherState>()((set, get) => {
  /** Run a server call. On failure show the error and reload so the screen matches the server. */
  async function guard<T>(task: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await task();
    } catch (error) {
      set({ syncError: errorMessage(error) });
      void get().loadAll();
      return fallback;
    }
  }

  async function membersOf(classroomId: string): Promise<ServerMember[]> {
    return (await api<{ items: ServerMember[] }>(`/teacher/classrooms/${classroomId}/members`)).items;
  }

  /** Replace one classroom's students after the server changed them. */
  async function refreshMembers(classroomId: string) {
    const members = await membersOf(classroomId);
    set((state) => ({
      students: [...state.students.filter((s) => s.classroomId !== classroomId), ...members.map((m) => toStudent(m, classroomId))],
      classrooms: state.classrooms.map((c) =>
        c.id === classroomId ? { ...c, studentIds: members.map((m) => m.studentId) } : c,
      ),
    }));
  }

  return {
    ...empty,

    loadAll: async () => {
      set({ loading: true });
      try {
        const [me, classrooms, modules, assignments] = await Promise.all([
          api<{ school?: string; subject?: string }>('/me'),
          api<{ items: ServerClassroom[] }>('/teacher/classrooms'),
          api<{ items: ServerModule[] }>('/teacher/modules'),
          api<{ items: ServerAssignment[] }>('/teacher/assignments'),
        ]);
        const [memberLists, trees] = await Promise.all([
          Promise.all(classrooms.items.map((c) => membersOf(c.id))),
          Promise.all(modules.items.map((m) => api<ServerModule>(`/teacher/modules/${m.id}`))),
        ]);

        const studentIdsByClass = new Map(classrooms.items.map((c, i) => [c.id, memberLists[i].map((m) => m.studentId)]));
        set({
          profile: { school: me.school ?? '', subject: me.subject ?? '' },
          classrooms: classrooms.items.map((c) => toClassroom(c, studentIdsByClass.get(c.id) ?? [])),
          students: classrooms.items.flatMap((c, i) => memberLists[i].map((m) => toStudent(m, c.id))),
          modules: trees.map(toModule),
          assignments: assignments.items.filter((a) => a.status !== 'cancelled').map((a) => toAssignment(a, studentIdsByClass.get(a.classroomId) ?? [])),
          loading: false,
          loaded: true,
          syncError: null,
        });
      } catch (error) {
        set({ loading: false, syncError: errorMessage(error) });
      }
    },

    refreshPeople: async () => {
      try {
        const [classrooms, assignments] = await Promise.all([
          api<{ items: ServerClassroom[] }>('/teacher/classrooms'),
          api<{ items: ServerAssignment[] }>('/teacher/assignments'),
        ]);
        const memberLists = await Promise.all(classrooms.items.map((c) => membersOf(c.id)));
        const signature = JSON.stringify([classrooms.items, assignments.items, memberLists]);
        if (signature === lastPeopleSignature) return;
        lastPeopleSignature = signature;
        const studentIdsByClass = new Map(classrooms.items.map((c, i) => [c.id, memberLists[i].map((m) => m.studentId)]));
        set({
          classrooms: classrooms.items.map((c) => toClassroom(c, studentIdsByClass.get(c.id) ?? [])),
          students: classrooms.items.flatMap((c, i) => memberLists[i].map((m) => toStudent(m, c.id))),
          assignments: assignments.items.filter((a) => a.status !== 'cancelled').map((a) => toAssignment(a, studentIdsByClass.get(a.classroomId) ?? [])),
        });
      } catch {
        // Background refresh: keep what is on screen if the server is unreachable.
      }
    },

    reset: () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      flushers.clear();
      set({ ...empty });
    },

    clearSyncError: () => set({ syncError: null }),

    // ---- classrooms ---------------------------------------------------------
    createClassroom: (input) =>
      guard(async () => {
        const created = await api<ServerClassroom>('/teacher/classrooms', {
          method: 'POST',
          body: {
            name: input.name.trim() || 'Nueva aula',
            grade: input.grade.trim() || 'General',
            subject: input.subject.trim() || 'General',
            color: input.color,
            allowJoinByCode: input.allowCommunity,
          },
        });
        set((state) => ({ classrooms: [toClassroom(created, []), ...state.classrooms] }));
        return created.id;
      }, ''),

    updateClassroom: (classroomId, patch) => {
      set((state) => ({
        classrooms: state.classrooms.map((c) => (c.id === classroomId ? { ...c, ...patch } : c)),
      }));
      const { allowCommunity, ...rest } = patch;
      const body = { ...rest, ...(allowCommunity === undefined ? {} : { allowJoinByCode: allowCommunity }) };
      void guard(() => api(`/teacher/classrooms/${classroomId}`, { method: 'PATCH', body }), undefined);
    },

    addStudentByEmail: (classroomId, email) =>
      guard(async () => {
        const result = await api<{ status: 'active' | 'pending' }>(`/teacher/classrooms/${classroomId}/invitations`, {
          method: 'POST',
          body: { email: email.trim() },
        });
        if (result.status === 'active') await refreshMembers(classroomId);
        return result.status;
      }, '' as const),

    addStudents: (classroomId, studentIds) =>
      guard(async () => {
        await api(`/teacher/classrooms/${classroomId}/members`, { method: 'POST', body: { studentIds } });
        await refreshMembers(classroomId);
      }, undefined),

    removeStudent: (classroomId, studentId) => {
      set((state) => ({
        students: state.students.filter((s) => !(s.id === studentId && s.classroomId === classroomId)),
        classrooms: state.classrooms.map((c) =>
          c.id === classroomId ? { ...c, studentIds: c.studentIds.filter((id) => id !== studentId) } : c,
        ),
      }));
      void guard(() => api(`/teacher/classrooms/${classroomId}/members/${studentId}`, { method: 'DELETE' }), undefined);
    },

    // ---- modules, lessons and blocks -------------------------------------------
    createModule: (input) =>
      guard(async () => {
        const created = await api<ServerModule>('/teacher/modules', {
          method: 'POST',
          body: { title: input.title.trim() || 'Nuevo módulo', subject: input.subject.trim() || 'Sin materia' },
        });
        set((state) => ({ modules: [toModule({ ...created, lessons: [] }), ...state.modules] }));
        return created.id;
      }, ''),

    updateModule: (moduleId, patch) => {
      set((state) => ({ modules: mapModules(state, moduleId, (m) => ({ ...m, ...patch })) }));
      schedule(`m:${moduleId}`, async () => {
        const module = get().modules.find((m) => m.id === moduleId);
        if (!module || !module.title.trim() || !module.subject.trim()) return; // still typing
        await guard(
          () => api(`/teacher/modules/${moduleId}`, { method: 'PATCH', body: { title: module.title, subject: module.subject } }),
          undefined,
        );
      });
    },

    setVisibility: (moduleId, visibility) => {
      const before = get().modules.find((m) => m.id === moduleId)?.visibility ?? 'private';
      set((state) => ({ modules: mapModules(state, moduleId, (m) => ({ ...m, visibility })) }));
      void guard(
        () => api(`/teacher/modules/${moduleId}`, { method: 'PATCH', body: { visibility } }),
        undefined,
      ).then((result) => {
        // The server refused: put the switch back where it was.
        if (result === undefined && get().syncError) {
          set((state) => ({ modules: mapModules(state, moduleId, (m) => ({ ...m, visibility: before })) }));
        }
      });
    },

    addLesson: (moduleId, title) =>
      guard(async () => {
        const created = await api<ServerLesson>(`/teacher/modules/${moduleId}/lessons`, {
          method: 'POST',
          body: { title: title.trim() || 'Nueva lección' },
        });
        const lesson = toLesson({ ...created, blocks: [] });
        set((state) => ({ modules: mapModules(state, moduleId, (m) => ({ ...m, lessons: [...m.lessons, lesson] })) }));
        return lesson.id;
      }, ''),

    updateLesson: (moduleId, lessonId, patch) => {
      set((state) => ({
        modules: mapModules(state, moduleId, (m) => ({
          ...m,
          lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)),
        })),
      }));
      schedule(`l:${moduleId}:${lessonId}`, async () => {
        const lesson = get().modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId);
        if (!lesson || !lesson.title.trim()) return;
        await guard(
          () => api(`/teacher/modules/${moduleId}/lessons/${lessonId}`, { method: 'PATCH', body: { title: lesson.title } }),
          undefined,
        );
      });
    },

    addBlock: (moduleId, lessonId, block) => {
      const tempId = block.id;
      const put = (change: (blocks: Block[]) => Block[]) =>
        set((state) => ({
          modules: mapModules(state, moduleId, (m) => ({
            ...m,
            lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, blocks: change(l.blocks) } : l)),
          })),
        }));
      put((blocks) => [...blocks, block]);
      const request = api<ServerBlock>(`/teacher/modules/${moduleId}/lessons/${lessonId}/blocks`, {
        method: 'POST',
        body: toServerBlock(block),
      }).then((created) => {
        put((blocks) => blocks.map((b) => (b.id === tempId ? toBlock(created) : b)));
        return created.id;
      });
      realBlockIds.set(tempId, request);
      request.catch((error) => {
        set({ syncError: errorMessage(error) });
        put((blocks) => blocks.filter((b) => b.id !== tempId));
      });
    },

    updateBlock: (moduleId, lessonId, blockId, patch) => {
      const apply = (id: string, change: (b: Block) => Block) =>
        set((state) => ({
          modules: mapModules(state, moduleId, (m) => ({
            ...m,
            lessons: m.lessons.map((l) =>
              l.id === lessonId ? { ...l, blocks: l.blocks.map((b) => (b.id === id ? change(b) : b)) } : l,
            ),
          })),
        }));
      apply(blockId, (b) => ({ ...b, ...patch }));
      void guard(async () => {
        const id = (await realBlockIds.get(blockId)) ?? blockId;
        const current = get().modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId)?.blocks
          .find((b) => b.id === id || b.id === blockId);
        if (!current) return;
        const saved = await api<ServerBlock>(`/teacher/modules/${moduleId}/lessons/${lessonId}/blocks/${id}`, {
          method: 'PATCH',
          body: toServerBlock({ ...current, ...patch }),
        });
        apply(current.id, () => toBlock(saved));
      }, undefined);
    },

    removeBlock: (moduleId, lessonId, blockId) => {
      set((state) => ({
        modules: mapModules(state, moduleId, (m) => ({
          ...m,
          lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, blocks: l.blocks.filter((b) => b.id !== blockId) } : l)),
        })),
      }));
      void guard(async () => {
        const id = (await realBlockIds.get(blockId)) ?? blockId;
        await api(`/teacher/modules/${moduleId}/lessons/${lessonId}/blocks/${id}`, { method: 'DELETE' });
      }, undefined);
    },

    saveModule: async (moduleId) => {
      await flushModule(moduleId);
      await Promise.allSettled([...realBlockIds.values()]);
    },

    publishModule: async (moduleId) => {
      try {
        await flushModule(moduleId);
        await Promise.allSettled([...realBlockIds.values()]);
        await api(`/teacher/modules/${moduleId}/publish`, { method: 'POST' });
        set((state) => ({ modules: mapModules(state, moduleId, (m) => ({ ...m, status: 'published' })) }));
        return true;
      } catch (error) {
        set({ syncError: errorMessage(error) });
        return false;
      }
    },

    // ---- assignments ---------------------------------------------------------------
    assignModule: async (input) => {
      try {
        const due = input.dueDate ? new Date(input.dueDate) : null;
        await api('/teacher/assignments', {
          method: 'POST',
          body: {
            moduleId: input.moduleId,
            classroomIds: input.classroomIds,
            studentIds: input.studentIds,
            dueAt: due && !Number.isNaN(due.getTime()) ? due.toISOString() : null,
            message: input.message,
            notify: input.notify,
          },
        });
        const list = await api<{ items: ServerAssignment[] }>('/teacher/assignments');
        const idsByClass = new Map(get().classrooms.map((c) => [c.id, c.studentIds]));
        set({ assignments: list.items.filter((a) => a.status !== 'cancelled').map((a) => toAssignment(a, idsByClass.get(a.classroomId) ?? [])) });
        return true;
      } catch (error) {
        set({ syncError: errorMessage(error) });
        return false;
      }
    },

    removeAssignment: (assignmentId) => {
      set((state) => ({ assignments: state.assignments.filter((a) => a.id !== assignmentId) }));
      void guard(() => api(`/teacher/assignments/${assignmentId}`, { method: 'DELETE' }), undefined);
    },

    updateProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),
  };
});
