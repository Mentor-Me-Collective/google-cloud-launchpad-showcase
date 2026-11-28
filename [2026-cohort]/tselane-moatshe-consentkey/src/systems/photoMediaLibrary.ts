/**
 * Simulated system: Photo and Media Library.
 *
 * Holds photos used in newsletters and social media. Follows the Photos
 * consent type. When Photos consent is withdrawn, tagged photos are blocked
 * from use; when granted, they are unblocked.
 */

import type { ConsentType, LearnerId } from "../consent/model.js";
import type {
  ConsentChange,
  SimulatedSystem,
  SystemUpdateResult,
} from "./system.js";

interface Photo {
  id: string;
  learnerId: LearnerId;
  blocked: boolean;
}

export class PhotoMediaLibrary implements SimulatedSystem {
  readonly name = "Photo and Media Library";
  readonly follows: readonly ConsentType[] = ["Photos"];

  /** Simulate a transient failure for testing the incomplete/retry path. */
  failNext = false;

  private readonly photos = new Map<string, Photo>();

  /** Seed test photos tagged to a learner. */
  seedPhotos(learnerId: LearnerId, count: number): void {
    for (let i = 1; i <= count; i++) {
      const id = `${learnerId}-photo-${i}`;
      this.photos.set(id, { id, learnerId, blocked: false });
    }
  }

  photosFor(learnerId: LearnerId): readonly Photo[] {
    return [...this.photos.values()].filter((p) => p.learnerId === learnerId);
  }

  handles(type: ConsentType): boolean {
    return this.follows.includes(type);
  }

  apply(change: ConsentChange): SystemUpdateResult {
    if (this.failNext) {
      this.failNext = false;
      return { system: this.name, ok: false, summary: "update failed (simulated)" };
    }

    const block = change.to === "withdrawn";
    const affected = this.photosFor(change.learnerId);
    for (const photo of affected) {
      this.photos.set(photo.id, { ...photo, blocked: block });
    }

    return {
      system: this.name,
      ok: true,
      summary: block
        ? `${affected.length} photo(s) blocked`
        : `${affected.length} photo(s) unblocked`,
    };
  }
}
