/**
 * PIN storage and checking.
 *
 * Used for login, for confirming a consent switch, and for confirming a drafted
 * request. PINs are stored only as salted scrypt hashes, compared in constant
 * time, and rate-limited: after MAX_ATTEMPTS wrong tries a key is locked out
 * for LOCK_MS. A PIN is never logged, audited or returned.
 *
 * The service keys everything by an opaque string (a user id, or a login
 * username for login attempts). Users and their persisted hashes live in
 * `users.ts`; this file knows nothing about people.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const PIN_PATTERN = /^\d{4,8}$/;
/**
 * Lockout policy. PENDING TEAM AGREEMENT: slide 11 says 5 attempts / 5 minutes,
 * Thando's document says 3 attempts. The current behaviour (5 / 5 min) is kept
 * unchanged as the default; set PIN_MAX_ATTEMPTS / PIN_LOCK_MINUTES to apply
 * the agreed policy without a code change.
 */
function positiveInt(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 100 ? n : fallback;
}
export const MAX_ATTEMPTS = positiveInt(process.env.PIN_MAX_ATTEMPTS, 5);
export const LOCK_MS = positiveInt(process.env.PIN_LOCK_MINUTES, 5) * 60 * 1000;
/** Bound on tracked failure keys so junk usernames cannot grow memory forever. */
const MAX_TRACKED_FAILURES = 10_000;

/** A salted hash as stored (hex), safe to persist. Never the PIN itself. */
export interface PinHash {
  salt: string;
  hash: string;
}

export type PinResult =
  | { ok: true }
  | { ok: false; locked: boolean; attemptsLeft: number; retryAfterSeconds: number };

function hashPin(pin: string, salt: Buffer): Buffer {
  return scryptSync(pin, salt, 32);
}

const DUMMY_SALT = randomBytes(16);

/** Hash a PIN for storage. Throws if the format is wrong. */
export function createPinHash(pin: string): PinHash {
  if (!PIN_PATTERN.test(pin)) throw new Error("PIN must be 4 to 8 digits");
  const salt = randomBytes(16);
  return { salt: salt.toString("hex"), hash: hashPin(pin, salt).toString("hex") };
}

export class PinService {
  private readonly pins = new Map<string, PinHash>();
  private readonly failures = new Map<string, { count: number; lockedUntil: number }>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** Hash and keep a PIN for `key`. Returns the hash so the caller can persist it. */
  setPin(key: string, pin: string): PinHash {
    const stored = createPinHash(pin);
    this.pins.set(key, stored);
    this.failures.delete(key);
    return stored;
  }

  /** Load an already-hashed PIN (from the database). */
  loadHash(key: string, stored: PinHash): void {
    this.pins.set(key, stored);
  }

  /** Forget a key's PIN and failures (rollback after a failed save). */
  clear(key: string): void {
    this.pins.delete(key);
    this.failures.delete(key);
  }

  /** Clear the wrong-PIN count and any lockout for `key`. */
  unlock(key: string): void {
    this.failures.delete(key);
  }

  /**
   * Check `pin` against the hash stored under `hashKey` (default: `key`).
   * Failures and lockout are counted against `key`, so a login attempt can be
   * limited by username even when that username does not exist. The hash work
   * is done either way so an unknown key is not faster to reject.
   */
  verify(key: string, pin: unknown, hashKey: string = key): PinResult {
    const state = this.failures.get(key) ?? { count: 0, lockedUntil: 0 };
    const now = this.now();
    if (state.lockedUntil > now) {
      return {
        ok: false,
        locked: true,
        attemptsLeft: 0,
        retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000),
      };
    }

    const stored = this.pins.get(hashKey);
    let match = false;
    if (typeof pin === "string" && PIN_PATTERN.test(pin)) {
      const salt = stored ? Buffer.from(stored.salt, "hex") : DUMMY_SALT;
      const candidate = hashPin(pin, salt);
      if (stored) match = timingSafeEqual(candidate, Buffer.from(stored.hash, "hex"));
    }
    if (match) {
      this.failures.delete(key);
      return { ok: true };
    }

    const count = state.count + 1;
    if (this.failures.size >= MAX_TRACKED_FAILURES && !this.failures.has(key)) {
      const oldest = this.failures.keys().next().value;
      if (oldest !== undefined) this.failures.delete(oldest);
    }
    if (count >= MAX_ATTEMPTS) {
      this.failures.set(key, { count: 0, lockedUntil: now + LOCK_MS });
      return { ok: false, locked: true, attemptsLeft: 0, retryAfterSeconds: LOCK_MS / 1000 };
    }
    this.failures.set(key, { count, lockedUntil: 0 });
    return { ok: false, locked: false, attemptsLeft: MAX_ATTEMPTS - count, retryAfterSeconds: 0 };
  }
}
