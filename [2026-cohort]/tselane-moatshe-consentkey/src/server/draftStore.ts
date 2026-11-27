/**
 * Server-side holding area for drafts awaiting the parent's PIN (plan phase 4).
 *
 * The browser only ever holds an opaque draft id. The consent type and state
 * that will be submitted are the ones the server validated, so they cannot be
 * edited between "draft" and "confirm". A draft belongs to one parent, expires,
 * and can be used once.
 */

import { randomUUID } from "node:crypto";
import type { ConsentDraft } from "../ai/nvidiaDraftService.js";

export const DRAFT_TTL_MS = 10 * 60 * 1000;
const MAX_PER_PARENT = 10;

interface Stored {
  parentId: string;
  draft: ConsentDraft;
  expiresAt: number;
}

export class DraftStore {
  private readonly drafts = new Map<string, Stored>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  create(parentId: string, draft: ConsentDraft): string {
    this.sweep();
    const mine = [...this.drafts.entries()].filter(([, s]) => s.parentId === parentId);
    while (mine.length >= MAX_PER_PARENT) {
      this.drafts.delete(mine.shift()![0]);
    }
    const id = randomUUID();
    this.drafts.set(id, { parentId, draft, expiresAt: this.now() + DRAFT_TTL_MS });
    return id;
  }

  /** The draft, if it exists, belongs to this parent and has not expired. Does not consume it. */
  peek(id: string, parentId: string): ConsentDraft | undefined {
    const s = this.drafts.get(id);
    if (!s || s.parentId !== parentId) return undefined;
    if (s.expiresAt <= this.now()) {
      this.drafts.delete(id);
      return undefined;
    }
    return s.draft;
  }

  /** Single use: call only after the PIN was confirmed. */
  consume(id: string): void {
    this.drafts.delete(id);
  }

  private sweep(): void {
    const now = this.now();
    for (const [id, s] of this.drafts) if (s.expiresAt <= now) this.drafts.delete(id);
  }
}

const GLOBAL_KEY = Symbol.for("consentkey.draftStore");

export function getDraftStore(): DraftStore {
  const g = globalThis as unknown as Record<symbol, DraftStore | undefined>;
  return (g[GLOBAL_KEY] ??= new DraftStore());
}