import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

interface TasksState {
  /** day key (YYYY-MM-DD) → ids of tasks ticked by hand that day */
  done: Record<string, string[]>;
  /** day keys whose "every building checked in" celebration already played */
  celebrated: string[];
  toggle: (day: string, taskID: string) => void;
  markCelebrated: (day: string) => void;
}

export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      done: {},
      celebrated: [],
      toggle: (day, taskID) => {
        const current = get().done[day] ?? [];
        const next = current.includes(taskID) ? current.filter((t) => t !== taskID) : [...current, taskID];
        set({ done: { ...get().done, [day]: next } });
      },
      markCelebrated: (day) => set({ celebrated: [...get().celebrated, day] }),
    }),
    { name: 'tasks', storage: createJSONStorage(() => zustandStorage) },
  ),
);
