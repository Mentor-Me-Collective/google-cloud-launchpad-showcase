/**
 * Session management and isolation for OfferProof.
 * Ensures each browser session/tab has a unique session ID, isolated storage,
 * and scoped verification state so multi-user concurrent sessions never conflict.
 */

import type { Report } from "./engine";

const SESSION_ID_KEY = "offerproof:session:id";
const SESSION_STATE_PREFIX = "offerproof:session:state:";

export interface VerificationSessionState {
  sessionId: string;
  text: string;
  report: Report | null;
  activeTab: "paste" | "file";
  uploaded: boolean;
  showExtracted: boolean;
  isSample: boolean;
  savedFor: string | null;
  updatedAt: number;
}

/**
 * Returns the current session's unique ID.
 * Generates and persists a unique UUID in sessionStorage if one does not exist.
 * Each browser / window / tab possesses its own independent sessionStorage.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "ssr-session";
  }

  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id || typeof id !== "string" || id.trim().length === 0) {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        id = crypto.randomUUID();
      } else {
        id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      }
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Loads the verification state scoped strictly to the given session ID.
 */
export function loadSessionState(sessionId: string): Partial<VerificationSessionState> | null {
  if (typeof window === "undefined" || !sessionId) return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_STATE_PREFIX}${sessionId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.sessionId === sessionId) {
      return parsed as VerificationSessionState;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Saves the verification state scoped strictly to the given session ID.
 */
export function saveSessionState(
  sessionId: string,
  state: Partial<VerificationSessionState>,
): void {
  if (typeof window === "undefined" || !sessionId) return;
  try {
    const payload: VerificationSessionState = {
      sessionId,
      text: state.text ?? "",
      report: state.report ?? null,
      activeTab: state.activeTab ?? "paste",
      uploaded: state.uploaded ?? false,
      showExtracted: state.showExtracted ?? false,
      isSample: state.isSample ?? false,
      savedFor: state.savedFor ?? null,
      updatedAt: Date.now(),
    };
    sessionStorage.setItem(`${SESSION_STATE_PREFIX}${sessionId}`, JSON.stringify(payload));
  } catch {
    // Ignore quota or privacy exceptions
  }
}

/**
 * Clears the verification state for the specified session ID only.
 * Does not touch any other sessions.
 */
export function clearSessionState(sessionId: string): void {
  if (typeof window === "undefined" || !sessionId) return;
  try {
    sessionStorage.removeItem(`${SESSION_STATE_PREFIX}${sessionId}`);
  } catch {
    // Ignore
  }
}
