import { config } from '@/lib/config';
import { getFirebaseAuth } from '@/lib/firebase';

/** An error answered by the API, e.g. `{ error: { code: 'HEARTS_EXHAUSTED', message } }`. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Send the Firebase ID token (default). */
  auth?: boolean;
  timeoutMs?: number;
};

async function idToken(forceRefresh = false): Promise<string> {
  try {
    return await freshToken(forceRefresh);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Without internet Firebase cannot renew the token: that is "offline", not "signed out".
    throw new ApiError(0, 'NETWORK', 'No connection to the server.');
  }
}

async function freshToken(forceRefresh: boolean): Promise<string> {
  const auth = getFirebaseAuth();
  // After a reload Firebase restores the saved session asynchronously; asking for the user
  // before that finishes returns null and every first request would fail with 401.
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in again.');
  return user.getIdToken(forceRefresh);
}

async function send(path: string, { method = 'GET', body, auth = true, timeoutMs = 20000 }: Options, token?: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${config.apiUrl}/api/v1${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new ApiError(0, aborted ? 'TIMEOUT' : 'NETWORK', aborted ? 'The server took too long.' : 'No connection to the server.');
  } finally {
    clearTimeout(timer);
  }
}

/** Call the LearnLite API. Retries once with a fresh token when the server says 401. */
export async function api<T = unknown>(path: string, options: Options = {}): Promise<T> {
  const useAuth = options.auth !== false;
  let response = await send(path, options, useAuth ? await idToken() : undefined);
  if (response.status === 401 && useAuth) {
    response = await send(path, options, await idToken(true));
  }
  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (data as { error?: { code?: string; message?: string }; detail?: string } | null) ?? {};
    throw new ApiError(
      response.status,
      error.error?.code ?? 'REQUEST_ERROR',
      error.error?.message ?? error.detail ?? `Request failed (${response.status}).`,
    );
  }
  return data as T;
}

/** A short English message for any error, to show with `copy.t(...)`. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK' || error.code === 'TIMEOUT') return 'Could not reach the LearnLite server.';
    if (error.status === 401) return 'Your session expired. Sign in again.';
    if (error.status === 403) return 'You do not have permission to do that.';
    if (error.status === 404) return 'That item no longer exists.';
    // The server's own message is useful when it explains a rule (e.g. "Publish the module first").
    if ((error.status === 422 || error.status === 409) && error.message && error.message !== 'Invalid request data') {
      return error.message;
    }
    if (error.status === 422) return 'Some data is not valid. Check the fields and try again.';
    if (error.code === 'HEARTS_EXHAUSTED') return 'You are out of hearts.';
  }
  return 'Something went wrong. Try again.';
}
