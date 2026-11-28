/**
 * Implementation plan, phase 1: Contact Details approval and alternative number.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSchool } from "../src/school.js";
import {
  InvalidAlternativeNumberError,
  PermissionDeniedError,
} from "../src/connector/consentConnector.js";
import type { ConsentChangeRequest } from "../src/connector/consentConnector.js";
import { normalizeSouthAfricanNumber } from "../src/consent/phone.js";

const base: ConsentChangeRequest = {
  parentId: "P-001",
  parentVerified: true,
  verificationMethod: "demo_login",
  learnerId: "L-101",
  type: "Contact Details",
  from: "not_set",
  to: "granted",
  changeId: "chg-1",
};

test("phone: accepts E.164 and 0XXXXXXXXX, stores E.164", () => {
  assert.equal(normalizeSouthAfricanNumber("+27821234567"), "+27821234567");
  assert.equal(normalizeSouthAfricanNumber("0821234567"), "+27821234567");
  assert.equal(normalizeSouthAfricanNumber(" 082 123-4567 "), "+27821234567");
});

test("phone: rejects other countries, wrong length and junk", () => {
  for (const bad of ["", "12345", "+44 7911 123456", "082123456", "08212345678", "+270821234567", "abc", "0021821234567"]) {
    assert.equal(normalizeSouthAfricanNumber(bad), undefined, bad);
  }
});

test("a Contact Details request stays pending: no system changes before S-01 decides", () => {
  const school = buildSchool();
  const result = school.connector.process({ ...base, alternativeNumber: "+27821234567" });

  assert.equal(result.request.needsApproval, true);
  assert.equal(result.request.approvalStatus, "pending");
  assert.equal(result.impactSummary.updated, 0);
  assert.equal(school.connector.getState("L-101", "Contact Details"), "not_set");
  assert.equal(school.learnerRecords.recordFor("L-101").alternativeNumber, undefined);
  assert.equal(
    school.audit.entries().some((e) => e.event === "system.updated"),
    false,
  );
});

test("S-01 approves: the alternative number is stored alongside, systems update", () => {
  const school = buildSchool();
  const result = school.connector.process(
    { ...base, alternativeNumber: "+27821234567" },
    { staffId: "S-01", approved: true, reasonCode: "checked_with_parent" },
  );

  assert.equal(result.request.approvalStatus, "approved");
  assert.equal(result.status, "complete");
  assert.equal(school.connector.getState("L-101", "Contact Details"), "granted");
  const record = school.learnerRecords.recordFor("L-101");
  assert.equal(record.alternativeNumber, "+27821234567");
  assert.equal(record.contactDetailsActive, true);
});

test("S-01 declines: nothing changes and no number is stored", () => {
  const school = buildSchool();
  const result = school.connector.process(
    { ...base, alternativeNumber: "+27821234567" },
    { staffId: "S-01", approved: false, reasonCode: "needs_more_information" },
  );

  assert.equal(result.request.approvalStatus, "rejected");
  assert.equal(result.impactSummary.updated, 0);
  assert.equal(school.connector.getState("L-101", "Contact Details"), "not_set");
  assert.equal(school.learnerRecords.recordFor("L-101").alternativeNumber, undefined);
});

test("S-02 may not decide a Contact Details request", () => {
  const school = buildSchool();
  assert.throws(
    () =>
      school.connector.process(base, { staffId: "S-02", approved: true }),
    PermissionDeniedError,
  );
  assert.equal(school.connector.getState("L-101", "Contact Details"), "not_set");
});

test("an invalid alternative number is refused before anything is recorded", () => {
  const school = buildSchool();
  const before = school.audit.entries().length;
  for (const bad of ["0821234567", "+447911123456", "not a number"]) {
    // "0821234567" is valid input but not the normalised E.164 the connector requires.
    assert.throws(
      () => school.connector.process({ ...base, alternativeNumber: bad }),
      InvalidAlternativeNumberError,
      bad,
    );
  }
  assert.equal(school.audit.entries().length, before);
});

test("an alternative number only applies to Contact Details", () => {
  const school = buildSchool();
  assert.throws(
    () =>
      school.connector.process({
        ...base,
        type: "Photos",
        from: "granted",
        to: "withdrawn",
        alternativeNumber: "+27821234567",
      }),
    InvalidAlternativeNumberError,
  );
});

test("the number never reaches the audit trail, and the chain still verifies", () => {
  const school = buildSchool();
  school.connector.process({ ...base, alternativeNumber: "+27821234567" });
  school.connector.process(
    { ...base, alternativeNumber: "+27821234567" },
    { staffId: "S-01", approved: true },
  );
  const text = JSON.stringify(school.audit.entries());
  assert.equal(text.includes("821234567"), false);
  assert.ok(
    school.audit.entries().some((e) => e.details.alternativeNumberProvided === true),
  );
  assert.deepEqual(school.audit.verify(), { ok: true });
});

test("Contact Details without an alternative number still works", () => {
  const school = buildSchool();
  const result = school.connector.process(base, { staffId: "S-01", approved: true });
  assert.equal(result.status, "complete");
  assert.equal(school.learnerRecords.recordFor("L-101").alternativeNumber, undefined);
});
