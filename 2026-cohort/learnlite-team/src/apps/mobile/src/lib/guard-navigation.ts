import { router } from 'expo-router';

/**
 * A quick double tap on a button that opens a screen (Settings, a classroom, a lesson) used to
 * push that screen twice, so "back" had to be pressed twice. Every push or navigate that comes
 * within a short moment of the previous one is ignored, for the whole app at once.
 */
const WINDOW_MS = 700;
let last = 0;

function guard<T extends (...args: never[]) => unknown>(fn: T): T {
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last < WINDOW_MS) return undefined;
    last = now;
    return fn(...args);
  }) as T;
}

const target = router as { push: typeof router.push; navigate: typeof router.navigate; __guarded?: boolean };
if (!target.__guarded) {
  target.__guarded = true;
  target.push = guard(router.push.bind(router));
  target.navigate = guard(router.navigate.bind(router));
}
