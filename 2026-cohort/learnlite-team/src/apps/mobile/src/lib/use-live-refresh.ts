import { useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * Calls `task` now and then while the app is open, and again whenever the app comes back to
 * the foreground. This is how changes made by someone else (a teacher adding a student or
 * assigning a module) show up without signing out and in.
 */
export function useLiveRefresh(task: () => void | Promise<void>, enabled: boolean, intervalMs = 30_000) {
  useEffect(() => {
    if (!enabled) return;
    const run = () => {
      if (AppState.currentState === 'active') void task();
    };
    const timer = setInterval(run, intervalMs);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void task();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [enabled, task, intervalMs]);
}
