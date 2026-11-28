/**
 * Firestore security rules tests.
 *
 * Run against a Firestore emulator when FIRESTORE_EMULATOR_HOST is set
 * (host:port). Skipped otherwise so plain `npm test` passes without one.
 * See docs/firestore-rules.md.
 */

import { after, before, beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const skip = emulatorHost
  ? false
  : "FIRESTORE_EMULATOR_HOST is not set; skipping Firestore rules tests (see docs/firestore-rules.md)";

describe("firestore.rules", { skip }, () => {
  let env: RulesTestEnvironment;

  before(async () => {
    const [host, port] = emulatorHost!.split(":");
    env = await initializeTestEnvironment({
      projectId: "consentkey-rules-test",
      firestore: {
        rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
        host,
        port: Number(port),
      },
    });
  });

  after(async () => {
    await env?.cleanup();
  });

  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "audit/000000000001"), { index: 1, hash: "h" });
      await setDoc(doc(db, "consent/l1__medical"), { learnerId: "l1", type: "medical", state: "granted" });
      await setDoc(doc(db, "pending/p1"), { id: "p1", identityId: "i1" });
      await setDoc(doc(db, "users/u1"), { id: "u1", pinHash: "x" });
    });
  });

  const anon = () => env.unauthenticatedContext().firestore();
  const user = () => env.authenticatedContext("parent1").firestore();
  const server = () => env.authenticatedContext("svc", { server: true }).firestore();

  describe("audit", () => {
    it("server can create a new entry", async () => {
      await assertSucceeds(setDoc(doc(server(), "audit/000000000002"), { index: 2 }));
    });
    it("server can read", async () => {
      await assertSucceeds(getDoc(doc(server(), "audit/000000000001")));
      await assertSucceeds(getDocs(collection(server(), "audit")));
    });
    it("nobody can update or delete, including the server", async () => {
      for (const db of [anon(), user(), server()]) {
        await assertFails(updateDoc(doc(db, "audit/000000000001"), { hash: "tampered" }));
        await assertFails(deleteDoc(doc(db, "audit/000000000001")));
      }
    });
    it("server cannot overwrite an existing entry via set", async () => {
      await assertFails(setDoc(doc(server(), "audit/000000000001"), { index: 1, hash: "tampered" }));
    });
    it("anonymous and ordinary users cannot create or read", async () => {
      for (const db of [anon(), user()]) {
        await assertFails(setDoc(doc(db, "audit/000000000009"), { index: 9 }));
        await assertFails(getDoc(doc(db, "audit/000000000001")));
        await assertFails(getDocs(collection(db, "audit")));
      }
    });
  });

  for (const col of ["consent", "pending"]) {
    const existing = col === "consent" ? "l1__medical" : "p1";
    describe(col, () => {
      it("server can read and write", async () => {
        await assertSucceeds(getDoc(doc(server(), `${col}/${existing}`)));
        await assertSucceeds(setDoc(doc(server(), `${col}/new`), { a: 1 }));
        await assertSucceeds(updateDoc(doc(server(), `${col}/${existing}`), { a: 2 }));
        await assertSucceeds(deleteDoc(doc(server(), `${col}/${existing}`)));
      });
      it("anonymous and ordinary users cannot read or write", async () => {
        for (const db of [anon(), user()]) {
          await assertFails(getDoc(doc(db, `${col}/${existing}`)));
          await assertFails(getDocs(collection(db, col)));
          await assertFails(setDoc(doc(db, `${col}/new`), { a: 1 }));
          await assertFails(updateDoc(doc(db, `${col}/${existing}`), { a: 2 }));
          await assertFails(deleteDoc(doc(db, `${col}/${existing}`)));
        }
      });
    });
  }

  describe("users and unknown collections", () => {
    it("users is closed to every client, including the server claim", async () => {
      for (const db of [anon(), user(), server()]) {
        await assertFails(getDoc(doc(db, "users/u1")));
        await assertFails(setDoc(doc(db, "users/u2"), { id: "u2" }));
      }
    });
    it("unknown collections are denied by default", async () => {
      for (const db of [anon(), user(), server()]) {
        await assertFails(getDoc(doc(db, "other/x")));
        await assertFails(setDoc(doc(db, "other/x"), { a: 1 }));
      }
    });
  });
});
