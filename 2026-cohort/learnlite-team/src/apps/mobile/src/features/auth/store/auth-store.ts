import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { api, ApiError } from '@/lib/api';
import { isConfigured } from '@/lib/config';
import { getFirebaseAuth } from '@/lib/firebase';
import { useStudentStore } from '@/features/student/store/student-store';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import { zustandStorage } from '@/lib/storage';

export type UserRole = 'student' | 'teacher';

/** What `POST /me/bootstrap` and `GET /me` return. */
type Profile = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  school?: string;
  subject?: string;
};

type AuthState = {
  authenticated: boolean;
  uid: string;
  name: string;
  email: string;
  school: string;
  role: UserRole;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  /** New accounts are always students. Teacher access is granted by LearnLite (Firebase custom claim). */
  signUp: (input: { name: string; email: string; password: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (input: { name?: string; school?: string; subject?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  /** Keeps the app in sync with the Firebase session. Returns an unsubscribe function. */
  watchSession: () => () => void;
};

const signedOut = { authenticated: false, uid: '', name: '', email: '', school: '', role: 'student' as UserRole };

/** True while sign-in or sign-up is running, so the session listener does not race with it. */
let busy = false;

/**
 * Turns a Firebase or API error into a short English message. Screens translate it with
 * `copy.t(...)`, so every message here has a Spanish entry in `lib/i18n.ts`.
 */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'Wrong email or password.';
    case 'auth/invalid-email':
      return 'That email does not look right.';
    case 'auth/email-already-in-use':
      return 'There is already an account with that email.';
    case 'auth/weak-password':
      return 'Use a password with at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a few minutes.';
    case 'auth/user-disabled':
      return 'This account is disabled.';
    case 'auth/network-request-failed':
      return 'No internet connection.';
  }
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK' || error.code === 'TIMEOUT') return 'Could not reach the LearnLite server.';
    if (error.status === 403) return 'This account cannot use LearnLite right now.';
  }
  if (error instanceof Error && error.message.includes('not configured')) {
    return 'The app is not configured. Check the .env file.';
  }
  return 'Something went wrong. Try again.';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...signedOut,

      refreshProfile: async () => {
        const profile = await api<Profile>('/me/bootstrap', { method: 'POST' });
        set({
          authenticated: true,
          uid: profile.id,
          name: profile.name,
          email: profile.email,
          school: profile.school ?? '',
          role: profile.role === 'teacher' ? 'teacher' : 'student',
        });
      },

      signIn: async ({ email, password }) => {
        busy = true;
        try {
          await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
          await get().refreshProfile();
        } catch (error) {
          await firebaseSignOut(getFirebaseAuth()).catch(() => undefined);
          set(signedOut);
          throw error;
        } finally {
          busy = false;
        }
      },

      signUp: async ({ name, email, password }) => {
        busy = true;
        try {
          const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
          const cleanName = name.trim();
          if (cleanName) await updateFirebaseProfile(credential.user, { displayName: cleanName }).catch(() => undefined);
          await get().refreshProfile();
          if (cleanName && get().name !== cleanName) await get().updateProfile({ name: cleanName });
        } catch (error) {
          set(signedOut);
          throw error;
        } finally {
          busy = false;
        }
      },

      updateProfile: async ({ name, school, subject }) => {
        const changes: Record<string, string> = {};
        if (name?.trim()) changes.name = name.trim();
        if (school !== undefined) changes.school = school.trim();
        if (subject !== undefined) changes.subject = subject.trim();
        if (!Object.keys(changes).length) return;
        const profile = await api<Profile>('/me', { method: 'PATCH', body: changes });
        set({ name: profile.name, school: profile.school ?? '' });
      },

      signOut: async () => {
        // Lessons finished offline are sent first, while the session still exists.
        await Promise.race([
          useStudentStore.getState().syncOfflineRuns(),
          new Promise((resolve) => setTimeout(resolve, 4000)),
        ]).catch(() => undefined);
        set(signedOut);
        useTeacherStore.getState().reset();
        useStudentStore.getState().reset();
        if (isConfigured) await firebaseSignOut(getFirebaseAuth()).catch(() => undefined);
      },

      watchSession: () => {
        if (!isConfigured) return () => undefined;
        return onAuthStateChanged(getFirebaseAuth(), async (user) => {
          if (busy) return;
          if (!user) {
            if (get().authenticated) set(signedOut);
            return;
          }
          try {
            await get().refreshProfile();
          } catch (error) {
            // A rejected account must leave; a network problem keeps the cached profile.
            if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
              await get().signOut();
            }
          }
        });
      },
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        authenticated: s.authenticated,
        uid: s.uid,
        name: s.name,
        email: s.email,
        school: s.school,
        role: s.role,
      }),
    },
  ),
);
