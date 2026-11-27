/**
 * PR #3 follow-up: NVIDIA fallback, South African working days, one
 * 2-working-day rule for every path, and the configurable PIN lockout.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AI_UNAVAILABLE_MESSAGE,
  NvidiaDraftRequestError,
  NvidiaDraftService,
  NvidiaDraftUnclearError,
} from "../src/ai/nvidiaDraftService.js";
import {
  ESCALATION_WORKING_DAYS,
  escalationConfigFromEnv,
  escalationStatus,
  workingDaysBetween,
} from "../src/approval/escalation.js";
import { southAfricanPublicHolidays } from "../src/approval/saHolidays.js";
import { MAX_ATTEMPTS, PinService } from "../src/server/pin.js";

const KEY = "nvapi-test-key-must-not-leak";
const MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";

function service(fetchImpl: typeof fetch, timeoutMs = 1000) {
  return new NvidiaDraftService(KEY, MODEL, fetchImpl, undefined, timeoutMs);
}

// ----------------------------------------------------- NVIDIA fallback

test("the fallback message is exactly the agreed wording", () => {
  assert.equal(AI_UNAVAILABLE_MESSAGE, "The AI helper is unavailable, please use the manual form");
});

test("HTTP 429 and 5xx are request failures that carry the status, not the key", async () => {
  for (const status of [429, 500, 502, 503]) {
    const svc = service(async () => new Response("nope", { status }));
    await assert.rejects(svc.createDraft("Withdraw Photos"), (err: unknown) => {
      assert.ok(err instanceof NvidiaDraftRequestError);
      assert.equal(err.status, status);
      assert.ok(!err.message.includes(KEY));
      return true;
    });
  }
});

test("a connection error becomes a request failure and drops the underlying error", async () => {
  const svc = service(async () => {
    throw new Error(`socket hang up, authorization: Bearer ${KEY}`);
  });
  await assert.rejects(svc.createDraft("Withdraw Photos"), (err: unknown) => {
    assert.ok(err instanceof NvidiaDraftRequestError);
    assert.ok(!String((err as Error).message).includes(KEY));
    return true;
  });
});

test("a request that never answers times out instead of waiting forever", async () => {
  const hanging: typeof fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    });
  const started = Date.now();
  await assert.rejects(service(hanging, 50).createDraft("Withdraw Photos"), NvidiaDraftRequestError);
  assert.ok(Date.now() - started < 2000);
});

test("unreadable and unexpected bodies are failures, not crashes", async () => {
  const bodies = [
    new Response("<html>gateway</html>", { status: 200 }),
    new Response(JSON.stringify({ choices: [] }), { status: 200 }),
    new Response(JSON.stringify({ choices: [{ message: { content: 42 } }] }), { status: 200 }),
    new Response(JSON.stringify({}), { status: 200 }),
  ];
  for (const body of bodies) {
    await assert.rejects(service(async () => body).createDraft("Withdraw Photos"), NvidiaDraftRequestError);
  }
});

test("model output that is not a valid draft asks the parent instead of guessing", async () => {
  const reply = (content: string): typeof fetch => async () =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  for (const content of ["not json", "{}", '{"type":"Bank","to":"granted"}']) {
    await assert.rejects(service(reply(content)).createDraft("hello"), NvidiaDraftUnclearError);
  }
});

test("thinking mode is switched off in the request", async () => {
  let sent: Record<string, unknown> = {};
  const svc = service(async (_input, init) => {
    sent = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({ choices: [{ message: { content: '{"type":"Photos","to":"withdrawn"}' } }] }),
      { status: 200 },
    );
  });
  await svc.createDraft("Withdraw Photos");
  assert.deepEqual(sent.chat_template_kwargs, { enable_thinking: false });
  assert.equal(sent.model, MODEL);
});

// ------------------------------------------------- env-built service

test("the env-built service surfaces a 429 as a request failure without leaking the key", async () => {
  const realFetch = globalThis.fetch;
  const realErr = console.error;
  const logged: string[] = [];
  const saved = { k: process.env.NIM_API_KEY, n: process.env.NVIDIA_API_KEY };
  process.env.NIM_API_KEY = KEY;
  globalThis.fetch = (async () => new Response("rate limited", { status: 429 })) as typeof fetch;
  console.error = (...a: unknown[]) => void logged.push(a.join(" "));
  try {
    const { createNvidiaDraftService } = await import("../src/ai/nvidiaDraftService.js");
    await assert.rejects(createNvidiaDraftService().createDraft("Withdraw Photos"), (e: unknown) => {
      return e instanceof NvidiaDraftRequestError && e.status === 429;
    });
  } finally {
    globalThis.fetch = realFetch;
    console.error = realErr;
    if (saved.k === undefined) delete process.env.NIM_API_KEY;
    else process.env.NIM_API_KEY = saved.k;
  }
  assert.ok(!logged.join("\n").includes(KEY));
});

// ------------------------------------------------ South African working days

test("South African public holidays are computed, including Easter and Sunday rollover", () => {
  const h2026 = southAfricanPublicHolidays(2026);
  for (const d of ["2026-01-01", "2026-03-21", "2026-04-03", "2026-04-06", "2026-04-27",
    "2026-05-01", "2026-06-16", "2026-08-09", "2026-08-10", "2026-09-24", "2026-12-16",
    "2026-12-25", "2026-12-26"]) {
    assert.ok(h2026.includes(d), d);
  }
  // 2027: Good Friday 26 March, Family Day 29 March; 16 Dec is a Thursday.
  const h2027 = southAfricanPublicHolidays(2027);
  assert.ok(h2027.includes("2027-03-26") && h2027.includes("2027-03-29"));
  // 26 Dec 2027 is a Sunday, so Monday 27 Dec is also a public holiday.
  assert.ok(h2027.includes("2027-12-27"));
});

test("a public holiday does not count towards the 2 working days", () => {
  // Thu 2026-04-02 to Tue 2026-04-07: Fri 3 Apr and Mon 6 Apr are holidays; only Tue counts.
  const from = new Date("2026-04-02T09:00:00Z");
  const to = new Date("2026-04-07T09:00:00Z");
  const holidays = escalationConfigFromEnv({}).holidays;
  assert.equal(workingDaysBetween(from, to, holidays), 1);
  assert.equal(escalationStatus(from.toISOString(), to).state, "within_limit");
});

test("the rule is 2 working days and every request kind uses it, with no urgent shortcut", () => {
  assert.equal(ESCALATION_WORKING_DAYS, 2);
  const mon = new Date("2026-11-09T09:00:00Z");
  const tue = new Date("2026-11-10T09:00:00Z");
  const wed = new Date("2026-11-11T09:00:00Z");
  // escalationStatus takes no request type: medical, contact and urgent all get this answer.
  assert.equal(escalationStatus(mon.toISOString(), tue).state, "within_limit");
  assert.equal(escalationStatus(mon.toISOString(), wed).state, "overdue");
});

// ---------------------------------------------------------------- PIN lockout

test("lockout follows the configured threshold (default 5 until the team agrees)", () => {
  assert.equal(MAX_ATTEMPTS, Number(process.env.PIN_MAX_ATTEMPTS) || 5);
  const pins = new PinService(() => 0);
  pins.setPin("u", "1234");
  for (let i = 0; i < MAX_ATTEMPTS - 1; i++) assert.equal(pins.verify("u", "0000").ok, false);
  const last = pins.verify("u", "0000");
  assert.ok(!last.ok && last.locked);
  const afterLock = pins.verify("u", "1234");
  assert.ok(!afterLock.ok && afterLock.locked, "the right PIN is refused while locked");
});
