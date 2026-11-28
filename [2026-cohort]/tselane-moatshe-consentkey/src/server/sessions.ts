/**
 * Server-side sessions.
 *
 * The browser cookie holds a random token, never a user id, so a session cannot
 * be forged by guessing an id. The token maps to a user id here, in memory, and
 * expires. A restart signs everyone out, which is acceptable for a single
 * container. Revoking a user's sessions (on deactivation) takes effect at once.
 */

import { randomBytes } from "node:crypto";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

interface Session {
  userId: string;
  expiresAt: number;
}

export class SessionStore {
  private readonly sessions = new Map<string, Session>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  create(userId: string): string {
    const token = randomBytes(32).toString("base64url");
    this.sessions.set(token, {
      userId,
      expiresAt: this.now() + SESSION_MAX_AGE_SECONDS * 1000,
    });
    return token;
  }

  userIdFor(token: string | undefined | null): string | undefined {
    if (!token) return undefined;
    const s = this.sessions.get(token);
    if (!s) return undefined;
    if (s.expiresAt <= this.now()) {
      this.sessions.delete(token);
      return undefined;
    }
    return s.userId;
  }

  destroy(token: string | undefined | null): void {
    if (token) this.sessions.delete(token);
  }

  revokeUser(userId: string): void {
    for (const [token, s] of this.sessions) {
      if (s.userId === userId) this.sessions.delete(token);
    }
  }
}

const GLOBAL_KEY = Symbol.for("consentkey.sessionStore");

export function getSessionStore(): SessionStore {
  const g = globalThis as unknown as Record<symbol, SessionStore | undefined>;
  return (g[GLOBAL_KEY] ??= new SessionStore());
}
