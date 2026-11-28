/**
 * Session cookie handling.
 *
 * After a username + PIN check, a random session token is stored in an httpOnly
 * cookie. The token maps to a user id in `sessions.ts`. Every request looks the
 * user up again, so a deactivated user loses access straight away.
 */

import { cookies } from "next/headers";
import { getApp } from "./appSchool.js";
import { SESSION_MAX_AGE_SECONDS, getSessionStore } from "./sessions.js";
import type { Identity } from "./identities.js";

export const SESSION_COOKIE = "ck_session";

export async function getCurrentIdentity(): Promise<Identity | undefined> {
  const store = await cookies();
  const userId = getSessionStore().userIdFor(store.get(SESSION_COOKIE)?.value);
  if (!userId) return undefined;
  const app = await getApp();
  return app.users.identityFor(userId);
}

export async function setSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, getSessionStore().create(userId), {
    httpOnly: true,
    sameSite: "lax",
    // Set CONSENTKEY_SECURE_COOKIE=true when served over HTTPS.
    secure: process.env.CONSENTKEY_SECURE_COOKIE === "true",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  getSessionStore().destroy(store.get(SESSION_COOKIE)?.value);
  store.delete(SESSION_COOKIE);
}
