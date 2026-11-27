import assert from "node:assert/strict";
import { test } from "node:test";
import {
  containsHealthDetail,
  HEALTH_DETAIL_MESSAGE,
} from "../src/approval/healthDetailCheck.js";
import { decisionReasons } from "../src/approval/decisionReasons.js";

test("health details in a note are flagged", () => {
  for (const note of [
    "Learner has asthma",
    "DIABETES, needs insulin",
    "epilepsy diagnosis",
    "she is HIV positive",
    "ADHD",
    "cancer treatment",
    "on medication",
    "was diagnosed last year",
    "prescribed Ritalin",
    "peanut allergy",
    "takes 10mg daily",
    "dose is 5 mg",
  ]) {
    assert.equal(containsHealthDetail(note), true, note);
  }
});

test("clean administrative notes are accepted", () => {
  for (const note of [
    "",
    "School must keep this record",
    "Trip is already full",
    "Parent requested it in writing",
    "Medical record is required by the school",
    "Checked with the parent by phone",
  ]) {
    assert.equal(containsHealthDetail(note), false, note);
  }
});

test("the fixed reason labels themselves are never flagged", () => {
  for (const approved of [true, false]) {
    for (const o of decisionReasons("Medical", approved)) {
      assert.equal(containsHealthDetail(o.label), false, o.label);
    }
  }
});

test("the refusal message is plain and names no health term", () => {
  assert.equal(containsHealthDetail(HEALTH_DETAIL_MESSAGE), false);
});
